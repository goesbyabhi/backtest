#!/bin/bash

echo "Starting Baseline Setup..."

# Ensure we're in the right directory
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo "Error: Please run this script from the root of the project directory (where frontend/ and backend/ exist)."
    exit 1
fi

echo "==================================="
echo "1. Setting up Frontend..."
echo "==================================="
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "Failed to install frontend dependencies. Please check if npm is installed."
    exit 1
fi
echo "Frontend setup complete."
cd ..

echo "==================================="
echo "2. Setting up Backend..."
echo "==================================="
cd backend
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment & installing requirements..."
source venv/bin/activate
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "Failed to install backend dependencies. Please check if python/pip is installed correctly."
    exit 1
fi
echo "Backend setup complete."
cd ..

echo "==================================="
echo "Setup Finished Successfully!"
echo "==================================="
echo "To start the application, run:"
echo "./run.sh"
