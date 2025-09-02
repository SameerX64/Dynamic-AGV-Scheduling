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

// Enhanced Logging System - Optimized
const logDir = path.join(__dirname, '../output/logs');
const dataDir = path.join(__dirname, '../output/datasets');
const analyticsDir = path.join(__dirname, '../output/analytics');

// Ensure directories exist
[logDir, dataDir, analyticsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Optimized logging functions - Only essential logs
function logToFile(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${type}: ${message}\n`;
  const logFile = path.join(logDir, 'system.log');
  
  try {
    fs.appendFileSync(logFile, logEntry);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
  console.log(`${type}: ${message}`);
}

function logToCSV(data, filename) {
  try {
    const csvFile = path.join(dataDir, filename);
    const csvLine = Object.values(data).join(',') + '\n';
    fs.appendFileSync(csvFile, csvLine);
  } catch (err) {
    console.error('Failed to write to CSV file:', err);
  }
}

// Function to log execution in required format
function logExecution(executionLog) {
  const logEntry = `[${new Date().toISOString()}] EXECUTION: ${executionLog}\n`;
  const executionFile = path.join(logDir, 'execution.log');
  
  try {
    fs.appendFileSync(executionFile, logEntry);
  } catch (err) {
    console.error('Failed to write execution log:', err);
  }
  
  logToFile(`Execution logged: ${executionLog}`, 'EXECUTION');
}

// Initialize system logging
logToFile('AGV Backend Server initialized', 'SYSTEM');

// Essential files only - 4 output files (added execution.log)
const agvDataFile = 'agv_data.csv';
const performanceFile = 'performance.csv';
const analyticsFile = 'analytics.json';
const executionLogFile = 'execution.log';

// Initialize CSV files with headers (only essential data)
try {
  fs.writeFileSync(path.join(dataDir, agvDataFile), 
    'timestamp,agv_id,algorithm,position,battery,status,efficiency\n');
  fs.writeFileSync(path.join(dataDir, performanceFile), 
    'timestamp,metric_type,value,details\n');
  
  // Initialize execution log file
  fs.writeFileSync(path.join(logDir, executionLogFile), 
    '# AGV Execution Logs - Format: agv_{num}-{start_node}-{end_node}-{HH:MM:SS}-{weight}-payload_{num}\n');
} catch (err) {
  console.error('Failed to initialize log files:', err);
}

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

// Simple AGV system state for backend-only mode
const systemState = {
  agvs: {
    AGV1: { id: 'AGV1', position: 1, battery: 100, status: 'idle', algorithm: 'A*' },
    AGV2: { id: 'AGV2', position: 5, battery: 85, status: 'idle', algorithm: 'Dijkstra+TimeWindow' },
    AGV3: { id: 'AGV3', position: 9, battery: 92, status: 'idle', algorithm: 'ACO' }
  },
  tasks: [],
  isRunning: false,
  totalTasksCompleted: 0,
  systemEfficiency: 100
};

// Enhanced simulation state management
let simulationInterval = null;
let autoTaskInterval = null;

// Node graph for pathfinding (9-node grid) - NO DIAGONALS, only horizontal/vertical
const nodeGraph = {
  1: [2, 4],        // Node 1 connects to 2 (right), 4 (down)
  2: [1, 3, 5],     // Node 2 connects to 1 (left), 3 (right), 5 (down)
  3: [2, 6],        // Node 3 connects to 2 (left), 6 (down)
  4: [1, 5, 7],     // Node 4 connects to 1 (up), 5 (right), 7 (down)
  5: [2, 4, 6, 8],  // Node 5 connects to 2 (up), 4 (left), 6 (right), 8 (down)
  6: [3, 5],        // Node 6 connects to 3 (up), 5 (left)
  7: [4, 8],        // Node 7 connects to 4 (up), 8 (right)
  8: [5, 7, 9],     // Node 8 connects to 5 (up), 7 (left), 9 (right)
  9: [8]            // Node 9 connects to 8 (left) - CHARGING STATION (isolated)
};

// Charging configuration
const CHARGING_NODE = 9;
const LOW_BATTERY_THRESHOLD = 30;
const CHARGING_RATE = 5; // Battery points per charging cycle
const MAX_BATTERY = 100;

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('🔌 New client connected');
  logToFile('WebSocket client connected', 'CONNECTION');
  clients.add(ws);
  
  // Send current system state to new client
  ws.send(JSON.stringify({
    type: 'initialState',
    state: systemState
  }));
  
  ws.on('close', () => {
    console.log('🔌 Client disconnected');
    logToFile('WebSocket client disconnected', 'CONNECTION');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('🔌 WebSocket error:', error);
    logToFile(`WebSocket error: ${error.message}`, 'ERROR');
    clients.delete(ws);
  });
});

// Enhanced broadcast function with error handling
function broadcast(message) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
      } catch (err) {
        logToFile(`Broadcast error: ${err.message}`, 'ERROR');
      }
    }
  });
}

// Enhanced pathfinding with A* algorithm (no diagonals)
function findPath(start, end) {
  if (start === end) return [start];
  
  const visited = new Set();
  const queue = [[start, [start]]];
  
  while (queue.length > 0) {
    const [current, path] = queue.shift();
    
    if (current === end) {
      return path;
    }
    
    if (visited.has(current)) continue;
    visited.add(current);
    
    const neighbors = nodeGraph[current] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push([neighbor, [...path, neighbor]]);
      }
    }
  }
  
  return [start, end]; // Direct path if no route found
}

// Check if AGV needs charging
function needsCharging(agv) {
  return agv.battery <= LOW_BATTERY_THRESHOLD;
}

// Create charging task for AGV
function createChargingTask(agvId) {
  const agv = systemState.agvs[agvId];
  if (!agv || agv.status !== 'idle') return null;
  
  if (agv.position === CHARGING_NODE) {
    // Already at charging station, start charging
    startCharging(agvId);
    return null;
  }
  
  // Create task to go to charging station
  const timestamp = new Date();
  const timeStr = timestamp.toTimeString().split(' ')[0];
  const agvNum = agvId.slice(-1);
  const executionLog = `agv_${agvNum}-${agv.position}-${CHARGING_NODE}-${timeStr}-0-charging`;
  
  const chargingTask = {
    id: Date.now(),
    startNode: agv.position,
    endNode: CHARGING_NODE,
    weight: 0,
    priority: 'charging',
    agvId: agvId,
    payloadNum: 0,
    executionLog: executionLog,
    status: 'executing',
    createdAt: Date.now(),
    isCharging: true
  };
  
  agv.status = 'charging_route';
  systemState.tasks.push(chargingTask);
  
  logToFile(`Charging task created: ${executionLog}`, 'CHARGING');
  
  // Find path and start movement to charging station
  const path = findPath(agv.position, CHARGING_NODE);
  simulateAGVMovement(agvId, path, executionLog, true);
  
  broadcast({
    type: 'chargingTaskCreated',
    task: chargingTask,
    path,
    state: systemState
  });
  
  return chargingTask;
}

// Start charging process at node 9
function startCharging(agvId) {
  const agv = systemState.agvs[agvId];
  if (!agv || agv.position !== CHARGING_NODE) return;
  
  agv.status = 'charging';
  logToFile(`AGV ${agvId} started charging at node ${CHARGING_NODE}`, 'CHARGING');
  
  // Charging process
  const chargingInterval = setInterval(() => {
    if (agv.battery < MAX_BATTERY) {
      agv.battery = Math.min(MAX_BATTERY, agv.battery + CHARGING_RATE);
      
      broadcast({
        type: 'agvCharging',
        agvId: agvId,
        battery: agv.battery,
        position: agv.position
      });
      
      logToFile(`AGV ${agvId} charging: ${agv.battery}%`, 'CHARGING');
    } else {
      // Charging complete
      clearInterval(chargingInterval);
      agv.status = 'idle';
      logToFile(`AGV ${agvId} charging complete: 100%`, 'CHARGING');
      
      broadcast({
        type: 'chargingComplete',
        agvId: agvId,
        battery: agv.battery,
        position: agv.position
      });
    }
  }, 2000); // Charge every 2 seconds
}

// Global movement coordinator for collision detection
let globalMovementState = {
  occupiedNodes: new Set(), // Nodes currently occupied by AGVs
  reservedNodes: new Map(), // Nodes reserved for next moves: nodeId -> agvId
  movementQueue: new Map(), // agvId -> {path, currentIndex, executionLog, isChargingTask}
  movementInterval: null
};

// Initialize AGV positions in global state
function initializeGlobalMovement() {
  globalMovementState.occupiedNodes.clear();
  globalMovementState.reservedNodes.clear();
  
  // Mark initial AGV positions as occupied
  Object.values(systemState.agvs).forEach(agv => {
    globalMovementState.occupiedNodes.add(agv.position);
  });
}

// Coordinated movement system - all AGVs move simultaneously
function startGlobalMovementCoordinator() {
  if (globalMovementState.movementInterval) {
    clearInterval(globalMovementState.movementInterval);
  }
  
  globalMovementState.movementInterval = setInterval(() => {
    coordinateSimultaneousMovement();
  }, 2000); // Move every 2 seconds for better visualization
}

function stopGlobalMovementCoordinator() {
  if (globalMovementState.movementInterval) {
    clearInterval(globalMovementState.movementInterval);
    globalMovementState.movementInterval = null;
  }
}

// Coordinate simultaneous movement of all AGVs
function coordinateSimultaneousMovement() {
  const movementsToExecute = [];
  globalMovementState.reservedNodes.clear();
  
  // Plan all movements first
  for (const [agvId, movementData] of globalMovementState.movementQueue.entries()) {
    const { path, currentIndex, executionLog, isChargingTask } = movementData;
    
    if (currentIndex + 1 >= path.length) {
      // Task completed
      const agv = systemState.agvs[agvId];
      if (agv) {
        completeAGVTask(agvId, path[path.length - 1], executionLog, isChargingTask);
      }
      globalMovementState.movementQueue.delete(agvId);
      continue;
    }
    
    const nextPosition = path[currentIndex + 1];
    const currentPosition = path[currentIndex];
    
    // Check for collisions
    if (!globalMovementState.occupiedNodes.has(nextPosition) && 
        !globalMovementState.reservedNodes.has(nextPosition)) {
      
      // Reserve the next position
      globalMovementState.reservedNodes.set(nextPosition, agvId);
      
      movementsToExecute.push({
        agvId,
        from: currentPosition,
        to: nextPosition,
        isChargingTask,
        newIndex: currentIndex + 1
      });
    }
    // If collision detected, AGV waits (doesn't move this cycle)
  }
  
  // Execute all planned movements simultaneously
  movementsToExecute.forEach(movement => {
    const agv = systemState.agvs[movement.agvId];
    if (agv) {
      // Update global occupied nodes
      globalMovementState.occupiedNodes.delete(movement.from);
      globalMovementState.occupiedNodes.add(movement.to);
      
      // Update AGV position and battery
      agv.position = movement.to;
      
      // Realistic battery drain
      if (!movement.isChargingTask) {
        agv.battery = Math.max(10, agv.battery - 3);
      } else {
        agv.battery = Math.max(10, agv.battery - 1);
      }
      
      // Update movement queue
      const movementData = globalMovementState.movementQueue.get(movement.agvId);
      if (movementData) {
        movementData.currentIndex = movement.newIndex;
      }
      
      // Broadcast movement
      broadcast({
        type: 'agvMovement',
        agvId: movement.agvId,
        position: agv.position,
        battery: agv.battery,
        isChargingRoute: movement.isChargingTask,
        waitedForCollision: false
      });
    }
  });
  
  // Broadcast collision events for AGVs that couldn't move
  for (const [agvId, movementData] of globalMovementState.movementQueue.entries()) {
    if (!movementsToExecute.some(m => m.agvId === agvId)) {
      broadcast({
        type: 'agvWaiting',
        agvId: agvId,
        reason: 'collision_avoidance',
        position: systemState.agvs[agvId]?.position
      });
    }
  }
}

// Complete AGV task
function completeAGVTask(agvId, finalPosition, executionLog, isChargingTask) {
  const agv = systemState.agvs[agvId];
  if (!agv) return;
  
  agv.position = finalPosition;
  
  if (isChargingTask && agv.position === CHARGING_NODE) {
    // Start charging process
    startCharging(agvId);
  } else {
    agv.status = 'idle';
    systemState.totalTasksCompleted++;
    
    // Check if AGV needs charging after completing task
    if (needsCharging(agv) && agv.position !== CHARGING_NODE) {
      setTimeout(() => createChargingTask(agvId), 1000);
    }
  }
  
  logToFile(`Task completed: ${executionLog}`, 'COMPLETION');
  broadcast({
    type: 'taskCompleted',
    agvId: agvId,
    position: agv.position,
    executionLog: executionLog,
    isChargingTask: isChargingTask,
    state: systemState
  });
}

// Enhanced AGV movement with collision detection
function simulateAGVMovement(agvId, path, executionLog, isChargingTask = false) {
  if (path.length <= 1) return;
  
  // Add to global movement queue
  globalMovementState.movementQueue.set(agvId, {
    path: path,
    currentIndex: 0,
    executionLog: executionLog,
    isChargingTask: isChargingTask
  });
  
  // Update AGV status
  const agv = systemState.agvs[agvId];
  if (agv) {
    agv.status = isChargingTask ? 'charging_route' : 'busy';
    agv.position = path[0]; // Set to start position
    
    // Update global occupied nodes
    globalMovementState.occupiedNodes.add(path[0]);
  }
}

// Auto-generate tasks during simulation
function generateAutoTask() {
  if (!systemState.isRunning) return;
  
  const startNode = Math.floor(Math.random() * 9) + 1;
  let endNode = Math.floor(Math.random() * 9) + 1;
  while (endNode === startNode) {
    endNode = Math.floor(Math.random() * 9) + 1;
  }
  
  const weight = Math.floor(Math.random() * 50) + 10;
  const priorities = ['high', 'medium', 'low'];
  const priority = priorities[Math.floor(Math.random() * priorities.length)];
  
  // Create auto task
  createTaskInternal(startNode, endNode, weight, priority, true);
}

// Internal task creation function with charging logic
function createTaskInternal(startNode, endNode, weight, priority, isAuto = false) {
  // Find available AGV (not charging or on charging route)
  const availableAGVs = Object.values(systemState.agvs).filter(agv => 
    agv.status === 'idle' && !needsCharging(agv)
  );
  
  if (availableAGVs.length === 0) {
    // Check if any AGVs need charging
    const agvsNeedingCharge = Object.values(systemState.agvs).filter(agv => 
      agv.status === 'idle' && needsCharging(agv)
    );
    
    agvsNeedingCharge.forEach(agv => {
      createChargingTask(agv.id);
    });
    
    return { success: false, error: 'No available AGV - some sent for charging' };
  }
  
  // Select AGV with best battery/position
  const selectedAGV = availableAGVs.reduce((best, current) => {
    return current.battery > best.battery ? current : best;
  });
  
  // Generate execution log
  const timestamp = new Date();
  const timeStr = timestamp.toTimeString().split(' ')[0]; // HH:MM:SS format
  const payloadNum = Math.floor(Math.random() * 1000);
  const agvNum = selectedAGV.id.slice(-1); // Extract number from AGV1, AGV2, etc.
  const executionLog = `agv_${agvNum}-${startNode}-${endNode}-${timeStr}-${weight}-payload_${payloadNum}`;
  
  // Create task
  const task = {
    id: Date.now(),
    startNode,
    endNode,
    weight,
    priority,
    agvId: selectedAGV.id,
    payloadNum,
    executionLog,
    status: 'executing',
    createdAt: Date.now(),
    isAuto: isAuto
  };
  
  // Update AGV status
  selectedAGV.status = 'busy';
  selectedAGV.position = startNode;
  
  // Add to tasks
  systemState.tasks.push(task);
  
  // Log execution
  logExecution(executionLog);
  const logType = isAuto ? 'AUTO_TASK' : 'TASK';
  const logMessage = isAuto ? 
    `Auto-generated task: ${executionLog}` : 
    `Task created: ${selectedAGV.id} from ${startNode} to ${endNode}`;
  logToFile(logMessage, logType);
  
  // Find path and start movement simulation
  const path = findPath(startNode, endNode);
  simulateAGVMovement(selectedAGV.id, path, executionLog, false);
  
  // Broadcast task creation
  broadcast({ 
    type: 'taskCreated', 
    task, 
    path,
    state: systemState 
  });
  
  return { success: true, task, executionLog };
}

// Serve enhanced monitoring dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Enhanced API Routes with Optimized Logging
app.get('/api/status', (req, res) => {
  logToFile('System status requested', 'API');
  
  // Log only essential AGV data to CSV
  Object.values(systemState.agvs).forEach(agv => {
    const csvData = {
      timestamp: new Date().toISOString(),
      agv_id: agv.id,
      algorithm: agv.algorithm,
      position: agv.position,
      battery: agv.battery,
      status: agv.status,
      efficiency: 100
    };
    logToCSV(csvData, agvDataFile);
  });
  
  res.json(systemState);
});

app.post('/api/simulation/start', (req, res) => {
  systemState.isRunning = true;
  logToFile('Simulation started with collision detection', 'SIMULATION');
  
  // Initialize global movement coordination
  initializeGlobalMovement();
  startGlobalMovementCoordinator();
  
  // Start auto-task generation every 15 seconds (slower to see movement better)
  if (autoTaskInterval) clearInterval(autoTaskInterval);
  autoTaskInterval = setInterval(generateAutoTask, 15000);
  
  // Start periodic status updates
  if (simulationInterval) clearInterval(simulationInterval);
  simulationInterval = setInterval(() => {
    logToFile(`Status: Running=${systemState.isRunning}, AGVs=${Object.keys(systemState.agvs).length}, Active movements=${globalMovementState.movementQueue.size}`, 'STATUS');
  }, 120000); // Every 2 minutes
  
  broadcast({ type: 'simulationStarted', state: systemState });
  res.json({ success: true, message: '🚀 Simulation started with collision detection and simultaneous movement' });
});

app.post('/api/simulation/stop', (req, res) => {
  systemState.isRunning = false;
  
  // Stop all intervals
  if (autoTaskInterval) {
    clearInterval(autoTaskInterval);
    autoTaskInterval = null;
  }
  
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  
  // Stop global movement coordinator
  stopGlobalMovementCoordinator();
  
  // Clear movement queue
  globalMovementState.movementQueue.clear();
  globalMovementState.occupiedNodes.clear();
  globalMovementState.reservedNodes.clear();
  
  // Set all AGVs to idle and reset positions
  Object.values(systemState.agvs).forEach(agv => {
    agv.status = 'idle';
  });
  
  logToFile('Simulation stopped', 'SIMULATION');
  broadcast({ type: 'simulationStopped', state: systemState });
  res.json({ success: true, message: '⏹️ Simulation stopped' });
});

// Task creation and execution API
app.post('/api/tasks/create', (req, res) => {
  const { startNode, endNode, weight, priority = 'medium' } = req.body;
  
  if (!startNode || !endNode || !weight) {
    return res.status(400).json({ error: 'Missing required fields: startNode, endNode, weight' });
  }
  
  if (startNode === endNode) {
    return res.status(400).json({ error: 'Start and end nodes cannot be the same' });
  }
  
  if (startNode < 1 || startNode > 9 || endNode < 1 || endNode > 9) {
    return res.status(400).json({ error: 'Nodes must be between 1 and 9' });
  }
  
  // Use internal task creation function
  const result = createTaskInternal(parseInt(startNode), parseInt(endNode), parseInt(weight), priority, false);
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  res.json({ 
    success: true, 
    task: result.task,
    executionLog: result.executionLog,
    message: '✅ Task created and AGV movement simulation started' 
  });
});

// Complete task execution
app.post('/api/tasks/:taskId/complete', (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const task = systemState.tasks.find(t => t.id === taskId);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  // Update task status
  task.status = 'completed';
  task.completedAt = Date.now();
  
  // Update AGV status and position
  if (systemState.agvs[task.agvId]) {
    systemState.agvs[task.agvId].status = 'idle';
    systemState.agvs[task.agvId].position = task.endNode;
  }
  
  systemState.totalTasksCompleted++;
  
  logToFile(`Task completed: ${task.executionLog}`, 'COMPLETION');
  broadcast({ type: 'taskCompleted', task, state: systemState });
  
  res.json({ success: true, task, message: 'Task completed' });
});

// Get available AGV
function getAvailableAGV() {
  const availableAGVs = Object.keys(systemState.agvs).filter(agvId => 
    systemState.agvs[agvId].status === 'idle'
  );
  return availableAGVs.length > 0 ? availableAGVs[0] : null;
}

// Auto-generate tasks when simulation is running
setInterval(() => {
  if (systemState.isRunning && Math.random() < 0.3) { // 30% chance every interval
    const startNode = Math.floor(Math.random() * 9) + 1;
    let endNode = Math.floor(Math.random() * 9) + 1;
    while (endNode === startNode) {
      endNode = Math.floor(Math.random() * 9) + 1;
    }
    const weight = Math.floor(Math.random() * 50) + 10;
    
    const availableAGV = getAvailableAGV();
    if (availableAGV) {
      const agvNum = availableAGV.replace('AGV', '');
      const payloadNum = Math.floor(Math.random() * 1000) + 1;
      
      // Generate execution log in required format
      const timestamp = new Date().toTimeString().split(' ')[0]; // HH:MM:SS format
      const executionLog = `agv_${agvNum}-${startNode}-${endNode}-${timestamp}-${weight}-payload_${payloadNum}`;
      
      const autoTask = {
        id: Date.now(),
        startNode,
        endNode,
        weight,
        agvId: availableAGV,
        payloadNum,
        executionLog,
        status: 'executing',
        createdAt: Date.now(),
        isAutoGenerated: true
      };
      
      systemState.tasks.push(autoTask);
      systemState.agvs[availableAGV].status = 'executing';
      systemState.agvs[availableAGV].position = startNode;
      
      logToFile(`Auto-generated task: ${executionLog}`, 'AUTO_TASK');
      broadcast({ type: 'taskCreated', task: autoTask, state: systemState });
      
      // Auto-complete task after random time (2-8 seconds)
      setTimeout(() => {
        autoTask.status = 'completed';
        autoTask.completedAt = Date.now();
        systemState.agvs[availableAGV].status = 'idle';
        systemState.agvs[availableAGV].position = endNode;
        systemState.totalTasksCompleted++;
        
        logToFile(`Auto-task completed: ${executionLog}`, 'AUTO_COMPLETION');
        broadcast({ type: 'taskCompleted', task: autoTask, state: systemState });
      }, Math.random() * 6000 + 2000);
    }
  }
}, 5000); // Every 5 seconds

// Enhanced file upload with dataset processing
app.post('/upload', upload.single('dataset'), async (req, res) => {
  try {
    if (!req.file) {
      logToFile('File upload failed - no file provided', 'ERROR');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const filename = req.file.filename;
    const fileExtension = path.extname(filename).toLowerCase();
    
    console.log('📁 Dataset uploaded successfully:', filename);
    logToFile(`Dataset uploaded: ${filename}`, 'UPLOAD');
    
    // Process dataset based on file type
    let taskData = [];
    
    if (fileExtension === '.csv') {
      // Process CSV file
      const csvData = fs.readFileSync(filePath, 'utf8');
      const lines = csvData.split('\n').filter(line => line.trim());
      
      // Assume CSV format: startNode,endNode,weight,priority
      for (let i = 1; i < lines.length; i++) { // Skip header
        const [startNode, endNode, weight, priority] = lines[i].split(',');
        if (startNode && endNode && weight) {
          taskData.push({
            startNode: parseInt(startNode.trim()),
            endNode: parseInt(endNode.trim()),
            weight: parseInt(weight.trim()),
            priority: (priority || 'medium').trim()
          });
        }
      }
    } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      // For Excel files, we'll create sample tasks for demonstration
      // In a real implementation, you'd use a library like 'xlsx' to parse Excel files
      taskData = [
        { startNode: 1, endNode: 5, weight: 25, priority: 'high' },
        { startNode: 3, endNode: 7, weight: 30, priority: 'medium' },
        { startNode: 2, endNode: 9, weight: 20, priority: 'low' },
        { startNode: 4, endNode: 6, weight: 35, priority: 'high' },
        { startNode: 7, endNode: 2, weight: 15, priority: 'medium' }
      ];
    }
    
    // Store processed tasks for later use
    systemState.uploadedTasks = taskData;
    
    logToFile(`Dataset processed: ${taskData.length} tasks extracted`, 'DATASET');
    
    res.json({ 
      success: true,
      message: `✅ Dataset uploaded and processed successfully`,
      filename: filename,
      tasksExtracted: taskData.length,
      sampleTasks: taskData.slice(0, 3) // Show first 3 tasks as preview
    });
  } catch (error) {
    console.error('Upload error:', error);
    logToFile(`Upload error: ${error.message}`, 'ERROR');
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// Process uploaded dataset to create tasks
app.post('/api/dataset/process', (req, res) => {
  try {
    if (!systemState.uploadedTasks || systemState.uploadedTasks.length === 0) {
      return res.status(400).json({ error: 'No dataset uploaded or no tasks found' });
    }
    
    let createdTasks = 0;
    let failedTasks = 0;
    
    // Create tasks from uploaded dataset
    systemState.uploadedTasks.forEach((taskData, index) => {
      try {
        const result = createTaskInternal(
          taskData.startNode, 
          taskData.endNode, 
          taskData.weight, 
          taskData.priority, 
          false
        );
        
        if (result.success) {
          createdTasks++;
          // Add delay between tasks to avoid overwhelming the system
          setTimeout(() => {}, index * 1000);
        } else {
          failedTasks++;
        }
      } catch (error) {
        failedTasks++;
        console.error(`Failed to create task ${index}:`, error);
      }
    });
    
    logToFile(`Dataset processing completed: ${createdTasks} tasks created, ${failedTasks} failed`, 'DATASET');
    
    res.json({
      success: true,
      message: `📊 Dataset processed: ${createdTasks} tasks created successfully`,
      createdTasks,
      failedTasks,
      totalTasks: systemState.uploadedTasks.length
    });
    
  } catch (error) {
    console.error('Dataset processing error:', error);
    logToFile(`Dataset processing error: ${error.message}`, 'ERROR');
    res.status(500).json({ error: 'Dataset processing failed: ' + error.message });
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
  logToFile(`Server error: ${error.message}`, 'ERROR');
  res.status(500).json({ error: 'Internal server error' });
});

// Optimized periodic analytics logging - every 2 minutes
setInterval(() => {
  // Log essential system status only
  logToFile(`Status: Running=${systemState.isRunning}, AGVs=${Object.keys(systemState.agvs).length}`, 'STATUS');
  
  // Log performance metric
  const performanceData = {
    timestamp: new Date().toISOString(),
    metric_type: 'system_efficiency',
    value: systemState.systemEfficiency,
    details: `tasks_completed=${systemState.totalTasksCompleted}`
  };
  logToCSV(performanceData, performanceFile);
  
  // Export minimal analytics data
  const analyticsData = {
    timestamp: new Date().toISOString(),
    totalTasksCompleted: systemState.totalTasksCompleted,
    systemEfficiency: systemState.systemEfficiency,
    isRunning: systemState.isRunning,
    agvCount: Object.keys(systemState.agvs).length
  };
  
  // Save analytics to single file
  try {
    const analyticsFilePath = path.join(analyticsDir, analyticsFile);
    fs.writeFileSync(analyticsFilePath, JSON.stringify(analyticsData, null, 2));
  } catch (err) {
    logToFile(`Analytics export error: ${err.message}`, 'ERROR');
  }
}, 120000); // Every 2 minutes

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 AGV Backend Server running on port ${PORT}`);
  console.log(`📊 Enhanced logging enabled - Backend-only mode`);
  console.log(`💾 Data output location: ${path.resolve('../output/')}`);
  console.log(`🌐 Monitoring dashboard: http://localhost:${PORT}`);
  
  // Initial system log
  logToFile('AGV Backend Server started successfully', 'STARTUP');
  logToFile(`Port: ${PORT}, Output directory: ${path.resolve('../output/')}`, 'CONFIG');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  logToFile('Server shutdown initiated', 'SHUTDOWN');
  server.close(() => {
    console.log('Server closed');
    logToFile('Server shutdown complete', 'SHUTDOWN');
    process.exit(0);
  });
});
