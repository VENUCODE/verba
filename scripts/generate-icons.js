const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');
const sourcePng = path.join(assetsDir, 'verba_png.png');

// Simple ICO file creator (single size)
function createIco(pngBuffer) {
  // ICO header: 6 bytes
  // Entry: 16 bytes per image
  // Then the PNG data

  const headerSize = 6;
  const entrySize = 16;
  const imageOffset = headerSize + entrySize;

  const icoHeader = Buffer.alloc(headerSize);
  icoHeader.writeUInt16LE(0, 0);       // Reserved
  icoHeader.writeUInt16LE(1, 2);       // Type: 1 = ICO
  icoHeader.writeUInt16LE(1, 4);       // Number of images

  // Read PNG dimensions from header
  const width = pngBuffer.readUInt32BE(16);
  const height = pngBuffer.readUInt32BE(20);

  const entry = Buffer.alloc(entrySize);
  entry.writeUInt8(width > 255 ? 0 : width, 0);   // Width (0 = 256)
  entry.writeUInt8(height > 255 ? 0 : height, 1); // Height (0 = 256)
  entry.writeUInt8(0, 2);                          // Color palette
  entry.writeUInt8(0, 3);                          // Reserved
  entry.writeUInt16LE(1, 4);                       // Color planes
  entry.writeUInt16LE(32, 6);                      // Bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8);        // Image size
  entry.writeUInt32LE(imageOffset, 12);            // Image offset

  return Buffer.concat([icoHeader, entry, pngBuffer]);
}

// Simple ICNS file creator
function createIcns(pngBuffer) {
  // ICNS format: 'icns' magic + total size + icon entries
  // We'll create ic10 (1024x1024) entry with PNG data

  const iconType = Buffer.from('ic10'); // 1024x1024 PNG
  const iconSize = Buffer.alloc(4);
  iconSize.writeUInt32BE(pngBuffer.length + 8, 0); // entry size = type(4) + size(4) + data

  const magic = Buffer.from('icns');
  const totalSize = Buffer.alloc(4);
  totalSize.writeUInt32BE(8 + 8 + pngBuffer.length, 0); // header(8) + entry header(8) + data

  return Buffer.concat([magic, totalSize, iconType, iconSize, pngBuffer]);
}

async function generateIcons() {
  console.log('Reading source PNG:', sourcePng);

  if (!fs.existsSync(sourcePng)) {
    console.error('Source PNG not found:', sourcePng);
    process.exit(1);
  }

  const pngBuffer = fs.readFileSync(sourcePng);

  // Generate ICO (Windows)
  console.log('Generating icon.ico...');
  try {
    const icoBuffer = createIco(pngBuffer);
    fs.writeFileSync(path.join(assetsDir, 'icon.ico'), icoBuffer);
    console.log('Created icon.ico');
  } catch (err) {
    console.error('Failed to create ICO:', err.message);
  }

  // Generate ICNS (macOS)
  console.log('Generating icon.icns...');
  try {
    const icnsBuffer = createIcns(pngBuffer);
    fs.writeFileSync(path.join(assetsDir, 'icon.icns'), icnsBuffer);
    console.log('Created icon.icns');
  } catch (err) {
    console.error('Failed to create ICNS:', err.message);
  }

  // Copy PNG as icon.png for Linux
  console.log('Copying icon.png...');
  try {
    fs.copyFileSync(sourcePng, path.join(assetsDir, 'icon.png'));
    console.log('Created icon.png');
  } catch (err) {
    console.error('Failed to copy PNG:', err.message);
  }

  console.log('Done!');
}

generateIcons().catch(console.error);
