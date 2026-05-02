from rest_framework import serializers
from areas.models import Area
from gates.models import Gate
from gates.validators import validate_gate_name, validate_camera_name
from core.exceptions import APIError, GateError, UserRoleError


class GateSerializer(serializers.ModelSerializer):
    name = serializers.CharField()
    role = serializers.CharField()
    area = serializers.PrimaryKeyRelatedField(queryset=Area.get_all_area_for_super())

    class Meta:
        model = Gate
        fields = ["id", "name", "camera", "role", "is_active", "area"]

    def validate_name(self, value):
        gate = self.context.get('gate')
        if gate:
            area: Area = gate.area
            validate_gate_name(value, area=area.id, instance=self.instance)
        else:
            validate_gate_name(value, instance=self.instance)
        return value

    def validate_role(self, value):
        if value not in Gate.Role.values:
            raise APIError(UserRoleError.INVALID_ROLE)
        return value

    def validate_area(self, value):
        # If updating, prevent area change
        if self.instance and self.instance.area != value:
            raise APIError(GateError.GATE_AREA_NOT_ALLOW)
        return value

    def validate_camera(self, value):
        validate_camera_name(value, instance=self.instance)
        return value