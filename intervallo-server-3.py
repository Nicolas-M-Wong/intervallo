import os
import json
import time
import threading
import socket
import secrets
import hashlib
import functools
from datetime import datetime, timedelta
from flask import Flask, request, send_file, jsonify, render_template, send_from_directory
from flask import session, abort, Response, make_response
from werkzeug.middleware.proxy_fix import ProxyFix
from waitress import serve

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
session_lock = threading.Lock()  # To protect access to latest_session_end_time

# Create Flask app
app = Flask(__name__, static_folder=".", static_url_path="")
app.wsgi_app = ProxyFix(app.wsgi_app)

# Configure Flask for better security
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # Prevent caching
app.config['JSON_AS_ASCII'] = False  # Handle UTF-8 responses
app.secret_key = secrets.token_hex(32)  # Generate a secure secret key for sessions

# Security configurations
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'change_this_default_password')
PASSWORD_HASH = hashlib.sha256(ADMIN_PASSWORD.encode()).hexdigest()
API_TOKEN = os.environ.get('API_TOKEN', secrets.token_hex(16))
MAX_CONTENT_LENGTH = 1 * 1024 * 1024  # 1MB max content length
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH  # Limit upload size

# IP whitelist - set to None to allow all IPs or use a list of allowed IPs
IP_WHITELIST = None  # Example: ['192.168.1.100', '10.0.0.5']


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
    """Shutdown the Raspberry Pi after a delay"""
    def delayed_shutdown():
        time.sleep(15)
        os.system("sudo shutdown -h now")
    
    thread = threading.Thread(target=delayed_shutdown)
    thread.daemon = True
    thread.start()
    return


def update_session_time(exposure, interval, count):
    """Update the session end time based on exposure parameters"""
    global latest_session_end_time
    duration = exposure * count + interval * (count - 1)
    with session_lock:
        latest_session_end_time = time.time() + duration
    return duration


def photo_capture(nb_photo_loc, tmp_pose_loc, tmp_enregistrement_loc):
    """Capture photos with the specified parameters"""
    command = f"sudo ./Constant_Trigger.exe {tmp_pose_loc} {nb_photo_loc} {tmp_enregistrement_loc}"
    print(command)
    os.popen(command)
    return


# Route for the home page
@app.route('/', methods=['GET'])
def home():
    try:
        return send_file("home.html")
    except FileNotFoundError:
        return "Home page not found", 404


# Route to check session status
@app.route('/startSession', methods=['GET'])
def start_session():
    if is_session_running():
        remaining = int(latest_session_end_time - time.time())
        return jsonify({"status": "busy", "remaining": remaining})
    else:
        return jsonify({"status": "ready"})


# Route to handle photo capture requests
@app.route('/', methods=['POST'])
def handle_post():
    try:
        data = request.json
        print("POST data received:", data)
        
        exposure = float(data.get('exposure', 0))
        interval = float(data.get('interval', 0))
        count = int(data.get('count', 0))
        
        if is_session_running():
            remaining = max(0, int(latest_session_end_time - time.time()))
            return jsonify({
                "status": "busy",
                "remaining": remaining
            }), 409  # Conflict
        else:
            photo_capture(count, exposure, interval)
            duration = update_session_time(exposure, interval, count)
            return jsonify({
                "status": "started",
                "remaining": int(duration)
            })
    except Exception as e:
        return f"Invalid request: {str(e)}", 400


# Route to handle shutdown requests
@app.route('/shutdown', methods=['POST'])
def handle_shutdown():
    shutdown_raspi()
    return "Shutdown initiated", 503


# Catch-all route for static files
@app.route('/<path:path>', methods=['GET'])
def serve_file(path):
    try:
        return send_file(path)
    except FileNotFoundError:
        return f"File {path} not found", 404


def main():
    IP = get_ip()
    PORT_LIST = [55000, 54000, 53000, 52000]
    
    for PORT in PORT_LIST:
        try:
            print(f"Starting server on {IP}:{PORT}...")
            # Using waitress for a production-ready WSGI server
            serve(app, host=IP, port=PORT)
            break
        except Exception as e:
            print(f"Failed to bind on port {PORT}: {e}")
    else:
        print("Failed to bind to any port. Exiting.")


if __name__ == "__main__":
    main()