echo "Running \"trigger_compiler.sh\""

g++ -Wall -o Trigger.exe Trigger.cpp -lpigpio -lrt

echo "Compilation succeeded"