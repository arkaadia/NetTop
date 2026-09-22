import http from 'http';
import path from 'path';
import url from 'url';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';

interface SshSessionCredentials {
  device_id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: string;
  password?: string;
  private_key?: string;
  passphrase?: string;
  pty_type?: string;
}

/**
 * Validates session token with Python backend and retrieves decrypted credentials.
 */
async function fetchCredentialsByToken(token: string): Promise<SshSessionCredentials | null> {
  return new Promise((resolve) => {
    const pythonPort = process.env.BACKEND_PORT || process.env.PYTHON_PORT || '5001';
    const reqUrl = `http://127.0.0.1:${pythonPort}/api/ssh-test/internal/session-credentials?token=${encodeURIComponent(token)}`;
    const req = http.get(reqUrl, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const data = JSON.parse(raw);
            resolve(data.credentials || null);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(4000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Configure WebSocket server on `/ws/ssh-test` backed by genuine Paramiko 2 Python engine.
 */
export function setupSshTestWebSocketServer(server: http.Server) {
  const wss = new WebSocketServer({
    server,
    path: '/ws/ssh-test'
  });

  const getCurrentDir = () => (typeof __dirname !== 'undefined' ? __dirname : process.cwd());
  const currentDir = getCurrentDir();
  const projectRoot = path.basename(currentDir) === 'dist' ? path.resolve(currentDir, '..') : currentDir;

  console.log(`[SSH Test Gateway] WebSocket terminal tunnel initialized on /ws/ssh-test (Engine: Python Paramiko 2)`);

  wss.on('connection', async (ws: WebSocket, req) => {
    const parsedUrl = url.parse(req.url || '', true);
    const token = (parsedUrl.query.token as string) || '';
    const initialCols = parseInt((parsedUrl.query.cols as string) || '100', 10);
    const initialRows = parseInt((parsedUrl.query.rows as string) || '30', 10);

    if (!token) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'توکن دسترسی معتبر برای برقراری ارتباط ترمینال ارائه نشده است.',
        message_en: 'Session token required.'
      }));
      ws.close(1008, 'Token required');
      return;
    }

    ws.send(JSON.stringify({
      type: 'status',
      status: 'authorizing',
      message: 'در حال اعتبارسنجی توکن و فراخوانی هسته Paramiko 2...'
    }));

    const creds = await fetchCredentialsByToken(token);
    if (!creds) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'توکن نامعتبر یا منقضی شده است. لطفاً نشست را مجدداً برقرار نمایید.',
        message_en: 'Invalid or expired session token.'
      }));
      ws.close(1008, 'Unauthorized token');
      return;
    }

    ws.send(JSON.stringify({
      type: 'status',
      status: 'connecting',
      message: `اتصال اینتراکتیو به ${creds.username}@${creds.host}:${creds.port} از طریق پایتون و پارامیکو...`
    }));

    const pythonCmd = process.env.PYTHON_CMD || (process.platform === 'win32' ? 'python' : 'python3');
    const workerScript = path.join(projectRoot, 'backend', 'ssh_test', 'terminal_worker.py');

    let worker: ChildProcessWithoutNullStreams | null = null;
    let isTerminated = false;

    const cleanup = () => {
      if (isTerminated) return;
      isTerminated = true;
      if (worker) {
        try {
          worker.kill('SIGTERM');
        } catch {}
        worker = null;
      }
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      } catch {}
    };

    try {
      worker = spawn(pythonCmd, [workerScript], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1'
        }
      });

      worker.on('error', (err) => {
        console.error('[SSH Test Worker] Failed to start Python Paramiko worker:', err);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: `خطای راه‌اندازی فرآیند پایتون پارامیکو: ${err.message}`
          }));
        }
        cleanup();
      });

      worker.on('exit', (code, signal) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'status',
            status: 'disconnected',
            message: `نشست ترمینال پایان یافت (کد خروج: ${code ?? signal}).`
          }));
        }
        cleanup();
      });

      // Stream stdout from Python Paramiko worker to WebSocket
      let buffer = '';
      worker.stdout.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf-8');
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(parsed));
            }
          } catch {
            // Forward raw data as fallback
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'data', data: trimmed + '\r\n' }));
            }
          }
        }
      });

      // Stream stderr from Python Paramiko worker
      worker.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8');
        console.warn(`[SSH Test Worker Stderr] ${text.trim()}`);
      });

      // Send initial configuration to Python worker stdin
      const initPayload = JSON.stringify({
        host: creds.host,
        port: creds.port,
        username: creds.username,
        password: creds.password || '',
        private_key: creds.private_key || '',
        passphrase: creds.passphrase || null,
        auth_type: creds.auth_type,
        cols: initialCols,
        rows: initialRows,
        term: creds.pty_type || 'xterm-256color'
      });
      worker.stdin.write(initPayload + '\n');

    } catch (spawnErr: any) {
      console.error('[SSH Test Gateway] Error spawning Paramiko worker:', spawnErr);
      ws.send(JSON.stringify({
        type: 'error',
        message: `خطا در اجرای اسکریپت ترمینال: ${spawnErr.message}`
      }));
      cleanup();
      return;
    }

    // Forward messages from WebSocket client to Python Paramiko worker stdin
    ws.on('message', (msgData: any) => {
      if (!worker || isTerminated) return;
      try {
        const str = msgData.toString();
        let payload: any;
        try {
          payload = JSON.parse(str);
        } catch {
          payload = { type: 'input', data: str };
        }

        if (payload.type === 'input' || payload.type === 'resize' || payload.type === 'ping' || payload.type === 'disconnect') {
          worker.stdin.write(JSON.stringify(payload) + '\n');
        }
      } catch (err: any) {
        console.error('[SSH Test Gateway] Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      cleanup();
    });

    ws.on('error', (err) => {
      console.warn('[SSH Test Gateway] WebSocket client error:', err);
      cleanup();
    });
  });
}
