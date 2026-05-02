from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from users.models import User
from users.forms import UserCreationForm, UserChangeForm


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    model = User

    list_display = ("id", "employe_number", "national_id", "first_name", "last_name", "role", "is_active")
    list_filter = ("role", "is_superuser", "is_active")

    fieldsets = (
        ("Personal info", {"fields": ("employe_number", "first_name", "last_name", "national_id", "phone_number", "profile_image")}),
        ("Permissions", {"fields": ("role", "is_active", "is_staff", "is_superuser", "must_change_password")}),
        ("Password", {"fields": ("password",)})
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("employe_number", "first_name", "last_name", "phone_number", "national_id", "role", "is_active", "is_staff", "is_superuser", "profile_image", "password1", "password2"),
        }),
    )

    search_fields = ("employe_number", "national_id", "phone_number", "first_name", "last_name")
    ordering = ("national_id",)