import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Laptop,
  Cpu,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Play
} from 'lucide-react';
import { fetchPythonStatus } from '../services/api';
import { PythonEngineStatus } from '../types';
import { WorkflowTriggerBadge } from './WorkflowTriggerBadge';

interface WindowsInstallerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WindowsInstallerModal: React.FC<WindowsInstallerModalProps> = ({ isOpen, onClose }) => {
  const [pythonStatus, setPythonStatus] = useState<PythonEngineStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const status = await fetchPythonStatus();
      setPythonStatus(status);
    } catch (e) {
      console.error('Failed to load python status:', e);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const downloadFile = (filename: string, content: string, mimeType = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const batContent = `@echo off
chcp 65001 >nul
title NetTopology - نصب کننده خودکار ویندوز (Windows Installer)
color 0B

echo ===============================================================================
echo     NetTopology - پلتفرم مدیریت و پایش سوئیچ‌های سیسکو و توپولوژی شبکه
echo     Cisco Switch Management, Monitoring ^& Live Python Execution Platform
echo ===============================================================================
echo.
echo  در حال بررسی پیش‌نیازهای سیستمی ویندوز (Checking Windows Prerequisites)...
echo.

:: 1. Check Python installation
echo  [1/4] بررسی نصب مفسر پایتون (Python 3)...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    py -3 --version >nul 2>&1
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo  [خطا / ERROR] پایتون (Python 3) روی سیستم شما یافت نشد!
        echo  لطفاً پایتون را از سایت رسمی دانلود و هنگام نصب تیک «Add Python to PATH» را بزنید:
        echo  Download Python: https://www.python.org/downloads/windows/
        echo.
        pause
        exit /b 1
    ) else (
        set PYTHON_CMD=py -3
    )
) else (
    set PYTHON_CMD=python
)
echo  [+] پایتون با موفقیت شناسایی شد:
%PYTHON_CMD% --version

:: 2. Check Node.js and NPM
echo.
echo  [2/4] بررسی نصب Node.js و NPM...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [خطا / ERROR] محیط Node.js روی سیستم شما نصب نیست!
    echo  لطفاً نسخه LTS نود جی‌اس را دانلود و نصب فرمایید:
    echo  Download Node.js: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo  [+] نود جی‌اس با موفقیت شناسایی شد:
node --version
npm --version

:: 3. Install Python Libraries (Netmiko, Paramiko, Requests)
echo.
echo  [3/4] در حال نصب کتابخانه‌های پایتون اتصال به سوئیچ (Netmiko, Paramiko, Requests)...
echo.
%PYTHON_CMD% -m pip install --upgrade pip
%PYTHON_CMD% -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo  [هشدار] نصب از requirements.txt با خطا مواجه شد. در حال تلاش برای نصب مجزای پکیج‌ها...
    %PYTHON_CMD% -m pip install netmiko paramiko requests urllib3 colorama
)

:: 4. Install Node.js NPM Packages
echo.
echo  [4/4] در حال نصب وابستگی‌های جاوااسکریپت و فرانت‌اند (NPM Packages)...
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [خطا] نصب بسته‌های NPM با مشکل مواجه شد.
    pause
    exit /b 1
)

:: Create Desktop Shortcut helper
echo.
echo  [+] در حال ایجاد شورتکات راه انداز در دسکتاپ...
set SCRIPT_DIR=%~dp0
set SHORTCUT_SCRIPT=%TEMP%\\CreateNetTopologyShortcut.vbs
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%SHORTCUT_SCRIPT%"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\\NetTopology Manager.lnk" >> "%SHORTCUT_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%SHORTCUT_SCRIPT%"
echo oLink.TargetPath = "%SCRIPT_DIR%start_windows.bat" >> "%SHORTCUT_SCRIPT%"
echo oLink.WorkingDirectory = "%SCRIPT_DIR%" >> "%SHORTCUT_SCRIPT%"
echo oLink.Description = "سامانه مدیریت و پایش هوشمند سوئیچ های شبکه" >> "%SHORTCUT_SCRIPT%"
echo oLink.Save >> "%SHORTCUT_SCRIPT%"
cscript //nologo "%SHORTCUT_SCRIPT%" >nul 2>&1
del "%SHORTCUT_SCRIPT%" >nul 2>&1

color 0A
echo.
echo ===============================================================================
echo  عملیات نصب با موفقیت کامل انجام شد! (Installation Completed Successfully)
echo ===============================================================================
echo.
echo  برای اجرای برنامه می‌توانید فایل start_windows.bat را اجرا کنید.
echo.
set /p RUN_NOW="آیا مایلید سامانه همین الان اجرا شود؟ (Y/N) [پیش‌فرض: Y]: "
if /i "%RUN_NOW%"=="N" goto end
call "%~dp0start_windows.bat"

:end
pause
`;

  const startBatContent = `@echo off
chcp 65001 >nul
title NetTopology - سامانه مدیریت سوئیچ و پایش شبکه
color 09

echo ===============================================================================
echo       NetTopology Network Manager - در حال راه‌اندازی سرور و موتور پایتون
echo ===============================================================================
echo.

:: Detect Python executable
python --version >nul 2>&1
if %errorlevel% neq 0 (
    py -3 --version >nul 2>&1
    if %errorlevel% neq 0 (
        color 0C
        echo [خطا] پایتون ۳ یافت نشد. لطفاً ابتدا فایل install_windows.bat را اجرا کنید.
        pause
        exit /b 1
    )
)

:: Launch browser in background after 3 seconds
start /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

:: Start the application
call npm run dev
`;

  const requirementsContent = `netmiko>=4.3.0
paramiko>=3.4.0
requests>=2.31.0
urllib3>=2.0.0
colorama>=0.4.6
`;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto modal-backdrop-blur"
      data-modal-backdrop="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-slate-900/95 border border-white/20 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl text-white my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg border border-white/20 text-white">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>بسته نصبی و راهنمای اجرای ویندوز</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                  Windows Native Installer
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                اتصال مستقیم به سوئیچ‌های فیزیکی سازمان، پایش پورت‌ها و اجرای دستورات با پایتون
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <WorkflowTriggerBadge targetId="modal-windows-installer" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-slate-200 text-xs sm:text-sm">
          {/* Quick Download Hero Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* install_windows.bat */}
            <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 hover:border-indigo-500/60 transition shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-indigo-400 font-mono font-bold text-xs">نصب‌کننده خودکار</span>
                  <FileCode className="w-4 h-4 text-indigo-400" />
                </div>
                <h3 className="font-bold text-white text-sm">install_windows.bat</h3>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  بررسی پیش‌نیازها، نصب خودکار Netmiko و پکیج‌ها با یک کلیک و ایجاد میانبر دسکتاپ.
                </p>
              </div>
              <button
                onClick={() => downloadFile('install_windows.bat', batContent, 'application/x-bat')}
                className="mt-3 w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>دانلود فایل نصبی (BAT)</span>
              </button>
            </div>

            {/* start_windows.bat */}
            <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-500/60 transition shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-cyan-400 font-mono font-bold text-xs">اجرای روزانه</span>
                  <Play className="w-4 h-4 text-cyan-400" />
                </div>
                <h3 className="font-bold text-white text-sm">start_windows.bat</h3>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  راه‌اندازی فوری سرور پایتون و باز کردن خودکار داشبورد مدیریت در مرورگر.
                </p>
              </div>
              <button
                onClick={() => downloadFile('start_windows.bat', startBatContent, 'application/x-bat')}
                className="mt-3 w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>دانلود لانچر (BAT)</span>
              </button>
            </div>

            {/* requirements.txt */}
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 hover:border-emerald-500/60 transition shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-emerald-400 font-mono font-bold text-xs">پکیج‌های پایتون</span>
                  <Cpu className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="font-bold text-white text-sm">requirements.txt</h3>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  کتابخانه‌های اتصال مستقیم به سوئیچ (Netmiko، Paramiko، Requests و ...).
                </p>
              </div>
              <button
                onClick={() => downloadFile('requirements.txt', requirementsContent, 'text/plain')}
                className="mt-3 w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>دانلود requirements.txt</span>
              </button>
            </div>
          </div>

          {/* Python Engine Status Live Box */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white">وضعیت موتور اتوماسیون پایتون</span>
              </div>
              <button
                onClick={loadStatus}
                disabled={isLoadingStatus}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin text-cyan-400' : ''}`} />
                <span>بروزرسانی وضعیت</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                <div className="text-[10px] text-slate-400">کتابخانه Netmiko</div>
                <div className="mt-1 flex items-center gap-1.5 font-mono font-bold">
                  {pythonStatus?.netmiko_installed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">نصب است (Ready)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-amber-400">نصب نیست</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                <div className="text-[10px] text-slate-400">کتابخانه Paramiko</div>
                <div className="mt-1 flex items-center gap-1.5 font-mono font-bold">
                  {pythonStatus?.paramiko_installed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">نصب است (Ready)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-amber-400">نصب نیست</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                <div className="text-[10px] text-slate-400">نسخه پایتون</div>
                <div className="mt-1 font-mono text-cyan-300 font-bold">
                  {pythonStatus?.python_version ? `Python ${pythonStatus.python_version}` : 'در حال بررسی...'}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                <div className="text-[10px] text-slate-400">سیستم عامل جاری</div>
                <div className="mt-1 font-mono text-slate-200 capitalize">
                  {pythonStatus?.platform || 'Linux/Container'}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-300 bg-slate-950/50 p-2.5 rounded-lg border border-white/5 leading-relaxed">
              💡 هنگامی که این پروژه را روی ویندوز دانلود و با <code>install_windows.bat</code> نصب کنید، این کتابخانه‌ها مستقیماً از شبکه محلی شما به آی‌پی سوئیچ‌ها (پورت ۲۲ یا ۲۳) وصل شده و دستورات خط فرمان سیسکو را بدون هیچ واسطه‌ای اجرا می‌کنند.
            </div>
          </div>

          {/* 3 Step Installation Guide */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span>مراحل راه‌اندازی گام‌به‌گام روی کامپیوتر یا لپ‌تاپ ویندوز:</span>
            </h4>

            <div className="space-y-2">
              {/* Step 1 */}
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-mono">1</span>
                    <span>نصب پایتون و نودجی‌اس (در صورت عدم نصب)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://www.python.org/downloads/windows/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <span>دانلود پایتون</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://nodejs.org/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <span>دانلود Node.js</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <p className="text-slate-400 text-xs mt-1">
                  نکته مهم: هنگام نصب پایتون در صفحه اول تیک گزینه <strong>«Add Python to PATH»</strong> را فعال فرمایید.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-mono">2</span>
                    <span>اجرای فایل install_windows.bat (یک دابل کلیک)</span>
                  </div>
                </div>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  فایل‌های پروژه را در پوشه‌ای در ویندوز قرار داده و روی <code>install_windows.bat</code> دابل‌کلیک کنید. اسکریپت تمام کتابخانه‌های پایتون و ماژول‌ها را دانلود کرده و شورتکات دسکتاپ می‌سازد.
                </p>
                <div className="mt-2 flex items-center justify-between bg-slate-900 px-3 py-1.5 rounded-lg font-mono text-[11px] text-indigo-300">
                  <span>pip install netmiko paramiko requests &amp;&amp; npm install</span>
                  <button
                    onClick={() => copyToClipboard('pip install netmiko paramiko requests && npm install', 'manual_cmd')}
                    className="text-slate-400 hover:text-white transition flex items-center gap-1"
                  >
                    {copiedKey === 'manual_cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>کپی دستور دستی</span>
                  </button>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-white/10">
                <div className="font-semibold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-mono">3</span>
                  <span>اجرا و اتصال به سوئیچ‌ها در شبکه محلی (LAN)</span>
                </div>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  با اجرای <code>start_windows.bat</code>، داشبورد در آدرس <code>http://localhost:3000</code> باز می‌شود. سپس می‌توانید:
                </p>
                <ul className="mt-1.5 list-disc list-inside text-slate-300 text-xs space-y-1">
                  <li>در بخش <strong>«اسکنر شبکه محلی (LAN)»</strong> رنج شبکه سازمان خود (مثلاً <code>192.168.1.0/24</code>) را اسکن کنید تا سوئیچ‌ها خودکار کشف شوند.</li>
                  <li>در مودال <strong>ترمینال سیسکو</strong>، کلید را روی حالت <strong>«اتصال مستقیم پایتون (Real Python SSH/Netmiko)»</strong> بگذارید.</li>
                  <li>نام کاربری، پسورد و Enable Secret سوئیچ را وارد کرده و دستورات مورد نظر خود مثل <code>show ip int brief</code> یا تغییرات کانفیگ را مستقیماً از پایتون روی سوئیچ اجرا نمایید!</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-white/5 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            توسعه‌یافته برای مدیران زیرساخت شبکه و متخصصین سیسکو
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadFile('install_windows.bat', batContent, 'application/x-bat')}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>دانلود install_windows.bat</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
