#!/bin/bash
# Determine terminal width

check_internet() {
    # Use curl to check if we can reach google.com with a short timeout (0.5 seconds)
    curl -s --head --connect-timeout 1 https://www.google.com > /dev/null 2>&1
    return $?
}

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

if ! check_internet; then
    echo "No internet connection detected, unable to install the program"
    exit 1  # Early exit if no internet
    #Be aware, a very slow internet connexion ~10kbs might prevent you from launching the installer
fi

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
chmod +x "$DESKTOP_FOLDER/launcher-$1.sh"

center_text "Installation finished" "-"
"$DESKTOP_FOLDER/./launcher-$1.sh" "$1"
