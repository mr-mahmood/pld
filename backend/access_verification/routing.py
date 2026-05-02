from django.urls import re_path
from .consumers import AccessEventConsumer

websocket_urlpatterns = [
    re_path(r'^ws/access-events/(?P<gate_id>\d+)/$', AccessEventConsumer.as_asgi()), # type: ignore
]