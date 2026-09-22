"""
SSH Test Module with Real Paramiko 2 & WebSocket Connectivity.
Provides device management, genuine data fetching, 8-layer diagnostics, and interactive terminal sessions.
"""
from .kex_patch import configure_paramiko_security, CiscoCompatibleTransport
# Ensure Paramiko globally enables all modern and legacy Cisco SSH v2 KEX algorithms
configure_paramiko_security()

from .models import SshTestDevice
from .storage import SshTestStorage
from .security import encrypt_secret, decrypt_secret, create_session_token, verify_session_token
from .fetcher import fetch_device_data
from .diagnostic import run_end_to_end_diagnostic
from .service import SshTestService
from .routes import handle_ssh_test_request, service

__all__ = [
    "SshTestDevice",
    "SshTestStorage",
    "SshTestService",
    "encrypt_secret",
    "decrypt_secret",
    "create_session_token",
    "verify_session_token",
    "fetch_device_data",
    "run_end_to_end_diagnostic",
    "handle_ssh_test_request",
    "service",
    "configure_paramiko_security",
    "CiscoCompatibleTransport"
]

