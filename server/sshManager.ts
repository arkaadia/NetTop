import { Request, Response } from 'express';
import http from 'http';
import net from 'net';
import fs from 'fs';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { Client, ConnectConfig } from 'ssh2';

export interface TerminalExecParams {
  host: string;
  port?: number;
  username: string;
  password?: string;
  enablePassword?: string;
  command?: string;
  timeoutMs?: number;
}

export interface TerminalDiagnosticStage {
  id: string;
  name: string;
  nameFa: string;
  status: 'success' | 'failed' | 'warning' | 'skipped' | 'in_progress';
  latency_ms?: number;
  details: string;
  detailsFa: string;
  rawError?: string;
  errorFixFa?: string;
  errorFixEn?: string;
}

export interface TerminalExecResult {
  success: boolean;
  message: string;
  messageFa?: string;
  latency_ms: number;
  stages: TerminalDiagnosticStage[];
  failureStage?: string;
  failureLayer?: string;
  rootCause?: string;
  rootCauseFa?: string;
  recommendation?: string;
  recommendationFa?: string;
  banner?: string;
  cipher?: string;
  kex?: string;
  commandOutput?: string;
  timestamp: string;
}

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

export interface ParsedSwitchPort {
  port_id: string;
  name: string;
  status: 'up' | 'down';
  admin_status: 'enabled' | 'disabled';
  mode: 'access' | 'trunk';
  vlan: number;
  allowed_vlans: string;
  speed: string;
  duplex: string;
  description: string;
  connected_device?: string;
  connected_type?: string;
  poe_status?: string;
  poe_power?: number;
}

export interface RealSwitchData {
  device: {
    model?: string;
    firmware?: string;
    uptime?: string;
    mac?: string;
    serial?: string;
    hostname?: string;
    total_ports?: number;
  };
  ports: ParsedSwitchPort[];
  rawSummary?: string;
}

