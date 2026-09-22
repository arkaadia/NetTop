"""
Real SSH Device Data Fetcher using Paramiko.
Executes non-destructive discovery commands via Paramiko SSHClient on real devices.
Returns structured system specs, interfaces, OS details, and raw outputs. Zero mock data.
"""
import io
import re
import time
from typing import Dict, Any, Tuple, Optional
import paramiko
from .models import SshTestDevice
from .kex_patch import configure_paramiko_security, CiscoCompatibleTransport

def _execute_command(client: paramiko.SSHClient, cmd: str, timeout: int = 10) -> Tuple[int, str, str]:
    try:
        stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        code = stdout.channel.recv_exit_status()
        return code, out, err
    except Exception as e:
        return -1, "", str(e)

def fetch_device_data(
    device: SshTestDevice,
    plain_password: str = "",
    plain_key: str = "",
    timeout: int = 15
) -> Tuple[bool, Dict[str, Any], str]:
    """
    Connects to the real remote device via Paramiko and fetches genuine hardware/OS facts.
    Returns (success, result_dict, error_message).
    """
    start_time = time.time()
    configure_paramiko_security()
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    connect_kwargs: Dict[str, Any] = {
        "hostname": device.host,
        "port": device.port or 22,
        "username": device.username,
        "timeout": timeout,
        "look_for_keys": False,
        "allow_agent": False,
        "transport_factory": CiscoCompatibleTransport
    }


    if device.auth_type == "key" and plain_key:
        try:
            key_file = io.StringIO(plain_key)
            if "BEGIN RSA" in plain_key or "BEGIN OPENSSH" in plain_key:
                try:
                    pkey = paramiko.RSAKey.from_private_key(key_file, password=device.passphrase)
                except Exception:
                    key_file.seek(0)
                    pkey = paramiko.Ed25519Key.from_private_key(key_file, password=device.passphrase)
            elif "BEGIN EC" in plain_key:
                pkey = paramiko.ECDSAKey.from_private_key(key_file, password=device.passphrase)
            elif "BEGIN ED25519" in plain_key:
                pkey = paramiko.Ed25519Key.from_private_key(key_file, password=device.passphrase)
            else:
                pkey = paramiko.RSAKey.from_private_key(key_file, password=device.passphrase)
            connect_kwargs["pkey"] = pkey
        except Exception as key_err:
            return False, {}, f"Invalid private key format: {key_err}"
    else:
        connect_kwargs["password"] = plain_password

    try:
        client.connect(**connect_kwargs)
    except paramiko.AuthenticationException as auth_err:
        return False, {}, f"SSH Authentication Failed: Incorrect username, password, or key rejected by {device.host}."
    except paramiko.SSHException as ssh_err:
        return False, {}, f"Paramiko SSH Negotiation Error: {ssh_err}"
    except Exception as net_err:
        return False, {}, f"Network connection failed to {device.host}:{device.port}: {net_err}"

    try:
        raw_outputs: Dict[str, str] = {}
        detected_os = "Unknown"
        hostname = device.name
        kernel = ""
        uptime_str = ""
        os_version = ""
        interfaces = []
        specs = {}

        # 1. Probe environment: Check if Linux/Unix or Cisco IOS or MikroTik
        code, probe_out, _ = _execute_command(client, "uname -s 2>/dev/null", timeout=6)
        probe_lower = probe_out.strip().lower()

        if "linux" in probe_lower or "darwin" in probe_lower or "bsd" in probe_lower:
            detected_os = "Linux / Unix"
            
            # Hostname
            _, h_out, _ = _execute_command(client, "hostname 2>/dev/null", timeout=5)
            if h_out.strip():
                hostname = h_out.strip()
                raw_outputs["hostname"] = h_out.strip()

            # Uname
            _, uname_out, _ = _execute_command(client, "uname -a 2>/dev/null", timeout=5)
            if uname_out.strip():
                kernel = uname_out.strip()
                raw_outputs["uname -a"] = uname_out.strip()

            # Uptime
            _, up_out, _ = _execute_command(client, "uptime 2>/dev/null", timeout=5)
            if up_out.strip():
                uptime_str = up_out.strip()
                raw_outputs["uptime"] = up_out.strip()

            # OS Release
            _, os_out, _ = _execute_command(client, "cat /etc/os-release 2>/dev/null || cat /etc/issue 2>/dev/null", timeout=5)
            if os_out.strip():
                raw_outputs["/etc/os-release"] = os_out.strip()
                m = re.search(r'PRETTY_NAME="([^"]+)"', os_out) or re.search(r'NAME="([^"]+)"', os_out)
                if m:
                    os_version = m.group(1)

            # Interfaces via ip -brief or ifconfig
            _, ip_out, _ = _execute_command(client, "ip -brief addr 2>/dev/null || ip addr 2>/dev/null || ifconfig 2>/dev/null", timeout=6)
            if ip_out.strip():
                raw_outputs["ip_addr"] = ip_out.strip()
                # Parse brief format: eth0 UP 192.168.1.50/24 ...
                for line in ip_out.strip().splitlines():
                    parts = line.split()
                    if len(parts) >= 2 and not line.startswith(" "):
                        iface_name = parts[0]
                        status = "UP" if "UP" in parts else "DOWN"
                        ips = [p for p in parts[2:] if "/" in p or re.match(r'^\d+\.\d+\.\d+\.\d+', p)]
                        interfaces.append({
                            "name": iface_name,
                            "status": status,
                            "ip": ", ".join(ips) if ips else "No IP"
                        })

            # Memory & Disk Specs
            _, mem_out, _ = _execute_command(client, "free -m 2>/dev/null", timeout=5)
            if mem_out.strip():
                raw_outputs["free -m"] = mem_out.strip()
                for line in mem_out.splitlines():
                    if line.startswith("Mem:"):
                        mparts = line.split()
                        if len(mparts) >= 3:
                            specs["ram_total_mb"] = mparts[1]
                            specs["ram_used_mb"] = mparts[2]
                            specs["ram_free_mb"] = mparts[3] if len(mparts) > 3 else "N/A"

            _, df_out, _ = _execute_command(client, "df -h / 2>/dev/null", timeout=5)
            if df_out.strip():
                raw_outputs["df -h /"] = df_out.strip()
                lines = df_out.strip().splitlines()
                if len(lines) >= 2:
                    dfparts = lines[1].split()
                    if len(dfparts) >= 5:
                        specs["disk_size"] = dfparts[1]
                        specs["disk_used"] = dfparts[2]
                        specs["disk_avail"] = dfparts[3]
                        specs["disk_usage_pct"] = dfparts[4]

            # CPU Model
            _, cpu_out, _ = _execute_command(client, "lscpu 2>/dev/null | grep 'Model name' || grep -m1 'model name' /proc/cpuinfo 2>/dev/null", timeout=5)
            if cpu_out.strip():
                specs["cpu_model"] = cpu_out.split(":")[-1].strip()

        else:
            # Test Cisco IOS or MikroTik or Generic Router
            code_cisco, cisco_out, _ = _execute_command(client, "show version", timeout=8)
            if "cisco" in cisco_out.lower() or "ios" in cisco_out.lower():
                detected_os = "Cisco IOS / IOS-XE"
                raw_outputs["show version"] = cisco_out.strip()
                
                # Extract Cisco hostname & uptime
                for line in cisco_out.splitlines():
                    if "uptime is" in line:
                        uptime_str = line.split("uptime is")[-1].strip()
                        hostname = line.split("uptime is")[0].strip().split()[-1]
                    if "Software (" in line or "Version " in line:
                        os_version = line.strip()

                # Interfaces
                _, int_out, _ = _execute_command(client, "show ip interface brief", timeout=8)
                if int_out.strip():
                    raw_outputs["show ip interface brief"] = int_out.strip()
                    for line in int_out.splitlines():
                        parts = line.split()
                        if len(parts) >= 2 and (parts[0].startswith("Gi") or parts[0].startswith("Fa") or parts[0].startswith("Te") or parts[0].startswith("Vlan") or parts[0].startswith("Eth")):
                            interfaces.append({
                                "name": parts[0],
                                "ip": parts[1] if parts[1] != "unassigned" else "unassigned",
                                "status": parts[4] if len(parts) > 4 else "unknown"
                            })
            else:
                # Test MikroTik RouterOS
                code_mt, mt_out, _ = _execute_command(client, "/system resource print", timeout=8)
                if "routeros" in mt_out.lower() or "mikrotik" in mt_out.lower() or "version:" in mt_out.lower():
                    detected_os = "MikroTik RouterOS"
                    raw_outputs["/system resource print"] = mt_out.strip()
                    for line in mt_out.splitlines():
                        if "version:" in line:
                            os_version = line.split(":")[-1].strip()
                        if "uptime:" in line:
                            uptime_str = line.split(":")[-1].strip()
                        if "board-name:" in line:
                            specs["board_name"] = line.split(":")[-1].strip()
                        if "cpu:" in line:
                            specs["cpu_model"] = line.split(":")[-1].strip()

                    _, mt_id, _ = _execute_command(client, "/system identity print", timeout=5)
                    if mt_id.strip():
                        hostname = mt_id.split(":")[-1].strip()
                else:
                    detected_os = "Generic SSH Device"
                    raw_outputs["probe_stdout"] = probe_out.strip()

        duration_ms = round((time.time() - start_time) * 1000, 2)

        fetched_data = {
            "os_type": detected_os,
            "hostname": hostname,
            "kernel": kernel,
            "os_version": os_version or detected_os,
            "uptime": uptime_str or "Online",
            "interfaces": interfaces,
            "specs": specs,
            "raw_outputs": raw_outputs,
            "fetched_at": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            "execution_time_ms": duration_ms,
            "paramiko_version": paramiko.__version__
        }

        return True, fetched_data, ""

    except Exception as cmd_err:
        return False, {}, f"Error fetching commands from device: {cmd_err}"
    finally:
        try:
            client.close()
        except Exception:
            pass
