import socket
import io
import json
import time
import os
import threading
from urllib.parse import unquote

# Dictionary of accepted content types
http_type_header_dict = {}
liste_header = [
    "image/gif", "image/jpeg", "image/png", "image/tif",
    "image/vnd.microsoft.icon", "image/x-icon", "image/vnd.djvu", "image/svg+xml",
    "text/css", "text/csv", "text/html", "text/javascript", "text/plain", "text/xml"
]

for i in liste_header:
    http_type_header_dict.update({i.split('/')[1]: i})

http_type_header_dict.update({"jpg": "image/jpeg"})
http_type_header_dict.update({"ico": "image/x-icon"})
http_type_header_dict.update({"js": "text/javascript"})

# Session tracking
latest_session_end_time = 0
session_lock = threading.Lock()  # Pour protéger l'accès à latest_session_end_time

def file_type_verif(file_type, accept_type=http_type_header_dict):
    return file_type in accept_type

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.settimeout(0)
    try:
        s.connect(('8.8.8.8', 1))
        IP = s.getsockname()[0]
    except:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

def is_session_running():
    with session_lock:
        return time.time() < latest_session_end_time

def shutdown_raspi():
    os.popen("sleep 15")
    os.popen("sudo shutdown -h now")
    return

def update_session_time(exposure, interval, count):
    global latest_session_end_time
    duration = exposure * count + interval * (count - 1)
    with session_lock:
        latest_session_end_time = time.time() + duration
    return duration

def photo_capture(nb_photo_loc, tmp_pose_loc, tmp_enregistrement_loc):
    # Capture d'une unique photo
    command = f"sudo ./Constant_Trigger.exe {tmp_pose_loc} {nb_photo_loc} {tmp_enregistrement_loc}"
    print(command)
    os.popen(command)
    return

def GET(path, accept_type=http_type_header_dict):
    print(f"Requesting: {path}")
    
    # Éliminer les paramètres de requête et normaliser le chemin
    route = path.split("?")[0] if "?" in path else path
    route = route.strip('/')
    
    # Si la route est vide, servir la page d'accueil
    if not route:
        try:
            script = io.open("home.html", mode='r', encoding='utf-8').read()
            response_body = script.encode('utf-8')
            content_type = accept_type.get("html")
        except FileNotFoundError:
            response_body = b"Home page not found"
            content_type = "text/plain"
            return build_response("404 Not Found", content_type, response_body)
    
    # Route API pour vérifier l'état de la session
    elif route == "startSession":
        if is_session_running():
            remaining = int(latest_session_end_time - time.time())
            payload = json.dumps({"status": "busy", "remaining": remaining})
        else:
            payload = json.dumps({"status": "ready"})
        response_body = payload.encode('utf-8')
        content_type = "application/json"
    
    # Gestion des autres fichiers
    else:
        file_type = route.split('.')[-1] if '.' in route else ''
        
        if file_type_verif(file_type):
            try:
                main_type = accept_type.get(file_type, "").split('/')[0]
                if main_type == "text":
                    script = io.open(route, mode='r', encoding='utf-8').read()
                    response_body = script.encode('utf-8')
                else:
                    with open(route, "rb") as f:
                        response_body = f.read()
                content_type = accept_type.get(file_type, "text/plain")
            except FileNotFoundError:
                response_body = f"File {route} not found".encode('utf-8')
                content_type = "text/plain"
                return build_response("404 Not Found", content_type, response_body)
        else:
            # Fallback to home page if file type not recognized
            try:
                script = io.open("home.html", mode='r', encoding='utf-8').read()
                response_body = script.encode('utf-8')
                content_type = accept_type.get("html")
            except FileNotFoundError:
                response_body = b"Home page not found"
                content_type = "text/plain"
                return build_response("404 Not Found", content_type, response_body)
    
    return build_response("200 OK", content_type, response_body)

def build_response(status, content_type, body):
    """Helper function to build HTTP responses"""
    return (
        f'HTTP/1.1 {status}\r\n'
        f'Content-Type: {content_type}\r\n'
        f'Content-Length: {len(body)}\r\n'
        f'Cache-Control: no-cache, no-store, must-revalidate\r\n'
        f'\r\n'
    ).encode('utf-8') + body

