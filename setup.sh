#!/bin/bash

# Dynamic AGV Scheduling System - Setup Script
# This script prepares the system for first-time use

echo "🤖 Dynamic AGV Scheduling System - Setup"
echo "========================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
print_status "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    echo "Please install Node.js (v14 or later) from https://nodejs.org/"
    exit 1
else
    NODE_VERSION=$(node --version)
    print_success "Node.js found: $NODE_VERSION"
fi

# Check if npm is installed
print_status "Checking npm installation..."
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed!"
    echo "Please install npm package manager"
    exit 1
else
    NPM_VERSION=$(npm --version)
    print_success "npm found: $NPM_VERSION"
fi

# Create necessary directories
print_status "Creating output directories..."
mkdir -p output/logs
mkdir -p output/datasets
mkdir -p output/analytics
mkdir -p backend/uploads
print_success "Output directories created"

# Install backend dependencies
print_status "Installing backend dependencies..."
cd backend
if npm install; then
    print_success "Backend dependencies installed successfully"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi
cd ..

# Set executable permissions
print_status "Setting executable permissions..."
chmod +x run_agv_system.sh
chmod +x setup.sh
print_success "Executable permissions set"

# Check if port 5000 is available
print_status "Checking if port 5000 is available..."
if lsof -i:5000 &> /dev/null; then
    print_warning "Port 5000 is already in use. You may need to stop other services or change the port."
else
    print_success "Port 5000 is available"
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Run the system: ./run_agv_system.sh"
echo "2. Open browser: http://localhost:5000"
echo "3. Upload your dataset and start simulation"
echo ""
echo "For more information, see README.md"
