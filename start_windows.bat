@echo off
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

:: Launch the application via npm dev which starts both Python backend and Node/Vite
echo  [1/2] در حال بارگذاری سرویس‌های شبکه و اجرای برنامه...
echo  آدرس دسترسی محلی: http://localhost:3000
echo.

:: Launch browser in background after 3 seconds
start /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

:: Start the application
call npm run dev
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [خطا] اجرای برنامه متوقف شد. برای بررسی یا نصب مجدد، فایل install_windows.bat را اجرا فرمایید.
    pause
)
