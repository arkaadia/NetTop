import http from 'http';
import net from 'net';
import url from 'url';
import { WebSocketServer, WebSocket } from 'ws';

/**
 * Guacamole protocol instruction encoder
 * Instructions follow the pattern: <length>.<string>,<length>.<string>;
 */
export function encodeInstruction(opcode: string, ...args: (string | number | undefined | null)[]): string {
  const elements = [opcode, ...args.map(a => (a === undefined || a === null ? '' : String(a)))];
  return elements.map(elem => `${Buffer.byteLength(elem, 'utf8')}.${elem}`).join(',') + ';';
}

/**
 * Guacamole protocol instruction parser
 */
export function parseInstructions(data: string): string[][] {
  const instructions: string[][] = [];
  let index = 0;

  while (index < data.length) {
    const elements: string[] = [];
    while (index < data.length) {
      const dotIndex = data.indexOf('.', index);
      if (dotIndex === -1) break;
      const length = parseInt(data.substring(index, dotIndex), 10);
      if (isNaN(length)) break;
      const valueStart = dotIndex + 1;
      const value = data.substr(valueStart, length);
      elements.push(value);
      index = valueStart + length;

      const delimiter = data.charAt(index);
      index++;
      if (delimiter === ';') {
        instructions.push(elements);
        break;
      }
    }
  }

  return instructions;
}

interface RemoteSessionData {
  session_id: string;
  token: string;
  device_id: string;
  device_name: string;
  hostname: string;
  port: number;
  username: string;
  password?: string;
  domain?: string;
}

/**
 * Fetch session details securely from local Python backend using session token
 */
