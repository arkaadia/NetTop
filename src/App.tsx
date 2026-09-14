import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, ThemeType } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { DeviceListView } from './components/DeviceListView';
import { SchematicTopologyView } from './components/SchematicTopologyView';
import { PortManagementView } from './components/PortManagementView';
import { CdpLldpScannerView } from './components/CdpLldpScannerView';
import { TemplateManagementView } from './components/TemplateManagementView';
import { AddDeviceModal } from './components/AddDeviceModal';
import { PortInspectorModal } from './components/PortInspectorModal';
import { CiscoTerminalModal } from './components/CiscoTerminalModal';
import { RealSshTerminalModal } from './components/RealSshTerminalModal';
import { ApplyTemplateModal } from './components/ApplyTemplateModal';
import { ReleaseNotesModal } from './components/ReleaseNotesModal';
import { LanScannerModal } from './components/LanScannerModal';
import { WindowsInstallerModal } from './components/WindowsInstallerModal';
import { ModuleWorkflowModal } from './components/ModuleWorkflowModal';
import { ComponentWorkflowModal } from './components/ComponentWorkflowModal';
import { useWorkflow } from './context/WorkflowContext';
import { Workflow } from 'lucide-react';
import { APP_VERSION } from './version';
import { Device, TopologyData } from './types';
import {
  fetchDevices,
  fetchTopology,
  addDevice,
  deleteDevice,
  pingAllDevices,
  pingDevice,
  runCdpLldpScan,
  resetDemoData,
  writeMemory
} from './services/api';
import { useLanguage } from './i18n';

