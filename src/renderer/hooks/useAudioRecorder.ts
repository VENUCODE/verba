import { useState, useRef, useCallback, useEffect } from 'react';
import { AUDIO_CONSTRAINTS, RECORDING_OPTIONS, WHISPER_MAX_FILE_SIZE } from '../constants';
import { parseTranscriptionError } from '../utils/errorHandling';

export type RecordingStatus = 'idle' | 'recording' | 'processing';

export interface AudioRecorderOptions {
  maxDuration?: number; // in seconds, default 120
  deviceId?: string | null; // specific audio input device
  onMaxDurationReached?: () => void;
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
  const { maxDuration = 120, deviceId = null, onMaxDurationReached } = options;

  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [fileSize, setFileSize] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const maxDurationReachedRef = useRef(false);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
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

        // Clear timer
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }

        // Set back to idle after processing
        setTimeout(() => {
          setStatus('idle');
        }, 100);
      };

      // Start recording with timeslice for periodic ondataavailable events
      mediaRecorder.start(1000); // Get data every second
      setStatus('recording');
      startTimeRef.current = Date.now();

      // Start duration timer
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
      }, 100);
    } catch (err) {
      console.error('Failed to start recording:', err);
      const parsedError = parseTranscriptionError(err);
      setError(parsedError.userMessage);
      setStatus('idle');
    }
  }, [deviceId]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(audioBlob);
        return;
      }

      // Clear timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      // Wait for the onstop event to fire and process the blob
      const originalOnStop = mediaRecorder.onstop;
      mediaRecorder.onstop = (event) => {
        if (originalOnStop) {
          originalOnStop.call(mediaRecorder, event);
        }
        // Return the blob after a short delay to ensure state is updated
        setTimeout(() => {
          const recordedMimeType = mediaRecorder.mimeType || 'audio/webm;codecs=opus';
          const blob = new Blob(audioChunksRef.current, { type: recordedMimeType });
          resolve(blob);
        }, 50);
      };

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
