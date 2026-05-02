from rest_framework import serializers
from users.models import User
from user_permisions.models import AccessPolicy, Area
from core.exceptions import APIError, AreaError


class AccessPolicySerializer(serializers.ModelSerializer):
    areas = serializers.PrimaryKeyRelatedField(queryset=Area.get_all_area_for_super(), many=True)
    
    class Meta:
        model = AccessPolicy
        fields = ["areas"]

    def validate_areas(self, areas):
        if not areas:
            raise APIError(AreaError.AREA_CANT_BE_EMPTY)
        return areas

    def create(self, validated_data):
        target_user: User = self.context['target_user']
        policy = AccessPolicy.objects.create(user=target_user)
        areas = validated_data.pop('areas', [])
        policy.areas.set(areas)
        return policy

    def update(self, instance:AccessPolicy, validated_data):
        areas = validated_data.get("areas", instance.areas.all())
        instance.areas.set(areas)
        return instance