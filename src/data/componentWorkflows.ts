export interface ComponentWorkflowStep {
  step: number;
  titleEn: string;
  titleFa: string;
  descEn: string;
  descFa: string;
}

export interface ComponentWorkflowItem {
  id: string;
  titleEn: string;
  titleFa: string;
  file: string;
  apiEndpoint?: string;
  apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'WS';
  module: 'dashboard' | 'ports' | 'devices' | 'schematic' | 'templates' | 'scanner' | 'global';
  descriptionEn: string;
  descriptionFa: string;
  steps: ComponentWorkflowStep[];
  aiPrompt: string;
}

export const COMPONENT_WORKFLOWS: Record<string, ComponentWorkflowItem> = {
  // ----------------------------------------------------
  // MODALS
  // ----------------------------------------------------
  'modal-add-device': {
    id: 'modal-add-device',
    titleEn: 'Register New Device Modal',
    titleFa: 'پنجره ثبت و افزودن تجهیز جدید به شبکه',
    file: 'src/components/AddDeviceModal.tsx',
    apiEndpoint: '/api/devices',
    apiMethod: 'POST',
    module: 'devices',
    descriptionEn: 'Modal for registering network devices (Switches, Routers, APs) with IP, credentials, location, and connectivity validation.',
    descriptionFa: 'پنجره ورود اطلاعات و ثبت تجهیزات شبکه با قابلیت اعتبارسنجی پینگ، تست اتصال SSH و تعیین موقعیت فیزیکی در رک.',
    steps: [
      {
        step: 1,
        titleEn: 'Input Device Metadata & Network Parameters',
        titleFa: 'ورود مشخصات هویتی و شبکه تجهیز',
        descEn: 'User fills Name, Management IP, Vendor/Model, Building, Floor, Unit, Rack, and SSH Credentials.',
        descFa: 'کاربر نام، آدرس آی‌پی، سازنده/مدل، مکان استقرار (ساختمان، طبقه، واحد، رک) و رمزهای دسترسی را وارد می‌کند.'
      },
      {
        step: 2,
        titleEn: 'Pre-flight Reachability Probe (ICMP & Port 22)',
        titleFa: 'سنجش دسترسی‌پذیری اولیه (پینگ و پورت ۲۲)',
        descEn: 'Optional live test checks whether the IP responds to ICMP ping and SSH socket is open before saving.',
        descFa: 'سیستم می‌تواند قبل از ثبت، پاسخ‌دهی آی‌پی را با پینگ و پورت ۲۲ چک کند.'
      },
      {
        step: 3,
        titleEn: 'Persist Device to SQLite Database',
        titleFa: 'ذخیره‌سازی مشخصات تجهیز در دیتابیس',
        descEn: 'Payload is sent via POST /api/devices and stored in the backend SQLite inventory.',
        descFa: 'اطلاعات از طریق درخواست POST /api/devices به سرور ارسال و در دیتابیس پایدار می‌شود.'
      },
      {
        step: 4,
        titleEn: 'Topology & Inventory Refresh',
        titleFa: 'به‌روزرسانی فوری نقشه توپولوژی و جدول تجهیزات',
        descEn: 'Triggers onDeviceAdded callback to update the Device Table, Dashboard KPIs, and Schematic Canvas.',
        descFa: 'با فراخوانی کال‌بک، جدول تجهیزات، داشبورد و نقشه شماتیک بی‌درنگ به‌روزرسانی می‌شوند.'
      }
    ],
    aiPrompt: '[بخش: ثبت تجهیز جدید | فایل: src/components/AddDeviceModal.tsx | اندپوینت: POST /api/devices]\nلطفاً تغییرات زیر را در این پنجره اعمال کن:'
  },

  'modal-cisco-terminal': {
    id: 'modal-cisco-terminal',
    titleEn: 'Cisco Interactive Web Terminal Modal',
    titleFa: 'پنجره کنسول خط فرمان تعاملی سیسکو (Cisco Terminal)',
    file: 'src/components/CiscoTerminalModal.tsx',
    apiEndpoint: '/api/ws/terminal or WebSocket SSH',
    apiMethod: 'WS',
    module: 'ports',
    descriptionEn: 'Full-featured Cisco CLI terminal supporting interactive commands, auto-completion, write memory alert, and live running-config tracking.',
    descriptionFa: 'ترمینال وب حرفه‌ای سیسکو با شبیه‌سازی دقیق IOS، رنگ‌بندی سینتکس، لیست کشویی اینترفیس‌ها، و اخطار ذخیره Running-Config.',
    steps: [
      {
        step: 1,
        titleEn: 'Initialize Terminal Session & Prompt Detection',
        titleFa: 'راه‌اندازی سشن خط فرمان و تشخیص پرامپت سیسکو',
        descEn: 'Establishes connection to device, detects hostname, firmware, and sets prompt (Switch# or Router#).',
        descFa: 'ارتباط برقرار شده و پرامپت متناسب با نام و مدل دستگاه نمایش داده می‌شود.'
      },
      {
        step: 2,
        titleEn: 'Command Execution & Safety Interception',
        titleFa: 'اجرای دستورات و فیلتر فرمان‌های خطرناک',
        descEn: 'Parses user input, checks against dangerous command interceptor (reload, erase), and dispatches to SSH engine.',
        descFa: 'دستورات ورودی تحلیل شده و در صورت خطرناک بودن (مثل reload یا erase) تاییدیه دریافت می‌شود.'
      },
      {
        step: 3,
        titleEn: 'Live Configuration Diff & State Tracking',
        titleFa: 'ردیابی تغییرات پیکربندی (Unsaved Changes)',
        descEn: 'If interface or global config commands are executed, the modal tracks unsaved changes and prompts Write Memory.',
        descFa: 'اگر دستوری کانفیگ را تغییر دهد، نشانگر تغییرات رایت‌نشده فعال و دکمه Write Memory نمایان می‌شود.'
      },
      {
        step: 4,
        titleEn: 'Direct Interface Quick Inspector Drawer',
        titleFa: 'دراور سریع مشاهده و انتخاب پورت‌ها بدون خروج از کنسول',
        descEn: 'Allows engineers to inspect port statuses and VLANs from an in-terminal dropdown drawer.',
        descFa: 'مهندس می‌تواند لیست پورت‌های سوئیچ را از درون خود ترمینال باز کرده و بررسی کند.'
      }
    ],
    aiPrompt: '[بخش: ترمینال سیسکو | فایل: src/components/CiscoTerminalModal.tsx | پروتکل: WebSocket SSH]\nلطفاً تغییرات زیر را در ترمینال اعمال کن:'
  },

  'modal-port-inspector': {
    id: 'modal-port-inspector',
    titleEn: 'Port Inspector & Real Switch Sync Modal',
    titleFa: 'پنجره بازرسی عمیق پورت‌ها و همگام‌سازی سوئیچ',
    file: 'src/components/PortInspectorModal.tsx',
    apiEndpoint: '/api/devices/:id/ports & /api/ssh/apply-port-config',
    apiMethod: 'POST',
    module: 'ports',
    descriptionEn: 'Inspects all physical ports, provides Cisco vector RJ45 indicators, syncs real ports via SSH, and applies port configurations.',
    descriptionFa: 'نمایش تفصیلی پورت‌های فیزیکی، همگام‌سازی زنده با سوئیچ با Netmiko، ویرایش ویلن و اعمال امنیت پورت.',
    steps: [
      {
        step: 1,
        titleEn: 'Read Port Database or Query Hardware via SSH',
        titleFa: 'خواندن وضعیت پورت‌ها از دیتابیس یا سوئیچ فیزیکی',
        descEn: 'Fetches cached port states or clicks "Sync Real Ports" to query live Netmiko parser on real Cisco switch.',
        descFa: 'پورت‌ها لود شده یا با زدن کلید همگام‌سازی، وضعیت زنده پورت‌ها مستقیماً با SSH از سوئیچ استخراج می‌شود.'
      },
      {
        step: 2,
        titleEn: 'RJ-45 LED Visual State & Filter Matrix',
        titleFa: 'نمایش گرافیکی ال‌ای‌دی پورت‌ها و فیلتر هوشمند',
        descEn: 'Renders vector RJ-45 sockets with color-coded status (Up, Down, Disabled, Trunk, Port-Sec).',
        descFa: 'پورت‌ها با وکتور RJ45 و رنگ‌های استاندارد ال‌ای‌دی (سبز، خاموش، زرد، بنفش) ترسیم می‌شوند.'
      },
      {
        step: 3,
        titleEn: 'Configure Parameters & Cisco Syntax Preview',
        titleFa: 'تنظیم پارامترها و پیش‌نمایش دستورات سیسکو',
        descEn: 'User alters Mode (Access/Trunk), VLAN ID, Port Security, and inspects the exact Cisco CLI commands.',
        descFa: 'کاربر پارامترها را تغییر داده و پیش‌نمایش دقیق دستورات CLI سیسکو تولید و نمایش داده می‌شود.'
      },
      {
        step: 4,
        titleEn: 'Push Commands via Paramiko/Netmiko and Write Memory',
        titleFa: 'ارسال دستورات با SSH و ذخیره در NVRAM',
        descEn: 'Sends CLI sequence to switch, validates output, writes memory, and updates port state in UI.',
        descFa: 'دستورات روی اینترفیس اعمال شده، در حافظه ذخیره شده و وضعیت جدید در پنل ثبت می‌شود.'
      }
    ],
    aiPrompt: '[بخش: بازرسی عمیق پورت‌ها | فایل: src/components/PortInspectorModal.tsx | اندپوینت: POST /api/ssh/apply-port-config]\nلطفاً تغییرات زیر را در این بخش اعمال کن:'
  },

  'modal-lan-scanner': {
    id: 'modal-lan-scanner',
    titleEn: 'LAN Subnet Discovery Scanner Modal',
    titleFa: 'پنجره اسکنر و کاشف تجهیزات شبکه داخلی (LAN Scanner)',
    file: 'src/components/LanScannerModal.tsx',
    apiEndpoint: '/api/scan/lan & /api/scan/import-device',
    apiMethod: 'POST',
    module: 'scanner',
    descriptionEn: 'Multi-threaded Python network scanner that sweeps CIDR subnets, probes ports 22/23/80/443, identifies vendors, and enables 1-click import.',
    descriptionFa: 'موتور مالتی‌ترد اسکن ساب‌نت شبکه، پایش پورت‌های SSH، Telnet و Web، شناسایی خودکار سازنده تجهیز و ایمپورت فوری به پنل.',
    steps: [
      {
        step: 1,
        titleEn: 'Configure Target CIDR Subnet and Ports',
        titleFa: 'تنظیم رنج ساب‌نت CIDR و پورت‌های بازرسی',
        descEn: 'User specifies CIDR (e.g. 192.168.1.0/24) and checks target ports (22 SSH, 23 Telnet, 80 HTTP, 443 HTTPS, 161 SNMP).',
        descFa: 'کاربر ساب‌نت و پورت‌های مورد نظر برای بررسی را مشخص می‌کند.'
      },
      {
        step: 2,
        titleEn: 'Multi-threaded Concurrency Sweep',
        titleFa: 'ارسال همزمان پکت‌های پینگ و پروب سوکت',
        descEn: 'Backend worker threads sweep IP space with configurable timeout (0.8s) for maximum scanning speed.',
        descFa: 'ورکرهای پایتون با سرعت بالا آی‌پی‌ها را پینگ کرده و باز بودن پورت‌های مدیریتی را می‌سنجند.'
      },
      {
        step: 3,
        titleEn: 'Fingerprint Vendor & Device Category',
        titleFa: 'شناسایی برند و نوع تجهیز (سیسکو، میکروتیک، سرور)',
        descEn: 'Heuristics identify device type based on open ports, MAC OUI vendor prefix, and banner responses.',
        descFa: 'نوع دستگاه بر اساس پورت‌های باز و بنر ارسالی تشخیص داده می‌شود.'
      },
      {
        step: 4,
        titleEn: 'One-Click Import to Topology & Direct SSH Connect',
        titleFa: 'ورود با یک کلیک به دیتابیس و اتصال فوری به ترمینال',
        descEn: 'Discovered hosts can be imported directly into the topology database or opened in the SSH terminal.',
        descFa: 'تجهیز کشف‌شده با یک کلیک به توپولوژی افزوده شده یا ترمینال SSH آن باز می‌شود.'
      }
    ],
    aiPrompt: '[بخش: اسکنر ساب‌نت شبکه | فایل: src/components/LanScannerModal.tsx | اندپوینت: POST /api/scan/lan]\nلطفاً تغییرات زیر را در این اسکنر اعمال کن:'
  },

  'modal-real-ssh': {
    id: 'modal-real-ssh',
    titleEn: 'Native SSH Terminal Client Modal',
    titleFa: 'پنجره کلاینت اختصاصی اتصال مستقیم SSH',
    file: 'src/components/RealSshTerminalModal.tsx',
    apiEndpoint: '/api/terminal/session & /api/terminal/exec',
    apiMethod: 'POST',
    module: 'ports',
    descriptionEn: 'Low-latency direct SSH client using Paramiko/pty backend, ANSI color rendering, credentials manager, and session transcript export.',
    descriptionFa: 'کلاینت قدرتمند اتصال ترمینال به تجهیزات فیزیکی با رندر رنگ‌های ANSI، محافظت در برابر دستورات خطرناک و ذخیره لاگ سشن.',
    steps: [
      {
        step: 1,
        titleEn: 'SSH Parameter Handshake & Authentication',
        titleFa: 'تنظیم پارامترهای اتصال و احراز هویت SSH',
        descEn: 'Configures Host IP, Port (22), Username, Password, and Enable Secret Password for Cisco privileged exec mode.',
        descFa: 'آدرس IP، پورت ۲۲، نام کاربری، کلمه عبور و پسورد enable برای ورود به مود دسترسی ویژه تنظیم می‌شود.'
      },
      {
        step: 2,
        titleEn: 'Interactive ANSI Terminal Stream',
        titleFa: 'جریان تعاملی خروجی خط فرمان با پشتیبانی ANSI',
        descEn: 'Streams standard output and error, parsing ANSI escape sequences into styled color spans in real time.',
        descFa: 'خروجی کاراکترها در لحظه دریافت و کدهای رنگی ترمینال به صورت رنگ‌های زیبا پردازش می‌شوند.'
      },
      {
        step: 3,
        titleEn: 'Dangerous Command Interception Engine',
        titleFa: 'رهگیری و مسدودسازی دستورات خطرناک',
        descEn: 'Checks commands like reload, format, erase against safety rules and requires explicit confirmation.',
        descFa: 'دستوراتی مثل ریستارت یا پاک‌کردن کانفیگ شناسایی شده و پنجره تایید اضطراری باز می‌شود.'
      },
      {
        step: 4,
        titleEn: 'Transcript Logging & Port Synchronization',
        titleFa: 'ذخیره متن سشن و همگام‌سازی خودکار پورت‌ها',
        descEn: 'User can download the complete session log as a text file, and newly configured ports are auto-synced.',
        descFa: 'امکان دانلود متن لاگ سشن و همگام‌سازی پورت‌های ویرایش‌شده با دیتابیس فراهم است.'
      }
    ],
    aiPrompt: '[بخش: ترمینال واقعی SSH | فایل: src/components/RealSshTerminalModal.tsx | اندپوینت: POST /api/terminal/exec]\nلطفاً تغییرات زیر را در این بخش اعمال کن:'
  },

  'modal-apply-template': {
    id: 'modal-apply-template',
    titleEn: 'Apply Configuration Template Wizard',
    titleFa: 'پنجره ویزارد اعمال تمپلیت کانفیگ روی تجهیز',
    file: 'src/components/ApplyTemplateModal.tsx',
    apiEndpoint: '/api/templates/:id/apply',
    apiMethod: 'POST',
    module: 'templates',
    descriptionEn: 'Step-by-step wizard to bind variables, preview rendered CLI syntax, and batch-apply configuration templates to network hardware.',
    descriptionFa: 'ویزارد گام‌به‌گام برای مقداردهی متغیرها، پیش‌نمایش دستورات و اعمال کانفیگ‌های استاندارد روی روترها و سوئیچ‌ها.',
    steps: [
      {
        step: 1,
        titleEn: 'Select Target Device & Template',
        titleFa: 'انتخاب تجهیز هدف و قالب کانفیگ',
        descEn: 'User chooses a switch/router and selects an approved template (e.g. Cisco Base Hardening, VLAN Provisioning).',
        descFa: 'تجهیز مورد نظر و تمپلیت استاندارد از کتابخانه قالب‌ها انتخاب می‌شود.'
      },
      {
        step: 2,
        titleEn: 'Interactive Dynamic Variable Injection',
        titleFa: 'مقداردهی متغیرهای پویا (IP، ویلن، نام میزبان)',
        descEn: 'User fills required template variables ({{HOSTNAME}}, {{VLAN_ID}}, {{GATEWAY}}) with live syntax validation.',
        descFa: 'متغیرهای مورد نیاز قالب با مقادیر واقعی تکمیل و بررسی صحت انجام می‌شود.'
      },
      {
        step: 3,
        titleEn: 'Rendered CLI Syntax Preview & Diff',
        titleFa: 'پیش‌نمایش متن نهایی دستورات CLI قبل از ارسال',
        descEn: 'Full rendered CLI script is displayed with 1-click copy and line-by-line inspection.',
        descFa: 'اسکریپت نهایی تولید شده و مهندس می‌تواند آن را خط‌به‌خط بررسی یا کپی کند.'
      },
      {
        step: 4,
        titleEn: 'SSH Dispatch, Verification & Memory Write',
        titleFa: 'ارسال با SSH، اعتبارسنجی خروجی و ذخیره در حافظه',
        descEn: 'Backend pushes commands via Netmiko, captures execution logs, executes write memory, and reports status.',
        descFa: 'دستورات روی تجهیز فیزیکی اجرا شده، لاگ پاسخ ثبت و وضعیت موفقیت گزارش می‌شود.'
      }
    ],
    aiPrompt: '[بخش: ویزارد اعمال تمپلیت | فایل: src/components/ApplyTemplateModal.tsx | اندپوینت: POST /api/templates/:id/apply]\nلطفاً تغییرات زیر را در این ویزارد اعمال کن:'
  },

  'modal-template-editor': {
    id: 'modal-template-editor',
    titleEn: 'Template Editor & Variable Builder Modal',
    titleFa: 'پنجره ویرایشگر و سازنده تمپلیت‌های کانفیگ',
    file: 'src/components/TemplateEditorModal.tsx',
    apiEndpoint: '/api/templates',
    apiMethod: 'POST',
    module: 'templates',
    descriptionEn: 'Full template authoring tool with support for Cisco and MikroTik command syntax, dynamic variable tags {{VAR}}, and live syntax preview.',
    descriptionFa: 'ابزار طراحی و کدنویسی تمپلیت با پشتیبانی از دستورات سیسکو و میکروتیک و تعریف متغیرهای تعاملی.',
    steps: [
      {
        step: 1,
        titleEn: 'Define Template Metadata & Target Platform',
        titleFa: 'تعیین مشخصات تمپلیت و پلتفرم هدف',
        descEn: 'Set Template Name, Vendor (Cisco IOS-XE / MikroTik RouterOS), Target Type (Switch / Router), and Role.',
        descFa: 'نام قالب، برند تجهیز (سیسکو یا میکروتیک)، نوع تجهیز و نقش آن تعیین می‌شود.'
      },
      {
        step: 2,
        titleEn: 'Define Dynamic Variable Schema {{VAR}}',
        titleFa: 'تعریف متغیرهای پویا و مقادیر پیش‌فرض',
        descEn: 'Add variables with key, label, data type (IP, VLAN, Password, Text), and default values.',
        descFa: 'متغیرهایی مانند IP، VLAN و رمز عبور به همراه راهنمای ورودی تعریف می‌شوند.'
      },
      {
        step: 3,
        titleEn: 'Write CLI Command Script with Interpolation',
        titleFa: 'نگارش دستورات خط فرمان به همراه تگ متغیرها',
        descEn: 'Enter CLI commands using double curly braces (e.g. interface vlan {{MANAGEMENT_VLAN}}).',
        descFa: 'متن دستورات سیسکو یا میکروتیک با درج متغیرهای پویا نگاشته می‌شود.'
      },
      {
        step: 4,
        titleEn: 'Live Syntax Preview & Persistence',
        titleFa: 'پیش‌نمایش زنده جایگزینی متغیرها و ذخیره‌سازی',
        descEn: 'Preview how the commands render with default values, validate JSON schema, and save to SQLite template library.',
        descFa: 'پیش‌نمایش خروجی بررسی شده و قالب در کتابخانه پایدار دیتابیس ذخیره می‌شود.'
      }
    ],
    aiPrompt: '[بخش: ویرایشگر تمپلیت | فایل: src/components/TemplateEditorModal.tsx | اندپوینت: POST /api/templates]\nلطفاً تغییرات زیر را در ویرایشگر تمپلیت اعمال کن:'
  },

  'modal-clone-template': {
    id: 'modal-clone-template',
    titleEn: 'Fork & Clone Template Modal',
    titleFa: 'پنجره کلون و انشعاب از تمپلیت موجود',
    file: 'src/components/CloneTemplateModal.tsx',
    apiEndpoint: '/api/templates',
    apiMethod: 'POST',
    module: 'templates',
    descriptionEn: 'Enables quick forking of existing configuration templates, customizing variable values, and saving as a new variant.',
    descriptionFa: 'امکان کلون‌کردن سریع تمپلیت‌های آماده، سفارشی‌سازی برای سناریوی جدید و ذخیره به عنوان قالب مستقل.',
    steps: [
      {
        step: 1,
        titleEn: 'Deep-copy Source Template Structure',
        titleFa: 'کپی ساختار کامل تمپلیت مبدأ',
        descEn: 'Loads metadata, commands, and variable schema from the selected source template.',
        descFa: 'تمامی دستورات و متغیرهای تمپلیت اصلی بارگذاری می‌شوند.'
      },
      {
        step: 2,
        titleEn: 'Customize Commands and Parameter Defaults',
        titleFa: 'سفارشی‌سازی دستورات و مقادیر متغیرها',
        descEn: 'Engineer modifies commands or defaults for the new equipment role or site specification.',
        descFa: 'مهندس تغییرات مورد نظر برای ساختمان یا رده تجهیزات جدید را اعمال می‌کند.'
      },
      {
        step: 3,
        titleEn: 'Save or Save & Apply Directly',
        titleFa: 'ذخیره کلون یا ذخیره و اعمال فوری روی تجهیز',
        descEn: 'Persists the cloned template and optionally launches the Apply Wizard immediately.',
        descFa: 'قالب جدید ذخیره شده و در صورت نیاز بلافاصله پنجره اعمال آن باز می‌شود.'
      }
    ],
    aiPrompt: '[بخش: کلون تمپلیت | فایل: src/components/CloneTemplateModal.tsx | اندپوینت: POST /api/templates]\nلطفاً تغییرات زیر را در بخش کلون اعمال کن:'
  },

  'modal-capture-config': {
    id: 'modal-capture-config',
    titleEn: 'Extract Live Running-Config to Template Modal',
    titleFa: 'پنجره استخراج کانفیگ زنده سوئیچ و تبدیل به تمپلیت',
    file: 'src/components/CaptureConfigModal.tsx',
    apiEndpoint: '/api/devices/extract-config',
    apiMethod: 'POST',
    module: 'templates',
    descriptionEn: 'Connects to a live physical switch via SSH, runs show running-config, cleans boilerplate banners, parameterizes IPs, and converts to a reusable template.',
    descriptionFa: 'اتصال مستقیم به سوئیچ فیزیکی با SSH، دریافت Running-Config، حذف بنرهای سیستمی و تبدیل به تمپلیت قابل استفاده مجدد.',
    steps: [
      {
        step: 1,
        titleEn: 'Select Source Appliance and Authentication',
        titleFa: 'انتخاب تجهیز مبدأ و اعتبارسنجی دسترسی',
        descEn: 'Select an inventory switch or enter custom IP and SSH/Telnet credentials.',
        descFa: 'تجهیز مبدأ از لیست انتخاب شده یا آدرس آی‌پی و مشخصات SSH به صورت دستی وارد می‌شود.'
      },
      {
        step: 2,
        titleEn: 'Retrieve Full Running-Config via SSH',
        titleFa: 'دریافت کامل فایل Running-Config از سوئیچ فیزیکی',
        descEn: 'Backend executes terminal length 0 and show running-config to read clean configuration.',
        descFa: 'دستور show running-config بدون توقف اجرا شده و فایل کانفیگ دریافت می‌شود.'
      },
      {
        step: 3,
        titleEn: 'Automated Cleaning & Parameterization',
        titleFa: 'پاک‌سازی هوشمند و جایگزینی خودکار متغیرها',
        descEn: 'Strips sensitive passwords and suggests dynamic variables for Hostname, Management IP, and VLANs.',
        descFa: 'بخش‌های تکراری پاک شده و مقادیر آی‌پی و نام تجهیز با تگ‌های متغیر جایگزین می‌شوند.'
      },
      {
        step: 4,
        titleEn: 'Save into Reusable Template Library',
        titleFa: 'ذخیره نهایی به عنوان تمپلیت استاندارد جدید',
        descEn: 'Stores the extracted configuration in the persistent template catalog for future provisioning.',
        descFa: 'کانفیگ استخراج‌شده در کتابخانه تمپلیت‌ها ذخیره می‌شود.'
      }
    ],
    aiPrompt: '[بخش: استخراج کانفیگ زنده | فایل: src/components/CaptureConfigModal.tsx | اندپوینت: POST /api/devices/extract-config]\nلطفاً تغییرات زیر را در این بخش اعمال کن:'
  },

  'modal-test-connection': {
    id: 'modal-test-connection',
    titleEn: 'Device Connectivity & Port Diagnostics Modal',
    titleFa: 'پنجره تست ارتباط، پینگ و پایش پورت‌های سوئیچ',
    file: 'src/components/TestConnectionModal.tsx',
    apiEndpoint: '/api/devices/:id/ping & /api/devices/:id/test-connection',
    apiMethod: 'POST',
    module: 'devices',
    descriptionEn: 'High-speed diagnostic tool providing ICMP round-trip latency, TCP socket probes (SSH, Telnet, HTTP, HTTPS), and reachability alerts.',
    descriptionFa: 'ابزار سنجش ارتباط شبکه، پینگ رفت‌وبرگشت (RTT)، تست سوکت پورت‌های ۲۲ و ۲۳ و بررسی پایداری تجهیز.',
    steps: [
      {
        step: 1,
        titleEn: 'Dispatch ICMP Ping Probes',
        titleFa: 'ارسال بسته‌های پینگ ICMP به تجهیز',
        descEn: 'Sends multiple ICMP echo requests to measure response time and packet loss percentage.',
        descFa: 'بسته‌های پینگ ارسال شده و نرخ از دست رفتن بسته و پینگ برحسب میلی‌ثانیه محاسبه می‌شود.'
      },
      {
        step: 2,
        titleEn: 'Probe Management Socket Ports',
        titleFa: 'سنجش دسترسی پورت‌های سوکت (SSH / Telnet / HTTP)',
        descEn: 'Attempts non-blocking TCP handshakes on ports 22, 23, 80, and 443 to identify active listening daemons.',
        descFa: 'سوکت پورت‌های ۲۲، ۲۳، ۸۰ و ۴۴۳ برای بررسی سرویس‌های فعال شبکه تست می‌شوند.'
      },
      {
        step: 3,
        titleEn: 'Real-time Telemetry & Health Badge',
        titleFa: 'نمایش شاخص‌های زنده سلامت و تاخیر شبکه',
        descEn: 'Displays color-coded latency badge (<10ms green, <50ms cyan, >100ms amber, timeout red).',
        descFa: 'شاخص رنگی میزان تاخیر شبکه و وضعیت آنلاین بودن نمایش داده می‌شود.'
      },
      {
        step: 4,
        titleEn: 'Quick Jump to Terminal or Port Inspector',
        titleFa: 'انتقال سریع به ترمینال یا بازرسی پورت‌ها',
        descEn: 'Direct shortcut buttons to launch Cisco Terminal or Port Inspector for this verified appliance.',
        descFa: 'دکمه‌های انتقال مستقیم برای باز کردن ترمینال یا صفحه پورت‌ها در دسترس کاربر قرار می‌گیرد.'
      }
    ],
    aiPrompt: '[بخش: تست ارتباط و پینگ | فایل: src/components/TestConnectionModal.tsx | اندپوینت: POST /api/devices/:id/ping]\nلطفاً تغییرات زیر را در این بخش اعمال کن:'
  },

  'modal-assign-vlan': {
    id: 'modal-assign-vlan',
    titleEn: 'Assign Access VLAN Modal',
    titleFa: 'پنجره تخصیص سریع ویلن دسترسی (Assign VLAN)',
    file: 'src/components/AssignVlanModal.tsx',
    apiEndpoint: '/api/devices/:id/ports/:portId/assign-vlan',
    apiMethod: 'POST',
    module: 'ports',
    descriptionEn: 'Modal for instantly reassigning port Access VLAN with active VLAN list selector, custom VLAN ID input, and Cisco CLI generation.',
    descriptionFa: 'پنجره اختصاص سریع ویلن به پورت با لیست ویلن‌های فعال سوئیچ، ورودی شماره ویلن و تولید دستورات CLI.',
    steps: [
      {
        step: 1,
        titleEn: 'Query Active Switch VLANs',
        titleFa: 'دریافت جدول ویلن‌های فعال سوئیچ',
        descEn: 'Fetches current VLAN database from switch (e.g. VLAN 1, 10 Management, 20 Server, 30 HQ).',
        descFa: 'ویلن‌های موجود روی سوئیچ استخراج و در منو برای انتخاب آسان لیست می‌شوند.'
      },
      {
        step: 2,
        titleEn: 'Select Target VLAN ID',
        titleFa: 'انتخاب یا ورود شماره ویلن جدید',
        descEn: 'User selects an existing VLAN or enters custom ID (1-4094).',
        descFa: 'کاربر شماره ویلن جدید را از لیست انتخاب کرده یا به صورت دستی تایپ می‌کند.'
      },
      {
        step: 3,
        titleEn: 'Cisco CLI Syntax Preview',
        titleFa: 'پیش‌نمایش دستورات سیسکو switchport access vlan',
        descEn: 'Generates interface GiX/X, switchport mode access, switchport access vlan <ID>.',
        descFa: 'دستورات استاندارد سیسکو برای تنظیم پورت تولید و نمایش داده می‌شوند.'
      },
      {
        step: 4,
        titleEn: 'Apply via SSH and Refresh Port State',
        titleFa: 'ارسال با SSH و به‌روزرسانی آنی وضعیت پورت',
        descEn: 'Sends commands to hardware, verifies interface state, and reflects new VLAN on the faceplate.',
        descFa: 'دستورات روی پورت اعمال شده و شماره ویلن جدید روی فیس‌پلیت سوئیچ منعکس می‌شود.'
      }
    ],
    aiPrompt: '[بخش: تخصیص ویلن | فایل: src/components/AssignVlanModal.tsx | اندپوینت: POST /api/devices/:id/ports/:portId/assign-vlan]\nلطفاً تغییرات زیر را در این بخش اعمال کن:'
  },

  'modal-cisco-confirm': {
    id: 'modal-cisco-confirm',
    titleEn: 'Cisco CLI Command Confirmation Modal',
    titleFa: 'پنجره تاییدیه و مقایسه دستورات سیسکو (Command Confirm)',
    file: 'src/components/CiscoCommandConfirmModal.tsx',
    apiEndpoint: '/api/ssh/execute-command',
    apiMethod: 'POST',
    module: 'ports',
    descriptionEn: 'Safety confirmation modal for interface state changes (shutdown, no shutdown, mode trunk/access, port-security disable) with exact CLI diff.',
    descriptionFa: 'پنجره تاییدیه امنیتی قبل از اعمال تغییرات حساس پورت (خاموش‌کردن، ترانک‌کردن و حذف امنیت پورت) با نمایش پیش‌نویس دستورات.',
    steps: [
      {
        step: 1,
        titleEn: 'Identify Action Risk Level',
        titleFa: 'تشخیص سطح ریسک عملیات پورت',
        descEn: 'Categorizes action severity (e.g. shutdown will disrupt connected endpoint).',
        descFa: 'میزان تاثیر تغییر روی ترافیک پورت بررسی و پیام هشدار مناسب تولید می‌شود.'
      },
      {
        step: 2,
        titleEn: 'Display Complete Cisco IOS Syntax Diff',
        titleFa: 'نمایش دقیق دستورات خط فرمان سیسکو',
        descEn: 'Renders complete configuration terminal script with syntax highlighting.',
        descFa: 'متن دقیق دستوراتی که قرار است به سوئیچ ارسال شود در کادر خط فرمان نمایش می‌یابد.'
      },
      {
        step: 3,
        titleEn: 'Require Explicit User Confirmation',
        titleFa: 'دریافت تاییدیه صریح از کاربر',
        descEn: 'Ensures intentional administrative action with loading state spinner during SSH dispatch.',
        descFa: 'کاربر با آگاهی کامل دستور را تایید کرده و وضعیت اجرای SSH نمایش داده می‌شود.'
      }
    ],
    aiPrompt: '[بخش: تاییدیه دستورات سیسکو | فایل: src/components/CiscoCommandConfirmModal.tsx | اندپوینت: POST /api/ssh/execute-command]\nلطفاً تغییرات زیر را در این بخش اعمال کن:'
  },

  'modal-dangerous-command': {
    id: 'modal-dangerous-command',
    titleEn: 'Dangerous Command Safety Guard Modal',
    titleFa: 'پنجره رهگیری و اخطار دستورات پرخطر شبکه',
    file: 'src/components/DangerousCommandModal.tsx',
    apiEndpoint: '/api/terminal/guard',
    apiMethod: 'POST',
    module: 'global',
    descriptionEn: 'Safety interceptor modal that catches disruptive commands (reload, erase, format, shutdown) entered into terminals and prevents accidental network outages.',
    descriptionFa: 'سامانه ایمنی هوشمند که دستورات مخرب یا باعث قطعی شبکه (مانند reload یا erase) را قبل از ارسال به سخت‌افزار مهار می‌کند.',
    steps: [
      {
        step: 1,
        titleEn: 'Intercept Disruptive Command Pattern',
        titleFa: 'رهگیری الگوی دستور پرخطر در ورودی ترمینال',
        descEn: 'Regex pattern matching detects commands capable of rebooting or formatting appliances.',
        descFa: 'سیستم الگوهای ریستارت یا پاک‌کردن کانفیگ را قبل از ارسال به بافر تشخیص می‌دهد.'
      },
      {
        step: 2,
        titleEn: 'Safety Warning & Impact Explanation',
        titleFa: 'ارائه توضیحات شفاف در مورد تبعات قطعی شبکه',
        descEn: 'Explains specific consequences in Persian and English (e.g. network downtime, config loss).',
        descFa: 'تبعات دقیق اجرای این دستور برای تجهیز و سرویس‌های شبکه تشریح می‌شود.'
      },
      {
        step: 3,
        titleEn: 'Explicit Execution Authorization',
        titleFa: 'اخذ مجوز صریح برای عبور از فیلتر امنیتی',
        descEn: 'Requires explicit button confirmation before forwarding command to hardware session.',
        descFa: 'فقط در صورت تایید عمدی کاربر، دستور به سشن سوئیچ ارسال می‌شود.'
      }
    ],
    aiPrompt: '[بخش: اخطار دستورات پرخطر | فایل: src/components/DangerousCommandModal.tsx]\nلطفاً تغییرات زیر را در این پنجره امنیتی اعمال کن:'
  },

  'modal-release-notes': {
    id: 'modal-release-notes',
    titleEn: 'Release Notes & Changelog Modal',
    titleFa: 'پنجره تاریخچه نسخه‌ها و تغییرات سامانه (Release Notes)',
    file: 'src/components/ReleaseNotesModal.tsx',
    apiEndpoint: 'src/version.ts',
    module: 'global',
    descriptionEn: 'Displays comprehensive versioning history, major feature additions, bug fixes, and upgrade instructions in Persian and English.',
    descriptionFa: 'نمایش تاریخچه تغییرات و آپدیت‌های نرم‌افزار، امکانات جدید و بهینه‌سازی‌ها به دو زبان فارسی و انگلیسی.',
    steps: [
      {
        step: 1,
        titleEn: 'Read Semantic Versioning & History',
        titleFa: 'خواندن ساختار نسخه‌بندی و لیست تغییرات',
        descEn: 'Loads release logs from version.ts with version badges and timestamps.',
        descFa: 'اطلاعات نسخه‌ها از فایل نسخه مرکزی خوانده می‌شود.'
      },
      {
        step: 2,
        titleEn: 'Render Localized Release Highlights',
        titleFa: 'رندر دو زبانه ویژگی‌های جدید و اصلاحات',
        descEn: 'Categorizes entries into features, improvements, and bug fixes in Persian and English.',
        descFa: 'ویژگی‌های هر نسخه به تفکیک امکانات جدید، بهینه‌سازی‌ها و رفع اشکالات نمایش می‌یابد.'
      }
    ],
    aiPrompt: '[بخش: تاریخچه تغییرات | فایل: src/components/ReleaseNotesModal.tsx | نسخه: src/version.ts]\nلطفاً تغییرات زیر را در این بخش اعمال کن:'
  },

  'modal-windows-installer': {
    id: 'modal-windows-installer',
    titleEn: 'Windows Native Installer & Runner Modal',
    titleFa: 'پنجره بسته نصبی و اسکریپت اجرای ویندوز (Windows Runner)',
    file: 'src/components/WindowsInstallerModal.tsx',
    apiEndpoint: '/api/python/status',
    apiMethod: 'GET',
    module: 'global',
    descriptionEn: 'Provides 1-click batch launcher scripts, Python engine dependency checks, and Windows deployment instructions for enterprise environments.',
    descriptionFa: 'راهنمای راه‌اندازی ویندوز به همراه اسکریپت‌های اتوماتیک نصب پایتون، Netmiko و راه‌اندازی خودکار سامانه.',
    steps: [
      {
        step: 1,
        titleEn: 'Probe Host Python & Library Status',
        titleFa: 'بررسی وضعیت مفسر پایتون و کتابخانه‌های Netmiko',
        descEn: 'Checks if Python 3, pip, Netmiko, and Paramiko are installed and reachable on the host machine.',
        descFa: 'سیستم وجود پایتون و ماژول‌های شبکه را روی سیستم‌عامل بررسی می‌کند.'
      },
      {
        step: 2,
        titleEn: 'Generate Automated Batch Setup Scripts',
        titleFa: 'تولید اسکریپت‌های Batch خودکار ویندوز',
        descEn: 'Generates ready-to-run setup-and-run.bat and requirements.txt for instant 1-click download.',
        descFa: 'فایل‌های راه‌اندازی آماده برای دانلود یا کپی در اختیار کاربر قرار می‌گیرد.'
      }
    ],
    aiPrompt: '[بخش: نصاب ویندوز | فایل: src/components/WindowsInstallerModal.tsx | اندپوینت: GET /api/python/status]\nلطفاً تغییرات زیر را در این بخش اعمال کن:'
  },

  'modal-port-preview': {
    id: 'modal-port-preview',
    titleEn: 'Real Switch Port Configuration Preview Modal',
    titleFa: 'پنجره پیش‌نمایش و تایید دستورات اعمال پورت',
    file: 'src/components/PortManagementView.tsx (Preview Modal)',
    apiEndpoint: '/api/ssh/apply-port-config',
    apiMethod: 'POST',
    module: 'ports',
    descriptionEn: 'Detailed modal showing diff between current and proposed port parameters, full Cisco CLI configuration block, and SSH push button.',
    descriptionFa: 'پنجره نمایش تفاوت تنظیمات پورت، متن کامل دستورات CLI سیسکو و ارسال مستقیم به سوئیچ با SSH.',
    steps: [
      {
        step: 1,
        titleEn: 'Calculate Parameter Differences',
        titleFa: 'محاسبه تفاوت مقادیر قبلی و جدید پورت',
        descEn: 'Compares VLAN, Mode, and Port Security to create an exact change list.',
        descFa: 'تغییرات پورت تفکیک شده و موارد اصلاحی با رنگ متمایز نشان داده می‌شوند.'
      },
      {
        step: 2,
        titleEn: 'Generate Interface CLI Configuration',
        titleFa: 'تولید بلاک کانفیگ استاندارد سیسکو',
        descEn: 'Constructs configure terminal commands for interface with 1-click copy.',
        descFa: 'دستورات اینترفیس آماده شده و امکان کپی متن دستورات فراهم است.'
      },
      {
        step: 3,
        titleEn: 'Execute on Hardware & Commit NVRAM',
        titleFa: 'اجرا روی سخت‌افزار واقعی و رایت در حافظه',
        descEn: 'Sends commands via SSH, parses switch reply, updates local state, and shows result.',
        descFa: 'دستورات روی سوئیچ فیزیکی اعمال و نتیجه موفقیت یا خطای احتمالی گزارش می‌شود.'
      }
    ],
    aiPrompt: '[بخش: پیش‌نمایش اعمال پورت | فایل: src/components/PortManagementView.tsx | اندپوینت: POST /api/ssh/apply-port-config]\nلطفاً تغییرات زیر را در این بخش اعمال کن:'
  },

  // ----------------------------------------------------
  // CARDS & PANELS
  // ----------------------------------------------------
  'card-dashboard-kpi': {
    id: 'card-dashboard-kpi',
    titleEn: 'Dashboard KPI Stat Summary Cards',
    titleFa: 'کارت‌های آماری و شاخص‌های کلیدی داشبورد (KPI Cards)',
    file: 'src/components/DashboardView.tsx (KPI Grid)',
    apiEndpoint: '/api/devices & /api/topology',
    apiMethod: 'GET',
    module: 'dashboard',
    descriptionEn: 'High-level network summary cards presenting total devices, online/offline count, active switches/routers, and topology link metrics.',
    descriptionFa: 'کارت‌های خلاصه آمار شبکه شامل تعداد کل تجهیزات، نسبت آنلاین به آفلاین، تفکیک سوئیچ‌ها و پیوندهای توپولوژی.',
    steps: [
      {
        step: 1,
        titleEn: 'Aggregate Real-time Device Counts',
        titleFa: 'تجمیع آمار بلادرنگ تجهیزات شبکه',
        descEn: 'Calculates active devices grouped by type: switches, routers, and wireless APs.',
        descFa: 'تجهیزات دیتابیس بر اساس نوع و نقش دسته‌بندی و شمارش می‌شوند.'
      },
      {
        step: 2,
        titleEn: 'Compute Online SLA & Link Totals',
        titleFa: 'محاسبه درصد پایداری و تعداد پیوندهای فعال',
        descEn: 'Computes network availability percentage and links discovered via CDP/LLDP.',
        descFa: 'درصد آپ‌تایم شبکه و اتصالات ترانک و اکسس برآورد می‌شود.'
      },
      {
        step: 3,
        titleEn: 'Interactive Navigation Shortcuts',
        titleFa: 'انتقال سریع با کلیک روی کارت‌ها به بخش‌های مربوطه',
        descEn: 'Clicking any KPI card instantly routes user to Device Inventory or Schematic Map.',
        descFa: 'کلیک روی هر کارت کاربر را مستقیماً به صفحه تجهیزات یا نقشه منتقل می‌کند.'
      }
    ],
    aiPrompt: '[بخش: کارت‌های شاخص داشبورد | فایل: src/components/DashboardView.tsx (KPI Grid)]\nلطفاً تغییرات زیر را در این کارت‌ها اعمال کن:'
  },

  'card-faceplate': {
    id: 'card-faceplate',
    titleEn: 'Switch Chassis Faceplate & RJ-45 Port Grid Card',
    titleFa: 'کارت فیس‌پلیت فیزیکی و ماتریس پورت‌های سوئیچ',
    file: 'src/components/PortManagementView.tsx (Faceplate Chassis)',
    apiEndpoint: '/api/devices/:id/ports',
    apiMethod: 'GET',
    module: 'ports',
    descriptionEn: 'Visual 2-row hardware chassis recreating physical switch front panel with interactive vector RJ45 ports, LED indicators, and multi-selection.',
    descriptionFa: 'شبیه‌سازی پنل جلویی سوئیچ در ۲ ردیف پورت‌های زوج و فرد RJ-45 با ال‌ای‌دی‌های وضعیت، انتخاب چندتایی با کلید Ctrl و منوی راست‌کلیک.',
    steps: [
      {
        step: 1,
        titleEn: 'Layout Two-Row Chassis Grid (Odd/Even Ports)',
        titleFa: 'چیدمان دوردیفه پورت‌های سوئیچ فیزیکی',
        descEn: 'Arranges odd ports on top row (Gi1/0/1, Gi1/0/3) and even ports on bottom row (Gi1/0/2, Gi1/0/4).',
        descFa: 'پورت‌های فرد در ردیف بالا و زوج در ردیف پایین مطابق با طراحی سخت‌افزاری سیسکو چیده می‌شوند.'
      },
      {
        step: 2,
        titleEn: 'Interactive Selection (Single & Ctrl+Multi Select)',
        titleFa: 'انتخاب تکی یا گروهی پورت‌ها با کلید Ctrl',
        descEn: 'Allows single port selection or holding Ctrl to select multiple ports for batch operations.',
        descFa: 'کاربر می‌تواند یک پورت یا با نگه داشتن Ctrl چندین پورت را برای تنظیم همزمان انتخاب کند.'
      },
      {
        step: 3,
        titleEn: 'Right-Click Cisco Context Menu',
        titleFa: 'منوی راست‌کلیک پیشرفته دستورات سیسکو',
        descEn: 'Right-clicking any port opens quick Cisco actions (Shut/No Shut, Assign VLAN, Port Security).',
        descFa: 'راست‌کلیک روی هر پورت گزینه‌های عملیاتی سریع سیسکو را باز می‌کند.'
      }
    ],
    aiPrompt: '[بخش: فیس‌پلیت فیزیکی سوئیچ | فایل: src/components/PortManagementView.tsx (Faceplate Chassis)]\nلطفاً تغییرات زیر را در این بخش اعمال کن:'
  },

  'card-batch-config': {
    id: 'card-batch-config',
    titleEn: 'Multi-Port Batch Configuration Card',
    titleFa: 'کارت پیکربندی گروهی پورت‌ها (Batch Config)',
    file: 'src/components/PortManagementView.tsx (Batch Card)',
    apiEndpoint: '/api/devices/:id/ports/batch',
    apiMethod: 'PUT',
    module: 'ports',
    descriptionEn: 'Batch configuration toolbar to simultaneously configure Admin Status, Mode, VLANs, and Port Security across multiple selected switchports.',
    descriptionFa: 'پنل تنظیمات گروهی برای تغییر همزمان چند پورت (وضعیت اداری، مود Access/Trunk، ویلن و امنیت پورت) در یک عملیات یکپارچه.',
    steps: [
      {
        step: 1,
        titleEn: 'Collect Selected Port Identifiers',
        titleFa: 'جمع‌آوری پورت‌های انتخاب‌شده برای عملیات گروهی',
        descEn: 'Reads selectedPortIds state and displays total count of target interfaces.',
        descFa: 'لیست تمام پورت‌های مشخص‌شده برای اعمال کانفیگ استخراج می‌شود.'
      },
      {
        step: 2,
        titleEn: 'Fill Batch Attributes with "No Change" Guards',
        titleFa: 'انتخاب تنظیمات جدید با حفظ ویژگی‌های دست‌نخورده',
        descEn: 'Allows selectively changing Admin Status, Mode, VLAN, or Security while leaving other properties untouched.',
        descFa: 'ویژگی‌هایی که نیاز به تغییر دارند انتخاب شده و بقیه فیلدها بدون تغییر حفظ می‌شوند.'
      },
      {
        step: 3,
        titleEn: 'Atomic Batch Push via SSH Engine',
        titleFa: 'ارسال همزمان تغییرات گروهی به سوئیچ با SSH',
        descEn: 'Constructs interface range command or individual updates and commits to NVRAM.',
        descFa: 'دستورات روی بازه اینترفیس‌ها اعمال و نتیجه موفقیت به کاربر نشان داده می‌شود.'
      }
    ],
    aiPrompt: '[بخش: تنظیمات گروهی پورت‌ها | فایل: src/components/PortManagementView.tsx (Batch Card)]\nلطفاً تغییرات زیر را در این بخش اعمال کن:'
  },

  'card-port-editor': {
    id: 'card-port-editor',
    titleEn: 'Single Port Detail & Configuration Card',
    titleFa: 'کارت تنظیمات تفصیلی و ویرایش پورت تکی',
    file: 'src/components/PortManagementView.tsx (Port Editor)',
    apiEndpoint: '/api/devices/:id/ports/:portId',
    apiMethod: 'PUT',
    module: 'ports',
    descriptionEn: 'Detailed inspector and edit card for individual switchport: VLAN ID, Allowed VLANs, Port Description, and Port Security parameters.',
    descriptionFa: 'کارت ویرایش پورت انتخابی شامل تغییر ویلن، نام تجهیز متصل، سرعت، داپلکس و تنظیمات امنیتی پورت سیسکو.',
    steps: [
      {
        step: 1,
        titleEn: 'Display Live Interface Metrics & Metadata',
        titleFa: 'نمایش مشخصات اینترفیس (سرعت، وضعیت، داپلکس)',
        descEn: 'Shows interface name, current mode badge, speed, duplex, and connected device.',
        descFa: 'اطلاعات کامل وضعیت فیزیکی و منطقی پورت نمایش می‌یابد.'
      },
      {
        step: 2,
        titleEn: 'Interactive Edit Form & Validation',
        titleFa: 'فرم ویرایش پارامترهای پورت با اعتبارسنجی',
        descEn: 'Allows changing VLAN (1-4094), Allowed VLANs string, Description, and Port Security mode.',
        descFa: 'کاربر پارامترها را تغییر داده و سیستم از صحت شماره ویلن اطمینان حاصل می‌کند.'
      },
      {
        step: 3,
        titleEn: 'Preview and Commit to Switch',
        titleFa: 'پیش‌نمایش دستورات سیسکو و ارسال نهایی به سوئیچ',
        descEn: 'Opens the Cisco configuration preview modal before sending to hardware via SSH.',
        descFa: 'پنجره پیش‌نمایش باز شده و پس از تایید دستورات روی سوئیچ فیزیکی رایت می‌شود.'
      }
    ],
    aiPrompt: '[بخش: ویرایشگر مشخصات پورت تکی | فایل: src/components/PortManagementView.tsx (Port Editor)]\nلطفاً تغییرات زیر را در این کارت اعمال کن:'
  },

  'card-device-inventory': {
    id: 'card-device-inventory',
    titleEn: 'Device Inventory Table & Filter Card',
    titleFa: 'کارت جدول جامع تجهیزات شبکه و ابزارهای جستجو',
    file: 'src/components/DeviceListView.tsx',
    apiEndpoint: '/api/devices',
    apiMethod: 'GET',
    module: 'devices',
    descriptionEn: 'Comprehensive network equipment inventory table with real-time reachability badges, location tags, quick action shortcuts, and multi-field search.',
    descriptionFa: 'جدول کامل تجهیزات شبکه با امکان فیلتر بر اساس نوع و ساختمان، سنجش پینگ زنده، اتصال مستقیم به کنسول و مدیریت پورت‌ها.',
    steps: [
      {
        step: 1,
        titleEn: 'Query Network Inventory & Cache',
        titleFa: 'استخراج لیست تجهیزات از پایگاه داده',
        descEn: 'Loads registered switches, routers, and access points from the backend repository.',
        descFa: 'لیست تجهیزات موجود در دیتابیس به همراه آخرین وضعیت آنلاین بودن خوانده می‌شود.'
      },
      {
        step: 2,
        titleEn: 'Real-time Search & Multi-criteria Filtering',
        titleFa: 'فیلتر هوشمند بر اساس نوع، وضعیت و ساختمان',
        descEn: 'Instant search across Hostname, IP address, Model, Building, Floor, and Unit.',
        descFa: 'جستجوی آنی بر اساس نام، آدرس آی‌پی، مدل سخت‌افزاری و محل استقرار انجام می‌شود.'
      },
      {
        step: 3,
        titleEn: 'Action Row Triggers (Ping, SSH, Ports, Delete)',
        titleFa: 'دکمه‌های عملیاتی سریع در هر ردیف تجهیز',
        descEn: 'Allows 1-click ping tests, opening Cisco terminal, inspecting ports, or deleting equipment.',
        descFa: 'دسترسی فوری به تست پینگ، ترمینال خط فرمان، صفحه پورت‌ها و حذف تجهیز فراهم است.'
      }
    ],
    aiPrompt: '[بخش: جدول جامع تجهیزات | فایل: src/components/DeviceListView.tsx | اندپوینت: GET /api/devices]\nلطفاً تغییرات زیر را در این جدول اعمال کن:'
  },

  'card-topology-canvas': {
    id: 'card-topology-canvas',
    titleEn: 'Schematic Topology Canvas Card',
    titleFa: 'کارت بوم نقشه شماتیک و اتصالات همسایگی CDP/LLDP',
    file: 'src/components/SchematicTopologyView.tsx',
    apiEndpoint: '/api/topology & /api/topology/custom-maps',
    apiMethod: 'GET',
    module: 'schematic',
    descriptionEn: 'Interactive graphical topology canvas showing network devices as nodes, inter-switch links as colored lines, zoom/pan navigation, and link inspector.',
    descriptionFa: 'بوم گرافیکی و تعاملی نقشه شبکه با نمایش نودها، خطوط ارتباطی ترانک و اکسس، قابلیت جابجایی و زوم و پنل مشخصات پیوند.',
    steps: [
      {
        step: 1,
        titleEn: 'Node & Link Graph Construction',
        titleFa: 'ترسیم گره‌های تجهیزات و خطوط ارتباطی',
        descEn: 'Parses topology links discovered by CDP/LLDP and places switches, routers, and servers on canvas.',
        descFa: 'تجهیزات به صورت نود و اتصالات کشف‌شده توسط CDP/LLDP به صورت خطوط ارتباطی رسم می‌شوند.'
      },
      {
        step: 2,
        titleEn: 'Interactive Pan, Zoom, and Drag Positioning',
        titleFa: 'بزرگ‌نمایی، جابجایی آزاد و تغییر موقعیت نودها',
        descEn: 'Engineers can drag devices to reflect actual server room rack arrangements and zoom in/out.',
        descFa: 'کاربر می‌تواند با درگ و دراپ چیدمان نودها را مطابق با اتاق سرور تنظیم کند.'
      },
      {
        step: 3,
        titleEn: 'Link Inspector & Port Details Drawer',
        titleFa: 'دراور مشخصات دقیق پیوند و پورت‌های دو سر لینک',
        descEn: 'Clicking any cable line reveals source port, remote port, duplex, speed, and VLAN status.',
        descFa: 'کلیک روی هر خط ارتباطی مشخصات پورت‌های مبدا و مقصد و نوع اتصال را نشان می‌دهد.'
      }
    ],
    aiPrompt: '[بخش: بوم نقشه شماتیک | فایل: src/components/SchematicTopologyView.tsx | اندپوینت: GET /api/topology]\nلطفاً تغییرات زیر را در نقشه شماتیک اعمال کن:'
  },

  'card-template-library': {
    id: 'card-template-library',
    titleEn: 'Configuration Template Library Card',
    titleFa: 'کارت کتابخانه تمپلیت‌ها و کاتالوگ کانفیگ‌های شبکه',
    file: 'src/components/TemplateManagementView.tsx',
    apiEndpoint: '/api/templates',
    apiMethod: 'GET',
    module: 'templates',
    descriptionEn: 'Central catalog of standardized configuration templates with vendor filters (Cisco/MikroTik), quick clone, syntax preview, and apply launcher.',
    descriptionFa: 'کاتالوگ جامع تمپلیت‌های آماده با فیلتر برند (سیسکو/میکروتیک)، پیش‌نمایش سینتکس، کلون‌کردن و اعمال مستقیم روی تجهیزات.',
    steps: [
      {
        step: 1,
        titleEn: 'Browse Standardized Configurations',
        titleFa: 'مرور تمپلیت‌های استاندارد شبکه',
        descEn: 'Presents verified templates for VLAN provisioning, Port Security, OSPF, and SSH hardening.',
        descFa: 'تمپلیت‌های تاییدشده سازمانی برای مدیریت پورت‌ها، روتینگ و امنیت لیست می‌شوند.'
      },
      {
        step: 2,
        titleEn: 'Quick Fork, Edit, or Apply',
        titleFa: 'کلون، ویرایش یا اعمال با یک کلیک',
        descEn: 'Allows engineers to clone a template for custom edits or launch the Apply Wizard immediately.',
        descFa: 'امکان ساخت نمونه اختصاصی از تمپلیت یا اعمال مستقیم آن روی سوئیچ فراهم است.'
      }
    ],
    aiPrompt: '[بخش: کتابخانه تمپلیت‌ها | فایل: src/components/TemplateManagementView.tsx | اندپوینت: GET /api/templates]\nلطفاً تغییرات زیر را در این بخش اعمال کن:'
  },

  'card-cdp-discovery': {
    id: 'card-cdp-discovery',
    titleEn: 'CDP/LLDP Discovery Scanner Card',
    titleFa: 'کارت اسکنر کشف خودکار همسایگی‌های شبکه (CDP / LLDP)',
    file: 'src/components/CdpLldpScannerView.tsx',
    apiEndpoint: '/api/scan/cdp-lldp',
    apiMethod: 'POST',
    module: 'scanner',
    descriptionEn: 'Automated topology builder that queries Cisco Discovery Protocol (CDP) and Link Layer Discovery Protocol (LLDP) neighbors to map physical switch interconnections.',
    descriptionFa: 'موتور کشف هوشمند توپولوژی که با اجرای پروتکل‌های CDP و LLDP روی سوئیچ‌ها، ارتباطات کابل‌های فیزیکی بین رک‌ها را به صورت خودکار کشف می‌کند.',
    steps: [
      {
        step: 1,
        titleEn: 'SSH into Seed Network Appliances',
        titleFa: 'اتصال خودکار به سوئیچ‌های مبدأ با SSH',
        descEn: 'Connects to registered switches and dispatches show cdp neighbors detail and show lldp neighbors.',
        descFa: 'دستورات استاندارد کشف همسایگی روی سوئیچ‌ها اجرا و خروجی ساختاریافته دریافت می‌شود.'
      },
      {
        step: 2,
        titleEn: 'Parse Neighbor Tables into Graph Edges',
        titleFa: 'تبدیل جدول همسایگی به پیوندهای گراف شبکه',
        descEn: 'Regex engines parse neighbor Hostname, Remote Port, Local Port, Platform, and IP address.',
        descFa: 'اطلاعات نام سوئیچ همسایه، پورت محلی و پورت راه دور پردازش و جفت‌سازی می‌شوند.'
      },
      {
        step: 3,
        titleEn: 'Commit Physical Links to Topology Canvas',
        titleFa: 'ثبت و پیوند خودکار در بوم نقشه توپولوژی',
        descEn: 'Saves verified physical connections to the database so they appear automatically on the Schematic Map.',
        descFa: 'اتصالات تاییدشده در دیتابیس ذخیره و کابل‌های ارتباطی روی نقشه شماتیک رسم می‌شوند.'
      }
    ],
    aiPrompt: '[بخش: اسکنر کشف همسایگی CDP/LLDP | فایل: src/components/CdpLldpScannerView.tsx | اندپوینت: POST /api/scan/cdp-lldp]\nلطفاً تغییرات زیر را در این بخش اعمال کن:'
  }
};
