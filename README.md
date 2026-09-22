# NetTopology 🌐

سامانه جامع مدیریت، مانیتورینگ توپولوژی شبکه و مدیریت تجهیزات سیسکو (سویچ و روتر)
A Comprehensive Network Topology, Cisco Switch/Router Management & Visual Configuration Platform

---

## 📑 فهرست مطالب / Table of Contents
- [بخش اول: راهنمای فارسی (Persian)](#بخش-اول-راهنمای-فارسی)
  - [معرفی پروژه](#معرفی-پروژه)
  - [ویژگی‌ها و قابلیت‌های کلیدی](#ویژگیها-و-قابلیتهای-کلیدی)
  - [ساختار معماری و تکنولوژی‌ها](#ساختار-معماری-و-تکنولوژیها)
  - [راهنمای نصب اختصاصی ماژول Remote Test و ویندوز RDP](#راهنمای-نصب-اختصاصی-ماژول-remote-test-و-ویندوز-rdp)
  - [راهنمای نصب اختصاصی ماژول SSH تست (Paramiko 2 و وب‌سوکت)](#راهنمای-نصب-اختصاصی-ماژول-ssh-تست-paramiko-2-و-وبسوکت)
  - [راهنمای نصب و راه‌اندازی کلی سامانه روی لینوکس](#راهنمای-نصب-و-راهاندازی-روی-لینوکس-linux-installation)
  - [اسکریپت‌های سیستمی](#اسکریپتهای-سیستمی)
  - [دستورالعمل توسعه و مشارکت هوش مصنوعی](#دستورالعمل-توسعه-و-مشارکت-هوش-مصنوعی)
- [Part 2: English Documentation](#part-2-english-documentation)
  - [Project Overview](#project-overview)
  - [Key Features](#key-features)
  - [System Architecture & Stack](#system-architecture--stack)
  - [Dedicated Remote Test (Windows RDP) Installation Guide](#dedicated-remote-test-windows-rdp-installation-guide)
  - [Dedicated SSH Test (Paramiko 2 & WebSocket) Installation Guide](#dedicated-ssh-test-paramiko-2--websocket-installation-guide)
  - [General Installation & Setup (Linux)](#installation--setup-linux)
  - [System Scripts](#system-scripts)
  - [AI Agent Instructions](#ai-agent-instructions)

---

# بخش اول: راهنمای فارسی

## معرفی پروژه
**NetTopology** یک پلتفرم یکپارچه و پیشرفته برای مدیریت زیرساخت‌های شبکه محلی (LAN)، پایش وضعیت سوئیچ‌ها و روترهای سیسکو، بازرسی بصری پورت‌ها و رک‌ها، و اجرای دستورات خط فرمان (CLI) به صورت تعاملی و هوشمند است. این نرم‌افزار به مهندسان شبکه و مدیران سیستم امکان می‌دهد بدون نیاز به کنسول‌های سنتی و پراکنده، تمامی سویچ‌های سازمان را از طریق یک داشبورد مدرن، تعاملی و مجهز به گرافیک فیس‌پلیت سخت‌افزاری مدیریت نمایند.

---

## ویژگی‌ها و قابلیت‌های کلیدی

### ۱. بازرسی گرافیکی پورت‌ها با فیس‌پلیت واقعی RJ-45 (Switch Faceplate)
- **شبیه‌سازی دقیق سخت‌افزاری:** نمایش پورت‌های سوئیچ با کامپوننت گرافیکی وکتور (SVG) کانکتور شبکه RJ-45 شامل پین‌های طلایی، ضامن سوکت و پین‌اوت‌های استاندارد.
- **چراغ‌های وضعیت LED:** پایش وضعیت فیزیکی پورت (Up، Down، Administratively Disabled) همراه با افکت‌های نوری و پالس آنلاین.
- **نشان‌های هوشمند مود و VLAN:** تفکیک پورت‌های Access و Trunk با تگ‌های رنگی پرکنتراست و نمایش آنی شماره VLAN.
- **فرم ویرایش با طراحی خاکستری (Gray) و انتخابگرهای پیشرفته VLAN:** 
  - کادرهای اختصاصی خاکستری برای **VLAN ID** و **Allowed VLANs** با دراپ‌داون ویلن‌های تعریف‌شده در سوئیچ، اینپوت عددی و دکمه‌های چیپ انتخاب سریع.
  - قفل شدن خاکستری (Disabled/Grayed-out) برای Allowed VLANs در حالت Access Mode طبق معماری سیسکو، و فعال‌سازی در حالت Trunk با قابلیت انتخاب تفکیکی ویلن‌ها یا `ALL (1-4094)`.
- **ویرایش مستقیم از جدول پورت‌ها (All Switch Ports):** با کلیک روی دکمه Edit در هر سطر جدول، فرم ویرایش فعال شده و صفحه با اسکرول نرم خودکار به سمت کارت پیکربندی هدایت می‌شود.
- **اتصال مستقیم تغییرات پورت به سوئیچ واقعی از طریق SSH (Real Switch Direct Configuration via SSH):**
  - تمامی تغییرات اعمال‌شده در فرانت‌اند (تغییر VLAN ID، مد Access/Trunk، ویلن‌های مجاز Allowed VLANs، وضعیت Port Security، Admin Status و Description) مستقیماً از مسیر `Frontend -> API -> Backend -> SSH Service -> Real Cisco Switch` عبور کرده و روی اینترفیس فیزیکی سوئیچ اعمال می‌شوند.
  - **پیش‌نمایش پیکربندی (Configuration Preview Modal):** پیش از اعمال هر کانفیگ، پنجره تاییدیه شامل مشخصات دیوایس، نام اینترفیس، مقایسه ویلن فعلی و جدید و دستورات دقیق CLI سیسکو (`interface Gi...`, `switchport access vlan ...`) به کاربر نمایش داده می‌شود.
  - **پایداری وضعیت و عدم به‌روزرسانی زودهنگام:** کلید اعمال پیکربندی حین اجرا با وضعیت «Applying configuration...» غیرفعال شده و تنها پس از دریافت تایید موفقیت قطعی از سوئیچ واقعی، رابط کاربری به‌روزرسانی و اطلاعات مجدداً از سوئیچ بارگذاری می‌گردند؛ در صورت بروز خطا، مقادیر فرم به حالت قبل بازمی‌گردند.

### ۲. امنیت پورت لایه ۲ سیسکو (Cisco Port Security)
- **فعال‌سازی با کلید تعاملی با کنتراست بالا:** اعمال پیکربندی `switchport port-security` روی پورت‌های اکسس.
- **حالت‌های یادگیری مک‌آدرس (MAC Learning):**
  - حالت داینامیک چسبنده (**Sticky MAC**): یادگیری خودکار مک‌آدرس‌های فعال و ثبت آن‌ها در پیکربندی.
  - حالت پیکربندی دستی (**Configured MAC**): وارد کردن مک‌آدرس‌های اختصاصی و مجاز.
- **تنظیم حداکثر مجاز مک‌آدرس‌ها (Maximum MACs):** جلوگیری از حملات MAC Flooding.
- **اکشن‌های تخطی امنیتی (Violation Actions):**
  - **Shutdown:** خاموش شدن آنی پورت و ورود به وضعیت `err-disabled`.
  - **Restrict:** ارسال پکت هشدار لاگ SNMP و بلاک کردن ترافیک مک غیرمجاز.
  - **Protect:** متوقف‌سازی بسته‌ها در سکوت بدون ارسال Trap.

### ۳. ترمینال تعاملی خط فرمان سیسکو (Interactive Cisco CLI Terminal)
- **شبیه‌ساز قدرتمند IOS-XE:** پشتیبانی از مدهای استاندارد سیسکو:
  - `USER_EXEC` (`Switch>`)
  - `PRIVILEGED_EXEC` (`Switch#`)
  - `GLOBAL_CONFIG` (`Switch(config)#`)
  - `INTERFACE_CONFIG` (`Switch(config-if)#`)
  - `VLAN_CONFIG` (`Switch(config-vlan)#`)
- **سایدبار راهنمای هوشمند دستورات مرحله:** نمایش دستورات متناسب با مد جاری همراه با توضیحات فارسی، امکان درج دستور در خط فرمان با یک کلیک و اجرای آنی با دکمه اختصاصی.
- **قابلیت‌های کاربردی CLI:** تاریخچه دستورات با کلیدهای جهت‌نما (Arrow Up/Down)، تکمیل خودکار با کلید Tab، و راهنمای دستور با علامت سوال (`?`).
- **کنتراست فوق‌العاده و تمیز:** متن فیروزه‌ای، مکان‌نمای سبز زمردی و متن‌های لاگ سیستم بدون افتادگی رنگ در هر دو تم روشن و تاریک.

### ۴. مدیریت تغییرات ذخیره‌نشده و رایت در حافظه (NVRAM Write Memory)
- **شناسایی تغییرات رایت‌نشده:** تشخیص عدم تطابق بین `running-config` و `startup-config` با نمایش بج هشدار زرد رنگ.
- **کلید مستقیم Write:** امکان اجرای بلادرنگ دستور `write memory` / `copy run start` مستقیماً از هدر مدال پورت‌ها، ترمینال و داشبورد بدون نیاز به تایپ دستی.

### ۵. موتور قالب‌های کانفیگ و کلونینگ تعاملی (Config Templates & Cloning)
- **تمپلیت‌های ماژولار:** ذخیره و اعمال کانفیگ‌های استاندارد (نظیر سکیوریتی اولیه، تنطیمات SSH، کانفیگ VLANها و ترانک‌ها).
- **پارامترهای متغیر پویا:** درج متغیرهایی مانند `{{HOSTNAME}}` و `{{IP_ADDRESS}}` و جایگزینی هوشمند آن‌ها قبل از ارسال به دیوایس.
- **تست و بررسی Diff قبل از اعمال:** مشاهده خط‌به‌خط تغییرات ارسالی به سوئیچ برای پیشگیری از اختلال در شبکه.

### ۶. نقشه توپولوژی شبکه، مدیریت رک‌ها و کاوش خودکار همسایگان با CDP و LLDP (Topology & CDP/LLDP Discovery)
- **پایش مکانی و ساختار فیزیکی:** دسته‌بندی تجهیزات بر اساس ساختمان، طبقه، واحد و رک فیزیکی با قابلیت درگ‌اند‌دراپ و جابجایی آزاد.
- **پایش وضعیت اتصال و کابل‌کشی:** نمایش بصری کابل‌ها و لینک‌های فیزیکی بین پورت‌ها با رنگ‌بندی و تفکیک ترانک و اکسس.
- **کشف و افزودن خودکار همسایگان با پروتکل‌های لایه ۲ (CDP & LLDP Discovery & Topology Import):**
  - **۳ روش کاوش یکپارچه:**
    1. **پرس‌وجوی مستقیم سوئیچ یا روتر:** استخراج جدول همسایگان با فرامین `show cdp neighbors detail` و `show lldp neighbors detail` روی سوئیچ منتخب.
    2. **اسکن رنج شبکه (CIDR Subnet Sweep):** اسکن بلوک IP هدف (مانند `192.168.1.0/24`) و گردآوری تجمیعی همسایگان لایه ۲.
    3. **کارت شبکه محلی سیستم:** تحلیل بسته‌های مالتی‌کست CDP و LLDP از سوئیچ بالادستی متصل به سرور.
  - **دکمه میانبر اختصاصی در پنل سوئیچ:** با انتخاب هر سوئیچ در نقشه، دکمه «کاوش همسایگان این سوئیچ (CDP/LLDP)» مستقیماً مودال کاوش را با مبدا قرار دادن آن سوئیچ باز می‌کند.
  - **افزودن بلادرنگ به توپولوژی با یک کلیک:** امکان انتخاب تکی یا دسته‌جمعی همسایگان و ثبت خودکار تجهیزات، پورت‌ها و لینک‌های اتصالی در نقشه با چیدمان هوشمند و بدون تداخل فیزیکی.
  - **تفکیک هوشمند تجهیزات موجود و جدید:** شناسایی خودکار تجهیزاتی که از قبل در توپولوژی ثبت شده‌اند و برچسب‌گذاری همسایگان جدید آماده ورود به نقشه.
- **فیلترهای پیشرفته:** جستجوی آنی بر اساس آی‌پی، نام سوئیچ، مدل و پورت‌های فعال.

### ۷. تم‌ها و پالت‌های رنگی ماتریکس با تم اختصاصی سایبرپانک ۲۰۷۷ (Themes & Cyberpunk 2077 Palette)
- **تم اختصاصی Cyberpunk 2077 (Night City):** پیاده‌سازی پالت اختصاصی نئون برگرفته از دنیای بازی و فیلم سایبرپانک شامل رنگ زرد قناری نئون (`#fcee0a`)، سرخابی تند (`#ff0055`)، آبی فیروزه‌ای الکتریک (`#00f0ff`) و بستر فوق تاریک با درخشش‌های هولوگرافیک، بردرهای نئونی درخشان، و استایل ویژه ترمینال و داک.
- **تنوع تم‌های رنگی چندگانه:** ابزیدین کیهانی (Cosmic Obsidian)، امرالد ماتریکس (Cyber Emerald)، کبالت اقیانوسی (Tech Cobalt)، رز کریمسون (Rose Crimson)، کهربایی نئون (Neon Amber)، سایبرپانک ۲۰۷۷ (Cyberpunk 2077) و شفاف روشن (Clear Light).
- تمامی پنجره‌های پاپ‌آپ و مودال‌های سیستم از افکت تیره شیشه‌ای بلور (`backdrop-filter: blur(14px)`) بهره می‌برند تا تمرکز کاربر حفظ شده و هیچ‌گونه تداخل بصری با هدر یا بدنه رخ ندهد.
- پشتیبانی کامل از **Dark Mode** و **Light Mode** با کنتراست اصلاح‌شده و تاییدیه استانداردهای دسترس‌پذیری.

### ۸. موتور اتوماسیون پایتون و اتصال مستقیم به سوئیچ‌های واقعی (Python Switch Engine)
- **پشتیبانی از Netmiko و Paramiko:** ماژول اختصاصی پایتون (`backend/switch_engine.py`) برای برقراری ارتباط واقعی SSHv2 و Telnet با انواع سوئیچ‌ها و روترهای سیسکو (Cisco IOS, IOS-XE, NX-OS) و اجرای خودکار دستورات پیکربندی و نمایشی (`show ip int brief`, `show run`, `show cdp neighbors`, ...).
- **دروازه بلادرنگ وب‌سوکت SSH (Hardware SSH Gateway):** اتصال مستقیم ترمینال فرانت‌اند به پورت ۲۲ سوئیچ‌های واقعی سخت‌افزاری از طریق وب‌سوکت دوطرفه با شبیه‌سازی کامل ANSI و کلیدهای کنترلی (`Ctrl+C`, `Tab`).
- **مودال تایید دستورات خطرناک (Dangerous Command Interlock):** شناسایی و جلوگیری از اجرای ناخواسته دستورات بحرانی نظیر `reload`، `write erase` و `shutdown`.

### ۹. اسکنر خودکار ساب‌نت شبکه محلی (LAN Subnet Scanner)
- **پایش و کشف خودکار تجهیزات:** اسکن موازی و پرسرعت رنج‌های IP شبکه محلی (مانند `192.168.1.0/24`) با بررسی همزمان پورت‌های SSH (22)، Telnet (23)، HTTP (80) و HTTPS (443).
- **افزودن با یک کلیک به توپولوژی:** امکان ایمپورت سریع سوئیچ‌های کشف‌شده به نقشه شماتیک و ایجاد خودکار پورت‌ها و لینک‌ها.

### ۱۰. نصاب خودکار و اجرای آسان روی ویندوز (Windows Installer & Setup)
- **فایل‌های نصاب یکپارچه:**
  - `install_windows.bat`: اسکریپت بچ خودکار برای بررسی پیش‌نیازهای پایتون، نود جی‌اس، ارتقای pip، نصب کتابخانه‌های `netmiko`، `paramiko`، وابستگی‌های npm و ساخت شورتکات روی دسکتاپ.
  - `start_windows.bat`: راه‌اندازی سریع همزمان بک‌اند پایتون و سرور وب و باز کردن خودکار آدرس `http://localhost:3000` در مرورگر پیش‌فرض.
  - `install_windows.ps1`: اسکریپت پاورشل حرفه‌ای برای محیط‌های سازمانی ویندوز.

### ۱۱. دکمه و پنجره تعاملی نمایش جریان‌کاری و معماری هر بخش (Module Workflow & Target Inspector)
- **کلید دسترسی چندمنظوره (Multi-Access Buttons):**
  - دکمه شناور در لبه پایین صفحه (`floating-workflow-dock-btn`) با افکت شیشه‌ای، انیمیشن پالس و نشانگر ماژول فعال.
  - دکمه نوار وضعیت فوتر پایین (`bottom-bar-workflow-btn`) با برچسب بخش جاری.
  - دکمه اختصاصی در هدر بالا (`Navbar`) و منوی آبشاری پروفایل کاربری.
- **تشخیص هوشمند بخش فعال:** نمایش خودکار جریان‌کاری (Workflow) همان صفحه‌ای که کاربر در آن قرار دارد (مانند پورت‌ها، داشبورد، لیست تجهیزات، توپولوژی، الگوها، اسکنر و...).
- **مشاهده فایل‌ها و اندپوینت‌های دقیق برای درخواست تغییرات:**
  - لیست فایل‌های فرانت‌اند (`Component File`)
  - سرویس‌های متصل و توابع API (`Service Method`)
  - اندپوینت‌های بک‌اند سرور (`Backend Endpoint`)
- **کلید کپی سریع پرامپت (Copy Target Token):** دکمه تک‌کلیک جهت کپی کردن فرمت دقیق درخواست به هوش مصنوعی (مثل `[TARGET: ports] - Modify src/components/PortManagementView.tsx`) جهت ارائه دستورات شفاف برای اعمال تغییرات بعدی بدون ابهام.

### ۱۲. نشانگرهای اختصاصی گردش‌کار در تمامی مدال‌ها و کارت‌ها (Omnipresent Workflow Badges)
- **دسترسی بلادرنگ به منطق و معماری در هر نقطه از برنامه:**
  - برچسب تعاملی `WorkflowTriggerBadge` در هدر تمامی پنجره‌ها و کارت‌های کلیدی سیستم تعبیه شده تا کاربر با ورود به هر مدال یا کارت بتواند دقیقاً معماری، فایل منبع، توابع API و پایپ‌لاین آن بخش را مشاهده کند.
- **پوشش کامل مدال‌ها (All Modals):**
  - مدال ثبت تجهیز جدید (`AddDeviceModal`)
  - کنسول شبیه‌ساز سیسکو (`CiscoTerminalModal`)
  - بازرس فیزیکی پورت (`PortInspectorModal`)
  - اسکنر خودکار شبکه محلی (`LanScannerModal`)
  - پنجره اعمال الگوی کانفیگ (`ApplyTemplateModal`)
  - ویرایشگر تمپلیت (`TemplateEditorModal`)
  - شبیه‌ساز و کلون تمپلیت (`CloneTemplateModal`)
  - استخراج‌کننده کانفیگ زنده تجهیز (`CaptureConfigModal`)
  - تست پینگ و تشخیص پورت‌ها (`TestConnectionModal`)
  - تخصیص ویلن دسترسی (`AssignVlanModal`)
  - تاییدیه اعمال دستورات سیسکو (`CiscoCommandConfirmModal`)
  - هشدار اینترسپتور دستورات خطرناک (`DangerousCommandModal`)
  - بسته نصبی و راهنمای ویندوز (`WindowsInstallerModal`)
  - تاریخچه تغییرات و نسخه‌ها (`ReleaseNotesModal`)
  - پیش‌نمایش تغییرات پورت سوئیچ (`PortChangePreviewModal`)
- **پوشش کارت‌ها و بخش‌های تحلیلی (Key Cards & Views):**
  - کارت فیس‌پلیت سخت‌افزاری سوئیچ (`card-port-faceplate`)
  - کارت اعمال تنظیمات گروهی پورت‌ها (`card-batch-config`)
  - کارت ویرایش و مشخصات تفصیلی پورت (`card-port-detail`)
  - کارت جدول تجهیزات و سرورها (`card-device-table`)
  - نوار ابزار و کنترل‌های بوم شماتیک (`card-schematic-canvas`)
  - کارت کتابخانه الگوهای پیکربندی (`card-template-library`)
  - کارت اسکنر همسایگی CDP/LLDP (`card-cdp-scanner`)
  - کارت داشبورد پایش شبکه (`module-dashboard`)

### ۱۳. ماژول اتوماسیون جامع شبکه و ارکستراسیون چندسازنده (Network Automation & Multi-Vendor Orchestration)
- **پایپ‌لاین ۸ مرحله‌ای قطعی و ایمن (8-Stage Deterministic Safety Pipeline):**
  - پیاده‌سازی متدولوژی امن سازمانی: کشف وضعیت زنده (Discover) ← اعتبارسنجی نحوی و ارزیابی ریسک (Validate) ← تولید دستورات استاندارد CLI (Generate) ← پیش‌نمایش شفاف دستورات و Diff (Preview) ← اسنپ‌شات خودکار و غیرقابل تغییر از کانفیگ زنده (Backup) ← ارسال از طریق SSH واقعی (Apply) ← اجرای دستورات show و راستی‌آزمایی برخط (Verify) ← بازگردانی هوشمند به نسخه پیشین در صورت بروز خطا (Rollback).
- **اتصال واقعی به سخت‌افزار از طریق SSH (بدون Mock یا Fake Data):**
  - تمامی دستورات مستقیماً از طریق پروتکل امن SSHv2 روی اینترفیس‌ها، روت‌ها و روتینگ پروتکل‌های سخت‌افزار واقعی اعمال و راستی‌آزمایی می‌شوند.
- **پشتیبانی کامل از تجهیزات سیسکو (Cisco IOS / IOS-XE Suite):**
  - **روتینگ پیشرفته:** Static Routing با وزن و اینترفیس خروجی، پروتکل OSPFv2 چند ناحیه‌ای همراه با Router-ID و اینترفیس‌های Passive، پروتکل BGP Peering تک و چند همسایه با Remote-AS و Update-Source، و ویزارد خودکار اتصال نقطه به نقطه (P2P Interconnect) جهت پیکربندی متقارن دو سر لینک روی دو روتر همزمان.
  - **سوئیچینگ لایه ۲:** پورت‌های Access، ترانک‌های 802.1Q با هماهنگی Native VLAN و ویلن‌های مجاز، فعال‌سازی PortFast و BPDU Guard برای پیشگیری قطعی از حلقه‌های سوئیچینگ.
  - **بانک اطلاعاتی VLAN و SVI:** ایجاد تکی یا دسته‌جمعی ویلن‌ها با گرامر فشرده (نظیر `10,20,30-50`) و تعریف خودکار Interface VLAN همراه با IP و ساب‌نت ماسک.
  - **سرویس‌های پیشرفته سازمانی:** 
    - **تجمیع پورت EtherChannel و LACP دوطرفه (Dual-Switch Cross-LACP Orchestration):** قابلیت منحصر‌به‌فرد برای اتصال و کانفیگ همزمان دو سوئیچ متقابل شبکه (Switch A ↔ Switch B) با اعتبارسنجی هماهنگ، پیش‌تنظیم‌های مذاکره (`Active ↔ Active`، `Active ↔ Passive`، `Static On ↔ On`)، اینترفیس‌های عضو و هماهنگی ترانک 802.1Q همراه با رول‌بک ایمن در صورت عدم موفقیت سوئیچ دوم.
    - **حالت تک‌سوئیچ (Single Switch Mode):** امکان تنظیم مستقل EtherChannel روی یک سوئیچ منفرد با پروتکل‌های LACP و PAgP و استاتیک.
    - **پروتکل Spanning Tree (STP):** مدیریت PVST+، Rapid-PVST، MSTP، انتخاب Root Primary/Secondary و تنظیم اولویت و هزینه پورت.
    - **سایر سرویس‌های زیرساختی:** تونل‌های امن GRE، پایش پایداری و تاخیر با IP SLA و ردگیری ICMP، مترجم آدرس شبکه NAT (Overload/PAT/Pool)، و سرور DHCP اختصاصی با رنج‌های مستثنی‌شده (Excluded Addresses).
  - **انطباق و هاردنینگ امنیتی (CIS Hardening & Live Audit):** اسکن زنده پیکربندی سوئیچ و روتر، محاسبه شاخص سلامت امنیتی (۰ تا ۱۰۰)، ارزیابی پسورد سکرت Type 5/8/9، احراز هویت AAA، رمزنگاری سرویس‌ها، غیرفعال‌سازی سرویس‌های منسوخ Telnet/HTTP، کنترل دسترسی SSH با ACL، فعال‌سازی تاخیر ورود لاگین و بنر هشدار سازمانی، همراه با دکمه مستقیم Remediation برای رفع فوری هر آسیب‌پذیری با دستورات رسمی سیسکو.
- **پشتیبانی کامل از تجهیزات میکروتیک (MikroTik RouterOS Suite):**
  - راه‌اندازی تونل‌های امن WireGuard VPN شامل Interface، پورت Listen، کلیدهای عمومی و همتایان (Peers) مجاز.
  - فایروال وضعیت‌مند و هاردنینگ: FastTrack Connections، فیلتر بسته‌های Invalid، و سیستم ضد بروت‌فورس SSH با لیست سیاه پویا.
  - روتینگ و فیل‌اور خودکار اینترنت: مسیریابی بازگشتی (Recursive Routing) جهت بررسی سلامت آپ‌استریم و سوئیچینگ آنی بین دو لینک اینترنت WAN1 و WAN2.
  - قوانین NAT (Masquerade و Port Forwarding dst-nat) و فیلترینگ سخت‌افزاری Bridge VLAN.
- **مخزن اسنپ‌شات‌ها و لاگ حاکمیت سازمانی (Snapshot Vault & Audit Trail):**
  - ذخیره‌سازی خودکار نسخه کامل `running-config` پیش از اعمال هر دستور، امکان مشاهده Diff و محتوای اسنپ‌شات، و بازگردانی بلادرنگ (Rollback) با یک کلیک.
  - ثبت تغییرات در دفتر کل مانیتورینگ شامل مشخصات کاربر، زمان دقیق، نام دیوایس، کلیه خطوط ارسالی، وضعیت راستی‌آزمایی و لاگ جامع خطاها.

### ۱۴. قابلیت تست و اتصال تلنت واقعی (Real Telnet Socket & CLI Terminal)
- **پشتیبانی کامل از پروتکل استاندارد RFC 854 Telnet بدون داده‌های فیک یا ساختگی:**
  - ارتباط مستقیم با پورت‌های تلنت شبکه (پیش‌فرض ۲۳ یا پورت‌های کنسول و سوئیچ دلخواه نظیر ۲۳۲۳، ۵۰۰۰، ۲۰۲۳ و...) از طریق سوکت TCP در سطح بک‌اند Node.js (`net.Socket`).
- **تست پورت و عیب‌یابی آنی در پنجره ثبت تجهیز جدید (`AddDeviceModal`):**
  - امکان تنظیم پورت اختصاصی تلنت (`Telnet Port`) در کنار SSH.
  - دکمه **تست اتصال تلنت (Test Telnet)** با محاسبه دقیق میلی‌ثانیه‌ای تاخیر (Latency ms)، تشخیص باز یا بسته بودن پورت، خطاهای واقعی شبکه (`ECONNREFUSED`، `ETIMEDOUT`، `EHOSTUNREACH`) و نمایش آنی بنر خوش‌آمدگویی یا پرامپت ارسالی از سمت سوئیچ یا روتر واقعی.
- **ترمینال زنده تلنت دوطرفه تحت وب‌سوکت (`RealTelnetTerminalModal` / `/ws/telnet`):**
  - پیاده‌سازی گیت‌وی بلادرنگ وب‌سوکت برای استریمینگ دوطرفه کاراکترها و کلیدهای کنترلی بدون کوچک‌ترین شبیه‌سازی یا دیتای ماک.
  - فیلترینگ و مذاکره استاندارد بایت‌های IAC (شامل NAWS برای ابعاد ترمینال، TTYPE برای xterm-256color، SGA و ECHO).
  - دارای نوار ابزار کامل شامل دکمه‌های پرکاربرد سیسکو (`terminal length 0`, `enable`, `show version`, `show ip int brief`, `show run`, `exit`)، کلید ارسال بازگشت خط `[Enter ↵]`، قابلیت ذخیره و دانلود لاگ کامل نشست متنی، و تغییر زنده آدرس IP و پورت بدون نیاز به بستن صفحه.

### ۱۵. ماژول تست ریموت و اتصال زنده ریموت دسکتاپ ویندوز (Remote Test / Windows RDP)
- **ارتباط زنده RDP بدون هیچ‌گونه شبیه‌سازی یا دیتای ساختگی:**
  - اتصال ریموت دسکتاپ مرورگری به ماشین‌های ویندوز سرور و کلاینت بر بستر استاندارد **Apache Guacamole** و دیمن `guacd:4822`.
- **ترجمه آنی پروتکل به HTML5 Canvas و وب‌سوکت دوطرفه:**
  - مسیر استریم `/ws/remote-desktop` همراه با انتقال بلادرنگ تصویر دسکتاپ، ماوس، کیبورد، اسکرول و ژست‌های لمسی.
- **امکانات حرفه‌ای سشن ریموت:**
  - ارسال مستقیم ماکروی `Ctrl + Alt + Delete`
  - کلید اختصاصی `Windows Key (Super)`
  - همگام‌سازی دوطرفه حافظه کلیپ‌بورد (Clipboard Sync) بین مرورگر و ویندوز هدف
  - پشتیبانی از حالت تمام‌صفحه (Fullscreen) و مقیاس‌پذیری خودکار رزولوشن دسکتاپ
- **بانک اختصاصی تجهیزات ویندوز و تست عیب‌یابی پورت:**
  - ثبت مشخصات ماشین‌ها (IP، پورت پیش‌فرض ۳۳۸۹ یا پورت‌های دلخواه، نام کاربری و دامنه).
  - دکمه **Test Connection** برای اعتبارسنجی زنده پورت TCP ۳۳۸۹ و محاسبه میلی‌ثانیه‌ای تاخیر قبل از ورود به سشن.
  - رمزنگاری کلیدهای عبور در بک‌اند با استاندارد PBKDF2 و AES-256 و محافظت از طریق توکن‌های موقت سشن ۶۰ ثانیه‌ای.

### ۱۶. ماژول تست و عیب‌یابی SSH واقعی با Paramiko 2 و وب‌سوکت (Real SSH Testing, 8-Layer Diagnostic & Paramiko 2 Engine)
- **ارتباط کاملاً واقعی بدون داده‌های فیک یا شبیه‌سازی:**
  - اتصال مستقیم به تجهیزات واقعی لینوکس (Ubuntu, Debian, RHEL, CentOS)، روترها و سوئیچ‌های سیسکو (IOS / IOS-XE)، میکروتیک (MikroTik RouterOS) و سایر تجهیزات شبکه مبتنی بر SSHv2.
- **موتور قدرتمند و مستقل پایتون با کتابخانه Paramiko 2.12.0 و پچ سازگاری SSH Version 2:**
  - پیاده‌سازی بک‌اند اختصاصی در مسیر `/backend/ssh_test/` به همراه مخزن مستقل `ssh_test_devices.json` با رمزنگاری پیشرفته کلیدهای عبور و کلیدهای خصوصی SSH با الگوریتم AES-CBC و توکن‌های نشست ۶۰ ثانیه‌ای موقت.
  - **پشتیبانی کامل از سوئیچ‌ها و روترهای سیسکو مبتنی بر SSH v2 و رفع خطای عدم تطابق KEX:**
    - تجهیز به ماژول پچ کریپتوگرافی `kex_patch.py` و `CiscoCompatibleTransport` جهت گسترش الگوریتم‌های تبادل کلید (Key Exchange) و سایفرهای رمزنگاری به منظور رفع کامل خطای `Incompatible ssh peer (no acceptable kex algorithm)`.
    - پشتیبانی فعال و دوطرفه از الگوریتم‌های مدرن و کلاسیک سیسکو: `curve25519-sha256`, `curve25519-sha256@libssh.org`, `ecdh-sha2-nistp256/384/521`, `diffie-hellman-group-exchange-sha256`, `diffie-hellman-group14-sha256`, `diffie-hellman-group16-sha512` و الگوریتم‌های متداول سوئیچ‌های Catalyst / IOS 12 & 15 نظیر `diffie-hellman-group-exchange-sha1`, `diffie-hellman-group14-sha1` و `diffie-hellman-group1-sha1`.
    - پشتیبانی از تمام سایفرهای استاندارد شبکه (`aes128-ctr`, `aes256-ctr`, `aes128-cbc`, `aes256-cbc`, `3des-cbc`).

- **سیستم ممیزی ۸ لایه فرانت تا بک‌اند (End-to-End 8-Layer Diagnostic Audit):**
  - بررسی و تفکیک بلادرنگ تمامی لایه‌های ارتباطی:
    1. **REST Gateway Bridge:** بررسی ارتباط مرورگر با درگاه Node.js و پراکسی پایتون
    2. **Paramiko 2 Engine:** سلامت هسته پایتون و ماژول کریپتوگرافی
    3. **WebSocket Tunnel Gateway:** بررسی آماده‌به‌کار بودن درگاه `/ws/ssh-test`
    4. **DNS Resolution:** اعتبارسنجی رزولوشن نام هاست به آدرس IP واقعی
    5. **TCP Network Layer & Socket Handshake:** برقراری اتصال TCP Socket به پورت ۲۲ (یا پورت سفارشی) و محاسبه میلی‌ثانیه‌ای تاخیر رفت و برگشت (RTT Latency)
    6. **SSH Server Banner Exchange:** خواندن بنر واقعی پروتکل سرور (نظیر `SSH-2.0-OpenSSH_8.9p1`)
    7. **Paramiko SSH Authentication & Cipher Negotiation:** اعتبارسنجی کلمه عبور یا کلید خصوصی و مذاکره سایفرهای رمزنگاری
    8. **Interactive PTY Virtual Terminal Allocation:** بررسی امکان تخصیص پایانه مجازی تعاملی
  - **شناسایی دقیق محل عیب و راهکار پیشنهادی:** در صورت بروز هرگونه اختلال، پنل ممیزی دقیقاً مشخص می‌کند که اختلال در کدام لایه رخ داده و متن خطای فنی، علت فارسی و انگلیسی و راهکار رفع مشکل (Remediation) را نمایش می‌دهد.
- **قابلیت استخراج و فتچ زنده اطلاعات (Paramiko 2 Live Telemetry Fetching):**
  - استخراج مشخصات سیستم‌عامل (OS & Platform)، هسته کرنل، مدت زمان دقیق روشن بودن (Uptime)، لیست کامل کارت‌های شبکه و وضعیت فیزیکی UP/DOWN، وضعیت حافظه RAM (کل، مصرف‌شده، آزاد)، فضای دیسک و مدل پردازنده (CPU) بدون کوچک‌ترین داده ماک.
  - نمایش خروجی خام کلیه دستورات سیستمی اجرا شده همراه با امکان کپی مستقیم.
- **ترمینال اینتراکتیو و تعاملی وب‌سوکت (Interactive WebSocket Terminal):**
  - ارتباط دوطرفه زنده از طریق وب‌سوکت `/ws/ssh-test` و ورکر پایتون `terminal_worker.py`.
  - پشتیبانی کامل از کلیدهای کنترلی شل (Ctrl+C جهت ارسال SIGINT، Ctrl+D برای EOF، کلید Tab برای Auto-Complete، تاریخچه دستورات با کلیدهای جهت‌نما، نوار ابزار دستورات سریع و پشتیبانی از تمایز رنگی کدهای ANSI).

---

## ساختار معماری و تکنولوژی‌ها
- **Front-End:** React 18+، TypeScript، Tailwind CSS v4، Lucide React، Motion
- **Back-End:** Node.js، Express، Bun / Tsx Runtime
- **شبکه و ارتباطات:** RESTful APIs، شبیه‌ساز پایپ‌لاین Cisco IOS-XE CLI
- **ذخیره‌سازی و پایداری:** ساختار داده‌های جیسون ماژولار و هماهنگ با سرویس‌های ابری

---

## راهنمای نصب اختصاصی ماژول Remote Test و ویندوز RDP

ماژول **Remote Test** جهت ارائه تجربه روان، امن و بدون تاخیر اتصال به ریموت دسکتاپ ویندوز در مرورگر، از پروتکل استاندارد **Apache Guacamole** و سرویس پروکسی `guacd` استفاده می‌کند.

```
┌─────────────────────────────────┐       WebSocket       ┌────────────────────────┐      TCP 4822      ┌────────────────────┐      TCP 3389      ┌─────────────────────────┐
│ مرورگر کلاینت (HTML5 Canvas UI) │ ◄───────────────────► │ NetTopology Gateway    │ ◄────────────────► │ guacd Daemon       │ ◄────────────────► │ ماشین هدف ویندوز        │
│ React + RemoteDesktopSession    │   /ws/remote-desktop  │ Node.js / Express      │   Guacamole Proto  │ (Docker / Native)  │   Native RDP       │ (Windows 10/11/Server)  │
└─────────────────────────────────┘                       └────────────────────────┘                    └────────────────────┘                    └─────────────────────────┘
```

برای اجرای این ماژول دو روش زیر در دسترس است:

### روش اول: راه‌اندازی سریع با Docker Compose (پیشنهاد شده)
ساده‌ترین و پایدارترین روش که به صورت خودکار `guacd` و کل سرویس NetTopology را با تمامی وابستگی‌ها بالا می‌آورد:

```bash
# ۱. رفتن به دایرکتوری پروژه
cd NetTop

# ۲. اجرای کانتینرها در پس‌زمینه
docker compose up -d

# ۳. بررسی وضعیت کانتینرها
docker compose ps
```
کانتینرهای زیر ایجاد و اجرا می‌شوند:
- `nettopology-guacd`: دیمن رسمی آپاچی گوآکامولی روی پورت `4822`
- `nettopology-app`: اپلیکیشن NetTopology روی پورت `3000` و بک‌اند پایتون روی پورت `5001`

داشبورد بلافاصله روی آدرس `http://localhost:3000` در دسترس خواهد بود و وضعیت اتصال guacd در تب **Remote Test** سبز خواهد شد.

---

### روش دوم: نصب مستقیم روی سرور لینوکس (بدون Docker Compose)

#### ۱. نصب و راه‌اندازی سرویس guacd
روی سرور لینوکسی خود (Ubuntu / Debian):
```bash
# نصب پکیج guacd از مخازن رسمی
sudo apt update
sudo apt install -y guacd libguac-client-rdp0

# فعال‌سازی و استارت سرویس
sudo systemctl enable guacd
sudo systemctl start guacd

# بررسی وضعیت سرویس
sudo systemctl status guacd
```
> **نکته با Docker مجزا برای guacd:** اگر ترجیح می‌دهید فقط guacd در داکر باشد:
> ```bash
> docker run -d --name nettop-guacd --restart unless-stopped -p 4822:4822 guacamole/guacd:1.5.5
> ```

#### ۲. تنظیم متغیرهای محیطی در `.env`
یک فایل `.env` در ریشه پروژه ایجاد یا ویرایش کنید:
```env
PORT=3000
GUACD_HOST=localhost
GUACD_PORT=4822
RDP_ENCRYPTION_KEY=your-super-secret-vault-key-32-chars-min
```

#### ۳. نصب وابستگی‌ها و اجرای برنامه
```bash
npm install
npm run build
npm start
```

---

### چک‌لیست آماده‌سازی ماشین ویندوز هدف (Target Windows Host)
جهت برقراری اتصال موفق، مطمئن شوید که روی سیستم ویندوزی:
1. **فعال بودن Remote Desktop:** مسیر `Settings > System > Remote Desktop` فعال (On) باشد.
2. **فایروال ویندوز:** پورت `3389 TCP` باز باشد:
   ```powershell
   # در صورت نیاز در PowerShell Admin ویندوز:
   Enable-NetFirewallRule -DisplayGroup "Remote Desktop"
   ```
3. **دسترسی کاربر:** حساب کاربری دارای کلمه عبور بوده و عضو گروه `Remote Desktop Users` یا `Administrators` باشد.
4. **تست پورت با پنل:** در تب **Remote Test**، کلید **[Test Connection]** را بزنید تا تاخیر و وضعیت پورت ۳۳۸۹ اعتبارسنجی شود.

---

## راهنمای نصب اختصاصی ماژول SSH تست (Paramiko 2 و وب‌سوکت)

ماژول **SSH Test** برای ارتباط بلادرنگ، امن و کاملاً واقعی با سرورها و سوئیچ‌ها از کتابخانه استاندارد **Paramiko 2.12.0** و درگاه دوطرفه **WebSocket** بهره می‌برد. تمامی سناریوهای اتصال، ممیزی ۸ لایه و شل اینتراکتیو مبتنی بر سوکت‌های زنده شبکه بوده و بدون هرگونه داده ماک یا ساختگی عمل می‌کنند.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        معماری ماژول SSH Test                           │
├───────────────┬────────────────────────┬───────────────────────────────┤
│  مرورگر کاربر │      Node.js Server    │     Python 3 Backend Engine   │
│  (React UI)   │       (Port 3000)      │           (Port 5001)         │
├───────────────┼────────────────────────┼───────────────────────────────┤
│  SshTestView  │                        │                               │
│  Diagnostic   │ ── REST API Proxy ───> │ Flask Router / Controller     │
│  FetchedData  │                        │ ├── 8-Layer Diagnostic Engine │
│               │                        │ ├── Telemetry Collector       │
│               │                        │ └── Encrypted Vault (AES-CBC) │
│               │                        │                               │
│  Add Device   │ ── WS: /ws/ssh-test ──>│ Node.js WS Bridge (Upgrade)   │
│  Test Connect │   (mode=diagnostic)    │ └── Spawns diag_worker.py     │
│  (Live Stream)│ <── Stdio JSON Lines ─ │     └── Paramiko 2 KEX Patch  │
│               │                        │         └── Real Socket (:22) │
│               │                        │                               │
│  Interactive  │ ── WS: /ws/ssh-test ──>│ Node.js WS Bridge             │
│  Terminal     │   (session token)      │ └── Spawns terminal_worker.py │
│  (ANSI/PTY)   │ <── Stdio JSON Stream─ │     └── Paramiko invoke_shell │
│               │                        │         └── Target Node (:22) │
└───────────────┴────────────────────────┴───────────────────────────────┘
```

#### قابلیت‌های ویژه آزمون اتصال و رفع خطای مذاکره KEX در سوئیچ‌های سیسکو
- **ارتباط زنده وب‌سوکت در مد آزمون (`mode=diagnostic`):** در پنجره افزودن دیوایس جدید (`Add SSH Device Modal`)، کلیک بر روی «آزمون ارتباط زنده» به جای درخواست‌های سنتی، یک کانکشن استریمینگ روی `/ws/ssh-test?mode=diagnostic` باز کرده و فرآیند ارزیابی لایه‌ای را مستقیماً از طریق اسکریپت ورکر اختصاصی `diag_worker.py` با هسته Paramiko 2 اجرا می‌کند.
- **حل قطعی خطای `Incompatible ssh peer (no acceptable kex algorithm)`:**
  - با پیاده‌سازی مکانیزم هوشمند `kex_patch.py` و `CiscoCompatibleTransport`، هوک‌های مذاکره الگوریتم‌های تبادل کلید در لایه انتقال Paramiko تزریق می‌شوند.
  - پشتیبانی کامل از الگوریتم‌های سنتی سوئیچ‌های سیسکو کاتالیست و آی‌او‌اس قدیمی (شامل `diffie-hellman-group1-sha1`, `diffie-hellman-group14-sha1`, `diffie-hellman-group-exchange-sha1`) به همراه سایفرهای `aes256-cbc`, `aes128-cbc`, `3des-cbc` و کدهای صحت‌سنجی پیام (`hmac-sha1`, `hmac-sha1-96`) فعال است.
  - سیستم در صورت مواجهه با پیام اعلان اولیه سوئیچ، الگوریتم درخواستی سخت‌افزار را به صورت تطبیقی (Adaptive KEX Negotiation) فعال و اتصال را بدون وقفه نهایی می‌کند.
- **بدون هرگونه دیتای ماک (Zero Mock Data):** کلیه داده‌ها، زمان‌های تاخیر (Latency ms)، بنر پروتکل و الگوریتم‌های تبادل کلید مستقیماً از سوکت واقعی خوانده شده و به صورت بلادرنگ به کاربر گزارش می‌شوند.

### پیش‌نیازهای سیستمی
- پایتون ۳ نسخه 3.8 یا بالاتر (`python3`)
- مدیر بسته پایتون (`python3-pip`)
- ابزارهای بیلد سیستم‌عامل (جهت کامپایل پکیج‌های رمزنگاری C):
  ```bash
  # روی اوبونتو / دبیان:
  sudo apt update
  sudo apt install -y python3 python3-pip python3-dev build-essential libssl-dev libffi-dev

  # روی RHEL / CentOS / AlmaLinux:
  sudo dnf install -y python3 python3-pip python3-devel gcc openssl-devel libffi-devel
  ```

### ۱. نصب وابستگی‌های پایتون (Paramiko 2)
در پوشه اصلی پروژه، دستور زیر را اجرا کنید:
```bash
# نصب پکیج‌های اختصاصی ماژول با نسخه‌های تست‌شده:
pip3 install -r backend/requirements.txt

# یا نصب مستقیم به صورت مستقل:
pip3 install "paramiko>=2.12.0,<3.0.0" "cryptography>=3.4.8" "websockets>=10.0" flask requests
```

> **بررسی صحت نصب Paramiko 2:**
> ```bash
> python3 -c "import paramiko, cryptography; print(f'Paramiko: {paramiko.__version__}, Crypto: {cryptography.__version__}')"
> # خروجی مورد انتظار: Paramiko: 2.12.0
> ```

### ۲. تنظیم متغیرهای محیطی امنیتی (اختیاری)
کلید مستر جهت رمزنگاری کلمات عبور و کلیدهای خصوصی در فایل `.env`:
```env
# کلید رمزنگاری محفظه مشخصات SSH (در صورت عدم تعیین، یک کلید تصادفی ایجاد می‌شود)
SSH_TEST_SECRET_KEY=your-custom-master-passphrase-32-chars-minimum
PYTHON_PORT=5001
```

### ۳. بررسی پورت‌های فایروال و شبکه
- اطمینان حاصل کنید که پورت `TCP 22` (یا پورت اختصاصی SSH دیوایس هدف) از سمت سرور NetTopology در دسترس است:
  ```bash
  nc -zv -w 3 192.168.1.1 22
  ```
- در صورت استفاده از کلید خصوصی (Private Key)، کلید باید با فرمت استاندارد OpenSSH یا RSA (مانند `-----BEGIN RSA PRIVATE KEY-----` یا `-----BEGIN OPENSSH PRIVATE KEY-----`) در پنل وارد شود.

### ۴. راه‌اندازی و اجرای سامانه
```bash
# اجرای خودکار همزمان فرانت‌اند و بک‌اند:
npm run dev

# یا در محیط عملیاتی:
npm run build
npm start
```
سپس از منوی سایدبار گزینه **ssh تست** را انتخاب کرده، تجهیز مورد نظر را با آدرس IP و مشخصات ورود اضافه کنید و دکمه **[بررسی ارتباط فرانت تا بک‌اند]** را جهت اجرای تست ۸ لایه اجرا نمایید.

---

## راهنمای نصب و راه‌اندازی کلی سامانه روی لینوکس (Linux Installation)

### پیش‌نیازها
- Node.js نسخه 18 یا بالاتر (یا Bun)
- مدیر بسته `npm` یا `bun`
- پایتون 3 (اختیاری برای اسکریپت‌های اتوماسیون سیسکو): `python3`, `python3-pip`

### مراحل نصب گام‌به‌گام
```bash
# ۱. کلون کردن ریپازیتوری
git clone https://github.com/arkaadia/NetTop.git
cd NetTop

# ۲. نصب وابستگی‌های Node.js
npm install
# یا در صورت استفاده از Bun:
# bun install

# ۳. اجرای اسکریپت نصب کامل (اختیاری):
chmod +x install.sh start.sh stop.sh restart.sh
./install.sh

# ۴. اجرای برنامه در حالت توسعه (Development Mode)
npm run dev

# یا اجرای پایدار بیلد پروداکشن (Production Mode):
npm run build
npm start
```
برنامه روی آدرس `http://localhost:3000` (یا آی‌پی سرور شما: `http://SERVER_IP:3000`) در دسترس خواهد بود.

---

## اسکریپت‌های سیستمی
در ریشه پروژه اسکریپت‌های کمکی زیر برای مدیریت سرویس در محیط لینوکس قرار دارند:
- `start.sh`: اجرای خودکار سرور در پس‌زمینه
- `stop.sh`: متوقف‌سازی سرویس در حال اجرا
- `restart.sh`: راه‌اندازی مجدد سرور و اعمال تغییرات
- `install.sh`: نصب کامل پکیج‌ها و تنظیمات محیطی

---

## دستورالعمل توسعه و مشارکت هوش مصنوعی
برای هر هوش مصنوعی (AI Coding Agent) یا توسعه‌دهنده‌ای که بر روی این پروژه کد می‌زند:
> **قانون دائمی:** هر قابلیت، ماژول یا بهینه‌سازی جدیدی که به پروژه اضافه می‌شود **باید بلافاصله در فایل `README.md` (هم در بخش فارسی و هم انگلیسی)** مستند و ثبت گردد. همچنین تمامی تغییرات باید خودکار روی برنچ `master` مخزن گیت‌هاب کامیت و پوش شوند. جزئیات بیشتر در فایل `AGENTS.md` درج شده است.

---
---

# Part 2: English Documentation

## Project Overview
**NetTopology** is a comprehensive, production-ready web platform engineered for enterprise Local Area Network (LAN) management, Cisco switch and router topology visualization, visual rack faceplate inspection, and interactive command-line interface (CLI) administration. It eliminates the need for scattered terminal windows and archaic console cables by providing an integrated, stateful, and visually rich management environment.

---

## Key Features

### 1. Visual Switch Faceplate with True RJ-45 Vector Jack (`NetworkPortSvg`)
- **Hardware-Accurate Visualization:** High-fidelity SVG rendering of physical 8P8C (RJ-45) modular ports with gold contacts, latch tabs, and realistic socket housing.
- **Dynamic Port Status LEDs:** Real-time visual feedback reflecting operational states (Up, Down, Administratively Disabled) with pulsating glow effects.
- **VLAN & Mode Indicators:** Distinct visual badges for Access vs. Trunk modes, with high-contrast VLAN tags readable in both light and dark aesthetics.
- **Gray-Themed VLAN Configuration & Advanced Selectors:**
  - Dedicated **Gray-Themed** panels for **VLAN ID** and **Allowed VLANs** featuring a dropdown selector populated with switch VLANs, numeric ID inputs, and quick-select chips.
  - **Context-Aware Allowed VLANs:** Completely disabled and styled in gray in Access Mode (following Cisco single-VLAN architecture) and unlocked in Trunk Mode with multi-VLAN toggle chips or `ALL (1-4094)` shortcuts.
- **All Switch Ports Table Integration:** Clicking **Edit** on any port row instantly opens the configuration form and automatically executes a smooth scroll to the active edit card.
- **Real-Switch Direct Configuration via SSH:**
  - All port configuration edits (VLAN ID, Access/Trunk mode, Allowed VLANs, Port Security parameters, Admin Status, and Description) route through `Frontend -> API -> Backend -> SSH Service -> Real Cisco Switch`, applying directly to the hardware switch interface.
  - **Mandatory Configuration Preview Modal:** Prior to applying any changes, a confirmation dialog appears showing target device, interface identifier, current vs new proposed values, and generated Cisco IOS CLI commands (`interface Gi...`, `switchport access vlan ...`).
  - **Reliable State Enforcement & Deferred UI Updates:** The apply action shows "Applying configuration..." with disabled buttons until the switch explicitly returns success. Upon execution failure, the UI rolls back to previous state without desynchronizing from the physical switch.

### 2. Cisco Layer-2 Port Security Management
- **One-Touch Port Security Toggle:** Effortlessly apply `switchport port-security` with dedicated high-contrast controls.
- **MAC Address Learning Modes:**
  - **Sticky MAC (`switchport port-security mac-address sticky`):** Automatically captures and converts dynamically learned MACs into secure running-config entries.
  - **Configured MAC:** Specify authorized hardware addresses manually.
- **Maximum MAC Limit (`maximum <1-1024>`):** Guards against MAC address table overflow attacks.
- **Violation Action Policies:**
  - **Shutdown:** Immediately sets interface to `err-disabled` state upon unauthorized access.
  - **Restrict:** Drops violating traffic, increments counter, and sends SNMP trap.
  - **Protect:** Drops unauthorized packets without logging.

### 3. Interactive Cisco IOS-XE Terminal Emulator
- **Context-Aware CLI Hierarchy:** Seamlessly switches execution modes:
  - `USER_EXEC` (`Switch>`)
  - `PRIVILEGED_EXEC` (`Switch#`)
  - `GLOBAL_CONFIG` (`Switch(config)#`)
  - `INTERFACE_CONFIG` (`Switch(config-if)#`)
  - `VLAN_CONFIG` (`Switch(config-vlan)#`)
- **Stage-Aware Command Helper Sidebar:** Dynamically presents valid commands for the active prompt mode with explanatory descriptions, one-click insertion, and direct execution buttons.
- **CLI Usability Enhancements:** Tab completion, history navigation via Up/Down arrow keys, and standard Cisco `?` help querying.
- **High-Contrast Terminal Palette:** Cyan input font, emerald blinking cursor, and legible slate system text engineered to prevent low-contrast washout in light mode.

### 4. Unsaved Configuration Detection & NVRAM Write
- **Startup vs. Running-Config Tracking:** Detects unsaved volatile memory changes and triggers warning badges.
- **Direct Write Action:** One-click `write memory` / `copy running-config startup-config` triggers from the port inspector, terminal header, or dashboard.

### 5. Config Templates & Interactive Cloning Engine
- **Reusable Configuration Templates:** Create standard templates for base hardening, SSH, banner, NTP, and VLAN assignments.
- **Dynamic Parameter Replacement:** Interpolates template placeholders (e.g. `{{HOSTNAME}}`, `{{IP_ADDRESS}}`) before pushing to target appliances.
- **Diff & Validation View:** Visual comparison of running configurations vs. target states before deployment.

### 6. Topology Mapping, Rack Hierarchy & CDP/LLDP Neighbor Discovery
- **Physical Organization & Visual Layout:** Hierarchical grouping by building, floor, room, and rack unit with smooth pan/zoom canvas and free drag-and-drop.
- **Port-to-Port Cable Links:** Visual cable rendering showing real interface connections, speed, media type, and VLAN encapsulations.
- **Integrated Layer-2 CDP & LLDP Neighbor Discovery & Instant Topology Import:**
  - **3 Unified Operational Modes:**
    1. **Per-Switch/Router CLI Query:** Query Cisco CDP v2 and IEEE 802.1AB LLDP neighbor tables directly on any selected switch or router.
    2. **Subnet CIDR Range Sweep:** Concurrently scan IP blocks (e.g. `192.168.1.0/24`, `10.0.0.0/24`) to aggregate Layer 2 topology adjacencies.
    3. **Local Host Network Sniffer:** Capture upstream CDP/LLDP multicast frames arriving on the server's network adapter.
  - **Quick Action on Switch Selection:** Selecting any switch or router on the canvas exposes a dedicated "Discover Neighbors (CDP/LLDP)" button that pre-selects that appliance as the discovery source.
  - **One-Click Batch Import to Canvas:** Select discovered neighbor appliances and import them into the schematic topology instantly with auto-provisioned ports, physical links, and collision-free radial canvas positioning.
  - **Intelligent Adjacency Badges:** Live detection of existing vs. new equipment, protocol tags (CDP vs. LLDP), device capabilities, and remote port mappings.
- **Real-Time Health Monitoring:** Visual indicators for device reachability, uptime, and firmware versions.
- **Fast Search & Filtering:** Filter devices by IP, model, location, or active port status.

### 7. Matrix Themes & Dedicated Cyberpunk 2077 Night City Palette
- **Dedicated Cyberpunk 2077 Theme:** High-octane Night City aesthetic featuring iconic canary neon yellow (`#fcee0a`), hot neon magenta (`#ff0055`), electric cyan (`#00f0ff`), deep dark spatial carbon cards with vibrant neon borders, and custom terminal accents.
- **Rich Theme Library:** Cosmic Obsidian (Default), Cyber Emerald (Matrix), Tech Cobalt (Oceanic), Rose Crimson (Cyber), Neon Amber (Golden), Cyberpunk 2077 (Night City), and Clear Light.
- Universal backdrop blur (`.modal-backdrop-blur`, `backdrop-filter: blur(14px)`) ensures focus and eliminates color clashing with headers and backgrounds.
- High-contrast accessibility compliance across both Dark and Light themes.

### 8. Python Switch Automation & Direct Hardware Execution
- **Netmiko & Paramiko Support:** Dedicated Python backend module (`backend/switch_engine.py`) for establishing native SSHv2 and Telnet connections to physical Cisco switches (IOS, IOS-XE, NX-OS) and executing CLI commands programmatically.
- **Real-Time SSH WebSocket Gateway:** Connects the frontend terminal directly to port 22 of hardware switches via a bidirectional WebSocket stream with full ANSI color rendering and interactive keystrokes.
- **Dangerous Command Interlock:** Detects potentially disruptive commands (e.g. `reload`, `write erase`, `shutdown`) and presents a mandatory safety confirmation modal.

### 9. Multi-Threaded LAN Subnet Scanner
- **Fast Subnet Discovery:** Parallel port-probing across configurable CIDR IP blocks (e.g., `192.168.1.0/24`) checking ports 22 (SSH), 23 (Telnet), 80 (HTTP), and 443 (HTTPS).
- **One-Click Topology Import:** Instantly register discovered live switches into the interactive topology map with auto-generated port matrices.

### 10. Automated Windows Setup & Launchers
- **Batch & PowerShell Installers:**
  - `install_windows.bat`: Automatic prerequisite verification (Python 3, Node.js), pip upgrade, installation of `netmiko`, `paramiko`, `requests`, npm packages, and desktop shortcut generation.
  - `start_windows.bat`: One-click startup for both Python backend and Vite/Express server, auto-launching `http://localhost:3000` in the default browser.
  - `install_windows.ps1`: Modern PowerShell deployment script for Windows enterprise environments.

### 11. Interactive Module Workflow & Architecture Inspector Modal
- **Multi-Access Workflow Triggers:**
  - Floating bottom-docked quick-action button (`floating-workflow-dock-btn`) with glassmorphism styling, live pulse indicator, and active section badge.
  - Bottom status-bar trigger button (`bottom-bar-workflow-btn`) indicating the current module.
  - Top header Navbar action button (`navbar-workflow-btn`) and Profile menu integration.
- **Smart Active Tab Detection:** Automatically detects the user's active view (Ports, Dashboard, Devices, Schematic Topology, Config Templates, CDP/LLDP Scanner, etc.) and presents its specific step-by-step workflow.
- **Precise Architecture & Source Mapping:**
  - Frontend component file paths (e.g. `src/components/PortManagementView.tsx`).
  - Related client service methods (e.g. `updatePortConfig`, `fetchDevices`).
  - Backend API endpoints and routes (e.g. `PUT /api/devices/:id/ports/:portId`).
- **One-Click Target Token Copying:** Quick copy button formatted specifically for AI coding prompts (e.g. `[TARGET: ports] - Modify src/components/PortManagementView.tsx`), allowing users to point directly to the exact file and component when requesting modifications.

### 12. Omnipresent Workflow Badges on All Modals & Cards
- **Seamless Architecture Visibility Across the Entire Platform:**
  - Integrated `WorkflowTriggerBadge` buttons across the headers of every single modal dialog and primary view card.
  - Allows engineers to immediately inspect which component renders each modal or card, what endpoints it triggers, and copy the AI coding prompt directly from that view.
- **Full Modal Coverage:**
  - Add New Device Modal (`AddDeviceModal`)
  - Cisco Terminal Console (`CiscoTerminalModal`)
  - Port Physical Inspector (`PortInspectorModal`)
  - Subnet Auto-Scanner (`LanScannerModal`)
  - Apply Configuration Template (`ApplyTemplateModal`)
  - Template Editor (`TemplateEditorModal`)
  - Clone / Duplicate Template (`CloneTemplateModal`)
  - Extract Live Config (`CaptureConfigModal`)
  - Port & Ping Reachability Tester (`TestConnectionModal`)
  - Fast Access VLAN Assignment (`AssignVlanModal`)
  - Cisco Command Execution Confirmation (`CiscoCommandConfirmModal`)
  - Dangerous Command Security Interceptor (`DangerousCommandModal`)
  - Windows Automation Setup Guide (`WindowsInstallerModal`)
  - Changelog & Release Notes (`ReleaseNotesModal`)
  - Real Switch Configuration Preview (`PortChangePreviewModal`)
- **Key Cards & Analytical Views:**
  - Hardware Switch Faceplate (`card-port-faceplate`)
  - Batch Interface Operations (`card-batch-config`)
  - Detailed Port Configuration (`card-port-detail`)
  - Device Inventory Table (`card-device-table`)
  - Schematic Canvas Toolbar (`card-schematic-canvas`)
  - Configuration Template Library (`card-template-library`)
  - CDP/LLDP Topology Scanner (`card-cdp-scanner`)
  - Central Network Health Dashboard (`module-dashboard`)

### 13. Production Network Automation & Multi-Vendor Orchestration
- **8-Stage Deterministic Safety Pipeline:**
  - Discover → Validate (Syntax, CIDR, Duplicates, Risk Evaluation) → Generate → Preview (Diff & Explanation) → Automatic Pre-Apply Snapshot → Apply (Real SSH Transport) → Verify (Post-Apply Show Verifications) → Rollback (Automated or On-Demand Reversion).
- **Zero Mock / 100% Real Hardware SSH Execution:**
  - All configurations are dispatched directly through authenticated SSHv2 sessions to genuine target appliances without simulation layers or mock fallbacks.
- **Cisco IOS / IOS-XE Enterprise Suite:**
  - **Routing & Dynamic Protocols:** Static IPv4 routes with next-hop metrics, multi-area OSPFv2 with Router-ID and passive interfaces, BGP peering with neighbor policies, and a symmetric Point-to-Point (P2P) Interconnect Wizard configuring both routers simultaneously.
  - **Layer-2/Layer-3 Switching:** Access port assignments, 802.1Q trunking with custom Native VLANs and Allowed VLAN lists, PortFast edge activation, and BPDU Guard loop defense.
  - **VLAN & SVI Engine:** Single and batch VLAN provisioning with concise range syntax (`10,20,30-50`) and automated Switched Virtual Interface (SVI) creation with IP addresses and subnet masks.
  - **Advanced Enterprise Services:** 
    - **Dual-Switch Cross-LACP Orchestration:** Coordinated side-by-side bundling between two interconnected physical switches (Switch A ↔ Switch B) with atomic pre-checks, negotiation presets (`Active ↔ Active`, `Active ↔ Passive`, `Static On ↔ On`), symmetric member interface mapping, 802.1Q trunk alignment, and automated rollback if Switch B fails.
    - **Single-Switch EtherChannel:** Standalone port aggregation using LACP, PAgP, or manual mode on individual switches.
    - **Spanning Tree Tuning:** PVST+, Rapid-PVST, MSTP, Root Primary/Secondary election, priority assignment, and port costs.
    - **Infrastructure & Core Services:** Secure point-to-point GRE tunnels, IP SLA ICMP-Echo failover monitoring, NAT/PAT translation (Overload, Pools, Port Forwarding), and local DHCP Server IP Pools with exclusion ranges.
  - **CIS Hardening & Live Audit:** Live device configuration scanning, 0-100 posture score calculation, evaluation of secret hashing (Type 5/8/9), AAA new-model, service password encryption, Telnet/HTTP legacy service disabling, SSH ACL access-class restrictions, login delay enforcement, and single-click automated remediation.
- **MikroTik RouterOS Suite:**
  - High-performance WireGuard VPN tunnels with interface configuration, listen ports, public keys, and peer route filtering.
  - Stateful Firewall & Hardening: FastTrack acceleration, invalid packet dropping, and 3-stage dynamic SSH brute-force blacklist address lists.
  - Dual WAN Recursive Route Failover: Upstream ping reachability checks for instant failover between primary and secondary ISPs.
  - Masquerade NAT, destination port forwarding (dst-nat), and hardware bridge VLAN filtering.
- **Automated Snapshot Vault & Governance Audit Trail:**
  - Automatic running-config snapshots before every push, built-in diff viewer, and instant one-click hardware rollback.
  - Tamper-evident execution ledger recording timestamps, active users, executed CLI commands, verification summaries, and full rollback telemetry.

### 14. Real Telnet Engine & Interactive Terminal (RFC 854 Live Socket)
- **Zero Mock / 100% Genuine Network Telnet Socket:**
  - Real TCP socket streaming powered by native Node.js `net.Socket` capable of connecting to standard Telnet port 23 or any custom terminal server / console ports (e.g., 2323, 2001, 5000).
- **Live Diagnostics & Port Probing in New Device Modal (`AddDeviceModal`):**
  - Dedicated Telnet port configuration field alongside SSH credentials.
  - **Test Telnet** button performing actual TCP handshakes, measuring millisecond latency, diagnosing true network errors (`ECONNREFUSED`, `ETIMEDOUT`, `ENETUNREACH`), and capturing welcome banners or login prompts directly from the physical hardware.
- **Full Bidirectional Interactive Telnet Terminal (`RealTelnetTerminalModal` / `/ws/telnet`):**
  - Dedicated WebSocket gateway at `/ws/telnet` with Telnet RFC 854 negotiation handling (NAWS window resizing, Terminal Type `xterm-256color`, SGA, ECHO).
  - Quick Cisco macro buttons (`term len 0`, `enable`, `show version`, `show ip int brief`, `show run`, `exit`), history navigation, session log download, and live host/port retargeting.

### 15. Remote Test & Live Windows Remote Desktop (RDP / Apache Guacamole)
- **Zero Simulation / Real In-Browser Windows RDP Experience:**
  - Browser-based Remote Desktop to Windows workstations and servers powered by the official **Apache Guacamole** protocol engine and `guacd:4822` daemon.
- **HTML5 Canvas & Bidirectional WebSocket Streaming:**
  - Dedicated streaming pipeline via `/ws/remote-desktop` delivering smooth display rendering, low-latency mouse tracking, full keyboard input, scrolling, and touch events.
- **Full In-Session Desktop Controls:**
  - One-click `Ctrl + Alt + Delete` macro injection.
  - Dedicated `Windows Key (Super)` trigger.
  - Bidirectional clipboard text synchronization between browser and remote Windows host.
  - Fullscreen toggle and automated desktop viewport scaling.
- **Windows Device Vault & Live Handshake Diagnostics:**
  - Manage Windows hosts (IP, standard port 3389 or custom RDP port, domain, credentials).
  - Real **Test Connection** button verifying TCP 3389 socket accessibility and millisecond latency before starting the session.
  - Server-side credential encryption (PBKDF2-HMAC-SHA256 authenticated vault) with short-lived 60-second session handshake tokens.

### 16. Real SSH Testing, 8-Layer Diagnostic & Paramiko 2 Engine
- **100% Genuine SSH Connections with Zero Mock Data:**
  - Direct, unsimulated SSHv2 connections to physical Linux servers, Cisco routers/switches, MikroTik RouterOS appliances, and generic SSH network devices.
- **Isolated Python Paramiko 2.12.0 Backend Architecture & SSH Version 2 Compatibility:**
  - Self-contained microservice under `/backend/ssh_test/` using an encrypted device credentials vault (`ssh_test_devices.json`) protected with AES-CBC and one-time 60-second session tokens.
  - **Full Cisco & Legacy Network Switch SSH v2 Support (KEX Mismatch Fix):**
    - Equipped with `kex_patch.py` and `CiscoCompatibleTransport` to resolve `Incompatible ssh peer (no acceptable kex algorithm)` errors across network switches.
    - Full bidirectional support for both modern curves (`curve25519-sha256`, `curve25519-sha256@libssh.org`, `ecdh-sha2-nistp256/384/521`, `diffie-hellman-group-exchange-sha256`, `diffie-hellman-group14-sha256`, `diffie-hellman-group16-sha512`) and Cisco Catalyst / IOS legacy algorithms (`diffie-hellman-group-exchange-sha1`, `diffie-hellman-group14-sha1`, `diffie-hellman-group1-sha1`).
    - Full cipher suite support (`aes128-ctr`, `aes256-ctr`, `aes128-cbc`, `aes256-cbc`, `3des-cbc`).

- **Comprehensive 8-Layer End-to-End Diagnostic Audit:**
  - Step-by-step diagnostic verification from client browser to remote hardware:
    1. **Frontend REST Gateway Bridge:** Validates HTTP communication between React, Node.js, and Python router.
    2. **Paramiko 2 Engine Health:** Asserts Python runtime, Paramiko 2.12.0, and cryptography library readiness.
    3. **WebSocket Tunnel Gateway:** Confirms the `/ws/ssh-test` streaming gateway is active.
    4. **DNS Hostname Resolution:** Verifies target hostname resolves to an authentic IP address.
    5. **TCP Network Socket Handshake:** Measures real round-trip latency (ms) to port 22 or custom port.
    6. **SSH Server Protocol Banner:** Captures and inspects the remote daemon's identification string (e.g. `SSH-2.0-OpenSSH_8.9p1`).
    7. **Paramiko Authentication & Cipher Negotiation:** Tests password or RSA/OpenSSH private key against target.
    8. **Interactive PTY Virtual Terminal Allocation:** Verifies pseudo-terminal allocation capability.
  - **Pinpoint Root-Cause Analysis & Remediation:** If any layer fails, the audit isolates the exact failure point and provides actionable technical recommendations in both English and Persian.
- **Live Hardware Telemetry Fetching (Paramiko 2 Engine):**
  - Extracts authentic OS kernel version, live uptime, physical network interfaces (UP/DOWN flags, IP/MAC), RAM memory statistics, disk storage partitions, and raw command outputs directly from the target machine.
- **Bidirectional WebSocket Interactive Terminal:**
  - Low-latency interactive PTY session via `/ws/ssh-test` with full ANSI color decoding, Ctrl+C / Ctrl+D signaling, Tab completion, arrow-key command history, and quick command macros.

---

## System Architecture & Stack
- **Client Framework:** React 18+, TypeScript, Tailwind CSS v4, Motion, Lucide Icons
- **Server Runtime:** Node.js, Express, Bun / Tsx
- **Protocols & Simulation:** RESTful API with simulated Cisco IOS-XE parser engine, Apache Guacamole RDP Gateway (`guacd`), RFC 854 Telnet socket engine
- **Style System:** Tailored CSS custom properties with strict light/dark theme overrides

---

## Dedicated Remote Test (Windows RDP) Installation Guide

The **Remote Test** module delivers a zero-install, in-browser Windows Remote Desktop experience by bridging standard RDP (TCP 3389) through the **Apache Guacamole** `guacd` daemon to an interactive HTML5 Canvas.

```
┌─────────────────────────────────┐       WebSocket       ┌────────────────────────┐      TCP 4822      ┌────────────────────┐      TCP 3389      ┌─────────────────────────┐
│ Browser Client (HTML5 Canvas)   │ ◄───────────────────► │ NetTopology Gateway    │ ◄────────────────► │ guacd Daemon       │ ◄────────────────► │ Target Windows Machine  │
│ React + RemoteDesktopSession    │   /ws/remote-desktop  │ Node.js / Express      │   Guacamole Proto  │ (Docker / Native)  │   Native RDP       │ (Win 10/11/Server)      │
└─────────────────────────────────┘                       └────────────────────────┘                    └────────────────────┘                    └─────────────────────────┘
```

You can deploy and run this module using either of the two methods below:

### Method 1: Instant Setup with Docker Compose (Recommended)
This is the fastest, fully automated deployment that launches `guacd` and NetTopology with all dependencies:

```bash
# 1. Navigate to project root
cd NetTop

# 2. Launch services in detached mode
docker compose up -d

# 3. Check container status
docker compose ps
```
Containers launched:
- `nettopology-guacd`: Official Apache Guacamole daemon on port `4822`
- `nettopology-app`: NetTopology web app on port `3000` & Python backend on port `5001`

Access the UI immediately at `http://localhost:3000`. The **guacd** indicator on the **Remote Test** tab will light up green.

---

### Method 2: Manual Linux Server Setup (Without Docker Compose)

#### 1. Install and Start guacd Daemon
On Ubuntu / Debian:
```bash
sudo apt update
sudo apt install -y guacd libguac-client-rdp0

sudo systemctl enable guacd
sudo systemctl start guacd
sudo systemctl status guacd
```
> **Alternative with standalone Docker for guacd only:**
> ```bash
> docker run -d --name nettop-guacd --restart unless-stopped -p 4822:4822 guacamole/guacd:1.5.5
> ```

#### 2. Configure Environment Variables
Create or edit `.env` in the project root:
```env
PORT=3000
GUACD_HOST=localhost
GUACD_PORT=4822
RDP_ENCRYPTION_KEY=your-super-secret-vault-key-32-chars-min
```

#### 3. Build & Run NetTopology
```bash
npm install
npm run build
npm start
```

---

### Target Windows Machine Configuration Checklist
To ensure seamless RDP connectivity:
1. **Enable Remote Desktop:** In Windows, open `Settings > System > Remote Desktop` and toggle to **On**.
2. **Allow Through Windows Firewall:** Ensure TCP port `3389` is open:
   ```powershell
   Enable-NetFirewallRule -DisplayGroup "Remote Desktop"
   ```
3. **User Permissions:** Verify your Windows user account has a password set and belongs to `Remote Desktop Users` or `Administrators`.
4. **Diagnostic Probe:** In NetTopology's **Remote Test** tab, click **[Test Connection]** to confirm connectivity and measure latency before opening the live session.

---

## Dedicated SSH Test (Paramiko 2 & WebSocket) Installation Guide

The **SSH Test** module provides an unsimulated, authentic terminal connection, live diagnostic auditing, and telemetry discovery for physical network nodes using the **Paramiko 2.12.0** engine and a bidirectional **WebSocket** transport layer.

```
┌────────────────────────────────────────────────────────────────────────┐
│                     SSH Test Module Architecture                       │
├───────────────┬────────────────────────┬───────────────────────────────┤
│ Client Browser│      Node.js Server    │     Python 3 Backend Engine   │
│  (React UI)   │       (Port 3000)      │           (Port 5001)         │
├───────────────┼────────────────────────┼───────────────────────────────┤
│  SshTestView  │                        │                               │
│  Diagnostic   │ ── REST API Proxy ───> │ Flask Router / Controller     │
│  FetchedData  │                        │ ├── 8-Layer Diagnostic Engine │
│               │                        │ ├── Telemetry Collector       │
│               │                        │ └── Encrypted Vault (AES-CBC) │
│               │                        │                               │
│  Add Device   │ ── WS: /ws/ssh-test ──>│ Node.js WS Bridge (Upgrade)   │
│  Test Connect │   (mode=diagnostic)    │ └── Spawns diag_worker.py     │
│  (Live Stream)│ <── Stdio JSON Lines ─ │     └── Paramiko 2 KEX Patch  │
│               │                        │         └── Real Socket (:22) │
│               │                        │                               │
│  Interactive  │ ── WS: /ws/ssh-test ──>│ Node.js WS Bridge             │
│  Terminal     │   (session token)      │ └── Spawns terminal_worker.py │
│  (ANSI/PTY)   │ <── Stdio JSON Stream─ │     └── Paramiko invoke_shell │
│               │                        │         └── Target Node (:22) │
└───────────────┴────────────────────────┴───────────────────────────────┘
```

#### Diagnostic WebSocket Stream & Cisco KEX Fix Highlights
- **Direct WebSocket Diagnostic Mode (`mode=diagnostic`):** In the "Add SSH Device" modal, clicking **Test Connection** opens a direct streaming WebSocket channel to `/ws/ssh-test?mode=diagnostic`. It executes the diagnostic worker (`diag_worker.py`) backed by the Python Paramiko 2 engine with live step-by-step progress.
- **Definitive Fix for `Incompatible ssh peer (no acceptable kex algorithm)`:**
  - Employs `kex_patch.py` and `CiscoCompatibleTransport` to inject adaptive KEX hooks into the Paramiko transport layer.
  - Full bidirectional support for both legacy Cisco/MikroTik algorithms (`diffie-hellman-group1-sha1`, `diffie-hellman-group14-sha1`, `diffie-hellman-group-exchange-sha1`) and modern curves (`curve25519-sha256`, `ecdh-sha2-nistp256/384/521`).
  - Adaptive negotiation transparently intercepts peer KEX initialization packets and enables required algorithms dynamically on the fly.
- **Zero Mock Data Constraint:** Real TCP handshake, real SSH protocol banner, authentic cryptographic negotiation, and live command execution.

### System Prerequisites
- Python 3.8 or higher (`python3`)
- Python package manager (`python3-pip`)
- Standard system compilation toolchain (required for C cryptography primitives):
  ```bash
  # Ubuntu / Debian:
  sudo apt update
  sudo apt install -y python3 python3-pip python3-dev build-essential libssl-dev libffi-dev

  # RHEL / CentOS / AlmaLinux / Fedora:
  sudo dnf install -y python3 python3-pip python3-devel gcc openssl-devel libffi-devel
  ```

### 1. Install Python Dependencies (Paramiko 2)
In the project root directory:
```bash
# Install exact pinned requirements:
pip3 install -r backend/requirements.txt

# Or install manually:
pip3 install "paramiko>=2.12.0,<3.0.0" "cryptography>=3.4.8" "websockets>=10.0" flask requests
```

> **Verify Paramiko 2 installation:**
> ```bash
> python3 -c "import paramiko; print('Paramiko version:', paramiko.__version__)"
> # Expected: Paramiko version: 2.12.0
> ```

### 2. Configure Security Environment Variables (Optional)
Specify your secret key in `.env` to protect device passwords and private keys stored in the local encrypted vault:
```env
# AES-CBC master encryption key for SSH credentials vault
SSH_TEST_SECRET_KEY=your-custom-master-passphrase-32-chars-minimum
PYTHON_PORT=5001
```

### 3. Network & Firewall Readiness
- Verify outbound TCP access to port `22` (or your device's customized SSH port) from the host running NetTopology:
  ```bash
  nc -zv -w 3 192.168.1.1 22
  ```
- If authenticating with private keys, paste the raw RSA or OpenSSH private key into the modal (e.g., `-----BEGIN RSA PRIVATE KEY-----`).

### 4. Running the Application
```bash
# Launch both frontend and backend concurrently:
npm run dev

# Or for production:
npm run build
npm start
```
Navigate to the **ssh test** tab in the sidebar, add a network host, and run the **[Audit End-to-End Link]** button to inspect all 8 layers.

---

## General Installation & Setup (Linux)

### Prerequisites
- Node.js 18+ (or Bun)
- npm or bun package manager
- Python 3 (Optional for switch automation scripts): `python3`, `python3-pip`

### Step-by-Step Installation
```bash
# 1. Clone the repository
git clone https://github.com/arkaadia/NetTop.git
cd NetTop

# 2. Install Node dependencies
npm install
# Or with Bun:
# bun install

# 3. Run helper install script (optional):
chmod +x install.sh start.sh stop.sh restart.sh
./install.sh

# 4. Start development server
npm run dev

# Or compile and run production server:
npm run build
npm start
```
Open `http://localhost:3000` (or `http://YOUR_SERVER_IP:3000`) in your web browser.

---

## System Scripts
- `start.sh`: Launches server process in background
- `stop.sh`: Terminates active server instances
- `restart.sh`: Restarts server and reloads configuration
- `install.sh`: Performs environment setup and dependency installation

---

## AI Agent Instructions
Any AI assistant, coding agent, or human contributor working on this repository MUST follow the guidelines defined in `AGENTS.md`:
1. **README Maintenance:** Whenever new features, tools, endpoints, or UI capabilities are introduced, you **MUST** update `README.md` (both the Persian and English sections) to document the additions.
2. **Git Workflow:** Automatically commit all changes with descriptive commit messages and push to `origin master`.

---
*Maintained with ❤️ by Masoud Shahbazi*
