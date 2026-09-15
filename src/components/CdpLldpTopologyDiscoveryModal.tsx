import React, { useState, useMemo, useEffect } from 'react';
import {
  Radio,
  Network,
  Share2,
  Server,
  Search,
  Check,
  CheckSquare,
  Square,
  RefreshCw,
  Zap,
  Sliders,
  AlertCircle,
  X,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Layers,
  Shield,
  Wifi,
  Plus
} from 'lucide-react';
import { Device, DiscoveredNeighbor, DiscoveryMode } from '../types';
import { useLanguage } from '../i18n';
import { discoverCdpLldpNeighbors, importCdpLldpNeighbors } from '../services/api';

interface CdpLldpTopologyDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: Device[];
  preselectedDeviceId?: string | null;
  initialMode?: DiscoveryMode;
  onTopologyUpdated?: (message: string) => void;
}

export const CdpLldpTopologyDiscoveryModal: React.FC<CdpLldpTopologyDiscoveryModalProps> = ({
  isOpen,
  onClose,
  devices,
  preselectedDeviceId,
  initialMode = 'device',
  onTopologyUpdated,
}) => {
  const { t, isEn, language } = useLanguage();

  // Mode: 'device' | 'subnet' | 'local'
  const [mode, setMode] = useState<DiscoveryMode>(initialMode);

  // Switch or Router selection
  const switchOrRouterDevices = useMemo(() => {
    return devices.filter(
      (d) => d.type === 'switch' || d.type === 'router' || d.role?.toLowerCase().includes('core') || d.role?.toLowerCase().includes('dist')
    );
  }, [devices]);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
    if (preselectedDeviceId && devices.some((d) => d.id === preselectedDeviceId)) {
      return preselectedDeviceId;
    }
    return switchOrRouterDevices[0]?.id || devices[0]?.id || '';
  });

  // Target Subnet
  const [subnetInput, setSubnetInput] = useState<string>('192.168.1.0/24');

  // Protocol filter: 'all' | 'CDP' | 'LLDP'
  const [protocol, setProtocol] = useState<'all' | 'CDP' | 'LLDP'>('all');

  // State
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [discoveredNeighbors, setDiscoveredNeighbors] = useState<DiscoveredNeighbor[]>([]);
  const [selectedNeighborIds, setSelectedNeighborIds] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<'all' | 'new' | 'existing'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Update selectedDeviceId if preselectedDeviceId changes
  useEffect(() => {
    if (preselectedDeviceId && devices.some((d) => d.id === preselectedDeviceId)) {
      setSelectedDeviceId(preselectedDeviceId);
      setMode('device');
    }
  }, [preselectedDeviceId, devices]);

  if (!isOpen) return null;

  // Selected device object
  const activeDevice = devices.find((d) => d.id === selectedDeviceId);

  // Handle run discovery
  const handleRunDiscovery = async () => {
    setIsDiscovering(true);
    setStatusMessage(null);
    try {
      const res = await discoverCdpLldpNeighbors({
        mode,
        deviceId: mode === 'device' ? selectedDeviceId : undefined,
        subnet: mode === 'subnet' ? subnetInput.trim() : undefined,
        protocol,
      });

      setDiscoveredNeighbors(res.neighbors || []);

      // Auto-select all new neighbors by default
      const newIds = new Set<string>();
      (res.neighbors || []).forEach((n) => {
        if (!n.exists_in_topology) {
          newIds.add(n.id);
        }
      });
      setSelectedNeighborIds(newIds);

      setStatusMessage({
        type: 'success',
        text: isEn ? (res.message_en || res.message) : res.message,
      });
    } catch (err: any) {
      console.error('CDP/LLDP Discovery error:', err);
      setStatusMessage({
        type: 'error',
        text: isEn ? `Discovery failed: ${err.message}` : `خطا در کاوش همسایگان: ${err.message}`,
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  // Toggle selection
  const toggleNeighborSelection = (id: string) => {
    setSelectedNeighborIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all / Deselect all / Select new only
  const handleSelectAllNew = () => {
    const newIds = new Set<string>();
    discoveredNeighbors.forEach((n) => {
      if (!n.exists_in_topology) newIds.add(n.id);
    });
    setSelectedNeighborIds(newIds);
  };

  const handleSelectAll = () => {
    const allIds = new Set<string>(discoveredNeighbors.map((n) => n.id));
    setSelectedNeighborIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedNeighborIds(new Set());
  };

  // Filtered neighbors
  const filteredNeighbors = useMemo(() => {
    return discoveredNeighbors.filter((n) => {
      if (filterType === 'new' && n.exists_in_topology) return false;
      if (filterType === 'existing' && !n.exists_in_topology) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        n.neighbor_name.toLowerCase().includes(q) ||
        n.neighbor_ip.toLowerCase().includes(q) ||
        n.neighbor_model.toLowerCase().includes(q) ||
        n.local_port.toLowerCase().includes(q) ||
        n.neighbor_port.toLowerCase().includes(q) ||
        (n.capabilities && n.capabilities.toLowerCase().includes(q))
      );
    });
  }, [discoveredNeighbors, filterType, searchQuery]);

  // Handle Import to Topology
  const handleImportToTopology = async () => {
    if (selectedNeighborIds.size === 0) return;

    const neighborsToImport = discoveredNeighbors.filter((n) =>
      selectedNeighborIds.has(n.id)
    );

    setIsImporting(true);
    setStatusMessage(null);

    try {
      const res = await importCdpLldpNeighbors(neighborsToImport);

      // Smart position placement on canvas
      try {
        const storedPositionsRaw = localStorage.getItem('net_topology_node_positions');
        let currentPositions: Record<string, { x: number; y: number }> = storedPositionsRaw
          ? JSON.parse(storedPositionsRaw)
          : {};

        // Find reference coordinates of the local device or center
        const refId = neighborsToImport[0]?.local_device_id || selectedDeviceId;
        const refPos = currentPositions[refId] || { x: 500, y: 350 };

        // Position newly added devices radially around reference device
        const addedDevs = res.added_devices || [];
        const radius = 230;
        addedDevs.forEach((dev: any, idx: number) => {
          const angle = (idx * (2 * Math.PI)) / Math.max(addedDevs.length, 1);
          const newX = Math.round(refPos.x + radius * Math.cos(angle));
          const newY = Math.round(refPos.y + radius * Math.sin(angle));
          currentPositions[dev.id] = { x: newX, y: newY };
        });

        localStorage.setItem('net_topology_node_positions', JSON.stringify(currentPositions));
      } catch (posErr) {
        console.warn('Could not save node canvas positions:', posErr);
      }

      const successMsg = isEn
        ? (res.message_en || res.message)
        : res.message;

      setStatusMessage({
        type: 'success',
        text: successMsg,
      });

      if (onTopologyUpdated) {
        onTopologyUpdated(successMsg);
      }

      // Re-run discovery to refresh table statuses
      setTimeout(() => {
        handleRunDiscovery();
      }, 600);
    } catch (err: any) {
      console.error('Import error:', err);
      setStatusMessage({
        type: 'error',
        text: isEn ? `Import failed: ${err.message}` : `خطا در ثبت در توپولوژی: ${err.message}`,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const newCount = discoveredNeighbors.filter((n) => !n.exists_in_topology).length;
  const existingCount = discoveredNeighbors.filter((n) => n.exists_in_topology).length;
  const cdpCount = discoveredNeighbors.filter((n) => n.protocol === 'CDP').length;
  const lldpCount = discoveredNeighbors.filter((n) => n.protocol === 'LLDP').length;

  return (
    <div
      data-modal-backdrop="true"
      className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-5 modal-backdrop-blur"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900/95 border border-white/20 text-slate-100 shadow-2xl overflow-hidden backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shadow-inner">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  {t('cdp_modal_title')}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Layer 2 Topology Discovery
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl line-clamp-1">
                {t('cdp_modal_subtitle')}
              </p>
            </div>
          </div>
          <button
            id="btn-close-cdp-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
            title={t('scanner_msg_close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Method Selection Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Tab 1: Specific Switch */}
            <button
              id="tab-cdp-mode-device"
              type="button"
              onClick={() => setMode('device')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-start transition ${
                mode === 'device'
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-md shadow-emerald-900/30'
                  : 'bg-slate-800/50 border-white/10 text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  mode === 'device' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-700 text-slate-300'
                }`}
              >
                <Server className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold leading-snug">{t('cdp_tab_switch')}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {isEn ? 'Direct Cisco / MikroTik query' : 'پرس‌وجوی مستقیم سوئیچ'}
                </div>
              </div>
            </button>

            {/* Tab 2: Subnet Range */}
            <button
              id="tab-cdp-mode-subnet"
              type="button"
              onClick={() => setMode('subnet')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-start transition ${
                mode === 'subnet'
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-md shadow-emerald-900/30'
                  : 'bg-slate-800/50 border-white/10 text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  mode === 'subnet' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-700 text-slate-300'
                }`}
              >
                <Network className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold leading-snug">{t('cdp_tab_subnet')}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {isEn ? 'CIDR network address sweep' : 'اسکن رنج شبکه (CIDR)'}
                </div>
              </div>
            </button>

            {/* Tab 3: Local Network */}
            <button
              id="tab-cdp-mode-local"
              type="button"
              onClick={() => setMode('local')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-start transition ${
                mode === 'local'
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-md shadow-emerald-900/30'
                  : 'bg-slate-800/50 border-white/10 text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  mode === 'local' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-700 text-slate-300'
                }`}
              >
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold leading-snug">{t('cdp_tab_local')}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {isEn ? 'Host interface multicast sniff' : 'کارت شبکه محلی سرور'}
                </div>
              </div>
            </button>
          </div>

          {/* Mode-specific Controls */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10 space-y-4">
            {mode === 'device' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {t('cdp_select_switch_label')}
                  </label>
                  <div className="relative">
                    <select
                      id="select-cdp-source-device"
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/20 text-white text-xs font-medium focus:outline-none focus:border-emerald-500 appearance-none"
                    >
                      {switchOrRouterDevices.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.ip}) - {d.model || d.type} [{d.role}]
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute end-3 top-3 pointer-events-none" />
                  </div>
                  {activeDevice && (
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                      <span className="font-mono text-emerald-400">{activeDevice.ip}</span>
                      <span>•</span>
                      <span>{activeDevice.model}</span>
                      <span>•</span>
                      <span className={activeDevice.is_online ? 'text-emerald-400' : 'text-rose-400'}>
                        {activeDevice.is_online ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {t('cdp_protocol_label')}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setProtocol('all')}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition ${
                        protocol === 'all'
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-900 text-slate-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {t('cdp_protocol_all')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProtocol('CDP')}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition ${
                        protocol === 'CDP'
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-900 text-slate-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {t('cdp_protocol_cdp')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProtocol('LLDP')}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition ${
                        protocol === 'LLDP'
                          ? 'bg-cyan-600 text-white border-cyan-500'
                          : 'bg-slate-900 text-slate-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {t('cdp_protocol_lldp')}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {t('cdp_switch_desc')}
                  </p>
                </div>
              </div>
            )}

            {mode === 'subnet' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {t('cdp_subnet_label')}
                  </label>
                  <input
                    id="input-cdp-subnet"
                    type="text"
                    value={subnetInput}
                    onChange={(e) => setSubnetInput(e.target.value)}
                    placeholder={t('cdp_subnet_placeholder')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/20 text-white text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-400">{isEn ? 'Presets:' : 'پیش‌فرض‌ها:'}</span>
                    {['192.168.1.0/24', '10.0.0.0/24', '172.16.0.0/24'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSubnetInput(preset)}
                        className="px-2 py-0.5 rounded-md bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-[10px] font-mono transition"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {t('cdp_protocol_label')}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setProtocol('all')}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition ${
                        protocol === 'all'
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-900 text-slate-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {t('cdp_protocol_all')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProtocol('CDP')}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition ${
                        protocol === 'CDP'
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-900 text-slate-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {t('cdp_protocol_cdp')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProtocol('LLDP')}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition ${
                        protocol === 'LLDP'
                          ? 'bg-cyan-600 text-white border-cyan-500'
                          : 'bg-slate-900 text-slate-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {t('cdp_protocol_lldp')}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {t('cdp_subnet_desc')}
                  </p>
                </div>
              </div>
            )}

            {mode === 'local' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-white/10 space-y-1">
                    <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Host Physical / Virtual Interfaces' : 'اینترفیس‌های فیزیکی و مجازی سرور'}</span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      {isEn
                        ? 'Sniffs CDP (01:00:0C:CC:CC:CC) and LLDP (01:80:C2:00:00:0E) multicast frames.'
                        : 'شنود بسته‌های مالتی‌کست CDP سیسکو و LLDP استاندارد بر روی کارت شبکه سرور.'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {t('cdp_protocol_label')}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setProtocol('all')}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition ${
                        protocol === 'all'
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-900 text-slate-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {t('cdp_protocol_all')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProtocol('CDP')}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition ${
                        protocol === 'CDP'
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-900 text-slate-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {t('cdp_protocol_cdp')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProtocol('LLDP')}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition ${
                        protocol === 'LLDP'
                          ? 'bg-cyan-600 text-white border-cyan-500'
                          : 'bg-slate-900 text-slate-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {t('cdp_protocol_lldp')}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {t('cdp_local_desc')}
                  </p>
                </div>
              </div>
            )}

            {/* Run Button */}
            <div className="flex justify-end pt-1">
              <button
                id="btn-run-cdp-discovery"
                type="button"
                onClick={handleRunDiscovery}
                disabled={isDiscovering}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isDiscovering ? 'animate-spin' : ''}`} />
                <span>{isDiscovering ? t('cdp_btn_discovering') : t('cdp_btn_start_discovery')}</span>
              </button>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Results Section */}
          {discoveredNeighbors.length > 0 && (
            <div className="space-y-4">
              {/* Metric badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-white/10">
                  <div className="text-[10px] text-slate-400">{isEn ? 'Total Discovered' : 'کل همسایگان'}</div>
                  <div className="text-lg font-bold text-white mt-0.5">{discoveredNeighbors.length}</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-900/25 border border-emerald-500/30">
                  <div className="text-[10px] text-emerald-300">{isEn ? 'New Candidates' : 'سوئیچ و روتر جدید'}</div>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">{newCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-indigo-900/25 border border-indigo-500/30">
                  <div className="text-[10px] text-indigo-300">CDP Protocol</div>
                  <div className="text-lg font-bold text-indigo-400 mt-0.5">{cdpCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-cyan-900/25 border border-cyan-500/30">
                  <div className="text-[10px] text-cyan-300">IEEE LLDP</div>
                  <div className="text-lg font-bold text-cyan-400 mt-0.5">{lldpCount}</div>
                </div>
              </div>

              {/* Filtering and Bulk Selection */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      filterType === 'all'
                        ? 'bg-slate-700 text-white border-white/20'
                        : 'bg-slate-800/40 text-slate-400 border-transparent hover:text-white'
                    }`}
                  >
                    {t('cdp_filter_all')} ({discoveredNeighbors.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('new')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      filterType === 'new'
                        ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-800/40 text-slate-400 border-transparent hover:text-emerald-300'
                    }`}
                  >
                    {t('cdp_filter_new')} ({newCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('existing')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      filterType === 'existing'
                        ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                        : 'bg-slate-800/40 text-slate-400 border-transparent hover:text-indigo-300'
                    }`}
                  >
                    {t('cdp_filter_existing')} ({existingCount})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('cdp_search_placeholder')}
                      className="ps-8 pe-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-44 sm:w-56"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSelectAllNew}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-medium border border-white/10 transition"
                  >
                    {t('cdp_select_all_new')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-white/10 transition"
                  >
                    {t('cdp_select_all')}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium border border-white/10 transition"
                  >
                    {t('cdp_deselect_all')}
                  </button>
                </div>
              </div>

              {/* Neighbors Cards / Table */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-800/40">
                <div className="divide-y divide-white/5">
                  {filteredNeighbors.map((n) => {
                    const isSelected = selectedNeighborIds.has(n.id);
                    return (
                      <div
                        key={n.id}
                        onClick={() => toggleNeighborSelection(n.id)}
                        className={`p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer transition ${
                          isSelected ? 'bg-emerald-950/20 hover:bg-emerald-950/30' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleNeighborSelection(n.id);
                            }}
                            className="text-slate-400 hover:text-white"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-500" />
                            )}
                          </button>

                          {/* Local -> Remote Port Mapping */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-xs font-mono">
                                {n.neighbor_name}
                              </span>

                              {/* Status badge */}
                              {n.exists_in_topology ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  {t('cdp_status_existing')}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                  <Plus className="w-3 h-3" />
                                  <span>{t('cdp_status_new')}</span>
                                </span>
                              )}

                              {/* Capabilities badge */}
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-300">
                                {n.capabilities || 'Switch'}
                              </span>

                              {/* Protocol badge */}
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  n.protocol === 'CDP'
                                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                                    : 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/30'
                                }`}
                              >
                                {n.protocol}
                              </span>

                              {/* Vendor badge */}
                              {n.neighbor_vendor && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-white/10">
                                  {n.neighbor_vendor}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                              <span className="font-mono text-cyan-300">{n.neighbor_ip}</span>
                              <span>•</span>
                              <span>{n.neighbor_model}</span>
                              <span>•</span>
                              <span>VLAN {n.vlan || 1}</span>
                            </div>
                          </div>
                        </div>

                        {/* Physical Connection Link Detail */}
                        <div className="flex items-center gap-2 text-xs bg-slate-900/80 px-3 py-1.5 rounded-lg border border-white/10 self-stretch sm:self-auto justify-between sm:justify-start font-mono">
                          <span className="text-slate-300">{n.local_port}</span>
                          <span className="text-emerald-400 font-bold px-1">&lt;---&gt;</span>
                          <span className="text-cyan-300 font-bold">{n.neighbor_port}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {discoveredNeighbors.length === 0 && !isDiscovering && (
            <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-slate-800/30">
              <div className="p-3 rounded-full bg-slate-800 inline-block text-slate-400 mb-2">
                <Radio className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-300 font-medium">
                {isEn
                  ? 'Select discovery method above and click "Run CDP / LLDP Discovery" to detect neighbor equipment.'
                  : 'یکی از روش‌های کاوش فوق را انتخاب کرده و دکمه «شروع کاوش همسایگان با CDP/LLDP» را بزنید.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-white/10 bg-slate-800/90">
          <div className="text-xs text-slate-300">
            {selectedNeighborIds.size > 0 ? (
              <span className="font-semibold text-emerald-400">
                {t('cdp_selected_count', { count: selectedNeighborIds.size })}
              </span>
            ) : (
              <span className="text-slate-400">
                {isEn ? 'Select neighbors from list above to add' : 'تجهیزات مورد نظر را جهت افزودن به توپولوژی علامت بزنید'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-white/10 transition active:scale-95"
            >
              {t('scanner_msg_close')}
            </button>

            <button
              id="btn-import-cdp-topology"
              type="button"
              onClick={handleImportToTopology}
              disabled={selectedNeighborIds.size === 0 || isImporting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/40 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className={`w-4 h-4 ${isImporting ? 'animate-spin' : ''}`} />
              <span>
                {isImporting
                  ? t('cdp_btn_adding')
                  : t('cdp_btn_add_to_topology', { count: selectedNeighborIds.size })}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
