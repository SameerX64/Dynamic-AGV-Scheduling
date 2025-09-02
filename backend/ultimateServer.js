const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Enhanced Logging System
const logDir = path.join(__dirname, '../output/logs');
const dataDir = path.join(__dirname, '../output/datasets');
const analyticsDir = path.join(__dirname, '../output/analytics');

// Ensure directories exist
[logDir, dataDir, analyticsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Logging functions
function logToFile(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${type}: ${message}\n`;
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const logFile = path.join(logDir, `agv_system_${dateStr}.txt`);
  
  fs.appendFileSync(logFile, logEntry);
  console.log(`${type}: ${message}`);
}

function logToCSV(data, filename) {
  const csvFile = path.join(dataDir, filename);
  const csvLine = Object.values(data).join(',') + '\n';
  fs.appendFileSync(csvFile, csvLine);
}

// Middleware
app.use(cors());
app.use(express.json());

// Ultimate AGV System State
const systemState = {
  agvs: {
    AGV1: { 
      id: 'AGV1', 
      position: 1, 
      battery: 100, 
      status: 'idle', 
      province: 'North',
      algorithm: 'A*',
      capabilities: ['transport', 'sorting'],
      priority: 'High',
      currentTask: null,
      pathHistory: [],
      performanceMetrics: {
        totalTasks: 0,
        completedTasks: 0,
        efficiency: 100,
        batteryUsage: 0,
        distanceTraveled: 0
      }
    },
    AGV2: { 
      id: 'AGV2', 
      position: 5, 
      battery: 85, 
      status: 'idle', 
      province: 'Central',
      algorithm: 'Dijkstra+TimeWindow',
      capabilities: ['transport', 'assembly'],
      priority: 'Medium',
      currentTask: null,
      pathHistory: [],
      performanceMetrics: {
        totalTasks: 0,
        completedTasks: 0,
        efficiency: 100,
        batteryUsage: 0,
        distanceTraveled: 0
      }
    },
    AGV3: { 
      id: 'AGV3', 
      position: 9, 
      battery: 92, 
      status: 'idle', 
      province: 'South',
      algorithm: 'ACO',
      capabilities: ['transport', 'quality_control'],
      priority: 'Low',
      currentTask: null,
      pathHistory: [],
      performanceMetrics: {
        totalTasks: 0,
        completedTasks: 0,
        efficiency: 100,
        batteryUsage: 0,
        distanceTraveled: 0
      }
    }
  },
  tasks: [],
  timeWindows: [],
  conflicts: [],
  analytics: {
    totalTasksCompleted: 0,
    averageExecutionTime: 0,
    systemEfficiency: 0,
    algorithmPerformance: {
      'A*': { tasks: 0, efficiency: 0, avgTime: 0 },
      'Dijkstra+TimeWindow': { tasks: 0, efficiency: 0, avgTime: 0 },
      'ACO': { tasks: 0, efficiency: 0, avgTime: 0 }
    },
    conflictResolution: {
      totalConflicts: 0,
      resolvedConflicts: 0,
      resolutionRate: 0
    }
  },
  simulation: {
    isRunning: false,
    startTime: null,
    currentTime: Date.now(),
    speed: 1.0
  }
};

// Initialize system logging
logToFile('Ultimate AGV System initialized', 'SYSTEM');
logToFile('Backend-only mode: Enhanced logging enabled', 'CONFIG');

// Create CSV headers for real-time data logging
const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
const agvDataFile = `agv_data_${dateStr}.csv`;
const taskDataFile = `task_data_${dateStr}.csv`;
const performanceFile = `performance_${dateStr}.csv`;

// Initialize CSV files with headers
fs.writeFileSync(path.join(dataDir, agvDataFile), 
  'timestamp,agv_id,algorithm,province,position,battery,status,task_id,efficiency,distance\n');
fs.writeFileSync(path.join(dataDir, taskDataFile), 
  'timestamp,task_id,agv_id,start_pos,end_pos,status,execution_time,algorithm_used\n');
fs.writeFileSync(path.join(dataDir, performanceFile), 
  'timestamp,metric_type,value,agv_id,details\n');
      pathHistory: [],
      performanceMetrics: {
        totalTasks: 0,
        completedTasks: 0,
        efficiency: 100,
        batteryUsage: 0,
        distanceTraveled: 0
      }
    },
    AGV3: { 
      id: 'AGV3', 
      position: 9, 
      battery: 92, 
      status: 'idle', 
      province: 'South',
      algorithm: 'ACO',
      capabilities: ['transport', 'inspection'],
      priority: 'Medium',
      currentTask: null,
      pathHistory: [],
      performanceMetrics: {
        totalTasks: 0,
        completedTasks: 0,
        efficiency: 100,
        batteryUsage: 0,
        distanceTraveled: 0
      }
    }
  },
  tasks: [],
  timeWindows: [],
  conflicts: [],
  analytics: {
    totalTasksCompleted: 0,
    averageExecutionTime: 0,
    systemEfficiency: 0,
    algorithmPerformance: {
      'A*': { tasks: 0, efficiency: 0, avgTime: 0 },
      'Dijkstra+TimeWindow': { tasks: 0, efficiency: 0, avgTime: 0 },
      'ACO': { tasks: 0, efficiency: 0, avgTime: 0 }
    },
    conflictResolution: {
      totalConflicts: 0,
      resolvedConflicts: 0,
      resolutionRate: 0
    }
  },
  simulation: {
    isRunning: false,
    startTime: null,
    currentTime: Date.now(),
    speed: 1.0
  }
};

// Advanced pathfinding algorithms
class ServerPathfinding {
  constructor() {
    this.nodeConnections = {
      1: [2, 4], 2: [1, 3, 5], 3: [2, 6],
      4: [1, 7], 5: [2, 6, 8], 6: [3, 5],
      7: [4, 8], 8: [5, 7, 9], 9: [8]
    };
  }

  aStarPathfinding(start, end, avoidNodes = []) {
    const openSet = [{node: start, fScore: this.heuristic(start, end)}];
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    
    for (let i = 1; i <= 9; i++) {
      gScore.set(i, Infinity);
    }
    gScore.set(start, 0);

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.fScore - b.fScore);
      const current = openSet.shift().node;

      if (current === end) {
        return this.reconstructPath(cameFrom, current);
      }

      closedSet.add(current);
      const neighbors = this.nodeConnections[current] || [];

      for (const neighbor of neighbors) {
        if (closedSet.has(neighbor) || avoidNodes.includes(neighbor)) continue;

        const tentativeGScore = gScore.get(current) + 1;
        if (tentativeGScore < gScore.get(neighbor)) {
          cameFrom.set(neighbor, current);
          gScore.set(neighbor, tentativeGScore);
          const fScore = tentativeGScore + this.heuristic(neighbor, end);
          
          if (!openSet.find(item => item.node === neighbor)) {
            openSet.push({node: neighbor, fScore});
          }
        }
      }
    }
    return [];
  }

  dijkstraWithTimeWindow(start, end, timeWindow, occupiedSlots = {}) {
    const distances = new Map();
    const previous = new Map();
    const unvisited = new Set();

    for (let i = 1; i <= 9; i++) {
      distances.set(i, Infinity);
      unvisited.add(i);
    }
    distances.set(start, 0);

    while (unvisited.size > 0) {
      let current = null;
      let minDistance = Infinity;
      
      for (const node of unvisited) {
        if (distances.get(node) < minDistance) {
          minDistance = distances.get(node);
          current = node;
        }
      }

      if (current === null || current === end) break;
      unvisited.delete(current);

      const neighbors = this.nodeConnections[current] || [];
      for (const neighbor of neighbors) {
        if (!unvisited.has(neighbor)) continue;

        const alt = distances.get(current) + 1;
        const arrivalTime = timeWindow.start + (alt * 5 * 60 * 1000);
        
        if (this.isTimeSlotAvailable(neighbor, arrivalTime, occupiedSlots)) {
          if (alt < distances.get(neighbor)) {
            distances.set(neighbor, alt);
            previous.set(neighbor, current);
          }
        }
      }
    }

    return {
      path: this.reconstructPath(previous, end),
      totalTime: distances.get(end) * 5 * 60 * 1000
    };
  }

  heuristic(node1, node2) {
    const positions = {
      1: [0, 0], 2: [1, 0], 3: [2, 0],
      4: [0, 1], 5: [1, 1], 6: [2, 1],
      7: [0, 2], 8: [1, 2], 9: [2, 2]
    };
    const [x1, y1] = positions[node1];
    const [x2, y2] = positions[node2];
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  reconstructPath(cameFrom, current) {
    const path = [current];
    while (cameFrom.has(current)) {
      current = cameFrom.get(current);
      path.unshift(current);
    }
    return path;
  }

  isTimeSlotAvailable(node, time, occupiedSlots) {
    const nodeSlots = occupiedSlots[node] || [];
    return !nodeSlots.some(slot => Math.abs(slot.time - time) < 5 * 60 * 1000);
  }
}

const pathfinder = new ServerPathfinding();

// Time Window Planning
class TimeWindowPlanner {
  detectTimeWindows(tasks) {
    return tasks.map(task => ({
      taskId: task.id,
      startTime: task.earliestStart || Date.now(),
      endTime: task.latestStart || Date.now() + (60 * 60 * 1000),
      priority: task.priority || 'Medium',
      score: this.calculateTimeWindowScore(task)
    }));
  }

  calculateTimeWindowScore(task) {
    let score = 100;
    const priorityWeight = { 'High': 50, 'Medium': 25, 'Low': 10 };
    score += priorityWeight[task.priority] || 25;
    return score;
  }

  resolveConflicts(conflicts) {
    const resolutions = [];
    conflicts.forEach(conflict => {
      if (conflict.type === 'time_overlap') {
        // Delay lower priority task
        const resolution = {
          type: 'delay',
          taskId: conflict.tasks[1],
          delayTime: 10 * 60 * 1000 // 10 minutes
        };
        resolutions.push(resolution);
      }
    });
    return resolutions;
  }
}

const timeWindowPlanner = new TimeWindowPlanner();

// Enhanced Task Management
function assignTaskToAGV(task) {
  const availableAGVs = Object.values(systemState.agvs)
    .filter(agv => agv.status === 'idle');

  if (availableAGVs.length === 0) {
    return null;
  }

  // Score AGVs based on multiple criteria
  const agvScores = availableAGVs.map(agv => ({
    agv,
    score: calculateAGVScore(agv, task)
  }));

  agvScores.sort((a, b) => b.score - a.score);
  const selectedAGV = agvScores[0].agv;

  // Generate path based on AGV's algorithm
  let path;
  switch (selectedAGV.algorithm) {
    case 'A*':
      path = pathfinder.aStarPathfinding(selectedAGV.position, task.pickupLocation);
      break;
    case 'Dijkstra+TimeWindow':
      const timeWindow = { start: Date.now(), end: Date.now() + (30 * 60 * 1000) };
      const dijkstraResult = pathfinder.dijkstraWithTimeWindow(
        selectedAGV.position, 
        task.pickupLocation, 
        timeWindow
      );
      path = dijkstraResult.path;
      break;
    case 'ACO':
      // Simplified ACO - use A* with pheromone influence
      path = pathfinder.aStarPathfinding(selectedAGV.position, task.pickupLocation);
      break;
    default:
      path = pathfinder.aStarPathfinding(selectedAGV.position, task.pickupLocation);
  }

  if (path.length > 0) {
    task.assignedAGV = selectedAGV.id;
    task.plannedPath = path;
    task.algorithm = selectedAGV.algorithm;
    task.status = 'assigned';
    
    return selectedAGV.id;
  }

  return null;
}

function calculateAGVScore(agv, task) {
  let score = 0;
  
  // Distance factor
  const distance = pathfinder.heuristic(agv.position, task.pickupLocation);
  score += (10 - distance) * 10;
  
  // Battery factor
  if (agv.battery > 50) score += 30;
  else if (agv.battery > 25) score += 15;
  
  // Priority factor
  const priorityBonus = { 'High': 20, 'Medium': 10, 'Low': 5 };
  score += priorityBonus[agv.priority] || 10;
  
  // Algorithm efficiency factor
  const algorithmBonus = { 'A*': 15, 'Dijkstra+TimeWindow': 10, 'ACO': 12 };
  score += algorithmBonus[agv.algorithm] || 10;

  return score;
}

// Conflict Detection
function detectConflicts() {
  const conflicts = [];
  const activeTasks = systemState.tasks.filter(t => t.status === 'executing' || t.status === 'assigned');
  
  // Check for path conflicts
  for (let i = 0; i < activeTasks.length; i++) {
    for (let j = i + 1; j < activeTasks.length; j++) {
      const task1 = activeTasks[i];
      const task2 = activeTasks[j];
      
      if (hasPathConflict(task1, task2)) {
        conflicts.push({
          type: 'path_conflict',
          tasks: [task1.id, task2.id],
          agvs: [task1.assignedAGV, task2.assignedAGV],
          severity: 'medium',
          detectedAt: Date.now()
        });
      }
    }
  }
  
  systemState.conflicts = conflicts;
  return conflicts;
}

function hasPathConflict(task1, task2) {
  if (!task1.plannedPath || !task2.plannedPath) return false;
  
  // Simple conflict detection - check if paths intersect
  const intersection = task1.plannedPath.filter(node => task2.plannedPath.includes(node));
  return intersection.length > 1; // More than just the start/end nodes
}

// Real-time Analytics
function updateAnalytics() {
  const completedTasks = systemState.tasks.filter(t => t.status === 'completed');
  
  systemState.analytics.totalTasksCompleted = completedTasks.length;
  
  if (completedTasks.length > 0) {
    const totalTime = completedTasks.reduce((sum, task) => sum + (task.executionTime || 0), 0);
    systemState.analytics.averageExecutionTime = totalTime / completedTasks.length;
  }
  
  // Update algorithm performance
  Object.keys(systemState.analytics.algorithmPerformance).forEach(algorithm => {
    const algorithmTasks = completedTasks.filter(t => t.algorithm === algorithm);
    if (algorithmTasks.length > 0) {
      systemState.analytics.algorithmPerformance[algorithm] = {
        tasks: algorithmTasks.length,
        efficiency: algorithmTasks.reduce((sum, t) => sum + (t.efficiency || 0), 0) / algorithmTasks.length,
        avgTime: algorithmTasks.reduce((sum, t) => sum + (t.executionTime || 0), 0) / algorithmTasks.length
      };
    }
  });
  
  // System efficiency
  const totalTasks = systemState.tasks.length;
  systemState.analytics.systemEfficiency = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;
  
  // Conflict resolution rate
  const totalConflicts = systemState.analytics.conflictResolution.totalConflicts;
  const resolvedConflicts = systemState.analytics.conflictResolution.resolvedConflicts;
  systemState.analytics.conflictResolution.resolutionRate = totalConflicts > 0 ? (resolvedConflicts / totalConflicts) * 100 : 0;
}

// API Routes with Enhanced Logging
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'monitor.html'));
});

app.get('/api/status', (req, res) => {
  updateAnalytics();
  
  // Log system status check
  logToFile(`System status requested - AGVs: ${Object.keys(systemState.agvs).length}, Tasks: ${systemState.tasks.length}`, 'API');
  
  // Log current AGV states to CSV
  Object.values(systemState.agvs).forEach(agv => {
    const csvData = {
      timestamp: new Date().toISOString(),
      agv_id: agv.id,
      algorithm: agv.algorithm,
      province: agv.province,
      position: agv.position,
      battery: agv.battery,
      status: agv.status,
      task_id: agv.currentTask ? agv.currentTask.id : 'none',
      efficiency: agv.performanceMetrics.efficiency,
      distance: agv.performanceMetrics.distanceTraveled
    };
    logToCSV(csvData, agvDataFile);
  });
  
  res.json(systemState);
});

app.post('/api/tasks', (req, res) => {
  const task = {
    id: Date.now(),
    ...req.body,
    status: 'pending',
    createdAt: Date.now()
  };

  logToFile(`New task created: ID=${task.id}, Start=${task.startPosition}, End=${task.endPosition}`, 'TASK');

  const assignedAGV = assignTaskToAGV(task);
  if (assignedAGV) {
    systemState.tasks.push(task);
    
    logToFile(`Task ${task.id} assigned to ${assignedAGV.id} using ${assignedAGV.algorithm}`, 'ASSIGNMENT');
    
    // Log task assignment to CSV
    const taskCsvData = {
      timestamp: new Date().toISOString(),
      task_id: task.id,
      agv_id: assignedAGV.id,
      start_pos: task.startPosition,
      end_pos: task.endPosition,
      status: 'assigned',
      execution_time: 0,
      algorithm_used: assignedAGV.algorithm
    };
    logToCSV(taskCsvData, taskDataFile);
    
    // Generate time windows
    const timeWindows = timeWindowPlanner.detectTimeWindows([task]);
    systemState.timeWindows.push(...timeWindows);
    
    io.emit('taskCreated', task);
    io.emit('systemUpdate', systemState);
    
    res.json({ success: true, task, assignedAGV });
  } else {
    logToFile(`Task ${task.id} assignment failed - no available AGV`, 'ERROR');
    res.status(400).json({ success: false, message: 'No available AGV' });
  }
});

app.post('/api/tasks/:taskId/execute', (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const task = systemState.tasks.find(t => t.id === taskId);
  
  if (!task) {
    logToFile(`Task execution failed - Task ${taskId} not found`, 'ERROR');
    return res.status(404).json({ success: false, message: 'Task not found' });
  }
  
  const agv = systemState.agvs[task.assignedAGV];
  if (!agv) {
    logToFile(`Task execution failed - AGV ${task.assignedAGV} not found`, 'ERROR');
    return res.status(400).json({ success: false, message: 'AGV not found' });
  }
  
  const startTime = Date.now();
  logToFile(`Starting task execution: Task ${taskId} with AGV ${agv.id}`, 'EXECUTION');
  
  // Start task execution
  task.status = 'executing';
  task.startTime = Date.now();
  agv.status = 'executing';
  agv.currentTask = task;
  
  // Simulate task execution
  setTimeout(() => {
    // Complete task
    task.status = 'completed';
    task.completedAt = Date.now();
    task.executionTime = task.completedAt - task.startTime;
    task.efficiency = Math.max(50, 100 - Math.random() * 30); // Random efficiency 70-100%
    
    // Update AGV
    agv.status = 'idle';
    agv.position = task.deliveryLocation;
    agv.currentTask = null;
    agv.performanceMetrics.completedTasks++;
    agv.performanceMetrics.totalTasks++;
    agv.pathHistory.push(task.plannedPath);
    
    // Update analytics
    updateAnalytics();
    
    io.emit('taskCompleted', task);
    io.emit('systemUpdate', systemState);
  }, Math.random() * 10000 + 5000); // 5-15 seconds
  
  io.emit('taskStarted', task);
  io.emit('systemUpdate', systemState);
  
  res.json({ success: true, task });
});

app.get('/api/conflicts', (req, res) => {
  const conflicts = detectConflicts();
  res.json(conflicts);
});

app.post('/api/conflicts/resolve', (req, res) => {
  const conflicts = systemState.conflicts;
  const resolutions = timeWindowPlanner.resolveConflicts(conflicts);
  
  // Apply resolutions
  resolutions.forEach(resolution => {
    if (resolution.type === 'delay') {
      const task = systemState.tasks.find(t => t.id === resolution.taskId);
      if (task) {
        task.delayedUntil = Date.now() + resolution.delayTime;
      }
    }
  });
  
  systemState.analytics.conflictResolution.resolvedConflicts += resolutions.length;
  systemState.conflicts = [];
  
  io.emit('conflictsResolved', resolutions);
  io.emit('systemUpdate', systemState);
  
  res.json({ success: true, resolutions });
});

app.post('/api/simulation/toggle', (req, res) => {
  systemState.simulation.isRunning = !systemState.simulation.isRunning;
  
  if (systemState.simulation.isRunning) {
    systemState.simulation.startTime = Date.now();
  }
  
  io.emit('simulationToggled', systemState.simulation);
  res.json({ success: true, simulation: systemState.simulation });
});

app.get('/api/analytics', (req, res) => {
  updateAnalytics();
  res.json(systemState.analytics);
});

// WebSocket Events
io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Send current state to new client
  socket.emit('systemUpdate', systemState);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
  
  socket.on('requestUpdate', () => {
    updateAnalytics();
    socket.emit('systemUpdate', systemState);
  });
});

// Automatic conflict detection and enhanced logging
setInterval(() => {
  if (systemState.simulation.isRunning) {
    detectConflicts();
    updateAnalytics();
    systemState.simulation.currentTime = Date.now();
    io.emit('systemUpdate', systemState);
    
    // Log system performance metrics
    const performanceMetrics = {
      timestamp: new Date().toISOString(),
      metric_type: 'system_performance',
      value: systemState.analytics.systemEfficiency,
      agv_id: 'SYSTEM',
      details: `Tasks: ${systemState.analytics.totalTasksCompleted}, Conflicts: ${systemState.analytics.conflictResolution.totalConflicts}`
    };
    logToCSV(performanceMetrics, performanceFile);
  }
}, 5000);

// Enhanced data logging every minute
setInterval(() => {
  // Log current system state
  logToFile(`System Status: Running=${systemState.simulation.isRunning}, AGVs=${Object.keys(systemState.agvs).length}, Active Tasks=${systemState.tasks.filter(t => t.status === 'pending' || t.status === 'executing').length}`, 'STATUS');
  
  // Export analytics data
  const analyticsData = {
    timestamp: new Date().toISOString(),
    systemState: {
      totalTasksCompleted: systemState.analytics.totalTasksCompleted,
      systemEfficiency: systemState.analytics.systemEfficiency,
      averageExecutionTime: systemState.analytics.averageExecutionTime
    },
    agvPerformance: Object.values(systemState.agvs).map(agv => ({
      id: agv.id,
      algorithm: agv.algorithm,
      efficiency: agv.performanceMetrics.efficiency,
      completedTasks: agv.performanceMetrics.completedTasks,
      batteryLevel: agv.battery,
      status: agv.status
    })),
    algorithmStats: systemState.analytics.algorithmPerformance
  };
  
  // Save analytics to file
  const analyticsFile = path.join(analyticsDir, `analytics_${dateStr}.json`);
  fs.writeFileSync(analyticsFile, JSON.stringify(analyticsData, null, 2));
  
}, 60000); // Every minute

// Automatic task generation during simulation
setInterval(() => {
  if (systemState.simulation.isRunning && Math.random() < 0.2) { // 20% chance
    const randomTask = {
      id: Date.now(),
      type: 'transport',
      pickupLocation: Math.floor(Math.random() * 9) + 1,
      deliveryLocation: Math.floor(Math.random() * 9) + 1,
      priority: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
      weight: Math.floor(Math.random() * 50) + 10,
      status: 'pending',
      createdAt: Date.now()
    };
    
    if (randomTask.pickupLocation !== randomTask.deliveryLocation) {
      logToFile(`Auto-generated task: ${randomTask.id} from ${randomTask.pickupLocation} to ${randomTask.deliveryLocation}`, 'AUTO_TASK');
      
      const assignedAGV = assignTaskToAGV(randomTask);
      if (assignedAGV) {
        systemState.tasks.push(randomTask);
        
        // Log auto task assignment
        const taskCsvData = {
          timestamp: new Date().toISOString(),
          task_id: randomTask.id,
          agv_id: assignedAGV.id,
          start_pos: randomTask.pickupLocation,
          end_pos: randomTask.deliveryLocation,
          status: 'auto_assigned',
          execution_time: 0,
          algorithm_used: assignedAGV.algorithm
        };
        logToCSV(taskCsvData, taskDataFile);
        
        const timeWindows = timeWindowPlanner.detectTimeWindows([randomTask]);
        systemState.timeWindows.push(...timeWindows);
        
        io.emit('taskCreated', randomTask);
        io.emit('systemUpdate', systemState);
      }
    }
  }
}, 8000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Ultimate AGV Server running on port ${PORT}`);
  console.log(`📊 Advanced algorithms: A*, Dijkstra+TimeWindow, ACO`);
  console.log(`⏰ Time window planning enabled`);
  console.log(`🎯 Multi-AGV conflict detection active`);
  console.log(`📈 Real-time analytics available`);
  console.log(`📝 Enhanced logging enabled - Backend-only mode`);
  console.log(`💾 Data output location: ${path.resolve('../output/')}`);
  
  // Initial system log
  logToFile('Ultimate AGV Server started successfully', 'STARTUP');
  logToFile(`Port: ${PORT}, Output directory: ${path.resolve('../output/')}`, 'CONFIG');
});
