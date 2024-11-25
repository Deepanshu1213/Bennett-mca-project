interface Position {
  x: number;
  y: number;
  timestamp: number;
}

// Calibration constants optimized for real-world movement
const PIXEL_TO_METER = 0.015; // Calibrated for typical webcam view
const MS_TO_KMH = 3.6;
const MIN_MOVEMENT_THRESHOLD = 2; // More sensitive movement detection
const MAX_SPEED_THRESHOLD = 30; // Maximum realistic speed in km/h
const SPEED_SMOOTHING_WINDOW = 3; // Number of samples for speed smoothing

export const calculateSpeed = (positions: Position[]): number => {
  if (positions.length < 2) return 0;

  // Use multiple samples for speed calculation
  const speeds: number[] = [];
  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];

    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // Convert to seconds

    if (distance > MIN_MOVEMENT_THRESHOLD && timeDiff > 0) {
      const speed = (distance * PIXEL_TO_METER / timeDiff) * MS_TO_KMH;
      if (speed < MAX_SPEED_THRESHOLD) {
        speeds.push(speed);
      }
    }
  }

  if (speeds.length === 0) return 0;

  // Calculate moving average for smooth speed
  const recentSpeeds = speeds.slice(-SPEED_SMOOTHING_WINDOW);
  const averageSpeed = recentSpeeds.reduce((a, b) => a + b, 0) / recentSpeeds.length;
  
  return Math.round(averageSpeed);
};

export const determineAction = (positions: Position[], speed: number): string => {
  if (positions.length < 2) return 'stationary';

  // Calculate vertical movement pattern
  const recentPositions = positions.slice(-3);
  let verticalMovement = 0;
  let horizontalMovement = 0;

  for (let i = 1; i < recentPositions.length; i++) {
    const prev = recentPositions[i - 1];
    const curr = recentPositions[i];
    
    verticalMovement += Math.abs(curr.y - prev.y);
    horizontalMovement += Math.abs(curr.x - prev.x);
  }

  // Enhanced action detection
  if (speed < 1) {
    if (verticalMovement < MIN_MOVEMENT_THRESHOLD * 2) {
      return 'sitting';
    }
    return 'standing';
  }

  if (speed < 3) {
    return verticalMovement > horizontalMovement ? 'standing' : 'walking slowly';
  }
  
  if (speed < 8) return 'walking';
  if (speed < 15) return 'walking fast';
  return 'running';
};