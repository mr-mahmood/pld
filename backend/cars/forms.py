from django import forms
from cars.models import Car
from cars.validators import validate_plate_number


class CarCreationForm(forms.ModelForm):
    class Meta:
        model = Car
        fields = (
            "plate",
            "model",
            "color",
            "owner",  
            "image" 
        )

    def clean_plate(self):
        plate = self.cleaned_data.get("plate")
        return validate_plate_number(str(plate), admin_panel=True)

    def save(self, commit=True):
        car = super().save(commit=False)
        if commit:
            car.save()
        return car


class CarChangeForm(forms.ModelForm):
    class Meta:
        model = Car
        fields = (
            "plate",
            "model",
            "color",
            "owner",
            "is_active",   
            "image"
        )
        
    def clean_plate(self):
        car = self.instance
        plate = self.cleaned_data.get("plate")
        return validate_plate_number(str(plate), instance=car, admin_panel=True)