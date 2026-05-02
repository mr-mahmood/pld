from django.urls import path
from users.views import UserAPIView, DashboardAPIView

app_name = 'users'

urlpatterns = [
    path("", UserAPIView.as_view(), name="all_users"),
    path("<int:pk>/", UserAPIView.as_view(), name="single_user"),
    path("dashboard/", DashboardAPIView.as_view(), name="dashboard"),
]
