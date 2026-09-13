@echo off
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
echo  این کتابخانه‌ها برای اتصال واقعی SSH/Telnet و اجرای مستقیم دستورات روی سوئیچ‌های شبکه نیاز هستند.
echo.
%PYTHON_CMD% -m pip install --upgrade pip
%PYTHON_CMD% -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo  [هشدار] نصب مستقیم از requirements.txt با خطا مواجه شد. در حال تلاش برای نصب مجزای پکیج‌ها...
    %PYTHON_CMD% -m pip install netmiko paramiko requests urllib3 colorama
)

:: 4. Install Node.js NPM Packages and build
echo.
echo  [4/4] در حال نصب وابستگی‌های جاوااسکریپت و فرانت‌اند (NPM Packages)...
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [خطا] نصب بسته‌های NPM با مشکل مواجه شد. لطفاً اتصال اینترنت خود را بررسی کنید.
    pause
    exit /b 1
)

:: Create Desktop Shortcut helper
echo.
echo  [+] در حال ایجاد شورتکات راه انداز در دسکتاپ...
set SCRIPT_DIR=%~dp0
set SHORTCUT_SCRIPT=%TEMP%\CreateNetTopologyShortcut.vbs
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%SHORTCUT_SCRIPT%"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\NetTopology Manager.lnk" >> "%SHORTCUT_SCRIPT%"
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
echo  - کتابخانه‌های پایتون (Netmiko / Paramiko) برای اجرای دستورات روی سوئیچ نصب شدند.
echo  - بسته‌های فرانت‌اند و سرور پروکسی با موفقیت آماده به کار هستند.
echo  - آیکون اجرای برنامه با نام «NetTopology Manager» روی دسکتاپ ایجاد شد.
echo.
echo  برای اجرای برنامه می‌توانید فایل start_windows.bat را اجرا کنید.
echo.
set /p RUN_NOW="آیا مایلید سامانه همین الان اجرا شود؟ (Y/N) [پیش‌فرض: Y]: "
if /i "%RUN_NOW%"=="N" goto end
call "%~dp0start_windows.bat"

:end
echo خدانگهدار!
pause
