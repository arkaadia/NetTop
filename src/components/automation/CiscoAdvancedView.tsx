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
  Sliders
} from 'lucide-react';
import { Device } from '../../types';
import { AutomationTaskRequest } from '../../types/automation';
import { AutomationLifecycleModal } from './AutomationLifecycleModal';
import { WorkflowTriggerBadge } from '../WorkflowTriggerBadge';

interface CiscoAdvancedViewProps {
  devices: Device[];
}

export const CiscoAdvancedView: React.FC<CiscoAdvancedViewProps> = ({ devices }) => {
  const [selectedDevice, setSelectedDevice] = useState<string>(devices[0]?.id || '');
  const [category, setCategory] = useState<'etherchannel' | 'stp' | 'tunnel' | 'ipsla' | 'nat' | 'dhcp'>('etherchannel');

  // EtherChannel state
  const [channelId, setChannelId] = useState<number>(1);
  const [channelProto, setChannelProto] = useState<'lacp' | 'pagp' | 'on'>('lacp');
  const [channelMode, setChannelMode] = useState<'active' | 'passive' | 'desirable' | 'auto' | 'on'>('active');
  const [channelIfs, setChannelIfs] = useState('GigabitEthernet1/0/1,GigabitEthernet1/0/2');
  const [channelPortMode, setChannelPortMode] = useState<'trunk' | 'access'>('trunk');

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

  const handleLaunch = () => {
    switch (category) {
      case 'etherchannel':
        setActiveTask({
          deviceId: selectedDevice,
          vendor: 'cisco',
          category: 'etherchannel',
          actionName: 'etherchannel',
          parameters: {
            channelId,
            protocol: channelProto,
            mode: channelMode,
            interfaces: channelIfs.split(',').map((s) => s.trim()),
            portMode: channelPortMode
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
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-200">Port-Channel Aggregation Settings</span>
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
                <label className="block text-[11px] text-slate-400 mb-1">Protocol & Mode</label>
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
                  <option value="active">LACP Active (Recommended)</option>
                  <option value="passive">LACP Passive</option>
                  <option value="desirable">PAgP Desirable (Cisco Proprietary)</option>
                  <option value="auto">PAgP Auto</option>
                  <option value="on">Static Manual (No Negotiation)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Port-Channel Mode</label>
                <select
                  value={channelPortMode}
                  onChange={(e) => setChannelPortMode(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white"
                >
                  <option value="trunk">802.1Q Trunk</option>
                  <option value="access">Access Port</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Member Interfaces</label>
                <input
                  type="text"
                  value={channelIfs}
                  onChange={(e) => setChannelIfs(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
            </div>
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
          <button
            onClick={handleLaunch}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Preview & Apply {category.toUpperCase()} Configuration</span>
          </button>
        </div>
      </div>

      {/* Lifecycle Modal */}
      <AutomationLifecycleModal
        isOpen={!!activeTask}
        onClose={() => setActiveTask(null)}
        task={activeTask}
      />
    </div>
  );
};
