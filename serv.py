import asyncio
import websockets
import json
import random
import time
from datetime import datetime
import socket

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.settimeout(0)
    try:
        s.connect(('8.8.8.8',1))
        IP = s.getsockname()[0]
    except:
        IP = '127.0.0.1'
    
    s.close()
    return IP

# Dictionnaire pour stocker les sessions des clients
clients = {}
client_counter = 1  # Compteur pour générer des identifiants clients uniques

async def handler(websocket):
    global client_counter

    # Attribuer un clientId unique
    client_id = client_counter
    client_counter += 1

    # Ajouter le client dans la liste des clients
    clients[client_id] = {
        "websocket": websocket,
        "session_active": False,
        "battery": random.randint(50, 100),  # Batterie aléatoire entre 50 et 100
        "exposure": 0,
        "interval": 0,
        "count": 0,
        "start_time": None
    }

    # Envoyer l'ID client et l'état de la batterie au client
    battery_status = {
        "type": "batteryStatus",
        "battery": clients[client_id]["battery"],
        "clientId": client_id
    }
    await websocket.send(json.dumps(battery_status))

    try:
        # Attente de messages des clients
        async for message in websocket:
            data = json.loads(message)

            # Gestion des sessions
            if data["type"] == "startSession" and not clients[client_id]["session_active"]:
                # Démarrer la session
                clients[client_id]["exposure"] = data["exposure"]
                clients[client_id]["interval"] = data["interval"]
                clients[client_id]["count"] = data["count"]
                clients[client_id]["session_active"] = True
                clients[client_id]["start_time"] = time.time()

                # Estimation du temps total (exposition + intervalle * nombre de photos)
                total_time = (clients[client_id]["exposure"] + clients[client_id]["interval"]) * clients[client_id]["count"] - clients[client_id]["interval"]
                estimated_end_time = datetime.fromtimestamp(clients[client_id]["start_time"] + total_time)

                # Envoi du message de statut à tous les clients (en cours)
                session_status = {
                    "type": "sessionStatus",
                    "status": "en cours",
                    "clientId": client_id
                }
                await websocket.send(json.dumps(session_status))

                # Envoyer la durée estimée et l'heure de fin aux autres clients
                for ws in clients.values():
                    await ws["websocket"].send(json.dumps({
                        "type": "estimatedTime",
                        "estimatedTime": total_time,
                        "endTime": estimated_end_time.strftime("%H:%M:%S"),
                        "clientId": client_id
                    }))

                # Attente que le temps de la session soit écoulé
                await asyncio.sleep(total_time)

                # Session terminée
                clients[client_id]["session_active"] = False
                session_status["status"] = "terminé"
                await websocket.send(json.dumps(session_status))

                # Envoyer un message de fin aux autres clients
                for ws in clients.values():
                    await ws["websocket"].send(json.dumps({
                        "type": "sessionStatus",
                        "status": "terminé",
                        "clientId": client_id
                    }))

            # Le client veut récupérer son niveau de batterie
            if data["type"] == "getBatteryStatus":
                battery_status = {
                    "type": "batteryStatus",
                    "battery": clients[client_id]["battery"],
                    "clientId": client_id
                }
                await websocket.send(json.dumps(battery_status))

    except websockets.exceptions.ConnectionClosed as e:
        # En cas de déconnexion du client
        print(f"Client {client_id} déconnecté.")
        del clients[client_id]

# Lancer le serveur WebSocket
async def main():
    # Démarrer le serveur WebSocket sur l'IP et port spécifiés
    server = await websockets.serve(handler, get_ip(), 55000)
    print(f"Serveur WebSocket démarré sur ws://{get_ip()}55000")
    await server.wait_closed()

# Lancer l'événement principal
asyncio.run(main())