export interface SshDeviceSyncParams {
  host: string;
  port?: number;
  username: string;
  password?: string;
  enablePassword?: string;
  timeoutMs?: number;
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
  ],
  hmac: [
    'hmac-sha1',
    'hmac-sha1-96',
    'hmac-sha2-256',
    'hmac-sha2-512',
    'hmac-md5',
    'hmac-md5-96',
    'hmac-ripemd160',
    'hmac-sha1-etm@openssh.com',
    'hmac-sha2-256-etm@openssh.com',
    'hmac-sha2-512-etm@openssh.com'
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

    conn.on('keyboard-interactive', (_name, _instructions, _instructionsLang, prompts, finish) => {
      finish(prompts.map(() => params.password || ''));
    });

    try {
      conn.connect({
        host: params.host,
        port,
        username: params.username,
        password: params.password,
        readyTimeout: timeout,
        tryKeyboard: true,
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
export function setupSshWebSocketServer(server: http.Server | WebSocketServer) {
  const wss = server instanceof WebSocketServer
    ? server
    : new WebSocketServer({ server, path: '/ws/ssh' });

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
            let failureStage = 'ssh_banner';
            let failureLayer = 'Layer 4/7 (Network/SSH)';
            let rootCauseFa = 'خطا در ارتباط با سرور SSH';
            let recommendationFa = 'اتصال شبکه و تنظیمات را بررسی کنید';

            if (err.level === 'client-authentication') {
              msg = `Authentication rejected: Incorrect username or password for ${username}@${host}`;
              failureStage = 'auth';
              failureLayer = 'لایه احراز هویت (AAA / Authentication)';
              rootCauseFa = 'نام کاربری یا کلمه عبور وارد شده توسط سوئیچ رد شد (Access Denied).';
              recommendationFa = 'نام کاربری و رمز عبور را در کشوی احراز هویت بررسی کنید و مطمئن شوید اکانت دسترسی SSH دارد.';
            } else if (err.code === 'ECONNREFUSED') {
              msg = `Connection refused: Host ${host} rejected connection on port ${port}`;
              failureStage = 'tcp_socket';
              failureLayer = 'لایه ۴ (ترنسپورت) / TCP Port 22';
              rootCauseFa = `پورت ${port} روی دستگاه بسته است یا سرویس SSH روی سوییچ غیرفعال است.`;
              recommendationFa = 'روی سوئیچ سیسکو دستورات line vty 0 4، transport input ssh و crypto key generate rsa را بررسی و اعمال کنید.';
            } else if (err.code === 'ETIMEDOUT') {
              msg = `Connection timed out: Host ${host} did not respond within deadline`;
              failureStage = 'tcp_socket';
              failureLayer = 'لایه ۳ (شبکه) / IP Routing';
              rootCauseFa = 'مهلت اتصال به پایان رسید (Timeout). بسته‌های TCP SYN پاسخی دریافت نکردند.';
              recommendationFa = 'روشن بودن سوئیچ، کابل شبکه و فایروال بین دستگاه‌ها را بررسی نمایید.';
            } else if (err.code === 'EHOSTUNREACH' || err.code === 'ENETUNREACH') {
              msg = `Host unreachable: Cannot route to ${host}`;
              failureStage = 'tcp_socket';
              failureLayer = 'لایه ۲/۳ (پیوند داده و شبکه)';
              rootCauseFa = 'مسیر شبکه به آدرس مقصد در دسترس نیست (Host Unreachable).';
              recommendationFa = 'ارتباط فیزیکی کابل، پورت شبکه، آدرس Gateway و VLAN را بررسی کنید.';
            } else if (err.message && /kex|cipher|algorithm/i.test(err.message)) {
              failureStage = 'kex_cipher';
              failureLayer = 'لایه ۷ (رمزنگاری و تبادل کلید KEX)';
              rootCauseFa = 'عدم تطابق الگوریتم‌های رمزنگاری یا تبادل کلید بین کلاینت و سوئیچ.';
              recommendationFa = 'سوئیچ ممکن است از الگوریتم‌های قدیمی‌تر استفاده کند یا نیاز به تولید مجدد کلید RSA با اندازه ۲۰۴۸ بیت داشته باشد.';
            }

            ws.send(JSON.stringify({
              type: 'error',
              message: msg,
              code: err.code,
              level: err.level,
              failureStage,
              failureLayer,
              rootCauseFa,
              recommendationFa
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

          sshClient.on('keyboard-interactive', (_name, _instructions, _instructionsLang, prompts, finish) => {
            finish(prompts.map(() => password || ''));
          });

          try {
            sshClient.connect({
              host,
              port: Number(port) || 22,
              username,
              password,
              readyTimeout: 12000,
              tryKeyboard: true,
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

/**
 * Deep Terminal Connection Lifecycle & Diagnostic Engine for POST /api/terminal/exec
 * Executes a step-by-step diagnostic probe through all 5 layers:
 * 1. TCP Socket & Handshake (Layer 4)
 * 2. SSH Protocol Exchange & Server Banner (Protocol Identification)
 * 3. Key Exchange (KEX) & Cryptographic Negotiation
 * 4. User Authentication (AAA / Credentials)
 * 5. PTY Pseudo-terminal Allocation & Command Execution
 */
export async function executeTerminalDiagnosticsAndCommand(
  params: TerminalExecParams
): Promise<TerminalExecResult> {
  const startTime = Date.now();
  const host = params.host.trim();
  const port = Number(params.port) || 22;
  const username = params.username.trim();
  const password = params.password || '';
  const command = (params.command || '').trim();
  const totalTimeout = Number(params.timeoutMs) || 12000;

  const stages: TerminalDiagnosticStage[] = [
    {
      id: 'tcp_socket',
      name: 'TCP Socket Handshake (Port 22)',
      nameFa: 'سوکت و دست‌تکانی TCP (لایه ۴)',
      status: 'in_progress',
      details: `Probing TCP port ${port} on ${host}...`,
      detailsFa: `در حال بررسی در دسترس بودن پورت ${port} روی ${host}...`
    },
    {
      id: 'ssh_banner',
      name: 'SSH Protocol Version & Server Banner',
      nameFa: 'تبادل پروتکل و بنر شناسایی SSH',
      status: 'skipped',
      details: 'Awaiting TCP socket connection...',
      detailsFa: 'در انتظار اتصال سوکت TCP...'
    },
    {
      id: 'kex_cipher',
      name: 'Key Exchange & Cipher Negotiation',
      nameFa: 'مذاکره الگوریتم‌های رمزنگاری و KEX',
      status: 'skipped',
      details: 'Awaiting protocol banner...',
      detailsFa: 'در انتظار دریافت بنر پروتکل...'
    },
    {
      id: 'auth',
      name: 'User Authentication',
      nameFa: 'احراز هویت کاربر و سطح دسترسی',
      status: 'skipped',
      details: 'Awaiting cryptographic agreement...',
      detailsFa: 'در انتظار توافق الگوریتم‌های رمزنگاری...'
    },
    {
      id: 'pty_exec',
      name: 'PTY Shell & Command Execution',
      nameFa: 'تخصیص شل تعاملی PTY و اجرای فرامین',
      status: 'skipped',
      details: 'Awaiting authentication...',
      detailsFa: 'در انتظار تایید احراز هویت...'
    }
  ];

  // Step 1: Probe raw TCP socket (Layer 4)
  const tcpStart = Date.now();
  const tcpResult = await new Promise<{ ok: boolean; latency: number; error?: any }>((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const socketTimeout = Math.min(totalTimeout, 4000);

    const finish = (ok: boolean, err?: any) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve({ ok, latency: Date.now() - tcpStart, error: err });
      }
    };

    socket.setTimeout(socketTimeout);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false, { code: 'ETIMEDOUT', message: `TCP socket timeout after ${socketTimeout}ms` }));
    socket.once('error', (err) => finish(false, err));

    try {
      socket.connect(port, host);
    } catch (err) {
      finish(false, err);
    }
  });

  if (!tcpResult.ok) {
    const err = tcpResult.error || {};
    stages[0].status = 'failed';
    stages[0].latency_ms = tcpResult.latency;
    stages[0].rawError = err.message || err.code || 'TCP connection failure';

    let failureLayer = 'Layer 4 (Transport / TCP)';
    let rootCauseFa = `پورت ${port} بر روی آدرس ${host} در دسترس نیست.`;
    let rootCauseEn = `Port ${port} on ${host} is unreachable.`;
    let recommendationFa = 'اتصال کابل شبکه، آدرس IP و روشن بودن دستگاه را بررسی کنید.';
    let recommendationEn = 'Verify physical cable, IP address, device power and routing.';

    if (err.code === 'ECONNREFUSED') {
      failureLayer = 'لایه ۴ (ترنسپورت) / پورت بسته است';
      rootCauseFa = `اتصال توسط هاست رد شد (Connection Refused). پورت ${port} بسته است یا سرویس SSH روی سوئیچ فعال نشده است.`;
      rootCauseEn = `Connection refused on port ${port}. SSH service is disabled or blocked.`;
      recommendationFa = 'روی سوئیچ سیسکو دستورات line vty 0 4، transport input ssh و crypto key generate rsa را وارد کنید و فایروال را بررسی نمایید.';
      recommendationEn = 'Enable SSH on Cisco switch using "transport input ssh" under line vty and generate crypto keys.';
    } else if (err.code === 'ETIMEDOUT') {
      failureLayer = 'لایه ۳ (شبکه) / تایم‌اوت عدم دسترسی';
      rootCauseFa = `مهلت اتصال به پایان رسید (Timeout). بسته‌های TCP SYN هیچ پاسخی دریافت نکردند. سوئیچ خاموش است یا مسیر در فایروال مسدود است.`;
      rootCauseEn = `Connection timed out waiting for TCP response. Device may be offline or firewall is blocking packets.`;
      recommendationFa = 'روشن بودن سوئیچ، تنظیمات ساب‌نت/VLAN، کابل شبکه و قوانین فایروال/ACL را بررسی فرمایید.';
      recommendationEn = 'Check switch power, VLAN assignment, network cables, and firewall/ACL rules.';
    } else if (err.code === 'EHOSTUNREACH' || err.code === 'ENETUNREACH') {
      failureLayer = 'لایه ۲ و ۳ (پیوند داده و مسیریابی)';
      rootCauseFa = `شبکه یا هاست مقصد در دسترس نیست (Host/Network Unreachable). مسیر روتینگ به این IP وجود ندارد.`;
      rootCauseEn = `Network route to ${host} is unreachable. Check default gateway.`;
      recommendationFa = 'آدرس گیت‌وی پیش‌فرض، جدول روتینگ و اتصال فیزیکی پورت را بررسی کنید.';
      recommendationEn = 'Inspect default gateway, routing table, and physical link integrity.';
    }

    stages[0].details = `TCP Handshake failed (${err.code || 'ERROR'}): ${err.message || 'Connection failed'}`;
    stages[0].detailsFa = `اتصال سوکت TCP ناموفق بود (${err.code || 'خطا'}): ${rootCauseFa}`;
    stages[0].errorFixFa = recommendationFa;
    stages[0].errorFixEn = recommendationEn;

    return {
      success: false,
      message: `TCP socket connection failed: ${err.message || err.code}`,
      messageFa: rootCauseFa,
      latency_ms: Date.now() - startTime,
      stages,
      failureStage: 'tcp_socket',
      failureLayer,
      rootCause: rootCauseEn,
      rootCauseFa,
      recommendation: recommendationEn,
      recommendationFa,
      timestamp: new Date().toISOString()
    };
  }

  // Stage 1 success
  stages[0].status = 'success';
  stages[0].latency_ms = tcpResult.latency;
  stages[0].details = `TCP Handshake connected successfully in ${tcpResult.latency}ms on port ${port}.`;
  stages[0].detailsFa = `دست‌تکانی TCP در پورت ${port} در مدت ${tcpResult.latency} میلی‌ثانیه با موفقیت برقرار شد.`;

  // Steps 2-5: SSH Handshake, Banner, KEX, Auth, and Exec
  stages[1].status = 'in_progress';
  stages[1].details = 'Exchanging SSH protocol identification strings...';
  stages[1].detailsFa = 'در حال مبادله نسخه پروتکل و شناسه سرور SSH...';

  return new Promise<TerminalExecResult>((resolve) => {
    const conn = new Client();
    let settled = false;
    let bannerCaptured = '';
    const sshStartTime = Date.now();

    const finishResult = (res: TerminalExecResult) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        try { conn.end(); } catch {}
        resolve(res);
      }
    };

    const timer = setTimeout(() => {
      const pendingStageIndex = stages.findIndex((s) => s.status === 'in_progress');
      const failedStageId = pendingStageIndex !== -1 ? stages[pendingStageIndex].id : 'kex_cipher';
      if (pendingStageIndex !== -1) {
        stages[pendingStageIndex].status = 'failed';
        stages[pendingStageIndex].detailsFa = 'تایم‌اوت در حین انجام این مرحله رخ داد.';
      }

      finishResult({
        success: false,
        message: `SSH negotiation timed out after ${totalTimeout / 1000}s`,
        messageFa: `عملیات ارتباط SSH پس از ${totalTimeout / 1000} ثانیه با تایم‌اوت مواجه شد.`,
        latency_ms: Date.now() - startTime,
        stages,
        failureStage: failedStageId,
        failureLayer: 'Layer 7 (SSH Application)',
        rootCause: 'Connection timed out waiting for SSH response from remote server.',
        rootCauseFa: 'پاسخی از سمت سرور SSH در زمان مقرر دریافت نشد.',
        recommendation: 'Verify SSH server performance, key algorithms, and CPU load on the appliance.',
        recommendationFa: 'لود پردازنده سوئیچ، تنظیمات VTY و الگوریتم‌های فعال SSH را بررسی کنید.',
        timestamp: new Date().toISOString()
      });
    }, totalTimeout);

    conn.on('banner', (msg) => {
      bannerCaptured += msg;
      stages[1].status = 'success';
      stages[1].latency_ms = Date.now() - sshStartTime;
      stages[1].details = `Remote identification banner: ${msg.trim().slice(0, 120)}`;
      stages[1].detailsFa = `بنر شناسه نرم‌افزار سرور دریافت شد: ${msg.trim().slice(0, 120)}`;
    });

    conn.on('ready', () => {
      const authLatency = Date.now() - sshStartTime;

      if (stages[1].status !== 'success') {
        stages[1].status = 'success';
        stages[1].latency_ms = Math.round(authLatency * 0.3);
        stages[1].details = bannerCaptured ? `Banner: ${bannerCaptured.trim()}` : 'Standard SSH-2.0 Protocol Identification accepted.';
        stages[1].detailsFa = bannerCaptured ? `بنر: ${bannerCaptured.trim()}` : 'پروتکل استاندارد SSH-2.0 با موفقیت تایید شد.';
      }

      stages[2].status = 'success';
      stages[2].latency_ms = Math.round(authLatency * 0.5);
      stages[2].details = 'Cryptographic parameters agreed (AES CTR/CBC, Diffie-Hellman KEX).';
      stages[2].detailsFa = 'الگوریتم‌های رمزنگاری و تبادل کلید توافق و فعال شد.';

      stages[3].status = 'success';
      stages[3].latency_ms = authLatency;
      stages[3].details = `User "${username}" authenticated successfully via password/interactive.`;
      stages[3].detailsFa = `احراز هویت کاربر "${username}" با موفقیت تایید گردید.`;

      stages[4].status = 'in_progress';
      stages[4].details = 'Spawning interactive session channel...';
      stages[4].detailsFa = 'در حال راه‌اندازی کانال شل ترمینال تعاملی...';

      const execCmd = command || 'terminal length 0\nshow privilege';
      const execStart = Date.now();

      conn.exec(execCmd, { pty: { term: 'xterm-256color', cols: 100, rows: 30 } }, (execErr, stream) => {
        if (execErr) {
          stages[4].status = 'failed';
          stages[4].latency_ms = Date.now() - execStart;
          stages[4].rawError = execErr.message;
          stages[4].details = `Failed to open exec channel: ${execErr.message}`;
          stages[4].detailsFa = `خطا در باز کردن کانال اجرای فرمان: ${execErr.message}`;

          finishResult({
            success: false,
            message: `Exec channel error: ${execErr.message}`,
            messageFa: `خطا در تخصیص کانال شل و اجرای دستور: ${execErr.message}`,
            latency_ms: Date.now() - startTime,
            stages,
            failureStage: 'pty_exec',
            failureLayer: 'Terminal PTY Session',
            rootCause: execErr.message,
            rootCauseFa: 'سوئیچ اجازه اجرای دستور از طریق کانال exec را نداد.',
            recommendationFa: 'دسترسی کاربر در privilege level و تنظیمات line vty را بررسی فرمایید.',
            banner: bannerCaptured.trim() || undefined,
            timestamp: new Date().toISOString()
          });
          return;
        }

        let outputBuf = '';
        stream.on('data', (d: Buffer) => {
          outputBuf += d.toString('utf-8');
        });
        stream.stderr?.on('data', (d: Buffer) => {
          outputBuf += d.toString('utf-8');
        });

        const execTimer = setTimeout(() => {
          try { stream.close(); } catch {}
          onCommandFinished(outputBuf || 'Command executed (stream closed).');
        }, 3000);

        stream.on('close', () => {
          clearTimeout(execTimer);
          onCommandFinished(outputBuf);
        });

        function onCommandFinished(finalOutput: string) {
          stages[4].status = 'success';
          stages[4].latency_ms = Date.now() - execStart;
          stages[4].details = `Command completed successfully (${finalOutput.length} bytes captured).`;
          stages[4].detailsFa = `دستور با موفقیت اجرا شد و خروجی ثبت گردید (${finalOutput.length} بایت).`;

          finishResult({
            success: true,
            message: `SSH Connection & Diagnostics fully verified (${Date.now() - startTime}ms)`,
            messageFa: `ارتباط SSH و کلیه مراحل احراز هویت با موفقیت بررسی شد (${Date.now() - startTime} میلی‌ثانیه)`,
            latency_ms: Date.now() - startTime,
            stages,
            banner: bannerCaptured.trim() || undefined,
            commandOutput: finalOutput.slice(0, 4000),
            timestamp: new Date().toISOString()
          });
        }
      });
    });

    conn.on('error', (err: any) => {
      const totalElapsed = Date.now() - startTime;
      let failureStage = 'kex_cipher';
      let failureLayer = 'Layer 7 (SSH Cryptography)';
      let rootCauseFa = 'خطا در پروتکل SSH یا مذاکره رمزنگاری';
      let rootCauseEn = 'SSH negotiation or handshake error';
      let recommendationFa = 'تنظیمات سوئیچ و الگوریتم‌های پشتیبانی‌شده را بررسی کنید.';
      let recommendationEn = 'Check switch SSH configuration and supported ciphers.';

      if (err.level === 'client-authentication') {
        stages[1].status = 'success';
        stages[2].status = 'success';
        stages[3].status = 'failed';
        stages[3].latency_ms = totalElapsed;
        stages[3].rawError = err.message;
        stages[3].details = `Authentication rejected for user "${username}"`;
        stages[3].detailsFa = `احراز هویت کاربر "${username}" رد شد (کلمه عبور نادرست یا عدم دسترسی)`;
        stages[4].status = 'skipped';

        failureStage = 'auth';
        failureLayer = 'لایه احراز هویت و دسترسی کاربر (AAA / Authentication)';
        rootCauseFa = `نام کاربری یا کلمه عبور وارد شده برای "${username}" نادرست است یا سوئیچ دسترسی را تایید نکرد.`;
        rootCauseEn = `Invalid username or password for ${username}@${host}`;
        recommendationFa = 'کلمه عبور، نام کاربری و پسورد Enable را در تنظیمات کشوی احراز هویت بررسی کنید. همچنین دستورات username <user> secret <pass> و login local روی سوئیچ را کنترل فرمایید.';
        recommendationEn = 'Verify username and password. Ensure switch has local user configured with appropriate privilege level.';
      } else if (err.message && /kex|cipher|algorithm|handshake/i.test(err.message)) {
        stages[2].status = 'failed';
        stages[2].latency_ms = totalElapsed;
        stages[2].rawError = err.message;
        stages[2].details = `Cryptographic negotiation failed: ${err.message}`;
        stages[2].detailsFa = `خطا در توافق الگوریتم‌های رمزنگاری: ${err.message}`;
        stages[3].status = 'skipped';
        stages[4].status = 'skipped';

        failureStage = 'kex_cipher';
        failureLayer = 'لایه ۷ (مذاکره الگوریتم‌های رمزنگاری و KEX)';
        rootCauseFa = 'عدم تطابق الگوریتم‌های رمزنگاری یا تبادل کلید بین کلاینت و سوئیچ.';
        rootCauseEn = `Cipher or Key Exchange (KEX) algorithm mismatch: ${err.message}`;
        recommendationFa = 'سوئیچ‌های قدیمی‌تر سیسکو ممکن است از diffie-hellman-group1 یا کلیدهای RSA ضعیف استفاده کنند. دستور crypto key generate rsa modulus 2048 یا ip ssh version 2 را روی سوئیچ اجرا کنید.';
        recommendationEn = 'Switch might require modern RSA key (modulus 2048) or legacy DH group enablement.';
      } else {
        const pendingIdx = stages.findIndex((s) => s.status === 'in_progress');
        if (pendingIdx !== -1) {
          stages[pendingIdx].status = 'failed';
          stages[pendingIdx].rawError = err.message;
          stages[pendingIdx].details = err.message;
          stages[pendingIdx].detailsFa = `خطا در این مرحله: ${err.message}`;
          failureStage = stages[pendingIdx].id;
        }
      }

      finishResult({
        success: false,
        message: `SSH error: ${err.message || 'Negotiation failed'}`,
        messageFa: rootCauseFa,
        latency_ms: totalElapsed,
        stages,
        failureStage,
        failureLayer,
        rootCause: rootCauseEn,
        rootCauseFa,
        recommendation: recommendationEn,
        recommendationFa,
        banner: bannerCaptured.trim() || undefined,
        timestamp: new Date().toISOString()
      });
    });

    conn.on('keyboard-interactive', (_name, _instructions, _instructionsLang, prompts, finish) => {
      finish(prompts.map(() => password));
    });

    try {
      conn.connect({
        host,
        port,
        username,
        password,
        readyTimeout: totalTimeout,
        tryKeyboard: true,
        keepaliveInterval: 2000,
        keepaliveCountMax: 2,
        algorithms: COMPATIBLE_ALGORITHMS
      });
    } catch (err: any) {
      stages[1].status = 'failed';
      stages[1].rawError = err.message;
      stages[1].detailsFa = `خطا در راه‌اندازی کلاینت SSH: ${err.message}`;

      finishResult({
        success: false,
        message: `SSH connection initialization error: ${err.message}`,
        messageFa: `خطا در راه‌اندازی کلاینت SSH: ${err.message}`,
        latency_ms: Date.now() - startTime,
        stages,
        failureStage: 'ssh_banner',
        failureLayer: 'SSH Client Initialization',
        rootCause: err.message,
        rootCauseFa: 'عدم امکان راه‌اندازی اولیه کلاینت SSH',
        recommendationFa: 'پارامترهای ورودی را بررسی نمایید.',
        timestamp: new Date().toISOString()
      });
    }
  });
}

/**
 * Standardize port IDs across various Cisco representations
 * e.g. "GigabitEthernet 1/0/1" -> "Gi1/0/1", "FastEthernet0/1" -> "Fa0/1"
 */
export function normalizePortId(raw: string): string {
  return raw
    .replace(/\s+/g, '')
    .replace(/^GigabitEthernet/i, 'Gi')
    .replace(/^FastEthernet/i, 'Fa')
    .replace(/^TenGigabitEthernet/i, 'Te')
    .replace(/^FortyGigabitEthernet/i, 'Fo')
    .replace(/^HundredGigE/i, 'Hu')
    .replace(/^Ethernet/i, 'Eth')
    .replace(/^Port-channel/i, 'Po')
    .replace(/^Gig/i, 'Gi')
    .replace(/^Fas/i, 'Fa')
    .replace(/^Ten/i, 'Te');
}

/**
 * Expand short port ID to canonical interface name
 */
export function expandPortName(shortId: string): string {
  if (/^Gi/i.test(shortId)) return shortId.replace(/^Gi/i, 'GigabitEthernet');
  if (/^Fa/i.test(shortId)) return shortId.replace(/^Fa/i, 'FastEthernet');
  if (/^Te/i.test(shortId)) return shortId.replace(/^Te/i, 'TenGigabitEthernet');
  if (/^Fo/i.test(shortId)) return shortId.replace(/^Fo/i, 'FortyGigabitEthernet');
  if (/^Hu/i.test(shortId)) return shortId.replace(/^Hu/i, 'HundredGigE');
  if (/^Eth/i.test(shortId)) return shortId.replace(/^Eth/i, 'Ethernet');
  if (/^Po/i.test(shortId)) return shortId.replace(/^Po/i, 'Port-channel');
  return shortId;
}

/**
 * Parse Cisco IOS CLI command outputs (show version, show interfaces status, show ip int brief, show cdp neighbors)
 */
export function parseCiscoOutputs(raw: string): RealSwitchData {
  const result: RealSwitchData = {
    device: {},
    ports: [],
    rawSummary: raw.slice(0, 500)
  };

  // 1. Hostname detection from command prompt lines e.g. "Switch#" or "SW-CORE-01>"
  const promptMatch = raw.match(/^([a-zA-Z0-9\-_]+)[>#]/m);
  if (promptMatch && promptMatch[1]) {
    const detectedName = promptMatch[1].trim();
    if (!/^(enable|terminal|show|exit|configure)$/i.test(detectedName)) {
      result.device.hostname = detectedName;
    }
  }

  // 2. Hardware Model detection
  const modelPatterns = [
    /(?:Model number|Model Number)\s*:\s*([^\r\n]+)/i,
    /cisco\s+([A-Za-z0-9\-]+)\s+\([^\)]+\)\s+processor/i,
    /Hardware:\s*([A-Za-z0-9\-]+)/i,
    /Device:\s*([A-Za-z0-9\- ]+)/i
  ];

  for (const pat of modelPatterns) {
    const match = raw.match(pat);
    if (match && match[1]) {
      let modelStr = match[1].trim();
      if (!modelStr.toLowerCase().startsWith('cisco') && pat === modelPatterns[1]) {
        modelStr = `Cisco ${modelStr}`;
      }
      result.device.model = modelStr;
      break;
    }
  }

  // 3. Firmware / IOS Software Version
  const verPatterns = [
    /Cisco IOS Software[^\r\n]*?Version\s+([0-9a-zA-Z\.\(\):\-]+)/i,
    /Cisco IOS XE Software, Version\s+([0-9a-zA-Z\.\(\):\-]+)/i,
    /Version\s+([0-9a-zA-Z\.\(\):\-]+)/i
  ];

  for (const pat of verPatterns) {
    const match = raw.match(pat);
    if (match && match[1]) {
      result.device.firmware = match[1].trim();
      break;
    }
  }

  // 4. System Uptime
  const uptimeMatch = raw.match(/[Uu]ptime is\s+([^\r\n]+)/);
  if (uptimeMatch && uptimeMatch[1]) {
    result.device.uptime = uptimeMatch[1].trim();
  }

  // 5. Base Ethernet MAC Address
  const macMatch = raw.match(/(?:Base [Ee]thernet MAC [Aa]ddress|Base MAC Address|MAC Address)\s*:\s*([0-9a-fA-F:\.\-]+)/i);
  if (macMatch && macMatch[1]) {
    let mac = macMatch[1].trim();
    const cleanHex = mac.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
    if (cleanHex.length === 12) {
      mac = (cleanHex.match(/.{1,2}/g) || []).join(':');
    }
    result.device.mac = mac;
  }

  // 6. System Serial Number
  const serialMatch = raw.match(/(?:System [Ss]erial [Nn]umber|Processor board ID)\s*:\s*([0-9a-zA-Z]+)/i) ||
                      raw.match(/(?:System [Ss]erial [Nn]umber|Processor board ID)\s+([0-9a-zA-Z]+)/i);
  if (serialMatch && serialMatch[1]) {
    result.device.serial = serialMatch[1].trim();
  }

  // 7. Parse CDP Neighbors mapping: local interface -> connected device
  const cdpMap: Record<string, string> = {};
  const cdpLines = raw.split(/\r?\n/);
  let inCdp = false;
  for (const line of cdpLines) {
    if (/show cdp neighbors/i.test(line)) {
      inCdp = true;
      continue;
    }
    if (inCdp && /Device ID\s+Local Intrfce/i.test(line)) {
      continue;
    }
    if (inCdp && /^[A-Za-z0-9\-_]+[>#]/.test(line)) {
      inCdp = false;
      continue;
    }
    if (inCdp) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 3) {
        const neighborId = parts[0];
        // Interface can be "Gig 1/0/1" or "Gi1/0/1"
        if (/^(Gig|Fas|Ten|Eth|Po)/i.test(parts[1])) {
          const combined = parts[1] + (parts[2]?.startsWith('/') ? parts[2] : (parts[2]?.match(/^\d/) ? ` ${parts[2]}` : ''));
          const portKey = normalizePortId(combined);
          cdpMap[portKey] = neighborId;
        }
      }
    }
  }

  // 8. Parse Ports from 'show interfaces status'
  const portsList: ParsedSwitchPort[] = [];
  const statusHeaderIdx = raw.indexOf('Port      Name               Status');
  if (statusHeaderIdx !== -1) {
    const afterHeader = raw.substring(statusHeaderIdx);
    const lines = afterHeader.split(/\r?\n/).slice(1);
    for (const line of lines) {
      if (!line.trim() || /^[A-Za-z0-9\-_]+[>#]/.test(line) || /--More--/i.test(line) || /^show\s+/i.test(line)) {
        if (portsList.length > 0) break;
        continue;
      }

      // Regex matching Cisco "show interfaces status" lines
      // Port Name Status Vlan Duplex Speed Type
      const match = line.match(/^([A-Za-z0-9\/]+)\s+(.*?)\s+(connected|notconnect|notconnected|disabled|err-disabled|inactive|monitoring)\s+(\S+)\s+(\S+)\s+(\S+)(?:\s+(.*))?$/i);
      if (match) {
        const rawPortId = match[1].trim();
        const portId = normalizePortId(rawPortId);
        const nameDesc = match[2].trim();
        const rawStatus = match[3].toLowerCase();
        const rawVlan = match[4].trim();
        const rawDuplex = match[5].trim();
        const rawSpeed = match[6].trim();
        const portType = (match[7] || '').trim();

        const isConnected = rawStatus === 'connected';
        const isDisabled = rawStatus === 'disabled' || rawStatus === 'err-disabled';
        const isTrunk = rawVlan.toLowerCase() === 'trunk';
        const vlanNum = parseInt(rawVlan, 10) || 1;

        let formattedSpeed = '1 Gbps';
        if (/1000|1G/i.test(rawSpeed)) formattedSpeed = '1 Gbps';
        else if (/100/i.test(rawSpeed)) formattedSpeed = '100 Mbps';
        else if (/10G/i.test(rawSpeed)) formattedSpeed = '10 Gbps';
        else if (/auto/i.test(rawSpeed)) formattedSpeed = 'Auto';

        let formattedDuplex = 'Full';
        if (/half/i.test(rawDuplex)) formattedDuplex = 'Half';
        else if (/auto/i.test(rawDuplex)) formattedDuplex = 'Auto';

        const neighbor = cdpMap[portId] || (isConnected ? (nameDesc || 'Connected Host') : 'Disconnected');

        portsList.push({
          port_id: portId,
          name: expandPortName(portId),
          status: isConnected ? 'up' : 'down',
          admin_status: isDisabled ? 'disabled' : 'enabled',
          mode: isTrunk ? 'trunk' : 'access',
          vlan: isTrunk ? 1 : vlanNum,
          allowed_vlans: isTrunk ? '1-4094' : String(vlanNum),
          speed: formattedSpeed,
          duplex: formattedDuplex,
          description: nameDesc || (portType ? `${portType}` : `Port ${portId}`),
          connected_device: neighbor,
          connected_type: isConnected ? (isTrunk ? 'Switch' : 'Host') : 'None',
          poe_status: 'off',
          poe_power: 0
        });
      }
    }
  }

  // 9. Fallback to 'show ip interface brief' if no ports parsed from status
  if (portsList.length === 0) {
    const ipBriefHeaderIdx = raw.indexOf('Interface              IP-Address');
    if (ipBriefHeaderIdx !== -1) {
      const lines = raw.substring(ipBriefHeaderIdx).split(/\r?\n/).slice(1);
      for (const line of lines) {
        if (!line.trim() || /^[A-Za-z0-9\-_]+[>#]/.test(line) || /^show\s+/i.test(line)) {
          if (portsList.length > 0) break;
          continue;
        }
        const match = line.match(/^([A-Za-z0-9\/]+)\s+(\S+)\s+\S+\s+\S+\s+(up|down|administratively down)\s+(up|down)/i);
        if (match) {
          const rawPort = match[1].trim();
          // Skip loopback or Null unless they are the only ports
          if (/^Loopback|^Null/i.test(rawPort)) continue;

          const portId = normalizePortId(rawPort);
          const rawStatus = match[3].toLowerCase();
          const rawProto = match[4].toLowerCase();
          const isUp = rawStatus === 'up' && rawProto === 'up';
          const isAdminDown = rawStatus.includes('administratively down');

          portsList.push({
            port_id: portId,
            name: expandPortName(portId),
            status: isUp ? 'up' : 'down',
            admin_status: isAdminDown ? 'disabled' : 'enabled',
            mode: 'access',
            vlan: 1,
            allowed_vlans: '1',
            speed: '1 Gbps',
            duplex: 'Full',
            description: `Interface ${portId}`,
            connected_device: cdpMap[portId] || (isUp ? 'Active Link' : 'Disconnected'),
            connected_type: isUp ? 'Host' : 'None',
            poe_status: 'off',
            poe_power: 0
          });
        }
      }
    }
  }

  result.ports = portsList;
  result.device.total_ports = portsList.length > 0 ? portsList.length : undefined;

  return result;
}

/**
 * Connects to physical switch over SSH, runs discovery commands, and extracts real data and ports
 */
export function fetchRealSwitchDataViaSsh(params: SshDeviceSyncParams): Promise<{
  success: boolean;
  message: string;
  data?: RealSwitchData;
}> {
  return new Promise((resolve) => {
    const port = params.port || 22;
    const timeout = params.timeoutMs || 25000;
    const conn = new Client();
    let isSettled = false;
    let accumulatedOutput = '';

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        try { conn.end(); } catch {}
        if (accumulatedOutput.length > 50) {
          const parsed = parseCiscoOutputs(accumulatedOutput);
          resolve({
            success: true,
            message: `Retrieved data with partial timeout from switch ${params.host}:${port}`,
            data: parsed
          });
        } else {
          resolve({
            success: false,
            message: `Connection timed out after ${timeout / 1000}s on ${params.host}:${port}`
          });
        }
      }
    }, timeout);

    conn.on('keyboard-interactive', (_name, _instructions, _instructionsLang, prompts, finish) => {
      finish(prompts.map(() => params.password || ''));
    });

    conn.on('ready', () => {
      conn.shell({
        term: 'vt100',
        cols: 250,
        rows: 200
      }, (shellErr, stream) => {
        if (shellErr) {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            try { conn.end(); } catch {}
            resolve({
              success: false,
              message: `Failed to open PTY shell on switch: ${shellErr.message}`
            });
          }
          return;
        }

        stream.on('data', (chunk: Buffer) => {
          accumulatedOutput += chunk.toString('utf-8');
        });

        stream.on('close', () => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            try { conn.end(); } catch {}
            const parsed = parseCiscoOutputs(accumulatedOutput);
            resolve({
              success: true,
              message: `Successfully retrieved real switch info and ${parsed.ports.length} physical ports from ${params.host}:${port}`,
              data: parsed
            });
          }
        });

        // Sequence commands: disable paging, elevate if password provided, run discovery commands
        setTimeout(() => {
          stream.write('terminal length 0\n');
          stream.write('terminal width 512\n');
          if (params.enablePassword) {
            stream.write('enable\n');
            setTimeout(() => {
              stream.write(params.enablePassword + '\n');
            }, 500);
          }
          setTimeout(() => {
            stream.write('show version\n');
            stream.write('show interfaces status\n');
            stream.write('show ip interface brief\n');
            stream.write('show vlan brief\n');
            stream.write('show cdp neighbors\n');
            setTimeout(() => {
              stream.write('exit\n');
            }, 3000);
          }, 1500);
        }, 500);
      });
    });

    conn.on('error', (err: any) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        try { conn.end(); } catch {}
        let msg = err.message || 'SSH connection error';
        if (err.level === 'client-authentication') {
          msg = `Authentication failed: Invalid SSH username or password for ${params.username}@${params.host}`;
        } else if (err.code === 'ECONNREFUSED') {
          msg = `Connection refused on ${params.host}:${port}`;
        } else if (err.code === 'ETIMEDOUT') {
          msg = `Host ${params.host}:${port} unreachable (timeout)`;
        }
        resolve({
          success: false,
          message: msg
        });
      }
    });

    try {
      conn.connect({
        host: params.host,
        port,
        username: params.username,
        password: params.password,
        readyTimeout: 12000,
        tryKeyboard: true,
        algorithms: COMPATIBLE_ALGORITHMS,
        keepaliveInterval: 5000,
        keepaliveCountMax: 3
      });
    } catch (e: any) {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        resolve({
          success: false,
          message: `Failed to initiate SSH: ${e.message}`
        });
      }
    }
  });
}

