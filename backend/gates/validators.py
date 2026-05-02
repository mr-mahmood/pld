import re
from gates.models import  Gate
from core.exceptions import APIError, GateError, CameraError
from django.core.exceptions import ValidationError

# instance=None → create
# instance=<Gate> → update ( so we exclude the user it self from qs)

def raise_error(error_class, error_type, admin_panel):
    if admin_panel:
        raise ValidationError(error_type[1])
    else:
        raise error_class(error_type) # custome errors for core.exceptions
    

def validate_gate_name(name, area=None, instance=None, admin_panel=False):
    if instance:
        qs = Gate.objects.filter(name=name, area=area)
        qs = qs.exclude(pk=instance.pk)
    else:
        qs = Gate.objects.filter(name=name)
        if qs.exists():
            raise_error(APIError, GateError.GATE_EXIST, admin_panel)
    return name


def validate_camera_name(camera, instance=None, admin_panel=False):
    qs = Gate.objects.filter(camera=camera)
    if instance:
        qs = qs.exclude(pk=instance.pk)
    if qs.exists():
        raise_error(APIError, CameraError.CAMERA_EXIST, admin_panel)

    return camera