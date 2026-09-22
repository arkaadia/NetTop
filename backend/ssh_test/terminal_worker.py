"""
Interactive Paramiko 2 Terminal Worker.
Provides real-time, bidirectional PTY shell streaming over stdin/stdout or WebSocket for SSH Test.
Handles keystrokes, VT100/ANSI escape codes, terminal resizing, and clean teardown.
"""
import sys
import os
import json
import time
import threading
import io
import select
from typing import Optional, Dict, Any
import paramiko
try:
    from .kex_patch import configure_paramiko_security, CiscoCompatibleTransport
except ImportError:
    from kex_patch import configure_paramiko_security, CiscoCompatibleTransport

def run_worker_stdio():
    """
    Runs in stdio mode:
    Receives JSON control & input packets on stdin, streams output to stdout.
    Used by Node.js WebSocket gateway or local CLI.
    """
    # Disable output buffering
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

    # Read initial configuration from stdin (single line JSON)
    try:
        init_line = sys.stdin.readline()
        if not init_line:
            sys.stderr.write("[Worker] No initial configuration received on stdin.\n")
            sys.exit(1)
        config = json.loads(init_line)
    except Exception as e:
        sys.stderr.write(f"[Worker] Failed to parse initial config: {e}\n")
        sys.exit(1)

    host = config.get("host")
    port = int(config.get("port", 22))
    username = config.get("username")
    password = config.get("password", "")
    private_key = config.get("private_key", "")
    passphrase = config.get("passphrase", None)
    auth_type = config.get("auth_type", "password")
    cols = int(config.get("cols", 100))
    rows = int(config.get("rows", 30))
    term_type = config.get("term", "xterm-256color")

    if not host or not username:
        sys.stderr.write("[Worker] host and username are required.\n")
        sys.exit(1)

    configure_paramiko_security()
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    connect_kwargs = {
        "hostname": host,
        "port": port,
        "username": username,
        "timeout": 12,
        "look_for_keys": False,
        "allow_agent": False,
        "transport_factory": CiscoCompatibleTransport
    }


    if auth_type == "key" and private_key:
        try:
            key_file = io.StringIO(private_key)
            if "BEGIN RSA" in private_key or "BEGIN OPENSSH" in private_key:
                try:
                    pkey = paramiko.RSAKey.from_private_key(key_file, password=passphrase)
                except Exception:
                    key_file.seek(0)
                    pkey = paramiko.Ed25519Key.from_private_key(key_file, password=passphrase)
            elif "BEGIN EC" in private_key:
                pkey = paramiko.ECDSAKey.from_private_key(key_file, password=passphrase)
            elif "BEGIN ED25519" in private_key:
                pkey = paramiko.Ed25519Key.from_private_key(key_file, password=passphrase)
            else:
                pkey = paramiko.RSAKey.from_private_key(key_file, password=passphrase)
            connect_kwargs["pkey"] = pkey
        except Exception as e:
            msg = json.dumps({"type": "error", "message": f"Private key error: {e}"})
            sys.stdout.write(msg + "\n")
            sys.stdout.flush()
            sys.exit(1)
    else:
        connect_kwargs["password"] = password

    try:
        client.connect(**connect_kwargs)
    except paramiko.AuthenticationException:
        msg = json.dumps({"type": "error", "message": f"Authentication failed: Incorrect username or credentials for {username}@{host}"})
        sys.stdout.write(msg + "\n")
        sys.stdout.flush()
        sys.exit(1)
    except Exception as e:
        msg = json.dumps({"type": "error", "message": f"Connection error: {e}"})
        sys.stdout.write(msg + "\n")
        sys.stdout.flush()
        sys.exit(1)

    try:
        chan = client.invoke_shell(term=term_type, width=cols, height=rows)
    except Exception as e:
        msg = json.dumps({"type": "error", "message": f"Failed to allocate PTY shell: {e}"})
        sys.stdout.write(msg + "\n")
        sys.stdout.flush()
        sys.exit(1)

    # Notify ready
    ready_msg = json.dumps({
        "type": "status",
        "status": "ready",
        "message": f"Connected to {username}@{host}:{port} via Paramiko {paramiko.__version__}"
    })
    sys.stdout.write(ready_msg + "\n")
    sys.stdout.flush()

    is_running = [True]

    def read_from_remote():
        """Reads output from Paramiko channel and prints JSON packets to stdout."""
        try:
            while is_running[0]:
                if chan.recv_ready():
                    data = chan.recv(4096)
                    if not data:
                        break
                    text = data.decode('utf-8', errors='replace')
                    msg = json.dumps({"type": "data", "data": text})
                    sys.stdout.write(msg + "\n")
                    sys.stdout.flush()
                elif chan.exit_status_ready():
                    break
                else:
                    time.sleep(0.01)
        except Exception as e:
            pass
        finally:
            is_running[0] = False
            close_msg = json.dumps({"type": "status", "status": "closed", "message": "Remote session terminated."})
            try:
                sys.stdout.write(close_msg + "\n")
                sys.stdout.flush()
            except Exception:
                pass

    remote_thread = threading.Thread(target=read_from_remote, daemon=True)
    remote_thread.start()

    # Main thread: Read JSON lines from stdin and forward to Paramiko channel
    try:
        for line in sys.stdin:
            if not is_running[0]:
                break
            line = line.strip()
            if not line:
                continue
            try:
                packet = json.loads(line)
                p_type = packet.get("type")
                if p_type == "input":
                    data = packet.get("data", "")
                    if data:
                        chan.send(data)
                elif p_type == "resize":
                    new_cols = int(packet.get("cols", cols))
                    new_rows = int(packet.get("rows", rows))
                    chan.resize_pty(width=new_cols, height=new_rows)
                elif p_type == "ping":
                    pong = json.dumps({"type": "pong", "time": time.time()})
                    sys.stdout.write(pong + "\n")
                    sys.stdout.flush()
                elif p_type == "disconnect":
                    break
            except json.JSONDecodeError:
                # Raw input fallback
                chan.send(line + "\n")
    except (KeyboardInterrupt, SystemExit):
        pass
    finally:
        is_running[0] = False
        try:
            chan.close()
            client.close()
        except Exception:
            pass

if __name__ == "__main__":
    run_worker_stdio()
