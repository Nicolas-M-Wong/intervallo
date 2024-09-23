#!/bin/bash
if [ "$1" == "Constant-Trigger" ] then
echo "Compiling trigger"
g++ -Wall -o Constant-Trigger.exe Constant-Trigger.cpp -lpigpio -lrt
echo "Compilation succeeded"
fi
if [ "$1" == "Variable-Trigger" ] then
echo "Compiling non constant exposure time"
g++ -std=c++17 -o Variable-Trigger.exe Variable-Trigger.cpp
echo "Compilation succeeded"
fi

