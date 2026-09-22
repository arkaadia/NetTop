#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NetTopology - Python Network Switch Automation & LAN Monitoring Engine
موتور اتوماسیون پایتون برای اتصال به سوئیچ‌های شبکه و پایش زیرساخت LAN
Supports Netmiko, Paramiko, and multi-threaded socket discovery.
"""

import sys
import os
import time
import socket
import threading
import ipaddress
import concurrent.futures
from typing import Dict, Any, List, Optional, Tuple

# Check for Netmiko
NETMIKO_AVAILABLE = False
try:
    from netmiko import ConnectHandler
    from netmiko.exceptions import (
        NetmikoTimeoutException,
        NetmikoAuthenticationException,
        ReadTimeout
    )
    NETMIKO_AVAILABLE = True
except ImportError:
    NETMIKO_AVAILABLE = False

# Check for Paramiko
PARAMIKO_AVAILABLE = False
try:
    import paramiko
    PARAMIKO_AVAILABLE = True
    try:
        from ssh_test.kex_patch import configure_paramiko_security, CiscoCompatibleTransport
        configure_paramiko_security()
    except Exception:
        try:
            from backend.ssh_test.kex_patch import configure_paramiko_security, CiscoCompatibleTransport
            configure_paramiko_security()
        except Exception:
            CiscoCompatibleTransport = None
except ImportError:
    PARAMIKO_AVAILABLE = False
    CiscoCompatibleTransport = None


def get_engine_status() -> Dict[str, Any]:
    """Returns the current status of Python automation libraries and environment."""
    return {
        "engine": "NetTopology Python Switch Engine",
        "netmiko_installed": NETMIKO_AVAILABLE,
        "paramiko_installed": PARAMIKO_AVAILABLE,
        "python_version": sys.version.split()[0],
        "platform": sys.platform,
        "active_threads": threading.active_count(),
        "ready_for_real_switches": NETMIKO_AVAILABLE or PARAMIKO_AVAILABLE,
        "recommended_driver": "netmiko" if NETMIKO_AVAILABLE else ("paramiko" if PARAMIKO_AVAILABLE else "none")
    }


def test_socket_connectivity(ip: str, port: int = 22, timeout: float = 2.0) -> Dict[str, Any]:
    """Tests raw TCP reachability to the target device port and attempts banner grab."""
    start_time = time.time()
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)
    try:
        s.connect((ip, int(port)))
        latency = round((time.time() - start_time) * 1000, 2)
        banner = ""
        try:
            s.settimeout(1.0)
            banner = s.recv(1024).decode('utf-8', errors='ignore').strip()
        except Exception:
            pass
        s.close()
        return {
            "reachable": True,
            "latency_ms": latency,
            "banner": banner,
            "port": port,
            "ip": ip,
            "message": f"پورت {port} روی آدرس {ip} باز است (پاسخ در {latency} میلی‌ثانیه)."
        }
    except socket.timeout:
        return {
            "reachable": False,
            "latency_ms": 0,
            "banner": "",
            "port": port,
            "ip": ip,
            "message": f"اتصال به {ip}:{port} با تایم‌اوت مواجه شد (دستگاه در دسترس نیست)."
        }
    except ConnectionRefusedError:
        return {
            "reachable": False,
            "latency_ms": 0,
            "banner": "",
            "port": port,
            "ip": ip,
            "message": f"پورت {port} روی دستگاه {ip} بسته است (Connection Refused)."
        }
    except Exception as ex:
        return {
            "reachable": False,
            "latency_ms": 0,
            "banner": "",
            "port": port,
            "ip": ip,
            "message": f"خطا در بررسی اتصال به {ip}: {str(ex)}"
        }


def execute_switch_command(
    ip: Any = "",
    username: str = "",
    password: str = "",
    secret: str = "",
    command: str = "",
    device_type: str = "cisco_ios",
    port: int = 22,
    config_mode: bool = False,
    timeout: int = 15
) -> Dict[str, Any]:
    """
    Connects to a network switch using Netmiko or Paramiko and executes commands.
    Returns structured output and timing. Supports passing a dictionary or keyword arguments.
    """
    if isinstance(ip, dict):
        d = ip
        ip = d.get("ip", "")
        username = d.get("username", username)
        password = d.get("password", password)
        secret = d.get("secret") or d.get("enablePassword") or d.get("enable_password") or secret
        command = d.get("command", command)
        device_type = d.get("device_type") or d.get("deviceType") or device_type
        port = int(d.get("port") or port)
        config_mode = bool(d.get("config_mode") or d.get("configMode") or config_mode)
        timeout = int(d.get("timeout") or timeout)

    if not ip or not str(ip).strip():
        return {
            "success": False,
            "output": "% خطا: آدرس IP سوئیچ مشخص نشده است.",
            "execution_time_ms": 0,
            "method": "error"
        }

    ip = str(ip).strip()
    command = str(command).strip() if command else ""
    if not command:
        return {
            "success": False,
            "output": "% خطا: هیچ دستوری برای اجرا ارسال نشده است.",
            "execution_time_ms": 0,
            "method": "error"
        }

    start_time = time.time()

    # 1. Primary execution via Netmiko
    if NETMIKO_AVAILABLE:
        try:
            device_params = {
                "device_type": device_type or "cisco_ios",
                "host": ip,
                "username": username or "",
                "password": password or "",
                "port": int(port or 22),
                "timeout": timeout,
                "banner_timeout": 15,
                "auth_timeout": 15,
            }
            if secret:
                device_params["secret"] = secret

            with ConnectHandler(**device_params) as net_connect:
                # Enter enable mode if secret is provided
                if secret and hasattr(net_connect, "check_enable_mode"):
                    try:
                        if not net_connect.check_enable_mode():
                            net_connect.enable()
                    except Exception:
                        pass

                # Execute configuration or show command
                if config_mode:
                    cmd_list = [line.strip() for line in command.splitlines() if line.strip()]
                    output = net_connect.send_config_set(cmd_list)
                else:
                    output = net_connect.send_command(command, read_timeout=timeout)

                prompt = ""
                try:
                    prompt = net_connect.find_prompt()
                except Exception:
                    pass

                elapsed_ms = round((time.time() - start_time) * 1000, 2)
                return {
                    "success": True,
                    "output": output,
                    "prompt": prompt,
                    "execution_time_ms": elapsed_ms,
                    "method": "netmiko",
                    "driver": "Netmiko (Direct Cisco SSH)",
                    "device_type": device_type,
                    "ip": ip
                }

        except NetmikoAuthenticationException as auth_err:
            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "success": False,
                "output": f"% خطای احراز هویت در سوئیچ {ip}:\nنام کاربری یا رمز عبور اشتباه است (Authentication Failed).\n{str(auth_err)}",
                "execution_time_ms": elapsed_ms,
                "method": "netmiko",
                "error_type": "auth_failure"
            }
        except (NetmikoTimeoutException, socket.timeout) as timeout_err:
            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "success": False,
                "output": f"% خطای تایم‌اوت در ارتباط با سوئیچ {ip}:\nدستگاه پاسخ نداد. بررسی کنید آیا SSH روی سوئیچ فعال و آی‌پی از این شبکه قابل دسترسی است.\n{str(timeout_err)}",
                "execution_time_ms": elapsed_ms,
                "method": "netmiko",
                "error_type": "timeout"
            }
        except Exception as ex:
            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "success": False,
                "output": f"% خطای اجرای دستور از طریق Netmiko روی {ip}:\n{str(ex)}",
                "execution_time_ms": elapsed_ms,
                "method": "netmiko",
                "error_type": "general_error"
            }

    # 2. Secondary execution via Paramiko
    if PARAMIKO_AVAILABLE:
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            conn_kwargs = {
                "hostname": ip,
                "port": int(port or 22),
                "username": username,
                "password": password,
                "timeout": timeout,
                "look_for_keys": False,
                "allow_agent": False
            }
            if CiscoCompatibleTransport:
                conn_kwargs["transport_factory"] = CiscoCompatibleTransport
            ssh.connect(**conn_kwargs)

            
            # Interactive shell for Cisco commands
            chan = ssh.invoke_shell(width=120, height=40)
            time.sleep(0.5)
            
            # Send enable if secret given
            if secret:
                chan.send("enable\n")
                time.sleep(0.3)
                chan.send(f"{secret}\n")
                time.sleep(0.3)
                
            # Send terminal length 0 to avoid paging
            chan.send("terminal length 0\n")
            time.sleep(0.2)
            
            # Clear welcome buffer
            if chan.recv_ready():
                chan.recv(4096)
                
            # Send command
            chan.send(f"{command}\n")
            time.sleep(1.0)
            
            output = ""
            start_wait = time.time()
            while time.time() - start_wait < timeout:
                if chan.recv_ready():
                    data = chan.recv(8192).decode('utf-8', errors='ignore')
                    output += data
                    if data.endswith("#") or data.endswith(">") or data.endswith("(config)#"):
                        break
                time.sleep(0.2)
                
            ssh.close()
            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "success": True,
                "output": output or "[دستور اجرا شد، خروجی دریافت نشد]",
                "execution_time_ms": elapsed_ms,
                "method": "paramiko",
                "driver": "Paramiko SSH",
                "device_type": device_type,
                "ip": ip
            }
        except Exception as ex:
            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "success": False,
                "output": f"% خطای اجرای SSH از طریق Paramiko روی {ip}:\n{str(ex)}",
                "execution_time_ms": elapsed_ms,
                "method": "paramiko"
            }

    # 3. Fallback when libraries are not yet installed in local cloud preview
    elapsed_ms = round((time.time() - start_time) * 1000, 2)
    socket_res = test_socket_connectivity(ip, port=port, timeout=1.5)
    
    advice = (
        f"⚠️ کتابخانه‌های اتوماسیون پایتون (Netmiko / Paramiko) در این محیط کلود نصب نیستند.\n"
        f"برای اجرای دستورات روی سوئیچ واقعی، فایل «install_windows.bat» را روی سیستم ویندوز خود اجرا کنید\n"
        f"تا با دستور pip install netmiko paramiko به صورت خودکار نصب و فعال گردد.\n\n"
        f"وضعیت اتصال سوکت شبکه به {ip}:{port} -> {'[موفق - پورت باز است]' if socket_res['reachable'] else '[ناموفق - پورت بسته یا در دسترس نیست]'}\n"
        f"دستور ارسالی: {command}"
    )
    return {
        "success": False,
        "output": advice,
        "execution_time_ms": elapsed_ms,
        "method": "diagnostic_fallback",
        "socket_check": socket_res,
        "ip": ip
    }


def probe_single_host(ip_str: str, ports: List[int], timeout: float) -> Optional[Dict[str, Any]]:
    """Probes an individual IP address for open management ports (SSH, Telnet, HTTP, HTTPS, SNMP)."""
    open_ports = []
    banner_info = ""
    start_time = time.time()
    
    for p in ports:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        try:
            s.connect((ip_str, p))
            open_ports.append(p)
            if not banner_info and p in (22, 23):
                try:
                    s.settimeout(0.6)
                    banner_info = s.recv(512).decode('utf-8', errors='ignore').strip()
                except Exception:
                    pass
            s.close()
        except Exception:
            s.close()

    if not open_ports:
        return None

    latency = round((time.time() - start_time) * 1000, 2)
    
    # Try reverse DNS
    hostname = ""
    try:
        hostname = socket.gethostbyaddr(ip_str)[0]
    except Exception:
        hostname = ""

    # Estimate device role and vendor
    vendor = "Generic"
    role = "Network Device"
    device_type = "switch"

    banner_lower = banner_info.lower()
    if "cisco" in banner_lower:
        vendor = "Cisco Systems"
        role = "Cisco Switch / Router"
        device_type = "switch"
    elif "mikrotik" in banner_lower:
        vendor = "MikroTik"
        role = "RouterOS"
        device_type = "router"
    elif 22 in open_ports and (23 not in open_ports):
        if "openssh" in banner_lower:
            role = "Linux / Server / Appliance"
            vendor = "Linux"
        else:
            role = "Managed Switch (SSH)"
            vendor = "Cisco / Multi-Vendor"
    elif 23 in open_ports:
        role = "Legacy Switch (Telnet)"
        vendor = "Cisco / Allied"
    elif 80 in open_ports or 443 in open_ports:
        role = "Web Managed Device"
        vendor = "Web Console"

    return {
        "ip": ip_str,
        "hostname": hostname or f"Device-{ip_str.split('.')[-1]}",
        "open_ports": open_ports,
        "banner": banner_info,
        "vendor": vendor,
        "role": role,
        "device_type": device_type,
        "latency_ms": latency,
        "is_online": True,
        "last_seen": "هم اکنون (اسکن شبکه)"
    }


def scan_lan_subnet(
    subnet_str: str,
    ports: Optional[List[int]] = None,
    timeout: float = 0.8,
    max_hosts: int = 254
) -> Dict[str, Any]:
    """
    Multi-threaded LAN subnet discovery for detecting active switches and network gear.
    Supports subnets like '192.168.1.0/24' or single IPs.
    """
    if not ports:
        ports = [22, 23, 80, 443]

    subnet_str = subnet_str.strip()
    start_time = time.time()
    
    try:
        if "/" not in subnet_str:
            # Single IP or range
            net = ipaddress.ip_network(f"{subnet_str}/32", strict=False)
        else:
            net = ipaddress.ip_network(subnet_str, strict=False)
    except ValueError as e:
        return {
            "success": False,
            "error": f"آدرس ساب‌نت نامعتبر است: {str(e)}. نمونه صحیح: 192.168.1.0/24",
            "devices": []
        }

    hosts = list(net.hosts())[:max_hosts]
    if not hosts:
        hosts = [net.network_address]

    results: List[Dict[str, Any]] = []

    # Run multi-threaded scan
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(hosts) or 1, 40)) as executor:
        future_to_ip = {
            executor.submit(probe_single_host, str(h), ports, timeout): str(h)
            for h in hosts
        }
        for future in concurrent.futures.as_completed(future_to_ip):
            try:
                res = future.result()
                if res:
                    results.append(res)
            except Exception:
                pass

    # Sort results by IP
    try:
        results.sort(key=lambda d: ipaddress.ip_address(d["ip"]))
    except Exception:
        pass

    elapsed = round(time.time() - start_time, 2)
    return {
        "success": True,
        "subnet": subnet_str,
        "scanned_hosts": len(hosts),
        "found_devices_count": len(results),
        "devices": results,
        "scan_time_seconds": elapsed,
        "message": f"اسکن شبکه داخلی ساب‌نت {subnet_str} در {elapsed} ثانیه به پایان رسید و {len(results)} دستگاه فعال شناسایی شد."
    }
