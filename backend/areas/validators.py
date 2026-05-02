from areas.models import Area
from core.exceptions import APIError, AreaError
from django.core.exceptions import ValidationError

# instance=None → create
# instance=<Area> → update ( so we exclude the user it self from qs)

def raise_error(error_class, error_type, admin_panel):
    if admin_panel:
        raise ValidationError(error_type[1])
    else:
        raise error_class(error_type) # custome errors for core.exceptions
    
    
def validate_area_name(value, instance=None, admin_panel=False):
    qs = Area.objects.filter(name=value)
    if instance:
        qs = qs.exclude(pk=instance.pk)
    if qs.exists():
        raise_error(APIError, AreaError.AREA_EXIST, admin_panel)
    return value