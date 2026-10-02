import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require(process.cwd() + '/node_modules/.pnpm/sharp@0.35.4_@types+node@26.1.2/node_modules/sharp/dist/index.cjs');
async function load(f) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, ch: info.channels, data };
}
function px(im, x, y) { const i = (y * im.w + x) * im.ch; return [im.data[i], im.data[i+1], im.data[i+2]]; }
function hex(c) { return '#' + c.map(v => Math.min(255,v).toString(16).padStart(2,'0')).join(''); }
function avg(im, x0, y0, x1, y1) {
  let r=0,g=0,b=0,n=0;
  for (let y=y0;y<y1;y++) for (let x=x0;x<x1;x++){ const c=px(im,x,y); r+=c[0];g+=c[1];b+=c[2];n++; }
  return [Math.round(r/n),Math.round(g/n),Math.round(b/n)];
}
const mock = await load('/tmp/design-mockup-v2.png');
const light = await load('/tmp/faith2-light.png');
const dark = await load('/tmp/faith2-dark.png');
function s(name, im, x0,y0,x1,y1) { console.log(name.padEnd(38), hex(avg(im,x0,y0,x1,y1)), `(${x0},${y0}-${x1},${y1})`); }

console.log('--- MOCKUP ---');
s('panel bg', mock, 500,75,540,90);
s('mint hero row', mock, 500,145,560,155);
s('hero thumb plate', mock, 52,105,70,115);
s('between-rows band', mock, 500,170,560,180);
s('card plate', mock, 60,315,90,330);
s('card white area', mock, 240,440,300,450);
s('note bar', mock, 500,575,560,590);
console.log('--- LIGHT IMPL ---');
s('panel bg', light, 400,465,440,475);
s('panel bg 2 (above grid)', light, 600,790,700,798);
s('mint hero row 1', light, 600,525,660,535);
s('mint hero row 2', light, 600,645,660,655);
s('hero thumb plate 1', light, 70,528,88,538);
s('hero thumb plate 2', light, 70,668,88,678);
s('between-rows band', light, 600,626,660,634);
s('card1 plate', light, 95,808,120,820);
s('card2 plate', light, 390,808,415,820);
s('card3 plate', light, 700,808,725,820);
s('card4 plate', light, 970,808,995,820);
s('card white text area', light, 250,1000,300,1010);
s('note bar', light, 600,1150,660,1162);
console.log('--- DARK IMPL ---');
s('panel bg', dark, 400,495,440,505);
s('panel bg 2 (above grid)', dark, 600,785,700,795);
s('mint hero row 1', dark, 600,525,660,535);
s('mint hero row 2', dark, 600,645,660,655);
s('hero thumb plate 1', dark, 80,535,98,545);
s('hero thumb plate 2', dark, 80,675,98,685);
s('between-rows band', dark, 600,755,660,762);
s('card1 plate', dark, 95,808,120,820);
s('card2 plate', dark, 390,808,415,820);
s('card3 plate', dark, 700,808,725,820);
s('card4 plate', dark, 970,808,995,820);
s('card bg (text area)', dark, 300,1000,330,1010);
s('gutter between card1/2', dark, 345,870,370,890);
s('note bar', dark, 600,1150,660,1162);
