from django.contrib.auth.backends import BaseBackend
from core.exceptions import APIError, UserAccountError
from users.models import User


class CustomeLoginBackend(BaseBackend):
    def authenticate(self, request, employe_number=None, password=None, **kwargs):
        if not employe_number or not password:
            return None

        try:
            user = User.objects.get(employe_number=employe_number)
        except User.DoesNotExist:
            return None

        if not user.check_password(password):
            return None

        if not user.is_active:
            raise APIError(UserAccountError.USER_NOT_EXIST)

        return user

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