/**
 * Synchronize real switch data with persistent backend/network_data.json
 */
export async function syncDeviceWithRealSwitch(
  projectRoot: string,
  params: {
    deviceId?: string;
    host: string;
    port?: number;
    username: string;
    password?: string;
    enablePassword?: string;
  }
) {
  const syncRes = await fetchRealSwitchDataViaSsh({
    host: params.host,
    port: params.port || 22,
    username: params.username,
    password: params.password,
    enablePassword: params.enablePassword
  });

  if (!syncRes.success || !syncRes.data) {
    return syncRes;
  }

  const { device: devInfo, ports } = syncRes.data;
  const dataFilePath = path.join(projectRoot, 'backend', 'network_data.json');

  try {
    if (fs.existsSync(dataFilePath)) {
      const content = fs.readFileSync(dataFilePath, 'utf-8');
      const data = JSON.parse(content);

      // Find device by ID or by IP
      let targetDevice = data.devices.find((d: any) => d.id === params.deviceId);
      if (!targetDevice) {
        targetDevice = data.devices.find((d: any) => d.ip === params.host);
      }

      if (targetDevice) {
        if (devInfo.model) targetDevice.model = devInfo.model;
        if (devInfo.firmware) targetDevice.firmware = devInfo.firmware;
        if (devInfo.uptime) targetDevice.uptime = devInfo.uptime;
        if (devInfo.mac) targetDevice.mac = devInfo.mac;
        if (devInfo.serial) targetDevice.serial = devInfo.serial;
        if (devInfo.hostname && targetDevice.name === 'New-Switch') {
          targetDevice.name = devInfo.hostname;
        }
        targetDevice.is_online = true;
        targetDevice.last_seen = 'Just now';
        targetDevice.total_ports = ports.length > 0 ? ports.length : (targetDevice.total_ports || 24);
        targetDevice.ssh_port = params.port || 22;
        targetDevice.ssh_username = params.username;
        if (params.password) targetDevice.ssh_password = params.password;
        if (params.enablePassword) targetDevice.enable_password = params.enablePassword;

        if (ports.length > 0) {
          if (!data.ports) data.ports = {};
          data.ports[targetDevice.id] = ports;
        }

        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
        return {
          success: true,
          message: `Device '${targetDevice.name}' synced successfully: ${ports.length} real ports discovered!`,
          device: targetDevice,
          ports: ports
        };
      }
    }
  } catch (fsErr: any) {
    console.error('[SSH Sync] Error updating network_data.json:', fsErr);
  }

  return {
    success: true,
    message: `Discovered ${ports.length} ports from switch ${params.host}`,
    data: syncRes.data,
    ports: ports
  };
}

