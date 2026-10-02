import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require(process.cwd() + '/node_modules/.pnpm/sharp@0.35.4_@types+node@26.1.2/node_modules/sharp/dist/index.cjs');
async function load(f) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, ch: info.channels, data };
}
function px(im, x, y) { const i = (y * im.w + x) * im.ch; return [im.data[i], im.data[i+1], im.data[i+2]]; }
function hex(c) { return '#' + c.map(v => Math.min(255,v).toString(16).padStart(2,'0')).join(''); }
const light = await load('/tmp/faith2-light.png');
const dark = await load('/tmp/faith2-dark.png');
function grid(im, label, x0,x1,dx, y0,y1,dy) {
  console.log('\n' + label);
  let hdr = '     ';
  for (let x=x0;x<=x1;x+=dx) hdr += String(x).padStart(8);
  console.log(hdr);
  for (let y=y0;y<=y1;y+=dy) {
    let line = String(y).padStart(4)+' ';
    for (let x=x0;x<=x1;x+=dx) line += hex(px(im,x,y)).padStart(8);
    console.log(line);
  }
}
grid(light, 'LIGHT hero thumb left edge fine: x72-100 step 2, y544-596 step 4', 72,100,2, 544,596,4);
grid(dark,  'DARK hero thumb left edge fine: x72-100 step 2, y544-596 step 4', 72,100,2, 544,596,4);
grid(light, 'LIGHT hero thumb right edge: x150-190 step 4, y520-610 step 6', 150,190,4, 520,610,6);
