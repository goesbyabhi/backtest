#!/bin/bash

echo "Starting Backtest Trading App..."

# Function to clean up background processes on exit
cleanup() {
    echo "Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# Start the Node/Vite frontend
echo "Starting frontend (Vite)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Start the Python/Uvicorn backend
echo "Starting backend (FastAPI)..."
cd backend
source venv/bin/activate
uvicorn main:app --reload &
BACKEND_PID=$!
cd ..

echo "Both services are running!"
echo "Frontend: http://localhost:5173"
echo "Backend: http://127.0.0.1:8000"
echo "Press Ctrl+C to stop both."

# Wait for background processes to finish (or until user presses Ctrl+C)
wait
