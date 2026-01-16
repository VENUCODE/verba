# Voice Transcriber Assets

This folder contains application icons and assets.

## Icon Files

- `icon.svg` - Source SVG file for the application icon
- `icon.png` - 512x512 PNG icon for Linux
- `icon.ico` - Windows icon file (generated from PNG)
- `icon.icns` - macOS icon file (generated from PNG)

## Generating Platform-Specific Icons

### Windows (.ico)
To generate the ICO file from the PNG:
```bash
# Using ImageMagick
convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico

# Or using electron-builder (automatically during build)
npm run package:win
```

### macOS (.icns)
To generate the ICNS file from the PNG:
```bash
# Using iconutil on macOS
mkdir icon.iconset
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
cp icon.png       icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset

# Or using electron-builder (automatically during build)
npm run package:mac
```

### Linux (.png)
The PNG file is used directly for Linux builds.

## Note

The electron-builder tool will automatically generate platform-specific icons from the PNG source file during the build process. The ICO and ICNS files can be generated manually using the commands above, or they will be created automatically when building for each platform.
