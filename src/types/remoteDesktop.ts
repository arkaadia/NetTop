export type RemoteDeviceStatus = 'Ready' | 'Online' | 'Offline' | 'Connecting' | 'Connected' | 'Error';

export interface RemoteDevice {
  id: string;
  name: string;
  hostname: string;
  port: number;
  username: string;
  domain?: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  last_connected_at?: string | null;
  connection_status: RemoteDeviceStatus;
  last_error?: string | null;
  latency_ms?: number | null;
  has_password?: boolean;
}

export interface RemoteDeviceFormData {
  name: string;
  hostname: string;
  port: number;
  username: string;
  password?: string;
  domain?: string;
  enabled?: boolean;
}

export interface RemoteDeviceTestResult {
  success: boolean;
  status: 'reachable_open' | 'auth_failed' | 'auth_success' | 'timeout' | 'host_unreachable';
  message: string;
  latency_ms?: number | null;
  details?: {
    tcp_open?: boolean;
    rdp_negotiated?: boolean;
    rdp_protocol?: string;
    tls_verified?: boolean;
    cipher?: string;
    guacd_available?: boolean;
    guacd_endpoint?: string;
    error?: string;
    dns_failed?: boolean;
    timeout?: boolean;
  };
}

export interface RemoteSessionResponse {
  session_id: string;
  token: string;
  websocket_url: string;
  device: RemoteDevice;
  expires_in_sec: number;
}
