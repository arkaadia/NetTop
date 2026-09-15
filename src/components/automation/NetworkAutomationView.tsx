import React, { useState } from 'react';
import {
  Cpu,
  Route,
  Layers,
  Network,
  ShieldCheck,
  Database,
  FileCheck,
  Sliders,
  Radio,
  Share2,
  CheckCircle2,
  AlertTriangle,
  History,
  Terminal,
  Activity
} from 'lucide-react';
import { Device } from '../../types';
import { CiscoRoutingView } from './CiscoRoutingView';
import { CiscoSwitchingView } from './CiscoSwitchingView';
import { CiscoVlanView } from './CiscoVlanView';
import { CiscoSecurityView } from './CiscoSecurityView';
import { CiscoAdvancedView } from './CiscoAdvancedView';
import { MikrotikAutomationView } from './MikrotikAutomationView';
import { AutomationBackupsView } from './AutomationBackupsView';
import { AutomationAuditView } from './AutomationAuditView';
import { WorkflowTriggerBadge } from '../WorkflowTriggerBadge';

interface NetworkAutomationViewProps {
  devices: Device[];
}

export const NetworkAutomationView: React.FC<NetworkAutomationViewProps> = ({ devices }) => {
  const [vendor, setVendor] = useState<'cisco' | 'mikrotik'>('cisco');
  const [ciscoTab, setCiscoTab] = useState<
    'routing' | 'switching' | 'vlan' | 'advanced' | 'security' | 'backups' | 'audit'
  >('routing');
  const [mikrotikTab, setMikrotikTab] = useState<'automation' | 'backups' | 'audit'>('automation');

  const pendingChangesCount = devices.filter((d) => (d as any).has_unsaved_changes).length;
  const ciscoDevices = devices.filter((d) => !(d.model || '').toLowerCase().includes('mikrotik'));
  const mikrotikDevices = devices.filter((d) => (d.model || '').toLowerCase().includes('mikrotik'));

  return (
    <div className="space-y-5">
      {/* Top Banner: Metrics & Vendor Selector */}
      <div className="p-4 rounded-3xl bg-slate-900/60 border border-white/10 spatial-glass backdrop-blur-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-wide">Network Automation Engine</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  REAL SSH ACTIVE
                </span>
                <WorkflowTriggerBadge componentName="NetworkAutomationView" />
              </div>
              <p className="text-xs text-slate-400">
                8-Stage Deterministic Pipeline: Discover → Validate → Generate → Preview → Backup → Apply → Verify → Rollback
              </p>
            </div>
          </div>

          {/* Vendor Selector Pill Switcher */}
          <div className="flex items-center p-1 rounded-2xl bg-black/50 border border-white/10">
            <button
              onClick={() => setVendor('cisco')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                vendor === 'cisco'
                  ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Cisco IOS / XE ({ciscoDevices.length})</span>
            </button>
            <button
              onClick={() => setVendor('mikrotik')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                vendor === 'mikrotik'
                  ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>MikroTik RouterOS ({mikrotikDevices.length || devices.length})</span>
            </button>
          </div>
        </div>

        {/* Quick Operational Telemetry Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <span className="text-slate-400">Inventory Nodes</span>
            <span className="font-bold text-white font-mono">{devices.length} Devices</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <span className="text-slate-400">Pending Changes</span>
            <span
              className={`font-bold font-mono ${
                pendingChangesCount > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {pendingChangesCount} Pending
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <span className="text-slate-400">Safety Verification</span>
            <span className="font-bold text-cyan-400 font-mono">Real-Time SSH</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <span className="text-slate-400">Rollback Mode</span>
            <span className="font-bold text-emerald-400 font-mono">Auto-Revert Armed</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      {vendor === 'cisco' ? (
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.02] border border-white/10 overflow-x-auto custom-scrollbar">
          {[
            { id: 'routing', label: 'Routing & OSPF', icon: Route },
            { id: 'switching', label: 'Switchports & 802.1Q', icon: Layers },
            { id: 'vlan', label: 'VLAN & SVI Database', icon: Network },
            { id: 'advanced', label: 'Advanced Services (LACP / STP / NAT / DHCP)', icon: Sliders },
            { id: 'security', label: 'Security Hardening & Audit', icon: ShieldCheck },
            { id: 'backups', label: 'Snapshot Vault', icon: Database },
            { id: 'audit', label: 'Audit Trail', icon: FileCheck }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = ciscoTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCiscoTab(item.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white font-bold shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.02] border border-white/10 overflow-x-auto custom-scrollbar">
          {[
            { id: 'automation', label: 'MikroTik Suite (VPN / Firewall / Failover)', icon: Radio },
            { id: 'backups', label: 'Snapshot Vault', icon: Database },
            { id: 'audit', label: 'Audit Trail', icon: FileCheck }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = mikrotikTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setMikrotikTab(item.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-cyan-600 text-white font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Subview Container */}
      <div className="min-h-[500px]">
        {vendor === 'cisco' ? (
          <>
            {ciscoTab === 'routing' && <CiscoRoutingView devices={ciscoDevices.length > 0 ? ciscoDevices : devices} />}
            {ciscoTab === 'switching' && <CiscoSwitchingView devices={ciscoDevices.length > 0 ? ciscoDevices : devices} />}
            {ciscoTab === 'vlan' && <CiscoVlanView devices={ciscoDevices.length > 0 ? ciscoDevices : devices} />}
            {ciscoTab === 'advanced' && <CiscoAdvancedView devices={ciscoDevices.length > 0 ? ciscoDevices : devices} />}
            {ciscoTab === 'security' && <CiscoSecurityView devices={ciscoDevices.length > 0 ? ciscoDevices : devices} />}
            {ciscoTab === 'backups' && <AutomationBackupsView devices={ciscoDevices.length > 0 ? ciscoDevices : devices} />}
            {ciscoTab === 'audit' && <AutomationAuditView devices={ciscoDevices.length > 0 ? ciscoDevices : devices} />}
          </>
        ) : (
          <>
            {mikrotikTab === 'automation' && <MikrotikAutomationView devices={mikrotikDevices.length > 0 ? mikrotikDevices : devices} />}
            {mikrotikTab === 'backups' && <AutomationBackupsView devices={mikrotikDevices.length > 0 ? mikrotikDevices : devices} />}
            {mikrotikTab === 'audit' && <AutomationAuditView devices={mikrotikDevices.length > 0 ? mikrotikDevices : devices} />}
          </>
        )}
      </div>
    </div>
  );
};
