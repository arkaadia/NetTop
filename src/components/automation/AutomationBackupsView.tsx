import React, { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  RotateCcw,
  Eye,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react';
import { BackupRecord } from '../../types/automation';
import { fetchBackups, rollbackAutomation } from '../../services/automationApi';
import { Device } from '../../types';
import { WorkflowTriggerBadge } from '../WorkflowTriggerBadge';

interface AutomationBackupsViewProps {
  devices: Device[];
}

export const AutomationBackupsView: React.FC<AutomationBackupsViewProps> = ({ devices }) => {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [activeBackup, setActiveBackup] = useState<BackupRecord | null>(null);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [revertResult, setRevertResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const data = await fetchBackups(selectedDevice === 'all' ? undefined : selectedDevice);
      setBackups(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, [selectedDevice]);

  const handleRollback = async (backup: BackupRecord) => {
    if (!window.confirm(`Are you sure you want to revert ${backup.deviceName} to snapshot from ${new Date(backup.timestamp).toLocaleString()}?`)) {
      return;
    }
    setRevertingId(backup.id);
    setRevertResult(null);

    try {
      const res = await rollbackAutomation(backup.deviceId, backup.id);
      if (res.success) {
        setRevertResult({ success: true, message: `Successfully restored ${backup.deviceName} to snapshot.` });
      } else {
        setRevertResult({ success: false, message: res.error || 'Rollback failed on device.' });
      }
    } catch (err: any) {
      setRevertResult({ success: false, message: err.message || 'Rollback error' });
    } finally {
      setRevertingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Automated Snapshot & Backup Vault</h3>
              <WorkflowTriggerBadge componentName="AutomationBackupsView" />
            </div>
            <p className="text-[11px] text-slate-400">
              Immutable pre-apply snapshots automatically captured prior to any configuration push
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Devices ({devices.length})</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.ip})
              </option>
            ))}
          </select>
          <button
            onClick={loadBackups}
            disabled={loading}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer"
            title="Refresh Backups"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {revertResult && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            revertResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {revertResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{revertResult.message}</span>
        </div>
      )}

      {/* Backups List */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
        {loading ? (
          <div className="py-12 flex justify-center text-xs text-slate-400">Loading snapshot registry...</div>
        ) : backups.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No snapshots recorded yet. Snapshots are automatically captured before applying configurations.
          </div>
        ) : (
          <div className="space-y-2">
            {backups.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white/5 text-slate-300 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{b.deviceName}</span>
                      <span className="text-[10px] font-mono text-slate-400">({b.deviceIp})</span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-300">
                        {b.vendor}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{b.reason}</p>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 mt-1">
                      <span>{new Date(b.timestamp).toLocaleString()}</span>
                      <span>•</span>
                      <span>{(b.sizeBytes / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveBackup(b)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Config</span>
                  </button>
                  <button
                    onClick={() => handleRollback(b)}
                    disabled={revertingId === b.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold border border-rose-500/30 transition cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${revertingId === b.id ? 'animate-spin' : ''}`} />
                    <span>{revertingId === b.id ? 'Restoring...' : 'Restore'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Snapshot Viewer Modal */}
      {activeBackup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-blur"
          data-modal-backdrop="true"
        >
          <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h4 className="text-sm font-bold text-white">Snapshot Configuration: {activeBackup.deviceName}</h4>
                <p className="text-[11px] text-slate-400 font-mono">
                  Captured at {new Date(activeBackup.timestamp).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setActiveBackup(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto font-mono text-xs text-emerald-400 bg-black/80 space-y-1 custom-scrollbar">
              <pre className="whitespace-pre-wrap">{activeBackup.config || 'Empty configuration snapshot.'}</pre>
            </div>

            <div className="flex justify-end p-3 border-t border-white/10">
              <button
                onClick={() => setActiveBackup(null)}
                className="px-4 py-1.5 rounded-xl bg-white/10 text-xs font-bold text-white hover:bg-white/15 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
