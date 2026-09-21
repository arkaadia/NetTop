import React, { useState, useEffect } from 'react';
import {
  Workflow,
  X,
  Copy,
  Check,
  Layers,
  Terminal,
  Cpu,
  Server,
  Cable,
  Activity,
  Code2,
  ExternalLink,
  HelpCircle,
  FileCode,
  Network,
  Shield,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Zap,
  Radio,
  Sliders,
  Monitor
} from 'lucide-react';
import { useLanguage } from '../i18n';
import { ActiveTab } from './Sidebar';

export interface WorkflowStep {
  id: string;
  stepNumber: number;
  titleEn: string;
  titleFa: string;
  descEn: string;
  descFa: string;
  component: string;
  componentPath: string;
  apiEndpoint?: string;
  apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'WS';
  hardwareLayer?: string;
  targetToken: string; // The exact token the user can send to the AI
}

export interface ModuleWorkflowData {
  tabId: ActiveTab;
  nameEn: string;
  nameFa: string;
  subtitleEn: string;
  subtitleFa: string;
  icon: React.ComponentType<{ className?: string }>;
  primaryComponent: string;
  primaryFilePath: string;
  colorScheme: {
    accent: string;
    border: string;
    bg: string;
    badge: string;
  };
  steps: WorkflowStep[];
}

interface ModuleWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: ActiveTab;
}

