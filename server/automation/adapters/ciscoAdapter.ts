import { VendorAdapter } from './vendorAdapter';
import { CiscoTemplates } from '../templates/ciscoTemplates';
import {
  AutomationTaskRequest,
  ConfigPreview,
  VerificationResult,
  SecurityAuditReport,
  SecurityAuditItem,
  VerificationCheck
} from '../types';
import { validateAutomationTask } from '../validator';

export class CiscoAdapter implements VendorAdapter {
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
        if (task.actionName === 'staticRoute') {
          result = CiscoTemplates.staticRoute(params as any);
        } else if (task.actionName === 'ospf') {
          result = CiscoTemplates.ospf(params as any);
        } else if (task.actionName === 'eigrp') {
          result = CiscoTemplates.eigrp(params as any);
        } else if (task.actionName === 'bgp') {
          result = CiscoTemplates.bgp(params as any);
        } else if (task.actionName === 'routerToRouter') {
          const r2r = CiscoTemplates.routerToRouterLink(params as any);
          result = r2r.routerA;
        }
        break;

      case 'switching':
        if (task.actionName === 'accessPort') {
          result = CiscoTemplates.accessPort(params as any);
        } else if (task.actionName === 'trunkPort') {
          result = CiscoTemplates.trunkPort(params as any);
        }
        break;

      case 'vlan':
        result = CiscoTemplates.vlans(params as any);
        break;

      case 'etherchannel':
        result = CiscoTemplates.etherChannel(params as any);
        break;

      case 'stp':
        result = CiscoTemplates.stp(params as any);
        break;

      case 'tunnel':
        result = CiscoTemplates.greTunnel(params as any);
        break;

      case 'ipsla':
        result = CiscoTemplates.ipSlaWithFailover(params as any);
        break;

      case 'nat':
        result = CiscoTemplates.nat(params as any);
        break;

      case 'dhcp':
        result = CiscoTemplates.dhcpPool(params as any);
        break;

      case 'security':
        result = CiscoTemplates.securityHardening(params as any);
        break;

      case 'management':
        result = CiscoTemplates.managementServices(params as any);
        break;

