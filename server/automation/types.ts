export type VendorType = 'cisco' | 'mikrotik';

export type CiscoCategory =
  | 'overview'
  | 'routing'
  | 'switching'
  | 'etherchannel'
  | 'vlan'
  | 'stp'
  | 'tunnel'
  | 'ipsla'
  | 'nat'
  | 'dhcp'
  | 'security'
  | 'management'
  | 'backup'
  | 'audit';

export type MikrotikCategory =
  | 'overview'
  | 'vpn'
  | 'firewall'
  | 'security'
  | 'routing'
  | 'nat'
  | 'vlan'
  | 'dhcp'
  | 'failover'
  | 'ip_mgmt'
  | 'monitoring'
  | 'backup'
  | 'audit';

export type AutomationCategory = CiscoCategory | MikrotikCategory;

export type LifecycleStage =
  | 'discover'
  | 'validate'
  | 'generate'
  | 'preview'
  | 'backup'
  | 'apply'
  | 'verify'
  | 'rollback';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  riskLevel: RiskLevel;
  impactDescription: string;
  suggestedFix?: string;
}

export interface ConfigPreview {
  vendor: VendorType;
  category: AutomationCategory;
  commands: string[];
  explanation: string;
  riskLevel: RiskLevel;
  dryRunSupported: boolean;
  verificationCommands: string[];
  rollbackCommands: string[];
}

export interface BackupRecord {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceIp: string;
  vendor: VendorType;
  timestamp: string;
  reason: string;
  config: string;
  sizeBytes: number;
}

export interface VerificationCheck {
  name: string;
  command: string;
  passed: boolean;
  output: string;
  expectedPattern?: string;
  note?: string;
}

export interface VerificationResult {
  verified: boolean;
  checks: VerificationCheck[];
  summary: string;
  rawOutput?: string;
}

export interface RollbackPlan {
  canRollback: boolean;
  commands: string[];
  backupId?: string;
  strategy: 'inverse_commands' | 'restore_backup';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  deviceId: string;
  deviceName: string;
  deviceIp: string;
  vendor: VendorType;
  category: AutomationCategory;
  actionName: string;
  parameters: Record<string, any>;
  commands: string[];
  status: 'success' | 'failed' | 'rolled_back';
  riskLevel: RiskLevel;
  verificationPassed: boolean;
  verificationSummary: string;
  backupId?: string;
  error?: string;
}

export interface SecurityAuditItem {
  id: string;
  category: string;
  title: string;
  status: 'secure' | 'warning' | 'critical';
  currentSetting: string;
  recommendedSetting: string;
  scoreDeduction: number;
  risk: string;
  remediationCommands: string[];
}

export interface SecurityAuditReport {
  deviceId: string;
  deviceName: string;
  vendor: VendorType;
  score: number; // 0 - 100
  totalChecks: number;
  passedChecks: number;
  warningsCount: number;
  criticalCount: number;
  timestamp: string;
  items: SecurityAuditItem[];
}

export interface AutomationTaskRequest {
  deviceId: string;
  vendor: VendorType;
  category: AutomationCategory;
  actionName: string;
  parameters: Record<string, any>;
  comment?: string;
  user?: string;
}
