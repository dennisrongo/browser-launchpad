#!/usr/bin/env node

/**
 * Simple PNG Icon Generator for Browser Launchpad
 * Creates minimal PNG files with base64 data
 */

const fs = require('fs');
const path = require('path');

// Minimal 1x1 blue PNG (base64)
const minimalBluePNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

// Create a simple function to generate a colored square PNG
function createSimplePNG(width, height, r, g, b) {
    // PNG signature
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR chunk
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr.writeUInt8(8, 8); // bit depth
    ihdr.writeUInt8(2, 9); // color type (RGB)
    ihdr.writeUInt8(0, 10); // compression
    ihdr.writeUInt8(0, 11); // filter
    ihdr.writeUInt8(0, 12); // interlace

    const ihdrChunk = createChunk('IHDR', ihdr);

    // IDAT chunk - scanline data
    const scanlines = [];
    for (let y = 0; y < height; y++) {
        const scanline = Buffer.alloc(1 + width * 3);
        scanline[0] = 0; // filter type
        for (let x = 0; x < width; x++) {
            const i = 1 + x * 3;
            scanline[i] = r;
            scanline[i + 1] = g;
            scanline[i + 2] = b;
        }
        scanlines.push(scanline);
    }

    const idatData = Buffer.concat(scanlines);
    const compressed = require('zlib').deflateSync(idatData);
    const idatChunk = createChunk('IDAT', compressed);

    // IEND chunk
    const iendChunk = createChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const typeBuffer = Buffer.from(type, 'ascii');
    const crc = require('zlib').crc32(Buffer.concat([typeBuffer, data]));
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc, 0);

    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// Create icons with different blue shades
const sizes = [
    { size: 16, color: [59, 130, 246] },  // Blue-500
    { size: 48, color: [59, 130, 246] },  // Blue-500
    { size: 128, color: [59, 130, 246] }  // Blue-500
];

const publicDir = path.join(__dirname, '..', 'public');
const distDir = path.join(__dirname, '..', 'dist');

// Ensure directories exist
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

sizes.forEach(({ size, color }) => {
    const png = createSimplePNG(size, size, ...color);
    const filename = `icon${size}.png`;

    // Write to public
    fs.writeFileSync(path.join(publicDir, filename), png);
    console.log(`Created ${filename} in public/`);

    // Write to dist
    fs.writeFileSync(path.join(distDir, filename), png);
    console.log(`Created ${filename} in dist/`);
});

console.log('\n✅ Icons generated successfully!');
console.log('Note: These are simple colored square icons. For production, consider using professionally designed icons.');
