// Re-export constants needed by the renderer
// This file exists because Vite has issues resolving imports from ../shared/constants

// File size limits
export const WHISPER_MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 16000,
  },
  video: false,
};

export const RECORDING_OPTIONS: MediaRecorderOptions = {
  mimeType: 'audio/webm;codecs=opus',
  audioBitsPerSecond: 64000,
};

export const HOTKEY_OPTIONS = [
  { label: 'Ctrl+Shift+Space', value: 'CommandOrControl+Shift+Space' },
  { label: 'Ctrl+Alt+R', value: 'CommandOrControl+Alt+R' },
  { label: 'Ctrl+Shift+R', value: 'CommandOrControl+Shift+R' },
  { label: 'F9', value: 'F9' },
  { label: 'F10', value: 'F10' },
];

export const MODEL_OPTIONS = [
  {
    label: 'GPT-4o Transcribe',
    value: 'gpt-4o-transcribe',
    description: 'Latest model with best accuracy and streaming support',
    features: ['Streaming', 'High Accuracy', 'Fast'],
    costLevel: 'high'
  },
  {
    label: 'GPT-4o Mini Transcribe',
    value: 'gpt-4o-mini-transcribe',
    description: 'Balanced performance and cost with streaming',
    features: ['Streaming', 'Good Accuracy', 'Affordable'],
    costLevel: 'medium'
  },
  {
    label: 'Whisper-1',
    value: 'whisper-1',
    description: 'Original model with timestamp and format options',
    features: ['Timestamps', 'SRT/VTT Export', 'Multilingual'],
    costLevel: 'low'
  },
];

export const RESPONSE_FORMAT_OPTIONS = [
  { label: 'Text', value: 'text', description: 'Plain text output' },
  { label: 'JSON', value: 'json', description: 'Structured JSON format' },
  { label: 'Verbose JSON', value: 'verbose_json', description: 'Detailed JSON with timestamps (whisper-1 only)' },
  { label: 'SRT', value: 'srt', description: 'SubRip subtitle format (whisper-1 only)' },
  { label: 'VTT', value: 'vtt', description: 'WebVTT subtitle format (whisper-1 only)' },
];

export const DURATION_OPTIONS = [
  { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '2 minutes', value: 120 },
  { label: '3 minutes', value: 180 },
  { label: '5 minutes', value: 300 },
];

// Silence detection configuration
export const SILENCE_DETECTION = {
  defaultEnabled: true,              // Enabled by default
  defaultDurationMs: 3000,           // 3 seconds of silence to trigger stop
  checkIntervalMs: 100,              // Check every 100ms
  minRecordingDurationMs: 2000,      // Don't auto-stop before 2 seconds (allows speech detection)
  fftSize: 256,                      // FFT size for frequency analysis
  smoothingTimeConstant: 0.3,        // Lower = more responsive to silence

  // Adaptive threshold settings
  calibrationDurationMs: 1500,       // Calibrate for first 1.5 seconds
  noiseFloorMultiplier: 1.5,         // Noise floor = baseline * 1.5
  speechThresholdMultiplier: 4.0,    // Speech detected when > noise floor * 4 (increased for reliability)
  silenceThresholdPercent: 0.20,     // Silence = below 20% of peak speech level

  // Moving average settings
  movingAverageSamples: 10,          // Use last 10 samples for smoothing (more stable)

  // Peak tracking
  peakDecayRate: 0.998,              // Decay factor per check (slower decay to maintain speech level)
  minPeakLevel: 0.05,                // Minimum peak level to consider valid speech (increased)

  // NEW: Speech confirmation settings
  speechConfirmationSamples: 3,      // Require 3 consecutive samples above speech threshold
  silenceConfirmationSamples: 5,     // Require 5 consecutive samples below silence threshold
}

export const SILENCE_DURATION_OPTIONS = [
  { label: '2 seconds', value: 2000 },
  { label: '3 seconds', value: 3000 },
  { label: '4 seconds', value: 4000 },
  { label: '5 seconds', value: 5000 },
];
