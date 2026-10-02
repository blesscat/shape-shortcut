import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require(process.cwd() + '/node_modules/.pnpm/sharp@0.35.4_@types+node@26.1.2/node_modules/sharp/dist/index.cjs');
async function load(f) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, ch: info.channels, data };
}
function px(im, x, y) { const i = (y * im.w + x) * im.ch; return [im.data[i], im.data[i+1], im.data[i+2]]; }
function hex(c) { return '#' + c.map(v => Math.min(255,v).toString(16).padStart(2,'0')).join(''); }
function grid(im, label, x0,x1,dx, y0,y1,dy) {
  console.log('\n' + label);
  let hdr = '     ';
  for (let x=x0;x<=x1;x+=dx) hdr += String(x).padStart(8);
  console.log(hdr);
  for (let y=y0;y<=y1;y+=dy) {
    let l = String(y).padStart(4)+' ';
    for (let x=x0;x<=x1;x+=dx) l += hex(px(im,x,y)).padStart(8);
    console.log(l);
  }
}
const mock = await load('/tmp/design-mockup-v2.png');
const light = await load('/tmp/faith2-light.png');
const dark = await load('/tmp/faith2-dark.png');
grid(mock, 'MOCKUP hero1 stamp (x934-976 step 3, y122-146 step 2)', 934,976,3, 122,146,2);
grid(light, 'LIGHT impl hero1 stamp (x1162-1206 step 3, y544-588 step 3)', 1162,1206,3, 544,588,3);
grid(dark,  'DARK impl hero1 stamp (x1162-1206 step 3, y544-588 step 3)', 1162,1206,3, 544,588,3);
