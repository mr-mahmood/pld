from django.urls import path
from authentication.views import LoginAPIView, RefreshAPIView, LogoutAPIView, PasswordChangeAPIView, RequestOTPApiView, VerifyOTPApiView

app_name = 'authentication'

urlpatterns = [
    path("login/", LoginAPIView.as_view(), name="login"),
    path("logout/", LogoutAPIView.as_view(), name="logout"),
    path("refresh/", RefreshAPIView.as_view(), name="refresh"),
    path("password/change/", PasswordChangeAPIView.as_view(), name="password_change"),
    path('request-otp/', RequestOTPApiView.as_view(), name='request_otp'),
    path('verify-otp/', VerifyOTPApiView.as_view(), name='verify_otp'),
]
