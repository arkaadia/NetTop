import React, { useState } from 'react';
import {
  X,
  Database,
  RefreshCw,
  Server,
  Network,
  Cpu,
  HardDrive,
  Clock,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Code
} from 'lucide-react';
import { useLanguage } from '../../i18n';
import { SshTestDevice, SshFetchedData } from '../../types/sshTest';
import { fetchDeviceData } from '../../services/sshTestApi';

interface FetchedDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: SshTestDevice | null;
  onRefetched?: (updatedData: SshFetchedData) => void;
}

export const FetchedDataModal: React.FC<FetchedDataModalProps> = ({
  isOpen,
  onClose,
  device,
  onRefetched
}) => {
  const { isRtl } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'interfaces' | 'specs' | 'raw'>('overview');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [currentData, setCurrentData] = useState<SshFetchedData | null>(device?.fetched_data || null);

  React.useEffect(() => {
    setCurrentData(device?.fetched_data || null);
    setFetchError(null);
  }, [device?.id, device?.fetched_data]);

  if (!isOpen || !device) return null;

  const handleRefetch = async () => {
    setIsFetching(true);
    setFetchError(null);
    try {
      const data = await fetchDeviceData(device.id);
      setCurrentData(data);
      if (onRefetched) onRefetched(data);
    } catch (err: any) {
      setFetchError(err.message || (isRtl ? 'خطا در دریافت اطلاعات واقعی از دیوایس' : 'Failed to fetch device data'));
    } finally {
      setIsFetching(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-blur" data-modal-backdrop="true">
      <div className="relative w-full max-w-4xl bg-slate-900/95 border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-950/40 text-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{isRtl ? 'اطلاعات سخت‌افزار و مشخصات دریافتی از دیوایس' : 'Real Hardware & OS Telemetry'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-mono">
                  {device.name}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isRtl
                  ? 'داده‌های واقعی خوانده شده از طریق کتابخانه Paramiko 2 پایتون (بدون هیچگونه دیتای فیک)'
                  : 'Genuine data probed via Python Paramiko 2 engine (Zero mock data)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2.5 border-b border-white/10 bg-slate-950/40 flex items-center justify-between gap-3 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>{isRtl ? 'نمای کلی و سیستم‌عامل' : 'Overview & OS'}</span>
            </button>
            <button
              onClick={() => setActiveTab('interfaces')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'interfaces'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>{isRtl ? 'کارت‌های شبکه و اینترفیس‌ها' : 'Network Interfaces'}</span>
              {currentData?.interfaces && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
                  {currentData.interfaces.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('specs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'specs'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{isRtl ? 'منابع و سخت‌افزار' : 'Hardware Specs'}</span>
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'raw'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>{isRtl ? 'خروجی خام دستورات' : 'Raw Command Outputs'}</span>
            </button>
          </div>

          <button
            onClick={handleRefetch}
            disabled={isFetching}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>{isFetching ? (isRtl ? 'در حال دریافت...' : 'Fetching...') : (isRtl ? 'فتچ مجدد دیتا' : 'Refetch Data')}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {fetchError && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{fetchError}</span>
            </div>
          )}

          {!currentData && !isFetching && (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">
                {isRtl ? 'هنوز داده‌ای از این دیوایس دریافت نشده است' : 'No telemetry data fetched yet'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {isRtl
                  ? 'بر روی دکمه «فتچ مجدد دیتا» کلیک کنید تا موتور پارامیکو به صورت زنده به دیوایس متصل شده و مشخصات سیستم‌عامل، کارت‌های شبکه و سخت‌افزار را استخراج نماید.'
                  : 'Click the button above to execute live Paramiko discovery commands on the remote device.'}
              </p>
              <button
                onClick={handleRefetch}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors inline-flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isRtl ? 'دریافت زنده اطلاعات (Fetch Data)' : 'Fetch Real Data Now'}</span>
              </button>
            </div>
          )}

          {currentData && activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isRtl ? 'سیستم‌عامل و پلتفرم' : 'OS & Platform'}</span>
                  </div>
                  <div className="text-sm font-bold text-white">
                    {currentData.os_type}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {currentData.os_version || 'N/A'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isRtl ? 'مدت زمان روشن بودن (Uptime)' : 'Uptime'}</span>
                  </div>
                  <div className="text-sm font-bold text-white font-mono truncate">
                    {currentData.uptime}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isRtl ? 'میزبان:' : 'Host:'} {currentData.hostname}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{isRtl ? 'موتور و سرعت استخراج' : 'Engine & Latency'}</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-400 font-mono">
                    Paramiko {currentData.paramiko_version}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {isRtl ? 'زمان اجرا:' : 'Execution:'} {currentData.execution_time_ms} ms
                  </div>
                </div>
              </div>

              {/* Kernel Info */}
              {currentData.kernel && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                  <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>{isRtl ? 'کرنل و معماری سیستمی' : 'Kernel & Architecture'}</span>
                    <button
                      onClick={() => copyToClipboard(currentData.kernel, 'kernel')}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      {copiedKey === 'kernel' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/50 text-xs font-mono text-emerald-300 break-all">
                    {currentData.kernel}
                  </div>
                </div>
              )}

              {/* Fetch Timestamp Info */}
              <div className="text-right text-[11px] text-slate-400 font-mono">
                {isRtl ? 'آخرین به‌روزرسانی:' : 'Last fetched at:'} {new Date(currentData.fetched_at).toLocaleString()}
              </div>
            </div>
          )}

          {currentData && activeTab === 'interfaces' && (
            <div className="space-y-3">
              {currentData.interfaces.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
                  {isRtl ? 'اینترفیس شبکه‌ای یافت نشد یا در خروجی استاندارد موجود نبود.' : 'No interfaces parsed.'}
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-4">{isRtl ? 'نام اینترفیس' : 'Interface Name'}</th>
                        <th className="py-2.5 px-4">{isRtl ? 'وضعیت' : 'Status'}</th>
                        <th className="py-2.5 px-4">{isRtl ? 'آدرس‌های آی‌پی تخصیص‌یافته' : 'IP Address'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 font-mono">
                      {currentData.interfaces.map((iface, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-white">{iface.name}</td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              iface.status.toUpperCase() === 'UP'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {iface.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-emerald-400">{iface.ip}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {currentData && activeTab === 'specs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* RAM Specs */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span>{isRtl ? 'وضعیت حافظه رم (RAM)' : 'Memory (RAM)'}</span>
                </div>
                {currentData.specs.ram_total_mb ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">{isRtl ? 'کل حافظه:' : 'Total RAM:'}</span>
                      <span className="font-mono text-white font-bold">{currentData.specs.ram_total_mb} MB</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">{isRtl ? 'مصرف شده:' : 'Used RAM:'}</span>
                      <span className="font-mono text-amber-300">{currentData.specs.ram_used_mb} MB</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">{isRtl ? 'آزاد:' : 'Free RAM:'}</span>
                      <span className="font-mono text-emerald-400">{currentData.specs.ram_free_mb} MB</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">{isRtl ? 'داده‌های رم برای این مدل تجهیز در دسترس نیست.' : 'RAM specs not available.'}</p>
                )}
              </div>

              {/* Disk Storage */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  <span>{isRtl ? 'فضای دیسک و ذخیره‌سازی' : 'Storage / Root'}</span>
                </div>
                {currentData.specs.disk_size ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">{isRtl ? 'ظرفیت دیسک:' : 'Total Size:'}</span>
                      <span className="font-mono text-white font-bold">{currentData.specs.disk_size}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">{isRtl ? 'فضای اشغال‌شده:' : 'Used:'}</span>
                      <span className="font-mono text-amber-300">{currentData.specs.disk_used} ({currentData.specs.disk_usage_pct})</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">{isRtl ? 'فضای آزاد:' : 'Available:'}</span>
                      <span className="font-mono text-emerald-400">{currentData.specs.disk_avail}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">{isRtl ? 'اطلاعات دیسک برای این تجهیز در دسترس نیست.' : 'Storage specs not available.'}</p>
                )}
              </div>

              {/* CPU Model */}
              {currentData.specs.cpu_model && (
                <div className="md:col-span-2 p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                  <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                    <span>{isRtl ? 'مدل پردازنده (CPU Model)' : 'CPU Model'}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/50 text-xs font-mono text-white">
                    {currentData.specs.cpu_model}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentData && activeTab === 'raw' && (
            <div className="space-y-3">
              {Object.keys(currentData.raw_outputs).length === 0 ? (
                <p className="text-xs text-slate-400">{isRtl ? 'خروجی خامی ثبت نشده است.' : 'No raw outputs recorded.'}</p>
              ) : (
                Object.entries(currentData.raw_outputs).map(([cmd, out]) => (
                  <div key={cmd} className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/80">
                    <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>$ {cmd}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(out, cmd)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        {copiedKey === cmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-56">
                      {out}
                    </pre>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{isRtl ? 'پروتکل Paramiko 2 با رمزنگاری معتبر فعال است' : 'Paramiko 2 cryptographically secured'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            {isRtl ? 'بستن' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
