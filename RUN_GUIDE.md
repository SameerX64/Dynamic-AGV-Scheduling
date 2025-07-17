# 🚀 AGV Scheduling System - Complete Running Guide

## 🎯 System Overview
This AGV (Automated Guided Vehicle) scheduling system consists of three main components:
1. **Frontend** - React-based web interface with AGV visualization (Port 5177)
2. **Backend** - Node.js API server with WebSocket support (Port 3000)
3. **AGV Algorithm** - Python-based scheduling logic with pathfinding

## 📋 Prerequisites
- **Node.js** (v18 or higher) - `node --version`
- **npm** (comes with Node.js) - `npm --version`
- **Python 3.8+** - `python3 --version`

## 🚀 Quick Start (Recommended)

### 1. Make Scripts Executable
```bash
chmod +x start_all.sh stop_all.sh
```

### 2. Start the System
```bash
./start_all.sh
```

### 3. Access the Application
- **Frontend UI**: http://localhost:5177 (or check terminal output for actual port)
- **Backend API**: http://localhost:3000

### 4. Stop the System
```bash
./stop_all.sh
```

## 📖 Manual Setup (Alternative)

### Step 1: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 2: Install Frontend Dependencies
```bash
cd ../Frontend
npm install
```

### Step 3: Start Backend Server
```bash
cd ../backend
export PYTHON_PATH="/usr/bin/python3"
node server.js
```

### Step 4: Start Frontend Server (New Terminal)
```bash
cd Frontend
npm run dev
```

## 🔧 Configuration

### Python Path Configuration
The system uses an environment variable for Python path:
```bash
export PYTHON_PATH="/usr/bin/python3"
```

### Port Configuration
- **Backend**: Port 3000 (configurable in backend/server.js)
- **Frontend**: Port 5177 (automatically assigned by Vite)

## 📊 How to Use

### 1. Upload Dataset
- Open the frontend interface
- Click "Upload Excel File"
- Select your AGV dataset file (Excel format)

### 2. Start Simulation
- After upload, click "Start Simulation"
- Watch AGV movements in real-time
- Monitor performance metrics

### 3. Control Simulation
- **Pause/Resume**: Control simulation flow
- **Stop**: End current simulation
- **Speed**: Adjust simulation speed

## 📁 Project Structure
```
Dynamic-AGV-Scheduling-main/
├── Frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── utils/         # Utility functions
│   │   └── App.jsx        # Main application
│   └── package.json
├── backend/               # Node.js backend
│   ├── server.js          # Main server file
│   ├── uploads/           # File upload directory
│   └── package.json
├── agv1.py               # AGV scheduling algorithm
├── start_all.sh          # Start script
├── stop_all.sh           # Stop script
└── RUN_GUIDE.md          # This file
```

## 🔍 API Endpoints

### Backend API (Port 3000)
- **GET** `/api/status` - Server status
- **POST** `/api/upload` - Upload dataset file
- **WebSocket** `/` - Real-time communication

### Frontend Routes (Port 5177)
- **/** - Main application interface

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**
   - Frontend will automatically find available port
   - Backend: Change port in server.js

2. **Python Path Issues**
   - Ensure Python3 is installed
   - Update PYTHON_PATH environment variable

3. **Dependencies Missing**
   - Run `npm install` in both frontend and backend directories

4. **Upload Directory Missing**
   - Backend automatically creates uploads/ directory

### Error Messages

- **"Python executable not found"**
  - Solution: Install Python3 or update PYTHON_PATH

- **"EADDRINUSE: address already in use"**
  - Solution: Stop other processes using the port

- **"Module not found"**
  - Solution: Run `npm install` in the respective directory

## 🧪 Testing

### Backend Test
```bash
curl http://localhost:3000/api/status
```
Expected response: `{"status":"running","connectedClients":0,"timestamp":"..."}`

### Frontend Test
Open browser to http://localhost:5177

## 🎨 Features

### Frontend Features
- Real-time AGV visualization
- Interactive graph-based layout
- File upload interface
- Simulation controls
- Performance monitoring

### Backend Features
- RESTful API
- WebSocket support
- File upload handling
- Python process management
- CORS enabled

### AGV Algorithm Features
- Dijkstra pathfinding
- Battery management
- Collision avoidance
- Task scheduling
- Performance optimization

## 🔒 Security Notes
- Backend enables CORS for development
- File uploads are stored in uploads/ directory
- WebSocket connections are monitored

## 📚 Development

### Frontend Development
```bash
cd Frontend
npm run dev    # Development server
npm run build  # Production build
```

### Backend Development
```bash
cd backend
node server.js  # Start server
```

### Python Algorithm
```bash
python3 agv1.py  # Run algorithm directly
```

## 🤝 Contributing
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License
This project is ready for GitHub upload and open-source distribution.

---

**🎉 You're all set! The AGV Scheduling System is now running successfully!**
