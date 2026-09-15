import React, { useState } from 'react';
import { Network, Plus, Trash2, Play, Sparkles, Layers } from 'lucide-react';
import { Device } from '../../types';
import { AutomationTaskRequest } from '../../types/automation';
import { AutomationLifecycleModal } from './AutomationLifecycleModal';
import { WorkflowTriggerBadge } from '../WorkflowTriggerBadge';

interface CiscoVlanViewProps {
  devices: Device[];
}

export const CiscoVlanView: React.FC<CiscoVlanViewProps> = ({ devices }) => {
  const switchDevices = devices.filter(
    (d) => d.type === 'switch' || d.role?.toLowerCase().includes('switch') || d.type === 'router'
  );
  const targetDeviceList = switchDevices.length > 0 ? switchDevices : devices;

  const [selectedDevice, setSelectedDevice] = useState<string>(targetDeviceList[0]?.id || '');
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  // Single VLAN
  const [vlanId, setVlanId] = useState<number>(10);
  const [vlanName, setVlanName] = useState('USERS_DATA');
  const [enableSvi, setEnableSvi] = useState(true);
  const [sviIp, setSviIp] = useState('192.168.10.1');
  const [sviMask, setSviMask] = useState('255.255.255.0');

  // Batch VLAN
  const [batchVlans, setBatchVlans] = useState<Array<{ id: number; name: string; ip?: string; mask?: string }>>([
    { id: 10, name: 'CORP_USERS', ip: '10.10.10.1', mask: '255.255.255.0' },
    { id: 20, name: 'DMZ_SERVERS', ip: '10.10.20.1', mask: '255.255.255.0' },
    { id: 30, name: 'VOIP_PHONES', ip: '10.10.30.1', mask: '255.255.255.0' },
    { id: 99, name: 'INBAND_MGMT', ip: '10.10.99.1', mask: '255.255.255.0' }
  ]);

  const [activeTask, setActiveTask] = useState<AutomationTaskRequest | null>(null);

  const handleLaunchSingle = () => {
    setActiveTask({
      deviceId: selectedDevice,
      vendor: 'cisco',
      category: 'vlan',
      actionName: 'vlans',
      parameters: {
        vlans: [
          {
            id: vlanId,
            name: vlanName,
            ip: enableSvi ? sviIp : undefined,
            mask: enableSvi ? sviMask : undefined
          }
        ]
      }
    });
  };

  const handleLaunchBatch = () => {
    setActiveTask({
      deviceId: selectedDevice,
      vendor: 'cisco',
      category: 'vlan',
      actionName: 'vlans',
      parameters: {
        vlans: batchVlans
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">VLAN & SVI Database Engine</h3>
              <WorkflowTriggerBadge componentName="CiscoVlanView" />
            </div>
            <p className="text-[11px] text-slate-400">
              Provision 802.1Q broadcast domains, name labels, and Layer 3 Switch Virtual Interfaces (SVI)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-300 font-medium">Target Switch:</label>
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

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-xs font-semibold">
        <button
          onClick={() => setMode('single')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
            mode === 'single'
              ? 'bg-indigo-600 text-white font-bold shadow-[0_0_10px_rgba(99,102,241,0.3)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Single VLAN & Gateway
        </button>
        <button
          onClick={() => setMode('batch')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
            mode === 'batch'
              ? 'bg-indigo-600 text-white font-bold shadow-[0_0_10px_rgba(99,102,241,0.3)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Batch Multi-VLAN Provisioning ({batchVlans.length})
        </button>
      </div>

      {mode === 'single' ? (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">VLAN ID (1-4094)</label>
              <input
                type="number"
                min="1"
                max="4094"
                value={vlanId}
                onChange={(e) => setVlanId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">VLAN Name</label>
              <input
                type="text"
                value={vlanName}
                onChange={(e) => setVlanName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Layer 3 Switched Virtual Interface (SVI)</span>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableSvi}
                  onChange={(e) => setEnableSvi(e.target.checked)}
                  className="rounded text-indigo-600 cursor-pointer"
                />
                <span>Configure Interface Vlan {vlanId} IP Gateway</span>
              </label>
            </div>

            {enableSvi && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Gateway IP Address</label>
                  <input
                    type="text"
                    value={sviIp}
                    onChange={(e) => setSviIp(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Subnet Mask</label>
                  <input
                    type="text"
                    value={sviMask}
                    onChange={(e) => setSviMask(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleLaunchSingle}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Preview & Apply VLAN {vlanId}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">VLAN Batch Database List</span>
            <button
              onClick={() =>
                setBatchVlans([
                  ...batchVlans,
                  { id: batchVlans.length ? Math.max(...batchVlans.map((v) => v.id)) + 10 : 10, name: 'NEW_VLAN' }
                ])
              }
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-semibold border border-indigo-500/40 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add VLAN
            </button>
          </div>

          <div className="space-y-2">
            {batchVlans.map((item, idx) => (
              <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 rounded-xl bg-black/40 border border-white/10">
                <input
                  type="number"
                  placeholder="ID"
                  value={item.id}
                  onChange={(e) => {
                    const c = [...batchVlans];
                    c[idx].id = Number(e.target.value);
                    setBatchVlans(c);
                  }}
                  className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
                <input
                  type="text"
                  placeholder="VLAN Name"
                  value={item.name}
                  onChange={(e) => {
                    const c = [...batchVlans];
                    c[idx].name = e.target.value;
                    setBatchVlans(c);
                  }}
                  className="w-40 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
                <input
                  type="text"
                  placeholder="SVI IP (Optional)"
                  value={item.ip || ''}
                  onChange={(e) => {
                    const c = [...batchVlans];
                    c[idx].ip = e.target.value;
                    setBatchVlans(c);
                  }}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
                <input
                  type="text"
                  placeholder="Mask (e.g. 255.255.255.0)"
                  value={item.mask || '255.255.255.0'}
                  onChange={(e) => {
                    const c = [...batchVlans];
                    c[idx].mask = e.target.value;
                    setBatchVlans(c);
                  }}
                  className="w-36 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
                <button
                  onClick={() => setBatchVlans(batchVlans.filter((_, i) => i !== idx))}
                  className="p-1.5 text-rose-400 hover:text-rose-300 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleLaunchBatch}
              disabled={batchVlans.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg transition cursor-pointer disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Preview & Deploy {batchVlans.length} VLANs</span>
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
