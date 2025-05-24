import socket
import time
import io
import os
import MAX17043
import random
import string
#from cubic_spline import f, complement
import subprocess
from sun import sun_photo_spacing

battery_getSoc = MAX17043.max17043()

directory = os.path.dirname(os.path.abspath(__file__)) #absolute path to file

client_dict = {}

############################### HTTP Header attribute dictionnary #############
# Constructing dictionnary for most of the possible header sent by the serv to the client
http_type_header_dict = {}
liste_header = [
    ## Images ##
    "image/gif",
    "image/jpeg",
    "image/png",   
    "image/tif",
    ## Text ##
    "text/css",
    "text/csv",
    "text/html",
    "text/javascript", 
    "text/plain",
    "text/xml"]

for i in liste_header:
    http_type_header_dict.update({i.split('/')[1]:i})

http_type_header_dict.update({"jpg":"image/jpeg"}) #adding jpg files as jpeg
http_type_header_dict.update({"ico":"image/x-icon"}) #adding.ico files
http_type_header_dict.update({"js":"text/javascript"}) #adding .js files

################################# List of possible post request ###############

#value is set as variable for ease of use as it send always a dict with a pair
# key/value by the JS

def battery(value):
    try:
        soc = battery_getSoc.getSoc()
        response_body = f"{round(soc)}"
        return response_body
    except Exception as e:
        print(f"Battery error: {e}")
        return "Battery unavailable"
    
def sleep(value):
    return "sleep_requested"  # Return flag instead of closing socket here
    
def shutdown(value):
    return "shutdown_requested"  # Return flag instead of closing socket here

def file_request(file_name):
    file_location = "src/" + file_name + ".html"
    print('searching for :', file_location)
    if os.path.isfile(file_location):
        print('success, new file name =', file_name)
        global file
        file = "/src/" + file_name + ".html"
        return "File switched"
    return "File not found"

def sun_arg(arguments):
    try:
        focal_length_mm, resolution_width, resolution_height, sensor_width_mm = arguments
        sun_size_pixels, time_between_photos_sec, max_sun = sun_photo_spacing(focal_length_mm, resolution_width, resolution_height, sensor_width_mm)
        return (sun_size_pixels, time_between_photos_sec, max_sun)
    except Exception as e:
        print(f"Sun calculation error: {e}")
        return None

        
post_request_dict = {
    'battery' : battery,
    'sleep' : sleep,
    'shutdown': shutdown,
    'file_request' : file_request,
}

def execute_request(request, *args): 
    if request in post_request_dict:
        try:
            result = post_request_dict[request](*args)
            return result
        except Exception as e:
            print(f"Request execution failed: {e}")
            return "Request failed"
    else:
        return "Unknown request"

########################################## Capturing photo ####################

