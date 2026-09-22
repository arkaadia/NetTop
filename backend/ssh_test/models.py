"""
Data Models for SSH Test Module
Provides typed dictionary definitions and class models for SSH devices, fetch results, and diagnostics.
"""
from typing import Dict, Any, Optional, List
import time
import uuid

class SshTestDevice:
    def __init__(
        self,
        id: Optional[str] = None,
        name: str = "",
        host: str = "",
        port: int = 22,
        username: str = "",
        auth_type: str = "password", # "password" or "key"
        encrypted_password: Optional[str] = None,
        encrypted_private_key: Optional[str] = None,
        passphrase: Optional[str] = None,
        device_type: str = "generic", # "linux", "cisco_ios", "mikrotik", "generic"
        pty_type: str = "xterm-256color",
        description: str = "",
        status: str = "Ready", # "Ready", "Online", "Offline", "Error", "Connecting"
        last_connected_at: Optional[str] = None,
        last_latency_ms: Optional[float] = None,
        last_error: Optional[str] = None,
        last_fetched_at: Optional[str] = None,
        fetched_data: Optional[Dict[str, Any]] = None,
        created_at: Optional[str] = None,
        updated_at: Optional[str] = None
    ):
        now_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        self.id = id or f"ssh-{uuid.uuid4().hex[:8]}"
        self.name = name or host or "SSH-Device"
        self.host = host
        self.port = int(port) if port else 22
        self.username = username
        self.auth_type = auth_type or "password"
        self.encrypted_password = encrypted_password
        self.encrypted_private_key = encrypted_private_key
        self.passphrase = passphrase
        self.device_type = device_type or "generic"
        self.pty_type = pty_type or "xterm-256color"
        self.description = description or ""
        self.status = status or "Ready"
        self.last_connected_at = last_connected_at
        self.last_latency_ms = last_latency_ms
        self.last_error = last_error
        self.last_fetched_at = last_fetched_at
        self.fetched_data = fetched_data
        self.created_at = created_at or now_iso
        self.updated_at = updated_at or now_iso

    def to_dict(self, include_sensitive: bool = False) -> Dict[str, Any]:
        data: Dict[str, Any] = {
            "id": self.id,
            "name": self.name,
            "host": self.host,
            "port": self.port,
            "username": self.username,
            "auth_type": self.auth_type,
            "device_type": self.device_type,
            "pty_type": self.pty_type,
            "description": self.description,
            "status": self.status,
            "last_connected_at": self.last_connected_at,
            "last_latency_ms": self.last_latency_ms,
            "last_error": self.last_error,
            "last_fetched_at": self.last_fetched_at,
            "fetched_data": self.fetched_data,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "has_password": bool(self.encrypted_password),
            "has_key": bool(self.encrypted_private_key)
        }
        if include_sensitive:
            data["encrypted_password"] = self.encrypted_password
            data["encrypted_private_key"] = self.encrypted_private_key
            data["passphrase"] = self.passphrase
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SshTestDevice":
        return cls(
            id=data.get("id"),
            name=data.get("name", ""),
            host=data.get("host", ""),
            port=data.get("port", 22),
            username=data.get("username", ""),
            auth_type=data.get("auth_type", "password"),
            encrypted_password=data.get("encrypted_password"),
            encrypted_private_key=data.get("encrypted_private_key"),
            passphrase=data.get("passphrase"),
            device_type=data.get("device_type", "generic"),
            pty_type=data.get("pty_type", "xterm-256color"),
            description=data.get("description", ""),
            status=data.get("status", "Ready"),
            last_connected_at=data.get("last_connected_at"),
            last_latency_ms=data.get("last_latency_ms"),
            last_error=data.get("last_error"),
            last_fetched_at=data.get("last_fetched_at"),
            fetched_data=data.get("fetched_data"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at")
        )
