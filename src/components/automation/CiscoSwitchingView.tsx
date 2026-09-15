import React, { useState } from 'react';
import {
  Layers,
  Shield,
  Play,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Settings
} from 'lucide-react';
import { Device } from '../../types';
import { AutomationTaskRequest } from '../../types/automation';
import { AutomationLifecycleModal } from './AutomationLifecycleModal';
import { WorkflowTriggerBadge } from '../WorkflowTriggerBadge';

interface CiscoSwitchingViewProps {
  devices: Device[];
}

export const CiscoSwitchingView: React.FC<CiscoSwitchingViewProps> = ({ devices }) => {
  const switchDevices = devices.filter(
    (d) => d.type === 'switch' || d.role?.toLowerCase().includes('switch') || d.role?.toLowerCase().includes('access')
  );
  const targetDeviceList = switchDevices.length > 0 ? switchDevices : devices;

  const [selectedDevice, setSelectedDevice] = useState<string>(targetDeviceList[0]?.id || '');
  const [interfaceName, setInterfaceName] = useState('GigabitEthernet1/0/1');
  const [portMode, setPortMode] = useState<'access' | 'trunk'>('access');

  // Access port state
  const [accessVlan, setAccessVlan] = useState<number>(10);
  const [voiceVlan, setVoiceVlan] = useState<number | ''>('');
  const [portfast, setPortfast] = useState(true);
  const [bpduguard, setBpduguard] = useState(true);

  // Trunk port state
  const [nativeVlan, setNativeVlan] = useState<number>(1);
  const [allowedVlans, setAllowedVlans] = useState('10,20,30,100');

  // Shared interface state
  const [description, setDescription] = useState('WORKSTATION-PORT');
  const [speed, setSpeed] = useState<'auto' | '100' | '1000'>('auto');
  const [duplex, setDuplex] = useState<'auto' | 'full' | 'half'>('auto');
  const [shutdown, setShutdown] = useState(false);

  const [activeTask, setActiveTask] = useState<AutomationTaskRequest | null>(null);

  const handleLaunchConfig = () => {
    if (portMode === 'access') {
      setActiveTask({
        deviceId: selectedDevice,
        vendor: 'cisco',
        category: 'switching',
        actionName: 'accessPort',
        parameters: {
          interfaceName,
          vlan: accessVlan,
          voiceVlan: voiceVlan !== '' ? Number(voiceVlan) : undefined,
          portfast,
          bpduguard,
          description: description || undefined,
          speed: speed !== 'auto' ? speed : undefined,
          duplex: duplex !== 'auto' ? duplex : undefined,
          shutdown
        }
      });
    } else {
      setActiveTask({
        deviceId: selectedDevice,
        vendor: 'cisco',
        category: 'switching',
        actionName: 'trunkPort',
        parameters: {
          interfaceName,
          nativeVlan,
          allowedVlans,
          description: description || undefined,
          shutdown
        }
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Target Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Cisco Switching & Port Manager</h3>
              <WorkflowTriggerBadge componentName="CiscoSwitchingView" />
            </div>
            <p className="text-[11px] text-slate-400">
              Access/Trunk provisioning, Voice VLAN, Spanning-Tree PortFast, and BPDU Guard
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

      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
        {/* Interface & Mode Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Target Interface</label>
            <input
              type="text"
              value={interfaceName}
              onChange={(e) => setInterfaceName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
            />
            <span className="text-[10px] text-slate-500">e.g. GigabitEthernet1/0/1 or TenGigabitEthernet1/0/48</span>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Port Operational Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPortMode('access')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  portMode === 'access'
                    ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                Access Mode
              </button>
              <button
                type="button"
                onClick={() => setPortMode('trunk')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  portMode === 'trunk'
                    ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                Trunk Mode
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Port Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
            />
          </div>
        </div>

        {/* Dynamic Parameters based on Mode */}
        {portMode === 'access' ? (
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-3">
            <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> Access Port Parameters (VLAN & Edge Security)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Data Access VLAN ID</label>
                <input
                  type="number"
                  min="1"
                  max="4094"
                  value={accessVlan}
                  onChange={(e) => setAccessVlan(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Voice VLAN ID (Optional)</label>
                <input
                  type="number"
                  min="1"
                  max="4094"
                  placeholder="e.g. 50"
                  value={voiceVlan}
                  onChange={(e) => setVoiceVlan(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center pt-4">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={portfast}
                    onChange={(e) => setPortfast(e.target.checked)}
                    className="rounded text-indigo-600 cursor-pointer"
                  />
                  <span>STP PortFast (Edge mode)</span>
                </label>
              </div>

              <div className="flex items-center pt-4">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bpduguard}
                    onChange={(e) => setBpduguard(e.target.checked)}
                    className="rounded text-indigo-600 cursor-pointer"
                  />
                  <span>BPDU Guard (Err-disable on BPDU)</span>
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-3">
            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> Trunk Port Parameters (802.1Q Encapsulation)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Native VLAN ID</label>
                <input
                  type="number"
                  min="1"
                  max="4094"
                  value={nativeVlan}
                  onChange={(e) => setNativeVlan(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Allowed VLAN List</label>
                <input
                  type="text"
                  placeholder="e.g. 10,20,30,100 or 1-100"
                  value={allowedVlans}
                  onChange={(e) => setAllowedVlans(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono"
                />
                <span className="text-[10px] text-slate-500">Comma-separated or range format (e.g. 10,20-30,99)</span>
              </div>
            </div>
          </div>
        )}

        {/* Physical Layer & Admin Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Speed</label>
            <select
              value={speed}
              onChange={(e) => setSpeed(e.target.value as any)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white"
            >
              <option value="auto">Auto-Negotiate</option>
              <option value="1000">1 Gbps (1000)</option>
              <option value="100">100 Mbps</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Duplex</label>
            <select
              value={duplex}
              onChange={(e) => setDuplex(e.target.value as any)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white"
            >
              <option value="auto">Auto-Negotiate</option>
              <option value="full">Full Duplex</option>
              <option value="half">Half Duplex</option>
            </select>
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={shutdown}
                onChange={(e) => setShutdown(e.target.checked)}
                className="rounded text-rose-600 cursor-pointer"
              />
              <span className={shutdown ? 'text-rose-400 font-bold' : ''}>
                {shutdown ? 'Administrative Shutdown (Port Down)' : 'Enabled (No Shutdown)'}
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <button
            onClick={handleLaunchConfig}
            disabled={!interfaceName}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg transition cursor-pointer disabled:opacity-40"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Preview & Apply Switchport Configuration</span>
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
