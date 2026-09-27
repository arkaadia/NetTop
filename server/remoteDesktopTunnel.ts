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
  return elements.map(elem => `${elem.length}.${elem}`).join(',') + ';';
}

/**
 * Guacamole protocol instruction parser for single complete string
 */
export function parseInstructions(data: string): string[][] {
  const res = parseInstructionsFromBuffer(data);
  return res.instructions;
}

/**
 * Streaming Guacamole instruction parser from buffer string.
 * Returns parsed instructions and any unparsed remaining buffer.
 */
export function parseInstructionsFromBuffer(buffer: string): { instructions: string[][]; remaining: string } {
  const instructions: string[][] = [];
  let index = 0;

  while (index < buffer.length) {
    const elements: string[] = [];
    let curIndex = index;
    let complete = false;

    while (curIndex < buffer.length) {
      const dotIndex = buffer.indexOf('.', curIndex);
      if (dotIndex === -1) {
        // Incomplete element length header
        break;
      }

      const lengthStr = buffer.substring(curIndex, dotIndex);
      const length = parseInt(lengthStr, 10);
      if (isNaN(length) || length < 0) {
        // Corrupted stream, advance past dot to recover
        curIndex = dotIndex + 1;
        break;
      }

      const valueStart = dotIndex + 1;
      const valueEnd = valueStart + length;
      if (buffer.length < valueEnd + 1) {
        // Element value or delimiter not yet fully received in buffer
        break;
      }

      const value = buffer.substring(valueStart, valueEnd);
      elements.push(value);
      curIndex = valueEnd;

      const delimiter = buffer.charAt(curIndex);
      curIndex++;

      if (delimiter === ';') {
        complete = true;
        break;
      } else if (delimiter === ',') {
        continue;
      } else {
        // Malformed delimiter
        break;
      }
    }

    if (complete) {
      instructions.push(elements);
      index = curIndex;
    } else {
      // Current instruction incomplete, keep remaining in buffer
      break;
    }
  }

  return {
    instructions,
    remaining: buffer.substring(index)
  };
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
    const req = http.get(
      `http://127.0.0.1:${pythonPort}/api/remote-test/internal/session?token=${encodeURIComponent(token)}`,
      (res) => {
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
      }
    );

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
 * Resolve individual Guacamole RDP connection parameter dynamically by name
 */
function resolveRdpParameter(
  argName: string,
  session: RemoteSessionData,
  width: number,
  height: number,
  dpi: number
): string {
  switch (argName.toLowerCase()) {
    case 'hostname':
      return session.hostname || '';
    case 'port':
      return String(session.port || 3389);
    case 'domain':
      return session.domain || '';
    case 'username':
      return session.username || 'administrator';
    case 'password':
      return session.password || '';
    case 'width':
      return String(width || 1280);
    case 'height':
      return String(height || 720);
    case 'dpi':
      return String(dpi || 96);
    case 'initial-program':
      return '';
    case 'color-depth':
      return '24';
    case 'disable-audio':
      return 'false';
    case 'enable-printing':
      return 'false';
    case 'printer-name':
      return '';
    case 'enable-drive':
      return 'false';
    case 'drive-name':
      return '';
    case 'drive-path':
      return '';
    case 'create-drive-path':
      return 'false';
    case 'console':
    case 'console-audio':
      return 'false';
    case 'server-layout':
      return 'en-us-qwerty';
    case 'security':
      // 'any' allows guacd to negotiate NLA, TLS, or standard RDP encryption automatically
      return 'any';
    case 'ignore-cert':
      // Essential for Windows RDP servers which frequently use self-signed TLS certificates
      return 'true';
    case 'disable-auth':
      return 'false';
    case 'remote-app':
    case 'remote-app-dir':
    case 'remote-app-args':
      return '';
    case 'static-channels':
      return '';
    case 'client-name':
      return 'NetTop-RDP';
    case 'enable-wallpaper':
      return 'false';
    case 'enable-theming':
      return 'false';
    case 'enable-font-smoothing':
      return 'true';
    case 'enable-full-window-drag':
      return 'true';
    case 'enable-desktop-composition':
      return 'true';
    case 'enable-menu-animations':
      return 'false';
    case 'disable-bitmap-caching':
      return 'false';
    case 'disable-offscreen-caching':
      return 'false';
    case 'disable-glyph-caching':
      return 'false';
    case 'load-balance-info':
    case 'preconnection-id':
    case 'preconnection-blob':
      return '';
    case 'timezone':
      return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    case 'auto-reconnect':
      return 'true';
    case 'max-reconnect-tries':
      return '3';
    case 'reconnect-delay':
      return '1000';
    case 'read-only':
      return 'false';
    case 'resize-method':
      // 'display-update' enables dynamic resolution resizing when browser window resizes
      return 'display-update';
    case 'dest-port':
    case 'dest-host':
    case 'gateway-port':
    case 'gateway-hostname':
    case 'gateway-username':
    case 'gateway-password':
    case 'gateway-domain':
      return '';
    case 'normalize-clipboard':
      return 'true';
    default:
      return '';
  }
}

/**
 * Configure WebSocket server on `/ws/remote-desktop` to provide a real Guacamole RDP tunnel
 */
export function setupRemoteDesktopWebSocketServer(server: http.Server | WebSocketServer) {
  const wss = server instanceof WebSocketServer
    ? server
    : new WebSocketServer({ server, path: '/ws/remote-desktop' });

  const guacdHost = process.env.GUACD_HOST || '127.0.0.1';
  const guacdPort = parseInt(process.env.GUACD_PORT || '4822', 10);

  console.log(`[Remote Desktop] WebSocket Guacamole tunnel initialized on path /ws/remote-desktop (Target guacd: ${guacdHost}:${guacdPort})`);

  wss.on('connection', async (ws: WebSocket, req) => {
    const parsedUrl = url.parse(req.url || '', true);
    const token = (parsedUrl.query.token as string) || '';
    const initialWidth = Math.max(100, parseInt((parsedUrl.query.width as string) || '1280', 10));
    const initialHeight = Math.max(100, parseInt((parsedUrl.query.height as string) || '720', 10));
    const initialDpi = Math.max(72, parseInt((parsedUrl.query.dpi as string) || '96', 10));

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
    let handshakeState: 'init' | 'waiting_args' | 'waiting_ready' | 'connected' | 'error' | 'closed' = 'init';
    let incomingBuffer = '';
    const pendingClientMessages: string[] = [];

    const cleanup = () => {
      handshakeState = 'closed';
      if (guacdSocket) {
        try { guacdSocket.end(); } catch {}
        try { guacdSocket.destroy(); } catch {}
        guacdSocket = null;
      }
    };

    // Open TCP connection to guacd (Apache Guacamole proxy daemon)
    guacdSocket = net.createConnection({ host: guacdHost, port: guacdPort }, () => {
      console.log(`[Remote Desktop][Session ${session.session_id}] Connected to guacd daemon at ${guacdHost}:${guacdPort}`);
      // Step 1: Send select instruction for RDP protocol
      const selectInst = encodeInstruction('select', 'rdp');
      console.log(`[Remote Desktop][Session ${session.session_id}] -> guacd: ${selectInst.trim()}`);
      guacdSocket?.write(selectInst);
      // Gated state: strictly wait for 'args;' from guacd before sending size/connect
      handshakeState = 'waiting_args';
    });

    guacdSocket.on('error', (err: any) => {
      console.error(`[Remote Desktop][Session ${session.session_id}] guacd connection error (${guacdHost}:${guacdPort}):`, err.message);
      if (ws.readyState === WebSocket.OPEN) {
        const errorMsg = `Unable to connect to Apache Guacamole proxy daemon (guacd) on ${guacdHost}:${guacdPort} (${err.code || err.message}). Please verify guacd container/service is running.`;
        ws.send(encodeInstruction('error', errorMsg, 516));
        ws.close(1011, errorMsg);
      }
      cleanup();
    });

    guacdSocket.on('close', () => {
      console.log(`[Remote Desktop][Session ${session.session_id}] guacd socket closed`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'guacd closed');
      }
      cleanup();
    });

    guacdSocket.on('data', (chunk) => {
      const chunkStr = chunk.toString('utf8');

      // If already connected, pass raw data directly to browser WebSocket
      if (handshakeState === 'connected') {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(chunkStr);
        }
        return;
      }

      // Handshake phases: parse instructions and gate each step
      incomingBuffer += chunkStr;
      const { instructions, remaining } = parseInstructionsFromBuffer(incomingBuffer);
      incomingBuffer = remaining;

      for (const instruction of instructions) {
        const opcode = instruction[0];

        // Step 2: Handle incoming args instruction from guacd
        if (handshakeState === 'waiting_args') {
          if (opcode === 'args') {
            const expectedArgs = instruction.slice(1);
            console.log(`[Remote Desktop][Session ${session.session_id}] <- guacd: args [count=${expectedArgs.length}: ${expectedArgs.join(', ')}]`);

            // Step 3: Send client display configuration instructions
            const sizeInst = encodeInstruction('size', initialWidth, initialHeight, initialDpi);
            const audioInst = encodeInstruction('audio', 'audio/ogg');
            const videoInst = encodeInstruction('video');
            const imageInst = encodeInstruction('image', 'image/png', 'image/jpeg', 'image/webp');

            console.log(`[Remote Desktop][Session ${session.session_id}] -> guacd: size,${initialWidth},${initialHeight},${initialDpi};`);
            console.log(`[Remote Desktop][Session ${session.session_id}] -> guacd: audio,audio/ogg;`);
            console.log(`[Remote Desktop][Session ${session.session_id}] -> guacd: video;`);
            console.log(`[Remote Desktop][Session ${session.session_id}] -> guacd: image,image/png,image/jpeg,image/webp;`);

            guacdSocket?.write(sizeInst);
            guacdSocket?.write(audioInst);
            guacdSocket?.write(videoInst);
            guacdSocket?.write(imageInst);

            // Step 4: Map parameter values strictly based on guacd's requested args order
            const argValues: string[] = expectedArgs.map(argName =>
              resolveRdpParameter(argName, session, initialWidth, initialHeight, initialDpi)
            );

            // Mask password and sensitive credentials for debugging log
            const maskedLog = expectedArgs.map((name, idx) => {
              const val = argValues[idx];
              const isSensitive = /password|secret|key/i.test(name);
              return `${name}=${isSensitive ? '******' : val}`;
            }).join(', ');

            console.log(`[Remote Desktop][Session ${session.session_id}] -> guacd: connect [${expectedArgs.length} params: ${maskedLog}]`);

            // Send connect instruction
            const connectInst = encodeInstruction('connect', ...argValues);
            guacdSocket?.write(connectInst);

            // Gate state to waiting_ready
            handshakeState = 'waiting_ready';
            continue;
          } else if (opcode === 'error') {
            const errorMsg = instruction[1] || 'guacd handshake error';
            const errorCode = parseInt(instruction[2] || '518', 10);
            console.error(`[Remote Desktop][Session ${session.session_id}] <- guacd ERROR in waiting_args: ${errorMsg} (${errorCode})`);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(encodeInstruction('error', errorMsg, errorCode));
              ws.close(1011, errorMsg);
            }
            cleanup();
            return;
          }
        }

        // Step 5: Waiting for ready or active visual stream from guacd
        if (handshakeState === 'waiting_ready') {
          if (opcode === 'error') {
            const errorMsg = instruction[1] || 'guacd upstream RDP connection failed';
            const errorCode = parseInt(instruction[2] || '518', 10);
            console.error(`[Remote Desktop][Session ${session.session_id}] <- guacd ERROR in waiting_ready: ${errorMsg} (${errorCode})`);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(encodeInstruction('error', errorMsg, errorCode));
              ws.close(1011, errorMsg);
            }
            cleanup();
            return;
          }

          if (opcode === 'ready') {
            console.log(`[Remote Desktop][Session ${session.session_id}] <- guacd: ready (Connection ID: ${instruction[1] || 'established'})`);
            handshakeState = 'connected';
            // Forward ready instruction to browser client
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(encodeInstruction(opcode, ...instruction.slice(1)));
            }
          } else {
            // Some guacd builds stream visual frames (e.g. cursor, size, sync) before or alongside ready
            console.log(`[Remote Desktop][Session ${session.session_id}] <- guacd active stream instruction: ${opcode}`);
            handshakeState = 'connected';
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(encodeInstruction(opcode, ...instruction.slice(1)));
            }
          }
          continue;
        }

        // If connected, forward instructions
        if (handshakeState === 'connected' && ws.readyState === WebSocket.OPEN) {
          ws.send(encodeInstruction(opcode, ...instruction.slice(1)));
        }
      }

      // If we just became connected, flush any remaining unparsed buffer and pending messages
      if (handshakeState === 'connected') {
        if (incomingBuffer.length > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(incomingBuffer);
          incomingBuffer = '';
        }
        while (pendingClientMessages.length > 0) {
          const msg = pendingClientMessages.shift();
          if (msg && guacdSocket && guacdSocket.writable) {
            guacdSocket.write(msg);
          }
        }
      }
    });

    // Forward browser Guacamole client instructions directly to guacd
    ws.on('message', (messageRaw) => {
      const message = messageRaw.toString('utf8');
      if (handshakeState === 'connected' && guacdSocket && guacdSocket.writable) {
        guacdSocket.write(message);
      } else {
        // Buffer client messages until handshake is complete
        pendingClientMessages.push(message);
      }
    });

    ws.on('close', () => {
      console.log(`[Remote Desktop][Session ${session.session_id}] WebSocket client disconnected`);
      cleanup();
    });

    ws.on('error', (err) => {
      console.error(`[Remote Desktop][Session ${session.session_id}] WebSocket error:`, err);
      cleanup();
    });
  });
}
