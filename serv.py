import asyncio
import json
import random
import time
from datetime import datetime
import socket
from aiohttp import web

# --- Obtenir l'adresse IP locale ---
def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.settimeout(0)
    try:
        s.connect(('8.8.8.8', 1))
        IP = s.getsockname()[0]
    except:
        IP = '127.0.0.1'
    s.close()
    return IP

# --- Dictionnaire pour stocker les sessions clients ---
clients = {}
client_counter = 1

# --- Route HTTP pour servir index.html ---
async def index(request):
    print(request)
    return web.FileResponse('index.html')

# --- Route WebSocket ---
async def websocket_handler(request):
    global client_counter
    ws = web.WebSocketResponse(heartbeat=20)  # Ping/pong toutes les 20 sec
    await ws.prepare(request)

    # Attribuer un clientId unique
    client_id = client_counter
    client_counter += 1

    clients[client_id] = {
        "websocket": ws,
        "session_active": False,
        "battery": random.randint(50, 100),
        "exposure": 0,
        "interval": 0,
        "count": 0,
        "start_time": None
    }

    print(f"Client {client_id} connecté")

    # Envoyer l'ID client et le niveau de batterie
    await ws.send_json({
        "type": "batteryStatus",
        "battery": clients[client_id]["battery"],
        "clientId": client_id
    })

    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                data = json.loads(msg.data)
                print(data)
                # Démarrage session
                if data["type"] == "startSession" and not clients[client_id]["session_active"]:
                    clients[client_id]["exposure"] = data["exposure"]
                    clients[client_id]["interval"] = data["interval"]
                    clients[client_id]["count"] = data["count"]
                    clients[client_id]["session_active"] = True
                    clients[client_id]["start_time"] = time.time()

                    total_time = (clients[client_id]["exposure"] + clients[client_id]["interval"]) * clients[client_id]["count"] - clients[client_id]["interval"]
                    estimated_end_time = datetime.fromtimestamp(clients[client_id]["start_time"] + total_time)

                    # Informer le client que la session démarre
                    await ws.send_json({
                        "type": "sessionStatus",
                        "status": "en cours",
                        "clientId": client_id
                    })

                    # Envoyer durée estimée à tous les clients
                    for c in clients.values():
                        await c["websocket"].send_json({
                            "type": "estimatedTime",
                            "estimatedTime": total_time,
                            "endTime": estimated_end_time.strftime("%H:%M:%S"),
                            "clientId": client_id
                        })

                    # Attendre la fin de session
                    await asyncio.sleep(total_time)

                    # Session terminée
                    clients[client_id]["session_active"] = False

                    await ws.send_json({
                        "type": "sessionStatus",
                        "status": "terminé",
                        "clientId": client_id
                    })

                    for c in clients.values():
                        await c["websocket"].send_json({
                            "type": "sessionStatus",
                            "status": "terminé",
                            "clientId": client_id
                        })

                # Requête niveau batterie
                elif data["type"] == "getBatteryStatus":
                    await ws.send_json({
                        "type": "batteryStatus",
                        "battery": clients[client_id]["battery"],
                        "clientId": client_id
                    })

            elif msg.type == web.WSMsgType.ERROR:
                print(f"Erreur WS pour client {client_id}: {ws.exception()}")

    except Exception as e:
        print(f"Exception client {client_id}: {e}")

    # Déconnexion
    del clients[client_id]
    print(f"Client {client_id} déconnecté")
    return ws

# --- Application aiohttp ---
app = web.Application()
app.router.add_get('/', index)          # Route HTTP
app.router.add_get('/ws', websocket_handler)  # Route WebSocket

if __name__ == '__main__':
    ip = get_ip()
    port = 55000
    print(f"Serveur aiohttp démarré sur http://{ip}:{port}")
    print(f"WebSocket disponible sur ws://{ip}:{port}/ws")
    web.run_app(app, host=ip, port=port)
