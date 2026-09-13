import React, { useState, useEffect } from 'react';
import { Server, Cable, Zap, Shield, ShieldCheck, Search, Filter, Edit3, Save, CheckCircle2, AlertCircle, Layers, Check, X, AlertTriangle, Terminal, Lock } from 'lucide-react';
import { Device, SwitchPort, VlanInfo } from '../types';
import { fetchDevicePorts, updateSwitchPort, batchUpdateSwitchPorts, fetchVlans, applySwitchPortConfigViaSsh } from '../services/api';
import { CiscoPortContextMenu } from './CiscoPortContextMenu';
import { CiscoCommandConfirmModal } from './CiscoCommandConfirmModal';
import { AssignVlanModal } from './AssignVlanModal';
import { NetworkPortSvg } from './NetworkPortSvg';
import { useLanguage } from '../i18n/LanguageContext';

interface PortManagementViewProps {
  devices: Device[];
}

export const PortManagementView: React.FC<PortManagementViewProps> = ({ devices }) => {
  const { t, isRtl, isEn } = useLanguage();
  const switchesAndRouters = devices.filter((d) => d.type === 'switch' || d.type === 'router');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(
    switchesAndRouters[0]?.id || devices[0]?.id || ''
  );
  const [ports, setPorts] = useState<SwitchPort[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPort, setSelectedPort] = useState<SwitchPort | null>(null);

  // Multi-port selection and batch operations
  const [selectedPortIds, setSelectedPortIds] = useState<string[]>([]);
  const [isBatchApplying, setIsBatchApplying] = useState(false);
  const [batchSuccessMessage, setBatchSuccessMessage] = useState<string | null>(null);

  // Batch edit form values
  const [batchAdminStatus, setBatchAdminStatus] = useState<'no_change' | 'enabled' | 'disabled'>('no_change');
  const [batchMode, setBatchMode] = useState<'no_change' | 'access' | 'trunk'>('no_change');
  const [batchVlan, setBatchVlan] = useState<string>(''); // empty means no change
  const [batchAllowedVlans, setBatchAllowedVlans] = useState<string>('');
  const [batchPortSec, setBatchPortSec] = useState<'no_change' | 'enabled' | 'disabled'>('no_change');
  const [batchPortSecMode, setBatchPortSecMode] = useState<'sticky' | 'dynamic' | 'configured'>('sticky');
  const [batchPortSecMaxMac, setBatchPortSecMaxMac] = useState<number>(1);

  // Right-click Cisco Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    port: SwitchPort;
  } | null>(null);

  // Edit port state
  const [isEditing, setIsEditing] = useState(false);
  const [editAdminStatus, setEditAdminStatus] = useState<'enabled' | 'disabled'>('enabled');
  const [editMode, setEditMode] = useState<'trunk' | 'access'>('access');
  const [editVlan, setEditVlan] = useState(1);
  const [editAllowedVlans, setEditAllowedVlans] = useState('');
  const [editConnected, setEditConnected] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPortSecEnabled, setEditPortSecEnabled] = useState(false);
  const [editPortSecMaxMac, setEditPortSecMaxMac] = useState(1);
  const [editPortSecMode, setEditPortSecMode] = useState<'sticky' | 'dynamic' | 'configured'>('sticky');
  const [editPortSecConfiguredMac, setEditPortSecConfiguredMac] = useState('');
  const [editPortSecViolation, setEditPortSecViolation] = useState<'shutdown' | 'restrict' | 'protect'>('shutdown');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [availableVlans, setAvailableVlans] = useState<VlanInfo[]>([]);
  const [portStatusFeedback, setPortStatusFeedback] = useState<{ text: string; isSuccess: boolean } | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'up' | 'down' | 'trunk' | 'access'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const currentDevice = devices.find((d) => d.id === selectedDeviceId);

  useEffect(() => {
    if (selectedDeviceId) {
      loadPorts(selectedDeviceId);
      fetchVlans()
        .then((res) => {
          if (res && res.vlans) {
            setAvailableVlans(res.vlans);
          }
        })
        .catch((err) => console.error('Failed to load VLANs in PortManagementView:', err));
    }
  }, [selectedDeviceId]);

  const loadPorts = async (devId: string) => {
    try {
      setLoading(true);
      const res = await fetchDevicePorts(devId);
      setPorts(res.ports);
      if (res.ports.length > 0) {
        setSelectedPort(res.ports[0]);
        setSelectedPortIds([res.ports[0].port_id]);
      }
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePortClick = (e: React.MouseEvent, port: SwitchPort) => {
    setBatchSuccessMessage(null);
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      setSelectedPortIds((prev) => {
        const exists = prev.includes(port.port_id);
        let updated: string[];
        if (exists) {
          updated = prev.filter((id) => id !== port.port_id);
          if (updated.length === 0) updated = [port.port_id];
        } else {
          updated = [...prev, port.port_id];
        }
        return updated;
      });
      setSelectedPort(port);
      setIsEditing(false);
    } else {
      setSelectedPort(port);
      setSelectedPortIds([port.port_id]);
      setIsEditing(false);
    }
  };

  const handleApplyBatch = async () => {
    if (!currentDevice || selectedPortIds.length <= 1) return;
    try {
      setIsBatchApplying(true);
      setBatchSuccessMessage(null);

      const updates: Partial<SwitchPort> = {};
      if (batchAdminStatus !== 'no_change') {
        updates.admin_status = batchAdminStatus;
        updates.status = batchAdminStatus === 'disabled' ? 'down' : 'up';
      }
      if (batchMode !== 'no_change') {
        updates.mode = batchMode;
      }
      if (batchVlan.trim() !== '') {
        const v = parseInt(batchVlan.trim(), 10);
        if (!isNaN(v) && v >= 1 && v <= 4094) {
          updates.vlan = v;
        }
      }
      if (batchAllowedVlans.trim() !== '') {
        updates.allowed_vlans = batchAllowedVlans.trim();
      }
      if (batchPortSec !== 'no_change') {
        updates.port_security_enabled = batchPortSec === 'enabled';
        if (batchPortSec === 'enabled') {
          updates.port_security_mode = batchPortSecMode;
          updates.port_security_max_mac = batchPortSecMaxMac;
        }
      }

      const res = await batchUpdateSwitchPorts(currentDevice.id, selectedPortIds, updates);

      const updatedPortMap = new Map(res.ports.map((p) => [p.port_id, p]));
      setPorts((prev) => prev.map((p) => updatedPortMap.get(p.port_id) || p));

      if (selectedPort && updatedPortMap.has(selectedPort.port_id)) {
        setSelectedPort(updatedPortMap.get(selectedPort.port_id)!);
      }

      currentDevice.has_unsaved_changes = true;
      setBatchSuccessMessage(
        isEn
          ? `Successfully applied batch configuration to ${res.updatedCount} ports!`
          : `تنظیمات با موفقیت روی ${res.updatedCount} پورت اعمال شد!`
      );

      setBatchAdminStatus('no_change');
      setBatchMode('no_change');
      setBatchVlan('');
      setBatchAllowedVlans('');
      setBatchPortSec('no_change');
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsBatchApplying(false);
    }
  };

  // Right-click action confirmation modal state (Yes/No with device CLI preview)
  const [confirmModalState, setConfirmModalState] = useState<{
    action: 'shutdown' | 'no_shutdown' | 'mode_trunk' | 'mode_access' | 'port_sec_disable';
    port: SwitchPort;
  } | null>(null);
  const [isExecutingConfirmAction, setIsExecutingConfirmAction] = useState(false);

  // Assign Access VLAN modal state
  const [vlanAssignModalPort, setVlanAssignModalPort] = useState<SwitchPort | null>(null);
  const [isAssigningVlan, setIsAssigningVlan] = useState(false);

  const handleExecuteContextMenuAction = async (action: string, extra?: any) => {
    if (!contextMenu || !currentDevice) return;
    const targetPort = contextMenu.port;

    // 1. Enable Port Security: Open edit mode directly for user configuration
    if (action === 'port_sec_enable') {
      startEdit(targetPort);
      setEditMode('access');
      setContextMenu(null);
      return;
    }

    // 2. Assign Access VLAN: Open dedicated modal with device VLAN list & custom input
    if (action === 'open_assign_vlan' || action === 'change_vlan') {
      setContextMenu(null);
      setVlanAssignModalPort(targetPort);
      return;
    }

    // 3. For other actions: Open confirmation dialog with CLI preview
    setContextMenu(null);
    setConfirmModalState({
      action: action as any,
      port: targetPort,
    });
  };

  const handleConfirmExecuteCommand = async () => {
    if (!confirmModalState || !currentDevice) return;
    const { action, port: targetPort } = confirmModalState;
    let updates: Partial<SwitchPort> = {};

    switch (action) {
      case 'shutdown':
        updates = { admin_status: 'disabled', status: 'down' };
        break;
      case 'no_shutdown':
        updates = { admin_status: 'enabled', status: 'up' };
        break;
      case 'mode_trunk':
        updates = { mode: 'trunk' };
        break;
      case 'mode_access':
        updates = { mode: 'access' };
        break;
      case 'port_sec_disable':
        updates = { port_security_enabled: false };
        break;
      default:
        break;
    }

    try {
      setIsExecutingConfirmAction(true);
      await updateSwitchPort(currentDevice.id, targetPort.port_id, updates);
      setPorts((prev) =>
        prev.map((p) => (p.port_id === targetPort.port_id ? { ...p, ...updates } : p))
      );
      if (selectedPort?.port_id === targetPort.port_id) {
        setSelectedPort((prev) => (prev ? { ...prev, ...updates } : null));
      }
      setConfirmModalState(null);
    } catch (err: any) {
      console.error('Failed to update port from context menu:', err);
    } finally {
      setIsExecutingConfirmAction(false);
    }
  };

  const handleConfirmAssignVlan = async (newVlan: number) => {
    if (!vlanAssignModalPort || !currentDevice) return;
    const targetPort = vlanAssignModalPort;
    const updates: Partial<SwitchPort> = {
      vlan: newVlan,
      mode: 'access',
    };

    try {
      setIsAssigningVlan(true);
      await updateSwitchPort(currentDevice.id, targetPort.port_id, updates);
      setPorts((prev) =>
        prev.map((p) => (p.port_id === targetPort.port_id ? { ...p, ...updates } : p))
      );
      if (selectedPort?.port_id === targetPort.port_id) {
        setSelectedPort((prev) => (prev ? { ...prev, ...updates } : null));
      }
      setVlanAssignModalPort(null);
    } catch (err: any) {
      console.error('Failed to assign VLAN:', err);
    } finally {
      setIsAssigningVlan(false);
    }
  };

  const startEdit = (port: SwitchPort) => {
    setSelectedPort(port);
    setEditAdminStatus(port.admin_status);
    setEditMode(port.mode);
    setEditVlan(port.vlan);
    setEditAllowedVlans(port.allowed_vlans || '');
    setEditConnected(port.connected_device || '');
    setEditDesc(port.description || '');
    setEditPortSecEnabled(!!port.port_security_enabled);
    setEditPortSecMaxMac(port.port_security_max_mac || 1);
    setEditPortSecMode(port.port_security_mode || 'sticky');
    setEditPortSecConfiguredMac(port.port_security_configured_mac || '');
    setEditPortSecViolation(port.port_security_violation || 'shutdown');
    setIsEditing(true);
    setPortStatusFeedback(null);

    setTimeout(() => {
      const el = document.getElementById('port-mgmt-edit-card');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
  };

  // Open mandatory Configuration Preview before applying to physical switch
  const handleSavePort = () => {
    if (!currentDevice || !selectedPort) return;
    setShowPreviewModal(true);
  };

  const generatePortMgmtConfigPreview = () => {
    if (!selectedPort) return '';
    const lines = [`interface ${selectedPort.port_id}`];
    if (editMode === 'trunk') {
      lines.push('switchport mode trunk');
      if (editAllowedVlans) lines.push(`switchport trunk allowed vlan ${editAllowedVlans}`);
    } else {
      lines.push('switchport mode access');
      lines.push(`switchport access vlan ${editVlan}`);
    }
    if (editPortSecEnabled) {
      if (editMode !== 'access') lines.push('switchport mode access');
      lines.push('switchport port-security');
      lines.push(`switchport port-security maximum ${editPortSecMaxMac}`);
      if (editPortSecMode === 'sticky') lines.push('switchport port-security mac-address sticky');
      else if (editPortSecMode === 'configured' && editPortSecConfiguredMac) lines.push(`switchport port-security mac-address ${editPortSecConfiguredMac}`);
      lines.push(`switchport port-security violation ${editPortSecViolation}`);
    } else if (selectedPort.port_security_enabled && !editPortSecEnabled) {
      lines.push('no switchport port-security');
    }
    if (editAdminStatus === 'disabled') lines.push('shutdown');
    else lines.push('no shutdown');
    if (editDesc) lines.push(`description ${editDesc}`);
    return lines.join('\n');
  };

  const handleConfirmApplyConfig = async () => {
    if (!currentDevice || !selectedPort) return;
    try {
      setIsSaving(true);
      setPortStatusFeedback(null);

      let actionType: 'change_vlan' | 'port_security' | 'admin_status' | 'mode' | 'description' | 'allowed_vlans' | 'port_config' = 'port_config';
      let oldVal: any = selectedPort.vlan;
      let newVal: any = editVlan;

      if (selectedPort.vlan !== editVlan) {
        actionType = 'change_vlan';
        oldVal = selectedPort.vlan;
        newVal = editVlan;
      } else if (Boolean(selectedPort.port_security_enabled) !== editPortSecEnabled) {
        actionType = 'port_security';
        oldVal = Boolean(selectedPort.port_security_enabled);
        newVal = editPortSecEnabled;
      } else if (selectedPort.admin_status !== editAdminStatus) {
        actionType = 'admin_status';
        oldVal = selectedPort.admin_status;
        newVal = editAdminStatus;
      } else if (selectedPort.mode !== editMode) {
        actionType = 'mode';
        oldVal = selectedPort.mode;
        newVal = editMode;
      }

      const updatesPayload: Partial<SwitchPort> = {
        admin_status: editAdminStatus,
        status: editAdminStatus === 'disabled' ? 'down' : 'up',
        mode: editMode,
        vlan: editVlan,
        allowed_vlans: editAllowedVlans,
        connected_device: editConnected,
        description: editDesc,
        port_security_enabled: editPortSecEnabled,
        port_security_max_mac: editPortSecMaxMac,
        port_security_mode: editPortSecMode,
        port_security_configured_mac: editPortSecConfiguredMac,
        port_security_violation: editPortSecViolation,
      };

      const rawCommands = [
        'configure terminal',
        `interface ${selectedPort.port_id}`,
        editMode === 'trunk' ? 'switchport mode trunk' : 'switchport mode access',
        editMode === 'trunk' && editAllowedVlans ? `switchport trunk allowed vlan ${editAllowedVlans}` : `switchport access vlan ${editVlan}`,
        editPortSecEnabled ? 'switchport port-security' : (selectedPort.port_security_enabled ? 'no switchport port-security' : ''),
        editPortSecEnabled ? `switchport port-security maximum ${editPortSecMaxMac}` : '',
        editPortSecEnabled && editPortSecMode === 'sticky' ? 'switchport port-security mac-address sticky' : '',
        editPortSecEnabled && editPortSecMode === 'configured' && editPortSecConfiguredMac ? `switchport port-security mac-address ${editPortSecConfiguredMac}` : '',
        editPortSecEnabled ? `switchport port-security violation ${editPortSecViolation}` : '',
        editAdminStatus === 'disabled' ? 'shutdown' : 'no shutdown',
        editDesc ? `description ${editDesc}` : '',
        'exit',
        'end',
      ].filter(Boolean);

      const res = await applySwitchPortConfigViaSsh({
        deviceId: currentDevice.id,
        interface: selectedPort.port_id,
        action: actionType,
        oldValue: oldVal,
        newValue: newVal,
        updates: updatesPayload,
        commands: rawCommands,
      });

      if (res.success) {
        // Refresh ports after real switch configuration
        await loadPorts(currentDevice.id);
        if (res.verifiedPort) {
          setSelectedPort(res.verifiedPort);
        }
        setIsEditing(false);
        setShowPreviewModal(false);
        setPortStatusFeedback({
          text: isEn
            ? `Success: Configuration applied successfully on switch ${currentDevice.name} (${selectedPort.name || selectedPort.port_id}).`
            : `Success: Configuration applied successfully. (پیکربندی با موفقیت روی سوئیچ ${currentDevice.name} اینترفیس ${selectedPort.name || selectedPort.port_id} اعمال شد)`,
          isSuccess: true,
        });
      } else {
        // Revert form values on failure
        setEditAdminStatus(selectedPort.admin_status);
        setEditMode(selectedPort.mode);
        setEditVlan(selectedPort.vlan);
        setEditAllowedVlans(selectedPort.allowed_vlans || '');
        setEditConnected(selectedPort.connected_device || '');
        setEditDesc(selectedPort.description || '');
        setEditPortSecEnabled(!!selectedPort.port_security_enabled);
        setEditPortSecMaxMac(selectedPort.port_security_max_mac || 1);
        setEditPortSecMode(selectedPort.port_security_mode || 'sticky');
        setEditPortSecConfiguredMac(selectedPort.port_security_configured_mac || '');
        setEditPortSecViolation(selectedPort.port_security_violation || 'shutdown');

        setPortStatusFeedback({
          text: isEn
            ? `Failed: Configuration failed. ${res.error || 'Switch rejected commands or unreachable'}`
            : `Failed: Configuration failed. (${res.error || 'ارتباط با سوئیچ برقرار نشد یا دستور رد شد'})`,
          isSuccess: false,
        });
      }
    } catch (err: any) {
      setEditAdminStatus(selectedPort.admin_status);
      setEditMode(selectedPort.mode);
      setEditVlan(selectedPort.vlan);
      setEditAllowedVlans(selectedPort.allowed_vlans || '');
      setEditConnected(selectedPort.connected_device || '');
      setEditDesc(selectedPort.description || '');
      setEditPortSecEnabled(!!selectedPort.port_security_enabled);
      setEditPortSecMaxMac(selectedPort.port_security_max_mac || 1);
      setEditPortSecMode(selectedPort.port_security_mode || 'sticky');
      setEditPortSecConfiguredMac(selectedPort.port_security_configured_mac || '');
      setEditPortSecViolation(selectedPort.port_security_violation || 'shutdown');

      setPortStatusFeedback({
        text: isEn
          ? `Failed: Configuration failed. ${err.message}`
          : `Failed: Configuration failed. (${err.message})`,
        isSuccess: false,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPorts = ports.filter((p) => {
    if (filterMode === 'up' && p.status !== 'up') return false;
    if (filterMode === 'down' && p.status !== 'down') return false;
    if (filterMode === 'trunk' && p.mode !== 'trunk') return false;
    if (filterMode === 'access' && p.mode !== 'access') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.port_id.toLowerCase().includes(q) ||
        p.connected_device.toLowerCase().includes(q) ||
        String(p.vlan).includes(q) ||
        p.mode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCount = ports.filter((p) => p.status === 'up').length;
  const inactiveCount = ports.filter((p) => p.status === 'down').length;
  const trunkCount = ports.filter((p) => p.mode === 'trunk').length;

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`p-4 space-y-4 max-w-7xl mx-auto ${isRtl ? 'text-right' : 'text-left'}`}
    >
      {/* Header & Switch Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 spatial-glass p-3.5 rounded-xl border border-white/10 shadow-lg backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Cable className="w-5 h-5 text-indigo-400" />
              <span>{t('ports_title')}</span>
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-bold">
              {t('ports_tag')}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('ports_subtitle')}
          </p>
        </div>

        {/* Switch Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-300 font-medium">{t('ports_select_device')}</span>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-black/30 border border-white/15 text-indigo-300 font-mono text-xs focus:outline-none focus:border-indigo-400 font-semibold shadow-inner"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                {d.name} ({d.ip}) - {d.role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Device Banner */}
      {currentDevice && (
        <div className="p-3.5 rounded-xl spatial-glass border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-md">
              <Server className="w-5 h-5 text-cyan-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white font-mono text-sm">{currentDevice.name}</span>
                <span className="text-cyan-300 font-mono font-bold">({currentDevice.ip})</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    currentDevice.is_online
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {currentDevice.is_online ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {t('topology_details_model')}: {currentDevice.model} • {t('topology_details_building')}: {currentDevice.building} • {t('topology_details_floor')}: {currentDevice.floor} •{' '}
                {t('topology_details_unit')}: {currentDevice.unit} {currentDevice.rack ? `• ${t('topology_details_rack')}: ${currentDevice.rack}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 text-xs">
            <div className="text-center">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{t('ports_active_ports')}</div>
              <div className="text-emerald-400 font-bold font-mono text-base">{activeCount}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{t('ports_inactive_ports')}</div>
              <div className="text-slate-400 font-bold font-mono text-base">{inactiveCount}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{t('ports_trunk_ports')}</div>
              <div className="text-purple-400 font-bold font-mono text-base">{trunkCount}</div>
            </div>
          </div>
        </div>
      )}

      {/* Switch Faceplate (Visual Rack Interface) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 shadow-inner">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-200 font-mono">
              {isEn
                ? `Switch Faceplate: ${currentDevice?.model || 'Switch'} (${ports.length} Ports)`
                : `طرح فیزیکی پورت‌های روی بدنه سوئیچ: ${currentDevice?.model || 'سوئیچ'} (${ports.length} پورت)`}
            </span>
          </div>
          {/* Legend & Multi-select Hint */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{isEn ? 'Up' : 'فعال (Up)'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-600"></span>
              <span>{isEn ? 'Down' : 'غیرفعال (Down)'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>{isEn ? 'Disabled' : 'ادمین بسته (Disabled)'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2 rounded bg-purple-500"></span>
              <span>{isEn ? 'Trunk' : 'ترانک (Trunk)'}</span>
            </div>
            <div className="text-[10px] text-cyan-300 font-mono bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/30">
              {isEn ? '💡 Hold Ctrl + Click for multi-port select' : '💡 برای انتخاب چندتایی کلید Ctrl را نگه داشته و کلیک کنید'}
            </div>
          </div>
        </div>

        {/* Visual RJ45 Ports Matrix (2-row switch design) */}
        {loading ? (
          <div className="py-8 text-center text-slate-400 text-xs animate-pulse font-mono">
            {isEn ? 'Loading port statuses from backend...' : 'در حال بارگذاری وضعیت پورت‌ها از بک‌اند پایتون...'}
          </div>
        ) : ports.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs font-mono">
            {isEn ? 'No active ports recorded.' : 'پورت فعالی ثبت نشده است.'}
          </div>
        ) : (
          <div className="switch-faceplate-chassis rounded-xl p-3 border border-slate-800 shadow-inner">
            <div className="switch-faceplate-grid rounded-lg p-2.5 overflow-x-auto border border-slate-850">
              <div className="flex flex-wrap gap-2 justify-start min-w-[500px]">
                {ports.map((port) => (
                  <NetworkPortSvg
                    key={port.port_id}
                    port={port}
                    isSelected={selectedPortIds.includes(port.port_id)}
                    onClick={(e) => handlePortClick(e, port)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        port,
                      });
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Multi-Port Batch Operations Card */}
      {selectedPortIds.length > 1 && (
        <div className="port-sub-card bg-indigo-950/60 border-2 border-indigo-500/60 rounded-xl p-4 shadow-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-indigo-500/30">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/30 text-indigo-200 border border-indigo-500/50 shadow-sm">
                <Layers className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white font-mono">
                    {isEn
                      ? `Batch Configuration (${selectedPortIds.length} Ports Selected)`
                      : `پیکربندی گروهی پورت‌ها (${selectedPortIds.length} پورت انتخاب شده)`}
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold font-mono bg-indigo-600 text-white shadow-xs">
                    MULTI-PORT ACTIVE
                  </span>
                </div>
                <p className="text-[11px] text-indigo-200/90 font-mono mt-0.5 max-w-2xl truncate">
                  {isEn ? 'Selected Ports' : 'پورت‌های انتخاب شده'}: {selectedPortIds.join(', ')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedPortIds(ports.map((p) => p.port_id))}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-400/30 text-xs font-medium transition cursor-pointer"
              >
                {isEn ? 'Select All Ports' : 'انتخاب همه پورت‌ها'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedPortIds(selectedPort ? [selectedPort.port_id] : [])}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 border border-white/10 text-xs transition cursor-pointer"
              >
                {isEn ? 'Deselect (Single Mode)' : 'لغو انتخاب گروهی'}
              </button>
            </div>
          </div>

          {batchSuccessMessage && (
            <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{batchSuccessMessage}</span>
            </div>
          )}

          {/* Batch Settings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Admin Status */}
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
              <label className="text-slate-300 font-semibold block text-[11px]">
                {isEn ? 'Admin Status:' : 'وضعیت مدیریتی:'}
              </label>
              <select
                value={batchAdminStatus}
                onChange={(e: any) => setBatchAdminStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/20 text-white text-xs font-mono focus:border-indigo-400"
              >
                <option value="no_change" className="bg-slate-900 text-slate-300">{isEn ? '-- No Change --' : '-- بدون تغییر --'}</option>
                <option value="enabled" className="bg-slate-900 text-emerald-400">{isEn ? 'Enable (no shutdown)' : 'فعال (no shutdown)'}</option>
                <option value="disabled" className="bg-slate-900 text-rose-400">{isEn ? 'Disable (shutdown)' : 'غیرفعال (shutdown)'}</option>
              </select>
            </div>

            {/* Mode */}
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
              <label className="text-slate-300 font-semibold block text-[11px]">
                {isEn ? 'Switchport Mode:' : 'مود سوئیچ‌پورت:'}
              </label>
              <select
                value={batchMode}
                onChange={(e: any) => setBatchMode(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/20 text-white text-xs font-mono focus:border-indigo-400"
              >
                <option value="no_change" className="bg-slate-900 text-slate-300">{isEn ? '-- No Change --' : '-- بدون تغییر --'}</option>
                <option value="access" className="bg-slate-900 text-indigo-300">{isEn ? 'Access' : 'Access (اکسس)'}</option>
                <option value="trunk" className="bg-slate-900 text-purple-300">{isEn ? 'Trunk' : 'Trunk (ترانک)'}</option>
              </select>
            </div>

            {/* VLAN */}
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
              <label className="text-slate-300 font-semibold block text-[11px]">
                {isEn ? 'Assign VLAN (1-4094):' : 'تخصیص ویلن (VLAN):'}
              </label>
              <input
                type="number"
                min={1}
                max={4094}
                value={batchVlan}
                onChange={(e) => setBatchVlan(e.target.value)}
                placeholder={isEn ? 'Empty = No Change' : 'خالی = بدون تغییر'}
                className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/20 text-white text-xs font-mono focus:border-indigo-400 placeholder:text-slate-500"
              />
            </div>

            {/* Allowed VLANs (Trunk) */}
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
              <label className="text-slate-300 font-semibold block text-[11px]">
                {isEn ? 'Allowed VLANs (Trunk):' : 'ویلن‌های مجاز (ترانک):'}
              </label>
              <input
                type="text"
                value={batchAllowedVlans}
                onChange={(e) => setBatchAllowedVlans(e.target.value)}
                placeholder="1-4094 or 10,20"
                className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/20 text-white text-xs font-mono focus:border-indigo-400 placeholder:text-slate-500"
                dir="ltr"
              />
            </div>

            {/* Port Security */}
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1.5 lg:col-span-2">
              <label className="text-slate-300 font-semibold block text-[11px]">
                {isEn ? 'Port Security:' : 'امنیت پورت (Port Security):'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={batchPortSec}
                  onChange={(e: any) => setBatchPortSec(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/20 text-white text-xs font-mono focus:border-indigo-400"
                >
                  <option value="no_change" className="bg-slate-900 text-slate-300">{isEn ? '-- No Change --' : '-- بدون تغییر --'}</option>
                  <option value="enabled" className="bg-slate-900 text-emerald-400">{isEn ? 'Enable Security' : 'فعال‌سازی امنیت پورت'}</option>
                  <option value="disabled" className="bg-slate-900 text-rose-400">{isEn ? 'Disable Security' : 'غیرفعال‌سازی امنیت'}</option>
                </select>
                {batchPortSec === 'enabled' && (
                  <select
                    value={batchPortSecMode}
                    onChange={(e: any) => setBatchPortSecMode(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/20 text-white text-xs font-mono focus:border-indigo-400"
                  >
                    <option value="sticky" className="bg-slate-900 text-white">Sticky (MAC خودکار)</option>
                    <option value="dynamic" className="bg-slate-900 text-white">Dynamic</option>
                    <option value="configured" className="bg-slate-900 text-white">Configured</option>
                  </select>
                )}
              </div>
            </div>

            {/* Batch Action Submit Button */}
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-end lg:col-span-2">
              <button
                type="button"
                onClick={handleApplyBatch}
                disabled={isBatchApplying}
                className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isBatchApplying ? (
                  <span>{isEn ? 'Applying Batch...' : 'در حال اعمال تنظیمات روی پورت‌ها...'}</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>
                      {isEn
                        ? `Apply Batch to ${selectedPortIds.length} Ports`
                        : `اعمال تنظیمات روی ${selectedPortIds.length} پورت انتخابی`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Port Detailed Card */}
      {selectedPort && (
        <div id="port-mgmt-edit-card" className="port-sub-card bg-white/5 border border-white/10 rounded-xl p-3.5 shadow-sm space-y-3 scroll-mt-6">
          {portStatusFeedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border transition-all ${
                portStatusFeedback.isSuccess
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}
            >
              {portStatusFeedback.isSuccess ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span className="font-medium">{portStatusFeedback.text}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-md">
                <Cable className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white font-mono">{selectedPort.name}</h4>
                  <span
                    data-badge={selectedPort.mode === 'trunk' ? 'port-mode-trunk' : 'port-mode-access'}
                    className={`text-[9px] px-2 py-0.5 rounded-md font-bold font-mono text-white shadow-xs ${
                      selectedPort.mode === 'trunk'
                        ? 'port-mode-badge-trunk bg-purple-600 border border-purple-500'
                        : 'port-mode-badge-access bg-indigo-600 border border-indigo-500'
                    }`}
                  >
                    {selectedPort.mode === 'trunk' ? (isEn ? 'TRUNK' : 'TRUNK (ترانک)') : (isEn ? 'ACCESS' : 'ACCESS (اکسس)')}
                  </span>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-md font-medium font-mono ${
                      selectedPort.status === 'up'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-white/5 text-slate-400 border border-white/10'
                    }`}
                  >
                    {selectedPort.status === 'up'
                      ? (isEn ? 'Connected (Up)' : 'فعال (Connected)')
                      : (isEn ? 'Disconnected (Down)' : 'غیرفعال (Disconnected)')}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  {isEn ? 'Speed' : 'سرعت'}: {selectedPort.speed} • {isEn ? 'Duplex' : 'داپلکس'}: {selectedPort.duplex}
                </p>
              </div>
            </div>

            {!isEditing ? (
              <button
                onClick={() => startEdit(selectedPort)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isEn ? 'Edit Port Settings' : 'ویرایش تنظیمات پورت'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs transition active:scale-95 cursor-pointer"
                >
                  {t('ports_btn_cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSavePort}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50 border border-emerald-400/40 active:scale-95 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? (isEn ? 'Applying...' : 'در حال اعمال...') : (isEn ? 'Apply & Save to Port' : 'ذخیره و اعمال روی پورت')}</span>
                </button>
              </div>
            )}
          </div>

          {/* View Mode */}
          {!isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              <div className="port-sub-card p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">{isEn ? 'Connected Device / Host:' : 'تجهیز یا هاست متصل:'}</div>
                <div className="text-white font-bold font-mono text-xs truncate" title={selectedPort.connected_device}>
                  {selectedPort.connected_device || t('ports_device_not_connected')}
                </div>
                <div className="text-slate-400 text-[10px] mt-1 font-mono">
                  {isEn ? 'Type:' : 'نوع:'} {selectedPort.connected_type || 'Host'}
                </div>
              </div>

              <div className="port-sub-card p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">{isEn ? 'Assigned VLAN:' : 'ویلن (VLAN) تخصیص یافته:'}</div>
                <div className="text-indigo-300 font-bold font-mono text-xs">
                  VLAN {selectedPort.vlan}
                </div>
                <div className="text-slate-400 text-[10px] mt-1 font-mono truncate" title={selectedPort.allowed_vlans}>
                  {isEn ? 'Allowed Trunk VLANs:' : 'ویلن‌های مجاز ترانک:'} {selectedPort.allowed_vlans || t('ports_all_vlans')}
                </div>
              </div>

              <div className="port-sub-card p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">{isEn ? 'Admin Status:' : 'وضعیت مدیریتی پورت:'}</div>
                <div className="text-emerald-400 font-bold text-xs font-mono">
                  {selectedPort.admin_status === 'enabled' ? t('ports_admin_no_shutdown') : t('ports_admin_shutdown')}
                </div>
                <div className="text-slate-400 text-[10px] mt-1 font-mono">
                  {isEn ? 'Protocol:' : 'پروتکل:'} {selectedPort.mode === 'trunk' ? '802.1Q Encapsulation' : 'Access Native'}
                </div>
              </div>

              {/* Cisco Port Security Status */}
              <div
                className={`port-sub-card p-3 rounded-xl border transition ${
                  selectedPort.port_security_enabled
                    ? 'bg-emerald-950/30 border-emerald-500/40 shadow-sm'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-0.5">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{isEn ? 'Port Security:' : 'پورت سکیوریتی:'}</span>
                  {selectedPort.port_security_enabled ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Shield className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`font-bold font-mono text-xs ${
                      selectedPort.port_security_enabled ? 'text-emerald-300' : 'text-slate-400'
                    }`}
                  >
                    {selectedPort.port_security_enabled ? (isEn ? 'Secure' : 'فعال (Secure)') : (isEn ? 'Disabled' : 'غیرفعال (Disabled)')}
                  </span>
                </div>
                {selectedPort.port_security_enabled ? (
                  <div className="text-[10px] text-emerald-300 mt-1 font-mono space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span>
                        {isEn ? 'Mode' : 'مود'}: {selectedPort.port_security_mode === 'sticky' ? (isEn ? 'Sticky' : 'استیکی') : selectedPort.port_security_mode === 'configured' ? (isEn ? 'Configured' : 'کانفیگور') : (isEn ? 'Dynamic' : 'داینامیک')}
                      </span>
                      <span className="font-bold bg-emerald-500/20 text-emerald-300 px-1 rounded text-[9px] border border-emerald-500/30">
                        Max: {selectedPort.port_security_max_mac || 1}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400 truncate" title={selectedPort.port_security_configured_mac || selectedPort.port_security_learned_macs?.join(', ')}>
                      MAC: {selectedPort.port_security_mode === 'configured'
                        ? (selectedPort.port_security_configured_mac || (isEn ? 'Static' : 'دستی'))
                        : (selectedPort.port_security_learned_macs?.[0] || (isEn ? 'Sticky learned' : 'Sticky کشف‌شده'))}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    {isEn ? 'Violation: Default' : 'بدون محدودیت مک'}
                  </div>
                )}
              </div>

              <div className="port-sub-card p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">{isEn ? 'PoE Status:' : 'توان برق (PoE Status):'}</div>
                <div className="flex items-center gap-1.5 text-white font-bold font-mono text-xs">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{selectedPort.poe_power ? `${selectedPort.poe_power} W` : t('ports_poe_disabled')}</span>
                </div>
                <div className="text-slate-400 text-[10px] mt-1 font-mono">
                  {isEn ? 'State:' : 'وضعیت:'} {selectedPort.poe_status || 'off'}
                </div>
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1 text-[11px] font-medium">{isEn ? 'Port Mode:' : 'حالت پورت (Port Mode):'}</label>
                  <select
                    value={editMode}
                    onChange={(e) => setEditMode(e.target.value as 'trunk' | 'access')}
                    className="w-full px-3 py-1.5 rounded-xl bg-black/30 border border-white/15 text-slate-100 text-xs font-mono focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="access" className="bg-slate-900 text-white">{isEn ? 'Access (Client / Host / PC)' : 'Access (اکسس - کلاینت / هاست / پی‌سی)'}</option>
                    <option value="trunk" className="bg-slate-900 text-white">{isEn ? 'Trunk (Switch-to-Switch / Router)' : 'Trunk (ترانک - ارتباط سوئیچ به سوئیچ / روتر)'}</option>
                  </select>
                </div>

                {/* VLAN ID - Styled in GRAY theme */}
                <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-200 font-semibold text-[11px] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      <span>{isEn ? 'VLAN ID (Gray):' : 'شناسه ویلن (VLAN ID - خاکستری):'}</span>
                    </label>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-700 text-slate-200">
                      {editMode === 'trunk' ? 'Native' : `VLAN ${editVlan}`}
                    </span>
                  </div>

                  <select
                    value={availableVlans.some((v) => v.id === editVlan) ? editVlan : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        setEditVlan(Number(e.target.value));
                      }
                    }}
                    className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-slate-500"
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-400">
                      {isEn ? '-- Select VLAN --' : '-- انتخاب ویلن --'}
                    </option>
                    {availableVlans.map((v) => (
                      <option key={v.id} value={v.id} className="bg-slate-900 text-slate-200">
                        VLAN {v.id} - {v.name} ({v.subnet})
                      </option>
                    ))}
                    <option value="custom" className="bg-slate-900 text-amber-300">
                      {isEn ? '✎ Custom VLAN ID...' : '✎ ورود دستی شناسه ویلن...'}
                    </option>
                  </select>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={4094}
                      value={editVlan}
                      onChange={(e) => setEditVlan(Math.max(1, Math.min(4094, Number(e.target.value) || 1)))}
                      className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono text-left focus:outline-none focus:border-slate-500"
                      dir="ltr"
                      placeholder="1-4094"
                    />
                  </div>

                  <div className="flex items-center flex-wrap gap-1">
                    <span className="text-[9px] text-slate-400">{isEn ? 'Quick:' : 'سریع:'}</span>
                    {(availableVlans.length > 0 ? availableVlans.slice(0, 4) : [
                      { id: 1, name: 'Default' },
                      { id: 10, name: 'Servers' },
                      { id: 20, name: 'Staff' },
                      { id: 30, name: 'Dev' },
                    ]).map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setEditVlan(v.id)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono border transition cursor-pointer ${
                          editVlan === v.id
                            ? 'bg-slate-600 text-white border-slate-500 font-bold'
                            : 'bg-slate-850 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        v{v.id}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Allowed Trunk VLANs - Gray in both modes, disabled in Access */}
                <div className={`p-2.5 rounded-xl border space-y-1.5 transition sm:col-span-2 lg:col-span-1 ${
                  editMode === 'access'
                    ? 'bg-slate-900/60 border-slate-800 text-slate-500'
                    : 'bg-slate-800/90 border-slate-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className={`block font-semibold text-[11px] flex items-center gap-1.5 ${
                      editMode === 'access' ? 'text-slate-400' : 'text-slate-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${editMode === 'access' ? 'bg-slate-600' : 'bg-purple-400'}`}></span>
                      <span>{isEn ? 'Allowed VLANs (Gray):' : 'ویلن‌های مجاز (خاکستری):'}</span>
                    </label>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                      editMode === 'access'
                        ? 'bg-slate-950 text-slate-400 border-slate-850'
                        : 'bg-purple-950 text-purple-300 border-purple-800'
                    }`}>
                      {editMode === 'access' ? (isEn ? 'Locked' : 'قفل در Access') : 'Trunk'}
                    </span>
                  </div>

                  {editMode === 'access' ? (
                    <div>
                      <input
                        type="text"
                        disabled
                        value={isEn ? 'Locked (Single VLAN mode)' : 'غیرفعال (پورت تک‌ویلن)'}
                        className="w-full px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-850 text-slate-400 text-xs font-mono cursor-not-allowed select-none"
                      />
                      <p className="text-[9px] text-slate-400 mt-1">
                        {isEn ? 'Allowed list applies to Trunk ports only.' : 'لیست مجاز مختص پورت‌های ترانک است.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={editAllowedVlans}
                        onChange={(e) => setEditAllowedVlans(e.target.value)}
                        placeholder={isEn ? 'e.g. 1,10,20,30,50' : 'مثال: 1,10,20,30,50'}
                        className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono text-left focus:outline-none focus:border-slate-500"
                        dir="ltr"
                      />
                      <div className="flex items-center flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => setEditAllowedVlans('1-4094')}
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-700 text-slate-200 border border-slate-600 hover:bg-slate-600 cursor-pointer"
                        >
                          ALL
                        </button>
                        {(availableVlans.length > 0 ? availableVlans : [
                          { id: 1, name: 'Default' },
                          { id: 10, name: 'Servers' },
                          { id: 20, name: 'Staff' },
                          { id: 30, name: 'Dev' },
                        ]).map((v) => {
                          const vStr = String(v.id);
                          const isIncluded = editAllowedVlans.split(',').map((s) => s.trim()).includes(vStr);
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => {
                                const currentList = editAllowedVlans ? editAllowedVlans.split(',').map((s) => s.trim()).filter(Boolean) : [];
                                if (isIncluded) {
                                  setEditAllowedVlans(currentList.filter((item) => item !== vStr).join(','));
                                } else {
                                  setEditAllowedVlans([...currentList, vStr].join(','));
                                }
                              }}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono border transition cursor-pointer ${
                                isIncluded
                                  ? 'bg-purple-900/80 text-purple-200 border-purple-600 font-bold'
                                  : 'bg-slate-850 text-slate-400 border-slate-700 hover:bg-slate-700'
                              }`}
                            >
                              {isIncluded ? `✓${v.id}` : `+${v.id}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 text-[11px] font-medium">{isEn ? 'Connected Device / Host:' : 'تجهیز یا هاست متصل:'}</label>
                  <input
                    type="text"
                    value={editConnected}
                    onChange={(e) => setEditConnected(e.target.value)}
                    placeholder={isEn ? 'e.g. AP-WIFI-02 or Core Uplink' : 'مثال: AP-WIFI-02 یا Core Uplink'}
                    className="w-full px-3 py-1.5 rounded-xl bg-black/30 border border-white/15 text-slate-100 text-xs focus:border-indigo-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 text-[11px] font-medium">{isEn ? 'Administrative Status:' : 'وضعیت مدیریتی پورت:'}</label>
                  <select
                    value={editAdminStatus}
                    onChange={(e) => setEditAdminStatus(e.target.value as 'enabled' | 'disabled')}
                    className="w-full px-3 py-1.5 rounded-xl bg-black/30 border border-white/15 text-slate-100 text-xs font-mono focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="enabled" className="bg-slate-900 text-white">{t('ports_admin_no_shutdown')}</option>
                    <option value="disabled" className="bg-slate-900 text-white">{t('ports_admin_shutdown')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 text-[11px] font-medium">{isEn ? 'Description:' : 'توضیحات (Description):'}</label>
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder={isEn ? 'Description for this port' : 'توضیح مربوط به این پورت'}
                    className="w-full px-3 py-1.5 rounded-xl bg-black/30 border border-white/15 text-slate-100 text-xs focus:border-indigo-400 focus:outline-none"
                  />
                </div>

                {/* Port Security Configuration */}
                <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2.5 sm:col-span-2 lg:col-span-3">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-200 font-semibold text-[11px] flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editPortSecEnabled}
                        onChange={(e) => setEditPortSecEnabled(e.target.checked)}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 bg-slate-900 w-4 h-4 cursor-pointer"
                      />
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isEn ? 'Port Security (Cisco 802.1X / MAC Guard):' : 'امنیت پورت (Port Security سیسکو):'}</span>
                    </label>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                      editPortSecEnabled ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}>
                      {editPortSecEnabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>

                  {editPortSecEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-700/60">
                      <div>
                        <label className="block text-slate-400 text-[10px] mb-1 font-medium">{isEn ? 'Max MAC Addresses:' : 'حداکثر مک‌آدرس (Maximum):'}</label>
                        <input
                          type="number"
                          min={1}
                          max={128}
                          value={editPortSecMaxMac}
                          onChange={(e) => setEditPortSecMaxMac(Math.max(1, Math.min(128, Number(e.target.value) || 1)))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[10px] mb-1 font-medium">{isEn ? 'Learning Mode:' : 'نوع یادگیری (Mode):'}</label>
                        <select
                          value={editPortSecMode}
                          onChange={(e) => setEditPortSecMode(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono"
                        >
                          <option value="sticky" className="bg-slate-900">Sticky (مک ماندگار خودکار)</option>
                          <option value="dynamic" className="bg-slate-900">Dynamic (پویا)</option>
                          <option value="configured" className="bg-slate-900">Configured (دستی)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[10px] mb-1 font-medium">{isEn ? 'Violation Action:' : 'واکنش نقض (Violation):'}</label>
                        <select
                          value={editPortSecViolation}
                          onChange={(e) => setEditPortSecViolation(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono"
                        >
                          <option value="shutdown" className="bg-slate-900">Shutdown (خاموشی اینترفیس)</option>
                          <option value="restrict" className="bg-slate-900">Restrict (دراپ + لاگ)</option>
                          <option value="protect" className="bg-slate-900">Protect (فقط دراپ)</option>
                        </select>
                      </div>
                      {editPortSecMode === 'configured' && (
                        <div className="sm:col-span-3">
                          <label className="block text-slate-400 text-[10px] mb-1">{isEn ? 'Static MAC Address:' : 'مک‌آدرس ثابت (Static MAC):'}</label>
                          <input
                            type="text"
                            value={editPortSecConfiguredMac}
                            onChange={(e) => setEditPortSecConfiguredMac(e.target.value)}
                            placeholder="aaaa.bbbb.cccc"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono"
                            dir="ltr"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom save bar */}
              <div className="flex flex-wrap items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 gap-2">
                <span className="text-[11px] text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{isEn ? `Apply to ${selectedPort.name} (VLAN ${editVlan})` : `اعمال به پورت ${selectedPort.name} (ویلن ${editVlan})`}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs transition cursor-pointer"
                  >
                    {t('ports_btn_cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePort}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer border border-emerald-400/40"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? (isEn ? 'Applying...' : 'در حال اعمال...') : (isEn ? 'Apply & Save to Port' : 'ذخیره و اعمال روی پورت')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ports Table */}
      <div className="spatial-glass border border-white/10 rounded-xl overflow-hidden shadow-lg">
        <div className="p-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-white font-mono">{t('ports_table_title', { count: filteredPorts.length })}</h4>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <input
              type="text"
              placeholder={t('ports_search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-black/30 border border-white/15 text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-indigo-400 w-44 shadow-inner"
            />

            <div className="flex items-center bg-black/20 rounded-xl p-1 border border-white/10">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                  filterMode === 'all' ? 'bg-indigo-600/40 text-white font-bold border border-indigo-500/40 shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('ports_filter_all')}
              </button>
              <button
                onClick={() => setFilterMode('up')}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                  filterMode === 'up' ? 'bg-indigo-600/40 text-white font-bold border border-indigo-500/40 shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('ports_filter_up')}
              </button>
              <button
                onClick={() => setFilterMode('down')}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                  filterMode === 'down' ? 'bg-indigo-600/40 text-white font-bold border border-indigo-500/40 shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('ports_filter_down')}
              </button>
              <button
                onClick={() => setFilterMode('trunk')}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                  filterMode === 'trunk' ? 'bg-purple-600/40 text-white font-bold border border-purple-500/40 shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('ports_filter_trunk')}
              </button>
              <button
                onClick={() => setFilterMode('access')}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                  filterMode === 'access' ? 'bg-indigo-600/40 text-white font-bold border border-indigo-500/40 shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('ports_filter_access')}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs`}>
            <thead>
              <tr className="bg-white/5 text-slate-300 border-b border-white/10 text-[11px] font-bold uppercase tracking-wider">
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredPorts.length > 0 && filteredPorts.every((p) => selectedPortIds.includes(p.port_id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPortIds(filteredPorts.map((p) => p.port_id));
                      } else {
                        setSelectedPortIds(selectedPort ? [selectedPort.port_id] : []);
                      }
                    }}
                    className="rounded text-indigo-600 bg-white/10 border-white/20 cursor-pointer"
                    title={isEn ? 'Select / Deselect all filtered ports' : 'انتخاب یا لغو انتخاب تمام پورت‌های فیلتر شده'}
                  />
                </th>
                <th className="p-3.5">{t('ports_col_id')}</th>
                <th className="p-3.5">{t('ports_col_status')}</th>
                <th className="p-3.5">{t('ports_col_mode')}</th>
                <th className="p-3.5">{t('ports_col_vlan')}</th>
                <th className="p-3.5">{t('ports_col_connected')}</th>
                <th className="p-3.5">{t('ports_col_speed')}</th>
                <th className="p-3.5">{t('ports_col_poe')}</th>
                <th className="p-3.5 text-center">{t('ports_col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 font-mono">
              {filteredPorts.map((port) => {
                const isSelected = selectedPortIds.includes(port.port_id);
                return (
                  <tr
                    key={port.port_id}
                    onClick={(e) => handlePortClick(e, port)}
                    className={`cursor-pointer transition ${
                      isSelected
                        ? 'bg-indigo-600/20 text-white border-l-2 border-indigo-400'
                        : 'hover:bg-white/5 text-slate-200'
                    }`}
                  >
                    <td className="p-3.5 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          handlePortClick(
                            { ctrlKey: true, metaKey: false, shiftKey: false } as any,
                            port
                          );
                        }}
                        className="rounded text-indigo-600 bg-white/10 border-white/20 cursor-pointer"
                      />
                    </td>
                    <td className="p-3.5 font-bold text-white">{port.port_id}</td>
                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                        port.admin_status === 'disabled'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : port.status === 'up'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white/5 text-slate-400 border border-white/10'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          port.admin_status === 'disabled'
                            ? 'bg-amber-400'
                            : port.status === 'up'
                            ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]'
                            : 'bg-slate-500'
                        }`}
                      ></span>
                      {port.admin_status === 'disabled' ? 'Admin Down' : port.status === 'up' ? 'Up' : 'Down'}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      data-badge={port.mode === 'trunk' ? 'port-mode-trunk' : 'port-mode-access'}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono text-white shadow-xs ${
                        port.mode === 'trunk'
                          ? 'port-mode-badge-trunk bg-purple-600 border border-purple-500'
                          : 'port-mode-badge-access bg-indigo-600 border border-indigo-500'
                      }`}
                    >
                      {port.mode.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-indigo-300">VLAN {port.vlan}</td>
                  <td className="p-3.5 text-slate-300 font-sans text-xs">
                    {port.connected_device || '-'}
                  </td>
                  <td className="p-3.5 text-slate-300">{port.speed}</td>
                  <td className="p-3.5 text-slate-300">{port.poe_power ? `${port.poe_power}W` : 'Off'}</td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(port);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 hover:text-cyan-300 text-slate-200 text-xs font-sans transition border border-white/10 cursor-pointer"
                    >
                      {t('ports_btn_edit')}
                    </button>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cisco Right-Click Port Actions Context Menu */}
      {contextMenu && currentDevice && (
        <CiscoPortContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          port={contextMenu.port}
          deviceName={currentDevice.name}
          onClose={() => setContextMenu(null)}
          onExecuteAction={handleExecuteContextMenuAction}
        />
      )}

      {/* Cisco CLI Command Confirmation Modal (Yes/No with Switch/Router CLI syntax) */}
      {confirmModalState && currentDevice && (
        <CiscoCommandConfirmModal
          isOpen={!!confirmModalState}
          onClose={() => setConfirmModalState(null)}
          onConfirm={handleConfirmExecuteCommand}
          action={confirmModalState.action}
          port={confirmModalState.port}
          device={currentDevice}
          isLoading={isExecutingConfirmAction}
        />
      )}

      {/* Assign Access VLAN Modal (With device VLANs list at top and custom ID input) */}
      {vlanAssignModalPort && currentDevice && (
        <AssignVlanModal
          isOpen={!!vlanAssignModalPort}
          onClose={() => setVlanAssignModalPort(null)}
          onAssign={handleConfirmAssignVlan}
          port={vlanAssignModalPort}
          device={currentDevice}
          isLoading={isAssigningVlan}
        />
      )}

      {/* Real Switch Configuration Preview Modal */}
      {showPreviewModal && currentDevice && selectedPort && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 modal-backdrop-blur"
          data-modal-backdrop="true"
        >
          <div className="bg-slate-900/95 border border-white/20 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-black/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {isEn ? 'Configuration Preview' : 'پیش‌نمایش پیکربندی سوئیچ'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {currentDevice.name} ({currentDevice.ip})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                disabled={isSaving}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-2 text-slate-300">
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-slate-400 font-sans">{isEn ? 'Device:' : 'تجهیز:'}</span>
                  <span className="font-bold text-white">{currentDevice.name}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-slate-400 font-sans">{isEn ? 'Interface:' : 'اینترفیس:'}</span>
                  <span className="font-bold text-cyan-300">{selectedPort.name || selectedPort.port_id}</span>
                </div>
                {selectedPort.vlan !== editVlan && (
                  <>
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-slate-400 font-sans">{isEn ? 'Current VLAN:' : 'ویلن فعلی:'}</span>
                      <span className="text-slate-300">VLAN {selectedPort.vlan}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-slate-400 font-sans">{isEn ? 'New VLAN:' : 'ویلن جدید:'}</span>
                      <span className="font-bold text-emerald-400">VLAN {editVlan}</span>
                    </div>
                  </>
                )}
                {Boolean(selectedPort.port_security_enabled) !== editPortSecEnabled && (
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-slate-400 font-sans">{isEn ? 'Port Security:' : 'امنیت پورت:'}</span>
                    <span className="font-bold text-emerald-400">{editPortSecEnabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                )}
                {selectedPort.mode !== editMode && (
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-slate-400 font-sans">{isEn ? 'Port Mode:' : 'حالت پورت:'}</span>
                    <span className="font-bold text-cyan-300">{editMode.toUpperCase()}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="text-[11px] font-sans text-slate-400 font-medium mb-1.5 flex items-center justify-between">
                  <span>{isEn ? 'Configuration to apply:' : 'دستورات تنظیمی سیسکو (Configuration):'}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Cisco IOS CLI</span>
                </div>
                <pre className="p-3 rounded-xl bg-slate-950 border border-white/10 text-emerald-300 font-mono text-xs leading-relaxed select-all overflow-x-auto" dir="ltr">
                  {generatePortMgmtConfigPreview()}
                </pre>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed font-sans text-[11px]">
                  {isEn
                    ? 'These commands will be executed via SSH directly on the physical switch interface. The UI will only update upon confirmation from the device.'
                    : 'این دستورات از طریق نشست امن SSH مستقیماً روی اینترفیس فیزیکی سوئیچ اجرا می‌شوند. وضعیت رابط کاربری تنها پس از تایید سوئیچ به‌روزرسانی خواهد شد.'}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-5 py-3.5 bg-black/30 border-t border-white/10 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-medium transition cursor-pointer disabled:opacity-50"
              >
                {isEn ? 'Cancel' : 'انصراف'}
              </button>
              <button
                type="button"
                onClick={handleConfirmApplyConfig}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg transition disabled:opacity-50 cursor-pointer border border-emerald-400/40"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isSaving
                    ? (isEn ? 'Applying configuration...' : 'در حال اعمال پیکربندی...')
                    : (isEn ? 'Apply Configuration' : 'اعمال پیکربندی')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
