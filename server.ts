import express, { Request, Response } from 'express';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import http from 'http';
import url from 'url';
import { WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  testRealSshConnection,
  setupSshWebSocketServer,
  fetchRealSwitchDataViaSsh,
  syncDeviceWithRealSwitch,
  applyPortConfigViaSsh,
  executeTerminalDiagnosticsAndCommand
} from './server/sshManager';
import {
  testRealTelnetConnection,
  setupTelnetWebSocketServer
} from './server/telnetManager';
import {
  setupRemoteDesktopWebSocketServer
} from './server/remoteDesktopTunnel';
import {
  setupSshTestWebSocketServer
} from './server/sshTestTunnel';
import {
  discoverCdpLldp,
  importNeighbors
} from './server/cdpLldpDiscovery';

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
  
  const pythonCmd = process.env.PYTHON_CMD || (process.platform === 'win32' ? 'python' : 'python3');
  pythonProcess = spawn(pythonCmd, [pythonScript, String(PYTHON_PORT)], {
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

// Interactive Real SSH Terminal Execution & Deep Diagnostics endpoint
app.post('/api/terminal/exec', async (req: Request, res: Response) => {
  try {
    const { host, port, username, password, enablePassword, command, timeoutMs, completePrefix, mode } = req.body || {};
    if (!host || !username) {
      return res.status(400).json({
        success: false,
        message: 'Host and username are required for terminal execution & diagnostics',
        stages: []
      });
    }

    const isComplete = mode === 'complete' || completePrefix !== undefined;
    console.log(`[Terminal Exec API] Running ${isComplete ? 'real completion' : 'diagnostic execution'} pipeline on ${username}@${host}:${port || 22}...`);
    const result = await executeTerminalDiagnosticsAndCommand({
      host: String(host).trim(),
      port: Number(port) || 22,
      username: String(username).trim(),
      password: password !== undefined ? String(password) : '',
      enablePassword: enablePassword !== undefined ? String(enablePassword) : '',
      command: command !== undefined ? String(command) : '',
      timeoutMs: Number(timeoutMs) || 12000,
      completePrefix: completePrefix !== undefined ? String(completePrefix) : undefined,
      mode: isComplete ? 'complete' : 'exec'
    });

    res.json(result);
  } catch (err: any) {
    console.error('[Terminal Exec API] Unexpected error in /api/terminal/exec:', err);
    res.status(500).json({
      success: false,
      message: `Terminal diagnostics execution error: ${err.message}`,
      stages: []
    });
  }
});

// Dedicated endpoint for querying real hardware command autocompletion directly
app.post('/api/terminal/complete', async (req: Request, res: Response) => {
  try {
    const { host, port, username, password, enablePassword, prefix, timeoutMs } = req.body || {};
    if (!host || !username) {
      return res.status(400).json({
        success: false,
        message: 'Host and username are required for command completion query',
        stages: []
      });
    }

    const result = await executeTerminalDiagnosticsAndCommand({
      host: String(host).trim(),
      port: Number(port) || 22,
      username: String(username).trim(),
      password: password !== undefined ? String(password) : '',
      enablePassword: enablePassword !== undefined ? String(enablePassword) : '',
      completePrefix: prefix !== undefined ? String(prefix) : '',
      mode: 'complete',
      timeoutMs: Number(timeoutMs) || 10000
    });

    res.json(result);
  } catch (err: any) {
    console.error('[Terminal Complete API] Error in /api/terminal/complete:', err);
    res.status(500).json({
      success: false,
      message: `Terminal completion query error: ${err.message}`,
      stages: []
    });
  }
});

// Real Telnet testing and diagnostics endpoint (handled natively by Node.js net.Socket)
app.post('/api/telnet/test', async (req: Request, res: Response) => {
  try {
    const { host, port, timeoutMs } = req.body || {};
    if (!host) {
      return res.status(400).json({
        success: false,
        message: 'Host is required for Telnet test'
      });
    }

    console.log(`[Telnet Service] Performing real Telnet connection test to ${host}:${port || 23}...`);
    const result = await testRealTelnetConnection({
      host,
      port: Number(port) || 23,
      timeoutMs: Number(timeoutMs) || 5000
    });

    res.json(result);
  } catch (err: any) {
    console.error('[Telnet Service] Unexpected error in /api/telnet/test:', err);
    res.status(500).json({
      success: false,
      message: `Telnet test error: ${err.message}`
    });
  }
});

// Discover real hardware specs & ports from switch via SSH
app.post('/api/ssh/discover', async (req: Request, res: Response) => {
  try {
    const { host, port, username, password, enablePassword, timeoutMs } = req.body || {};
    if (!host || !username) {
      return res.status(400).json({
        success: false,
        message: 'Host and username are required for switch discovery'
      });
    }

    console.log(`[SSH Discovery] Querying physical switch ${username}@${host}:${port || 22} for real hardware specs & ports...`);
    const result = await fetchRealSwitchDataViaSsh({
      host,
      port: Number(port) || 22,
      username,
      password: password || '',
      enablePassword: enablePassword || '',
      timeoutMs: Number(timeoutMs) || 25000
    });

    res.json(result);
  } catch (err: any) {
    console.error('[SSH Discovery] Unexpected error in /api/ssh/discover:', err);
    res.status(500).json({
      success: false,
      message: `Discovery error: ${err.message}`
    });
  }
});

// Synchronize real hardware specs & ports from switch into persistent database
app.post('/api/ssh/sync-device', async (req: Request, res: Response) => {
  try {
    let { deviceId, host, port, username, password, enablePassword } = req.body || {};

    // If deviceId provided, load credentials from network_data.json if not provided in payload
    if (deviceId && (!host || !username)) {
      try {
        const fs = await import('fs');
        const dataPath = path.join(projectRoot, 'backend', 'network_data.json');
        if (fs.existsSync(dataPath)) {
          const raw = fs.readFileSync(dataPath, 'utf-8');
          const parsed = JSON.parse(raw);
          const found = (parsed.devices || []).find((d: any) => d.id === deviceId);
          if (found) {
            host = host || found.ip;
            port = port || found.ssh_port || 22;
            username = username || found.ssh_username || 'admin';
            password = password !== undefined ? password : (found.ssh_password || '');
            enablePassword = enablePassword !== undefined ? enablePassword : (found.enable_password || '');
          }
        }
      } catch (loadErr) {
        console.warn('[SSH Sync] Error reading device info from file:', loadErr);
      }
    }

    if (!host || !username) {
      return res.status(400).json({
        success: false,
        message: 'Host and username are required for switch synchronization'
      });
    }

    console.log(`[SSH Sync] Synchronizing switch ${deviceId || host} (${username}@${host}:${port || 22})...`);
    const result = await syncDeviceWithRealSwitch(projectRoot, {
      deviceId,
      host,
      port: Number(port) || 22,
      username,
      password: password || '',
      enablePassword: enablePassword || ''
    });

    res.json(result);
  } catch (err: any) {
    console.error('[SSH Sync] Unexpected error in /api/ssh/sync-device:', err);
    res.status(500).json({
      success: false,
      message: `Synchronization error: ${err.message}`
    });
  }
});

// CDP & LLDP Neighbor Discovery endpoint (supports single switch query, subnet range, or local network)
app.post('/api/cdp-lldp/discover', async (req: Request, res: Response) => {
  try {
    const { mode, deviceId, subnet, protocol, sshPort, timeoutMs } = req.body || {};
    const result = await discoverCdpLldp(projectRoot, {
      mode: mode || 'device',
      deviceId,
      subnet,
      protocol: protocol || 'all',
      sshPort,
      timeoutMs
    });
    res.json(result);
  } catch (err: any) {
    console.error('[CDP/LLDP Discovery] Error in /api/cdp-lldp/discover:', err);
    res.status(500).json({
      success: false,
      message: `خطای کاوش همسایگان: ${err.message}`,
      message_en: `Discovery failed: ${err.message}`
    });
  }
});

// Import discovered CDP/LLDP neighbors directly into network topology
app.post('/api/cdp-lldp/import-neighbors', async (req: Request, res: Response) => {
  try {
    const { neighbors } = req.body || {};
    if (!neighbors || !Array.isArray(neighbors) || neighbors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'هیچ همسایه‌ای برای افزودن به توپولوژی انتخاب نشده است.',
        message_en: 'No neighbors selected to import into topology.'
      });
    }

    const result = await importNeighbors(projectRoot, neighbors);
    res.json(result);
  } catch (err: any) {
    console.error('[CDP/LLDP Import] Error in /api/cdp-lldp/import-neighbors:', err);
    res.status(500).json({
      success: false,
      message: `خطای ثبت همسایگان در توپولوژی: ${err.message}`,
      message_en: `Import failed: ${err.message}`
    });
  }
});

