import {
  RemoteDevice,
  RemoteDeviceFormData,
  RemoteDeviceTestResult,
  RemoteSessionResponse
} from '../types/remoteDesktop';

/**
 * Fetch all registered Windows machines in the Remote Test inventory
 */
export async function fetchRemoteDevices(): Promise<RemoteDevice[]> {
  const res = await fetch('/api/remote-test/devices');
  if (!res.ok) {
    throw new Error(`Failed to fetch remote devices (${res.status})`);
  }
  const data = await res.json();
  return data.devices || [];
}

/**
 * Register a new Windows machine in the Remote Test inventory
 */
export async function createRemoteDevice(formData: RemoteDeviceFormData): Promise<RemoteDevice> {
  const res = await fetch('/api/remote-test/devices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.detail || 'Failed to create remote device');
  }
  return data.device;
}

/**
 * Update an existing Windows machine
 */
export async function updateRemoteDevice(
  id: string,
  formData: Partial<RemoteDeviceFormData>
): Promise<RemoteDevice> {
  const res = await fetch(`/api/remote-test/devices/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.detail || 'Failed to update remote device');
  }
  return data.device;
}

/**
 * Delete a Windows machine from inventory
 */
export async function deleteRemoteDevice(id: string): Promise<boolean> {
  const res = await fetch(`/api/remote-test/devices/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete device');
  }
  return true;
}

/**
 * Perform real RDP connectivity diagnostic test on a registered machine
 */
export async function testDeviceConnection(id: string): Promise<RemoteDeviceTestResult> {
  const res = await fetch(`/api/remote-test/devices/${encodeURIComponent(id)}/test`, {
    method: 'POST'
  });
  const data = await res.json();
  return data;
}

/**
 * Perform real RDP connectivity diagnostic test with ad-hoc credentials in Add/Edit modal
 */
export async function testAdhocConnection(formData: RemoteDeviceFormData): Promise<RemoteDeviceTestResult> {
  const res = await fetch('/api/remote-test/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hostname: formData.hostname,
      port: formData.port || 3389,
      username: formData.username,
      password: formData.password || '',
      domain: formData.domain || ''
    })
  });
  const data = await res.json();
  return data;
}

/**
 * Authorize and initialize a Guacamole RDP connection session
 */
export async function connectRemoteDevice(id: string): Promise<RemoteSessionResponse> {
  const res = await fetch(`/api/remote-test/devices/${encodeURIComponent(id)}/connect`, {
    method: 'POST'
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.detail || 'Failed to initialize RDP session');
  }
  return data;
}

/**
 * Cleanly terminate a Guacamole session
 */
export async function disconnectSession(sessionId: string, deviceId?: string): Promise<void> {
  await fetch(`/api/remote-test/sessions/${encodeURIComponent(sessionId)}/disconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId })
  }).catch(() => {});
}

/**
 * Query Guacamole proxy daemon & Remote Desktop health
 */
export async function fetchRemoteDesktopHealth(): Promise<{
  service: string;
  version: string;
  guacd_configured: string;
  registered_devices_count: number;
}> {
  const res = await fetch('/api/remote-test/health');
  if (!res.ok) {
    throw new Error('Health check failed');
  }
  return res.json();
}
