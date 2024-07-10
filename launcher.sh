#!/bin/bash
sleep 10


DESKTOP_DIR=$(xdg-user-dir DESKTOP)
#find the user desktop directory
cd "$DESKTOP_DIR"
#go to desktop
mkdir main
cd main
#go to main


# Check for internet connectivity
echo "Checking internet connectivity..."
ping -c 1 google.com &> /dev/null

if [ $? -ne 0 ]; then
    echo "No internet connection."
    exit 1
else
    git init
    git pull https://www.github.com/Nicolas-M-Wong/intervallo main
fi

python3 intervallo-server-1.py
