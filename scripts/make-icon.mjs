// An original, code-drawn mark. PNG payloads are valid Windows ICO entries.
import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
const size = 256;
const pixels = Buffer.alloc(size * (size * 4 + 1));
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
for (let y = 0; y < size; y++)
  for (let x = 0; x < size; x++) {
    const at = y * (size * 4 + 1) + 1 + x * 4;
    const dx = Math.max(0, 45 - x, x - 210),
      dy = Math.max(0, 45 - y, y - 210);
    const inside = Math.hypot(dx, dy) <= 45;
    const white = lines.some(([a, b, c, d]) => distance(x, y, a, b, c, d) <= 7.5);
    const rgb = white ? [255, 255, 255] : [50, 101, 89];
    pixels[at] = rgb[0];
    pixels[at + 1] = rgb[1];
    pixels[at + 2] = rgb[2];
    pixels[at + 3] = inside ? 255 : 0;
  }
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
    len = Buffer.alloc(4),
    crc = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([len, name, data, crc]);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8;
header[9] = 6;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', header),
  chunk('IDAT', deflateSync(pixels)),
  chunk('IEND', Buffer.alloc(0)),
]);
const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
icoHeader.writeUInt16LE(1, 10);
icoHeader.writeUInt16LE(32, 12);
icoHeader.writeUInt32LE(png.length, 14);
icoHeader.writeUInt32LE(22, 18);
await mkdir('build', { recursive: true });
await writeFile('build/icon.ico', Buffer.concat([icoHeader, png]));
await writeFile('build/icon.png', png);
