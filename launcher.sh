#!/bin/bash

DESKTOP_DIR=$(xdg-user-dir DESKTOP)
: > "$DESKTOP_DIR/logfile.txt"
exec > >(tee -a "$DESKTOP_DIR/logfile.txt") 2> >(tee -a "$DESKTOP_DIR/logfile.txt" >&2)

# Function to check if the Raspberry Pi is connected to the internet using DNS
check_internet() {
    # Use curl to check if we can reach google.com with a short timeout (0.5 seconds)
    curl -s --head --connect-timeout 1 https://www.google.com > /dev/null 2>&1
    return $?
}

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
	
compiler_request(){
local file_path="$1"
local compiler_path="$2"
local compiler_arg="$3"
if [ ! -f "$file_path" ]; then
    echo "trigger.exe does not exist in $DIR. Compiling trigger.cpp..."
    # Compile trigger.cpp
    sh "$compiler_path" "$compiler_arg" &
    if [ $? -eq 1 ]; then
        echo "Compilation failed." 
    fi
else
    echo "Trigger.exe already exists in $DIR."
fi
}

center_text "$(date)" "-"

if [ "$#" -lt 1 ]; then
    echo "$0 missing branch to launch"
    center_text "fatal error" "-"
    exit 1
fi

branch="$1"
#find the user desktop directory

if ! cd "$DESKTOP_DIR/intervallo-$1"; then
    echo "No folder named $DESKTOP_DIR/intervallo-$1 found."
    center_text "fatal error" "-"
    exit 1
fi

cd "$DESKTOP_DIR/intervallo-$1"
#go to the folder

# Check internet connection then git pull
if check_internet; then
    echo "Internet connection is active, updating the programm"
    git config pull.rebase false
    git pull https://www.github.com/Nicolas-M-Wong/intervallo "$1"
else
    echo "Internet unavailable, continuing without the latest update"
fi

DIR="$(xdg-user-dir DESKTOP)/intervallo-$1"

compiler_request "$DIR/Constant_Trigger.exe" "$DIR/Compiler.sh" "Constant_Trigger"
compiler_request "$DIR/Variable_Trigger.exe" "$DIR/Compiler.sh" "Variable_Trigger"

cd $DIR
python3 intervallo-server-1.py

center_text "" "-"
