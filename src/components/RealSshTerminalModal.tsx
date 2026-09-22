import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  X,
  Send,
  Maximize2,
  Minimize2,
  Trash2,
  Download,
  ShieldAlert,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wifi,
  WifiOff,
  CornerDownLeft,
  Settings2,
  Sliders,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Save,
  Cpu,
  Search,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  Activity,
  FileText,
  Copy,
  Check,
  HelpCircle,
  Info,
  ListOrdered,
  AlertTriangle
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { WorkflowTriggerBadge } from './WorkflowTriggerBadge';
import { parseAnsiToSpans } from '../utils/ansi';
import { DangerousCommandModal } from './DangerousCommandModal';
import { updateDevice, fetchDevicePorts, fetchVlans, executeTerminalDiagnostics } from '../services/api';
import { Device, SwitchPort, VlanInfo, TerminalExecResult, TerminalDiagnosticStage } from '../types';

interface RealSshTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  device?: Partial<Device> | null;
  initialHost?: string;
  initialPort?: number;
  initialUsername?: string;
  initialPassword?: string;
  initialEnablePassword?: string;
  autoConnect?: boolean;
  onDeviceUpdated?: () => void;
}

const DANGEROUS_PATTERNS = [
  {
    regex: /^\s*(reload|reboot|shutdown|poweroff|halt)(\s+.*)?$/i,
    reasonEn: 'Rebooting or halting the appliance causes immediate downtime.',
    reasonFa: 'ریستارت یا خاموش کردن تجهیز باعث قطعی کامل ترافیک شبکه می‌شود.'
  },
  {
    regex: /^\s*(write\s+erase|erase\s+startup-config|erase\s+nvram|erase\s+flash|erase\s+bootflash)(\s+.*)?$/i,
    reasonEn: 'Erasing startup configuration or NVRAM wipes device settings permanently.',
    reasonFa: 'پاک‌کردن NVRAM و کانفیگ استارت‌آپ باعث حذف کامل تنظیمات سوئیچ می‌شود.'
  },
  {
    regex: /^\s*(delete|format)\s+/i,
    reasonEn: 'Deleting system or flash files might render the appliance unbootable.',
    reasonFa: 'فرمت یا حذف فایل‌های حافظه فلش ممکن است مانع از بوت مجدد تجهیز شود.'
  },
  {
    regex: /^\s*default\s+interface\s+/i,
    reasonEn: 'Resetting an interface to factory defaults drops current VLANs and links.',
    reasonFa: 'ریست کردن پورت به حالت کارخانه باعث قطع شدن ارتباطات آن پورت می‌شود.'
  },
  {
    regex: /^\s*(clear\s+ip\s+route\s+\*|clear\s+arp-cache|clear\s+bgp\s+\*)(\s+.*)?$/i,
    reasonEn: 'Flushing routing tables or ARP caches causes temporary routing blackholes.',
    reasonFa: 'پاکسازی جدول مسیریابی یا ARP باعث قطعی موقت در انتقال بسته‌ها می‌شود.'
  },
  {
    regex: /^\s*(rm\s+-rf|drop\s+database|kill\s+-9)/i,
    reasonEn: 'Destructive OS command.',
    reasonFa: 'دستور خطرناک تخریب فایل‌های سیستمی.'
  }
];

interface CommandGuideItem {
  cmd: string;
  descEn: string;
  descFa: string;
  category: 'show' | 'config' | 'exec' | 'vlan';
}

const CISCO_COMMAND_GUIDE: CommandGuideItem[] = [
  { cmd: 'terminal length 0', descEn: 'Disable CLI pagination for uninterrupted command output', descFa: 'غیرفعال‌سازی صفحه‌بندی خط فرمان برای نمایش پیوسته خروجی', category: 'exec' },
  { cmd: 'enable', descEn: 'Enter Cisco Privileged EXEC mode (#)', descFa: 'ورود به حالت دسترسی ویژه با اختیارات ادمین', category: 'exec' },
  { cmd: 'show version', descEn: 'Display IOS software version, uptime, hardware model, and serials', descFa: 'نمایش نسخه IOS، زمان روشن بودن، مدل سخت‌افزار و حافظه', category: 'show' },
  { cmd: 'show ip interface brief', descEn: 'Summary of all interfaces, assigned IP addresses, and layer 1/2 status', descFa: 'خلاصه وضعیت تمامی اینترفیس‌ها، آدرس IP و وضعیت فیزیکی/پروتکلی', category: 'show' },
  { cmd: 'show interfaces status', descEn: 'Port connection status, duplex, speed, and access/trunk VLAN assignment', descFa: 'وضعیت پورت‌ها، سرعت، داپلکس و شماره ویلن اختصاص‌یافته', category: 'show' },
  { cmd: 'show vlan brief', descEn: 'List of all active VLANs and their assigned physical switchports', descFa: 'لیست تمام ویلن‌های فعال و پورت‌های اختصاص‌یافته به آن‌ها', category: 'vlan' },
  { cmd: 'show running-config', descEn: 'Display entire active running configuration currently in RAM', descFa: 'مشاهده کامل کانفیگ فعال و جاری سوییچ در رم', category: 'show' },
  { cmd: 'show cdp neighbors', descEn: 'Discover directly connected Cisco switches, routers, and phones', descFa: 'کشف تجهیزات متصل همسایه سیسکو با پروتکل CDP', category: 'show' },
  { cmd: 'show mac address-table', descEn: 'Inspect learned dynamic MAC addresses and corresponding switchports', descFa: 'مشاهده جدول آدرس‌های فیزیکی مک و پورت‌های مربوطه', category: 'show' },
  { cmd: 'show ip route', descEn: 'Display current IP routing table, connected subnets, and gateways', descFa: 'مشاهده جدول مسیریابی IP، شبکه‌های متصل و گیت‌وی پیش‌فرض', category: 'show' },
  { cmd: 'write memory', descEn: 'Save active running configuration from RAM into NVRAM startup-config', descFa: 'ذخیره کانفیگ جاری در حافظه NVRAM استارت‌آپ (رایت مموری)', category: 'exec' },
  { cmd: 'configure terminal', descEn: 'Enter global configuration mode (config)#', descFa: 'ورود به حالت پیکربندی سراسری سوییچ', category: 'config' },
  { cmd: 'interface GigabitEthernet1/0/1', descEn: 'Select physical interface for configuration', descFa: 'انتخاب اینترفیس فیزیکی جهت اعمال تنظیمات', category: 'config' },
  { cmd: 'switchport mode access', descEn: 'Set port as an access port for end devices', descFa: 'تنظیم پورت در حالت Access برای کلاینت‌ها', category: 'config' },
  { cmd: 'switchport access vlan 10', descEn: 'Assign access port to VLAN 10', descFa: 'اختصاص پورت دسترسی به شماره ویلن ۱۰', category: 'vlan' },
  { cmd: 'switchport mode trunk', descEn: 'Configure interface as 802.1Q trunk link', descFa: 'پیکربندی پورت به عنوان ترانک برای عبور چند ویلن', category: 'config' },
  { cmd: 'no shutdown', descEn: 'Enable and activate interface (administratively up)', descFa: 'فعال‌سازی اینترفیس و خارج کردن از وضعیت خاموش', category: 'config' },
  { cmd: 'shutdown', descEn: 'Administratively disable the selected interface', descFa: 'غیرفعال‌سازی دستی اینترفیس انتخابی', category: 'config' },
];

