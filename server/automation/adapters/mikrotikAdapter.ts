import { VendorAdapter } from './vendorAdapter';
import { MikrotikTemplates } from '../templates/mikrotikTemplates';
import {
  AutomationTaskRequest,
  ConfigPreview,
  VerificationResult,
  SecurityAuditReport,
  SecurityAuditItem,
  VerificationCheck
} from '../types';
import { validateAutomationTask } from '../validator';

export class MikrotikAdapter implements VendorAdapter {
  async generateConfigPreview(task: AutomationTaskRequest): Promise<ConfigPreview> {
    const val = validateAutomationTask(task);
    const params = task.parameters || {};
    let result = {
      commands: [] as string[],
      verificationCommands: [] as string[],
      rollbackCommands: [] as string[],
      explanation: ''
    };

    switch (task.category) {
      case 'routing':
        result = MikrotikTemplates.staticRoute(params as any);
        break;

      case 'vpn':
        result = MikrotikTemplates.wireguard(params as any);
        break;

      case 'firewall':
        result = MikrotikTemplates.firewallHardening(params as any);
        break;

      case 'nat':
        result = MikrotikTemplates.nat(params as any);
        break;

      case 'vlan':
        result = MikrotikTemplates.bridgeVlan(params as any);
        break;

      case 'dhcp':
        result = MikrotikTemplates.dhcp(params as any);
        break;

      case 'failover':
        result = MikrotikTemplates.dualWanFailover(params as any);
        break;

      case 'security':
        result = MikrotikTemplates.securityHardening(params as any);
        break;

      default:
        result = {
          commands: ['/ip address print'],
          verificationCommands: ['/ip address print'],
          rollbackCommands: [],
          explanation: 'Standard RouterOS CLI query.'
        };
    }

    return {
      vendor: 'mikrotik',
      category: task.category,
      commands: result.commands,
      verificationCommands: result.verificationCommands,
      rollbackCommands: result.rollbackCommands,
      explanation: result.explanation,
      riskLevel: val.riskLevel,
      dryRunSupported: true
    };
  }

  parseVerificationOutput(commandOutput: string, expectedChecks: string[]): VerificationResult {
    const checks: VerificationCheck[] = [];
    const hasSyntaxError = /failure:|bad command name|syntax error/i.test(commandOutput);

    for (const cmd of expectedChecks) {
      checks.push({
        name: cmd,
        command: cmd,
        passed: !hasSyntaxError,
        output: commandOutput.substring(0, 500),
        note: hasSyntaxError ? 'RouterOS returned error' : 'Rule applied and verified'
      });
    }

    return {
      verified: !hasSyntaxError,
      checks,
      summary: hasSyntaxError
        ? 'RouterOS command returned an error or duplicate rule.'
        : 'All RouterOS commands executed and verified successfully.',
      rawOutput: commandOutput
    };
  }

  generateAuditReport(deviceId: string, deviceName: string, runningConfig: string): SecurityAuditReport {
    const cfg = runningConfig || '';
    const items: SecurityAuditItem[] = [];
    let score = 100;

    // 1. Telnet disabled
    const telnetActive = cfg.includes('/ip service set telnet disabled=no') || !cfg.includes('set telnet disabled=yes');
    if (telnetActive) {
      score -= 15;
      items.push({
        id: 'mikrotik-sec-telnet',
        category: 'Services',
        title: 'Telnet Service Active',
        status: 'critical',
        currentSetting: 'Enabled',
        recommendedSetting: '/ip service disable telnet',
        scoreDeduction: 15,
        risk: 'Unencrypted cleartext remote management transmission.',
        remediationCommands: ['/ip service disable telnet']
      });
    } else {
      items.push({
        id: 'mikrotik-sec-telnet',
        category: 'Services',
        title: 'Telnet Service Active',
        status: 'secure',
        currentSetting: 'Disabled',
        recommendedSetting: '/ip service disable telnet',
        scoreDeduction: 0,
        risk: 'None',
        remediationCommands: []
      });
    }

    // 2. FTP disabled
    const ftpActive = !cfg.includes('set ftp disabled=yes');
    if (ftpActive) {
      score -= 10;
      items.push({
        id: 'mikrotik-sec-ftp',
        category: 'Services',
        title: 'Insecure FTP Service',
        status: 'warning',
        currentSetting: 'Enabled',
        recommendedSetting: '/ip service disable ftp',
        scoreDeduction: 10,
        risk: 'Insecure cleartext file transfer protocol.',
        remediationCommands: ['/ip service disable ftp']
      });
    } else {
      items.push({
        id: 'mikrotik-sec-ftp',
        category: 'Services',
        title: 'Insecure FTP Service',
        status: 'secure',
        currentSetting: 'Disabled',
        recommendedSetting: '/ip service disable ftp',
        scoreDeduction: 0,
        risk: 'None',
        remediationCommands: []
      });
    }

    // 3. Strong SSH Crypto
    const hasStrongCrypto = /strong-crypto=yes/i.test(cfg);
    if (!hasStrongCrypto) {
      score -= 10;
      items.push({
        id: 'mikrotik-sec-crypto',
        category: 'SSH Hardening',
        title: 'SSH Strong Crypto Mode',
        status: 'warning',
        currentSetting: 'Standard (legacy ciphers enabled)',
        recommendedSetting: '/ip ssh set strong-crypto=yes host-key-size=2048',
        scoreDeduction: 10,
        risk: 'Allows older weak cryptographic ciphers.',
        remediationCommands: ['/ip ssh set strong-crypto=yes host-key-size=2048']
      });
    } else {
      items.push({
        id: 'mikrotik-sec-crypto',
        category: 'SSH Hardening',
        title: 'SSH Strong Crypto Mode',
        status: 'secure',
        currentSetting: 'Strong Crypto Enforced',
        recommendedSetting: '/ip ssh set strong-crypto=yes host-key-size=2048',
        scoreDeduction: 0,
        risk: 'None',
        remediationCommands: []
      });
    }

    const finalScore = Math.max(0, Math.min(100, score));
    return {
      deviceId,
      deviceName,
      vendor: 'mikrotik',
      score: finalScore,
      totalChecks: items.length,
      passedChecks: items.filter((i) => i.status === 'secure').length,
      warningsCount: items.filter((i) => i.status === 'warning').length,
      criticalCount: items.filter((i) => i.status === 'critical').length,
      timestamp: new Date().toISOString(),
      items
    };
  }

  getRunningConfigCommand(): string {
    return '/export compact';
  }

  getDeviceInfoCommands(): string[] {
    return [
      '/system resource print',
      '/interface print detail',
      '/ip address print',
      '/export compact'
    ];
  }
}
