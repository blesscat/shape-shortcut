import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require(process.cwd() + '/node_modules/.pnpm/sharp@0.35.4_@types+node@26.1.2/node_modules/sharp/dist/index.cjs');

export async function load(f) {
  const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true });
  if (info.channels === 4) {
    // flatten alpha onto nothing; just keep rgb
  }
  return { w: info.width, h: info.height, ch: info.channels, data };
}
export function px(im, x, y) {
  const i = (y * im.w + x) * im.ch;
  return [im.data[i], im.data[i+1], im.data[i+2]];
}
export function hex(c) { return '#' + c.map(v => v.toString(16).padStart(2,'0')).join(''); }

export function dominant(im, step = 4) {
  const counts = new Map();
  for (let y = 0; y < im.h; y += step) {
    for (let x = 0; x < im.w; x += step) {
      const c = px(im, x, y);
      // quantize to 8-level per channel
      const q = c.map(v => Math.round(v / 8) * 8);
      const k = q.join(',');
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((a,b) => b[1]-a[1]).slice(0, 20)
    .map(([k, n]) => ({ hex: hex(k.split(',').map(Number)), n }));
}

// classify map: assign each sampled cell to nearest of reference colors
export function classify(im, refs, cols, cellW, cellH) {
  const lines = [];
  for (let cy = 0; cy < im.h; cy += cellH) {
    let line = '';
    for (let cx = 0; cx < im.w; cx += cellW) {
      // average the cell
      let r=0,g=0,b=0,n=0;
      for (let y = cy; y < Math.min(cy+cellH, im.h); y += 2) {
        for (let x = cx; x < Math.min(cx+cellW, im.w); x += 2) {
          const c = px(im, x, y); r+=c[0]; g+=c[1]; b+=c[2]; n++;
        }
      }
      r/=n; g/=n; b/=n;
      let best = 0, bd = 1e9;
      refs.forEach((rc, i) => {
        const d = (r-rc[0])**2 + (g-rc[1])**2 + (b-rc[2])**2;
        if (d < bd) { bd = d; best = i; }
      });
      line += cols[best];
    }
    lines.push(line);
  }
  return lines.join('\n');
}

if (import.meta.url === 'file://' + process.argv[1]) {
  for (const f of ['/tmp/design-mockup-v2.png','/tmp/faith2-light.png','/tmp/faith2-dark.png']) {
    const im = await load(f);
    console.log('====', f, im.w + 'x' + im.h);
    console.log(dominant(im).map(d => d.hex + ':' + d.n).join('  '));
  }
}