// Real switch port configuration endpoint (VLAN, Port Security, Admin Status, Mode, etc. via SSH)
const handlePortConfigExecution = async (req: Request, res: Response) => {
  try {
    const {
      deviceId,
      interface: interfaceName,
      portId,
      action,
      oldValue,
      newValue,
      updates,
      commands,
      host,
      port,
      username,
      password,
      enablePassword
    } = req.body || {};

    const targetInterface = interfaceName || portId || req.params.portId;
    const targetDevice = deviceId || req.params.deviceId;

    if (!targetInterface) {
      return res.status(400).json({
        success: false,
        error: 'Interface ID or name is required'
      });
    }

    console.log(`[SSH Apply Config] Executing ${action || 'config'} on ${targetDevice || 'Switch'} interface ${targetInterface}...`);
    const result = await applyPortConfigViaSsh(projectRoot, {
      deviceId: targetDevice,
      interfaceName: targetInterface,
      action: action || 'port_config',
      oldValue,
      newValue,
      updates: updates || (req.body && !updates ? req.body : {}),
      commands,
      host,
      port: port ? Number(port) : undefined,
      username,
      password,
      enablePassword
    });

    return res.json(result);
  } catch (err: any) {
    console.error('[SSH Apply Config] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: `Failed to execute switch configuration: ${err.message}`
    });
  }
};

