import React, { useState, useEffect, useCallback } from 'react';
import {
  Monitor,
  Plus,
  Search,
  RefreshCw,
  Power,
  Edit2,
  Trash2,
  Clock,
  Shield,
  Activity,
  Server,
  Zap,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  List,
  Info,
  ExternalLink,
  Laptop
} from 'lucide-react';
import {
  RemoteDevice,
  RemoteDeviceFormData,
  RemoteSessionResponse,
  RemoteDeviceTestResult
} from '../../types/remoteDesktop';
import {
  fetchRemoteDevices,
  createRemoteDevice,
  updateRemoteDevice,
  deleteRemoteDevice,
  testDeviceConnection,
  connectRemoteDevice,
  fetchRemoteDesktopHealth
} from '../../services/remoteDesktopApi';
import { AddRemoteDeviceModal } from './AddRemoteDeviceModal';
import { RemoteDesktopSessionView } from './RemoteDesktopSessionView';
import { useLanguage } from '../../i18n';

export const RemoteDesktopView: React.FC = () => {
  const { t, isRtl } = useLanguage();

  const [devices, setDevices] = useState<RemoteDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals & Active Session
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<RemoteDevice | null>(null);
  const [activeSession, setActiveSession] = useState<RemoteSessionResponse | null>(null);
  const [activeDevice, setActiveDevice] = useState<RemoteDevice | null>(null);

  // Testing status per device ID
  const [testingDeviceId, setTestingDeviceId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, RemoteDeviceTestResult>>({});
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);

  // System & guacd health
  const [healthInfo, setHealthInfo] = useState<{
    service: string;
    version: string;
    guacd_configured: string;
  } | null>(null);

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      const list = await fetchRemoteDevices();
      setDevices(list);
    } catch (err) {
      console.error('[RemoteDesktopView] Error fetching devices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHealth = useCallback(async () => {
    try {
      const h = await fetchRemoteDesktopHealth();
      setHealthInfo(h);
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    loadDevices();
    loadHealth();
  }, [loadDevices, loadHealth]);

  // Handle Save (Add or Update)
  const handleSaveDevice = async (formData: RemoteDeviceFormData, editId?: string) => {
    if (editId) {
      await updateRemoteDevice(editId, formData);
    } else {
      await createRemoteDevice(formData);
    }
    await loadDevices();
  };

  // Handle Delete
  const handleDeleteDevice = async (device: RemoteDevice) => {
    const confirmMsg = isRtl
      ? `آیا از حذف ماشین «${device.name}» اطمینان دارید؟`
      : `Are you sure you want to delete remote machine '${device.name}'?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteRemoteDevice(device.id);
      await loadDevices();
    } catch (err: any) {
      alert(err.message || 'Failed to delete device');
    }
  };

  // Handle Real Test Connection
  const handleTestDevice = async (device: RemoteDevice) => {
    setTestingDeviceId(device.id);
    try {
      const res = await testDeviceConnection(device.id);
      setTestResults(prev => ({ ...prev, [device.id]: res }));
      await loadDevices();
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [device.id]: {
          success: false,
          status: 'host_unreachable',
          message: err.message || 'Diagnostic failed'
        }
      }));
    } finally {
      setTestingDeviceId(null);
    }
  };

  // Handle Connect RDP Session
  const handleConnect = async (device: RemoteDevice) => {
    setConnectingDeviceId(device.id);
    try {
      const session = await connectRemoteDevice(device.id);
      setActiveSession(session);
      setActiveDevice(device);
    } catch (err: any) {
      alert(err.message || 'Failed to initialize RDP session. Please check if device is reachable.');
    } finally {
      setConnectingDeviceId(null);
    }
  };

  // Filter devices
  const filteredDevices = devices.filter(d => {
    const q = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.hostname.toLowerCase().includes(q) ||
      d.username.toLowerCase().includes(q) ||
      (d.domain && d.domain.toLowerCase().includes(q))
    );
  });

  // Render Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Online':
      case 'Connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
            <span>● {status}</span>
          </span>
        );
      case 'Connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
            <span>● Connecting</span>
          </span>
        );
      case 'Offline':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            <span>● Offline</span>
          </span>
        );
      case 'Error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-300 border border-red-500/30">
            <AlertCircle className="w-3 h-3 text-red-400" />
            <span>● Error</span>
          </span>
        );
      case 'Ready':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span>● Ready</span>
          </span>
        );
    }
  };

  // If a Remote Desktop session is currently active, render the session view
  if (activeSession && activeDevice) {
    return (
      <div className="h-[calc(100vh-7.5rem)] p-3 lg:p-4">
        <RemoteDesktopSessionView
          session={activeSession}
          device={activeDevice}
          onClose={() => {
            setActiveSession(null);
            setActiveDevice(null);
            loadDevices();
          }}
          onReconnect={() => {
            const dev = activeDevice;
            setActiveSession(null);
            setActiveDevice(null);
            handleConnect(dev);
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fadeIn" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-sky-500/15 border border-sky-400/30 text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.25)]">
            <Monitor className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl lg:text-2xl font-black text-white tracking-wide">
                {t('remote_test_title' as any) || 'Remote Test'}
              </h1>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold uppercase">
                RDP TCP/3389
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('remote_test_subtitle' as any) || 'Windows Remote Desktop'} • Apache Guacamole & guacd Gateway
            </p>
          </div>
        </div>

        {/* Top-Right Action: Add Remote Device Button */}
        <div className="flex items-center gap-3">
          {healthInfo && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>guacd: <b className="text-slate-200">{healthInfo.guacd_configured}</b></span>
            </div>
          )}

          <button
            onClick={() => {
              setEditingDevice(null);
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-sky-600/30 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{t('remote_test_add_device' as any) || '+ Add Remote Device'}</span>
          </button>
        </div>
      </div>

      {/* Control & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRtl ? 'جستجو بر اساس نام، IP یا نام کاربری...' : 'Search by name, IP, or username...'}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* View mode toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900/80 border border-white/10 text-slate-400">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'grid' ? 'bg-sky-500/20 text-sky-300' : 'hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'table' ? 'bg-sky-500/20 text-sky-300' : 'hover:text-white'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={loadDevices}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 transition cursor-pointer"
            title="Refresh devices"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Area: Configured Windows Machines */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
          <span className="text-xs">{isRtl ? 'در حال دریافت اطلاعات ماشین‌های ویندوز...' : 'Loading Windows remote machines...'}</span>
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 rounded-2xl border border-white/10 border-dashed space-y-3">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-500">
            <Laptop className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              {t('remote_test_no_devices' as any) || 'No Windows machines configured yet.'}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              {t('remote_test_no_devices_desc' as any) ||
                'Add a Windows machine with RDP enabled to connect directly in your browser.'}
            </p>
          </div>
          <button
            onClick={() => {
              setEditingDevice(null);
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('remote_test_add_device' as any) || '+ Add Remote Device'}</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices.map((device) => {
            const isConnecting = connectingDeviceId === device.id;
            const isTesting = testingDeviceId === device.id;
            const testRes = testResults[device.id];

            return (
              <div
                key={device.id}
                className="bg-slate-900/90 hover:bg-slate-900 border border-white/10 hover:border-sky-500/40 rounded-2xl p-5 shadow-lg transition-all duration-200 flex flex-col justify-between space-y-4 group relative"
              >
                {/* Card Header: Device Name & Status */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0">
                        <Monitor className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white truncate group-hover:text-sky-300 transition">
                          {device.name}
                        </h3>
                        <p className="font-mono text-xs text-cyan-300 mt-0.5">
                          {device.hostname}:{device.port}
                        </p>
                      </div>
                    </div>
                    {renderStatusBadge(device.connection_status)}
                  </div>

                  {/* Username & Domain */}
                  <div className="mt-3.5 space-y-1 text-xs text-slate-400 font-mono bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{t('remote_test_username' as any) || 'Username'}:</span>
                      <span className="text-slate-200 font-semibold">{device.username}</span>
                    </div>
                    {device.domain && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{t('remote_test_domain' as any) || 'Domain'}:</span>
                        <span className="text-slate-300">{device.domain}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-slate-500">{t('remote_test_last_connection' as any) || 'Last connection'}:</span>
                      <span className="text-slate-400 text-[11px]">
                        {device.last_connected_at
                          ? new Date(device.last_connected_at).toLocaleString()
                          : (t('remote_test_never' as any) || 'Never')}
                      </span>
                    </div>
                  </div>

                  {/* Last Test Diagnostic Result Badge if available */}
                  {testRes && (
                    <div
                      className={`mt-2 p-2 rounded-xl text-[11px] font-mono border flex items-center justify-between animate-fadeIn ${
                        testRes.success
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-red-500/10 border-red-500/30 text-red-300'
                      }`}
                    >
                      <span className="truncate">{testRes.message}</span>
                      {testRes.latency_ms && <span className="font-bold">{testRes.latency_ms}ms</span>}
                    </div>
                  )}
                </div>

                {/* Card Actions: Connect, Edit, Delete, Test */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleConnect(device)}
                    disabled={isConnecting}
                    className="flex-1 py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-sky-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isConnecting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Power className="w-3.5 h-3.5" />
                    )}
                    <span>{t('remote_test_btn_connect' as any) || 'Connect'}</span>
                  </button>

                  <button
                    onClick={() => handleTestDevice(device)}
                    disabled={isTesting}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-300 border border-white/10 transition cursor-pointer"
                    title={t('remote_test_btn_test' as any) || 'Test Connection'}
                  >
                    <Zap className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-cyan-400' : ''}`} />
                  </button>

                  <button
                    onClick={() => {
                      setEditingDevice(device);
                      setIsAddModalOpen(true);
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteDevice(device)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-red-500/15 text-slate-400 hover:text-red-400 border border-white/10 transition cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Detailed Table View */
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/80 shadow-lg">
          <table className="w-full text-left text-xs text-slate-300" dir={isRtl ? 'rtl' : 'ltr'}>
            <thead className="bg-slate-950/80 text-[11px] text-slate-400 uppercase tracking-wider font-mono border-b border-white/10">
              <tr>
                <th className="px-4 py-3">{t('remote_test_device_name' as any) || 'Device Name'}</th>
                <th className="px-4 py-3">{t('remote_test_hostname' as any) || 'IP / Hostname'}</th>
                <th className="px-4 py-3">{t('remote_test_port' as any) || 'RDP Port'}</th>
                <th className="px-4 py-3">{t('remote_test_username' as any) || 'Username'}</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">{t('remote_test_last_connection' as any) || 'Last Connection'}</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {filteredDevices.map((device) => {
                const isConnecting = connectingDeviceId === device.id;
                const isTesting = testingDeviceId === device.id;

                return (
                  <tr key={device.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 font-sans font-bold text-white">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>{device.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-cyan-300 font-semibold">{device.hostname}</td>
                    <td className="px-4 py-3">{device.port}</td>
                    <td className="px-4 py-3 text-slate-200">
                      {device.username}
                      {device.domain ? ` (${device.domain})` : ''}
                    </td>
                    <td className="px-4 py-3">{renderStatusBadge(device.connection_status)}</td>
                    <td className="px-4 py-3 text-slate-400 text-[11px]">
                      {device.last_connected_at
                        ? new Date(device.last_connected_at).toLocaleString()
                        : (t('remote_test_never' as any) || 'Never')}
                    </td>
                    <td className="px-4 py-3 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleConnect(device)}
                          disabled={isConnecting}
                          className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                        >
                          <Power className="w-3 h-3" />
                          <span>{t('remote_test_btn_connect' as any) || 'Connect'}</span>
                        </button>
                        <button
                          onClick={() => handleTestDevice(device)}
                          disabled={isTesting}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-300 border border-white/10 transition cursor-pointer"
                          title="Test Connection"
                        >
                          <Zap className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-cyan-400' : ''}`} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingDevice(device);
                            setIsAddModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDevice(device)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Device Modal */}
      <AddRemoteDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingDevice(null);
        }}
        onSave={handleSaveDevice}
        editDevice={editingDevice}
      />
    </div>
  );
};
