import {
  AutomationTaskRequest,
  ConfigPreview,
  ValidationResult,
  SecurityAuditReport,
  BackupRecord,
  AuditLogEntry,
  VendorType,
  AutomationCategory
} from '../types/automation';

export interface ApplyResult {
  success: boolean;
  backupId?: string;
  commandsExecuted: string[];
  executionOutput: string;
  verification: {
    verified: boolean;
    checks: Array<{ name: string; command: string; passed: boolean; output: string; note?: string }>;
    summary: string;
    rawOutput?: string;
  };
  rolledBack?: boolean;
  rollbackOutput?: string;
  error?: string;
  auditId: string;
}

export interface DualPreviewResult {
  switchA: {
    validation: ValidationResult;
    preview: ConfigPreview;
  };
  switchB: {
    validation: ValidationResult;
    preview: ConfigPreview;
  };
}

export interface DualApplyResult {
  overallSuccess: boolean;
  switchA: ApplyResult;
  switchB: ApplyResult;
  error?: string;
}

export async function getAutomationPreview(task: AutomationTaskRequest): Promise<{
  validation: ValidationResult;
  preview: ConfigPreview;
}> {
  const res = await fetch('/api/automation/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Preview failed' }));
    throw new Error(err.error || 'Failed to generate preview');
  }
  return res.json();
}

export async function getAutomationPreviewDual(
  taskA: AutomationTaskRequest,
  taskB: AutomationTaskRequest
): Promise<DualPreviewResult> {
  const res = await fetch('/api/automation/preview-dual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskA, taskB })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Dual preview failed' }));
    throw new Error(err.error || 'Failed to generate dual preview');
  }
  return res.json();
}

export async function applyAutomation(
  task: AutomationTaskRequest,
  autoRollbackOnFailure: boolean = true,
  user: string = 'admin'
): Promise<ApplyResult> {
  const res = await fetch('/api/automation/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, autoRollbackOnFailure, user })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Apply execution failed' }));
    throw new Error(err.error || 'Apply execution failed');
  }
  return res.json();
}

export async function applyAutomationDual(
  taskA: AutomationTaskRequest,
  taskB: AutomationTaskRequest,
  autoRollbackOnFailure: boolean = true,
  user: string = 'admin'
): Promise<DualApplyResult> {
  const res = await fetch('/api/automation/apply-dual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskA, taskB, autoRollbackOnFailure, user })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Dual apply execution failed' }));
    throw new Error(err.error || 'Dual apply execution failed');
  }
  return res.json();
}

export async function rollbackAutomation(
  deviceId: string,
  backupId?: string,
  commands?: string[]
): Promise<{ success: boolean; output: string; error?: string }> {
  const res = await fetch('/api/automation/rollback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, backupId, commands })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Rollback failed' }));
    throw new Error(err.error || 'Rollback failed');
  }
  return res.json();
}

export async function fetchSecurityAudit(deviceId: string): Promise<SecurityAuditReport> {
  const res = await fetch(`/api/automation/security-audit/${deviceId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Audit failed' }));
    throw new Error(err.error || 'Audit failed');
  }
  return res.json();
}

export async function fetchBackups(deviceId?: string): Promise<BackupRecord[]> {
  const url = deviceId ? `/api/automation/backups?deviceId=${encodeURIComponent(deviceId)}` : '/api/automation/backups';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch backups');
  return res.json();
}

export async function fetchAuditLogs(filter?: {
  deviceId?: string;
  vendor?: string;
  status?: string;
  q?: string;
}): Promise<AuditLogEntry[]> {
  const params = new URLSearchParams();
  if (filter?.deviceId) params.append('deviceId', filter.deviceId);
  if (filter?.vendor) params.append('vendor', filter.vendor);
  if (filter?.status) params.append('status', filter.status);
  if (filter?.q) params.append('q', filter.q);

  const res = await fetch(`/api/automation/audit?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}
