from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from core.bot_sender import send_to_bale
from core.exceptions import APIError, UserAccountError
from django.db.models import QuerySet
import secrets

def generate_secure_password(length=12):
    # Define a set of characters that avoids easily confused ones
    # Removed: o, O, 0, i, I, 1, l, B, 8, G, 6, S, 5, Z, 2
    # Added: fewer ambiguous characters, more distinct ones
    # Example: Using a reduced set of letters and digits, and specific symbols
    
    # More distinct letters: a, b, c, d, e, f, g, h, j, k, m, n, p, q, r, s, t, u, v, w, x, y, z
    # More distinct digits: 2, 3, 4, 5, 6, 7, 9 (excluding 0 and 1)
    # Symbols that are generally distinct: @, #, $, %, &, =, +
    
    # Let's build a safe alphabet:
    safe_letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ" # Excluded: i, I, l, o, O, S, Z
    safe_digits = "23456789" # Excluded: 0, 1
    safe_symbols = "@#$%&" # Excluded: =, +

    alphabet = safe_letters + safe_digits + safe_symbols
        
    return ''.join(secrets.choice(alphabet) for _ in range(length))


class UserManager(BaseUserManager):

    def _create_user(self, employe_number, password=None, **extra_fields) -> 'User':

        if not employe_number:
            raise ValueError("Employe number is required")

        # If no password provided (API request), generate temp password
        if password is None:
            password = generate_secure_password()
            extra_fields.setdefault("must_change_password", True)
            send_to_bale(f"پسورد موقتی برای کاربر {employe_number} تولید شد\nپسورد موقتی: {password}")
        else:
            # If password is explicitly provided, user does NOT need to change it
            extra_fields.setdefault("must_change_password", False)

        user = self.model(
            employe_number=employe_number,
            **extra_fields
        )

        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_user(self, employe_number, **extra_fields) -> 'User':
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", User.Role.EMPLOYE)
        extra_fields.setdefault("must_change_password", True)

        return self._create_user(employe_number, password=None, **extra_fields)

    def create_superuser(self, employe_number, password=None, **extra_fields) -> 'User':
        # SUPERUSER SHOULD ALWAYS SET THEIR OWN PASSWORD
        if password is None:
            raise ValueError("Superuser must define a password manually.")

        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", User.Role.SUPER)
        extra_fields.setdefault("must_change_password", False)

        return self._create_user(employe_number, password=password, **extra_fields)



class User(AbstractUser):
    id:int
    
    class Role(models.TextChoices):
        SUPER = "SUPER", "Super"
        MANAGER = "MANAGER", "Manager"
        ADMIN = "ADMIN", "Admin"
        EMPLOYE = "EMPLOYE", "Employe"

    username = None  # remove username field
    email = None  # remove email field

    employe_number = models.CharField(max_length=30, unique=True, db_index=True)
    national_id = models.CharField(max_length=10, unique=True)
    phone_number = models.CharField(max_length=11, unique=True)

    profile_image = models.ImageField(
        upload_to='profile_pics/',
        null=True,
        blank=True,
        default='profile_pics/default_profile_image.png'
    )

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.ADMIN
    )

    token_version = models.IntegerField(default=1)
    must_change_password = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "employe_number"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = UserManager() # type: ignore[assignment]

    class Meta(AbstractUser.Meta):
        db_table = "user"
        ordering = ["-employe_number"]

    def __str__(self):
        return f"{self.employe_number}"
    
    @classmethod
    def get_all_user(cls, current_user: 'User') -> QuerySet['User'] | None:
        """
        Retrieves all users except those with same or higher role than current user.
        Returns: User instance query
        """
        if current_user.role == User.Role.SUPER and current_user.is_superuser:
            return cls.objects.all()
        elif current_user.role == User.Role.SUPER and not current_user.is_superuser:
            return cls.objects.filter(
                models.Q(id=current_user.id) |
                ~models.Q(role__in=[User.Role.SUPER])
            )
        elif current_user.role == User.Role.MANAGER:
            return cls.objects.filter(
                models.Q(id=current_user.id) |
                ~models.Q(role__in=[User.Role.MANAGER, User.Role.SUPER])
            )
        else:
            # For ADMIN, EMPLOYE, or other roles - return None
            return None

    @classmethod
    def get_user(cls, user_id: int, current_user: 'User') -> 'User':
        # only mangers and super have access tho this url and wee only have 1 super user
        # so manager cant get info of a super user or other managers even if try
        try:
            user = cls.objects.get(id=user_id)
            condition1 = current_user.role == User.Role.MANAGER and user.role == User.Role.SUPER # a manager try to get super user
            condition2 = current_user.role == User.Role.MANAGER and user.role == User.Role.MANAGER and current_user.id != user_id # a manager try to get other managers
            condition3 = current_user.role == User.Role.SUPER and user.role == User.Role.SUPER and current_user.id != user_id and not current_user.is_superuser
            if condition1 or condition2 or condition3:
                raise APIError(UserAccountError.USER_NOT_EXIST)
            else:
                return user
        except cls.DoesNotExist:
            raise APIError(UserAccountError.USER_NOT_EXIST)

    @classmethod
    def get_user_for_system(cls, user_id: int) -> 'User':
        try:
            return cls.objects.get(id=user_id)
        except cls.DoesNotExist:
            raise APIError(UserAccountError.USER_NOT_EXIST)

    @classmethod
    def get_user_for_backend(cls, user_id: int) -> 'User':
        try:
            return cls.objects.get(id=user_id)
        except cls.DoesNotExist:
            raise APIError(UserAccountError.USER_NOT_EXIST)

    @classmethod
    def get_user_for_otp(cls, employe_number: str) -> 'User':
        try:
            return cls.objects.get(employe_number=employe_number)
        except cls.DoesNotExist:
            raise APIError(UserAccountError.USER_NOT_EXIST)


