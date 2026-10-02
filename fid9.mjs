import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require(process.cwd() + '/node_modules/.pnpm/sharp@0.35.4_@types+node@26.1.2/node_modules/sharp/dist/index.cjs');
async function load(f) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, ch: info.channels, data };
}
function px(im, x, y) { const i = (y * im.w + x) * im.ch; return [im.data[i], im.data[i+1], im.data[i+2]]; }
function hex(c) { return '#' + c.map(v => Math.min(255,v).toString(16).padStart(2,'0')).join(''); }
function vscan(im, label, x, y0, y1) {
  console.log('\n' + label + ' (x=' + x + '), rows darker than bg:');
  for (let y=y0;y<=y1;y++) {
    const c = px(im,x,y);
    const lum = Math.round(0.299*c[0]+0.587*c[1]+0.114*c[2]);
    if (lum < 244) console.log('  y'+String(y).padStart(4), hex(c), 'lum'+lum);
  }
}
function search(im, label, x0,x1,y0,y1, pred) {
  let n=0, sum=[0,0,0], xs=[], ys=[];
  for (let y=y0;y<y1;y++) for (let x=x0;x<x1;x++) {
    const c = px(im,x,y);
    if (pred(c)) { n++; sum[0]+=c[0];sum[1]+=c[1];sum[2]+=c[2]; xs.push(x); ys.push(y); }
  }
  if (n) console.log(label + ': px=' + n, 'mean=#' + sum.map(v=>Math.round(v/n).toString(16).padStart(2,'0')).join(''), 'bbox x[' + Math.min(...xs) + '-' + Math.max(...xs) + '] y[' + Math.min(...ys) + '-' + Math.max(...ys) + ']');
  else console.log(label + ': none');
}
const isCoralL = c => c[0]>130 && c[0]-c[2]>50 && c[0]-c[1]>40;
const isCoralD = c => c[0]>140 && c[0]-c[2]>45 && c[0]-c[1]>35;
const isGreen  = c => c[1]-c[0]>15 && c[1]-c[2]>10 && c[1]>90;

const mock = await load('/tmp/design-mockup-v2.png');
const light = await load('/tmp/faith2-light.png');
const dark = await load('/tmp/faith2-dark.png');

vscan(mock, 'MOCKUP head zone scan', 512, 60, 100);
vscan(light, 'LIGHT impl head zone scan', 640, 485, 528);
vscan(dark, 'DARK impl head zone scan', 640, 485, 528);
console.log('');
search(mock, 'MOCKUP toggle/coral x930-1015 y505-545', 930,1015,505,545, isCoralL);
search(light, 'LIGHT toggle/coral x1080-1275 y1080-1145', 1080,1275,1080,1145, isCoralL);
search(dark,  'DARK toggle/coral x1080-1275 y1080-1145', 1080,1275,1080,1145, isCoralD);
console.log('');
search(mock, 'MOCKUP hero1 stamp green x890-1015 y105-150', 890,1015,105,150, isGreen);
search(mock, 'MOCKUP hero2 stamp green x890-1015 y195-245', 890,1015,195,245, isGreen);
search(light, 'LIGHT hero1 stamp green x1080-1275 y525-605', 1080,1275,525,605, isGreen);
search(light, 'LIGHT hero2 stamp green x1080-1275 y660-725', 1080,1275,660,725, isGreen);
search(dark, 'DARK hero1 stamp green x1080-1275 y525-605', 1080,1275,525,605, isGreen);
search(dark, 'DARK hero2 stamp green x1080-1275 y660-725', 1080,1275,660,725, isGreen);
console.log('');
// note bar: find bounds + corner rounding. Light: bar around y1136-1180
vscan(light, 'LIGHT note bar vertical bounds x100', 100, 1125, 1195);
vscan(dark, 'DARK note bar vertical bounds x100', 100, 1125, 1195);
// corner: light bar left edge ~x70? horizontal scan at bar mid + at top row
function hscan(im, label, y, x0, x1) {
  let prev = '';
  const out = [];
  for (let x=x0;x<=x1;x++) { const h = hex(px(im,x,y)); if (h !== prev) { out.push(x+':'+h); prev = h; } }
  console.log(label + ' y=' + y + ': ' + out.slice(0,14).join(' '));
}
hscan(light, 'LIGHT note bar row scan', 1158, 62, 100);
hscan(light, 'LIGHT note bar top edge row scan', 1137, 62, 100);
hscan(dark, 'DARK note bar row scan', 1158, 62, 100);
hscan(dark, 'DARK note bar top edge row scan', 1137, 62, 100);
