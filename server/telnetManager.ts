import http from 'http';
import net from 'net';
import { WebSocketServer, WebSocket } from 'ws';

export interface TelnetTestParams {
  host: string;
  port?: number;
  timeoutMs?: number;
}

export interface TelnetTestResult {
  success: boolean;
  message: string;
  latency_ms?: number;
  banner?: string;
  host: string;
  port: number;
}

// RFC 854 Telnet Byte Constants
const IAC = 255; // 0xFF - Interpret As Command
const DONT = 254; // 0xFE
const DO = 253; // 0xFD
const WONT = 252; // 0xFC
const WILL = 251; // 0xFB
const SB = 250; // 0xFA - Subnegotiation Begin
const SE = 240; // 0xF0 - Subnegotiation End

// Common Telnet Options
const OPT_ECHO = 1;
const OPT_SGA = 3; // Suppress Go Ahead
const OPT_TTYPE = 24; // Terminal Type
const OPT_NAWS = 31; // Negotiate About Window Size

/**
 * Filter Telnet IAC negotiation sequences from incoming byte stream and return clean displayable text
 */
function parseTelnetData(
  chunk: Buffer,
  socket?: net.Socket,
  cols = 100,
  rows = 30
): string {
  const cleanBytes: number[] = [];
  let i = 0;

  while (i < chunk.length) {
    if (chunk[i] === IAC) {
      if (i + 1 >= chunk.length) {
        break;
      }
      const cmd = chunk[i + 1];

      if (cmd === IAC) {
        // Escaped IAC (literal 255)
        cleanBytes.push(255);
        i += 2;
        continue;
      }

      if (cmd === DO || cmd === DONT || cmd === WILL || cmd === WONT) {
        if (i + 2 >= chunk.length) {
          break;
        }
        const opt = chunk[i + 2];

        // Negotiate appropriately if socket provided
        if (socket && !socket.destroyed) {
          if (cmd === DO) {
            if (opt === OPT_NAWS) {
              // Agree to window size negotiation (WILL NAWS)
              socket.write(Buffer.from([IAC, WILL, OPT_NAWS]));
              // Send NAWS subnegotiation
              const nawsPayload = Buffer.from([
                IAC, SB, OPT_NAWS,
                (cols >> 8) & 0xff, cols & 0xff,
                (rows >> 8) & 0xff, rows & 0xff,
                IAC, SE
              ]);
              socket.write(nawsPayload);
            } else if (opt === OPT_TTYPE) {
              // Agree to terminal type (WILL TTYPE)
              socket.write(Buffer.from([IAC, WILL, OPT_TTYPE]));
            } else if (opt === OPT_SGA) {
              socket.write(Buffer.from([IAC, WILL, OPT_SGA]));
            } else {
              // Reject unknown options politely
              socket.write(Buffer.from([IAC, WONT, opt]));
            }
          } else if (cmd === WILL) {
            if (opt === OPT_ECHO || opt === OPT_SGA) {
              // Accept server echoing / suppressing go-ahead
              socket.write(Buffer.from([IAC, DO, opt]));
            } else {
              socket.write(Buffer.from([IAC, DONT, opt]));
            }
          }
        }

        i += 3;
        continue;
      }

      if (cmd === SB) {
        // Subnegotiation: find matching IAC SE
        let j = i + 2;
        while (j < chunk.length - 1) {
          if (chunk[j] === IAC && chunk[j + 1] === SE) {
            // If server asks for terminal type: IAC SB TTYPE 1 IAC SE (SEND)
            if (socket && !socket.destroyed && chunk[i + 2] === OPT_TTYPE && chunk[i + 3] === 1) {
              const ttypeResp = Buffer.from([
                IAC, SB, OPT_TTYPE, 0, // IS
                0x78, 0x74, 0x65, 0x72, 0x6d, 0x2d, 0x32, 0x35, 0x36, 0x63, 0x6f, 0x6c, 0x6f, 0x72, // "xterm-256color"
                IAC, SE
              ]);
              socket.write(ttypeResp);
            }
            j += 2;
            break;
          }
          j++;
        }
        i = j;
        continue;
      }

      // Other 2-byte Telnet commands (NOP, GA, etc.)
      i += 2;
      continue;
    }

    cleanBytes.push(chunk[i]);
    i++;
  }

  return Buffer.from(cleanBytes).toString('utf-8');
}

