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
const REF_LIGHT = [
  ['P', [255,247,242]], ['p', [240,243,248]], ['W', [255,255,255]], ['M', [232,248,240]],
  ['w', [247,242,239]], ['b', [232,224,216]], ['C', [208,90,70]], ['B', [96,136,200]],
  ['K', [40,35,32]], ['g', [150,150,150]],
];
const REF_DARK = [
  ['P', [42,35,30]], ['C', [32,26,22]], ['p', [51,42,36]], ['M', [35,57,43]],
  ['w', [120,105,95]], ['!', [200,90,70]], ['B', [88,128,192]], ['D', [16,14,12]],
  ['L', [230,225,220]], ['g', [70,62,58]],
];
function mapfile(im, refs, cellW, cellH) {
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
const fs = await import('fs');
fs.writeFileSync('/tmp/map-mockup.txt', mapfile(mock, REF_LIGHT, 12, 12));
fs.writeFileSync('/tmp/map-light.txt', mapfile(light, REF_LIGHT, 13, 20));
fs.writeFileSync('/tmp/map-dark.txt', mapfile(dark, REF_DARK, 13, 20));
console.log('done');
