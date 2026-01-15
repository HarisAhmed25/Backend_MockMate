#!/bin/bash

echo "Starting Python Cheating Detection Service..."
echo ""

# Get the directory where the script is located
cd "$(dirname "$0")"

echo "Checking Python installation..."
python3 --version || python --version || {
    echo "ERROR: Python is not installed or not in PATH"
    exit 1
}

echo ""
echo "Installing/updating dependencies..."
pip3 install -r requirements.txt || pip install -r requirements.txt

echo ""
echo "Starting FastAPI server on http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

python3 run.py || python run.py

