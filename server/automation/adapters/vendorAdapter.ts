import { AutomationTaskRequest, ConfigPreview, VerificationResult, SecurityAuditReport } from '../types';

export interface VendorAdapter {
  generateConfigPreview(task: AutomationTaskRequest): Promise<ConfigPreview>;
  parseVerificationOutput(commandOutput: string, expectedChecks: string[]): VerificationResult;
  generateAuditReport(deviceId: string, deviceName: string, runningConfig: string): SecurityAuditReport;
  getRunningConfigCommand(): string;
  getDeviceInfoCommands(): string[];
}
