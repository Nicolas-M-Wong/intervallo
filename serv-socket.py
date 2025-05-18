import socket
import io
import json
import time

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
    s.close()
    return IP

# Session tracking
latest_session_end_time = 0

def is_session_running():
    return time.time() < latest_session_end_time

def shutdown_raspi ():
    # os.popen("sleep 15")
    # os.popen("sudo shutdown -h -now")
    # break
    return

def update_session_time(exposure, interval, count):
    global latest_session_end_time
    duration = exposure * count + interval * (count - 1)
    latest_session_end_time = time.time() + duration
    return duration

def photo_capture(nb_photo_loc,tmp_pose_loc,tmp_enregistrement_loc):
    #Capture d'une unique photo
    #command = "sudo ./interval_new "+str(tmp_pose_loc)+" "+str(nb_photo_loc)+" "+str(tmp_enregistrement_loc)
    #os.popen(command)
    return

# Server setup
TCP_IP = get_ip()      # Local host
# TCP_IP = '127.0.0.1'
BUFFER_SIZE = 1024
TCP_PORT_list = [55000,54000,53000,52000]

for i in TCP_PORT_list:
    try:
        TCP_PORT = i
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        print("binding to ", TCP_IP, ":", TCP_PORT,"...")
        s.bind((TCP_IP, TCP_PORT))
        s.listen(2)
        break
    
    except:
        pass
server_socket = s
print(f'Serving on port {TCP_PORT}...')

def GET(file, file_type, accept_type=http_type_header_dict):
    print(f"Requesting: {file}")
    route = file.split("?")[0] if "?" in file else file

    if route == "":
        script = io.open("index.html", mode='r', encoding='utf-8').read()
        response_body = script.encode('utf-8')
        content_type = accept_type.get("html")

    elif route == "startSession":
        if is_session_running():
            remaining = int(latest_session_end_time - time.time())
            payload = json.dumps({"status": "busy", "remaining": remaining})
        else:
            payload = json.dumps({"status": "ready"})
        response_body = payload.encode('utf-8')
        content_type = "application/json"

    elif file_type_verif(file_type):
        try:
            main_type = accept_type.get(file_type, "").split('/')[0]
            if main_type == "text":
                script = io.open(file, mode='r', encoding='utf-8').read()
                response_body = script.encode('utf-8')
            else:
                with open(file, "rb") as f:
                    response_body = f.read()
                response = (
                    f'HTTP/1.1 200 OK\r\n'
                    f'Content-Type: {accept_type.get(file_type)}\r\n'
                    f'Connection: close\r\n'
                    f'Content-Length: {len(response_body)}\r\n\r\n'
                ).encode('utf-8') + response_body
                return response
            content_type = accept_type.get(file_type, accept_type.get("html"))
        except:
            response_body = b""
            content_type = "text/plain"

    else:
        script = io.open("index.html", mode='r', encoding='utf-8').read()
        response_body = script.encode('utf-8')
        content_type = accept_type.get("html")

    response = (
        f'HTTP/1.1 200 OK\r\n'
        f'Content-Type: {content_type}\r\n'
        f'Connection: close\r\n'
        f'Content-Length: {len(response_body)}\r\n\r\n'
    ).encode('utf-8') + response_body

    return response


# Main loop
while True:
    client_socket, client_address = server_socket.accept()
    print(f'Accepted connection from {client_address}')
    request = client_socket.recv(BUFFER_SIZE).decode('utf-8')

    headers = request.split('\r\n')
    if len(headers) < 1:
        client_socket.close()
        continue

    first_line = headers[0].split(' ')
    if len(first_line) < 2:
        client_socket.close()
        continue

    method = first_line[0]
    path = first_line[1]
    file_type = path.split('.')[-1] if '.' in path else ''
    file_name = path.strip('/').split('/')[-1]

    print(f"METHOD: {method}")

    if method == 'GET':
        response = GET(file_name, file_type)

    elif method == 'POST':
        content_length = 0
        for header_line in headers:
            if header_line.lower().startswith('content-length:'):
                content_length = int(header_line.split(':')[1].strip())
                break
    
        body = b""
        while len(body) < content_length:
            body += client_socket.recv(content_length - len(body))
            
        
        try:
            data = json.loads(body.decode('utf-8'))
            print("Données POST reçues :", data)
            exposure = int(data.get('exposure', 0))
            interval = int(data.get('interval', 0))
            count = int(data.get('count', 0))
    
            if is_session_running():
                remaining = max(0, int(latest_session_end_time - time.time()))
                response_body = json.dumps({
                    "status": "busy",
                    "remaining": remaining
                }).encode('utf-8')
                response = (
                    "HTTP/1.1 409 Conflict\r\n"
                    "Content-Type: application/json\r\n"
                    f"Content-Length: {len(response_body)}\r\n"
                    "Connection: close\r\n\r\n"
                ).encode('utf-8') + response_body
                
            else:
                duration = update_session_time(exposure, interval, count)
                response_body = json.dumps({
                    "status": "started",
                    "remaining": int(duration)
                }).encode('utf-8')
                response = (
                    "HTTP/1.1 200 OK\r\n"
                    "Content-Type: application/json\r\n"
                    f"Content-Length: {len(response_body)}\r\n"
                    "Connection: close\r\n\r\n"
                ).encode('utf-8') + response_body
                photo_capture(count,exposure,interval)

                
        except Exception as e:
            error_msg = f"Invalid JSON: {e}".encode('utf-8')
            response = (
                "HTTP/1.1 400 Bad Request\r\n"
                "Content-Type: text/plain\r\n"
                f"Content-Length: {len(error_msg)}\r\n"
                "Connection: close\r\n\r\n"
            ).encode('utf-8') + error_msg
            
        if method == 'POST' and first_line[1] == "/shutdown":
            raspi_shutdown()
            response_body = "OK".encode('utf-8')
            response = (
                f"HTTP/1.1 503 Unavailable\r\n"
                f"Content-Type: text/plain\r\n"
                f"Content-Length: {len(response_body)}\r\n"
                f"Connection: close\r\n\r\n"
            ).encode('utf-8') + response_body
            
    else:
        response_body = "OK".encode('utf-8')
        response = (
            f"HTTP/1.1 200 OK\r\n"
            f"Content-Type: text/plain\r\n"
            f"Content-Length: {len(response_body)}\r\n"
            f"Connection: close\r\n\r\n"
        ).encode('utf-8') + response_body

    client_socket.sendall(response)
    client_socket.close()

server_socket.close()
