"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const types_1 = require("../shared/types");
// Expose protected methods to the renderer process
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Config
    getConfig: () => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.GET_CONFIG),
    setConfig: (config) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SET_CONFIG, config),
    isFirstLaunch: () => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.IS_FIRST_LAUNCH),
    completeSetup: () => electron_1.ipcRenderer.invoke('config:completeSetup'),
    // Transcription
    transcribe: (audioBuffer) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.TRANSCRIBE, audioBuffer),
    transcribeStream: (audioBuffer) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.TRANSCRIBE_STREAM, audioBuffer),
    // System
    pasteText: (text) => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.PASTE_TEXT, text),
    // Window
    minimizeToTray: () => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.MINIMIZE_TO_TRAY),
    showWindow: () => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.SHOW_WINDOW),
    quitApp: () => electron_1.ipcRenderer.invoke(types_1.IPC_CHANNELS.QUIT_APP),
    // Event listeners
    onHotkeyTriggered: (callback) => {
        const handler = () => callback();
        electron_1.ipcRenderer.on(types_1.IPC_CHANNELS.HOTKEY_TRIGGERED, handler);
        return () => {
            electron_1.ipcRenderer.removeListener(types_1.IPC_CHANNELS.HOTKEY_TRIGGERED, handler);
        };
    },
    onTranscriptionChunk: (callback) => {
        const handler = (_, chunk) => callback(chunk);
        electron_1.ipcRenderer.on(types_1.IPC_CHANNELS.TRANSCRIPTION_CHUNK, handler);
        return () => {
            electron_1.ipcRenderer.removeListener(types_1.IPC_CHANNELS.TRANSCRIPTION_CHUNK, handler);
        };
    },
});