/**
 * Perform a genuine TCP connection test to a target Telnet port (default 23 or any port).
 * Measures exact latency in milliseconds and captures greeting banner if sent by device.
 */
export function testRealTelnetConnection(params: TelnetTestParams): Promise<TelnetTestResult> {
  return new Promise((resolve) => {
    const { host, port = 23, timeoutMs = 5000 } = params;
    const startTime = Date.now();
    let isSettled = false;
    let accumulatedBanner = '';

    const socket = new net.Socket();

    const cleanup = () => {
      try {
        socket.removeAllListeners();
        socket.destroy();
      } catch {}
    };

    const finish = (result: TelnetTestResult) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);
      cleanup();
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({
        success: false,
        message: `Telnet connection timed out after ${timeoutMs}ms (host ${host}:${port} did not respond)`,
        host,
        port
      });
    }, timeoutMs);

    socket.on('connect', () => {
      const latencyMs = Date.now() - startTime;

      // Socket connected successfully! Wait briefly (500ms) to receive any greeting banner or prompt
      setTimeout(() => {
        finish({
          success: true,
          message: `Telnet connection established to ${host}:${port} (TCP port open & reachable)`,
          latency_ms: latencyMs,
          banner: accumulatedBanner.trim() || undefined,
          host,
          port
        });
      }, 500);
    });

    socket.on('data', (chunk: Buffer) => {
      const clean = parseTelnetData(chunk, socket);
      accumulatedBanner += clean;
      // If prompt or banner detected, we can settle early
      if (accumulatedBanner.length > 20) {
        const latencyMs = Date.now() - startTime;
        finish({
          success: true,
          message: `Telnet connection active: received prompt/banner from ${host}:${port}`,
          latency_ms: latencyMs,
          banner: accumulatedBanner.trim(),
          host,
          port
        });
      }
    });

    socket.on('error', (err: any) => {
      let msg = err.message || 'Telnet error';
      if (err.code === 'ECONNREFUSED') {
        msg = `Connection refused: Host ${host} rejected connection on Telnet port ${port} (Telnet daemon might not be running)`;
      } else if (err.code === 'ETIMEDOUT') {
        msg = `Connection timed out: Host ${host} did not respond on port ${port}`;
      } else if (err.code === 'EHOSTUNREACH' || err.code === 'ENETUNREACH') {
        msg = `Host unreachable: No route to host ${host}`;
      }
      finish({
        success: false,
        message: msg,
        host,
        port
      });
    });

    try {
      socket.connect(port, host);
    } catch (err: any) {
      finish({
        success: false,
        message: `Socket initiation error: ${err.message}`,
        host,
        port
      });
    }
  });
}

/**
 * Configure WebSocket server on `/ws/telnet` to provide a real interactive raw Telnet terminal session
 */
