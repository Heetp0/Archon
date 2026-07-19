import logging
from fastapi import Request, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from auth_service import decode_jwt

logger = logging.getLogger("auth_middleware")
security_bearer = HTTPBearer(auto_error=False)

class UserContext:
    def __init__(self, user_id: str, email: str, role: str):
        self.user_id = user_id
        self.email = email
        self.role = role

def get_current_user(request: Request) -> UserContext:
    """
    Returns the currently authenticated user context from request state.
    If no authorization header is present, falls back to a default user context
    to ensure seamless backwards compatibility for single-user offline setups.
    """
    # Check if auth middleware already populated the user
    user = getattr(request.state, "user", None)
    if user:
        return user
        
    # Check header manually
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        # Backwards compatible default user
        return UserContext(user_id="default_user", email="student@archon.local", role="student")
        
    token = auth_header.split(" ")[1]
    payload = decode_jwt(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user_ctx = UserContext(
        user_id=payload.get("user_id", "default_user"),
        email=payload.get("email", ""),
        role=payload.get("role", "student")
    )
    request.state.user = user_ctx
    return user_ctx