app.post('/api/ssh/apply-port-config', handlePortConfigExecution);
app.post('/api/devices/:deviceId/ports/:portId/apply', handlePortConfigExecution);
app.post('/api/switch/apply-port-config', handlePortConfigExecution);

// Network Automation Engine Endpoints
import { ConfigEngine } from './server/automation/configEngine';
const automationEngine = new ConfigEngine(projectRoot);

// 1. Preview & Validation
app.post('/api/automation/preview', async (req: Request, res: Response) => {
  try {
    const task = req.body;
    if (!task || !task.deviceId || !task.category) {
      return res.status(400).json({ error: 'deviceId and category are required.' });
    }
    const result = await automationEngine.preview(task);
    res.json(result);
  } catch (err: any) {
    console.error('[Automation Preview Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to generate automation preview.' });
  }
});

// 1.b Dual-Switch Preview (Cross-Switch LACP / Dual Devices)
app.post('/api/automation/preview-dual', async (req: Request, res: Response) => {
  try {
    const { taskA, taskB } = req.body || {};
    if (!taskA || !taskB) {
      return res.status(400).json({ error: 'Both taskA and taskB payloads are required.' });
    }
    const [resultA, resultB] = await Promise.all([
      automationEngine.preview(taskA),
      automationEngine.preview(taskB)
    ]);
    res.json({ switchA: resultA, switchB: resultB });
  } catch (err: any) {
    console.error('[Automation Preview-Dual Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to generate dual automation preview.' });
  }
});

// 2. Full Apply Execution with Pre-Backup and Post-Verification
app.post('/api/automation/apply', async (req: Request, res: Response) => {
  try {
    const { task, autoRollbackOnFailure, user } = req.body || {};
    if (!task || !task.deviceId || !task.category) {
      return res.status(400).json({ error: 'Valid automation task payload is required.' });
    }
    const result = await automationEngine.apply(task, { autoRollbackOnFailure: !!autoRollbackOnFailure, user: user || 'admin' });
    res.json(result);
  } catch (err: any) {
    console.error('[Automation Apply Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to apply automation configuration.' });
  }
});

