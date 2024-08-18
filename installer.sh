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
    
branch="$1"

if [ "$#" -lt 1 ]; then
    echo "$0 missing branch to install"
    exit 1
fi

center_text "Installing $1 $(date)" "-"

DESKTOP_DIR=$(xdg-user-dir DESKTOP)
#find the user desktop directory
REPO="intervallo-$1"
cd "$DESKTOP_DIR"
#go to desktop
mkdir $REPO
cd $REPO

git init
git config pull.rebase false
url="https://www.github.com/Nicolas-M-Wong/intervallo"
git pull "${url}" "${branch%/}"

DIR=$(xdg-user-dir DESKTOP)/$REPO

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
DESKTOP_FOLDER=$(xdg-user-dir DESKTOP)
mv "$DIR/launcher.sh" "$DESKTOP_FOLDER/launcher-$1.sh"

center_text "Installation finished" "-"
sh "$DESKTOP_FOLDER/launcher-$1.sh" "$1"