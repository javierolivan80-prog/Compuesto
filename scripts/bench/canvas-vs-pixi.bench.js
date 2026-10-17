import { Application, Graphics, Container } from 'pixi.js';

// Mismo escenario en ambos motores: 500 elementos (rectángulos pequeños) que se mueven y rotan cada fotograma,
// más 40 «partículas» con alfa variable. Se mide durante 3 s tras 1 s de calentamiento.
const N = Number(new URLSearchParams(location.search).get('n') ?? 500);
const W = 800,
  H = 480;
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r = rng(7);
const items = Array.from({ length: N }, () => ({
  x: r() * W,
  y: r() * H,
  vx: (r() - 0.5) * 3,
  vy: (r() - 0.5) * 3,
  rot: r() * 6,
  w: 6 + r() * 10,
}));

function measure(frame) {
  return new Promise((resolve) => {
    const times = [];
    let last = 0,
      start = 0;
    const loop = (t) => {
      if (!start) start = t;
      if (last) times.push(t - last);
      last = t;
      frame(t);
      if (t - start < 4000) requestAnimationFrame(loop);
      else {
        const m = times.filter((_, i) => i > times.length * 0.25);
        const avg = m.reduce((a, b) => a + b, 0) / m.length;
        const sorted = [...m].sort((a, b) => a - b);
        resolve({
          fps: 1000 / avg,
          p95ms: sorted[Math.floor(sorted.length * 0.95)],
          frames: m.length,
        });
      }
    };
    requestAnimationFrame(loop);
  });
}

async function canvas() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  return measure(() => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#d4a84a';
    for (const it of items) {
      it.x = (it.x + it.vx + W) % W;
      it.y = (it.y + it.vy + H) % H;
      it.rot += 0.05;
      const c2 = Math.cos(it.rot),
        s2 = Math.sin(it.rot);
      ctx.setTransform(c2, s2, -s2, c2, it.x, it.y);
      ctx.fillRect(-it.w / 2, -it.w / 2, it.w, it.w);
    }
  });
}

async function pixi() {
  const app = new Application();
  await app.init({ width: W, height: H, antialias: false, preference: 'webgl' });
  document.body.appendChild(app.canvas);
  const root = new Container();
  app.stage.addChild(root);
  const sprites = items.map((it) => {
    const g = new Graphics().rect(-it.w / 2, -it.w / 2, it.w, it.w).fill(0xd4a84a);
    root.addChild(g);
    return g;
  });
  app.ticker.stop();
  return measure(() => {
    items.forEach((it, i) => {
      it.x = (it.x + it.vx + W) % W;
      it.y = (it.y + it.vy + H) % H;
      it.rot += 0.05;
      const s = sprites[i];
      s.x = it.x;
      s.y = it.y;
      s.rotation = it.rot;
    });
    app.renderer.render(app.stage);
  });
}

const which = new URLSearchParams(location.search).get('engine');
(which === 'pixi' ? pixi() : canvas()).then((res) => {
  window.__result = { engine: which, ...res };
  document.title = 'done';
});
