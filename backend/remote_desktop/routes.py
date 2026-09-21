"""
FastAPI Routes for Remote Desktop module.
Provides full REST API for Windows RDP devices, connection testing, and Guacamole session tokens.
"""
from typing import Dict, Any, Optional
import os
import json
import urllib.parse

from .service import RemoteDesktopService
from .schemas import (
    RemoteDeviceCreate,
    RemoteDeviceUpdate,
    TestConnectionRequest,
)

service = RemoteDesktopService()

try:
    from fastapi import APIRouter, FastAPI, HTTPException, status, Query, Path, Body
    from fastapi.responses import JSONResponse
    router = APIRouter(prefix="/api/remote-test", tags=["remote-test"])

    @router.get("/devices")
    async def get_remote_devices():
        """Retrieve list of all registered Windows RDP devices."""
        devices = service.list_devices()
        return {"devices": devices, "total": len(devices)}

    @router.post("/devices", status_code=status.HTTP_201_CREATED)
    async def create_remote_device(payload: RemoteDeviceCreate):
        """Register a new Windows RDP device."""
        data = payload.dict() if hasattr(payload, 'dict') else payload.__dict__
        created, err = service.create_device(data)
        if err:
            raise HTTPException(status_code=400, detail=err)
        return {"device": created, "message": "Remote device registered successfully."}

    @router.get("/devices/{device_id}")
    async def get_remote_device(device_id: str = Path(...)):
        """Get details of a single registered Windows device."""
        dev = service.get_device(device_id, include_sensitive=False)
        if not dev:
            raise HTTPException(status_code=404, detail="Device not found.")
        return {"device": dev.to_dict(include_sensitive=False)}

    @router.put("/devices/{device_id}")
    async def update_remote_device(device_id: str, payload: RemoteDeviceUpdate):
        """Update properties of a registered Windows device."""
        data = payload.dict(exclude_unset=True) if hasattr(payload, 'dict') else payload.__dict__
        updated, err = service.update_device(device_id, data)
        if err:
            raise HTTPException(status_code=400, detail=err)
        return {"device": updated, "message": "Device updated successfully."}

    @router.delete("/devices/{device_id}")
    async def delete_remote_device(device_id: str = Path(...)):
        """Remove a registered Windows device from inventory."""
        deleted = service.delete_device(device_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Device not found.")
        return {"success": True, "message": "Device deleted from inventory."}

    @router.post("/devices/{device_id}/test")
    async def test_device_connection(device_id: str = Path(...)):
        """Execute real RDP connectivity diagnostic test on registered device."""
        dev = service.get_device(device_id, include_sensitive=True)
        if not dev:
            raise HTTPException(status_code=404, detail="Device not found.")

        plain_pwd = service.decrypt_password(dev.encrypted_password) if hasattr(service, 'decrypt_password') else ""
        res = service.test_rdp_connection(
            hostname=dev.hostname,
            port=dev.port,
            username=dev.username,
            password=plain_pwd,
            domain=dev.domain or ""
        )

        # Update device status based on real test
        new_status = "Online" if res["success"] else "Error"
        service.update_device(device_id, {
            "connection_status": new_status,
            "last_error": None if res["success"] else res["message"],
            "latency_ms": res.get("latency_ms")
        })

        return res

    @router.post("/test-connection")
    async def test_adhoc_connection(payload: TestConnectionRequest):
        """Perform real RDP connectivity test for ad-hoc credentials before saving."""
        data = payload.dict() if hasattr(payload, 'dict') else payload.__dict__
        return service.test_rdp_connection(
            hostname=data.get("hostname", ""),
            port=int(data.get("port", 3389)),
            username=data.get("username", ""),
            password=data.get("password", ""),
            domain=data.get("domain", "")
        )

    @router.post("/devices/{device_id}/connect")
    async def connect_device(device_id: str = Path(...)):
        """Generate authorized Guacamole RDP connection session and single-use token."""
        session, err = service.create_connection_session(device_id)
        if err:
            raise HTTPException(status_code=400, detail=err)
        return session

    @router.post("/sessions/{session_id}/disconnect")
    async def disconnect_session(session_id: str = Path(...), body: Dict[str, Any] = Body(default={})):
        """Disconnect and terminate a Guacamole RDP session cleanly."""
        device_id = body.get("device_id")
        service.close_session(session_id, device_id)
        return {"success": True, "message": "Session terminated."}

    @router.get("/health")
    async def health():
        """Health check and Guacamole status."""
        guacd_host = os.environ.get("GUACD_HOST", "127.0.0.1")
        guacd_port = int(os.environ.get("GUACD_PORT", "4822"))
        return {
            "service": "Remote Desktop Manager",
            "version": "1.0.0",
            "guacd_configured": f"{guacd_host}:{guacd_port}",
            "registered_devices_count": len(service.list_devices())
        }

    app = FastAPI(title="NetTopology Remote Desktop API", version="1.0.0")
    app.include_router(router)

except ImportError:
    # FastAPI not installed yet; router dummy placeholder
    router = None
    app = None


def handle_remote_desktop_request(method: str, path: str, body: dict = None, query: dict = None) -> tuple:
    """
    Universal HTTP request dispatcher compatible with Python's standard library HTTPServer.
    Allows backend/server.py to route /api/remote-test/* requests seamlessly.
    Returns (status_code, response_dict).
    """
    body = body or {}
    query = query or {}

    clean_path = path.split('?')[0].rstrip('/')

    # GET /api/remote-test/devices
    if method == "GET" and clean_path == "/api/remote-test/devices":
        devices = service.list_devices()
        return 200, {"devices": devices, "total": len(devices)}

    # POST /api/remote-test/devices
    if method == "POST" and clean_path == "/api/remote-test/devices":
        created, err = service.create_device(body)
        if err:
            return 400, {"error": err}
        return 201, {"device": created, "message": "Remote device registered successfully."}

    # POST /api/remote-test/test-connection
    if method == "POST" and clean_path == "/api/remote-test/test-connection":
        res = service.test_rdp_connection(
            hostname=body.get("hostname", ""),
            port=int(body.get("port", 3389)),
            username=body.get("username", ""),
            password=body.get("password", ""),
            domain=body.get("domain", "")
        )
        return 200, res

    # GET /api/remote-test/health
    if method == "GET" and clean_path == "/api/remote-test/health":
        guacd_host = os.environ.get("GUACD_HOST", "127.0.0.1")
        guacd_port = int(os.environ.get("GUACD_PORT", "4822"))
        return 200, {
            "service": "Remote Desktop Manager",
            "version": "1.0.0",
            "guacd_configured": f"{guacd_host}:{guacd_port}",
            "registered_devices_count": len(service.list_devices())
        }

    # Internal token redemption endpoint for WebSocket tunnel
    if method == "GET" and clean_path == "/api/remote-test/internal/session":
        token = query.get("token", [""])[0] if isinstance(query.get("token"), list) else query.get("token", "")
        if not token:
            return 400, {"error": "Session token is required."}
        sess = service.get_session_by_token(token)
        if not sess:
            return 404, {"error": "Invalid or expired session token."}
        return 200, {"session": sess}

    # Specific device operations: /api/remote-test/devices/{id}/*
    if clean_path.startswith("/api/remote-test/devices/"):
        sub = clean_path[len("/api/remote-test/devices/"):]
        parts = sub.split('/')
        dev_id = urllib.parse.unquote(parts[0])

        # POST /api/remote-test/devices/{id}/test
        if len(parts) == 2 and parts[1] == "test" and method == "POST":
            dev = service.get_device(dev_id, include_sensitive=True)
            if not dev:
                return 404, {"error": "Device not found."}
            from .security import decrypt_password
            plain_pwd = decrypt_password(dev.encrypted_password)
            res = service.test_rdp_connection(
                hostname=dev.hostname,
                port=dev.port,
                username=dev.username,
                password=plain_pwd,
                domain=dev.domain or ""
            )
            new_status = "Online" if res["success"] else "Error"
            service.update_device(dev_id, {
                "connection_status": new_status,
                "last_error": None if res["success"] else res["message"],
                "latency_ms": res.get("latency_ms")
            })
            return 200, res

        # POST /api/remote-test/devices/{id}/connect
        if len(parts) == 2 and parts[1] == "connect" and method == "POST":
            session, err = service.create_connection_session(dev_id)
            if err:
                return 400, {"error": err}
            return 200, session

        # GET /api/remote-test/devices/{id}
        if len(parts) == 1 and method == "GET":
            dev = service.get_device(dev_id, include_sensitive=False)
            if not dev:
                return 404, {"error": "Device not found."}
            return 200, {"device": dev.to_dict(include_sensitive=False)}

        # PUT /api/remote-test/devices/{id}
        if len(parts) == 1 and method == "PUT":
            updated, err = service.update_device(dev_id, body)
            if err:
                return 400, {"error": err}
            return 200, {"device": updated, "message": "Device updated successfully."}

        # DELETE /api/remote-test/devices/{id}
        if len(parts) == 1 and method == "DELETE":
            deleted = service.delete_device(dev_id)
            if not deleted:
                return 404, {"error": "Device not found."}
            return 200, {"success": True, "message": "Device deleted from inventory."}

    # POST /api/remote-test/sessions/{id}/disconnect
    if clean_path.startswith("/api/remote-test/sessions/") and clean_path.endswith("/disconnect") and method == "POST":
        sub = clean_path[len("/api/remote-test/sessions/"):-len("/disconnect")]
        session_id = urllib.parse.unquote(sub)
        service.close_session(session_id, body.get("device_id"))
        return 200, {"success": True, "message": "Session terminated."}

    return 404, {"error": f"Endpoint '{method} {path}' not found in remote-test router."}
