import React, { useState, useEffect } from 'react';
import { X, Network, Server, Wifi, Router as RouterIcon, ShieldCheck, MapPin, FileCode2, Activity, CheckCircle2, XCircle, RefreshCw, Terminal, Eye, EyeOff, Key, Play, ShieldAlert, Sparkles, Radio } from 'lucide-react';
import { Device, DeviceType, ConfigTemplate, DeviceConnectionTestResult, RealSshTestResult, SwitchPort, RealSwitchDiscoveryResult } from '../types';
import { fetchTemplates, testRawIpConnection, testRealSsh, discoverRealSwitch } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { RealSshTerminalModal } from './RealSshTerminalModal';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (device: Partial<Device> & { ports?: SwitchPort[] }) => Promise<Device | void>;
  onDeviceCreatedWithTemplate?: (device: Device, templateId: string) => void;
}

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  onDeviceCreatedWithTemplate,
}) => {
  const { t, isEn } = useLanguage();
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [type, setType] = useState<DeviceType>('switch');
  const [role, setRole] = useState('Access Switch');
  const [model, setModel] = useState('Cisco Catalyst 2960X-48FPS-L');
  const [building, setBuilding] = useState(isEn ? 'HQ Central Building' : 'ساختمان مرکزی');
  const [floor, setFloor] = useState(isEn ? 'Floor 2' : 'طبقه ۲');
  const [unit, setUnit] = useState(isEn ? 'IT Server Room' : 'اتاق سرور و رک');
  const [rack, setRack] = useState('Rack-B02');
  const [totalPorts, setTotalPorts] = useState(24);
  const [cdpEnabled, setCdpEnabled] = useState(true);
  const [lldpEnabled, setLldpEnabled] = useState(true);
  const [snmpCommunity, setSnmpCommunity] = useState('public');
  const [sshPort, setSshPort] = useState(22);
  const [sshUsername, setSshUsername] = useState('admin');
  const [sshPassword, setSshPassword] = useState('cisco123');
  const [enablePassword, setEnablePassword] = useState('cisco');
  const [showPassword, setShowPassword] = useState(false);
  const [templates, setTemplates] = useState<ConfigTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTestingIp, setIsTestingIp] = useState(false);
  const [ipTestResult, setIpTestResult] = useState<DeviceConnectionTestResult | null>(null);
  const [isTestingSsh, setIsTestingSsh] = useState(false);
  const [sshTestResult, setSshTestResult] = useState<RealSshTestResult | null>(null);
  const [isSshTerminalOpen, setIsSshTerminalOpen] = useState(false);

  // Live Switch Hardware & Port Discovery State
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<RealSwitchDiscoveryResult | null>(null);
  const [discoveredPorts, setDiscoveredPorts] = useState<SwitchPort[]>([]);
  const [autoDiscoverOnAdd, setAutoDiscoverOnAdd] = useState(true);

  const handleDiscoverSwitch = async () => {
    if (!ip.trim()) {
      setError(isEn ? 'Please enter switch IP address first' : 'لطفاً ابتدا آدرس IP سوئیچ را وارد کنید');
      return;
    }
    if (!sshUsername.trim()) {
      setError(isEn ? 'Please enter SSH username' : 'لطفاً نام کاربری SSH را وارد کنید');
      return;
    }
    setError(null);
    setIsDiscovering(true);
    setDiscoveryResult(null);

    try {
      const res = await discoverRealSwitch({
        host: ip.trim(),
        port: Number(sshPort) || 22,
        username: sshUsername.trim(),
        password: sshPassword,
        enablePassword: enablePassword,
        timeoutMs: 20000,
      });

      setDiscoveryResult(res);

      if (res.success && res.data) {
        const { device: devInfo, ports } = res.data;
        if (devInfo.model) setModel(devInfo.model);
        if (ports && ports.length > 0) {
          setTotalPorts(ports.length);
          setDiscoveredPorts(ports);
        }
        if (devInfo.hostname && (!name || name === 'New-Switch' || name === 'Switch')) {
          setName(devInfo.hostname);
        }
      }
    } catch (err: any) {
      setDiscoveryResult({
        success: false,
        message: err.message || (isEn ? 'Failed to discover switch' : 'خطا در برقراری ارتباط و دریافت اطلاعات سوئیچ')
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleTestRealSsh = async () => {
    if (!ip.trim()) {
      setError(isEn ? 'Please enter an IP address first' : 'لطفاً ابتدا یک آدرس IP وارد کنید');
      return;
    }
    if (!sshUsername.trim()) {
      setError(isEn ? 'Please enter SSH username' : 'لطفاً نام کاربری SSH را وارد کنید');
      return;
    }
    setError(null);
    setIsTestingSsh(true);
    setSshTestResult(null);

    try {
      const res = await testRealSsh({
        host: ip.trim(),
        port: Number(sshPort) || 22,
        username: sshUsername.trim(),
        password: sshPassword,
        enablePassword: enablePassword,
        timeoutMs: 8000,
      });
      setSshTestResult(res);
    } catch (err: any) {
      setSshTestResult({
        success: false,
        authenticated: false,
        message: err.message || (isEn ? 'SSH connection failed' : 'خطا در برقراری اتصال SSH'),
      });
    } finally {
      setIsTestingSsh(false);
    }
  };

  const handleTestIp = async () => {
    if (!ip.trim()) {
      setError(isEn ? 'Please enter an IP address first' : 'لطفاً ابتدا یک آدرس IP وارد کنید');
      return;
    }
    setError(null);
    setIsTestingIp(true);
    try {
      const res = await testRawIpConnection(ip.trim());
      setIpTestResult(res);
    } catch {
      setIpTestResult({
        ip: ip.trim(),
        is_online: false,
        icmp_ping: false,
        latency_ms: null,
        ports: { ssh_22: false, telnet_23: false, http_80: false, https_443: false },
        diagnostics: ['Timeout or host unreachable'],
      });
    } finally {
      setIsTestingIp(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchTemplates()
      .then((res) => {
        setTemplates(res.templates);
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(isEn ? 'Please enter device name' : 'لطفاً نام تجهیز را وارد کنید');
      return;
    }
    if (!ip.trim() || !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip.trim())) {
      setError(isEn ? 'Please enter a valid IP address (e.g. 192.168.1.50)' : 'لطفاً آدرس IP معتبر وارد کنید (مثال: 192.168.1.50)');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      let finalPorts = discoveredPorts;
      let finalModel = model.trim();
      let finalTotalPorts = Number(totalPorts);
      let finalFirmware: string | undefined = undefined;
      let finalUptime: string | undefined = undefined;
      let finalMac: string | undefined = undefined;
      let finalSerial: string | undefined = undefined;

      // If user hasn't manually clicked discovery yet, but auto-discovery is enabled for switch
      if (type === 'switch' && finalPorts.length === 0 && autoDiscoverOnAdd && ip.trim() && sshUsername.trim()) {
        setSubmittingStatus(isEn ? 'Connecting to switch via SSH to extract real ports & specs...' : 'در حال اتصال به سوئیچ با SSH جهت استخراج پورت‌ها و مشخصات واقعی...');
        try {
          const disc = await discoverRealSwitch({
            host: ip.trim(),
            port: Number(sshPort) || 22,
            username: sshUsername.trim(),
            password: sshPassword,
            enablePassword: enablePassword,
            timeoutMs: 7000,
          });
          if (disc.success && disc.data) {
            if (disc.data.ports && disc.data.ports.length > 0) {
              finalPorts = disc.data.ports;
              finalTotalPorts = disc.data.ports.length;
            }
            if (disc.data.device.model) finalModel = disc.data.device.model;
            finalFirmware = disc.data.device.firmware;
            finalUptime = disc.data.device.uptime;
            finalMac = disc.data.device.mac;
            finalSerial = disc.data.device.serial;
          }
        } catch (discErr) {
          console.warn('[AddDeviceModal] Auto-discovery warning (proceeding with manual specs):', discErr);
        }
      } else if (discoveryResult?.data) {
        if (discoveryResult.data.device.model) finalModel = discoveryResult.data.device.model;
        finalFirmware = discoveryResult.data.device.firmware;
        finalUptime = discoveryResult.data.device.uptime;
        finalMac = discoveryResult.data.device.mac;
        finalSerial = discoveryResult.data.device.serial;
        if (finalPorts.length > 0) {
          finalTotalPorts = finalPorts.length;
        }
      }

      setSubmittingStatus(isEn ? 'Saving device & ports...' : 'در حال ذخیره تجهیز و پورت‌ها...');

      const created = await onAdd({
        name: name.trim(),
        ip: ip.trim(),
        type,
        role,
        model: finalModel,
        building: building.trim(),
        floor: floor.trim(),
        unit: unit.trim(),
        rack: rack.trim(),
        total_ports: finalTotalPorts,
        cdp_enabled: cdpEnabled,
        lldp_enabled: lldpEnabled,
        snmp_community: snmpCommunity.trim(),
        ssh_port: Number(sshPort) || 22,
        ssh_username: sshUsername.trim() || 'admin',
        ssh_password: sshPassword,
        enable_password: enablePassword,
        firmware: finalFirmware,
        uptime: finalUptime,
        mac: finalMac,
        serial: finalSerial,
        ports: finalPorts.length > 0 ? finalPorts : undefined,
      });
      onClose();

      // If user selected a template for this newly introduced device, trigger interactive template applicator
      if (selectedTemplateId && onDeviceCreatedWithTemplate && created) {
        onDeviceCreatedWithTemplate(created as Device, selectedTemplateId);
      }
    } catch (err: any) {
      setError(err.message || (isEn ? 'Error adding device' : 'خطا در ثبت تجهیز'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 modal-backdrop-blur overflow-y-auto"
      data-modal-backdrop="true"
      dir={isEn ? 'ltr' : 'rtl'}
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] sm:max-h-[88vh] flex flex-col text-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('add_device_title')}</h3>
              <p className="text-[11px] text-slate-500">{t('add_device_subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
            aria-label={t('action_close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            {/* Device Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isEn ? 'Device Role & Type:' : 'نوع تجهیز (Device Type):'}
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setType('switch');
                    setRole('Access Switch');
                    setModel('Cisco Catalyst 2960X-48FPS-L');
                    setTotalPorts(24);
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                    type === 'switch'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Server className="w-4 h-4" />
                  <span className="text-xs font-bold">{isEn ? 'Switch' : 'سوییچ شبکه (Switch)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setType('router');
                    setRole('Edge Gateway');
                    setModel('Cisco ISR 4451-X');
                    setTotalPorts(8);
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                    type === 'router'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <RouterIcon className="w-4 h-4" />
                  <span className="text-xs font-bold">{isEn ? 'Router' : 'روتر شبکه (Router)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setType('access_point');
                    setRole('Wireless AP');
                    setModel('Cisco Catalyst 9120AXI');
                    setTotalPorts(2);
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                    type === 'access_point'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Wifi className="w-4 h-4" />
                  <span className="text-xs font-bold">{isEn ? 'Access Point' : 'اکسس پوینت (AP)'}</span>
                </button>
              </div>
            </div>

            {/* Identity & IP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {isEn ? 'Device Hostname:' : 'نام یا شناسه تجهیز (Hostname):'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isEn ? 'e.g. SW-ACC-BLDG-A-F2' : 'مثلاً: SW-ACC-BLDG-A-F2'}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">
                    {isEn ? 'Management IP Address:' : 'آدرس آی‌پی مدیریتی (IP Address):'}
                  </label>
                  <button
                    type="button"
                    onClick={handleTestIp}
                    disabled={isTestingIp || !ip}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-40 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTestingIp ? 'animate-spin' : ''}`} />
                    <span>{isTestingIp ? (isEn ? 'Testing...' : 'در حال تست...') : (isEn ? 'Test Connection' : 'تست اتصال آی‌پی')}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={ip}
                  onChange={(e) => {
                    setIp(e.target.value);
                    setIpTestResult(null);
                  }}
                  placeholder={isEn ? 'e.g. 192.168.1.25' : 'مثلاً: 192.168.1.25'}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                  dir="ltr"
                />
                {ipTestResult && (
                  <div
                    className={`mt-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 ${
                      ipTestResult.is_online
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {ipTestResult.is_online ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          {isEn
                            ? `Online • ${ipTestResult.latency_ms}ms • SSH: ${ipTestResult.ports.ssh_22 ? 'Open' : 'Closed'}`
                            : `آنلاین • تاخیر: ${ipTestResult.latency_ms}ms • پورت ۲۲ (SSH): ${ipTestResult.ports.ssh_22 ? 'باز' : 'بسته'}`}
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>
                          {isEn ? 'Unreachable • Check IP or physical connection' : 'غیرقابل دسترس • اتصال یا IP را بررسی نمایید'}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Model & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {isEn ? 'Equipment Role:' : 'نقش تجهیز (Role):'}
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Core Switch">{isEn ? 'Core Switch' : 'Core Switch (سوئیچ اصلی)'}</option>
                  <option value="Distribution Switch">{isEn ? 'Distribution Switch' : 'Distribution Switch (سوئیچ توزیع)'}</option>
                  <option value="Access Switch">{isEn ? 'Access Switch' : 'Access Switch (سوئیچ دسترسی)'}</option>
                  <option value="Edge Gateway">{isEn ? 'Edge Gateway / Router' : 'Edge Gateway / Router (مسیریاب مرزی)'}</option>
                  <option value="Wireless AP">{isEn ? 'Wireless Access Point' : 'Wireless Access Point (اکسس‌پوینت وای‌فای)'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {isEn ? 'Hardware Model:' : 'مدل سخت‌افزاری (Hardware Model):'}
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Cisco Catalyst / MikroTik / Aruba"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {isEn ? 'Total Ports:' : 'تعداد پورت‌ها (Total Ports):'}
                </label>
                <select
                  value={totalPorts}
                  onChange={(e) => setTotalPorts(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                  dir="ltr"
                >
                  <option value={2}>2 Ports ({isEn ? 'for AP' : 'برای AP'})</option>
                  <option value={8}>8 Ports ({isEn ? 'for Router/Mini SW' : 'برای روتر/سوئیچ کوچک'})</option>
                  <option value={16}>16 Ports</option>
                  <option value={24}>24 Ports</option>
                  <option value={48}>48 Ports</option>
                </select>
              </div>
            </div>

            {/* SSH Credentials & Terminal Access */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold">
                <Terminal className="w-4 h-4 text-indigo-600" />
                <span>{isEn ? 'SSH Credentials & Terminal Access:' : 'مشخصات دسترسی SSH و خط فرمان (CLI):'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    {isEn ? 'SSH Port:' : 'پورت SSH:'}
                  </label>
                  <input
                    type="number"
                    value={sshPort}
                    onChange={(e) => setSshPort(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    {isEn ? 'SSH Username:' : 'نام کاربری SSH:'}
                  </label>
                  <input
                    type="text"
                    value={sshUsername}
                    onChange={(e) => setSshUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1 flex items-center justify-between">
                    <span>{isEn ? 'SSH Password:' : 'رمز عبور SSH:'}</span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={sshPassword}
                    onChange={(e) => setSshPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    {isEn ? 'Enable Secret:' : 'رمز Enable (اختیاری):'}
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={enablePassword}
                    onChange={(e) => setEnablePassword(e.target.value)}
                    placeholder="cisco"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* SSH Real Connection Testing, Discovery & Interactive Terminal Action Bar */}
              <div className="pt-2 border-t border-slate-200/80 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDiscoverSwitch}
                      disabled={isDiscovering || !ip.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
                      title={isEn ? 'Connect to switch via SSH, run show commands, and extract real model and physical ports' : 'اتصال مستقیم به سوئیچ با SSH، اجرای دستورات سیسکو و استخراج مدل و پورت‌های فیزیکی واقعی'}
                    >
                      {isDiscovering ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{isEn ? 'Discovering Switch Ports...' : 'در حال دریافت پورت‌های واقعی...'}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                          <span>{isEn ? 'Fetch Real Ports from Switch (SSH)' : 'دریافت مشخصات و پورت‌های واقعی از سوئیچ'}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleTestRealSsh}
                      disabled={isTestingSsh || !ip.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                    >
                      {isTestingSsh ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{isEn ? 'Connecting Port 22...' : 'در حال تست پورت ۲۲...'}</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{isEn ? 'Test SSH Auth' : 'تست احراز هویت SSH'}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!ip.trim()) {
                          setError(isEn ? 'Please enter IP address first' : 'لطفاً ابتدا آدرس IP را وارد کنید');
                          return;
                        }
                        setIsSshTerminalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-700 text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isEn ? 'Cisco CLI Terminal' : 'ترمینال CLI سیسکو'}</span>
                    </button>
                  </div>

                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-600 select-none">
                    <input
                      type="checkbox"
                      checked={autoDiscoverOnAdd}
                      onChange={(e) => setAutoDiscoverOnAdd(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 bg-white border-slate-300"
                    />
                    <span>{isEn ? 'Auto-sync real ports on save' : 'استخراج خودکار پورت‌های واقعی در زمان ثبت'}</span>
                  </label>
                </div>

                {/* Switch Discovery Result Display */}
                {discoveryResult && (
                  <div
                    className={`p-3 rounded-xl text-xs border ${
                      discoveryResult.success
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {discoveryResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 space-y-1">
                        <div className="font-bold flex items-center justify-between">
                          <span>{discoveryResult.message}</span>
                          {discoveredPorts.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[10px]">
                              {discoveredPorts.length} {isEn ? 'Real Ports Discovered' : 'پورت فیزیکی واقعی'}
                            </span>
                          )}
                        </div>
                        {discoveryResult.data?.device && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1.5 text-[11px] font-mono border-t border-emerald-200/60 text-slate-700">
                            {discoveryResult.data.device.model && (
                              <div>
                                <span className="text-slate-400 block text-[9px]">{isEn ? 'Model:' : 'مدل سخت‌افزار:'}</span>
                                <span className="font-semibold">{discoveryResult.data.device.model}</span>
                              </div>
                            )}
                            {discoveryResult.data.device.firmware && (
                              <div>
                                <span className="text-slate-400 block text-[9px]">{isEn ? 'IOS Software:' : 'نسخه IOS:'}</span>
                                <span className="font-semibold truncate block">{discoveryResult.data.device.firmware}</span>
                              </div>
                            )}
                            {discoveryResult.data.device.serial && (
                              <div>
                                <span className="text-slate-400 block text-[9px]">{isEn ? 'Serial:' : 'شماره سریال:'}</span>
                                <span className="font-semibold">{discoveryResult.data.device.serial}</span>
                              </div>
                            )}
                            {discoveryResult.data.device.uptime && (
                              <div>
                                <span className="text-slate-400 block text-[9px]">{isEn ? 'Uptime:' : 'زمان روشن بودن:'}</span>
                                <span className="font-semibold">{discoveryResult.data.device.uptime}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SSH Test Result Display */}
              {sshTestResult && (
                <div
                  className={`p-2.5 rounded-lg text-xs border ${
                    sshTestResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <div className="flex items-center gap-1.5">
                      {sshTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{sshTestResult.message}</span>
                    </div>
                    {sshTestResult.latency_ms !== undefined && (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px]">
                        {sshTestResult.latency_ms} ms
                      </span>
                    )}
                  </div>
                  {sshTestResult.banner && (
                    <div className="mt-1.5 text-[10px] font-mono text-slate-600 bg-white/70 p-1.5 rounded border border-slate-200">
                      {sshTestResult.banner}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Location Fields (Building, Floor, Unit, Rack) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-1.5 text-indigo-700 text-xs font-bold">
                <MapPin className="w-3.5 h-3.5" />
                <span>{isEn ? 'Physical Placement Location:' : 'موقعیت استقرار فیزیکی تجهیز (Physical Location):'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    {isEn ? 'Building:' : 'کدام ساختمان؟ (Building):'}
                  </label>
                  <input
                    type="text"
                    required
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    placeholder={isEn ? 'e.g. Central Building' : 'مثلاً: ساختمان مرکزی'}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    {isEn ? 'Floor:' : 'کدام طبقه؟ (Floor):'}
                  </label>
                  <input
                    type="text"
                    required
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder={isEn ? 'e.g. Ground Floor, Floor 2' : 'مثلاً: طبقه همکف، طبقه ۱'}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    {isEn ? 'Room / Unit:' : 'کدام واحد یا اتاق؟ (Unit / Room):'}
                  </label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder={isEn ? 'e.g. Server Room, Room 302' : 'مثلاً: اتاق سرور، واحد مالی'}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    {isEn ? 'Rack / Cabinet:' : 'شماره رک یا موقعیت (Rack / Cabinet):'}
                  </label>
                  <input
                    type="text"
                    value={rack}
                    onChange={(e) => setRack(e.target.value)}
                    placeholder={isEn ? 'e.g. Rack-A01' : 'مثلاً: Rack-A01'}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Configuration Template Selection */}
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <FileCode2 className="w-4 h-4 text-indigo-600" />
                  <span>{isEn ? 'Initial Configuration Template:' : 'الگوی کانفیگ اولیه خودکار (Configuration Template):'}</span>
                </label>
                <span className="text-[10px] text-indigo-600 font-medium font-mono">Cisco / MikroTik</span>
              </div>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-indigo-200 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 font-sans"
              >
                <option value="">{isEn ? '-- No Template (Register in Inventory Only) --' : '-- بدون تمپلیت (فقط ثبت در دیتابیس) --'}</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.vendor.toUpperCase()}] {t.name} ({t.role})
                  </option>
                ))}
              </select>
              {selectedTemplateId && (
                <p className="text-[11px] text-indigo-700 leading-relaxed">
                  {isEn
                    ? 'After registration, the interactive deployment wizard will open to resolve variables and deploy commands to this device.'
                    : 'پس از زدن دکمه «ثبت تجهیز»، صفحه تایید تعاملی آدرس IP و متغیرهای کانفیگ با مشخصات همین تجهیز باز خواهد شد تا دستورات در مد مناسب به تجهیز ارسال گردند.'}
                </p>
              )}
            </div>

            {/* Discovery Protocols CDP & LLDP */}
            <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-600 font-medium text-[11px]">
                {isEn ? 'Discovery Protocols:' : 'پروتکل‌های اسکن همسایگی:'}
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={cdpEnabled}
                  onChange={(e) => setCdpEnabled(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 bg-white border-slate-300"
                />
                <span>CDP (Cisco Discovery Protocol)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={lldpEnabled}
                  onChange={(e) => setLldpEnabled(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 bg-white border-slate-300"
                />
                <span>LLDP (IEEE 802.1AB)</span>
              </label>
            </div>
          </div>

          {/* Form Actions (Pinned Footer) */}
          <div className="flex items-center justify-between gap-2.5 px-5 py-3 border-t border-slate-200 bg-slate-50 shrink-0">
            <div className="text-xs text-indigo-700 font-medium flex items-center gap-2">
              {isSubmitting && (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{submittingStatus || t('add_device_btn_saving')}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium transition"
              >
                {t('action_cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {isSubmitting ? (submittingStatus ? (isEn ? 'Saving...' : 'در حال ذخیره...') : t('add_device_btn_saving')) : t('add_device_btn_submit')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Interactive Real SSH Terminal Window */}
      <RealSshTerminalModal
        isOpen={isSshTerminalOpen}
        onClose={() => setIsSshTerminalOpen(false)}
        device={{
          name: name.trim() || 'New Device',
          ip: ip.trim(),
          ssh_port: Number(sshPort) || 22,
          ssh_username: sshUsername.trim() || 'admin',
          ssh_password: sshPassword,
          enable_password: enablePassword,
          model: model.trim(),
        }}
        initialHost={ip.trim()}
        initialPort={Number(sshPort) || 22}
        initialUsername={sshUsername.trim() || 'admin'}
        initialPassword={sshPassword}
        initialEnablePassword={enablePassword}
      />
    </div>
  );
};

