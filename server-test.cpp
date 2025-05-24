#include <iostream>
#include <string>
#include <map>
#include <vector>
#include <fstream>
#include <sstream>
#include <thread>
#include <mutex>
#include <chrono>
#include <ctime>
#include <cstdlib>
#include <cstring>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <ifaddrs.h>
#include <netdb.h>
#include <signal.h>

class HttpServer {
private:
    std::map<std::string, std::string> http_type_header_dict;
    double latest_session_end_time;
    std::mutex session_lock;
    int server_socket;
    
    void initializeHeaders() {
        std::vector<std::string> liste_header = {
            "image/gif", 
			"image/jpeg", 
			"image/png", 
			"image/tif",
            "text/css", 
			"text/csv", 
			"text/html", 
			"text/javascript", 
			"text/plain", 
			"text/xml"
        };
        
        for (const auto& header : liste_header) {
            size_t pos = header.find('/');
            if (pos != std::string::npos) {
                std::string extension = header.substr(pos + 1);
                http_type_header_dict[extension] = header;
            }
        }
        
        // Additional mappings
        http_type_header_dict["jpg"] = "image/jpeg";
        http_type_header_dict["ico"] = "image/x-icon";
        http_type_header_dict["js"] = "text/javascript";
    }
    
    bool fileTypeVerification(const std::string& file_type) {
        return http_type_header_dict.find(file_type) != http_type_header_dict.end();
    }
    
    std::string getLocalIP() {
        struct ifaddrs *ifaddrs_ptr, *ifa;
        char host[NI_MAXHOST];
        
        if (getifaddrs(&ifaddrs_ptr) == -1) {
            return "127.0.0.1";
        }
        
        for (ifa = ifaddrs_ptr; ifa != nullptr; ifa = ifa->ifa_next) {
            if (ifa->ifa_addr == nullptr) continue;
            
            int family = ifa->ifa_addr->sa_family;
            if (family == AF_INET) {
                int s = getnameinfo(ifa->ifa_addr, sizeof(struct sockaddr_in),
                                  host, NI_MAXHOST, nullptr, 0, NI_NUMERICHOST);
                if (s != 0) continue;
                
                std::string ip(host);
                if (ip != "127.0.0.1" && ip.substr(0, 3) != "169") {
                    freeifaddrs(ifaddrs_ptr);
                    return ip;
                }
            }
        }
        
        freeifaddrs(ifaddrs_ptr);
        return "127.0.0.1";
    }
    
    bool isSessionRunning() {
        std::lock_guard<std::mutex> lock(session_lock);
        auto now = std::chrono::system_clock::now();
        auto now_time_t = std::chrono::system_clock::to_time_t(now);
        return static_cast<double>(now_time_t) < latest_session_end_time;
    }
    
    void shutdownRaspi() {
        // Run shutdown commands asynchronously in separate thread
        std::thread shutdown_thread([]() {
            std::system("sleep 15");
            std::system("sudo shutdown -h now");
        });
        shutdown_thread.detach(); // Let it run independently
    }
    
    double updateSessionTime(double exposure, double interval, int count) {
        double duration = exposure * count + interval * (count - 1);
        std::lock_guard<std::mutex> lock(session_lock);
        auto now = std::chrono::system_clock::now();
        auto now_time_t = std::chrono::system_clock::to_time_t(now);
        latest_session_end_time = static_cast<double>(now_time_t) + duration;
        return duration;
    }
    
    void photoCapture(int nb_photo, double exposure, double interval) {
        std::ostringstream command_stream;
        command_stream << "sudo ./Constant_Trigger.exe " << exposure << " " << nb_photo << " " << interval;
        std::string command = command_stream.str();
        std::cout << "Executing: " << command << std::endl;
        
        // Run photo capture command asynchronously in separate thread
        std::thread photo_thread([command]() {
            std::system(command.c_str());
        });
        photo_thread.detach(); // Let it run independently
    }
    
