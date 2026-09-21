"""
Remote Desktop Device Models
Data structure for registered Windows RDP devices.
"""
from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any
import time
import uuid

@dataclass
class RemoteDevice:
    id: str
    name: str
    hostname: str
    port: int = 3389
    username: str = "administrator"
    encrypted_password: str = ""
    domain: Optional[str] = None
    enabled: bool = True
    created_at: str = field(default_factory=lambda: time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
    updated_at: str = field(default_factory=lambda: time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
    last_connected_at: Optional[str] = None
    connection_status: str = "Ready"  # 'Ready', 'Online', 'Offline', 'Connecting', 'Connected', 'Error'
    last_error: Optional[str] = None
    latency_ms: Optional[float] = None

    def to_dict(self, include_sensitive: bool = False) -> Dict[str, Any]:
        """Convert model to dictionary. Never expose encrypted_password unless explicitly requested."""
        data = asdict(self)
        if not include_sensitive:
            data.pop("encrypted_password", None)
            data["has_password"] = bool(self.encrypted_password)
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "RemoteDevice":
        """Instantiate a RemoteDevice from a dict."""
        return cls(
            id=data.get("id") or f"win-rdp-{uuid.uuid4().hex[:8]}",
            name=data.get("name", "Windows Server"),
            hostname=data.get("hostname", "127.0.0.1"),
            port=int(data.get("port", 3389)),
            username=data.get("username", "administrator"),
            encrypted_password=data.get("encrypted_password", ""),
            domain=data.get("domain") or None,
            enabled=data.get("enabled", True),
            created_at=data.get("created_at") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            updated_at=data.get("updated_at") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            last_connected_at=data.get("last_connected_at"),
            connection_status=data.get("connection_status", "Ready"),
            last_error=data.get("last_error"),
            latency_ms=data.get("latency_ms"),
        )
