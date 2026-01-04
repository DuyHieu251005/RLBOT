from datetime import datetime
from functools import lru_cache
from typing import Dict, Optional

import httpx
import jwt
from config import settings
from fastapi import Header, HTTPException


def get_supabase_service_role_key() -> str:
    key = (
        settings.SUPABASE_SERVICE_ROLE_KEY
        if hasattr(settings, "SUPABASE_SERVICE_ROLE_KEY")
        else None
    )
    if not key:
        raise ValueError(
            "SUPABASE_SERVICE_ROLE_KEY is not configured in environment variables"
        )
    return key


# Global HTTP client for connection pooling and better performance
_http_client: Optional[httpx.AsyncClient] = None

def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=30.0)
    return _http_client

async def close_http_client():
    global _http_client
    if _http_client and not _http_client.is_closed:
        await _http_client.aclose()
        _http_client = None

async def lookup_user_by_email(email: str) -> Optional[Dict]:
    """
    Returns:
        Dict with user info: {"id": "uuid", "email": "email"}
        or None if not found
    """
    try:
        supabase_url = get_supabase_url()
        service_key = get_supabase_service_role_key()
        
        admin_url = f"{supabase_url}/auth/v1/admin/users"
        
        client = get_http_client()
        response = await client.get(
            admin_url,
            headers={
                "Authorization": f"Bearer {service_key}",
                "apikey": service_key,
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            users = data.get("users", [])
            
            for user in users:
                user_email = user.get("email", "")
                if user_email.lower() == email.lower():
                    return {
                        "id": user.get("id"),
                        "email": user.get("email"),
                        "name": user.get("user_metadata", {}).get("name")
                    }
            return None
        else:
            print(f"[ERROR] Supabase admin API error: {response.status_code}")
            return None
                
    except Exception as e:
        print(f"[ERROR] lookup_user_by_email failed: {e}")
        return None


async def lookup_user_by_id(user_id: str) -> Optional[Dict]:
    """
    Returns:
        Dict with user info: {"id": "uuid", "email": "email", "name": "name"}
        or None if not found
    """
    try:
        supabase_url = get_supabase_url()
        service_key = get_supabase_service_role_key()
        
        admin_url = f"{supabase_url}/auth/v1/admin/users/{user_id}"
        
        client = get_http_client()
        response = await client.get(
            admin_url,
            headers={
                "Authorization": f"Bearer {service_key}",
                "apikey": service_key,
            }
        )
        
        if response.status_code == 200:
            user = response.json()
            return {
                "id": user.get("id"),
                "email": user.get("email"),
                "name": user.get("user_metadata", {}).get("name")
            }
        else:
            return None
                
    except Exception as e:
        print(f"[ERROR] lookup_user_by_id failed: {e}")
        return None


async def lookup_users_batch(user_ids: list[str]) -> Dict[str, Dict]:
    """
    Returns:
        Dict mapping user_id -> {id, email, name} or user_id -> user_id (fallback)
    """
    import asyncio
    
    if not user_ids:
        return {}
    
    unique_ids = list(dict.fromkeys(user_ids))
    
    async def lookup_single(uid: str) -> tuple[str, Dict]:
        try:
            result = await lookup_user_by_id(uid)
            if result and result.get("email"):
                return (uid, result)
            else:
                return (uid, {"id": uid, "email": uid, "name": None})
        except Exception:
            return (uid, {"id": uid, "email": uid, "name": None})
    
    results = await asyncio.gather(*[lookup_single(uid) for uid in unique_ids])
    
    return {uid: info for uid, info in results}
def get_supabase_jwt_secret() -> str:
    secret = (
        settings.SUPABASE_JWT_SECRET
        if hasattr(settings, "SUPABASE_JWT_SECRET")
        else None
    )
    if not secret:
        raise ValueError(
            "SUPABASE_JWT_SECRET is not configured in environment variables"
        )
    return secret


@lru_cache()
def get_supabase_url() -> str:
    url = settings.SUPABASE_URL if hasattr(settings, "SUPABASE_URL") else None
    if not url:
        raise ValueError("SUPABASE_URL is not configured in environment variables")
    return url


def verify_supabase_token(token: str) -> Dict:
    """
    Returns:
        Dict with user info: {
            "id": "user-uuid",
            "email": "user@example.com",
            "name": "User Name",
            "aud": "authenticated",
            "role": "authenticated"
        }

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        jwt_secret = get_supabase_jwt_secret()

        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_aud": True,
            },
        )

        user_info = {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "name": payload.get("user_metadata", {}).get("name")
            or payload.get("email", "").split("@")[0],
            "aud": payload.get("aud"),
            "role": payload.get("role"),
        }

        if not user_info["id"] or not user_info["email"]:
            raise ValueError("Token missing required user information")

        return user_info

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidAudienceError:
        raise HTTPException(status_code=401, detail="Invalid token audience")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        print(f"Token verification error: {e}")
        raise HTTPException(status_code=401, detail="Token verification failed")


async def get_current_user_supabase(authorization: str = Header(None)) -> Dict:
    """
    Returns:
        Dict with user info

    Raises:
        HTTPException: If token is missing or invalid
    """
    # Debug logging (only in DEBUG mode to prevent token exposure)
    if settings.DEBUG:
        print(f"[AUTH DEBUG] Authorization header received: {authorization[:50] if authorization else 'None'}...")
    
    if not authorization:
        if settings.DEBUG:
            print("[AUTH DEBUG] No authorization header!")
        raise HTTPException(
            status_code=401,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract token from "Bearer <token>"
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        if settings.DEBUG:
            print(f"[AUTH DEBUG] Invalid header format: {parts}")
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication header format. Expected: Bearer <token>",
        )

    token = parts[1]
    if settings.DEBUG:
        print(f"[AUTH DEBUG] Token extracted: {token[:30]}...")

    user_info = verify_supabase_token(token)
    if settings.DEBUG:
        print(f"[AUTH DEBUG] Token verified! User: {user_info.get('email')}")

    return user_info



def verify_supabase_token_optional(token: Optional[str]) -> Optional[Dict]:
    if not token:
        return None

    try:
        return verify_supabase_token(token)
    except HTTPException:
        return None
    except Exception as e:
        print(f"Optional token verification failed: {e}")
        return None
