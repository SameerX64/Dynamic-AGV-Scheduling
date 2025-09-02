const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/agv_scheduling', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// MongoDB Schemas
const SimulationSchema = new mongoose.Schema({
  simulationId: { type: String, unique: true, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['running', 'completed', 'failed'], default: 'running' },
  totalExecutionTime: Number,
  tasksCompleted: Number,
  totalTasks: Number,
  executionLogs: [String],
  structuredLogs: [{
    time: String,
    event: String,
    agvId: String,
    edge: String,
    batteryRemaining: Number,
    status: String,
    payload: String,
    weight: Number
  }],
  agvStats: [{
    agvId: Number,
    finalPosition: Number,
    batteryRemaining: Number,
    chargeCount: Number,
    province: Number
  }],
  collisionEvents: [{
    time: String,
    agv1: Number,
    agv2: Number,
    location: Number,
    type: String
  }],
  averageDeliveryTimes: mongoose.Schema.Types.Mixed,
  majorDockingStations: [Number],
  provinces: mongoose.Schema.Types.Mixed
});

const TaskSchema = new mongoose.Schema({
  simulationId: String,
  payloadId: String,
  sourceNode: Number,
  destinationNode: Number,
  weight: Number,
  priority: Number,
  timeOfScheduling: Date,
  assignedAGV: Number,
  startTime: Date,
  completionTime: Date,
  deliveryTime: Number,
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed'], default: 'pending' }
});

const Simulation = mongoose.model('Simulation', SimulationSchema);
const Task = mongoose.model('Task', TaskSchema);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads');
    }
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `AGV_Dataset_${timestamp}.xlsx`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Store WebSocket connections and simulation state
const clients = new Set();
let simulationRunning = false;
let currentSimulationId = null;

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New client connected');
  clients.add(ws);
  
  // Send current simulation status to new client
  if (currentSimulationId) {
    ws.send(JSON.stringify({
      type: 'simulation_status',
      data: { 
        running: simulationRunning,
        simulationId: currentSimulationId
      }
    }));
  }
  
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (error) {
      console.error('Invalid WebSocket message:', error);
    }
  });
});

// Broadcast function
function broadcast(message) {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// API Endpoints

// Upload dataset
app.post('/api/upload', upload.single('dataset'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Dataset uploaded:', req.file.filename);
    
    // Create a new simulation record
    const simulationId = `sim_${Date.now()}`;
    const simulation = new Simulation({
      simulationId,
      status: 'pending'
    });
    
    await simulation.save();
    
    res.json({ 
      message: 'Dataset uploaded successfully',
      filename: req.file.filename,
      simulationId
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload dataset' });
  }
});

// Start simulation
app.post('/api/start-simulation', async (req, res) => {
  if (simulationRunning) {
    return res.status(400).json({ error: 'Simulation already running' });
  }

  try {
    const simulationId = `sim_${Date.now()}`;
    currentSimulationId = simulationId;
    simulationRunning = true;

    // Create simulation record
    const simulation = new Simulation({
      simulationId,
      status: 'running'
    });
    await simulation.save();

    broadcast({
      type: 'simulation_started',
      data: { simulationId, timestamp: new Date().toISOString() }
    });

    // Find latest uploaded dataset
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = fs.existsSync(uploadsDir) ? 
      fs.readdirSync(uploadsDir).filter(f => f.endsWith('.xlsx')) : [];
    
    const datasetPath = files.length > 0 ? 
      path.join(uploadsDir, files[files.length - 1]) :
      '../AGV_Hackathon_dataset.xlsx';

    // Start Python simulation process
    const pythonProcess = spawn('python', [
      '../enhanced_agv_scheduler.py'
    ], {
      cwd: __dirname,
      env: { ...process.env, DATASET_PATH: datasetPath, SIMULATION_ID: simulationId }
    });

    let outputBuffer = '';
    let errorBuffer = '';

    pythonProcess.stdout.on('data', async (data) => {
      const output = data.toString();
      outputBuffer += output;
      
      try {
        const lines = output.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.includes('agv_')) {
            // Parse and broadcast AGV movement log
            broadcast({
              type: 'movement_log',
              data: {
                log: line.trim(),
                simulationId,
                timestamp: new Date().toISOString()
              }
            });
          } else if (line.startsWith('Processing')) {
            // Task processing updates
            broadcast({
              type: 'task_update',
              data: {
                message: line.trim(),
                simulationId
              }
            });
          }
        }
      } catch (parseError) {
        console.error('Parse error:', parseError);
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      errorBuffer += data.toString();
      console.error('Python error:', data.toString());
    });

    pythonProcess.on('close', async (code) => {
      console.log(`Python process exited with code ${code}`);
      simulationRunning = false;
      
      try {
        // Read generated files and update database
        const reportsPath = path.join(__dirname, '../simulation_report.json');
        const logsPath = path.join(__dirname, '../execution_logs.txt');
        const structuredLogsPath = path.join(__dirname, '../structured_logs.csv');
        
        let reportData = {};
        let executionLogs = [];
        let structuredLogs = [];
        
        if (fs.existsSync(reportsPath)) {
          reportData = JSON.parse(fs.readFileSync(reportsPath, 'utf8'));
        }
        
        if (fs.existsSync(logsPath)) {
          executionLogs = fs.readFileSync(logsPath, 'utf8')
            .split('\n')
            .filter(line => line.trim());
        }
        
        if (fs.existsSync(structuredLogsPath)) {
          const csv = require('csv-parser');
          const results = [];
          fs.createReadStream(structuredLogsPath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
              structuredLogs = results;
              
              // Update simulation in database
              await Simulation.findOneAndUpdate(
                { simulationId },
                {
                  status: code === 0 ? 'completed' : 'failed',
                  totalExecutionTime: reportData.total_execution_time,
                  tasksCompleted: reportData.tasks_completed,
                  totalTasks: reportData.total_tasks,
                  executionLogs,
                  structuredLogs,
                  agvStats: reportData.agv_stats,
                  collisionEvents: reportData.collision_events,
                  averageDeliveryTimes: reportData.average_delivery_times,
                  majorDockingStations: reportData.major_docking_stations,
                  provinces: reportData.provinces
                }
              );
            });
        } else {
          await Simulation.findOneAndUpdate(
            { simulationId },
            {
              status: code === 0 ? 'completed' : 'failed',
              totalExecutionTime: reportData.total_execution_time,
              tasksCompleted: reportData.tasks_completed,
              totalTasks: reportData.total_tasks,
              executionLogs,
              agvStats: reportData.agv_stats,
              collisionEvents: reportData.collision_events,
              averageDeliveryTimes: reportData.average_delivery_times,
              majorDockingStations: reportData.major_docking_stations,
              provinces: reportData.provinces
            }
          );
        }
        
        broadcast({
          type: 'simulation_complete',
          data: {
            simulationId,
            code,
            message: code === 0 ? 'Simulation completed successfully' : 'Simulation failed',
            reportData,
            timestamp: new Date().toISOString()
          }
        });
        
      } catch (error) {
        console.error('Error updating simulation results:', error);
        await Simulation.findOneAndUpdate(
          { simulationId },
          { status: 'failed' }
        );
      }
    });

    res.json({ 
      message: 'Simulation started successfully',
      simulationId,
      status: 'running'
    });

  } catch (error) {
    console.error('Simulation start error:', error);
    simulationRunning = false;
    res.status(500).json({ error: 'Failed to start simulation' });
  }
});

