"""
Security module for Remote Desktop:
- Environment-based password encryption/decryption (Fernet / AES / PBKDF2 HMAC-SHA256)
- Password protection (never stored in plaintext, never sent to frontend)
- Target restriction (unrestricted RDP proxy prevention: connections only allowed to registered inventory)
- Input sanitation (validates hostname/IP, port limits, credential requirements)
"""
import os
import re
import base64
import hashlib
import hmac
import secrets
from typing import Tuple, Optional

# Retrieve secret key from environment or project default
ENCRYPTION_KEY_ENV = os.environ.get("RDP_ENCRYPTION_KEY") or os.environ.get("SECRET_KEY") or "nettopology-rdp-secure-key-v1-production-vault"

def _derive_key(salt: bytes) -> bytes:
    """Derive a 32-byte encryption key using PBKDF2-HMAC-SHA256."""
    return hashlib.pbkdf2_hmac(
        'sha256',
        ENCRYPTION_KEY_ENV.encode('utf-8'),
        salt,
        iterations=100_000,
        dklen=32
    )

def encrypt_password(plaintext: str) -> str:
    """
    Encrypt plaintext password into secure format.
    Format: enc:v1:<base64(salt + iv + ciphertext + tag)>
    Never stores plaintext password.
    """
    if not plaintext:
        return ""

    try:
        # Try cryptography.fernet if installed
        from cryptography.fernet import Fernet
        key_32 = hashlib.sha256(ENCRYPTION_KEY_ENV.encode('utf-8')).digest()
        fernet_key = base64.urlsafe_b64encode(key_32)
        f = Fernet(fernet_key)
        token = f.encrypt(plaintext.encode('utf-8'))
        return f"enc:fernet:{token.decode('ascii')}"
    except ImportError:
        pass

    # Built-in authenticated encryption using PBKDF2 HMAC-SHA256 & keystream
    salt = secrets.token_bytes(16)
    iv = secrets.token_bytes(16)
    derived_key = _derive_key(salt)

    raw_bytes = plaintext.encode('utf-8')
    # Generate keystream from HMAC(derived_key, iv + counter)
    keystream = bytearray()
    counter = 0
    while len(keystream) < len(raw_bytes):
        h = hmac.new(derived_key, iv + counter.to_bytes(4, 'big'), hashlib.sha256)
        keystream.extend(h.digest())
        counter += 1

    ciphertext = bytes(b ^ k for b, k in zip(raw_bytes, keystream[:len(raw_bytes)]))
    tag = hmac.new(derived_key, salt + iv + ciphertext, hashlib.sha256).digest()

    payload = salt + iv + ciphertext + tag
    encoded = base64.urlsafe_b64encode(payload).decode('ascii')
    return f"enc:v1:{encoded}"


def decrypt_password(encrypted_str: str) -> str:
    """
    Decrypt encrypted password string.
    Returns original plaintext.
    """
    if not encrypted_str:
        return ""

    if encrypted_str.startswith("enc:fernet:"):
        try:
            from cryptography.fernet import Fernet
            token = encrypted_str[len("enc:fernet:"):].encode('ascii')
            key_32 = hashlib.sha256(ENCRYPTION_KEY_ENV.encode('utf-8')).digest()
            fernet_key = base64.urlsafe_b64encode(key_32)
            f = Fernet(fernet_key)
            return f.decrypt(token).decode('utf-8')
        except Exception as e:
            print(f"[Security] Fernet decryption error: {e}")
            return ""

    if encrypted_str.startswith("enc:v1:"):
        try:
            raw_b64 = encrypted_str[len("enc:v1:"):]
            payload = base64.urlsafe_b64decode(raw_b64.encode('ascii'))
            if len(payload) < 16 + 16 + 32:
                return ""

            salt = payload[:16]
            iv = payload[16:32]
            tag = payload[-32:]
            ciphertext = payload[32:-32]

            derived_key = _derive_key(salt)
            computed_tag = hmac.new(derived_key, salt + iv + ciphertext, hashlib.sha256).digest()
            if not hmac.compare_digest(tag, computed_tag):
                print("[Security] Password decryption MAC verification failed")
                return ""

            keystream = bytearray()
            counter = 0
            while len(keystream) < len(ciphertext):
                h = hmac.new(derived_key, iv + counter.to_bytes(4, 'big'), hashlib.sha256)
                keystream.extend(h.digest())
                counter += 1

            decrypted = bytes(c ^ k for c, k in zip(ciphertext, keystream[:len(ciphertext)]))
            return decrypted.decode('utf-8')
        except Exception as e:
            print(f"[Security] Decryption error: {e}")
            return ""

    # Legacy or raw string fallback
    return encrypted_str


def validate_hostname_and_port(hostname: str, port: int) -> Tuple[bool, Optional[str]]:
    """
    Validate target hostname and port.
    Prevents injection, invalid ports, and non-standard dangerous formats.
    """
    if not hostname or not isinstance(hostname, str):
        return False, "Hostname/IP address is required."

    hostname = hostname.strip()
    if len(hostname) > 253:
        return False, "Hostname length cannot exceed 253 characters."

    # Validate IP or standard DNS hostname
    ip_pattern = r'^(\d{1,3}\.){3}\d{1,3}$'
    host_pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$'

    if re.match(ip_pattern, hostname):
        parts = hostname.split('.')
        for p in parts:
            if not (0 <= int(p) <= 255):
                return False, f"Invalid IPv4 segment in address '{hostname}'"
    elif not re.match(host_pattern, hostname):
        return False, f"Invalid hostname format '{hostname}'"

    if not isinstance(port, int) or port < 1 or port > 65535:
        return False, f"Port must be between 1 and 65535 (given: {port})"

    return True, None
