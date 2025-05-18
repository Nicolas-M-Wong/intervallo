# Add security middleware
@app.after_request
def add_security_headers(response):
    """Add security headers to response"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response


def generate_token():
    """Generate a time-limited token for API requests"""
    timestamp = int(time.time())
    expiry = timestamp + TOKEN_VALIDITY
    token_data = f"{timestamp}:{expiry}"
    token_signature = hashlib.sha256(f"{token_data}:{SERVER_SECRET}".encode()).hexdigest()
    return f"{token_data}:{token_signature}"


def verify_token(token):
    """Verify that a token is valid and not expired"""
    try:
        # Split token into timestamp, expiry, and signature
        parts = token.split(':')
        if len(parts) != 3:
            return False
        
        timestamp, expiry, signature = parts
        timestamp, expiry = int(timestamp), int(expiry)
        
        # Check if token has expired
        current_time = int(time.time())
        if current_time > expiry:
            return False
        
        # Verify signature
        expected_signature = hashlib.sha256(f"{timestamp}:{expiry}:{SERVER_SECRET}".encode()).hexdigest()
        return signature == expected_signature
    except:
        return False


# Add rate limiting functionality
class RateLimiter:
    def __init__(self, max_requests=20, time_window=60):
        self.max_requests = max_requests
        self.time_window = time_window  # in seconds
        self.requests = {}
        self.lock = threading.Lock()
        
    def is_allowed(self, ip):
        with self.lock:
            now = datetime.now()
            if ip not in self.requests:
                self.requests[ip] = [now]
                return True
                
            # Clean old requests
            self.requests[ip] = [t for t in self.requests[ip] 
                                if t > now - timedelta(seconds=self.time_window)]
            
            # Check rate limit
            if len(self.requests[ip]) < self.max_requests:
                self.requests[ip].append(now)
                return True
            return False

# Initialize rate limiter
rate_limiter = RateLimiter()import os
import json
import time
import threading
import socket
import secrets
import hashlib
import functools
from datetime import datetime, timedelta
from flask import Flask, request, send_file, jsonify, render_template, send_from_directory
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

# Security configurations
MAX_CONTENT_LENGTH = 1 * 1024 * 1024  # 1MB max content length
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH  # Limit upload size

# Generate a secret key on startup - this will change each time the server restarts
SERVER_SECRET = secrets.token_hex(16)
print(f"Server started with secret: {SERVER_SECRET}")

# Token validity duration in seconds (e.g., 10 minutes)
TOKEN_VALIDITY = 10 * 60


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
    # Apply rate limiting
    if not rate_limiter.is_allowed(request.remote_addr):
        return "Too many requests", 429
    
    try:
        return send_file("home.html")
    except FileNotFoundError:
        return "Home page not found", 404


# Route to get a token
@app.route('/token', methods=['GET'])
def get_token():
    # Apply rate limiting
    if not rate_limiter.is_allowed(request.remote_addr):
        return "Too many requests", 429
    
    token = generate_token()
    return jsonify({"token": token})


# Route to check session status
@app.route('/startSession', methods=['GET'])
def start_session():
    # Apply rate limiting
    if not rate_limiter.is_allowed(request.remote_addr):
        return "Too many requests", 429
    
    # Verify token
    token = request.args.get('token')
    if not token or not verify_token(token):
        return jsonify({"error": "Invalid or expired token"}), 401
    
    if is_session_running():
        remaining = int(latest_session_end_time - time.time())
        return jsonify({"status": "busy", "remaining": remaining})
    else:
        return jsonify({"status": "ready"})


# Route to handle photo capture requests
@app.route('/', methods=['POST'])
def handle_post():
    # Apply rate limiting
    if not rate_limiter.is_allowed(request.remote_addr):
        return "Too many requests", 429
    
    # Check content type
    if request.content_type != 'application/json':
        return "Invalid content type", 415
    
    try:
        data = request.json
        if not data:
            return "Missing request body", 400
            
        # Verify token
        token = data.get('token')
        if not token or not verify_token(token):
            return jsonify({"error": "Invalid or expired token"}), 401
            
        print("POST data received:", data)
        
        # Validate required fields
        if 'exposure' not in data or 'interval' not in data or 'count' not in data:
            return "Missing required parameters", 400
            
        exposure = float(data.get('exposure', 0))
        interval = float(data.get('interval', 0))
        count = int(data.get('count', 0))
        
        # Validate parameter ranges
        if exposure <= 0 or interval < 0 or count <= 0:
            return "Invalid parameter values", 400
        
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
    # Apply strict rate limiting for shutdown endpoint
    client_ip = request.remote_addr
    if not rate_limiter.is_allowed(client_ip) or not rate_limiter.is_allowed(client_ip):
        return "Too many requests", 429
    
    # Verify token
    data = request.json
    if not data or 'token' not in data:
        return "Missing token", 400
    
    token = data.get('token')
    if not verify_token(token):
        return jsonify({"error": "Invalid or expired token"}), 401
    
    shutdown_raspi()
    return "Shutdown initiated", 503


# Catch-all route for static files
@app.route('/<path:path>', methods=['GET'])
def serve_file(path):
    # Apply rate limiting
    if not rate_limiter.is_allowed(request.remote_addr):
        return "Too many requests", 429
    
    # Prevent path traversal attacks
    if '..' in path or path.startswith('/'):
        return "Forbidden", 403
    
    try:
        return send_file(path)
    except FileNotFoundError:
        return f"File {path} not found", 404


def main():
    IP = get_ip()
    PORT_LIST = [55000, 54000, 53000, 52000]
    
    # Log startup information
    print(f"Starting secure server with rate limiting (20 requests per minute per IP)")
    print(f"Tokens valid for {TOKEN_VALIDITY} seconds")
    
    # Update home.html to include token logic if it exists
    if os.path.exists("home.html"):
        try:
            with open("home.html", "r") as f:
                content = f.read()
                
            # Only add token logic if it doesn't appear to be there already
            if "getToken" not in content:
                # Insert token logic before closing body tag
                token_script = """
                <script>
                    // Get token on page load
                    let apiToken = '';
                    
                    function getToken() {
                        fetch('/token')
                            .then(response => response.json())
                            .then(data => {
                                apiToken = data.token;
                                console.log("Token obtained");
                            })
                            .catch(error => {
                                console.error('Error getting token:', error);
                                setTimeout(getToken, 5000); // Retry after 5 seconds
                            });
                    }
                    
                    // Get token on page load and refresh every 8 minutes
                    getToken();
                    setInterval(getToken, 8 * 60 * 1000);
                    
                    // Override fetch to include token
                    const originalFetch = window.fetch;
                    window.fetch = function(url, options) {
                        options = options || {};
                        
                        // Add token to GET requests
                        if (!options.method || options.method === 'GET') {
                            if (url.includes('?')) {
                                url += '&token=' + apiToken;
                            } else {
                                url += '?token=' + apiToken;
                            }
                        } 
                        // Add token to POST requests
                        else if (options.method === 'POST' && options.body) {
                            try {
                                let body = JSON.parse(options.body);
                                body.token = apiToken;
                                options.body = JSON.stringify(body);
                            } catch (e) {
                                console.error("Failed to add token to request:", e);
                            }
                        }
                        
                        return originalFetch(url, options);
                    };
                </script>
                """
                
                # Add script before closing body tag
                if "</body>" in content:
                    content = content.replace("</body>", token_script + "\n</body>")
                else:
                    content += token_script
                
                with open("home.html", "w") as f:
                    f.write(content)
                    
                print("Updated home.html with token authentication")
        except Exception as e:
            print(f"Failed to update home.html: {e}")
    
    for PORT in PORT_LIST:
        try:
            print(f"Starting server on {IP}:{PORT}...")
            
            # Using waitress for a production-ready WSGI server with increased thread count for better performance
            serve(app, host=IP, port=PORT, threads=8)
            break
        except Exception as e:
            print(f"Failed to bind on port {PORT}: {e}")
    else:
        print("Failed to bind to any port. Exiting.")


if __name__ == "__main__":
    main()