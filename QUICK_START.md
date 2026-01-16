# Voice Transcriber - Quick Start Guide

## ✅ Project Status: **READY TO USE**

All build issues have been resolved and the application is fully functional!

## Prerequisites

1. **Node.js 18+** installed
2. **OpenAI API Key** from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
3. **Microphone** access

## Installation

```bash
# Navigate to project directory
cd voice-transcriber

# Install dependencies (if not already done)
npm install
```

## Running the Application

### Development Mode
```bash
npm run dev
```

This will:
- Start Vite dev server on http://localhost:5173
- Launch Electron application with hot reload
- Open DevTools automatically

### Production Build
```bash
# Build for your platform
npm run package:win      # Windows
npm run package:mac      # macOS  
npm run package:linux    # Linux

# Or build for all platforms
npm run package
```

Built applications will be in the `release/` folder.

## First Run

1. **Enter API Key**: On first launch, enter your OpenAI API key
2. **Select Model**: Choose your preferred transcription model:
   - **GPT-4o Transcribe**: Highest accuracy, streaming support
   - **GPT-4o Mini Transcribe**: Balanced performance (recommended)
   - **Whisper-1**: Original model with timestamps
3. **Grant Microphone Access**: Allow microphone permissions when prompted
4. **Start Recording**: Click the microphone button or use the hotkey (Ctrl+Shift+Space)

## Features

### 🎙️ Voice Recording
- Click to record, click again to stop
- Or use global hotkey (Ctrl+Shift+Space)
- Real-time waveform visualization
- Automatic duration limit

### 🤖 AI Transcription
- Support for all 3 OpenAI models
- Streaming transcription (GPT-4o models)
- Multiple output formats
- Language selection
- Temperature control

### 📝 Auto-Paste
- Transcribed text automatically pastes to active window
- Works across all applications
- Fallback to clipboard if paste fails

### 📊 History Management
- View all past transcriptions
- Search and filter
- Export as TXT, JSON, or SRT
- Copy to clipboard

### ⚙️ Customization
- Choose transcription model
- Configure hotkey
- Select audio input device
- Set maximum recording duration
- Adjust advanced settings

## Troubleshooting

### Application won't start
```bash
# Clean build and restart
npm run build
npm run dev
```

### Microphone not working
- Grant microphone permissions in system settings
- Select correct input device in Settings
- Close other applications using the microphone

### API errors
- Verify API key at platform.openai.com
- Check internet connection
- Ensure sufficient API credits

### Text pasting doesn't work
- The `@nut-tree-fork/nut-js` dependency should be installed
- Text is copied to clipboard as fallback
- Use Ctrl+V to paste manually if needed

## File Locations

### Windows
- Installer: `release/Voice Transcriber Setup 1.0.0.exe`
- Portable: `release/Voice Transcriber 1.0.0.exe`
- User data: `%APPDATA%/voice-transcriber/`

### macOS
- DMG: `release/Voice Transcriber 1.0.0.dmg`
- App: `/Applications/Voice Transcriber.app`
- User data: `~/Library/Application Support/voice-transcriber/`

### Linux
- AppImage: `release/Voice Transcriber 1.0.0.AppImage`
- DEB: `release/voice-transcriber_1.0.0_amd64.deb`
- User data: `~/.config/voice-transcriber/`

## Keyboard Shortcuts

| Action | Default Shortcut |
|--------|------------------|
| Start/Stop Recording | Ctrl+Shift+Space |
| Open Settings | Click settings icon |
| View History | Click history icon |
| Minimize to Tray | Click minimize button |

## Advanced Configuration

### Change Response Format
Settings → Advanced Settings → Response Format
- Text: Plain text only
- JSON: Structured format
- Verbose JSON: With timestamps (whisper-1 only)
- SRT/VTT: Subtitle formats (whisper-1 only)

### Language Selection
Settings → Advanced Settings → Language
- Enter ISO-639-1 code (e.g., "en", "es", "fr")
- Leave empty for auto-detection

### Temperature Control
Settings → Advanced Settings → Temperature (0-1)
- 0 = Most deterministic
- 1 = More random/creative

## Development

### Project Structure
```
voice-transcriber/
├── src/
│   ├── main/          # Electron main process
│   ├── preload/       # Preload scripts
│   ├── renderer/      # React frontend
│   └── shared/        # Shared types
├── dist/              # Compiled output
└── release/           # Built installers
```

### Build Scripts
```bash
npm run dev              # Development with hot reload
npm run build            # Build both processes
npm run build:vite       # Build renderer only
npm run build:electron   # Build main process only
npm run package          # Create installer
```

### Testing
See [TESTING.md](TESTING.md) for comprehensive testing procedures.

## Support & Documentation

- **README.md**: Full documentation
- **TESTING.md**: Testing procedures
- **BUILD_FIXES.md**: Technical fixes applied
- **IMPLEMENTATION_SUMMARY.md**: Detailed implementation overview

## Model Comparison

| Feature | GPT-4o | GPT-4o Mini | Whisper-1 |
|---------|--------|-------------|-----------|
| Accuracy | ★★★★★ | ★★★★☆ | ★★★☆☆ |
| Speed | ★★★★☆ | ★★★★★ | ★★★★☆ |
| Streaming | ✅ | ✅ | ❌ |
| Timestamps | ❌ | ❌ | ✅ |
| Cost | $$$ | $$ | $ |

## Tips for Best Results

1. **Speak clearly** and at a moderate pace
2. **Minimize background noise** when recording
3. **Use a good microphone** for better accuracy
4. **Keep recordings under 2 minutes** for best performance
5. **Select the right model** for your use case
6. **Test your API key** before important transcriptions

## Updates & Maintenance

To update the application:
```bash
git pull                 # Get latest code
npm install              # Update dependencies
npm run build            # Rebuild
npm run package:win      # Create new installer
```

## License

MIT License - See LICENSE file for details

---

**Need help?** Check the documentation files or open an issue on GitHub.

**Enjoying the app?** Consider sharing it with others!
