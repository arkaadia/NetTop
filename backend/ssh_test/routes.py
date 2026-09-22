"""
REST Router and Universal HTTP Dispatcher for SSH Test Module.
Provides full API endpoints for devices, Paramiko real data fetch, and end-to-end diagnostics.
Compatible with standard library HTTPServer in backend/server.py.
"""
import urllib.parse
from typing import Dict, Any, Tuple
from .service import SshTestService

service = SshTestService()

def handle_ssh_test_request(method: str, path: str, body: dict = None, query: dict = None) -> Tuple[int, Dict[str, Any]]:
    """
    Universal HTTP request dispatcher for /api/ssh-test/* endpoints.
    Returns (status_code, response_dict).
    """
    body = body or {}
    query = query or {}
    clean_path = path.split('?')[0].rstrip('/')

    # GET /api/ssh-test/devices
    if method == "GET" and clean_path == "/api/ssh-test/devices":
        devices = service.list_devices()
        return 200, {"devices": devices, "total": len(devices)}

    # POST /api/ssh-test/devices
    if method == "POST" and clean_path == "/api/ssh-test/devices":
        created, err = service.create_device(body)
        if err:
            return 400, {"error": err}
        return 201, {"device": created, "message": "دیوایس SSH با موفقیت ثبت شد."}

    # POST /api/ssh-test/test-connection (Ad-hoc diagnostic test without saving)
    if method == "POST" and clean_path == "/api/ssh-test/test-connection":
        from .models import SshTestDevice
        from .diagnostic import run_end_to_end_diagnostic
        from .kex_patch import configure_paramiko_security
        configure_paramiko_security()

        host = body.get("host", "").strip()
        username = body.get("username", "").strip()
        port = int(body.get("port", 22))
        password = body.get("password", "")
        private_key = body.get("private_key", "")
        passphrase = body.get("passphrase", "")
        auth_type = body.get("auth_type", "password")

        if not host or not username:
            return 400, {"error": "Host and username are required for connection test."}

        dummy_dev = SshTestDevice(
            name=host,
            host=host,
            port=port,
            username=username,
            auth_type=auth_type,
            passphrase=passphrase
        )
        report = run_end_to_end_diagnostic(dummy_dev, plain_password=password, plain_key=private_key)
        return 200, report

    # GET /api/ssh-test/health
    if method == "GET" and clean_path == "/api/ssh-test/health":
        import paramiko
        return 200, {
            "service": "SSH Test Paramiko Engine",
            "version": "1.0.0",
            "paramiko_version": paramiko.__version__,
            "status": "ready",
            "devices_count": len(service.list_devices())
        }

    # Internal session credentials lookup for WebSocket gateway
    if method == "GET" and clean_path == "/api/ssh-test/internal/session-credentials":
        token = query.get("token", [""])[0] if isinstance(query.get("token"), list) else query.get("token", "")
        if not token:
            return 400, {"error": "Session token required."}
        creds, err = service.get_session_credentials(token)
        if err:
            return 401, {"error": err}
        return 200, {"credentials": creds}

    # Device-specific sub-routes: /api/ssh-test/devices/{id}/*
    if clean_path.startswith("/api/ssh-test/devices/"):
        sub = clean_path[len("/api/ssh-test/devices/"):]
        parts = sub.split('/')
        device_id = urllib.parse.unquote(parts[0])

        # POST /api/ssh-test/devices/{id}/fetch (Fetch real hardware & interface data via Paramiko)
        if len(parts) == 2 and parts[1] == "fetch" and method == "POST":
            success, fetched_data, err_msg = service.fetch_data(device_id)
            if not success:
                return 400, {
                    "success": False,
                    "error": err_msg,
                    "message_fa": f"خطا در دریافت اطلاعات واقعی از دیوایس: {err_msg}",
                    "message_en": f"Failed to fetch data from device: {err_msg}"
                }
            return 200, {
                "success": True,
                "data": fetched_data,
                "message_fa": "اطلاعات سخت‌افزار، کارت‌های شبکه و سیستم‌عامل با موفقیت از دیوایس دریافت شد.",
                "message_en": "Hardware, interfaces, and OS specs successfully fetched via Paramiko."
            }

        # POST /api/ssh-test/devices/{id}/diagnose (Run 8-layer diagnostic audit)
        if len(parts) == 2 and parts[1] == "diagnose" and method == "POST":
            report = service.diagnose_device(device_id)
            return 200, report

        # POST /api/ssh-test/devices/{id}/session-token (Generate WebSocket terminal session token)
        if len(parts) == 2 and parts[1] == "session-token" and method == "POST":
            token, err = service.create_session_token(device_id)
            if err:
                return 400, {"error": err}
            return 200, {"token": token, "expires_in": 60}

        # GET /api/ssh-test/devices/{id}
        if len(parts) == 1 and method == "GET":
            dev = service.get_device(device_id, include_sensitive=False)
            if not dev:
                return 404, {"error": "دیوایس مورد نظر یافت نشد."}
            return 200, {"device": dev.to_dict(include_sensitive=False)}

        # PUT /api/ssh-test/devices/{id}
        if len(parts) == 1 and method == "PUT":
            updated, err = service.update_device(device_id, body)
            if err:
                return 400, {"error": err}
            return 200, {"device": updated, "message": "اطلاعات دیوایس با موفقیت ویرایش شد."}

        # DELETE /api/ssh-test/devices/{id}
        if len(parts) == 1 and method == "DELETE":
            deleted = service.delete_device(device_id)
            if not deleted:
                return 404, {"error": "دیوایس مورد نظر یافت نشد."}
            return 200, {"success": True, "message": "دیوایس با موفقیت حذف گردید."}

    return 404, {"error": f"Endpoint '{method} {path}' not found in SSH Test API."}
