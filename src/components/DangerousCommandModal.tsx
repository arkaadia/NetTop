import React from 'react';
import { AlertTriangle, ShieldAlert, X, Check, ArrowRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface DangerousCommandModalProps {
  isOpen: boolean;
  command: string;
  targetHost: string;
  reason?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DangerousCommandModal: React.FC<DangerousCommandModalProps> = ({
  isOpen,
  command,
  targetHost,
  reason,
  onConfirm,
  onCancel,
}) => {
  const { isEn } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 modal-backdrop-blur"
      data-modal-backdrop="true"
      dir={isEn ? 'ltr' : 'rtl'}
    >
      <div className="bg-white border border-rose-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-rose-50 border-b border-rose-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-950">
                {isEn ? 'Dangerous Command Warning' : 'هشدار اجرای دستور پرخطر'}
              </h3>
              <p className="text-[11px] text-rose-700">
                {isEn ? 'Network Safety Interceptor' : 'سامانه محافظت از تجهیزات شبکه'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-rose-400 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-700 leading-relaxed">
            {isEn
              ? `You are about to execute a potentially disruptive command on device `
              : `شما در حال ارسال یک دستور حساس و پرخطر به تجهیز `}
            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              {targetHost}
            </span>
            {isEn
              ? `. This operation might reboot the appliance, wipe settings, or disconnect network traffic.`
              : ` هستید. این عملیات ممکن است باعث ریستارت، پاک شدن پیکربندی، یا قطعی شبکه شود.`}
          </p>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-rose-400 font-mono text-xs flex items-center justify-between">
            <span className="font-bold text-slate-200">{command}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-sans border border-rose-500/30">
              {isEn ? 'CRITICAL' : 'بسیار حساس'}
            </span>
          </div>

          {reason && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2 text-[11px]">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{reason}</span>
            </div>
          )}

          <p className="text-[11px] text-slate-500">
            {isEn
              ? 'Please confirm if you want to bypass the safety check and transmit this command to the hardware.'
              : 'لطفاً در صورت اطمینان از صحت انجام این کار روی تجهیز، دستور را تایید و ارسال کنید.'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-100 transition cursor-pointer"
          >
            {isEn ? 'Abort / Cancel' : 'لغو و پاکسازی'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md transition cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isEn ? 'Confirm & Execute' : 'تایید و اجرای دستور'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
