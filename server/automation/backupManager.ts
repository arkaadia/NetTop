import fs from 'fs';
import path from 'path';
import { BackupRecord, VendorType } from './types';

export class BackupManager {
  private backupDir: string;

  constructor(projectRoot: string) {
    this.backupDir = path.join(projectRoot, 'backend', 'automation_backups');
    if (!fs.existsSync(this.backupDir)) {
      try {
        fs.mkdirSync(this.backupDir, { recursive: true });
      } catch (err) {
        console.warn('[BackupManager] Warning creating backup directory:', err);
      }
    }
  }

  saveBackup(params: {
    deviceId: string;
    deviceName: string;
    deviceIp: string;
    vendor: VendorType;
    reason: string;
    config: string;
  }): BackupRecord {
    const timestamp = new Date().toISOString();
    const cleanTime = timestamp.replace(/[:.]/g, '-');
    const id = `backup-${params.deviceId}-${cleanTime}`;
    const filePath = path.join(this.backupDir, `${id}.json`);

    const record: BackupRecord = {
      id,
      deviceId: params.deviceId,
      deviceName: params.deviceName,
      deviceIp: params.deviceIp,
      vendor: params.vendor,
      timestamp,
      reason: params.reason,
      config: params.config,
      sizeBytes: Buffer.byteLength(params.config || '', 'utf-8')
    };

    try {
      fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
    } catch (err) {
      console.error('[BackupManager] Failed to save backup record:', err);
    }

    return record;
  }

  getBackups(deviceId?: string): BackupRecord[] {
    if (!fs.existsSync(this.backupDir)) return [];
    try {
      const files = fs.readdirSync(this.backupDir).filter((f) => f.endsWith('.json'));
      const records: BackupRecord[] = [];
      for (const f of files) {
        try {
          const raw = fs.readFileSync(path.join(this.backupDir, f), 'utf-8');
          const parsed: BackupRecord = JSON.parse(raw);
          if (!deviceId || parsed.deviceId === deviceId) {
            records.push(parsed);
          }
        } catch {}
      }
      return records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (err) {
      console.error('[BackupManager] Error listing backups:', err);
      return [];
    }
  }

  getBackupById(id: string): BackupRecord | null {
    const filePath = path.join(this.backupDir, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  deleteBackup(id: string): boolean {
    const filePath = path.join(this.backupDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}
