from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from core.exceptions import APIError, AuthPasswordError, AuthLoginError
from rest_framework import serializers
from users.models import User
from django.contrib.auth import authenticate
from typing import cast, Dict, Any

class PasswordChangeSerializer(serializers.Serializer):
    new_password = serializers.CharField(write_only=True)
    new_password2 = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = self.context["request"].user

        if attrs["new_password"] != attrs["new_password2"]:
            raise APIError(AuthPasswordError.TWO_PASSWORD_NOT_MATCH)

        validate_password(attrs["new_password"])
        return attrs

    def save(self, **kwargs):
        user: User = self.context["request"].user
        
        if user.must_change_password:
            user.must_change_password = False
            
        validated_data = cast(Dict[str, Any], self.validated_data)
        new_password = validated_data["new_password"]
        
        user.set_password(new_password)
        user.save(update_fields=["password", "must_change_password"])
        return user

  
class LoginSerializer(serializers.Serializer):
    employe_number = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        employe_number = attrs.get("employe_number")
        password = attrs.get("password")
        user = authenticate(employe_number=employe_number, password=password)

        if not user:
            raise APIError(AuthLoginError.INVALID_LOGIN_CREDENTIAL)
        
        return {"user": user} 