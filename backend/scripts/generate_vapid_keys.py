#!/usr/bin/env python3
"""Generate a VAPID key pair for Web Push. Run from repo root:
    cd ChoreQuest && python -m backend.scripts.generate_vapid_keys
Copy the output into .env.saas as VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.
"""
import base64
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization


def generate_vapid_keys():
    private_key = ec.generate_private_key(ec.SECP256R1())
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    public_bytes = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    public_b64 = base64.urlsafe_b64encode(public_bytes).rstrip(b"=").decode()
    return private_pem, public_b64


def main():
    priv, pub = generate_vapid_keys()
    print("Add these to your .env.saas file:\n")
    print("VAPID_PUBLIC_KEY=" + pub)
    print("VAPID_PRIVATE_KEY=" + priv.replace("\n", "\\n"))
    print("\nVAPID_CLAIM_EMAIL=mailto:you@chorequest.co.uk")

if __name__ == "__main__":
    main()
