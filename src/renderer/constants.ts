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
