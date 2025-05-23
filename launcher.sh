#!/bin/bash

DESKTOP_DIR=$(xdg-user-dir DESKTOP)
: > "$DESKTOP_DIR/logfile.txt"
exec > >(tee -a "$DESKTOP_DIR/logfile.txt") 2> >(tee -a "$DESKTOP_DIR/logfile.txt" >&2)

branch="$1"
option="$2"

# Function to check internet connectivity
check_internet() {
    curl -s --head --connect-timeout 1 https://www.google.com > /dev/null 2>&1
    return $?
}

# Centered terminal message
center_text() {
    local msg="$1"
    local character="$2"
    if [ -t 1 ]; then
        width=$(tput cols)
    else
        width=80
    fi
    LENGTH_MSG=${#msg}
    CENTER_COL=$(((width - LENGTH_MSG) / 2))
    printf '%*s\n' "$width" '' | tr ' ' "$character"
    printf "%*s%s\n" $CENTER_COL "" "$msg"
    printf "%*s\n" "$width" | tr ' ' "$character"
}

# Help message
display_usage() {
    center_text "Help" "-"
    echo "Usage: ./$0 <branch-name> [options]"
    echo "Options:"
    echo "  --no-check    Bypass the internet connection check."
    echo "  --no-update   Skip git pull and use existing files."
    echo "  --help        Display this help message."
}

# Exit early if --help is requested
if [[ "$option" == "--help" ]]; then
    display_usage
    exit 0
fi

# Ensure branch is provided
if [ "$#" -lt 1 ]; then
    echo "$0 missing branch to launch"
    display_usage
    center_text "fatal error" "-"
    exit 1
fi

center_text "Launching $branch $(date)" "-"

# Handle network check
if [[ "$option" != "--no-check" && "$option" != "--no-update" ]]; then
    if ! check_internet; then
        echo "No internet connection detected. Proceeding without update."
    fi
fi

# Folder setup
REPO_DIR="$DESKTOP_DIR/intervallo-$branch"

if ! cd "$REPO_DIR"; then
    echo "No folder named $REPO_DIR found."
    center_text "fatal error" "-"
    exit 1
fi

# Git update if not skipped
if [[ "$option" != "--no-update" ]]; then
    git init
    git config pull.rebase false
    url="https://www.github.com/Nicolas-M-Wong/intervallo"
    git pull "${url}" "${branch%/}"
fi

# Ensure Makefile is present
if [ ! -f "$REPO_DIR/Makefile" ]; then
    echo "Makefile not found in $REPO_DIR. Aborting."
    exit 1
fi

# Run make
cd "$REPO_DIR"
make clean
make all

# Validate compilation
if [[ ! -f Constant_Trigger.exe || ! -f Variable_Trigger.exe || ! -f server-test ]]; then
    echo "One or more executables are missing after compilation. Exiting."
    center_text "Compilation failed" "-"
    exit 1
fi

# Launch Python server
python3 intervallo-server-2.py

center_text "" "-"
