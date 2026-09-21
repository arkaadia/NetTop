"""
Pydantic Schemas for Remote Desktop API
Validates input and output schemas for Windows RDP devices.
"""
from typing import Optional, Dict, Any, List
try:
    from pydantic import BaseModel, Field
    PYDANTIC_AVAILABLE = True
except ImportError:
    PYDANTIC_AVAILABLE = False
    class BaseModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
        def dict(self):
            return self.__dict__
    def Field(*args, **kwargs):
        return kwargs.get("default", None)


class RemoteDeviceCreate(BaseModel):
    name: str
    hostname: str
    port: int = 3389
    username: str = "administrator"
    password: Optional[str] = ""
    domain: Optional[str] = None
    enabled: bool = True


class RemoteDeviceUpdate(BaseModel):
    name: Optional[str] = None
    hostname: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None  # If provided, updates encrypted password
    domain: Optional[str] = None
    enabled: Optional[bool] = None


class RemoteDeviceResponse(BaseModel):
    id: str
    name: str
    hostname: str
    port: int
    username: str
    domain: Optional[str] = None
    enabled: bool
    created_at: str
    updated_at: str
    last_connected_at: Optional[str] = None
    connection_status: str
    last_error: Optional[str] = None
    latency_ms: Optional[float] = None
    has_password: bool = False


class TestConnectionRequest(BaseModel):
    hostname: str
    port: int = 3389
    username: Optional[str] = "administrator"
    password: Optional[str] = ""
    domain: Optional[str] = None


class TestConnectionResponse(BaseModel):
    success: bool
    status: str  # 'reachable_open', 'auth_failed', 'auth_success', 'timeout', 'host_unreachable'
    message: str
    latency_ms: Optional[float] = None
    details: Dict[str, Any] = {}


class ConnectSessionResponse(BaseModel):
    session_id: str
    token: str
    websocket_url: str
    device: Dict[str, Any]
    expires_in_sec: int = 60
