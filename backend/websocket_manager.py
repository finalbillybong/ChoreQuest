import json
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            self.active_connections[user_id] = [
                ws for ws in self.active_connections[user_id] if ws != websocket
            ]
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

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

    async def broadcast(self, message: dict, exclude_user: int | None = None):
        for user_id in list(self.active_connections.keys()):
            if user_id != exclude_user:
                await self.send_to_user(user_id, message)

    async def send_to_parents(self, message: dict, parent_ids: list[int]):
        for pid in parent_ids:
            await self.send_to_user(pid, message)


ws_manager = WebSocketManager()
