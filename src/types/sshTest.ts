export type SshAuthType = 'password' | 'key';
export type SshDeviceType = 'linux' | 'cisco_ios' | 'mikrotik' | 'generic';
export type SshDeviceStatus = 'Ready' | 'Online' | 'Offline' | 'Error' | 'Connecting';

export interface SshNetworkInterface {
  name: string;
  ip: string;
  status: string;
  mac?: string;
}

export interface SshSystemSpecs {
  ram_total_mb?: string;
  ram_used_mb?: string;
  ram_free_mb?: string;
  disk_size?: string;
  disk_used?: string;
  disk_avail?: string;
  disk_usage_pct?: string;
  cpu_model?: string;
  board_name?: string;
}

export interface SshFetchedData {
  os_type: string;
  hostname: string;
  kernel: string;
  os_version: string;
  uptime: string;
  interfaces: SshNetworkInterface[];
  specs: SshSystemSpecs;
  raw_outputs: Record<string, string>;
  fetched_at: string;
  execution_time_ms: number;
  paramiko_version: string;
}

export interface SshTestDevice {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: SshAuthType;
  device_type: SshDeviceType;
  pty_type: string;
  description: string;
  status: SshDeviceStatus;
  last_connected_at?: string | null;
  last_latency_ms?: number | null;
  last_error?: string | null;
  last_fetched_at?: string | null;
  fetched_data?: SshFetchedData | null;
  created_at: string;
  updated_at: string;
  has_password: boolean;
  has_key: boolean;
}

export interface DiagnosticStep {
  layer_id: string;
  title_fa: string;
  title_en: string;
  status: 'passed' | 'warning' | 'failed' | 'running';
  latency_ms?: number;
  details?: string;
  details_fa?: string;
  details_en?: string;
  error?: string;
  remediation_fa?: string;
  remediation_en?: string;
}

export interface DiagnosticReport {
  overall_status: 'passed' | 'warning' | 'failed';
  failed_at_layer?: string | null;
  resolved_ip?: string;
  banner?: string;
  steps: DiagnosticStep[];
  target_host: string;
  target_port: number;
  summary_fa?: string;
  summary_en?: string;
}

export interface SshHealthStatus {
  service: string;
  version: string;
  paramiko_version: string;
  status: string;
  devices_count: number;
}