    std::string readFile(const std::string& filename, bool binary = false) {
        std::ifstream file;
        if (binary) {
            file.open(filename, std::ios::binary);
        } else {
            file.open(filename);
        }
        
        if (!file.is_open()) {
            throw std::runtime_error("File not found: " + filename);
        }
        
        std::ostringstream content;
        content << file.rdbuf();
        return content.str();
    }
    
    std::string urlDecode(const std::string& str) {
        std::string decoded;
        for (size_t i = 0; i < str.length(); ++i) {
            if (str[i] == '%' && i + 2 < str.length()) {
                int hex_value;
                std::istringstream hex_stream(str.substr(i + 1, 2));
                if (hex_stream >> std::hex >> hex_value) {
                    decoded += static_cast<char>(hex_value);
                    i += 2;
                } else {
                    decoded += str[i];
                }
            } else if (str[i] == '+') {
                decoded += ' ';
            } else {
                decoded += str[i];
            }
        }
        return decoded;
    }
    
    std::string buildResponse(const std::string& status, const std::string& content_type, const std::string& body) {
        std::ostringstream response;
        response << "HTTP/1.1 " << status << "\r\n";
        response << "Content-Type: " << content_type << "\r\n";
        response << "Content-Length: " << body.length() << "\r\n";
        response << "Cache-Control: no-cache, no-store, must-revalidate\r\n";
        response << "\r\n";
        response << body;
        return response.str();
    }
    
    std::string handleGET(const std::string& path) {
        std::cout << "Requesting: " << path << std::endl;
        
        // Remove query parameters and normalize path
        std::string route = path;
        size_t query_pos = route.find('?');
        if (query_pos != std::string::npos) {
            route = route.substr(0, query_pos);
        }
        
        // Remove leading/trailing slashes
        while (!route.empty() && route[0] == '/') {
            route = route.substr(1);
        }
        while (!route.empty() && route.back() == '/') {
            route.pop_back();
        }
        
        std::string response_body;
        std::string content_type;
        
        // Serve home page if route is empty
        if (route.empty()) {
            try {
                response_body = readFile("home.html");
                content_type = http_type_header_dict["html"];
            } catch (const std::exception&) {
                response_body = "Home page not found";
                content_type = "text/plain";
                return buildResponse("404 Not Found", content_type, response_body);
            }
        }
        // API route to check session status
        else if (route == "startSession") {
            if (isSessionRunning()) {
                auto now = std::chrono::system_clock::now();
                auto now_time_t = std::chrono::system_clock::to_time_t(now);
                int remaining = static_cast<int>(latest_session_end_time - static_cast<double>(now_time_t));
                response_body = "{\"status\":\"busy\",\"remaining\":" + std::to_string(remaining) + "}";
            } else {
                response_body = "{\"status\":\"ready\"}";
            }
            content_type = "application/json";
        }
        // Handle other files
        else {
            size_t dot_pos = route.find_last_of('.');
            std::string file_type;
            if (dot_pos != std::string::npos) {
                file_type = route.substr(dot_pos + 1);
            }
            
            if (fileTypeVerification(file_type)) {
                try {
                    std::string main_type = http_type_header_dict[file_type];
                    bool is_text = main_type.substr(0, 4) == "text";
                    
                    response_body = readFile(route, !is_text);
                    content_type = http_type_header_dict[file_type];
                } catch (const std::exception&) {
                    response_body = "File " + route + " not found";
                    content_type = "text/plain";
                    return buildResponse("404 Not Found", content_type, response_body);
                }
            } else {
                // Fallback to home page
                try {
                    response_body = readFile("home.html");
                    content_type = http_type_header_dict["html"];
                } catch (const std::exception&) {
                    response_body = "Home page not found";
                    content_type = "text/plain";
                    return buildResponse("404 Not Found", content_type, response_body);
                }
            }
        }
        
        return buildResponse("200 OK", content_type, response_body);
    }
    
