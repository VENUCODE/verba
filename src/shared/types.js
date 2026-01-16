"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_RECORDING_DURATION = exports.MIN_RECORDING_DURATION = exports.WHISPER_MAX_FILE_SIZE = exports.DEFAULT_CONFIG = exports.IPC_CHANNELS = void 0;
// IPC Channel names
exports.IPC_CHANNELS = {
    // Config
    GET_CONFIG: 'config:get',
    SET_CONFIG: 'config:set',
    IS_FIRST_LAUNCH: 'config:isFirstLaunch',
    // Recording
    START_RECORDING: 'recording:start',
    STOP_RECORDING: 'recording:stop',
    RECORDING_STATUS: 'recording:status',
    // Transcription
    TRANSCRIBE: 'transcription:transcribe',
    TRANSCRIBE_STREAM: 'transcription:transcribeStream',
    TRANSCRIPTION_RESULT: 'transcription:result',
    TRANSCRIPTION_CHUNK: 'transcription:chunk',
    // System
    CHECK_ACTIVE_INPUT: 'system:checkActiveInput',
    PASTE_TEXT: 'system:pasteText',
    SHOW_NOTIFICATION: 'system:showNotification',
    HOTKEY_TRIGGERED: 'system:hotkeyTriggered',
    // Window
    MINIMIZE_TO_TRAY: 'window:minimizeToTray',
    SHOW_WINDOW: 'window:show',
    QUIT_APP: 'window:quit',
};
// Default configuration
exports.DEFAULT_CONFIG = {
    apiKey: '',
    model: 'gpt-4o-mini-transcribe',
    maxDuration: 120, // 2 minutes
    hotkey: 'CommandOrControl+Shift+Space',
    launchAtStartup: false,
    startMinimized: false,
    selectedInputDevice: null,
    responseFormat: 'text',
    language: undefined,
    temperature: 0,
};
// Constants
exports.WHISPER_MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
exports.MIN_RECORDING_DURATION = 30; // 30 seconds
exports.MAX_RECORDING_DURATION = 300; // 5 minutes
