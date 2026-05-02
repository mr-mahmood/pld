from django.urls import path
from gates.views import GateAPIView, CvGateAPIView

app_name = 'gates'

urlpatterns = [
    path("", GateAPIView.as_view(), name="all_gate"),
    path("<int:pk>/", GateAPIView.as_view(), name="single_gate"),
    path("vision/", CvGateAPIView.as_view(), name="cv_gate"),
]