from django.contrib import admin
from areas.models import Area
from areas.forms import AreaCreationForm, AreaChangeForm

@admin.register(Area)
class CustomAreaaAdmin(admin.ModelAdmin):
    form = AreaChangeForm
    add_from = AreaCreationForm
    model = Area

    list_display = ("id", "name", "is_active", )
    list_filter = ("is_active",)

    search_fields = ("name", "locations")
    ordering = ("id",)