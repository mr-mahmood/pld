import random
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.cache import cache
from rest_framework import status
from authentication.models import SecurityEvent
from authentication.tokens import VersionedRefreshToken
from core.bot_sender import send_to_bale
from users.models import User
from users.serializers import UserProfileSerializer
from core.utils import log_security_event, get_client_ip
from core.exceptions import APIError, AuthOTPError, AuthSessionError
from authentication.cookies import make_cookie
from authentication.serializers import LoginSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from authentication.serializers import PasswordChangeSerializer
from authentication.cookies import make_cookie
from authentication.tokens import rotate_refresh_token
from authentication.auth import RefreshJWTAuthentication
from typing import cast

class LoginAPIView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = cast(User, serializer.validated_data.get('user')) # type: ignore
        user.token_version += 1  # invalidate old JWTs
        user.save(update_fields=["token_version"])

        # Issue new versioned refresh + access token (single session)
        refresh = VersionedRefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        # Log login success after tokens are issued
        log_security_event(
            user=user,
            event=SecurityEvent.EventType.LOGIN_SUCCESS,
            severity=SecurityEvent.Severity.INFO,
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            message=f"{user.role} {user.employe_number} login to the system"
        )

        # Prepare response with cookies
        response = Response({
            "message": "Logged in successfully",
            "user": UserProfileSerializer(user, context={"request": request}).data
        }, status=status.HTTP_200_OK)

        make_cookie(response, {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_version": user.token_version
        })

        return response
    

class LogoutAPIView(APIView):
    authentication_classes = []
    permission_classes = []
    
    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        try:
            refresh = RefreshToken(refresh_token)
            refresh.blacklist()
        except TokenError:
            pass

        # Clear cookies
        response = Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        response.delete_cookie("token_version")
        return response


class PasswordChangeAPIView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = cast(User, serializer.save())

        # Log password change
        log_security_event(
            user=user,
            event=SecurityEvent.EventType.PASSWORD_CHANGED,
            severity=SecurityEvent.Severity.INFO,
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            
            message=f"{user.role} {user.employe_number} change its own password"
        )

        return Response({
            "message": "Password changed successfully",
            "user": UserProfileSerializer(user, context={"request": request}).data
        }, status=status.HTTP_200_OK)


class RefreshAPIView(APIView):
    authentication_classes = [RefreshJWTAuthentication]
    permission_classes = []
    
    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            raise APIError(AuthSessionError.NO_REFRESH_TOKEN)

        try:
            new_access, new_refresh = rotate_refresh_token(refresh_token, request)
        except ValueError as e:
            return Response(e, status=status.HTTP_400_BAD_REQUEST)

        response = Response({"message": "Token refresh successful"}, status=status.HTTP_200_OK)
        make_cookie(response, {
            "access_token": new_access,
            "refresh_token": str(new_refresh),
        })
        return response
    

OTP_CACHE_PREFIX = "otp"
OTP_EXPIRY_SECONDS = 120 # 2 minutes

class RequestOTPApiView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        user = User.get_user_for_otp(request.data.get("employe_number"))

        # --- Generate OTP ---
        # Simple 5-digit numeric OTP
        otp_code = str(random.randint(10_000, 99_999))

        # --- Store OTP in Cache ---
        cache_key = f"{OTP_CACHE_PREFIX}_{user.id}"
        otp_data = {
            "code": otp_code,
        }
        cache.set(cache_key, otp_data, OTP_EXPIRY_SECONDS)

        # --- Send OTP ---
        send_to_bale(f"رمز یک بار مصرف : {otp_code}")

        return Response({"message": "OTP created successful"}, status=status.HTTP_200_OK)
        

class VerifyOTPApiView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        user = User.get_user_for_otp(request.data.get("employe_number"))
        otp_code = request.data.get("otp")
        
        cache_key = f"{OTP_CACHE_PREFIX}_{user.id}"
        stored_otp_data = cache.get(cache_key)

        # 1. Check if OTP data exists in cache
        if not stored_otp_data:
            raise APIError(AuthOTPError.OTP_NOT_FOUND)

        stored_otp = stored_otp_data.get("code")

        # 2. Verify OTP code
        if otp_code == stored_otp:
            # OTP is correct.
            # --- IMPORTANT: Invalidate OTP immediately after successful retrieval ---
            cache.delete(cache_key)
            
            user.token_version += 1  # invalidate old JWTs
            user.save(update_fields=["token_version"])

            # Issue new versioned refresh + access token (single session)
            refresh = VersionedRefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)

            # Log login success after tokens are issued
            log_security_event(
                user=user,
                event=SecurityEvent.EventType.LOGIN_SUCCESS,
                severity=SecurityEvent.Severity.INFO,
                ip_address=get_client_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
                message=f"{user.role} {user.employe_number} login to the system using OTP"
            )

            # Prepare response with cookies
            response = Response({
                "message": "Logged in successfully",
                "user": UserProfileSerializer(user, context={"request": request}).data
            }, status=status.HTTP_200_OK)

            make_cookie(response, {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_version": user.token_version
            })

            return response
        else:
            raise APIError(AuthOTPError.OTP_NOT_CORRECT)