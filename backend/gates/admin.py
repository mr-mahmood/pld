from django.contrib import admin
from gates.models import Gate
from gates.forms import GateCreationForm, GateChangeForm


@admin.register(Gate)
class CustomGateaAdmin(admin.ModelAdmin):
    form = GateChangeForm
    add_form = GateCreationForm
    model = Gate

    list_display = ("id", "name", "area", "role", "is_active")
    list_filter = ("area", "is_active", "role")
    ordering = ("id",)