from channels.generic.websocket import AsyncWebsocketConsumer
import json

from users.models import User
from typing import cast

class AccessEventConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = cast(User, self.scope.get("user"))

        # Only allow authenticated staff user.is_authenticated
        if True:
            self.gate_id = self.scope.get("url_route", {}).get("kwargs", {}).get("gate_id")
            self.group_name = f"gate_{self.gate_id}"
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )

            await self.accept()
        else:
            await self.close()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def receive(self, text_data): # type: ignore
        # Frontend does not send anything
        pass

    async def access_event(self, event):
        await self.send(
            text_data=json.dumps(event["data"])
        )
