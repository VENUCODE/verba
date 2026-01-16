"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DURATION_OPTIONS = exports.RESPONSE_FORMAT_OPTIONS = exports.MODEL_OPTIONS = exports.HOTKEY_OPTIONS = exports.RECORDING_OPTIONS = exports.AUDIO_CONSTRAINTS = exports.SUPPORTED_AUDIO_FORMATS = exports.APP_VERSION = exports.APP_NAME = void 0;
exports.APP_NAME = 'Voice Transcriber';
exports.APP_VERSION = '1.0.0';
exports.SUPPORTED_AUDIO_FORMATS = ['audio/webm', 'audio/mp4', 'audio/ogg'];
exports.AUDIO_CONSTRAINTS = {
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,
    },
    video: false,
};
exports.RECORDING_OPTIONS = {
    mimeType: 'audio/webm;codecs=opus',
    audioBitsPerSecond: 64000, // 64kbps - good balance of quality and size
};
// Keyboard shortcut options for settings
exports.HOTKEY_OPTIONS = [
    { label: 'Ctrl+Shift+Space', value: 'CommandOrControl+Shift+Space' },
    { label: 'Ctrl+Alt+R', value: 'CommandOrControl+Alt+R' },
    { label: 'Ctrl+Shift+R', value: 'CommandOrControl+Shift+R' },
    { label: 'F9', value: 'F9' },
    { label: 'F10', value: 'F10' },
];
// Model options
exports.MODEL_OPTIONS = [
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
// Response format options
exports.RESPONSE_FORMAT_OPTIONS = [
    { label: 'Text', value: 'text', description: 'Plain text output' },
    { label: 'JSON', value: 'json', description: 'Structured JSON format' },
    { label: 'Verbose JSON', value: 'verbose_json', description: 'Detailed JSON with timestamps (whisper-1 only)' },
    { label: 'SRT', value: 'srt', description: 'SubRip subtitle format (whisper-1 only)' },
    { label: 'VTT', value: 'vtt', description: 'WebVTT subtitle format (whisper-1 only)' },
];
// Duration options in seconds
exports.DURATION_OPTIONS = [
    { label: '30 seconds', value: 30 },
    { label: '1 minute', value: 60 },
    { label: '2 minutes', value: 120 },
    { label: '3 minutes', value: 180 },
    { label: '5 minutes', value: 300 },
];