export const RealSshTerminalModal: React.FC<RealSshTerminalModalProps> = ({
  isOpen,
  onClose,
  device,
  initialHost,
  initialPort,
  initialUsername,
  initialPassword,
  initialEnablePassword,
  autoConnect = true,
  onDeviceUpdated,
}) => {
  const { isEn } = useLanguage();

  // Mode: Real SSH (Live Port 22) vs Simulation (Offline Fallback)
  const [terminalEngine, setTerminalEngine] = useState<'real_ssh' | 'simulator'>('real_ssh');

  // Connection Parameters
  const [host, setHost] = useState('');
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [enablePassword, setEnablePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showEnablePassword, setShowEnablePassword] = useState(false);
  const [isSavingCreds, setIsSavingCreds] = useState(false);
  const [saveCredsMessage, setSaveCredsMessage] = useState<string | null>(null);

  // Terminal State
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [currentInput, setCurrentInput] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [connectionStatus, setConnectionStatus] = useState<
    'disconnected' | 'connecting' | 'authenticated' | 'ready' | 'error'
  >('disconnected');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [banner, setBanner] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoDisablePaging, setAutoDisablePaging] = useState(true);
  const [hasPagingPrompt, setHasPagingPrompt] = useState(false);
  const [showCredsDrawer, setShowCredsDrawer] = useState(false);
  const [showGuideDrawer, setShowGuideDrawer] = useState(false);
  const [guideSearch, setGuideSearch] = useState('');
  const [guideCategory, setGuideCategory] = useState<'all' | 'show' | 'config' | 'exec' | 'vlan'>('all');

  // Connection Log & Diagnostics State
  const [showLogDrawer, setShowLogDrawer] = useState<boolean>(false);
  const [connectionLogs, setConnectionLogs] = useState<{
    id: string;
    timestamp: string;
    type: 'info' | 'status' | 'error' | 'success' | 'warn';
    stage?: string;
    stageNameFa?: string;
    message: string;
    messageFa?: string;
    details?: string;
    failureLayer?: string;
    recommendationFa?: string;
  }[]>([]);
  const [diagnosticsResult, setDiagnosticsResult] = useState<TerminalExecResult | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [activeLogTab, setActiveLogTab] = useState<'flow' | 'solution' | 'raw'>('flow');
  const [copiedLog, setCopiedLog] = useState<boolean>(false);

  // Dangerous Command Modal
  const [pendingDangerousCmd, setPendingDangerousCmd] = useState<string | null>(null);
  const [dangerousReason, setDangerousReason] = useState<string>('');

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Simulated Fallback State (when physical switch is unreachable or simulator toggled)
  const [simMode, setSimMode] = useState<'USER' | 'PRIV' | 'CONF'>('USER');
  const [simPorts, setSimPorts] = useState<SwitchPort[]>([]);
  const [simVlans, setSimVlans] = useState<VlanInfo[]>([]);

  // Initialize parameters when modal opens
  useEffect(() => {
    if (isOpen) {
      const targetHost = initialHost || device?.ip || '192.168.1.1';
      const targetPort = initialPort || device?.ssh_port || 22;
      const targetUser = initialUsername || device?.ssh_username || 'admin';
      const targetPass = initialPassword || device?.ssh_password || '';
      const targetEnable = initialEnablePassword || device?.enable_password || '';

      setHost(targetHost);
      setPort(targetPort);
      setUsername(targetUser);
      setPassword(targetPass);
      setEnablePassword(targetEnable);
      setTerminalOutput('');
      setConnectionStatus('disconnected');
      setStatusMessage('');
      setBanner('');
      setHasPagingPrompt(false);
      setTerminalEngine('real_ssh');
      setShowCredsDrawer(false);
      setShowLogDrawer(false);
      setConnectionLogs([]);
      setDiagnosticsResult(null);
      setIsDiagnosing(false);
      setSaveCredsMessage(null);

      // Load ports/vlans for simulation fallback if needed
      if (device?.id) {
        fetchDevicePorts(device.id).then((r) => setSimPorts(r.ports)).catch(() => {});
        fetchVlans().then((r) => setSimVlans(r.vlans)).catch(() => {});
      }

      // If password is missing or empty, automatically open credentials drawer so user can supply it
      if (!targetPass) {
        setShowCredsDrawer(true);
      }

      // Automatically initiate live SSH connection
      if (autoConnect !== false && targetHost) {
        const connectTimer = setTimeout(() => {
          connectWs(targetHost, targetPort, targetUser, targetPass, targetEnable);
        }, 120);
        return () => clearTimeout(connectTimer);
      }
    } else {
      disconnectWs();
    }
  }, [isOpen, device, initialHost, initialPort, initialUsername, initialPassword, initialEnablePassword, autoConnect]);

  // Scroll to bottom when output changes
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalOutput]);

  // Focus input automatically
  useEffect(() => {
    if (connectionStatus === 'ready' || terminalEngine === 'simulator') {
      inputRef.current?.focus();
    }
  }, [connectionStatus, terminalEngine]);

  // Disconnect WebSocket
  const disconnectWs = () => {
    if (wsRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'disconnect' }));
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    setConnectionStatus('disconnected');
  };

  // Connect via WebSocket
  const connectWs = (
    overrideHost?: string,
    overridePort?: number,
    overrideUsername?: string,
    overridePassword?: string,
    overrideEnablePassword?: string
  ) => {
    const targetHost = overrideHost !== undefined ? overrideHost : host;
    const targetPort = overridePort !== undefined ? overridePort : port;
    const targetUsername = overrideUsername !== undefined ? overrideUsername : username;
    const targetPassword = overridePassword !== undefined ? overridePassword : password;
    const targetEnablePassword = overrideEnablePassword !== undefined ? overrideEnablePassword : enablePassword;

    if (!targetHost.trim() || !targetUsername.trim()) {
      setStatusMessage(isEn ? 'Host and username are required' : 'آدرس هاست و نام کاربری الزامی است');
      setShowCredsDrawer(true);
      return;
    }

    setTerminalEngine('real_ssh');
    disconnectWs();
    setConnectionStatus('connecting');
    setStatusMessage(
      isEn
        ? `Connecting to ${targetUsername}@${targetHost}:${targetPort} via SSH...`
        : `در حال برقراری اتصال به ${targetUsername}@${targetHost}:${targetPort} از طریق SSH...`
    );
    setTerminalOutput(
      `\r\n[SSH] Connecting to ${targetHost}:${targetPort} using user '${targetUsername}'...\r\n`
    );

    const initTime = new Date().toLocaleTimeString('fa-IR');
    setConnectionLogs([
      {
        id: String(Date.now()),
        timestamp: initTime,
        type: 'info',
        stage: 'tcp_socket',
        stageNameFa: 'برقراری سوکت TCP',
        message: `Connecting to ${targetUsername}@${targetHost}:${targetPort}...`,
        messageFa: `درخواست اتصال سوکت به ${targetHost}:${targetPort} با کاربر '${targetUsername}'`
      }
    ]);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/ssh`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionLogs((prev) => [
          ...prev,
          {
            id: String(Date.now()) + Math.random(),
            timestamp: new Date().toLocaleTimeString('fa-IR'),
            type: 'info',
            stage: 'websocket',
            stageNameFa: 'کانال ارتباطی وب‌سوکت',
            message: 'WebSocket tunnel established to server /ws/ssh. Sent handshake payload.',
            messageFa: 'کانال وب‌سوکت با سرور فعال شد و بسته Handshake ارسال گردید.'
          }
        ]);

        // Send initial connect payload
        ws.send(
          JSON.stringify({
            type: 'connect',
            host: targetHost.trim(),
            port: Number(targetPort) || 22,
            username: targetUsername.trim(),
            password: targetPassword,
            enablePassword: targetEnablePassword,
            termCols: 110,
            termRows: 34,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'data') {
            setTerminalOutput((prev) => {
              const updated = prev + msg.data;
              // Detect Cisco/Network Pagination
              if (/--More--|<--- More --->|\[More\]/i.test(updated.slice(-100))) {
                setHasPagingPrompt(true);
              } else {
                setHasPagingPrompt(false);
              }
              return updated;
            });
          } else if (msg.type === 'status') {
            if (msg.status === 'ready') {
              setConnectionStatus('ready');
              setStatusMessage(
                isEn
                  ? `Connected to ${targetHost} (Port ${targetPort})`
                  : `اتصال فعال به ${targetHost} (پورت ${targetPort})`
              );
              setConnectionLogs((prev) => [
                ...prev,
                {
                  id: String(Date.now()) + Math.random(),
                  timestamp: new Date().toLocaleTimeString('fa-IR'),
                  type: 'success',
                  stage: 'pty_exec',
                  stageNameFa: 'ترمینال تعاملی PTY',
                  message: `Interactive shell ready for ${targetUsername}@${targetHost}`,
                  messageFa: `کانال PTY متصل شد و خط فرمان آماده دریافت دستورات است.`
                }
              ]);
              // Automatically disable pagination if toggled
              if (autoDisablePaging) {
                setTimeout(() => {
                  sendRawData('terminal length 0\r');
                }, 400);
              }
            } else if (msg.status === 'authenticated') {
              setConnectionStatus('authenticated');
              setStatusMessage(
                isEn ? 'Authenticated! Establishing PTY...' : 'احراز هویت تایید شد! در حال راه‌اندازی PTY...'
              );
              setConnectionLogs((prev) => [
                ...prev,
                {
                  id: String(Date.now()) + Math.random(),
                  timestamp: new Date().toLocaleTimeString('fa-IR'),
                  type: 'success',
                  stage: 'auth',
                  stageNameFa: 'احراز هویت کاربر',
                  message: `User '${targetUsername}' credentials accepted by Cisco switch.`,
                  messageFa: `احراز هویت کاربر '${targetUsername}' تایید شد.`
                }
              ]);
            } else if (msg.status === 'closed' || msg.status === 'disconnected') {
              setConnectionStatus('disconnected');
              setStatusMessage(msg.message || (isEn ? 'Connection closed' : 'ارتباط قطع شد'));
              setConnectionLogs((prev) => [
                ...prev,
                {
                  id: String(Date.now()) + Math.random(),
                  timestamp: new Date().toLocaleTimeString('fa-IR'),
                  type: 'warn',
                  stage: 'disconnect',
                  stageNameFa: 'قطع اتصال',
                  message: msg.message || 'Connection closed',
                  messageFa: 'اتصال توسط سرور یا کاربر بسته شد.'
                }
              ]);
            }
          } else if (msg.type === 'banner') {
            setBanner(msg.banner);
            setConnectionLogs((prev) => [
              ...prev,
              {
                id: String(Date.now()) + Math.random(),
                timestamp: new Date().toLocaleTimeString('fa-IR'),
                type: 'info',
                stage: 'ssh_banner',
                stageNameFa: 'بنر شناسایی SSH',
                message: `Banner: ${msg.banner}`,
                messageFa: `دریافت بنر و شناسه سرور SSH: ${msg.banner.slice(0, 100)}`
              }
            ]);
          } else if (msg.type === 'error') {
            setConnectionStatus('error');
            setStatusMessage(msg.message || (isEn ? 'SSH connection error' : 'خطای اتصال SSH'));
            setTerminalOutput(
              (prev) =>
                `${prev}\r\n\x1b[31m[SSH ERROR] ${msg.message}\x1b[0m\r\n\x1b[33mHint: Click 'لاگ اتصال' for 5-layer diagnostic inspection & Cisco remediation.\x1b[0m\r\n`
            );
            setShowCredsDrawer(true);

            setConnectionLogs((prev) => [
              ...prev,
              {
                id: String(Date.now()) + Math.random(),
                timestamp: new Date().toLocaleTimeString('fa-IR'),
                type: 'error',
                stage: msg.failureStage || 'ssh_connection',
                stageNameFa: msg.failureLayer || 'خطای اتصال SSH',
                message: msg.message || 'SSH error',
                messageFa: msg.rootCauseFa || msg.message || 'خطا در ارتباط با سوئیچ',
                failureLayer: msg.failureLayer,
                recommendationFa: msg.recommendationFa
              }
            ]);

            // Construct synthetic diagnostic result if not yet executed via API
            setDiagnosticsResult((prev) => {
              if (prev && prev.failureStage) return prev;
              const fStage = msg.failureStage || 'tcp_socket';
              return {
                success: false,
                message: msg.message || 'SSH connection error',
                messageFa: msg.rootCauseFa || msg.message,
                latency_ms: 0,
                stages: [
                  {
                    id: 'tcp_socket',
                    name: 'TCP Socket (Port 22)',
                    nameFa: 'سوکت و دست‌تکانی TCP (لایه ۴)',
                    status: fStage === 'tcp_socket' ? 'failed' : 'success',
                    details: fStage === 'tcp_socket' ? msg.message : 'Connected',
                    detailsFa: fStage === 'tcp_socket' ? (msg.rootCauseFa || msg.message) : 'سوکت TCP در دسترس است'
                  },
                  {
                    id: 'ssh_banner',
                    name: 'SSH Identification',
                    nameFa: 'تبادل پروتکل و بنر SSH',
                    status: fStage === 'ssh_banner' ? 'failed' : fStage === 'tcp_socket' ? 'skipped' : 'success',
                    details: 'Protocol identification',
                    detailsFa: 'تبادل نسخه پروتکل'
                  },
                  {
                    id: 'kex_cipher',
                    name: 'Key Exchange & Ciphers',
                    nameFa: 'مذاکره الگوریتم‌های رمزنگاری و KEX',
                    status: fStage === 'kex_cipher' ? 'failed' : (fStage === 'tcp_socket' || fStage === 'ssh_banner') ? 'skipped' : 'success',
                    details: 'Ciphers negotiation',
                    detailsFa: 'توافق الگوریتم‌ها'
                  },
                  {
                    id: 'auth',
                    name: 'Authentication',
                    nameFa: 'احراز هویت کاربر و سطح دسترسی',
                    status: fStage === 'auth' ? 'failed' : (fStage ? 'skipped' : 'success'),
                    details: 'User credentials verification',
                    detailsFa: fStage === 'auth' ? (msg.rootCauseFa || 'نام کاربری یا کلمه عبور رد شد') : 'احراز هویت'
                  },
                  {
                    id: 'pty_exec',
                    name: 'PTY Shell',
                    nameFa: 'تخصیص شل تعاملی PTY',
                    status: fStage ? 'skipped' : 'success',
                    details: 'Interactive terminal channel',
                    detailsFa: 'کانال ترمینال'
                  }
                ],
                failureStage: fStage,
                failureLayer: msg.failureLayer || 'لایه ارتباطی',
                rootCause: msg.message,
                rootCauseFa: msg.rootCauseFa || msg.message,
                recommendationFa: msg.recommendationFa,
                timestamp: new Date().toISOString()
              };
            });
          }
        } catch {
          // If raw text
          setTerminalOutput((prev) => prev + event.data);
        }
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
      };

      ws.onerror = () => {
        setConnectionStatus('error');
        setStatusMessage(isEn ? 'WebSocket communication error' : 'خطا در وب‌سوکت ارتباطی');
        setConnectionLogs((prev) => [
          ...prev,
          {
            id: String(Date.now()) + Math.random(),
            timestamp: new Date().toLocaleTimeString('fa-IR'),
            type: 'error',
            stage: 'websocket',
            stageNameFa: 'کانال ارتباطی وب‌سوکت',
            message: 'WebSocket connection failed',
            messageFa: 'خطا در اتصال به وب‌سوکت سرور برنامه.'
          }
        ]);
      };
    } catch (e: any) {
      setConnectionStatus('error');
      setStatusMessage(e.message);
    }
  };

  // Execute Deep Connection Diagnostics via POST /api/terminal/exec
  const handleRunDiagnostics = async (customCommand?: string) => {
    setIsDiagnosing(true);
    const targetHost = host.trim();
    const targetPort = Number(port) || 22;
    const targetUsername = username.trim();

    try {
      const res = await executeTerminalDiagnostics({
        host: targetHost,
        port: targetPort,
        username: targetUsername,
        password: password || '',
        enablePassword: enablePassword || '',
        command: customCommand || '',
        timeoutMs: 12000
      });

      setDiagnosticsResult(res);

      const timestamp = new Date().toLocaleTimeString('fa-IR');
      setConnectionLogs((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          timestamp,
          type: res.success ? 'success' : 'error',
          stage: res.failureStage || 'diagnostics',
          stageNameFa: res.failureLayer || (res.success ? 'بررسی عمیق ۵ لایه' : 'تشخیص نقطه خطا'),
          message: res.message,
          messageFa: res.messageFa || res.message,
          failureLayer: res.failureLayer,
          recommendationFa: res.recommendationFa
        }
      ]);

      if (!res.success && res.failureStage) {
        setActiveLogTab('flow');
      }
    } catch (err: any) {
      console.error('Diagnostic error:', err);
      const timestamp = new Date().toLocaleTimeString('fa-IR');
      setConnectionLogs((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          timestamp,
          type: 'error',
          stage: 'api_error',
          stageNameFa: 'خطای وب‌سرویس عیب‌یابی',
          message: err.message || 'Diagnostic API failed',
          messageFa: 'خطا در ارتباط با سرویس /api/terminal/exec'
        }
      ]);
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Copy Full Diagnostics & Connection Log
  const handleCopyDiagnostics = () => {
    let report = `=== گزارش و لاگ مراحل اتصال SSH (Cisco Switch Connection Log & Diagnostics) ===\n`;
    report += `زمان بررسی: ${new Date().toLocaleString('fa-IR')}\n`;
    report += `میزبان مقصد: ${username}@${host}:${port}\n`;
    report += `وضعیت کلی: ${diagnosticsResult ? (diagnosticsResult.success ? 'موفقیت‌آمیز (هر ۵ مرحله تایید شد)' : 'خطا در برقراری ارتباط') : connectionStatus}\n`;
    if (diagnosticsResult?.latency_ms) {
      report += `تاخیر کلی اتصال: ${diagnosticsResult.latency_ms}ms\n`;
    }
    if (diagnosticsResult?.failureStage) {
      report += `\n[موقعیت وقوع خطا]: ${diagnosticsResult.failureStage} (${diagnosticsResult.failureLayer || ''})\n`;
      report += `[علت ریشه‌ای خطا]: ${diagnosticsResult.rootCauseFa || diagnosticsResult.rootCause || diagnosticsResult.message}\n`;
      if (diagnosticsResult.recommendationFa) {
        report += `[راهکار رفع در سوئیچ سیسکو]: ${diagnosticsResult.recommendationFa}\n`;
      }
    }
    report += `\n--- مراحل ۵ گانه دست‌تکانی و اتصال (Layered Stages) ---\n`;
    if (diagnosticsResult?.stages) {
      diagnosticsResult.stages.forEach((st, idx) => {
        report += `${idx + 1}. [${st.status.toUpperCase()}] ${st.nameFa} (${st.name}) - ${st.latency_ms ? st.latency_ms + 'ms' : '-'}\n`;
        report += `   توضیحات: ${st.detailsFa || st.details}\n`;
        if (st.rawError) report += `   خطای خام: ${st.rawError}\n`;
        if (st.errorFixFa) report += `   دستور پیشنهادی: ${st.errorFixFa}\n`;
      });
    }
    report += `\n--- لاگ رویدادهای زنده (WebSocket Event Stream) ---\n`;
    connectionLogs.forEach((l) => {
      report += `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.stageNameFa || l.stage || ''}: ${l.messageFa || l.message}\n`;
    });

    navigator.clipboard.writeText(report);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  // Save Credentials permanently to Device
  const handleSaveCredentials = async () => {
    if (!device?.id) return;
    try {
      setIsSavingCreds(true);
      await updateDevice(device.id, {
        ip: host.trim(),
        ssh_port: Number(port) || 22,
        ssh_username: username.trim(),
        ssh_password: password,
        enable_password: enablePassword,
      });
      setSaveCredsMessage(isEn ? 'Credentials saved to device successfully' : 'مشخصات با موفقیت روی دستگاه ذخیره شد');
      setTimeout(() => setSaveCredsMessage(null), 3000);
      if (onDeviceUpdated) onDeviceUpdated();
    } catch (err: any) {
      setSaveCredsMessage(isEn ? `Failed: ${err.message}` : `خطا در ذخیره: ${err.message}`);
    } finally {
      setIsSavingCreds(false);
    }
  };

  // Send raw data to remote device
  const sendRawData = (data: string) => {
    if (terminalEngine === 'simulator') {
      executeSimulatedCommand(data.replace(/\r|\n/g, ''));
      return;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'data', data }));
    }
  };

  // Simulation mode executor (fallback when physical switch is unreachable)
  const executeSimulatedCommand = (cmdStr: string) => {
    const trimmed = cmdStr.trim();
    const devHost = device?.name?.toUpperCase() || host || 'Switch';
    const prompt = simMode === 'CONF' ? `${devHost}(config)#` : simMode === 'PRIV' ? `${devHost}#` : `${devHost}>`;

    setTerminalOutput((prev) => `${prev}\r\n${prompt} ${trimmed}\r\n`);
    if (!trimmed) return;

    const lower = trimmed.toLowerCase();
    if (lower === 'enable' || lower === 'en') {
      setSimMode('PRIV');
      setTerminalOutput((prev) => `${prev}${devHost}# `);
    } else if (lower === 'disable') {
      setSimMode('USER');
      setTerminalOutput((prev) => `${prev}${devHost}> `);
    } else if (lower === 'configure terminal' || lower === 'conf t') {
      setSimMode('CONF');
      setTerminalOutput((prev) => `${prev}Enter configuration commands, one per line. End with CNTL/Z.\r\n${devHost}(config)# `);
    } else if (lower === 'exit' || lower === 'end') {
      if (simMode === 'CONF') setSimMode('PRIV');
      else setSimMode('USER');
    } else if (lower === 'clear' || lower === 'cls') {
      setTerminalOutput('');
    } else if (lower.startsWith('show ver')) {
      setTerminalOutput(
        (prev) =>
          `${prev}Cisco IOS XE Software, Version 17.09.03\r\nTechnical Support: http://www.cisco.com/techsupport\r\nDevice: ${device?.model || 'Catalyst 9300'}\r\nUptime is ${device?.uptime || '142 days, 6 hours'}\r\nProcessor board ID FOC2239401A\r\nBase Ethernet MAC: ${device?.mac || '00:50:56:A1:B2:C0'}\r\n`
      );
    } else if (lower.startsWith('show ip int')) {
      let tbl = 'Interface                  IP-Address      OK? Method Status                Protocol\r\n----------------------------------------------------------------------------------------\r\n';
      tbl += `Vlan1                      ${host.padEnd(15)} YES NVRAM  up                    up\r\n`;
      simPorts.slice(0, 8).forEach((p) => {
        tbl += `${p.port_id.padEnd(26)} unassigned      YES unset  ${p.status.padEnd(21)} ${p.status}\r\n`;
      });
      setTerminalOutput((prev) => prev + tbl);
    } else if (lower.startsWith('show run')) {
      setTerminalOutput(
        (prev) =>
          `${prev}Building configuration...\r\n!\r\nhostname ${devHost}\r\n!\r\nspanning-tree mode rapid-pvst\r\n!\r\ninterface Vlan1\r\n ip address ${host} 255.255.255.0\r\n no shutdown\r\n!\r\nline vty 0 4\r\n transport input ssh\r\n login local\r\n!\r\nend\r\n`
      );
    } else if (lower.startsWith('write mem') || lower === 'wr') {
      setTerminalOutput((prev) => `${prev}Building configuration...\r\n[OK]\r\nConfiguration saved to NVRAM successfully.\r\n`);
    } else {
      setTerminalOutput((prev) => `${prev}% Unknown or simulated command: "${trimmed}". Switch to Real SSH for hardware execution.\r\n`);
    }
  };

  // Check if command is dangerous
  const checkDangerous = (cmd: string): { isDangerous: boolean; reason: string } => {
    for (const item of DANGEROUS_PATTERNS) {
      if (item.regex.test(cmd)) {
        return {
          isDangerous: true,
          reason: isEn ? item.reasonEn : item.reasonFa,
        };
      }
    }
    return { isDangerous: false, reason: '' };
  };

  // Handle command submission
  const handleSendCommand = (cmdToSend?: string) => {
    const cmd = cmdToSend !== undefined ? cmdToSend : currentInput;
    if (!cmd.trim() && cmdToSend === undefined) {
      // Just Enter
      sendRawData('\r');
      return;
    }

    const trimmed = cmd.trim();

    // Check for dangerous commands
    const safetyCheck = checkDangerous(trimmed);
    if (safetyCheck.isDangerous) {
      setPendingDangerousCmd(trimmed);
      setDangerousReason(safetyCheck.reason);
      return;
    }

    // Normal command execution
    executeVerifiedCommand(trimmed);
  };

  const executeVerifiedCommand = (cmd: string) => {
    sendRawData(cmd + '\r');
    setHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);
    setCurrentInput('');
    inputRef.current?.focus();
  };

  // Confirm execution of dangerous command
  const handleConfirmDangerous = () => {
    if (pendingDangerousCmd) {
      executeVerifiedCommand(pendingDangerousCmd);
      setPendingDangerousCmd(null);
      setDangerousReason('');
    }
  };

  // Abort dangerous command
  const handleCancelDangerous = () => {
    setPendingDangerousCmd(null);
    setDangerousReason('');
    setCurrentInput('');
    sendRawData('\x03');
    inputRef.current?.focus();
  };

  // Keyboard navigation & Shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setCurrentInput(history[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(-1);
        setCurrentInput('');
      } else {
        setHistoryIndex(nextIndex);
        setCurrentInput(history[nextIndex]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      sendRawData(currentInput + '\t');
    } else if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      sendRawData('\x03');
      setCurrentInput('');
    } else if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      sendRawData('\x1a');
      setCurrentInput('');
    }
  };

  // Download terminal session log
  const handleDownloadLog = () => {
    const blob = new Blob([terminalOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ssh-session-${host || 'device'}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.log`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const filteredGuide = CISCO_COMMAND_GUIDE.filter((item) => {
    const matchesCategory = guideCategory === 'all' || item.category === guideCategory;
    const matchesSearch =
      !guideSearch.trim() ||
      item.cmd.toLowerCase().includes(guideSearch.toLowerCase()) ||
      item.descEn.toLowerCase().includes(guideSearch.toLowerCase()) ||
      item.descFa.includes(guideSearch);
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 modal-backdrop-blur"
        data-modal-backdrop="true"
        dir={isEn ? 'ltr' : 'rtl'}
      >
        <div
          className={`bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
            isFullscreen ? 'w-full h-full rounded-none m-0' : 'w-full max-w-5xl h-[90vh]'
          }`}
        >
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 text-slate-200 shrink-0 gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <TerminalIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white font-mono flex items-center gap-1.5">
                    <span>{device?.name || host || 'Cisco Switch Terminal'}</span>
                    <span className="text-[11px] font-normal text-slate-400 font-mono">
                      ({username}@{host}:{port})
                    </span>
                  </h3>

                  {/* Engine mode pill */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 font-sans ${
                      terminalEngine === 'real_ssh'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    <Cpu className="w-2.5 h-2.5" />
                    <span>{terminalEngine === 'real_ssh' ? 'Real SSH (Port 22)' : (isEn ? 'Offline Simulator' : 'شبیه‌ساز آفلاین')}</span>
                  </span>

                  {/* Status indicator badge */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 font-sans ${
                      connectionStatus === 'ready'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : connectionStatus === 'connecting' || connectionStatus === 'authenticated'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : connectionStatus === 'error'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {connectionStatus === 'ready' ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{isEn ? 'LIVE' : 'متصل'}</span>
                      </>
                    ) : connectionStatus === 'connecting' || connectionStatus === 'authenticated' ? (
                      <>
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        <span>{isEn ? 'CONNECTING...' : 'در حال اتصال...'}</span>
                      </>
                    ) : connectionStatus === 'error' ? (
                      <>
                        <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
                        <span>{isEn ? 'DISCONNECTED' : 'قطع'}</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-2.5 h-2.5 text-slate-400" />
                        <span>{isEn ? 'OFFLINE' : 'قطع'}</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-md">
                  {statusMessage ||
                    (isEn
                      ? `Direct TCP Socket to ${device?.name || 'switch'} on Port ${port}`
                      : `ارتباط مستقیم سوکت با ${device?.name || 'سوییچ'} روی پورت ${port}`)}
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-1.5">
              {/* Credentials / Settings button */}
              <button
                type="button"
                onClick={() => setShowCredsDrawer(!showCredsDrawer)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1 ${
                  showCredsDrawer
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title={isEn ? 'SSH Credentials & Port Settings' : 'تنظیمات پورت و احراز هویت SSH'}
              >
                <Key className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isEn ? 'Credentials' : 'احراز هویت'}</span>
              </button>

              {/* Command Reference Guide Drawer button */}
              <button
                type="button"
                onClick={() => setShowGuideDrawer(!showGuideDrawer)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1 ${
                  showGuideDrawer
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title={isEn ? 'Cisco IOS Command Guide' : 'راهنمای دستورات سیسکو'}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isEn ? 'Command Guide' : 'راهنمای دستورات'}</span>
              </button>

              {/* Connection Log & Diagnostic Inspector Button */}
              <button
                type="button"
                onClick={() => {
                  const nextState = !showLogDrawer;
                  setShowLogDrawer(nextState);
                  if (nextState && !diagnosticsResult && !isDiagnosing) {
                    handleRunDiagnostics();
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                  showLogDrawer
                    ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                    : connectionStatus === 'error' || (diagnosticsResult && !diagnosticsResult.success)
                    ? 'bg-rose-500/25 hover:bg-rose-500/35 text-rose-200 border-rose-500/50 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title={isEn ? 'Connection Log & Diagnostics (POST /api/terminal/exec)' : 'لاگ اتصال و عیب‌یابی لایه‌ای (POST /api/terminal/exec)'}
              >
                <Activity className={`w-3.5 h-3.5 ${isDiagnosing ? 'animate-spin text-amber-300' : 'text-amber-400'}`} />
                <span className="font-semibold">{isEn ? 'Connection Log' : 'لاگ اتصال'}</span>
                {diagnosticsResult && !diagnosticsResult.success && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                )}
                {diagnosticsResult && diagnosticsResult.success && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>

              {/* Engine Switcher */}
              {terminalEngine === 'real_ssh' ? (
                connectionStatus === 'ready' ? (
                  <button
                    onClick={disconnectWs}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-medium border border-rose-500/30 transition cursor-pointer"
                  >
                    {isEn ? 'Disconnect' : 'قطع اتصال'}
                  </button>
                ) : (
                  <button
                    onClick={() => connectWs()}
                    disabled={connectionStatus === 'connecting'}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
                    <span>{isEn ? 'Connect SSH' : 'اتصال به SSH'}</span>
                  </button>
                )
              ) : (
                <button
                  onClick={() => connectWs()}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                >
                  <Wifi className="w-3 h-3" />
                  <span>{isEn ? 'Switch to Real SSH' : 'تغییر به SSH واقعی'}</span>
                </button>
              )}

              <button
                onClick={() => setTerminalOutput('')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                title={isEn ? 'Clear Screen' : 'پاک‌کردن صفحه'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleDownloadLog}
                disabled={!terminalOutput}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer disabled:opacity-40"
                title={isEn ? 'Download Session Log' : 'دانلود لاگ سشن'}
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                title={isFullscreen ? (isEn ? 'Restore' : 'خروج از تمام صفحه') : (isEn ? 'Fullscreen' : 'تمام صفحه')}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <WorkflowTriggerBadge targetId="modal-real-ssh" />

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                title={isEn ? 'Close' : 'بستن'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Connection Log & Multi-Layer Diagnostics Drawer */}
          {showLogDrawer && (
            <div className="bg-slate-900 border-b border-amber-500/30 px-4 py-3 text-xs shadow-xl">
              {/* Drawer Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-sm">
                        {isEn ? 'SSH Connection Lifecycle & Diagnostics' : 'لاگ و آنالیز مراحل اتصال SSH'}
                      </span>
                      {/* Overall Status Badge */}
                      {diagnosticsResult?.success ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>{isEn ? 'All 5 Stages Verified' : 'موفق (۵ لایه تایید شد)'}</span>
                          {diagnosticsResult.latency_ms > 0 && <span>· {diagnosticsResult.latency_ms}ms</span>}
                        </span>
                      ) : diagnosticsResult?.failureStage ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          <span>{isEn ? `Failed at ${diagnosticsResult.failureStage}` : `خطا در مرحله ${diagnosticsResult.failureStage}`}</span>
                        </span>
                      ) : isDiagnosing ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                          <span>{isEn ? 'Probing layers...' : 'در حال آزمودن لایه‌ها...'}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {isEn ? 'Idle' : 'آماده بررسی'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {isEn
                        ? `Real-time handshake tracer for ${username}@${host}:${port} with root-cause isolation`
                        : `ردیابی لحظه‌ای نحوه برقراری ارتباط با ${username}@${host}:${port} و تشخیص دقیق محل اشکال`}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRunDiagnostics()}
                    disabled={isDiagnosing}
                    className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                    title={isEn ? 'Run Deep 5-Layer Probe via POST /api/terminal/exec' : 'اجرای تست عمیق ۵ لایه از طریق POST /api/terminal/exec'}
                  >
                    <RefreshCw className={`w-3 h-3 ${isDiagnosing ? 'animate-spin' : ''}`} />
                    <span>{isDiagnosing ? (isEn ? 'Testing...' : 'در حال تست...') : (isEn ? 'Probe Connection (API)' : 'تست مجدد اتصال (اندپوینت)')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyDiagnostics}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition flex items-center gap-1.5 cursor-pointer"
                    title={isEn ? 'Copy full diagnostic log to clipboard' : 'کپی گزارش کامل لاگ و عیب‌یابی'}
                  >
                    {copiedLog ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    <span>{copiedLog ? (isEn ? 'Copied!' : 'کپی شد!') : (isEn ? 'Copy Log' : 'کپی لاگ')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowLogDrawer(false)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Prominent Root Cause / Failure Spotlight Banner */}
              {diagnosticsResult && !diagnosticsResult.success && (
                <div className="mt-2.5 p-3 rounded-lg bg-rose-950/60 border border-rose-600/40 text-rose-200 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-xs text-rose-100 flex items-center gap-1.5 flex-wrap">
                          <span>{isEn ? 'Failure Location Identified:' : 'موقعیت دقیق وقوع خطا:'}</span>
                          <span className="px-2 py-0.5 rounded bg-rose-900/80 text-rose-200 font-mono text-[11px] border border-rose-700/50">
                            {diagnosticsResult.failureStage}
                          </span>
                          {diagnosticsResult.failureLayer && (
                            <span className="text-[11px] text-rose-300/80">({diagnosticsResult.failureLayer})</span>
                          )}
                        </div>
                        <p className="text-[11px] text-rose-200/90 mt-1 leading-relaxed">
                          <strong>{isEn ? 'Root Cause: ' : 'علت ریشه‌ای: '}</strong>
                          {diagnosticsResult.rootCauseFa || diagnosticsResult.rootCause || diagnosticsResult.message}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveLogTab('solution')}
                      className="px-2 py-1 rounded bg-rose-900/60 hover:bg-rose-850 text-rose-100 text-[11px] font-semibold border border-rose-700/60 shrink-0 cursor-pointer transition flex items-center gap-1"
                    >
                      <HelpCircle className="w-3 h-3 text-rose-300" />
                      <span>{isEn ? 'View Fix Guide' : 'مشاهده راهکار'}</span>
                    </button>
                  </div>

                  {diagnosticsResult.recommendationFa && (
                    <div className="pt-2 border-t border-rose-900/60 text-[11px] text-rose-100 flex items-start gap-1.5 bg-rose-950/40 p-2 rounded">
                      <span className="font-semibold shrink-0 text-amber-300">💡 {isEn ? 'Fix Recommendation:' : 'راهکار پیشنهادی:'}</span>
                      <span className="leading-relaxed">{diagnosticsResult.recommendationFa}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Success Banner */}
              {diagnosticsResult && diagnosticsResult.success && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {isEn
                        ? `Full 5-layer SSH connectivity confirmed (${diagnosticsResult.latency_ms}ms). Socket, KEX, Authentication, and PTY are completely healthy.`
                        : `ارتباط لایه‌ای به صورت کامل تایید شد (${diagnosticsResult.latency_ms}ms). سوکت شبکه، تبادل کلید، احراز هویت و شل PTY کاملاً سالم و فعال هستند.`}
                    </span>
                  </div>
                  {diagnosticsResult.banner && (
                    <span className="text-[10px] font-mono text-emerald-300/80 truncate max-w-xs px-2 py-0.5 rounded bg-emerald-900/40">
                      {diagnosticsResult.banner}
                    </span>
                  )}
                </div>
              )}

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 mt-2.5 border-b border-slate-800 pb-1">
                <button
                  type="button"
                  onClick={() => setActiveLogTab('flow')}
                  className={`px-3 py-1 rounded-t text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border-b-2 ${
                    activeLogTab === 'flow'
                      ? 'border-amber-500 text-amber-400 bg-slate-800/60'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>{isEn ? '5-Layer Lifecycle Stages' : 'مراحل ۵ گانه اتصال و بررسی لایه‌ای'}</span>
                  {diagnosticsResult?.stages && (
                    <span className="text-[10px] px-1.5 rounded-full bg-slate-800 text-slate-300">
                      {diagnosticsResult.stages.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveLogTab('solution')}
                  className={`px-3 py-1 rounded-t text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border-b-2 ${
                    activeLogTab === 'solution'
                      ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Troubleshooting & Cisco Commands' : 'راهنمای عیب‌یابی و دستورات سوئیچ'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveLogTab('raw')}
                  className={`px-3 py-1 rounded-t text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border-b-2 ${
                    activeLogTab === 'raw'
                      ? 'border-cyan-500 text-cyan-400 bg-slate-800/60'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Real-Time Event Stream' : 'لاگ زنده و خام رویدادها'}</span>
                  {connectionLogs.length > 0 && (
                    <span className="text-[10px] px-1.5 rounded-full bg-slate-800 text-slate-300">
                      {connectionLogs.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab Content 1: 5-Layer Lifecycle Stages */}
              {activeLogTab === 'flow' && (
                <div className="mt-2.5 grid grid-cols-1 md:grid-cols-5 gap-2">
                  {(diagnosticsResult?.stages || [
                    {
                      id: 'tcp_socket',
                      name: 'TCP Socket (Port 22)',
                      nameFa: 'سوکت و دست‌تکانی TCP',
                      status: connectionStatus === 'ready' || connectionStatus === 'authenticated' ? 'success' : connectionStatus === 'connecting' ? 'in_progress' : connectionStatus === 'error' ? 'failed' : 'idle',
                      details: 'TCP 3-way handshake on target port',
                      detailsFa: 'بررسی باز بودن پورت و برقراری ارتباط ترنسپورت لایه ۴'
                    },
                    {
                      id: 'ssh_banner',
                      name: 'SSH Identification',
                      nameFa: 'تبادل نسخه و بنر SSH',
                      status: banner ? 'success' : connectionStatus === 'ready' ? 'success' : 'idle',
                      details: 'Server identification banner exchange',
                      detailsFa: 'دریافت نسخه سرور SSH سیسکو (SSH-2.0-Cisco)'
                    },
                    {
                      id: 'kex_cipher',
                      name: 'Key Exchange & Ciphers',
                      nameFa: 'مذاکره رمزنگاری و KEX',
                      status: connectionStatus === 'ready' || connectionStatus === 'authenticated' ? 'success' : 'idle',
                      details: 'Diffie-Hellman KEX and Cipher agreement',
                      detailsFa: 'توافق بر سر الگوریتم‌های امنیتی و تبادل کلید'
                    },
                    {
                      id: 'auth',
                      name: 'Authentication',
                      nameFa: 'احراز هویت کاربر (AAA)',
                      status: connectionStatus === 'ready' || connectionStatus === 'authenticated' ? 'success' : 'idle',
                      details: 'Credentials verification & privilege level',
                      detailsFa: 'اعتبارسنجی نام کاربری، رمز عبور و سطح دسترسی'
                    },
                    {
                      id: 'pty_exec',
                      name: 'PTY Shell Channel',
                      nameFa: 'تخصیص شل تعاملی PTY',
                      status: connectionStatus === 'ready' ? 'success' : 'idle',
                      details: 'Pseudo-terminal channel ready for CLI commands',
                      detailsFa: 'راه‌اندازی خط فرمان تعاملی و ارسال دستورات'
                    }
                  ]).map((st: any, idx: number) => {
                    const isSuccess = st.status === 'success';
                    const isFailed = st.status === 'failed';
                    const isInProgress = st.status === 'in_progress';

                    return (
                      <div
                        key={st.id || idx}
                        className={`p-2.5 rounded-lg border flex flex-col justify-between transition ${
                          isFailed
                            ? 'bg-rose-950/40 border-rose-600/50 text-rose-200'
                            : isSuccess
                            ? 'bg-slate-950/60 border-emerald-600/30 text-slate-200'
                            : isInProgress
                            ? 'bg-amber-950/30 border-amber-600/40 text-amber-200'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-[11px] flex items-center gap-1">
                              <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-300 font-mono">
                                {idx + 1}
                              </span>
                              <span className={isFailed ? 'text-rose-200' : isSuccess ? 'text-slate-100' : 'text-slate-300'}>
                                {st.nameFa || st.name}
                              </span>
                            </span>

                            {isSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            {isFailed && <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                            {isInProgress && <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />}
                          </div>

                          <div className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                            {st.detailsFa || st.details}
                          </div>

                          {st.latency_ms !== undefined && st.latency_ms > 0 && (
                            <div className="text-[10px] text-emerald-400 font-mono mt-1">
                              {st.latency_ms} ms
                            </div>
                          )}

                          {isFailed && st.rawError && (
                            <div className="mt-1.5 p-1 rounded bg-rose-950/80 border border-rose-800/40 text-rose-200 text-[10px] font-mono break-all">
                              {st.rawError}
                            </div>
                          )}
                        </div>

                        {isFailed && st.errorFixFa && (
                          <div className="mt-2 pt-1 border-t border-rose-900/50 text-[10px] text-amber-300/90 leading-tight">
                            💡 {st.errorFixFa}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab Content 2: Cisco Troubleshooting & Commands */}
              {activeLogTab === 'solution' && (
                <div className="mt-2.5 p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-indigo-400" />
                      <span>{isEn ? 'Cisco IOS Configuration Checklist for SSH' : 'چک‌لیست و فرامین حل مشکل SSH در سوئیچ سیسکو'}</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isEn ? 'Copy & paste directly into Cisco CLI console' : 'فرامین زیر را در خط فرمان کنسول سوئیچ وارد کنید'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                    {/* Block 1: Transport & RSA Key */}
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1.5">
                      <span className="font-semibold text-amber-300 block">
                        ۱. فعال‌سازی SSH و تولید کلید RSA (حل خطای بسته بودن پورت یا کلید)
                      </span>
                      <pre className="p-2 rounded bg-slate-950 text-emerald-300 font-mono text-[10px] leading-relaxed overflow-x-auto select-all border border-slate-800">
{`configure terminal
ip domain-name mynetwork.local
crypto key generate rsa modulus 2048
ip ssh version 2
ip ssh time-out 60
ip ssh authentication-retries 3
end`}
                      </pre>
                    </div>

                    {/* Block 2: VTY Lines & Local Auth */}
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1.5">
                      <span className="font-semibold text-cyan-300 block">
                        ۲. تعریف کاربر و باز کردن پروتکل در خطوط VTY (حل خطای احراز هویت)
                      </span>
                      <pre className="p-2 rounded bg-slate-950 text-cyan-300 font-mono text-[10px] leading-relaxed overflow-x-auto select-all border border-slate-800">
{`configure terminal
username ${username || 'admin'} privilege 15 secret ${password || 'cisco123'}
line vty 0 4
 transport input ssh
 login local
 exit
line vty 5 15
 transport input ssh
 login local
end
write memory`}
                      </pre>
                    </div>

                    {/* Block 3: Interface & IP Reachability */}
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1.5">
                      <span className="font-semibold text-emerald-300 block">
                        ۳. بررسی وضعیت اینترفیس مدیریت و آدرس IP سوئیچ
                      </span>
                      <pre className="p-2 rounded bg-slate-950 text-slate-300 font-mono text-[10px] leading-relaxed overflow-x-auto select-all border border-slate-800">
{`show ip interface brief | include up
show ip ssh
show interfaces status
show run | section line vty`}
                      </pre>
                    </div>

                    {/* Block 4: Local Bridge Mode */}
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1.5">
                      <span className="font-semibold text-indigo-300 block">
                        ۴. در صورتی که سوئیچ در شبکه محلی (LAN) شما قرار دارد
                      </span>
                      <p className="text-slate-400 text-[10px] leading-relaxed">
                        اگر اپلیکیشن در فضای ابری اجرا می‌شود و سوئیچ فیزیکی در شبکه لوکال شماست، اسکریپت رله محلی را اجرا نمایید:
                      </p>
                      <pre className="p-2 rounded bg-slate-950 text-amber-300 font-mono text-[10px] overflow-x-auto select-all border border-slate-800">
{`./run-local-ssh.sh`}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content 3: Raw Event Stream */}
              {activeLogTab === 'raw' && (
                <div className="mt-2.5 p-2 rounded-lg bg-slate-950 border border-slate-800 max-h-56 overflow-y-auto font-mono text-[10px] space-y-1 select-text">
                  {connectionLogs.length === 0 ? (
                    <div className="text-slate-500 py-3 text-center">
                      {isEn ? 'No connection events recorded yet.' : 'هنوز رویدادی ثبت نشده است. روی "تست مجدد اتصال" کلیک کنید.'}
                    </div>
                  ) : (
                    connectionLogs.map((log) => {
                      const badgeColor =
                        log.type === 'error'
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : log.type === 'success'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : log.type === 'warn'
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-slate-900 text-slate-300 border-slate-800';

                      return (
                        <div key={log.id} className="flex items-start gap-2 py-0.5 hover:bg-slate-900/50 px-1 rounded">
                          <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                          <span className={`px-1 py-0.2 rounded text-[9px] uppercase border shrink-0 ${badgeColor}`}>
                            {log.type}
                          </span>
                          {log.stageNameFa && (
                            <span className="text-amber-400/90 shrink-0">[{log.stageNameFa}]:</span>
                          )}
                          <span className={log.type === 'error' ? 'text-rose-300' : log.type === 'success' ? 'text-emerald-300' : 'text-slate-300'}>
                            {log.messageFa || log.message}
                          </span>
                          {log.failureLayer && (
                            <span className="text-rose-400/70 text-[9px]">({log.failureLayer})</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* Credentials / Target Device Settings Drawer */}
          {showCredsDrawer && (
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isEn ? 'Target Appliance SSH Parameters' : 'تنظیمات احراز هویت و ارتباط SSH'}</span>
                </span>
                {saveCredsMessage && (
                  <span className="text-emerald-400 text-[11px] font-medium animate-pulse">{saveCredsMessage}</span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5 font-medium">
                    {isEn ? 'IP Address:' : 'آدرس IP:'}
                  </label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="192.168.1.1"
                    className="w-full px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5 font-medium">
                    {isEn ? 'Port:' : 'پورت:'}
                  </label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5 font-medium">
                    {isEn ? 'Username:' : 'نام کاربری:'}
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                    dir="ltr"
                  />
                </div>

                <div className="relative">
                  <label className="block text-[10px] text-slate-400 mb-0.5 font-medium">
                    {isEn ? 'Password:' : 'رمز عبور:'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-2.5 py-1 pr-7 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-[10px] text-slate-400 mb-0.5 font-medium">
                    {isEn ? 'Enable Secret:' : 'رمز Enable سیسکو:'}
                  </label>
                  <div className="relative">
                    <input
                      type={showEnablePassword ? 'text' : 'password'}
                      value={enablePassword}
                      onChange={(e) => setEnablePassword(e.target.value)}
                      placeholder="cisco"
                      className="w-full px-2.5 py-1 pr-7 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEnablePassword(!showEnablePassword)}
                      className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-200"
                    >
                      {showEnablePassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => connectWs()}
                    disabled={connectionStatus === 'connecting'}
                    className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
                    <span>{isEn ? 'Reconnect with New Credentials' : 'اتصال مجدد با اطلاعات جدید'}</span>
                  </button>

                  {device?.id && (
                    <button
                      type="button"
                      onClick={handleSaveCredentials}
                      disabled={isSavingCreds}
                      className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Save className="w-3 h-3" />
                      <span>{isSavingCreds ? (isEn ? 'Saving...' : 'در حال ذخیره...') : (isEn ? 'Save to Device Record' : 'ذخیره در پرونده دستگاه')}</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTerminalEngine(terminalEngine === 'real_ssh' ? 'simulator' : 'real_ssh');
                    if (terminalEngine === 'real_ssh') {
                      disconnectWs();
                      setTerminalOutput(
                        `\r\n[SIMULATOR] Switched to Cisco IOS Offline Simulation CLI.\r\n${device?.name || 'Switch'}> `
                      );
                    }
                  }}
                  className="px-2.5 py-1 rounded bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-700/40 text-xs transition cursor-pointer flex items-center gap-1"
                >
                  <Cpu className="w-3 h-3" />
                  <span>
                    {terminalEngine === 'real_ssh'
                      ? (isEn ? 'Switch to Offline Simulator Mode' : 'تغییر به حالت شبیه‌ساز آفلاین')
                      : (isEn ? 'Switch to Real SSH Hardware' : 'تغییر به SSH سخت‌افزار واقعی')}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Shortcuts & Pager Toolbar */}
          <div className="flex flex-wrap items-center justify-between px-4 py-1.5 bg-slate-900/80 border-b border-slate-800 text-[11px] gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              <span className="text-slate-400 shrink-0 font-medium">{isEn ? 'Quick Commands:' : 'دستورات سریع:'}</span>
              <button
                type="button"
                onClick={() => sendRawData('terminal length 0\r')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-[10px] border border-cyan-500/30 transition cursor-pointer shrink-0"
                title={isEn ? 'Disable output pagination (terminal length 0)' : 'غیرفعال‌سازی صفحه‌بندی'}
              >
                terminal length 0
              </button>
              <button
                type="button"
                onClick={() => {
                  sendRawData('enable\r');
                  if (enablePassword) {
                    setTimeout(() => sendRawData(enablePassword + '\r'), 500);
                  }
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-[10px] border border-amber-500/30 transition cursor-pointer shrink-0"
                title={isEn ? 'Enter Cisco Privileged EXEC mode' : 'ورود به حالت دسترسی ویژه Enable'}
              >
                enable
              </button>
              <button
                type="button"
                onClick={() => sendRawData('show version\r')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] border border-slate-700 transition cursor-pointer shrink-0"
              >
                show version
              </button>
              <button
                type="button"
                onClick={() => sendRawData('show ip interface brief\r')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] border border-slate-700 transition cursor-pointer shrink-0"
              >
                show ip int br
              </button>
              <button
                type="button"
                onClick={() => sendRawData('show interfaces status\r')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] border border-slate-700 transition cursor-pointer shrink-0"
              >
                show int status
              </button>
              <button
                type="button"
                onClick={() => sendRawData('show vlan brief\r')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] border border-slate-700 transition cursor-pointer shrink-0"
              >
                show vlan br
              </button>
              <button
                type="button"
                onClick={() => sendRawData('show cdp neighbors\r')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] border border-slate-700 transition cursor-pointer shrink-0"
              >
                show cdp nei
              </button>
              <button
                type="button"
                onClick={() => sendRawData('show running-config\r')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] border border-slate-700 transition cursor-pointer shrink-0"
              >
                show run
              </button>
              <button
                type="button"
                onClick={() => sendRawData('write memory\r')}
                className="px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-mono text-[10px] border border-emerald-600/40 transition cursor-pointer shrink-0"
              >
                write mem
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label className="flex items-center gap-1.5 text-slate-400 text-[11px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoDisablePaging}
                  onChange={(e) => setAutoDisablePaging(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-0"
                />
                <span>{isEn ? 'Auto-disable pager' : 'حذف خودکار صفحه‌بندی'}</span>
              </label>
            </div>
          </div>

          {/* Pagination Interactive Helper Banner */}
          {hasPagingPrompt && (
            <div className="px-4 py-1.5 bg-amber-950/80 border-b border-amber-600/40 text-amber-200 text-xs flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold bg-amber-800/60 px-1.5 py-0.5 rounded text-[10px]">
                  -- More --
                </span>
                <span>
                  {isEn
                    ? 'Press [Space] for next page, [Enter] for line, or [Ctrl+C] to abort'
                    : 'کلید [Space] برای صفحه بعد، [Enter] برای خط بعد و [Ctrl+C] برای لغو'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => sendRawData(' ')}
                  className="px-2 py-0.5 rounded bg-amber-800 hover:bg-amber-700 text-amber-100 font-semibold text-[10px] cursor-pointer"
                >
                  {isEn ? 'Next Page (Space)' : 'صفحه بعد (Space)'}
                </button>
                <button
                  type="button"
                  onClick={() => sendRawData('\r')}
                  className="px-2 py-0.5 rounded bg-amber-800 hover:bg-amber-700 text-amber-100 font-semibold text-[10px] cursor-pointer"
                >
                  {isEn ? 'Next Line (Enter)' : 'خط بعد (Enter)'}
                </button>
                <button
                  type="button"
                  onClick={() => sendRawData('terminal length 0\r')}
                  className="px-2 py-0.5 rounded bg-amber-700 hover:bg-amber-600 text-white font-semibold text-[10px] cursor-pointer"
                >
                  {isEn ? 'Stream All' : 'نمایش یکجا'}
                </button>
              </div>
            </div>
          )}

          {/* Main Terminal Screen + Optional Guide Drawer */}
          <div className="flex-1 flex overflow-hidden">
            {/* Terminal View */}
            <div
              className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-100 bg-slate-950 select-text leading-relaxed flex flex-col"
              onClick={() => inputRef.current?.focus()}
              dir="ltr"
            >
              {/* Session Welcome / Banner */}
              <div className="text-slate-500 mb-3 select-none text-[11px] border-b border-slate-900 pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400">
                    NetTopology Enterprise Cisco Hardware Terminal Engine (v1.12.0)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {terminalEngine === 'real_ssh' ? `TCP Port ${port} • Protocol: SSH-2.0` : 'Local Offline Sandbox'}
                  </span>
                </div>
                <div>Target Appliance: {device?.name || host} • Model: {device?.model || 'Cisco Hardware'}</div>
                {banner && <div className="text-cyan-400 mt-1">{banner}</div>}
              </div>

              {/* Render Output Chunks */}
              <div className="whitespace-pre-wrap break-all font-mono flex-1">
                {terminalOutput ? (
                  parseAnsiToSpans(terminalOutput).map((span, idx) => (
                    <span
                      key={idx}
                      className={`${span.color || 'text-slate-200'} ${span.bgColor || ''} ${
                        span.bold ? 'font-bold' : ''
                      } ${span.dim ? 'opacity-70' : ''} ${span.underline ? 'underline' : ''}`}
                    >
                      {span.text}
                    </span>
                  ))
                ) : connectionStatus === 'ready' ? (
                  <span className="text-emerald-400">
                    Terminal ready. Connected directly to {device?.name || host}. Type a command or use shortcuts above...
                  </span>
                ) : connectionStatus === 'connecting' ? (
                  <span className="text-amber-400">Establishing direct SSH connection to {host}:{port}...</span>
                ) : (
                  <span className="text-slate-500">
                    {isEn
                      ? 'Connecting to switch... Click "Connect SSH" or update credentials if needed.'
                      : 'در حال ارتباط با سوییچ... در صورت نیاز اطلاعات احراز هویت را بررسی کنید.'}
                  </span>
                )}
              </div>

              <div ref={terminalEndRef} />
            </div>

            {/* Cisco Command Guide Drawer */}
            {showGuideDrawer && (
              <div
                className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 text-xs"
                dir={isEn ? 'ltr' : 'rtl'}
              >
                <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="font-bold text-white flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span>{isEn ? 'Cisco IOS Command Guide' : 'راهنمای دستورات سیسکو'}</span>
                  </h4>
                  <button
                    onClick={() => setShowGuideDrawer(false)}
                    className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Filter Pills & Search */}
                <div className="p-2.5 border-b border-slate-800 space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={guideSearch}
                      onChange={(e) => setGuideSearch(e.target.value)}
                      placeholder={isEn ? 'Search Cisco commands...' : 'جستجوی دستورات سیسکو...'}
                      className="w-full pl-8 pr-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                      dir="ltr"
                    />
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
                    {(['all', 'show', 'config', 'exec', 'vlan'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setGuideCategory(cat)}
                        className={`px-2 py-0.5 rounded font-medium transition capitalize cursor-pointer ${
                          guideCategory === cat
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Commands List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {filteredGuide.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <code className="text-emerald-400 font-mono text-[11px] font-bold" dir="ltr">
                          {item.cmd}
                        </code>
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-400 uppercase">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">
                        {isEn ? item.descEn : item.descFa}
                      </p>
                      <div className="flex items-center gap-1.5" dir="ltr">
                        <button
                          type="button"
                          onClick={() => handleSendCommand(item.cmd)}
                          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>{isEn ? 'Run Now' : 'اجرا'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentInput(item.cmd);
                            inputRef.current?.focus();
                          }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                        >
                          {isEn ? 'Insert' : 'درج در خط فرمان'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Command Prompt Input Bar */}
          <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shrink-0">
            <div className="text-emerald-400 font-mono text-xs font-bold flex items-center gap-1 select-none">
              <span>{device?.name || host || 'Switch'}</span>
              <span className="text-slate-400">&gt;</span>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                terminalEngine === 'real_ssh' && connectionStatus !== 'ready'
                  ? isEn
                    ? 'Connecting to hardware...'
                    : 'در حال اتصال به سوئیچ...'
                  : isEn
                  ? 'Enter Cisco command (e.g. show version, show run)...'
                  : 'دستور سیسکو را وارد کنید (مثلاً show version یا show run)...'
              }
              className="flex-1 bg-transparent text-slate-100 font-mono text-xs focus:outline-none placeholder-slate-600"
              dir="ltr"
              autoComplete="off"
              spellCheck={false}
            />

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSendCommand()}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>{isEn ? 'Send' : 'ارسال'}</span>
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dangerous Command Safety Modal Interceptor */}
      <DangerousCommandModal
        isOpen={!!pendingDangerousCmd}
        command={pendingDangerousCmd || ''}
        targetHost={host}
        reason={dangerousReason}
        onConfirm={handleConfirmDangerous}
        onCancel={handleCancelDangerous}
      />
    </>
  );
};
