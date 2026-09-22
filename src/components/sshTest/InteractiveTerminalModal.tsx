import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Terminal,
  Maximize2,
  Minimize2,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Power,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  CornerDownLeft,
  Sliders,
  ShieldCheck
} from 'lucide-react';
import { useLanguage } from '../../i18n';
import { SshTestDevice } from '../../types/sshTest';
import { createSessionToken } from '../../services/sshTestApi';
import { parseAnsiToSpans } from '../../utils/ansi';

interface InteractiveTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: SshTestDevice | null;
}

export const InteractiveTerminalModal: React.FC<InteractiveTerminalModalProps> = ({
  isOpen,
  onClose,
  device
}) => {
  const { isRtl } = useLanguage();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'authorizing' | 'connecting' | 'connected' | 'disconnected' | 'error'>('authorizing');
  const [statusMessage, setStatusMessage] = useState<string>('Initializing...');
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [copied, setCopied] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const connectWebSocket = async () => {
    if (!device) return;

    // Reset state
    setTerminalLines([]);
    setConnectionStatus('authorizing');
    setStatusMessage(isRtl ? 'در حال دریافت توکن امنیتی موقت...' : 'Requesting ephemeral session token...');

    try {
      const token = await createSessionToken(device.id);

      setStatusMessage(isRtl ? 'اتصال به درگاه وب‌سوکت پایتون...' : 'Connecting to Python WebSocket tunnel...');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/ssh-test?token=${encodeURIComponent(token)}&cols=120&rows=32`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connecting');
        setStatusMessage(isRtl ? 'نشست وب‌سوکت برقرار شد. در حال استارت موتور Paramiko 2...' : 'WebSocket connected. Initializing Paramiko 2 engine...');
      };

      ws.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          if (packet.type === 'data') {
            const incoming = packet.data as string;
            setTerminalLines((prev) => {
              const chunks = incoming.split('\n');
              if (chunks.length === 1) {
                if (prev.length === 0) return [incoming];
                const last = prev[prev.length - 1];
                return [...prev.slice(0, -1), last + incoming];
              }
              const result = [...prev];
              if (result.length > 0) {
                result[result.length - 1] += chunks[0];
              } else {
                result.push(chunks[0]);
              }
              for (let i = 1; i < chunks.length; i++) {
                result.push(chunks[i]);
              }
              return result.slice(-1000); // keep last 1000 lines
            });
          } else if (packet.type === 'status') {
            if (packet.status === 'ready') {
              setConnectionStatus('connected');
              setStatusMessage(packet.message || 'Connected to device');
            } else if (packet.status === 'closed' || packet.status === 'disconnected') {
              setConnectionStatus('disconnected');
              setStatusMessage(packet.message || 'Session closed');
            } else {
              setStatusMessage(packet.message || packet.status);
            }
          } else if (packet.type === 'error') {
            setConnectionStatus('error');
            setStatusMessage(packet.message || 'Connection error');
          }
        } catch {
          // Plain text fallback
          setTerminalLines((prev) => [...prev, event.data]);
        }
      };

      ws.onerror = () => {
        setConnectionStatus('error');
        setStatusMessage(isRtl ? 'خطای ارتباط سوکت با سرور' : 'WebSocket connection error');
      };

      ws.onclose = () => {
        setConnectionStatus((prev) => (prev === 'connected' ? 'disconnected' : prev));
      };

    } catch (err: any) {
      setConnectionStatus('error');
      setStatusMessage(err.message || (isRtl ? 'خطا در ایجاد نشست' : 'Failed to create session'));
    }
  };

  useEffect(() => {
    if (isOpen && device) {
      connectWebSocket();
    } else {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isOpen, device?.id]);

  // Auto-scroll to bottom of terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  // Auto-focus input when terminal connects
  useEffect(() => {
    if (connectionStatus === 'connected') {
      inputRef.current?.focus();
    }
  }, [connectionStatus]);

  if (!isOpen || !device) return null;

  const handleSendInput = (text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'input', data: text }));
  };

  const handleSubmitCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInput && currentInput !== '') return;
    handleSendInput(currentInput + '\n');
    setInputHistory((prev) => [...prev, currentInput]);
    setHistoryIndex(-1);
    setCurrentInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (inputHistory.length > 0) {
        const nextIdx = historyIndex === -1 ? inputHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setCurrentInput(inputHistory[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const nextIdx = historyIndex + 1;
        if (nextIdx >= inputHistory.length) {
          setHistoryIndex(-1);
          setCurrentInput('');
        } else {
          setHistoryIndex(nextIdx);
          setCurrentInput(inputHistory[nextIdx]);
        }
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      // Send SIGINT / Ctrl+C (\x03)
      e.preventDefault();
      handleSendInput('\x03');
    } else if (e.key === 'd' && e.ctrlKey) {
      // Send EOF / Ctrl+D (\x04)
      e.preventDefault();
      handleSendInput('\x04');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleSendInput('\t');
    }
  };

  const handleCopyLogs = () => {
    const raw = terminalLines.join('\n');
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setTerminalLines([]);
  };

  const quickCommands = [
    { label: 'uname -a', cmd: 'uname -a\n' },
    { label: 'uptime', cmd: 'uptime\n' },
    { label: 'ip addr', cmd: 'ip -brief addr || ip addr\n' },
    { label: 'free -m', cmd: 'free -m\n' },
    { label: 'df -h', cmd: 'df -h /\n' },
    { label: 'show version', cmd: 'show version\n' },
    { label: 'exit', cmd: 'exit\n' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 modal-backdrop-blur" data-modal-backdrop="true">
      <div className={`relative bg-slate-950 border border-emerald-500/40 rounded-2xl shadow-2xl shadow-emerald-950/50 text-slate-100 overflow-hidden flex flex-col transition-all duration-200 ${
        isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[88vh]'
      }`}>
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white font-mono">{device.username}@{device.host}:{device.port}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : connectionStatus === 'connecting' || connectionStatus === 'authorizing'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                  }`} />
                  <span>{connectionStatus}</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono hidden sm:inline">
                  Paramiko 2
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-md">
                {statusMessage}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyLogs}
              title={isRtl ? 'کپی لاگ ترمینال' : 'Copy terminal text'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleClear}
              title={isRtl ? 'پاک کردن صفحه' : 'Clear screen'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={connectWebSocket}
              title={isRtl ? 'اتصال مجدد' : 'Reconnect'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Restore' : 'Fullscreen'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-rose-500/20 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Commands Toolbar */}
        <div className="px-4 py-1.5 bg-slate-900/60 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto shrink-0">
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider shrink-0 mr-1">
            {isRtl ? 'دستورات سریع:' : 'Quick Cmds:'}
          </span>
          {quickCommands.map((q) => (
            <button
              key={q.label}
              disabled={connectionStatus !== 'connected'}
              onClick={() => handleSendInput(q.cmd)}
              className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800/80 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-slate-700/60 hover:border-emerald-500/30 transition-colors disabled:opacity-40 shrink-0"
            >
              {q.label}
            </button>
          ))}
          <button
            disabled={connectionStatus !== 'connected'}
            onClick={() => handleSendInput('\x03')}
            className="px-2 py-0.5 rounded text-[11px] font-mono bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors disabled:opacity-40 shrink-0 ml-auto"
          >
            Ctrl+C (SIGINT)
          </button>
        </div>

        {/* Terminal Screen Output */}
        <div
          onClick={() => inputRef.current?.focus()}
          className="flex-1 bg-black/90 p-4 font-mono text-xs overflow-y-auto leading-relaxed cursor-text select-text"
        >
          {terminalLines.length === 0 && (
            <div className="text-slate-500 italic py-4">
              {connectionStatus === 'connected'
                ? 'Terminal session open. Type a command or press Enter...'
                : statusMessage}
            </div>
          )}

          {terminalLines.map((line, idx) => {
            const spans = parseAnsiToSpans(line);
            return (
              <div key={idx} className="whitespace-pre-wrap break-all min-h-[1.25rem]">
                {spans.map((span, sIdx) => (
                  <span
                    key={sIdx}
                    className={`${span.color || 'text-slate-200'} ${span.bgColor || ''} ${
                      span.bold ? 'font-bold' : ''
                    } ${span.dim ? 'opacity-60' : ''}`}
                  >
                    {span.text}
                  </span>
                ))}
              </div>
            );
          })}
          <div ref={terminalEndRef} />
        </div>

        {/* Interactive CLI Input Bar */}
        <form
          onSubmit={handleSubmitCommand}
          className="p-3 bg-slate-900 border-t border-white/10 flex items-center gap-2 shrink-0"
        >
          <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-xs shrink-0 select-none pl-1">
            <span>$</span>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={connectionStatus !== 'connected'}
            placeholder={
              connectionStatus === 'connected'
                ? (isRtl ? 'دستور را تایپ کنید و Enter بزنید (کلیدهای جهت‌نما برای تاریخچه دستورات)...' : 'Type command and hit Enter (Up/Down for history)...')
                : (isRtl ? 'در انتظار برقراری اتصال ترمینال...' : 'Waiting for connection...')
            }
            className="flex-1 bg-transparent text-emerald-300 font-mono text-xs focus:outline-none placeholder-slate-600 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={connectionStatus !== 'connected' || !currentInput}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1 transition-colors disabled:opacity-30 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isRtl ? 'ارسال' : 'Send'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
