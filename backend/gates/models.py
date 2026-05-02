from django.db import models
from areas.models import Area
from core.exceptions import APIError, GateError
from django.db.models import QuerySet

class Gate(models.Model):
    id:int
    
    class Role(models.TextChoices):
        ENTERY = "ENTERY", "Entery"
        EXIT = "EXIT", "Exit"
        SURVEILLANCE = "SURVEILLANCE", "Surveillance"

    name = models.CharField(max_length=100)
    camera = models.CharField(max_length=350)
    area = models.ForeignKey(Area, on_delete=models.PROTECT, related_name="gates")
    role = models.CharField(max_length=100, choices=Role.choices)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'gate'
        unique_together = ("name", "area")  # avoid duplicate gate names per area

    def __str__(self):
        return f"{self.name}({self.role})"

    @classmethod
    def get_all_gate(cls) -> QuerySet['Gate']:
        """
        Retrieves all active gate.
        Returns: Gate instance query
        """
        return cls.objects.all()

    @classmethod
    def get_gate(cls, gate_id:int) -> 'Gate':
        """
        Retrieves an active gate.
        Raises: CustomeAccessControlError if not found or inactive.
        Returns: Gate instance
        """
        try:
            return cls.objects.get(id=gate_id)
        except cls.DoesNotExist:
            raise APIError(GateError.GATE_NOT_EXIST)