    std::string parseJsonValue(const std::string& json, const std::string& key) {
        std::string search = "\"" + key + "\"";
        size_t key_pos = json.find(search);
        if (key_pos == std::string::npos) return "";
        
        size_t colon_pos = json.find(':', key_pos);
        if (colon_pos == std::string::npos) return "";
        
        size_t value_start = colon_pos + 1;
        while (value_start < json.length() && (json[value_start] == ' ' || json[value_start] == '\t')) {
            value_start++;
        }
        
        if (value_start >= json.length()) return "";
        
        size_t value_end;
        if (json[value_start] == '"') {
            value_start++;
            value_end = json.find('"', value_start);
        } else {
            value_end = json.find_first_of(",}", value_start);
        }
        
        if (value_end == std::string::npos) {
            value_end = json.length();
        }
        
        return json.substr(value_start, value_end - value_start);
    }
    
    std::string handlePOST(const std::string& path, const std::string& body) {
        std::string response_body;
        std::string content_type = "application/json";
        
        if (path == "/shutdown") {
            shutdownRaspi();
            response_body = "OK";
            content_type = "text/plain";
            return buildResponse("503 Service Unavailable", content_type, response_body);
        } else {
            try {
                // Simple JSON parsing
                std::string exposure_str = parseJsonValue(body, "exposure");
                std::string interval_str = parseJsonValue(body, "interval");
                std::string count_str = parseJsonValue(body, "count");
                
                double exposure = std::stod(exposure_str);
                double interval = std::stod(interval_str);
                int count = std::stoi(count_str);
                
                std::cout << "POST data received - exposure: " << exposure 
                         << ", interval: " << interval << ", count: " << count << std::endl;
                
                if (isSessionRunning()) {
                    auto now = std::chrono::system_clock::now();
                    auto now_time_t = std::chrono::system_clock::to_time_t(now);
                    int remaining = std::max(0, static_cast<int>(latest_session_end_time - static_cast<double>(now_time_t)));
                    response_body = "{\"status\":\"busy\",\"remaining\":" + std::to_string(remaining) + "}";
                    return buildResponse("409 Conflict", content_type, response_body);
                } else {
                    photoCapture(count, exposure, interval);
                    double duration = updateSessionTime(exposure, interval, count);
                    response_body = "{\"status\":\"started\",\"remaining\":" + std::to_string(static_cast<int>(duration)) + "}";
                    return buildResponse("200 OK", content_type, response_body);
                }
            } catch (const std::exception& e) {
                response_body = "Invalid JSON: " + std::string(e.what());
                content_type = "text/plain";
                return buildResponse("400 Bad Request", content_type, response_body);
            }
        }
    }
    
    void handleClient(int client_socket, const std::string& client_address) {
        try {
            // Set timeout for socket operations
            struct timeval timeout;
            timeout.tv_sec = 5;
            timeout.tv_usec = 0;
            setsockopt(client_socket, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout));
            
            // Read HTTP request
            std::string request_data;
            char buffer[1024];
            
            // Read headers
            while (request_data.find("\r\n\r\n") == std::string::npos) {
                int bytes_read = recv(client_socket, buffer, sizeof(buffer) - 1, 0);
                if (bytes_read <= 0) {
                    std::cout << "Connection from " << client_address << " timed out or closed during headers read" << std::endl;
                    close(client_socket);
                    return;
                }
                buffer[bytes_read] = '\0';
                request_data += buffer;
            }
            
            // Parse request
            std::istringstream request_stream(request_data);
            std::string first_line;
            std::getline(request_stream, first_line);
            
            std::istringstream line_stream(first_line);
            std::string method, path, version;
            line_stream >> method >> path >> version;
            
            path = urlDecode(path);
            std::cout << "METHOD: " << method << " PATH: " << path << std::endl;
            
            std::string response;
            
            if (method == "GET") {
                response = handleGET(path);
            } else if (method == "POST") {
                // Parse Content-Length
                int content_length = 0;
                std::string line;
                while (std::getline(request_stream, line) && line != "\r") {
                    if (line.substr(0, 15) == "Content-Length:" || line.substr(0, 15) == "content-length:") {
                        content_length = std::stoi(line.substr(15));
                    }
                }
                
                // Read body
                size_t header_end = request_data.find("\r\n\r\n") + 4;
                std::string body = request_data.substr(header_end);
                
                // Read remaining body if necessary
                while (static_cast<int>(body.length()) < content_length) {
                    int bytes_to_read = std::min(1024, content_length - static_cast<int>(body.length()));
                    int bytes_read = recv(client_socket, buffer, bytes_to_read, 0);
                    if (bytes_read <= 0) {
                        std::cout << "Connection from " << client_address << " timed out during body read" << std::endl;
                        close(client_socket);
                        return;
                    }
                    buffer[bytes_read] = '\0';
                    body += buffer;
                }
                
                response = handlePOST(path, body);
            } else {
                std::string response_body = "Method " + method + " not supported";
                response = buildResponse("405 Method Not Allowed", "text/plain", response_body);
            }
            
            // Send response
            send(client_socket, response.c_str(), response.length(), 0);
            
        } catch (const std::exception& e) {
            std::cout << "Error handling client " << client_address << ": " << e.what() << std::endl;
        }
        
