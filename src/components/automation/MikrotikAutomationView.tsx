import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  Route,
  Radio,
  Network,
  Play,
  Share2,
  Lock,
  Layers,
  Activity
} from 'lucide-react';
import { Device } from '../../types';
import { AutomationTaskRequest } from '../../types/automation';
import { AutomationLifecycleModal } from './AutomationLifecycleModal';
import { WorkflowTriggerBadge } from '../WorkflowTriggerBadge';

interface MikrotikAutomationViewProps {
  devices: Device[];
}

export const MikrotikAutomationView: React.FC<MikrotikAutomationViewProps> = ({ devices }) => {
  const mikrotikDevices = devices.filter((d) => (d.model || '').toLowerCase().includes('mikrotik'));
  const targetList = mikrotikDevices.length > 0 ? mikrotikDevices : devices;

  const [selectedDevice, setSelectedDevice] = useState<string>(targetList[0]?.id || '');
  const [tab, setTab] = useState<'wireguard' | 'firewall' | 'routing' | 'nat' | 'vlan' | 'failover'>('wireguard');

  // WireGuard State
  const [wgInterface, setWgInterface] = useState('wg0');
  const [wgPort, setWgPort] = useState<number>(13231);
  const [peerPublicKey, setPeerPublicKey] = useState('');
  const [peerAllowedIp, setPeerAllowedIp] = useState('10.0.0.2/32');
  const [peerEndpoint, setPeerEndpoint] = useState('');
  const [peerPort, setPeerPort] = useState<number>(13231);

  // Firewall Hardening State
  const [wanList, setWanList] = useState('WAN');
  const [dropInvalid, setDropInvalid] = useState(true);
  const [fasttrack, setFasttrack] = useState(true);
  const [bruteForce, setBruteForce] = useState(true);
  const [disableTelnet, setDisableTelnet] = useState(true);
  const [disableFtp, setDisableFtp] = useState(true);
  const [strongCrypto, setStrongCrypto] = useState(true);

  // Routing State
  const [routeDst, setRouteDst] = useState('0.0.0.0/0');
  const [routeGw, setRouteGw] = useState('192.168.88.1');
  const [routeDistance, setRouteDistance] = useState<number>(1);
  const [routeCheck, setRouteCheck] = useState<'ping' | 'none'>('ping');

  // NAT State
  const [natType, setNatType] = useState<'masquerade' | 'dstnat'>('masquerade');
  const [natOutIf, setNatOutIf] = useState('ether1');
  const [natDstPort, setNatDstPort] = useState<number>(80);
  const [natToIp, setNatToIp] = useState('192.168.88.100');

  // Dual WAN Failover State
  const [wan1Gw, setWan1Gw] = useState('192.168.1.1');
  const [wan2Gw, setWan2Gw] = useState('192.168.2.1');
  const [checkHost, setCheckHost] = useState('1.1.1.1');

  // VLAN State
  const [vlanId, setVlanId] = useState<number>(10);
  const [bridgeName, setBridgeName] = useState('bridge');
  const [taggedIfs, setTaggedIfs] = useState('ether1');
  const [untaggedIfs, setUntaggedIfs] = useState('ether2,ether3');

  const [activeTask, setActiveTask] = useState<AutomationTaskRequest | null>(null);

  const handleLaunch = () => {
    switch (tab) {
      case 'wireguard':
        setActiveTask({
          deviceId: selectedDevice,
          vendor: 'mikrotik',
          category: 'vpn',
          actionName: 'wireguard',
          parameters: {
            interfaceName: wgInterface,
            listenPort: wgPort,
            peers: peerPublicKey
              ? [
                  {
                    publicKey: peerPublicKey,
                    allowedAddress: peerAllowedIp,
                    endpointAddress: peerEndpoint || undefined,
                    endpointPort: peerEndpoint ? peerPort : undefined
                  }
                ]
              : []
          }
        });
        break;

      case 'firewall':
        setActiveTask({
          deviceId: selectedDevice,
          vendor: 'mikrotik',
          category: 'firewall',
          actionName: 'firewallHardening',
          parameters: {
            wanInterfaceList: wanList,
            dropInvalid,
            fasttrack,
            bruteForceProtection: bruteForce
          }
        });
        break;

      case 'routing':
        setActiveTask({
          deviceId: selectedDevice,
          vendor: 'mikrotik',
          category: 'routing',
          actionName: 'staticRoute',
          parameters: {
            dstAddress: routeDst,
            gateway: routeGw,
            distance: routeDistance,
            checkGateway: routeCheck
          }
        });
        break;

      case 'nat':
        setActiveTask({
          deviceId: selectedDevice,
          vendor: 'mikrotik',
          category: 'nat',
          actionName: 'nat',
          parameters: {
            type: natType,
            outInterface: natType === 'masquerade' ? natOutIf : undefined,
            dstPort: natType === 'dstnat' ? natDstPort : undefined,
            toAddresses: natType === 'dstnat' ? natToIp : undefined
          }
        });
        break;

      case 'failover':
        setActiveTask({
          deviceId: selectedDevice,
          vendor: 'mikrotik',
          category: 'failover',
          actionName: 'dualWanFailover',
          parameters: {
            wan1Gateway: wan1Gw,
            wan2Gateway: wan2Gw,
            checkHost
          }
        });
        break;

      case 'vlan':
        setActiveTask({
          deviceId: selectedDevice,
          vendor: 'mikrotik',
          category: 'vlan',
          actionName: 'bridgeVlan',
          parameters: {
            vlanId,
            bridgeName,
            taggedInterfaces: taggedIfs.split(',').map((s) => s.trim()).filter(Boolean),
            untaggedInterfaces: untaggedIfs.split(',').map((s) => s.trim()).filter(Boolean)
          }
        });
        break;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">MikroTik RouterOS Automation Suite</h3>
              <WorkflowTriggerBadge componentName="MikrotikAutomationView" />
            </div>
            <p className="text-[11px] text-slate-400">
              WireGuard VPN tunnels, Stateful Firewall baselines, Recursive WAN Failover, and Hardware Bridge VLAN filtering
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-300 font-medium">Target RouterOS:</label>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:border-cyan-500 focus:outline-none"
          >
            {targetList.map((d) => (
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
          { id: 'wireguard', label: 'WireGuard VPN', icon: Lock },
          { id: 'firewall', label: 'Firewall & Hardening', icon: ShieldAlert },
          { id: 'routing', label: 'Static Routes', icon: Route },
          { id: 'nat', label: 'NAT / Masquerade', icon: Radio },
          { id: 'failover', label: 'Dual WAN Failover', icon: Activity },
          { id: 'vlan', label: 'Bridge VLAN Filtering', icon: Layers }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                tab === item.id
                  ? 'bg-cyan-600 text-white font-bold shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
        {tab === 'wireguard' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-200">WireGuard Interface & Peer Parameters</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Interface Name</label>
                <input
                  type="text"
                  value={wgInterface}
                  onChange={(e) => setWgInterface(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Listen UDP Port</label>
                <input
                  type="number"
                  value={wgPort}
                  onChange={(e) => setWgPort(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Peer Public Key</label>
                <input
                  type="text"
                  placeholder="Base64 public key"
                  value={peerPublicKey}
                  onChange={(e) => setPeerPublicKey(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Peer Allowed IP / CIDR</label>
                <input
                  type="text"
                  value={peerAllowedIp}
                  onChange={(e) => setPeerAllowedIp(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Endpoint IP / Hostname (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. vpn.example.com"
                  value={peerEndpoint}
                  onChange={(e) => setPeerEndpoint(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'firewall' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-200">RouterOS Stateful Firewall & Hardening</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-300 p-2.5 rounded-xl bg-black/40 border border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fasttrack}
                  onChange={(e) => setFasttrack(e.target.checked)}
                  className="rounded text-cyan-500 cursor-pointer"
                />
                <div>
                  <b className="text-white block">FastTrack Connections</b>
                  <span className="text-[11px] text-slate-400">Bypasses CPU firewall for established flows</span>
                </div>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 p-2.5 rounded-xl bg-black/40 border border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dropInvalid}
                  onChange={(e) => setDropInvalid(e.target.checked)}
                  className="rounded text-cyan-500 cursor-pointer"
                />
                <div>
                  <b className="text-white block">Drop Invalid Packets</b>
                  <span className="text-[11px] text-slate-400">Drops malformed TCP state attempts</span>
                </div>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 p-2.5 rounded-xl bg-black/40 border border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bruteForce}
                  onChange={(e) => setBruteForce(e.target.checked)}
                  className="rounded text-cyan-500 cursor-pointer"
                />
                <div>
                  <b className="text-white block">SSH Brute-force Auto-Blacklist</b>
                  <span className="text-[11px] text-slate-400">3-stage dynamic address-list blocking</span>
                </div>
              </label>
            </div>
          </div>
        )}

        {tab === 'routing' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-200">MikroTik Static IP Route</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Destination Address / CIDR</label>
                <input
                  type="text"
                  value={routeDst}
                  onChange={(e) => setRouteDst(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Gateway IP</label>
                <input
                  type="text"
                  value={routeGw}
                  onChange={(e) => setRouteGw(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Distance (Metric)</label>
                <input
                  type="number"
                  min="1"
                  max="255"
                  value={routeDistance}
                  onChange={(e) => setRouteDistance(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Check Gateway</label>
                <select
                  value={routeCheck}
                  onChange={(e) => setRouteCheck(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white"
                >
                  <option value="ping">Ping Check (ICMP)</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {tab === 'failover' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-200">Dual WAN Recursive Route Failover</span>
            <p className="text-[11px] text-slate-400">
              RouterOS recursive routing periodically verifies upstream DNS/IP reachability ({checkHost}) through WAN1. If unreachable, default traffic flips to WAN2 automatically.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Primary WAN1 Gateway</label>
                <input
                  type="text"
                  value={wan1Gw}
                  onChange={(e) => setWan1Gw(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Backup WAN2 Gateway</label>
                <input
                  type="text"
                  value={wan2Gw}
                  onChange={(e) => setWan2Gw(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Host Check IP (Target)</label>
                <input
                  type="text"
                  value={checkHost}
                  onChange={(e) => setCheckHost(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {tab === 'nat' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-200">MikroTik IP NAT / Port Forwarding</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">NAT Action</label>
                <select
                  value={natType}
                  onChange={(e) => setNatType(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white"
                >
                  <option value="masquerade">Masquerade (Outbound Internet)</option>
                  <option value="dstnat">Port Forwarding (dst-nat)</option>
                </select>
              </div>
              {natType === 'masquerade' ? (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Out Interface</label>
                  <input
                    type="text"
                    value={natOutIf}
                    onChange={(e) => setNatOutIf(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">External Destination Port</label>
                    <input
                      type="number"
                      value={natDstPort}
                      onChange={(e) => setNatDstPort(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Internal Target IP</label>
                    <input
                      type="text"
                      value={natToIp}
                      onChange={(e) => setNatToIp(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {tab === 'vlan' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-200">Hardware Bridge VLAN Filtering</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Bridge Name</label>
                <input
                  type="text"
                  value={bridgeName}
                  onChange={(e) => setBridgeName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">VLAN ID</label>
                <input
                  type="number"
                  min="1"
                  max="4094"
                  value={vlanId}
                  onChange={(e) => setVlanId(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tagged Interfaces (Trunk)</label>
                <input
                  type="text"
                  value={taggedIfs}
                  onChange={(e) => setTaggedIfs(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Untagged Interfaces (Access)</label>
                <input
                  type="text"
                  value={untaggedIfs}
                  onChange={(e) => setUntaggedIfs(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={handleLaunch}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Preview & Apply RouterOS Configuration</span>
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
