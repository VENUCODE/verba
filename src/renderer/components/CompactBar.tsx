import { useCallback, useEffect, useState, useRef } from 'react';
import { useConfigStore } from '../store/configStore';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import VerticalBarsVisualizer from './VerticalBarsVisualizer';
import { soundManager } from '../utils/sounds';
import { GripVertical, Menu } from 'lucide-react';

interface CompactBarProps {
  onNavigate: (page: 'home' | 'settings' | 'history') => void;
  onExpand?: () => void;
  isCollapsed?: boolean;
  expansionPhase?: 'collapsed' | 'morphing' | 'expanding' | 'expanded' | 'collapsing';
  onInteraction?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isHovering?: boolean;
  onSetStopRecordingRef?: (handler: (() => Promise<void>) | null) => void;
}

function CompactBar({
  onNavigate,
  onExpand,
  isCollapsed = false,
  expansionPhase = 'expanded',
  onInteraction,
  onDragStart,
  onDragEnd,
  isHovering = false,
  onSetStopRecordingRef,
}: CompactBarProps) {
  const { config, status, setStatus, setError, addToHistory, error } = useConfigStore();
  const [showIconsDuringRecording, setShowIconsDuringRecording] = useState(false);
  const [showIconsAfterTranscribe, setShowIconsAfterTranscribe] = useState(true);
  const [previousStatus, setPreviousStatus] = useState<string>('idle');

  // Refs for timeout management
  const showIconsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptionEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Ref for handling silence detection callback
  const handleSilenceStopRef = useRef<(() => void) | null>(null);
  // Ref for handling max duration transcription
  const handleMaxDurationTranscribeRef = useRef<((audioBlob: Blob) => Promise<void>) | null>(null);

  const {
    isRecording,
    duration,
    audioStream,
    startRecording,
    stopRecording,
  } = useAudioRecorder({
    maxDuration: config.maxDuration,
    deviceId: config.selectedInputDevice,
    // Silence detection options
    silenceDetectionEnabled: config.silenceDetectionEnabled,
    silenceDurationMs: config.silenceDurationMs,
    silenceThreshold: config.silenceThreshold,
    onSilenceDetected: useCallback(() => {
      // Use the ref to call the current version of stop handler
      handleSilenceStopRef.current?.();
    }, []),
    onMaxDurationReached: useCallback(async (audioBlob: Blob) => {
      // Play stop sound and trigger transcription with the blob from max duration
      soundManager.playStop();
      await handleMaxDurationTranscribeRef.current?.(audioBlob);
    }, []),
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
        console.log('[CompactBar] Transcription completed, text length:', text.length);

        // Add to history first
        addToHistory({
          text,
          duration,
          timestamp: Date.now(),
          model: config.model,
        });

        // Auto-paste the transcribed text (if enabled)
        if (config.autoPasteEnabled !== false) {
          try {
            console.log('[CompactBar] Attempting to paste text');
            await window.electronAPI.pasteText(text);
            console.log('[CompactBar] Paste completed successfully');
            soundManager.playSuccess();
          } catch (pasteErr: any) {
            console.error('[CompactBar] Paste failed:', pasteErr);
            soundManager.playError();
            // Show error but don't fail the whole operation
            setError(pasteErr.message || 'Failed to paste text automatically. Text copied to clipboard.');
            setTimeout(() => setError(null), 5000);
          }
        } else {
          console.log('[CompactBar] Auto-paste disabled, skipping paste operation');
          soundManager.playSuccess();
        }

        setStatus('idle');
      } else {
        soundManager.playError();
        setError('No transcription returned');
        setStatus('idle');
      }
    } catch (err: any) {
      console.error('[CompactBar] Transcription failed:', err);
      soundManager.playError();
      setError(err.message || 'Transcription failed');
      setStatus('idle');
    }
  }, [config.model, duration, setStatus, setError, addToHistory]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      // This is the stop functionality
      soundManager.playStop();
      const audioBlob = await stopRecording();
      if (audioBlob) {
        await handleTranscribe(audioBlob);
      }
    } else {
      // Check if API key is configured before starting
      if (!config.apiKey) {
        soundManager.playNotification();
        setError('Please configure your OpenAI API key in settings');
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Check if cursor is in active input before starting
      try {
        const hasActiveInput = await window.electronAPI.checkActiveInput();
        if (!hasActiveInput) {
          soundManager.playNotification();
          setError('Please click in a text field first');
          setTimeout(() => setError(null), 3000);
          return;
        }
      } catch (err) {
        // If check fails, proceed anyway
        console.warn('Could not check active input:', err);
      }
      
      soundManager.playStart();
      setError(null);
      setStatus('recording');
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording, handleTranscribe, setStatus, setError, config.apiKey]);

  const handleStopRecording = useCallback(async () => {
    if (!isRecording) {
      return;
    }
    soundManager.playStop();
    const audioBlob = await stopRecording();
    if (audioBlob) {
      await handleTranscribe(audioBlob);
    }
  }, [isRecording, stopRecording, handleTranscribe]);

  // Keep the ref updated with the current stop handler for silence detection
  useEffect(() => {
    handleSilenceStopRef.current = handleStopRecording;
  }, [handleStopRecording]);

  // Keep the ref updated with handleTranscribe for max duration callback
  useEffect(() => {
    handleMaxDurationTranscribeRef.current = handleTranscribe;
  }, [handleTranscribe]);

  // Expose the stop recording handler to the parent component via callback
  useEffect(() => {
    if (onSetStopRecordingRef) {
      onSetStopRecordingRef(handleStopRecording);
    }
    return () => {
      if (onSetStopRecordingRef) {
        onSetStopRecordingRef(null);
      }
    };
  }, [handleStopRecording, onSetStopRecordingRef]);

  // Listen for global hotkey
  useEffect(() => {
    const handleHotkey = async () => {
      if (isRecording) {
        // This is the stop functionality
        soundManager.playStop();
        const audioBlob = await stopRecording();
        if (audioBlob) {
          await handleTranscribe(audioBlob);
        }
      } else {
        // Check if API key is configured before starting
        if (!config.apiKey) {
          soundManager.playNotification();
          setError('Please configure your OpenAI API key in settings');
          setTimeout(() => setError(null), 3000);
          return;
        }

        // Check if cursor is in active input before starting
        try {
          const hasActiveInput = await window.electronAPI.checkActiveInput();
          if (!hasActiveInput) {
            soundManager.playNotification();
            setError('Please click in a text field first');
            setTimeout(() => setError(null), 3000);
            return;
          }
        } catch (err) {
          // If check fails, proceed anyway
          console.warn('Could not check active input:', err);
        }

        soundManager.playStart();
        setError(null);
        setStatus('recording');
        await startRecording();
      }
    };

    window.addEventListener('hotkey-triggered', handleHotkey);
    return () => {
      window.removeEventListener('hotkey-triggered', handleHotkey);
    };
  }, [isRecording, config.apiKey, startRecording, stopRecording, handleTranscribe, setStatus, setError]);

  // Update status when recording state changes
  useEffect(() => {
    if (isRecording) {
      setStatus('recording');
      setShowIconsDuringRecording(false); // Reset when starting recording
    } else {
      setShowIconsDuringRecording(false); // Reset when stopping
    }
  }, [isRecording, setStatus]);

  // Handle transcribing state transitions - simplified state machine
  useEffect(() => {
    if (status === 'transcribing') {
      // Clear any pending timeout when starting transcription
      if (transcriptionEndTimeoutRef.current) {
        clearTimeout(transcriptionEndTimeoutRef.current);
        transcriptionEndTimeoutRef.current = null;
      }
      setShowIconsAfterTranscribe(false);
    } else if (status === 'idle' && previousStatus === 'transcribing') {
      // Transcribing just finished - wait for animation then show icons
      transcriptionEndTimeoutRef.current = setTimeout(() => {
        setShowIconsAfterTranscribe(true);
        transcriptionEndTimeoutRef.current = null;
      }, 300);
    } else if (status === 'idle' && previousStatus !== 'transcribing') {
      // Normal idle state - show icons immediately
      setShowIconsAfterTranscribe(true);
    }

    // Track status changes
    setPreviousStatus(status);

    // Cleanup timeout on unmount or status change
    return () => {
      if (transcriptionEndTimeoutRef.current) {
        clearTimeout(transcriptionEndTimeoutRef.current);
        transcriptionEndTimeoutRef.current = null;
      }
    };
  }, [status, previousStatus]);

  // Cleanup showIconsTimeout on component unmount
  useEffect(() => {
    return () => {
      if (showIconsTimeoutRef.current) {
        clearTimeout(showIconsTimeoutRef.current);
        showIconsTimeoutRef.current = null;
      }
    };
  }, []);

  // Handle panel expansion
  const handlePanelToggle = useCallback((panel: 'settings' | 'history') => {
    onNavigate(panel);
  }, [onNavigate]);

  const handleHideWindow = useCallback(() => {
    window.electronAPI.hideMainWindow();
  }, []);

  // Get background style based on state
  const getBackgroundStyle = () => {
    switch (status) {
      case 'idle':
        return {
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.88))',
          borderColor: 'rgba(100, 116, 139, 0.2)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        };
      case 'recording':
        return {
          background: 'linear-gradient(90deg, rgba(35, 20, 25, 0.92), rgba(80, 25, 30, 0.88), rgba(120, 40, 30, 0.85), rgba(80, 25, 30, 0.88), rgba(35, 20, 25, 0.92))',
          backgroundSize: '200% 100%',
          animation: 'gradient-flow 4s ease-in-out infinite',
          borderColor: 'rgba(239, 68, 68, 0.35)',
          transition: 'border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        };
      case 'transcribing':
        return {
          background: 'linear-gradient(270deg, rgba(15, 23, 42, 0.92), rgba(30, 58, 138, 0.85), rgba(67, 56, 202, 0.85), rgba(15, 23, 42, 0.92))',
          backgroundSize: '400% 100%',
          animation: 'gradient-shimmer 3s ease infinite',
          borderColor: 'rgba(99, 102, 241, 0.35)',
          transition: 'border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        };
      default:
        return {
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.88))',
          borderColor: 'rgba(100, 116, 139, 0.2)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        };
    }
  };

  const backgroundStyle = getBackgroundStyle();

  // Render during morphing phase: chip visible with bar overlaying and fading in
  const isMorphing = expansionPhase === 'morphing';

  if (isCollapsed || isMorphing) {
    // Use same background as CompactBar idle state for consistent morphing
    const baseBackground = 'linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.88))';
    const hoverBackground = 'linear-gradient(135deg, rgba(25, 35, 55, 0.94), rgba(40, 52, 70, 0.90))';

    return (
      <div className="relative flex h-full w-full items-center justify-center">
        {/* Chip layer - stays visible during morphing */}
        <div
          className={`absolute inset-0 flex items-center justify-center rounded-2xl cursor-pointer overflow-hidden
            ${!isMorphing ? 'transition-all duration-500 ease-out' : ''}`}
          style={{
            background: isMorphing ? baseBackground : isHovering ? hoverBackground : baseBackground,
            border: `1px solid ${isHovering && !isMorphing ? 'rgba(148, 163, 184, 0.25)' : 'rgba(100, 116, 139, 0.2)'}`,
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            boxShadow: isHovering && !isMorphing
              ? '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              : '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            transition: isMorphing ? 'none' : 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: isMorphing ? 1 : 1,
          }}
          title="Click to expand or drag to move"
        >
          {/* Top highlight edge - matches CompactBar */}
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none z-20"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15) 20%, rgba(255, 255, 255, 0.15) 80%, transparent)',
            }}
          />

          {/* Premium gradient overlay - matches CompactBar idle state */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.08), rgba(168, 85, 247, 0.06), rgba(236, 72, 153, 0.04))',
              opacity: isHovering && !isMorphing ? 0.7 : 0.5,
              transition: 'opacity 400ms ease-in-out',
            }}
          />

          {/* Subtle inner glow effect on hover */}
          {isHovering && !isMorphing && (
            <div
              className="absolute inset-0 rounded-2xl animate-hover-glow pointer-events-none"
              style={{
                boxShadow: 'inset 0 0 24px rgba(96, 165, 250, 0.12), inset 0 0 48px rgba(168, 85, 247, 0.08)',
              }}
            />
          )}

          {/* Content fades out during morph */}
          <div
            className={`relative z-10 flex w-full items-center justify-center px-4 transition-all duration-400 ${isMorphing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
          >
            <div className="h-1.5 w-24 rounded-full bg-gradient-to-r from-blue-400/60 via-purple-400/60 to-pink-400/60 shadow-lg"></div>
          </div>
        </div>

        {/* Bar layer - overlays chip and fades in during morphing */}
        {isMorphing && (
          <div
            className="absolute inset-0 flex w-full flex-col rounded-2xl overflow-hidden animate-bar-appear"
            style={{
              minWidth: '280px',
              minHeight: '60px',
              ...getBackgroundStyle(),
              border: `1px solid ${getBackgroundStyle().borderColor}`,
              backdropFilter: 'blur(28px) saturate(180%)',
              WebkitBackdropFilter: 'blur(28px) saturate(180%)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Top highlight edge for premium glass effect */}
            <div
              className="absolute top-0 left-0 right-0 h-px pointer-events-none z-20"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15) 20%, rgba(255, 255, 255, 0.15) 80%, transparent)',
              }}
            />

            {/* Subtle gradient overlay for idle state */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.08), rgba(168, 85, 247, 0.06), rgba(236, 72, 153, 0.04))',
                opacity: 0.5,
              }}
            />

            {/* Main Bar content (simplified - no interactive elements during morph) */}
            <div className="flex w-full items-center gap-3 px-4 py-2.5 min-h-[52px] overflow-visible relative z-10">
              {/* Drag Handle */}
              <div className="flex items-center justify-center w-7 h-7 flex-shrink-0 rounded-lg">
                <GripVertical className="w-5 h-5 text-white/60 flex-shrink-0" />
              </div>

              {/* Center section with record button and visualizer placeholder */}
              <div className="flex items-center gap-2 flex-1" style={{ minWidth: '140px' }}>
                <button
                  className="w-8 h-8 rounded-full flex items-center justify-center relative flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  }}
                  disabled
                >
                  <div className="w-3 h-3 rounded-full bg-white shadow-sm relative z-10"></div>
                </button>
                <div className="flex items-center justify-center flex-1" style={{ height: '36px', minWidth: '100px' }}></div>
              </div>

              {/* Right side icons placeholder */}
              <div className="flex items-center gap-1.5 flex-shrink-0" style={{ width: '100px' }}></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const isCollapsing = expansionPhase === 'collapsing';

  return (
    <div
      className={`flex w-full flex-col rounded-2xl overflow-hidden relative
        ${expansionPhase === 'expanding' ? 'animate-bar-appear' : ''}
        ${isCollapsing ? 'animate-chip-collapse' : ''}`}
      style={{
        minWidth: '280px',
        minHeight: '60px',
        ...backgroundStyle,
        border: `1px solid ${backgroundStyle.borderColor}`,
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Top highlight edge for premium glass effect */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none z-20"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15) 20%, rgba(255, 255, 255, 0.15) 80%, transparent)',
        }}
      />

      {/* Subtle gradient overlay for idle state */}
      {status === 'idle' && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.08), rgba(168, 85, 247, 0.06), rgba(236, 72, 153, 0.04))',
            opacity: 0.5,
          }}
        />
      )}

      {/* Subtle recording pulse overlay */}
      {status === 'recording' && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(239, 68, 68, 0.15) 0%, transparent 70%)',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Main Bar */}
      <div
        className="flex w-full items-center gap-3 px-4 py-2.5 min-h-[52px] overflow-visible relative z-10"
        onClick={(e) => {
          // Show icons when clicking on bar during recording
          if (isRecording && !showIconsDuringRecording && e.target === e.currentTarget) {
            // Clear previous timeout if it exists
            if (showIconsTimeoutRef.current) {
              clearTimeout(showIconsTimeoutRef.current);
            }

            setShowIconsDuringRecording(true);
            showIconsTimeoutRef.current = setTimeout(() => {
              setShowIconsDuringRecording(false);
              showIconsTimeoutRef.current = null;
            }, 5000); // Hide after 5 seconds
          }
        }}
      >

        {/* 1. Drag Handle - Far Left */}
        <div
          className={`flex items-center justify-center w-7 h-7 flex-shrink-0 drag-region rounded-lg transition-all duration-200 hover:bg-white/15 active:bg-white/10
            ${expansionPhase === 'expanding' ? 'animate-icon-stagger' : ''}`}
          style={expansionPhase === 'expanding' ? { animationDelay: '0ms' } : undefined}
          title="Drag to move"
          onMouseDown={() => {
            onDragStart?.();
            const handleMouseUp = () => {
              onDragEnd?.();
              window.removeEventListener('mouseup', handleMouseUp);
            };
            window.addEventListener('mouseup', handleMouseUp);
          }}
        >
          <GripVertical className="w-5 h-5 text-white/60 hover:text-white/90 transition-colors duration-200 flex-shrink-0" />
        </div>

        {/* 2. Waveform Visualizer - Center/Middle section (flexible space) */}
        <div className="flex items-center gap-2 flex-1 no-drag" style={{ minWidth: '140px' }}>
          {/* Record/Stop Button */}
          {status === 'idle' && !isRecording ? (
            <button
              onClick={toggleRecording}
              className={`w-8 h-8 rounded-full flex items-center justify-center relative flex-shrink-0 cursor-pointer focus:outline-none transition-all duration-200 hover:scale-110 active:scale-95 group
                ${expansionPhase === 'expanding' ? 'animate-icon-stagger' : ''}`}
              title="Start recording"
              style={expansionPhase === 'expanding' ? {
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                animationDelay: '80ms',
              } : {
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              }}
            >
              {/* Glow effect on hover */}
              <div
                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  boxShadow: '0 0 20px rgba(59, 130, 246, 0.6), 0 0 40px rgba(59, 130, 246, 0.3)',
                }}
              />
              <div className="w-3 h-3 rounded-full bg-white shadow-sm relative z-10"></div>
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              disabled={!isRecording}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center relative
                transition-all duration-200 flex-shrink-0 cursor-pointer group
                ${!isRecording ? 'cursor-not-allowed opacity-50' : 'hover:scale-110 active:scale-95'}
                focus:outline-none
              `}
              style={{
                background: status === 'recording'
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : status === 'transcribing'
                  ? 'linear-gradient(135deg, #eab308, #ca8a04)'
                  : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                boxShadow: status === 'recording'
                  ? '0 4px 12px rgba(239, 68, 68, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  : status === 'transcribing'
                  ? '0 4px 12px rgba(234, 179, 8, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  : '0 4px 12px rgba(220, 38, 38, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              }}
              title="Stop recording"
            >
              {/* Glow effect on hover for active recording */}
              {isRecording && (
                <div
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    boxShadow: status === 'recording'
                      ? '0 0 20px rgba(239, 68, 68, 0.6), 0 0 40px rgba(239, 68, 68, 0.3)'
                      : '0 0 20px rgba(234, 179, 8, 0.6), 0 0 40px rgba(234, 179, 8, 0.3)',
                  }}
                />
              )}
              {status === 'transcribing' ? (
                <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin relative z-10"></div>
              ) : (
                <div className="w-2.5 h-2.5 bg-white rounded-sm shadow-sm relative z-10"></div>
              )}
            </button>
          )}

          {/* Waveform Visualizer */}
          <div
            className={`flex items-center justify-center flex-1 ${expansionPhase === 'expanding' ? 'animate-icon-stagger' : ''}`}
            style={expansionPhase === 'expanding' ? { height: '36px', minWidth: '100px', animationDelay: '160ms' } : { height: '36px', minWidth: '100px' }}
          >
            <VerticalBarsVisualizer
              audioStream={isRecording ? audioStream : null}
              isRecording={isRecording}
              barCount={18}
              height={36}
            />
          </div>

          {/* Status Text */}
          {status === 'transcribing' && (
            <span
              className="text-[10px] text-white/90 flex-shrink-0 font-medium tracking-wide"
              style={{
                animation: 'fadeIn 0.3s ease-out',
              }}
            >
              Transcribing...
            </span>
          )}
        </div>

        {/* 3. Right side icons - Panel, Minimize, Close (in that specific order) */}
        <div className="flex items-center gap-1.5 flex-shrink-0 no-drag">
          {/* Panel Button - opens settings/history panel */}
          {((!isRecording && (expansionPhase === 'expanded' || expansionPhase === 'expanding') && showIconsAfterTranscribe) || showIconsDuringRecording) && (
            <button
              onClick={() => handlePanelToggle('settings')}
              className={`p-1.5 rounded-lg cursor-pointer flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:bg-white/15 active:bg-white/10 hover:scale-105 active:scale-95 group
                ${showIconsDuringRecording && isRecording ? 'fade-in' : ''}
                ${!isRecording && previousStatus === 'transcribing' ? 'animate-icon-float-up' : ''}
                ${expansionPhase === 'expanding' ? 'animate-icon-stagger' : ''}`}
              style={{
                animationDelay: !isRecording && previousStatus === 'transcribing' ? '0ms' : expansionPhase === 'expanding' ? '240ms' : undefined,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              }}
              title="Open Panel"
            >
              <Menu className="w-4 h-4 text-white/70 group-hover:text-white/95 transition-colors duration-200 flex-shrink-0" />
            </button>
          )}

          {/* Minimize Button */}
          {((!isRecording && (expansionPhase === 'expanded' || expansionPhase === 'expanding') && showIconsAfterTranscribe) || showIconsDuringRecording) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInteraction?.();
                if (onExpand) {
                  onExpand();
                }
              }}
              className={`p-1.5 rounded-lg cursor-pointer flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:bg-white/15 active:bg-white/10 hover:scale-105 active:scale-95 group
                ${showIconsDuringRecording && isRecording ? 'fade-in' : ''}
                ${!isRecording && previousStatus === 'transcribing' ? 'animate-icon-float-up' : ''}
                ${expansionPhase === 'expanding' ? 'animate-icon-stagger' : ''}`}
              style={{
                animationDelay: !isRecording && previousStatus === 'transcribing' ? '200ms' : expansionPhase === 'expanding' ? '320ms' : undefined,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              }}
              title="Minimize to chip"
            >
              <svg className="w-3.5 h-3.5 text-white/70 group-hover:text-white/95 transition-colors duration-200 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
          )}

          {/* Close Button */}
          {((!isRecording && (expansionPhase === 'expanded' || expansionPhase === 'expanding') && showIconsAfterTranscribe) || showIconsDuringRecording) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleHideWindow();
              }}
              className={`p-1.5 rounded-lg cursor-pointer flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:bg-red-500/20 active:bg-red-500/15 hover:scale-105 active:scale-95 group
                ${showIconsDuringRecording && isRecording ? 'fade-in' : ''}
                ${!isRecording && previousStatus === 'transcribing' ? 'animate-icon-float-up' : ''}
                ${expansionPhase === 'expanding' ? 'animate-icon-stagger' : ''}`}
              style={{
                animationDelay: !isRecording && previousStatus === 'transcribing' ? '400ms' : expansionPhase === 'expanding' ? '400ms' : undefined,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              }}
              title="Hide to tray"
            >
              <svg className="w-3.5 h-3.5 text-white/70 group-hover:text-red-400 transition-colors duration-200 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

export default CompactBar;
