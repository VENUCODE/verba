import React, { useCallback, useEffect, useState } from 'react';
import { useConfigStore } from '../store/configStore';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import MiniVisualizer from './MiniVisualizer';

interface CompactBarProps {
  onNavigate: (page: 'home' | 'settings' | 'history') => void;
  onExpand?: () => void;
}

function CompactBar({ onNavigate, onExpand }: CompactBarProps) {
  const { config, status, setStatus, setError, addToHistory, error } = useConfigStore();

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

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTranscribe = useCallback(async (audioBlob: Blob) => {
    setStatus('transcribing');

    try {
      const audioBuffer = await audioBlob.arrayBuffer();
      
      // Use streaming for gpt-4o models, regular for whisper-1
      const useStreaming = config.model === 'gpt-4o-transcribe' || config.model === 'gpt-4o-mini-transcribe';
      
      let text: string;
      if (useStreaming) {
        let streamedText = '';
        const unsubscribe = window.electronAPI.onTranscriptionChunk((chunk) => {
          streamedText += chunk;
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

  // Handle panel expansion
  const handlePanelToggle = useCallback((panel: 'settings' | 'history') => {
    onNavigate(panel);
  }, [onNavigate]);

  const getStatusColor = () => {
    switch (status) {
      case 'recording':
        return 'bg-red-500';
      case 'transcribing':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-gray-200/50 overflow-hidden">
      {/* Main Bar */}
      <div className="flex items-center gap-2 px-3 py-2 h-12 drag-region">
        {/* Drag Handle */}
        <div className="flex gap-1 cursor-move no-drag">
          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
        </div>

        {/* Record Button */}
        <button
          onClick={toggleRecording}
          disabled={status === 'transcribing'}
          className={`
            w-8 h-8 rounded-full flex items-center justify-center
            transition-all duration-200 flex-shrink-0
            ${getStatusColor()}
            ${status === 'transcribing' ? 'cursor-not-allowed opacity-50' : 'hover:scale-110 active:scale-95'}
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300
          `}
        >
          {status === 'recording' ? (
            <div className="w-3 h-3 bg-white rounded-sm"></div>
          ) : status === 'transcribing' ? (
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <div className="w-0 h-0 border-l-[6px] border-l-white border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent ml-0.5"></div>
          )}
        </button>

        {/* Status/Timer */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {isRecording && (
            <>
              <span className="text-xs font-mono text-gray-700 whitespace-nowrap">
                {formatDuration(duration)}
              </span>
              <div className="flex-1 min-w-[60px] h-6">
                <MiniVisualizer audioStream={audioStream} isRecording={isRecording} />
              </div>
            </>
          )}
          {status === 'transcribing' && (
            <span className="text-xs text-gray-600">Transcribing...</span>
          )}
          {status === 'idle' && !isRecording && (
            <span className="text-xs text-gray-500 truncate">
              {config.hotkey.replace('CommandOrControl', 'Ctrl').replace('+', ' + ')}
            </span>
          )}
        </div>

        {/* History Button */}
        <button
          onClick={() => handlePanelToggle('history')}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors no-drag"
          title="History"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Settings Button */}
        <button
          onClick={() => handlePanelToggle('settings')}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors no-drag"
          title="Settings"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Close/Minimize Button */}
        <button
          onClick={() => window.electronAPI.minimizeToTray()}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors no-drag"
          title="Minimize"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-3 py-1.5 bg-red-50 text-red-600 text-xs border-t border-red-100">
          {error}
        </div>
      )}

    </div>
  );
}

export default CompactBar;
