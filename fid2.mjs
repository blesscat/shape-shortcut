import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require(process.cwd() + '/node_modules/.pnpm/sharp@0.35.4_@types+node@26.1.2/node_modules/sharp/dist/index.cjs');

export async function load(f) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, ch: info.channels, data };
}
export function px(im, x, y) {
  const i = (y * im.w + x) * im.ch;
  return [im.data[i], im.data[i+1], im.data[i+2]];
}
export function hex(c) { return '#' + c.map(v => Math.min(255,v).toString(16).padStart(2,'0')).join(''); }

const REF_LIGHT = [
  ['P', [255,247,242]], // panel #FFF7F2
  ['p', [240,243,248]], // plate cool #F0F3F8/#EEF1F7
  ['W', [255,255,255]], // white card
  ['M', [232,248,240]], // mint
  ['w', [247,242,239]], // warm white #F7F2EF
  ['b', [232,224,216]], // beige-ish (suspect)
  ['C', [208,90,70]],  // coral
  ['B', [96,136,200]], // blue accent
  ['K', [40,35,32]],   // dark ink
  ['g', [150,150,150]], // gray blend (text areas)
];
const REF_DARK = [
  ['P', [42,35,30]],   // panel #2A231E
  ['C', [32,26,22]],   // card #201A16
  ['p', [51,42,36]],   // plate #332A24
  ['M', [35,57,43]],   // mint #23392B
  ['w', [120,105,95]], // light-ish text blend
  ['C!', [200,90,70]], // coral
  ['B', [88,128,192]], // blue accent
  ['D', [16,14,12]],   // near black
  ['L', [230,225,220]],// bright text/white
  ['g', [70,62,58]],   // mid blend
];

function map(im, refs, cellW, cellH) {
  const out = [];
  for (let cy = 0; cy < im.h; cy += cellH) {
    let line = '';
    for (let cx = 0; cx < im.w; cx += cellW) {
      let r=0,g=0,b=0,n=0;
      for (let y = cy; y < Math.min(cy+cellH, im.h); y += 2)
        for (let x = cx; x < Math.min(cx+cellW, im.w); x += 2) {
          const c = px(im, x, y); r+=c[0]; g+=c[1]; b+=c[2]; n++;
        }
      r/=n; g/=n; b/=n;
      let best = '?', bd = 1e9;
      for (const [lab, rc] of refs) {
        const d = (r-rc[0])**2 + (g-rc[1])**2 + (b-rc[2])**2;
        if (d < bd) { bd = d; best = lab; }
      }
      line += best;
    }
    out.push(String(cy).padStart(4) + ' ' + line);
  }
  return out.join('\n');
}

const mock = await load('/tmp/design-mockup-v2.png');
const light = await load('/tmp/faith2-light.png');
const dark = await load('/tmp/faith2-dark.png');

console.log('=== MOCKUP map (cell 12x12) ===');
console.log(map(mock, REF_LIGHT, 12, 12));
console.log('=== LIGHT map (cell 13x20) ===');
console.log(map(light, REF_LIGHT, 13, 20));
