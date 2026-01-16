import React, { useEffect, useRef, useCallback } from 'react';

interface MiniVisualizerProps {
  audioStream: MediaStream | null;
  isRecording?: boolean;
  barCount?: number;
}

function MiniVisualizer({
  audioStream,
  isRecording = false,
  barCount = 7,
}: MiniVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const barsRef = useRef<number[]>(Array(barCount).fill(0));
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

  // Drawing function with gradient and glow effects
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const barWidth = width / (barCount * 2 - 1);
    const gap = barWidth;

    // Get frequency data if available
    if (analyserRef.current && dataArrayRef.current && isRecording) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);

      // Map frequency data to bar heights
      const step = Math.floor(dataArrayRef.current.length / barCount);
      for (let i = 0; i < barCount; i++) {
        const dataIndex = i * step;
        const value = dataArrayRef.current[dataIndex] / 255;
        const targetHeight = value * height * 0.9;
        // Smooth transition
        barsRef.current[i] = barsRef.current[i] * 0.6 + targetHeight * 0.4;
      }
    } else {
      // Decay bars when not recording
      for (let i = 0; i < barCount; i++) {
        barsRef.current[i] *= 0.85;
      }
    }

    // Draw bars with gradient and glow
    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + gap);
      const barHeight = Math.max(barsRef.current[i], 2);
      const y = (height - barHeight) / 2;

      // Calculate intensity (0-1)
      const intensity = barHeight / height;
      
      // Create gradient from blue to red based on intensity
      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      if (intensity > 0.5) {
        // High intensity: red/orange
        gradient.addColorStop(0, `rgba(239, 68, 68, ${0.8 + intensity * 0.2})`);
        gradient.addColorStop(0.5, `rgba(251, 146, 60, ${0.7 + intensity * 0.3})`);
        gradient.addColorStop(1, `rgba(59, 130, 246, ${0.6})`);
      } else {
        // Low intensity: blue
        gradient.addColorStop(0, `rgba(59, 130, 246, ${0.6 + intensity * 0.4})`);
        gradient.addColorStop(1, `rgba(37, 99, 235, ${0.4 + intensity * 0.4})`);
      }

      // Draw glow effect
      if (isRecording && barHeight > 3) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = intensity > 0.5 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(59, 130, 246, 0.6)';
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      const radius = barWidth / 2;
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, y + barHeight - radius);
      ctx.quadraticCurveTo(x + barWidth, y + barHeight, x + barWidth - radius, y + barHeight);
      ctx.lineTo(x + radius, y + barHeight);
      ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();

      // Reset shadow
      ctx.shadowBlur = 0;
    }

    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(draw);
    }
  }, [barCount, isRecording]);

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

  return (
    <canvas
      ref={canvasRef}
      width={80}
      height={24}
      className="w-full h-full"
      style={{ imageRendering: 'crisp-edges' }}
    />
  );
}

export default MiniVisualizer;
