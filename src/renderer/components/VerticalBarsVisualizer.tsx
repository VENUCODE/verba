import React, { useEffect, useRef, useCallback } from 'react';

interface VerticalBarsVisualizerProps {
  audioStream: MediaStream | null;
  isRecording?: boolean;
  barCount?: number;
  height?: number;
}

function VerticalBarsVisualizer({
  audioStream,
  isRecording = false,
  barCount = 18,
  height = 32,
}: VerticalBarsVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const barsRef = useRef<number[]>(Array(barCount).fill(0));
  const colorIntensityRef = useRef<number[]>(Array(barCount).fill(0));
  
  // Ensure bars array length matches barCount
  useEffect(() => {
    if (barsRef.current.length !== barCount) {
      barsRef.current = Array(barCount).fill(0);
      colorIntensityRef.current = Array(barCount).fill(0);
    }
  }, [barCount]);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // Cleanup audio context and analyser
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    dataArrayRef.current = null;
  }, []);

  // Initialize audio context and analyser when stream changes
  useEffect(() => {
    if (!audioStream) {
      cleanup();
      return;
    }

    try {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.7;

      sourceRef.current = audioContextRef.current.createMediaStreamSource(audioStream);
      sourceRef.current.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
    } catch (error) {
      console.error('Failed to initialize audio analyser:', error);
    }

    return () => {
      cleanup();
    };
  }, [audioStream, cleanup]);

  // Drawing function with vertical bars
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height: canvasHeight } = canvas;
    ctx.clearRect(0, 0, width, canvasHeight);

    // Target bar width: 3px each (reduced from 4px)
    const targetBarWidth = 2.5;
    const gap = 2; // 2px gap between bars for better spacing
    const totalBarWidth = barCount * targetBarWidth + (barCount - 1) * gap;
    const startX = (width - totalBarWidth) / 2; // Center the bars
    
    // Get frequency data if available
    if (analyserRef.current && dataArrayRef.current && isRecording) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);

      // Map frequency data to bar heights
      const step = Math.floor(dataArrayRef.current.length / barCount);
      for (let i = 0; i < barCount; i++) {
        const dataIndex = i * step;
        const value = dataArrayRef.current[dataIndex] / 255;
        // Increase max height to 100% for taller bars
        const targetHeight = value * canvasHeight * 1.0;
        // Smooth transition
        barsRef.current[i] = barsRef.current[i] * 0.6 + targetHeight * 0.4;
        // Store color intensity based on bar height for dynamic coloring
        colorIntensityRef.current[i] = colorIntensityRef.current[i] * 0.7 + value * 0.3;
      }
    } else {
      // Set inactive bars to variable heights creating a symmetric wave pattern
      // Bars are symmetric: left side mirrors right side
      const centerIndex = (barCount - 1) / 2;
      for (let i = 0; i < barCount; i++) {
        // Calculate distance from center (normalized to 0-1)
        const distanceFromCenter = Math.abs(i - centerIndex) / centerIndex;
        // Create symmetric wave pattern using cosine (peaks at center, valleys at edges)
        const waveValue = Math.cos(distanceFromCenter * Math.PI);
        // Map wave value (1 at center, -1 at edges) to height range (40% to 80% of canvas) - increased height
        const targetHeight = canvasHeight * (0.4 + (waveValue + 1) * 0.2);
        
        // Smooth transition to target height
        if (Math.abs(barsRef.current[i] - targetHeight) > 1) {
          barsRef.current[i] = barsRef.current[i] * 0.85 + targetHeight * 0.15;
        } else {
          barsRef.current[i] = targetHeight;
        }
        // Reset color intensity for inactive bars
        colorIntensityRef.current[i] = 0;
      }
    }

    // Draw vertical bars
    const centerY = canvasHeight / 2; // Center of canvas
    
    for (let i = 0; i < barCount; i++) {
      const x = startX + i * (targetBarWidth + gap);
      const barHeight = Math.max(barsRef.current[i], 2);
      // Center bars vertically: position bar so it's centered around centerY
      const y = centerY - barHeight / 2;

      // Dynamic coloring based on recording state and intensity
      if (isRecording) {
        // During recording: color varies from white to blue based on intensity
        const intensity = colorIntensityRef.current[i];
        const red = Math.floor(255 * (1 - intensity * 0.7)); // White to less red
        const green = Math.floor(255 * (1 - intensity * 0.5)); // White to less green
        const blue = 255; // Keep blue high for blue tint
        ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, 1)`;
      } else {
        // Inactive bars: white color for static waveform
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      }

      ctx.beginPath();
      const radius = targetBarWidth / 2;
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + targetBarWidth - radius, y);
      ctx.quadraticCurveTo(x + targetBarWidth, y, x + targetBarWidth, y + radius);
      ctx.lineTo(x + targetBarWidth, y + barHeight - radius);
      ctx.quadraticCurveTo(x + targetBarWidth, y + barHeight, x + targetBarWidth - radius, y + barHeight);
      ctx.lineTo(x + radius, y + barHeight);
      ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
    }

    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(draw);
    }
  }, [barCount, isRecording, height]);

  // Animation loop
  useEffect(() => {
    if (isRecording && audioStream) {
      draw();
    } else {
      // Still draw when not recording for smooth decay
      const interval = setInterval(() => {
        draw();
      }, 50);
      return () => clearInterval(interval);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [draw, isRecording, audioStream]);

  // Calculate canvas width: 3px per bar + 2px gap between bars (consistent width)
  // Add some padding on sides for better appearance
  const canvasWidth = Math.max(80, barCount * 3 + (barCount - 1) * 2 + 16);
  
  return (
    <div className="w-full h-full bg-black rounded">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={height}
        className="w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}

export default VerticalBarsVisualizer;
