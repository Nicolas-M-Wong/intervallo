#!/bin/bash
sleep 10


DESKTOP_DIR=$(xdg-user-dir DESKTOP)
#find the user desktop directory
cd "$DESKTOP_DIR"
#go to desktop
mkdir main
cd main
#go to main
git init
git pull https://www.github.com/Nicolas-M-Wong/intervallo main

python3 intervallo-server-1.py
