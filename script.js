// ============ Interactive demo board ============
// Tap source chips to drop nodes on the board, then Generate to watch
// Poppy "write". If untouched, an auto-demo plays the sequence once.
(() => {
  const board = document.getElementById('demo-board');
  if (!board) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const chips = [...board.querySelectorAll('.chip')];
  const genBtn = document.getElementById('gen-btn');
  const aiOut = document.getElementById('ai-out');
  const aiText = document.getElementById('ai-text');

  const PARTS = {
    video: 'watched all 42 min of the video',
    pdf: 'read every page of the teardown',
    voice: 'matched the tone of your voice note',
    reel: 'studied your best reel’s cadence',
  };
  const HOOK =
    'Hook #1: “I studied my competitor’s most viral content so you don’t have to. Three beats make it work, and you can steal all of them.”';
  const EMPTY_MSG =
    'This board is empty. Tap a source above, I write better with receipts.';

  const active = new Set();
  let autoTimers = [];
  let typeTimer = null;
  let userDrove = false;

  const setNode = (key, on) => {
    const node = board.querySelector(`.node[data-slot="${key}"]`);
    const line = board.querySelector(`path[data-line="${key}"]`);
    const chip = board.querySelector(`.chip[data-node="${key}"]`);
    if (node) node.classList.toggle('on', on);
    if (line) line.classList.toggle('on', on);
    if (chip) chip.classList.toggle('on', on);
    active[on ? 'add' : 'delete'](key);
  };

  const stopTyping = () => {
    if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
    aiText.classList.remove('typing-caret');
  };

  const typeOut = (msg, done) => {
    stopTyping();
    aiOut.hidden = false;
    if (reduced) { aiText.textContent = msg; if (done) done(); return; }
    aiText.textContent = '';
    aiText.classList.add('typing-caret');
    let i = 0;
    typeTimer = setInterval(() => {
      aiText.textContent = msg.slice(0, ++i);
      if (i >= msg.length) { stopTyping(); if (done) done(); }
    }, 13);
  };

  const generate = () => {
    if (!active.size) { typeOut(EMPTY_MSG); return; }
    const order = ['video', 'pdf', 'voice', 'reel'].filter((k) => active.has(k));
    const doneList = order.map((k) => PARTS[k]).join(', ');
    const msg = `Done. I ${doneList}.\n${HOOK}\n✓ 5 hooks drafted in your voice · 11s`;
    typeOut(msg, () => { genBtn.textContent = '↻ Run it again'; });
  };

  const cancelAuto = () => {
    if (userDrove) return;
    userDrove = true;
    autoTimers.forEach(clearTimeout);
    autoTimers = [];
  };

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      cancelAuto();
      const key = chip.dataset.node;
      setNode(key, !active.has(key));
    });
  });

  genBtn.addEventListener('click', () => { cancelAuto(); generate(); });

  // Auto-demo: play the story once for visitors who just watch
  if (reduced) {
    ['video', 'pdf', 'voice'].forEach((k) => setNode(k, true));
    generate();
  } else {
    const script = [
      [600, () => setNode('video', true)],
      [1500, () => setNode('pdf', true)],
      [2400, () => setNode('voice', true)],
      [3400, generate],
    ];
    script.forEach(([t, fn]) => autoTimers.push(setTimeout(fn, t)));
  }
})();

