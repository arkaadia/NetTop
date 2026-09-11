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
  ShieldCheck
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { parseAnsiToSpans } from '../utils/ansi';
import { DangerousCommandModal } from './DangerousCommandModal';

interface RealSshTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  device?: {
    name?: string;
    ip?: string;
    ssh_port?: number;
    ssh_username?: string;
    ssh_password?: string;
    enable_password?: string;
    model?: string;
  } | null;
  initialHost?: string;
  initialPort?: number;
  initialUsername?: string;
  initialPassword?: string;
  initialEnablePassword?: string;
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

export const RealSshTerminalModal: React.FC<RealSshTerminalModalProps> = ({
  isOpen,
  onClose,
  device,
  initialHost,
  initialPort,
  initialUsername,
  initialPassword,
  initialEnablePassword,
}) => {
  const { isEn } = useLanguage();

  // Connection Parameters
  const [host, setHost] = useState('');
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [enablePassword, setEnablePassword] = useState('');

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

  // Dangerous Command Modal
  const [pendingDangerousCmd, setPendingDangerousCmd] = useState<string | null>(null);
  const [dangerousReason, setDangerousReason] = useState<string>('');

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    } else {
      disconnectWs();
    }
  }, [isOpen, device, initialHost, initialPort, initialUsername, initialPassword, initialEnablePassword]);

  // Scroll to bottom when output changes
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalOutput]);

  // Focus input automatically
  useEffect(() => {
    if (connectionStatus === 'ready') {
      inputRef.current?.focus();
    }
  }, [connectionStatus]);

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
  const connectWs = () => {
    if (!host.trim() || !username.trim()) {
      setStatusMessage(isEn ? 'Host and username are required' : 'آدرس هاست و نام کاربری الزامی است');
      return;
    }

    disconnectWs();
    setConnectionStatus('connecting');
    setStatusMessage(isEn ? `Connecting to ${username}@${host}:${port}...` : `در حال برقراری اتصال به ${username}@${host}:${port}...`);
    setTerminalOutput('');

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
            host: host.trim(),
            port: Number(port) || 22,
            username: username.trim(),
            password: password,
            enablePassword: enablePassword,
            termCols: 100,
            termRows: 32,
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
              setStatusMessage(isEn ? 'Interactive SSH Session Active' : 'اتصال ترمینال تعاملی فعال شد');
              // Automatically disable pagination if toggled
              if (autoDisablePaging) {
                setTimeout(() => {
                  sendRawData('terminal length 0\r');
                }, 400);
              }
            } else if (msg.status === 'authenticated') {
              setConnectionStatus('authenticated');
              setStatusMessage(isEn ? 'Authenticated! Opening PTY...' : 'احراز هویت تایید شد! در حال بازگشایی ترمینال...');
            } else if (msg.status === 'closed' || msg.status === 'disconnected') {
              setConnectionStatus('disconnected');
              setStatusMessage(msg.message || (isEn ? 'Connection closed' : 'ارتباط قطع شد'));
            }
          } else if (msg.type === 'banner') {
            setBanner(msg.banner);
          } else if (msg.type === 'error') {
            setConnectionStatus('error');
            setStatusMessage(msg.message || (isEn ? 'SSH connection error' : 'خطای اتصال SSH'));
            setTerminalOutput((prev) => `${prev}\n\r[ERROR] ${msg.message}\n\r`);
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

  // Send raw data to remote device
  const sendRawData = (data: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'data', data }));
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
    // Send Ctrl+C to cancel any half-typed buffer on switch
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
      // Cisco TAB completion
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

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 modal-backdrop-blur"
        data-modal-backdrop="true"
        dir={isEn ? 'ltr' : 'rtl'}
      >
        <div
          className={`bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
            isFullscreen ? 'w-full h-full rounded-none m-0' : 'w-full max-w-5xl h-[88vh]'
          }`}
        >
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 text-slate-200 shrink-0 gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <TerminalIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white font-mono flex items-center gap-1.5">
                    <span>{device?.name || host || 'Real SSH Session'}</span>
                    <span className="text-[11px] font-normal text-slate-400">
                      ({username}@{host}:{port})
                    </span>
                  </h3>
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
                        <span>{isEn ? 'LIVE SSH' : 'متصل بلادرنگ'}</span>
                      </>
                    ) : connectionStatus === 'connecting' || connectionStatus === 'authenticated' ? (
                      <>
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        <span>{isEn ? 'CONNECTING...' : 'در حال اتصال...'}</span>
                      </>
                    ) : connectionStatus === 'error' ? (
                      <>
                        <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
                        <span>{isEn ? 'ERROR' : 'خطا'}</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-2.5 h-2.5 text-slate-400" />
                        <span>{isEn ? 'OFFLINE' : 'قطع ارتباط'}</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-md">
                  {statusMessage || (isEn ? 'Direct TCP/SSH Port 22 Stream' : 'جریان مستقیم سوکت پورت ۲۲')}
                </p>
              </div>
            </div>

            {/* Quick Actions & Modal Controls */}
            <div className="flex items-center gap-1.5">
              {connectionStatus === 'ready' ? (
                <button
                  onClick={disconnectWs}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-medium border border-rose-500/30 transition cursor-pointer"
                >
                  {isEn ? 'Disconnect' : 'قطع اتصال'}
                </button>
              ) : (
                <button
                  onClick={connectWs}
                  disabled={connectionStatus === 'connecting'}
                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isEn ? 'Connect SSH' : 'اتصال به SSH'}</span>
                </button>
              )}

              <button
                onClick={() => setTerminalOutput('')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                title={isEn ? 'Clear Terminal' : 'پاک‌کردن ترمینال'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleDownloadLog}
                disabled={!terminalOutput}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer disabled:opacity-40"
                title={isEn ? 'Download Session Log' : 'دانلود گزارش سشن'}
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

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                title={isEn ? 'Close' : 'بستن'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Connection Settings Toolbar (When not connected or toggled) */}
          {connectionStatus !== 'ready' && (
            <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-medium">
                  {isEn ? 'Host IP:' : 'آدرس IP:'}
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

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-medium">
                  {isEn ? 'Password:' : 'رمز عبور:'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-medium">
                  {isEn ? 'Enable Secret:' : 'رمز Enable (سیسکو):'}
                </label>
                <input
                  type="password"
                  value={enablePassword}
                  onChange={(e) => setEnablePassword(e.target.value)}
                  placeholder="cisco"
                  className="w-full px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                  dir="ltr"
                />
              </div>
            </div>
          )}

          {/* Quick Shortcuts & Pager Toolbar */}
          <div className="flex flex-wrap items-center justify-between px-4 py-1.5 bg-slate-900/60 border-b border-slate-800 text-[11px] gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              <span className="text-slate-400 shrink-0 font-medium">{isEn ? 'Quick Commands:' : 'دستورات سریع:'}</span>
              <button
                type="button"
                onClick={() => sendRawData('terminal length 0\r')}
                disabled={connectionStatus !== 'ready'}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-[10px] border border-cyan-500/30 transition cursor-pointer disabled:opacity-40 shrink-0"
                title={isEn ? 'Disable output pagination (terminal length 0)' : 'غیرفعال‌سازی صفحه‌بندی'}
              >
                terminal length 0
              </button>
              {enablePassword && (
                <button
                  type="button"
                  onClick={() => {
                    sendRawData('enable\r');
                    setTimeout(() => sendRawData(enablePassword + '\r'), 500);
                  }}
                  disabled={connectionStatus !== 'ready'}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-[10px] border border-amber-500/30 transition cursor-pointer disabled:opacity-40 shrink-0"
                  title={isEn ? 'Enter Cisco Privileged EXEC mode' : 'ورود به حالت دسترسی ویژه Enable'}
                >
                  enable
                </button>
              )}
              <button
                type="button"
                onClick={() => sendRawData('show version\r')}
                disabled={connectionStatus !== 'ready'}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] border border-slate-700 transition cursor-pointer disabled:opacity-40 shrink-0"
              >
                show version
              </button>
              <button
                type="button"
                onClick={() => sendRawData('show ip interface brief\r')}
                disabled={connectionStatus !== 'ready'}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] border border-slate-700 transition cursor-pointer disabled:opacity-40 shrink-0"
              >
                show ip int br
              </button>
              <button
                type="button"
                onClick={() => sendRawData('show cdp neighbors\r')}
                disabled={connectionStatus !== 'ready'}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] border border-slate-700 transition cursor-pointer disabled:opacity-40 shrink-0"
              >
                show cdp nei
              </button>
              <button
                type="button"
                onClick={() => sendRawData('show running-config\r')}
                disabled={connectionStatus !== 'ready'}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] border border-slate-700 transition cursor-pointer disabled:opacity-40 shrink-0"
              >
                show run
              </button>
              <button
                type="button"
                onClick={() => sendRawData('write memory\r')}
                disabled={connectionStatus !== 'ready'}
                className="px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-mono text-[10px] border border-emerald-600/40 transition cursor-pointer disabled:opacity-40 shrink-0"
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
                  onClick={() => sendRawData('terminal length 0\r')}
                  className="px-2 py-0.5 rounded bg-amber-700 hover:bg-amber-600 text-white font-semibold text-[10px] cursor-pointer"
                >
                  {isEn ? 'Stream All' : 'نمایش یکجا'}
                </button>
              </div>
            </div>
          )}

          {/* Main Terminal Screen */}
          <div
            className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-100 bg-slate-950 select-text leading-relaxed"
            onClick={() => inputRef.current?.focus()}
            dir="ltr"
          >
            {/* Session Welcome / Banner */}
            <div className="text-slate-500 mb-3 select-none text-[11px] border-b border-slate-900 pb-2">
              <div>NetTopology Enterprise Real SSH Terminal Engine (v1.11.0)</div>
              <div>Connected via TCP Port 22 • Protocol: SSH-2.0 • Encryption: AES/CTR/GCM</div>
              {banner && <div className="text-cyan-400 mt-1">{banner}</div>}
            </div>

            {/* Render Output Chunks */}
            <div className="whitespace-pre-wrap break-all font-mono">
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
                <span className="text-emerald-400">Terminal ready. Type a command or use shortcuts above...</span>
              ) : (
                <span className="text-slate-500">
                  {isEn
                    ? 'Click "Connect SSH" to establish an interactive session with the network appliance.'
                    : 'برای برقراری ارتباط واقعی با سوییچ یا روتر، روی دکمه "اتصال به SSH" کلیک کنید.'}
                </span>
              )}
            </div>

            <div ref={terminalEndRef} />
          </div>

          {/* Command Prompt Input Bar */}
          <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shrink-0">
            <div className="text-emerald-400 font-mono text-xs font-bold flex items-center gap-1 select-none">
              <span>{host || 'device'}</span>
              <span className="text-slate-400">&gt;</span>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={connectionStatus !== 'ready'}
              placeholder={
                connectionStatus === 'ready'
                  ? isEn
                    ? 'Enter Cisco command (e.g. show version)...'
                    : 'دستور شبکه را وارد کنید (مثلاً: show version)...'
                  : isEn
                  ? 'Connect to device to start typing...'
                  : 'ابتدا به تجهیز متصل شوید...'
              }
              className="flex-1 bg-transparent text-slate-100 font-mono text-xs focus:outline-none disabled:opacity-50 placeholder-slate-600"
              dir="ltr"
              autoComplete="off"
              spellCheck={false}
            />

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSendCommand()}
                disabled={connectionStatus !== 'ready'}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
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
