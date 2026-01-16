import React, { useEffect, useCallback, useState } from 'react';
import { useConfigStore } from '../store/configStore';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import RecordingIndicator from '../components/RecordingIndicator';
import WaveformVisualizer from '../components/WaveformVisualizer';

interface HomeProps {
  onNavigate: (page: 'home' | 'settings' | 'history') => void;
}

function Home({ onNavigate }: HomeProps) {
  const { config, status, setStatus, setError, addToHistory, error } = useConfigStore();
  const [audioLevel, setAudioLevel] = useState(0);

  const {
    isRecording,
    duration,
    audioStream,
    startRecording,
    stopRecording,
  } = useAudioRecorder({
    maxDuration: config.maxDuration,
    deviceId: config.selectedInputDevice
  });

  // Calculate audio level from stream for visualizer
  useEffect(() => {
    if (!audioStream || !isRecording) {
      setAudioLevel(0);
      return;
    }

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(audioStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animationId: number;

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(Math.min(average / 128, 1));
      animationId = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return () => {
      cancelAnimationFrame(animationId);
      audioContext.close();
    };
  }, [audioStream, isRecording]);

  const handleTranscribe = useCallback(async (audioBlob: Blob) => {
    setStatus('transcribing');

    try {
      const audioBuffer = await audioBlob.arrayBuffer();
      
      // Use streaming for gpt-4o models, regular for whisper-1
      const useStreaming = config.model === 'gpt-4o-transcribe' || config.model === 'gpt-4o-mini-transcribe';
      
      let text: string;
      if (useStreaming) {
        // Set up streaming listener
        let streamedText = '';
        const unsubscribe = window.electronAPI.onTranscriptionChunk((chunk) => {
          streamedText += chunk;
          // Could update UI here with partial results if needed
        });

        text = await window.electronAPI.transcribeStream(audioBuffer);
        unsubscribe();
      } else {
        text = await window.electronAPI.transcribe(audioBuffer);
      }

      if (text) {
        // Auto-paste the transcribed text
        await window.electronAPI.pasteText(text);

        // Add to history
        addToHistory({
          text,
          duration,
          timestamp: Date.now(),
          model: config.model,
        });

        setStatus('idle');
      } else {
        setError('No transcription returned');
      }
    } catch (err: any) {
      setError(err.message || 'Transcription failed');
      setStatus('idle');
    }
  }, [config.model, duration, setStatus, setError, addToHistory]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      const audioBlob = await stopRecording();
      if (audioBlob) {
        await handleTranscribe(audioBlob);
      }
    } else {
      setError(null);
      setStatus('recording');
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording, handleTranscribe, setStatus, setError]);

  // Listen for global hotkey
  useEffect(() => {
    const handleHotkey = () => {
      toggleRecording();
    };

    window.addEventListener('hotkey-triggered', handleHotkey);
    return () => {
      window.removeEventListener('hotkey-triggered', handleHotkey);
    };
  }, [toggleRecording]);

  // Update status when recording state changes
  useEffect(() => {
    if (isRecording) {
      setStatus('recording');
    }
  }, [isRecording, setStatus]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatHotkey = (hotkey: string): string => {
    return hotkey
      .replace('CommandOrControl', 'Ctrl')
      .replace('+', ' + ');
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 bg-white">
        <h1 className="text-lg font-semibold text-surface-800">Voice Transcriber</h1>
        <button
          onClick={() => window.electronAPI.minimizeToTray()}
          className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
          title="Minimize to tray"
        >
          <svg className="w-5 h-5 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Recording Status */}
        <RecordingIndicator
          status={status}
          isRecording={isRecording}
          onClick={toggleRecording}
        />

        {/* Instructions */}
        <p className="text-surface-500 mt-6 text-center">
          {status === 'idle' && (
            <>
              Press <span className="font-medium text-primary-600">{formatHotkey(config.hotkey)}</span>
              <br />
              to start recording
            </>
          )}
          {status === 'recording' && 'Recording... Press again to stop'}
          {status === 'transcribing' && 'Transcribing your audio...'}
          {status === 'error' && 'An error occurred'}
        </p>

        {/* Waveform */}
        <div className="w-full mt-8">
          <WaveformVisualizer audioLevel={audioLevel} isRecording={isRecording} />
        </div>

        {/* Timer */}
        <div className="mt-4 text-2xl font-mono text-surface-600">
          {formatDuration(duration)} / {formatDuration(config.maxDuration)}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm max-w-full overflow-hidden">
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-2 px-6 py-4 border-t border-surface-200 bg-white">
        <button
          onClick={() => onNavigate('history')}
          className="flex items-center gap-2 px-3 py-2 text-surface-600 hover:bg-surface-100 rounded-lg transition-colors text-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          History
        </button>
        <button
          onClick={() => onNavigate('settings')}
          className="flex items-center gap-2 px-3 py-2 text-surface-600 hover:bg-surface-100 rounded-lg transition-colors text-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Settings
        </button>
      </div>
    </div>
  );
}

export default Home;
