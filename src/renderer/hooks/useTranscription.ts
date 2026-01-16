import { useState, useCallback } from 'react';
import { parseTranscriptionError } from '../utils/errorHandling';

export type TranscriptionStatus = 'idle' | 'transcribing' | 'success' | 'error';

export interface TranscriptionResult {
  text: string;
  duration?: number;
}

export interface UseTranscriptionResult {
  transcribe: (blob: Blob) => Promise<string | null>;
  isTranscribing: boolean;
  status: TranscriptionStatus;
  result: TranscriptionResult | null;
  error: string | null;
  clearResult: () => void;
  clearError: () => void;
}

export function useTranscription(): UseTranscriptionResult {
  const [status, setStatus] = useState<TranscriptionStatus>('idle');
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearResult = useCallback(() => {
    setResult(null);
    setStatus('idle');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    if (status === 'error') {
      setStatus('idle');
    }
  }, [status]);

  const transcribe = useCallback(async (blob: Blob): Promise<string | null> => {
    try {
      setError(null);
      setResult(null);
      setStatus('transcribing');

      // Convert blob to ArrayBuffer for IPC transfer
      const arrayBuffer = await blob.arrayBuffer();

      // Check if electronAPI is available
      if (!window.electronAPI) {
        throw new Error('Electron API not available. Are you running in Electron?');
      }

      // Send to main process via IPC for transcription
      const transcriptionText = await window.electronAPI.transcribe(arrayBuffer);

      if (!transcriptionText) {
        throw new Error('No transcription result received');
      }

      const transcriptionResult: TranscriptionResult = {
        text: transcriptionText,
      };

      setResult(transcriptionResult);
      setStatus('success');

      return transcriptionText;
    } catch (err) {
      console.error('Transcription failed:', err);

      // Use the centralized error handling
      const parsedError = parseTranscriptionError(err);
      setError(parsedError.userMessage);
      setStatus('error');

      return null;
    }
  }, []);

  return {
    transcribe,
    isTranscribing: status === 'transcribing',
    status,
    result,
    error,
    clearResult,
    clearError,
  };
}

export default useTranscription;
