from django.db import models
from core.exceptions import APIError, AreaError
from django.db.models import QuerySet

class Area(models.Model):
    id:int
    name = models.CharField(max_length=300, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'area'
        
    def __str__(self):
        return f"{self.name}"

    @classmethod
    def get_all_area_for_manager(cls) ->  QuerySet['Area']:
        return cls.objects.filter(is_active=True)
    
    @classmethod
    def get_all_area_for_super(cls) ->  QuerySet['Area']:
        return cls.objects.all()

    @classmethod
    def get_area(cls, area_id:int) -> 'Area':
        try:
            return cls.objects.get(id=area_id)
        except cls.DoesNotExist:
            raise APIError(AreaError.AREA_NOT_EXIST)