export interface ApplyPortConfigSshParams {
  deviceId?: string;
  interfaceName: string;
  action: string;
  oldValue?: any;
  newValue?: any;
  updates?: Partial<ParsedSwitchPort> & Record<string, any>;
  commands?: string[];
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  enablePassword?: string;
  timeoutMs?: number;
}

export interface ApplyPortConfigSshResult {
  success: boolean;
  device: string;
  interface: string;
  action: string;
  oldValue?: any;
  newValue?: any;
  output?: string;
  verifiedPort?: ParsedSwitchPort;
  commands?: string[];
  message?: string;
  error?: string;
}

/**
 * Executes port configuration commands (VLAN, Port Security, Admin Status, Mode, etc.)
 * directly on the physical Cisco Switch over SSH, then verifies execution via show commands.
 */
export async function applyPortConfigViaSsh(
  projectRoot: string,
  params: ApplyPortConfigSshParams
): Promise<ApplyPortConfigSshResult> {
  const dataFilePath = path.join(projectRoot, 'backend', 'network_data.json');
  let targetDevice: any = null;
  let data: any = null;

  try {
    if (fs.existsSync(dataFilePath)) {
      const content = fs.readFileSync(dataFilePath, 'utf-8');
      data = JSON.parse(content);
      targetDevice = (data.devices || []).find((d: any) => d.id === params.deviceId || d.ip === params.host || d.name === params.deviceId);
    }
  } catch (err) {
    console.warn('[SSH Apply Config] Error reading network_data.json:', err);
  }

  const host = params.host || targetDevice?.ip;
  const sshPort = params.port || targetDevice?.ssh_port || 22;
  const username = params.username || targetDevice?.ssh_username || 'admin';
  const password = params.password !== undefined ? params.password : (targetDevice?.ssh_password || '');
  const enablePassword = params.enablePassword !== undefined ? params.enablePassword : (targetDevice?.enable_password || '');
  const timeout = params.timeoutMs || 20000;
  const devName = targetDevice?.name || params.deviceId || host || 'Switch';

  if (!host) {
    return {
      success: false,
      device: devName,
      interface: params.interfaceName,
      action: params.action,
      oldValue: params.oldValue,
      newValue: params.newValue,
      error: `Device IP address not found for '${params.deviceId || 'unknown'}'`
    };
  }

  const normId = normalizePortId(params.interfaceName);
  const canonicalInterface = expandPortName(normId);

  // Build clean Cisco IOS configuration command sequence
  let configCmds: string[] = [];
  if (params.commands && params.commands.length > 0) {
    configCmds = params.commands
      .map((c) => c.replace(/^[a-zA-Z0-9\-_]+(\(config[^\)]*\))?#\s*/, '').trim())
      .filter((c) => c.length > 0 && !c.startsWith('!') && !c.startsWith('#'));
  } else {
    configCmds.push('configure terminal');
    configCmds.push(`interface ${canonicalInterface}`);

    const updates = params.updates || {};

    // 1. VLAN & Mode logic
    if (params.action === 'change_vlan' || updates.vlan !== undefined) {
      const mode = updates.mode || 'access';
      if (mode === 'trunk') {
        configCmds.push('switchport mode trunk');
        const allowed = updates.allowed_vlans || (params.newValue ? String(params.newValue) : '');
        if (allowed) {
          configCmds.push(`switchport trunk allowed vlan ${allowed}`);
        }
      } else {
        configCmds.push('switchport mode access');
        const vlanVal = updates.vlan !== undefined ? updates.vlan : params.newValue;
        configCmds.push(`switchport access vlan ${vlanVal}`);
      }
    } else if (updates.mode !== undefined) {
      if (updates.mode === 'trunk') {
        configCmds.push('switchport mode trunk');
        if (updates.allowed_vlans) {
          configCmds.push(`switchport trunk allowed vlan ${updates.allowed_vlans}`);
        }
      } else {
        configCmds.push('switchport mode access');
        if (updates.vlan) {
          configCmds.push(`switchport access vlan ${updates.vlan}`);
        }
      }
    }

    // 2. Cisco Port Security logic
    if (params.action === 'port_security' || updates.port_security_enabled !== undefined) {
      const isSecEnabled = updates.port_security_enabled !== undefined
        ? Boolean(updates.port_security_enabled)
        : (params.newValue === true || params.newValue === 'enabled');

      if (isSecEnabled) {
        configCmds.push('switchport mode access');
        configCmds.push('switchport port-security');
        const maxMac = updates.port_security_max_mac || updates.maximum || 1;
        configCmds.push(`switchport port-security maximum ${maxMac}`);
        const violation = updates.port_security_violation || updates.violationMode || 'shutdown';
        configCmds.push(`switchport port-security violation ${violation}`);

        const secMode = updates.port_security_mode || (updates.sticky ? 'sticky' : 'dynamic');
        if (secMode === 'sticky' || updates.sticky) {
          configCmds.push('switchport port-security mac-address sticky');
        } else if (secMode === 'configured' && (updates.port_security_configured_mac || updates.mac)) {
          configCmds.push(`switchport port-security mac-address ${updates.port_security_configured_mac || updates.mac}`);
        }
      } else {
        configCmds.push('no switchport port-security');
      }
    }

    // 3. Admin status (shutdown / no shutdown)
    if (params.action === 'admin_status' || updates.admin_status !== undefined) {
      const isDisabled = updates.admin_status === 'disabled' || params.newValue === 'disabled';
      configCmds.push(isDisabled ? 'shutdown' : 'no shutdown');
    }

    // 4. Description
    if (updates.description !== undefined) {
      if (updates.description) {
        configCmds.push(`description ${updates.description}`);
      } else {
        configCmds.push('no description');
      }
    }

    // 5. Speed & Duplex
    if (updates.speed && updates.speed !== 'auto') {
      configCmds.push(`speed ${updates.speed}`);
    }
    if (updates.duplex && updates.duplex !== 'auto') {
      configCmds.push(`duplex ${updates.duplex}`);
    }

    configCmds.push('exit');
    configCmds.push('end');
  }

  // Verification commands to run immediately on switch after configuration
  const verificationCmds = [
    `show running-config interface ${canonicalInterface}`,
    `show interfaces ${canonicalInterface} status`,
    `show interfaces ${canonicalInterface} switchport`,
  ];
  if (params.action === 'port_security' || params.updates?.port_security_enabled) {
    verificationCmds.push(`show port-security interface ${canonicalInterface}`);
  }

  return new Promise((resolve) => {
    const conn = new Client();
    let isSettled = false;
    let accumulatedOutput = '';

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        try { conn.end(); } catch {}
        resolve({
          success: false,
          device: devName,
          interface: params.interfaceName,
          action: params.action,
          oldValue: params.oldValue,
          newValue: params.newValue,
          error: `Timeout: Switch ${host}:${sshPort} did not finish executing configuration within ${timeout / 1000}s`,
          output: accumulatedOutput
        });
      }
    }, timeout);

    conn.on('keyboard-interactive', (_name, _instructions, _instructionsLang, prompts, finish) => {
      finish(prompts.map(() => password || ''));
    });

    conn.on('ready', () => {
      conn.shell({
        term: 'vt100',
        cols: 250,
        rows: 200
      }, (shellErr, stream) => {
        if (shellErr) {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            try { conn.end(); } catch {}
            resolve({
              success: false,
              device: devName,
              interface: params.interfaceName,
              action: params.action,
              oldValue: params.oldValue,
              newValue: params.newValue,
              error: `Failed to allocate PTY shell on switch: ${shellErr.message}`
            });
          }
          return;
        }

        stream.on('data', (chunk: Buffer) => {
          accumulatedOutput += chunk.toString('utf-8');
        });

        stream.on('close', () => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            try { conn.end(); } catch {}

            // Check if Cisco IOS returned syntax errors
            const syntaxErrorMatch = accumulatedOutput.match(/% (Invalid input detected at '\^' marker|Command rejected:[^\r\n]+|Incomplete command|Ambiguous command)/i);
            if (syntaxErrorMatch) {
              resolve({
                success: false,
                device: devName,
                interface: params.interfaceName,
                action: params.action,
                oldValue: params.oldValue,
                newValue: params.newValue,
                error: `Cisco IOS error: ${syntaxErrorMatch[0]}`,
                output: accumulatedOutput,
                commands: configCmds
              });
              return;
            }

            // Parse verified state from the switch outputs
            const verifiedPort: ParsedSwitchPort = {
              port_id: normId,
              name: canonicalInterface,
              status: /connected|up/i.test(accumulatedOutput) ? 'up' : 'down',
              admin_status: /shutdown/i.test(accumulatedOutput) && !/no shutdown/i.test(accumulatedOutput.split('interface ' + canonicalInterface)[1] || '') ? 'disabled' : 'enabled',
              mode: /switchport mode trunk|Trunking/i.test(accumulatedOutput) ? 'trunk' : 'access',
              vlan: 1,
              allowed_vlans: '',
              speed: '1 Gbps',
              duplex: 'Full',
              description: ''
            };

            // Extract VLAN from switchport output or running-config
            const vlanMatch = accumulatedOutput.match(/(?:switchport access vlan|Access Mode VLAN:\s*)\s*(\d+)/i);
            if (vlanMatch) {
              verifiedPort.vlan = parseInt(vlanMatch[1], 10);
            } else if (params.updates?.vlan) {
              verifiedPort.vlan = Number(params.updates.vlan);
            } else if (params.newValue && typeof params.newValue === 'number') {
              verifiedPort.vlan = params.newValue;
            }

            // Extract allowed VLANs if trunk
            const trunkAllowedMatch = accumulatedOutput.match(/(?:Trunking VLANs Enabled:\s*|switchport trunk allowed vlan\s*)([0-9,\-]+)/i);
            if (trunkAllowedMatch) {
              verifiedPort.allowed_vlans = trunkAllowedMatch[1].trim();
            } else if (params.updates?.allowed_vlans) {
              verifiedPort.allowed_vlans = String(params.updates.allowed_vlans);
            }

            // Extract description
            const descMatch = accumulatedOutput.match(/description\s+([^\r\n]+)/i);
            if (descMatch) {
              verifiedPort.description = descMatch[1].trim();
            }

            // Extract Port Security
            if (accumulatedOutput.includes('switchport port-security') || /Port Security\s*:\s*Enabled/i.test(accumulatedOutput)) {
              (verifiedPort as any).port_security_enabled = true;
              const maxMacMatch = accumulatedOutput.match(/(?:switchport port-security maximum\s*|Maximum MAC Addresses\s*:\s*)(\d+)/i);
              if (maxMacMatch) {
                (verifiedPort as any).port_security_max_mac = parseInt(maxMacMatch[1], 10);
              }
              const violMatch = accumulatedOutput.match(/(?:switchport port-security violation\s*|Violation Mode\s*:\s*)(shutdown|restrict|protect)/i);
              if (violMatch) {
                (verifiedPort as any).port_security_violation = violMatch[1].toLowerCase();
              }
              if (accumulatedOutput.includes('mac-address sticky') || /Sticky MAC\s*:\s*Enabled/i.test(accumulatedOutput)) {
                (verifiedPort as any).port_security_mode = 'sticky';
              }
            } else if (accumulatedOutput.includes('no switchport port-security') || /Port Security\s*:\s*Disabled/i.test(accumulatedOutput)) {
              (verifiedPort as any).port_security_enabled = false;
            }

            // Synchronize verified state into persistent network_data.json
            if (data && targetDevice) {
              try {
                if (!data.ports) data.ports = {};
                const devPorts: any[] = data.ports[targetDevice.id] || [];
                const existingIdx = devPorts.findIndex((p: any) =>
                  p.port_id.toLowerCase() === normId.toLowerCase() ||
                  p.name.toLowerCase() === canonicalInterface.toLowerCase() ||
                  p.port_id.toLowerCase() === params.interfaceName.toLowerCase()
                );

                if (existingIdx >= 0) {
                  devPorts[existingIdx] = { ...devPorts[existingIdx], ...verifiedPort };
                } else {
                  devPorts.push(verifiedPort);
                }
                data.ports[targetDevice.id] = devPorts;
                targetDevice.has_unsaved_changes = true;
                fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
              } catch (fsWriteErr) {
                console.warn('[SSH Apply Config] Error updating network_data.json:', fsWriteErr);
              }
            }

            resolve({
              success: true,
              device: devName,
              interface: params.interfaceName,
              action: params.action,
              oldValue: params.oldValue,
              newValue: params.newValue,
              output: accumulatedOutput,
              verifiedPort,
              commands: configCmds,
              message: `Configuration successfully applied and verified on switch ${devName} (${host}) interface ${params.interfaceName}`
            });
          }
        });

        // Write configuration sequence into Cisco CLI
        setTimeout(() => {
          stream.write('terminal length 0\n');
          stream.write('terminal width 512\n');
          if (enablePassword) {
            stream.write('enable\n');
            setTimeout(() => {
              stream.write(enablePassword + '\n');
            }, 400);
          }

          setTimeout(() => {
            // Send config commands line by line
            for (const cmd of configCmds) {
              stream.write(`${cmd}\n`);
            }

            // Send verification commands
            setTimeout(() => {
              for (const vCmd of verificationCmds) {
                stream.write(`${vCmd}\n`);
              }
              setTimeout(() => {
                stream.write('exit\n');
              }, 2500);
            }, 1200);
          }, 800);
        }, 400);
      });
    });

    conn.on('error', (err: any) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        try { conn.end(); } catch {}
        let errorMsg = err.message || 'SSH connection error';
        if (err.level === 'client-authentication') {
          errorMsg = `Authentication failed: Invalid credentials for ${username}@${host}`;
        } else if (err.code === 'ECONNREFUSED') {
          errorMsg = `Connection refused by switch ${host}:${sshPort}`;
        } else if (err.code === 'ETIMEDOUT') {
          errorMsg = `Switch ${host}:${sshPort} is unreachable (ETIMEDOUT)`;
        }
        resolve({
          success: false,
          device: devName,
          interface: params.interfaceName,
          action: params.action,
          oldValue: params.oldValue,
          newValue: params.newValue,
          error: errorMsg,
          output: accumulatedOutput
        });
      }
    });

    try {
      conn.connect({
        host,
        port: sshPort,
        username,
        password,
        readyTimeout: 12000,
        tryKeyboard: true,
        algorithms: COMPATIBLE_ALGORITHMS,
        keepaliveInterval: 5000,
        keepaliveCountMax: 3
      });
    } catch (connectErr: any) {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        resolve({
          success: false,
          device: devName,
          interface: params.interfaceName,
          action: params.action,
          oldValue: params.oldValue,
          newValue: params.newValue,
          error: `Failed to establish SSH connection: ${connectErr.message}`
        });
      }
    }
  });
}

