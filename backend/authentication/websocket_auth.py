from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.tokens import RefreshToken
from users.models import User


def parse_cookies(cookie_string: str) -> dict:
    """Parse cookie string into a dictionary"""
    cookies = {}
    if cookie_string:
        for cookie in cookie_string.split(';'):
            cookie = cookie.strip()
            if '=' in cookie:
                key, value = cookie.split('=', 1)
                cookies[key] = value
    return cookies


@database_sync_to_async
def get_user_from_tokens(access_token_str, refresh_token_str):
    """
    Returns User if authentication successful, AnonymousUser if not.
    """
    user_id = None
    token_version = None
    
    # Try to validate access token first
    try:
        access_token = AccessToken(access_token_str)
        user_id = access_token.get('uid')
        token_version = access_token.get('token_version')
    except (InvalidToken, TokenError):
        # If access token invalid, try refresh token
        try:
            refresh_token = RefreshToken(refresh_token_str)
            user_id = refresh_token.get('uid')
        except (InvalidToken, TokenError):
            return AnonymousUser()
    
    # Get user from database
    try:
        user = User.objects.get(id=user_id)
        
        # Check token version if we have it from access token
        if token_version and token_version != user.token_version:
            return AnonymousUser()
        
        return user
    except User.DoesNotExist:
        return AnonymousUser()


class WebSocketJWTAuthMiddleware(BaseMiddleware):
    """
    JWT Authentication middleware for WebSockets
    """
    async def __call__(self, scope, receive, send):
        # Parse cookies from headers manually
        headers = dict(scope.get('headers', []))
        cookie_header = headers.get(b'cookie', b'').decode()
        
        # Parse cookies
        cookies = parse_cookies(cookie_header)
        
        # Try to get token from cookies
        token = cookies.get('access_token')
        refresh_token = cookies.get('refresh_token')
        
        # If token found, authenticate the user
        if token:
            scope['user'] = await get_user_from_tokens(token, refresh_token) # type: ignore
        else:
            scope['user'] = AnonymousUser() # type: ignore
        
        return await super().__call__(scope, receive, send)