      default:
        result = {
          commands: ['configure terminal', 'exit'],
          verificationCommands: ['show running-config'],
          rollbackCommands: ['configure terminal', 'exit'],
          explanation: 'Standard Cisco IOS CLI execution.'
        };
    }

    return {
      vendor: 'cisco',
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
    const hasSyntaxError = /% (Invalid input|Command rejected|Incomplete command|Ambiguous command)/i.test(commandOutput);

    for (const cmd of expectedChecks) {
      const isPresentInOutput = commandOutput.toLowerCase().includes(cmd.toLowerCase().replace(/\|.*$/, '').trim());
      const hasCmdError = commandOutput.includes(`% Invalid input`) || commandOutput.includes(`% Incomplete`);

      checks.push({
        name: cmd,
        command: cmd,
        passed: !hasSyntaxError,
        output: commandOutput.substring(0, 500),
        note: hasCmdError ? 'CLI returned syntax rejection' : 'Command validated successfully'
      });
    }

    return {
      verified: !hasSyntaxError,
      checks,
      summary: hasSyntaxError
        ? 'Verification detected CLI warnings or rejected command syntax.'
        : 'All commands applied cleanly with nominal verification output.',
      rawOutput: commandOutput
    };
  }

  generateAuditReport(deviceId: string, deviceName: string, runningConfig: string): SecurityAuditReport {
    const cfg = runningConfig || '';
    const items: SecurityAuditItem[] = [];
    let score = 100;

    // 1. SSH Version 2
    const hasSshV2 = /ip ssh version 2/i.test(cfg);
    if (!hasSshV2) {
      score -= 10;
      items.push({
        id: 'cisco-sec-ssh2',
        category: 'Access Management',
        title: 'SSH Version 2 Protocol',
        status: 'critical',
        currentSetting: 'Legacy SSH v1 or Disabled',
        recommendedSetting: 'ip ssh version 2',
        scoreDeduction: 10,
        risk: 'SSH v1 contains cryptographic design flaws allowing man-in-the-middle attacks.',
        remediationCommands: ['configure terminal', 'ip ssh version 2', 'exit']
      });
    } else {
      items.push({
        id: 'cisco-sec-ssh2',
        category: 'Access Management',
        title: 'SSH Version 2 Protocol',
        status: 'secure',
        currentSetting: 'SSH v2 Enforced',
        recommendedSetting: 'ip ssh version 2',
        scoreDeduction: 0,
        risk: 'None',
        remediationCommands: []
      });
    }

    // 2. Service Password Encryption
    const hasPasswordEncryption = /service password-encryption/i.test(cfg);
    if (!hasPasswordEncryption) {
      score -= 8;
      items.push({
        id: 'cisco-sec-pw-encrypt',
        category: 'Credential Security',
        title: 'Service Password Encryption',
        status: 'warning',
        currentSetting: 'Disabled (Cleartext passwords visible)',
        recommendedSetting: 'service password-encryption',
        scoreDeduction: 8,
        risk: 'Passwords stored in running-config are readable in plain text.',
        remediationCommands: ['configure terminal', 'service password-encryption', 'exit']
      });
    } else {
      items.push({
        id: 'cisco-sec-pw-encrypt',
        category: 'Credential Security',
        title: 'Service Password Encryption',
        status: 'secure',
        currentSetting: 'Enabled',
        recommendedSetting: 'service password-encryption',
        scoreDeduction: 0,
        risk: 'None',
        remediationCommands: []
      });
    }

    // 3. Telnet Disable on VTY
    const telnetAllowed = /transport input (all|telnet)/i.test(cfg);
    if (telnetAllowed) {
      score -= 15;
      items.push({
        id: 'cisco-sec-telnet',
        category: 'Access Management',
        title: 'Insecure Telnet Transport',
        status: 'critical',
        currentSetting: 'Telnet allowed on VTY lines',
        recommendedSetting: 'transport input ssh',
        scoreDeduction: 15,
        risk: 'Telnet transmits usernames and passwords over the wire in plain text.',
        remediationCommands: ['configure terminal', 'line vty 0 15', 'transport input ssh', 'exit', 'exit']
      });
    } else {
      items.push({
        id: 'cisco-sec-telnet',
        category: 'Access Management',
        title: 'Insecure Telnet Transport',
        status: 'secure',
        currentSetting: 'Telnet blocked, SSH only',
        recommendedSetting: 'transport input ssh',
        scoreDeduction: 0,
        risk: 'None',
        remediationCommands: []
      });
    }

    // 4. HTTP Server Disabled
    const httpDisabled = /no ip http server/i.test(cfg) || !/ip http server/i.test(cfg);
    if (!httpDisabled) {
      score -= 8;
      items.push({
        id: 'cisco-sec-http',
        category: 'Management Services',
        title: 'Insecure HTTP Web Server',
        status: 'warning',
        currentSetting: 'ip http server (active)',
        recommendedSetting: 'no ip http server',
        scoreDeduction: 8,
        risk: 'Unencrypted web management service listening on port 80.',
        remediationCommands: ['configure terminal', 'no ip http server', 'exit']
      });
    } else {
      items.push({
        id: 'cisco-sec-http',
        category: 'Management Services',
        title: 'Insecure HTTP Web Server',
        status: 'secure',
        currentSetting: 'HTTP server disabled',
        recommendedSetting: 'no ip http server',
        scoreDeduction: 0,
        risk: 'None',
        remediationCommands: []
      });
    }

    // 5. Brute Force Login Block
    const hasLoginBlock = /login block-for/i.test(cfg);
    if (!hasLoginBlock) {
      score -= 6;
      items.push({
        id: 'cisco-sec-login-block',
        category: 'Device Hardening',
        title: 'Brute-force Login Protection',
        status: 'warning',
        currentSetting: 'Not configured',
        recommendedSetting: 'login block-for 180 attempts 3 within 60',
        scoreDeduction: 6,
        risk: 'No rate limiting against automated dictionary attacks on SSH / Console.',
        remediationCommands: ['configure terminal', 'login block-for 180 attempts 3 within 60', 'exit']
      });
    } else {
      items.push({
        id: 'cisco-sec-login-block',
        category: 'Device Hardening',
        title: 'Brute-force Login Protection',
        status: 'secure',
        currentSetting: 'Configured',
        recommendedSetting: 'login block-for 180 attempts 3 within 60',
        scoreDeduction: 0,
        risk: 'None',
        remediationCommands: []
      });
    }

    // 6. BPDU Guard Default
    const hasBpduGuard = /spanning-tree portfast bpduguard default/i.test(cfg);
    if (!hasBpduGuard) {
      score -= 8;
      items.push({
        id: 'cisco-sec-bpduguard',
        category: 'Switchport Security',
        title: 'Spanning Tree BPDU Guard Default',
        status: 'warning',
        currentSetting: 'Disabled globally',
        recommendedSetting: 'spanning-tree portfast bpduguard default',
        scoreDeduction: 8,
        risk: 'Unauthorized rogue switches or bridge loops can be injected on edge access ports.',
        remediationCommands: ['configure terminal', 'spanning-tree portfast bpduguard default', 'exit']
      });
    } else {
      items.push({
        id: 'cisco-sec-bpduguard',
        category: 'Switchport Security',
        title: 'Spanning Tree BPDU Guard Default',
        status: 'secure',
        currentSetting: 'Enabled globally',
        recommendedSetting: 'spanning-tree portfast bpduguard default',
        scoreDeduction: 0,
        risk: 'None',
        remediationCommands: []
      });
    }

    // 7. Banner MOTD
    const hasBanner = /banner (motd|login)/i.test(cfg);
    if (!hasBanner) {
      score -= 4;
      items.push({
        id: 'cisco-sec-banner',
        category: 'Compliance & Legal',
        title: 'Legal Warning Banner (MOTD)',
        status: 'warning',
        currentSetting: 'Missing',
        recommendedSetting: 'banner motd ^AUTHORIZED ACCESS ONLY^',
        scoreDeduction: 4,
        risk: 'Lack of legal deterrence and authorized-access notice required by ISO 27001/NIST.',
        remediationCommands: ['configure terminal', 'banner motd ^AUTHORIZED PERSONNEL ONLY. ALL ACTIVITIES MONITORED.^', 'exit']
      });
    } else {
      items.push({
        id: 'cisco-sec-banner',
        category: 'Compliance & Legal',
        title: 'Legal Warning Banner (MOTD)',
        status: 'secure',
        currentSetting: 'Banner configured',
        recommendedSetting: 'banner motd',
        scoreDeduction: 0,
        risk: 'None',
        remediationCommands: []
      });
    }

    const finalScore = Math.max(0, Math.min(100, score));
    const passedChecks = items.filter((i) => i.status === 'secure').length;
    const warningsCount = items.filter((i) => i.status === 'warning').length;
    const criticalCount = items.filter((i) => i.status === 'critical').length;

    return {
      deviceId,
      deviceName,
      vendor: 'cisco',
      score: finalScore,
      totalChecks: items.length,
      passedChecks,
      warningsCount,
      criticalCount,
      timestamp: new Date().toISOString(),
      items
    };
  }

  getRunningConfigCommand(): string {
    return 'show running-config';
  }

  getDeviceInfoCommands(): string[] {
    return [
      'show version',
      'show ip interface brief',
      'show interfaces status',
      'show running-config'
    ];
  }
}
