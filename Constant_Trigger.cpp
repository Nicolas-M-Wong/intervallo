#include <iostream>
#include <unistd.h>
#include <pigpio.h>

int OFFSET_t = 300000;
int PIN_SHUTTER = 21;
int PIN_FOCUS = 20;

int main(int argc, char** argv) {
  
  if (argc!=4){
    std::cout << "Not enought arguments...\n";
    std::cout << "The command need to be :\n\tsudo ./Trigger.exe Exposure_time Nb_shots Delay_time\n";
    exit(0);
  }
  
  if (gpioInitialise() < 0) {
	  std::cout << "Error: setup pigpio.h fail\n";
	  return 1;
	} else {
		std::cout << "Setup pigpio\n";
	}
	
	gpioSetMode(PIN_SHUTTER, PI_OUTPUT);
	gpioSetMode(PIN_FOCUS, PI_OUTPUT);
	
	float exposure = std::stof(argv[1]);
	float nb_shots = std::stoi(argv[2]);
	float delay = std::stof(argv[3]);
	
	std::cout << "Exposure : " << exposure << " s; Shots : " << nb_shots << "; Delay : " << delay << "s\n";

	gpioWrite(PIN_FOCUS, true);
	usleep(OFFSET_t/2);
	gpioWrite(PIN_FOCUS, false);
	usleep(OFFSET_t);
	long time = long(exposure * 1000000.0);
	
        int i = 1;
        while (i < nb_shots) {
		std::cout << "Image n\370" << i << "\n";
		gpioWrite(PIN_SHUTTER, true);
		gpioWrite(PIN_FOCUS, true);
		usleep(OFFSET_t);
		usleep(time);
		gpioWrite(PIN_SHUTTER, false);
		gpioWrite(PIN_FOCUS, false);
		usleep(delay * 1000000.0);
                i++;
        }
        
        std::cout << "Image n\370" << i << "\n";
        gpioWrite(PIN_SHUTTER, true);
        gpioWrite(PIN_FOCUS, true);
        usleep(OFFSET_t);
        usleep(time);
        gpioWrite(PIN_SHUTTER, false);
        gpioWrite(PIN_FOCUS, false);

	
	gpioTerminate();
	std::cout << "Terminate pigpio\n";
  return 0;
}




  

