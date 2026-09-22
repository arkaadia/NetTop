import { SshTestDevice, DiagnosticReport, DiagnosticStep, SshFetchedData, SshHealthStatus } from '../types/sshTest';

export async function getSshDevices(): Promise<SshTestDevice[]> {
  const res = await fetch('/api/ssh-test/devices');
  if (!res.ok) {
    throw new Error(`Failed to load SSH devices (${res.status})`);
  }
  const data = await res.json();
  return data.devices || [];
}

export async function createSshDevice(payload: {
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: string;
  password?: string;
  private_key?: string;
  passphrase?: string;
  device_type?: string;
  pty_type?: string;
  description?: string;
}): Promise<SshTestDevice> {
  const res = await fetch('/api/ssh-test/devices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create SSH device');
  }
  return data.device;
}

export async function updateSshDevice(id: string, payload: Partial<SshTestDevice> & { password?: string; private_key?: string }): Promise<SshTestDevice> {
  const res = await fetch(`/api/ssh-test/devices/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update SSH device');
  }
  return data.device;
}

export async function deleteSshDevice(id: string): Promise<boolean> {
  const res = await fetch(`/api/ssh-test/devices/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete SSH device');
  }
  return true;
}

export async function fetchDeviceData(id: string): Promise<SshFetchedData> {
  const res = await fetch(`/api/ssh-test/devices/${encodeURIComponent(id)}/fetch`, {
    method: 'POST'
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message_fa || data.error || 'Failed to fetch device data');
  }
  return data.data;
}

export async function diagnoseDevice(id: string): Promise<DiagnosticReport> {
  const res = await fetch(`/api/ssh-test/devices/${encodeURIComponent(id)}/diagnose`, {
    method: 'POST'
  });
  const data = await res.json();
  if (!res.ok && !data.steps) {
    throw new Error(data.error || 'Failed to run diagnostic audit');
  }
  return data;
}

export async function testConnectionAdHoc(payload: {
  host: string;
  port: number;
  username: string;
  password?: string;
  private_key?: string;
  auth_type?: string;
  passphrase?: string;
}): Promise<DiagnosticReport> {
  const res = await fetch('/api/ssh-test/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok && !data.steps) {
    throw new Error(data.error || 'Connection test failed');
  }
  return data;
}

/**
 * Connects directly via WebSocket to the Python Paramiko 2 engine for live streaming diagnostic test.
 * Falls back transparently to HTTP if WebSocket cannot be established.
 */
export function testConnectionViaWebSocket(
  payload: {
    host: string;
    port: number;
    username: string;
    password?: string;
    private_key?: string;
    auth_type?: string;
    passphrase?: string;
    timeout?: number;
  },
  onProgress?: (step: DiagnosticStep) => void
): Promise<DiagnosticReport> {
  return new Promise((resolve, reject) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/ssh-test?mode=diagnostic`;
    let ws: WebSocket | null = null;
    let isSettled = false;

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        if (ws) {
          try { ws.close(); } catch {}
        }
        testConnectionAdHoc(payload).then(resolve).catch(reject);
      }
    }, (payload.timeout || 15) * 1000 + 4000);

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        ws?.send(JSON.stringify({
          action: 'test_connection',
          payload
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'layer_progress' && msg.step) {
            onProgress?.(msg.step);
          } else if (msg.type === 'diagnostic_result' && msg.report) {
            if (!isSettled) {
              isSettled = true;
              clearTimeout(timer);
              try { ws?.close(); } catch {}
              resolve(msg.report);
            }
          } else if (msg.type === 'error') {
            if (!isSettled) {
              isSettled = true;
              clearTimeout(timer);
              try { ws?.close(); } catch {}
              reject(new Error(msg.message || 'WebSocket diagnostic error'));
            }
          }
        } catch {
          // ignore parsing error
        }
      };

      ws.onerror = () => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          try { ws?.close(); } catch {}
          testConnectionAdHoc(payload).then(resolve).catch(reject);
        }
      };

      ws.onclose = () => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          testConnectionAdHoc(payload).then(resolve).catch(reject);
        }
      };
    } catch {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        testConnectionAdHoc(payload).then(resolve).catch(reject);
      }
    }
  });
}

export async function createSessionToken(id: string): Promise<string> {
  const res = await fetch(`/api/ssh-test/devices/${encodeURIComponent(id)}/session-token`, {
    method: 'POST'
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(data.error || 'Failed to create session token');
  }
  return data.token;
}

export async function checkSshHealth(): Promise<SshHealthStatus> {
  const res = await fetch('/api/ssh-test/health');
  if (!res.ok) {
    throw new Error('SSH engine health check failed');
  }
  return await res.json();
}
