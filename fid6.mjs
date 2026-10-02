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
console.log('LIGHT card1 region: exact pixel hex grid, x from 60 to 340 step 16 (cols), y from 796 to 976 step 12 (rows)');
let hdr = '     ';
for (let x=60;x<=340;x+=16) hdr += String(x).padStart(8);
console.log(hdr);
for (let y=796;y<=976;y+=12) {
  let line = String(y).padStart(4)+' ';
  for (let x=60;x<=340;x+=16) line += hex(px(light,x,y)).padStart(8);
  console.log(line);
}
console.log('\nLIGHT hero row1 left region: x 40..180 step 10, y 515..615 step 8');
hdr = '     ';
for (let x=40;x<=180;x+=10) hdr += String(x).padStart(8);
console.log(hdr);
for (let y=515;y<=615;y+=8) {
  let line = String(y).padStart(4)+' ';
  for (let x=40;x<=180;x+=10) line += hex(px(light,x,y)).padStart(8);
  console.log(line);
}
