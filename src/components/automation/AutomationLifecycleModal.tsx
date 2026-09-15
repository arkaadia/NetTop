import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Copy,
  Terminal,
  Database,
  ArrowRight,
  Eye,
  Check,
  Search,
  Sparkles
} from 'lucide-react';
import {
  AutomationTaskRequest,
  ConfigPreview,
  ValidationResult
} from '../../types/automation';
import {
  getAutomationPreview,
  applyAutomation,
  rollbackAutomation,
  ApplyResult
} from '../../services/automationApi';
import { useLanguage } from '../../i18n';
import { WorkflowTriggerBadge } from '../WorkflowTriggerBadge';

interface AutomationLifecycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: AutomationTaskRequest | null;
  onSuccess?: () => void;
}

export const AutomationLifecycleModal: React.FC<AutomationLifecycleModalProps> = ({
  isOpen,
  onClose,
  task,
  onSuccess
}) => {
  const { t, isRtl } = useLanguage();

  const [stage, setStage] = useState<
    'preview' | 'applying' | 'verified' | 'failed' | 'rolled_back'
  >('preview');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{
    validation: ValidationResult;
    preview: ConfigPreview;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Safety options
  const [autoRollback, setAutoRollback] = useState(true);
  const [confirmedRisk, setConfirmedRisk] = useState(false);
  const [copied, setCopied] = useState(false);

  // Execution result
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [rollingBack, setRollingBack] = useState(false);

  // Load preview whenever modal opens or task changes
  useEffect(() => {
    if (isOpen && task) {
      setStage('preview');
      setErrorMsg(null);
      setApplyResult(null);
      setConfirmedRisk(false);
      setLoadingPreview(true);

      getAutomationPreview(task)
        .then((data) => {
          setPreviewData(data);
          // If low or medium risk, pre-confirm risk
          if (data.validation.riskLevel === 'low') {
            setConfirmedRisk(true);
          }
        })
        .catch((err) => {
          setErrorMsg(err.message || 'Failed to generate preview');
        })
        .finally(() => {
          setLoadingPreview(false);
        });
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const handleCopyCommands = () => {
    if (previewData?.preview.commands) {
      navigator.clipboard.writeText(previewData.preview.commands.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = async () => {
    if (!task) return;
    setStage('applying');
    setErrorMsg(null);

    try {
      const result = await applyAutomation(task, autoRollback, 'admin');
      setApplyResult(result);
      if (result.success) {
        setStage('verified');
        if (onSuccess) onSuccess();
      } else if (result.rolledBack) {
        setStage('rolled_back');
      } else {
        setStage('failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Execution error');
      setStage('failed');
    }
  };

  const handleManualRollback = async () => {
    if (!task || !applyResult) return;
    setRollingBack(true);
    try {
      await rollbackAutomation(task.deviceId, applyResult.backupId, previewData?.preview.rollbackCommands);
      setStage('rolled_back');
    } catch (err: any) {
      setErrorMsg(err.message || 'Rollback error');
    } finally {
      setRollingBack(false);
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            CRITICAL RISK
          </span>
        );
      case 'high':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            HIGH RISK
          </span>
        );
      case 'medium':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            MEDIUM RISK
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            LOW RISK
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-blur"
      data-modal-backdrop="true"
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900/95 border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] spatial-glass backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-cyan-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Automation Pipeline: {task.actionName}
                </h3>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded uppercase font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {task.vendor}
                </span>
                <WorkflowTriggerBadge componentName="AutomationLifecycleModal" />
              </div>
              <p className="text-[11px] text-slate-400">
                Target Device: <b className="text-slate-200 font-mono">{task.deviceId}</b> • Category: <b className="text-indigo-300">{task.category}</b>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 8-Step Lifecycle Progression Indicator */}
        <div className="bg-black/30 border-b border-white/10 px-4 py-2 flex items-center justify-between text-[10px] font-mono overflow-x-auto custom-scrollbar shrink-0">
          {[
            { id: 'discover', label: '1. Discover' },
            { id: 'validate', label: '2. Validate' },
            { id: 'generate', label: '3. Generate' },
            { id: 'preview', label: '4. Preview' },
            { id: 'backup', label: '5. Backup' },
            { id: 'apply', label: '6. Apply' },
            { id: 'verify', label: '7. Verify' },
            { id: 'rollback', label: '8. Rollback' }
          ].map((s, idx) => {
            const isCompleted =
              stage === 'verified' ||
              (stage === 'applying' && idx <= 5) ||
              (stage === 'preview' && idx <= 3);
            const isCurrent =
              (stage === 'preview' && idx === 3) ||
              (stage === 'applying' && (idx === 4 || idx === 5)) ||
              (stage === 'verified' && idx === 6) ||
              ((stage === 'failed' || stage === 'rolled_back') && idx === 7);

            return (
              <div
                key={s.id}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
                  isCurrent
                    ? 'bg-indigo-600 text-white font-bold shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                    : isCompleted
                    ? 'text-emerald-400 font-medium'
                    : 'text-slate-500'
                }`}
              >
                <span>{s.label}</span>
                {idx < 7 && <ArrowRight className="w-2.5 h-2.5 opacity-40 ml-1" />}
              </div>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {loadingPreview ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-xs text-slate-400">Validating syntax & generating vendor configuration...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Execution / Validation Error</p>
                <p className="mt-1 font-mono text-[11px]">{errorMsg}</p>
              </div>
            </div>
          ) : previewData ? (
            <>
              {/* Validation & Risk Assessment Banner */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-300">Safety & Risk Assessment:</span>
                    {getRiskBadge(previewData.validation.riskLevel)}
                  </div>
                  <p className="text-[11px] text-slate-400">{previewData.validation.impactDescription}</p>
                </div>
                {previewData.validation.warnings.length > 0 && (
                  <div className="text-[11px] text-amber-300/90 font-mono bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 max-w-xs">
                    {previewData.validation.warnings[0]}
                  </div>
                )}
              </div>

              {/* Generated Commands Preview Screen */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      CLI Configuration Sequence ({previewData.preview.commands.length} Commands)
                    </span>
                  </div>
                  <button
                    onClick={handleCopyCommands}
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy CLI'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-black/70 border border-white/10 font-mono text-xs text-emerald-400/95 space-y-1 overflow-x-auto max-h-48 custom-scrollbar">
                  {previewData.preview.commands.map((cmd, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-slate-600 select-none">{i + 1}</span>
                      <span className={cmd.startsWith('!') || cmd.startsWith('#') ? 'text-slate-500 italic' : ''}>
                        {cmd}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verification & Rollback Previews */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                    Post-Apply Verification Checks
                  </span>
                  <div className="font-mono text-[11px] text-slate-400 space-y-0.5">
                    {previewData.preview.verificationCommands.map((vCmd, idx) => (
                      <div key={idx} className="truncate">• {vCmd}</div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                    Automated Rollback Strategy
                  </span>
                  <div className="font-mono text-[11px] text-slate-400 space-y-0.5">
                    {previewData.preview.rollbackCommands.length > 0 ? (
                      previewData.preview.rollbackCommands.slice(0, 3).map((rCmd, idx) => (
                        <div key={idx} className="truncate">• {rCmd}</div>
                      ))
                    ) : (
                      <div>Snapshot restoration via Pre-apply Backup</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Execution Output & Verification Summary (When Applied) */}
              {applyResult && (
                <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/15 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      {applyResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      )}
                      Execution Status: {applyResult.success ? 'Success & Verified' : 'Failed / Incomplete'}
                    </span>
                    {applyResult.backupId && (
                      <span className="font-mono text-[10px] text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                        Snapshot: {applyResult.backupId}
                      </span>
                    )}
                  </div>

                  <div className="font-mono text-[11px] text-slate-300 bg-black/60 p-2.5 rounded-lg max-h-32 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                    {applyResult.verification.summary}
                    {applyResult.error && `\nError: ${applyResult.error}`}
                    {applyResult.rolledBack && `\n\n[Auto-Rollback Triggered]: Changes safely reverted.`}
                  </div>
                </div>
              )}

              {/* Safety Confirmation Checklist for High/Critical Risk */}
              {stage === 'preview' && (
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="auto-rollback-toggle"
                      checked={autoRollback}
                      onChange={(e) => setAutoRollback(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="auto-rollback-toggle" className="text-xs text-slate-300 cursor-pointer">
                      <b>Automatic Rollback on Verification Failure</b> (Recommended for live environments)
                    </label>
                  </div>

                  {previewData.validation.riskLevel !== 'low' && (
                    <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                      <input
                        type="checkbox"
                        id="risk-confirm-toggle"
                        checked={confirmedRisk}
                        onChange={(e) => setConfirmedRisk(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="risk-confirm-toggle" className="text-xs text-amber-200 font-semibold cursor-pointer">
                        I understand the operational impact and authorize pre-backup execution on live device.
                      </label>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between p-4 border-t border-white/10 shrink-0 bg-white/[0.02]">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition cursor-pointer"
          >
            {stage === 'verified' ? 'Done' : 'Cancel'}
          </button>

          <div className="flex items-center gap-2">
            {stage === 'failed' && !applyResult?.rolledBack && (
              <button
                onClick={handleManualRollback}
                disabled={rollingBack}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{rollingBack ? 'Reverting...' : 'Rollback Now'}</span>
              </button>
            )}

            {stage === 'preview' && (
              <button
                onClick={handleApply}
                disabled={!previewData?.validation.valid || !confirmedRisk || loadingPreview}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(99,102,241,0.4)] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute & Apply Pipeline</span>
              </button>
            )}

            {stage === 'applying' && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/30 text-indigo-200 text-xs font-bold border border-indigo-500/40">
                <div className="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                <span>Executing on Device...</span>
              </div>
            )}

            {stage === 'verified' && (
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Verified Successfully</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
