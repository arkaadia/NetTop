import { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Client, ConnectConfig } from 'ssh2';

export interface SshTestParams {
  host: string;
  port?: number;
  username: string;
  password?: string;
  enablePassword?: string;
  timeoutMs?: number;
}

export interface SshTestResult {
  success: boolean;
  message: string;
  latency_ms?: number;
  banner?: string;
  authenticated?: boolean;
  details?: {
    host: string;
    port: number;
    username: string;
    authMethod: string;
    cipher?: string;
    keyExchange?: string;
  };
}

// Broad cryptographic compatibility for modern and legacy network equipment (Cisco IOS, Catalyst, ASA, Fortinet, MikroTik, Juniper)
const COMPATIBLE_ALGORITHMS: ConnectConfig['algorithms'] = {
  kex: [
    'diffie-hellman-group1-sha1',
    'diffie-hellman-group14-sha1',
    'diffie-hellman-group-exchange-sha1',
    'diffie-hellman-group-exchange-sha256',
    'ecdh-sha2-nistp256',
    'ecdh-sha2-nistp384',
    'ecdh-sha2-nistp521',
    'curve25519-sha256',
    'curve25519-sha256@libssh.org'
  ],
  cipher: [
    'aes128-ctr', 'aes192-ctr', 'aes256-ctr',
    'aes128-gcm', 'aes128-gcm@openssh.com',
    'aes256-gcm', 'aes256-gcm@openssh.com',
    'aes256-cbc', 'aes192-cbc', 'aes128-cbc',
    '3des-cbc'
  ],
  serverHostKey: [
    'ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256',
    'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521',
    'rsa-sha2-512', 'rsa-sha2-256', 'ssh-ed25519'
  ]
};

/**
 * Perform a real, synchronous-like SSH connection & authentication test against network hardware
 */
export function testRealSshConnection(params: SshTestParams): Promise<SshTestResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const port = params.port || 22;
    const timeout = params.timeoutMs || 8000;
    const conn = new Client();
    let isSettled = false;
    let bannerText = '';

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        try { conn.end(); } catch {}
        resolve({
          success: false,
          message: `Connection timed out after ${timeout / 1000}s. Check IP routing, firewall, or port 22 access.`,
          details: { host: params.host, port, username: params.username, authMethod: 'password' }
        });
      }
    }, timeout);

    conn.on('banner', (msg) => {
      bannerText += msg;
    });

    conn.on('ready', () => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);
      const latency = Date.now() - startTime;

      // Real successful authentication and SSH handshake
      resolve({
        success: true,
        authenticated: true,
        latency_ms: latency,
        banner: bannerText.trim() || undefined,
        message: `Successfully connected & authenticated via SSH on port ${port} (${latency}ms)`,
        details: {
          host: params.host,
          port,
          username: params.username,
          authMethod: 'password/interactive'
        }
      });

      try {
        conn.end();
      } catch {}
    });

    conn.on('error', (err: any) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);

      let msg = err.message || 'Unknown SSH connection error';
      if (err.level === 'client-authentication') {
        msg = `SSH Authentication failed: Invalid username or password for ${params.username}@${params.host}`;
      } else if (err.code === 'ECONNREFUSED') {
        msg = `Connection refused: Port ${port} is closed or SSH daemon is disabled on ${params.host}`;
      } else if (err.code === 'EHOSTUNREACH' || err.code === 'ENETUNREACH') {
        msg = `Network unreachable: Cannot route to ${params.host}. Verify gateway and physical link.`;
      } else if (err.code === 'ETIMEDOUT') {
        msg = `Connection timeout: Host ${params.host} did not respond on port ${port}.`;
      }

      resolve({
        success: false,
        authenticated: false,
        message: msg,
        details: { host: params.host, port, username: params.username, authMethod: 'password' }
      });

      try { conn.end(); } catch {}
    });

    try {
      conn.connect({
        host: params.host,
        port,
        username: params.username,
        password: params.password,
        readyTimeout: timeout,
        keepaliveInterval: 2000,
        keepaliveCountMax: 2,
        algorithms: COMPATIBLE_ALGORITHMS
      });
    } catch (err: any) {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        resolve({
          success: false,
          message: `SSH initialization error: ${err.message}`,
          details: { host: params.host, port, username: params.username, authMethod: 'password' }
        });
      }
    }
  });
}

/**
 * Configure WebSocket server on `/ws/ssh` to provide a real interactive pseudo-terminal session
 */
