import socket
import time
import io
import os
import MAX17043
import random
import string
from cubic_spline import f
import subprocess

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
    "image/vnd.microsoft.icon",
    "image/x-icon",
    "image/vnd.djvu",
    "image/svg+xml",
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
    soc=battery_getSoc.getSoc()
    response_body=f"{round(soc)}"
    return response_body
    
def sleep(value):
    client_socket.send(header().encode('utf-8'))
    client_socket.close()
    s.close()
    return server_status
    
def shutdown(value):
    client_socket.send(header().encode('utf-8'))
    client_socket.close()
    s.close()
    os.popen("sudo shutdown -h now")

def file_request(file_name):
    file_location="src/"+file_name+".html"
    print('searching for :',file_location)
    if os.path.isfile(file_location):
        print('success, new file name =',file_name)
        global file
        file="/src/"+file_name+".html"
        
def non_constant (nb_photo_loc, start_expo_time, end_expo_time, tmp_enregistrement_loc):
    x,y,y2 = f(nb_photo_loc, start_expo_time, end_expo_time, tmp_enregistrement_loc)
    return y,y2
        
post_request_dict = {
    'battery' : battery,
    'sleep' : sleep,
    'shutdown': shutdown,
    'file_request' : file_request,
    }

def execute_request(request, *args):
    #The key should match a key
    
    # Extract the first key-value pair from the dictionary
    
    if request in post_request_dict:
        try:
            result = post_request_dict[request](*args)
            if result is not None:
                return result
        except:
            print("failed")
            pass
    else:
        return "Unknown request"

    
# post_request_dict={
#     "nb_photo":"number of picture to take requested by the user",
#     "tmp_pose": "exposure time for each picture",
#     "tmp_enregistrement": "time interval between each frame",
#     "date": "date & time at which the request has been sent by the user",
#     "sleep": "shutdown the server but keeps the raspi online, used for testing purposes",
#     "shutdown": "shutdown the raspi and the server",
#     "battery": "request periodically the battery level to display to the user"
#     "token": "token used to ensure that post messages are not ghost messages, behaviour seen on safari"}


########################################## Capturing photo ####################

