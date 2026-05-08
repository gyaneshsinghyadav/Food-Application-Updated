import React, { useRef, useEffect, useState } from 'react';
import { Camera, RefreshCw, XCircle, AlertCircle } from 'lucide-react';

const CameraCapture = ({ onCapture, onCancel }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // Default to back camera

  const startCamera = async () => {
    try {
      // Clear any previous errors
      setError(null);
      
      // Stop any existing stream
      if (stream) {
        stopCamera();
      }
      
      // Get new stream with selected camera
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode }
      });
      
      // Set stream to state and video element
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(`Camera error: ${err.message || 'Could not access camera'}`);
    }
  };

  const switchCamera = () => {
    // Toggle between front and back camera
    setFacingMode(facingMode === 'environment' ? 'user' : 'environment');
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the video frame onto the canvas
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        onCapture(blob);
        stopCamera();
      }, 'image/jpeg', 0.95); // 95% quality JPEG
    } catch (err) {
      console.error("Error capturing image:", err);
      setError(`Capture error: ${err.message || 'Failed to capture image'}`);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
  };

  // Initialize camera when component mounts
  useEffect(() => {
    startCamera();
    
    // Cleanup when component unmounts
    return () => {
      stopCamera();
    };
  }, [facingMode]); // Re-run when facingMode changes

  return (
    <div className="flex flex-col items-center bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl w-full max-w-md mx-auto my-4">
      <div className="relative w-full aspect-[3/4] bg-black flex items-center justify-center">
        {!stream && !error && <div className="animate-pulse text-gray-500">Starting camera...</div>}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover transition-opacity duration-300 ${stream ? 'opacity-100' : 'opacity-0'}`}
          onLoadedMetadata={() => videoRef.current?.play()}
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>
      
      {error && (
        <div className="w-full p-4 bg-red-900/50 border-y border-red-500/50 text-red-200 flex items-center gap-2 text-sm">
          <AlertCircle size={18} className="shrink-0" /> <span className="break-words">{error}</span>
        </div>
      )}
      
      <div className="w-full p-6 bg-gray-900 flex justify-center gap-6 items-center border-t border-gray-800">
        <button onClick={switchCamera} disabled={!stream} className="p-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded-full transition-colors" aria-label="Switch Camera">
          <RefreshCw size={24} />
        </button>
        <button onClick={captureImage} disabled={!stream} className="p-5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-full transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] transform hover:scale-105 active:scale-95" aria-label="Capture">
          <Camera size={32} />
        </button>
        <button onClick={onCancel} className="p-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-full transition-colors" aria-label="Cancel">
          <XCircle size={24} />
        </button>
      </div>
    </div>
  );
};

export default CameraCapture;
