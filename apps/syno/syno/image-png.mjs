import { crc32, deflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// 5x7 capital glyphs used by the vision probe: green field, white letters.
const GLYPHS = Object.freeze({
  S: ["01111", "10000", "01110", "00001", "11110"],
  Y: ["10001", "01010", "00100", "00100", "00100"],
  N: ["10001", "11001", "10101", "10011", "10001"],
  O: ["01110", "10001", "10001", "10001", "01110"],
  "4": ["10010", "10010", "11111", "00010", "00010"],
  "2": ["11110", "00001", "01110", "10000", "11111"],
});

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([length, body, crc]);
}

function createGlyphPng(text = "SYNO42", {
  scale = 4,
  padding = 8,
  background = [0, 180, 0],
  foreground = [255, 255, 255],
} = {}) {
  const glyphs = [...String(text)].map((ch) => GLYPHS[ch] || GLYPHS.O);
  const glyphWidth = 5;
  const glyphHeight = 5;
  const gap = 1;
  const width = padding * 2 + glyphs.length * glyphWidth * scale + (glyphs.length - 1) * gap * scale;
  const height = padding * 2 + glyphHeight * scale;
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = [0];
    for (let x = 0; x < width; x += 1) {
      let color = background;
      const innerX = x - padding;
      const innerY = y - padding;
      if (innerX >= 0 && innerY >= 0) {
        const cell = glyphWidth * scale + gap * scale;
        const index = Math.floor(innerX / cell);
        const localX = innerX - index * cell;
        const localY = innerY;
        if (index >= 0 && index < glyphs.length && localX < glyphWidth * scale && localY < glyphHeight * scale) {
          const gx = Math.floor(localX / scale);
          const gy = Math.floor(localY / scale);
          if (glyphs[index][gy]?.[gx] === "1") color = foreground;
        }
      }
      row.push(color[0], color[1], color[2]);
    }
    rows.push(Buffer.from(row));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const textChunk = chunk("tEXt", Buffer.from(`Comment\0${text}`, "latin1"));
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", ihdr),
    textChunk,
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export { createGlyphPng };
