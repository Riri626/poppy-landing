// ============ Scroll-story background ============
// Four acts driven by scroll progress:
// scattered (drifting dots) -> connected (constellation lines) ->
// creating (pulses travel the lines) -> shipped (everything streams upward)
(() => {
  const cv = document.getElementById('bg-story');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 620px)').matches;

  const N = mobile ? 36 : 70;
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  let W, H, cols;
  const parts = [];
  const pulses = [];

  const COLORS = [
    [224, 69, 31],   // poppy red
    [37, 71, 244],   // blue
    [76, 68, 58],    // warm ink
  ];

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = W * DPR;
    cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cols = Math.max(4, Math.round(W / 170));
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < N; i++) {
    parts.push({
      x: Math.random() * 2000 % (W || 1200),
      y: Math.random() * 1200 % (H || 800),
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: 1.2 + Math.random() * 1.8,
      c: COLORS[i % 2 === 0 ? 2 : (i % 4 === 1 ? 0 : 1)],
    });
  }

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const smooth = (p, a, b) => {
    const t = clamp01((p - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const progress = () =>
    clamp01(window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight));

  const LINK = 120; // px distance for constellation links

  function frame() {
    const p = progress();
    const organize = smooth(p, 0.15, 0.55);  // act II: pull into a loose lattice
    const linkA = smooth(p, 0.12, 0.4);      // line opacity ramp
    const launch = smooth(p, 0.78, 1);       // act IV: upward stream

    ctx.clearRect(0, 0, W, H);

    // move
    parts.forEach((pt, i) => {
      // act I: free drift
      pt.x += pt.vx * (1 - organize * 0.7);
      pt.y += pt.vy * (1 - organize * 0.7) - launch * (1.6 + (i % 5) * 0.5);

      // act II: gentle pull toward a lattice slot
      if (organize > 0 && launch < 0.5) {
        const gx = ((i % cols) + 0.5) * (W / cols);
        const gy = (Math.floor(i / cols) + 0.5) * (H / Math.ceil(N / cols));
        pt.x += (gx - pt.x) * 0.004 * organize;
        pt.y += (gy - pt.y) * 0.004 * organize;
      }

      // wrap
      if (pt.x < -20) pt.x = W + 20; if (pt.x > W + 20) pt.x = -20;
      if (pt.y < -20) pt.y = H + 20; if (pt.y > H + 20) pt.y = -20;
    });

    // constellation links
    if (linkA > 0.01) {
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = parts[i].x - parts[j].x;
          const dy = parts[i].y - parts[j].y;
          const d = Math.hypot(dx, dy);
          if (d < LINK) {
            const a = (1 - d / LINK) * 0.13 * linkA;
            ctx.strokeStyle = `rgba(150, 120, 90, ${a})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(parts[i].x, parts[i].y);
            ctx.lineTo(parts[j].x, parts[j].y);
            ctx.stroke();
          }
        }
      }
    }

    // act III: pulses travelling between linked nodes
    if (p > 0.4 && pulses.length < 5 && Math.random() < 0.03) {
      const i = Math.floor(Math.random() * N);
      let best = -1, bd = LINK;
      for (let j = 0; j < N; j++) {
        if (j === i) continue;
        const d = Math.hypot(parts[i].x - parts[j].x, parts[i].y - parts[j].y);
        if (d < bd) { bd = d; best = j; }
      }
      if (best >= 0) pulses.push({ a: i, b: best, t: 0 });
    }
    for (let k = pulses.length - 1; k >= 0; k--) {
      const pu = pulses[k];
      pu.t += 0.02;
      if (pu.t >= 1) { pulses.splice(k, 1); continue; }
      const A = parts[pu.a], B = parts[pu.b];
      const x = A.x + (B.x - A.x) * pu.t;
      const y = A.y + (B.y - A.y) * pu.t;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
      g.addColorStop(0, 'rgba(224,69,31,.75)');
      g.addColorStop(1, 'rgba(224,69,31,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
    }

    // dots (with upward comet trails in act IV)
    parts.forEach((pt, i) => {
      const [r, g, b] = pt.c;
      if (launch > 0.05) {
        const len = launch * (14 + (i % 5) * 6);
        const lg = ctx.createLinearGradient(pt.x, pt.y, pt.x, pt.y + len);
        lg.addColorStop(0, `rgba(${r},${g},${b},.4)`);
        lg.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.strokeStyle = lg;
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(pt.x, pt.y + len); ctx.stroke();
      }
      ctx.fillStyle = `rgba(${r},${g},${b},${0.32 + 0.2 * organize})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, 7);
      ctx.fill();
    });
  }

  // story rail state
  const stages = document.querySelectorAll('.story-stage');
  const THRESHOLDS = [0, 0.22, 0.48, 0.78];
  function updateRail() {
    const p = progress();
    stages.forEach((s, i) => s.classList.toggle('on', p >= THRESHOLDS[i]));
  }
  updateRail();
  window.addEventListener('scroll', updateRail, { passive: true });

  frame(); // guarantee first paint even before scroll/rAF kicks in
  window.addEventListener('scroll', frame, { passive: true });
  if (reduced) return; // static constellation, redrawn per scroll position only
  (function loop() {
    if (!document.hidden) frame();
    requestAnimationFrame(loop);
  })();
})();

// Pass ad-tracking params (utm_*, fbclid, etc.) through to checkout links
// so paid-traffic attribution survives the click.
const params = new URLSearchParams(window.location.search);
const tracked = [...params.entries()].filter(
  ([k]) => k.startsWith('utm_') || k === 'fbclid' || k === 'gclid'
);
if (tracked.length) {
  document.querySelectorAll('a.checkout-link').forEach((a) => {
    const url = new URL(a.href);
    tracked.forEach(([k, v]) => url.searchParams.set(k, v));
    a.href = url.toString();
  });
  const form = document.querySelector('.cta-form');
  if (form) {
    tracked.forEach(([k, v]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = k;
      input.value = v;
      form.appendChild(input);
    });
  }
}

// Reveal-on-scroll for section content
const targets = document.querySelectorAll(
  '.way, .benefit, .step, .use, .t-card'
);
targets.forEach((el, i) => {
  el.classList.add('reveal');
  el.style.transitionDelay = `${(i % 3) * 70}ms`;
});

const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);
targets.forEach((el) => io.observe(el));

// Cursor-tracking glow on the bento cards
document.querySelectorAll('.use').forEach((card) => {
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
});

// Gentle one-time pulse on primary CTAs when they enter the viewport
const pulseIO = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('pulse');
        pulseIO.unobserve(e.target);
      }
    });
  },
  { threshold: 0.6 }
);
document.querySelectorAll('.btn-lg').forEach((b) => pulseIO.observe(b));

// Hide sticky CTA while the pricing card is on screen
const sticky = document.querySelector('.sticky-cta');
const priceCard = document.querySelector('.price-card');
if (sticky && priceCard) {
  new IntersectionObserver(
    ([e]) => {
      sticky.style.transform = e.isIntersecting ? 'translateY(110%)' : '';
      sticky.style.transition = 'transform .3s ease';
    },
    { threshold: 0.2 }
  ).observe(priceCard);
}
