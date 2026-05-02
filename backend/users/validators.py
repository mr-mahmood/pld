import re
from core.exceptions import APIError, UserValidationError, UserDuplicateError
from django.core.exceptions import ValidationError
from users.models import User

# instance=None → create
# instance=<User> → update ( so we exclude the user it self from qs)

def raise_error(error_class, error_type, admin_panel):
    if admin_panel:
        raise ValidationError(error_type[1])
    else:
        raise error_class(error_type) # custome errors for core.exceptions


def validate_phone_number(value, instance=None, admin_panel=False):
    if not value:
        return value
    
    qs = User.objects.filter(phone_number=value)
    
    if instance is not None:
        qs = qs.exclude(pk=instance.pk)
        
    if qs.exists():
        raise_error(APIError, UserDuplicateError.PHONE_NUMBER_REUSE, admin_panel)
        
    if not re.fullmatch(r"09\d{9}", value):
        raise_error(APIError, UserValidationError.INVALID_PHONE_NUMBER, admin_panel)
        
    return value


def validate_national_id(value, instance=None, admin_panel=False):
    if not value:
        return value
    
    qs = User.objects.filter(national_id=value)
    
    if instance is not None:
        qs = qs.exclude(pk=instance.pk)
        
    if qs.exists():
        raise_error(APIError, UserDuplicateError.NATIONAL_ID_REUSE, admin_panel)
        
    if not re.fullmatch(r"\d{10}", value):
        raise_error(APIError, UserValidationError.INVALID_NATIONAL_ID, admin_panel)
        
    return value


def validate_employe_number(value, instance=None, admin_panel=False):
    qs = User.objects.filter(employe_number=value)
    
    if instance is not None:
        qs = qs.exclude(pk=instance.pk)
        
    if qs.exists():
        raise_error(APIError, UserDuplicateError.EMPLOYE_NUMBER_REUSE, admin_panel)

    return value
