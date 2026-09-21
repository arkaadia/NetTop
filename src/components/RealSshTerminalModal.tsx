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
  EyeOff
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { WorkflowTriggerBadge } from './WorkflowTriggerBadge';
import { parseAnsiToSpans } from '../utils/ansi';
import { DangerousCommandModal } from './DangerousCommandModal';
import { updateDevice, fetchDevicePorts, fetchVlans } from '../services/api';
import { Device, SwitchPort, VlanInfo } from '../types';

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

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/ssh`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
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
            } else if (msg.status === 'closed' || msg.status === 'disconnected') {
              setConnectionStatus('disconnected');
              setStatusMessage(msg.message || (isEn ? 'Connection closed' : 'ارتباط قطع شد'));
            }
          } else if (msg.type === 'banner') {
            setBanner(msg.banner);
          } else if (msg.type === 'error') {
            setConnectionStatus('error');
            setStatusMessage(msg.message || (isEn ? 'SSH connection error' : 'خطای اتصال SSH'));
            setTerminalOutput(
              (prev) =>
                `${prev}\r\n\x1b[31m[SSH ERROR] ${msg.message}\x1b[0m\r\n\x1b[33mHint: Verify device reachability or check credentials. If on local network, run './run-local-ssh.sh'. You can also switch to Simulator Mode.\x1b[0m\r\n`
            );
            setShowCredsDrawer(true);
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
      };
    } catch (e: any) {
      setConnectionStatus('error');
      setStatusMessage(e.message);
    }
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
