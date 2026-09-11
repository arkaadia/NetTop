import express, { Request, Response } from 'express';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import { testRealSshConnection, setupSshWebSocketServer } from './server/sshManager';

// Safely determine current directory and project root in both CJS bundle and TSX ESM dev mode
const getCurrentDir = () => {
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  return process.cwd();
};

const currentDir = getCurrentDir();
// If running from dist/server.cjs, project root is one level up
const projectRoot = path.basename(currentDir) === 'dist' ? path.resolve(currentDir, '..') : currentDir;

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (process.env.FRONTEND_PORT ? parseInt(process.env.FRONTEND_PORT, 10) : 3000);
const PYTHON_PORT = process.env.BACKEND_PORT ? parseInt(process.env.BACKEND_PORT, 10) : (process.env.PYTHON_PORT ? parseInt(process.env.PYTHON_PORT, 10) : 5001);

// Parse json and urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Child process for Python backend
let pythonProcess: ChildProcess | null = null;

function startPythonBackend() {
  const pythonScript = path.join(projectRoot, 'backend', 'server.py');
  console.log(`[Python Manager] Starting Python backend from ${pythonScript} on port ${PYTHON_PORT}...`);
  
  pythonProcess = spawn('python3', [pythonScript, String(PYTHON_PORT)], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      BACKEND_PORT: String(PYTHON_PORT),
      PYTHON_PORT: String(PYTHON_PORT)
    }
  });

  pythonProcess.on('error', (err) => {
    console.error('[Python Manager] Failed to start Python process:', err);
  });

  pythonProcess.on('exit', (code, signal) => {
    console.warn(`[Python Manager] Python process exited with code ${code}, signal ${signal}. Restarting in 2s...`);
    setTimeout(startPythonBackend, 2000);
  });
}

// Start Python
startPythonBackend();

// Clean up on exit
process.on('SIGTERM', () => {
  if (pythonProcess) pythonProcess.kill();
  process.exit(0);
});
process.on('SIGINT', () => {
  if (pythonProcess) pythonProcess.kill();
  process.exit(0);
});

// Bridge status endpoint to verify frontend-backend intercommunication
app.get('/api/status/bridge', (req: Request, res: Response) => {
  res.json({
    status: 'connected',
    bridge: 'active',
    frontendPort: PORT,
    backendPort: PYTHON_PORT,
    timestamp: new Date().toISOString()
  });
});

// Real SSH testing and diagnostics endpoint (handled natively by Node.js ssh2)
app.post('/api/ssh/test', async (req: Request, res: Response) => {
  try {
    const { host, port, username, password, enablePassword, timeoutMs } = req.body || {};
    if (!host || !username) {
      return res.status(400).json({
        success: false,
        message: 'Host and username are required for SSH test'
      });
    }

    console.log(`[SSH Service] Performing real SSH connection test to ${username}@${host}:${port || 22}...`);
    const result = await testRealSshConnection({
      host,
      port: Number(port) || 22,
      username,
      password: password || '',
      enablePassword: enablePassword || '',
      timeoutMs: Number(timeoutMs) || 8000
    });

    res.json(result);
  } catch (err: any) {
    console.error('[SSH Service] Unexpected error in /api/ssh/test:', err);
    res.status(500).json({
      success: false,
      message: `SSH test error: ${err.message}`
    });
  }
});

// Proxy other /api/* requests to Python HTTP server
app.use('/api', (req: Request, res: Response) => {
  const options: http.RequestOptions = {
    hostname: '127.0.0.1',
    port: PYTHON_PORT,
    path: req.originalUrl,
    method: req.method,
    headers: {
      ...req.headers,
      host: `127.0.0.1:${PYTHON_PORT}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`[API Proxy Error] Unable to connect to Python backend: ${err.message}`);
    res.status(503).json({
      error: 'Python backend is starting up or temporarily unavailable',
      details: err.message,
      engine: 'Python 3.10 Network Topology Engine'
    });
  });

  if (req.body && Object.keys(req.body).length > 0) {
    const bodyData = JSON.stringify(req.body);
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }

  proxyReq.end();
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' || path.basename(currentDir) === 'dist';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(projectRoot, 'dist');
    console.log(`[Production Server] Serving static web UI from ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Create unified HTTP server for Express and WebSocket
  const server = http.createServer(app);

  // Initialize interactive SSH WebSocket gateway
  setupSshWebSocketServer(server);

  const HOST = process.env.HOST || '0.0.0.0';
  server.listen(PORT, HOST, () => {
    console.log(`Node/Express frontend + SSH WebSocket gateway running on http://${HOST}:${PORT}`);
  });
}

startServer();
