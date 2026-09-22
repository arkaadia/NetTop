"""
Paramiko Cryptographic Compatibility & Cisco / MikroTik / Network Hardware KEX Module.
Ensures Paramiko 2 supports SSH Version 2 with all modern and legacy Key Exchange (KEX) algorithms,
ciphers, host key types, and MACs used by Cisco IOS, Catalyst, Nexus, ASA, and MikroTik switches.

Fixes the common error:
"Incompatible ssh peer (no acceptable kex algorithm)"
by registering standard OpenSSH names like 'curve25519-sha256' and ensuring legacy DH groups
such as 'diffie-hellman-group1-sha1', 'diffie-hellman-group14-sha1', and 'diffie-hellman-group-exchange-sha1'
are fully enabled and prioritized.
"""
import logging
from typing import List, Tuple

_INITIALIZED = False

# Comprehensive ordered KEX list for SSH Version 2 compatibility
RECOMMENDED_KEX: Tuple[str, ...] = (
    # Modern secure curves (RFC 8731 & OpenSSH)
    'curve25519-sha256',
    'curve25519-sha256@libssh.org',
    'ecdh-sha2-nistp256',
    'ecdh-sha2-nistp384',
    'ecdh-sha2-nistp521',
    # Modern Diffie-Hellman (SHA-256 / SHA-512)
    'diffie-hellman-group-exchange-sha256',
    'diffie-hellman-group14-sha256',
    'diffie-hellman-group16-sha512',
    # Legacy Cisco / Catalyst / IOS 12 & 15 / MikroTik RouterOS algorithms (SHA-1)
    'diffie-hellman-group-exchange-sha1',
    'diffie-hellman-group14-sha1',
    'diffie-hellman-group1-sha1'
)

# Comprehensive Ciphers list for Cisco / Network devices
RECOMMENDED_CIPHERS: Tuple[str, ...] = (
    'aes128-ctr',
    'aes192-ctr',
    'aes256-ctr',
    'aes128-cbc',
    'aes192-cbc',
    'aes256-cbc',
    '3des-cbc'
)

# Comprehensive Host Key types (SSH Version 2)
RECOMMENDED_KEYS: Tuple[str, ...] = (
    'ssh-ed25519',
    'ecdsa-sha2-nistp256',
    'ecdsa-sha2-nistp384',
    'ecdsa-sha2-nistp521',
    'rsa-sha2-512',
    'rsa-sha2-256',
    'ssh-rsa',
    'ssh-dss'
)

def configure_paramiko_security():
    """
    Globally patches Paramiko Transport defaults to support all SSH Version 2
    Key Exchange algorithms, ciphers, and key types needed for Cisco switches.
    """
    global _INITIALIZED
    if _INITIALIZED:
        return

    try:
        import paramiko
        import paramiko.transport
        from paramiko.kex_curve25519 import KexCurve25519
        from paramiko.kex_group1 import KexGroup1
        from paramiko.kex_group14 import KexGroup14, KexGroup14SHA256
        from paramiko.kex_gex import KexGex, KexGexSHA256
        from paramiko.kex_ecdh_nist import KexNistp256, KexNistp384, KexNistp521

        # Register curve25519-sha256 (RFC 8731 standard name without @libssh.org suffix)
        paramiko.Transport._kex_info['curve25519-sha256'] = KexCurve25519
        paramiko.Transport._kex_info['diffie-hellman-group-exchange-sha1'] = KexGex
        paramiko.Transport._kex_info['diffie-hellman-group-exchange-sha256'] = KexGexSHA256
        paramiko.Transport._kex_info['diffie-hellman-group14-sha1'] = KexGroup14
        paramiko.Transport._kex_info['diffie-hellman-group14-sha256'] = KexGroup14SHA256
        paramiko.Transport._kex_info['diffie-hellman-group1-sha1'] = KexGroup1

        # Set preferred KEX in Transport class
        valid_kex = tuple(k for k in RECOMMENDED_KEX if k in paramiko.Transport._kex_info)
        paramiko.Transport._preferred_kex = valid_kex

        # Set preferred Ciphers
        if hasattr(paramiko.Transport, '_cipher_info'):
            valid_ciphers = tuple(c for c in RECOMMENDED_CIPHERS if c in paramiko.Transport._cipher_info)
            paramiko.Transport._preferred_ciphers = valid_ciphers

        # Set preferred Keys
        valid_keys = tuple(k for k in RECOMMENDED_KEYS if k in paramiko.Transport._preferred_keys)
        paramiko.Transport._preferred_keys = valid_keys

        _INITIALIZED = True
        logging.info("[Paramiko Patch] Successfully enabled broad SSH v2 KEX & Cipher algorithms for Cisco switches.")
    except Exception as e:
        logging.warning(f"[Paramiko Patch] Failed to apply global Paramiko patch: {e}")


class CiscoCompatibleTransport:
    """
    Transport factory that instantiates paramiko.Transport and explicitly
    sets security options to accept all Cisco SSH Version 2 KEX algorithms and ciphers.
    """
    def __new__(cls, *args, **kwargs):
        import paramiko
        configure_paramiko_security()
        transport = paramiko.Transport(*args, **kwargs)
        try:
            sec = transport.get_security_options()
            sec.kex = list(RECOMMENDED_KEX)
            sec.ciphers = list(RECOMMENDED_CIPHERS)
            sec.key_types = list(RECOMMENDED_KEYS)
        except Exception:
            pass
        return transport
