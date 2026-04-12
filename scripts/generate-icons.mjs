/**
 * Generate favicon PNGs and .ico from SVG using sharp.
 * Run: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');

// Full-detail SVG (for 32px+ sizes)
const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
  <rect width="72" height="72" rx="16" fill="#6b7c4e"/>
  <rect x="17" y="17" width="38" height="38" rx="3" stroke="#faf8f4" stroke-width="2.8" fill="none"/>
  <rect x="22" y="22" width="28" height="28" rx="2" stroke="#faf8f4" stroke-width="1.2" fill="none" opacity="0.35"/>
  <circle cx="36" cy="36" r="5.5" fill="#faf8f4"/>
</svg>`;

// Simplified SVG (for 16px favicon)
const simpleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
  <rect width="72" height="72" rx="16" fill="#6b7c4e"/>
  <rect x="15" y="15" width="42" height="42" rx="3" stroke="#faf8f4" stroke-width="4" fill="none"/>
  <circle cx="36" cy="36" r="7" fill="#faf8f4"/>
</svg>`;

async function generatePng(svg, size, outputPath) {
  const buf = Buffer.from(svg);
  await sharp(buf, { density: Math.round((72 * size) / 72) })
    .resize(size, size)
    .png()
    .toFile(outputPath);
  console.log(`  ✓ ${outputPath} (${size}x${size})`);
}

// ICO file format: header + directory entries + image data
function createIco(images) {
  // images: [{size, data}]
  const headerSize = 6;
  const dirEntrySize = 16;
  const numImages = images.length;
  let offset = headerSize + dirEntrySize * numImages;

  // Header: reserved(2) + type(2) + count(2)
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);      // reserved
  header.writeUInt16LE(1, 2);      // type: 1 = ICO
  header.writeUInt16LE(numImages, 4);

  const dirEntries = [];
  const imageBuffers = [];

  for (const img of images) {
    const dir = Buffer.alloc(dirEntrySize);
    dir.writeUInt8(img.size >= 256 ? 0 : img.size, 0);  // width (0 = 256)
    dir.writeUInt8(img.size >= 256 ? 0 : img.size, 1);  // height
    dir.writeUInt8(0, 2);           // color palette
    dir.writeUInt8(0, 3);           // reserved
    dir.writeUInt16LE(1, 4);        // color planes
    dir.writeUInt16LE(32, 6);       // bits per pixel
    dir.writeUInt32LE(img.data.length, 8);  // image size
    dir.writeUInt32LE(offset, 12);  // image offset
    dirEntries.push(dir);
    imageBuffers.push(img.data);
    offset += img.data.length;
  }

  return Buffer.concat([header, ...dirEntries, ...imageBuffers]);
}

async function main() {
  console.log('Generating favicon assets...\n');

  // 1. Generate PNGs
  await generatePng(fullSvg, 180, join(publicDir, 'apple-touch-icon.png'));
  await generatePng(fullSvg, 192, join(publicDir, 'icon-192.png'));
  await generatePng(fullSvg, 512, join(publicDir, 'icon-512.png'));

  // 2. Generate favicon.ico (16x16 + 32x32)
  const png16 = await sharp(Buffer.from(simpleSvg))
    .resize(16, 16)
    .png()
    .toBuffer();

  const png32 = await sharp(Buffer.from(fullSvg))
    .resize(32, 32)
    .png()
    .toBuffer();

  const ico = createIco([
    { size: 16, data: png16 },
    { size: 32, data: png32 },
  ]);

  const faviconPath = join(root, 'src', 'app', 'favicon.ico');
  writeFileSync(faviconPath, ico);
  console.log(`  ✓ ${faviconPath} (16x16 + 32x32 ICO)`);

  console.log('\nDone!');
}

main().catch(console.error);
