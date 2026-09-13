import React, { useState } from 'react';
import {
  X,
  Radar,
  Play,
  CheckCircle2,
  AlertCircle,
  Network,
  Cpu,
  Plus,
  Terminal,
  Clock,
  ShieldCheck,
  RefreshCw,
  Search,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { scanLanSubnet, importScannedDevice } from '../services/api';
import { LanScanDevice, LanScanResult, Device } from '../types';

interface LanScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceImported?: (device: Device) => void;
  onOpenTerminalForIp?: (ip: string, name: string) => void;
}

export const LanScannerModal: React.FC<LanScannerModalProps> = ({
  isOpen,
  onClose,
  onDeviceImported,
  onOpenTerminalForIp
}) => {
  const [subnet, setSubnet] = useState('192.168.1.0/24');
  const [selectedPorts, setSelectedPorts] = useState<number[]>([22, 23, 80, 443]);
  const [timeoutSec, setTimeoutSec] = useState(0.8);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<LanScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importingIp, setImportingIp] = useState<string | null>(null);
  const [importedIps, setImportedIps] = useState<Set<string>>(new Set());

  const availablePorts = [
    { port: 22, name: 'SSH (سیسکو / لینوکس)', desc: 'اتصال امن خط فرمان' },
    { port: 23, name: 'Telnet', desc: 'اتصال متنی قدیمی' },
    { port: 80, name: 'HTTP Web GUI', desc: 'پنل وب سوئیچ' },
    { port: 443, name: 'HTTPS Web GUI', desc: 'پنل وب امن' },
    { port: 161, name: 'SNMP', desc: 'پروتکل مانیتورینگ شبکه' },
    { port: 8080, name: 'Alternate Web', desc: 'پورت‌های ثانویه' }
  ];

  const togglePort = (port: number) => {
    setSelectedPorts(prev =>
      prev.includes(port) ? prev.filter(p => p !== port) : [...prev, port]
    );
  };

  const handleStartScan = async () => {
    if (!subnet.trim()) return;
    setIsScanning(true);
    setError(null);
    try {
      const res = await scanLanSubnet({
        subnet: subnet.trim(),
        ports: selectedPorts,
        timeout: timeoutSec
      });
      setScanResult(res);
      if (!res.success && res.error) {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message || 'خطا در اجرای اسکن ساب‌نت توسط پایتون');
    } finally {
      setIsScanning(false);
    }
  };

  const handleImportDevice = async (dev: LanScanDevice) => {
    setImportingIp(dev.ip);
    try {
      const res = await importScannedDevice({
        ip: dev.ip,
        hostname: dev.hostname !== 'Unknown' ? dev.hostname : undefined,
        device_type: dev.device_type,
        role: dev.role,
        latency_ms: dev.latency_ms,
        open_ports: dev.open_ports
      });
      setImportedIps(prev => new Set(prev).add(dev.ip));
      if (onDeviceImported) {
        onDeviceImported(res.device);
      }
    } catch (e: any) {
      alert('خطا در افزودن دستگاه: ' + e.message);
    } finally {
      setImportingIp(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto modal-backdrop-blur"
      data-modal-backdrop="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-slate-900/95 border border-white/20 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl text-white my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg border border-white/20 text-white">
              <Radar className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>اسکنر و کاشف شبکه داخلی (LAN Subnet Scanner)</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                  Python Multi-Threaded Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                پایش ساب‌نت، کشف سوئیچ‌ها و روترهای فعال در شبکه و واردسازی فوری به نقشه توپولوژی
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-slate-200 text-xs sm:text-sm">
          {/* Scan Controls Box */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* Subnet Input */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>ساب‌نت شبکه داخلی (CIDR Subnet):</span>
                  <span className="text-[10px] text-slate-400">مثال: 192.168.1.0/24 یا 10.0.0.0/24</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={subnet}
                    onChange={(e) => setSubnet(e.target.value)}
                    placeholder="192.168.1.0/24"
                    disabled={isScanning}
                    className="w-full bg-slate-950/80 border border-white/15 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-cyan-500 transition"
                  />
                  <div className="absolute left-3 top-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSubnet('192.168.1.0/24')}
                      className="text-[10px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 font-mono transition"
                    >
                      192.168.1.0/24
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubnet('10.0.0.0/24')}
                      className="text-[10px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 font-mono transition"
                    >
                      10.0.0.0/24
                    </button>
                  </div>
                </div>
              </div>

              {/* Start Scan Button */}
              <div>
                <button
                  onClick={handleStartScan}
                  disabled={isScanning || !subnet.trim() || selectedPorts.length === 0}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 active:scale-95"
                >
                  <Play className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'در حال پایش ساب‌نت...' : 'شروع اسکن با پایتون'}</span>
                </button>
              </div>
            </div>

            {/* Ports selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold">پورت‌های مدیریتی مورد بررسی:</span>
                <span className="text-[11px] text-slate-400">
                  {selectedPorts.length} پورت انتخاب شده
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {availablePorts.map((p) => {
                  const isChecked = selectedPorts.includes(p.port);
                  return (
                    <button
                      key={p.port}
                      type="button"
                      onClick={() => togglePort(p.port)}
                      disabled={isScanning}
                      className={`p-2 rounded-lg border text-right transition flex flex-col justify-between ${
                        isChecked
                          ? 'bg-cyan-950/50 border-cyan-500/50 text-white shadow-xs'
                          : 'bg-slate-950/40 border-white/5 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs">{p.port}</span>
                        <div
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                            isChecked ? 'bg-cyan-500 text-slate-950 font-bold' : 'border border-white/20'
                          }`}
                        >
                          {isChecked && '✓'}
                        </div>
                      </div>
                      <span className="text-[10px] font-sans truncate mt-1">{p.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Scan Results */}
          {scanResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white">
                    نتایج اسکن ساب‌نت ({scanResult.found_devices_count} دستگاه کشف شد)
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>زمان پایش: {scanResult.scan_time_seconds} ثانیه</span>
                </div>
              </div>

              {scanResult.devices.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-950/40 border border-white/10 text-center space-y-2">
                  <Radar className="w-8 h-8 text-slate-500 mx-auto" />
                  <div className="text-sm font-semibold text-slate-300">هیچ تجهیزی با پورت‌های مشخص شده پاسخ نداد.</div>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    از صحت ساب‌نت وارد شده اطمینان حاصل فرمایید و مطمئن شوید فایروال محلی پورت‌های ۲۲ و ۲۳ را مسدود نکرده باشد.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {scanResult.devices.map((dev) => {
                    const isImported = importedIps.has(dev.ip);
                    const isImporting = importingIp === dev.ip;
                    return (
                      <div
                        key={dev.ip}
                        className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 hover:border-white/20 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                            <Network className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-white text-sm">{dev.ip}</span>
                              <span className="text-[11px] text-cyan-400 font-medium">
                                {dev.hostname !== 'Unknown' ? dev.hostname : dev.role}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                                {dev.latency_ms} ms
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                              <span>پورت‌های باز:</span>
                              <div className="flex items-center gap-1">
                                {dev.open_ports.map((p) => (
                                  <span
                                    key={p}
                                    className="px-1.5 py-0.2 rounded bg-white/10 text-slate-200 font-mono text-[10px]"
                                  >
                                    {p}
                                  </span>
                                ))}
                              </div>
                              {dev.vendor && (
                                <span className="text-slate-500 mr-2">• برند: {dev.vendor}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          {/* Quick Terminal SSH */}
                          {dev.open_ports.includes(22) || dev.open_ports.includes(23) ? (
                            <button
                              onClick={() => {
                                if (onOpenTerminalForIp) {
                                  onOpenTerminalForIp(dev.ip, dev.hostname);
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-cyan-300 text-xs font-medium transition flex items-center gap-1.5"
                              title="اتصال فوری ترمینال پایتون با SSH"
                            >
                              <Terminal className="w-3.5 h-3.5" />
                              <span>اتصال SSH</span>
                            </button>
                          ) : null}

                          {/* Import to Topology */}
                          <button
                            onClick={() => handleImportDevice(dev)}
                            disabled={isImported || isImporting}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm active:scale-95 ${
                              isImported
                                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 cursor-default'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            }`}
                          >
                            {isImporting ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : isImported ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                            <span>{isImported ? 'اضافه شد' : isImporting ? 'در حال افزودن...' : 'افزودن به توپولوژی'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-white/5 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            سازگار با پروتکل‌های سوئیچ‌های سیسکو، میکروتیک و روترهای شبکه
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
