from django.urls import path
from cars.views import CarAPIView, CarEnrollAPIView

app_name = 'cars'

urlpatterns = [
    path("", CarAPIView.as_view(), name="all_cars"),
    path("<int:pk>/", CarAPIView.as_view(), name="single_car"),
    path("new/<int:user_id>/", CarEnrollAPIView.as_view(), name="add_new_car"),
]