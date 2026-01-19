import { useCallback, useEffect, useState } from 'react';
import { useConfigStore } from '../store/configStore';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import VerticalBarsVisualizer from './VerticalBarsVisualizer';
import { soundManager } from '../utils/sounds';
import { GripVertical, History, Settings2 } from 'lucide-react';

interface CompactBarProps {
  onNavigate: (page: 'home' | 'settings' | 'history') => void;
  onExpand?: () => void;
  isCollapsed?: boolean;
  expansionPhase?: 'collapsed' | 'morphing' | 'expanding' | 'expanded';
  onInteraction?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isHovering?: boolean;
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
}: CompactBarProps) {
  const { config, status, setStatus, setError, addToHistory, error } = useConfigStore();
  const [showIconsDuringRecording, setShowIconsDuringRecording] = useState(false);

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
        soundManager.playSuccess();

        // Add to history
        addToHistory({
          text,
          duration,
          timestamp: Date.now(),
          model: config.model,
        });

        setStatus('idle');
      } else {
        soundManager.playError();
        setError('No transcription returned');
      }
    } catch (err: any) {
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
      setShowIconsDuringRecording(false); // Reset when starting recording
    } else {
      setShowIconsDuringRecording(false); // Reset when stopping
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

  const handleHideWindow = useCallback(() => {
    window.electronAPI.hideMainWindow();
  }, []);

  if (isCollapsed) {
    const isMorphing = expansionPhase === 'morphing';

    return (
      <div
        className={`drag-region relative flex h-full w-full items-center justify-center rounded-2xl shadow-xl cursor-pointer overflow-hidden
          ${isMorphing ? 'animate-chip-morph' : 'transition-all duration-300'}
          ${isHovering && !isMorphing ? 'hover-glow-active' : ''}`}
        style={{
          background: isMorphing
            ? 'rgba(0, 0, 0, 0.9)'  // Transition to compact bar color
            : 'rgba(16, 20, 35, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0)',
          backdropFilter: 'blur(14px)',
          opacity: isMorphing ? 0 : 1,
        }}
        onClick={() => {
          onInteraction?.();
        }}
        onMouseDown={() => {
          onDragStart?.();
          const handleMouseUp = () => {
            onDragEnd?.();
            window.removeEventListener('mouseup', handleMouseUp);
          };
          window.addEventListener('mouseup', handleMouseUp);
        }}
        title="Click to expand"
      >
        {/* Animated glow overlay - visible during hover */}
        {isHovering && !isMorphing && (
          <div
            className="absolute inset-0 rounded-2xl animate-hover-glow"
            style={{
              background: 'linear-gradient(120deg, rgba(59,130,246,0.4), rgba(147,51,234,0.4), rgba(59,130,246,0.4))',
              backgroundSize: '200% 200%',
            }}
          />
        )}
        {/* Existing gradient overlay */}
        <div
          className="absolute inset-1 rounded-2xl opacity-40"
          style={{
            background: 'linear-gradient(120deg, rgba(59,130,246,0.35), rgba(147,51,234,0.35))',
            animation: 'pulse 2s ease-in-out infinite alternate',
          }}
        ></div>
        {/* Content fades out during morph */}
        <div
          className={`relative z-10 flex w-full items-center justify-center px-4 transition-opacity duration-300 ${isMorphing ? 'opacity-0' : ''}`}
        >
          <div className="h-1.5 w-24 rounded-full bg-white/40 shadow-sm"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex w-full flex-col rounded-2xl border border-blue-400/12 bg-black/90 shadow-2xl overflow-hidden
        ${expansionPhase === 'expanding' ? 'animate-bar-appear' : ''}`}
      style={{ minWidth: '216px', minHeight: '56px' }}
    >
      {/* Main Bar */}
      <div
        className="flex w-full items-center gap-2 px-4 py-2 min-h-[44px] overflow-visible"
        onClick={(e) => {
          // Show icons when clicking on bar during recording
          if (isRecording && !showIconsDuringRecording && e.target === e.currentTarget) {
            setShowIconsDuringRecording(true);
            setTimeout(() => setShowIconsDuringRecording(false), 5000); // Hide after 5 seconds
          }
        }}
      >

        {/* Drag Handle - 6 dots in 2x3 grid */}
        <div 
          className="flex items-center justify-center w-6 h-6 mr-2 drag-region hover:bg-white/10 rounded transition-colors" 
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
          <GripVertical className="text-white/70 hover:text-white/90" />
        </div>

        {/* Record Button - Replace with Visualizer when idle */}
        {status === 'idle' && !isRecording ? (
          <div 
            onClick={toggleRecording}
            className="h-8 cursor-pointer flex items-center justify-center no-drag"
            title="Click to start recording"
          >
            <VerticalBarsVisualizer audioStream={null} isRecording={false} barCount={18} height={24} />
          </div>
        ) : (
          <div className="flex items-center gap-1 no-drag">
            <button
              onClick={handleStopRecording}
              disabled={!isRecording}
              className={`
                w-7 h-7 rounded-full flex items-center justify-center
                transition-all duration-200 flex-shrink-0 cursor-pointer no-drag
                ${getStatusColor()}
                ${!isRecording ? 'cursor-not-allowed opacity-50' : 'hover:scale-110 active:scale-95'}
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50
              `}
              title="Stop recording"
            >
              {status === 'transcribing' ? (
                <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <div className="w-2.5 h-2.5 bg-white rounded-sm"></div>
              )}
            </button>
          </div>
        )}

        {/* Status/Timer */}
        <div className="flex items-center gap-1.5 no-drag">
          {isRecording && (
            <>
              <div className="h-full">
                <VerticalBarsVisualizer audioStream={audioStream} isRecording={isRecording} barCount={18} height={46} />
              </div>
            </>
          )}
          {status === 'transcribing' && (
            <span className="text-[10px] text-white/80">Transcribing...</span>
          )}
        </div>

        {/* Question mark icon with styled tooltip - Hide during recording unless explicitly shown */}
        {
        // ((!isRecording) || showIconsDuringRecording) && (
        //   <div className="relative group/help no-drag">
        //     <button
        //       onClick={(e) => {
        //         e.stopPropagation();
        //       }}
        //       className={`p-1 hover:bg-white/20 rounded transition-all duration-200 no-drag cursor-pointer relative z-10 ${showIconsDuringRecording && isRecording ? 'fade-in' : ''}`}
        //     >
        //       <svg className="w-3.5 h-3.5 text-white/60 hover:text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        //         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        //       </svg>
        //     </button>
        //     {/* Styled tooltip - positioned below the icon */}
        //     <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-2 bg-gray-900 text-white text-[10px] rounded-lg shadow-2xl border border-white/30 whitespace-nowrap opacity-0 group-hover/help:opacity-100 transition-opacity duration-200 pointer-events-none z-[9999] min-w-[120px]">
        //       <div className="text-white/70 font-medium mb-1 text-[9px] uppercase tracking-wider">Hotkey</div>
        //       <div className="text-white font-mono font-bold text-xs">
        //         {config.hotkey.replace('CommandOrControl', 'Ctrl').replace('+', ' + ')}
        //       </div>
        //       {/* Arrow pointing up */}
        //       <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 border-l border-t border-white/30 transform rotate-45"></div>
        //     </div>
        //   </div>
        // )
        }

        {/* History Button - only show when fully expanded */}
        {((!isRecording && expansionPhase === 'expanded') || showIconsDuringRecording) && (
          <button
            onClick={() => handlePanelToggle('history')}
            className={`p-1 hover:bg-white/20 rounded no-drag cursor-pointer ${showIconsDuringRecording && isRecording ? 'fade-in' : 'animate-icon-float-up'}`}
            style={{
              animationDelay: '0ms'  // First icon, no additional delay
            }}
            title="History"
          >
            <History className="text-white/90 h-4 w-4" />
          </button>
        )}

        {/* Settings Button */}
        {((!isRecording && expansionPhase === 'expanded') || showIconsDuringRecording) && (
          <button
            onClick={() => handlePanelToggle('settings')}
            className={`p-1 hover:bg-white/20 rounded no-drag cursor-pointer ${showIconsDuringRecording && isRecording ? 'fade-in' : 'animate-icon-float-up'}`}
            style={{
              animationDelay: '400ms'  // 0.4s after History
            }}
            title="Settings"
          >
            <Settings2 className="text-white/90 h-4 w-4" />
          </button>
        )}

        {/* Minimize Button */}
        {expansionPhase === 'expanded' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Always collapse to chip, regardless of panel state
              onInteraction?.();
              // Signal to parent to collapse
              if (onExpand) {
                onExpand();
              }
            }}
            className="p-1 hover:bg-white/20 rounded no-drag cursor-pointer animate-icon-float-up"
            style={{
              animationDelay: '800ms'  // 0.4s after Settings
            }}
            title="Minimize to chip"
          >
            <svg className="w-3.5 h-3.5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
        )}

        {/* Close Button */}
        {expansionPhase === 'expanded' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleHideWindow();
            }}
            className="p-1 hover:bg-white/20 rounded no-drag cursor-pointer animate-icon-float-up"
            style={{
              animationDelay: '1200ms'  // 0.4s after Minimize
            }}
            title="Hide to tray"
          >
            <svg className="w-3.5 h-3.5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        )}
      </div>

    </div>
  );
}

export default CompactBar;
