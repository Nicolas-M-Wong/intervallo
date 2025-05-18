#include <iostream>
#include <vector>
#include <string>
#include <cstdlib>  // For system()
#include <stdexcept> // For exception handling
#include <sstream>   // For stringstream
#include <filesystem>
#include <unistd.h>
#include <limits.h>


// Function to check if a string is a valid float
bool isFloat(const std::string& str) {
    try {
        std::stof(str); // Try to convert string to float
    } catch (const std::invalid_argument& e) {
        return false; // If conversion fails, it's not a float
    } catch (const std::out_of_range& e) {
        return false; // If number is too large/small to fit in a float
    }
    return true; // Conversion successful
}

// Function to echo values if they are valid floats
void echoVector(const std::vector<std::string>& vec) {
    for (const auto& value : vec) {
        if (isFloat(value)) {
            std::string command = "echo " + value; // Construct the echo command
            system(command.c_str());               // Execute the command
        } else {
            std::cout << "Invalid float: " << value << std::endl;
        }
    }
}

// Function to parse input in the form [4;5;6] and return a vector of strings
std::vector<std::string> parseInput(const std::string& input) {
    std::vector<std::string> result;

    // Remove the square brackets from the input string
    std::string data = input.substr(1, input.size() - 2); // Remove '[' and ']'
    
    // Use a stringstream to split the data by semicolons
    std::stringstream ss(data);
    std::string token;

    // Split the string by semicolons
    while (std::getline(ss, token, ';')) {
        // Trim spaces from the token
        token.erase(0, token.find_first_not_of(' ')); // Trim leading spaces
        token.erase(token.find_last_not_of(' ') + 1); // Trim trailing spaces
        if (!token.empty()) {
            result.push_back(token);
        }
    }

    return result;
}

std::string file_location() {
    // Get the current path of the executable
	char result[PATH_MAX];
	ssize_t count = readlink("/proc/self/exe", result, PATH_MAX);
	std::filesystem::path executablePath = std::string(result, (count > 0) ? count : 0);
	
	// Get the directory of the executable
	std::filesystem::path directory = executablePath.parent_path();
	
	// Print the directory
	
    return directory;
}

int main(int argc, char** argv) {
    if (argc != 4) {
        std::cerr << "Usage: ./my_program '[4;5;exposure_time;...]' '[3;2;saving_time;...]'executable-name' " << std::endl;
        return 1;
    }

    std::string tmp_pose = argv[1];
    std::string tmp_enregistrement = argv[2];
    std::string executable = argv[3];
    bool condition1 = tmp_pose.front() == '[' && tmp_pose.back() == ']';
    bool condition2 = tmp_enregistrement.front() == '[' && tmp_enregistrement.back() == ']';
    
    // Check if the input string is properly formatted as [4;5;6 ...]
    if (condition1 && condition2) {
        // Parse the input and get a vector of strings
        std::vector<std::string> tmp_pose_vector = parseInput(tmp_pose);
        std::vector<std::string> tmp_enregistrement_vector = parseInput(tmp_enregistrement);
        // Echo each value of the vector if it's a valid float
        echoVector(tmp_pose_vector);
        echoVector(tmp_enregistrement_vector);

        // Ensure both vectors are of the same size to avoid out-of-bounds access
        if (tmp_enregistrement_vector.size() != tmp_pose_vector.size()) {
            std::cerr << "Error: Vectors must be of the same size." << std::endl;
            return 1;
        }
        
        for (size_t i = 0; i < tmp_pose_vector.size(); ++i) {
            const auto& enregistrement_value = tmp_enregistrement_vector[i];
            const auto& pose_value = tmp_pose_vector[i]; // Access corresponding value in tmp_pose
        
            if (isFloat(enregistrement_value) && isFloat(pose_value)) {
						
                std::string exePath = file_location();
                exePath += "/" + executable; // Simplified path construction
                std::cout << "Executable Directory: " << exePath << std::endl;
                std::cout << "Pose value: " << pose_value << std::endl;
                
                // Construct command line using both tmp_enregistrement and pose_value
                
                std::string command_line = "sudo " + exePath + " " + tmp_pose_vector[i] + " 1 " + "  0";
                std::cout << "Command line: " << command_line<< std::endl;
                int result = system(command_line.c_str()); // Convert to const char*
                
                unsigned int seconds = std::stoul(tmp_enregistrement_vector[i]);
                sleep(seconds);
                // Check the result of the command execution
                if (result != 0) {
                    std::cerr << "Error executing command: " << command_line << std::endl;
                }
            }
        }
    } else {
        std::cerr << "Error: Input should be in the form [4;5;6 ...]" << std::endl;
        return 1;
    }
    // Print the directory of the executable

    
    return 0;
}
