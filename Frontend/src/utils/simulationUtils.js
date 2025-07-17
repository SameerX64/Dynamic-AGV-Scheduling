export const startSimulation = (websocket, dataset) => {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    throw new Error("WebSocket not connected");
  }

  websocket.send(JSON.stringify({
    type: "start_simulation",
    dataset: dataset
  }));
};

export const pauseSimulation = (websocket) => {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    throw new Error("WebSocket not connected");
  }

  websocket.send(JSON.stringify({
    type: "pause_simulation"
  }));
};

export const resumeSimulation = (websocket) => {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    throw new Error("WebSocket not connected");
  }

  websocket.send(JSON.stringify({
    type: "resume_simulation"
  }));
};

export const stopSimulation = (websocket) => {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    throw new Error("WebSocket not connected");
  }

  websocket.send(JSON.stringify({
    type: "stop_simulation"
  }));
};

export const updateSimulationSpeed = (websocket, speed) => {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    throw new Error("WebSocket not connected");
  }

  websocket.send(JSON.stringify({
    type: "update_speed",
    speed: speed
  }));
};

export const processSimulationMessage = (message) => {
  try {
    const data = JSON.parse(message);
    return data;
  } catch (error) {
    console.error("Error parsing simulation message:", error);
    return null;
  }
};

export const formatSimulationTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

export const calculateSimulationProgress = (startTime, currentTime, totalDuration) => {
  if (!startTime || !currentTime) return 0;
  
  const elapsed = new Date(currentTime) - new Date(startTime);
  const progress = (elapsed / totalDuration) * 100;
  return Math.min(100, Math.max(0, progress));
};
