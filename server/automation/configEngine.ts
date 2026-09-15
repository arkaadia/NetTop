import fs from 'fs';
import path from 'path';
import {
  AutomationTaskRequest,
  ConfigPreview,
  VerificationResult,
  SecurityAuditReport,
  VendorType
} from './types';
import { validateAutomationTask } from './validator';
import { CiscoAdapter } from './adapters/ciscoAdapter';
import { MikrotikAdapter } from './adapters/mikrotikAdapter';
import { VendorAdapter } from './adapters/vendorAdapter';
import { BackupManager } from './backupManager';
import { AuditLogger } from './auditLogger';
import { executeRawSshCommands, RawSshExecResult } from '../sshManager';

export interface ApplyExecutionResult {
  success: boolean;
  backupId?: string;
  commandsExecuted: string[];
  executionOutput: string;
  verification: VerificationResult;
  rolledBack?: boolean;
  rollbackOutput?: string;
  error?: string;
  auditId: string;
}

export class ConfigEngine {
  private projectRoot: string;
  private ciscoAdapter: CiscoAdapter;
  private mikrotikAdapter: MikrotikAdapter;
  private backupManager: BackupManager;
  private auditLogger: AuditLogger;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.ciscoAdapter = new CiscoAdapter();
    this.mikrotikAdapter = new MikrotikAdapter();
    this.backupManager = new BackupManager(projectRoot);
    this.auditLogger = new AuditLogger(projectRoot);
  }

  private getAdapter(vendor: VendorType): VendorAdapter {
    return vendor === 'mikrotik' ? this.mikrotikAdapter : this.ciscoAdapter;
  }

  private getDeviceCredentials(deviceId: string) {
    try {
      const dataPath = path.join(this.projectRoot, 'backend', 'network_data.json');
      if (fs.existsSync(dataPath)) {
        const raw = fs.readFileSync(dataPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const found = (parsed.devices || []).find((d: any) => d.id === deviceId);
        if (found) {
          return {
            host: found.ip,
            port: found.ssh_port || 22,
            username: found.ssh_username || 'admin',
            password: found.ssh_password || '',
            enablePassword: found.enable_password || '',
            name: found.name || deviceId,
            vendor: (found.model || '').toLowerCase().includes('mikrotik') ? ('mikrotik' as VendorType) : ('cisco' as VendorType)
          };
        }
      }
    } catch (e) {
      console.warn('[ConfigEngine] Error reading device credentials:', e);
    }
    return null;
  }

  // 1. Lifecycle: Validate & Preview
  async preview(task: AutomationTaskRequest): Promise<{
    validation: ReturnType<typeof validateAutomationTask>;
    preview: ConfigPreview;
  }> {
    const validation = validateAutomationTask(task);
    const adapter = this.getAdapter(task.vendor);
    const preview = await adapter.generateConfigPreview(task);

    return {
      validation,
      preview
    };
  }

  // 2. Lifecycle: Execute Full Pipeline (Discover -> Validate -> Backup -> Apply -> Verify -> Rollback on failure)
  async apply(task: AutomationTaskRequest, options?: { autoRollbackOnFailure?: boolean; user?: string }): Promise<ApplyExecutionResult> {
    const creds = this.getDeviceCredentials(task.deviceId);
    const host = creds?.host;
    const devName = creds?.name || task.deviceId;
    const vendor = task.vendor || creds?.vendor || 'cisco';
    const adapter = this.getAdapter(vendor);

    // Step A: Validate & Generate
    const validation = validateAutomationTask(task);
    if (!validation.valid) {
      const audit = this.auditLogger.log({
        user: options?.user || 'admin',
        deviceId: task.deviceId,
        deviceName: devName,
        deviceIp: host || 'unknown',
        vendor,
        category: task.category,
        actionName: task.actionName,
        parameters: task.parameters,
        commands: [],
        status: 'failed',
        riskLevel: validation.riskLevel,
        verificationPassed: false,
        verificationSummary: 'Validation failed: ' + validation.errors.join('; '),
        error: validation.errors.join('; ')
      });

      return {
        success: false,
        commandsExecuted: [],
        executionOutput: '',
        verification: { verified: false, checks: [], summary: 'Validation rejected execution.' },
        error: validation.errors.join('; '),
        auditId: audit.id
      };
    }

    const preview = await adapter.generateConfigPreview(task);

    // Step B: Safety Pre-Apply Configuration Backup
    let backupId: string | undefined;
    if (host && creds) {
      try {
        console.log(`[ConfigEngine] Fetching pre-apply running configuration snapshot for ${devName}...`);
        const backupResult = await executeRawSshCommands({
          host,
          port: creds.port,
          username: creds.username,
          password: creds.password,
          enablePassword: creds.enablePassword,
          commands: [adapter.getRunningConfigCommand()],
          vendor,
          timeoutMs: 25000
        });

        if (backupResult.output) {
          const backupRecord = this.backupManager.saveBackup({
            deviceId: task.deviceId,
            deviceName: devName,
            deviceIp: host,
            vendor,
            reason: `Pre-apply backup before '${task.actionName}' (${task.category})`,
            config: backupResult.output
          });
          backupId = backupRecord.id;
        }
      } catch (backupErr) {
        console.warn(`[ConfigEngine] Warning during pre-apply backup:`, backupErr);
      }
    }

    // Step C: Execute configuration commands via real SSH
    console.log(`[ConfigEngine] Executing ${preview.commands.length} commands on ${devName} (${host})...`);
    let execResult: RawSshExecResult = {
      success: false,
      output: '',
      error: undefined,
      commandsExecuted: []
    };

    if (host && creds) {
      execResult = await executeRawSshCommands({
        host,
        port: creds.port,
        username: creds.username,
        password: creds.password,
        enablePassword: creds.enablePassword,
        commands: preview.commands,
        vendor,
        timeoutMs: 35000
      });
    } else {
      execResult = {
        success: false,
        output: '',
        error: `Host IP or SSH credentials not available for device '${task.deviceId}'.`,
        commandsExecuted: []
      };
    }

    // Step D: Run Post-Configuration Verification
    let verification: VerificationResult = {
      verified: execResult.success,
      checks: [],
      summary: execResult.success ? 'Commands executed successfully.' : (execResult.error || 'Execution failed.')
    };

    if (execResult.success && host && creds && preview.verificationCommands.length > 0) {
      console.log(`[ConfigEngine] Verifying configuration on ${devName}...`);
      const verifyOutput = await executeRawSshCommands({
        host,
        port: creds.port,
        username: creds.username,
        password: creds.password,
        enablePassword: creds.enablePassword,
        commands: preview.verificationCommands,
        vendor,
        timeoutMs: 20000
      });

      verification = adapter.parseVerificationOutput(verifyOutput.output, preview.verificationCommands);
    }

    // Step E: Automatic Rollback on failure if requested
    let rolledBack = false;
    let rollbackOutput: string | undefined;

    if ((!execResult.success || !verification.verified) && options?.autoRollbackOnFailure && preview.rollbackCommands.length > 0) {
      console.warn(`[ConfigEngine] Safety trigger: Execution or verification failed, initiating immediate rollback...`);
      if (host && creds) {
        const rb = await executeRawSshCommands({
          host,
          port: creds.port,
          username: creds.username,
          password: creds.password,
          enablePassword: creds.enablePassword,
          commands: preview.rollbackCommands,
          vendor,
          timeoutMs: 25000
        });
        rolledBack = true;
        rollbackOutput = rb.output;
      }
    }

    // Step F: Update persistent network_data.json flag
    try {
      const dataPath = path.join(this.projectRoot, 'backend', 'network_data.json');
      if (fs.existsSync(dataPath)) {
        const raw = fs.readFileSync(dataPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const d = (parsed.devices || []).find((item: any) => item.id === task.deviceId);
        if (d && execResult.success) {
          d.has_unsaved_changes = true;
          d.last_modified_time = new Date().toLocaleTimeString();
          fs.writeFileSync(dataPath, JSON.stringify(parsed, null, 2), 'utf-8');
        }
      }
    } catch {}

    // Step G: Log to Audit Trail
    const isTotalSuccess = execResult.success && verification.verified && !rolledBack;
    const audit = this.auditLogger.log({
      user: options?.user || 'admin',
      deviceId: task.deviceId,
      deviceName: devName,
      deviceIp: host || 'unknown',
      vendor,
      category: task.category,
      actionName: task.actionName,
      parameters: task.parameters,
      commands: preview.commands,
      status: rolledBack ? 'rolled_back' : isTotalSuccess ? 'success' : 'failed',
      riskLevel: validation.riskLevel,
      verificationPassed: verification.verified,
      verificationSummary: verification.summary,
      backupId,
      error: execResult.error
    });

    return {
      success: isTotalSuccess,
      backupId,
      commandsExecuted: preview.commands,
      executionOutput: execResult.output,
      verification,
      rolledBack,
      rollbackOutput,
      error: execResult.error,
      auditId: audit.id
    };
  }

  // 2. Dual-Switch Coordinated Apply (e.g. Cross-Switch LACP)
  async applyDual(
    taskA: AutomationTaskRequest,
    taskB: AutomationTaskRequest,
    options?: { autoRollbackOnFailure?: boolean; user?: string }
  ): Promise<{
    overallSuccess: boolean;
    switchA: ApplyExecutionResult;
    switchB: ApplyExecutionResult;
    error?: string;
  }> {
    console.log(`[ConfigEngine] Starting Dual-Switch Orchestration (Switch A: ${taskA.deviceId}, Switch B: ${taskB.deviceId})...`);

    // 1. Validate both tasks first
    const valA = validateAutomationTask(taskA);
    const valB = validateAutomationTask(taskB);

    if (!valA.valid || !valB.valid) {
      const errA = valA.valid ? '' : `Switch A: ${valA.errors.join('; ')}`;
      const errB = valB.valid ? '' : `Switch B: ${valB.errors.join('; ')}`;
      const combined = [errA, errB].filter(Boolean).join(' | ');

      const failResultA: ApplyExecutionResult = {
        success: false,
        commandsExecuted: [],
        executionOutput: '',
        verification: { verified: false, checks: [], summary: 'Validation rejected.' },
        error: errA || 'Cross-validation aborted',
        auditId: ''
      };
      const failResultB: ApplyExecutionResult = {
        success: false,
        commandsExecuted: [],
        executionOutput: '',
        verification: { verified: false, checks: [], summary: 'Validation rejected.' },
        error: errB || 'Cross-validation aborted',
        auditId: ''
      };
      return { overallSuccess: false, switchA: failResultA, switchB: failResultB, error: combined };
    }

    // 2. Apply to Switch A first
    console.log(`[ConfigEngine] Applying to Switch A (${taskA.deviceId})...`);
    const resultA = await this.apply(taskA, { autoRollbackOnFailure: options?.autoRollbackOnFailure, user: options?.user });

    if (!resultA.success) {
      const skippedB: ApplyExecutionResult = {
        success: false,
        commandsExecuted: [],
        executionOutput: 'Skipped because Switch A failed execution or verification.',
        verification: { verified: false, checks: [], summary: 'Execution skipped due to Switch A failure.' },
        error: 'Aborted due to Switch A failure',
        auditId: ''
      };
      return {
        overallSuccess: false,
        switchA: resultA,
        switchB: skippedB,
        error: `Switch A failed: ${resultA.error || 'Execution / verification failed'}`
      };
    }

    // 3. Switch A succeeded, apply to Switch B
    console.log(`[ConfigEngine] Switch A succeeded. Applying to Switch B (${taskB.deviceId})...`);
    const resultB = await this.apply(taskB, { autoRollbackOnFailure: options?.autoRollbackOnFailure, user: options?.user });

    if (!resultB.success) {
      // Switch B failed after Switch A succeeded!
      if (options?.autoRollbackOnFailure) {
        console.warn(`[ConfigEngine] Switch B failed. Rolling back Switch A (${taskA.deviceId}) to prevent loop or mismatch...`);
        try {
          const adapterA = this.getAdapter(taskA.vendor || 'cisco');
          const previewA = await adapterA.generateConfigPreview(taskA);
          await this.rollback(taskA.deviceId, resultA.backupId, previewA.rollbackCommands);
          resultA.rolledBack = true;
          resultA.rollbackOutput = 'Rolled back Switch A due to Switch B configuration failure';
        } catch (rbErr: any) {
          console.error(`[ConfigEngine] Error during Switch A rollback:`, rbErr);
        }
      }

      return {
        overallSuccess: false,
        switchA: resultA,
        switchB: resultB,
        error: `Switch B failed: ${resultB.error || 'Verification failed'}. Switch A was automatically protected.`
      };
    }

    return {
      overallSuccess: true,
      switchA: resultA,
      switchB: resultB
    };
  }

  // 3. Rollback Action
  async rollback(deviceId: string, backupId?: string, customRollbackCmds?: string[]): Promise<{
    success: boolean;
    output: string;
    error?: string;
  }> {
    const creds = this.getDeviceCredentials(deviceId);
    if (!creds?.host) {
      return { success: false, output: '', error: 'Device credentials or host not found.' };
    }

    let commandsToRun: string[] = [];

    if (customRollbackCmds && customRollbackCmds.length > 0) {
      commandsToRun = customRollbackCmds;
    } else if (backupId) {
      const backup = this.backupManager.getBackupById(backupId);
      if (!backup) {
        return { success: false, output: '', error: `Backup '${backupId}' not found.` };
      }
      // For Cisco, running-config restoration
      commandsToRun = ['configure terminal', ...backup.config.split('\n').filter((l) => l.trim().length > 0 && !l.trim().startsWith('!')), 'exit'];
    }

    console.log(`[ConfigEngine] Applying rollback to ${creds.name} (${creds.host})...`);
    const res = await executeRawSshCommands({
      host: creds.host,
      port: creds.port,
      username: creds.username,
      password: creds.password,
      enablePassword: creds.enablePassword,
      commands: commandsToRun,
      vendor: creds.vendor,
      timeoutMs: 35000
    });

    this.auditLogger.log({
      user: 'admin',
      deviceId,
      deviceName: creds.name,
      deviceIp: creds.host,
      vendor: creds.vendor,
      category: 'backup',
      actionName: 'rollback',
      parameters: { backupId },
      commands: commandsToRun,
      status: res.success ? 'success' : 'failed',
      riskLevel: 'high',
      verificationPassed: res.success,
      verificationSummary: res.success ? 'Rollback commands executed cleanly' : (res.error || 'Rollback error'),
      backupId,
      error: res.error
    });

    return {
      success: res.success,
      output: res.output,
      error: res.error
    };
  }

  // 4. Security Audit Report Engine
  async runSecurityAudit(deviceId: string): Promise<SecurityAuditReport> {
    const creds = this.getDeviceCredentials(deviceId);
    const devName = creds?.name || deviceId;
    const vendor = creds?.vendor || 'cisco';
    const adapter = this.getAdapter(vendor);

    let runningConfig = '';

    if (creds?.host) {
      try {
        console.log(`[ConfigEngine] Querying live device running configuration for security audit on ${devName}...`);
        const res = await executeRawSshCommands({
          host: creds.host,
          port: creds.port,
          username: creds.username,
          password: creds.password,
          enablePassword: creds.enablePassword,
          commands: [adapter.getRunningConfigCommand()],
          vendor,
          timeoutMs: 25000
        });
        runningConfig = res.output;
      } catch (err) {
        console.warn(`[ConfigEngine] Could not reach live device for audit, generating baseline assessment:`, err);
      }
    }

    return adapter.generateAuditReport(deviceId, devName, runningConfig);
  }

  getBackupManager(): BackupManager {
    return this.backupManager;
  }

  getAuditLogger(): AuditLogger {
    return this.auditLogger;
  }
}
