import fs from 'fs';
import path from 'path';
import { AuditLogEntry } from './types';

export class AuditLogger {
  private auditFilePath: string;

  constructor(projectRoot: string) {
    this.auditFilePath = path.join(projectRoot, 'backend', 'automation_audit.json');
    if (!fs.existsSync(this.auditFilePath)) {
      try {
        fs.writeFileSync(this.auditFilePath, JSON.stringify([], null, 2), 'utf-8');
      } catch (err) {
        console.warn('[AuditLogger] Could not initialize automation_audit.json:', err);
      }
    }
  }

  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString()
    };

    try {
      let list: AuditLogEntry[] = [];
      if (fs.existsSync(this.auditFilePath)) {
        const raw = fs.readFileSync(this.auditFilePath, 'utf-8');
        list = JSON.parse(raw);
      }
      list.unshift(fullEntry);
      // Keep up to 500 audit logs
      if (list.length > 500) list = list.slice(0, 500);
      fs.writeFileSync(this.auditFilePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[AuditLogger] Failed to write audit log:', err);
    }

    return fullEntry;
  }

  getLogs(filter?: { deviceId?: string; vendor?: string; status?: string; query?: string }): AuditLogEntry[] {
    if (!fs.existsSync(this.auditFilePath)) return [];
    try {
      const raw = fs.readFileSync(this.auditFilePath, 'utf-8');
      let list: AuditLogEntry[] = JSON.parse(raw);

      if (filter) {
        if (filter.deviceId) {
          list = list.filter((l) => l.deviceId === filter.deviceId);
        }
        if (filter.vendor) {
          list = list.filter((l) => l.vendor === filter.vendor);
        }
        if (filter.status) {
          list = list.filter((l) => l.status === filter.status);
        }
        if (filter.query) {
          const q = filter.query.toLowerCase();
          list = list.filter(
            (l) =>
              l.deviceName.toLowerCase().includes(q) ||
              l.actionName.toLowerCase().includes(q) ||
              l.user.toLowerCase().includes(q) ||
              l.category.toLowerCase().includes(q) ||
              l.commands.some((c) => c.toLowerCase().includes(q))
          );
        }
      }

      return list;
    } catch (err) {
      console.error('[AuditLogger] Error reading audit logs:', err);
      return [];
    }
  }
}
