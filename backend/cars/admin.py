from django.contrib import admin
from cars.models import Car
from cars.forms import CarCreationForm, CarChangeForm

@admin.register(Car)
class CustomCarAdmin(admin.ModelAdmin):
    form = CarChangeForm
    add_form = CarCreationForm
    model = Car

    list_display = ("id", "plate", "model", "color", "owner__employe_number", "image")
    list_filter = ("model", "color", "owner__employe_number")
    ordering = ("id",)
