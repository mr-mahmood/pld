from django.db import models
from users.models import User 
from core.exceptions import APIError, CarsError
from django.db.models import QuerySet
import os


def user_cars_path(instance, filename):
    ext = filename.split('.')[-1]  # keep original extension
    new_filename = f"{instance.plate}.{ext}"
    return f"cars/{instance.owner.id}/{new_filename}"


class Car(models.Model):
    id:int
    plate = models.CharField(max_length=16, unique=True) # "1-9-12-3-6-5-2-2"
    model = models.CharField(max_length=300)
    color = models.CharField(max_length=300)
    image = models.ImageField(upload_to=user_cars_path, blank=True, null=True)
    
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="cars"
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'car'
            
    def __str__(self):
        return self.plate


    def save(self, *args, **kwargs):
        # Generate image for new cars (no pk) or when plate changes
        is_new = not self.pk
        plate_changed = False
        old_image_path = None
        
        if self.pk:
            # Check if plate has changed and get old image path
            try:
                original = Car.objects.get(pk=self.pk)
                if original.plate != self.plate:
                    plate_changed = True
                    old_image_path = original.image.path if original.image else None # type: ignore
            except Car.DoesNotExist:
                pass
        
        # Generate image if it's a new car or plate changed
        if (is_new or plate_changed) and self.plate:
            from cars.image_generator import generate_plate_image
            image_content = generate_plate_image(self.plate)
            
            if image_content:
                # Delete old image before setting new one
                if old_image_path and self._delete_image_file(old_image_path):
                    print(f"Deleted old plate image: {old_image_path}")
                
                self.image = image_content
            else:
                raise APIError(CarsError.CAR_MAKE_ERROR)
        
        super().save(*args, **kwargs)

    def _delete_image_file(self, image_path):
        """Delete the image file from storage"""
        import os
        try:
            if image_path and os.path.exists(image_path):
                os.remove(image_path)
                return True
        except Exception as e:
            print(f"Error deleting image file {image_path}: {e}")
        return False
            
            
    @classmethod
    def get_all_cars(cls, current_user:'User') -> QuerySet['Car'] | None:
        """
        Retrieves all cars.
        Returns: Cars instance query
        """
        if current_user.role == User.Role.SUPER:
            return cls.objects.all()
        elif current_user.role == User.Role.MANAGER:
            return cls.objects.filter(
                models.Q(owner__id=current_user.id) |
                ~models.Q(owner__role__in=[User.Role.MANAGER, User.Role.SUPER])
            )

    @classmethod
    def get_car(cls, car_id:int, current_user:'User') -> 'Car':
        """
        Retrieves an car.
        Raises: CustomeAccessControlError if not found.
        Returns: Car instance
        """
        try:
            car = cls.objects.get(id=car_id)
            owner: User = car.owner
            condition_1 = current_user.role == User.Role.MANAGER and owner.role == User.Role.SUPER
            condition_2 = current_user.role == User.Role.MANAGER and owner.role == User.Role.MANAGER and current_user.id != owner.id
            if condition_1 or condition_2:
                raise APIError(CarsError.CAR_NOT_EXIST)
            else:
                return car
        except cls.DoesNotExist:
            raise APIError(CarsError.CAR_NOT_EXIST)

    @classmethod
    def get_car_by_plate(cls, car_plate:str, current_user:'User') -> 'Car':
        """
        Retrieves an car.
        Raises: CustomeAccessControlError if not found.
        Returns: Car instance
        """
        try:
            car = cls.objects.get(plate=car_plate)
            owner: User = car.owner
            condition_1 = current_user.role == User.Role.MANAGER and owner.role == User.Role.SUPER
            condition_2 = current_user.role == User.Role.MANAGER and owner.role == User.Role.MANAGER and current_user.id != owner.id
            if condition_1 or condition_2:
                raise APIError(CarsError.CAR_NOT_EXIST)
            else:
                return car
        except cls.DoesNotExist:
            raise APIError(CarsError.CAR_NOT_EXIST)

    @classmethod
    def get_car_by_plate_for_backend(cls, car_plate:str) -> 'Car':
        """
        Retrieves an car.
        Raises: CustomeAccessControlError if not found.
        Returns: Car instance
        """
        try:
            return cls.objects.get(plate=car_plate)
        except cls.DoesNotExist:
            raise APIError(CarsError.CAR_NOT_EXIST)

    @classmethod
    def get_car_by_owner(cls, owner:'User', current_user:'User') -> QuerySet['Car'] | None:
        """
        Retrieves all cars of a user.
        Raises: CustomeAccessControlError if not found.
        Returns: Car instance
        """
        try:
            cars = cls.objects.filter(owner=owner)
            condition_1 = current_user.role == User.Role.MANAGER and owner.role == User.Role.SUPER
            condition_2 = current_user.role == User.Role.MANAGER and owner.role == User.Role.MANAGER and current_user.id != owner.id
            if condition_1 or condition_2:
                raise APIError(CarsError.CAR_NOT_EXIST)
            else:
                return cars
        except cls.DoesNotExist:
            return None
