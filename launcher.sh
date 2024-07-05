#!/bin/bash

sleep 10

# Find the most recent script.py file
SCRIPT_PATH=$(find / -type f -name intervallo-server-1.py -printf '%T@ %p\n' 2>/dev/null | sort -n -r | head -n 1 | cut -d' ' -f2-)

# Check if the script was found
if [ -z "$SCRIPT_PATH" ]; then
    echo "server not found!"
    exit 1
fi

# Launch the most recent script.py with python3
python3 "$SCRIPT_PATH"

