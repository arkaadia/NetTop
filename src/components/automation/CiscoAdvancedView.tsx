import React, { useState } from 'react';
import {
  Link2,
  GitMerge,
  Shield,
  Radio,
  Server,
  Network,
  Play,
  Activity,
  Sliders,
  Layers,
  ArrowRight,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { Device } from '../../types';
import { AutomationTaskRequest } from '../../types/automation';
import { AutomationLifecycleModal } from './AutomationLifecycleModal';
import { DualEtherChannelModal } from './DualEtherChannelModal';
import { WorkflowTriggerBadge } from '../WorkflowTriggerBadge';

interface CiscoAdvancedViewProps {
  devices: Device[];
}

export const CiscoAdvancedView: React.FC<CiscoAdvancedViewProps> = ({ devices }) => {
  const [selectedDevice, setSelectedDevice] = useState<string>(devices[0]?.id || '');
  const [category, setCategory] = useState<'etherchannel' | 'stp' | 'tunnel' | 'ipsla' | 'nat' | 'dhcp'>('etherchannel');

  // Filter available switches for EtherChannel
  const switchDevices = devices.filter((d) => d.type === 'switch' || d.role?.toLowerCase().includes('switch'));
  const availableSwitches = switchDevices.length > 0 ? switchDevices : devices;

  // EtherChannel mode: Single Switch vs Dual-Switch Coordinated Pair
  const [etherChannelTargetMode, setEtherChannelTargetMode] = useState<'single' | 'dual'>('dual');

  // Single Switch EtherChannel state
  const [channelId, setChannelId] = useState<number>(1);
  const [channelProto, setChannelProto] = useState<'lacp' | 'pagp' | 'on'>('lacp');
  const [channelMode, setChannelMode] = useState<'active' | 'passive' | 'desirable' | 'auto' | 'on'>('active');
  const [channelIfs, setChannelIfs] = useState('GigabitEthernet1/0/1,GigabitEthernet1/0/2');
  const [channelPortMode, setChannelPortMode] = useState<'trunk' | 'access'>('trunk');
  const [channelAllowedVlans, setChannelAllowedVlans] = useState('all');
  const [channelNativeVlan, setChannelNativeVlan] = useState('1');
  const [channelDesc, setChannelDesc] = useState('LACP-PORT-CHANNEL');

  // Dual Switch EtherChannel states
  const [switchAId, setSwitchAId] = useState<string>(availableSwitches[0]?.id || devices[0]?.id || '');
  const [switchBId, setSwitchBId] = useState<string>(
    availableSwitches.length > 1 ? availableSwitches[1].id : devices[1]?.id || availableSwitches[0]?.id || ''
  );
  const [dualChannelIdA, setDualChannelIdA] = useState<number>(1);
  const [dualChannelIdB, setDualChannelIdB] = useState<number>(1);
  const [dualModeA, setDualModeA] = useState<'active' | 'passive' | 'on'>('active');
  const [dualModeB, setDualModeB] = useState<'active' | 'passive' | 'on'>('active');
  const [dualIfsA, setDualIfsA] = useState('GigabitEthernet1/0/23,GigabitEthernet1/0/24');
  const [dualIfsB, setDualIfsB] = useState('GigabitEthernet1/0/23,GigabitEthernet1/0/24');
  const [dualPortMode, setDualPortMode] = useState<'trunk' | 'access'>('trunk');
  const [dualAllowedVlans, setDualAllowedVlans] = useState('all');
  const [dualNativeVlan, setDualNativeVlan] = useState('1');
  const [dualDescription, setDualDescription] = useState('INTERSWITCH-LACP-TRUNK');

  // Dual Modal state
  const [isDualModalOpen, setIsDualModalOpen] = useState(false);
  const [dualTaskA, setDualTaskA] = useState<AutomationTaskRequest | null>(null);
  const [dualTaskB, setDualTaskB] = useState<AutomationTaskRequest | null>(null);

  // STP state
  const [stpMode, setStpMode] = useState<'rapid-pvst' | 'pvst' | 'mst'>('rapid-pvst');
  const [stpVlan, setStpVlan] = useState('1,10,20,30');
  const [stpRole, setStpRole] = useState<'primary' | 'secondary' | 'priority'>('primary');
  const [stpPriority, setStpPriority] = useState<number>(4096);
  const [stpBpduGuard, setStpBpduGuard] = useState(true);

  // GRE Tunnel state
  const [tunnelId, setTunnelId] = useState<number>(0);
  const [tunnelSource, setTunnelSource] = useState('GigabitEthernet0/0/0');
  const [tunnelDest, setTunnelDest] = useState('198.51.100.2');
  const [tunnelIp, setTunnelIp] = useState('10.200.0.1');
  const [tunnelMask, setTunnelMask] = useState('255.255.255.252');

  // IP SLA state
  const [slaNumber, setSlaNumber] = useState<number>(1);
  const [slaTarget, setSlaTarget] = useState('8.8.8.8');
  const [slaTrackNum, setSlaTrackNum] = useState<number>(1);
  const [slaDefaultGw, setSlaDefaultGw] = useState('192.168.1.1');
  const [slaBackupGw, setSlaBackupGw] = useState('192.168.2.1');

  // NAT state
  const [natType, setNatType] = useState<'overload' | 'static' | 'port-forward'>('overload');
  const [natInsideIf, setNatInsideIf] = useState('GigabitEthernet0/0/1');
  const [natOutsideIf, setNatOutsideIf] = useState('GigabitEthernet0/0/0');
  const [natLocalIp, setNatLocalIp] = useState('192.168.1.100');
  const [natGlobalIp, setNatGlobalIp] = useState('203.0.113.10');
  const [natPort, setNatPort] = useState<number>(80);

  // DHCP state
  const [dhcpPoolName, setDhcpPoolName] = useState('LAN_CLIENTS');
  const [dhcpNetwork, setDhcpNetwork] = useState('192.168.50.0');
  const [dhcpMask, setDhcpMask] = useState('255.255.255.0');
  const [dhcpGateway, setDhcpGateway] = useState('192.168.50.1');
  const [dhcpDns, setDhcpDns] = useState('8.8.8.8, 1.1.1.1');
  const [dhcpExcluded, setDhcpExcluded] = useState('192.168.50.1 192.168.50.10');

  const [activeTask, setActiveTask] = useState<AutomationTaskRequest | null>(null);

  const handleLaunchDualEtherChannel = () => {
    const devA = devices.find((d) => d.id === switchAId);
    const devB = devices.find((d) => d.id === switchBId);

    const taskA: AutomationTaskRequest = {
      deviceId: switchAId,
      vendor: 'cisco',
      category: 'etherchannel',
      actionName: 'etherchannel',
      parameters: {
        channelId: dualChannelIdA,
        protocol: dualModeA === 'on' ? 'on' : 'lacp',
        mode: dualModeA,
        interfaces: dualIfsA.split(',').map((s) => s.trim()).filter(Boolean),
        portMode: dualPortMode,
        allowedVlans: dualAllowedVlans,
        nativeVlan: dualNativeVlan,
        description: `${dualDescription}-TO-${devB?.name || switchBId}`
      }
    };

    const taskB: AutomationTaskRequest = {
      deviceId: switchBId,
      vendor: 'cisco',
      category: 'etherchannel',
      actionName: 'etherchannel',
      parameters: {
        channelId: dualChannelIdB,
        protocol: dualModeB === 'on' ? 'on' : 'lacp',
        mode: dualModeB,
        interfaces: dualIfsB.split(',').map((s) => s.trim()).filter(Boolean),
        portMode: dualPortMode,
        allowedVlans: dualAllowedVlans,
        nativeVlan: dualNativeVlan,
        description: `${dualDescription}-TO-${devA?.name || switchAId}`
      }
    };

    setDualTaskA(taskA);
    setDualTaskB(taskB);
    setIsDualModalOpen(true);
  };

  const handleLaunch = () => {
    switch (category) {
      case 'etherchannel':
        if (etherChannelTargetMode === 'dual') {
          handleLaunchDualEtherChannel();
          return;
        }
        setActiveTask({
          deviceId: selectedDevice,
          vendor: 'cisco',
          category: 'etherchannel',
          actionName: 'etherchannel',
          parameters: {
            channelId,
            protocol: channelProto,
            mode: channelMode,
            interfaces: channelIfs.split(',').map((s) => s.trim()).filter(Boolean),
            portMode: channelPortMode,
            allowedVlans: channelAllowedVlans,
            nativeVlan: channelNativeVlan,
            description: channelDesc
          }
        });
        break;

      case 'stp':
        setActiveTask({
          deviceId: selectedDevice,
          vendor: 'cisco',
          category: 'stp',
          actionName: 'stp',
          parameters: {
            mode: stpMode,
            vlanRange: stpVlan,
            rootRole: stpRole,
            priority: stpRole === 'priority' ? stpPriority : undefined,
            bpduGuardDefault: stpBpduGuard
          }
        });
        break;

      case 'tunnel':
        setActiveTask({
          deviceId: selectedDevice,
          vendor: 'cisco',
          category: 'tunnel',
          actionName: 'greTunnel',
          parameters: {
            tunnelId,
            source: tunnelSource,
            destination: tunnelDest,
            ipAddress: tunnelIp,
            subnetMask: tunnelMask
          }
        });
        break;

      case 'ipsla':
        setActiveTask({
          deviceId: selectedDevice,
          vendor: 'cisco',
          category: 'ipsla',
          actionName: 'ipSlaWithFailover',
          parameters: {
            slaNumber,
            targetIp: slaTarget,
            trackNumber: slaTrackNum,
            primaryGateway: slaDefaultGw,
            backupGateway: slaBackupGw
          }
        });
        break;

      case 'nat':
        setActiveTask({
          deviceId: selectedDevice,
          vendor: 'cisco',
          category: 'nat',
          actionName: 'nat',
          parameters: {
            type: natType,
            insideInterface: natInsideIf,
            outsideInterface: natOutsideIf,
            localIp: natLocalIp,
            globalIp: natGlobalIp,
            localPort: natPort,
            globalPort: natPort
          }
        });
        break;

      case 'dhcp':
        setActiveTask({
          deviceId: selectedDevice,
          vendor: 'cisco',
          category: 'dhcp',
          actionName: 'dhcp',
          parameters: {
            poolName: dhcpPoolName,
            network: dhcpNetwork,
            mask: dhcpMask,
            defaultRouter: dhcpGateway,
            dnsServers: dhcpDns.split(',').map((s) => s.trim()),
            excludedRanges: dhcpExcluded ? [dhcpExcluded] : []
          }
        });
        break;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Cisco Advanced Infrastructure Services</h3>
              <WorkflowTriggerBadge componentName="CiscoAdvancedView" />
            </div>
            <p className="text-[11px] text-slate-400">
              Link Aggregation (LACP), Spanning Tree Root Election, GRE Tunnels, IP SLA Failover, NAT & DHCP
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-300 font-medium">Target Device:</label>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.ip})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-xs font-semibold overflow-x-auto custom-scrollbar">
        {[
          { id: 'etherchannel', label: 'EtherChannel (LACP)', icon: GitMerge },
          { id: 'stp', label: 'Spanning Tree (STP)', icon: Network },
          { id: 'tunnel', label: 'GRE Point-to-Point Tunnel', icon: Link2 },
          { id: 'ipsla', label: 'IP SLA & Dual Gateway Failover', icon: Activity },
          { id: 'nat', label: 'NAT & PAT Overload', icon: Radio },
          { id: 'dhcp', label: 'DHCP Server Pools', icon: Server }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setCategory(item.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                category === item.id
                  ? 'bg-indigo-600 text-white font-bold shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Category Card */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
        {category === 'etherchannel' && (
          <div className="space-y-4">
            {/* Mode Switcher: Single vs Dual Switch */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-white/10">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <GitMerge className="w-4 h-4 text-cyan-400" />
                  <span>حالت پیکربندی EtherChannel / LACP Target Mode</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  انتخاب کنید که مایلید لینک LACP روی یک سوئیچ منفرد پیکربندی شود یا همزمان به صورت هماهنگ روی دو سوئیچ متقابل (Cross-Switch Pair).
                </div>
              </div>

              <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setEtherChannelTargetMode('single')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    etherChannelTargetMode === 'single'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>تک‌سوئیچ (Single Switch)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEtherChannelTargetMode('dual')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    etherChannelTargetMode === 'dual'
                      ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <GitMerge className="w-3.5 h-3.5" />
                  <span>دو سوئیچ متقابل (Dual-Switch Cross LACP)</span>
                </button>
              </div>
            </div>

            {/* SINGLE SWITCH MODE */}
            {etherChannelTargetMode === 'single' && (
              <div className="space-y-3 p-3.5 rounded-xl bg-white/[0.01] border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    Single-Switch Port-Channel Settings ({devices.find((d) => d.id === selectedDevice)?.name || selectedDevice})
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400">Cisco IOS Port-Channel</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Port-Channel ID (1-255)</label>
                    <input
                      type="number"
                      min="1"
                      max="255"
                      value={channelId}
                      onChange={(e) => setChannelId(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Protocol & Negotiation Mode</label>
                    <select
                      value={channelMode}
                      onChange={(e) => {
                        const m = e.target.value as any;
                        setChannelMode(m);
                        if (m === 'active' || m === 'passive') setChannelProto('lacp');
                        else if (m === 'desirable' || m === 'auto') setChannelProto('pagp');
                        else setChannelProto('on');
                      }}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white"
                    >
                      <option value="active">LACP Active (Recommended - 802.3ad)</option>
                      <option value="passive">LACP Passive (Responds only)</option>
                      <option value="desirable">PAgP Desirable (Cisco Proprietary)</option>
                      <option value="auto">PAgP Auto</option>
                      <option value="on">Static On (Manual - No negotiation)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Port-Channel Mode</label>
                    <select
                      value={channelPortMode}
                      onChange={(e) => setChannelPortMode(e.target.value as any)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white"
                    >
                      <option value="trunk">802.1Q Trunk (Standard Uplink)</option>
                      <option value="access">Access Port (Host / Server)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Allowed VLANs</label>
                    <input
                      type="text"
                      placeholder="all or 10,20,30"
                      value={channelAllowedVlans}
                      onChange={(e) => setChannelAllowedVlans(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Native VLAN</label>
                    <input
                      type="text"
                      value={channelNativeVlan}
                      onChange={(e) => setChannelNativeVlan(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Description</label>
                    <input
                      type="text"
                      value={channelDesc}
                      onChange={(e) => setChannelDesc(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Member Interfaces (comma-separated)</label>
                    <input
                      type="text"
                      value={channelIfs}
                      onChange={(e) => setChannelIfs(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                  <span>انتخاب سریع اینترفیس‌ها:</span>
                  <button
                    type="button"
                    onClick={() => setChannelIfs('GigabitEthernet1/0/1,GigabitEthernet1/0/2')}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-cyan-300 font-mono text-[10px] cursor-pointer"
                  >
                    Gi1/0/1, Gi1/0/2
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannelIfs('GigabitEthernet1/0/23,GigabitEthernet1/0/24')}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-cyan-300 font-mono text-[10px] cursor-pointer"
                  >
                    Gi1/0/23, Gi1/0/24
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannelIfs('TenGigabitEthernet1/0/1,TenGigabitEthernet1/0/2')}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-cyan-300 font-mono text-[10px] cursor-pointer"
                  >
                    Te1/0/1, Te1/0/2 (10G)
                  </button>
                </div>
              </div>
            )}

            {/* DUAL SWITCH MODE */}
            {etherChannelTargetMode === 'dual' && (
              <div className="space-y-4">
                {/* Mode presets */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs">
                  <div className="flex items-center gap-1.5 text-indigo-300 font-medium">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>حالت‌های مذاکره متقابل LACP (Cross-Negotiation Presets):</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDualModeA('active');
                        setDualModeB('active');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                        dualModeA === 'active' && dualModeB === 'active'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white/5 text-slate-300 hover:text-white'
                      }`}
                    >
                      Active ↔ Active (توصیه شده)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDualModeA('active');
                        setDualModeB('passive');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                        dualModeA === 'active' && dualModeB === 'passive'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white/5 text-slate-300 hover:text-white'
                      }`}
                    >
                      Active ↔ Passive
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDualModeA('on');
                        setDualModeB('on');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                        dualModeA === 'on' && dualModeB === 'on'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white/5 text-slate-300 hover:text-white'
                      }`}
                    >
                      Static On ↔ On
                    </button>
                  </div>
                </div>

                {/* Side-by-Side Switch Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Switch A Card */}
                  <div className="space-y-3 p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30">
                    <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                        <span className="text-xs font-bold text-cyan-200">سوئیچ سمت A (Switch A)</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                        Side A
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1 font-medium">انتخاب سوئیچ A:</label>
                      <select
                        value={switchAId}
                        onChange={(e) => setSwitchAId(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-xs text-white focus:border-cyan-400 focus:outline-none"
                      >
                        {devices.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.ip}) - {d.role || d.type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Port-Channel ID</label>
                        <input
                          type="number"
                          min="1"
                          max="255"
                          value={dualChannelIdA}
                          onChange={(e) => setDualChannelIdA(Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">LACP Mode (A)</label>
                        <select
                          value={dualModeA}
                          onChange={(e) => setDualModeA(e.target.value as any)}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white"
                        >
                          <option value="active">Active (مذاکره فعال)</option>
                          <option value="passive">Passive (پاسخ‌دهنده)</option>
                          <option value="on">On (دستی استاتیک)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">پورت‌های عضو سوئیچ A (Member Interfaces):</label>
                      <input
                        type="text"
                        value={dualIfsA}
                        onChange={(e) => setDualIfsA(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                      />
                      <div className="flex items-center gap-1.5 pt-1.5 text-[10px]">
                        <span className="text-slate-500">انتخاب سریع:</span>
                        <button
                          type="button"
                          onClick={() => setDualIfsA('GigabitEthernet1/0/1,GigabitEthernet1/0/2')}
                          className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-cyan-300 font-mono cursor-pointer"
                        >
                          Gi1/0/1-2
                        </button>
                        <button
                          type="button"
                          onClick={() => setDualIfsA('GigabitEthernet1/0/23,GigabitEthernet1/0/24')}
                          className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-cyan-300 font-mono cursor-pointer"
                        >
                          Gi1/0/23-24
                        </button>
                        <button
                          type="button"
                          onClick={() => setDualIfsA('TenGigabitEthernet1/0/1,TenGigabitEthernet1/0/2')}
                          className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-cyan-300 font-mono cursor-pointer"
                        >
                          Te1/0/1-2
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Switch B Card */}
                  <div className="space-y-3 p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                        <span className="text-xs font-bold text-emerald-200">سوئیچ سمت B (Switch B)</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                        Side B
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1 font-medium">انتخاب سوئیچ B:</label>
                      <select
                        value={switchBId}
                        onChange={(e) => setSwitchBId(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs text-white focus:border-emerald-400 focus:outline-none"
                      >
                        {devices.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.ip}) - {d.role || d.type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Port-Channel ID</label>
                        <input
                          type="number"
                          min="1"
                          max="255"
                          value={dualChannelIdB}
                          onChange={(e) => setDualChannelIdB(Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">LACP Mode (B)</label>
                        <select
                          value={dualModeB}
                          onChange={(e) => setDualModeB(e.target.value as any)}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white"
                        >
                          <option value="active">Active (مذاکره فعال)</option>
                          <option value="passive">Passive (پاسخ‌دهنده)</option>
                          <option value="on">On (دستی استاتیک)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">پورت‌های عضو سوئیچ B (Member Interfaces):</label>
                      <input
                        type="text"
                        value={dualIfsB}
                        onChange={(e) => setDualIfsB(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                      />
                      <div className="flex items-center gap-1.5 pt-1.5 text-[10px]">
                        <span className="text-slate-500">انتخاب سریع:</span>
                        <button
                          type="button"
                          onClick={() => setDualIfsB('GigabitEthernet1/0/1,GigabitEthernet1/0/2')}
                          className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-emerald-300 font-mono cursor-pointer"
                        >
                          Gi1/0/1-2
                        </button>
                        <button
                          type="button"
                          onClick={() => setDualIfsB('GigabitEthernet1/0/23,GigabitEthernet1/0/24')}
                          className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-emerald-300 font-mono cursor-pointer"
                        >
                          Gi1/0/23-24
                        </button>
                        <button
                          type="button"
                          onClick={() => setDualIfsB('TenGigabitEthernet1/0/1,TenGigabitEthernet1/0/2')}
                          className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-emerald-300 font-mono cursor-pointer"
                        >
                          Te1/0/1-2
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mutual Interconnect Trunk Parameters */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">
                      تنظیمات ترانک و پیوند اشتراکی دو سوئیچ (Mutual Interconnect Trunk Settings)
                    </span>
                    <span className="text-[10px] text-indigo-400 font-mono">IEEE 802.1Q Encapsulation</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Port-Channel Mode</label>
                      <select
                        value={dualPortMode}
                        onChange={(e) => setDualPortMode(e.target.value as any)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white"
                      >
                        <option value="trunk">802.1Q Trunk (پیش‌فرض ترانک بین سوئیچی)</option>
                        <option value="access">Access Port (محدود به یک ویلن)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Allowed VLANs</label>
                      <input
                        type="text"
                        placeholder="all or 10,20,30-50"
                        value={dualAllowedVlans}
                        onChange={(e) => setDualAllowedVlans(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Native VLAN</label>
                      <input
                        type="text"
                        value={dualNativeVlan}
                        onChange={(e) => setDualNativeVlan(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Link Description</label>
                      <input
                        type="text"
                        value={dualDescription}
                        onChange={(e) => setDualDescription(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Schematic Topology Diagram */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-slate-950/60 to-emerald-950/30 border border-white/10 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold">
                      {devices.find((d) => d.id === switchAId)?.name || switchAId}
                      <span className="block text-[10px] text-cyan-400/80 font-normal">
                        Po{dualChannelIdA} • {dualIfsA.split(',').length} Links
                      </span>
                    </div>

                    <div className="flex flex-col items-center px-4">
                      <div className="text-[10px] font-mono text-indigo-300 flex items-center gap-1">
                        <span>LACP 802.3ad Trunk Bundle</span>
                      </div>
                      <div className="w-28 sm:w-40 h-0.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-500 my-1 relative">
                        <div className="absolute inset-0 blur-xs bg-indigo-400" />
                      </div>
                      <span className="text-[9px] text-slate-400">
                        {dualModeA.toUpperCase()} ↔ {dualModeB.toUpperCase()}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold">
                      {devices.find((d) => d.id === switchBId)?.name || switchBId}
                      <span className="block text-[10px] text-emerald-400/80 font-normal">
                        Po{dualChannelIdB} • {dualIfsB.split(',').length} Links
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-300 space-y-0.5">
                    <div className="text-indigo-300 font-semibold">تضمین سلامت دوطرفه (Cross-Switch Safety)</div>
                    <div className="text-[10px] text-slate-400">
                      پشتیبان‌گیری خودکار قبل از اجرا + بازگشت آنی در صورت عدم توازن
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {category === 'stp' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-200">Spanning Tree Protocol (STP) Parameters</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">STP Mode</label>
                <select
                  value={stpMode}
                  onChange={(e) => setStpMode(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white"
                >
                  <option value="rapid-pvst">Rapid-PVST (802.1w Fast Convergence)</option>
                  <option value="pvst">Classic PVST+ (802.1D)</option>
                  <option value="mst">MST (802.1s Multiple Spanning Tree)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Target VLAN(s)</label>
                <input
                  type="text"
                  value={stpVlan}
                  onChange={(e) => setStpVlan(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Root Election Role</label>
                <select
                  value={stpRole}
                  onChange={(e) => setStpRole(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white"
                >
                  <option value="primary">Root Primary (Priority 24576)</option>
                  <option value="secondary">Root Secondary (Priority 28672)</option>
                  <option value="priority">Explicit Custom Priority</option>
                </select>
              </div>
              {stpRole === 'priority' && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Priority (Multiple of 4096)</label>
                  <input
                    type="number"
                    step="4096"
                    value={stpPriority}
                    onChange={(e) => setStpPriority(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {category === 'tunnel' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-200">Generic Routing Encapsulation (GRE) Tunnel</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tunnel Interface Number</label>
                <input
                  type="number"
                  min="0"
                  value={tunnelId}
                  onChange={(e) => setTunnelId(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tunnel Source (IP or Interface)</label>
                <input
                  type="text"
                  value={tunnelSource}
                  onChange={(e) => setTunnelSource(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tunnel Destination Public IP</label>
                <input
                  type="text"
                  value={tunnelDest}
                  onChange={(e) => setTunnelDest(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tunnel Virtual IP Address</label>
                <input
                  type="text"
                  value={tunnelIp}
                  onChange={(e) => setTunnelIp(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tunnel Subnet Mask</label>
                <input
                  type="text"
                  value={tunnelMask}
                  onChange={(e) => setTunnelMask(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {category === 'ipsla' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-200">
              IP SLA Gateway Health Tracking & Floating Route Failover
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Probe Target IP (e.g. 8.8.8.8)</label>
                <input
                  type="text"
                  value={slaTarget}
                  onChange={(e) => setSlaTarget(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Primary Gateway IP (Monitored)</label>
                <input
                  type="text"
                  value={slaDefaultGw}
                  onChange={(e) => setSlaDefaultGw(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Backup Gateway IP (Floating Route AD 10)</label>
                <input
                  type="text"
                  value={slaBackupGw}
                  onChange={(e) => setSlaBackupGw(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {category === 'nat' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-200">Network Address Translation (NAT)</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">NAT Architecture Type</label>
                <select
                  value={natType}
                  onChange={(e) => setNatType(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white"
                >
                  <option value="overload">Dynamic PAT (Overload to Outside Interface)</option>
                  <option value="static">Static 1:1 NAT Mapping</option>
                  <option value="port-forward">Port Forwarding (PAT to Internal Port)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Inside LAN Interface</label>
                <input
                  type="text"
                  value={natInsideIf}
                  onChange={(e) => setNatInsideIf(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Outside WAN Interface</label>
                <input
                  type="text"
                  value={natOutsideIf}
                  onChange={(e) => setNatOutsideIf(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              {natType !== 'overload' && (
                <>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Internal Local IP</label>
                    <input
                      type="text"
                      value={natLocalIp}
                      onChange={(e) => setNatLocalIp(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">External Global IP</label>
                    <input
                      type="text"
                      value={natGlobalIp}
                      onChange={(e) => setNatGlobalIp(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {category === 'dhcp' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-200">IOS DHCP Server Pool Configuration</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">DHCP Pool Name</label>
                <input
                  type="text"
                  value={dhcpPoolName}
                  onChange={(e) => setDhcpPoolName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Subnet Network IP</label>
                <input
                  type="text"
                  value={dhcpNetwork}
                  onChange={(e) => setDhcpNetwork(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Subnet Mask</label>
                <input
                  type="text"
                  value={dhcpMask}
                  onChange={(e) => setDhcpMask(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Default Gateway (Router)</label>
                <input
                  type="text"
                  value={dhcpGateway}
                  onChange={(e) => setDhcpGateway(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">DNS Server(s)</label>
                <input
                  type="text"
                  value={dhcpDns}
                  onChange={(e) => setDhcpDns(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Excluded IP Range</label>
                <input
                  type="text"
                  value={dhcpExcluded}
                  onChange={(e) => setDhcpExcluded(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          {category === 'etherchannel' && etherChannelTargetMode === 'dual' ? (
            <button
              onClick={handleLaunchDualEtherChannel}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-emerald-600 hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition cursor-pointer"
            >
              <GitMerge className="w-4 h-4" />
              <span>پیش‌نمایش و اعمال همزمان روی هر دو سوئیچ (Preview & Apply Dual-Switch LACP)</span>
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Preview & Apply {category.toUpperCase()} Configuration</span>
            </button>
          )}
        </div>
      </div>

      {/* Single Device Lifecycle Modal */}
      <AutomationLifecycleModal
        isOpen={!!activeTask}
        onClose={() => setActiveTask(null)}
        task={activeTask}
      />

      {/* Dual Switch EtherChannel Modal */}
      <DualEtherChannelModal
        isOpen={isDualModalOpen}
        onClose={() => setIsDualModalOpen(false)}
        switchADevice={devices.find((d) => d.id === switchAId)}
        switchBDevice={devices.find((d) => d.id === switchBId)}
        taskA={dualTaskA}
        taskB={dualTaskB}
      />
    </div>
  );
};
