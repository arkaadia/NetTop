import React from 'react';
import { Workflow, HelpCircle, Code2, Sparkles, ChevronRight } from 'lucide-react';
import { useWorkflow } from '../context/WorkflowContext';
import { useLanguage } from '../i18n/LanguageContext';
import { COMPONENT_WORKFLOWS } from '../data/componentWorkflows';

interface WorkflowTriggerBadgeProps {
  targetId: string;
  variant?: 'modal-header' | 'card-header' | 'icon' | 'pill' | 'button';
  className?: string;
  label?: string;
  showLabel?: boolean;
}

export const WorkflowTriggerBadge: React.FC<WorkflowTriggerBadgeProps> = ({
  targetId,
  variant = 'modal-header',
  className = '',
  label,
  showLabel = true,
}) => {
  const { openComponentWorkflow } = useWorkflow();
  const { isEn } = useLanguage();

  const workflowInfo = COMPONENT_WORKFLOWS[targetId];

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent parent clicks
    e.preventDefault();
    openComponentWorkflow(targetId);
  };

  const defaultTooltip = isEn
    ? `View Workflow & Architecture: ${workflowInfo?.titleEn || 'This Component'}`
    : `مشاهده معماری و جریان‌کاری: ${workflowInfo?.titleFa || 'این بخش'}`;

  const defaultLabel = label || (isEn ? 'Workflow' : 'جریان‌کاری');

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50 transition shadow-xs cursor-pointer active:scale-95 group ${className}`}
        title={defaultTooltip}
        aria-label={defaultTooltip}
      >
        <Workflow className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform duration-200" />
      </button>
    );
  }

  if (variant === 'modal-header') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 hover:text-white border border-indigo-400/40 hover:border-indigo-400/60 text-[11px] font-bold transition shadow-xs cursor-pointer active:scale-95 group backdrop-blur-md ${className}`}
        title={defaultTooltip}
      >
        <Workflow className="w-3.5 h-3.5 text-cyan-300 group-hover:rotate-45 transition-transform duration-200 shrink-0" />
        <span className="font-sans tracking-wide">{defaultLabel}</span>
      </button>
    );
  }

  if (variant === 'card-header') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-200 border border-white/10 hover:border-indigo-400/30 text-[10px] font-medium transition cursor-pointer active:scale-95 group ${className}`}
        title={defaultTooltip}
      >
        <Workflow className="w-3 h-3 text-indigo-400 group-hover:text-cyan-300 transition-colors shrink-0" />
        {showLabel && <span>{defaultLabel}</span>}
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600/30 to-cyan-600/30 hover:from-indigo-600/50 hover:to-cyan-600/50 text-indigo-100 hover:text-white border border-indigo-400/40 text-xs font-semibold shadow-md transition cursor-pointer active:scale-95 group ${className}`}
        title={defaultTooltip}
      >
        <Workflow className="w-4 h-4 text-cyan-300 group-hover:rotate-12 transition-transform duration-200" />
        <span>{defaultLabel}</span>
      </button>
    );
  }

  // Pill variant
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 text-[10px] font-mono font-bold transition shadow-xs cursor-pointer active:scale-95 ${className}`}
      title={defaultTooltip}
    >
      <Workflow className="w-3 h-3" />
      <span>{defaultLabel}</span>
    </button>
  );
};
