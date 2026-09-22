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

# Comprehensive MAC algorithms
RECOMMENDED_MACS: Tuple[str, ...] = (
    'hmac-sha2-256',
    'hmac-sha2-512',
    'hmac-sha1',
    'hmac-sha1-96',
    'hmac-md5',
    'hmac-md5-96',
    'hmac-sha2-256-etm@openssh.com',
    'hmac-sha2-512-etm@openssh.com'
)

def configure_paramiko_security():
    """
    Globally patches Paramiko Transport defaults and hooks _parse_kex_init
    to support all SSH Version 2 Key Exchange algorithms, ciphers, and key types
    needed for Cisco switches, preventing 'no acceptable kex algorithm' errors.
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
        paramiko.Transport._kex_info['curve25519-sha256@libssh.org'] = KexCurve25519
        paramiko.Transport._kex_info['diffie-hellman-group-exchange-sha1'] = KexGex
        paramiko.Transport._kex_info['diffie-hellman-group-exchange-sha256'] = KexGexSHA256
        paramiko.Transport._kex_info['diffie-hellman-group14-sha1'] = KexGroup14
        paramiko.Transport._kex_info['diffie-hellman-group14-sha256'] = KexGroup14SHA256
        paramiko.Transport._kex_info['diffie-hellman-group1-sha1'] = KexGroup1
        paramiko.Transport._kex_info['ecdh-sha2-nistp256'] = KexNistp256
        paramiko.Transport._kex_info['ecdh-sha2-nistp384'] = KexNistp384
        paramiko.Transport._kex_info['ecdh-sha2-nistp521'] = KexNistp521

        # Set class-level preferred algorithms
        valid_kex = tuple(k for k in RECOMMENDED_KEX if k in paramiko.Transport._kex_info)
        paramiko.Transport._preferred_kex = valid_kex

        if hasattr(paramiko.Transport, '_cipher_info'):
            valid_ciphers = tuple(c for c in RECOMMENDED_CIPHERS if c in paramiko.Transport._cipher_info)
            paramiko.Transport._preferred_ciphers = valid_ciphers

        valid_keys = tuple(k for k in RECOMMENDED_KEYS if k in paramiko.Transport._preferred_keys)
        paramiko.Transport._preferred_keys = valid_keys

        if hasattr(paramiko.Transport, '_mac_info'):
            valid_macs = tuple(m for m in RECOMMENDED_MACS if m in paramiko.Transport._mac_info)
            paramiko.Transport._preferred_macs = valid_macs

        # Patch Transport.__init__ so any transport instance automatically receives the full security options
        orig_init = paramiko.Transport.__init__
        def patched_init(self, *args, **kwargs):
            orig_init(self, *args, **kwargs)
            try:
                self._preferred_kex = valid_kex
                if hasattr(self, '_cipher_info'):
                    self._preferred_ciphers = valid_ciphers
                self._preferred_keys = valid_keys
                if hasattr(self, '_mac_info'):
                    self._preferred_macs = valid_macs
            except Exception:
                pass
        paramiko.Transport.__init__ = patched_init

        # Adaptive KEX negotiation hook:
        # If the remote peer offers algorithms that Paramiko might otherwise reject,
        # dynamically resolve and register the engine so connection never fails with
        # 'Incompatible ssh peer (no acceptable kex algorithm)'
        orig_parse_kex_init = paramiko.Transport._parse_kex_init
        def adaptive_parse_kex_init(self, m):
            try:
                orig_parse_kex_init(self, m)
            except paramiko.ssh_exception.IncompatiblePeer as e:
                err_str = str(e).lower()
                if "kex" in err_str and hasattr(self, 'remote_kex_init') and self.remote_kex_init:
                    try:
                        # Re-parse remote message
                        msg_copy = paramiko.message.Message(self.remote_kex_init)
                        parsed = self._really_parse_kex_init(msg_copy, ignore_first_byte=True)
                        server_kex = parsed.get("kex_algo_list", [])
                        
                        # Find any match in RECOMMENDED_KEX or dynamically map
                        chosen_kex = None
                        for s_kex in server_kex:
                            if s_kex in paramiko.Transport._kex_info:
                                chosen_kex = s_kex
                                break
                            elif 'curve25519' in s_kex:
                                paramiko.Transport._kex_info[s_kex] = KexCurve25519
                                chosen_kex = s_kex
                                break
                            elif 'group14' in s_kex:
                                paramiko.Transport._kex_info[s_kex] = KexGroup14
                                chosen_kex = s_kex
                                break
                            elif 'group1' in s_kex:
                                paramiko.Transport._kex_info[s_kex] = KexGroup1
                                chosen_kex = s_kex
                                break
                            elif 'exchange' in s_kex or 'gex' in s_kex:
                                paramiko.Transport._kex_info[s_kex] = KexGex
                                chosen_kex = s_kex
                                break

                        if chosen_kex:
                            self._preferred_kex = (chosen_kex,) + self._preferred_kex
                            msg_retry = paramiko.message.Message(self.remote_kex_init)
                            if msg_retry.asbytes().startswith(bytes([paramiko.common.cMSG_KEXINIT[0]])):
                                msg_retry.get_byte()
                            return orig_parse_kex_init(self, msg_retry)
                    except Exception as inner_e:
                        logging.warning(f"[Paramiko Adaptive KEX] Failed recovery: {inner_e}")
                raise e
        paramiko.Transport._parse_kex_init = adaptive_parse_kex_init

        _INITIALIZED = True
        logging.info("[Paramiko Patch] Successfully enabled adaptive SSH v2 KEX & Cipher algorithms for Cisco switches.")
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
