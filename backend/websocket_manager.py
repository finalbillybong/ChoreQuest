import json
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}
        self.user_families: dict[int, int] = {}

    async def connect(self, websocket: WebSocket, user_id: int, family_id: int | None = None):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        if family_id is not None:
            self.user_families[user_id] = family_id

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            self.active_connections[user_id] = [
                ws for ws in self.active_connections[user_id] if ws != websocket
            ]
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                self.user_families.pop(user_id, None)

    async def send_to_user(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            data = json.dumps(message)
            dead = []
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_text(data)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.active_connections[user_id].remove(ws)

    async def broadcast(self, message: dict, exclude_user: int | None = None, family_id: int | None = None):
        for user_id in list(self.active_connections.keys()):
            if user_id == exclude_user:
                continue
            if family_id is not None and self.user_families.get(user_id) != family_id:
                continue
            await self.send_to_user(user_id, message)

    async def send_to_parents(self, message: dict, parent_ids: list[int]):
        for pid in parent_ids:
            await self.send_to_user(pid, message)


ws_manager = WebSocketManager()
