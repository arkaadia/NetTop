# NetTopology Windows PowerShell Automated Setup Script
# اسکریپت نصب و راه‌اندازی خودکار تحت پاورشل ویندوز
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "   NetTopology - نصب کننده هوشمند ویندوز با قابلیت اتصال واقعی به سوئیچ   " -ForegroundColor Yellow
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "[1/4] در حال بررسی پایتون (Python 3)..." -ForegroundColor White
$pythonCmd = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $pythonCmd = "py -3"
} else {
    Write-Host "[ERROR] پایتون ۳ یافت نشد! لطفاً پایتون را از https://www.python.org/downloads/windows/ نصب فرمایید." -ForegroundColor Red
    Pause
    Exit 1
}

$pyVer = & $pythonCmd --version
Write-Host "[+] پایتون شناسایی شد: $pyVer" -ForegroundColor Green

# Check Node.js
Write-Host "`n[2/4] در حال بررسی Node.js و NPM..." -ForegroundColor White
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] محیط Node.js نصب نیست! لطفاً از https://nodejs.org/ دانلود و نصب کنید." -ForegroundColor Red
    Pause
    Exit 1
}
$nodeVer = node --version
$npmVer = npm --version
Write-Host "[+] نود جی‌اس: $nodeVer | مدیر بسته NPM: $npmVer" -ForegroundColor Green

# Install Python libraries
Write-Host "`n[3/4] در حال نصب کتابخانه‌های اتوماسیون شبکه پایتون (Netmiko, Paramiko, Requests)..." -ForegroundColor White
& $pythonCmd -m pip install --upgrade pip
& $pythonCmd -m pip install -r "$PSScriptRoot\requirements.txt"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] نصب از فایل با هشدار همراه بود، نصب انفرادی پکیج‌ها..." -ForegroundColor Yellow
    & $pythonCmd -m pip install netmiko paramiko requests urllib3 colorama
}
Write-Host "[+] کتابخانه‌های پایتون آماده به کار شدند." -ForegroundColor Green

# Install NPM packages
Write-Host "`n[4/4] در حال نصب کتابخانه‌های فرانت‌اند و رابط کاربری (NPM Packages)..." -ForegroundColor White
Set-Location $PSScriptRoot
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] نصب وابستگی‌های NPM با شکست روبرو شد." -ForegroundColor Red
    Pause
    Exit 1
}

# Create Desktop Shortcut
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
    $Shortcut = $WshShell.CreateShortcut("$DesktopPath\NetTopology Manager.lnk")
    $Shortcut.TargetPath = "$PSScriptRoot\start_windows.bat"
    $Shortcut.WorkingDirectory = "$PSScriptRoot"
    $Shortcut.Description = "سامانه مدیریت سوئیچ و پایش شبکه"
    $Shortcut.Save()
    Write-Host "[+] میانبر دسکتاپ ایجاد شد." -ForegroundColor Green
} catch {
    Write-Host "[!] ایجاد میانبر دسکتاپ با خطا مواجه شد، اما نصب تکمیل است." -ForegroundColor Yellow
}

Write-Host "`n==========================================================================" -ForegroundColor Green
Write-Host "         نصب با موفقیت کامل انجام شد! آماده اجرا روی ویندوز               " -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host "برای اجرای سامانه، کافی است start_windows.bat را اجرا کنید یا شورتکات دسکتاپ را بزنید." -ForegroundColor Cyan
Write-Host ""
$choice = Read-Host "آیا می‌خواهید سامانه هم اکنون اجرا شود؟ (Y/N) [پیش‌فرض Y]"
if ($choice -eq "" -or $choice -eq "Y" -or $choice -eq "y") {
    Start-Process -FilePath "$PSScriptRoot\start_windows.bat"
}