// 2.b Dual-Switch Apply Execution with Cross-Switch Protection
app.post('/api/automation/apply-dual', async (req: Request, res: Response) => {
  try {
    const { taskA, taskB, autoRollbackOnFailure, user } = req.body || {};
    if (!taskA || !taskB) {
      return res.status(400).json({ error: 'Both taskA and taskB are required for dual orchestration.' });
    }
    const result = await automationEngine.applyDual(taskA, taskB, {
      autoRollbackOnFailure: autoRollbackOnFailure !== false,
      user: user || 'admin'
    });
    res.json(result);
  } catch (err: any) {
    console.error('[Automation Apply-Dual Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to apply dual automation configuration.' });
  }
});

// 3. Rollback
app.post('/api/automation/rollback', async (req: Request, res: Response) => {
  try {
    const { deviceId, backupId, commands } = req.body || {};
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required for rollback.' });
    }
    const result = await automationEngine.rollback(deviceId, backupId, commands);
    res.json(result);
  } catch (err: any) {
    console.error('[Automation Rollback Error]:', err);
    res.status(500).json({ error: err.message || 'Rollback execution failed.' });
  }
});

// 4. Security Audit & Scoring
app.get('/api/automation/security-audit/:deviceId', async (req: Request, res: Response) => {
  try {
    const deviceId = req.params.deviceId;
    const report = await automationEngine.runSecurityAudit(deviceId);
    res.json(report);
  } catch (err: any) {
    console.error('[Automation Audit Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to generate security audit.' });
  }
});

// 5. Backups Catalog
app.get('/api/automation/backups', (req: Request, res: Response) => {
  try {
    const deviceId = req.query.deviceId as string | undefined;
    const backups = automationEngine.getBackupManager().getBackups(deviceId);
    res.json(backups);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Audit Trail Logs
app.get('/api/automation/audit', (req: Request, res: Response) => {
  try {
    const { deviceId, vendor, status, q } = req.query;
    const logs = automationEngine.getAuditLogger().getLogs({
      deviceId: deviceId as string,
      vendor: vendor as string,
      status: status as string,
      query: q as string
    });
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
    proxyReq.setHeader('Content-Type', 'application/json; charset=utf-8');
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

  // Initialize individual WebSocket servers with noServer to avoid upgrade route hijacking
  const sshWss = new WebSocketServer({ noServer: true });
  const telnetWss = new WebSocketServer({ noServer: true });
  const rdpWss = new WebSocketServer({ noServer: true });
  const sshTestWss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const parsed = url.parse(request.url || '');
    const pathname = parsed.pathname;

    if (pathname === '/ws/ssh') {
      sshWss.handleUpgrade(request, socket, head, (ws) => {
        sshWss.emit('connection', ws, request);
      });
    } else if (pathname === '/ws/ssh-test') {
      sshTestWss.handleUpgrade(request, socket, head, (ws) => {
        sshTestWss.emit('connection', ws, request);
      });
    } else if (pathname === '/ws/telnet') {
      telnetWss.handleUpgrade(request, socket, head, (ws) => {
        telnetWss.emit('connection', ws, request);
      });
    } else if (pathname === '/ws/remote-desktop') {
      rdpWss.handleUpgrade(request, socket, head, (ws) => {
        rdpWss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Attach respective handlers
  setupSshWebSocketServer(sshWss);
  setupTelnetWebSocketServer(telnetWss);
  setupRemoteDesktopWebSocketServer(rdpWss);
  setupSshTestWebSocketServer(sshTestWss);

  const HOST = process.env.HOST || '0.0.0.0';
  server.listen(PORT, HOST, () => {
    console.log(`Node/Express frontend + SSH WebSocket gateway running on http://${HOST}:${PORT}`);
  });
}

startServer();
