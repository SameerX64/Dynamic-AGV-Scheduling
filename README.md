# 🚀 Dynamic AGV Scheduling System

A comprehensive Automated Guided Vehicle (AGV) scheduling system with real-time visualization, intelligent pathfinding, and collision avoidance.

## 🎯 Features

### 🔧 Core Functionality
- **Real-time AGV Scheduling** - Dynamic task allocation and path planning
- **Intelligent Pathfinding** - Dijkstra algorithm implementation
- **Collision Avoidance** - Prevents AGV conflicts in shared spaces
- **Battery Management** - Monitors and optimizes AGV battery usage
- **Performance Monitoring** - Real-time metrics and analytics

### 🎨 User Interface
- **Interactive Visualization** - Live AGV movement tracking
- **Graph-based Layout** - Node and edge network representation
- **File Upload Interface** - Excel dataset support
- **Simulation Controls** - Start, pause, resume, stop functionality
- **Modern UI** - Built with React and TailwindCSS

### 🔌 Technology Stack
- **Frontend**: React 19, ReactFlow, TailwindCSS, Vite
- **Backend**: Node.js, Express, WebSocket, Multer
- **Algorithm**: Python 3, Pandas, NumPy
- **Real-time Communication**: WebSocket integration

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- Python 3.8+
- npm

### Installation & Running
```bash
# Clone the repository
git clone https://github.com/yourusername/Dynamic-AGV-Scheduling.git
cd Dynamic-AGV-Scheduling

# Make scripts executable
chmod +x start_all.sh stop_all.sh

# Start the system
./start_all.sh

# Access the application
# Frontend: http://localhost:5177
# Backend API: http://localhost:3000
```

### Stop the System
```bash
./stop_all.sh
```

## 📊 Usage

1. **Upload Dataset**: Upload your Excel file with AGV task data
2. **Start Simulation**: Begin real-time AGV scheduling
3. **Monitor Performance**: Track AGV movements and metrics
4. **Control Simulation**: Pause, resume, or stop as needed

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │  AGV Algorithm  │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Python)      │
│   Port 5177     │    │   Port 3000     │    │   agv1.py       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Frontend (React + Vite)
- **React 19** with modern hooks
- **ReactFlow** for interactive node-based visualization
- **TailwindCSS** for styling
- **WebSocket** for real-time updates

### Backend (Node.js + Express)
- **Express.js** REST API
- **WebSocket** server for real-time communication
- **Multer** for file uploads
- **CORS** enabled for cross-origin requests

### AGV Scheduling Algorithm (Python)
- **Dijkstra's Algorithm** for shortest path calculation
- **Priority-based Task Assignment**
- **Battery Management System**
- **Collision Avoidance**
- **Resource Reservation System**

## 📁 Project Structure

```
Dynamic-AGV-Scheduling/
├── Frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── utils/           # Utility functions
│   │   └── App.jsx          # Main application component
│   ├── package.json
│   └── vite.config.js
├── backend/                 # Node.js backend server
│   ├── server.js           # Main server file
│   ├── uploads/            # File upload directory
│   └── package.json
├── agv1.py                 # AGV scheduling algorithm
├── AGV_Hackathon_dataset.xlsx # Sample dataset
├── start_all.sh            # System startup script
├── stop_all.sh             # System shutdown script
├── requirements.txt        # Python dependencies
├── README.md               # This file
└── RUN_GUIDE.md            # Detailed setup guide
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

## 🧪 Testing

### Backend API Test
```bash
curl http://localhost:3000/api/status
```
Expected response: `{"status":"running","connectedClients":0,"timestamp":"..."}`

### Frontend Test
Navigate to http://localhost:5177 in your browser

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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

*This project was developed for the Dynamic AGV Scheduling Hackathon*
