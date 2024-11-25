import React, { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as cocossd from '@tensorflow-models/coco-ssd';
import { calculateSpeed, determineAction } from '../utils/speedCalculation';
import { ObjectTracker } from './ObjectTracker';
import { Camera, Pause, Play } from 'lucide-react';

interface Detection {
  bbox: number[];
  class: string;
  score: number;
}

interface TrackedObject {
  id: string;
  class: string;
  positions: { x: number; y: number; timestamp: number }[];
  speed: number;
  bbox: number[];
  score: number;
  action: string;
  lastUpdate: number;
}

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const DETECTION_INTERVAL = 33; // ~30 FPS for smoother tracking
const POSITION_HISTORY = 15; // Increased history for better speed calculation
const OBJECT_TIMEOUT = 1000; // Remove objects after 1 second of no updates

export const WebcamDetector: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [model, setModel] = useState<cocossd.ObjectDetection | null>(null);
  const [trackedObjects, setTrackedObjects] = useState<TrackedObject[]>([]);
  const detectionInterval = useRef<number>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initTensorFlow = async () => {
      try {
        // Reset any previous initialization
        await tf.engine().reset();
        
        // Initialize backend
        await tf.setBackend('webgl');
        await tf.ready();

        // Only proceed if component is still mounted
        if (!isMounted) return;

        // Load the model
        const loadedModel = await cocossd.load({
          base: 'lite_mobilenet_v2'
        });

        if (!isMounted) return;

        setModel(loadedModel);
        setIsModelLoading(false);
        setError(null);
      } catch (err) {
        console.error('Error initializing TensorFlow:', err);
        if (isMounted) {
          setError('Failed to initialize detection model. Please refresh the page and try again.');
          setIsModelLoading(false);
        }
      }
    };

    initTensorFlow();

    return () => {
      isMounted = false;
      if (detectionInterval.current) {
        clearInterval(detectionInterval.current);
      }
      // Cleanup TensorFlow resources
      tf.engine().reset();
    };
  }, []);

  const setupVideo = async () => {
    if (!videoRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: CANVAS_WIDTH },
          height: { ideal: CANVAS_HEIGHT }
        }
      });

      videoRef.current.srcObject = stream;
      await new Promise<void>((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => resolve();
        }
      });

      videoRef.current.play();
      setIsRunning(true);
      startDetection();
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Failed to access camera. Please ensure camera permissions are granted.');
    }
  };

  const startDetection = () => {
    if (!model || detectionInterval.current) return;

    detectionInterval.current = window.setInterval(async () => {
      if (!videoRef.current || !model) return;

      try {
        // Ensure video is ready
        if (videoRef.current.readyState !== 4) return;

        const predictions = await model.detect(videoRef.current);
        const currentTime = Date.now();

        setTrackedObjects(prevObjects => {
          // Update existing objects and add new ones
          const updatedObjects = predictions.map((pred: Detection) => {
            const [x, y, width, height] = pred.bbox;
            const centerX = x + width / 2;
            const centerY = y + height / 2;
            
            // Find closest existing object of same class
            const existingObject = prevObjects.find(obj => 
              obj.class === pred.class &&
              Math.abs(obj.bbox[0] + obj.bbox[2]/2 - centerX) < 50 &&
              Math.abs(obj.bbox[1] + obj.bbox[3]/2 - centerY) < 50
            );

            const positions = [...(existingObject?.positions || [])];
            positions.push({ x: centerX, y: centerY, timestamp: currentTime });
            
            if (positions.length > POSITION_HISTORY) {
              positions.shift();
            }

            const speed = calculateSpeed(positions);
            const action = determineAction(positions, speed);

            return {
              id: existingObject?.id || `${pred.class}-${Math.random()}`,
              class: pred.class,
              positions,
              speed,
              bbox: pred.bbox,
              score: pred.score,
              action,
              lastUpdate: currentTime
            };
          });

          // Remove stale objects
          return updatedObjects.filter(obj => 
            currentTime - obj.lastUpdate < OBJECT_TIMEOUT
          );
        });
      } catch (error) {
        console.error('Detection error:', error);
      }
    }, DETECTION_INTERVAL);
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
      detectionInterval.current = undefined;
    }
    
    setIsRunning(false);
    setTrackedObjects([]);
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />
        {isRunning && (
          <ObjectTracker
            objects={trackedObjects}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
          />
        )}
        {isModelLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-white text-lg">Loading model...</div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-red-500 text-lg bg-white p-4 rounded-lg">
              {error}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-center gap-4">
        {!isRunning ? (
          <button
            onClick={setupVideo}
            disabled={isModelLoading}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5" />
            Start Detection
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Pause className="w-5 h-5" />
            Stop Detection
          </button>
        )}
      </div>
    </div>
  );
};