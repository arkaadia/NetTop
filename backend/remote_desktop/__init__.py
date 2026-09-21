"""
Remote Desktop Module
Provides Windows RDP management, Guacamole protocol integration, and real diagnostic connectivity testing.
"""
from .models import RemoteDevice
from .schemas import (
    RemoteDeviceCreate,
    RemoteDeviceUpdate,
    RemoteDeviceResponse,
    TestConnectionRequest,
    TestConnectionResponse
)
from .security import encrypt_password, decrypt_password, validate_hostname_and_port
from .service import RemoteDesktopService
from .routes import router, app, handle_remote_desktop_request, service

__all__ = [
    "RemoteDevice",
    "RemoteDeviceCreate",
    "RemoteDeviceUpdate",
    "RemoteDeviceResponse",
    "TestConnectionRequest",
    "TestConnectionResponse",
    "encrypt_password",
    "decrypt_password",
    "validate_hostname_and_port",
    "RemoteDesktopService",
    "service",
    "router",
    "app",
    "handle_remote_desktop_request"
]
