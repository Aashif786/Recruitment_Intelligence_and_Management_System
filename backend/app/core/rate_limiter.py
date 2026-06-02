"""
IP-based rate limiting for sensitive endpoints.
Uses slowapi (built on top of limits library).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

def custom_key_func(request: Request) -> str:
    """Combine IP and user identifier for more granular rate limiting."""
    ip = get_remote_address(request)
    identifier = request.headers.get("x-user-email", "") or request.headers.get("email", "")
    
    # Try query parameters if not in headers
    if not identifier:
        identifier = request.query_params.get("email", "")
        
    return f"{ip}:{identifier}" if identifier else ip

# Global rate limiter instance — keyed by client IP and optionally email
limiter = Limiter(key_func=custom_key_func)
