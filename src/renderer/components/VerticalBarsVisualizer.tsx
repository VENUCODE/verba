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
  const idleAnimationPhaseRef = useRef<number>(0); // Phase for idle breathing animation

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

  // Easing function for smooth, organic animation (ease-out cubic)
  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  // Drawing function with vertical bars and premium effects
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const { width, height: canvasHeight } = canvas;
    // Clear to transparent background
    ctx.clearRect(0, 0, width, canvasHeight);

    // Bar dimensions - thinner bars with smaller gaps for premium look
    const targetBarWidth = 2.5;
    const gap = 1.5; // Reduced gap for smoother appearance
    const totalBarWidth = barCount * targetBarWidth + (barCount - 1) * gap;
    const startX = (width - totalBarWidth) / 2;

    // Increment idle animation phase for breathing effect
    if (!isRecording) {
      idleAnimationPhaseRef.current += 0.02; // Slow, subtle animation
    }

    // Get frequency data if available
    if (analyserRef.current && dataArrayRef.current && isRecording) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);

      // Map frequency data to bar heights with smoother interpolation
      const step = Math.floor(dataArrayRef.current.length / barCount);
      for (let i = 0; i < barCount; i++) {
        const dataIndex = i * step;
        const value = dataArrayRef.current[dataIndex] / 255;
        const targetHeight = value * canvasHeight * 0.95; // 95% max height

        // Smoother transition using ease-out cubic interpolation
        const currentHeight = barsRef.current[i];
        const diff = targetHeight - currentHeight;
        barsRef.current[i] = currentHeight + diff * 0.25; // Faster response, smoother feel

        // Store color intensity for dynamic gradient coloring
        colorIntensityRef.current[i] = colorIntensityRef.current[i] * 0.75 + value * 0.25;
      }
    } else {
      // Idle state: gentle breathing wave pattern with ambient animation
      const centerIndex = (barCount - 1) / 2;
      for (let i = 0; i < barCount; i++) {
        // Calculate distance from center (normalized to 0-1)
        const distanceFromCenter = Math.abs(i - centerIndex) / centerIndex;

        // Base wave pattern (symmetric from center)
        const waveValue = Math.cos(distanceFromCenter * Math.PI);

        // Add breathing animation - gentle pulsing effect
        const breathingPhase = Math.sin(idleAnimationPhaseRef.current) * 0.15 + 0.85; // Oscillate 0.7 to 1.0

        // Add flowing wave animation across bars
        const flowingWave = Math.sin(idleAnimationPhaseRef.current + i * 0.3) * 0.1;

        // Combine effects for organic idle movement
        const targetHeight = canvasHeight * (0.35 + (waveValue + 1) * 0.15) * breathingPhase + canvasHeight * flowingWave;

        // Very smooth transition to target height
        const currentHeight = barsRef.current[i];
        const diff = targetHeight - currentHeight;
        barsRef.current[i] = currentHeight + diff * 0.08; // Slow, smooth transition

        // Minimal color intensity for idle state
        colorIntensityRef.current[i] = colorIntensityRef.current[i] * 0.9;
      }
    }

    // Calculate reflection area (30% of total height, below center)
    const mainAreaHeight = canvasHeight * 0.7;
    const reflectionAreaHeight = canvasHeight * 0.3;
    const centerY = mainAreaHeight / 2;
    const reflectionStartY = mainAreaHeight;

    // Draw bars twice: once for main bars, once for reflection
    for (let pass = 0; pass < 2; pass++) {
      const isReflection = pass === 1;

      for (let i = 0; i < barCount; i++) {
        const x = startX + i * (targetBarWidth + gap);
        const barHeight = Math.max(barsRef.current[i], 2);

        let y: number;
        let gradientStartY: number;
        let gradientEndY: number;

        if (!isReflection) {
          // Main bars - centered vertically
          y = centerY - barHeight / 2;
          gradientStartY = y;
          gradientEndY = y + barHeight;
        } else {
          // Reflection bars - flipped below main area
          // Map reflection into the reflection area (scaled down)
          const reflectionHeight = barHeight * 0.5; // Reflection is 50% of original height
          y = reflectionStartY;
          gradientStartY = y + reflectionHeight;
          gradientEndY = y;
        }

        // Create vertical gradient
        const gradient = ctx.createLinearGradient(x, gradientStartY, x, gradientEndY);

        if (isRecording) {
          // Recording state: vibrant sky-blue to violet gradient with intensity variation
          const intensity = colorIntensityRef.current[i];

          if (!isReflection) {
            // Main bars - vibrant gradient
            // Sky blue (0, 191, 255) to violet (138, 43, 226)
            gradient.addColorStop(0, `rgba(0, 191, 255, ${0.9 + intensity * 0.1})`); // Bright sky blue
            gradient.addColorStop(0.5, `rgba(88, 117, 240, 1)`); // Mid transition blue-violet
            gradient.addColorStop(1, `rgba(138, 43, 226, ${0.85 + intensity * 0.15})`); // Deep violet
          } else {
            // Reflection - faded gradient
            gradient.addColorStop(0, `rgba(138, 43, 226, ${0.1 + intensity * 0.05})`); // Faded violet (flipped)
            gradient.addColorStop(0.5, `rgba(88, 117, 240, ${0.15 + intensity * 0.05})`);
            gradient.addColorStop(1, `rgba(0, 191, 255, 0.05)`); // Very faded sky blue
          }
        } else {
          // Idle state: soft, muted gradient
          if (!isReflection) {
            // Main bars - soft white to light blue
            gradient.addColorStop(0, 'rgba(200, 220, 255, 0.7)'); // Soft light blue
            gradient.addColorStop(0.5, 'rgba(180, 200, 240, 0.65)');
            gradient.addColorStop(1, 'rgba(160, 180, 220, 0.6)'); // Slightly darker soft blue
          } else {
            // Reflection - very subtle
            gradient.addColorStop(0, 'rgba(160, 180, 220, 0.15)');
            gradient.addColorStop(0.5, 'rgba(180, 200, 240, 0.1)');
            gradient.addColorStop(1, 'rgba(200, 220, 255, 0.05)');
          }
        }

        ctx.fillStyle = gradient;

        // Draw rounded rectangle bar
        const radius = Math.min(targetBarWidth / 2, 1.5); // Slightly rounded caps
        const drawHeight = isReflection ? barHeight * 0.5 : barHeight;

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + targetBarWidth - radius, y);
        ctx.quadraticCurveTo(x + targetBarWidth, y, x + targetBarWidth, y + radius);
        ctx.lineTo(x + targetBarWidth, y + drawHeight - radius);
        ctx.quadraticCurveTo(x + targetBarWidth, y + drawHeight, x + targetBarWidth - radius, y + drawHeight);
        ctx.lineTo(x + radius, y + drawHeight);
        ctx.quadraticCurveTo(x, y + drawHeight, x, y + drawHeight - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();

        // Add subtle glow effect for recording peaks
        if (isRecording && !isReflection && colorIntensityRef.current[i] > 0.6) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = 'rgba(88, 117, 240, 0.5)';
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }

    // Continue animation
    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(draw);
    } else {
      // Keep idle animation running
      animationFrameRef.current = requestAnimationFrame(draw);
    }
  }, [barCount, isRecording, height]);

  // Animation loop - continuous for smooth idle and recording states
  useEffect(() => {
    // Start continuous animation loop
    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [draw]);

  // Calculate canvas width based on actual bar width (2.5px) + 1.5px gaps
  // 18 bars * 2.5px = 45px, 17 gaps * 1.5px = 25.5px, total = 70.5px, add padding = ~95px
  const canvasWidth = Math.max(95, barCount * 2.5 + (barCount - 1) * 1.5 + 24);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={height}
        className="w-full h-full"
        style={{
          imageRendering: 'auto',
          backgroundColor: 'transparent'
        }}
      />
    </div>
  );
}

export default VerticalBarsVisualizer;