// ============ Scroll-autoplay video + mini player ============
// One featured video per section autoplays (muted) when scrolled into view.
// Zero cost until then: the iframe is only created at that moment. Scrolling
// past docks it to a corner mini player with mute/close. Reaching the other
// section's video stops this one and starts that one.
const stopLiveVideo = (() => {
  const slots = [...document.querySelectorAll('.av-slot[data-autoplay]')];
  if (!slots.length) return () => {};

  const ICON_MUTED =
    '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor"/><path d="M16 9.5l5 6m0-5l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
  const ICON_SOUND =
    '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 9v6h4l5 5V4L7 9H3z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';

  let current = null; // { slot, wrap, iframe, muted }

  const cmd = (iframe, func) => {
    try {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args: [] }), '*'
      );
    } catch (e) { /* iframe not ready yet */ }
  };

  const stop = (dismiss) => {
    if (!current) return;
    current.iframe.remove();
    current.wrap.classList.remove('docked');
    current.wrap.hidden = true;
    current.slot.classList.remove('playing');
    if (dismiss) current.slot.dataset.dismissed = '1';
    current = null;
  };

  const activate = (slot) => {
    stop(false);
    const wrap = slot.querySelector('.av-wrap');
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${slot.dataset.autoplay}?autoplay=1&mute=1&rel=0&playsinline=1&enablejsapi=1`;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.title = 'Poppy AI video';
    wrap.prepend(iframe);
    wrap.hidden = false;
    slot.classList.add('playing');
    const muteBtn = wrap.querySelector('.av-mute');
    muteBtn.innerHTML = ICON_MUTED;
    muteBtn.setAttribute('aria-label', 'Unmute video');
    current = { slot, wrap, iframe, muted: true };
  };

  slots.forEach((slot) => {
    const wrap = slot.querySelector('.av-wrap');
    wrap.querySelector('.av-mute').innerHTML = ICON_MUTED;

    wrap.querySelector('.av-close').addEventListener('click', (e) => {
      e.stopPropagation();
      stop(true);
    });
    wrap.querySelector('.av-mute').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!current || current.slot !== slot) return;
      cmd(current.iframe, current.muted ? 'unMute' : 'mute');
      current.muted = !current.muted;
      const btn = e.currentTarget;
      btn.innerHTML = current.muted ? ICON_MUTED : ICON_SOUND;
      btn.setAttribute('aria-label', current.muted ? 'Unmute video' : 'Mute video');
    });

    // Tap the thumbnail to (re)start, even after dismissing
    slot.addEventListener('click', () => {
      if (current && current.slot === slot) return;
      delete slot.dataset.dismissed;
      activate(slot);
    });
    slot.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && slot.getAttribute('role') === 'button') {
        e.preventDefault();
        slot.click();
      }
    });
  });

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          const slot = en.target;
          if (en.isIntersecting) {
            if (current && current.slot === slot) {
              current.wrap.classList.remove('docked');
            } else if (!slot.dataset.dismissed) {
              activate(slot);
            }
          } else if (current && current.slot === slot) {
            current.wrap.classList.add('docked');
          }
        });
      },
      { threshold: 0.5 }
    );
    slots.forEach((s) => io.observe(s));
  }

  return stop;
})();

// ============ Video lightbox ============
// One iframe for every video on the page; nothing loads until a click.
(() => {
  const modal = document.getElementById('video-modal');
  const iframe = document.getElementById('vm-iframe');
  if (!modal || !iframe) return;

  const open = (id) => {
    stopLiveVideo(true); // don't fight the lightbox for audio or attention
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    modal.hidden = true;
    iframe.src = '';
    document.body.style.overflow = '';
  };

  document.querySelectorAll('[data-yt]').forEach((el) => {
    el.addEventListener('click', () => open(el.dataset.yt));
  });
  modal.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', close);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) close();
  });
})();

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

  const N = mobile ? 32 : 56;
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  let W, H, cols;
  const parts = [];
  const pulses = [];

  const COLORS = [
    [217, 92, 138],  // poppy pink
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
      g.addColorStop(0, 'rgba(217,92,138,.7)');
      g.addColorStop(1, 'rgba(217,92,138,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
    }

    // dots (with upward comet trails in act IV)
    parts.forEach((pt, i) => {
      const [r, g, b] = pt.c;
      if (launch > 0.05) {
        const len = launch * (14 + (i % 5) * 6);
        const lg = ctx.createLinearGradient(pt.x, pt.y, pt.x, pt.y + len);
        lg.addColorStop(0, `rgba(${r},${g},${b},.35)`);
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
  '.way, .benefit, .step, .use, .t-card, .vt-card'
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
document.querySelectorAll('a.btn-lg').forEach((b) => pulseIO.observe(b));

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