const MODULES_WORKFLOW: Record<ActiveTab, ModuleWorkflowData> = {
  ports: {
    tabId: 'ports',
    nameEn: 'Port Management & Real SSH Execution',
    nameFa: 'مدیریت پورت‌ها و اعمال مستقیم SSH روی سوئیچ',
    subtitleEn: 'Access/Trunk VLAN switching, Port Security enforcement, and live Cisco CLI execution',
    subtitleFa: 'تغییر ویلن‌های Access و Trunk، تنظیمات امنیت پورت و ارسال مستقیم دستورات به سوئیچ سیسکو',
    icon: Cable,
    primaryComponent: 'PortManagementView.tsx',
    primaryFilePath: 'src/components/PortManagementView.tsx',
    colorScheme: {
      accent: 'text-cyan-400',
      border: 'border-cyan-500/40',
      bg: 'bg-cyan-500/10',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    },
    steps: [
      {
        id: 'port_selection',
        stepNumber: 1,
        titleEn: 'Switch & Port Selection',
        titleFa: 'انتخاب سوئیچ هدف و پورت فیزیکی',
        descEn: 'User selects a switch from dropdown and clicks on a port from the RJ-45 vector faceplate or list view.',
        descFa: 'کاربر سوئیچ مورد نظر را از منوی بالا انتخاب کرده و روی یکی از پورت‌های فیس‌پلیت RJ-45 یا جدول کلیک می‌کند.',
        component: 'PortManagementView.tsx (Device Selector & Port Grid)',
        componentPath: 'src/components/PortManagementView.tsx',
        hardwareLayer: 'Switch Chassis Port Grid (Gi1/0/1 - Gi1/0/48)',
        targetToken: '[بخش: مدیریت پورت‌ها | کامپوننت: src/components/PortManagementView.tsx | مرحله: انتخاب سوئیچ و پورت]',
      },
      {
        id: 'port_configuration',
        stepNumber: 2,
        titleEn: 'Port Parameter Configuration',
        titleFa: 'تنظیم پارامترهای پورت (VLAN، ترانک، امنیت)',
        descEn: 'User adjusts parameters: Admin Status (Up/Down), Mode (Access/Trunk), Access VLAN, Allowed VLANs, Port Security (Violation, Maximum MACs, Sticky).',
        descFa: 'کاربر مقادیر پورت را تغییر می‌دهد: وضعیت پورت (Up/Down)، حالت کاری (Access/Trunk)، شناسه VLAN دسترسی، ویلن‌های مجاز ترانک و امنیت پورت (حالت Sticky و Violation).',
        component: 'PortManagementView.tsx (Port Config Form)',
        componentPath: 'src/components/PortManagementView.tsx',
        targetToken: '[بخش: مدیریت پورت‌ها | کامپوننت: src/components/PortManagementView.tsx | مرحله: فرم تنظیمات پورت و ویلن]',
      },
      {
        id: 'port_preview_modal',
        stepNumber: 3,
        titleEn: 'Configuration Preview & Confirmation Modal',
        titleFa: 'پنجره پیش‌نمایش و مقایسه دستورات سیسکو',
        descEn: 'Shows destination device, interface, current vs proposed VLAN diff, and exact Cisco CLI commands ready for execution.',
        descFa: 'پنجره تایید باز شده و نام دستگاه، اینترفیس، تفاوت ویلن فعلی با جدید و بلوک دستورات واقعی سیسکو را قبل از اجرا به کاربر نشان می‌دهد.',
        component: 'PortManagementView.tsx (Preview & Confirm Modal)',
        componentPath: 'src/components/PortManagementView.tsx',
        targetToken: '[بخش: مدیریت پورت‌ها | کامپوننت: src/components/PortManagementView.tsx | مرحله: پنجره تایید و پیش‌نمایش دستورات سیسکو]',
      },
      {
        id: 'port_ssh_execution',
        stepNumber: 4,
        titleEn: 'Direct Real Cisco Switch SSH Execution',
        titleFa: 'ارسال مستقیم دستورات به سوئیچ سیسکو از طریق SSH',
        descEn: 'Dispatches payload to backend SSH engine. Backend acquires SSH session to real hardware, pushes interface commands, verifies execution, and writes to memory.',
        descFa: 'درخواست به سرور ارسال شده و موتور SSH سیسکو با ورود به enable mode و configure terminal دستورات interface را روی سوئیچ فیزیکی اعمال و نتیجه را اعتبارسنجی می‌کند.',
        component: 'api.ts -> server.ts -> server/sshManager.ts',
        componentPath: 'server/sshManager.ts',
        apiEndpoint: '/api/ssh/apply-port-config',
        apiMethod: 'POST',
        hardwareLayer: 'Real Cisco Catalyst Switch Physical Port Interface',
        targetToken: '[بخش: مدیریت پورت‌ها | اندپوینت: POST /api/ssh/apply-port-config | فایل: server/sshManager.ts | مرحله: اجرای مستقیم SSH روی سوئیچ واقعی]',
      },
      {
        id: 'port_state_sync',
        stepNumber: 5,
        titleEn: 'State Synchronization & Port Re-read',
        titleFa: 'همگام‌سازی وضعیت و بارگذاری مجدد پورت‌ها',
        descEn: 'On successful hardware confirmation, updates local state, refreshes port inventory, updates status badges, and displays success notification.',
        descFa: 'پس از تایید موفقیت از سوی سوئیچ، وضعیت پورت در فرانت‌اند به‌روزرسانی شده، ویلن جدید اعمال و اعلان موفقیت نمایش داده می‌شود.',
        component: 'PortManagementView.tsx (loadDevicePorts & State Sync)',
        componentPath: 'src/components/PortManagementView.tsx',
        targetToken: '[بخش: مدیریت پورت‌ها | کامپوننت: src/components/PortManagementView.tsx | مرحله: همگام‌سازی استیت و وضعیت پورت]',
      },
    ],
  },
  dashboard: {
    tabId: 'dashboard',
    nameEn: 'Executive Network Dashboard',
    nameFa: 'داشبورد جامع وضعیت و تله‌متری شبکه',
    subtitleEn: 'Real-time telemetry, device health monitoring, traffic graphs, and quick actions',
    subtitleFa: 'پایش بلادرنگ سلامت سوئیچ‌ها، پورت‌های فعال، نمودارهای ترافیک و پینگ سراسری',
    icon: Activity,
    primaryComponent: 'DashboardView.tsx',
    primaryFilePath: 'src/components/DashboardView.tsx',
    colorScheme: {
      accent: 'text-indigo-400',
      border: 'border-indigo-500/40',
      bg: 'bg-indigo-500/10',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    steps: [
      {
        id: 'dash_data_fetch',
        stepNumber: 1,
        titleEn: 'Network Devices & Topology Ingestion',
        titleFa: 'بارگذاری اطلاعات تجهیزات و پیوندهای توپولوژی',
        descEn: 'Initial loading of registered switches, routers, and active CDP/LLDP topology links from API server.',
        descFa: 'بارگذاری اولیه مشخصات تمام سوئیچ‌ها، وضعیت آنلاین/آفلاین و کابل‌های ارتباطی از سرور بک‌اند.',
        component: 'App.tsx -> DashboardView.tsx',
        componentPath: 'src/components/DashboardView.tsx',
        apiEndpoint: '/api/devices & /api/topology',
        apiMethod: 'GET',
        targetToken: '[بخش: داشبورد | فایل: src/components/DashboardView.tsx | مرحله: بارگذاری تجهیزات و توپولوژی | API: GET /api/devices]',
      },
      {
        id: 'dash_kpis',
        stepNumber: 2,
        titleEn: 'High-Level KPI Statistics Calculation',
        titleFa: 'محاسبه شاخص‌های کلیدی (KPIs)',
        descEn: 'Computes total devices, online/offline count, total operational ports, and core latency metrics for visual summary cards.',
        descFa: 'محاسبه تعداد دستگاه‌ها، سوئیچ‌های فعال، پورت‌های UP، و پیوندهای همسایگی در کارت‌های آماری بالای داشبورد.',
        component: 'DashboardView.tsx (KPI Stat Cards)',
        componentPath: 'src/components/DashboardView.tsx',
        targetToken: '[بخش: داشبورد | فایل: src/components/DashboardView.tsx | مرحله: کارت‌های آماری و شاخص‌های کلیدی]',
      },
      {
        id: 'dash_charts',
        stepNumber: 3,
        titleEn: 'Real-Time Telemetry & Latency Graphs',
        titleFa: 'نمودارهای پایش تاخیر و ترافیک شبکه',
        descEn: 'Renders Recharts dynamic time-series charts displaying ICMP round-trip latency and interface bandwidth utilization.',
        descFa: 'رندر نمودارهای سری زمانی با استفاده از Recharts جهت پایش تاخیر پینگ میلی‌ثانیه‌ای و ترافیک شبکه.',
        component: 'MetricTrendChart.tsx',
        componentPath: 'src/components/MetricTrendChart.tsx',
        targetToken: '[بخش: داشبورد | فایل: src/components/MetricTrendChart.tsx | مرحله: نمودارهای بلادرنگ تاخیر و ترافیک]',
      },
      {
        id: 'dash_ping_all',
        stepNumber: 4,
        titleEn: 'Concurrent ICMP Live Ping',
        titleFa: 'پینگ همزمان و ارزیابی در دسترس بودن (Ping All)',
        descEn: 'Pings all managed switches in parallel via backend ICMP socket and updates latency badges instantly.',
        descFa: 'ارسال دستور پینگ همزمان به تمام سوئیچ‌ها از طریق سوکت سیستم‌عامل سرور و به‌روزرسانی آنی زمان پاسخ‌دهی.',
        component: 'Navbar.tsx / DashboardView.tsx (handleRefreshAll)',
        componentPath: 'src/services/api.ts',
        apiEndpoint: '/api/devices/ping-all',
        apiMethod: 'POST',
        targetToken: '[بخش: داشبورد | فایل: src/components/DashboardView.tsx | مرحله: پینگ زنده تمام سوئیچ‌ها | API: POST /api/devices/ping-all]',
      },
    ],
  },
  devices: {
    tabId: 'devices',
    nameEn: 'Device & Switch Inventory Management',
    nameFa: 'مدیریت و لیست جامع تجهیزات شبکه',
    subtitleEn: 'Register, edit, delete, ping, and connect to Cisco/MikroTik devices via terminal or scanner',
    subtitleFa: 'ثبت، ویرایش، حذف، پینگ، اتصال به ترمینال SSH و اسکن خودکار ساب‌نت‌های محلی',
    icon: Server,
    primaryComponent: 'DeviceListView.tsx',
    primaryFilePath: 'src/components/DeviceListView.tsx',
    colorScheme: {
      accent: 'text-emerald-400',
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-500/10',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    steps: [
      {
        id: 'dev_table_render',
        stepNumber: 1,
        titleEn: 'Device Inventory Table & Filter Engine',
        titleFa: 'جدول تجهیزات و فیلتر جستجوی چندمنظوره',
        descEn: 'Displays switch vendor badges (Cisco, MikroTik, Generic), IP address, model, location, and active port counts with instant text search.',
        descFa: 'نمایش نشان سازنده، آدرس IP، مدل سوئیچ، موقعیت رک و پورت‌های فعال با قابلیت جستجوی متنی بلادرنگ.',
        component: 'DeviceListView.tsx (Device Table)',
        componentPath: 'src/components/DeviceListView.tsx',
        targetToken: '[بخش: لیست تجهیزات | فایل: src/components/DeviceListView.tsx | مرحله: جدول نمایش و فیلتر جستجوی سوئیچ‌ها]',
      },
      {
        id: 'dev_add_modal',
        stepNumber: 2,
        titleEn: 'Register New Network Switch Modal',
        titleFa: 'پنجره ثبت سوئیچ جدید در شبکه',
        descEn: 'Interactive modal collecting IP, hostname, vendor, credentials, total ports, and SNMP community string.',
        descFa: 'فرم ورود مشخصات سوئیچ جدید شامل نام، آدرس IP، تعداد پورت‌ها و اعتبارسنجی ورود SSH/SNMP.',
        component: 'AddDeviceModal.tsx',
        componentPath: 'src/components/AddDeviceModal.tsx',
        apiEndpoint: '/api/devices',
        apiMethod: 'POST',
        targetToken: '[بخش: لیست تجهیزات | فایل: src/components/AddDeviceModal.tsx | مرحله: فرم افزودن سوئیچ جدید | API: POST /api/devices]',
      },
      {
        id: 'dev_ssh_terminal',
        stepNumber: 3,
        titleEn: 'Integrated Cisco Web SSH Terminal',
        titleFa: 'ترمینال وب مستقیم SSH سیسکو',
        descEn: 'Direct real-time Cisco CLI shell session in browser with command history, Cisco auto-complete, and VT100 emulation.',
        descFa: 'برقراری سشن زنده خط فرمان سیسکو در مرورگر با پشتیبانی از کلیدهای میانبر، تاریخچه دستورات و پروتکل SSH.',
        component: 'CiscoTerminalModal.tsx',
        componentPath: 'src/components/CiscoTerminalModal.tsx',
        apiEndpoint: '/api/ssh/execute',
        apiMethod: 'POST',
        hardwareLayer: 'Cisco IOS CLI VTY Terminal',
        targetToken: '[بخش: لیست تجهیزات | فایل: src/components/CiscoTerminalModal.tsx | مرحله: ترمینال تحت وب SSH سیسکو]',
      },
      {
        id: 'dev_write_mem',
        stepNumber: 4,
        titleEn: 'Save Running Config to NVRAM (write memory)',
        titleFa: 'ذخیره دائمی کانفیگ روی حافظه NVRAM سوئیچ',
        descEn: 'Dispatches Cisco write memory / copy running-config startup-config to ensure changes survive power loss.',
        descFa: 'ارسال دستور write memory به سوئیچ جهت ذخیره تنظیمات در حافظه دائمی استارتاپ NVRAM.',
        component: 'DeviceListView.tsx (handleWriteMemory)',
        componentPath: 'src/services/api.ts',
        apiEndpoint: '/api/devices/:id/write-memory',
        apiMethod: 'POST',
        targetToken: '[بخش: لیست تجهیزات | فایل: src/components/DeviceListView.tsx | مرحله: ذخیره کانفیگ NVRAM (write memory) | API: POST /api/devices/:id/write-memory]',
      },
      {
        id: 'dev_lan_scanner',
        stepNumber: 5,
        titleEn: 'Subnet ARP/Ping Scanner',
        titleFa: 'اسکنر خودکار ساب‌نت محلی LAN',
        descEn: 'Scans target CIDR subnet (e.g. 192.168.1.0/24) via socket ARP/Ping to discover active unmanaged switches and auto-import them.',
        descFa: 'اسکن بازه شبکه محلی جهت شناسایی سوئیچ‌های متصل و ایمپورت مستقیم آنها در سیستم.',
        component: 'LanScannerModal.tsx',
        componentPath: 'src/components/LanScannerModal.tsx',
        apiEndpoint: '/api/lan/scan',
        apiMethod: 'POST',
        targetToken: '[بخش: لیست تجهیزات | فایل: src/components/LanScannerModal.tsx | مرحله: اسکنر ساب‌نت محلی | API: POST /api/lan/scan]',
      },
    ],
  },
  schematic: {
    tabId: 'schematic',
    nameEn: 'Schematic Layer-2 Topology Canvas',
    nameFa: 'نقشه تعاملی توپولوژی لایه ۲ و همسایگی',
    subtitleEn: 'Interactive matrix graph, draggable nodes, port-to-port cable visualization, and NOC fullscreen mode',
    subtitleFa: 'رندر گرافیکی اتصالات شبکه، درگ گره‌ها، کابل‌های متصل‌کننده پورت‌ها و حالت مانیتورینگ تمام‌صفحه',
    icon: Network,
    primaryComponent: 'SchematicTopologyView.tsx',
    primaryFilePath: 'src/components/SchematicTopologyView.tsx',
    colorScheme: {
      accent: 'text-purple-400',
      border: 'border-purple-500/40',
      bg: 'bg-purple-500/10',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    steps: [
      {
        id: 'topo_svg_canvas',
        stepNumber: 1,
        titleEn: 'Interactive Topology Vector Canvas',
        titleFa: 'بوم وکتور توپولوژی با زوم و جابجایی',
        descEn: 'High-performance interactive SVG grid with smooth zoom, pan, device dragging, and automatic link routing.',
        descFa: 'بوم برداری هوشمند با قابلیت زوم، حرکت روی نقشه، جابجایی سوئیچ‌ها و رسم خطوط اتصال کابل‌ها.',
        component: 'SchematicTopologyView.tsx (SVG Canvas)',
        componentPath: 'src/components/SchematicTopologyView.tsx',
        targetToken: '[بخش: نقشه توپولوژی | فایل: src/components/SchematicTopologyView.tsx | مرحله: بوم گراف لایه ۲ و وکتور SVG]',
      },
      {
        id: 'topo_link_inspector',
        stepNumber: 2,
        titleEn: 'Cable & Neighbor Link Inspector Drawer',
        titleFa: 'پنل بررسی اطلاعات کابل و پورت‌های متصل',
        descEn: 'Clicking any cable displays source port, destination port, bandwidth, duplex mode, and discovery protocol (CDP v2 / LLDP).',
        descFa: 'کلیک روی کابل جهت نمایش پورت مبدا، پورت مقصد، پهنای باند، حالت ترانک و پروتکل همسایگی.',
        component: 'SchematicTopologyView.tsx (Link Details Drawer)',
        componentPath: 'src/components/SchematicTopologyView.tsx',
        targetToken: '[بخش: نقشه توپولوژی | فایل: src/components/SchematicTopologyView.tsx | مرحله: پنل بررسی کابل و پورت‌های لینک]',
      },
      {
        id: 'topo_device_actions',
        stepNumber: 3,
        titleEn: 'Contextual Switch Action Menu',
        titleFa: 'منوی عملیات سریع روی سوئیچ‌های نقشه',
        descEn: 'Right-click or node menu providing direct access to Port Faceplate, Web SSH Terminal, and Live Ping.',
        descFa: 'دسترسی سریع از روی نقشه به فیس‌پلیت پورت‌ها، اتصال به ترمینال SSH و ارسال پینگ به سوئیچ.',
        component: 'SchematicTopologyView.tsx (Node Context Menu)',
        componentPath: 'src/components/SchematicTopologyView.tsx',
        targetToken: '[بخش: نقشه توپولوژی | فایل: src/components/SchematicTopologyView.tsx | مرحله: منوی عملیات سریع سوئیچ]',
      },
      {
        id: 'topo_fullscreen_noc',
        stepNumber: 4,
        titleEn: 'NOC Room Fullscreen Canvas Mode',
        titleFa: 'حالت تمام‌صفحه مانیتورینگ اتاق عملیات شبکه (NOC)',
        descEn: 'Toggles full-viewport canvas mode, hiding header and sidebars to dedicate 100% display area to topology monitoring.',
        descFa: 'انتقال به حالت تمام‌صفحه بدون منو و سایدبار جهت نمایش روی مانیتورهای بزرگ اتاق مانیتورینگ NOC.',
        component: 'App.tsx (isTopologyFullscreen)',
        componentPath: 'src/App.tsx',
        targetToken: '[بخش: نقشه توپولوژی | فایل: src/App.tsx | مرحله: حالت فول‌اسکرین NOC | متغیر: isTopologyFullscreen]',
      },
    ],
  },
  templates: {
    tabId: 'templates',
    nameEn: 'Configuration Templates & Automation',
    nameFa: 'الگوهای پیکربندی و اتوماسیون سیسکو',
    subtitleEn: 'Pre-built Jinja2 Cisco templates (VLANs, OSPF, Port Security, ACL) with variable injector and batch push',
    subtitleFa: 'الگوهای آماده کانفیگ سیسکو با تزریق هوشمند متغیرها، پیش‌نمایش کد و ارسال گروهی از طریق SSH',
    icon: Code2,
    primaryComponent: 'TemplateManagementView.tsx',
    primaryFilePath: 'src/components/TemplateManagementView.tsx',
    colorScheme: {
      accent: 'text-amber-400',
      border: 'border-amber-500/40',
      bg: 'bg-amber-500/10',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    steps: [
      {
        id: 'tpl_library',
        stepNumber: 1,
        titleEn: 'Template Library & Categories',
        titleFa: 'کتابخانه الگوهای آماده و دسته‌بندی موضوعی',
        descEn: 'Categorized repository of production templates: VLAN creation, Port Security hardening, OSPF routing, and Access Lists.',
        descFa: 'آرشیو الگوهای عملیاتی در دسته‌های تعریف ویلن، امنیت پورت، مسیریابی OSPF و کنترل دسترسی ACL.',
        component: 'TemplateManagementView.tsx (Templates Grid)',
        componentPath: 'src/components/TemplateManagementView.tsx',
        apiEndpoint: '/api/templates',
        apiMethod: 'GET',
        targetToken: '[بخش: الگوهای پیکربندی | فایل: src/components/TemplateManagementView.tsx | مرحله: کتابخانه الگوها | API: GET /api/templates]',
      },
      {
        id: 'tpl_var_injector',
        stepNumber: 2,
        titleEn: 'Variable Extraction & Dynamic Form',
        titleFa: 'استخراج هوشمند متغیرها و فرم ورودی',
        descEn: 'Automatically detects variables formatted as {{variable_name}} and renders input fields with instant syntax preview.',
        descFa: 'تشخیص خودکار متغیرهای الگو (نظیر {{vlan_id}} یا {{interface}}) و ساخت فرم پویا برای مقداردهی کاربر.',
        component: 'TemplateManagementView.tsx / ApplyTemplateModal.tsx',
        componentPath: 'src/components/ApplyTemplateModal.tsx',
        targetToken: '[بخش: الگوهای پیکربندی | فایل: src/components/ApplyTemplateModal.tsx | مرحله: فرم مقداردهی متغیرهای الگو]',
      },
      {
        id: 'tpl_cli_preview',
        stepNumber: 3,
        titleEn: 'Live Cisco CLI Code Generation Preview',
        titleFa: 'پیش‌نمایش زنده کدهای خط فرمان سیسکو',
        descEn: 'Real-time rendering of the rendered configuration script with Cisco IOS syntax highlighting before deployment.',
        descFa: 'مشاهده متن کامل دستورات تولید شده با هایلایت استاندارد سیسکو قبل از اعمال روی تجهیز.',
        component: 'TemplateManagementView.tsx (CLI Code Preview)',
        componentPath: 'src/components/TemplateManagementView.tsx',
        targetToken: '[بخش: الگوهای پیکربندی | فایل: src/components/TemplateManagementView.tsx | مرحله: پیش‌نمایش کدهای خط فرمان سیسکو]',
      },
      {
        id: 'tpl_ssh_push',
        stepNumber: 4,
        titleEn: 'SSH Batch Deployment to Switch',
        titleFa: 'ارسال و اعمال اتوماتیک الگو از طریق SSH',
        descEn: 'Pushes the rendered configuration lines directly into the switch configure terminal session via backend automation engine.',
        descFa: 'ارسال خط به خط دستورات الگو به نشست SSH سوئیچ مقصد و دریافت گزارش تاییدیه یا خطای خروجی.',
        component: 'ApplyTemplateModal.tsx',
        componentPath: 'src/services/api.ts',
        apiEndpoint: '/api/templates/apply',
        apiMethod: 'POST',
        hardwareLayer: 'Cisco IOS Configuration Session',
        targetToken: '[بخش: الگوهای پیکربندی | اندپوینت: POST /api/templates/apply | فایل: src/components/ApplyTemplateModal.tsx | مرحله: اعمال SSH الگو به سوئیچ]',
      },
    ],
  },
  scanner: {
    tabId: 'scanner',
    nameEn: 'CDP & LLDP Neighbor Matrix Scanner',
    nameFa: 'اسکنر پروتکل‌های همسایگی CDP و LLDP',
    subtitleEn: 'Layer-2 neighbor discovery engine, real-time command logging, and topology synchronization',
    subtitleFa: 'موتور اکتشاف همسایگان لایه ۲، نمایش لاگ زنده دستورات و همگام‌سازی با نقشه شبکه',
    icon: Zap,
    primaryComponent: 'CdpLldpScannerView.tsx',
    primaryFilePath: 'src/components/CdpLldpScannerView.tsx',
    colorScheme: {
      accent: 'text-rose-400',
      border: 'border-rose-500/40',
      bg: 'bg-rose-500/10',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    steps: [
      {
        id: 'scan_trigger',
        stepNumber: 1,
        titleEn: 'Initiate CDP/LLDP Discovery Protocol',
        titleFa: 'اجرای دستورات اکتشاف پروتکل‌های CDP و LLDP',
        descEn: 'Executes "show cdp neighbors detail" and "show lldp info remote-device" across connected network switches.',
        descFa: 'اجرای دستورات استاندارد شو سی‌دی‌پی و ال‌ال‌دی‌پی روی سوئیچ‌ها برای استخراج جدول همسایگان متصل.',
        component: 'CdpLldpScannerView.tsx (Scan Button)',
        componentPath: 'src/components/CdpLldpScannerView.tsx',
        apiEndpoint: '/api/topology/scan',
        apiMethod: 'POST',
        hardwareLayer: 'Cisco CDPv2 / IEEE 802.1AB LLDP Engine',
        targetToken: '[بخش: اسکنر CDP/LLDP | فایل: src/components/CdpLldpScannerView.tsx | مرحله: شروع اسکن همسایگی | API: POST /api/topology/scan]',
      },
      {
        id: 'scan_live_logs',
        stepNumber: 2,
        titleEn: 'Live Command Stream & Console Logs',
        titleFa: 'جریان زنده گزارشات و لاگ‌های متنی کنسول',
        descEn: 'Interactive terminal screen displaying raw switch responses, interface parsing status, and link discovery confirmations in real time.',
        descFa: 'نمایش زنده خروجی‌های متنی استخراج شده از سوئیچ‌ها و وضعیت پارس کردن پورت‌ها.',
        component: 'CdpLldpScannerView.tsx (Live Console)',
        componentPath: 'src/components/CdpLldpScannerView.tsx',
        targetToken: '[بخش: اسکنر CDP/LLDP | فایل: src/components/CdpLldpScannerView.tsx | مرحله: لاگ‌های متنی زنده اسکن]',
      },
      {
        id: 'scan_sync_topo',
        stepNumber: 3,
        titleEn: 'Automatic Topology Matrix Synchronization',
        titleFa: 'همگام‌سازی خودکار پیوندهای کشف‌شده با نقشه',
        descEn: 'Merges discovered neighbor links into the central topology store and offers one-click jump to the visual canvas.',
        descFa: 'ذخیره لینک‌های کشف‌شده در پایگاه داده توپولوژی و دکمه هدایت سریع به نقشه شماتیک.',
        component: 'CdpLldpScannerView.tsx (Sync & Navigate)',
        componentPath: 'src/components/CdpLldpScannerView.tsx',
        targetToken: '[بخش: اسکنر CDP/LLDP | فایل: src/components/CdpLldpScannerView.tsx | مرحله: ثبت پیوندها و همگام‌سازی با نقشه توپولوژی]',
      },
    ],
  },
  automation: {
    tabId: 'automation',
    nameEn: 'Network Automation & Orchestration (Cisco & MikroTik)',
    nameFa: 'اتوماسیون، ارکستراسیون و پیکربندی شبکه (سیسکو و میکروتیک)',
    subtitleEn: 'Production-grade deterministic push engine with pre-validation, live previews, snapshots, real SSH, and auto-rollback',
    subtitleFa: 'موتور پوش پیکربندی قطعی با اعتبارسنجی پیشین، پیش‌نمایش دستورات، اسنپ‌شات خودکار، اجرای SSH واقعی و رول‌بک هوشمند',
    icon: Cpu,
    primaryComponent: 'NetworkAutomationView.tsx',
    primaryFilePath: 'src/components/automation/NetworkAutomationView.tsx',
    colorScheme: {
      accent: 'text-violet-400',
      border: 'border-violet-500/40',
      bg: 'bg-violet-500/10',
      badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    },
    steps: [
      {
        id: 'automation_builder',
        stepNumber: 1,
        titleEn: 'Parameter Selection & Template Assembly',
        titleFa: 'انتخاب پارامترها و تدوین الگو',
        descEn: 'Configure routing (OSPF/BGP), switching (802.1Q), VLANs, WireGuard, NAT, or security parameters for Cisco or MikroTik.',
        descFa: 'تنظیم پارامترهای روتینگ، سوئیچینگ، ویلن‌ها، وایرگارد، NAT یا هاردنینگ امنیتی برای تجهیزات سیسکو یا میکروتیک.',
        component: 'NetworkAutomationView.tsx',
        componentPath: 'src/components/automation/NetworkAutomationView.tsx',
        hardwareLayer: 'Cisco IOS / IOS-XE & MikroTik RouterOS CLI Engines',
        targetToken: '[بخش: اتوماسیون شبکه | کامپوننت: src/components/automation/NetworkAutomationView.tsx | مرحله: فرم پارامترها و انتخاب الگو]',
      },
      {
        id: 'automation_preview_backup',
        stepNumber: 2,
        titleEn: 'Dry-Run Preview & Pre-Apply Snapshot',
        titleFa: 'پیش‌نمایش دستورات و اسنپ‌شات پیش از اعمال',
        descEn: 'Evaluates risk level, displays generated CLI commands and diffs, and automatically takes a full running-config backup.',
        descFa: 'ارزیابی ریسک دستورات، نمایش خطوط CLI قبل از ارسال، و ثبت خودکار نسخه پشتیبان پیش از اعمال تغییرات.',
        component: 'AutomationLifecycleModal.tsx',
        componentPath: 'src/components/automation/AutomationLifecycleModal.tsx',
        apiEndpoint: '/api/automation/preview',
        apiMethod: 'POST',
        targetToken: '[بخش: اتوماسیون شبکه | کامپوننت: src/components/automation/AutomationLifecycleModal.tsx | مرحله: پیش‌نمایش و اسنپ‌شات]',
      },
      {
        id: 'automation_apply_verify',
        stepNumber: 3,
        titleEn: 'Real SSH Push, Verification & Rollback Protection',
        titleFa: 'ارسال واقعی SSH، تایید برخط و محافظت با رول‌بک',
        descEn: 'Executes commands via real SSH, runs post-apply show verification checks, and triggers auto-rollback if anomalies are detected.',
        descFa: 'ارسال دستورات از طریق SSH واقعی، بررسی وضعیت خروجی show و فعال‌سازی خودکار بازگردانی (Rollback) در صورت بروز خطا.',
        component: 'AutomationLifecycleModal.tsx',
        componentPath: 'src/components/automation/AutomationLifecycleModal.tsx',
        apiEndpoint: '/api/automation/apply',
        apiMethod: 'POST',
        hardwareLayer: 'Live SSH Transport (port 22) to Target Network Appliance',
        targetToken: '[بخش: اتوماسیون شبکه | کامپوننت: src/components/automation/AutomationLifecycleModal.tsx | مرحله: اعمال SSH و تایید]',
      },
    ],
  },
  'remote-test': {
    tabId: 'remote-test',
    nameEn: 'Remote Test (Windows Remote Desktop / RDP)',
    nameFa: 'تست ریموت و ارتباط زنده با ویندوز از طریق RDP',
    subtitleEn: 'Browser-based Windows Remote Desktop powered by Apache Guacamole & guacd daemon',
    subtitleFa: 'ریموت دسکتاپ مرورگری ویندوز مبتنی بر Apache Guacamole و پروکسی guacd',
    icon: Monitor,
    primaryComponent: 'RemoteDesktopView.tsx',
    primaryFilePath: 'src/components/remoteDesktop/RemoteDesktopView.tsx',
    colorScheme: {
      accent: 'text-sky-400',
      border: 'border-sky-500/40',
      bg: 'bg-sky-500/10',
      badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    },
    steps: [
      {
        id: 'rdp_inventory',
        stepNumber: 1,
        titleEn: 'Windows Remote Inventory & Diagnostic Test',
        titleFa: 'مدیریت ماشین‌های ویندوز و تست زنده اتصال RDP',
        descEn: 'Configure Windows hosts (IP, RDP port 3389, credentials) with live diagnostic probing and encrypted password vault.',
        descFa: 'تنظیم ماشین‌های ویندوز با اعتبارسنجی زنده پورت RDP و رمزنگاری کلیدهای دسترسی در سرور.',
        component: 'AddRemoteDeviceModal.tsx & RemoteDesktopView.tsx',
        componentPath: 'src/components/remoteDesktop/AddRemoteDeviceModal.tsx',
        apiEndpoint: '/api/remote-test/devices',
        apiMethod: 'POST',
        hardwareLayer: 'Windows Machine (TCP 3389 / RDP)',
        targetToken: '[بخش: تست ریموت | کامپوننت: src/components/remoteDesktop/RemoteDesktopView.tsx | مرحله: مدیریت ماشین و تست اتصال]',
      },
      {
        id: 'rdp_session',
        stepNumber: 2,
        titleEn: 'Interactive HTML5 Canvas RDP Session',
        titleFa: 'سشن زنده و تعاملی ریموت دسکتاپ بر بستر Canvas',
        descEn: 'Full mouse/keyboard/touch interaction, Ctrl+Alt+Del, Windows Key, and bidirectional clipboard sync via Guacamole WebSocket tunnel.',
        descFa: 'ارسال ورودی‌های ماوس، کیبورد و کلیدهای ترکیبی به همراه انتقال کلیپ‌بورد از طریق تونل وب‌سوکت Guacamole.',
        component: 'RemoteDesktopSessionView.tsx',
        componentPath: 'src/components/remoteDesktop/RemoteDesktopSessionView.tsx',
        apiEndpoint: '/ws/remote-desktop',
        apiMethod: 'WS',
        hardwareLayer: 'Apache Guacamole Daemon (guacd:4822) to Windows RDP (3389)',
        targetToken: '[بخش: تست ریموت | کامپوننت: src/components/remoteDesktop/RemoteDesktopSessionView.tsx | مرحله: سشن زنده RDP]',
      },
    ],
  },
};

export const ModuleWorkflowModal: React.FC<ModuleWorkflowModalProps> = ({
  isOpen,
  onClose,
  currentTab,
}) => {
  const { isRtl } = useLanguage();
  const [selectedTab, setSelectedTab] = useState<ActiveTab>(currentTab);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Keep selected tab in sync with current view when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedTab(currentTab);
      setSearchFilter('');
    }
  }, [isOpen, currentTab]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentModule = MODULES_WORKFLOW[selectedTab] || MODULES_WORKFLOW.dashboard;
  const ModuleIcon = currentModule.icon;

  const filteredSteps = currentModule.steps.filter((step) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      step.titleEn.toLowerCase().includes(q) ||
      step.titleFa.toLowerCase().includes(q) ||
      step.descEn.toLowerCase().includes(q) ||
      step.descFa.toLowerCase().includes(q) ||
      step.component.toLowerCase().includes(q) ||
      step.componentPath.toLowerCase().includes(q) ||
      (step.apiEndpoint && step.apiEndpoint.toLowerCase().includes(q))
    );
  });

  const handleCopyTargetToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleCopyFullModuleWorkflow = () => {
    const markdown = `# معماری و جریان‌کاری ماژول: ${currentModule.nameFa} (${currentModule.nameEn})
- شناسه ماژول (Tab ID): ${currentModule.tabId}
- کامپوننت اصلی فرانت‌اند: ${currentModule.primaryComponent}
- مسیر فایل اصلی: ${currentModule.primaryFilePath}
- شرح عملکرد: ${currentModule.subtitleFa}

## مراحل و جریان داده (Workflow Steps):
${currentModule.steps
  .map(
    (step) => `### گام ${step.stepNumber}: ${step.titleFa} (${step.titleEn})
- فایل/کامپوننت: ${step.componentPath} (${step.component})
${step.apiEndpoint ? `- اندپوینت سرویس: ${step.apiMethod || 'API'} ${step.apiEndpoint}` : ''}
${step.hardwareLayer ? `- لایه سخت‌افزار/تجهیز: ${step.hardwareLayer}` : ''}
- توضیح: ${step.descFa}
- توکن درخواست تغییر: ${step.targetToken}
`
  )
  .join('\n')}
`;
    navigator.clipboard.writeText(markdown);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 modal-backdrop-blur"
      data-modal-backdrop="true"
      onClick={onClose}
    >
      <div
        className="spatial-glass border border-cyan-500/30 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)]">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  <span>{isRtl ? 'نقشه معماری و جریان‌کاری ماژول‌ها' : 'Module Workflow & Architecture Navigator'}</span>
                  <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    Live Inspector
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isRtl
                  ? 'بررسی جریان داده، فایل‌ها و اندپوینت‌ها برای بیان دقیق درخواست تغییرات به هوش مصنوعی'
                  : 'Inspect UI components, API endpoints, and flow to precisely pinpoint changes'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyFullModuleWorkflow}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-medium transition cursor-pointer active:scale-95"
              title="Copy entire module architecture in Markdown"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? (isRtl ? 'کپی شد!' : 'Copied!') : (isRtl ? 'کپی کل سناریوی ماژول' : 'Copy Full Workflow')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section Tabs Switcher */}
        <div className="px-5 py-3 border-b border-white/10 bg-slate-950/60 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          <span className="text-[11px] font-medium text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            {isRtl ? 'انتخاب ماژول:' : 'Select Module:'}
          </span>
          {(Object.keys(MODULES_WORKFLOW) as ActiveTab[]).map((tabKey) => {
            const mod = MODULES_WORKFLOW[tabKey];
            const isSelected = selectedTab === tabKey;
            const isCurrentView = currentTab === tabKey;
            const IconComponent = mod.icon;
            return (
              <button
                key={tabKey}
                onClick={() => setSelectedTab(tabKey)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,240,255,0.25)] font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <IconComponent className="w-3.5 h-3.5" />
                <span>{isRtl ? mod.nameFa.split(' ')[0] + ' ' + (mod.nameFa.split(' ')[1] || '') : mod.nameEn.split(' ')[0]}</span>
                {isCurrentView && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)] ml-1" title="Currently active view in app" />
                )}
              </button>
            );
          })}
        </div>

        {/* Active Module Highlight Banner */}
        <div className="px-5 py-3 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950/90 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${currentModule.colorScheme.bg} ${currentModule.colorScheme.border} ${currentModule.colorScheme.accent}`}>
              <ModuleIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {isRtl ? currentModule.nameFa : currentModule.nameEn}
                </h3>
                {selectedTab === currentTab && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {isRtl ? 'بخش در حال نمایش' : 'Active View'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                {isRtl ? currentModule.subtitleFa : currentModule.subtitleEn}
              </p>
            </div>
          </div>

          {/* Quick File & Component Tag */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>{currentModule.primaryComponent}</span>
            </div>
          </div>
        </div>

        {/* Search / Filter Steps */}
        <div className="px-5 py-2.5 bg-slate-950/40 border-b border-white/5 flex items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={isRtl ? 'جستجو در مراحل، کامپوننت‌ها یا اندپوینت‌ها...' : 'Filter steps, components, or APIs...'}
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500/50"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="absolute left-2.5 rtl:left-auto rtl:right-2.5 top-2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            <span>{filteredSteps.length} {isRtl ? 'مرحله جریان‌کاری' : 'Workflow Steps'}</span>
          </div>
        </div>

        {/* Scrollable Workflow Steps */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {filteredSteps.map((step, idx) => {
            const isCopied = copiedToken === step.targetToken;
            return (
              <div
                key={step.id}
                className={`relative rounded-xl border p-4 transition ${
                  isCopied
                    ? 'bg-emerald-950/30 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                    : 'bg-white/5 hover:bg-white/[0.07] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  {/* Step Sequence & Content */}
                  <div className="flex items-start gap-3.5 flex-1">
                    {/* Number Badge */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white font-mono font-bold text-xs flex items-center justify-center shadow-[0_0_10px_rgba(0,240,255,0.4)]">
                        {step.stepNumber}
                      </div>
                      {idx < filteredSteps.length - 1 && (
                        <div className="w-0.5 h-full min-h-[28px] bg-gradient-to-b from-cyan-500/40 to-transparent my-1" />
                      )}
                    </div>

                    {/* Step Details */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-white tracking-wide">
                          {isRtl ? step.titleFa : step.titleEn}
                        </h4>
                        <span className="text-xs text-slate-400 font-mono">({step.titleEn})</span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {isRtl ? step.descFa : step.descEn}
                      </p>

                      {/* Technical Architecture Badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-1.5">
                        {/* Component Pill */}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-[11px] font-mono text-indigo-300">
                          <Code2 className="w-3 h-3 text-indigo-400" />
                          <span>{step.componentPath}</span>
                        </span>

                        {/* API Endpoint Pill */}
                        {step.apiEndpoint && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-[11px] font-mono text-cyan-300">
                            <span className="font-bold text-[10px] text-cyan-400 bg-cyan-950/80 px-1 rounded">
                              {step.apiMethod || 'API'}
                            </span>
                            <span>{step.apiEndpoint}</span>
                          </span>
                        )}

                        {/* Hardware Layer Pill */}
                        {step.hardwareLayer && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono text-emerald-300">
                            <Cpu className="w-3 h-3 text-emerald-400" />
                            <span>{step.hardwareLayer}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Copy Prompt Target Button */}
                  <div className="md:self-center shrink-0 pt-2 md:pt-0">
                    <button
                      onClick={() => handleCopyTargetToken(step.targetToken)}
                      className={`w-full md:w-auto flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer active:scale-95 ${
                        isCopied
                          ? 'bg-emerald-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                          : 'bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 hover:text-white shadow-xs'
                      }`}
                      title="Copy this target location to paste into your AI change prompt"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-indigo-400" />}
                      <span>
                        {isCopied
                          ? (isRtl ? 'شناسه کپی شد!' : 'Target Copied!')
                          : (isRtl ? 'کپی شناسه این بخش' : 'Copy Section ID')}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Target Token Code Preview Box */}
                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-2 text-[10px] font-mono text-slate-400 bg-black/30 px-3 py-1.5 rounded-lg">
                  <div className="flex items-center gap-2 truncate">
                    <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="text-slate-400 shrink-0 font-sans">
                      {isRtl ? 'متن ارسالی به پرامپت:' : 'Prompt target token:'}
                    </span>
                    <span className="text-slate-300 truncate select-all">{step.targetToken}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredSteps.length === 0 && (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <HelpCircle className="w-8 h-8 mx-auto text-slate-500 opacity-60" />
              <p className="text-xs">{isRtl ? 'هیچ مرحله‌ای با فیلتر جستجو تطابق نداشت.' : 'No steps matched your filter.'}</p>
            </div>
          )}
        </div>

        {/* Footer Instructions & Status */}
        <div className="px-5 py-3 border-t border-white/10 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px]">
              {isRtl
                ? 'راهنما: با کلیک روی دکمه "کپی شناسه این بخش"، می‌توانید آن را در چت قرار دهید تا دقیقاً بدانیم کدام بخش را تغییر دهیم.'
                : 'Tip: Click "Copy Section ID" and paste it in chat so we pinpoint the exact file and component to modify.'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium transition cursor-pointer self-end sm:self-auto"
          >
            {isRtl ? 'بستن پنجره' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
