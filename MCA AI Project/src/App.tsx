import React from 'react';
import { WebcamDetector } from './components/Camera';
import { Camera } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Camera className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">
              Real-time Object Detection
            </h1>
          </div>
          <p className="text-gray-600">
            Detect objects and their speeds in real-time using your camera
          </p>
        </header>

        <main>
          <WebcamDetector />
          
          <div className="mt-8 p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">How it works</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Click "Start Detection" to begin camera feed</li>
              <li>Objects will be detected and highlighted in real-time</li>
              <li>Speed estimates are shown in kilometers per hour (km/h)</li>
              <li>The detection works best with good lighting and clear movement</li>
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;