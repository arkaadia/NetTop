/**
 * MikroTik RouterOS Configuration Templates
 * Decoupled from Frontend presentation.
 */

import { GeneratedConfigResult } from './ciscoTemplates';

export const MikrotikTemplates = {
  // 1. IP Routing & Gateway
  staticRoute(params: {
    dstAddress: string; // e.g. "192.168.50.0/24" or "0.0.0.0/0"
    gateway: string;
    distance?: number;
    checkGateway?: 'ping' | 'none';
    comment?: string;
  }): GeneratedConfigResult {
    const check = params.checkGateway === 'ping' ? ' check-gateway=ping' : '';
    const dist = params.distance ? ` distance=${params.distance}` : '';
    const comm = params.comment ? ` comment="${params.comment}"` : '';

    const cmd = `/ip route add dst-address=${params.dstAddress} gateway=${params.gateway}${dist}${check}${comm}`;
    const rollback = `/ip route remove [find dst-address="${params.dstAddress}" and gateway="${params.gateway}"]`;

    return {
      commands: [cmd],
      verificationCommands: [
        `/ip route print detail where dst-address="${params.dstAddress}"`,
        `/ping ${params.gateway} count=3`
      ],
      rollbackCommands: [rollback],
      explanation: `Adds RouterOS static route for ${params.dstAddress} via gateway ${params.gateway}.`
    };
  },

  // 2. WireGuard VPN
  wireguard(params: {
    interfaceName: string;
    listenPort: number;
    privateKey?: string;
    peers: Array<{
      publicKey: string;
      allowedAddress: string;
      endpointAddress?: string;
      endpointPort?: number;
      comment?: string;
    }>;
  }): GeneratedConfigResult {
    const iface = params.interfaceName || 'wg0';
    const cmds: string[] = [];
    cmds.push(`/interface wireguard add name=${iface} listen-port=${params.listenPort}`);

    for (const p of params.peers) {
      let peerCmd = `/interface wireguard peers add interface=${iface} public-key="${p.publicKey}" allowed-address=${p.allowedAddress}`;
      if (p.endpointAddress && p.endpointPort) {
        peerCmd += ` endpoint-address=${p.endpointAddress} endpoint-port=${p.endpointPort}`;
      }
      if (p.comment) {
        peerCmd += ` comment="${p.comment}"`;
      }
      cmds.push(peerCmd);
    }

    return {
      commands: cmds,
      verificationCommands: [
        `/interface wireguard print`,
        `/interface wireguard peers print detail`
      ],
      rollbackCommands: [`/interface wireguard remove [find name="${iface}"]`],
      explanation: `Configures WireGuard interface '${iface}' on port ${params.listenPort} with ${params.peers.length} peer(s).`
    };
  },

  // 3. Firewall Protection & Hardening
  firewallHardening(params: {
    wanInterfaceList?: string;
    protectWinbox?: boolean;
    dropInvalid?: boolean;
    fasttrack?: boolean;
    bruteForceProtection?: boolean;
  }): GeneratedConfigResult {
    const wan = params.wanInterfaceList || 'WAN';
    const cmds: string[] = [];

    if (params.fasttrack) {
      cmds.push(`/ip firewall filter add chain=forward action=fasttrack-connection connection-state=established,related comment="defconf: fasttrack"`);
    }
    cmds.push(`/ip firewall filter add chain=forward action=accept connection-state=established,related,untracked comment="accept established/related"`);

    if (params.dropInvalid) {
      cmds.push(`/ip firewall filter add chain=forward action=drop connection-state=invalid comment="drop invalid forward"`);
      cmds.push(`/ip firewall filter add chain=input action=drop connection-state=invalid comment="drop invalid input"`);
    }

    // Brute-force protection for SSH
    if (params.bruteForceProtection) {
      cmds.push(`/ip firewall filter add chain=input protocol=tcp dst-port=22 connection-state=new src-address-list=ssh_blacklist action=drop comment="drop ssh brute forcers"`);
      cmds.push(`/ip firewall filter add chain=input protocol=tcp dst-port=22 connection-state=new src-address-list=ssh_stage3 action=add-src-to-address-list address-list=ssh_blacklist address-list-timeout=10d comment="blacklist stage 3"`);
      cmds.push(`/ip firewall filter add chain=input protocol=tcp dst-port=22 connection-state=new src-address-list=ssh_stage2 action=add-src-to-address-list address-list=ssh_stage3 address-list-timeout=1m comment="stage 2"`);
      cmds.push(`/ip firewall filter add chain=input protocol=tcp dst-port=22 connection-state=new action=add-src-to-address-list address-list=ssh_stage2 address-list-timeout=1m comment="stage 1"`);
    }

    cmds.push(`/ip firewall filter add chain=input action=accept protocol=icmp comment="accept ICMP"`);
    cmds.push(`/ip firewall filter add chain=input action=accept in-interface-list=LAN comment="accept LAN management"`);
    cmds.push(`/ip firewall filter add chain=input action=drop in-interface-list=${wan} comment="drop all WAN input"`);

    return {
      commands: cmds,
      verificationCommands: ['/ip firewall filter print'],
      rollbackCommands: ['/ip firewall filter print'],
      explanation: 'Applies RouterOS stateful firewall baseline (Fasttrack, Drop invalid, SSH brute-force blacklist, WAN input drop).'
    };
  },

  // 4. NAT & Masquerade
  nat(params: {
    type: 'masquerade' | 'dstnat';
    outInterface?: string;
    protocol?: 'tcp' | 'udp';
    dstPort?: number;
    toAddresses?: string;
    toPorts?: number;
    comment?: string;
  }): GeneratedConfigResult {
    const cmds: string[] = [];
    if (params.type === 'masquerade') {
      const out = params.outInterface ? ` out-interface=${params.outInterface}` : '';
      const comm = params.comment ? ` comment="${params.comment}"` : ' comment="default NAT masquerade"';
      cmds.push(`/ip firewall nat add chain=srcnat action=masquerade${out}${comm}`);
    } else if (params.type === 'dstnat' && params.dstPort && params.toAddresses) {
      const proto = params.protocol || 'tcp';
      const toP = params.toPorts ? ` to-ports=${params.toPorts}` : '';
      const comm = params.comment ? ` comment="${params.comment}"` : ` comment="port-forward ${params.dstPort}"`;
      cmds.push(`/ip firewall nat add chain=dstnat action=dst-nat protocol=${proto} dst-port=${params.dstPort} to-addresses=${params.toAddresses}${toP}${comm}`);
    }

    return {
      commands: cmds,
      verificationCommands: ['/ip firewall nat print'],
      rollbackCommands: ['/ip firewall nat print'],
      explanation: `Configures MikroTik NAT (${params.type}).`
    };
  },

  // 5. VLAN & Bridge Filtering
  bridgeVlan(params: {
    vlanId: number;
    bridgeName?: string;
    taggedInterfaces: string[];
    untaggedInterfaces: string[];
    comment?: string;
  }): GeneratedConfigResult {
    const bridge = params.bridgeName || 'bridge';
    const taggedStr = params.taggedInterfaces.length > 0 ? ` tagged=${params.taggedInterfaces.join(',')}` : '';
    const untaggedStr = params.untaggedInterfaces.length > 0 ? ` untagged=${params.untaggedInterfaces.join(',')}` : '';
    const comm = params.comment ? ` comment="${params.comment}"` : '';

    const cmds = [
      `/interface bridge vlan add bridge=${bridge} vlan-ids=${params.vlanId}${taggedStr}${untaggedStr}${comm}`,
      `/interface bridge set ${bridge} vlan-filtering=yes`
    ];

    return {
      commands: cmds,
      verificationCommands: [
        `/interface bridge vlan print detail where vlan-ids=${params.vlanId}`,
        `/interface bridge print`
      ],
      rollbackCommands: [`/interface bridge vlan remove [find vlan-ids=${params.vlanId}]`],
      explanation: `Configures Hardware-accelerated Bridge VLAN filtering for VLAN ${params.vlanId} on ${bridge}.`
    };
  },

  // 6. DHCP Server
  dhcp(params: {
    interfaceName: string;
    poolName: string;
    poolRange: string; // e.g. "192.168.88.10-192.168.88.254"
    network: string; // e.g. "192.168.88.0/24"
    gateway: string;
    dnsServers?: string[];
  }): GeneratedConfigResult {
    const dns = params.dnsServers ? ` dns-server=${params.dnsServers.join(',')}` : '';
    const cmds = [
      `/ip pool add name=${params.poolName} ranges=${params.poolRange}`,
      `/ip dhcp-server add name=dhcp-${params.poolName} interface=${params.interfaceName} address-pool=${params.poolName} disabled=no`,
      `/ip dhcp-server network add address=${params.network} gateway=${params.gateway}${dns}`
    ];

    return {
      commands: cmds,
      verificationCommands: [
        `/ip dhcp-server print`,
        `/ip pool print`,
        `/ip dhcp-server lease print`
      ],
      rollbackCommands: [
        `/ip dhcp-server remove [find name="dhcp-${params.poolName}"]`,
        `/ip pool remove [find name="${params.poolName}"]`
      ],
      explanation: `Configures RouterOS DHCP Server on ${params.interfaceName} serving pool ${params.poolRange}.`
    };
  },

  // 7. Dual WAN Failover (Recursive Routing)
  dualWanFailover(params: {
    wan1Gateway: string;
    wan2Gateway: string;
    checkHost?: string; // e.g. "1.1.1.1" or "8.8.8.8"
    wan1Distance?: number;
    wan2Distance?: number;
  }): GeneratedConfigResult {
    const host = params.checkHost || '1.1.1.1';
    const cmds = [
      `/ip route add dst-address=${host}/32 gateway=${params.wan1Gateway} scope=10 comment="Host check for WAN1"`,
      `/ip route add dst-address=0.0.0.0/0 gateway=${host} check-gateway=ping distance=${params.wan1Distance || 1} target-scope=11 comment="Primary WAN (Recursive)"`,
      `/ip route add dst-address=0.0.0.0/0 gateway=${params.wan2Gateway} distance=${params.wan2Distance || 2} comment="Secondary WAN Backup"`
    ];

    return {
      commands: cmds,
      verificationCommands: [
        `/ip route print where dst-address="0.0.0.0/0"`
      ],
      rollbackCommands: [
        `/ip route remove [find comment="Host check for WAN1"]`,
        `/ip route remove [find comment="Primary WAN (Recursive)"]`,
        `/ip route remove [find comment="Secondary WAN Backup"]`
      ],
      explanation: `Configures recursive routing dual WAN failover: WAN1 monitors ${host} via ${params.wan1Gateway}, failover to WAN2 (${params.wan2Gateway}).`
    };
  },

  // 8. Security Hardening
  securityHardening(params: {
    disableTelnet?: boolean;
    disableFtp?: boolean;
    disableWww?: boolean;
    disableApi?: boolean;
    strongSshCrypto?: boolean;
    allowedWinboxSubnet?: string;
  }): GeneratedConfigResult {
    const cmds: string[] = [];
    if (params.disableTelnet) cmds.push(`/ip service disable telnet`);
    if (params.disableFtp) cmds.push(`/ip service disable ftp`);
    if (params.disableWww) cmds.push(`/ip service disable www`);
    if (params.disableApi) {
      cmds.push(`/ip service disable api`);
      cmds.push(`/ip service disable api-ssl`);
    }
    if (params.strongSshCrypto) {
      cmds.push(`/ip ssh set strong-crypto=yes host-key-size=2048`);
    }
    if (params.allowedWinboxSubnet) {
      cmds.push(`/ip service set winbox address="${params.allowedWinboxSubnet}"`);
    }

    return {
      commands: cmds,
      verificationCommands: ['/ip service print', '/ip ssh print'],
      rollbackCommands: ['/ip service print'],
      explanation: 'Hardens MikroTik RouterOS services (disables telnet/ftp/www/api, enables strong ssh crypto, restricts winbox).'
    };
  }
};
