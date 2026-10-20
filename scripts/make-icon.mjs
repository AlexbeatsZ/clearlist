// Original code-drawn artwork; no third-party image assets.
import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
const lines = [
  [54, 76, 68, 90],
  [68, 90, 94, 58],
  [124, 74, 196, 74],
  [54, 130, 68, 144],
  [68, 144, 94, 112],
  [124, 128, 196, 128],
  [58, 186, 94, 186],
  [124, 182, 196, 182],
];
const distance = (x, y, a, b, c, d) => {
  const t = Math.max(
    0,
    Math.min(1, ((x - a) * (c - a) + (y - b) * (d - b)) / ((c - a) ** 2 + (d - b) ** 2)),
  );
  return Math.hypot(x - a - t * (c - a), y - b - t * (d - b));
};
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type),
    length = Buffer.alloc(4),
    crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}
function png(size) {
  const scale = size / 256,
    pixels = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const px = x / scale,
        py = y / scale,
        at = y * (size * 4 + 1) + 1 + x * 4;
      const inside =
        Math.hypot(Math.max(0, 45 - px, px - 210), Math.max(0, 45 - py, py - 210)) <= 45;
      const white = lines.some(([a, b, c, d]) => distance(px, py, a, b, c, d) <= 7.5);
      const rgb = white ? [255, 255, 255] : [50, 101, 89];
      pixels[at] = rgb[0];
      pixels[at + 1] = rgb[1];
      pixels[at + 2] = rgb[2];
      pixels[at + 3] = inside ? 255 : 0;
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
await mkdir('build', { recursive: true });
const base = png(256),
  ico = Buffer.alloc(22);
ico.writeUInt16LE(1, 2);
ico.writeUInt16LE(1, 4);
ico.writeUInt16LE(1, 10);
ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(base.length, 14);
ico.writeUInt32LE(22, 18);
await writeFile('build/icon.ico', Buffer.concat([ico, base]));
await writeFile('build/icon.png', base);
const chunks = [
  ['ic07', 128],
  ['ic08', 256],
  ['ic09', 512],
  ['ic10', 1024],
].map(([type, size]) => {
  const data = png(size),
    header = Buffer.alloc(8);
  header.write(type);
  header.writeUInt32BE(data.length + 8, 4);
  return Buffer.concat([header, data]);
});
const icns = Buffer.alloc(8);
icns.write('icns');
icns.writeUInt32BE(8 + chunks.reduce((sum, item) => sum + item.length, 0), 4);
await writeFile('build/icon.icns', Buffer.concat([icns, ...chunks]));
