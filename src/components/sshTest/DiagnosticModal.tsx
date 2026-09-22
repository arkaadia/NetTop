import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
  Terminal,
  ShieldCheck,
  Server,
  Network,
  Cpu,
  ArrowRight,
  Info,
  Clock,
  Layers
} from 'lucide-react';
import { useLanguage } from '../../i18n';
import { SshTestDevice, DiagnosticReport, DiagnosticStep } from '../../types/sshTest';
import { diagnoseDevice } from '../../services/sshTestApi';

interface DiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: SshTestDevice | null;
  onConnectTerminal?: (device: SshTestDevice) => void;
}

export const DiagnosticModal: React.FC<DiagnosticModalProps> = ({
  isOpen,
  onClose,
  device,
  onConnectTerminal
}) => {
  const { isRtl } = useLanguage();
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runAudit = async () => {
    if (!device) return;
    setIsRunning(true);
    setErrorMsg(null);
    try {
      const data = await diagnoseDevice(device.id);
      setReport(data);
    } catch (err: any) {
      setErrorMsg(err.message || (isRtl ? 'خطا در اجرای ممیزی ارتباط' : 'Failed to run diagnostic audit'));
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen && device) {
      runAudit();
    } else {
      setReport(null);
      setErrorMsg(null);
    }
  }, [isOpen, device?.id]);

  if (!isOpen || !device) return null;

  const failedStep = report?.steps?.find((s) => s.status === 'failed');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-blur" data-modal-backdrop="true">
      <div className="relative w-full max-w-3xl bg-slate-900/95 border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-950/40 text-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              report?.overall_status === 'passed'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : report?.overall_status === 'failed'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
            }`}>
              {isRunning ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Activity className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{isRtl ? 'ممیزی لایه‌به‌لایه ارتباط فرانت تا بک‌اند و دیوایس' : 'End-to-End Link & Diagnostic Audit'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {device.name} ({device.host}:{device.port})
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isRtl
                  ? 'بررسی ۸ لایه فنی: مرورگر ↔ درگاه اکسپرس ↔ موتور پارامیکو ۲ پایتون ↔ شبکه ↔ احراز هویت ↔ شل اینتراکتیو'
                  : 'Checks 8 layers: Browser ↔ Express Bridge ↔ Python Paramiko 2 ↔ TCP Network ↔ SSH Auth ↔ Interactive PTY'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
              <XCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Running State Banner */}
          {isRunning && (
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs flex items-center gap-3 animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400 shrink-0" />
              <div>
                <p className="font-semibold">{isRtl ? 'در حال اجرای ممیزی اتصال در لایه‌های ۸ گانه...' : 'Executing 8-layer diagnostic audit...'}</p>
                <p className="text-indigo-300/80 text-[11px] mt-0.5">
                  {isRtl
                    ? 'ارسال پکت‌های آزمایشی، اندازه‌گیری RTT پورت TCP، بررسی بنر شناسایی سرور و اعتبارسنجی احراز هویت پارامیکو...'
                    : 'Sending probes, measuring socket RTT, inspecting server SSH banner, and validating credentials...'}
                </p>
              </div>
            </div>
          )}

          {/* Overall Status Box */}
          {report && !isRunning && (
            <div>
              {report.overall_status === 'passed' ? (
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 space-y-2">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div>
                      <h3 className="text-sm font-bold text-emerald-300">
                        {isRtl ? 'ارتباط فرانت تا بک‌اند و دیوایس کاملاً پایدار و تایید شده است' : 'End-to-End Communication Fully Verified'}
                      </h3>
                      <p className="text-xs text-emerald-300/90 mt-0.5">
                        {isRtl ? report.summary_fa : report.summary_en}
                      </p>
                    </div>
                  </div>
                  {report.banner && (
                    <div className="text-[11px] font-mono bg-emerald-950/60 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-emerald-300">
                      <b>SSH Banner:</b> {report.banner}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
                    <div>
                      <h3 className="text-sm font-bold text-rose-300">
                        {isRtl
                          ? `اختلال شناسایی شد: ارتباط در لایه «${failedStep?.title_fa || report.failed_at_layer}» متوقف گردید`
                          : `Breakdown Detected: Communication failed at layer '${failedStep?.title_en || report.failed_at_layer}'`}
                      </h3>
                      <p className="text-xs text-rose-300/90 mt-0.5">
                        {isRtl
                          ? 'سامانه هوشمند تشخیص عیب مکان دقیق و علت عدم برقراری ارتباط را در زیر تفکیک نموده است:'
                          : 'The diagnostic engine has isolated the exact cause and recommended remediation:'}
                      </p>
                    </div>
                  </div>

                  {/* Remediation & Root Cause Details */}
                  {failedStep && (
                    <div className="bg-slate-950/80 border border-rose-500/30 rounded-xl p-3.5 space-y-2 text-xs">
                      {failedStep.error && (
                        <div>
                          <span className="font-semibold text-rose-400">{isRtl ? 'متن خطای فنی:' : 'Technical Error:'} </span>
                          <span className="font-mono text-rose-300">{failedStep.error}</span>
                        </div>
                      )}
                      {(failedStep.remediation_fa || failedStep.remediation_en) && (
                        <div className="pt-2 border-t border-rose-500/20">
                          <span className="font-semibold text-amber-300">{isRtl ? 'راهکار رفع مشکل:' : 'Recommended Fix:'} </span>
                          <span className="text-slate-200">
                            {isRtl ? failedStep.remediation_fa : failedStep.remediation_en}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 8-Layer Pipeline Cards */}
          {report?.steps && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isRtl ? 'وضعیت لایه‌های ارتباطی (۸ لایه)' : 'Communication Pipeline (8 Layers)'}</span>
              </h4>

              <div className="space-y-2">
                {report.steps.map((step, idx) => {
                  const isPassed = step.status === 'passed';
                  const isWarning = step.status === 'warning';
                  const isFailed = step.status === 'failed';

                  return (
                    <div
                      key={step.layer_id || idx}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isPassed
                          ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                          : isWarning
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                          : 'bg-rose-500/10 border-rose-500/40 text-rose-200 shadow-lg shadow-rose-950/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {isPassed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : isWarning ? (
                              <AlertTriangle className="w-4 h-4 text-amber-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white">
                                {isRtl ? step.title_fa : step.title_en}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800/80 font-mono text-slate-400">
                                {step.layer_id}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              {step.details || (isRtl ? step.details_fa : step.details_en) || step.error}
                            </p>
                          </div>
                        </div>

                        {step.latency_ms !== undefined && (
                          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 shrink-0">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{step.latency_ms} ms</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-slate-950/60 shrink-0">
          <button
            onClick={runAudit}
            disabled={isRunning}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isRtl ? 'بررسی مجدد ارتباط' : 'Re-run Audit'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/5 transition-colors"
            >
              {isRtl ? 'بستن' : 'Close'}
            </button>
            {report?.overall_status === 'passed' && onConnectTerminal && (
              <button
                onClick={() => {
                  onClose();
                  onConnectTerminal(device);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-colors"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{isRtl ? 'ورود به ترمینال تعاملی' : 'Open Interactive Terminal'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
