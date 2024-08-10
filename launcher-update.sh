#!/bin/bash
# Determine terminal width

center_text() {
    local msg="$1"
    local character="$2"
    if [ -t 1 ]; then
        # Inside a terminal, use `tput` to get terminal width
        width=$(tput cols)
    else
        # Default to 80 columns if not inside a terminal
        width=80
    fi
    LENGTH_MSG=${#msg}
    CENTER_COL=$(((width - LENGTH_MSG) / 2))
    # Repeat the character COUNT times
    printf '%*s\n' "$width" '' | tr ' ' "$character"
    printf "%*s%s\n" $CENTER_COL "" "$msg"
    printf "%*s\n" "$width" | tr ' ' "$character"
    }

center_text "$(date)" "-"

DESKTOP_DIR=$(xdg-user-dir DESKTOP)
#find the user desktop directory
cd "$DESKTOP_DIR"
#go to desktop
mkdir main-batterylevel
cd main-batterylevel
#go to main

git init
git config pull.rebase false
git pull https://www.github.com/Nicolas-M-Wong/intervallo update

DIR=$(xdg-user-dir DESKTOP)/main-batterylevel

if [ ! -f "$DIR/Trigger.exe" ]; then
    echo "trigger.exe does not exist in $DIR. Compiling trigger.cpp..."
    # Compile trigger.cpp
    sh "$DIR/trigger_compiler.sh" &
    if [ $? -eq 1 ]; then
        echo "Compilation failed." 
    fi
else
    echo "Trigger.exe already exists in $DIR."
fi

python3 intervallo-server-1.py

center_text "" "-"
