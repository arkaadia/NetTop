import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Play,
  Wrench,
  CheckCircle2,
  Lock,
  FileCheck
} from 'lucide-react';
import { Device } from '../../types';
import { SecurityAuditReport, SecurityAuditItem, AutomationTaskRequest } from '../../types/automation';
import { fetchSecurityAudit } from '../../services/automationApi';
import { AutomationLifecycleModal } from './AutomationLifecycleModal';
import { WorkflowTriggerBadge } from '../WorkflowTriggerBadge';

interface CiscoSecurityViewProps {
  devices: Device[];
}

export const CiscoSecurityView: React.FC<CiscoSecurityViewProps> = ({ devices }) => {
  const [selectedDevice, setSelectedDevice] = useState<string>(devices[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SecurityAuditReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeTask, setActiveTask] = useState<AutomationTaskRequest | null>(null);

  const runAudit = async (devId: string) => {
    if (!devId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const rep = await fetchSecurityAudit(devId);
      setReport(rep);
    } catch (err: any) {
      setErrorMsg(err.message || 'Audit query failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDevice) {
      runAudit(selectedDevice);
    }
  }, [selectedDevice]);

  // Launch remediation for a single audit check item
  const handleRemediateSingle = (item: SecurityAuditItem) => {
    setActiveTask({
      deviceId: selectedDevice,
      vendor: 'cisco',
      category: 'security',
      actionName: `remediate-${item.id}`,
      parameters: {
        disableTelnet: item.id === 'cisco-sec-telnet',
        enforceSshV2: item.id === 'cisco-sec-ssh2',
        encryptPasswords: item.id === 'cisco-sec-pw-encrypt',
        disableHttpServer: item.id === 'cisco-sec-http',
        loginBlock: item.id === 'cisco-sec-login-block',
        bpduGuardDefault: item.id === 'cisco-sec-bpduguard',
        bannerMotd: item.id === 'cisco-sec-banner'
      }
    });
  };

  // Launch full security hardening baseline
  const handleRemediateAll = () => {
    setActiveTask({
      deviceId: selectedDevice,
      vendor: 'cisco',
      category: 'security',
      actionName: 'securityHardening',
      parameters: {
        domainName: 'netops.corp',
        enableSshV2: true,
        servicePasswordEncryption: true,
        disableTelnet: true,
        disableHttpServer: true,
        loginBlock: true,
        bpduGuardDefault: true,
        bannerMotd: 'AUTHORIZED SYSTEM ACCESS ONLY. ALL SESSIONS MONITORED.'
      }
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Cisco Security Hardening & Compliance Engine</h3>
              <WorkflowTriggerBadge componentName="CiscoSecurityView" />
            </div>
            <p className="text-[11px] text-slate-400">
              Zero-Trust posture audit, CIS Benchmark verification, and automated vulnerability remediation
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
          <button
            onClick={() => runAudit(selectedDevice)}
            disabled={loading}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer"
            title="Re-run Live Security Audit"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400">Scanning device running configuration & checking compliance...</p>
        </div>
      ) : errorMsg ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs">
          Failed to perform security audit: {errorMsg}
        </div>
      ) : report ? (
        <div className="space-y-4">
          {/* Security Score Overview Card */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl border ${getScoreColor(report.score)}`}>
                <span className="text-2xl font-black">{report.score}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Score / 100</span>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  Compliance Posture: {report.score >= 80 ? 'Good' : report.score >= 60 ? 'Needs Attention' : 'Vulnerable'}
                </h4>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <span className="text-emerald-400 font-bold">{report.passedChecks} Passed</span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">{report.warningsCount} Warnings</span>
                  <span>•</span>
                  <span className="text-rose-400 font-bold">{report.criticalCount} Critical</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Last audit timestamp: {new Date(report.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <button
              onClick={handleRemediateAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(99,102,241,0.4)] transition cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              <span>Apply Full Hardening Baseline</span>
            </button>
          </div>

          {/* Audit Checklist Table */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Security Compliance Checks & Remediations
            </span>

            <div className="space-y-2.5">
              {report.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap md:flex-nowrap items-center justify-between gap-3 p-3 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {item.status === 'secure' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : item.status === 'critical' ? (
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{item.title}</span>
                        <span className="text-[10px] text-slate-500 uppercase">({item.category})</span>
                        {item.scoreDeduction > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            -{item.scoreDeduction} pts
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{item.risk}</p>
                      <div className="text-[10px] font-mono text-slate-500">
                        Current: <span className="text-slate-300">{item.currentSetting}</span> • Recommended:{' '}
                        <span className="text-cyan-300">{item.recommendedSetting}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {item.status === 'secure' ? (
                      <span className="text-[11px] font-semibold text-emerald-400/90 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Compliant
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRemediateSingle(item)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white text-xs font-bold border border-indigo-500/40 transition cursor-pointer"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>Remediate</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Lifecycle Modal */}
      <AutomationLifecycleModal
        isOpen={!!activeTask}
        onClose={() => setActiveTask(null)}
        task={activeTask}
        onSuccess={() => runAudit(selectedDevice)}
      />
    </div>
  );
};
