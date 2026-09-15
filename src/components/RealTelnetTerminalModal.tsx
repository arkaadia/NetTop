import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  X,
  Send,
  Maximize2,
  Minimize2,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wifi,
  WifiOff,
  CornerDownLeft,
  Settings2,
  RefreshCw,
  Sliders,
  Play
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { parseAnsiToSpans } from '../utils/ansi';

interface RealTelnetTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialHost?: string;
  initialPort?: number;
  deviceName?: string;
}

const TELNET_QUICK_COMMANDS = [
  { cmd: 'terminal length 0', label: 'term len 0', desc: 'Disable CLI paging' },
  { cmd: 'enable', label: 'enable', desc: 'Enter Privileged EXEC mode' },
  { cmd: 'show version', label: 'show ver', desc: 'IOS version & hardware' },
  { cmd: 'show ip interface brief', label: 'show ip int brief', desc: 'Interface IP and status' },
  { cmd: 'show running-config', label: 'show run', desc: 'Active running configuration' },
  { cmd: 'exit', label: 'exit', desc: 'Exit session / logout' },
];

export const RealTelnetTerminalModal: React.FC<RealTelnetTerminalModalProps> = ({
  isOpen,
  onClose,
  initialHost = '192.168.1.1',
  initialPort = 23,
  deviceName = 'Network Device',
}) => {
  const { isEn } = useLanguage();

  const [host, setHost] = useState(initialHost);
  const [port, setPort] = useState(initialPort);
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [currentInput, setCurrentInput] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [connectionStatus, setConnectionStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'error'
  >('disconnected');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize parameters when modal opens
  useEffect(() => {
    if (isOpen) {
      const targetHost = initialHost || '192.168.1.1';
      const targetPort = initialPort || 23;

      setHost(targetHost);
      setPort(targetPort);
      setTerminalOutput('');
      setConnectionStatus('disconnected');
      setStatusMessage('');
      setShowConfigDrawer(false);

      const connectTimer = setTimeout(() => {
        connectTelnet(targetHost, targetPort);
      }, 150);

      return () => clearTimeout(connectTimer);
    } else {
      disconnectTelnet();
    }
  }, [isOpen, initialHost, initialPort]);

  // Scroll to bottom when output changes
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalOutput]);

  // Focus input automatically
  useEffect(() => {
    if (connectionStatus === 'connected') {
      inputRef.current?.focus();
    }
  }, [connectionStatus]);

  const disconnectTelnet = () => {
    if (wsRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'disconnect' }));
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    setConnectionStatus('disconnected');
  };

  const connectTelnet = (overrideHost?: string, overridePort?: number) => {
    const targetHost = (overrideHost !== undefined ? overrideHost : host).trim();
    const targetPort = Number(overridePort !== undefined ? overridePort : port) || 23;

    if (!targetHost) {
      setStatusMessage(isEn ? 'Host IP is required' : 'آدرس IP تجهیز الزامی است');
      setShowConfigDrawer(true);
      return;
    }

    disconnectTelnet();
    setConnectionStatus('connecting');
    setStatusMessage(
      isEn
        ? `Connecting to Telnet ${targetHost}:${targetPort}...`
        : `در حال برقراری اتصال تلنت به ${targetHost}:${targetPort}...`
    );
    setTerminalOutput(
      `\r\n[Telnet] Connecting to raw Telnet TCP socket at ${targetHost}:${targetPort}...\r\n`
    );

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/telnet`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'connect',
            host: targetHost,
            port: targetPort,
            termCols: 110,
            termRows: 34,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'data') {
            setTerminalOutput((prev) => prev + msg.data);
          } else if (msg.type === 'status') {
            if (msg.status === 'ready') {
              setConnectionStatus('connected');
              setStatusMessage(
                isEn
                  ? `Telnet Connected: ${targetHost}:${targetPort}`
                  : `اتصال تلنت برقرار شد: ${targetHost}:${targetPort}`
              );
              setTerminalOutput((prev) => prev + `\r\n[Telnet] Connected to ${targetHost}:${targetPort}\r\n`);
            } else if (msg.status === 'closed' || msg.status === 'disconnected') {
              setConnectionStatus('disconnected');
              setStatusMessage(msg.message || (isEn ? 'Telnet session closed.' : 'ارتباط تلنت بسته شد.'));
              setTerminalOutput((prev) => prev + `\r\n[Telnet] ${msg.message || 'Session closed.'}\r\n`);
            }
          } else if (msg.type === 'error') {
            setConnectionStatus('error');
            setStatusMessage(msg.message || (isEn ? 'Connection error' : 'خطای اتصال'));
            setTerminalOutput((prev) => prev + `\r\n[Telnet Error] ${msg.message}\r\n`);
          }
        } catch (e) {
          console.error('[Telnet WS] Error parsing incoming message:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('[Telnet WS] WebSocket connection error:', err);
        setConnectionStatus('error');
        setStatusMessage(isEn ? 'WebSocket gateway connection error' : 'خطای ارتباط با گیت‌وی تلنت سرور');
      };

      ws.onclose = () => {
        setConnectionStatus((prev) => (prev === 'connected' ? 'disconnected' : prev));
      };
    } catch (err: any) {
      setConnectionStatus('error');
      setStatusMessage(err.message || 'Failed to start Telnet connection');
    }
  };

  const sendRawData = (data: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'data', data }));
    }
  };

  const handleSendCommand = (cmdText?: string) => {
    const textToSend = cmdText !== undefined ? cmdText : currentInput;
    if (!textToSend.trim() && cmdText === undefined) {
      // Just sending an Enter/Return key
      sendRawData('\r\n');
      return;
    }

    sendRawData(textToSend + '\r\n');

    if (textToSend.trim()) {
      setHistory((prev) => [...prev, textToSend]);
      setHistoryIndex(-1);
    }
    setCurrentInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setCurrentInput(history[nextIdx] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const nextIdx = historyIndex + 1;
        if (nextIdx < history.length) {
          setHistoryIndex(nextIdx);
          setCurrentInput(history[nextIdx] || '');
        } else {
          setHistoryIndex(-1);
          setCurrentInput('');
        }
      }
    }
  };

  const handleExportSession = () => {
    const blob = new Blob([terminalOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `telnet_session_${host.replace(/\./g, '_')}_${Date.now()}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div
      id="real-telnet-terminal-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md modal-backdrop-blur"
      data-modal-backdrop="true"
    >
      <div
        className={`w-full bg-slate-950 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'fixed inset-2 h-[calc(100vh-16px)] z-50' : 'max-w-5xl h-[88vh] max-h-[850px]'
        }`}
      >
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 select-none">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
            </div>

            <div className="flex items-center gap-2">
              <TerminalIcon className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-xs sm:text-sm tracking-wide text-amber-400">
                {isEn ? 'Telnet CLI Terminal' : 'ترمینال تلنت واقعی (Telnet CLI)'}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Port {port}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-700/80 text-xs text-slate-300">
              <span className="text-slate-400 font-mono">{host}</span>
              {deviceName && <span className="text-slate-500 text-[11px]">({deviceName})</span>}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Status indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-mono border ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
                  : connectionStatus === 'error'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {connectionStatus === 'connected' && <Wifi className="w-3 h-3 text-emerald-400" />}
              {connectionStatus === 'connecting' && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
              {connectionStatus === 'disconnected' && <WifiOff className="w-3 h-3 text-slate-400" />}
              {connectionStatus === 'error' && <AlertCircle className="w-3 h-3 text-rose-400" />}
              <span className="capitalize">{connectionStatus}</span>
            </div>

            {/* Quick Reconnect button */}
            <button
              type="button"
              onClick={() => connectTelnet()}
              disabled={connectionStatus === 'connecting'}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition cursor-pointer disabled:opacity-50"
              title={isEn ? 'Reconnect Telnet' : 'اتصال مجدد تلنت'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
            </button>

            {/* Config drawer toggle */}
            <button
              type="button"
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                showConfigDrawer ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={isEn ? 'Connection Settings' : 'تنظیمات هاست و پورت'}
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            {/* Clear Screen */}
            <button
              type="button"
              onClick={() => setTerminalOutput('')}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition cursor-pointer"
              title={isEn ? 'Clear Terminal' : 'پاک کردن صفحه'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Export Log */}
            <button
              type="button"
              onClick={handleExportSession}
              disabled={!terminalOutput}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition cursor-pointer disabled:opacity-40"
              title={isEn ? 'Download Session Log' : 'ذخیره لاگ نشست'}
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition cursor-pointer"
              title={isFullscreen ? (isEn ? 'Exit Fullscreen' : 'خروج از تمام‌صفحه') : (isEn ? 'Fullscreen' : 'تمام‌صفحه')}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 transition cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Config Drawer (Target Host & Port Edit) */}
        {showConfigDrawer && (
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">{isEn ? 'Host IP:' : 'آدرس آی‌پی:'}</span>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="192.168.1.1"
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs w-36 focus:outline-none focus:border-amber-500"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">{isEn ? 'Telnet Port:' : 'پورت تلنت:'}</span>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  placeholder="23"
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs w-20 focus:outline-none focus:border-amber-500"
                  dir="ltr"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  connectTelnet(host, port);
                  setShowConfigDrawer(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold transition cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{isEn ? 'Connect Now' : 'برقراری اتصال'}</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400">
              {isEn
                ? 'Standard Telnet port is 23. You can connect to console servers, routers, or custom ports.'
                : 'پورت پیش‌فرض تلنت ۲۳ است. می‌توانید به هر پورت یا سرور کنسول دلخواهی وصل شوید.'}
            </div>
          </div>
        )}

        {/* Quick Commands Bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 border-b border-slate-800/80 overflow-x-auto text-xs scrollbar-thin">
          <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-1">
            {isEn ? 'Quick Commands:' : 'دستورات سریع:'}
          </span>
          {TELNET_QUICK_COMMANDS.map((item) => (
            <button
              key={item.cmd}
              type="button"
              onClick={() => handleSendCommand(item.cmd)}
              disabled={connectionStatus !== 'connected'}
              title={item.desc}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300 font-mono text-[11px] hover:border-amber-500/50 transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40"
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleSendCommand('')}
            disabled={connectionStatus !== 'connected'}
            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono text-[11px] hover:text-white transition cursor-pointer shrink-0 disabled:opacity-40"
            title="Send CR/LF (Return)"
          >
            [Enter ↵]
          </button>
        </div>

        {/* Terminal Screen View */}
        <div
          onClick={() => inputRef.current?.focus()}
          className="flex-1 p-4 bg-slate-950 overflow-y-auto font-mono text-xs leading-relaxed select-text cursor-text relative"
        >
          {terminalOutput ? (
            <pre className="whitespace-pre-wrap break-all text-slate-200 selection:bg-amber-500/40">
              {parseAnsiToSpans(terminalOutput).map((span, idx) => (
                <span
                  key={idx}
                  className={`${span.color || 'text-slate-200'} ${span.bgColor || ''} ${
                    span.bold ? 'font-bold' : ''
                  } ${span.underline ? 'underline' : ''}`}
                >
                  {span.text}
                </span>
              ))}
            </pre>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2 select-none">
              <TerminalIcon className="w-10 h-10 text-slate-700 animate-pulse" />
              <div className="text-sm font-semibold text-slate-400">
                {isEn ? 'Telnet session ready' : 'نشست خط فرمان تلنت آماده ارتباط'}
              </div>
              <p className="text-xs text-slate-600 max-w-sm">
                {isEn
                  ? `Establishing raw TCP socket to ${host}:${port}. Data from the physical device will display here in real time.`
                  : `در حال برقراری ارتباط سوکت TCP با ${host}:${port}. داده‌های دریافتی از تجهیز فیزیکی در اینجا نمایش داده خواهند شد.`}
              </p>
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Status Notification strip if message exists */}
        {statusMessage && (
          <div className="px-4 py-1.5 bg-slate-900/60 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span className="truncate">{statusMessage}</span>
            <span className="text-slate-600 shrink-0 ml-2">RFC 854 Raw Telnet Socket</span>
          </div>
        )}

        {/* Interactive CLI Input Line */}
        <div className="p-3 bg-slate-900 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendCommand();
            }}
            className="flex items-center gap-2"
          >
            <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold text-xs select-none pl-1">
              <span>{host}</span>
              <span className="text-slate-500">:</span>
              <span className="text-amber-500 font-mono">{port}</span>
              <span className="text-emerald-400 ml-1">&gt;</span>
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
                  ? (isEn ? 'Type Telnet command or password and press Enter...' : 'دستور یا کلمه عبور را تایپ کنید و Enter بزنید...')
                  : (isEn ? 'Waiting for Telnet connection...' : 'در انتظار برقراری اتصال تلنت...')
              }
              className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500 disabled:opacity-50 placeholder:text-slate-600"
              dir="ltr"
              autoFocus
            />

            <button
              type="submit"
              disabled={connectionStatus !== 'connected'}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-40"
            >
              <span>{isEn ? 'Send' : 'ارسال'}</span>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
