import re
from cars.models import Car
from django.core.exceptions import ValidationError
from core.exceptions import APIError, PlateError, CarsError

# instance=None → create
# instance=<Car or Owner> → update ( so we exclude the user it self from qs)

def raise_error(error_class, error_type, admin_panel):
    if admin_panel:
        raise ValidationError(error_type[1])
    else:
        raise error_class(error_type) # custome errors for core.exceptions


def validate_plate_number(plate:str, instance=None, admin_panel=False):
    qs = Car.objects.filter(plate=plate)
    if instance:
        qs = qs.exclude(pk=instance.pk)
    if qs.exists():
        raise_error(APIError, CarsError.CAR_EXIST, admin_panel)
    for idx, value in enumerate(plate.split("-")):
        if idx in [0, 1, 3, 4, 5, 6, 7] and int(value) >= 10:
            raise_error(APIError, PlateError.INVALID_PLATE_FORMAT, admin_panel)
        elif idx == 2 and (int(value) < 10 or int(value) > 31):
            raise_error(APIError, PlateError.INVALID_PLATE_FORMAT, admin_panel)
        elif idx == 0 and int(value) == 0 or idx == 3 and int(value) == 0 or idx == 6 and int(value) == 0:
            raise_error(APIError, PlateError.INVALID_PLATE_FORMAT, admin_panel)
                
    return plate