export default function App() {
  const { t, isRtl, isEn } = useLanguage();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [devices, setDevices] = useState<Device[]>([]);
  const [topology, setTopology] = useState<TopologyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Theme State (Default to obsidian cyber spatial glass)
  const [panelTheme, setPanelTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem('panel_theme') as ThemeType) || 'obsidian';
  });

  const changeTheme = (newTheme: ThemeType) => {
    setPanelTheme(newTheme);
    localStorage.setItem('panel_theme', newTheme);
    localStorage.setItem('theme_mode', newTheme === 'light' ? 'light' : 'dark');
  };

  // Collapsible sidebar state with local storage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch (e) {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [portInspectorDevice, setPortInspectorDevice] = useState<Device | null>(null);
  const [terminalDevice, setTerminalDevice] = useState<Device | null>(null);
  const [applyTemplateDevice, setApplyTemplateDevice] = useState<Device | null>(null);
  const [applyPreselectedTemplateId, setApplyPreselectedTemplateId] = useState<string | undefined>(undefined);
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);
  const [isLanScannerOpen, setIsLanScannerOpen] = useState(false);
  const [isWindowsInstallerOpen, setIsWindowsInstallerOpen] = useState(false);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);

  const {
    isModuleWorkflowOpen,
    activeModuleTab,
    openModuleWorkflow,
    closeModuleWorkflow,
    setActiveModuleTab: setWorkflowActiveTab
  } = useWorkflow();

  // Sync active tab to workflow context
  useEffect(() => {
    setWorkflowActiveTab(activeTab);
  }, [activeTab, setWorkflowActiveTab]);

  // Fullscreen Topology Mode (Hides Navbar header, sidebar, and footer for 100% canvas view)
  const [isTopologyFullscreen, setIsTopologyFullscreen] = useState(false);

  const toggleTopologyFullscreen = useCallback(() => {
    setIsTopologyFullscreen((prev) => {
      const next = !prev;
      if (next) {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
      return next;
    });
  }, []);

  // Listen for Escape key and browser fullscreen changes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTopologyFullscreen) {
        setIsTopologyFullscreen(false);
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isTopologyFullscreen) {
        setIsTopologyFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isTopologyFullscreen]);

  // Initial load
  const loadData = useCallback(async () => {
    try {
      const [devRes, topoRes] = await Promise.all([
        fetchDevices(),
        fetchTopology(),
      ]);
      setDevices(devRes.devices);
      setTopology(topoRes);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Periodic reachability polling every 30s
  useEffect(() => {
    const timer = setInterval(() => {
      refreshStatusesQuietly();
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const refreshStatusesQuietly = async () => {
    try {
      const devRes = await fetchDevices();
      setDevices(devRes.devices);
    } catch (e) {
      // Quiet fail on periodic ping
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Full manual refresh
  const handleRefreshAll = async () => {
    try {
      setIsRefreshing(true);
      await pingAllDevices();
      await loadData();
      showToast(t('toast_refresh_success'));
    } catch (err: any) {
      showToast(t('toast_refresh_error', { error: err.message }));
    } finally {
      setIsRefreshing(false);
    }
  };

  // Ping single device
  const handlePingDevice = async (id: string) => {
    try {
      const res = await pingDevice(id);
      setDevices((prev) => prev.map((d) => (d.id === id ? res.device : d)));
      const statusLabel = res.device.is_online ? (isEn ? 'Online' : 'آنلاین') : (isEn ? 'Offline' : 'آفلاین');
      showToast(
        t('toast_ping_result', {
          name: res.device.name,
          status: statusLabel,
          latency: res.device.latency_ms ?? 0,
        })
      );
    } catch (err: any) {
      showToast(t('toast_ping_error', { error: err.message }));
    }
  };

  // Run CDP/LLDP scan
  const handleRunScan = async () => {
    try {
      setIsScanning(true);
      const res = await runCdpLldpScan();
      await loadData();
      showToast(isEn ? ((res as any).message_en || t('toast_scan_done')) : (res.message || t('toast_scan_done')));
    } catch (err: any) {
      showToast(t('toast_scan_error', { error: err.message }));
    } finally {
      setIsScanning(false);
    }
  };

  // Add new device
  const handleAddDevice = async (newDev: Partial<Device>) => {
    const res = await addDevice(newDev);
    await loadData();
    showToast(t('toast_device_added', { name: newDev.name || '' }));
    return res.device;
  };

  // Delete device
  const handleDeleteDevice = async (id: string) => {
    try {
      await deleteDevice(id);
      await loadData();
      showToast(t('toast_device_deleted'));
    } catch (err: any) {
      showToast(t('toast_device_delete_error', { error: err.message }));
    }
  };

  // Reset to corporate seed
  const handleResetDemo = async () => {
    if (window.confirm(t('toast_reset_confirm'))) {
      try {
        await resetDemoData();
        await loadData();
        showToast(t('toast_reset_done'));
      } catch (err: any) {
        showToast(t('toast_reset_error', { error: err.message }));
      }
    }
  };

  // Write running-config to startup-config (NVRAM)
  const handleWriteMemory = async (deviceId: string) => {
    try {
      const res = await writeMemory(deviceId);
      await loadData();
      showToast(isEn ? ((res as any).message_en || t('toast_write_mem_success')) : (res.message || t('toast_write_mem_success')));
    } catch (err: any) {
      showToast(t('toast_write_mem_error', { error: err.message }));
    }
  };

  const onlineCount = devices.filter((d) => d.is_online).length;
  const offlineCount = devices.filter((d) => !d.is_online).length;

  return (
    <div
      className={`h-screen min-h-screen max-h-screen relative flex flex-col justify-between theme-${panelTheme} ${
        isRtl ? 'dir-rtl text-right' : 'dir-ltr text-left'
      } font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-300 overflow-hidden`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Dynamic Ambient Glow Background */}
      <div className="ambient-glow-background" />

      {/* Navbar Header (Hidden in Full Mode) */}
      {!isTopologyFullscreen && (
        <Navbar
          onRefreshAll={handleRefreshAll}
          isRefreshing={isRefreshing}
          onQuickScan={handleRunScan}
          isScanning={isScanning}
          onResetDemo={handleResetDemo}
          onlineCount={onlineCount}
          totalDevices={devices.length}
          panelTheme={panelTheme}
          onChangeTheme={changeTheme}
          onOpenReleaseNotes={() => setIsReleaseNotesOpen(true)}
          onOpenLanScanner={() => setIsLanScannerOpen(true)}
          onOpenWindowsInstaller={() => setIsWindowsInstallerOpen(true)}
          onOpenWorkflow={() => setIsWorkflowModalOpen(true)}
        />
      )}

      {/* Main Layout (Sidebar + Content View) */}
      <div className={`flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0 ${isTopologyFullscreen ? 'z-50 h-full w-full p-0 m-0' : 'z-10'}`}>
        {/* Sidebar (Hidden in Full Mode) */}
        {!isTopologyFullscreen && (
          <Sidebar
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setIsTopologyFullscreen(false);
              setActiveTab(tab);
            }}
            devicesCount={devices.length}
            offlineCount={offlineCount}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
            onOpenReleaseNotes={() => setIsReleaseNotesOpen(true)}
          />
        )}

        {/* View Port */}
        <main className={`flex-1 min-h-0 min-w-0 ${isTopologyFullscreen ? 'overflow-hidden h-full w-full p-0 m-0' : 'overflow-y-auto'}`}>
          {activeTab === 'dashboard' && (
            <DashboardView
              devices={devices}
              topology={topology}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onScanCdpLldp={handleRunScan}
              isScanning={isScanning}
              onInspectPorts={(dev) => setPortInspectorDevice(dev)}
              onRefreshAll={handleRefreshAll}
              isRefreshing={isRefreshing}
            />
          )}

          {activeTab === 'devices' && (
            <DeviceListView
              devices={devices}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onPingDevice={handlePingDevice}
              onDeleteDevice={handleDeleteDevice}
              onInspectPorts={(dev) => setPortInspectorDevice(dev)}
              onConnectTerminal={(dev) => setTerminalDevice(dev)}
              onApplyTemplate={(dev) => {
                setApplyTemplateDevice(dev);
                setApplyPreselectedTemplateId(undefined);
              }}
              onWriteMemory={handleWriteMemory}
              onRefreshAll={handleRefreshAll}
              isRefreshing={isRefreshing}
              onOpenLanScanner={() => setIsLanScannerOpen(true)}
              onOpenWindowsInstaller={() => setIsWindowsInstallerOpen(true)}
            />
          )}

          {activeTab === 'templates' && (
            <TemplateManagementView
              devices={devices}
              onDeviceUpdated={loadData}
              onOpenTerminal={(dev) => setTerminalDevice(dev)}
            />
          )}

          {activeTab === 'schematic' && (
            <SchematicTopologyView
              topology={topology}
              loading={loading}
              onRefresh={loadData}
              onScanCdpLldp={handleRunScan}
              isScanning={isScanning}
              onInspectDevice={(dev) => setPortInspectorDevice(dev)}
              onInspectPorts={(dev) => setPortInspectorDevice(dev)}
              onConnectTerminal={(dev) => setTerminalDevice(dev)}
              isFullMode={isTopologyFullscreen}
              onToggleFullMode={toggleTopologyFullscreen}
            />
          )}

          {activeTab === 'ports' && <PortManagementView devices={devices} />}

          {activeTab === 'scanner' && (
            <CdpLldpScannerView onNavigateToTopology={() => setActiveTab('schematic')} />
          )}
        </main>
      </div>

      {/* High Density Cyber Spatial Footer Status Bar (Hidden in Full Mode) */}
      {!isTopologyFullscreen && (
        <footer className="h-8 spatial-glass text-slate-300 flex items-center px-4 lg:px-6 shrink-0 justify-between text-[11px] border-t border-white/10 select-none z-20 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse"></span>
              {t('footer_network_status')} <b className="text-emerald-400 font-mono font-bold">{t('footer_status_nominal')}</b>
            </span>
            <span className="hidden sm:inline text-slate-400">
              {t('footer_core_latency')} <b className="text-cyan-400 font-mono">1.2ms</b>
            </span>
            <span>
              {t('footer_connected_devices')} <b className="text-indigo-400 font-mono font-bold">{onlineCount}</b>/{devices.length}
            </span>
            <span className="hidden md:inline text-slate-400">
              {t('footer_neighbor_engine')} <b className="text-purple-400 font-mono">CDP v2 / LLDP Matrix</b>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Bottom Bar Workflow Button */}
            <button
              onClick={() => setIsWorkflowModalOpen(true)}
              id="bottom-bar-workflow-btn"
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 hover:text-cyan-300 border border-indigo-400/30 transition text-[11px] font-medium shadow-[0_0_8px_rgba(99,102,241,0.25)] cursor-pointer active:scale-95"
              title={t('action_workflow_title')}
            >
              <Workflow className="w-3 h-3 text-indigo-400 animate-pulse" />
              <span className="font-sans">{t('action_workflow')}</span>
              <span className="text-[10px] font-mono text-cyan-300/80 bg-white/5 px-1 rounded uppercase">
                {activeTab}
              </span>
            </button>

            <button
              onClick={() => setIsReleaseNotesOpen(true)}
              className="font-mono text-slate-400 hover:text-cyan-300 text-[10px] hidden sm:flex items-center gap-1.5 transition cursor-pointer"
              title={t('footer_view_release')}
            >
              <span>NetTopology OS</span>
              <span className="text-cyan-400 font-bold bg-white/5 hover:bg-white/10 px-1.5 py-0.2 rounded border border-white/10">
                v{APP_VERSION}
              </span>
            </button>
          </div>
        </footer>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-10 ${isRtl ? 'left-6' : 'right-6'} z-50 spatial-glass border border-indigo-500/50 text-indigo-100 px-4 py-2.5 rounded-xl shadow-[0_0_30px_rgba(99,102,241,0.4)] text-xs flex items-center gap-3 backdrop-blur-2xl animate-fadeIn`}>
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white mr-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Add Device Modal */}
      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddDevice}
        onDeviceCreatedWithTemplate={(createdDevice, templateId) => {
          setApplyTemplateDevice(createdDevice);
          setApplyPreselectedTemplateId(templateId);
        }}
      />

      {/* Apply Template Interactive Modal */}
      <ApplyTemplateModal
        isOpen={!!applyTemplateDevice}
        onClose={() => {
          setApplyTemplateDevice(null);
          setApplyPreselectedTemplateId(undefined);
        }}
        targetDevice={applyTemplateDevice}
        allDevices={devices}
        preselectedTemplateId={applyPreselectedTemplateId}
        onApplied={(updatedDevice) => {
          loadData();
          showToast(t('toast_template_applied', { name: updatedDevice.name }));
        }}
      />

      {/* Port Inspector Modal */}
      <PortInspectorModal
        device={portInspectorDevice}
        isOpen={!!portInspectorDevice}
        onClose={() => setPortInspectorDevice(null)}
        onPortUpdated={loadData}
        onConnectTerminal={(dev) => setTerminalDevice(dev)}
        onWriteMemory={handleWriteMemory}
      />

      {/* Cisco Real SSH Hardware Terminal Modal (Port 22 with WebSocket Gateway) */}
      <RealSshTerminalModal
        device={terminalDevice}
        isOpen={!!terminalDevice}
        onClose={() => setTerminalDevice(null)}
        initialHost={terminalDevice?.ip}
        initialPort={terminalDevice?.ssh_port || 22}
        initialUsername={terminalDevice?.ssh_username || 'admin'}
        initialPassword={terminalDevice?.ssh_password || ''}
        initialEnablePassword={terminalDevice?.enable_password || ''}
        autoConnect={true}
        onDeviceUpdated={loadData}
      />

      {/* Release Notes & Version History Modal */}
      <ReleaseNotesModal
        isOpen={isReleaseNotesOpen}
        onClose={() => setIsReleaseNotesOpen(false)}
      />

      {/* LAN Subnet Scanner Modal */}
      <LanScannerModal
        isOpen={isLanScannerOpen}
        onClose={() => setIsLanScannerOpen(false)}
        onDeviceImported={(dev) => {
          loadData();
          showToast(`دستگاه ${dev.name} با موفقیت به توپولوژی اضافه گردید`);
        }}
        onOpenTerminalForIp={(ip, name) => {
          const match = devices.find((d) => d.ip === ip);
          if (match) {
            setTerminalDevice(match);
          } else {
            setTerminalDevice({
              id: `temp-${ip}`,
              name: name || `Switch-${ip}`,
              ip: ip,
              type: 'switch',
              role: 'Access Switch',
              model: 'Cisco Switch',
              mac: '00:00:00:00:00:00',
              building: '',
              floor: '',
              unit: '',
              is_online: true,
              cdp_enabled: true,
              lldp_enabled: true,
              total_ports: 24,
              ssh_port: 22
            });
          }
        }}
      />

      {/* Windows Python Setup & Installer Modal */}
      <WindowsInstallerModal
        isOpen={isWindowsInstallerOpen}
        onClose={() => setIsWindowsInstallerOpen(false)}
      />

      {/* Floating Bottom Quick Action Button for Section Workflow */}
      {!isTopologyFullscreen && (
        <button
          onClick={() => openModuleWorkflow(activeTab)}
          id="floating-workflow-dock-btn"
          className={`fixed bottom-12 ${isRtl ? 'right-4 sm:right-6' : 'left-4 sm:left-6'} z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl spatial-glass border border-cyan-500/40 text-cyan-300 hover:text-white bg-slate-950/85 hover:bg-cyan-950/70 shadow-[0_10px_30px_rgba(0,0,0,0.7),0_0_20px_rgba(0,240,255,0.25)] transition-all duration-300 cursor-pointer active:scale-95 group backdrop-blur-2xl`}
          title={t('action_workflow_title')}
        >
          <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400 group-hover:rotate-12 transition shadow-[0_0_8px_rgba(0,240,255,0.4)]">
            <Workflow className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col text-left rtl:text-right pr-0.5 rtl:pr-0 rtl:pl-0.5">
            <span className="text-[11px] font-bold text-white leading-tight flex items-center gap-1.5">
              <span>{t('action_workflow')}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
            </span>
            <span className="text-[9px] font-mono text-cyan-400 font-medium uppercase">
              {activeTab} module
            </span>
          </div>
        </button>
      )}

      {/* Component Workflow Modal (Universal for all individual modals & cards) */}
      <ComponentWorkflowModal />

      {/* Module Workflow & Architecture Navigator Modal */}
      <ModuleWorkflowModal
        isOpen={isWorkflowModalOpen || isModuleWorkflowOpen}
        onClose={() => {
          setIsWorkflowModalOpen(false);
          closeModuleWorkflow();
        }}
        currentTab={activeModuleTab || activeTab}
      />
    </div>
  );
}
