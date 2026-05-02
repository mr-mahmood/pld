from django import forms
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from users.models import User
from users.validators import validate_phone_number, validate_national_id, validate_employe_number

class UserCreationForm(forms.ModelForm):
    password1 = forms.CharField(
        label="Password",
        widget=forms.PasswordInput,
        required=False
    )
    password2 = forms.CharField(
        label="Confirm password",
        widget=forms.PasswordInput,
        required=False
    )

    class Meta:
        model = User
        fields = (
            "employe_number",
            "first_name",
            "last_name",
            "phone_number",
            "national_id",
            "role",
        )

    def clean(self):
        cleaned_data = super().clean()
        if not cleaned_data:
            raise ValidationError("Password is required.")
            
        password1 = cleaned_data.get("password1")
        password2 = cleaned_data.get("password2")
        
        if not password1 or not password2:
            raise ValidationError("Password is required.")
        if password1 != password2:
            raise ValidationError("Passwords do not match.")
        try:
            validate_password(password1, self.instance)
        except ValidationError as e:
            raise ValidationError(e.messages)
        return cleaned_data

    def clean_employe_number(self):
        employe_number = self.cleaned_data.get("employe_number")
        return validate_employe_number(employe_number, admin_panel=True)

    def clean_phone_number(self):
        phone = self.cleaned_data.get("phone_number")
        return validate_phone_number(phone, admin_panel=True)

    def clean_national_id(self):
        nid = self.cleaned_data.get("national_id")
        return validate_national_id(nid, admin_panel=True)

    def clean_role(self):
        role = self.cleaned_data.get("role")
        if not role:
            role = User.Role.ADMIN
        return role

    def save(self, commit=True):
        user = super().save(commit=False)
        password1 = self.cleaned_data.get("password1")
        user.set_password(password1)
        if commit:
            user.save()
        return user


class UserChangeForm(forms.ModelForm):
    password = ReadOnlyPasswordHashField()

    class Meta:
        model = User
        fields = (
            "id",
            "employe_number",
            "first_name",
            "last_name",
            "phone_number",
            "national_id",
            "role",
        )

    def clean_employe_number(self):
        user = self.instance
        employe_number = self.cleaned_data.get("employe_number")
        return validate_employe_number(employe_number, instance=user, admin_panel=True)
    
    def clean_phone_number(self):
        user = self.instance
        phone = self.cleaned_data.get("phone_number")
        return validate_phone_number(phone, instance=user, admin_panel=True)
    
    def clean_national_id(self):
        user = self.instance
        nid = self.cleaned_data.get("national_id")
        return validate_national_id(nid, instance=user, admin_panel=True)