export function setupTelnetWebSocketServer(server: http.Server) {
  const wss = new WebSocketServer({
    server,
    path: '/ws/telnet'
  });

  console.log('[Telnet Server] WebSocket Telnet interactive gateway initialized on path /ws/telnet');

  wss.on('connection', (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`[Telnet WS] New WebSocket client connected from ${clientIp}`);

    let socket: net.Socket | null = null;
    let isConnected = false;
    let currentCols = 100;
    let currentRows = 30;

    const cleanup = () => {
      if (socket) {
        try {
          socket.removeAllListeners();
          socket.destroy();
        } catch {}
        socket = null;
      }
      isConnected = false;
    };

    ws.on('message', (dataRaw) => {
      try {
        const rawStr = dataRaw.toString();
        let payload: any;
        try {
          payload = JSON.parse(rawStr);
        } catch {
          payload = { type: 'data', data: rawStr };
        }

        if (payload.type === 'connect') {
          cleanup();

          const {
            host,
            port = 23,
            termCols = 100,
            termRows = 30
          } = payload;

          currentCols = Number(termCols) || 100;
          currentRows = Number(termRows) || 30;

          if (!host) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Target host is required for Telnet connection'
            }));
            return;
          }

          ws.send(JSON.stringify({
            type: 'status',
            status: 'connecting',
            message: `Initiating genuine Telnet connection to ${host}:${port}...`
          }));

          socket = new net.Socket();

          socket.on('connect', () => {
            isConnected = true;
            ws.send(JSON.stringify({
              type: 'status',
              status: 'ready',
              message: `Telnet connected to ${host}:${port}. Session active.`
            }));
          });

          socket.on('data', (chunk: Buffer) => {
            const cleanText = parseTelnetData(chunk, socket || undefined, currentCols, currentRows);
            if (cleanText) {
              ws.send(JSON.stringify({
                type: 'data',
                data: cleanText
              }));
            }
          });

          socket.on('close', (hadError) => {
            if (isConnected) {
              ws.send(JSON.stringify({
                type: 'status',
                status: 'closed',
                message: hadError ? 'Telnet session closed due to transmission error.' : 'Telnet connection closed by remote host.'
              }));
            }
            cleanup();
          });

          socket.on('error', (err: any) => {
            let msg = err.message || 'Telnet socket error';
            if (err.code === 'ECONNREFUSED') {
              msg = `Connection refused: Host ${host} rejected Telnet connection on port ${port}. Ensure Telnet/VTY is enabled on the device.`;
            } else if (err.code === 'ETIMEDOUT') {
              msg = `Connection timed out: Remote host ${host}:${port} unreachable.`;
            } else if (err.code === 'EHOSTUNREACH' || err.code === 'ENETUNREACH') {
              msg = `Host unreachable: No network route to ${host}.`;
            }
            ws.send(JSON.stringify({
              type: 'error',
              message: msg,
              code: err.code
            }));
            cleanup();
          });

          try {
            socket.connect(Number(port) || 23, host);
          } catch (connErr: any) {
            ws.send(JSON.stringify({
              type: 'error',
              message: `Socket error: ${connErr.message}`
            }));
            cleanup();
          }

        } else if (payload.type === 'data') {
          // Keystroke / command string sent to remote appliance
          if (socket && isConnected && !socket.destroyed) {
            socket.write(payload.data);
          }
        } else if (payload.type === 'resize') {
          currentCols = payload.cols || currentCols;
          currentRows = payload.rows || currentRows;
          if (socket && isConnected && !socket.destroyed) {
            // Send Telnet NAWS update
            const nawsPayload = Buffer.from([
              IAC, SB, OPT_NAWS,
              (currentCols >> 8) & 0xff, currentCols & 0xff,
              (currentRows >> 8) & 0xff, currentRows & 0xff,
              IAC, SE
            ]);
            socket.write(nawsPayload);
          }
        } else if (payload.type === 'disconnect') {
          cleanup();
          ws.send(JSON.stringify({
            type: 'status',
            status: 'disconnected',
            message: 'Telnet session closed by user.'
          }));
        }
      } catch (e: any) {
        console.error('[Telnet WS] Error handling message:', e);
      }
    });

    ws.on('close', () => {
      console.log('[Telnet WS] WebSocket client closed connection');
      cleanup();
    });

    ws.on('error', (err) => {
      console.error('[Telnet WS] WebSocket socket error:', err);
      cleanup();
    });
  });

  return wss;
}
