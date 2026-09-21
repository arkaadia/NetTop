import React, { useEffect, useRef, useState, useCallback } from 'react';
import Guacamole from 'guacamole-common-js';
import {
  Monitor,
  Maximize2,
  Minimize2,
  Power,
  Clipboard,
  RefreshCw,
  Clock,
  Shield,
  AlertTriangle,
  Terminal,
  Keyboard as KeyboardIcon,
  Check,
  X,
  Volume2,
  VolumeX,
  Sparkles
} from 'lucide-react';
import { RemoteDevice, RemoteSessionResponse } from '../../types/remoteDesktop';
import { disconnectSession } from '../../services/remoteDesktopApi';
import { useLanguage } from '../../i18n';

interface RemoteDesktopSessionViewProps {
  session: RemoteSessionResponse;
  device: RemoteDevice;
  onClose: () => void;
  onReconnect: () => void;
}

export const RemoteDesktopSessionView: React.FC<RemoteDesktopSessionViewProps> = ({
  session,
  device,
  onClose,
  onReconnect
}) => {
  const { t, isRtl } = useLanguage();

  const containerRef = useRef<HTMLDivElement>(null);
  const displayContainerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<any>(null);
  const tunnelRef = useRef<any>(null);

  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isClipboardOpen, setIsClipboardOpen] = useState(false);
  const [clipboardText, setClipboardText] = useState('');
  const [clipboardCopied, setClipboardCopied] = useState(false);
  const [scaleMode, setScaleMode] = useState<'fit' | 'native'>('fit');

  // Session duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Initialize Guacamole Client
  useEffect(() => {
    if (!displayContainerRef.current) return;

    let isSubscribed = true;

    // Determine WebSocket endpoint
    const loc = window.location;
    const wsProto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = loc.host;
    const wsUrl = `${wsProto}//${wsHost}/ws/remote-desktop?token=${encodeURIComponent(session.token)}&width=${window.innerWidth}&height=${window.innerHeight}&dpi=96`;

    console.log('[Guacamole Client] Initializing WebSocket tunnel on:', wsUrl);

    try {
      // 1. Create WebSocket Tunnel
      const tunnel = new Guacamole.WebSocketTunnel(wsUrl);
      tunnelRef.current = tunnel;

      // 2. Instantiate Guacamole Client
      const client = new Guacamole.Client(tunnel);
      clientRef.current = client;

      // 3. Mount Display Element to DOM
      const display = client.getDisplay();
      const displayElem = display.getElement();
      displayElem.style.display = 'block';
      displayElem.style.margin = '0 auto';
      displayElem.style.cursor = 'default';

      // Clear previous canvas if any
      if (displayContainerRef.current) {
        displayContainerRef.current.innerHTML = '';
        displayContainerRef.current.appendChild(displayElem);
      }

      // 4. State Change Listener
      client.onstatechange = (state: number) => {
        if (!isSubscribed) return;
        console.log('[Guacamole Client] State changed to:', state);
        // Guacamole.Client.State:
        // 0: IDLE, 1: CONNECTING, 2: WAITING, 3: CONNECTED, 4: DISCONNECTING, 5: DISCONNECTED
        if (state === 3) {
          setConnectionState('connected');
          setErrorMessage(null);
        } else if (state === 1 || state === 2) {
          setConnectionState('connecting');
        } else if (state === 5) {
          setConnectionState(prev => (prev === 'error' ? 'error' : 'disconnected'));
        }
      };

      // 5. Error Handler
      client.onerror = (status: any) => {
        if (!isSubscribed) return;
        console.error('[Guacamole Client] Error occurred:', status);
        setConnectionState('error');
        const code = status.code || status;
        let message = status.message || `Guacamole client error (Code ${code})`;
        if (code === 516 || code === 518) {
          message = `Cannot reach Apache Guacamole daemon (guacd) or Windows RDP host ${device.hostname}:${device.port}. Verify guacd container is running.`;
        } else if (code === 513) {
          message = 'Authentication failed or session token expired.';
        }
        setErrorMessage(message);
      };

      // 6. Clipboard sync from remote Windows
      client.onclipboard = (stream: any, mimetype: string) => {
        if (/^text\//.test(mimetype)) {
          let text = '';
          const reader = new Guacamole.StringReader(stream);
          reader.ontext = (chunk: string) => { text += chunk; };
          reader.onend = () => {
            if (isSubscribed) setClipboardText(text);
          };
        }
      };

      // 7. Mouse Handling
      const mouse = new Guacamole.Mouse(displayElem);
      mouse.onmousedown = mouse.onmouseup = mouse.onmousemove = (mouseState: any) => {
        client.sendMouseState(mouseState);
      };

      // 8. Keyboard Handling
      const keyboard = new Guacamole.Keyboard(document);
      keyboard.onkeydown = (keysym: number) => {
        client.sendKeyEvent(1, keysym);
        return false;
      };
      keyboard.onkeyup = (keysym: number) => {
        client.sendKeyEvent(0, keysym);
        return false;
      };

      // 9. Window and Container Resize
      const updateSize = () => {
        if (!displayContainerRef.current || !clientRef.current) return;
        const rect = displayContainerRef.current.getBoundingClientRect();
        const w = Math.floor(rect.width);
        const h = Math.floor(rect.height);
        if (w > 100 && h > 100) {
          client.sendSize(w, h);
        }
      };

      window.addEventListener('resize', updateSize);

      // Connect to tunnel
      client.connect();

      return () => {
        isSubscribed = false;
        window.removeEventListener('resize', updateSize);
        try {
          client.disconnect();
        } catch {}
      };
    } catch (err: any) {
      console.error('[Guacamole Client] Failed to initialize:', err);
      setConnectionState('error');
      setErrorMessage(err.message || 'Failed to initialize Guacamole RDP connection');
    }
  }, [session.token, device.hostname, device.port]);

  // Handle Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Send Ctrl+Alt+Del keysym sequence (Ctrl: 0xFFE3, Alt: 0xFFE9, Delete: 0xFFFF)
  const sendCtrlAltDel = () => {
    if (!clientRef.current) return;
    const client = clientRef.current;
    // Press Ctrl, Alt, Del
    client.sendKeyEvent(1, 0xFFE3); // Control_L
    client.sendKeyEvent(1, 0xFFE9); // Alt_L
    client.sendKeyEvent(1, 0xFFFF); // Delete
    // Release in reverse
    client.sendKeyEvent(0, 0xFFFF);
    client.sendKeyEvent(0, 0xFFE9);
    client.sendKeyEvent(0, 0xFFE3);
  };

  // Send Windows Super key (0xFFEB)
  const sendWindowsKey = () => {
    if (!clientRef.current) return;
    const client = clientRef.current;
    client.sendKeyEvent(1, 0xFFEB);
    setTimeout(() => {
      client.sendKeyEvent(0, 0xFFEB);
    }, 100);
  };

  // Send local clipboard text to remote Windows
  const sendClipboardToRemote = (text: string) => {
    if (!clientRef.current || !text) return;
    const stream = clientRef.current.createClipboardStream('text/plain');
    const writer = new Guacamole.StringWriter(stream);
    writer.sendText(text);
    writer.sendEnd();
    setClipboardCopied(true);
    setTimeout(() => setClipboardCopied(false), 2000);
  };

  // Disconnect session cleanly
  const handleDisconnect = async () => {
    if (clientRef.current) {
      try { clientRef.current.disconnect(); } catch {}
    }
    await disconnectSession(session.session_id, device.id);
    onClose();
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full w-full bg-slate-950 text-white select-none relative overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : 'rounded-2xl border border-white/10 shadow-2xl'
      }`}
    >
      {/* Session Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-white/10 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">{device.name}</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/40 text-slate-300 border border-white/10">
                {device.hostname}:{device.port}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
              <span>user: <b className="text-slate-200">{device.username}</b></span>
              {device.domain && <span>domain: <b className="text-slate-200">{device.domain}</b></span>}
            </div>
          </div>
        </div>

        {/* Status Indicator & Timer */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-xs">
            {connectionState === 'connected' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
                <span>{isRtl ? 'متصل' : 'Connected'}</span>
              </span>
            )}
            {connectionState === 'connecting' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40 text-xs font-semibold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>{isRtl ? 'در حال برقراری ارتباط...' : 'Connecting...'}</span>
              </span>
            )}
            {connectionState === 'error' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/40 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>{isRtl ? 'خطای اتصال' : 'Connection Error'}</span>
              </span>
            )}
            {connectionState === 'disconnected' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-white/10 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span>{isRtl ? 'ارتباط قطع شد' : 'Disconnected'}</span>
              </span>
            )}

            <span className="flex items-center gap-1 text-slate-400 px-2 py-0.5 rounded bg-black/40 border border-white/5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{formatTimer(sessionSeconds)}</span>
            </span>
          </div>

          {/* Quick Exit */}
          <button
            onClick={handleDisconnect}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
            title={isRtl ? 'قطع اتصال و بازگشت' : 'Disconnect & Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main RDP Desktop Display Canvas */}
      <div className="flex-1 relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* Guacamole Canvas Container */}
        <div
          ref={displayContainerRef}
          className="w-full h-full flex items-center justify-center overflow-hidden"
          style={{
            touchAction: 'none'
          }}
        />

        {/* Diagnostic Panel for Error or Disconnected State */}
        {(connectionState === 'error' || connectionState === 'disconnected') && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-20 animate-fadeIn">
            <div className="max-w-lg w-full bg-slate-900 border border-white/15 rounded-2xl p-6 shadow-2xl text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  {connectionState === 'error'
                    ? (isRtl ? 'عدم برقراری ارتباط با ویندوز RDP' : 'Windows RDP Connection Failed')
                    : (isRtl ? 'ارتباط ریموت دسکتاپ پایان یافت' : 'Remote Session Ended')}
                </h4>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {errorMessage || (isRtl ? 'سشن با موفقیت خاتمه یافت.' : 'Session closed cleanly.')}
                </p>
              </div>

              {/* Actionable guidance */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-white/10 text-left text-xs text-slate-300 space-y-1.5 font-mono">
                <div className="text-sky-400 font-bold font-sans">
                  {isRtl ? 'موارد قابل بررسی:' : 'Diagnostic Checklist:'}
                </div>
                <div>• Target: <span className="text-white">{device.hostname}:{device.port}</span></div>
                <div>• Guacamole Proxy (guacd): <span className="text-white">port 4822</span></div>
                <div>• Run in Linux/Docker: <span className="text-cyan-300">docker-compose up -d guacd</span></div>
                <div>• Ensure Windows Remote Desktop & Firewall allow port {device.port}</div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
                >
                  {isRtl ? 'بازگشت به لیست ماشین‌ها' : 'Return to Device List'}
                </button>
                <button
                  onClick={onReconnect}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-sky-600/30 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'تلاش مجدد (Reconnect)' : 'Reconnect'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Control Toolbar */}
      <div className="px-4 py-2 bg-slate-900/90 border-t border-white/10 backdrop-blur-md flex items-center justify-between shrink-0 z-10 text-xs">
        {/* Left Controls */}
        <div className="flex items-center gap-2">
          {/* Ctrl+Alt+Del */}
          <button
            onClick={sendCtrlAltDel}
            disabled={connectionState !== 'connected'}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
            title="Send Ctrl+Alt+Del key combination to Windows"
          >
            <KeyboardIcon className="w-3.5 h-3.5 text-sky-400" />
            <span>Ctrl+Alt+Del</span>
          </button>

          {/* Windows Super Key */}
          <button
            onClick={sendWindowsKey}
            disabled={connectionState !== 'connected'}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
            title="Send Windows Start Key"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Win Key</span>
          </button>

          {/* Clipboard Button */}
          <button
            onClick={() => setIsClipboardOpen(!isClipboardOpen)}
            disabled={connectionState !== 'connected'}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition border cursor-pointer ${
              isClipboardOpen
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
            }`}
          >
            <Clipboard className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isRtl ? 'کلیپ‌بورد' : 'Clipboard'}</span>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Disconnect Button */}
          <button
            onClick={handleDisconnect}
            className="px-3.5 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isRtl ? 'قطع اتصال' : 'Disconnect'}</span>
          </button>
        </div>
      </div>

      {/* Clipboard Slide-over Drawer */}
      {isClipboardOpen && (
        <div className="absolute bottom-14 right-4 w-96 bg-slate-900/95 border border-white/15 rounded-2xl shadow-2xl p-4 z-30 animate-fadeIn text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-bold text-white flex items-center gap-2">
              <Clipboard className="w-4 h-4 text-sky-400" />
              <span>{isRtl ? 'همگام‌سازی کلیپ‌بورد با ویندوز' : 'Windows Clipboard Sync'}</span>
            </span>
            <button
              onClick={() => setIsClipboardOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {isRtl ? 'متن ارسالی به دسکتاپ ویندوز:' : 'Text to paste into Windows desktop:'}
            </label>
            <textarea
              rows={4}
              value={clipboardText}
              onChange={(e) => setClipboardText(e.target.value)}
              placeholder={isRtl ? 'متن خود را اینجا تایپ یا پیست کنید...' : 'Type or paste text to send into Windows session...'}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {clipboardCopied && (
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  {isRtl ? 'به ویندوز ارسال شد' : 'Sent to Windows!'}
                </span>
              )}
            </span>
            <button
              onClick={() => sendClipboardToRemote(clipboardText)}
              disabled={!clipboardText.trim()}
              className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition disabled:opacity-40 cursor-pointer"
            >
              {isRtl ? 'ارسال به ویندوز (Paste)' : 'Send to Windows'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
