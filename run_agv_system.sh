#!/bin/bash

# Optimized AGV System Runner
# Date: September 2, 2025

echo "=== Optimized AGV System ==="
echo "Starting at: $(date)"
echo "============================"

# Set working directory
cd /home/sameer/Desktop/project/dynamic

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create minimal output directories
echo -e "${BLUE}Setting up output directories...${NC}"
mkdir -p output/logs output/datasets output/analytics

# Function to cleanup on exit
cleanup() {
    echo -e "\nShutting down AGV system..."
    pkill -f "node.*server.js" 2>/dev/null
    echo -e "${GREEN}AGV system shutdown complete.${NC}"
    exit 0
}

# Set trap for cleanup on exit
trap cleanup SIGINT SIGTERM EXIT

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

# Install backend dependencies if needed
echo -e "${BLUE}Checking backend dependencies...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Failed to install dependencies"
        exit 1
    fi
fi

# Start the backend server
echo -e "${GREEN}Starting Optimized AGV Backend...${NC}"
node server.js &
BACKEND_PID=$!

# Wait for server to start
sleep 3

# Check if backend is running
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${GREEN}✓ Backend server running on port 5000${NC}"
    echo -e "${GREEN}✓ Monitoring: http://localhost:5000${NC}"
    echo -e "${GREEN}✓ Essential logging active${NC}"
    echo -e "\n${BLUE}Output Files:${NC}"
    echo -e "  📝 logs/system.log"
    echo -e "  📊 datasets/agv_data.csv"
    echo -e "  📈 datasets/performance.csv"
    echo -e "  🔧 analytics/analytics.json"
    echo -e "\nPress Ctrl+C to shutdown"
else
    echo "Failed to start backend server"
    exit 1
fi

# Keep running
wait $BACKEND_PID
