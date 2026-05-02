from django.urls import path
from areas.views import AreaAPIView

app_name = 'areas'

urlpatterns = [
    path("", AreaAPIView.as_view(), name="all_area"),
    path("<int:pk>/", AreaAPIView.as_view(), name="single_area"),
]

