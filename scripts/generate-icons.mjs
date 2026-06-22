// Genererer PWA-ikoner (PNG) uten avhengigheter — ren Node zlib.
// Tegner et stilisert blad (leaf-grønt) på mørk grønn bakgrunn, anti-aliased
// via 2×2 supersampling. Kjør: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

// ---- CRC32 ----
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // resten 0
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---- Farger ----
const BG = [12, 42, 26]; // #0c2a1a (leaf.deep)
const LEAF = [74, 222, 128]; // #4ade80 (leaf)
const VEIN = [12, 42, 26]; // bg-grønn snittet gjennom bladet

function draw(N) {
  const buf = Buffer.alloc(N * N * 4);
  const cx = N / 2;
  const cy = N / 2;
  const R = 0.34 * N;
  const c = 0.5 * R;
  const A = (-32 * Math.PI) / 180; // tilt
  const cosA = Math.cos(A);
  const sinA = Math.sin(A);
  const veinW = 0.016 * N;

  function inLeaf(px, py) {
    const dx = px - cx;
    const dy = py - cy;
    const u = dx * cosA + dy * sinA;
    const v = -dx * sinA + dy * cosA;
    const d1 = Math.hypot(u - c, v);
    const d2 = Math.hypot(u + c, v);
    if (d1 > R || d2 > R) return 0; // utenfor bladet
    // vein langs lang-aksen (u≈0) + en knekk på midten
    if (Math.abs(u) < veinW) return 2;
    return 1;
  }

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // 2×2 supersampling for myke kanter
      let leaf = 0;
      let vein = 0;
      for (let sy = 0; sy < 2; sy++)
        for (let sx = 0; sx < 2; sx++) {
          const r = inLeaf(x + (sx + 0.5) / 2, y + (sy + 0.5) / 2);
          if (r === 1) leaf++;
          else if (r === 2) vein++;
        }
      const total = 4;
      const leafCov = leaf / total;
      const veinCov = vein / total;
      const bodyCov = leafCov + veinCov;
      // bunn = bg, legg blad oppå, så vein oppå bladet
      let rr = BG[0];
      let gg = BG[1];
      let bb = BG[2];
      if (bodyCov > 0) {
        rr = rr * (1 - bodyCov) + LEAF[0] * bodyCov;
        gg = gg * (1 - bodyCov) + LEAF[1] * bodyCov;
        bb = bb * (1 - bodyCov) + LEAF[2] * bodyCov;
      }
      if (veinCov > 0) {
        rr = rr * (1 - veinCov) + VEIN[0] * veinCov;
        gg = gg * (1 - veinCov) + VEIN[1] * veinCov;
        bb = bb * (1 - veinCov) + VEIN[2] * veinCov;
      }
      const o = (y * N + x) * 4;
      buf[o] = Math.round(rr);
      buf[o + 1] = Math.round(gg);
      buf[o + 2] = Math.round(bb);
      buf[o + 3] = 255;
    }
  }
  return encodePng(N, N, buf);
}

mkdirSync('public/icons', { recursive: true });
for (const N of [512, 192, 180]) {
  writeFileSync(`public/icons/icon-${N}.png`, draw(N));
  console.log(`skrev public/icons/icon-${N}.png`);
}
