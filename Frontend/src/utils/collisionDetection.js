import { getNodePosition } from "./agvUtils";

export const checkCollision = (agv1Path, agv2Path) => {
  if (!agv1Path || !agv2Path) return false;

  const { from: from1, to: to1, time: time1 } = agv1Path;
  const { from: from2, to: to2, time: time2 } = agv2Path;

  // Check if AGVs are moving through the same nodes
  if (from1 === from2 || from1 === to2 || to1 === from2 || to1 === to2) {
    // Check time proximity (within 2 minutes)
    const time1Minutes = parseTimeToMinutes(time1);
    const time2Minutes = parseTimeToMinutes(time2);
    return Math.abs(time1Minutes - time2Minutes) <= 2;
  }

  return false;
};

const parseTimeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

export const getCollisionWarnings = (agvStatus) => {
  const warnings = [];
  const agvs = Object.entries(agvStatus);

  for (let i = 0; i < agvs.length; i++) {
    for (let j = i + 1; j < agvs.length; j++) {
      const [agv1Id, agv1Data] = agvs[i];
      const [agv2Id, agv2Data] = agvs[j];

      if (agv1Data.status === "moving" && agv2Data.status === "moving") {
        if (
          checkCollision(
            { from: agv1Data.from, to: agv1Data.to, time: agv1Data.lastUpdate },
            { from: agv2Data.from, to: agv2Data.to, time: agv2Data.lastUpdate }
          )
        ) {
          warnings.push({
            agv1: agv1Id,
            agv2: agv2Id,
            location: agv1Data.to === agv2Data.to ? agv1Data.to : "path",
          });
        }
      }
    }
  }

  return warnings;
};
