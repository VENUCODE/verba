import React, { useEffect, useRef, useCallback } from 'react';

interface WaveformVisualizerProps {
  audioStream: MediaStream | null;
  isRecording?: boolean;
  barCount?: number;
  barColor?: string;
  activeBarColor?: string;
  backgroundColor?: string;
  height?: number;
  visualizationType?: 'bars' | 'line';
}

function WaveformVisualizer({
  audioStream,
  isRecording = false,
  barCount = 32,
  barColor = 'rgb(148, 163, 184)',
  activeBarColor = 'rgb(14, 165, 233)',
  backgroundColor = 'transparent',
  height = 64,
  visualizationType = 'bars',
}: WaveformVisualizerProps) {
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
      // Create audio context
      audioContextRef.current = new AudioContext();

      // Create analyser node
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;

      // Create media stream source
      sourceRef.current = audioContextRef.current.createMediaStreamSource(audioStream);
      sourceRef.current.connect(analyserRef.current);

      // Initialize data array
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
    } catch (error) {
      console.error('Failed to initialize audio analyser:', error);
    }

    return () => {
      cleanup();
    };
  }, [audioStream, cleanup]);

  // Drawing function for bars visualization
  const drawBars = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, canvasHeight: number) => {
      const barWidth = (width / barCount) * 0.7;
      const gap = (width / barCount) * 0.3;

      // Get frequency data if available
      if (analyserRef.current && dataArrayRef.current && isRecording) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);

        // Map frequency data to bar heights
        const step = Math.floor(dataArrayRef.current.length / barCount);
        for (let i = 0; i < barCount; i++) {
          const dataIndex = i * step;
          const value = dataArrayRef.current[dataIndex] / 255;
          const targetHeight = value * canvasHeight * 0.8;
          // Smooth transition
          barsRef.current[i] = barsRef.current[i] * 0.7 + targetHeight * 0.3;
        }
      } else {
        // Decay bars when not recording
        for (let i = 0; i < barCount; i++) {
          barsRef.current[i] *= 0.92;
        }
      }

      // Draw bars
      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap) + gap / 2;
        const barHeight = Math.max(barsRef.current[i], 2);
        const y = (canvasHeight - barHeight) / 2;

        // Calculate color based on intensity
        ctx.fillStyle = isRecording && barHeight > 3 ? activeBarColor : barColor;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    },
    [barCount, barColor, activeBarColor, isRecording]
  );

  // Drawing function for line visualization
  const drawLine = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, canvasHeight: number) => {
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = isRecording ? activeBarColor : barColor;

      if (analyserRef.current && dataArrayRef.current && isRecording) {
        analyserRef.current.getByteTimeDomainData(dataArrayRef.current);

        const sliceWidth = width / dataArrayRef.current.length;
        let x = 0;

        for (let i = 0; i < dataArrayRef.current.length; i++) {
          const v = dataArrayRef.current[i] / 128.0;
          const y = (v * canvasHeight) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }
      } else {
        // Draw flat line when not recording
        ctx.moveTo(0, canvasHeight / 2);
        ctx.lineTo(width, canvasHeight / 2);
      }

      ctx.stroke();
    },
    [barColor, activeBarColor, isRecording]
  );

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const { width, height: canvasHeight } = canvas;

      // Clear canvas
      ctx.clearRect(0, 0, width, canvasHeight);

      // Fill background
      if (backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, canvasHeight);
      }

      // Draw visualization
      if (visualizationType === 'bars') {
        drawBars(ctx, width, canvasHeight);
      } else {
        drawLine(ctx, width, canvasHeight);
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawBars, drawLine, backgroundColor, visualizationType]);

  return (
    <div
      className="w-full rounded-lg overflow-hidden bg-surface-100"
      style={{ height: `${height}px` }}
    >
      <canvas
        ref={canvasRef}
        width={320}
        height={height}
        className="w-full h-full"
      />
    </div>
  );
}

export default WaveformVisualizer;