async function fetchSessionByToken(token: string): Promise<RemoteSessionData | null> {
  return new Promise((resolve) => {
    const pythonPort = process.env.PYTHON_PORT || '5001';
    const req = http.get(`http://127.0.0.1:${pythonPort}/api/remote-test/internal/session?token=${encodeURIComponent(token)}`, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const data = JSON.parse(raw);
            resolve(data.session || null);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => {
      resolve(null);
    });
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Configure WebSocket server on `/ws/remote-desktop` to provide a real Guacamole RDP tunnel
 */
export function setupRemoteDesktopWebSocketServer(server: http.Server) {
  const wss = new WebSocketServer({
    server,
    path: '/ws/remote-desktop'
  });

  const guacdHost = process.env.GUACD_HOST || '127.0.0.1';
  const guacdPort = parseInt(process.env.GUACD_PORT || '4822', 10);

  console.log(`[Remote Desktop] WebSocket Guacamole tunnel initialized on path /ws/remote-desktop (Target guacd: ${guacdHost}:${guacdPort})`);

  wss.on('connection', async (ws: WebSocket, req) => {
    const parsedUrl = url.parse(req.url || '', true);
    const token = (parsedUrl.query.token as string) || '';
    const initialWidth = parseInt((parsedUrl.query.width as string) || '1280', 10);
    const initialHeight = parseInt((parsedUrl.query.height as string) || '720', 10);
    const initialDpi = parseInt((parsedUrl.query.dpi as string) || '96', 10);

    if (!token) {
      console.warn('[Remote Desktop] Connection rejected: No session token provided');
      ws.send(encodeInstruction('error', 'Authentication required. No session token provided.', 513));
      ws.close(1008, 'Token required');
      return;
    }

    // Verify session token against authorized inventory
    const session = await fetchSessionByToken(token);
    if (!session) {
      console.warn(`[Remote Desktop] Connection rejected: Invalid or expired session token '${token.substring(0, 8)}...'`);
      ws.send(encodeInstruction('error', 'Session token is invalid, expired, or access denied.', 513));
      ws.close(1008, 'Invalid token');
      return;
    }

    console.log(`[Remote Desktop] Authorized session '${session.session_id}' connecting to Windows host ${session.hostname}:${session.port} as ${session.username}`);

    let guacdSocket: net.Socket | null = null;
    let handshakeState: 'selecting' | 'waiting_args' | 'connected' = 'selecting';
    let incomingBuffer = '';

    const cleanup = () => {
      if (guacdSocket) {
        try { guacdSocket.end(); } catch {}
        try { guacdSocket.destroy(); } catch {}
        guacdSocket = null;
      }
    };

    // Open TCP connection to guacd (Apache Guacamole proxy daemon)
    guacdSocket = net.createConnection({ host: guacdHost, port: guacdPort }, () => {
      console.log(`[Remote Desktop] Connected to guacd daemon at ${guacdHost}:${guacdPort}`);
      // Step 1: Send select instruction for RDP protocol
      guacdSocket?.write(encodeInstruction('select', 'rdp'));
      handshakeState = 'waiting_args';
    });

    guacdSocket.on('error', (err: any) => {
      console.error(`[Remote Desktop] guacd connection error (${guacdHost}:${guacdPort}):`, err.message);
      if (ws.readyState === WebSocket.OPEN) {
        const errorMsg = `Unable to connect to Apache Guacamole proxy daemon (guacd) on ${guacdHost}:${guacdPort} (${err.code || err.message}). Please verify guacd container/service is running.`;
        ws.send(encodeInstruction('error', errorMsg, 516));
        ws.close(1011, errorMsg);
      }
      cleanup();
    });

    guacdSocket.on('close', () => {
      console.log(`[Remote Desktop] guacd socket closed for session ${session.session_id}`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'guacd closed');
      }
    });

    guacdSocket.on('data', (chunk) => {
      const str = chunk.toString('utf8');

      if (handshakeState === 'waiting_args') {
        incomingBuffer += str;
        const semiIdx = incomingBuffer.indexOf(';');
        if (semiIdx !== -1) {
          const firstInstructionStr = incomingBuffer.substring(0, semiIdx + 1);
          incomingBuffer = incomingBuffer.substring(semiIdx + 1);

          const parsed = parseInstructions(firstInstructionStr);
          if (parsed.length > 0 && parsed[0][0] === 'args') {
            const expectedArgs = parsed[0].slice(1);
            console.log(`[Remote Desktop] guacd requested args count: ${expectedArgs.length}`);

            // Send client display configuration
            guacdSocket?.write(encodeInstruction('size', initialWidth, initialHeight, initialDpi));
            guacdSocket?.write(encodeInstruction('audio', 'audio/ogg'));
            guacdSocket?.write(encodeInstruction('video'));
            guacdSocket?.write(encodeInstruction('image', 'image/png', 'image/jpeg', 'image/webp'));

            // Build parameter values corresponding to guacd's expected arguments
            const argValues: string[] = expectedArgs.map(argName => {
              switch (argName) {
                case 'hostname': return session.hostname;
                case 'port': return String(session.port || 3389);
                case 'domain': return session.domain || '';
                case 'username': return session.username || 'administrator';
                case 'password': return session.password || '';
                case 'width': return String(initialWidth);
                case 'height': return String(initialHeight);
                case 'dpi': return String(initialDpi);
                case 'security': return 'any'; // allows NLA / TLS / standard RDP
                case 'ignore-cert': return 'true'; // allows self-signed Windows RDP certificates
                case 'resize-method': return 'display-update'; // allows dynamic browser resolution resizing
                case 'enable-font-smoothing': return 'true';
                case 'enable-full-window-drag': return 'true';
                case 'enable-desktop-composition': return 'true';
                case 'color-depth': return '24';
                case 'server-layout': return 'en-us-qwerty';
                case 'enable-drive': return 'false';
                case 'enable-printing': return 'false';
                default: return '';
              }
            });

            // Send connect instruction with all configured arguments
            guacdSocket?.write(encodeInstruction('connect', ...argValues));
            handshakeState = 'connected';

            // Forward any leftover data in buffer
            if (incomingBuffer.length > 0 && ws.readyState === WebSocket.OPEN) {
              ws.send(incomingBuffer);
              incomingBuffer = '';
            }
            return;
          }
        }
      }

      // Once connected, forward all Guacamole protocol frames directly to browser WebSocket
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(str);
      }
    });

    // Forward browser Guacamole client instructions directly to guacd
    ws.on('message', (messageRaw) => {
      const message = messageRaw.toString('utf8');
      if (guacdSocket && guacdSocket.writable) {
        guacdSocket.write(message);
      }
    });

    ws.on('close', () => {
      console.log(`[Remote Desktop] WebSocket client disconnected from session ${session.session_id}`);
      cleanup();
    });

    ws.on('error', (err) => {
      console.error('[Remote Desktop] WebSocket error:', err);
      cleanup();
    });
  });
}
