import { useState, useEffect, useCallback } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';
import { AGVNode, LocationNode } from './components/NodeTypes';
import { parseLogLine, calculateBatteryLevel, getAGVCoordinates } from './utils/agvUtils';
import { useWebSocket } from './hooks/useWebSocket';
import { PerformanceChart } from './components/PerformanceChart';
import { TaskQueue } from './components/TaskQueue';
import { ExecutionLogs } from './components/ExecutionLogs';
import { getCollisionWarnings } from './utils/collisionDetection';

const nodeTypes = {
  agv: AGVNode,
  location: LocationNode,
};

function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [logs, setLogs] = useState([]);
  const [dataset, setDataset] = useState(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [agvStatus, setAgvStatus] = useState({
    agv_1: { position: '1', battery: 100, status: 'idle' },
    agv_2: { position: '1', battery: 100, status: 'idle' },
    agv_3: { position: '1', battery: 100, status: 'idle' },
  });
  const [collisionWarnings, setCollisionWarnings] = useState([]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('dataset', file);
      try {
        const response = await fetch('http://localhost:3000/upload', {
          method: 'POST',
          body: formData,
        });
        if (response.ok) {
          setDataset(file.name);
          alert('Dataset uploaded successfully!');
        } else {
          alert('Failed to upload dataset');
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert('Error uploading dataset');
      }
    }
  };

  const startSimulation = async () => {
    if (!dataset) {
      alert('Please upload a dataset first');
      return;
    }
    try {
      const response = await fetch('http://localhost:3000/start-simulation', {
        method: 'POST',
      });
      if (response.ok) {
        setIsSimulationRunning(true);
        alert('Simulation started!');
      }
    } catch (error) {
      console.error('Start simulation error:', error);
      alert('Error starting simulation');
    }
  };

  const { socket, isConnected } = useWebSocket('ws://localhost:3000');

  useEffect(() => {
    const initialNodes = [
      { id: '1', type: 'location', position: { x: 100, y: 50 }, data: { label: 'Node 1' }, className: 'node-location' },
      { id: '2', type: 'location', position: { x: 300, y: 50 }, data: { label: 'Node 2' }, className: 'node-location' },
      { id: '3', type: 'location', position: { x: 500, y: 50 }, data: { label: 'Node 3' }, className: 'node-location' },
      { id: '4', type: 'location', position: { x: 100, y: 250 }, data: { label: 'Node 4' }, className: 'node-location' },
      { id: '5', type: 'location', position: { x: 300, y: 250 }, data: { label: 'Node 5' }, className: 'node-location' },
      { id: '6', type: 'location', position: { x: 500, y: 250 }, data: { label: 'Node 6' }, className: 'node-location' },
      { id: '7', type: 'location', position: { x: 100, y: 450 }, data: { label: 'Node 7' }, className: 'node-location' },
      { id: '8', type: 'location', position: { x: 300, y: 450 }, data: { label: 'Node 8' }, className: 'node-location' },
      { id: 'agv_1', type: 'agv', position: { x: 0, y: 0 }, data: { label: 'AGV 1', battery: 100 } },
      { id: 'agv_2', type: 'agv', position: { x: 0, y: 0 }, data: { label: 'AGV 2', battery: 100 } },
      { id: 'agv_3', type: 'agv', position: { x: 0, y: 0 }, data: { label: 'AGV 3', battery: 100 } },
    ];

    const initialEdges = [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' },
      { id: 'e4-5', source: '4', target: '5' },
      { id: 'e5-6', source: '5', target: '6' },
      { id: 'e7-8', source: '7', target: '8' },
      { id: 'e1-4', source: '1', target: '4' },
      { id: 'e2-5', source: '2', target: '5' },
      { id: 'e3-6', source: '3', target: '6' },
    ];

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'log') {
        const logData = message.data;
        setLogs((prev) => [logData, ...prev]);

        const { agvId, from, to, time } = parseLogLine(logData);
        highlightPath(from, to);

        setAgvStatus((prev) => {
          const newStatus = {
            ...prev,
            [agvId]: {
              ...prev[agvId],
              position: to,
              status: 'moving',
              lastUpdate: time,
              from,
              to,
            },
          };

          const warnings = getCollisionWarnings(newStatus);
          setCollisionWarnings(warnings);

          return newStatus;
        });

        setNodes((nodes) =>
          nodes.map((node) => {
            if (node.id === agvId) {
              const coords = getAGVCoordinates(from, to, 0.5);
              return {
                ...node,
                position: coords,
                data: {
                  ...node.data,
                  battery: calculateBatteryLevel(agvStatus[agvId], time),
                },
              };
            }
            return node;
          })
        );
      } else if (message.type === 'summary') {
        console.log('Received summary:', message.data);
      }
    };
  }, [socket]);

  const highlightPath = useCallback((from, to) => {
    const pathEdgeId = `e${from}-${to}`;
    setEdges((edges) =>
      edges.map((edge) => ({
        ...edge,
        className: edge.id === pathEdgeId ? 'edge-highlight' : '',
      }))
    );
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-white shadow-sm p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">AGV Scheduling System</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="dataset-upload"
              />
              <label
                htmlFor="dataset-upload"
                className="cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Upload Dataset
              </label>
            </div>
            <button
              onClick={startSimulation}
              disabled={!dataset || isSimulationRunning}
              className={`px-4 py-2 rounded-lg flex items-center ${!dataset || isSimulationRunning
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-green-50 hover:bg-green-100 text-green-600'
                }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {isSimulationRunning ? 'Simulation Running' : 'Start Simulation'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-2/3 flex flex-col bg-white shadow-lg rounded-lg m-4">
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              nodeTypes={nodeTypes}
              minZoom={0.5}
              maxZoom={1.5}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            >
              <Background color="#aaa" gap={16} />
              <Controls />
              <MiniMap />
            </ReactFlow>

            {collisionWarnings.length > 0 && (
              <div className="absolute top-4 left-4 z-10 p-4 bg-red-100 border-l-4 border-red-500 rounded-md max-w-md">
                <h3 className="text-red-800 font-semibold">Collision Warnings</h3>
                {collisionWarnings.map((warning, index) => (
                  <div key={index} className="text-sm text-red-600 mt-1">
                    {`Potential collision between ${warning.agv1.toUpperCase()} and ${warning.agv2.toUpperCase()}${warning.location !== 'path' ? ` at Node ${warning.location}` : ' on path'}`}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="w-1/3 flex flex-col space-y-4 p-4 overflow-y-auto">
          <div className="bg-white shadow-lg rounded-lg">
            <PerformanceChart logs={logs} agvStatus={agvStatus} />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white shadow-lg rounded-lg">
              <TaskQueue logs={logs} />
            </div>
            <div className="bg-white shadow-lg rounded-lg">
              <ExecutionLogs logs={logs} />
            </div>
          </div>
        </div>
      </div>

      <div
        className={`fixed bottom-4 right-4 px-4 py-2 rounded-full ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
      >
        {isConnected ? 'Connected to Server' : 'Disconnected'}
      </div>
    </div>
  );
}

export default App;
