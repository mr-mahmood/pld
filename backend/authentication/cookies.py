from rest_framework.response import Response
from django.conf import settings

def make_cookie(response: Response, cookies: dict) -> Response:
    for key, value in cookies.items():
        response.set_cookie(
            key=key,
            value=value,
            httponly=True,
            secure=settings.SESSION_COOKIE_SECURE,
            samesite=settings.SESSION_COOKIE_SAMESITE,
        )
    return response