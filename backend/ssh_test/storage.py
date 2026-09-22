"""
Dedicated Storage Manager for SSH Test Module.
Operates on backend/ssh_test_devices.json.
Completely isolated from existing topology or legacy devices. Zero mock data.
"""
import os
import json
import threading
from typing import List, Optional, Dict, Any
from .models import SshTestDevice

STORAGE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ssh_test_devices.json")
_LOCK = threading.RLock()

class SshTestStorage:
    def __init__(self, filepath: str = STORAGE_FILE):
        self.filepath = filepath
        self._ensure_file()

    def _ensure_file(self):
        with _LOCK:
            if not os.path.exists(self.filepath):
                # Start completely empty - clean and isolated
                initial = {
                    "version": "1.0.0",
                    "description": "NetTopology SSH Test Module Dedicated Device Store",
                    "devices": []
                }
                try:
                    with open(self.filepath, "w", encoding="utf-8") as f:
                        json.dump(initial, f, indent=2, ensure_ascii=False)
                except Exception as e:
                    print(f"[SSH Test Storage] Error initializing {self.filepath}: {e}")

    def load_all(self) -> List[SshTestDevice]:
        with _LOCK:
            self._ensure_file()
            try:
                with open(self.filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return [SshTestDevice.from_dict(d) for d in data.get("devices", [])]
            except Exception as e:
                print(f"[SSH Test Storage] Error reading {self.filepath}: {e}")
                return []

    def get_by_id(self, device_id: str) -> Optional[SshTestDevice]:
        devices = self.load_all()
        for d in devices:
            if d.id == device_id:
                return d
        return None

    def save_device(self, device: SshTestDevice) -> bool:
        with _LOCK:
            devices = self.load_all()
            found = False
            for i, d in enumerate(devices):
                if d.id == device.id:
                    devices[i] = device
                    found = True
                    break
            if not found:
                devices.append(device)
            return self._write_all(devices)

    def delete_device(self, device_id: str) -> bool:
        with _LOCK:
            devices = self.load_all()
            new_list = [d for d in devices if d.id != device_id]
            if len(new_list) == len(devices):
                return False
            return self._write_all(new_list)

    def _write_all(self, devices: List[SshTestDevice]) -> bool:
        with _LOCK:
            try:
                data = {
                    "version": "1.0.0",
                    "description": "NetTopology SSH Test Module Dedicated Device Store",
                    "devices": [d.to_dict(include_sensitive=True) for d in devices]
                }
                with open(self.filepath, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                return True
            except Exception as e:
                print(f"[SSH Test Storage] Error writing {self.filepath}: {e}")
                return False
