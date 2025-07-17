export const parseLogLine = (logLine) => {
  const [agvInfo, from, to, time, wait, payload] = logLine.split("-");
  return {
    agvId: agvInfo,
    from,
    to,
    time,
    wait: parseInt(wait),
    payload,
  };
};

export const calculateBatteryLevel = (agvStatus, currentTime) => {
  // Simple battery simulation - decreases over time
  const timeDiff =
    (new Date(currentTime) - new Date(agvStatus.lastUpdate)) / 1000;
  const batteryDecrease = (timeDiff / 60) * 2; // 2% per minute
  return Math.max(0, agvStatus.battery - batteryDecrease);
};

export const getAGVCoordinates = (from, to, progress) => {
  // Linear interpolation between nodes
  const fromNode = getNodePosition(from);
  const toNode = getNodePosition(to);

  return {
    x: fromNode.x + (toNode.x - fromNode.x) * progress,
    y: fromNode.y + (toNode.y - fromNode.y) * progress,
  };
};

export const getNodePosition = (nodeId) => {
  const positions = {
    1: { x: 0, y: 0 },
    2: { x: 100, y: 0 },
    3: { x: 200, y: 0 },
    4: { x: 0, y: 100 },
    5: { x: 100, y: 100 },
    6: { x: 200, y: 100 },
    7: { x: 0, y: 200 },
    8: { x: 100, y: 200 },
  };
  return positions[nodeId];
};
