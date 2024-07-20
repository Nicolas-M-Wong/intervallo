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

sleep 10

DESKTOP_DIR=$(xdg-user-dir DESKTOP)
#find the user desktop directory
cd "$DESKTOP_DIR"
#go to desktop
mkdir main
cd main
#go to main

git init
git config pull.rebase false
git pull https://www.github.com/Nicolas-M-Wong/intervallo main

python3 intervallo-server-1.py

center_text "fin" "-"