def sec_2_min_h (tmp_prise_loc):
    if 60 < tmp_prise_loc <3600:
        tmp_min_h = str(round(tmp_prise_loc/60,2))+"min"
    elif tmp_prise_loc>3600:
        tmp_min_h = str(int(tmp_prise_loc//3600))+"h"+str(int((tmp_prise_loc%3600)//60))+"min"
    else :
        tmp_min_h = str(round(tmp_prise_loc))+"s"
    return(tmp_min_h)

def photo_capture(nb_photos_loc,tmp_pose_loc,tmp_enregistrement_loc):
    #Capture d'une unique photo
    addr_command = "./Trigger.exe "
    command = "sudo "+addr_command+str(tmp_pose_loc)+" "+str(nb_photos_loc)+" "+str(tmp_enregistrement_loc)
    print(command)
    return command

###############################################################################

def parsing_get_msg(data,active_dir):
    decrypted_data = ''
    # data should be the first line of the http msg
    # data should look like that: ['GET', '/intervallo.ico', 'HTTP/1.1']
    # first the method, here we'll only take get msg, then the location of the element then the http protocol
    # in this function, we'll parse to get the type of document we are searching decoding it accordingly
    initial_data = data
    data = data[1]
    # the second item is the location, then split it around the / 
    # and we take the last element as it is the name of the file we are looking for
    data = data.split('/')
    data = data[-1]
    extension_type = data.split('.')[-1]
    type_header = http_type_header_dict.get(extension_type)
    
    if type_header != None:
        # if the extension exists in the dictionnary
        if type_header.split('/')[0] == "text":
            # the extension is a text item
            decrypted_data = (io.open(active_dir+'/src/'+initial_data[1][1:], mode='r',encoding=('utf-8')).read())
            #read the file
            http_msg = 'HTTP/1.1 200 OK\r\nCache-Control: private, no-store, no-cache\r\nContent-Type: '+type_header +'\r\ncharset=UTF-8\r\n\r\n'
            decrypted_data = (http_msg + decrypted_data).encode('utf-8')
            
        if type_header.split('/')[0] == "image":
            # image item
            image = io.open(active_dir+'/assets/'+initial_data[1][1:], mode='rb').read()
            decrypted_data = ('HTTP/1.1 200 OK\r\nCache-Control: private, no-store, no-cache\r\nContent-Type:'+ type_header +'\r\ncharset=UTF-8\r\n\r\n').encode('utf-8')+image
            
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
    return(decrypted_data)
    
########################################## Web server #########################

def shutdown_raspi ():
    os.popen("sudo shutdown -h now")
    return

def JSON_data (msg):
    msg =msg.strip('{}')
    msg = msg.split(',')
    dict_parameters = {}
    
    for i in range(0,len(msg)):
        pairs_key_value = msg[i].split(':')
        try:
            dict_parameters [pairs_key_value[0].strip('"')] = float(pairs_key_value[1].strip('"'))
        except:
            dict_parameters [pairs_key_value[0].strip('"')] = pairs_key_value[1].strip('"')
            #Data is NaN in this case
    return dict_parameters

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


def header ():
    script =  "HTTP/1.1 200 OK\r\n"
    script += "Date: "+time.asctime(time.gmtime())+" GMT\r\n"
    script += "Expires: -1\r\n"
    script += "Cache-Control: private, no-store, no-cache\r\n"
    script += "Content-Type: text/html;"
    script += "charset=UTF-8\r\n"
    script += "\r\n"
    return script

def parse_header_item(header,item):
    header_list = []
    for i in header:
        header_list.append(i.split(': '))
    for i in range (0,len(header_list)):
        if header_list[i][0] == item:
            return header_list[i][1]
    return
    
    
def generate_token():
    token_length = 5
    return ''.join(random.SystemRandom().choice(string.ascii_uppercase +string.digits) for _ in range (token_length))
    
time_delay = 0
server_status = True
while get_ip()=="127.0.0.1":
    print("waiting for a network connection")
    time.sleep(1.5)
    time_delay += 1.5
    if time_delay > 300:
        break
        print("Network connection impossible")
        #If the raspi is waiting for more than 5 minutes end the loop
    
TCP_IP = get_ip()      # Local host
file = "/src/home.html"
if TCP_IP != "127.0.0.1":
    #only start the server if the IP of the server is not itself
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

    expct_end_date = 0
    server_socket = s
    print(f'Serving on port {TCP_PORT}...')
    # Accept and handle incoming connections one at a time
    while server_status:

        client_socket, client_address = server_socket.accept()
        print(f'Accepted connection from {client_address}')
            # Receive the request data
        client_request = client_socket.recv(1024).decode('utf-8')
        # Parse the request to determine the type of request (GET/POST)
        headers = client_request.split('\r\n')
        expect_content_len = parse_header_item(headers,'Content-Length')
        if expect_content_len != None:
            expect_content_len = int(expect_content_len)
        if expect_content_len == None:
            expect_content_len = 0
        if expect_content_len != len(headers[-1]):
                
            print("Error: message received shorter than the HTTP request Content-Length")
            print(parse_header_item(headers,'Content-Length'),len(headers[-1]))
            client_request += client_socket.recv(1024).decode('utf-8')
            #Identify why safari is behaving weirdly
            
        first_line = headers[0].split(' ')
        method = first_line[0]
        
        print(f'Received request: {first_line}')
        
        if method == 'GET':
            print(f'home: {file}\n')
            if str(first_line[1]).strip('/') != '':
                
                if str(first_line[1]).strip('/') == 'token':
                        user_token = generate_token()
                        client_dict.update({client_address[0]:user_token}) 
                        response = 'HTTP/1.1 200 OK\r\nCache-Control: private, no-store, no-cache\r\nContent-Type: text/plain\r\ncharset=UTF-8\r\n\r\n'+'Token: '+user_token
                        client_socket.send(response.encode('utf-8'))
                else:
                    try:
                        response = parsing_get_msg(first_line,directory)
                        client_socket.send(response)
                    except:
                        print(str(first_line[1]).strip('/'))
                        response = 'HTTP/1.1 400 Bad Request\r\nCache-Control: private, no-store, no-cache\r\nContent-Type: text/plain\r\ncharset=UTF-8\r\n\r\n'+"failed bad request"
                        print("failed bad request")
                        pass
            else:
            # Serve the HTML file
                home = io.open(directory+file, mode='r',encoding=('utf-8')).read()
                response = 'HTTP/1.1 200 OK\r\nCache-Control: private, no-store, no-cache\r\nContent-Type: text/html\r\ncharset=UTF-8\r\n\r\n'+home
                client_socket.send(response.encode('utf-8'))
        
        elif method == 'POST':
            # Parse the request to extract form data
            body = headers[-1]
            print(f"POST = {body}\n")
            response_body = "Data received"
            parameters = {}
            http_header = "HTTP/1.1 200 OK\r\n"
            try:
                parameters = JSON_data(body)
                
            except:
                pass
                http_header = "HTTP/1.1 400 Bad Request\r\n"
            
            if parameters.get('token') == client_dict.get(client_address[0]):
                if "nb_photos" in parameters.keys() and 'non-constant' not in parameters.keys():
                    try:
                        tmp_prise = parameters.get('nb_photos',0)*parameters.get('tmp_pose',0)+parameters.get('tmp_enregistrement',0)*(parameters.get('nb_photos',0)-1)
                        print(tmp_prise)
                        new_cmd_date = parameters.get('date',0)
                    
                        #Avoid capturing pictures for command sent during the shoot
                        if new_cmd_date > expct_end_date:
                            new_cmd_date +=1000*tmp_prise
                            expct_end_date = new_cmd_date
                            cmd = photo_capture(parameters.get('nb_photos',0),parameters.get('tmp_pose',0),parameters.get('tmp_enregistrement',0))
                            os.popen(cmd)
                            
                        else:
                            print("shot command during an existing shoot")
                            http_header = "HTTP/1.1 400 Bad Request\r\n"
                            response_body = "Unavailable"
                        
                    except:
                        print("Failed not a number")
                        http_header = "HTTP/1.1 400 Bad Request\r\n"
                        response_body = "Failed NaN"
                        
                else:
                    request, args = list(parameters.items())[0]
                    result = execute_request(request,args)
                    if type(result) is str:
                        response_body = result
                    if type(result) is bool:
                        server_status = result
                        
                if 'non-constant' in parameters.keys() and 'nb_photos' in parameters.keys():
                    nb_photos = parameters.get('nb_photos',0)
                    start_expo_time = parameters.get('tmp_pose_start',0)
                    end_expo_time = parameters.get('tmp_pose_end',0)
                    tmp_enregistrement =  parameters.get('tmp_enregistrement',0)
                    y,y2 = non_constant(int(nb_photos), start_expo_time, end_expo_time, tmp_enregistrement)
                    print(f"y: {y}; y2: {y2}")
                    if (y2 > 1.5).all():
                        command = f"sudo {directory}/non-constant.exe '{y}' '{y2}' 'Trigger.exe'"
                        process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                        print(command)
                    else :
                        print("Tmp enregistrement insuffisant")
                        http_header = "HTTP/1.1 400 Bad Request\r\n"
                        response_body = "Interval too short"
                                            # open("tmp_cmd.sh", "w").close()
                    # open("tmp_cmd.sh", "a")
                    # for i in range (0,len(y)):
                    #     f.write(f"{photo_capture(1,y[i],0)}\nsleep {tmp_enregistrement-y[i]}\n")
                    # os.popen("sh tmp_cmd.sh")
                
                # elif 'sleep' in parameters.keys():
                #     client_socket.close()
                #     s.close()
                #     break
                
                # elif 'battery' in parameters.keys():
                #     soc=battery_getSoc.getSoc()
                #     response_body=f"{round(soc)}"
                
                # elif 'file_request' in parameters.keys():
                #     file = "/src/"+parameters.get('file_request')+".html"
                #     #Switching home page
                    
                # elif 'home-V1.html' in parameters.keys():
                #     file = "/src/home-V1.html"
                #     #Switching home page
                
                if not parameters.keys():
                    print("empty post request")
                    http_header = "HTTP/1.1 400 Bad Request\r\n"
                    response_body = "Empty request"  
            else:
                http_header = "HTTP/1.1 400 Bad Request\r\n"
            response = (
                    f"{http_header}"
                    f"Content-Length: {len(response_body)}\r\n"
                    "Cache-Control: private, no-store, no-cache\r\n"
                    "Content-Type: text/plain\r\n"
                    "Connection: close\r\n"
                    "\r\n"
                    f"{response_body}"
                )
            print(http_header)
            client_socket.send(response.encode('utf-8'))
        # Close the client socket
        client_socket.close()


