import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Plus,
  RefreshCw,
  Search,
  Activity,
  Database,
  Trash2,
  Edit2,
  Server,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Cpu,
  ShieldCheck,
  Radio,
  ExternalLink,
  ChevronRight,
  Loader2,
  Lock,
  Key
} from 'lucide-react';
import { useLanguage } from '../../i18n';
import { SshTestDevice, SshFetchedData, SshHealthStatus } from '../../types/sshTest';
import { getSshDevices, deleteSshDevice, checkSshHealth, fetchDeviceData } from '../../services/sshTestApi';
import { SshDeviceModal } from './SshDeviceModal';
import { DiagnosticModal } from './DiagnosticModal';
import { FetchedDataModal } from './FetchedDataModal';
import { InteractiveTerminalModal } from './InteractiveTerminalModal';

export const SshTestView: React.FC = () => {
  const { t, isRtl } = useLanguage();

  const [devices, setDevices] = useState<SshTestDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthStatus, setHealthStatus] = useState<SshHealthStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchingDeviceId, setFetchingDeviceId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [selectedDeviceForEdit, setSelectedDeviceForEdit] = useState<SshTestDevice | null>(null);

  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [diagnosticDevice, setDiagnosticDevice] = useState<SshTestDevice | null>(null);

  const [isFetchedDataOpen, setIsFetchedDataOpen] = useState(false);
  const [fetchedDataDevice, setFetchedDataDevice] = useState<SshTestDevice | null>(null);

  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalDevice, setTerminalDevice] = useState<SshTestDevice | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [devs, health] = await Promise.all([
        getSshDevices(),
        checkSshHealth().catch(() => null)
      ]);
      setDevices(devs);
      if (health) setHealthStatus(health);
    } catch (err: any) {
      showToast(err.message || (isRtl ? 'خطا در بارگذاری فهرست تجهیزات' : 'Failed to load devices'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    const confirmMsg = isRtl
      ? `آیا از حذف دیوایس «${name}» اطمینان دارید؟`
      : `Are you sure you want to delete device '${name}'?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteSshDevice(id);
      setDevices((prev) => prev.filter((d) => d.id !== id));
      showToast(isRtl ? `دیوایس «${name}» با موفقیت حذف شد` : `Device '${name}' deleted`, 'success');
    } catch (err: any) {
      showToast(err.message || (isRtl ? 'خطا در حذف دیوایس' : 'Delete failed'), 'error');
    }
  };

  const handleFetchDataDirect = async (device: SshTestDevice) => {
    setFetchingDeviceId(device.id);
    try {
      const data = await fetchDeviceData(device.id);
      // Update in local state
      setDevices((prev) =>
        prev.map((d) =>
          d.id === device.id
            ? { ...d, fetched_data: data, last_fetched_at: data.fetched_at, status: 'Online' }
            : d
        )
      );
      setFetchedDataDevice({
        ...device,
        fetched_data: data,
        last_fetched_at: data.fetched_at,
        status: 'Online'
      });
      setIsFetchedDataOpen(true);
      showToast(
        isRtl
          ? `اطلاعات واقعی «${device.name}» با موفقیت دریافت شد (${data.execution_time_ms}ms)`
          : `Data for '${device.name}' fetched successfully (${data.execution_time_ms}ms)`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || (isRtl ? 'خطا در واکشی اطلاعات' : 'Fetch failed'), 'error');
    } finally {
      setFetchingDeviceId(null);
    }
  };

  const filteredDevices = devices.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      d.name.toLowerCase().includes(q) ||
      d.host.toLowerCase().includes(q) ||
      d.username.toLowerCase().includes(q) ||
      d.device_type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-xl flex items-center gap-2.5 text-xs font-medium transition-all ${
          toastMessage.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
            : toastMessage.type === 'error'
            ? 'bg-rose-950/90 border-rose-500/50 text-rose-300'
            : 'bg-slate-900/90 border-slate-700 text-slate-200'
        }`}>
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Module Title Card */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/30 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white">
                  {isRtl ? 'پنل تست و ارتباط SSH واقعی' : 'Real SSH Testing & Diagnostics'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Paramiko 2 + WS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isRtl
                  ? 'اتصال کاملاً زنده بدون داده‌های ماک؛ ممیزی ۸ لایه فرانت تا بک‌اند، فتچ دیتا و ترمینال تعاملی'
                  : 'Live SSH socket tunnels, 8-layer link audits, telemetry extraction, and interactive PTY'}
              </p>
            </div>
          </div>
        </div>

        {/* Engine Status Card */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{isRtl ? 'موتور پایتون / پارامیکو' : 'Engine & Runtime'}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-base font-bold text-white font-mono flex items-center gap-1.5">
            <span>Paramiko</span>
            <span className="text-emerald-400 text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              {healthStatus?.paramiko_version || '2.12.0'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {isRtl ? 'درگاه وب‌سوکت PTY فعال است' : 'PTY WebSocket gateway online'}
          </p>
        </div>

        {/* Total Devices Card */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{isRtl ? 'تجهیزات ثبت‌شده' : 'Configured Devices'}</span>
            <Server className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {devices.length}
          </div>
          <p className="text-[11px] text-slate-400">
            {devices.filter((d) => d.status === 'Online').length} {isRtl ? 'دیوایس آنلاین و تایید شده' : 'devices active'}
          </p>
        </div>
      </div>

      {/* Action Bar (Search & Buttons) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRtl ? 'جستجو بر اساس نام دیوایس، IP یا نام کاربری...' : 'Search by device name, IP, username...'}
            className="w-full bg-slate-900/70 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors disabled:opacity-50"
            title={isRtl ? 'تازه‌سازی لیست' : 'Refresh list'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={() => {
              setSelectedDeviceForEdit(null);
              setIsAddEditOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{isRtl ? 'افزودن دیوایس SSH' : 'Add SSH Device'}</span>
          </button>
        </div>
      </div>

      {/* Devices Inventory Table / Grid */}
      {loading && devices.length === 0 ? (
        <div className="p-12 text-center text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
          <p className="text-xs">{isRtl ? 'در حال دریافت اطلاعات مخزن SSH...' : 'Loading SSH devices...'}</p>
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
            <Terminal className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {searchQuery
                ? (isRtl ? 'هیچ دیوایسی با این عبارت جستجو یافت نشد' : 'No devices match search')
                : (isRtl ? 'هنوز هیچ دیوایسی برای تست SSH افزوده نشده است' : 'No SSH devices added yet')}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              {isRtl
                ? 'برای برقراری اتصال واقعی، استخراج مشخصات سیستم‌عامل و ممیزی سلامت ارتباط فرانت تا بک‌اند، اولین دیوایس خود را اضافه کنید.'
                : 'Add your first SSH target to perform live interactive shell sessions, 8-layer audits, and hardware discovery.'}
            </p>
          </div>
          {!searchQuery && (
            <button
              onClick={() => {
                setSelectedDeviceForEdit(null);
                setIsAddEditOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{isRtl ? 'افزودن اولین دیوایس' : 'Add First Device'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices.map((device) => {
            const isCurrentlyFetching = fetchingDeviceId === device.id;

            return (
              <div
                key={device.id}
                className="rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all p-5 flex flex-col justify-between space-y-4 group shadow-lg shadow-black/20"
              >
                {/* Device Card Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/30 transition-colors">
                        <Server className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate max-w-[180px]">
                          {device.name}
                        </h3>
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                          <span>{device.username}@{device.host}:{device.port}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      device.status === 'Online'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : device.status === 'Error'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        device.status === 'Online' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                      }`} />
                      <span>{device.status}</span>
                    </span>
                  </div>

                  {/* Device Meta */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300 font-mono">
                      {device.device_type}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400 flex items-center gap-1">
                      {device.auth_type === 'password' ? <Lock className="w-3 h-3 text-slate-400" /> : <Key className="w-3 h-3 text-emerald-400" />}
                      <span>{device.auth_type}</span>
                    </span>
                    {device.last_latency_ms !== undefined && device.last_latency_ms !== null && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-cyan-400 font-mono">
                        {device.last_latency_ms} ms
                      </span>
                    )}
                  </div>

                  {/* Telemetry Status Summary */}
                  {device.fetched_data ? (
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>{isRtl ? 'سیستم‌عامل:' : 'OS:'}</span>
                        <span className="font-semibold text-slate-200 truncate max-w-[150px]">
                          {device.fetched_data.os_type}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>{isRtl ? 'آپ‌تایم:' : 'Uptime:'}</span>
                        <span className="font-mono text-emerald-400 truncate max-w-[150px]">
                          {device.fetched_data.uptime}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-[11px] text-slate-500 italic">
                      {isRtl ? 'هنوز داده‌های زنده استخراج نشده است.' : 'No telemetry fetched yet.'}
                    </div>
                  )}
                </div>

                {/* Action Buttons Bar */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Interactive Terminal Button */}
                    <button
                      onClick={() => {
                        setTerminalDevice(device);
                        setIsTerminalOpen(true);
                      }}
                      className="py-1.5 px-2 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-colors"
                      title={isRtl ? 'اتصال ترمینال تعاملی وب‌سوکت' : 'Open interactive shell'}
                    >
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isRtl ? 'ترمینال تعاملی' : 'Terminal'}</span>
                    </button>

                    {/* Fetch Data Button */}
                    <button
                      onClick={() => handleFetchDataDirect(device)}
                      disabled={isCurrentlyFetching}
                      className="py-1.5 px-2 rounded-xl text-xs font-semibold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      title={isRtl ? 'دریافت مشخصات زنده دیوایس با Paramiko 2' : 'Fetch live specs with Paramiko 2'}
                    >
                      {isCurrentlyFetching ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                          <span>{isRtl ? 'در حال فتچ...' : 'Fetching...'}</span>
                        </>
                      ) : (
                        <>
                          <Database className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{isRtl ? 'فتچ دیتا' : 'Fetch Data'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Secondary Actions: Diagnostic & Manage */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => {
                        setDiagnosticDevice(device);
                        setIsDiagnosticOpen(true);
                      }}
                      className="py-1 px-2 rounded-lg text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-1 transition-colors"
                      title={isRtl ? 'بررسی ۸ لایه ارتباط فرانت تا بک‌اند' : 'Run 8-layer diagnostic audit'}
                    >
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isRtl ? 'بررسی ارتباط فرانت-بک‌اند' : 'Diagnostic Audit'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedDeviceForEdit(device);
                          setIsAddEditOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title={isRtl ? 'ویرایش دیوایس' : 'Edit device'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(device.id, device.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title={isRtl ? 'حذف دیوایس' : 'Delete device'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <SshDeviceModal
        isOpen={isAddEditOpen}
        onClose={() => {
          setIsAddEditOpen(false);
          setSelectedDeviceForEdit(null);
        }}
        onSaved={loadData}
        device={selectedDeviceForEdit}
      />

      <DiagnosticModal
        isOpen={isDiagnosticOpen}
        onClose={() => {
          setIsDiagnosticOpen(false);
          setDiagnosticDevice(null);
        }}
        device={diagnosticDevice}
        onConnectTerminal={(dev) => {
          setTerminalDevice(dev);
          setIsTerminalOpen(true);
        }}
      />

      <FetchedDataModal
        isOpen={isFetchedDataOpen}
        onClose={() => {
          setIsFetchedDataOpen(false);
          setFetchedDataDevice(null);
        }}
        device={fetchedDataDevice}
        onRefetched={(updated) => {
          setDevices((prev) =>
            prev.map((d) =>
              d.id === fetchedDataDevice?.id
                ? { ...d, fetched_data: updated, last_fetched_at: updated.fetched_at, status: 'Online' }
                : d
            )
          );
        }}
      />

      <InteractiveTerminalModal
        isOpen={isTerminalOpen}
        onClose={() => {
          setIsTerminalOpen(false);
          setTerminalDevice(null);
        }}
        device={terminalDevice}
      />
    </div>
  );
};
