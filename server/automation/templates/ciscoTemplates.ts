/**
 * Cisco IOS / IOS-XE Configuration Templates
 * Decoupled from Frontend presentation.
 */

export interface GeneratedConfigResult {
  commands: string[];
  verificationCommands: string[];
  rollbackCommands: string[];
  explanation: string;
}

export const CiscoTemplates = {
  // 1. Static & Floating Routing
  staticRoute(params: {
    destination: string;
    mask: string;
    nextHop?: string;
    outgoingInterface?: string;
    distance?: number;
    tag?: number;
    name?: string;
  }): GeneratedConfigResult {
    const target = `${params.destination} ${params.mask}`;
    const hop = params.nextHop || params.outgoingInterface || '';
    const distanceStr = params.distance && params.distance > 1 ? ` ${params.distance}` : '';
    const nameStr = params.name ? ` name ${params.name}` : '';
    const tagStr = params.tag ? ` tag ${params.tag}` : '';

    const cmd = `ip route ${target} ${hop}${distanceStr}${nameStr}${tagStr}`.trim();
    const rollback = `no ip route ${target} ${hop}${distanceStr}`.trim();

    return {
      commands: ['configure terminal', cmd, 'exit'],
      verificationCommands: [
        `show ip route ${params.destination} ${params.mask}`,
        `show ip route static`
      ],
      rollbackCommands: ['configure terminal', rollback, 'exit'],
      explanation: `Configures static route towards ${params.destination}/${params.mask} via ${hop}${params.distance ? ` with AD ${params.distance}` : ''}.`
    };
  },

  // 2. OSPF Routing
  ospf(params: {
    processId: number;
    routerId?: string;
    networks: Array<{ network: string; wildcard: string; area: number }>;
    passiveInterfaces?: string[];
    defaultInformationOriginate?: boolean;
  }): GeneratedConfigResult {
    const pId = params.processId || 1;
    const cmds: string[] = ['configure terminal', `router ospf ${pId}`];
    const rollbackCmds: string[] = ['configure terminal', `no router ospf ${pId}`, 'exit'];

    if (params.routerId) {
      cmds.push(` router-id ${params.routerId}`);
    }
    for (const net of params.networks) {
      cmds.push(` network ${net.network} ${net.wildcard} area ${net.area}`);
    }
    if (params.passiveInterfaces && params.passiveInterfaces.length > 0) {
      for (const iface of params.passiveInterfaces) {
        cmds.push(` passive-interface ${iface}`);
      }
    }
    if (params.defaultInformationOriginate) {
      cmds.push(' default-information originate always');
    }
    cmds.push('exit');
    cmds.push('exit');

    return {
      commands: cmds,
      verificationCommands: [
        `show ip ospf ${pId}`,
        'show ip ospf neighbor',
        'show ip ospf interface brief',
        'show ip route ospf'
      ],
      rollbackCommands: rollbackCmds,
      explanation: `Configures OSPF process ${pId} with ${params.networks.length} network statements and router-id ${params.routerId || 'auto'}.`
    };
  },

  // 3. EIGRP Routing
  eigrp(params: {
    asNumber: number;
    networks: Array<{ network: string; wildcard?: string }>;
    passiveInterfaces?: string[];
    autoSummary?: boolean;
  }): GeneratedConfigResult {
    const as = params.asNumber || 100;
    const cmds: string[] = ['configure terminal', `router eigrp ${as}`];
    const rollbackCmds: string[] = ['configure terminal', `no router eigrp ${as}`, 'exit'];

    if (!params.autoSummary) {
      cmds.push(' no auto-summary');
    }
    for (const n of params.networks) {
      if (n.wildcard) {
        cmds.push(` network ${n.network} ${n.wildcard}`);
      } else {
        cmds.push(` network ${n.network}`);
      }
    }
    if (params.passiveInterfaces) {
      for (const p of params.passiveInterfaces) {
        cmds.push(` passive-interface ${p}`);
      }
    }
    cmds.push('exit');
    cmds.push('exit');

    return {
      commands: cmds,
      verificationCommands: [
        `show ip eigrp neighbors`,
        `show ip eigrp interfaces`,
        `show ip route eigrp`
      ],
      rollbackCommands: rollbackCmds,
      explanation: `Configures Cisco EIGRP AS ${as} with ${params.networks.length} network statements.`
    };
  },

  // 4. BGP Routing
  bgp(params: {
    localAs: number;
    routerId?: string;
    neighbors: Array<{ ip: string; remoteAs: number; description?: string; updateSource?: string }>;
    networks?: Array<{ network: string; mask: string }>;
  }): GeneratedConfigResult {
    const as = params.localAs;
    const cmds: string[] = ['configure terminal', `router bgp ${as}`];
    if (params.routerId) {
      cmds.push(` bgp router-id ${params.routerId}`);
    }
    for (const neigh of params.neighbors) {
      cmds.push(` neighbor ${neigh.ip} remote-as ${neigh.remoteAs}`);
      if (neigh.description) {
        cmds.push(` neighbor ${neigh.ip} description ${neigh.description}`);
      }
      if (neigh.updateSource) {
        cmds.push(` neighbor ${neigh.ip} update-source ${neigh.updateSource}`);
      }
    }
    if (params.networks) {
      for (const n of params.networks) {
        cmds.push(` network ${n.network} mask ${n.mask}`);
      }
    }
    cmds.push('exit');
    cmds.push('exit');

    return {
      commands: cmds,
      verificationCommands: [
        `show ip bgp summary`,
        `show ip bgp neighbors`,
        `show ip route bgp`
      ],
      rollbackCommands: ['configure terminal', `no router bgp ${as}`, 'exit'],
      explanation: `Configures BGP AS ${as} with ${params.neighbors.length} peer neighbor(s).`
    };
  },

  // 5. Router-to-Router Wizard (P2P Link + Routing)
  routerToRouterLink(params: {
    routerAName: string;
    routerAInterface: string;
    routerAAddress: string;
    routerBName: string;
    routerBInterface: string;
    routerBAddress: string;
    subnetMask: string;
    routingProtocol: 'static' | 'ospf' | 'eigrp' | 'bgp';
    ospfArea?: number;
    ospfProcessId?: number;
    asNumber?: number;
  }): { routerA: GeneratedConfigResult; routerB: GeneratedConfigResult } {
    const pId = params.ospfProcessId || 1;
    const area = params.ospfArea !== undefined ? params.ospfArea : 0;
    const as = params.asNumber || 100;

    // Config for Router A
    const cmdsA = [
      'configure terminal',
      `interface ${params.routerAInterface}`,
      ` description P2P-LINK-TO-${params.routerBName.toUpperCase()}`,
      ` ip address ${params.routerAAddress} ${params.subnetMask}`,
      ' no shutdown',
      'exit'
    ];
    const rollbackA = [
      'configure terminal',
      `interface ${params.routerAInterface}`,
      ' shutdown',
      ' no ip address',
      ' no description',
      'exit'
    ];

    // Config for Router B
    const cmdsB = [
      'configure terminal',
      `interface ${params.routerBInterface}`,
      ` description P2P-LINK-TO-${params.routerAName.toUpperCase()}`,
      ` ip address ${params.routerBAddress} ${params.subnetMask}`,
      ' no shutdown',
      'exit'
    ];
    const rollbackB = [
      'configure terminal',
      `interface ${params.routerBInterface}`,
      ' shutdown',
      ' no ip address',
      ' no description',
      'exit'
    ];

    if (params.routingProtocol === 'ospf') {
      cmdsA.push(`router ospf ${pId}`);
      cmdsA.push(` network ${params.routerAAddress} 0.0.0.0 area ${area}`);
      cmdsA.push('exit');

      cmdsB.push(`router ospf ${pId}`);
      cmdsB.push(` network ${params.routerBAddress} 0.0.0.0 area ${area}`);
      cmdsB.push('exit');
    } else if (params.routingProtocol === 'eigrp') {
      cmdsA.push(`router eigrp ${as}`);
      cmdsA.push(` network ${params.routerAAddress} 0.0.0.0`);
      cmdsA.push('exit');

      cmdsB.push(`router eigrp ${as}`);
      cmdsB.push(` network ${params.routerBAddress} 0.0.0.0`);
      cmdsB.push('exit');
    }
    cmdsA.push('exit');
    cmdsB.push('exit');

    return {
      routerA: {
        commands: cmdsA,
        verificationCommands: [
          `show ip interface brief | include ${params.routerAInterface}`,
          `ping ${params.routerBAddress}`,
          params.routingProtocol === 'ospf' ? 'show ip ospf neighbor' : 'show ip route'
        ],
        rollbackCommands: rollbackA,
        explanation: `Configures ${params.routerAName} interface ${params.routerAInterface} (${params.routerAAddress}) linking to ${params.routerBName}.`
      },
      routerB: {
        commands: cmdsB,
        verificationCommands: [
          `show ip interface brief | include ${params.routerBInterface}`,
          `ping ${params.routerAAddress}`,
          params.routingProtocol === 'ospf' ? 'show ip ospf neighbor' : 'show ip route'
        ],
        rollbackCommands: rollbackB,
        explanation: `Configures ${params.routerBName} interface ${params.routerBInterface} (${params.routerBAddress}) linking to ${params.routerAName}.`
      }
    };
  },

  // 6. Switching: Access Port
  accessPort(params: {
    interfaceName: string;
    vlan: number;
    description?: string;
    portFast?: boolean;
    bpduGuard?: boolean;
    adminStatus?: 'up' | 'down';
  }): GeneratedConfigResult {
    const iface = params.interfaceName;
    const cmds: string[] = ['configure terminal', `interface ${iface}`];
    if (params.description) cmds.push(` description ${params.description}`);
    cmds.push(' switchport mode access');
    cmds.push(` switchport access vlan ${params.vlan}`);
    if (params.portFast) cmds.push(' spanning-tree portfast');
    if (params.bpduGuard) cmds.push(' spanning-tree bpduguard enable');
    if (params.adminStatus === 'down') {
      cmds.push(' shutdown');
    } else {
      cmds.push(' no shutdown');
    }
    cmds.push('exit');
    cmds.push('exit');

    return {
      commands: cmds,
      verificationCommands: [
        `show running-config interface ${iface}`,
        `show interfaces ${iface} switchport`,
        `show interfaces ${iface} status`
      ],
      rollbackCommands: [
        'configure terminal',
        `interface ${iface}`,
        ' no switchport access vlan',
        ' no spanning-tree portfast',
        ' no spanning-tree bpduguard enable',
        ' exit',
        'exit'
      ],
      explanation: `Configures ${iface} as Access port in VLAN ${params.vlan}${params.portFast ? ' with PortFast & BPDU Guard' : ''}.`
    };
  },

  // 7. Switching: Trunk Port
  trunkPort(params: {
    interfaceName: string;
    nativeVlan?: number;
    allowedVlans: string; // e.g. "10,20,30" or "all"
    description?: string;
    encapsulationDot1q?: boolean;
  }): GeneratedConfigResult {
    const iface = params.interfaceName;
    const cmds: string[] = ['configure terminal', `interface ${iface}`];
    if (params.description) cmds.push(` description ${params.description}`);
    if (params.encapsulationDot1q) cmds.push(' switchport trunk encapsulation dot1q');
    cmds.push(' switchport mode trunk');
    if (params.nativeVlan) cmds.push(` switchport trunk native vlan ${params.nativeVlan}`);
    if (params.allowedVlans && params.allowedVlans.toLowerCase() !== 'all') {
      cmds.push(` switchport trunk allowed vlan ${params.allowedVlans}`);
    }
    cmds.push(' no shutdown');
    cmds.push('exit');
    cmds.push('exit');

    return {
      commands: cmds,
      verificationCommands: [
        `show running-config interface ${iface}`,
        `show interfaces ${iface} trunk`,
        `show interfaces ${iface} switchport`
      ],
      rollbackCommands: [
        'configure terminal',
        `interface ${iface}`,
        ' switchport mode access',
        ' no switchport trunk allowed vlan',
        ' exit',
        'exit'
      ],
      explanation: `Configures ${iface} as 802.1Q Trunk port allowing VLANs (${params.allowedVlans}).`
    };
  },

  // 8. VLAN Creation (Single & Batch)
  vlans(params: {
    vlans: Array<{ id: number; name?: string; ip?: string; mask?: string; shutdown?: boolean }>;
  }): GeneratedConfigResult {
    const cmds: string[] = ['configure terminal'];
    const rollbackCmds: string[] = ['configure terminal'];

    for (const v of params.vlans) {
      cmds.push(`vlan ${v.id}`);
      if (v.name) cmds.push(` name ${v.name}`);
      cmds.push('exit');
      rollbackCmds.push(`no vlan ${v.id}`);

      if (v.ip && v.mask) {
        cmds.push(`interface Vlan${v.id}`);
        if (v.name) cmds.push(` description SVI-${v.name.toUpperCase()}`);
        cmds.push(` ip address ${v.ip} ${v.mask}`);
        cmds.push(v.shutdown ? ' shutdown' : ' no shutdown');
        cmds.push('exit');
        rollbackCmds.push(`no interface Vlan${v.id}`);
      }
    }
    cmds.push('exit');
    rollbackCmds.push('exit');

    return {
      commands: cmds,
      verificationCommands: ['show vlan brief', 'show ip interface brief | include Vlan'],
      rollbackCommands: rollbackCmds,
      explanation: `Creates ${params.vlans.length} VLAN(s) and associated Switch Virtual Interfaces (SVI).`
    };
  },

  // 9. EtherChannel (LACP, PAgP, Static)
  etherChannel(params: {
    channelId: number;
    interfaces: string[]; // e.g. ["GigabitEthernet1/0/1", "GigabitEthernet1/0/2"]
    mode: 'active' | 'passive' | 'desirable' | 'auto' | 'on';
    protocol?: 'lacp' | 'pagp';
    portType: 'trunk' | 'access';
    vlanOrAllowed: string;
    description?: string;
  }): GeneratedConfigResult {
    const cid = params.channelId;
    const cmds: string[] = ['configure terminal'];

    // Put member interfaces into channel-group
    for (const iface of params.interfaces) {
      cmds.push(`interface ${iface}`);
      if (params.description) cmds.push(` description Member-Po${cid}`);
      cmds.push(` channel-group ${cid} mode ${params.mode}`);
      cmds.push(' no shutdown');
      cmds.push('exit');
    }

    // Configure Port-Channel master interface
    cmds.push(`interface Port-channel${cid}`);
    if (params.description) cmds.push(` description ${params.description}`);
    if (params.portType === 'trunk') {
      cmds.push(' switchport trunk encapsulation dot1q');
      cmds.push(' switchport mode trunk');
      if (params.vlanOrAllowed && params.vlanOrAllowed !== 'all') {
        cmds.push(` switchport trunk allowed vlan ${params.vlanOrAllowed}`);
      }
    } else {
      cmds.push(' switchport mode access');
      cmds.push(` switchport access vlan ${params.vlanOrAllowed || '1'}`);
    }
    cmds.push(' no shutdown');
    cmds.push('exit');
    cmds.push('exit');

    const rollbackCmds = [
      'configure terminal',
      `no interface Port-channel${cid}`,
      ...params.interfaces.flatMap((iface) => [`interface ${iface}`, `no channel-group ${cid}`, 'exit']),
      'exit'
    ];

    return {
      commands: cmds,
      verificationCommands: [
        `show etherchannel ${cid} summary`,
        `show interfaces Port-channel${cid} status`,
        `show etherchannel port-channel`
      ],
      rollbackCommands: rollbackCmds,
      explanation: `Creates Port-Channel ${cid} aggregating ${params.interfaces.join(', ')} using mode '${params.mode}'.`
    };
  },

  // 10. Spanning Tree Protocol (STP)
  stp(params: {
    mode: 'rapid-pvst' | 'pvst' | 'mst';
    rootPrimaryVlans?: string;
    rootSecondaryVlans?: string;
    priorityVlans?: string;
    priorityValue?: number;
    bpduGuardGlobal?: boolean;
    portFastGlobal?: boolean;
  }): GeneratedConfigResult {
    const cmds: string[] = ['configure terminal'];
    cmds.push(`spanning-tree mode ${params.mode}`);

    if (params.rootPrimaryVlans) {
      cmds.push(`spanning-tree vlan ${params.rootPrimaryVlans} root primary`);
    }
    if (params.rootSecondaryVlans) {
      cmds.push(`spanning-tree vlan ${params.rootSecondaryVlans} root secondary`);
    }
    if (params.priorityVlans && params.priorityValue !== undefined) {
      cmds.push(`spanning-tree vlan ${params.priorityVlans} priority ${params.priorityValue}`);
    }
    if (params.bpduGuardGlobal) {
      cmds.push('spanning-tree portfast bpduguard default');
    }
    if (params.portFastGlobal) {
      cmds.push('spanning-tree portfast default');
    }
    cmds.push('exit');

    return {
      commands: cmds,
      verificationCommands: ['show spanning-tree summary', 'show spanning-tree root'],
      rollbackCommands: [
        'configure terminal',
        'spanning-tree mode rapid-pvst',
        'no spanning-tree portfast bpduguard default',
        'no spanning-tree portfast default',
        'exit'
      ],
      explanation: `Configures Spanning Tree mode to ${params.mode} and optimizes root bridge roles.`
    };
  },

  // 11. GRE & IPsec Tunnels
  greTunnel(params: {
    tunnelId: number;
    sourceInterfaceOrIp: string;
    destinationIp: string;
    localTunnelIp: string;
    remoteTunnelIp: string;
    subnetMask: string;
    mtu?: number;
    keepalive?: boolean;
    description?: string;
  }): GeneratedConfigResult {
    const tid = params.tunnelId;
    const cmds = [
      'configure terminal',
      `interface Tunnel${tid}`,
      params.description ? ` description ${params.description}` : ` description GRE-TUNNEL-${tid}`,
      ` ip address ${params.localTunnelIp} ${params.subnetMask}`,
      ` tunnel source ${params.sourceInterfaceOrIp}`,
      ` tunnel destination ${params.destinationIp}`,
      ' tunnel mode gre ip',
      ` ip mtu ${params.mtu || 1400}`,
      ' ip tcp adjust-mss 1360',
      params.keepalive ? ' keepalive 10 3' : '!',
      ' no shutdown',
      'exit',
      'exit'
    ].filter((c) => c !== '!');

    return {
      commands: cmds,
      verificationCommands: [
        `show interface Tunnel${tid}`,
        `ping ${params.remoteTunnelIp}`
      ],
      rollbackCommands: ['configure terminal', `no interface Tunnel${tid}`, 'exit'],
      explanation: `Configures GRE Tunnel${tid} between ${params.sourceInterfaceOrIp} and ${params.destinationIp}.`
    };
  },

  // 12. IP SLA + Tracking + WAN Failover
  ipSlaWithFailover(params: {
    slaId: number;
    targetIp: string;
    sourceInterface?: string;
    frequency?: number;
    trackId: number;
    primaryGateway: string;
    backupGateway: string;
    floatingDistance?: number;
  }): GeneratedConfigResult {
    const sla = params.slaId || 1;
    const trk = params.trackId || 1;
    const freq = params.frequency || 5;
    const floatAd = params.floatingDistance || 10;

    const cmds = [
      'configure terminal',
      `ip sla ${sla}`,
      ` icmp-echo ${params.targetIp}${params.sourceInterface ? ` source-interface ${params.sourceInterface}` : ''}`,
      ` frequency ${freq}`,
      ' timeout 2000',
      ' threshold 1000',
      'exit',
      `ip sla schedule ${sla} life forever start-time now`,
      `track ${trk} ip sla ${sla} reachability`,
      'exit',
      `ip route 0.0.0.0 0.0.0.0 ${params.primaryGateway} track ${trk}`,
      `ip route 0.0.0.0 0.0.0.0 ${params.backupGateway} ${floatAd}`,
      'exit'
    ];

    const rollbackCmds = [
      'configure terminal',
      `no ip route 0.0.0.0 0.0.0.0 ${params.primaryGateway} track ${trk}`,
      `no ip route 0.0.0.0 0.0.0.0 ${params.backupGateway} ${floatAd}`,
      `no track ${trk}`,
      `no ip sla ${sla}`,
      'exit'
    ];

    return {
      commands: cmds,
      verificationCommands: [
        `show ip sla summary`,
        `show track ${trk}`,
        `show ip route 0.0.0.0`
      ],
      rollbackCommands: rollbackCmds,
      explanation: `Configures IP SLA ${sla} monitoring ${params.targetIp} tracking Track ${trk}, with primary route (${params.primaryGateway}) and floating backup (${params.backupGateway}, AD ${floatAd}).`
    };
  },

  // 13. NAT & Port Forwarding
  nat(params: {
    type: 'static' | 'pat_interface' | 'port_forward';
    insideInterface: string;
    outsideInterface: string;
    localIp?: string;
    globalIp?: string;
    protocol?: 'tcp' | 'udp';
    localPort?: number;
    globalPort?: number;
    aclNumberOrName?: string;
    insideNetwork?: string;
    insideWildcard?: string;
  }): GeneratedConfigResult {
    const cmds = ['configure terminal'];
    cmds.push(`interface ${params.insideInterface}`);
    cmds.push(' ip nat inside');
    cmds.push('exit');
    cmds.push(`interface ${params.outsideInterface}`);
    cmds.push(' ip nat outside');
    cmds.push('exit');

    if (params.type === 'static' && params.localIp && params.globalIp) {
      cmds.push(`ip nat inside source static ${params.localIp} ${params.globalIp}`);
    } else if (params.type === 'port_forward' && params.localIp && params.globalIp && params.localPort && params.globalPort) {
      const proto = params.protocol || 'tcp';
      cmds.push(`ip nat inside source static ${proto} ${params.localIp} ${params.localPort} ${params.globalIp} ${params.globalPort}`);
    } else if (params.type === 'pat_interface') {
      const acl = params.aclNumberOrName || 'NAT-USERS';
      if (params.insideNetwork && params.insideWildcard) {
        cmds.push(`ip access-list standard ${acl}`);
        cmds.push(` permit ${params.insideNetwork} ${params.insideWildcard}`);
        cmds.push('exit');
      }
      cmds.push(`ip nat inside source list ${acl} interface ${params.outsideInterface} overload`);
    }
    cmds.push('exit');

    return {
      commands: cmds,
      verificationCommands: [
        'show ip nat translations',
        'show ip nat statistics'
      ],
      rollbackCommands: ['configure terminal', 'clear ip nat translation *', 'exit'],
      explanation: `Configures Cisco NAT (${params.type}) binding inside ${params.insideInterface} and outside ${params.outsideInterface}.`
    };
  },

  // 14. DHCP Server
  dhcpPool(params: {
    poolName: string;
    network: string;
    mask: string;
    defaultRouter?: string;
    dnsServers?: string[];
    domainName?: string;
    leaseDays?: number;
    excludedLow?: string;
    excludedHigh?: string;
  }): GeneratedConfigResult {
    const cmds = ['configure terminal'];
    if (params.excludedLow) {
      if (params.excludedHigh) {
        cmds.push(`ip dhcp excluded-address ${params.excludedLow} ${params.excludedHigh}`);
      } else {
        cmds.push(`ip dhcp excluded-address ${params.excludedLow}`);
      }
    }
    cmds.push(`ip dhcp pool ${params.poolName}`);
    cmds.push(` network ${params.network} ${params.mask}`);
    if (params.defaultRouter) cmds.push(` default-router ${params.defaultRouter}`);
    if (params.dnsServers && params.dnsServers.length > 0) {
      cmds.push(` dns-server ${params.dnsServers.join(' ')}`);
    }
    if (params.domainName) cmds.push(` domain-name ${params.domainName}`);
    if (params.leaseDays) cmds.push(` lease ${params.leaseDays}`);
    cmds.push('exit');
    cmds.push('exit');

    return {
      commands: cmds,
      verificationCommands: [
        `show ip dhcp pool ${params.poolName}`,
        'show ip dhcp binding'
      ],
      rollbackCommands: ['configure terminal', `no ip dhcp pool ${params.poolName}`, 'exit'],
      explanation: `Configures DHCP Server pool '${params.poolName}' serving ${params.network}/${params.mask}.`
    };
  },

  // 15. Comprehensive Security Hardening
  securityHardening(params: {
    domainName?: string;
    rsaKeySize?: number;
    enableSecret?: string;
    servicePasswordEncryption?: boolean;
    loginBlock?: { attempts: number; withinSeconds: number; lockSeconds: number };
    disableHttpTelnet?: boolean;
    bannerMotd?: string;
    managementAclSubnet?: string;
  }): GeneratedConfigResult {
    const cmds = ['configure terminal'];

    // 1. Password encryption
    if (params.servicePasswordEncryption) {
      cmds.push('service password-encryption');
    }

    // 2. Secret
    if (params.enableSecret) {
      cmds.push(`enable algorithm-type scrypt secret ${params.enableSecret}`);
    }

    // 3. Domain & SSH v2
    cmds.push(`ip domain-name ${params.domainName || 'corp.local'}`);
    cmds.push(`crypto key generate rsa modulus ${params.rsaKeySize || 2048}`);
    cmds.push('ip ssh version 2');
    cmds.push('ip ssh time-out 60');
    cmds.push('ip ssh authentication-retries 3');

    // 4. Disable insecure services
    if (params.disableHttpTelnet) {
      cmds.push('no ip http server');
      cmds.push('ip http secure-server');
      cmds.push('no service finger');
      cmds.push('no service pad');
      cmds.push('no service udp-small-servers');
      cmds.push('no service tcp-small-servers');
    }

    // 5. Brute Force Login Protection
    if (params.loginBlock) {
      cmds.push(`login block-for ${params.loginBlock.lockSeconds} attempts ${params.loginBlock.attempts} within ${params.loginBlock.withinSeconds}`);
    }

    // 6. VTY Lines Hardening
    cmds.push('line vty 0 15');
    cmds.push(' transport input ssh');
    cmds.push(' exec-timeout 10 0');
    cmds.push(' logging synchronous');
    cmds.push('exit');

    // 7. Console hardening
    cmds.push('line con 0');
    cmds.push(' exec-timeout 10 0');
    cmds.push(' logging synchronous');
    cmds.push('exit');

    // 8. MOTD Banner
    if (params.bannerMotd) {
      cmds.push(`banner motd ^${params.bannerMotd}^`);
    }

    cmds.push('exit');

    return {
      commands: cmds,
      verificationCommands: [
        'show ip ssh',
        'show line vty 0 4',
        'show running-config | include enable secret|service password-encryption'
      ],
      rollbackCommands: ['configure terminal', 'exit'],
      explanation: 'Applies enterprise-grade baseline security hardening (SSHv2, Disable Telnet/HTTP, login protection, exec-timeout).'
    };
  },

  // 16. Management: NTP, Syslog, SNMP
  managementServices(params: {
    ntpServers?: string[];
    syslogServers?: string[];
    snmpCommunity?: string;
    snmpLocation?: string;
    snmpContact?: string;
    dnsServers?: string[];
  }): GeneratedConfigResult {
    const cmds = ['configure terminal'];
    if (params.ntpServers) {
      for (const s of params.ntpServers) {
        cmds.push(`ntp server ${s}`);
      }
    }
    if (params.syslogServers) {
      cmds.push('logging on');
      for (const s of params.syslogServers) {
        cmds.push(`logging host ${s}`);
      }
      cmds.push('logging trap informational');
    }
    if (params.snmpCommunity) {
      cmds.push(`snmp-server community ${params.snmpCommunity} RO`);
    }
    if (params.snmpLocation) cmds.push(`snmp-server location ${params.snmpLocation}`);
    if (params.snmpContact) cmds.push(`snmp-server contact ${params.snmpContact}`);
    if (params.dnsServers) {
      cmds.push('ip domain-lookup');
      for (const d of params.dnsServers) {
        cmds.push(`ip name-server ${d}`);
      }
    }
    cmds.push('exit');

    return {
      commands: cmds,
      verificationCommands: [
        'show ntp status',
        'show logging',
        'show snmp'
      ],
      rollbackCommands: ['configure terminal', 'exit'],
      explanation: 'Configures system management services (NTP, Syslog, SNMP, DNS).'
    };
  }
};