def handle_client(client_socket, client_address):
    """Handle a single client connection in a separate thread"""
    try:
        # Configuration du timeout pour éviter les connexions bloquées
        client_socket.settimeout(5.0)
        
        # Lecture de la requête HTTP
        request_data = b""
        while b"\r\n\r\n" not in request_data:
            try:
                chunk = client_socket.recv(1024)
                if not chunk:
                    break
                request_data += chunk
            except socket.timeout:
                print(f"Connection from {client_address} timed out during headers read")
                client_socket.close()
                return
        
        request = request_data.decode('utf-8', errors='ignore')
        headers = request.split('\r\n')
        
        if len(headers) < 1:
            client_socket.close()
            return
        
        first_line = headers[0].split(' ')
        if len(first_line) < 2:
            client_socket.close()
            return
        
        method = first_line[0]
        path = unquote(first_line[1])  # Decode URL-encoded characters
        
        print(f"METHOD: {method} PATH: {path}")
        
        if method == 'GET':
            response = GET(path)
        
        elif method == 'POST':
            # Parse le content-length depuis les en-têtes
            content_length = 0
            for header_line in headers:
                if header_line.lower().startswith('content-length:'):
                    content_length = int(header_line.split(':')[1].strip())
                    break
            
            # Vérifier si nous avons déjà le corps complet
            header_end = request_data.find(b"\r\n\r\n") + 4
            body = request_data[header_end:]
            
            # Lire le reste du corps si nécessaire, avec timeout
            while len(body) < content_length:
                try:
                    chunk = client_socket.recv(min(1024, content_length - len(body)))
                    if not chunk:
                        break
                    body += chunk
                except socket.timeout:
                    print(f"Connection from {client_address} timed out during body read")
                    client_socket.close()
                    return
            
            # Traitement de la route /shutdown
            if path == "/shutdown":
                shutdown_raspi()
                response_body = "OK".encode('utf-8')
                response = build_response("503 Unavailable", "text/plain", response_body)
            else:
                # Traitement du POST normal
                try:
                    data = json.loads(body.decode('utf-8'))
                    print("Données POST reçues :", data)
                    exposure = float(data.get('exposure', 0))
                    interval = float(data.get('interval', 0))
                    count = int(data.get('count', 0))
                    
                    if is_session_running():
                        remaining = max(0, int(latest_session_end_time - time.time()))
                        response_body = json.dumps({
                            "status": "busy",
                            "remaining": remaining
                        }).encode('utf-8')
                        response = build_response("409 Conflict", "application/json", response_body)
                    else:
                        photo_capture(count, exposure, interval)
                        duration = update_session_time(exposure, interval, count)
                        response_body = json.dumps({
                            "status": "started",
                            "remaining": int(duration)
                        }).encode('utf-8')
                        response = build_response("200 OK", "application/json", response_body)
                        
                except Exception as e:
                    error_msg = f"Invalid JSON: {e}".encode('utf-8')
                    response = build_response("400 Bad Request", "text/plain", error_msg)
        
        else:
            # Méthode non supportée
            response_body = f"Method {method} not supported".encode('utf-8')
            response = build_response("405 Method Not Allowed", "text/plain", response_body)
        
        # Envoi de la réponse et fermeture
        client_socket.sendall(response)
    
    except Exception as e:
        print(f"Error handling client {client_address}: {e}")
    
    finally:
        client_socket.close()

# Server setup
def main():
    TCP_IP = get_ip()  # Local host
    BUFFER_SIZE = 1024
    TCP_PORT_list = [55000, 54000, 53000, 52000]
    
    for TCP_PORT in TCP_PORT_list:
        try:
            server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            print(f"binding to {TCP_IP}:{TCP_PORT}...")
            server_socket.bind((TCP_IP, TCP_PORT))
            server_socket.listen(5)  # Augmentation de la file d'attente
            print(f'Serving on {TCP_IP}:{TCP_PORT}...')
            break
        except Exception as e:
            print(f"Failed to bind on port {TCP_PORT}: {e}")
            server_socket.close()
    else:
        print("Failed to bind to any port. Exiting.")
        return
    
    try:
        # Boucle principale du serveur
        while True:
            try:
                client_socket, client_address = server_socket.accept()
                print(f'Accepted connection from {client_address}')
                
                # Création d'un thread pour gérer le client
                client_thread = threading.Thread(
                    target=handle_client,
                    args=(client_socket, client_address)
                )
                client_thread.daemon = True
                client_thread.start()
            
            except Exception as e:
                print(f"Error accepting connection: {e}")
    
    finally:
        server_socket.close()

if __name__ == "__main__":
    main()