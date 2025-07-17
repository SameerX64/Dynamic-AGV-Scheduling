#!/bin/bash
# Stop script for AGV Scheduling System

echo "🛑 Stopping AGV Scheduling System..."

# Find and kill backend processes
echo "Stopping backend server..."
pkill -f "node server.js"

# Find and kill frontend processes
echo "Stopping frontend server..."
pkill -f "npm run dev"
pkill -f "vite"

# Wait a moment for processes to stop
sleep 2

echo "✅ AGV Scheduling System stopped."