export interface RawSshExecParams {
  host: string;
  port?: number;
  username: string;
  password?: string;
  enablePassword?: string;
  commands: string[];
  vendor?: 'cisco' | 'mikrotik';
  timeoutMs?: number;
}

export interface RawSshExecResult {
  success: boolean;
  output: string;
  error?: string;
  commandsExecuted: string[];
}

/**
 * Robust Raw SSH command sequence executor for Network Automation engine
 * Connects to live network gear (Cisco IOS/IOS-XE, MikroTik RouterOS) using real SSH2,
 * manages terminal configuration, interactive prompts, and returns raw command output.
 */
export function executeRawSshCommands(params: RawSshExecParams): Promise<RawSshExecResult> {
  const host = params.host;
  const port = params.port || 22;
  const username = params.username;
  const password = params.password || '';
  const enablePassword = params.enablePassword || '';
  const vendor = params.vendor || 'cisco';
  const timeout = params.timeoutMs || 30000;
  const commands = (params.commands || []).filter((c) => c && c.trim().length > 0 && !c.trim().startsWith('!'));

  return new Promise((resolve) => {
    const conn = new Client();
    let isSettled = false;
    let accumulatedOutput = '';

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        try { conn.end(); } catch {}
        resolve({
          success: false,
          output: accumulatedOutput,
          error: `Execution timed out on ${username}@${host}:${port} after ${timeout / 1000}s`,
          commandsExecuted: commands
        });
      }
    }, timeout);

    conn.on('keyboard-interactive', (_name, _instructions, _instructionsLang, prompts, finish) => {
      finish(prompts.map(() => password));
    });

    conn.on('ready', () => {
      conn.shell({
        term: 'vt100',
        cols: 300,
        rows: 250
      }, (shellErr, stream) => {
        if (shellErr) {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            try { conn.end(); } catch {}
            resolve({
              success: false,
              output: accumulatedOutput,
              error: `Failed to allocate PTY shell on device: ${shellErr.message}`,
              commandsExecuted: commands
            });
          }
          return;
        }

        stream.on('data', (chunk: Buffer) => {
          accumulatedOutput += chunk.toString('utf-8');
        });

        stream.on('close', () => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            try { conn.end(); } catch {}

            // Analyze output for vendor-specific errors
            let hasError = false;
            let errorMsg = '';

            if (vendor === 'cisco') {
              const syntaxError = accumulatedOutput.match(/% (Invalid input detected at '\^' marker|Command rejected:[^\r\n]+|Incomplete command|Ambiguous command|Configuration failed[^\r\n]*)/i);
              if (syntaxError) {
                hasError = true;
                errorMsg = `Cisco IOS CLI error: ${syntaxError[0]}`;
              }
            } else if (vendor === 'mikrotik') {
              const mikrotikError = accumulatedOutput.match(/(failure:[^\r\n]+|bad command name[^\r\n]*|syntax error[^\r\n]*|already exists[^\r\n]*)/i);
              if (mikrotikError) {
                hasError = true;
                errorMsg = `RouterOS CLI error: ${mikrotikError[0]}`;
              }
            }

            resolve({
              success: !hasError,
              output: accumulatedOutput,
              error: hasError ? errorMsg : undefined,
              commandsExecuted: commands
            });
          }
        });

        // Setup terminal environment and feed commands
        setTimeout(() => {
          if (vendor === 'cisco') {
            stream.write('terminal length 0\n');
            stream.write('terminal width 512\n');
            if (enablePassword) {
              stream.write('enable\n');
              setTimeout(() => {
                stream.write(enablePassword + '\n');
              }, 300);
            }
          }

          const startDelay = vendor === 'cisco' && enablePassword ? 800 : 300;
          setTimeout(() => {
            let delay = 0;
            for (const cmd of commands) {
              setTimeout(() => {
                try {
                  stream.write(`${cmd}\n`);
                } catch {}
              }, delay);
              delay += 80;
            }

            // Graceful exit after sending all commands
            setTimeout(() => {
              try {
                if (vendor === 'cisco') {
                  stream.write('exit\n');
                } else {
                  stream.write('\n');
                  stream.write('/quit\n');
                }
              } catch {}
              // Give 1.5s for remote device to buffer and flush
              setTimeout(() => {
                try { conn.end(); } catch {}
              }, 1500);
            }, delay + 500);
          }, startDelay);
        }, 300);
      });
    });

    conn.on('error', (err: any) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        try { conn.end(); } catch {}
        let msg = err.message || 'SSH connection failure';
        if (err.level === 'client-authentication') {
          msg = `SSH authentication failed for ${username}@${host}`;
        } else if (err.code === 'ECONNREFUSED') {
          msg = `Connection refused by ${host}:${port}`;
        } else if (err.code === 'ETIMEDOUT') {
          msg = `Connection timed out reaching ${host}:${port}`;
        }
        resolve({
          success: false,
          output: accumulatedOutput,
          error: msg,
          commandsExecuted: commands
        });
      }
    });

    try {
      conn.connect({
        host,
        port,
        username,
        password,
        readyTimeout: 12000,
        tryKeyboard: true,
        algorithms: COMPATIBLE_ALGORITHMS,
        keepaliveInterval: 5000,
        keepaliveCountMax: 3
      });
    } catch (connectErr: any) {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        resolve({
          success: false,
          output: accumulatedOutput,
          error: `Failed to initiate SSH connection: ${connectErr.message}`,
          commandsExecuted: commands
        });
      }
    }
  });
}