// Get simulation by ID
app.get('/api/simulation/:id', async (req, res) => {
  try {
    const simulation = await Simulation.findOne({ simulationId: req.params.id });
    if (!simulation) {
      return res.status(404).json({ error: 'Simulation not found' });
    }
    res.json(simulation);
  } catch (error) {
    console.error('Error fetching simulation:', error);
    res.status(500).json({ error: 'Failed to fetch simulation' });
  }
});

// Get all simulations
app.get('/api/simulations', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const simulations = await Simulation.find()
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('simulationId timestamp status totalExecutionTime tasksCompleted totalTasks');
    
    const total = await Simulation.countDocuments();
    
    res.json({
      simulations,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching simulations:', error);
    res.status(500).json({ error: 'Failed to fetch simulations' });
  }
});

// Get reports for a simulation
app.get('/api/reports/:id', async (req, res) => {
  try {
    const simulation = await Simulation.findOne({ simulationId: req.params.id });
    if (!simulation) {
      return res.status(404).json({ error: 'Simulation not found' });
    }
    
    const report = {
      simulationId: simulation.simulationId,
      timestamp: simulation.timestamp,
      totalExecutionTime: simulation.totalExecutionTime,
      tasksCompleted: simulation.tasksCompleted,
      totalTasks: simulation.totalTasks,
      agvStats: simulation.agvStats,
      averageDeliveryTimes: simulation.averageDeliveryTimes,
      majorDockingStations: simulation.majorDockingStations,
      provinces: simulation.provinces,
      collisionEvents: simulation.collisionEvents,
      efficiency: simulation.tasksCompleted / simulation.totalTasks * 100
    };
    
    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// Upload execution logs for visualization
app.post('/api/upload-logs', upload.single('logFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No log file uploaded' });
    }

    const logContent = fs.readFileSync(req.file.path, 'utf8');
    const logs = logContent.split('\n').filter(line => line.trim());
    
    // Parse logs and create simulation record
    const simulationId = `uploaded_${Date.now()}`;
    const simulation = new Simulation({
      simulationId,
      status: 'completed',
      executionLogs: logs,
      timestamp: new Date()
    });
    
    await simulation.save();
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({
      message: 'Logs uploaded successfully',
      simulationId,
      logsCount: logs.length
    });
    
  } catch (error) {
    console.error('Upload logs error:', error);
    res.status(500).json({ error: 'Failed to upload logs' });
  }
});

// Get current simulation status
app.get('/api/status', (req, res) => {
  res.json({
    running: simulationRunning,
    simulationId: currentSimulationId,
    connectedClients: clients.size,
    timestamp: new Date().toISOString()
  });
});

// Get live logs
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

// Delete simulation
app.delete('/api/simulation/:id', async (req, res) => {
  try {
    const result = await Simulation.findOneAndDelete({ simulationId: req.params.id });
    if (!result) {
      return res.status(404).json({ error: 'Simulation not found' });
    }
    res.json({ message: 'Simulation deleted successfully' });
  } catch (error) {
    console.error('Error deleting simulation:', error);
    res.status(500).json({ error: 'Failed to delete simulation' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Enhanced AGV Scheduling Server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await mongoose.connection.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
