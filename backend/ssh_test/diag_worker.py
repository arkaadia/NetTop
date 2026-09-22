"""
Paramiko 2 Live Diagnostic Worker Process.
Reads device parameters from stdin as JSON, configures Cisco/MikroTik KEX security patches,
runs run_end_to_end_diagnostic, and streams live progress step events over stdout as JSON lines.
"""
import sys
import json
import logging
from typing import Dict, Any

from .kex_patch import configure_paramiko_security
from .models import SshTestDevice
from .diagnostic import run_end_to_end_diagnostic

def main():
    # Configure logging to stderr so stdout remains strictly JSON stream
    logging.basicConfig(level=logging.INFO, stream=sys.stderr, format="[ParamikoWorker] %(asctime)s %(levelname)s: %(message)s")

    # Globally patch Paramiko security for Cisco switches (DH groups, curve25519, 3des, etc.)
    configure_paramiko_security()

    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            sys.stderr.write("No device payload provided to diag_worker.\n")
            sys.exit(1)
        data = json.loads(raw_input)
    except Exception as e:
        sys.stderr.write(f"Failed to parse input JSON: {e}\n")
        sys.exit(1)

    device_dict = data.get("device", data)
    device = SshTestDevice(
        id=str(device_dict.get("id", "temp-adhoc")),
        name=str(device_dict.get("name", device_dict.get("host", "Device"))),
        host=str(device_dict.get("host", "")).strip(),
        port=int(device_dict.get("port", 22) or 22),
        username=str(device_dict.get("username", "")).strip(),
        auth_type=str(device_dict.get("auth_type", "password")),
        device_type=str(device_dict.get("device_type", "cisco_ios")),
        pty_type=str(device_dict.get("pty_type", "xterm-256color")),
        description=str(device_dict.get("description", ""))
    )

    plain_pass = str(data.get("password") or device_dict.get("password") or "")
    plain_key = str(data.get("private_key") or device_dict.get("private_key") or "")
    timeout = int(data.get("timeout") or device_dict.get("timeout") or 10)

    def on_step(step: Dict[str, Any]):
        out_msg = json.dumps({"type": "layer_progress", "step": step}, ensure_ascii=False)
        sys.stdout.write(out_msg + "\n")
        sys.stdout.flush()

    try:
        report = run_end_to_end_diagnostic(
            device=device,
            plain_password=plain_pass,
            plain_key=plain_key,
            timeout=timeout,
            progress_callback=on_step
        )
        out_result = json.dumps({"type": "diagnostic_result", "report": report}, ensure_ascii=False)
        sys.stdout.write(out_result + "\n")
        sys.stdout.flush()
    except Exception as exc:
        err_msg = json.dumps({
            "type": "error",
            "message": f"خطای پیش‌بینی نشده در هسته پارامیکو: {exc}",
            "message_en": f"Unhandled error in Paramiko diagnostic engine: {exc}"
        }, ensure_ascii=False)
        sys.stdout.write(err_msg + "\n")
        sys.stdout.flush()
        sys.exit(1)

if __name__ == "__main__":
    main()
