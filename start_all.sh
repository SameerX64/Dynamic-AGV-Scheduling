#!/bin/bash
# Start script for AGV Scheduling System

echo "🚀 Starting AGV Scheduling System..."
echo "=================================="

# Set Python environment variable
export PYTHON_PATH="/usr/bin/python3"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
echo "📋 Checking dependencies..."
if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

if ! command_exists python3; then
    echo "❌ Python3 is not installed. Please install Python3 first."
    exit 1
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../Frontend
if [ ! -d "node_modules" ]; then
    npm install
fi

# Create uploads directory if it doesn't exist
cd backend
mkdir -p uploads

# Start backend server
echo "🔧 Starting backend server..."
node server.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Check if backend is running
if curl -s http://localhost:3000/api/status > /dev/null; then
    echo "✅ Backend server is running on http://localhost:3000"
else
    echo "❌ Backend server failed to start"
    exit 1
fi

# Start frontend server
echo "🎨 Starting frontend server..."
cd ../Frontend
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 5

echo ""
echo "🎉 AGV Scheduling System is now running!"
echo "=================================="
echo "🔧 Backend API: http://localhost:3000"
echo "🎨 Frontend UI: http://localhost:5177 (or check terminal output for actual port)"
echo "📊 Upload your Excel dataset file to start simulation"
echo ""
echo "⚡ To stop the servers, press Ctrl+C or run: ./stop.sh"
echo ""

# Keep the script running
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
