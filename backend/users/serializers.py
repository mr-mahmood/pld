from rest_framework import serializers
from users.models import User
from cars.models import Car
from cars.serializers import CarSerializer
from users.validators import validate_phone_number, validate_national_id, validate_employe_number
from user_permisions.models import AccessPolicy
from core.exceptions import APIError, UserRoleError
from areas.serializers import AreaSerializer

     
class UserProfileSerializer(serializers.ModelSerializer):
    # ---- Core profile fields ----
    employe_number = serializers.CharField()
    phone_number = serializers.CharField()
    national_id = serializers.CharField()

    first_name = serializers.CharField()
    last_name = serializers.CharField()
    role = serializers.CharField()
    
    profile_image = serializers.ImageField(required=False, allow_null=True) 

    areas = serializers.SerializerMethodField() 
    cars = serializers.SerializerMethodField() 
    
    class Meta:
        model = User
        fields = [
            "id", "first_name", "last_name", "employe_number",
            "national_id", "phone_number", "role", "is_active",
            "areas", "cars", "profile_image", "must_change_password",
        ]
        read_only_fields = ["id", "areas", "cars"]
    
    # ==============================================================
    # Validation: enforce role-based actions
    # ==============================================================
    def validate(self, attrs):
        request = self.context["request"]
        acting_user: User = request.user
        acting_role = acting_user.role
        user_being_edited = self.instance
        is_create = user_being_edited is None
        is_update_self = not is_create and acting_user.id == user_being_edited.id
        new_role = attrs.get("role") # Role being proposed in the data

        # Define allowed roles that can be CREATED by each acting_role.
        # Key: acting_role, Value: set of roles the acting_role can be create or edit.
        creatable_editable_roles_by_role = {
            User.Role.MANAGER: {User.Role.ADMIN, User.Role.EMPLOYE}, # Manager can create Admins and Employees
            User.Role.SUPER: {User.Role.MANAGER, User.Role.ADMIN, User.Role.EMPLOYE}, # Super can create Managers, Admins, Employees
        }
        
        # --- CREATE MODE VALIDATION ---
        if is_create:
            # Get the set of roles the acting_user is allowed to create
            allowed_to_create = creatable_editable_roles_by_role.get(acting_role, set())

            # If the new_role is not in the set of allowed roles for creation, raise an error.
            # Also covers the case where acting_role is not in the dict (e.g., if it was an unexpected role).
            if new_role not in allowed_to_create and not acting_user.is_superuser:
                raise APIError(UserRoleError.USER_CREATE_NOT_ALLOW)

        # --- UPDATE MODE VALIDATION ---
        else:
            
            # --- UPDATE ITS OWN IFNO ---
            if is_update_self:
                # --- CORE RULE: No one can change their own role ---
                # If a new role is provided and it's different from current
                if new_role and new_role != acting_role:
                    raise APIError(UserRoleError.NOT_ALLOW_CHANGE_ROLE)
                
            # --- UPDATE OTHER USER IFNO ---
            else:
                if new_role and new_role not in creatable_editable_roles_by_role.get(acting_role, set()) and not acting_user.is_superuser:
                    raise APIError(UserRoleError.USER_CREATE_NOT_ALLOW)

        # If all checks pass, return the data
        return attrs

    def validate_employe_number(self, value):
        return validate_employe_number(value, instance=self.instance)

    def validate_national_id(self, value):
        return validate_national_id(value, instance=self.instance)

    def validate_phone_number(self, value):
        return validate_phone_number(value, instance=self.instance)

    def validate_role(self, value):
        if value not in User.Role.values:
            raise APIError(UserRoleError.INVALID_ROLE)
        return value

    # ==============================================================
    # create logic
    # ==============================================================
    def create(self, validated_data):

        validated_data.pop("password", None)
        validated_data.pop("password2", None)

        return User.objects.create_user(
            **validated_data
        )

    # ==============================================================
    # Update logic
    # ==============================================================
    def update(self, instance: User, validated_data):

        # Handle profile_image separately if needed, though ModelSerializer.update often does this
        profile_image_file = validated_data.pop("profile_image", None)
        if profile_image_file is not None:
            instance.profile_image = profile_image_file

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance

    def get_areas(self, user):
        try:
            policy = AccessPolicy.objects.prefetch_related("areas").get(user=user)
            areas = policy.areas.all()

            return AreaSerializer(areas, many=True, context={"request": self.context['request']}).data
        except AccessPolicy.DoesNotExist:
            return []

    def get_cars(self, user):
        cars = Car.objects.prefetch_related("owner").filter(owner=user)
        return CarSerializer(cars, many=True, context={"request": self.context['request']}).data
