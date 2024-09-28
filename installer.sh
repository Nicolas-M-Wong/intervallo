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

display_usage() {
    center_text "Help" "-"
    echo "Usage: ./$0 <branch-name> [options]"
    echo "Options:"
    echo "  --no-check    Bypass the internet connection check."
    echo "  --help        Display this help message."
    echo ""
    echo "If you use --no-check, the script will skip checking for an internet connection."
    echo "Use this command if you are connected with a very slow internet (<10kbs) but still need an update"
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
    echo "$3 already exists in $DIR."
fi
}

branch="$1"
option="$2"
if [ "$#" -lt 1 ]; then
    echo "$0 missing branch to install"
    echo "Usage: $0 <branch_name> [option]"
    exit 1
fi

if [[ "$option" == "--help" ]]; then
    display_usage
    exit 0
# Check for the '--no-check' argument to bypass internet check
elif [[ "$option" == "--no-check" ]]; then
    center_text "Installing $branch $(date)" "-"
    echo "Bypassing internet connection check"
else
    center_text "Installing $branch $(date)" "-"
    # Check internet connection
    if ! check_internet; then
        echo "No internet connection detected."
        echo "You can bypass this check by using the '--no-check' argument when running the script."
        echo "Example: ./installer.sh main --no-check"
        exit 1  # Early exit if no internet and no bypass argument
    fi
fi

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

compiler_request "$DIR/Constant_Trigger.exe" "$DIR/Compiler.sh" "Constant_Trigger"
compiler_request "$DIR/Variable_Trigger.exe" "$DIR/Compiler.sh" "Variable_Trigger"

DESKTOP_FOLDER=$(xdg-user-dir DESKTOP)
mv "$DIR/launcher.sh" "$DESKTOP_FOLDER/launcher-$branch.sh" 
chmod +x "$DESKTOP_FOLDER/launcher-$branch.sh"

center_text "Installation finished" "-"
"$DESKTOP_FOLDER/launcher-$branch.sh" "$branch" "--no-update"
