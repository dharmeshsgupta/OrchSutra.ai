"""
Authentication dependencies for Agent Engine.
Supports Firebase JWT for dashboard operations and API Keys for external integrations.
"""
import os
import json
from fastapi import Request, HTTPException, status
import firebase_admin
from firebase_admin import credentials, auth
from sqlite3 import connect

from src.engine.config import config
from src.engine.agents.persistence import agent_persistence

_firebase_initialized = False

def init_firebase():
    """Initialize Firebase Admin SDK for agent engine."""
    global _firebase_initialized
    if _firebase_initialized:
        return

    # Look for the absolute path in .env, or fallback to the known path in primary-backend
    key_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
    if not key_path:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        key_path = os.path.join(base_dir, "primary-backend", "openrouter-51e78-firebase-adminsdk-fbsvc-a8d3902ad5.json")

    try:
        if key_path.strip().startswith("{"):
            info = json.loads(key_path)
            cred = credentials.Certificate(info)
        else:
            cred = credentials.Certificate(key_path)

        firebase_admin.initialize_app(cred, name="agent-engine")
        _firebase_initialized = True
        print("✅ Agent Engine Firebase Admin SDK initialized")
    except Exception as e:
        print(f"⚠️ Failed to initialize Firebase Admin SDK: {e}")

# Call init immediately so the SDK is ready
init_firebase()

def require_auth(request: Request) -> str:
    """
    Validates the Firebase JWT from the Authorization header or cookie.
    Returns the user's uid. Only for Dashboard Users.
    """
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]
    
    if not token and "auth" in request.cookies:
        token = request.cookies.get("auth")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated — no token provided",
        )

    try:
        decoded = auth.verify_id_token(token, app=firebase_admin.get_app("agent-engine"))
        uid = decoded.get("uid")
        if not uid:
            raise ValueError("Token missing uid")
        return uid
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {e}",
        )

def require_auth_or_api_key(request: Request) -> str:
    """
    Allows access if either:
    1. A valid Firebase JWT is provided in Authorization Bearer (Returns uid).
    2. A valid X-API-Key header matches the target agent's stored API Key (Returns 'api_key_user').
    
    Note: Since this is used on agent-specific routes (e.g. /v1/build/agent/{agent_id}/chat),
    we extract agent_id from the path params to validate the API key.
    """
    # 1. Check for API Key Header
    api_key = request.headers.get("X-API-Key")
    if api_key:
        agent_id = request.path_params.get("agent_id")
        if not agent_id:
            raise HTTPException(status_code=400, detail="agent_id path parameter required for API Key auth.")
            
        # Manually check the database since persistence layer doesn't expose api_key read yet
        with connect(config.ENGINE_AGENTS_DB_PATH) as conn:
            row = conn.execute("SELECT api_key FROM agents WHERE id = ?", (agent_id,)).fetchone()
            if row and row[0] == api_key:
                return "api_key_user" # Special system user for programmatic access
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid API Key for this agent.",
                )

    # 2. Fallback to Firebase JWT Auth
    return require_auth(request)
