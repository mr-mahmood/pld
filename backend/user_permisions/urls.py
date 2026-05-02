from django.urls import path
from user_permisions.views import AccessPolicyAPIView

app_name = 'user_permisions'

urlpatterns = [
    path("", AccessPolicyAPIView.as_view(), name="all_permisions"),
    path("<int:pk>/", AccessPolicyAPIView.as_view(), name="single_permision"),
]
