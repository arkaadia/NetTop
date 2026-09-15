import React, { useState } from 'react';
import {
  Route,
  Network,
  ArrowRightLeft,
  ShieldAlert,
  Play,
  Share2,
  Plus,
  Trash2,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { Device } from '../../types';
import { AutomationTaskRequest } from '../../types/automation';
import { AutomationLifecycleModal } from './AutomationLifecycleModal';
import { WorkflowTriggerBadge } from '../WorkflowTriggerBadge';

interface CiscoRoutingViewProps {
  devices: Device[];
}

export const CiscoRoutingView: React.FC<CiscoRoutingViewProps> = ({ devices }) => {
  const routerDevices = devices.filter(
    (d) => d.type === 'router' || d.role?.toLowerCase().includes('core') || d.role?.toLowerCase().includes('gateway')
  );
  const targetDeviceList = routerDevices.length > 0 ? routerDevices : devices;

  const [selectedDevice, setSelectedDevice] = useState<string>(targetDeviceList[0]?.id || '');
  const [subTab, setSubTab] = useState<'static' | 'ospf' | 'bgp' | 'eigrp' | 'wizard'>('static');

  // Static Route state
  const [staticDest, setStaticDest] = useState('');
  const [staticMask, setStaticMask] = useState('255.255.255.0');
  const [staticHop, setStaticHop] = useState('');
  const [staticDistance, setStaticDistance] = useState<number>(1);
  const [staticName, setStaticName] = useState('');

  // OSPF state
  const [ospfProcessId, setOspfProcessId] = useState<number>(1);
  const [ospfRouterId, setOspfRouterId] = useState('');
  const [ospfNetworks, setOspfNetworks] = useState<Array<{ network: string; wildcard: string; area: number }>>([
    { network: '10.0.0.0', wildcard: '0.0.0.255', area: 0 }
  ]);
  const [ospfDefaultInfo, setOspfDefaultInfo] = useState(false);

  // BGP state
  const [bgpLocalAs, setBgpLocalAs] = useState<number>(65001);
  const [bgpRouterId, setBgpRouterId] = useState('');
  const [bgpNeighborIp, setBgpNeighborIp] = useState('');
  const [bgpRemoteAs, setBgpRemoteAs] = useState<number>(65002);
  const [bgpNetwork, setBgpNetwork] = useState('');
  const [bgpMask, setBgpMask] = useState('255.255.255.0');

  // Two-Router Interconnection Wizard State
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [routerAId, setRouterAId] = useState<string>(targetDeviceList[0]?.id || '');
  const [routerBId, setRouterBId] = useState<string>(targetDeviceList[1]?.id || targetDeviceList[0]?.id || '');
  const [routerAIf, setRouterAIf] = useState('GigabitEthernet0/0/1');
  const [routerBIf, setRouterBIf] = useState('GigabitEthernet0/0/1');
  const [routerAIp, setRouterAIp] = useState('10.255.255.1');
  const [routerBIp, setRouterBIp] = useState('10.255.255.2');
  const [wizardMask, setWizardMask] = useState('255.255.255.252');
  const [wizardProto, setWizardProto] = useState<'ospf' | 'static' | 'eigrp'>('ospf');

  // Modal active task
  const [activeTask, setActiveTask] = useState<AutomationTaskRequest | null>(null);

  const handleLaunchStatic = () => {
    setActiveTask({
      deviceId: selectedDevice,
      vendor: 'cisco',
      category: 'routing',
      actionName: 'staticRoute',
      parameters: {
        destination: staticDest,
        mask: staticMask,
        nextHop: staticHop,
        distance: staticDistance > 1 ? staticDistance : undefined,
        name: staticName || undefined
      }
    });
  };

  const handleLaunchOspf = () => {
    setActiveTask({
      deviceId: selectedDevice,
      vendor: 'cisco',
      category: 'routing',
      actionName: 'ospf',
      parameters: {
        processId: ospfProcessId,
        routerId: ospfRouterId || undefined,
        networks: ospfNetworks,
        defaultInformationOriginate: ospfDefaultInfo
      }
    });
  };

  const handleLaunchBgp = () => {
    setActiveTask({
      deviceId: selectedDevice,
      vendor: 'cisco',
      category: 'routing',
      actionName: 'bgp',
      parameters: {
        localAs: bgpLocalAs,
        routerId: bgpRouterId || undefined,
        neighbors: [{ ip: bgpNeighborIp, remoteAs: bgpRemoteAs }],
        networks: bgpNetwork ? [{ network: bgpNetwork, mask: bgpMask }] : []
      }
    });
  };

  const handleLaunchWizard = () => {
    const devA = devices.find((d) => d.id === routerAId);
    const devB = devices.find((d) => d.id === routerBId);

    setActiveTask({
      deviceId: routerAId,
      vendor: 'cisco',
      category: 'routing',
      actionName: 'routerToRouter',
      parameters: {
        routerAName: devA?.name || 'Router-A',
        routerAInterface: routerAIf,
        routerAAddress: routerAIp,
        routerBName: devB?.name || 'Router-B',
        routerBInterface: routerBIf,
        routerBAddress: routerBIp,
        subnetMask: wizardMask,
        routingProtocol: wizardProto
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Device & Sub-navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <Route className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Cisco Routing Automation Engine</h3>
              <WorkflowTriggerBadge componentName="CiscoRoutingView" />
            </div>
            <p className="text-[11px] text-slate-400">
              Deterministic routing deployment: Static, OSPF, EIGRP, BGP, and P2P Interconnect
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-300 font-medium">Target Router:</label>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            {targetDeviceList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.ip})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Routing Subtabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-xs font-semibold">
        {[
          { id: 'static', label: 'Static & Floating Routes' },
          { id: 'ospf', label: 'OSPF Dynamic Routing' },
          { id: 'bgp', label: 'BGP Autonomous System' },
          { id: 'wizard', label: '⚡ Routing Between Two Routers Wizard' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              subTab === tab.id
                ? 'bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)] font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Subtab 1: Static Route */}
      {subTab === 'static' && (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Destination Prefix / IP</label>
              <input
                type="text"
                placeholder="e.g. 192.168.100.0 or 0.0.0.0"
                value={staticDest}
                onChange={(e) => setStaticDest(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-white/15 text-xs text-white font-mono focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Subnet Mask</label>
              <input
                type="text"
                value={staticMask}
                onChange={(e) => setStaticMask(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-white/15 text-xs text-white font-mono focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Next Hop Gateway IP</label>
              <input
                type="text"
                placeholder="e.g. 192.168.1.254"
                value={staticHop}
                onChange={(e) => setStaticHop(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-white/15 text-xs text-white font-mono focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Administrative Distance (AD)</label>
              <input
                type="number"
                min="1"
                max="255"
                value={staticDistance}
                onChange={(e) => setStaticDistance(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-white/15 text-xs text-white font-mono focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500">1 = Standard Static, &gt;1 = Floating backup</span>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Route Name / Description (Optional)</label>
              <input
                type="text"
                placeholder="e.g. TO-BRANCH-OFFICE"
                value={staticName}
                onChange={(e) => setStaticName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-white/15 text-xs text-white font-mono focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleLaunchStatic}
              disabled={!staticDest || !staticMask || !staticHop}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg transition cursor-pointer disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Preview & Deploy Static Route</span>
            </button>
          </div>
        </div>
      )}

      {/* Subtab 2: OSPF */}
      {subTab === 'ospf' && (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">OSPF Process ID</label>
              <input
                type="number"
                value={ospfProcessId}
                onChange={(e) => setOspfProcessId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-white/15 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Router ID (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 1.1.1.1"
                value={ospfRouterId}
                onChange={(e) => setOspfRouterId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-white/15 text-xs text-white font-mono"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ospfDefaultInfo}
                  onChange={(e) => setOspfDefaultInfo(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>Default Information Originate (Inject 0.0.0.0/0)</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">OSPF Network Statements</span>
              <button
                onClick={() =>
                  setOspfNetworks([...ospfNetworks, { network: '192.168.1.0', wildcard: '0.0.0.255', area: 0 }])
                }
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Network
              </button>
            </div>

            {ospfNetworks.map((net, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Network IP"
                  value={net.network}
                  onChange={(e) => {
                    const copy = [...ospfNetworks];
                    copy[idx].network = e.target.value;
                    setOspfNetworks(copy);
                  }}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
                <input
                  type="text"
                  placeholder="Wildcard (e.g. 0.0.0.255)"
                  value={net.wildcard}
                  onChange={(e) => {
                    const copy = [...ospfNetworks];
                    copy[idx].wildcard = e.target.value;
                    setOspfNetworks(copy);
                  }}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
                <input
                  type="number"
                  placeholder="Area"
                  value={net.area}
                  onChange={(e) => {
                    const copy = [...ospfNetworks];
                    copy[idx].area = Number(e.target.value);
                    setOspfNetworks(copy);
                  }}
                  className="w-24 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
                {ospfNetworks.length > 1 && (
                  <button
                    onClick={() => setOspfNetworks(ospfNetworks.filter((_, i) => i !== idx))}
                    className="p-1.5 text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleLaunchOspf}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Preview & Deploy OSPF</span>
            </button>
          </div>
        </div>
      )}

      {/* Subtab 3: BGP */}
      {subTab === 'bgp' && (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Local Autonomous System (AS)</label>
              <input
                type="number"
                value={bgpLocalAs}
                onChange={(e) => setBgpLocalAs(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-white/15 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">BGP Router ID (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 192.168.1.1"
                value={bgpRouterId}
                onChange={(e) => setBgpRouterId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-white/15 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Neighbor IP Address</label>
              <input
                type="text"
                placeholder="e.g. 10.10.10.2"
                value={bgpNeighborIp}
                onChange={(e) => setBgpNeighborIp(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-white/15 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Remote AS</label>
              <input
                type="number"
                value={bgpRemoteAs}
                onChange={(e) => setBgpRemoteAs(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-white/15 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleLaunchBgp}
              disabled={!bgpLocalAs || !bgpNeighborIp || !bgpRemoteAs}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg transition cursor-pointer disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Preview & Deploy BGP</span>
            </button>
          </div>
        </div>
      )}

      {/* Subtab 4: Two-Router Wizard */}
      {subTab === 'wizard' && (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-xs text-indigo-200">
            <ArrowRightLeft className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <b className="text-white">Interconnect Wizard:</b> Automatically provisions point-to-point IP addressing, interface activation, description tagging, and routing protocol between two routers.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Router A Box */}
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-3">
              <span className="font-bold text-xs text-cyan-400">Router A (Source Side)</span>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Select Router A</label>
                <select
                  value={routerAId}
                  onChange={(e) => setRouterAId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white"
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.ip})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Interface on Router A</label>
                <input
                  type="text"
                  value={routerAIf}
                  onChange={(e) => setRouterAIf(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">P2P IP Address for Router A</label>
                <input
                  type="text"
                  value={routerAIp}
                  onChange={(e) => setRouterAIp(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* Router B Box */}
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-3">
              <span className="font-bold text-xs text-indigo-400">Router B (Destination Side)</span>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Select Router B</label>
                <select
                  value={routerBId}
                  onChange={(e) => setRouterBId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white"
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.ip})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Interface on Router B</label>
                <input
                  type="text"
                  value={routerBIf}
                  onChange={(e) => setRouterBIf(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">P2P IP Address for Router B</label>
                <input
                  type="text"
                  value={routerBIp}
                  onChange={(e) => setRouterBIp(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">P2P Subnet Mask</label>
              <input
                type="text"
                value={wizardMask}
                onChange={(e) => setWizardMask(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
              />
              <span className="text-[10px] text-slate-500">Default: 255.255.255.252 (/30 point-to-point)</span>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Dynamic Routing Protocol</label>
              <select
                value={wizardProto}
                onChange={(e) => setWizardProto(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white"
              >
                <option value="ospf">OSPF (Area 0)</option>
                <option value="eigrp">EIGRP (AS 100)</option>
                <option value="static">Static P2P Route</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              onClick={handleLaunchWizard}
              disabled={routerAId === routerBId || !routerAIp || !routerBIp}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(99,102,241,0.4)] transition cursor-pointer disabled:opacity-40"
            >
              <Share2 className="w-4 h-4" />
              <span>Launch Router-to-Router Interconnect Wizard</span>
            </button>
          </div>
        </div>
      )}

      {/* Lifecycle Modal */}
      <AutomationLifecycleModal
        isOpen={!!activeTask}
        onClose={() => setActiveTask(null)}
        task={activeTask}
      />
    </div>
  );
};