        close(client_socket);
    }
    
public:
    HttpServer() : latest_session_end_time(0), server_socket(-1) {
        initializeHeaders();
        // Ignore SIGPIPE to prevent server crash on broken pipe
        signal(SIGPIPE, SIG_IGN);
    }
    
    ~HttpServer() {
        if (server_socket != -1) {
            close(server_socket);
        }
    }
    
    void run() {
        std::string tcp_ip = getLocalIP();
        std::vector<int> tcp_ports = {55000, 54000, 53000, 52000};
        
        for (int tcp_port : tcp_ports) {
            server_socket = socket(AF_INET, SOCK_STREAM, 0);
            if (server_socket < 0) {
                std::cerr << "Failed to create socket" << std::endl;
                continue;
            }
            
            int opt = 1;
            setsockopt(server_socket, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
            
            struct sockaddr_in server_addr;
            server_addr.sin_family = AF_INET;
            server_addr.sin_addr.s_addr = inet_addr(tcp_ip.c_str());
            server_addr.sin_port = htons(tcp_port);
            
            std::cout << "Binding to " << tcp_ip << ":" << tcp_port << "..." << std::endl;
            
            if (bind(server_socket, (struct sockaddr*)&server_addr, sizeof(server_addr)) < 0) {
                std::cout << "Failed to bind on port " << tcp_port << std::endl;
                close(server_socket);
                server_socket = -1;
                continue;
            }
            
            if (listen(server_socket, 5) < 0) {
                std::cout << "Failed to listen on port " << tcp_port << std::endl;
                close(server_socket);
                server_socket = -1;
                continue;
            }
            
            std::cout << "Serving on " << tcp_ip << ":" << tcp_port << "..." << std::endl;
            break;
        }
        
        if (server_socket == -1) {
            std::cerr << "Failed to bind to any port. Exiting." << std::endl;
            return;
        }
        
        // Main server loop
        while (true) {
            try {
                struct sockaddr_in client_addr;
                socklen_t client_addr_len = sizeof(client_addr);
                
                int client_socket = accept(server_socket, (struct sockaddr*)&client_addr, &client_addr_len);
                if (client_socket < 0) {
                    std::cout << "Error accepting connection" << std::endl;
                    continue;
                }
                
                std::string client_address = inet_ntoa(client_addr.sin_addr);
                std::cout << "Accepted connection from " << client_address << std::endl;
                
                // Create thread to handle client
                std::thread client_thread(&HttpServer::handleClient, this, client_socket, client_address);
                client_thread.detach();
                
            } catch (const std::exception& e) {
                std::cout << "Error in main loop: " << e.what() << std::endl;
            }
        }
    }
};

int main() {
    HttpServer server;
    server.run();
    return 0;
}