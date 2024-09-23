echo "Compiling trigger"

g++ -Wall -o Trigger.exe Trigger.cpp -lpigpio -lrt

echo "Compilation succeeded"

echo "Compiling non constant exposure time"

g++ -std=c++17 -o non-constant.exe non-constant.cpp

echo "Compilation succeeded"