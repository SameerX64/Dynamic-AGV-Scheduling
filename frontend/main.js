// AGV Simulation Dashboard JavaScript

// WebSocket connection
let socket = null;
let reconnectInterval = null;

// System state
let systemState = {
    agvs: {},
    tasks: [],
    isRunning: false
};

// Node positions for a 3x3 grid layout
const nodePositions = {
    1: { x: 100, y: 100 },
    2: { x: 250, y: 100 },
    3: { x: 400, y: 100 },
    4: { x: 100, y: 250 },
    5: { x: 250, y: 250 },
    6: { x: 400, y: 250 },
    7: { x: 100, y: 400 },
    8: { x: 250, y: 400 },
    9: { x: 400, y: 400 }
};

// Node connections (edges) - NO DIAGONALS, only horizontal/vertical
const nodeEdges = [
    // Horizontal edges
    { from: 1, to: 2 }, { from: 2, to: 3 },
    { from: 4, to: 5 }, { from: 5, to: 6 },
    { from: 7, to: 8 }, { from: 8, to: 9 },
    // Vertical edges
    { from: 1, to: 4 }, { from: 2, to: 5 }, { from: 3, to: 6 },
    { from: 4, to: 7 }, { from: 5, to: 8 }
    // Note: Edge between 6 and 9 removed per user request
];

// ...existing code...
// All JavaScript logic from index.html's <script> tag goes here
// ...existing code...

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
