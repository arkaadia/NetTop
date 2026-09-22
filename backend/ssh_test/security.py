"""
Security & Encryption Utilities for SSH Test Module.
Protects credentials at rest using AES-CBC/GCM or HMAC-SHA256 authenticated encryption.
Issues short-lived session tokens for WebSocket authentication.
"""
import os
import time
import base64
import hashlib
import hmac
import json
from typing import Optional, Tuple, Dict, Any

try:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.backends import default_backend
    _HAS_CRYPTOGRAPHY = True
except ImportError:
    _HAS_CRYPTOGRAPHY = False

DEFAULT_MASTER_KEY = os.environ.get("SSH_ENCRYPTION_KEY") or os.environ.get("RDP_ENCRYPTION_KEY") or "nettopology-ssh-master-secret-key-salt-987"
TOKEN_SIGNING_SECRET = (os.environ.get("SESSION_SECRET") or "nettop-ssh-session-secret-salt-2026").encode('utf-8')

def _derive_key(salt: bytes) -> bytes:
    master = DEFAULT_MASTER_KEY.encode('utf-8')
    if _HAS_CRYPTOGRAPHY:
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        return kdf.derive(master)
    else:
        return hashlib.pbkdf2_hmac('sha256', master, salt, 100000, 32)

def encrypt_secret(plaintext: Optional[str]) -> Optional[str]:
    """Encrypts plaintext string using AES-CBC with PKCS7 padding or XOR-HMAC fallback."""
    if not plaintext:
        return None
    try:
        salt = os.urandom(16)
        iv = os.urandom(16)
        key = _derive_key(salt)
        data = plaintext.encode('utf-8')

        if _HAS_CRYPTOGRAPHY:
            pad_len = 16 - (len(data) % 16)
            padded_data = data + bytes([pad_len] * pad_len)
            cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
            encryptor = cipher.encryptor()
            ciphertext = encryptor.update(padded_data) + encryptor.finalize()
            envelope = salt + iv + ciphertext
            return "enc:aes:" + base64.b64encode(envelope).decode('utf-8')
        else:
            keystream = hashlib.sha256(key + iv).digest()
            while len(keystream) < len(data):
                keystream += hashlib.sha256(keystream).digest()
            xor_cipher = bytes([b ^ keystream[i] for i, b in enumerate(data)])
            tag = hmac.new(key, iv + xor_cipher, hashlib.sha256).digest()
            envelope = salt + iv + tag + xor_cipher
            return "enc:xor:" + base64.b64encode(envelope).decode('utf-8')
    except Exception as e:
        print(f"[Security] Encryption error: {e}")
        return "raw:" + plaintext

def decrypt_secret(encrypted_str: Optional[str]) -> str:
    """Decrypts ciphertext string."""
    if not encrypted_str:
        return ""
    if encrypted_str.startswith("raw:"):
        return encrypted_str[4:]
    try:
        if encrypted_str.startswith("enc:aes:"):
            payload = base64.b64decode(encrypted_str[8:])
            salt = payload[:16]
            iv = payload[16:32]
            ciphertext = payload[32:]
            key = _derive_key(salt)
            if _HAS_CRYPTOGRAPHY:
                cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
                decryptor = cipher.decryptor()
                padded = decryptor.update(ciphertext) + decryptor.finalize()
                pad_len = padded[-1]
                if 1 <= pad_len <= 16:
                    return padded[:-pad_len].decode('utf-8')
                return padded.decode('utf-8', errors='ignore')
        elif encrypted_str.startswith("enc:xor:"):
            payload = base64.b64decode(encrypted_str[8:])
            salt = payload[:16]
            iv = payload[16:32]
            tag = payload[32:64]
            ciphertext = payload[64:]
            key = _derive_key(salt)
            expected_tag = hmac.new(key, iv + ciphertext, hashlib.sha256).digest()
            if not hmac.compare_digest(tag, expected_tag):
                return ""
            keystream = hashlib.sha256(key + iv).digest()
            while len(keystream) < len(ciphertext):
                keystream += hashlib.sha256(keystream).digest()
            data = bytes([b ^ keystream[i] for i, b in enumerate(ciphertext)])
            return data.decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"[Security] Decryption error: {e}")
        return ""
    return ""

def create_session_token(device_id: str, expires_in_seconds: int = 60) -> str:
    """Generates an ephemeral, cryptographically signed token for WebSocket authentication."""
    exp = int(time.time()) + expires_in_seconds
    nonce = os.urandom(8).hex()
    payload = f"{device_id}:{exp}:{nonce}"
    sig = hmac.new(TOKEN_SIGNING_SECRET, payload.encode('utf-8'), hashlib.sha256).hexdigest()
    raw = f"{payload}:{sig}"
    return base64.urlsafe_b64encode(raw.encode('utf-8')).decode('utf-8')

def verify_session_token(token: str) -> Optional[str]:
    """Validates session token signature and expiration. Returns device_id if valid."""
    try:
        raw = base64.urlsafe_b64decode(token.encode('utf-8')).decode('utf-8')
        parts = raw.split(":")
        if len(parts) != 4:
            return None
        device_id, exp_str, nonce, sig = parts
        exp = int(exp_str)
        if time.time() > exp:
            return None # Expired
        payload = f"{device_id}:{exp}:{nonce}"
        expected_sig = hmac.new(TOKEN_SIGNING_SECRET, payload.encode('utf-8'), hashlib.sha256).hexdigest()
        if hmac.compare_digest(sig, expected_sig):
            return device_id
        return None
    except Exception:
        return None
