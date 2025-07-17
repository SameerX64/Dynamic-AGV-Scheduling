const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, 'AGV_Dataset.xlsx');
  }
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const upload = multer({ storage });

// Store WebSocket connections
const clients = new Set();

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New client connected');
  clients.add(ws);
  
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Broadcast message to all connected clients
function broadcast(message) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// API Routes
app.post('/upload', upload.single('dataset'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Dataset uploaded successfully:', req.file.filename);
    res.json({ 
      message: 'Dataset uploaded successfully',
      filename: req.file.filename 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.post('/start-simulation', (req, res) => {
  try {
    console.log('Starting AGV simulation...');
    
    // Start the Python AGV scheduling algorithm
    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const pythonProcess = spawn(pythonPath, ['../agv1.py'], {
      cwd: __dirname
    });

    let simulationRunning = true;

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Python output:', output);
      
      // Parse the output and broadcast to clients
      try {
        const lines = output.split('\n').filter(line => line.trim());
        lines.forEach(line => {
          if (line.includes('agv_')) {
            // Parse AGV movement log
            const [agv, from, to, time, weight, payload] = line.split('-');
            broadcast({
              type: 'log',
              data: line.trim()
            });
          } else if (line.startsWith('{')) {
            // Parse JSON summary data
            const summaryData = JSON.parse(line);
            broadcast({
              type: 'summary',
              data: summaryData
            });
          }
        });
      } catch (parseError) {
        console.error('Parse error:', parseError);
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error('Python error:', data.toString());
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
      simulationRunning = false;
      broadcast({
        type: 'simulation_complete',
        data: { code, message: 'Simulation completed' }
      });
    });

    res.json({ 
      message: 'Simulation started successfully',
      status: 'running' 
    });
  } catch (error) {
    console.error('Simulation start error:', error);
    res.status(500).json({ error: 'Failed to start simulation' });
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    connectedClients: clients.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/logs', (req, res) => {
  try {
    const logsPath = path.join(__dirname, '../execution_logs.txt');
    if (fs.existsSync(logsPath)) {
      const logs = fs.readFileSync(logsPath, 'utf8');
      res.json({
        logs: logs.split('\n').filter(line => line.trim()),
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({ logs: [], message: 'No logs available' });
    }
  } catch (error) {
    console.error('Error reading logs:', error);
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`AGV Scheduling Server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
