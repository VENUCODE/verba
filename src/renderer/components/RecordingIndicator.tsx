import React from 'react';
import { AppStatus } from '../../shared/types';

interface RecordingIndicatorProps {
  status: AppStatus;
  isRecording: boolean;
  onClick: () => void;
}

function RecordingIndicator({ status, isRecording, onClick }: RecordingIndicatorProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'recording':
        return 'bg-red-500';
      case 'transcribing':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-primary-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'recording':
        return 'Recording';
      case 'transcribing':
        return 'Transcribing';
      case 'error':
        return 'Error';
      default:
        return 'Ready';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'recording':
        return (
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        );
      case 'transcribing':
        return (
          <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        );
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={status === 'transcribing'}
      className={`
        relative w-24 h-24 rounded-full flex items-center justify-center
        transition-all duration-200
        ${getStatusColor()}
        ${status === 'transcribing' ? 'cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
        focus:outline-none focus:ring-4 focus:ring-primary-200
      `}
    >
      {/* Pulsing ring animation when recording */}
      {isRecording && (
        <>
          <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
          <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse opacity-50" />
        </>
      )}

      {/* Icon */}
      <span className="relative z-10">{getStatusIcon()}</span>

      {/* Status label */}
      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm font-medium text-surface-600 whitespace-nowrap">
        {getStatusText()}
      </span>
    </button>
  );
}

export default RecordingIndicator;
