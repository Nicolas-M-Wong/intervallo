#!/bin/bash

if [ "$1" = "Constant_Trigger" ]
    then
    echo "Compiling Constant_Trigger"
    g++ -Wall -o Constant_Trigger.exe Constant_Trigger.cpp -lpigpio -lrt
    if [ $? -eq 1 ]; then
        echo "Compilation failed." 
    else
        echo "Compilation $1 succeeded"
    fi 
fi
if [ "$1" = "Variable_Trigger" ]
    then
    echo "Compiling Variable_Trigger"
    g++ -std=c++17 -o Variable_Trigger.exe Variable_Trigger.cpp
    if [ $? -eq 1 ]; then
        echo "Compilation failed." 
    else
        echo "Compilation $1 succeeded"
    fi
fi