export function setupSshWebSocketServer(server: http.Server) {
  const wss = new WebSocketServer({
    server,
    path: '/ws/ssh'
  });

  console.log('[SSH Server] WebSocket SSH interactive gateway initialized on path /ws/ssh');

  wss.on('connection', (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`[SSH WS] New WebSocket client connected from ${clientIp}`);

    let sshClient: Client | null = null;
    let sshStream: any = null;
    let isConnected = false;

    const cleanup = () => {
      if (sshStream) {
        try { sshStream.end(); } catch {}
        sshStream = null;
      }
      if (sshClient) {
        try { sshClient.end(); } catch {}
        sshClient = null;
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
          // If raw input text was sent directly
          payload = { type: 'data', data: rawStr };
        }

        if (payload.type === 'connect') {
          cleanup();

          const {
            host,
            port = 22,
            username,
            password,
            enablePassword,
            termCols = 100,
            termRows = 30
          } = payload;

          if (!host || !username) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Missing host or username in SSH connect request'
            }));
            return;
          }

          ws.send(JSON.stringify({
            type: 'status',
            status: 'connecting',
            message: `Initiating real SSH connection to ${username}@${host}:${port}...`
          }));

          sshClient = new Client();

          sshClient.on('banner', (banner) => {
            ws.send(JSON.stringify({
              type: 'banner',
              banner
            }));
          });

          sshClient.on('ready', () => {
            isConnected = true;
            ws.send(JSON.stringify({
              type: 'status',
              status: 'authenticated',
              message: `SSH authentication succeeded! Spawning interactive terminal session...`
            }));

            // Spawn interactive PTY shell
            sshClient?.shell({
              term: 'xterm-256color',
              cols: termCols,
              rows: termRows
            }, (shellErr, stream) => {
              if (shellErr) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: `Failed to open PTY shell: ${shellErr.message}`
                }));
                cleanup();
                return;
              }

              sshStream = stream;

              // If an enable secret is provided for Cisco IOS, user can also auto-elevate or elevate via toolbar
              ws.send(JSON.stringify({
                type: 'status',
                status: 'ready',
                message: `Terminal connected. Ready for commands.`
              }));

              // Pipe data from SSH remote appliance to WebSocket
              stream.on('data', (chunk: Buffer) => {
                ws.send(JSON.stringify({
                  type: 'data',
                  data: chunk.toString('utf-8')
                }));
              });

              stream.on('close', () => {
                ws.send(JSON.stringify({
                  type: 'status',
                  status: 'closed',
                  message: `Remote SSH session closed by host.`
                }));
                cleanup();
              });

              stream.stderr?.on('data', (errChunk: Buffer) => {
                ws.send(JSON.stringify({
                  type: 'data',
                  data: errChunk.toString('utf-8')
                }));
              });
            });
          });

          sshClient.on('error', (err: any) => {
            let msg = err.message || 'SSH error';
            if (err.level === 'client-authentication') {
              msg = `Authentication rejected: Incorrect username or password for ${username}@${host}`;
            } else if (err.code === 'ECONNREFUSED') {
              msg = `Connection refused: Host ${host} rejected connection on port ${port}`;
            } else if (err.code === 'ETIMEDOUT') {
              msg = `Connection timed out: Host ${host} did not respond within deadline`;
            }
            ws.send(JSON.stringify({
              type: 'error',
              message: msg,
              code: err.code
            }));
            cleanup();
          });

          sshClient.on('close', () => {
            if (isConnected) {
              ws.send(JSON.stringify({
                type: 'status',
                status: 'disconnected',
                message: `SSH connection terminated.`
              }));
            }
            cleanup();
          });

          try {
            sshClient.connect({
              host,
              port: Number(port) || 22,
              username,
              password,
              readyTimeout: 12000,
              algorithms: COMPATIBLE_ALGORITHMS,
              keepaliveInterval: 5000,
              keepaliveCountMax: 3
            });
          } catch (connErr: any) {
            ws.send(JSON.stringify({
              type: 'error',
              message: `Connection setup failure: ${connErr.message}`
            }));
            cleanup();
          }

        } else if (payload.type === 'data') {
          // Keystroke / command string sent to remote appliance
          if (sshStream && isConnected) {
            sshStream.write(payload.data);
          }
        } else if (payload.type === 'resize') {
          // Terminal window resize event
          if (sshStream && payload.cols && payload.rows) {
            try {
              sshStream.setWindow(payload.rows, payload.cols, 0, 0);
            } catch (resizeErr) {
              console.warn('[SSH WS] Error setting window size:', resizeErr);
            }
          }
        } else if (payload.type === 'disconnect') {
          cleanup();
          ws.send(JSON.stringify({
            type: 'status',
            status: 'disconnected',
            message: 'Session closed by user.'
          }));
        }
      } catch (e: any) {
        console.error('[SSH WS] Error handling message:', e);
      }
    });

    ws.on('close', () => {
      console.log('[SSH WS] WebSocket client closed connection');
      cleanup();
    });

    ws.on('error', (err) => {
      console.error('[SSH WS] WebSocket socket error:', err);
      cleanup();
    });
  });

  return wss;
}
