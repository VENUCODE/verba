# Voice Transcriber

A cross-platform desktop application for real-time voice transcription using OpenAI's latest transcription models.

## Features

- 🎙️ **Real-time Voice Recording** with waveform visualization
- 🤖 **Multiple AI Models**:
  - GPT-4o Transcribe (highest accuracy, streaming support)
  - GPT-4o Mini Transcribe (balanced performance and cost)
  - Whisper-1 (original model with timestamp support)
- ⚡ **Streaming Transcription** for supported models
- ⌨️ **Global Hotkeys** for hands-free operation
- 📝 **Auto-paste** transcribed text to any application
- 📊 **Transcription History** with search and export
- 🎨 **Modern UI** with dark mode support
- 🖥️ **Cross-platform** (Windows, macOS, Linux)
- 🔒 **Secure** API key storage with encryption

## Installation

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))
- Microphone access

### Development Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd voice-transcriber
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

### Building for Production

#### Windows
```bash
npm run package:win
```
Output: `release/*.exe` (installer) and `release/win-unpacked/` (portable)

#### macOS
```bash
npm run package:mac
```
Output: `release/*.dmg`

#### Linux
```bash
npm run package:linux
```
Output: `release/*.AppImage` and `release/*.deb`

## Usage

### First Launch

1. Enter your OpenAI API key
2. Select your preferred transcription model
3. Configure hotkey and settings
4. Grant microphone permissions

### Recording & Transcribing

**Method 1: In-App**
1. Click the microphone button in the app
2. Speak clearly
3. Click again to stop and transcribe

**Method 2: Global Hotkey**
1. Press your configured hotkey (default: Ctrl+Shift+Space)
2. Speak clearly
3. Press the hotkey again to stop
4. Text will be automatically pasted to your active application

### Settings

#### API Configuration
- **API Key**: Your OpenAI API key
- **Model**: Choose between GPT-4o Transcribe, GPT-4o Mini, or Whisper-1

#### Advanced Settings
- **Response Format**: text, json, verbose_json, srt, vtt
- **Language**: ISO-639-1 code (e.g., 'en', 'es', 'fr') or auto-detect
- **Temperature**: 0-1, controls randomness (0 = most deterministic)

#### Recording Settings
- **Max Duration**: 30s to 5 minutes
- **Input Device**: Select your microphone

#### Keyboard Shortcut
- Choose from predefined hotkeys or customize

#### Behavior
- Launch at system startup
- Start minimized to tray

### History Management

Access your transcription history to:
- Search through past transcriptions
- Sort by date or duration
- Copy text to clipboard
- Export as TXT, JSON, or SRT

## Model Comparison

| Feature | GPT-4o Transcribe | GPT-4o Mini | Whisper-1 |
|---------|-------------------|-------------|-----------|
| **Accuracy** | Highest | High | Good |
| **Speed** | Fast | Faster | Fast |
| **Streaming** | ✅ Yes | ✅ Yes | ❌ No |
| **Timestamps** | ❌ No | ❌ No | ✅ Yes |
| **SRT/VTT Export** | ❌ No | ❌ No | ✅ Yes |
| **Cost** | $$$ | $$ | $ |
| **Best For** | Critical accuracy | Daily use | Subtitles |

## Supported Audio Formats

- **Input**: WebM/Opus (auto-captured)
- **Max Size**: 25MB (OpenAI limit)
- **Max Duration**: Configurable (30s - 5 minutes)

## Keyboard Shortcuts

| Action | Default Shortcut |
|--------|-----------------|
| Start/Stop Recording | Ctrl+Shift+Space |
| Navigate to Settings | Click Settings button |
| Navigate to History | Click History button |
| Minimize to Tray | Click minimize button |

## Troubleshooting

### Microphone Issues
- **No microphone found**: Ensure a microphone is connected
- **Permission denied**: Grant microphone access in system settings
- **Microphone in use**: Close other applications using the microphone

### API Errors
- **Invalid API key**: Verify your key at platform.openai.com
- **Rate limit exceeded**: Wait a moment and try again
- **Network error**: Check your internet connection

### Text Pasting
- Requires `@nut-tree-fork/nut-js` package
- May not work on Linux Wayland (use X11)
- Falls back to clipboard copy if pasting fails

### Build Issues
- Clear `node_modules` and `dist` folders
- Run `npm install` again
- Ensure all dependencies are installed

## Technical Stack

- **Framework**: Electron 28
- **UI**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Build Tool**: Vite
- **API**: OpenAI SDK 4.x
- **Audio**: Web Audio API + MediaRecorder

## Project Structure

```
voice-transcriber/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # Main entry point
│   │   ├── transcription.ts  # OpenAI integration
│   │   ├── shortcuts.ts   # Global hotkeys
│   │   └── tray.ts        # System tray
│   ├── preload/           # Electron preload scripts
│   │   └── index.ts
│   ├── renderer/          # React frontend
│   │   ├── components/    # Reusable components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Main pages
│   │   ├── store/         # State management
│   │   └── App.tsx        # Root component
│   └── shared/            # Shared types and constants
│       ├── types.ts
│       ├── constants.ts
│       └── errorHandling.ts
├── assets/                # Application icons
├── dist/                  # Build output
└── release/               # Packaged applications
```

## Development

### Available Scripts

```bash
npm run dev              # Start development mode
npm run build            # Build for production
npm run package          # Package for current platform
npm run package:win      # Package for Windows
npm run package:mac      # Package for macOS
npm run package:linux    # Package for Linux
```

### Adding New Features

1. **Backend (Electron)**:
   - Add IPC handlers in `src/main/index.ts`
   - Update `src/shared/types.ts` for IPC channels

2. **Frontend (React)**:
   - Create components in `src/renderer/components/`
   - Add pages in `src/renderer/pages/`
   - Update state in `src/renderer/store/`

3. **Testing**:
   - See `TESTING.md` for comprehensive testing guide

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (see TESTING.md)
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Credits

- Built with [Electron](https://www.electronjs.org/)
- Powered by [OpenAI](https://openai.com/)
- UI styled with [Tailwind CSS](https://tailwindcss.com/)

## Support

For issues and questions:
- Check the [troubleshooting section](#troubleshooting)
- Review `TESTING.md` for common problems
- Open an issue on GitHub

## Roadmap

- [ ] Real-time streaming display
- [ ] Multiple language support in UI
- [ ] Custom model fine-tuning support
- [ ] Batch transcription
- [ ] Speaker diarization (when available)
- [ ] Cloud sync for history
- [ ] Mobile companion app
- [ ] Plugin system for integrations

---

**Note**: This application requires an active internet connection and a valid OpenAI API key. API usage is billed according to OpenAI's pricing.
