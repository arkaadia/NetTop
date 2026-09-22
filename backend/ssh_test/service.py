"""
SSH Test Service Layer.
Coordinates storage, encryption, Paramiko data fetcher, and 8-layer diagnostic engine.
"""
from typing import List, Optional, Dict, Any, Tuple
import time

from .models import SshTestDevice
from .storage import SshTestStorage
from .security import encrypt_secret, decrypt_secret, create_session_token, verify_session_token
from .fetcher import fetch_device_data
from .diagnostic import run_end_to_end_diagnostic

class SshTestService:
    def __init__(self):
        self.storage = SshTestStorage()

    def list_devices(self) -> List[Dict[str, Any]]:
        devices = self.storage.load_all()
        return [d.to_dict(include_sensitive=False) for d in devices]

    def get_device(self, device_id: str, include_sensitive: bool = False) -> Optional[SshTestDevice]:
        return self.storage.get_by_id(device_id)

    def create_device(self, data: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        host = data.get("host", "").strip()
        username = data.get("username", "").strip()
        if not host:
            return None, "Host / IP address is required."
        if not username:
            return None, "SSH Username is required."

        auth_type = data.get("auth_type", "password")
        plain_password = data.get("password")
        plain_key = data.get("private_key")
        passphrase = data.get("passphrase")

        encrypted_pwd = encrypt_secret(plain_password) if plain_password else None
        encrypted_key = encrypt_secret(plain_key) if plain_key else None

        device = SshTestDevice(
            name=data.get("name") or host,
            host=host,
            port=int(data.get("port", 22)),
            username=username,
            auth_type=auth_type,
            encrypted_password=encrypted_pwd,
            encrypted_private_key=encrypted_key,
            passphrase=passphrase,
            device_type=data.get("device_type", "generic"),
            pty_type=data.get("pty_type", "xterm-256color"),
            description=data.get("description", "")
        )

        ok = self.storage.save_device(device)
        if not ok:
            return None, "Failed to save SSH device to persistent storage."

        return device.to_dict(include_sensitive=False), None

    def update_device(self, device_id: str, data: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        device = self.storage.get_by_id(device_id)
        if not device:
            return None, f"Device with ID '{device_id}' not found."

        if "name" in data:
            device.name = data["name"].strip() or device.host
        if "host" in data:
            device.host = data["host"].strip()
        if "port" in data:
            device.port = int(data["port"])
        if "username" in data:
            device.username = data["username"].strip()
        if "auth_type" in data:
            device.auth_type = data["auth_type"]
        if "device_type" in data:
            device.device_type = data["device_type"]
        if "pty_type" in data:
            device.pty_type = data["pty_type"]
        if "description" in data:
            device.description = data["description"]
        if "status" in data:
            device.status = data["status"]
        if "passphrase" in data:
            device.passphrase = data["passphrase"]

        # Only update secrets if non-empty string provided
        if data.get("password"):
            device.encrypted_password = encrypt_secret(data["password"])
        if data.get("private_key"):
            device.encrypted_private_key = encrypt_secret(data["private_key"])

        device.updated_at = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        ok = self.storage.save_device(device)
        if not ok:
            return None, "Failed to update device record."

        return device.to_dict(include_sensitive=False), None

    def delete_device(self, device_id: str) -> bool:
        return self.storage.delete_device(device_id)

    def fetch_data(self, device_id: str) -> Tuple[bool, Dict[str, Any], str]:
        """
        Executes real data fetch via Paramiko from device.
        Updates device record with fetched specs and interfaces.
        """
        device = self.storage.get_by_id(device_id)
        if not device:
            return False, {}, "Device not found."

        plain_pwd = decrypt_secret(device.encrypted_password)
        plain_key = decrypt_secret(device.encrypted_private_key)

        success, fetched_data, err_msg = fetch_device_data(
            device=device,
            plain_password=plain_pwd,
            plain_key=plain_key
        )

        now_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        if success:
            device.status = "Online"
            device.last_fetched_at = now_iso
            device.fetched_data = fetched_data
            device.last_error = None
        else:
            device.status = "Error"
            device.last_error = err_msg

        self.storage.save_device(device)
        return success, fetched_data, err_msg

    def diagnose_device(self, device_id: str) -> Dict[str, Any]:
        """
        Runs comprehensive 8-layer diagnostic audit from frontend to device.
        """
        device = self.storage.get_by_id(device_id)
        if not device:
            return {
                "overall_status": "failed",
                "failed_at_layer": "DEVICE_LOOKUP",
                "steps": [{
                    "layer_id": "DEVICE_LOOKUP",
                    "title_fa": "یافتن دیوایس در پایگاه داده",
                    "title_en": "Device Database Lookup",
                    "status": "failed",
                    "error": f"شناسه دیوایس '{device_id}' در سیستم یافت نشد."
                }]
            }

        plain_pwd = decrypt_secret(device.encrypted_password)
        plain_key = decrypt_secret(device.encrypted_private_key)

        report = run_end_to_end_diagnostic(
            device=device,
            plain_password=plain_pwd,
            plain_key=plain_key
        )

        # Update device status based on diagnostic
        now_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        if report["overall_status"] == "passed":
            device.status = "Online"
            device.last_error = None
        else:
            device.status = "Error"
            device.last_error = f"Diagnostic failed at {report.get('failed_at_layer')}"

        self.storage.save_device(device)
        return report

    def create_session_token(self, device_id: str) -> Tuple[Optional[str], Optional[str]]:
        device = self.storage.get_by_id(device_id)
        if not device:
            return None, "Device not found."
        token = create_session_token(device_id, expires_in_seconds=60)
        return token, None

    def get_session_credentials(self, token: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        device_id = verify_session_token(token)
        if not device_id:
            return None, "Invalid or expired session token."
        device = self.storage.get_by_id(device_id)
        if not device:
            return None, "Device not found."

        plain_pwd = decrypt_secret(device.encrypted_password)
        plain_key = decrypt_secret(device.encrypted_private_key)

        creds = {
            "device_id": device.id,
            "name": device.name,
            "host": device.host,
            "port": device.port,
            "username": device.username,
            "auth_type": device.auth_type,
            "password": plain_pwd,
            "private_key": plain_key,
            "passphrase": device.passphrase,
            "pty_type": device.pty_type
        }
        return creds, None
