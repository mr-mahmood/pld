from django import forms
from areas.models import Area
from areas.validators import validate_area_name


class AreaCreationForm(forms.ModelForm):
    class Meta:
        model = Area
        fields = (
            "name",
            "is_active",
        )

    def clean_name(self):
        name = self.cleaned_data.get("name")
        return validate_area_name(name, admin_panel=True)

    def save(self, commit=True):
        area = super().save(commit=False)
        if commit:
            area.save()
        return area


class AreaChangeForm(forms.ModelForm):
    class Meta:
        model = Area
        fields = (
            "name",
            "is_active",
        )
        
    def clean_name(self):
        name = self.cleaned_data.get("name")
        area = self.instance
        return validate_area_name(name, instance=area, admin_panel=True)