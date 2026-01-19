import { useState, useRef, useCallback, useEffect } from 'react';
import { AUDIO_CONSTRAINTS, RECORDING_OPTIONS, WHISPER_MAX_FILE_SIZE, SILENCE_DETECTION } from '../constants';
import { parseTranscriptionError } from '../utils/errorHandling';

export type RecordingStatus = 'idle' | 'recording' | 'processing';

export interface AudioRecorderOptions {
  maxDuration?: number; // in seconds, default 120
  deviceId?: string | null; // specific audio input device
  onMaxDurationReached?: () => void;
  // Silence detection options
  silenceDetectionEnabled?: boolean;
  silenceDurationMs?: number;
  silenceThreshold?: number; // Deprecated: No longer used, kept for backward compatibility
  onSilenceDetected?: () => void;
}

export interface AudioRecorderResult {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  isRecording: boolean;
  status: RecordingStatus;
  duration: number;
  fileSize: number;
  audioBlob: Blob | null;
  audioStream: MediaStream | null;
  error: string | null;
  clearError: () => void;
}

export function useAudioRecorder(options: AudioRecorderOptions = {}): AudioRecorderResult {
  const {
    maxDuration = 120,
    deviceId = null,
    onMaxDurationReached,
    silenceDetectionEnabled = SILENCE_DETECTION.defaultEnabled,
    silenceDurationMs = SILENCE_DETECTION.defaultDurationMs,
    // silenceThreshold is deprecated and no longer used (adaptive algorithm calculates dynamically)
    onSilenceDetected,
  } = options;

  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [fileSize, setFileSize] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const dataRequestIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const maxDurationReachedRef = useRef(false);

  // Silence detection refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceStartTimeRef = useRef<number | null>(null);
  const silenceCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const silenceDetectedRef = useRef(false);

  // Adaptive threshold tracking
  const rmsHistoryRef = useRef<number[]>([]);
  const baselineNoiseRef = useRef<number>(0);
  const peakSpeechLevelRef = useRef<number>(0);
  const isCalibrationCompleteRef = useRef(false);
  const calibrationSamplesRef = useRef<number[]>([]);

  // NEW: Speech and silence confirmation tracking
  const speechConfirmedRef = useRef(false);           // Has user actually spoken?
  const consecutiveSpeechSamplesRef = useRef(0);      // Count of consecutive speech samples
  const consecutiveSilenceSamplesRef = useRef(0);     // Count of consecutive silence samples

  // Clear timers and silence detection resources on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (dataRequestIntervalRef.current) {
        clearInterval(dataRequestIntervalRef.current);
      }
      if (silenceCheckIntervalRef.current) {
        clearInterval(silenceCheckIntervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Monitor for max duration
  useEffect(() => {
    if (status === 'recording' && duration >= maxDuration && !maxDurationReachedRef.current) {
      maxDurationReachedRef.current = true;
      stopRecording();
      onMaxDurationReached?.();
    }
  }, [duration, maxDuration, status, onMaxDurationReached]);

  // Monitor for max file size (25MB for Whisper API)
  useEffect(() => {
    if (status === 'recording' && fileSize >= WHISPER_MAX_FILE_SIZE) {
      setError('Maximum file size (25MB) reached. Stopping recording.');
      stopRecording();
    }
  }, [fileSize, status]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      setDuration(0);
      setFileSize(0);
      audioChunksRef.current = [];
      maxDurationReachedRef.current = false;
      silenceDetectedRef.current = false;
      silenceStartTimeRef.current = null;

      // Reset adaptive threshold tracking
      rmsHistoryRef.current = [];
      baselineNoiseRef.current = 0;
      peakSpeechLevelRef.current = 0;
      isCalibrationCompleteRef.current = false;
      calibrationSamplesRef.current = [];

      // Reset speech confirmation tracking
      speechConfirmedRef.current = false;
      consecutiveSpeechSamplesRef.current = 0;
      consecutiveSilenceSamplesRef.current = 0;

      // Build audio constraints with optional device selection
      const constraints: MediaStreamConstraints = {
        ...AUDIO_CONSTRAINTS,
        audio: {
          ...(typeof AUDIO_CONSTRAINTS.audio === 'object' ? AUDIO_CONSTRAINTS.audio : {}),
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
      };

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setAudioStream(stream);

      // Check if the MIME type is supported
      let mimeType = RECORDING_OPTIONS.mimeType;
      if (mimeType && !MediaRecorder.isTypeSupported(mimeType)) {
        // Fallback to other supported formats
        const fallbackTypes = ['audio/webm', 'audio/ogg', 'audio/mp4'];
        const supported = fallbackTypes.find((type) => MediaRecorder.isTypeSupported(type));
        if (supported) {
          mimeType = supported;
        } else {
          throw new Error('No supported audio format found for MediaRecorder');
        }
      }

      const recorderOptions: MediaRecorderOptions = {
        ...RECORDING_OPTIONS,
      };
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }

      const mediaRecorder = new MediaRecorder(stream, recorderOptions);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          // Calculate current file size
          const currentSize = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);
          setFileSize(currentSize);
        }
      };

      mediaRecorder.onerror = () => {
        setError('Recording error occurred');
        setStatus('idle');
      };

      mediaRecorder.onstop = () => {
        // Create blob from chunks
        const recordedMimeType = mediaRecorder.mimeType || 'audio/webm;codecs=opus';
        const blob = new Blob(audioChunksRef.current, { type: recordedMimeType });
        setAudioBlob(blob);
        setFileSize(blob.size);
        setStatus('processing');

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
        setAudioStream(null);

        // Clear timers
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        if (dataRequestIntervalRef.current) {
          clearInterval(dataRequestIntervalRef.current);
          dataRequestIntervalRef.current = null;
        }

        // Set back to idle after processing
        setTimeout(() => {
          setStatus('idle');
        }, 100);
      };

      // Start recording without timeslice to avoid Chromium 30-second limit bug
      mediaRecorder.start();
      setStatus('recording');
      startTimeRef.current = Date.now();

      // Request data periodically to get chunks for file size monitoring
      dataRequestIntervalRef.current = setInterval(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.requestData();
        }
      }, 1000);

      // Start duration timer
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
      }, 100);

      // Set up silence detection if enabled
      if (silenceDetectionEnabled && onSilenceDetected) {
        try {
          // Create audio context and analyser
          const audioContext = new AudioContext();
          audioContextRef.current = audioContext;

          const analyser = audioContext.createAnalyser();
          analyser.fftSize = SILENCE_DETECTION.fftSize;
          analyser.smoothingTimeConstant = SILENCE_DETECTION.smoothingTimeConstant;
          analyserRef.current = analyser;

          // Connect the stream to the analyser
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);

          // Create data array for frequency analysis
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          // Start adaptive silence detection interval
          silenceCheckIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTimeRef.current;

            // Don't check if we haven't recorded minimum duration yet
            if (elapsed < SILENCE_DETECTION.minRecordingDurationMs) {
              return;
            }

            // Get frequency data
            analyser.getByteFrequencyData(dataArray);

            // Calculate RMS energy (normalized 0-1)
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i] * dataArray[i];
            }
            const currentRms = Math.sqrt(sum / dataArray.length) / 255;

            // Add to moving average history
            rmsHistoryRef.current.push(currentRms);
            if (rmsHistoryRef.current.length > SILENCE_DETECTION.movingAverageSamples) {
              rmsHistoryRef.current.shift();
            }

            // Calculate moving average
            const avgRms =
              rmsHistoryRef.current.reduce((acc, val) => acc + val, 0) /
              rmsHistoryRef.current.length;

            // CALIBRATION PHASE: Establish baseline noise floor
            if (!isCalibrationCompleteRef.current) {
              if (elapsed < SILENCE_DETECTION.calibrationDurationMs) {
                // Collect calibration samples
                calibrationSamplesRef.current.push(currentRms);
                // CRITICAL FIX: Clear silence timer during calibration to prevent premature triggering
                silenceStartTimeRef.current = null;
                return; // Don't perform silence detection during calibration
              } else {
                // Calibration complete - calculate baseline
                if (calibrationSamplesRef.current.length > 0) {
                  // Sort samples to find median (more robust than average for noisy data)
                  const sortedSamples = [...calibrationSamplesRef.current].sort((a, b) => a - b);
                  const medianIndex = Math.floor(sortedSamples.length / 2);
                  const medianLevel = sortedSamples[medianIndex];

                  // Set baseline as median * multiplier to account for ambient noise
                  baselineNoiseRef.current = medianLevel * SILENCE_DETECTION.noiseFloorMultiplier;

                  // Initialize peak speech level with a reasonable starting value
                  // Use the 90th percentile of calibration samples as initial peak
                  const percentile90Index = Math.floor(sortedSamples.length * 0.9);
                  peakSpeechLevelRef.current = Math.max(
                    sortedSamples[percentile90Index],
                    SILENCE_DETECTION.minPeakLevel
                  );
                }

                // CRITICAL FIX: Ensure silence timer starts fresh after calibration
                silenceStartTimeRef.current = null;
                isCalibrationCompleteRef.current = true;
              }
            }

            // ADAPTIVE TRACKING PHASE: Update peak speech level
            const noiseThreshold =
              baselineNoiseRef.current * SILENCE_DETECTION.speechThresholdMultiplier;

            // SPEECH CONFIRMATION: Track consecutive speech samples
            if (avgRms > noiseThreshold) {
              // Audio is significantly above noise floor - likely speech
              consecutiveSpeechSamplesRef.current++;
              consecutiveSilenceSamplesRef.current = 0; // Reset silence counter

              // Update peak speech level
              if (avgRms > peakSpeechLevelRef.current) {
                peakSpeechLevelRef.current = avgRms;
              } else {
                peakSpeechLevelRef.current *= SILENCE_DETECTION.peakDecayRate;
                peakSpeechLevelRef.current = Math.max(
                  peakSpeechLevelRef.current,
                  SILENCE_DETECTION.minPeakLevel
                );
              }

              // Confirm speech after enough consecutive samples
              if (
                !speechConfirmedRef.current &&
                consecutiveSpeechSamplesRef.current >= SILENCE_DETECTION.speechConfirmationSamples
              ) {
                speechConfirmedRef.current = true;
              }

              // Reset silence timer when speech is detected
              silenceStartTimeRef.current = null;
            } else {
              // Audio is below speech threshold
              consecutiveSpeechSamplesRef.current = 0; // Reset speech counter

              // SILENCE DETECTION: Only look for silence AFTER speech has been confirmed
              if (speechConfirmedRef.current) {
                const adaptiveSilenceThreshold =
                  peakSpeechLevelRef.current * SILENCE_DETECTION.silenceThresholdPercent;
                const effectiveThreshold = Math.max(adaptiveSilenceThreshold, baselineNoiseRef.current);

                if (avgRms < effectiveThreshold) {
                  // Below silence threshold - increment consecutive silence counter
                  consecutiveSilenceSamplesRef.current++;

                  // Only start silence timer after enough consecutive silence samples
                  // This prevents momentary noise spikes from resetting the timer
                  if (consecutiveSilenceSamplesRef.current >= SILENCE_DETECTION.silenceConfirmationSamples) {
                    if (silenceStartTimeRef.current === null) {
                      silenceStartTimeRef.current = Date.now();
                    } else if (
                      Date.now() - silenceStartTimeRef.current >= silenceDurationMs &&
                      !silenceDetectedRef.current
                    ) {
                      // Silence duration exceeded - trigger callback
                      silenceDetectedRef.current = true;
                      onSilenceDetected();
                    }
                  }
                } else {
                  // Above silence threshold but below speech threshold (ambient noise zone)
                  // Only reset if this persists - occasional spikes shouldn't reset everything
                  consecutiveSilenceSamplesRef.current = Math.max(0, consecutiveSilenceSamplesRef.current - 1);

                  // Reset silence timer if we've lost confirmed silence
                  if (consecutiveSilenceSamplesRef.current < SILENCE_DETECTION.silenceConfirmationSamples) {
                    silenceStartTimeRef.current = null;
                  }
                }
              }
            }
          }, SILENCE_DETECTION.checkIntervalMs);
        } catch (silenceError) {
          // Silence detection setup failed, but recording can continue
          console.warn('Silence detection setup failed:', silenceError);
        }
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
      // Clean up any intervals that may have been started before the error
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (dataRequestIntervalRef.current) {
        clearInterval(dataRequestIntervalRef.current);
        dataRequestIntervalRef.current = null;
      }
      if (silenceCheckIntervalRef.current) {
        clearInterval(silenceCheckIntervalRef.current);
        silenceCheckIntervalRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      const parsedError = parseTranscriptionError(err);
      setError(parsedError.userMessage);
      setStatus('idle');
    }
  }, [deviceId, silenceDetectionEnabled, silenceDurationMs, onSilenceDetected]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(audioBlob);
        return;
      }

      // Clear timers
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (dataRequestIntervalRef.current) {
        clearInterval(dataRequestIntervalRef.current);
        dataRequestIntervalRef.current = null;
      }
      // Clean up silence detection
      if (silenceCheckIntervalRef.current) {
        clearInterval(silenceCheckIntervalRef.current);
        silenceCheckIntervalRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      silenceStartTimeRef.current = null;

      // Create a one-time listener to resolve the Promise without overwriting the original handler
      const handleStop = () => {
        // Remove the listener after it fires
        mediaRecorder.removeEventListener('stop', handleStop);
        // Return the blob after a short delay to ensure state is updated
        setTimeout(() => {
          const recordedMimeType = mediaRecorder.mimeType || 'audio/webm;codecs=opus';
          const blob = new Blob(audioChunksRef.current, { type: recordedMimeType });
          resolve(blob);
        }, 50);
      };

      mediaRecorder.addEventListener('stop', handleStop);
      mediaRecorder.stop();
    });
  }, [audioBlob]);

  return {
    startRecording,
    stopRecording,
    isRecording: status === 'recording',
    status,
    duration,
    fileSize,
    audioBlob,
    audioStream,
    error,
    clearError,
  };
}

export default useAudioRecorder;
