from django.contrib import admin
from user_permisions.models import AccessPolicy

# Register your models here.
@admin.register(AccessPolicy)
class CustomAccessPolicyAdmin(admin.ModelAdmin):
    model = AccessPolicy

    list_display = ("id", "user",)
    search_fields = ("user__first_name", "user__last_name", "user__employe_number")
    ordering = ("id",)