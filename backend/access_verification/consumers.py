import json
from channels.generic.websocket import AsyncWebsocketConsumer
from users.models import User
from gates.models import Gate
from user_permisions.models import AccessPolicy
from typing import cast
from asgiref.sync import sync_to_async

class AccessEventConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = cast(User, self.scope.get("user"))

        # Check 1: Authentication
        if not user or not user.is_authenticated:
            await self.accept()
            await self.close(code=4000)
            return

        # Check 2: Gate ID exists in URL
        self.gate_id = self.scope.get("url_route", {}).get("kwargs", {}).get("gate_id")
        if not self.gate_id:
            await self.close(code=4001)
            return

        # Check 3: Gate exists and is active
        gate = await self.get_gate(int(self.gate_id))
        if not gate or not gate.is_active:
            await self.accept()
            await self.close(code=4002)
            return

        # Check 4: User has access to gate's area
        has_access = await self.check_access(user.id, gate.area.id)
        if not has_access:
            await self.accept()
            await self.close(code=4003)
            return

        # All checks passed - connect
        self.group_name = f"gate_{self.gate_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        pass

    async def access_event(self, event):
        await self.send(text_data=json.dumps(event["data"]))

    @sync_to_async
    def get_gate(self, gate_id: int):
        try:
            return Gate.objects.select_related('area').get(id=gate_id)
        except Gate.DoesNotExist:
            return None

    @sync_to_async
    def check_access(self, user_id: int, area_id: int) -> bool:
        return AccessPolicy.has_access(user_id, area_id)