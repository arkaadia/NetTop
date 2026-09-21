import React, { useState, useEffect } from 'react';
import {
  X,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  Server,
  Activity,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { RemoteDevice, RemoteDeviceFormData, RemoteDeviceTestResult } from '../../types/remoteDesktop';
import { testAdhocConnection } from '../../services/remoteDesktopApi';
import { useLanguage } from '../../i18n';

interface AddRemoteDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: RemoteDeviceFormData, editId?: string) => Promise<void>;
  editDevice?: RemoteDevice | null;
}

export const AddRemoteDeviceModal: React.FC<AddRemoteDeviceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editDevice
}) => {
  const { t, isRtl } = useLanguage();

  const [formData, setFormData] = useState<RemoteDeviceFormData>({
    name: '',
    hostname: '',
    port: 3389,
    username: 'administrator',
    password: '',
    domain: '',
    enabled: true
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<RemoteDeviceTestResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (editDevice) {
      setFormData({
        name: editDevice.name,
        hostname: editDevice.hostname,
        port: editDevice.port || 3389,
        username: editDevice.username || 'administrator',
        password: '', // Blank implies keep existing encrypted password
        domain: editDevice.domain || '',
        enabled: editDevice.enabled ?? true
      });
    } else {
      setFormData({
        name: '',
        hostname: '',
        port: 3389,
        username: 'administrator',
        password: '',
        domain: '',
        enabled: true
      });
    }
    setTestResult(null);
    setValidationError(null);
  }, [editDevice, isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!formData.hostname.trim()) {
      setValidationError(isRtl ? 'لطفاً آدرس IP یا نام هاست را وارد کنید.' : 'Please enter an IP address or hostname.');
      return;
    }
    setValidationError(null);
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testAdhocConnection(formData);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        status: 'host_unreachable',
        message: err.message || 'Diagnostic connection test failed.',
        latency_ms: null
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setValidationError(isRtl ? 'نام تجهیز الزامی است.' : 'Device name is required.');
      return;
    }
    if (!formData.hostname.trim()) {
      setValidationError(isRtl ? 'آدرس هاست یا IP الزامی است.' : 'Hostname/IP is required.');
      return;
    }

    setValidationError(null);
    setIsSaving(true);
    try {
      await onSave(formData, editDevice ? editDevice.id : undefined);
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Failed to save device.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-lg bg-slate-900/95 border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {editDevice
                  ? (isRtl ? 'ویرایش ماشین ویندوز' : 'Edit Remote Device')
                  : (isRtl ? 'افزودن ماشین ویندوز' : 'Add Remote Device')}
              </h3>
              <p className="text-xs text-slate-400">
                {isRtl ? 'پیکربندی پارامترهای پروتکل RDP و احراز هویت' : 'Configure RDP protocol & credentials'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          {validationError && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Device Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {isRtl ? 'نام تجهیز (Device Name)' : 'Device Name'} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={isRtl ? 'مثال: Windows Server 01' : 'e.g. Windows Server 01'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Hostname & Port */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isRtl ? 'آدرس IP / نام هاست' : 'IP / Hostname'} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.hostname}
                onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                placeholder="192.168.10.50"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isRtl ? 'پورت RDP' : 'RDP Port'}
              </label>
              <input
                type="number"
                min={1}
                max={65535}
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value, 10) || 3389 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-center"
              />
            </div>
          </div>

          {/* Username & Domain */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isRtl ? 'نام کاربری (Username)' : 'Username'}
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="administrator"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isRtl ? 'دامنه / Domain (اختیاری)' : 'Domain (Optional)'}
              </label>
              <input
                type="text"
                value={formData.domain || ''}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="CORP"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Password with Eye Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                {isRtl ? 'رمز عبور (Password)' : 'Password'}
              </label>
              {editDevice && editDevice.has_password && (
                <span className="text-[11px] text-sky-400 font-medium">
                  {isRtl ? '(رمز فعلی به صورت رمزنگاری‌شده ذخیره است)' : '(Encrypted password exists)'}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editDevice ? (isRtl ? 'خالی بگذارید تا رمز فعلی حفظ شود' : 'Leave empty to keep existing password') : '••••••••••••'}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                {isRtl
                  ? 'رمزهای عبور در بک‌اند با کلید امنیتی رمزنگاری می‌شوند و هرگز به فرانت‌اند فرستاده نمی‌شوند.'
                  : 'Passwords are encrypted at rest with server vault keys and never exposed to the frontend.'}
              </span>
            </p>
          </div>

          {/* Diagnostic Real Test Panel */}
          <div className="pt-2">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                {isRtl ? 'بررسی زنده سلامت اتصال RDP' : 'Live RDP Diagnostic Check'}
              </span>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !formData.hostname.trim()}
                className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                {isTesting ? (
                  <>
                    <Zap className="w-3.5 h-3.5 animate-spin text-sky-400" />
                    <span>{isRtl ? 'در حال تست...' : 'Testing...'}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-sky-400" />
                    <span>{isRtl ? 'تست اتصال' : 'Test Connection'}</span>
                  </>
                )}
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-1.5 animate-fadeIn ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                  {testResult.latency_ms && (
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-black/40 text-cyan-300 border border-white/10">
                      {testResult.latency_ms} ms
                    </span>
                  )}
                </div>

                {testResult.details && (
                  <div className="text-[11px] text-slate-400 font-mono space-y-0.5 pt-1 border-t border-white/5">
                    {testResult.details.rdp_protocol && (
                      <div>Protocol: <span className="text-slate-200">{testResult.details.rdp_protocol}</span></div>
                    )}
                    {testResult.details.cipher && (
                      <div>Cipher: <span className="text-slate-200">{testResult.details.cipher}</span></div>
                    )}
                    {testResult.details.guacd_available !== undefined && (
                      <div>
                        guacd proxy status:{' '}
                        <span className={testResult.details.guacd_available ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                          {testResult.details.guacd_available ? 'Ready (port 4822)' : 'Offline / Standalone test'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              {isRtl ? 'انصراف' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-sky-600/25 disabled:opacity-50 cursor-pointer"
            >
              {isSaving
                ? (isRtl ? 'در حال ذخیره...' : 'Saving...')
                : editDevice
                ? (isRtl ? 'ذخیره تغییرات' : 'Save Changes')
                : (isRtl ? 'ثبت ماشین ریموت' : 'Add Remote Machine')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
