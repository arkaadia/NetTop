import { AutomationTaskRequest, ValidationResult, RiskLevel } from './types';

const IPV4_REGEX = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const SUBNET_MASK_REGEX = /^(255|254|252|248|240|224|192|128|0)(\.0){0,3}$|^(255\.(255|254|252|248|240|224|192|128|0))(\.0){0,2}$|^(255\.255\.(255|254|252|248|240|224|192|128|0))(\.0)?$|^(255\.255\.255\.(255|254|252|248|240|224|192|128|0))$/;

export function isValidIpv4(ip: string): boolean {
  if (!ip) return false;
  return IPV4_REGEX.test(ip.trim());
}

export function isValidSubnetMask(mask: string): boolean {
  if (!mask) return false;
  return SUBNET_MASK_REGEX.test(mask.trim()) || mask.trim() === '0.0.0.0';
}

export function isValidVlanId(vlan: number): boolean {
  return Number.isInteger(vlan) && vlan >= 1 && vlan <= 4094;
}

export function validateAutomationTask(task: AutomationTaskRequest): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let riskLevel: RiskLevel = 'low';
  let impactDescription = 'Low impact configuration task.';

  const params = task.parameters || {};

  // 1. Common IP parameter checks
  if (params.destination && !isValidIpv4(params.destination)) {
    errors.push(`Invalid destination IPv4 address format: "${params.destination}"`);
  }
  if (params.nextHop && !isValidIpv4(params.nextHop)) {
    errors.push(`Invalid next-hop IPv4 address format: "${params.nextHop}"`);
  }
  if (params.mask && !isValidSubnetMask(params.mask)) {
    errors.push(`Invalid subnet mask: "${params.mask}"`);
  }
  if (params.ip && !isValidIpv4(params.ip)) {
    errors.push(`Invalid IPv4 address format: "${params.ip}"`);
  }

  // 2. Category-specific validation and risk assignment
  switch (task.category) {
    case 'routing': {
      if (task.actionName === 'staticRoute') {
        if (!params.destination) errors.push('Destination prefix is required.');
        if (!params.mask) errors.push('Subnet mask is required.');
        if (!params.nextHop && !params.outgoingInterface) {
          errors.push('Either next-hop IP or outgoing interface is required.');
        }
        if (params.destination === '0.0.0.0' || params.mask === '0.0.0.0') {
          riskLevel = 'high';
          impactDescription = 'Default route change directly impacts gateway egress traffic for all connected networks.';
          warnings.push('Modifying default route may disrupt management access or external internet routing.');
        } else {
          riskLevel = 'medium';
          impactDescription = `Static route insertion towards ${params.destination}.`;
        }
      } else if (task.actionName === 'ospf') {
        riskLevel = 'medium';
        impactDescription = `OSPF dynamic routing modification (Process ID ${params.processId || 1}).`;
        if (params.processId && (params.processId < 1 || params.processId > 65535)) {
          errors.push('OSPF Process ID must be between 1 and 65535.');
        }
        if (!params.networks || params.networks.length === 0) {
          errors.push('At least one network statement is required for OSPF.');
        }
      } else if (task.actionName === 'bgp') {
        riskLevel = 'critical';
        impactDescription = 'BGP configuration affects Autonomous System peering and internet/transit routing tables.';
        warnings.push('BGP alterations may trigger flap damping or route withdrawal on upstream peers.');
        if (!params.localAs || params.localAs < 1) {
          errors.push('Valid Local BGP Autonomous System number is required.');
        }
      }
      break;
    }

    case 'switching': {
      if (task.actionName === 'accessPort') {
        riskLevel = 'medium';
        impactDescription = `Assigns interface ${params.interfaceName} to Access VLAN ${params.vlan}.`;
        if (!params.interfaceName) errors.push('Target interface name is required.');
        if (!isValidVlanId(Number(params.vlan))) {
          errors.push(`VLAN ID must be between 1 and 4094 (received: ${params.vlan}).`);
        }
      } else if (task.actionName === 'trunkPort') {
        riskLevel = 'high';
        impactDescription = `Converts interface ${params.interfaceName} to Trunk port with allowed VLANs: ${params.allowedVlans}.`;
        if (!params.interfaceName) errors.push('Target interface name is required.');
        if (!params.allowedVlans) errors.push('Allowed VLAN list is required for trunk port.');
      }
      break;
    }

    case 'vlan': {
      riskLevel = 'medium';
      impactDescription = 'VLAN database and SVI interface management.';
      if (Array.isArray(params.vlans)) {
        for (const v of params.vlans) {
          if (!isValidVlanId(Number(v.id))) {
            errors.push(`Invalid VLAN ID: ${v.id}. Must be between 1 and 4094.`);
          }
          if (v.ip && !isValidIpv4(v.ip)) {
            errors.push(`Invalid SVI IP address on VLAN ${v.id}: "${v.ip}"`);
          }
        }
      }
      break;
    }

    case 'etherchannel': {
      riskLevel = 'high';
      impactDescription = `Aggregates links into Port-Channel ${params.channelId}.`;
      if (!params.channelId || params.channelId < 1 || params.channelId > 255) {
        errors.push('Port-Channel ID must be between 1 and 255.');
      }
      if (!params.interfaces || params.interfaces.length < 2) {
        errors.push('EtherChannel requires at least 2 member interfaces.');
      }
      warnings.push('All member interfaces must share identical speed, duplex, and STP states.');
      break;
    }

    case 'stp': {
      riskLevel = 'high';
      impactDescription = 'Spanning Tree topology calculation modification.';
      warnings.push('Changing STP root priority may cause temporary topology reconvergence and port state transitions.');
      break;
    }

    case 'nat': {
      riskLevel = 'medium';
      impactDescription = `NAT translation rule modification (${params.type}).`;
      if (!params.insideInterface || !params.outsideInterface) {
        errors.push('Both Inside and Outside interfaces are required for NAT.');
      }
      break;
    }

    case 'security': {
      riskLevel = 'high';
      impactDescription = 'Applies security baseline, ACLs, SSH cryptographic profiles, and management access restrictions.';
      warnings.push('Ensure current administrative SSH credentials match before applying management ACLs.');
      break;
    }

    default: {
      riskLevel = 'low';
      impactDescription = `Configuration change for category: ${task.category}.`;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    riskLevel,
    impactDescription,
    suggestedFix: errors.length > 0 ? 'Correct the invalid parameters above before generating configuration.' : undefined
  };
}
