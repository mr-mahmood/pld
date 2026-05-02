from django import forms
from django.forms import ValidationError
from areas.models import Area
from gates.models import Gate
from gates.validators import validate_gate_name
from typing import Optional

class GateCreationForm(forms.ModelForm):
    class Meta:
        model = Gate
        fields = (
            "area",
            "name",
            "camera",
            "role",
            "is_active",
        )
    
    def clean_area(self):
        self.area = self.cleaned_data["area"]
        if self.area is None:
            raise ValidationError("Area is required")
        
        return self.area
        
    def clean_name(self):
        name = self.cleaned_data.get("name")
        return validate_gate_name(name, self.area, admin_panel=True)

    def save(self, commit=True):
        gate = super().save(commit=False)
        if commit:
            gate.save()
        return gate


class GateChangeForm(forms.ModelForm):
    area: Area
    class Meta:
        model = Gate
        fields = (
            "area",
            "name",
            "camera",
            "role",
            "is_active",
        )

    def clean_area(self):
        self.area = self.cleaned_data["area"]
        if self.area is None:
            raise ValidationError("Area is required")
        
        return self.area

    def clean_name(self):
        name = self.cleaned_data.get("name")
        gate = self.instance
        return validate_gate_name(name, self.area, instance=gate, admin_panel=True)