import React from 'react';

interface TrackedObject {
  id: string;
  class: string;
  bbox: number[];
  speed: number;
  score: number;
  action: string;
}

interface ObjectTrackerProps {
  objects: TrackedObject[];
  width: number;
  height: number;
}

export const ObjectTracker: React.FC<ObjectTrackerProps> = ({ objects, width, height }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear previous frame
    ctx.clearRect(0, 0, width, height);

    // Draw detected objects
    objects.forEach(obj => {
      const [x, y, w, h] = obj.bbox;
      
      // Draw bounding box
      ctx.strokeStyle = getColorByConfidence(obj.score);
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Prepare label text
      const speedText = obj.speed > 0 ? ` - ${obj.speed} km/h` : '';
      const label = `${obj.class} (${obj.action})${speedText}`;
      
      ctx.font = '16px Arial';
      const labelWidth = ctx.measureText(label).width + 10;

      // Draw label background
      ctx.fillStyle = getColorByConfidence(obj.score);
      ctx.fillRect(x - 1, y - 25, labelWidth, 20);

      // Draw label text
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(label, x + 4, y - 10);
    });
  }, [objects, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
    />
  );
};

// Helper function to get color based on confidence score
const getColorByConfidence = (score: number): string => {
  if (score > 0.8) return '#00FF00';
  if (score > 0.6) return '#FFA500';
  return '#FF0000';
};