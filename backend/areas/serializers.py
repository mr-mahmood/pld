from rest_framework import serializers
from areas.models import Area
from areas.validators import validate_area_name
from gates.serializers import GateSerializer
from gates.models import Gate
    
class AreaSerializer(serializers.ModelSerializer):
    name = serializers.CharField()
    gates = serializers.SerializerMethodField() 
    
    class Meta:
        model = Area
        fields = ["id", "name", "is_active", "gates"]
        read_only_fields = ["gates"]

    def validate_name(self, value):
        area = self.instance
        return validate_area_name(value, instance=area)
    
    def get_gates(self, area):
        try:
            gates = Gate.objects.prefetch_related("area").filter(area=area)
            return GateSerializer(gates, many=True).data
        except Gate.DoesNotExist:
            return []
