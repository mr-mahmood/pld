from rest_framework import serializers
from access_verification.models import AccessHistory
from gates.models import Gate
from areas.models import Area
from users.models import User
from cars.models import Car
from users.serializers import UserProfileSerializer
from core.exceptions import APIError, PlateError
from gates.serializers import GateSerializer
from areas.serializers import AreaSerializer
from core.exceptions import APIError, PlateError

class AccessCheckSerializer(serializers.Serializer):
    gate = serializers.IntegerField()
    plate = serializers.CharField()
    image = serializers.ImageField()
    confidence = serializers.FloatField()
    
    class Meta:
        fields = ["plate", "gate", "image", "confidence"]
         
    def validate_plate(self, value:str):
        for idx, t in enumerate(value.split("-")):
            if idx in [0, 1, 3, 4, 5, 6, 7] and int(t) >= 10:
                raise APIError(PlateError.INVALID_PLATE_FORMAT)
            elif idx == 2 and (int(t) < 10 or int(t) > 31):
                raise APIError(PlateError.INVALID_PLATE_FORMAT)
            elif idx == 0 and int(t) == 0 or idx == 3 and int(t) == 0 or idx == 6 and int(t) == 0:
                raise APIError(PlateError.INVALID_PLATE_FORMAT)
                    
        return value
    
    def validate_image(self, value):
        if not value or value.size == 0:
            raise APIError(PlateError.INVALID_IMAGE)
        return value
    
    def validate_gate(self, value):
        Gate.get_gate(value)
        return value



class AccessHistorySerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    gate = GateSerializer(read_only=True)
    area = AreaSerializer(read_only=True)
    image = serializers.ImageField()
    
    class Meta:
        model = AccessHistory
        fields = [
            "id",
            "user",
            "gate",
            "area",
            "status",
            "reason",
            "image",
            "confidence",
            "timestamp"
        ]
        read_only_fields = [
            "id",
            "user",
            "gate",
            "area",
            "status",
            "reason",
            "image",
            "confidence",
            "timestamp"
        ]
        

# Lightweight serializers with explicit field definitions
class AccessCheckUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'employe_number', 'role']
        # Explicitly set these as the only fields
        extra_kwargs = {
            'id': {'read_only': True},
            'first_name': {'read_only': True},
            'last_name': {'read_only': True},
            'employe_number': {'read_only': True},
            'role': {'read_only': True}
        }


class AccessCheckGateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gate
        fields = ['id', 'name', 'role']
        extra_kwargs = {
            'id': {'read_only': True},
            'name': {'read_only': True},
            'role': {'read_only': True}
        }


class AccessCheckAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = ['id', 'name']
        extra_kwargs = {
            'id': {'read_only': True},
            'name': {'read_only': True}
        }


class AccessCheckCarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Car
        fields = ['id', 'model', 'color']
        extra_kwargs = {
            'id': {'read_only': True},
            'model': {'read_only': True},
            'color': {'read_only': True}
        }


class LightAccessHistorySerializer(serializers.ModelSerializer):
    """Lightweight serializer specifically for access check response"""
    user = AccessCheckUserSerializer(read_only=True)
    gate = AccessCheckGateSerializer(read_only=True)
    area = AccessCheckAreaSerializer(read_only=True)
    car = AccessCheckCarSerializer(read_only=True)
    original_image = serializers.ImageField()
    generated_image = serializers.ImageField()
    
    class Meta:
        model = AccessHistory
        fields = [
            "id",
            "user",
            "gate",
            "area",
            "car",
            "status",
            "original_image",
            "generated_image",
            "confidence",
            "timestamp"
        ]