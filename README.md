# NetTopology 🌐

سامانه جامع مدیریت، مانیتورینگ توپولوژی شبکه و مدیریت تجهیزات سیسکو (سویچ و روتر)
A Comprehensive Network Topology, Cisco Switch/Router Management & Visual Configuration Platform

---

## 📑 فهرست مطالب / Table of Contents
- [بخش اول: راهنمای فارسی (Persian)](#بخش-اول-راهنمای-فارسی)
  - [معرفی پروژه](#معرفی-پروژه)
  - [ویژگی‌ها و قابلیت‌های کلیدی](#ویژگیها-و-قابلیتهای-کلیدی)
  - [ساختار معماری و تکنولوژی‌ها](#ساختار-معماری-و-تکنولوژیها)
  - [راهنمای نصب و راه‌اندازی](#راهنمای-نصب-و-راهاندازی)
  - [اسکریپت‌های سیستمی](#اسکریپتهای-سیستمی)
  - [دستورالعمل توسعه و مشارکت هوش مصنوعی](#دستورالعمل-توسعه-و-مشارکت-هوش-مصنوعی)
- [Part 2: English Documentation](#part-2-english-documentation)
  - [Project Overview](#project-overview)
  - [Key Features](#key-features)
  - [System Architecture & Stack](#system-architecture--stack)
  - [Installation & Setup](#installation--setup)
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

### ۶. نقشه توپولوژی شبکه و مدیریت رک‌ها (Topology & Rack Layout)
- **پایش مکانی:** دسته‌بندی تجهیزات بر اساس ساختمان، طبقه، واحد و رک فیزیکی.
- **پایش وضعیت اتصال:** نمایش وضعیت آنلاین/آفلاین بودن هر سوئیچ و روتر با پینگ و تله‌متری دوره‌ای.
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

---

## ساختار معماری و تکنولوژی‌ها
- **Front-End:** React 18+، TypeScript، Tailwind CSS v4، Lucide React، Motion
- **Back-End:** Node.js، Express، Bun / Tsx Runtime
- **شبکه و ارتباطات:** RESTful APIs، شبیه‌ساز پایپ‌لاین Cisco IOS-XE CLI
- **ذخیره‌سازی و پایداری:** ساختار داده‌های جیسون ماژولار و هماهنگ با سرویس‌های ابری

---

## راهنمای نصب و راه‌اندازی روی لینوکس (Linux Installation)

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

### 6. Topology Mapping & Rack Hierarchy
- **Physical Organization:** Hierarchical grouping by building, floor, room, and rack unit.
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

---

## System Architecture & Stack
- **Client Framework:** React 18+, TypeScript, Tailwind CSS v4, Motion, Lucide Icons
- **Server Runtime:** Node.js, Express, Bun / Tsx
- **Protocols & Simulation:** RESTful API with simulated Cisco IOS-XE parser engine
- **Style System:** Tailored CSS custom properties with strict light/dark theme overrides

---

## Installation & Setup (Linux)

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
