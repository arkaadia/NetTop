import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  Calendar,
  User,
  Terminal
} from 'lucide-react';
import { AuditLogEntry } from '../../types/automation';
import { fetchAuditLogs } from '../../services/automationApi';
import { Device } from '../../types';
import { WorkflowTriggerBadge } from '../WorkflowTriggerBadge';

interface AutomationAuditViewProps {
  devices: Device[];
}

export const AutomationAuditView: React.FC<AutomationAuditViewProps> = ({ devices }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs({
        status: statusFilter === 'all' ? undefined : statusFilter,
        vendor: vendorFilter === 'all' ? undefined : vendorFilter,
        q: searchQuery || undefined
      });
      setLogs(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [statusFilter, vendorFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3" /> SUCCESS
          </span>
        );
      case 'rolled_back':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <RotateCcw className="w-3 h-3" /> ROLLED BACK
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <AlertTriangle className="w-3 h-3" /> FAILED
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Automation Audit & Governance Log</h3>
              <WorkflowTriggerBadge componentName="AutomationAuditView" />
            </div>
            <p className="text-[11px] text-slate-400">
              Complete tamper-evident execution ledger, change accountability, and verification logs
            </p>
          </div>
        </div>

        <button
          onClick={loadLogs}
          disabled={loading}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer"
          title="Refresh Audit Logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters & Search */}
      <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by device, action, user, or command..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-white placeholder-slate-500 focus:border-cyan-500"
          />
        </div>

        <select
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-white focus:border-cyan-500"
        >
          <option value="all">All Vendors</option>
          <option value="cisco">Cisco</option>
          <option value="mikrotik">MikroTik</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-white focus:border-cyan-500"
        >
          <option value="all">All Statuses</option>
          <option value="success">Success</option>
          <option value="rolled_back">Rolled Back</option>
          <option value="failed">Failed</option>
        </select>

        <button
          type="submit"
          className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition cursor-pointer"
        >
          Search
        </button>
      </form>

      {/* Logs Table */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
        {loading ? (
          <div className="py-12 flex justify-center text-xs text-slate-400">Loading governance log entries...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No audit records matching criteria. Pushed configurations automatically populate this ledger.
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const isExpanded = expandedId === log.id;
              return (
                <div
                  key={log.id}
                  className="rounded-xl bg-black/40 border border-white/10 overflow-hidden hover:border-white/20 transition"
                >
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusBadge(log.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{log.deviceName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({log.deviceIp})</span>
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-cyan-300">
                            {log.vendor}
                          </span>
                          <span className="text-[11px] font-bold text-indigo-300">
                            {log.actionName} ({log.category})
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono mt-0.5">
                          <span>User: {log.user}</span>
                          <span>•</span>
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                          <span>•</span>
                          <span>{log.commands.length} Commands</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      {log.verificationPassed ? (
                        <span className="text-emerald-400/90 font-medium">✓ Verified</span>
                      ) : (
                        <span className="text-rose-400/90 font-medium">⚠ Verification Note</span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Commands and Verification details */}
                  {isExpanded && (
                    <div className="p-3 bg-black/70 border-t border-white/10 space-y-2 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                          <Terminal className="w-3 h-3 text-cyan-400" /> Commands Pushed
                        </span>
                        <div className="p-2 rounded-lg bg-black font-mono text-[11px] text-emerald-400 space-y-0.5 overflow-x-auto max-h-36 custom-scrollbar">
                          {log.commands.map((c, i) => (
                            <div key={i}>
                              <span className="text-slate-600 mr-2">{i + 1}</span>
                              {c}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Verification Summary
                        </span>
                        <p className="font-mono text-[11px] text-slate-300 bg-white/5 p-2 rounded-lg">
                          {log.verificationSummary || 'No verification notes.'}
                        </p>
                      </div>

                      {log.error && (
                        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-[11px]">
                          Error: {log.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