def sec_2_min_h(tmp_prise_loc):
    if 60 < tmp_prise_loc < 3600:
        tmp_min_h = str(round(tmp_prise_loc/60, 2)) + "min"
    elif tmp_prise_loc > 3600:
        tmp_min_h = str(int(tmp_prise_loc//3600)) + "h" + str(int((tmp_prise_loc%3600)//60)) + "min"
    else:
        tmp_min_h = str(round(tmp_prise_loc)) + "s"
    return tmp_min_h

def photo_capture(nb_photos_loc, tmp_pose_loc, tmp_enregistrement_loc):
    #Capture d'une unique photo
    addr_command = "./Constant_Trigger.exe "
    command = "sudo " + addr_command + str(tmp_pose_loc) + " " + str(nb_photos_loc) + " " + str(tmp_enregistrement_loc)
    print(command)
    return command

def variable_trigger(nb_photo_loc, start_param1, end_param1, start_param2, end_param2):
    # Note: This function requires cubic_spline module which is commented out
    # You'll need to uncomment and fix the imports for this to work
    try:
        from cubic_spline import f, complement
        x, y = f(nb_photo_loc, start_param1, end_param1)
        if start_param2 == end_param2:
            y, y2 = complement(y, start_param2)
        else:
            x2, y2 = f(nb_photo_loc, start_param2, end_param2)
        return y, y2
    except ImportError:
        print("cubic_spline module not available")
        return None, None

###############################################################################

def parsing_get_msg(data, active_dir):
    decrypted_data = ''
    initial_data = data
    data = data[1]
    data = data.split('/')
    data = data[-1]
    extension_type = data.split('.')[-1]
    type_header = http_type_header_dict.get(extension_type)
    
    if type_header != None:
        try:
            if type_header.split('/')[0] == "text":
                decrypted_data = (io.open(active_dir + '/src/' + initial_data[1][1:], mode='r', encoding=('utf-8')).read())
                http_msg = 'HTTP/1.1 200 OK\r\nCache-Control: private, no-store, no-cache\r\nContent-Type: ' + type_header + '\r\ncharset=UTF-8\r\n\r\n'
                decrypted_data = (http_msg + decrypted_data).encode('utf-8')
                
            if type_header.split('/')[0] == "image":
                image = io.open(active_dir + '/assets/' + initial_data[1][1:], mode='rb').read()
                decrypted_data = ('HTTP/1.1 200 OK\r\nCache-Control: private, no-store, no-cache\r\nContent-Type:' + type_header + '\r\ncharset=UTF-8\r\n\r\n').encode('utf-8') + image
        except FileNotFoundError:
            response_body = "File not found"
            response = ("HTTP/1.1 404 Not Found\r\n"
                    f"Content-Length: {len(response_body)}\r\n"
                    "Cache-Control: private, no-store, no-cache\r\n"
                    "Content-Type: text/plain\r\n"
                    "Connection: close\r\n"
                    "\r\n"
                    f"{response_body}")
            decrypted_data = response.encode('utf-8')
    else:
        response_body = "Failed 404"
        response = ("HTTP/1.1 404 Not Found\r\n"
                f"Content-Length: {len(response_body)}\r\n"
                "Cache-Control: private, no-store, no-cache\r\n"
                "Content-Type: text/plain\r\n"
                "Connection: close\r\n"
                "\r\n"
                f"{response_body}")
        decrypted_data = response.encode('utf-8') 
    return decrypted_data
    
########################################## Web server #########################

def JSON_data(msg):
    """Parse JSON-like data from POST body"""
    try:
        # Handle both actual JSON and custom format
        msg = msg.strip()
        if msg.startswith('{') and msg.endswith('}'):
            msg = msg.strip('{}')
            msg = msg.split(',')
            dict_parameters = {}
            
            for item in msg:
                if ':' in item:
                    pairs_key_value = item.split(':', 1)  # Split only on first colon
                    key = pairs_key_value[0].strip().strip('"')
                    value = pairs_key_value[1].strip().strip('"')
                    
                    # Try to convert to number
                    try:
                        value = float(value)
                        if value.is_integer():
                            value = int(value)
                    except ValueError:
                        pass  # Keep as string
                    
                    dict_parameters[key] = value
            
            return dict_parameters
        else:
            # Handle URL-encoded data
            pairs = msg.split('&')
            dict_parameters = {}
            for pair in pairs:
                if '=' in pair:
                    key, value = pair.split('=', 1)
                    try:
                        value = float(value)
                        if value.is_integer():
                            value = int(value)
                    except ValueError:
                        pass
                    dict_parameters[key] = value
            return dict_parameters
    except Exception as e:
        print(f"JSON parsing error: {e}")
        return {}

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

def header():
    script = "HTTP/1.1 200 OK\r\n"
    script += "Date: " + time.asctime(time.gmtime()) + " GMT\r\n"
    script += "Expires: -1\r\n"
    script += "Cache-Control: private, no-store, no-cache\r\n"
    script += "Content-Type: text/html;"
    script += "charset=UTF-8\r\n"
    script += "\r\n"
    return script

def parse_header_item(header, item):
    """Parse specific header item from HTTP headers"""
    for line in header:
        if ':' in line:
            parts = line.split(':', 1)
            if len(parts) == 2 and parts[0].strip() == item:
                return parts[1].strip()
    return None

def generate_token():
    token_length = 5
    return ''.join(random.SystemRandom().choice(string.ascii_uppercase + string.digits) for _ in range(token_length))

def construct_vect(vect):
    output = '['
    for i in range(0, len(vect)-1):
        output += str(vect[i]) + ";"
    output += str(vect[-1]) + "]"
    return output

def receive_full_request(client_socket, expected_length=None):
    """Receive complete HTTP request, handling content length properly"""
    data = b''
    headers_complete = False
    content_length = 0
    
    while True:
        chunk = client_socket.recv(1024)
        if not chunk:
            break
        data += chunk
        
        if not headers_complete and b'\r\n\r\n' in data:
            headers_complete = True
            header_end = data.find(b'\r\n\r\n') + 4
            headers = data[:header_end].decode('utf-8', errors='ignore')
            
            # Parse content length
            for line in headers.split('\r\n'):
                if line.lower().startswith('content-length:'):
                    content_length = int(line.split(':', 1)[1].strip())
                    break
            
            # Check if we have all the data
            body_length = len(data) - header_end
            if body_length >= content_length:
                break
        elif not headers_complete:
            # Still receiving headers
            continue
    
    return data.decode('utf-8', errors='ignore')

# Main server loop
time_delay = 0
server_status = True

while get_ip() == "127.0.0.1":
    print("waiting for a network connection")
    time.sleep(1.5)
    time_delay += 1.5
    if time_delay > 300:
        print("Network connection impossible")
        break

TCP_IP = get_ip()      
file = "/src/home.html"

if TCP_IP != "127.0.0.1":
    BUFFER_SIZE = 1024
    TCP_PORT_list = [55000, 54000, 53000, 52000]

    s = None
    for i in TCP_PORT_list:
        try:
            TCP_PORT = i
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)  # Allow reuse of address
            print("binding to ", TCP_IP, ":", TCP_PORT, "...")
            s.bind((TCP_IP, TCP_PORT))
            s.listen(2)
            break
        except Exception as e:
            print(f"Failed to bind to port {i}: {e}")
            if s:
                s.close()
            s = None

    if s is None:
        print("Could not bind to any port")
        exit(1)

    expct_end_date = 0
    server_socket = s
    print(f'Serving on port {TCP_PORT}...')
    
    try:
        while server_status:
            try:
                client_socket, client_address = server_socket.accept()
                print(f'Accepted connection from {client_address}')
                
                # Receive complete request
                client_request = receive_full_request(client_socket)
                
                if not client_request:
                    print("Empty request received")
                    client_socket.close()
                    continue
                
                print(f"Full request received: {len(client_request)} bytes")
                
                # Parse the request
                headers = client_request.split('\r\n')
                first_line = headers[0].split(' ')
                method = first_line[0]
                
                print(f'Received request: {first_line}\nMethod: {method}')
                
                if method == 'GET':
                    print(f'home: {file}\n')
                    if len(first_line) > 1 and str(first_line[1]).strip('/') != '':
                        
                        if str(first_line[1]).strip('/') == 'token':
                            user_token = generate_token()
                            client_dict.update({client_address[0]: user_token}) 
                            response = 'HTTP/1.1 200 OK\r\nCache-Control: private, no-store, no-cache\r\nContent-Type: text/plain\r\ncharset=UTF-8\r\n\r\n' + 'Token: ' + user_token
                            client_socket.send(response.encode('utf-8'))
                        else:
                            try:
                                response = parsing_get_msg(first_line, directory)
                                client_socket.send(response)
                            except Exception as e:
                                print(f"GET request failed: {e}")
                                response = 'HTTP/1.1 400 Bad Request\r\nCache-Control: private, no-store, no-cache\r\nContent-Type: text/plain\r\ncharset=UTF-8\r\n\r\n' + "failed bad request"
                                client_socket.send(response.encode('utf-8'))
                    else:
                        # Serve the HTML file
                        try:
                            home = io.open(directory + file, mode='r', encoding=('utf-8')).read()
                            response = 'HTTP/1.1 200 OK\r\nCache-Control: private, no-store, no-cache\r\nContent-Type: text/html\r\ncharset=UTF-8\r\n\r\n' + home
                            client_socket.send(response.encode('utf-8'))
                        except FileNotFoundError:
                            response = 'HTTP/1.1 404 Not Found\r\nCache-Control: private, no-store, no-cache\r\nContent-Type: text/plain\r\ncharset=UTF-8\r\n\r\n' + "Home file not found"
                            client_socket.send(response.encode('utf-8'))
                
                elif method == 'POST':
                    # Find the body of the POST request
                    body_start = client_request.find('\r\n\r\n')
                    if body_start != -1:
                        body = client_request[body_start + 4:]
                    else:
                        body = ""
                    
                    print(f"POST body = {body}\n")
                    
                    response_body = "Data received"
                    parameters = {}
                    http_header = "HTTP/1.1 200 OK\r\n"
                    
                    try:
                        parameters = JSON_data(body)
                        print(f"Parsed parameters: {parameters}")
                    except Exception as e:
                        print(f"Failed to parse POST data: {e}")
                        http_header = "HTTP/1.1 400 Bad Request\r\n"
                        response_body = "Failed to parse data"
                    
                    # Check token if parameters were parsed successfully
                    token_valid = True
                    if parameters and 'token' in parameters:
                        expected_token = client_dict.get(client_address[0])
                        if parameters.get('token') != expected_token:
                            token_valid = False
                            http_header = "HTTP/1.1 401 Unauthorized\r\n"
                            response_body = "Invalid token"
                    
                    if parameters and token_valid:
                        if "nb_photos" in parameters.keys() and 'variable' not in parameters.keys():
                            try:
                                tmp_prise = parameters.get('nb_photos', 0) * parameters.get('tmp_pose', 0) + parameters.get('tmp_enregistrement', 0) * (parameters.get('nb_photos', 0) - 1)
                                print(f"Calculated time: {tmp_prise}")
                                new_cmd_date = parameters.get('date', 0)
                            
                                # Avoid capturing pictures for command sent during the shoot
                                if new_cmd_date > expct_end_date:
                                    new_cmd_date += 1000 * tmp_prise
                                    expct_end_date = new_cmd_date
                                    
                                    cmd = photo_capture(parameters.get('nb_photos', 0), parameters.get('tmp_pose', 0), parameters.get('tmp_enregistrement', 0))
                                    os.popen(cmd)
                                    response_body = "Photo capture started"
                                    
                                else:
                                    print("shot command during an existing shoot")
                                    http_header = "HTTP/1.1 400 Bad Request\r\n"
                                    response_body = "Unavailable - shoot in progress"
                                
                            except Exception as e:
                                print(f"Photo capture failed: {e}")
                                http_header = "HTTP/1.1 400 Bad Request\r\n"
                                response_body = "Failed - invalid parameters"
                                
                        elif 'variable_expo' in parameters.keys() and 'nb_photos' in parameters.keys():
                            # Variable exposure handling - requires cubic_spline module
                            response_body = "Variable exposure not available (cubic_spline module required)"
                            
                        elif 'resolutionWidth' in parameters.keys():
                            try:
                                focal_length_mm, sensor_width_mm = parameters.get('focalLength', 0), parameters.get('sensorWidth', 0)
                                resolution_width, resolution_height = parameters.get('resolutionWidth', 0), parameters.get('resolutionHeight', 0)
                                sun_size_pixels, time_between_photos_sec, max_sun = sun_photo_spacing(focal_length_mm, resolution_width, resolution_height, sensor_width_mm)
                                response_body = f"sun_size_pixels={round(sun_size_pixels)};time_between_photos_sec={round(time_between_photos_sec, 1)};max_sun={max_sun}"
                            except Exception as e:
                                print(f"Failed to calculate sun size: {e}")
                                http_header = "HTTP/1.1 400 Bad Request\r\n"
                                response_body = "Failed to calculate sun size"
                        else:
                            # Handle other requests
                            if parameters:
                                request, args = list(parameters.items())[0]
                                result = execute_request(request, args)
                                if isinstance(result, str):
                                    response_body = result
                                    # Handle special responses
                                    if result == "sleep_requested":
                                        server_status = False
                                        response_body = "Server shutting down"
                                    elif result == "shutdown_requested":
                                        response_body = "System shutting down"
                                        # Send response before shutdown
                                        response = (
                                            f"{http_header}"
                                            f"Content-Length: {len(response_body)}\r\n"
                                            "Cache-Control: private, no-store, no-cache\r\n"
                                            "Content-Type: text/plain\r\n"
                                            "Connection: close\r\n"
                                            "\r\n"
                                            f"{response_body}"
                                        )
                                        client_socket.send(response.encode('utf-8'))
                                        client_socket.close()
                                        server_socket.close()
                                        os.popen("sudo shutdown -h now")
                                    
                    
                    if not parameters:
                        print("empty post request")
                        http_header = "HTTP/1.1 400 Bad Request\r\n"
                        response_body = "Empty request"
                    
                    # Send response
                    response = (
                        f"{http_header}"
                        f"Content-Length: {len(response_body)}\r\n"
                        "Cache-Control: private, no-store, no-cache\r\n"
                        "Content-Type: text/plain\r\n"
                        "Connection: close\r\n"
                        "\r\n"
                        f"{response_body}"
                    )
                    print(f"Sending response: {http_header.strip()}")
                    client_socket.send(response.encode('utf-8'))
                
                # Close the client socket
                client_socket.close()
                
            except Exception as e:
                print(f"Error handling client: {e}")
                try:
                    client_socket.close()
                except:
                    pass
    
    except KeyboardInterrupt:
        print("Server interrupted by user")
    finally:
        print("Closing server...")
        server_socket.close()