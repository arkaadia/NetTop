import React, { useState, useEffect } from 'react';
import {
  Workflow,
  X,
  Copy,
  Check,
  Code2,
  FileCode,
  Network,
  ExternalLink,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  HelpCircle,
  Terminal,
  Cpu
} from 'lucide-react';
import { useWorkflow } from '../context/WorkflowContext';
import { useLanguage } from '../i18n/LanguageContext';

export const ComponentWorkflowModal: React.FC = () => {
  const {
    isComponentWorkflowOpen,
    activeComponentWorkflow,
    closeComponentWorkflow,
    openModuleWorkflow
  } = useWorkflow();

  const { isEn, isRtl } = useLanguage();
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isComponentWorkflowOpen) {
        closeComponentWorkflow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isComponentWorkflowOpen, closeComponentWorkflow]);

  if (!isComponentWorkflowOpen || !activeComponentWorkflow) return null;

  const item = activeComponentWorkflow;
  const title = isEn ? item.titleEn : item.titleFa;
  const description = isEn ? item.descriptionEn : item.descriptionFa;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(item.aiPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(item.file);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleViewModuleWorkflow = () => {
    closeComponentWorkflow();
    openModuleWorkflow(item.module as any);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 modal-backdrop-blur overflow-y-auto animate-fadeIn"
      data-modal-backdrop="true"
      onClick={closeComponentWorkflow}
      dir={isEn ? 'ltr' : 'rtl'}
    >
      <div
        className="relative w-full max-w-2xl bg-slate-900/95 border border-indigo-500/40 rounded-2xl shadow-[0_0_50px_rgba(79,70,229,0.35)] overflow-hidden text-slate-100 backdrop-blur-2xl my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white shadow-md border border-white/20">
              <Workflow className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-white font-sans">
                  {title}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase">
                  Workflow Target
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 max-w-md">
                {description}
              </p>
            </div>
          </div>

          <button
            onClick={closeComponentWorkflow}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
            title={isEn ? 'Close Workflow' : 'بستن پنجره جریان‌کاری'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source File & API Endpoint Metadata Bar */}
        <div className="px-5 py-2.5 bg-black/40 border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {/* File Path */}
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
            <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400">{isEn ? 'Component File:' : 'فایل کامپوننت:'}</span>
            <code className="bg-slate-950 px-2 py-0.5 rounded text-cyan-300 border border-white/10">
              {item.file}
            </code>
            <button
              onClick={handleCopyPath}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-cyan-300 transition"
              title={isEn ? 'Copy File Path' : 'کپی مسیر فایل'}
            >
              {copiedPath ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          {/* API Endpoint (if any) */}
          {item.apiEndpoint && (
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
              <Network className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-slate-400">{isEn ? 'Endpoint:' : 'اندپوینت:'}</span>
              <span className="px-1.5 py-0.5 rounded bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 text-[10px] font-bold">
                {item.apiMethod || 'REST'}
              </span>
              <code className="bg-slate-950 px-2 py-0.5 rounded text-indigo-300 border border-white/10">
                {item.apiEndpoint}
              </code>
            </div>
          )}
        </div>

        {/* Content Body: Step-by-Step Flow */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>{isEn ? 'Component Execution Workflow Steps:' : 'مراحل جریان‌کاری و فرآیند اجرایی این بخش:'}</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {item.steps.length} {isEn ? 'Steps' : 'مرحله'}
            </span>
          </div>

          <div className="space-y-3">
            {item.steps.map((st) => (
              <div
                key={st.step}
                className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-400/40 transition flex items-start gap-3.5 group"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold font-mono text-xs shrink-0 group-hover:scale-110 transition-transform">
                  {st.step}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-white mb-1">
                    {isEn ? st.titleEn : st.titleFa}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {isEn ? st.descEn : st.descFa}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* AI Prompt Ready-To-Copy Box */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-500/40 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-bold text-indigo-200">
                  {isEn
                    ? 'Ready-to-Use AI Modification Prompt:'
                    : 'دستور آماده جهت کپی و ارسال به هوش مصنوعی:'}
                </span>
              </div>
              <span className="text-[10px] text-indigo-300/80 font-mono">
                {isEn ? '1-Click Precision Targeting' : 'ارجاع دقیق به فایل و کامپوننت'}
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              {isEn
                ? 'Copy this instruction and send it to the AI along with your desired modification so it applies changes directly to this component without confusion.'
                : 'این دستور را کپی کرده و تغییرات مد نظرتان را به آن اضافه کنید تا هوش مصنوعی دقیقاً بداند کدام فایل و کامپوننت را باید ویرایش کند.'}
            </p>

            <div className="relative">
              <pre
                className="p-3 rounded-lg bg-slate-950 border border-white/15 text-emerald-300 font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-all"
                dir="rtl"
              >
                {item.aiPrompt}
              </pre>

              <button
                onClick={handleCopyPrompt}
                className="mt-2.5 w-full py-2 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                {copiedPrompt ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>{isEn ? 'Copied to Clipboard!' : 'دستور با موفقیت کپی شد!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{isEn ? 'Copy AI Instruction Prompt' : 'کپی دستور آماده جهت ارسال به هوش مصنوعی'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Navigation: View Entire Module Architecture */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-slate-950 flex items-center justify-between text-xs">
          <button
            onClick={closeComponentWorkflow}
            className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition"
          >
            {isEn ? 'Close' : 'بستن'}
          </button>

          <button
            onClick={handleViewModuleWorkflow}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition cursor-pointer"
          >
            <span>{isEn ? 'View Entire Module Architecture' : 'مشاهده کل معماری این ماژول'}</span>
            {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
