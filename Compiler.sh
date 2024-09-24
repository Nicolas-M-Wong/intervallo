#!/bin/bash

if [ "$1" = "Constant_Trigger" ]
    then
    echo "Compiling Constant_Trigger"
    g++ -Wall -o Constant_Trigger.exe Constant_Trigger.cpp -lpigpio -lrt
    echo "Compilation succeeded"  
fi
if [ "$1" = "Variable_Trigger" ]
    then
    echo "Compiling Variable_Trigger"
    g++ -std=c++17 -o Variable_Trigger.exe Variable_Trigger.cpp
    echo "Compilation succeeded"
fi
