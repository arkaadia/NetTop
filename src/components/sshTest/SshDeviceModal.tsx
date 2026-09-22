import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Key,
  Lock,
  User,
  Globe,
  Hash,
  Terminal,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  Cpu
} from 'lucide-react';
import { useLanguage } from '../../i18n';
import { SshTestDevice } from '../../types/sshTest';
import { createSshDevice, updateSshDevice, testConnectionViaWebSocket } from '../../services/sshTestApi';

interface SshDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  device?: SshTestDevice | null;
}

export const SshDeviceModal: React.FC<SshDeviceModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  device
}) => {
  const { t, isRtl } = useLanguage();

  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState('');
  const [authType, setAuthType] = useState<'password' | 'key'>('password');
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [deviceType, setDeviceType] = useState('linux');
  const [ptyType, setPtyType] = useState('xterm-256color');
  const [description, setDescription] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [liveStage, setLiveStage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ status: 'passed' | 'failed'; message: string; details?: string } | null>(null);

  useEffect(() => {
    if (device) {
      setName(device.name);
      setHost(device.host);
      setPort(device.port || 22);
      setUsername(device.username);
      setAuthType(device.auth_type || 'password');
      setPassword('');
      setPrivateKey('');
      setPassphrase('');
      setDeviceType(device.device_type || 'linux');
      setPtyType(device.pty_type || 'xterm-256color');
      setDescription(device.description || '');
    } else {
      setName('');
      setHost('');
      setPort(22);
      setUsername('root');
      setAuthType('password');
      setPassword('');
      setPrivateKey('');
      setPassphrase('');
      setDeviceType('linux');
      setPtyType('xterm-256color');
      setDescription('');
    }
    setErrorMsg(null);
    setTestResult(null);
    setLiveStage(null);
  }, [device, isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!host.trim() || !username.trim()) {
      setErrorMsg(isRtl ? 'آدرس IP/میزبان و نام کاربری الزامی است.' : 'Host/IP and username are required.');
      return;
    }
    setIsTesting(true);
    setErrorMsg(null);
    setTestResult(null);
    setLiveStage(isRtl ? 'در حال برقراری اتصال به وب‌سوکت و هسته Paramiko 2...' : 'Connecting to WebSocket & Paramiko 2 engine...');

    try {
      const report = await testConnectionViaWebSocket(
        {
          host: host.trim(),
          port: Number(port) || 22,
          username: username.trim(),
          auth_type: authType,
          password: password,
          private_key: privateKey,
          passphrase: passphrase
        },
        (step) => {
          setLiveStage(isRtl ? step.title_fa : step.title_en);
        }
      );

      if (report.overall_status === 'passed') {
        const authStep = report.steps.find(s => s.layer_id === 'PARAMIKO_AUTH');
        const tcpStep = report.steps.find(s => s.layer_id === 'TCP_LAYER');
        setTestResult({
          status: 'passed',
          message: isRtl
            ? `اتصال و احراز هویت با موفقیت انجام شد (زمان پاسخ: ${tcpStep?.latency_ms || 0}ms)`
            : `Connection & authentication succeeded! (RTT: ${tcpStep?.latency_ms || 0}ms)`,
          details: authStep?.details || authStep?.details_en
        });
      } else {
        const failedStep = report.steps.find(s => s.status === 'failed');
        setTestResult({
          status: 'failed',
          message: failedStep?.error || (isRtl ? 'برقراری اتصال در یکی از لایه‌ها متوقف شد.' : 'Connection test failed.'),
          details: isRtl ? failedStep?.remediation_fa : failedStep?.remediation_en
        });
      }
    } catch (err: any) {
      setTestResult({
        status: 'failed',
        message: err.message || (isRtl ? 'خطای آزمون اتصال' : 'Connection test error')
      });
    } finally {
      setIsTesting(false);
      setLiveStage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host.trim()) {
      setErrorMsg(isRtl ? 'لطفاً آدرس IP یا نام سرور را وارد کنید.' : 'Host / IP is required.');
      return;
    }
    if (!username.trim()) {
      setErrorMsg(isRtl ? 'لطفاً نام کاربری SSH را وارد کنید.' : 'Username is required.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const payload: any = {
        name: name.trim() || host.trim(),
        host: host.trim(),
        port: Number(port) || 22,
        username: username.trim(),
        auth_type: authType,
        device_type: deviceType,
        pty_type: ptyType,
        description: description.trim()
      };

      if (password) payload.password = password;
      if (privateKey) payload.private_key = privateKey;
      if (passphrase) payload.passphrase = passphrase;

      if (device) {
        await updateSshDevice(device.id, payload);
      } else {
        await createSshDevice(payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || (isRtl ? 'خطا در ذخیره دیوایس' : 'Failed to save device'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-blur" data-modal-backdrop="true">
      <div className="relative w-full max-w-2xl bg-slate-900/95 border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-950/40 text-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {device
                  ? (isRtl ? 'ویرایش دیوایس SSH' : 'Edit SSH Device')
                  : (isRtl ? 'افزودن دیوایس SSH جدید' : 'Add New SSH Device')}
              </h2>
              <p className="text-xs text-slate-400">
                {isRtl
                  ? 'پیکربندی مشخصات اتصال از طریق موتور واقعی Paramiko 2 و وب‌سوکت'
                  : 'Configure real connection via Paramiko 2 & WebSocket tunnel'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isTesting && liveStage && (
            <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 text-xs flex items-center justify-between gap-2 animate-pulse">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 shrink-0 animate-spin text-cyan-400" />
                <span className="font-medium">{liveStage}</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                WebSocket / Paramiko 2
              </span>
            </div>
          )}

          {testResult && (
            <div className={`p-3 rounded-xl border text-xs flex flex-col gap-1.5 ${
              testResult.status === 'passed'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}>
              <div className="flex items-center gap-2 font-medium">
                {testResult.status === 'passed' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{testResult.message}</span>
              </div>
              {testResult.details && (
                <div className={`text-[11px] pl-6 font-mono ${testResult.status === 'passed' ? 'text-emerald-400/90' : 'text-rose-300/90'}`}>
                  {testResult.details}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Device Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isRtl ? 'نام دیوایس / برچسب' : 'Device Label'}
              </label>
              <div className="relative">
                <Server className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Core-Router-01, Ubuntu-SRV"
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Device Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isRtl ? 'نوع تجهیز (Device Type)' : 'Device Type'}
              </label>
              <div className="relative">
                <Cpu className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <select
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="linux">Linux Server / Debian / Ubuntu / RHEL</option>
                  <option value="cisco_ios">Cisco Switch / Router (IOS / IOS-XE)</option>
                  <option value="mikrotik">MikroTik RouterOS</option>
                  <option value="generic">Generic Network Appliance / BSD</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Host / IP */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isRtl ? 'آدرس آی‌پی یا نام هاست (IP / Host)' : 'IP / Hostname'} *
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="192.168.1.1 or srv.internal"
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                />
              </div>
            </div>

            {/* Port */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isRtl ? 'پورت SSH' : 'SSH Port'} *
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="number"
                  required
                  min={1}
                  max={65535}
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isRtl ? 'نام کاربری SSH' : 'SSH Username'} *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin, root, cisco"
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                />
              </div>
            </div>

            {/* Authentication Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isRtl ? 'نوع احراز هویت' : 'Authentication Method'}
              </label>
              <div className="flex bg-slate-950/70 border border-slate-700/80 rounded-xl p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setAuthType('password')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    authType === 'password'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'رمز عبور' : 'Password'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthType('key')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    authType === 'key'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'کلید خصوصی SSH' : 'Private Key'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Password Auth Input */}
          {authType === 'password' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isRtl ? 'رمز عبور کاربر' : 'SSH Password'}
                {device && device.has_password && (
                  <span className="text-[11px] text-emerald-400 ml-2 font-normal">
                    ({isRtl ? 'رمز قبلاً ذخیره شده است؛ در صورت تمایل رمز جدید وارد کنید' : 'Password already saved; leave blank to keep current'})
                  </span>
                )}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={device && device.has_password ? '••••••••' : 'Enter SSH password'}
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Key Auth Inputs */}
          {authType === 'key' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isRtl ? 'محتوای کلید خصوصی SSH (OpenSSH / PEM / Ed25519)' : 'Private Key Content'}
                  {device && device.has_key && (
                    <span className="text-[11px] text-emerald-400 ml-2 font-normal">
                      ({isRtl ? 'کلید خصوصی ذخیره شده؛ برای تغییر کلید جدید الصاق کنید' : 'Key already stored'})
                    </span>
                  )}
                </label>
                <textarea
                  rows={4}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl p-3 text-xs text-emerald-400 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isRtl ? 'گذرواژه کلید (Passphrase - اختیاری)' : 'Key Passphrase (Optional)'}
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type={showPassphrase ? 'text' : 'password'}
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter key passphrase if encrypted"
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl py-2 pl-10 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showPassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {isRtl ? 'توضیحات و یادداشت (اختیاری)' : 'Description (Optional)'}
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Core distribution switch rack B2, management VLAN 100"
                className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl py-2 pl-10 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={isTesting || isLoading}
              onClick={handleTestConnection}
              className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600/50 flex items-center gap-1.5 transition-colors"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>{isRtl ? 'در حال آزمون...' : 'Testing...'}</span>
                </>
              ) : (
                <>
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isRtl ? 'آزمون ارتباط زنده' : 'Test Connection'}</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/5 transition-colors"
              >
                {isRtl ? 'انصراف' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isLoading || isTesting}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isRtl ? 'در حال ذخیره...' : 'Saving...'}</span>
                  </>
                ) : (
                  <span>{device ? (isRtl ? 'ذخیره تغییرات' : 'Save Changes') : (isRtl ? 'ثبت دیوایس' : 'Add Device')}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
