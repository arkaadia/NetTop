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
  ArrowRight,
  GitMerge,
  Server,
  Layers,
  Check,
  AlertCircle
} from 'lucide-react';
import { AutomationTaskRequest } from '../../types/automation';
import {
  getAutomationPreviewDual,
  applyAutomationDual,
  DualPreviewResult,
  DualApplyResult
} from '../../services/automationApi';
import { Device } from '../../types';
import { WorkflowTriggerBadge } from '../WorkflowTriggerBadge';

interface DualEtherChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  switchADevice?: Device;
  switchBDevice?: Device;
  taskA: AutomationTaskRequest | null;
  taskB: AutomationTaskRequest | null;
  onSuccess?: () => void;
}

export const DualEtherChannelModal: React.FC<DualEtherChannelModalProps> = ({
  isOpen,
  onClose,
  switchADevice,
  switchBDevice,
  taskA,
  taskB,
  onSuccess
}) => {
  const [stage, setStage] = useState<'preview' | 'applying' | 'verified' | 'failed' | 'rolled_back'>('preview');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<DualPreviewResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active view tab: 'both' | 'switchA' | 'switchB'
  const [activeTab, setActiveTab] = useState<'both' | 'switchA' | 'switchB'>('both');

  // Safety options
  const [autoRollback, setAutoRollback] = useState(true);
  const [confirmedRisk, setConfirmedRisk] = useState(true);
  const [copied, setCopied] = useState(false);

  // Execution result
  const [applyResult, setApplyResult] = useState<DualApplyResult | null>(null);

  useEffect(() => {
    if (isOpen && taskA && taskB) {
      setStage('preview');
      setErrorMsg(null);
      setApplyResult(null);
      setLoadingPreview(true);

      getAutomationPreviewDual(taskA, taskB)
        .then((data) => {
          setPreviewData(data);
        })
        .catch((err) => {
          setErrorMsg(err.message || 'Failed to generate dual preview');
        })
        .finally(() => {
          setLoadingPreview(false);
        });
    }
  }, [isOpen, taskA, taskB]);

  if (!isOpen || !taskA || !taskB) return null;

  const handleCopyCommands = () => {
    if (previewData) {
      const text = [
        `! ==========================================`,
        `! SWITCH A: ${switchADevice?.name || taskA.deviceId} (${switchADevice?.ip || ''})`,
        `! ==========================================`,
        ...(previewData.switchA.preview.commands || []),
        ``,
        `! ==========================================`,
        `! SWITCH B: ${switchBDevice?.name || taskB.deviceId} (${switchBDevice?.ip || ''})`,
        `! ==========================================`,
        ...(previewData.switchB.preview.commands || [])
      ].join('\n');

      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = async () => {
    if (!taskA || !taskB) return;
    setStage('applying');
    setErrorMsg(null);

    try {
      const result = await applyAutomationDual(taskA, taskB, autoRollback, 'admin');
      setApplyResult(result);
      if (result.overallSuccess) {
        setStage('verified');
        if (onSuccess) onSuccess();
      } else if (result.switchA.rolledBack || result.switchB.rolledBack) {
        setStage('rolled_back');
      } else {
        setStage('failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Dual apply error');
      setStage('failed');
    }
  };

  const nameA = switchADevice?.name || taskA.deviceId;
  const nameB = switchBDevice?.name || taskB.deviceId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-blur"
      data-modal-backdrop="true"
    >
      <div className="relative w-full max-w-4xl rounded-2xl bg-slate-900/95 border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] spatial-glass backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/40 text-cyan-400">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Dual-Switch EtherChannel (LACP) Orchestrator
                </h3>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Cisco IOS / XE
                </span>
                <WorkflowTriggerBadge componentName="DualEtherChannelModal" />
              </div>
              <p className="text-[11px] text-slate-400">
                Coordinated configuration of <b className="text-cyan-300 font-mono">{nameA}</b> and{' '}
                <b className="text-emerald-300 font-mono">{nameB}</b> with cross-switch rollback protection.
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

        {/* Visual Link Topology Representation */}
        <div className="bg-slate-950/60 border-b border-white/10 p-3 px-6 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
              <Server className="w-4 h-4 text-cyan-400" />
              <div className="text-left">
                <div className="text-[11px] font-bold text-cyan-200">{nameA}</div>
                <div className="text-[9px] font-mono text-cyan-400/80">
                  Po{taskA.parameters.channelId} ({taskA.parameters.mode})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-mono">
              <Layers className="w-3 h-3 text-indigo-400" />
              <span>802.1Q LACP Bundle (Po{taskA.parameters.channelId} ↔ Po{taskB.parameters.channelId})</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
              <Server className="w-4 h-4 text-emerald-400" />
              <div className="text-left">
                <div className="text-[11px] font-bold text-emerald-200">{nameB}</div>
                <div className="text-[9px] font-mono text-emerald-400/80">
                  Po{taskB.parameters.channelId} ({taskB.parameters.mode})
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-400">Risk Profile:</span>
            <span className="flex items-center gap-1 font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              High (Inter-Switch Trunk)
            </span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {loadingPreview ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-xs font-mono text-slate-400">
                Generating dual-switch Cisco IOS configuration and computing reverse rollback delta...
              </p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">Execution Error</p>
                <p className="font-mono text-[11px]">{errorMsg}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Tab Navigation for Switch A vs Switch B Commands */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('both')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'both'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Side-by-Side (Both Switches)
                  </button>
                  <button
                    onClick={() => setActiveTab('switchA')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'switchA'
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {nameA} (Switch A)
                  </button>
                  <button
                    onClick={() => setActiveTab('switchB')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'switchB'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {nameB} (Switch B)
                  </button>
                </div>

                <button
                  onClick={handleCopyCommands}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-mono transition cursor-pointer border border-white/10"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied Both!' : 'Copy All CLI'}</span>
                </button>
              </div>

              {/* Commands Display */}
              {previewData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(activeTab === 'both' || activeTab === 'switchA') && (
                    <div
                      className={`space-y-2 rounded-xl bg-slate-950/80 border border-cyan-500/20 p-3.5 ${
                        activeTab === 'switchA' ? 'col-span-2' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-400" />
                          <span className="text-xs font-bold text-cyan-200">
                            Switch A: {nameA} ({switchADevice?.ip})
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {previewData.switchA.preview.commands.length} lines
                        </span>
                      </div>

                      <pre className="p-3 rounded-lg bg-black/60 text-cyan-300 font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto custom-scrollbar border border-white/5 select-all">
                        {previewData.switchA.preview.commands.join('\n')}
                      </pre>

                      <div className="text-[10px] text-slate-400 pt-1">
                        <b>Verification:</b>{' '}
                        <code className="text-slate-300">{previewData.switchA.preview.verificationCommands.join(' | ')}</code>
                      </div>
                    </div>
                  )}

                  {(activeTab === 'both' || activeTab === 'switchB') && (
                    <div
                      className={`space-y-2 rounded-xl bg-slate-950/80 border border-emerald-500/20 p-3.5 ${
                        activeTab === 'switchB' ? 'col-span-2' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-xs font-bold text-emerald-200">
                            Switch B: {nameB} ({switchBDevice?.ip})
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {previewData.switchB.preview.commands.length} lines
                        </span>
                      </div>

                      <pre className="p-3 rounded-lg bg-black/60 text-emerald-300 font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto custom-scrollbar border border-white/5 select-all">
                        {previewData.switchB.preview.commands.join('\n')}
                      </pre>

                      <div className="text-[10px] text-slate-400 pt-1">
                        <b>Verification:</b>{' '}
                        <code className="text-slate-300">{previewData.switchB.preview.verificationCommands.join(' | ')}</code>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Execution Results Summary */}
              {applyResult && (
                <div className="space-y-3 pt-2">
                  <div
                    className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      applyResult.overallSuccess
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {applyResult.overallSuccess ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                      )}
                      <div>
                        <div className="text-xs font-bold">
                          {applyResult.overallSuccess
                            ? 'Both Switches Configured & Verified Successfully!'
                            : 'Orchestration Completed with Warnings or Errors'}
                        </div>
                        <div className="text-[11px] opacity-80 font-mono">
                          Switch A: {applyResult.switchA.success ? 'Verified' : 'Failed'} • Switch B:{' '}
                          {applyResult.switchB.success ? 'Verified' : 'Failed'}
                          {applyResult.switchA.rolledBack && ' (Switch A was safely rolled back)'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Terminal Outputs from both switches */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-black/80 border border-cyan-500/20 font-mono text-[10px] text-slate-300 space-y-1">
                      <div className="font-bold text-cyan-300 border-b border-white/10 pb-1">
                        Switch A Live Output:
                      </div>
                      <pre className="max-h-40 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                        {applyResult.switchA.executionOutput || 'No output received'}
                      </pre>
                    </div>
                    <div className="p-3 rounded-xl bg-black/80 border border-emerald-500/20 font-mono text-[10px] text-slate-300 space-y-1">
                      <div className="font-bold text-emerald-300 border-b border-white/10 pb-1">
                        Switch B Live Output:
                      </div>
                      <pre className="max-h-40 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                        {applyResult.switchB.executionOutput || 'No output received'}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Safety Guarantees Notice */}
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>
                    <b>Cross-Switch Safety:</b> Automatic full snapshots of <code>running-config</code> will be saved for both switches before sending commands.
                  </span>
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoRollback}
                    onChange={(e) => setAutoRollback(e.target.checked)}
                    className="rounded bg-slate-900 border-white/20 text-indigo-600 focus:ring-0"
                  />
                  <span>Auto-rollback if either switch fails</span>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 shrink-0 bg-white/[0.02] flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            {stage === 'preview' && 'Review generated IOS configuration before pushing to production.'}
            {stage === 'applying' && 'Executing SSH commands and running post-check verification...'}
            {stage === 'verified' && 'EtherChannel configuration is active and operational.'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              {stage === 'verified' ? 'Close' : 'Cancel'}
            </button>

            {stage === 'preview' && (
              <button
                onClick={handleApply}
                disabled={loadingPreview}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-cyan-600 to-emerald-600 hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold shadow-lg transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Apply to Both Switches via SSH</span>
              </button>
            )}

            {stage === 'applying' && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/30 border border-indigo-500/50 text-indigo-200 text-xs font-semibold">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                <span>Deploying to Switch A & B...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
