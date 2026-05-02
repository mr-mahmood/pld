from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.exceptions import TokenError
from authentication.models import SecurityEvent
from core.exceptions import APIError, AuthSessionError
from core.utils import log_security_event, get_client_ip
from users.models import User


class VersionedRefreshToken(RefreshToken):
    @classmethod
    def for_user(cls, user):
        token = super().for_user(user)
        token["token_version"] = user.token_version
        return token


def rotate_refresh_token(refresh_token_str, request):
    try:
        old_refresh = RefreshToken(refresh_token_str)
    except TokenError:
        raise APIError(AuthSessionError.INVALID_REFRESH_TOKEN)

    user = User.objects.get(id=old_refresh["uid"])

    # blacklist old refresh token
    old_refresh.blacklist()

    # new refresh & access
    new_refresh = VersionedRefreshToken.for_user(user)
    new_access = str(new_refresh.access_token)

    log_security_event(
        user=user,
        event=SecurityEvent.EventType.TOKEN_REFRESHED,
        severity=SecurityEvent.Severity.INFO,
        ip_address=get_client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", ""),
        message=f"{user.role} {user.employe_number} token refreshed and get new jwt tokens"
    )

    return new_access, str(new_refresh)


