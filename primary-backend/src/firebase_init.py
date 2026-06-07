"""Firebase Admin SDK initialization."""

import os
import json
import firebase_admin
from firebase_admin import credentials, auth

_initialized = False


def init_firebase():
    """Initialize Firebase Admin SDK from service account key file or JSON string."""
    global _initialized
    if _initialized:
        return

    key_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", "./firebase-service-account.json")

    # If the value looks like JSON, parse it directly (for deployment)
    if key_path.strip().startswith("{"):
        info = json.loads(key_path)
        cred = credentials.Certificate(info)
    else:
        cred = credentials.Certificate(key_path)

    firebase_admin.initialize_app(cred)
    _initialized = True
    print("✅ Firebase Admin SDK initialized")


def verify_id_token(id_token: str) -> dict:
    """
    Verify a Firebase ID token and return the decoded claims.

    Returns dict with keys like: uid, email, phone_number, name, picture, etc.
    """
    return auth.verify_id_token(id_token)
