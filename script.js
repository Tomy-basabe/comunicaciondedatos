'use strict';
/* ════════════════════════════════════════
   SPREAD SPECTRUM JS ENGINE v3
════════════════════════════════════════ */

const TOTAL = 21;
const TRANS_MS = 800;
let current = 1;
let notesOpen = false;
let transitioning = false;
const rafMap = {};

// ── CHAPTERS (for dot nav tooltips) ──
const CHAPTERS = [
  'Portada','Agenda','Shannon-Hartley','Definición SS','Análisis PSD',
  'FHSS Arquitectura','FHSS Diagrama T-F','Slow vs Fast FH',
  'DSSS Spreading','Processing Gain','Secuencias PN',
  'Receptor RAKE','Anti-Jam / LPI','CDMA','Bluetooth AFH','GPS · 802.11b','Conclusión'
];

// ════════════════════════════════════════
// INIT
// ════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  buildDotNav();
  initBgCanvas();
  applyStaggering();
  
  let initial = parseInt(window.location.hash.replace('#', '')) || 1;
  if (initial < 1 || initial > TOTAL) initial = 1;
  
  showSlide(initial, 'none');
  
  window.addEventListener('popstate', () => {
    const hashVal = parseInt(window.location.hash.replace('#', '')) || 1;
    if (hashVal >= 1 && hashVal <= TOTAL && hashVal !== current && !transitioning) {
      goTo(hashVal, false);
    }
  });

  bindEvents();
});

function applyStaggering() {
  const zoomSelectors = [
    '.cover-left > *', '.cover-right > *',
    '.agenda-header', '.agenda-list > .ach', '.agenda-body > canvas',
    '.split-left > *', '.split-right > *',
    '.psd-header', '.psd-canvas-wrap', '.psd-footer > .pfb',
    '.tf-sidebar > *', '.tf-main',
    '.sf-header', '.sf-panels > *',
    '.dsss-sidebar > *', '.dsss-main',
    '.pn-header', '.pn-left > *', '.pn-right > *',
    '.aj-header', '.aj-panels > *',
    '.apps-header', '.apps-panels > *',
    '.conclusion-content > :not(.conclusion-metrics)', '.conclusion-metrics > .cm'
  ];

  document.querySelectorAll('.slide').forEach(slide => {
    let delayIdx = 0;
    zoomSelectors.forEach(sel => {
      slide.querySelectorAll(sel).forEach(el => {
        if (!el.classList.contains('fill-canvas')) {
          el.classList.add('zoom-part');
          el.style.transitionDelay = `${0.2 + delayIdx * 0.08}s`;
          delayIdx++;
        }
      });
    });
  });
}

// ════════════════════════════════════════
// DOT NAV
// ════════════════════════════════════════
function buildDotNav() {
  const nav = document.getElementById('dotNav');
  for (let i = 1; i <= TOTAL; i++) {
    const seg = document.createElement('div');
    seg.className = 'dot-seg';
    seg.dataset.slide = i;
    seg.title = CHAPTERS[i - 1];
    seg.addEventListener('click', () => goTo(i));
    nav.appendChild(seg);
  }
}

function updateUI(n) {
  document.getElementById('progressFill').style.width = `${(n / TOTAL) * 100}%`;
  document.getElementById('navPrev').disabled = n === 1;
  document.getElementById('navNext').disabled = n === TOTAL;
  document.querySelectorAll('.dot-seg').forEach((s, i) =>
    s.classList.toggle('active', i + 1 === n)
  );
}

// ════════════════════════════════════════
// NAVIGATION & TRANSITIONS
// ════════════════════════════════════════
function goTo(n, pushHistory = true) {
  if (n === current || n < 1 || n > TOTAL || transitioning) return;
  transitioning = true;
  cancelRAF(current);

  if (pushHistory) {
    window.history.pushState(null, '', '#' + n);
  }

  const dir = n > current ? 1 : -1;
  const domSlides = document.querySelectorAll('.slide');
  const oldEl = domSlides[current - 1];
  const newEl = domSlides[n - 1];
  current = n;

  // Flash overlay
  const flash = document.getElementById('flashOverlay');
  flash.classList.remove('flash');
  void flash.offsetWidth;
  flash.classList.add('flash');

  // Exit old slide
  const exitClass = dir > 0 ? 'anim-exit-fwd' : 'anim-exit-bwd';
  const enterClass = dir > 0 ? 'anim-enter-fwd' : 'anim-enter-bwd';

  oldEl.classList.remove('active');
  oldEl.classList.add(exitClass);

  newEl.style.display = 'flex';
  newEl.classList.add(enterClass);

  updateUI(n);
  updateNotes(newEl);

  setTimeout(() => {
    oldEl.classList.remove(exitClass);
    oldEl.style.display = '';
    newEl.classList.remove(enterClass);
    newEl.classList.add('active');
    newEl.style.display = '';
    transitioning = false;
    launchAnim(n);
  }, TRANS_MS);
}

function showSlide(n, dir) {
  current = n;
  window.history.replaceState(null, '', '#' + n);
  const el = document.querySelectorAll('.slide')[n - 1];
  el.classList.add('active');
  updateUI(n);
  updateNotes(el);
  setTimeout(() => launchAnim(n), 100);
}

function cancelRAF(n) {
  if (rafMap[n]) { cancelAnimationFrame(rafMap[n]); delete rafMap[n]; }
}

// ════════════════════════════════════════
// NOTES
// ════════════════════════════════════════
function updateNotes(el) {
  document.getElementById('notesContent').textContent = el.dataset.notes || '';
  document.getElementById('notesSlideLabel').textContent = `Diapositiva ${current} de ${TOTAL}`;
}
function toggleNotes() {
  notesOpen = !notesOpen;
  document.getElementById('notesPanel').classList.toggle('open', notesOpen);
}

// ════════════════════════════════════════
// EVENTS
// ════════════════════════════════════════
function bindEvents() {
  document.getElementById('navPrev').addEventListener('click', () => goTo(current - 1));
  document.getElementById('navNext').addEventListener('click', () => goTo(current + 1));
  document.getElementById('notesToggle').addEventListener('click', toggleNotes);
  document.getElementById('notesClose').addEventListener('click', toggleNotes);

  document.addEventListener('keydown', e => {
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goTo(current + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
    else if (e.key === 'n' || e.key === 'N') toggleNotes();
    else if (e.key === 'Home') goTo(1);
    else if (e.key === 'End') goTo(TOTAL);
  });

  let tx = 0;
  const slides = document.getElementById('slides');
  slides.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  slides.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 60) dx < 0 ? goTo(current + 1) : goTo(current - 1);
  }, { passive: true });

  window.addEventListener('resize', () => {
    setTimeout(() => launchAnim(current), 100);
  });
}

// ════════════════════════════════════════
// ANIMATION DISPATCHER
// ════════════════════════════════════════
function launchAnim(n) {
  cancelRAF(n);
  // Reset slide 1 interactive states on re-entry
  if (n === 1) {
    coverGlitchDone = false;
    coverCountDone = false;
    spectrumBarsCreated = false;
    coverHoverMode = 'default';
  }
  const fns = [,
    animCover, animAgenda, animShannon, animTaxo, animPSD,
    animFHSSBlock, animFHSSTF, animSlowFast, animPN, animBarker, animBarkerDash, animDSSS, animDSSSSim, animPG, animHUD,
    animAJ, animCDMA, animBluetooth, animApps, animRAKE, animConclusion
  ];
  if (fns[n]) fns[n]();
}

// ════════════════════════════════════════
// CANVAS HELPERS
// ════════════════════════════════════════
function setupCanvas(el) {
  if (!el) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // Force layout
  const W = el.offsetWidth || el.parentElement?.offsetWidth || 400;
  const H = el.offsetHeight || el.parentElement?.offsetHeight || 300;
  if (!W || !H) return null;
  el.width = W * dpr;
  el.height = H * dpr;
  const ctx = el.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, W, H };
}

function setupFillCanvas(el) {
  if (!el) return null;
  const parent = el.parentElement;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = parent?.offsetWidth || window.innerWidth;
  const H = parent?.offsetHeight || window.innerHeight;
  if (!W || !H) return null;
  el.width = W * dpr;
  el.height = H * dpr;
  const ctx = el.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, W, H };
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

function drawArrow(ctx, x1, y1, x2, y2, col='rgba(0,212,255,.4)', aw=5) {
  const dx=x2-x1,dy=y2-y1,l=Math.sqrt(dx*dx+dy*dy);
  if(l===0)return;
  const ux=dx/l,uy=dy/l;
  ctx.strokeStyle=col;ctx.lineWidth=1.2;ctx.fillStyle=col;
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x2,y2);
  ctx.lineTo(x2-ux*aw+uy*aw*.4,y2-uy*aw-ux*aw*.4);
  ctx.lineTo(x2-ux*aw-uy*aw*.4,y2-uy*aw+ux*aw*.4);
  ctx.closePath();ctx.fill();
}

// ════════════════════════════════════════
// BG CANVAS
// ════════════════════════════════════════
function initBgCanvas() {
  const cv = document.getElementById('bgCanvas');
  const ctx = cv.getContext('2d');
  function resize() { cv.width = window.innerWidth; cv.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  const pts = Array.from({ length: 55 }, () => ({
    x: Math.random() * cv.width, y: Math.random() * cv.height,
    vx: (Math.random()-.5)*.25, vy: (Math.random()-.5)*.25,
    r: Math.random()*1.1+.4,
  }));
  function tick() {
    ctx.clearRect(0,0,cv.width,cv.height);
    const W=cv.width,H=cv.height;
    pts.forEach(p => {
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0)p.x=W;if(p.x>W)p.x=0;
      if(p.y<0)p.y=H;if(p.y>H)p.y=0;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle='rgba(0,212,255,.22)';ctx.fill();
    });
    for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
      const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);
      if(d<100){
        ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);
        ctx.strokeStyle=`rgba(0,212,255,${.045*(1-d/100)})`;ctx.lineWidth=.5;ctx.stroke();
      }
    }
    requestAnimationFrame(tick);
  }
  tick();
}

// ════════════════════════════════════════
// S1 · COVER (ENHANCED)
// ════════════════════════════════════════
let coverHoverMode = 'default'; // 'default' | 'fhss' | 'dsss'
let coverGlitchDone = false;
let coverCountDone = false;
let spectrumBarsCreated = false;

function animCover() {
  const cv = document.getElementById('coverCanvas');
  if (!cv) return;
  const parent = cv.parentElement;
  cv.width = parent.offsetWidth;
  cv.height = parent.offsetHeight;
  const ctx = cv.getContext('2d');

  // ── FFT State ──
  const FFT_BINS = 128;
  const fftData = new Float32Array(FFT_BINS);
  const fftTarget = new Float32Array(FFT_BINS);
  let fftPhase = 0; // 0 = narrowband peak, 1 = spreading, 2 = spread
  let fftTimer = 0;
  const NARROW_HOLD = 120;  // frames to hold narrowband
  const SPREAD_ANIM = 90;   // frames for spreading animation
  const SPREAD_HOLD = 180;  // frames to hold spread state
  const REFORM_ANIM = 90;   // frames to reform
  let fftCycleT = 0;

  // Initialize narrowband peak
  function setNarrowband() {
    for (let i = 0; i < FFT_BINS; i++) {
      const d = Math.abs(i - FFT_BINS / 2);
      fftTarget[i] = Math.exp(-d * d / 12) * 0.95;
    }
  }
  function setSpread() {
    for (let i = 0; i < FFT_BINS; i++) {
      fftTarget[i] = 0.03 + Math.random() * 0.06;
    }
  }
  setNarrowband();
  for (let i = 0; i < FFT_BINS; i++) fftData[i] = fftTarget[i];

  // ── Glitch / Decrypt Effect ──
  if (!coverGlitchDone) {
    coverGlitchDone = true;
    initGlitchText();
  }

  // ── Count-Up Animation ──
  if (!coverCountDone) {
    coverCountDone = true;
    setTimeout(() => initCountUp(), 600);
  }

  // ── Spectrum Analyzer Bars ──
  initSpectrumAnalyzer();

  // ── Hover Interactions on Stat Cards ──
  initStatHover();

  let t = 0;
  function draw() {
    if (!document.getElementById('s1').classList.contains('active')) return;
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);

    // Background radial gradient
    const grd = ctx.createRadialGradient(W * .3, H * .5, 0, W * .3, H * .5, W * .65);
    grd.addColorStop(0, 'rgba(0,212,255,.05)');
    grd.addColorStop(.5, 'rgba(61,133,255,.03)');
    grd.addColorStop(1, 'rgba(124,58,237,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // ── FFT Cycle Logic ──
    fftCycleT++;
    if (fftPhase === 0 && fftCycleT > NARROW_HOLD) {
      fftPhase = 1; fftCycleT = 0; setSpread();
    } else if (fftPhase === 1 && fftCycleT > SPREAD_ANIM) {
      fftPhase = 2; fftCycleT = 0;
    } else if (fftPhase === 2 && fftCycleT > SPREAD_HOLD) {
      fftPhase = 3; fftCycleT = 0; setNarrowband();
    } else if (fftPhase === 3 && fftCycleT > REFORM_ANIM) {
      fftPhase = 0; fftCycleT = 0;
    }

    // Lerp FFT data toward target
    const lerpSpeed = (fftPhase === 1 || fftPhase === 3) ? 0.06 : 0.02;
    for (let i = 0; i < FFT_BINS; i++) {
      fftData[i] += (fftTarget[i] - fftData[i]) * lerpSpeed;
      // Add noise jitter
      fftData[i] += (Math.random() - 0.5) * 0.008;
      fftData[i] = Math.max(0, fftData[i]);
    }

    // ── Hover mode overrides ──
    if (coverHoverMode === 'fhss') {
      // Erratic hopping: random tall spikes
      for (let i = 0; i < FFT_BINS; i++) {
        const spike = Math.random() < 0.04 ? (0.5 + Math.random() * 0.5) : 0.02;
        fftData[i] += (spike - fftData[i]) * 0.15;
      }
    } else if (coverHoverMode === 'dsss') {
      // Dense noisy: everything uniformly elevated + high freq noise
      for (let i = 0; i < FFT_BINS; i++) {
        const target = 0.12 + Math.sin(i * 0.8 + t * 0.1) * 0.05 + Math.random() * 0.08;
        fftData[i] += (target - fftData[i]) * 0.12;
      }
    }

    // ── Draw FFT Bars ──
    const barW = W / FFT_BINS;
    const maxH = H * 0.55;
    const baseY = H * 0.78;

    for (let i = 0; i < FFT_BINS; i++) {
      const h = fftData[i] * maxH;
      const x = i * barW;

      // Color based on intensity
      const intensity = fftData[i];
      let r, g, b, a;
      if (intensity > 0.4) {
        // Bright cyan-white for peaks
        r = 0 + intensity * 180;
        g = 212 + intensity * 43;
        b = 255;
        a = 0.7 + intensity * 0.3;
      } else if (intensity > 0.1) {
        // Cyan-blue
        r = 0;
        g = 140 + intensity * 300;
        b = 255;
        a = 0.35 + intensity * 0.6;
      } else {
        // Dim blue
        r = 20;
        g = 60 + intensity * 400;
        b = 180;
        a = 0.15 + intensity * 2;
      }

      ctx.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a.toFixed(2)})`;
      ctx.fillRect(x, baseY - h, barW - 0.5, h);

      // Glow effect on top of high bars
      if (h > maxH * 0.3) {
        ctx.shadowColor = `rgba(0,212,255,${(intensity * 0.6).toFixed(2)})`;
        ctx.shadowBlur = 15;
        ctx.fillRect(x, baseY - h, barW - 0.5, 2);
        ctx.shadowBlur = 0;
      }
    }

    // Noise floor line
    const noiseY = baseY - maxH * 0.07;
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, noiseY);
    ctx.lineTo(W, noiseY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    ctx.font = '9px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText('N₀ (piso de ruido)', 8, noiseY - 4);

    // Phase label
    const phaseLabels = ['⬆ BANDA ESTRECHA', '⟶ ENSANCHANDO...', '⬇ ESPECTRO ENSANCHADO (LPI)', '⟵ REFORMANDO...'];
    const phaseCols = ['rgba(244,63,94,.6)', 'rgba(245,158,11,.5)', 'rgba(0,212,255,.5)', 'rgba(124,58,237,.5)'];
    if (coverHoverMode === 'default') {
      ctx.fillStyle = phaseCols[fftPhase];
      ctx.font = 'bold 10px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText(phaseLabels[fftPhase], W - 12, baseY + 18);
    } else {
      ctx.fillStyle = coverHoverMode === 'fhss' ? 'rgba(61,133,255,.6)' : 'rgba(124,58,237,.6)';
      ctx.font = 'bold 10px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText(coverHoverMode === 'fhss' ? '⚡ FREQUENCY HOPPING MODE' : '◈ DIRECT SEQUENCE MODE', W - 12, baseY + 18);
    }

    // ── Update Spectrum Analyzer ──
    updateSpectrumAnalyzer(t);

    t++;
    rafMap[1] = requestAnimationFrame(draw);
  }
  draw();
}

// ── Glitch/Decrypt Text Effect ──
function initGlitchText() {
  const glitchEls = document.querySelectorAll('#s1 .glitch-text');
  const chars = '01αβγδΣΔΩ∫∂∇≈≠∞×÷±';

  glitchEls.forEach((el, idx) => {
    const finalText = el.dataset.text;
    const len = finalText.length;
    let iterations = 0;
    const maxIter = 18 + idx * 6;

    el.classList.add('decrypting');
    el.style.color = '#00d4ff';
    el.style.textShadow = '0 0 12px rgba(0,212,255,.6)';

    const interval = setInterval(() => {
      el.textContent = finalText.split('').map((c, i) => {
        if (i < iterations) return finalText[i];
        return chars[Math.floor(Math.random() * chars.length)];
      }).join('');

      if (iterations >= len) {
        clearInterval(interval);
        el.textContent = finalText;
        // Remove decrypting class, restore gradient
        setTimeout(() => {
          el.classList.remove('decrypting');
          el.style.color = '';
          el.style.textShadow = '';
          el.classList.add('glow-active');
        }, 200);
      }
      iterations += 1 / 2.5; // Speed
    }, 45);
  });
}

// ── Count-Up Animation ──
function initCountUp() {
  const counters = document.querySelectorAll('#s1 .count-up');
  counters.forEach(el => {
    const target = parseFloat(el.dataset.target);
    const format = el.dataset.format;
    const duration = 1800;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;

      if (format === 'exp6') {
        if (progress >= 1) {
          el.innerHTML = '10<sup>6</sup>';
        } else {
          const v = Math.round(current);
          el.textContent = v.toLocaleString();
        }
      } else if (format === 'int') {
        el.textContent = Math.round(current).toLocaleString();
      } else if (format === 'float') {
        el.textContent = current.toFixed(1);
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    requestAnimationFrame(update);
  });
}

// ── Spectrum Analyzer ──
function initSpectrumAnalyzer() {
  if (spectrumBarsCreated) return;
  spectrumBarsCreated = true;
  const container = document.getElementById('spectrumAnalyzer');
  if (!container) return;
  container.innerHTML = '';
  const count = Math.max(60, Math.floor(window.innerWidth / 12));
  for (let i = 0; i < count; i++) {
    const bar = document.createElement('div');
    bar.className = 'sa-bar';
    bar.style.height = '2px';
    container.appendChild(bar);
  }
}

function updateSpectrumAnalyzer(t) {
  const container = document.getElementById('spectrumAnalyzer');
  if (!container) return;
  const bars = container.children;
  const maxH = container.offsetHeight || 40;
  for (let i = 0; i < bars.length; i++) {
    const h = 2 + Math.abs(Math.sin(i * 0.3 + t * 0.07)) * maxH * 0.5
      + Math.abs(Math.sin(i * 0.7 + t * 0.11)) * maxH * 0.3
      + Math.random() * maxH * 0.15;
    bars[i].style.height = Math.min(h, maxH) + 'px';
  }
}

// ── Stat Card Hover Interactions ──
function initStatHover() {
  const items = document.querySelectorAll('#s1 .csb-item[data-hover]');
  items.forEach(item => {
    if (item._hoverBound) return;
    item._hoverBound = true;
    item.addEventListener('mouseenter', () => {
      coverHoverMode = item.dataset.hover === 'fhss' ? 'fhss' :
                        item.dataset.hover === 'dsss' ? 'dsss' : 'default';
    });
    item.addEventListener('mouseleave', () => {
      coverHoverMode = 'default';
    });
  });
}

// ════════════════════════════════════════
// S2 · AGENDA RADIAL (ENHANCED)
// ════════════════════════════════════════
let agendaHoverNode = -1; // -1 = none hovered

function animAgenda() {
  const r = setupCanvas(document.getElementById('agendaCanvas'));
  if (!r) return;
  const {ctx,W,H} = r;
  const cx=W*.5,cy=H*.5;
  const topics=['Fundamentos','FHSS','DSSS','RAKE','Ventajas','Aplicaciones','Conclusión'];
  const colors=['#00d4ff','#3d85ff','#7c3aed','#00c896','#f59e0b','#f43f5e','#8b5cf6'];
  const R=Math.min(W,H)*.36;
  const SWEEP_SPEED = 0.012; // radians per frame
  const NODE_COUNT = topics.length;

  // Data packets state: each connection has multiple packets
  const packets = topics.map(() => {
    const count = 2 + Math.floor(Math.random() * 2);
    return Array.from({length: count}, () => ({
      progress: Math.random(), // 0=center, 1=node
      speed: 0.004 + Math.random() * 0.004,
    }));
  });

  // Node pulse state (0 = no pulse, 1 = max pulse, decays)
  const nodePulse = new Float32Array(NODE_COUNT);

  // Setup hover listeners
  initAgendaHover();

  let t = 0;
  function draw() {
    if (!document.getElementById('s2').classList.contains('active')) return;
    ctx.clearRect(0,0,W,H);

    const sweepAngle = t * SWEEP_SPEED - Math.PI / 2;

    // ── Concentric rings ──
    [.95,.68,.42].forEach(f => {
      ctx.beginPath();ctx.arc(cx,cy,R*f,0,Math.PI*2);
      ctx.strokeStyle=`rgba(0,212,255,${.055-f*.03})`;ctx.lineWidth=1;ctx.stroke();
    });

    // ── Radar Sweep Line ──
    const sweepLen = R * 1.15;
    const sx = cx + Math.cos(sweepAngle) * sweepLen;
    const sy = cy + Math.sin(sweepAngle) * sweepLen;

    // Sweep gradient (fade from center to edge)
    const sweepGrd = ctx.createLinearGradient(cx, cy, sx, sy);
    sweepGrd.addColorStop(0, 'rgba(0,212,255,0)');
    sweepGrd.addColorStop(0.3, 'rgba(0,212,255,.35)');
    sweepGrd.addColorStop(0.7, 'rgba(0,212,255,.18)');
    sweepGrd.addColorStop(1, 'rgba(0,212,255,0)');
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(sx, sy);
    ctx.strokeStyle = sweepGrd;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Sweep trailing arc (semi-transparent fan)
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R * 1.05, sweepAngle - 0.35, sweepAngle, false);
    ctx.closePath();
    const fanGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.05);
    fanGrd.addColorStop(0, 'rgba(0,212,255,0)');
    fanGrd.addColorStop(0.5, 'rgba(0,212,255,.04)');
    fanGrd.addColorStop(1, 'rgba(0,212,255,.02)');
    ctx.fillStyle = fanGrd;
    ctx.fill();

    // ── Connection lines + Data Packets ──
    topics.forEach((topic, i) => {
      const angle = (i / NODE_COUNT) * Math.PI * 2 - Math.PI / 2;
      const nx = cx + Math.cos(angle) * R;
      const ny = cy + Math.sin(angle) * R;

      // Dashed connection line
      const lineAlpha = agendaHoverNode === -1 ? 0.18 :
                         agendaHoverNode === i ? 0.45 : 0.06;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(nx, ny);
      ctx.strokeStyle = `rgba(${hexToRgb(colors[i])},${lineAlpha})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // ── Data Packets (luminous dots traveling along line) ──
      packets[i].forEach(pkt => {
        pkt.progress += pkt.speed;
        if (pkt.progress > 1) pkt.progress = 0;

        const px = cx + (nx - cx) * pkt.progress;
        const py = cy + (ny - cy) * pkt.progress;
        const pktAlpha = agendaHoverNode === -1 ? 0.6 :
                          agendaHoverNode === i ? 0.9 : 0.15;
        const pktSize = 1.5 + pkt.progress * 1;

        ctx.beginPath();
        ctx.arc(px, py, pktSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${hexToRgb(colors[i])},${pktAlpha})`;
        ctx.shadowColor = colors[i];
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // ── Check sweep pass for pulse trigger ──
      const nodeAngleNorm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const sweepNorm = ((sweepAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const angleDiff = Math.abs(sweepNorm - nodeAngleNorm);
      if (angleDiff < 0.08 || angleDiff > Math.PI * 2 - 0.08) {
        nodePulse[i] = 1.0;
      }
      // Decay pulse
      nodePulse[i] *= 0.96;

      // ── Draw Node ──
      const isHovered = agendaHoverNode === i;
      const baseScale = isHovered ? 1.1 : 1.0;
      const pulseScale = 1 + nodePulse[i] * 0.15;
      const finalScale = baseScale * pulseScale;
      const nodeRadius = 17 * finalScale;

      // Node opacity
      const nodeAlpha = agendaHoverNode === -1 ? 1.0 :
                         isHovered ? 1.0 : 0.3;

      ctx.save();
      ctx.globalAlpha = nodeAlpha;

      // Pulse glow ring (when sweep passes)
      if (nodePulse[i] > 0.05) {
        ctx.beginPath();
        ctx.arc(nx, ny, nodeRadius + 8 + nodePulse[i] * 12, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${hexToRgb(colors[i])},${nodePulse[i] * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(nx, ny, nodeRadius, 0, Math.PI * 2);
      const nodeGrd = ctx.createRadialGradient(nx, ny, 0, nx, ny, nodeRadius);
      nodeGrd.addColorStop(0, `rgba(${hexToRgb(colors[i])},${isHovered ? 0.25 : 0.12})`);
      nodeGrd.addColorStop(1, `rgba(${hexToRgb(colors[i])},${isHovered ? 0.08 : 0.04})`);
      ctx.fillStyle = nodeGrd;
      ctx.fill();
      ctx.strokeStyle = `rgba(${hexToRgb(colors[i])},${isHovered ? 0.9 : 0.6})`;
      ctx.lineWidth = isHovered ? 2.5 : 1.5;
      if (isHovered) {
        ctx.shadowColor = colors[i];
        ctx.shadowBlur = 20;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Node label
      ctx.fillStyle = colors[i];
      ctx.font = `bold ${isHovered ? '12' : '10'}px JetBrains Mono,monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`0${i + 1}`, nx, ny);

      // Topic name
      const lx = cx + Math.cos(angle) * (R + 34);
      const ly = cy + Math.sin(angle) * (R + 34);
      ctx.font = `${isHovered ? '600 11' : '10'}px Inter,sans-serif`;
      ctx.fillStyle = isHovered ? colors[i] : 'rgba(176,208,232,.7)';
      ctx.fillText(topic, lx, ly);

      ctx.restore();
    });

    // ── Central SS Hub ──
    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 25);
    g.addColorStop(0, 'rgba(0,212,255,.28)');
    g.addColorStop(1, 'rgba(61,133,255,.06)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,212,255,.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 8px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SS', cx, cy);

    // Rotating inner ring glow
    const innerGlow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 28);
    innerGlow.addColorStop(0, `rgba(0,212,255,${0.05 + Math.sin(t * 0.03) * 0.03})`);
    innerGlow.addColorStop(1, 'rgba(0,212,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fillStyle = innerGlow;
    ctx.fill();

    t++;
    rafMap[2] = requestAnimationFrame(draw);
  }
  draw();
}

// ── Agenda Hover Sync ──
function initAgendaHover() {
  const cards = document.querySelectorAll('#s2 .ach[data-node]');
  const list = document.querySelector('#s2 .agenda-list');
  if (!list) return;

  cards.forEach(card => {
    if (card._agendaHoverBound) return;
    card._agendaHoverBound = true;

    card.addEventListener('mouseenter', () => {
      const nodeIdx = parseInt(card.dataset.node);
      agendaHoverNode = nodeIdx;
      list.classList.add('has-hover');
      // Highlight the card
      cards.forEach(c => c.classList.remove('node-active'));
      card.classList.add('node-active');
    });

    card.addEventListener('mouseleave', () => {
      agendaHoverNode = -1;
      list.classList.remove('has-hover');
      card.classList.remove('node-active');
    });
  });
}

// ════════════════════════════════════════
// S3 · SHANNON CURVES
// ════════════════════════════════════════
// ════════════════════════════════════════
// S3 · SHANNON CURVES (ENHANCED)
// ════════════════════════════════════════
let shannonSpreadRatio = 0; // 0 to 1

function animShannon() {
  const r = setupCanvas(document.getElementById('shannonCanvas'));
  if (!r) return;
  const {ctx,W,H} = r;
  const pad={t:28,r:18,b:32,l:48};
  const pW=W-pad.l-pad.r,pH=H-pad.t-pad.b;
  const maxB=8,maxC=30;

  // Setup slider
  const slider = document.getElementById('shannonSlider');
  const valLbl = document.getElementById('shannonSliderVal');
  const varB = document.getElementById('shannon-B');
  const varSN = document.getElementById('shannon-SN');
  const varC = document.getElementById('shannon-C');

  if (slider) {
    slider.addEventListener('input', (e) => {
      shannonSpreadRatio = e.target.value / 100;
      if (valLbl) valLbl.textContent = e.target.value + '%';
      
      // Update DOM formula elements
      if (varB) {
        const scaleB = 1 + shannonSpreadRatio * 0.8; // Grows up to 1.8x
        const glowB = shannonSpreadRatio * 15;
        varB.style.transform = `scale(${scaleB})`;
        varB.style.textShadow = `0 0 ${glowB}px rgba(0,212,255,0.8)`;
      }
      if (varSN) {
        const scaleSN = 1 - shannonSpreadRatio * 0.4; // Shrinks down to 0.6x
        const opSN = 1 - shannonSpreadRatio * 0.5; // Fades to 0.5 opacity
        varSN.style.transform = `scale(${scaleSN})`;
        varSN.style.opacity = opSN;
      }
      if (varC) {
        varC.style.textShadow = `0 0 10px rgba(251,191,36,0.6)`;
      }
    });
  }

  let t = 0;
  function draw() {
    if (!document.getElementById('s3').classList.contains('active')) return;
    ctx.clearRect(0,0,W,H);

    // ── Draw background static noise (based on spread ratio) ──
    if (shannonSpreadRatio > 0.05) {
      const noiseAlpha = shannonSpreadRatio * 0.15;
      ctx.fillStyle = `rgba(0, 212, 255, ${noiseAlpha})`;
      for (let i = 0; i < 300; i++) {
        const nx = pad.l + Math.random() * pW;
        const ny = pad.t + Math.random() * pH;
        const size = Math.random() * 2;
        ctx.fillRect(nx, ny, size, size);
      }
    }

    // Grid
    ctx.strokeStyle='rgba(255,255,255,.05)';ctx.lineWidth=.5;
    for(let i=0;i<=5;i++){
      const y=pad.t+(i/5)*pH;
      ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+pW,y);ctx.stroke();
      ctx.fillStyle='rgba(122,156,184,.5)';ctx.font='8px JetBrains Mono';ctx.textAlign='right';
      ctx.fillText(`${Math.round(maxC*(1-i/5))}`,pad.l-4,y+3);
    }
    for(let i=0;i<=4;i++){
      const x=pad.l+(i/4)*pW;
      ctx.beginPath();ctx.moveTo(x,pad.t);ctx.lineTo(x,pad.t+pH);ctx.stroke();
      ctx.fillStyle='rgba(122,156,184,.5)';ctx.font='8px JetBrains Mono';ctx.textAlign='center';
      ctx.fillText(`${Math.round(maxB*(i/4))} MHz`,x,pad.t+pH+14);
    }
    ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(pad.l,pad.t);ctx.lineTo(pad.l,pad.t+pH);ctx.lineTo(pad.l+pW,pad.t+pH);ctx.stroke();
    ctx.fillStyle='rgba(122,156,184,.4)';ctx.font='8px JetBrains Mono';ctx.textAlign='center';
    ctx.fillText('B [MHz] →',pad.l+pW/2,H-3);
    ctx.save();ctx.translate(12,pad.t+pH/2);ctx.rotate(-Math.PI/2);ctx.fillText('C [Mbps] →',0,0);ctx.restore();

    function drawCurve(snr,color,lw,dash=[]){
      ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.setLineDash(dash);
      ctx.shadowColor=color;ctx.shadowBlur=8;
      for(let i=0;i<=200;i++){
        const B=(i/200)*maxB,C=B*Math.log2(1+snr);
        const x=pad.l+(B/maxB)*pW,y=pad.t+pH-Math.min(C/maxC,1)*pH;
        i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
      }
      ctx.stroke();ctx.setLineDash([]);ctx.shadowBlur=0;
    }
    
    // Constant capacity target: C = 5 Mbps (approx)
    const targetC = 5;
    
    // Base curves
    drawCurve(Math.pow(10,3),'rgba(244,63,94,0.3)',1.5); // SNR 30dB reference
    drawCurve(.1,'rgba(0,212,255,0.3)',1.5); // SNR -10dB reference
    drawCurve(.05,'rgba(251,191,36,0.3)',1.5,[4,4]); // Limit reference
    
    // Draw the constant capacity curve (what we follow)
    ctx.beginPath();ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=2;ctx.setLineDash([2,4]);
    for(let i=10;i<=200;i++){
      const B = (i/200)*maxB;
      const C = targetC; // Constant capacity
      const x = pad.l+(B/maxB)*pW;
      const y = pad.t+pH - (C/maxC)*pH;
      if (y > pad.t && y < pad.t+pH && x > pad.l && x < pad.l+pW) {
        i===10?ctx.moveTo(x,y):ctx.lineTo(x,y);
      }
    }
    ctx.stroke();ctx.setLineDash([]);
    
    // Interpolate current point on constant capacity curve
    const minB = 0.5; // Narrowband B
    const maxB_point = 6.0; // Spread spectrum B
    const currentB = minB + (maxB_point - minB) * shannonSpreadRatio;
    const currentSNR = Math.pow(2, targetC / currentB) - 1;
    const currentSNR_dB = 10 * Math.log10(currentSNR);
    
    const px = pad.l + (currentB / maxB) * pW;
    const py = pad.t + pH - (targetC / maxC) * pH;

    // Draw traveling dot & trail
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI*2);
    
    // Color transitions from Red (Narrowband) to Cyan (Spread)
    const r_col = Math.round(244 * (1 - shannonSpreadRatio) + 0 * shannonSpreadRatio);
    const g_col = Math.round(63 * (1 - shannonSpreadRatio) + 212 * shannonSpreadRatio);
    const b_col = Math.round(94 * (1 - shannonSpreadRatio) + 255 * shannonSpreadRatio);
    const pointColor = `rgb(${r_col},${g_col},${b_col})`;
    
    ctx.fillStyle = pointColor;
    ctx.shadowColor = pointColor;
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Data label floating next to point
    ctx.fillStyle = pointColor;
    ctx.font = 'bold 10px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText(`B=${currentB.toFixed(1)}MHz`, px + 10, py - 8);
    ctx.fillText(`SNR=${currentSNR_dB.toFixed(1)}dB`, px + 10, py + 4);
    if (currentSNR_dB < 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'italic 9px Inter';
      ctx.fillText(`(Bajo piso de ruido)`, px + 10, py + 16);
    }

    function marker(B,snr,col){
      const C=B*Math.log2(1+snr),x=pad.l+(B/maxB)*pW,y=pad.t+pH-Math.min(C/maxC,1)*pH;
      ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
      ctx.strokeStyle='rgba(5,12,24,.8)';ctx.lineWidth=1;ctx.stroke();
    }
    marker(minB,Math.pow(10,3),'rgba(244,63,94,0.5)'); // Narrowband reference
    marker(maxB_point,0.1,'rgba(0,212,255,0.5)'); // SS reference
    
    ctx.font='9px JetBrains Mono';ctx.textAlign='left';
    [['#f43f5e','Banda Estrecha (SNR alto)'],['#00d4ff','Espectro Ensanchado (SNR < 0dB)'],['rgba(255,255,255,0.5)','Capacidad Constante C=5Mbps']].forEach(([col,lbl],i)=>{
      ctx.fillStyle=col;
      if (i === 2) {
        ctx.setLineDash([2,2]);
        ctx.beginPath(); ctx.moveTo(pad.l+4, pad.t+10+i*16 - 3); ctx.lineTo(pad.l+20, pad.t+10+i*16 - 3); ctx.strokeStyle=col; ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillRect(pad.l+4,pad.t+4+i*16,16,3);
      }
      ctx.fillStyle='rgba(176,208,232,.7)';ctx.fillText(lbl,pad.l+26,pad.t+10+i*16);
    });

    t++;
    rafMap[3] = requestAnimationFrame(draw);
  }
  
  // Force reset DOM element styles on init
  if (varB) {
    varB.style.transform = 'scale(1)';
    varB.style.textShadow = 'none';
  }
  if (varSN) {
    varSN.style.transform = 'scale(1)';
    varSN.style.opacity = '1';
  }
  if (valLbl) valLbl.textContent = '0%';
  if (slider) slider.value = 0;
  shannonSpreadRatio = 0;
  
  draw();
}

// ════════════════════════════════════════
// S4 · TAXONOMY TREE (ENHANCED)
// ════════════════════════════════════════
let taxoHoverNodes = []; // Array of active node indices
let taxoTTActiveNode = -1;

function animTaxo() {
  const r = setupCanvas(document.getElementById('taxoCanvas'));
  if (!r) return;
  const {ctx,W,H} = r;
  ctx.clearRect(0,0,W,H);
  
  const nodes=[
    {label:'Espectro\nEnsanchado',x:W*.12,y:H*.5,col:'#00d4ff',fw:700,fs:11}, // 0
    {label:'FHSS',x:W*.38,y:H*.18,col:'#3d85ff',fw:700,fs:12}, // 1
    {label:'DSSS',x:W*.38,y:H*.42,col:'#7c3aed',fw:700,fs:12}, // 2
    {label:'CSS\n(Chirp)',x:W*.38,y:H*.65,col:'#00c896',fw:700,fs:11}, // 3
    {label:'FH/DS\nHíbrido',x:W*.38,y:H*.87,col:'#f59e0b',fw:700,fs:11}, // 4
    {label:'Bluetooth\n79ch·1600h/s',x:W*.7,y:H*.1,col:'#3d85ff',fw:500,fs:9.5, leaf:'fhss'}, // 5
    {label:'HAVE QUICK\nSINCGARS',x:W*.7,y:H*.27,col:'#3d85ff',fw:500,fs:9.5, leaf:'fhss'}, // 6
    {label:'IEEE 802.11b\nBarker-11',x:W*.7,y:H*.36,col:'#7c3aed',fw:500,fs:9.5, leaf:'dsss'}, // 7
    {label:'GPS·CDMA\nW-CDMA',x:W*.7,y:H*.52,col:'#7c3aed',fw:500,fs:9.5, leaf:'dsss'}, // 8
    {label:'LoRa/LPWAN\nIoT UL',x:W*.7,y:H*.65,col:'#00c896',fw:500,fs:9.5, leaf:'css'}, // 9
    {label:'Sistemas\nMilitares',x:W*.7,y:H*.87,col:'#f59e0b',fw:500,fs:9.5, leaf:'hybrid'}, // 10
  ];
  const edges=[[0,1],[0,2],[0,3],[0,4],[1,5],[1,6],[2,7],[2,8],[3,9],[4,10]];
  
  // Calculate bezier points for all edges
  edges.forEach(e => {
    const na = nodes[e[0]], nb = nodes[e[1]];
    const mx = (na.x + nb.x) / 2;
    e.path = { x0: na.x, y0: na.y, cx: mx, y1: nb.y, x1: nb.x };
    e.packets = Array.from({length: 2 + Math.floor(Math.random()*2)}, () => ({
      p: Math.random(),
      s: 0.005 + Math.random() * 0.005
    }));
  });

  // Setup UI Integration
  initTaxoUI(nodes, r.cv);

  let t = 0;
  function draw() {
    if (!document.getElementById('s4').classList.contains('active')) return;
    ctx.clearRect(0,0,W,H);
    ctx.font='11px JetBrains Mono';

    // Global draw progress (0 to 1 over first 2 secs)
    const drawProg = Math.min(t / 120, 1.0);

    // Draw Edges
    edges.forEach((e, idx) => {
      const {x0, y0, cx, y1, x1} = e.path;
      const col = nodes[e[1]].col;
      
      // Delay edge drawing based on depth (edges from root draw first)
      const isRootEdge = e[0] === 0;
      const edgeProgStart = isRootEdge ? 0 : 0.4;
      const edgeProgEnd = isRootEdge ? 0.6 : 1.0;
      const edgeP = Math.max(0, Math.min(1, (drawProg - edgeProgStart) / (edgeProgEnd - edgeProgStart)));
      
      if (edgeP > 0) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        // We draw partial bezier by interpolating (simplified for visual effect)
        // A true partial bezier requires splitting the curve, but we can fake it by drawing a line to the interpolated point if needed. 
        // For simplicity and performance, we'll draw the full curve and use a clipping region or just rely on opacity fade-in for the "drawing" effect.
        // Let's use opacity for the drawing effect.
        ctx.bezierCurveTo(cx, y0, cx, y1, x1, y1);
        ctx.strokeStyle = `rgba(${hexToRgb(col)},${0.22 * edgeP})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4,5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw packets if edge is fully drawn
        if (edgeP === 1) {
          e.packets.forEach(pkt => {
            pkt.p += pkt.s;
            if (pkt.p > 1) pkt.p = 0;
            
            // Bezier interpolation
            const tP = pkt.p;
            const omt = 1 - tP;
            // P(t) = (1-t)^3 P0 + 3(1-t)^2 t P1 + 3(1-t) t^2 P2 + t^3 P3
            // P0=(x0,y0), P1=(cx,y0), P2=(cx,y1), P3=(x1,y1)
            const px = omt*omt*omt*x0 + 3*omt*omt*tP*cx + 3*omt*tP*tP*cx + tP*tP*tP*x1;
            const py = omt*omt*omt*y0 + 3*omt*omt*tP*y0 + 3*omt*tP*tP*y1 + tP*tP*tP*y1;
            
            // Highlight packet if its source or target is active
            const isActive = taxoHoverNodes.includes(e[0]) || taxoHoverNodes.includes(e[1]);
            const alpha = isActive ? 0.9 : 0.3;
            const size = isActive ? 2 : 1.5;
            
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI*2);
            ctx.fillStyle = `rgba(${hexToRgb(col)},${alpha})`;
            if (isActive) {
              ctx.shadowColor = col;
              ctx.shadowBlur = 8;
            }
            ctx.fill();
            ctx.shadowBlur = 0;
          });
        }
      }
    });

    // Draw Nodes
    nodes.forEach((n, i) => {
      // Node reveal animation
      const nodeStart = (n.x / W) * 0.6; // Left nodes appear first
      const nodeP = Math.max(0, Math.min(1, (drawProg - nodeStart) / 0.4));
      
      if (nodeP > 0) {
        ctx.save();
        const isActive = taxoHoverNodes.length === 0 || taxoHoverNodes.includes(i);
        ctx.globalAlpha = isActive ? nodeP : nodeP * 0.3;
        
        const lines = n.label.split('\n');
        ctx.font = `${n.fs}px JetBrains Mono`;
        const tw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 16;
        const th = lines.length * 14 + 10;
        const rx = n.x - tw/2, ry = n.y - th/2;
        
        ctx.fillStyle = `rgba(${hexToRgb(n.col)},${taxoHoverNodes.includes(i) ? 0.25 : 0.1})`;
        ctx.strokeStyle = `rgba(${hexToRgb(n.col)},${taxoHoverNodes.includes(i) ? 0.9 : 0.5})`;
        ctx.lineWidth = taxoHoverNodes.includes(i) ? 2 : 1.5;
        
        if (taxoHoverNodes.includes(i)) {
          ctx.shadowColor = n.col;
          ctx.shadowBlur = 15;
        }
        
        ctx.beginPath();
        ctx.roundRect(rx, ry, tw, th, 6);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = n.col;
        ctx.font = `${n.fw} ${n.fs}px JetBrains Mono`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        lines.forEach((l, idx) => {
          ctx.fillText(l, n.x, n.y - (lines.length-1)*7 + idx*14);
        });
        
        // Leaf node tooltip indicator (small dot)
        if (n.leaf && taxoHoverNodes.length === 0) {
          ctx.beginPath();
          ctx.arc(rx + tw, ry, 3, 0, Math.PI*2);
          ctx.fillStyle = n.col;
          ctx.fill();
        }
        
        // Save bounds for tooltip interaction
        n.bounds = { rx, ry, tw, th };
        ctx.restore();
      }
    });

    // Update tooltip canvas if active
    if (taxoTTActiveNode !== -1) {
      updateTaxoTooltip(t, nodes[taxoTTActiveNode]);
    }

    t++;
    rafMap[4] = requestAnimationFrame(draw);
  }
  draw();
}

function initTaxoUI(nodes, canvas) {
  // Left Properties Hover Sync
  const props = document.querySelectorAll('#taxoProps .prop-row');
  const propList = document.getElementById('taxoProps');
  
  props.forEach(prop => {
    if (prop._taxoHoverBound) return;
    prop._taxoHoverBound = true;
    
    prop.addEventListener('mouseenter', () => {
      if (prop.dataset.taxoHover) {
        taxoHoverNodes = prop.dataset.taxoHover.split(',').map(Number);
      }
      propList.classList.add('has-hover');
      props.forEach(p => p.classList.remove('node-active'));
      prop.classList.add('node-active');
    });
    
    prop.addEventListener('mouseleave', () => {
      taxoHoverNodes = [];
      propList.classList.remove('has-hover');
      prop.classList.remove('node-active');
    });
  });

  // Canvas Hover for Tooltips
  const tt = document.getElementById('taxoTooltip');
  const ttTitle = document.getElementById('ttTitle');
  
  if (canvas && !canvas._ttBound) {
    canvas._ttBound = true;
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      
      let hoveredNode = -1;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.leaf && n.bounds && x >= n.bounds.rx && x <= n.bounds.rx + n.bounds.tw &&
            y >= n.bounds.ry && y <= n.bounds.ry + n.bounds.th) {
          hoveredNode = i;
          break;
        }
      }
      
      if (hoveredNode !== -1 && hoveredNode !== taxoTTActiveNode) {
        taxoTTActiveNode = hoveredNode;
        tt.classList.add('active');
        ttTitle.textContent = nodes[hoveredNode].label.replace('\n', ' · ');
        
        // Position tooltip relative to node
        const n = nodes[hoveredNode];
        const cssX = (n.x / canvas.width) * rect.width;
        const cssY = ((n.bounds.ry - 20) / canvas.height) * rect.height;
        tt.style.left = `${cssX}px`;
        tt.style.top = `${cssY}px`;
      } else if (hoveredNode === -1 && taxoTTActiveNode !== -1) {
        taxoTTActiveNode = -1;
        tt.classList.remove('active');
      }
    });
    
    canvas.addEventListener('mouseleave', () => {
      taxoTTActiveNode = -1;
      tt.classList.remove('active');
    });
  }
}

function updateTaxoTooltip(t, node) {
  const cv = document.getElementById('ttCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  ctx.clearRect(0,0,W,H);
  
  ctx.strokeStyle = node.col;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  
  if (node.leaf === 'fhss') {
    // Frequency hopping: jumping flat lines
    const step = W / 8;
    for (let i = 0; i < 8; i++) {
      const y = H*0.2 + ((Math.sin(i*7.3 + Math.floor(t/15)*2.1) + 1)/2) * H*0.6;
      ctx.moveTo(i*step, y);
      ctx.lineTo((i+1)*step - 2, y);
    }
  } else if (node.leaf === 'dsss') {
    // Direct sequence: dense square wave
    const chips = 24;
    const step = W / chips;
    ctx.moveTo(0, H/2);
    for (let i = 0; i < chips; i++) {
      const val = (Math.sin(i*11.4 + Math.floor(t/4)) > 0) ? H*0.2 : H*0.8;
      ctx.lineTo(i*step, val);
      ctx.lineTo((i+1)*step, val);
    }
  } else if (node.leaf === 'css') {
    // Chirp: expanding/compressing sine wave
    for (let x = 0; x < W; x+=2) {
      // Frequency increases with x (up-chirp)
      const freq = 0.05 + (x/W) * 0.3;
      const y = H/2 + Math.sin(x*freq - t*0.2) * H*0.35;
      x===0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

// ════════════════════════════════════════
// S5 · PSD COMPARISON (ANIMATED & MORPHING)
// ════════════════════════════════════════
function animPSD() {
  const cv = document.getElementById('psdCanvas');
  if (!cv) return;
  const parent = cv.parentElement;
  cv.width = parent.offsetWidth;
  cv.height = parent.offsetHeight;
  const ctx = cv.getContext('2d');
  
  let t = 0;
  let morphP = 0; // 0 to 1
  let isMorphing = false;
  
  // Initialize click listener once
  if (!cv._clickBound) {
    cv.addEventListener('click', () => { 
      if(morphP === 0) isMorphing = true; 
    });
    cv._clickBound = true;
  }
  // Reset state on re-entry
  morphP = 0;
  isMorphing = false;
  
  function draw() {
    if(!document.getElementById('s5').classList.contains('active')) return;
    const W = cv.width, H = cv.height;
    ctx.clearRect(0,0,W,H);
    
    if (isMorphing) {
      morphP += 0.012; // animation speed
      if (morphP > 1) {
        morphP = 1;
        isMorphing = false;
      }
    }
    
    // Easing function for smooth morph
    const easeP = morphP < .5 ? 2 * morphP * morphP : -1 + (4 - 2 * morphP) * morphP;
    
    const pad = {t:36, b:40, l:45, r:20};
    const axY = H - pad.b;
    const plotH = axY - pad.t;
    const noiseY = axY - plotH * 0.3; // N0 line
    
    // Background Split
    const split = W/2;
    ctx.fillStyle = 'rgba(5,12,24,.55)'; 
    ctx.fillRect(0,0,W,H); 
    
    if (easeP > 0) {
      ctx.fillStyle = `rgba(5,12,24,${0.38 * easeP})`; 
      ctx.fillRect(split, 0, W-split, H);
      
      ctx.strokeStyle = `rgba(255,255,255,${0.07 * easeP})`; 
      ctx.lineWidth = 1; ctx.setLineDash([6,4]);
      ctx.beginPath(); ctx.moveTo(split, 8); ctx.lineTo(split, H-8); ctx.stroke(); ctx.setLineDash([]);
    }
    
    // Dynamic positions
    const fc1 = W/2 - (W/4) * easeP;
    const fc2 = W/2 + (W/4) * easeP;
    
    // Titles
    ctx.font = 'bold 10px JetBrains Mono'; ctx.textAlign = 'center';
    
    ctx.fillStyle = 'rgba(244,63,94,.8)'; 
    if (easeP < 0.05) {
      ctx.fillText('ESPECTRO DE POTENCIA (Clic para expandir espectro)', fc1, 22);
    } else {
      ctx.fillText('BANDA ESTRECHA', fc1, 22);
    }
    
    if (easeP > 0) {
      ctx.fillStyle = `rgba(0,212,255,${0.8 * easeP})`; 
      ctx.fillText('ESPECTRO ENSANCHADO', fc2, 22);
    }
    
    // Axes and Noise Line
    ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, axY); ctx.lineTo(W-pad.r, axY); ctx.stroke();
    
    ctx.save(); ctx.translate(14, pad.t + plotH/2); ctx.rotate(-Math.PI/2);
    ctx.font = '8px JetBrains Mono'; ctx.fillStyle = 'rgba(122,156,184,.45)'; ctx.textAlign = 'center'; 
    ctx.fillText('PSD [dBm/Hz]', 0, 0); ctx.restore();
    
    ctx.fillStyle = 'rgba(122,156,184,.45)'; ctx.font = '8px JetBrains Mono'; ctx.textAlign = 'center'; 
    ctx.fillText('Frecuencia →', W/2, H-6);
    
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(pad.l, noiseY); ctx.lineTo(W-pad.r, noiseY); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.font = '7px JetBrains Mono'; ctx.textAlign = 'left';
    ctx.fillText('N₀ ≈ −174 dBm/Hz', pad.l+2, noiseY-3);
    
    // Draw Left Curve (Narrowband)
    const peak = plotH * 0.85;
    const pulse = 1 + Math.sin(t*0.05)*0.025;
    const nbWidth = W * 0.04; 
    
    ctx.beginPath(); ctx.strokeStyle = `rgba(244,63,94,${pulse})`; ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(244,63,94,.7)'; ctx.shadowBlur = 14;
    for(let i=-100; i<=100; i++){
      const xi = fc1 + (i/100) * nbWidth;
      const s = i===0 ? 1 : Math.sin(Math.PI*i/30)/(Math.PI*i/30);
      const yi = axY - Math.max(0, s*s*peak*pulse);
      i===-100 ? ctx.moveTo(xi,yi) : ctx.lineTo(xi,yi);
    }
    ctx.stroke(); ctx.shadowBlur = 0;
    
    // Draw Right Curve (Morphing)
    if (easeP > 0) {
      const rCol = Math.round(244 * (1-easeP) + 0 * easeP);
      const gCol = Math.round(63 * (1-easeP) + 212 * easeP);
      const bCol = Math.round(94 * (1-easeP) + 255 * easeP);
      const color = `rgba(${rCol},${gCol},${bCol},0.8)`;
      const shadow = `rgba(${rCol},${gCol},${bCol},0.4)`;
      
      // Amplitude: from `peak` down to below noise level (e.g. plotH * 0.15)
      const ssHeightTarget = plotH * 0.15;
      const currentHeight = peak * (1-easeP) + ssHeightTarget * easeP;
      
      // Width: from `nbWidth` up to `W * 0.35`
      const targetWidth = W * 0.35;
      const currentWidth = nbWidth * (1-easeP) + targetWidth * easeP;
      
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.shadowColor = shadow; ctx.shadowBlur = 8;
      
      for(let i=-100; i<=100; i++){
        const xi = fc2 + (i/100) * currentWidth;
        const s = i===0 ? 1 : Math.sin(Math.PI*i/30)/(Math.PI*i/30);
        let yi = axY - Math.max(0, s*s*currentHeight);
        
        // Add spread spectrum noise jitter proportional to easeP
        if (easeP > 0.1 && Math.abs(i) < 95) {
          const jitter = (Math.sin(xi*0.5 + t*0.04)*2 + Math.sin(xi*1.2 + t*0.06)*1.5) * easeP;
          yi += jitter;
        }
        
        i===-100 ? ctx.moveTo(xi,yi) : ctx.lineTo(xi,yi);
      }
      ctx.stroke(); ctx.shadowBlur = 0;
      
      // Labels for Right Side
      if (easeP > 0.8) {
        ctx.fillStyle = `rgba(0,212,255,${easeP})`; ctx.font = '8px JetBrains Mono'; ctx.textAlign = 'center';
        ctx.fillText('B_ss >> B_info', fc2, axY - ssHeightTarget - 12);
        ctx.fillStyle = `rgba(0,212,255,${easeP * 0.8})`; ctx.font = 'bold 9px Inter';
        ctx.fillText('PSD < N₀ · LPI', fc2, axY - ssHeightTarget - 24);
      }
    }
    
    // Labels for Left Side
    if (easeP > 0.8) {
      ctx.fillStyle = 'rgba(244,63,94,.7)'; ctx.font = 'bold 9px Inter'; ctx.textAlign = 'center';
      ctx.fillText('PSD alta · detectable', fc1, axY - peak - 8);
    }
    
    // --- Radar Sweep Simulator ---
    const radarSpeed = 3.5;
    const radarX = pad.l + ((t * radarSpeed) % (W - pad.l));
    
    // Draw radar line
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0,255,100,0.4)';
    ctx.lineWidth = 1.5;
    ctx.moveTo(radarX, pad.t);
    ctx.lineTo(radarX, axY);
    ctx.stroke();
    
    // Radar glow
    const grad = ctx.createLinearGradient(radarX-20, 0, radarX, 0);
    grad.addColorStop(0, 'rgba(0,255,100,0)');
    grad.addColorStop(1, 'rgba(0,255,100,0.15)');
    ctx.fillStyle = grad;
    ctx.fillRect(radarX-20, pad.t, 20, plotH);
    
    // Radar Collision Detection
    const nbHit = Math.abs(radarX - fc1) < (nbWidth * 0.7);
    const targetWidth = W * 0.35;
    const ssHit = easeP > 0.9 && Math.abs(radarX - fc2) < (targetWidth * 0.4);
    
    if (nbHit) {
      ctx.fillStyle = 'rgba(244,63,94,0.95)';
      ctx.font = 'bold 11px JetBrains Mono';
      ctx.textAlign = 'left';
      ctx.shadowColor = '#f43f5e'; ctx.shadowBlur = 10;
      ctx.fillText('⚠ SEÑAL DETECTADA', radarX + 8, axY - peak*0.6);
      ctx.shadowBlur = 0;
      
      ctx.strokeStyle = 'rgba(244,63,94,0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(fc1 - nbWidth*0.8, axY - peak*1.05, nbWidth*1.6, peak*1.1);
    } else if (ssHit) {
      ctx.fillStyle = 'rgba(0,255,100,0.85)';
      ctx.font = 'bold 10px JetBrains Mono';
      ctx.textAlign = 'left';
      ctx.shadowColor = '#00ff64'; ctx.shadowBlur = 8;
      ctx.fillText('✓ RUIDO DE FONDO', radarX + 8, axY - plotH*0.4);
      ctx.fillText('  NADA DETECTADO', radarX + 8, axY - plotH*0.4 + 14);
      ctx.shadowBlur = 0;
    }

    t++;
    rafMap[5] = requestAnimationFrame(draw);
  }
  
  draw();
}

// ════════════════════════════════════════
// S6 · FHSS BLOCK DIAGRAM (ENHANCED)
// ════════════════════════════════════════
let fhssHoverState = null; // 'formula', 'bluetooth', or null

function animFHSSBlock() {
  const r = setupCanvas(document.getElementById('fhssBlockCanvas'));
  if (!r) return;
  const {ctx,W,H} = r;
  
  // Setup UI Hooks
  const rows = document.querySelectorAll('#fhssSpecList .sl-row[data-fhss-hover]');
  const spanFc = document.getElementById('fhss-fc');
  const spanCk = document.getElementById('fhss-ck');
  
  rows.forEach(row => {
    if (row._fhssBound) return;
    row._fhssBound = true;
    row.addEventListener('mouseenter', () => { fhssHoverState = row.dataset.fhssHover; });
    row.addEventListener('mouseleave', () => { fhssHoverState = null; });
  });

  const blocks=[
    {id:'src', x:.07,y:.22,w:.12,h:.13,label:'Fuente\nDatos',col:'#3d85ff'},
    {id:'mod', x:.22,y:.22,w:.13,h:.13,label:'Modulador\nDatos',col:'#3d85ff'},
    {id:'mix_tx', x:.38,y:.22,w:.11,h:.13,label:'Mezclador\nTX',col:'#00d4ff'},
    {id:'amp', x:.52,y:.22,w:.11,h:.13,label:'Amp RF\nTX',col:'#3d85ff'},
    {id:'ant_tx', x:.66,y:.22,w:.1,h:.13,label:'Antena\nTX',col:'#00c896'},
    {id:'pn', x:.38,y:.55,w:.14,h:.13,label:'Gen. PN\nLFSR',col:'#7c3aed'},
    {id:'ant_rx', x:.66,y:.76,w:.1,h:.13,label:'Antena\nRX',col:'#00c896'},
    {id:'mix_rx', x:.52,y:.76,w:.11,h:.13,label:'Mezclador\nRX',col:'#00d4ff'},
    {id:'bpf', x:.38,y:.76,w:.11,h:.13,label:'BPF\nDemod',col:'#3d85ff'},
    {id:'dst', x:.22,y:.76,w:.13,h:.13,label:'Datos\nRX',col:'#00c896'},
  ];

  // Particle paths definitions
  const mcy = H*.285;
  const rcy = H*.825;
  const paths = [
    // Baseband data TX (Blue)
    { p: [[W*.19,mcy], [W*.22,mcy]], type: 'base' },
    { p: [[W*.35,mcy], [W*.38,mcy]], type: 'base' },
    // Carrier TX (Dynamic Color)
    { p: [[W*.49,mcy], [W*.52,mcy]], type: 'carrier' },
    { p: [[W*.63,mcy], [W*.66,mcy]], type: 'carrier' },
    // Wireless channel (Dynamic Color)
    { p: [[W*.71,mcy+H*.065], [W*.71,rcy-H*.065]], type: 'carrier' },
    // Carrier RX (Dynamic Color)
    { p: [[W*.66,rcy], [W*.63,rcy]], type: 'carrier' },
    { p: [[W*.52,rcy], [W*.49,rcy]], type: 'carrier' },
    // Baseband data RX (Blue)
    { p: [[W*.38,rcy], [W*.35,rcy]], type: 'base' },
    // PN to Mixers
    { p: [[W*.45,H*.55], [W*.45,H*.40], [W*.435,H*.40], [W*.435,H*.35]], type: 'pn' }, // to TX
    { p: [[W*.45,H*.68], [W*.45,H*.71], [W*.575,H*.71], [W*.575,H*.76]], type: 'pn' }  // to RX
  ];

  // Initialize particles
  const particles = [];
  paths.forEach(path => {
    // 3 particles per path
    for(let i=0; i<3; i++) {
      particles.push({
        path: path,
        progress: Math.random(),
        speed: 0.005 + Math.random() * 0.005
      });
    }
  });

  const arrow2=(x1,y1,x2,y2,col='rgba(255,255,255,.2)')=>{
    ctx.strokeStyle=col;ctx.lineWidth=1.5;ctx.fillStyle=col;
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    const dx=x2-x1,dy=y2-y1,l=Math.sqrt(dx*dx+dy*dy),ux=dx/l,uy=dy/l,aw=5;
    ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-ux*aw+uy*aw*.4,y2-uy*aw-ux*aw*.4);ctx.lineTo(x2-ux*aw-uy*aw*.4,y2-uy*aw+ux*aw*.4);ctx.closePath();ctx.fill();
  };

  const drawSegmentedArrow = (pts, col='rgba(255,255,255,.2)') => {
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for(let i=1; i<pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    // Arrowhead at last segment
    const x1 = pts[pts.length-2][0], y1 = pts[pts.length-2][1];
    const x2 = pts[pts.length-1][0], y2 = pts[pts.length-1][1];
    const dx=x2-x1,dy=y2-y1,l=Math.sqrt(dx*dx+dy*dy),ux=dx/l,uy=dy/l,aw=5;
    ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-ux*aw+uy*aw*.4,y2-uy*aw-ux*aw*.4);ctx.lineTo(x2-ux*aw-uy*aw*.4,y2-uy*aw+ux*aw*.4);ctx.closePath();ctx.fill();
  };

  const carrierColors = ['#f43f5e', '#3d85ff', '#00c896', '#f59e0b', '#d946ef', '#00d4ff', '#eab308'];
  let currentCode = '0x4F';
  let colorIdx = 1;
  let pnPulse = 0;
  
  let t = 0;
  function draw() {
    if (!document.getElementById('s6').classList.contains('active')) return;
    ctx.clearRect(0,0,W,H);

    // Timing logic (Bluetooth mode = fast, Normal = slow)
    const isBT = fhssHoverState === 'bluetooth';
    const hopInterval = isBT ? 6 : 60; // frames per hop
    
    if (t % hopInterval === 0) {
      // Hop frequency!
      const hex = Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, '0');
      currentCode = `0x${hex}`;
      colorIdx = (colorIdx + 1 + Math.floor(Math.random()*3)) % carrierColors.length;
      pnPulse = 1.0;
    }
    
    if (pnPulse > 0) pnPulse -= 0.05;
    if (pnPulse < 0) pnPulse = 0;

    const curCarrierCol = carrierColors[colorIdx];

    // Update DOM formula
    if (spanCk && spanFc) {
      if (fhssHoverState === 'formula') {
        spanCk.style.color = '#7c3aed';
        spanCk.style.textShadow = '0 0 10px rgba(124,58,237,0.8)';
        spanFc.style.color = curCarrierCol;
        spanFc.style.textShadow = `0 0 10px ${curCarrierCol}`;
      } else {
        spanCk.style.color = '';
        spanCk.style.textShadow = '';
        spanFc.style.color = '';
        spanFc.style.textShadow = '';
      }
    }

    // Channel label
    ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=1;ctx.setLineDash([4,5]);
    ctx.beginPath();ctx.moveTo(W*.61,H*.15);ctx.lineTo(W*.61,H*.95);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(255,255,255,.15)';ctx.font='bold 9px JetBrains Mono';ctx.textAlign='center';ctx.fillText('Canal RF',W*.61,H*.1);
    ctx.fillStyle='rgba(245,158,11,.4)';ctx.font='8px Inter';ctx.fillText('+n(t)',W*.72,H*.49);
    
    // Draw Arrows
    arrow2(W*.19,mcy,W*.22,mcy); arrow2(W*.35,mcy,W*.38,mcy);
    arrow2(W*.49,mcy,W*.52,mcy); arrow2(W*.63,mcy,W*.66,mcy);
    
    // Wireless link
    ctx.strokeStyle = `rgba(${hexToRgb(curCarrierCol)}, 0.3)`; ctx.lineWidth=2; ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(W*.71,mcy+H*.065); ctx.lineTo(W*.71,rcy-H*.065); ctx.stroke(); ctx.setLineDash([]);

    drawSegmentedArrow([[W*.45,H*.55], [W*.45,H*.35]], 'rgba(124,58,237,.5)'); // old pn to mod line if needed, wait, PN goes to synth.
    // In original code: arrow2(W*.45,H*.55,W*.45,H*.35,'rgba(124,58,237,.5)'); This was from PN to something. Let's keep it.
    
    ctx.strokeStyle='rgba(124,58,237,.35)';ctx.lineWidth=1;ctx.setLineDash([3,3]);
    drawSegmentedArrow([[W*.36,H*.615], [W*.435,H*.615], [W*.435,H*.35]], `rgba(124,58,237,${0.35 + pnPulse*0.6})`);
    
    arrow2(W*.66,rcy,W*.63,rcy,'rgba(0,200,150,.4)');
    arrow2(W*.52,rcy,W*.49,rcy,'rgba(0,200,150,.4)');
    arrow2(W*.38,rcy,W*.35,rcy,'rgba(0,200,150,.4)');
    
    ctx.strokeStyle='rgba(124,58,237,.35)';ctx.lineWidth=1;ctx.setLineDash([3,3]);
    drawSegmentedArrow([[W*.36,H*.615], [W*.575,H*.615], [W*.575,H*.76]], `rgba(124,58,237,${0.35 + pnPulse*0.6})`);
    
    // Draw Particles
    particles.forEach(p => {
      p.progress += p.speed * (isBT ? 3 : 1);
      if (p.progress > 1) p.progress = 0;
      
      const pts = p.path.p;
      let px, py;
      
      if (pts.length === 2) {
        px = pts[0][0] + (pts[1][0] - pts[0][0]) * p.progress;
        py = pts[0][1] + (pts[1][1] - pts[0][1]) * p.progress;
      } else {
        // Simple 2-segment path logic
        const len1 = Math.abs(pts[1][1] - pts[0][1]);
        const len2 = Math.abs(pts[2][0] - pts[1][0]);
        const tLen = len1 + len2;
        const pDist = p.progress * tLen;
        if (pDist <= len1) {
          px = pts[0][0];
          py = pts[0][1] + (pts[1][1] - pts[0][1]) * (pDist / len1);
        } else {
          const rem = pDist - len1;
          px = pts[1][0] + (pts[2][0] - pts[1][0]) * (rem / len2);
          py = pts[1][1];
        }
      }
      
      let pCol = '#ffffff';
      if (p.path.type === 'base') pCol = '#3d85ff'; // Data
      if (p.path.type === 'carrier') pCol = curCarrierCol; // RF Modulated
      if (p.path.type === 'pn' || p.path.type === 'synth') pCol = '#7c3aed'; // Control
      
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI*2);
      ctx.fillStyle = pCol;
      ctx.shadowColor = pCol;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw blocks
    blocks.forEach(b => {
      const bx=b.x*W, by=b.y*H, bw=b.w*W, bh=b.h*H;
      
      // Hover highlight logic
      let glow = 0;
      if (fhssHoverState === 'formula' && (b.id === 'pn' || b.id === 'synth')) glow = 1;
      
      ctx.fillStyle = `rgba(${hexToRgb(b.col)},${0.1 + glow*0.15})`;
      ctx.strokeStyle = `rgba(${hexToRgb(b.col)},${0.55 + glow*0.45})`;
      ctx.lineWidth = 1.5;
      
      if (glow > 0 || (b.id === 'synth' && pnPulse > 0)) {
        ctx.shadowColor = b.col;
        ctx.shadowBlur = Math.max(glow*15, pnPulse*15);
      }
      
      ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,6); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      
      const lines = b.label.split('\n');
      ctx.fillStyle = b.col; 
      ctx.font = 'bold 9.5px JetBrains Mono'; 
      ctx.textAlign = 'center'; 
      ctx.textBaseline = 'middle';
      lines.forEach((l,i) => ctx.fillText(l, bx+bw/2, by+bh/2-(lines.length-1)*7+i*14));
      
      // PN Code display
      if (b.id === 'pn') {
        ctx.fillStyle = `rgba(124,58,237, ${0.4 + pnPulse*0.6})`;
        ctx.font = 'bold 8px JetBrains Mono';
        ctx.fillText(`c(k)=${currentCode}`, bx+bw/2, by+bh-8);
      }
    });

    ctx.fillStyle='rgba(255,255,255,.2)';ctx.font='bold 8px JetBrains Mono';ctx.textAlign='left';ctx.textBaseline='alphabetic';
    ctx.fillText('TX →',W*.04,H*.15);ctx.fillText('← RX',W*.04,H*.92);

    t++;
    rafMap[6] = requestAnimationFrame(draw);
  }
  
  // Force reset DOM styles
  if (spanCk && spanFc) {
    spanCk.style.color = ''; spanCk.style.textShadow = '';
    spanFc.style.color = ''; spanFc.style.textShadow = '';
  }
  
  draw();
}

// ════════════════════════════════════════
// S7 · FHSS T-F (animated)
// ════════════════════════════════════════
function animFHSSTF() {
  const cv = document.getElementById('fhssTFCanvas');
  if (!cv) return;
  const parent = cv.parentElement;
  cv.width = parent.offsetWidth;
  cv.height = parent.offsetHeight;
  const ctx = cv.getContext('2d');
  
  const N_CH = 10, N_T = 12, JAMMER_CH = 3;
  // Hops: sequence of channels for each time slot
  // t6 (index 5) falls into JAMMER_CH (3)
  const hops = [7, 2, 5, 0, 9, 3, 6, 1, 8, 4, 7, 2];
  
  let t = 0;
  let jammerState = 0; // 0: Off, 1: Static, 2: Follower
  let jammerAnimT = 0;
  
  // Clean up previous event listeners just in case
  if (!cv._clickBound) {
    cv.addEventListener('click', () => { 
      jammerState = (jammerState + 1) % 3; 
      jammerAnimT = 0; 
    });
    cv._clickBound = true;
  }
  jammerState = 0; // reset on slide load
  
  function draw() {
    if(!document.getElementById('s7').classList.contains('active')) return;
    const W = cv.width, H = cv.height;
    ctx.clearRect(0,0,W,H);
    
    const pad = {t:36, r:14, b:26, l:48};
    const pW = W - pad.l - pad.r, pH = H - pad.t - pad.b;
    const cW = pW / N_T, cH = pH / N_CH;
    
    // Grid Lines
    ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = .5;
    for(let i=0; i<=N_T; i++) { const x = pad.l + i*cW; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t+pH); ctx.stroke(); }
    for(let j=0; j<=N_CH; j++) { const y = pad.t + j*cH; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l+pW, y); ctx.stroke(); }
    
    // Axis Labels
    ctx.fillStyle = 'rgba(122,156,184,.5)'; ctx.font = '8px JetBrains Mono'; ctx.textAlign = 'right';
    for(let j=0; j<N_CH; j++) ctx.fillText(`f${N_CH-1-j}`, pad.l-4, pad.t+(j+.5)*cH+3);
    ctx.textAlign = 'center';
    for(let i=0; i<N_T; i++) ctx.fillText(`t${i+1}`, pad.l+(i+.5)*cW, pad.t+pH+14);
    
    // UI Hint Mode Banner
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = 'bold 9px Inter'; ctx.textAlign = 'right';
    let hint = 'Clic para Activar Jammer Estático';
    if(jammerState===1) hint = 'Clic para Simular Follower Jammer';
    if(jammerState===2) hint = 'Clic para Desactivar Jammers';
    ctx.fillText(hint, W-10, 16);
    
    // Timing and Playhead
    const speed = 0.02; // slots per frame
    const playTime = (t * speed) % N_T;
    const currentSlot = Math.floor(playTime);
    const playX = pad.l + playTime * cW;
    
    // Jammer Animation Time
    if (jammerState > 0) jammerAnimT += 0.05;
    const jPulse = Math.sin(t * 0.2) * 0.2;
    
    // Draw Jammer (Static)
    if (jammerState === 1) {
      const jy = pad.t + (N_CH - 1 - JAMMER_CH) * cH;
      // Glitch expansion
      const expandP = Math.min(1, jammerAnimT * 1.5);
      const wEased = pW * expandP;
      const startX = pad.l + pW/2 - wEased/2;
      
      if (expandP > 0) {
        ctx.fillStyle = `rgba(244,63,94,${0.15 + jPulse*0.05})`; ctx.fillRect(startX, jy, wEased, cH);
        ctx.strokeStyle = `rgba(244,63,94,${0.6 + jPulse})`; ctx.lineWidth = 1; ctx.setLineDash([4,3]);
        ctx.strokeRect(startX, jy, wEased, cH); ctx.setLineDash([]);
        
        ctx.fillStyle = `rgba(244,63,94,${0.8 + jPulse})`; ctx.font = 'bold 8px JetBrains Mono'; ctx.textAlign = 'center'; 
        ctx.fillText('JAMMER BAND (ESTÁTICO)', pad.l+pW/2, jy+cH/2+3);
      }
    }
    
    // Draw Blocks and Trails
    for(let i=0; i<=currentSlot; i++){
      const ch = hops[i];
      const tx2 = pad.l + i*cW;
      const ty2 = pad.t + (N_CH - 1 - ch)*cH;
      
      const isCur = i === currentSlot;
      
      // Collision Logic
      const isJammedStatic = (jammerState === 1 && ch === JAMMER_CH);
      
      // Draw Trail for past blocks
      if (!isCur) {
        const timeSince = playTime - i; 
        const fade = Math.max(0, 1 - timeSince * 0.4); // fade out over 2.5 slots
        if (fade > 0) {
          ctx.fillStyle = isJammedStatic ? `rgba(245,158,11,${fade*0.3})` : `rgba(61,133,255,${fade*0.3})`;
          ctx.beginPath(); ctx.roundRect(tx2+2, ty2+2, cW-4, cH-4, 3); ctx.fill();
        }
      }
      
      // Draw Block
      // Current block draws partially according to playTime remainder
      const blockP = isCur ? (playTime - currentSlot) : 1;
      const drawW = (cW-4) * blockP;
      
      let bx = tx2+2;
      let by = ty2+2;
      
      if (isJammedStatic && blockP > 0) {
        bx += (Math.random()-0.5)*3;
        by += (Math.random()-0.5)*3;
      }
      
      if (drawW > 0) {
        ctx.fillStyle = isJammedStatic ? 'rgba(245,158,11,0.5)' : (isCur ? 'rgba(61,133,255,0.7)' : 'rgba(61,133,255,0.4)');
        ctx.beginPath(); ctx.roundRect(bx, by, drawW, cH-4, 3); ctx.fill();
        
        ctx.strokeStyle = isJammedStatic ? 'rgba(245,158,11,0.9)' : 'rgba(61,133,255,0.9)';
        ctx.lineWidth = isCur ? 2 : 1; 
        ctx.shadowColor = ctx.strokeStyle; 
        ctx.shadowBlur = (isCur || isJammedStatic) ? 10 : 3;
        
        ctx.beginPath(); ctx.roundRect(bx, by, drawW, cH-4, 3); ctx.stroke(); 
        ctx.shadowBlur = 0;
      }
      
      // Draw hop curve connecting them
      if (i < currentSlot && blockP > 0) {
        const nch = hops[i+1];
        const nx2 = tx2 + cW;
        const cy1 = ty2 + cH/2;
        const cy2 = pad.t + (N_CH - 1 - nch)*cH + cH/2;
        
        ctx.beginPath(); ctx.strokeStyle = 'rgba(61,133,255,.25)'; ctx.lineWidth = 1; ctx.setLineDash([2,4]);
        ctx.moveTo(tx2+cW-2, cy1); ctx.bezierCurveTo(nx2+cW*0.4, cy1, nx2, cy2, nx2+2, cy2);
        ctx.stroke(); ctx.setLineDash([]);
      }
    }
    
    // Draw Playhead
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(playX, pad.t); ctx.lineTo(playX, pad.t+pH); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.moveTo(playX-4, pad.t-4); ctx.lineTo(playX+4, pad.t-4); ctx.lineTo(playX, pad.t+2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(playX-4, pad.t+pH+4); ctx.lineTo(playX+4, pad.t+pH+4); ctx.lineTo(playX, pad.t+pH-2); ctx.fill();
    
    // Follower Jammer Mode
    if (jammerState === 2) {
      const followerP = Math.min(1, jammerAnimT * 1.5); 
      
      if (currentSlot > 0) {
        const targetCh = hops[currentSlot - 1]; // Late by 1 slot
        const ty2 = pad.t + (N_CH - 1 - targetCh)*cH;
        
        // Laser effect
        ctx.strokeStyle = `rgba(244,63,94,${0.6 * followerP})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(pad.l, ty2+cH/2); ctx.lineTo(playX, ty2+cH/2); ctx.stroke();
        
        // Laser dot
        ctx.fillStyle = '#f43f5e'; ctx.shadowColor = '#f43f5e'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(playX, ty2+cH/2, 3, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
        
        // Text
        ctx.fillStyle = `rgba(244,63,94,${0.8 * followerP})`; ctx.font = 'bold 8px JetBrains Mono'; ctx.textAlign = 'left';
        ctx.fillText('FOLLOWER JAMMER FALLA (TARDE)', playX + 6, ty2+cH/2+3);
      } else {
        // Scanning
        ctx.fillStyle = `rgba(244,63,94,${0.8 * followerP})`; ctx.font = 'bold 8px JetBrains Mono'; ctx.textAlign = 'left';
        ctx.fillText('FOLLOWER JAMMER: SCANNING...', playX + 6, pad.t+pH/2);
      }
    }
    
    t++;
    rafMap[7] = requestAnimationFrame(draw);
  }
  
  draw();
}

// ════════════════════════════════════════
// S8 · SLOW vs FAST
// ════════════════════════════════════════
let sfhT = 0;
function animSlowFast() {
  const cSlow = setupCanvas(document.getElementById('slowFHCanvas'));
  const cFast = setupCanvas(document.getElementById('fastFHCanvas'));
  if (!cSlow || !cFast) return;
  
  function draw() {
    if(!document.getElementById('s8').classList.contains('active')) return;
    
    drawSFH(cSlow, 'slow', sfhT);
    drawSFH(cFast, 'fast', sfhT);
    
    sfhT++;
    rafMap[8] = requestAnimationFrame(draw);
  }
  
  draw();
}

function drawSFH(cObj, type, t) {
  const {ctx, W, H} = cObj;
  ctx.clearRect(0,0,W,H);
  
  const pad = {t:20, r:10, b:20, l:8};
  const pW = W - pad.l - pad.r, pH = H - pad.t - pad.b;
  
  const nHops = type === 'slow' ? 5 : 3;
  const hpb = type === 'slow' ? 1 : 3;
  const freqs = type === 'slow' ? [.6, .3, .8, .2, .7] : [.5, .3, .7];
  const col = type === 'slow' ? '#3d85ff' : '#00c896';
  const total = type === 'slow' ? nHops : nHops * hpb;
  const slotW = pW / total;
  
  // Axes
  ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad.l, pad.t+pH); ctx.lineTo(pad.l+pW, pad.t+pH); ctx.stroke();
  ctx.fillStyle = 'rgba(122,156,184,.4)'; ctx.font = '7px JetBrains Mono'; ctx.textAlign = 'center'; ctx.fillText('Tiempo →', pad.l+pW/2, H-3);
  
  for(let i=0; i<=total; i++){
    const x = pad.l + i*slotW;
    ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = .5;
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t+pH); ctx.stroke();
  }
  
  if(type === 'slow'){
    freqs.forEach((f, h) => {
      const x = pad.l + h*slotW;
      const bH = pH*.45;
      const y = pad.t + pH - (f * pH*.72 + pH*.15);
      
      // Box
      ctx.fillStyle = `rgba(${hexToRgb(col)},.14)`; ctx.strokeStyle = `rgba(${hexToRgb(col)},.75)`; ctx.lineWidth = 2;
      ctx.fillRect(x+2, y, slotW-4, bH); ctx.strokeRect(x+2, y, slotW-4, bH);
      
      // Label
      ctx.fillStyle = col; ctx.font = '8px JetBrains Mono'; ctx.textAlign = 'center'; 
      ctx.fillText(`f${h+1}`, x+slotW/2, y+bH/2+14);
      
      // Animation: Burst of binary data moving right
      ctx.save();
      ctx.beginPath();
      ctx.rect(x+2, y, slotW-4, bH);
      ctx.clip();
      
      ctx.fillStyle = `rgba(255,255,255,0.7)`;
      ctx.font = 'bold 9px JetBrains Mono';
      ctx.textAlign = 'left';
      const str = "01011001011001";
      // Each block has slightly desynced shift for organic feel
      const shift = ((t * 1.5 + h*15) % 60);
      ctx.fillText(str, x + 4 - shift + 15, y + bH/2 + 3); 
      ctx.restore();
    });
  } else {
    // Current sub-slot across all time
    const currentSi = Math.floor(t * 0.08) % (nHops * hpb);
    
    for(let h=0; h<nHops; h++) {
      const bx = pad.l + (h*hpb)*slotW;
      
      // Large Background bit number
      ctx.fillStyle = `rgba(255,255,255,0.06)`;
      ctx.font = 'bold 54px Inter';
      ctx.textAlign = 'center';
      const bitVal = h % 2 === 0 ? "1" : "0";
      ctx.fillText(bitVal, bx + slotW*hpb/2, pad.t + pH*0.7);
      
      // Bit dividers
      ctx.strokeStyle = 'rgba(245,158,11,.4)'; ctx.lineWidth = 1.5; ctx.setLineDash([3,2]);
      ctx.beginPath(); ctx.moveTo(bx, pad.t); ctx.lineTo(bx, pad.t+pH); ctx.stroke(); ctx.setLineDash([]);
      
      // Bit label
      ctx.fillStyle = 'rgba(245,158,11,.6)'; ctx.font = 'bold 8px JetBrains Mono'; ctx.textAlign = 'center';
      ctx.fillText(`b${h+1}`, bx + slotW*hpb/2, pad.t + pH + 10);
      
      for(let hop=0; hop<hpb; hop++) {
        const f = freqs[(h+hop)%freqs.length];
        const si = h*hpb + hop;
        const x = pad.l + si*slotW;
        const bH = pH*.45;
        const y = pad.t + pH - (f * pH*.72 + pH*.15);
        
        let glow = 0;
        if (si === currentSi) glow = 1;
        
        ctx.fillStyle = `rgba(${hexToRgb(col)},${0.14 + glow*0.5})`;
        ctx.strokeStyle = `rgba(${hexToRgb(col)},${0.75 + glow*0.25})`;
        ctx.lineWidth = 1.5;
        if (glow > 0) {
          ctx.shadowColor = col; ctx.shadowBlur = 12;
        }
        ctx.fillRect(x+1, y, slotW-2, bH); 
        ctx.strokeRect(x+1, y, slotW-2, bH);
        ctx.shadowBlur = 0;
      }
    }
    // Last divider
    const bxEnd = pad.l + (nHops*hpb)*slotW;
    ctx.strokeStyle = 'rgba(245,158,11,.4)'; ctx.lineWidth = 1.5; ctx.setLineDash([3,2]);
    ctx.beginPath(); ctx.moveTo(bxEnd, pad.t); ctx.lineTo(bxEnd, pad.t+pH); ctx.stroke(); ctx.setLineDash([]);
  }
  
  ctx.fillStyle = col; ctx.font = 'bold 9px JetBrains Mono'; ctx.textAlign = 'left';
  ctx.fillText(type === 'slow' ? '1 salto transporta N bits' : `1 bit fragmentado en ${hpb} saltos`, pad.l+4, pad.t+10);
}

// ════════════════════════════════════════
// S9 · DSSS WAVEFORM
// ════════════════════════════════════════
function animDSSS(){
  const cv=document.getElementById('dsssCanvas');
  if(!cv)return;
  const parent=cv.parentElement;
  cv.width=parent.offsetWidth;cv.height=parent.offsetHeight;
  const ctx=cv.getContext('2d');
  
  const barker=[1,1,1,-1,-1,-1,1,-1,-1,1,-1];
  const data=[1,1,-1,1,-1,-1];
  const cc=barker.length*data.length;
  
  const xorBlock = document.querySelector('#s9 .eq-op'); // first .eq-op is "× XOR"
  if (xorBlock) xorBlock.style.transition = 'all 0.1s ease-out';
  
  let t=0;
  function draw(){
    if(!document.getElementById('s9').classList.contains('active'))return;
    const W=cv.width,H=cv.height;
    ctx.clearRect(0,0,W,H);
    const rows=3,rowH=H/rows;
    const pad={l:12,r:8};
    const pW=W-pad.l-pad.r;
    
    const chipW=pW/cc,bitW=pW/data.length;
    
    // Scanner logic
    const scanSpeed = 0.0035;
    // scanP goes from 0 to 1.3 (1.0 to 1.3 is a pause at the end)
    const scanP = (t * scanSpeed) % 1.3;
    const scanX = pad.l + Math.min(1, scanP) * pW;
    
    // Determine current values for the scanner label
    let currentD = 1;
    let currentC = 1;
    if (scanP <= 1) {
      const bitIndex = Math.min(data.length - 1, Math.floor((scanX - pad.l) / bitW));
      const chipIndex = Math.min(cc - 1, Math.floor((scanX - pad.l) / chipW));
      currentD = data[bitIndex];
      currentC = barker[chipIndex % barker.length];
    }
    
    const labels=['d(t) · Señal de Datos','c(t) · Código PN (Barker-11)','s(t) = d(t) ⊕ c(t) · DSSS Ensanchado'];
    const colors=['#3d85ff','#7c3aed','#00d4ff'];
    
    // Grid and Labels (Draw full)
    for(let row=0; row<rows; row++){
      const ry=row*rowH,midY=ry+rowH/2;
      ctx.fillStyle=colors[row];ctx.font='bold 12px JetBrains Mono';ctx.textAlign='left';ctx.textBaseline='top';
      ctx.fillText(labels[row],pad.l,ry+8);
      
      ctx.strokeStyle='rgba(255,255,255,.04)';ctx.lineWidth=.5;
      ctx.beginPath();ctx.moveTo(pad.l,midY);ctx.lineTo(pad.l+pW,midY);ctx.stroke();
      if(row<rows-1){ctx.strokeStyle='rgba(255,255,255,.05)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,ry+rowH);ctx.lineTo(W,ry+rowH);ctx.stroke();}
    }
    
    // BW labels
    ctx.textBaseline='alphabetic';
    const bwL=['B_info (estrecha)','B_chip = R_c','B_ss = N·B_info'];
    for(let i=0;i<3;i++){
      ctx.fillStyle=`rgba(${hexToRgb(colors[i])},.5)`;ctx.font='10px JetBrains Mono';ctx.textAlign='right';
      ctx.fillText(bwL[i],W-6,(i+.5)*H/3+3);
    }
    
    // Draw Waves (Clipped to scanner)
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, 0, scanX - pad.l, H);
    ctx.clip();
    
    for(let row=0; row<rows; row++){
      const ry=row*rowH, midY=ry+rowH/2, amp=rowH/2-14;
      
      ctx.beginPath();ctx.strokeStyle=colors[row];ctx.lineWidth=2;ctx.shadowColor=colors[row];ctx.shadowBlur=5;
      if(row===0){
        data.forEach((b,i)=>{
          const x1=pad.l+i*bitW,x2=x1+bitW,y=midY-b*amp;
          const yP=i>0?midY-data[i-1]*amp:y;
          i===0?ctx.moveTo(x1,y):(ctx.lineTo(x1,yP),ctx.lineTo(x1,y));
          ctx.lineTo(x2,y);
        });
      } else if(row===1){
        for(let i=0;i<cc;i++){
          const c=barker[i%barker.length];
          const x1=pad.l+i*chipW,x2=x1+chipW,y=midY-c*amp;
          const yP=i>0?midY-barker[(i-1)%barker.length]*amp:y;
          i===0?ctx.moveTo(x1,y):(ctx.lineTo(x1,yP),ctx.lineTo(x1,y));
          ctx.lineTo(x2,y);
        }
      } else {
        for(let i=0;i<cc;i++){
          const di=Math.floor(i/barker.length);
          const sp = data[di%data.length] * barker[i%barker.length];
          const x1=pad.l+i*chipW, x2=x1+chipW, y=midY-sp*amp;
          
          const pi=i-1, pdi=Math.floor(pi/barker.length);
          const ps=pi<0?sp:data[pdi%data.length]*barker[pi%barker.length];
          const yP=i>0?midY-ps*amp:y;
          
          i===0?ctx.moveTo(x1,y):(ctx.lineTo(x1,yP),ctx.lineTo(x1,y));
          ctx.lineTo(x2,y);
        }
      }
      ctx.stroke();ctx.shadowBlur=0;
    }
    ctx.restore();
    
    // Draw Scanner Line and Logic Floating Text
    if (scanP <= 1) {
      // Scanner Laser
      ctx.strokeStyle = 'rgba(0,255,200,0.8)'; ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00ffc8'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(scanX, 0); ctx.lineTo(scanX, H); ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Values mapping logic (-1 = logic 1, +1 = logic 0)
      const dBit = currentD === -1 ? 1 : 0;
      const cBit = currentC === -1 ? 1 : 0;
      const sBit = dBit ^ cBit; // XOR
      
      // Floating label
      const floatY = 2 * rowH + rowH/2 - (currentD * currentC * (rowH/2-14));
      const tx = (scanX > W - 110) ? scanX - 8 : scanX + 8;
      const align = (scanX > W - 110) ? 'right' : 'left';
      
      ctx.fillStyle = 'rgba(0,212,255,1)';
      ctx.font = 'bold 15px JetBrains Mono';
      ctx.textAlign = align;
      ctx.shadowColor = 'rgba(0,212,255,0.8)'; ctx.shadowBlur = 8;
      
      ctx.fillText(`${dBit} ⊕ ${cBit} = ${sBit}`, tx, floatY - 8);
      ctx.shadowBlur = 0;
      
      // Sync HTML pulse
      if (xorBlock) {
        xorBlock.style.textShadow = '0 0 12px var(--cyan)';
        xorBlock.style.color = '#fff';
      }
    } else {
      // Turn off pulse during pause
      if (xorBlock) {
        xorBlock.style.textShadow = '';
        xorBlock.style.color = '';
      }
    }
    
    t++;rafMap[12]=requestAnimationFrame(draw);
  }
  
  // Clean up inline styles if leaving
  cv._cleanup = () => {
    if (xorBlock) { xorBlock.style.textShadow = ''; xorBlock.style.color = ''; }
  };
  
  draw();
}

function animDSSSSim(){
  const cv=document.getElementById('dsssSimCanvas');
  if(!cv)return;
  const parent=cv.parentElement;
  cv.width=parent.offsetWidth;cv.height=parent.offsetHeight;
  const ctx=cv.getContext('2d');
  
  const barker=[1,1,1,-1,-1,-1,1,-1,-1,1,-1];
  const data=[1,1,-1,1,-1,-1];
  const cc=barker.length*data.length;
  
  const noiseSlider = document.getElementById('noiseSlider');
  const noiseValTxt = document.getElementById('noiseVal');
  
  let t=0;
  function draw(){
    if(!document.getElementById('s9-1').classList.contains('active'))return;
    const W=cv.width,H=cv.height;
    ctx.clearRect(0,0,W,H);
    const rows=5,rowH=H/rows;
    const pad={l:12,r:8};
    const pW=W-pad.l-pad.r;
    
    const chipW=pW/cc,bitW=pW/data.length;
    
    const noiseN = parseFloat(noiseSlider.value);
    
    noiseValTxt.innerText = Math.round(noiseN*100) + '%';
    
    const labels=['d(t) · Datos','c(t) · Código PN','s(t) = d(t)·c(t)','r(t) = s(t) + n(t)','Recuperada: d(t) + n(t)·c(t) -> LPF'];
    const colors=['#3d85ff','#7c3aed','#00d4ff','#f43f5e','#00ffc8'];
    
    // Draw grid & labels
    for(let row=0; row<rows; row++){
      const ry=row*rowH,midY=ry+rowH/2;
      ctx.fillStyle=colors[row];ctx.font='bold 11px JetBrains Mono';ctx.textAlign='left';ctx.textBaseline='top';
      ctx.fillText(labels[row],pad.l,ry+4);
      
      ctx.strokeStyle='rgba(255,255,255,.04)';ctx.lineWidth=.5;
      ctx.beginPath();ctx.moveTo(pad.l,midY);ctx.lineTo(pad.l+pW,midY);ctx.stroke();
      if(row<rows-1){ctx.strokeStyle='rgba(255,255,255,.05)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,ry+rowH);ctx.lineTo(W,ry+rowH);ctx.stroke();}
    }
    
    const timeShift = t * 0.05; // For moving noise phase
    
    // Compute Arrays for continuous rendering
    const steps = Math.floor(pW);
    const s_arr = new Float32Array(steps);
    const r_arr = new Float32Array(steps);
    const c_arr = new Float32Array(steps);
    const r_times_c = new Float32Array(steps);
    
    for(let i=0; i<steps; i++){
      const x = i;
      const bIdx = Math.min(data.length-1, Math.floor(x/bitW));
      const cIdx = Math.min(cc-1, Math.floor(x/chipW));
      
      const d_val = data[bIdx];
      const c_val = barker[cIdx % barker.length];
      
      s_arr[i] = d_val * c_val;
      c_arr[i] = c_val;
      
      // Noise: Random combined with a slight sine wave to represent "any interference" n(t)
      const j_val = Math.sin((x/pW * 7 * Math.PI * 2) - timeShift);
      const n_val = (Math.random()*2 - 1);
      
      // Total interference n(t) scaled by slider
      const total_n = (j_val * 0.8 + n_val * 1.2) * noiseN;
      
      r_arr[i] = s_arr[i] + total_n;
      r_times_c[i] = r_arr[i] * c_val;
    }
    
    // LPF Smoothing (Moving Average)
    const d_hat = new Float32Array(steps);
    const windowSize = Math.floor(bitW * 0.8); // Smooth over ~1 bit duration
    for(let i=0; i<steps; i++){
      let sum = 0;
      let count = 0;
      for(let w = -windowSize/2; w<=windowSize/2; w++){
        const idx = Math.floor(i + w);
        if(idx>=0 && idx<steps){
          sum += r_times_c[idx];
          count++;
        }
      }
      d_hat[i] = sum / count;
    }
    
    // DRAW
    for(let row=0; row<rows; row++){
      const ry=row*rowH, midY=ry+rowH/2, amp=rowH/2-10;
      
      ctx.beginPath();ctx.strokeStyle=colors[row];ctx.lineWidth=1.5;
      if(row===0 || row===1 || row===2){
        // Perfect digital signals
        for(let i=0; i<steps; i++){
          const val = row===0 ? data[Math.min(data.length-1, Math.floor(i/bitW))] : (row===1 ? c_arr[i] : s_arr[i]);
          const x=pad.l+i, y=midY-val*amp;
          if(i>0 && row===0){
            const prevVal = data[Math.min(data.length-1, Math.floor((i-1)/bitW))];
            if(prevVal !== val) ctx.lineTo(x, midY-prevVal*amp);
          }
          if(i>0 && row===1){
            const prevVal = c_arr[i-1];
            if(prevVal !== val) ctx.lineTo(x, midY-prevVal*amp);
          }
          if(i>0 && row===2){
            const prevVal = s_arr[i-1];
            if(prevVal !== val) ctx.lineTo(x, midY-prevVal*amp);
          }
          i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
        }
        ctx.stroke();
      } else if (row===3){
        // Noisy r(t)
        const r_amp = amp * 0.35;
        for(let i=0; i<steps; i+=2){
          const x=pad.l+i, y=midY-r_arr[i]*r_amp;
          i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
        }
        ctx.stroke();
      } else if (row===4){
        // 1. First draw the raw r(t)*c(t) in thin red to show spread noise
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)'; // Red/Pink semi-transparent
        ctx.lineWidth = 1;
        const raw_amp = amp * 0.35;
        for(let i=0; i<steps; i+=2){
          const x=pad.l+i, y=midY-r_times_c[i]*raw_amp;
          i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
        }
        ctx.stroke();
        
        // 2. Then draw the recovered d_hat(t) LPF
        ctx.beginPath();
        ctx.strokeStyle = colors[row];
        ctx.lineWidth=2.5; ctx.shadowColor=colors[row]; ctx.shadowBlur=8;
        for(let i=0; i<steps; i++){
          const x=pad.l+i, y=midY-d_hat[i]*amp;
          i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
        }
        ctx.stroke(); ctx.shadowBlur=0;
      }
    }
    
    t++;
    rafMap[13] = requestAnimationFrame(draw);
  }
  
  draw();
}

// ════════════════════════════════════════
// S10-1 · TACTICAL HUD SIMULATOR
// ════════════════════════════════════════
let hudState = 0; // 0 = Clean, 1 = Jammed, 2 = DSSS
let hudDSSSSweep = 0;
let hudT = 0;

function animHUD() {
  const cv = document.getElementById('hudCanvas');
  if(!cv) return;
  const parent = cv.parentElement;
  cv.width = parent.offsetWidth; cv.height = parent.offsetHeight;
  const ctx = cv.getContext('2d');
  
  const btnJam = document.getElementById('btnJammer');
  const btnDSSS = document.getElementById('btnDSSS');
  const panel = document.getElementById('hudPanel');
  const stTitle = document.getElementById('hudStatusTitle');
  const stSig = document.getElementById('hudSignal');
  const stNoise = document.getElementById('hudNoise');
  const stData = document.getElementById('hudData');
  const glitch = document.getElementById('hudGlitchOverlay');
  
  // Setup Points
  if (!cv._pts) {
    cv._pts = [];
    for(let i=0; i<8; i++) {
      cv._pts.push({
        x: cv.width*0.2 + Math.random() * cv.width*0.6,
        y: cv.height*0.2 + Math.random() * cv.height*0.6,
        phase: Math.random() * Math.PI * 2
      });
    }
  }
  
  if(!cv._initEv) {
    cv._initEv = true;
    
    btnJam.onclick = () => {
      hudState = 1;
      panel.style.background = 'rgba(244, 63, 94, 0.1)';
      panel.style.borderColor = '#f43f5e';
      panel.style.color = '#f43f5e';
      stTitle.style.borderBottomColor = '#f43f5e';
      stTitle.innerText = 'ALERTA: JAMMER DETECTADO';
      stSig.innerText = '0% (PERDIDO)'; stNoise.innerText = 'CRÍTICO'; stData.innerText = '---';
      btnJam.style.opacity = '0.3'; btnJam.style.pointerEvents = 'none';
      btnDSSS.style.opacity = '1'; btnDSSS.style.pointerEvents = 'all';
      glitch.style.opacity = '1';
    };
    
    btnDSSS.onclick = () => {
      hudState = 2;
      hudDSSSSweep = 0;
      panel.style.background = 'rgba(0, 255, 200, 0.1)';
      panel.style.borderColor = 'var(--green)';
      panel.style.color = 'var(--green)';
      stTitle.style.borderBottomColor = 'var(--green)';
      stTitle.innerText = 'DSSS ACTIVADO (MAJ ACTIVO)';
      stSig.innerText = '100% (Recuperado)'; stNoise.innerText = 'Ensanchado'; stData.innerText = 'Rx Confirmado';
      btnDSSS.style.opacity = '0.3'; btnDSSS.style.pointerEvents = 'none';
      glitch.style.opacity = '0';
    };
  }
  
  // Reset state EVERY TIME the slide is entered
  hudState = 0; 
  hudDSSSSweep = 0;
  hudT = 0;
  
  // Reset UI
  panel.style.background = 'rgba(0, 212, 255, 0.05)';
  panel.style.borderColor = 'rgba(0, 212, 255, 0.3)';
  panel.style.color = 'var(--cyan)';
  stTitle.style.borderBottomColor = 'rgba(0, 212, 255, 0.3)';
  stTitle.innerText = 'ESTADO DE ENLACE: ÓPTIMO';
  stSig.innerText = '100%'; stNoise.innerText = 'Bajo'; stData.innerText = 'Recibiendo...';
  btnJam.style.opacity = '1'; btnJam.style.pointerEvents = 'all';
  btnDSSS.style.opacity = '0.3'; btnDSSS.style.pointerEvents = 'none';
  glitch.style.opacity = '0';
  
  function draw() {
    if(!document.getElementById('s10-intro').classList.contains('active')) return;
    const W = cv.width, H = cv.height;
    
    // Screen Shake
    ctx.save();
    if(hudState === 1) {
      ctx.translate((Math.random()-0.5)*12, (Math.random()-0.5)*12);
    }
    
    ctx.clearRect(0,0,W,H);
    
    // Draw Radar Rings
    const cx = W/2, cy = H/2;
    const maxR = Math.min(W,H)*0.4;
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
    ctx.lineWidth = 1;
    for(let i=1; i<=4; i++) {
      ctx.beginPath(); ctx.arc(cx, cy, maxR * (i/4), 0, Math.PI*2); ctx.stroke();
    }
    // Radar crosshair
    ctx.beginPath(); ctx.moveTo(cx, cy-maxR); ctx.lineTo(cx, cy+maxR); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx-maxR, cy); ctx.lineTo(cx+maxR, cy); ctx.stroke();
    
    // Normal Sweep
    const sweepA = (hudT * 0.03) % (Math.PI*2);
    ctx.fillStyle = 'rgba(0,212,255,0.05)';
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,maxR, sweepA-0.5, sweepA); ctx.lineTo(cx,cy); ctx.fill();
    ctx.strokeStyle = 'rgba(0,212,255,0.8)'; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx + Math.cos(sweepA)*maxR, cy + Math.sin(sweepA)*maxR); ctx.stroke();
    
    // Draw Noise
    if(hudState === 1 || hudState === 2) {
      const noiseOpacity = hudState === 1 ? 0.8 : 0.15;
      ctx.fillStyle = `rgba(244, 63, 94, ${noiseOpacity})`;
      const count = hudState === 1 ? 1200 : 300;
      for(let i=0; i<count; i++) {
        ctx.fillRect(Math.random()*W, Math.random()*H, Math.random()*5, Math.random()*2);
      }
    }
    
    // Draw Points
    cv._pts.forEach(p => {
      const dx = p.x - cx, dy = p.y - cy;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d > maxR) return;
      
      let alpha = 0;
      if (hudState === 0) alpha = 0.5 + Math.sin(hudT*0.1 + p.phase)*0.5;
      if (hudState === 1) alpha = 0; // Lost
      if (hudState === 2) {
        if (p.x < hudDSSSSweep) alpha = 0.8 + Math.sin(hudT*0.2 + p.phase)*0.2; // Recovered
        else alpha = 0;
      }
      
      if (alpha > 0) {
        ctx.fillStyle = `rgba(0, 255, 200, ${alpha})`;
        ctx.shadowColor = '#00ffc8'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
    
    // DSSS Sweep
    if (hudState === 2) {
      hudDSSSSweep += 15;
      if (hudDSSSSweep < W) {
        ctx.fillStyle = 'rgba(0, 212, 255, 0.2)';
        ctx.fillRect(0, 0, hudDSSSSweep, H);
        ctx.strokeStyle = '#00ffc8'; ctx.lineWidth = 4;
        ctx.shadowColor = '#00ffc8'; ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.moveTo(hudDSSSSweep, 0); ctx.lineTo(hudDSSSSweep, H); ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = 'rgba(0, 212, 255, 0.05)';
        ctx.fillRect(0, 0, W, H);
      }
    }
    
    ctx.restore();
    hudT++;
    rafMap[15] = requestAnimationFrame(draw);
  }
  
  draw();
}

// ════════════════════════════════════════
// S10 · PROCESSING GAIN BARS
// ════════════════════════════════════════
function animPG(){
  const cv=document.getElementById('pgCanvas');
  if(!cv)return;
  const parent=cv.parentElement;
  cv.width=parent.offsetWidth;cv.height=parent.offsetHeight;
  const ctx=cv.getContext('2d');
  
  
  const systems=[
    {name:'IEEE 802.11b',gp:10.4,rc:'11 Mcps',rb:'1 Mbps',col:'#3d85ff'},
    {name:'CDMA IS-95',gp:21.1,rc:'1.23 Mcps',rb:'9.6 kbps',col:'#7c3aed'},
    {name:'W-CDMA 3G',gp:27.1,rc:'3.84 Mcps',rb:'7.5 kbps',col:'#00c896'},
    {name:'GPS C/A',gp:43.1,rc:'1.023 Mcps',rb:'50 bps',col:'#f59e0b'},
  ];
  const maxGp=50,pad={t:28,r:18,b:22,l:108};
  
  let t=0;
  let mouse = {x:-1, y:-1};
  
  if (!cv._pgHoverBound) {
    cv.addEventListener('mousemove', e => {
      const rect = cv.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    cv.addEventListener('mouseleave', () => { mouse.x=-1; mouse.y=-1; });
    cv._pgHoverBound = true;
  }
  
  // HTML formula hover sync
  const formHover = document.getElementById('pgFormulaHover');
  const animVars = document.querySelectorAll('.pg-anim-var');
  let slotT = 0;
  let isSlotting = false;
  
  if (formHover && !formHover._bound) {
    formHover.addEventListener('mouseenter', () => {
      isSlotting = true; slotT = 0;
    });
    formHover.addEventListener('mouseleave', () => {
      isSlotting = false;
      animVars.forEach((el, i) => {
        el.innerText = `${systems[i].rc} / ${systems[i].rb}`;
        el.style.color = '';
        el.style.textShadow = '';
      });
    });
    formHover._bound = true;
  }
  
  function draw(){
    if(!document.getElementById('s10').classList.contains('active'))return;
    const W=cv.width,H=cv.height;
    ctx.clearRect(0,0,W,H);
    
    // Process HTML Slot Machine
    if (isSlotting) {
      slotT++;
      if (slotT < 30) {
        animVars.forEach((el) => {
          const rand1 = (Math.random()*10).toFixed(1) + ' Mcps';
          const rand2 = (Math.random()*100).toFixed(0) + ' kbps';
          el.innerText = `${rand1} / ${rand2}`;
          el.style.color = '#3d85ff';
          el.style.textShadow = '0 0 8px rgba(61,133,255,0.8)';
        });
      } else {
        animVars.forEach((el, i) => {
          el.innerText = `${systems[i].rc} / ${systems[i].rb}`;
          el.style.color = '#00d4ff';
          el.style.textShadow = '0 0 8px rgba(0,212,255,0.8)';
        });
      }
    }
    
    const pW=W-pad.l-pad.r,pH=H-pad.t-pad.b;
    ctx.strokeStyle='rgba(255,255,255,.1)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(pad.l,pad.t);ctx.lineTo(pad.l,pad.t+pH);ctx.lineTo(pad.l+pW,pad.t+pH);ctx.stroke();
    
    [0,10,20,30,40,50].forEach(v=>{
      const x=pad.l+(v/maxGp)*pW;
      ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(x,pad.t);ctx.lineTo(x,pad.t+pH);ctx.stroke();
      ctx.fillStyle='rgba(122,156,184,.45)';ctx.font='8px JetBrains Mono';ctx.textAlign='center';ctx.fillText(`${v}dB`,x,pad.t+pH+14);
    });
    ctx.fillStyle='rgba(122,156,184,.35)';ctx.font='8px JetBrains Mono';ctx.textAlign='center';ctx.fillText('Processing Gain G_p [dB]',pad.l+pW/2,H-2);
    
    const reqX=pad.l+(9.6/maxGp)*pW;
    let hoveredBar = -1;
    
    systems.forEach((sys,i)=>{
      const y=pad.t+i*(pH/systems.length)+3, barH=pH/systems.length-8;
      
      // Calculate growth progress
      let p = 0;
      if (i < 3) {
        p = Math.min(1, Math.max(0, (t * 0.025) - i * 0.3));
        p = 1 - Math.pow(1 - p, 3); // ease out cubic
      } else {
        // GPS takes 2x time
        p = Math.min(1, Math.max(0, (t * 0.0125) - 3 * 0.3 * 2));
        p = 1 - Math.pow(1 - p, 4); // stronger ease out
      }
      
      const barW = (sys.gp/maxGp)*pW * p;
      
      if (barW > 0) {
        const g=ctx.createLinearGradient(pad.l,y,pad.l+barW,y);
        g.addColorStop(0,`rgba(${hexToRgb(sys.col)},.65)`);g.addColorStop(1,`rgba(${hexToRgb(sys.col)},.18)`);
        ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(pad.l,y,barW,barH,4);ctx.fill();
        ctx.strokeStyle=`rgba(${hexToRgb(sys.col)},.8)`;ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(pad.l,y,barW,barH,4);ctx.stroke();
      }
      
      ctx.fillStyle=sys.col;ctx.font='700 10px JetBrains Mono';ctx.textAlign='right';
      ctx.fillText(sys.name,pad.l-5,y+barH/2+4);
      
      if (p > 0.05) {
        ctx.font='700 11px JetBrains Mono';ctx.textAlign='left';
        const currentVal = (sys.gp * p).toFixed(1);
        ctx.fillText(`${currentVal}dB`,pad.l+barW+5,y+barH/2+4);
      }
      
      if(barW>90){ctx.fillStyle='rgba(255,255,255,.4)';ctx.font='8px JetBrains Mono';ctx.fillText(`${sys.rc}/${sys.rb}`,pad.l+6,y+barH/2+3);}
      
      if (mouse.y >= y && mouse.y <= y+barH) { hoveredBar = i; }
    });
    
    // Threshold line drop animation
    const lineDropP = Math.min(1, t * 0.015);
    const lineY = pad.t + pH * lineDropP;
    
    if (lineDropP > 0) {
      ctx.strokeStyle='rgba(245,158,11,.45)';ctx.lineWidth=1.5;ctx.setLineDash([4,3]);
      ctx.beginPath();ctx.moveTo(reqX,pad.t);ctx.lineTo(reqX,lineY);ctx.stroke();ctx.setLineDash([]);
      
      // Flash at bottom
      if (lineDropP >= 1 && t*0.015 < 1.3) {
        const flashP = 1 - (t*0.015 - 1)*3.33;
        if (flashP > 0) {
           ctx.fillStyle=`rgba(245,158,11,${flashP*0.6})`; 
           ctx.beginPath(); ctx.arc(reqX, pad.t+pH, 15*flashP, 0, Math.PI*2); ctx.fill();
        }
      }
      
      if (lineDropP >= 1) {
        ctx.fillStyle='rgba(245,158,11,.7)';ctx.font='8px JetBrains Mono';ctx.textAlign='center';ctx.fillText('(Eb/N0)req≈9.6dB',reqX,pad.t-4);
      }
    }
    
    // Hover Bracket (MAJ)
    // Only show if the line has dropped and the bar has grown past the line
    if (hoveredBar !== -1 && lineDropP >= 1) { 
      const sys = systems[hoveredBar];
      const y = pad.t+hoveredBar*(pH/systems.length)+3;
      const endX = pad.l + (sys.gp/maxGp)*pW;
      
      if (endX > reqX + 5) {
        ctx.strokeStyle = 'rgba(245,158,11,.8)'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(reqX, y - 4); ctx.lineTo(endX, y - 4);
        ctx.moveTo(reqX, y - 8); ctx.lineTo(reqX, y);
        ctx.moveTo(endX, y - 8); ctx.lineTo(endX, y);
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(245,158,11,1)'; ctx.font = 'bold 9px JetBrains Mono'; ctx.textAlign = 'center';
        const maj = (sys.gp - 9.6).toFixed(1);
        ctx.fillText(`Margen MAJ = ${maj} dB`, reqX + (endX - reqX)/2, y - 10);
      }
    }
    
    t++;
    rafMap[14] = requestAnimationFrame(draw);
  }
  
  draw();
}

// ════════════════════════════════════════
// S11 · PN SEQUENCES
// ════════════════════════════════════════
// ════════════════════════════════════════
// S11 · PN SEQUENCES
// ════════════════════════════════════════
let pnT = 0;
let isGoldHovered = false;

function animPN(){
  const gRow = document.getElementById('goldCodeRow');
  if (gRow && !gRow._bound) {
    gRow.addEventListener('mouseenter', () => isGoldHovered = true);
    gRow.addEventListener('mouseleave', () => isGoldHovered = false);
    gRow._bound = true;
  }
  
  const cLFSR = setupCanvas(document.getElementById('lfsrCanvas'));
  const cACF = setupCanvas(document.getElementById('acfCanvas'));
  drawBarkerChips();
  
  function draw() {
    if(!document.getElementById('s11').classList.contains('active')) return;
    
    if (cLFSR) drawLFSR(cLFSR, pnT);
    if (cACF) drawACF(cACF, pnT);
    
    pnT++;
    rafMap[9] = requestAnimationFrame(draw);
  }
  draw();
}

function drawLFSR(cObj, t){
  const {ctx,W,H} = cObj;
  ctx.clearRect(0,0,W,H);
  
  // Logical State (slow updates)
  const n=4;
  const init=[1,0,0,1];
  
  // shift every 60 frames (approx 1s)
  const shiftStage = Math.floor(t / 60);
  const animPhase = (t % 60) / 60; // 0 to 1
  
  let state=[...init];
  const seq=[];
  
  let fullState = [...init];
  let fullSeq = [];
  for(let i=0;i<15;i++){
    fullSeq.push(fullState[n-1]);
    const fb = fullState[0]^fullState[1];
    fullState=[fb,...fullState.slice(0,n-1)];
  }
  
  for(let i=0; i<shiftStage; i++){
    seq.push(state[n-1]);
    const fb = state[0]^state[1];
    state = [fb,...state.slice(0,n-1)];
  }
  
  // Layout
  const regW = Math.min(36, W*.08), regH = regW, regGap = Math.min(10, W*.02);
  const totalW = n*(regW+regGap)-regGap, startX = (W-totalW)/2;
  
  // Helper to draw an LFSR chain
  const drawChain = (yOffset, opacity, localState, labelPrefix) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    
    for (let i=0; i<n; i++) {
      const bit = localState[i];
      const x = startX+i*(regW+regGap);
      
      ctx.fillStyle = bit ? 'rgba(0,212,255,.15)' : 'rgba(244,63,94,.1)';
      ctx.strokeStyle = bit ? 'rgba(0,212,255,.6)' : 'rgba(244,63,94,.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(x, yOffset, regW, regH, 5); ctx.fill(); ctx.stroke();
      
      ctx.fillStyle = 'rgba(122,156,184,.4)'; ctx.font = `${Math.round(regW*.28)}px JetBrains Mono`; ctx.textBaseline='top';
      ctx.fillText(`${labelPrefix}${i}`, x+regW/2, yOffset+regH+3);
      
      if (i < n-1) {
        ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x+regW, yOffset+regH/2); ctx.lineTo(x+regW+regGap, yOffset+regH/2); ctx.stroke();
      }
      
      ctx.fillStyle = bit ? '#00d4ff' : '#f43f5e'; 
      ctx.font = `bold ${Math.round(regW*.38)}px JetBrains Mono`; 
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(bit, x + regW/2, yOffset+regH/2);
    }
    
    // Feedback loop
    ctx.strokeStyle = 'rgba(124,58,237,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([3,3]);
    ctx.beginPath();
    ctx.moveTo(startX+regW, yOffset+regH/2); 
    ctx.lineTo(startX+regW+regGap*.5, yOffset+regH/2);
    ctx.lineTo(startX+regW+regGap*.5, yOffset-16);
    ctx.lineTo(startX-regGap-6, yOffset-16);
    ctx.lineTo(startX-regGap-6, yOffset+regH/2);
    ctx.lineTo(startX, yOffset+regH/2);
    ctx.stroke(); ctx.setLineDash([]);
    
    ctx.fillStyle='rgba(124,58,237,.7)'; ctx.font=`bold ${Math.min(9,W*.022)}px JetBrains Mono`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('f(x)=x⁴+x+1', W/2, yOffset-10);
    
    ctx.restore();
  };
  
  // Ray emission on shift
  const pulse = Math.max(0, 1 - animPhase*4); // fast fade
  
  let regY1 = H*.15;
  let regY2 = H*.45;
  
  if (!isGoldHovered) {
    regY1 = H*.22;
    drawChain(regY1, 1, state, 'D');
    
    // Pulse ray to D0
    if (pulse > 0) {
       ctx.strokeStyle = `rgba(124,58,237,${pulse})`; ctx.lineWidth = 3;
       ctx.beginPath(); ctx.moveTo(startX-regGap-6, regY1-16); ctx.lineTo(startX, regY1+regH/2); ctx.stroke();
       ctx.shadowColor = '#7c3aed'; ctx.shadowBlur = 10;
       ctx.stroke(); ctx.shadowBlur = 0;
    }
  } else {
    // Gold Code duplication
    drawChain(regY1, 1, state, 'D');
    const state2 = [state[2], state[0], state[3], state[1]]; // dummy different state
    drawChain(regY2, 1, state2, 'G');
    
    // XOR combining them
    const outX = startX + totalW + 20;
    const midY = (regY1 + regH/2 + regY2 + regH/2)/2;
    
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(startX+totalW, regY1+regH/2); ctx.lineTo(outX, regY1+regH/2); ctx.lineTo(outX, midY-10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(startX+totalW, regY2+regH/2); ctx.lineTo(outX, regY2+regH/2); ctx.lineTo(outX, midY+10); ctx.stroke();
    
    ctx.fillStyle = 'rgba(245,158,11,.1)'; ctx.strokeStyle = 'rgba(245,158,11,.8)';
    ctx.beginPath(); ctx.arc(outX, midY, 12, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 12px Mono'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('⊕', outX, midY);
    
    ctx.beginPath(); ctx.moveTo(outX+12, midY); ctx.lineTo(outX+30, midY); ctx.stroke();
    ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 9px Mono'; ctx.textAlign='left'; ctx.fillText('Gold Code', outX+34, midY);
  }
  
  // Output Sequence
  const seqDisp = fullSeq.slice(0, Math.min(15, shiftStage)).join(' ');
  ctx.textBaseline='top';
  ctx.fillStyle='rgba(0,212,255,.55)'; ctx.font=`bold ${Math.min(9,W*.022)}px JetBrains Mono`; ctx.textAlign='left'; 
  ctx.fillText('Secuencia (15 chips):', startX, H*.75);
  ctx.fillStyle='#00d4ff'; ctx.font=`600 ${Math.min(11,W*.026)}px JetBrains Mono`; 
  ctx.fillText(seqDisp + (animPhase < 0.2 ? '_' : ''), startX, H*.85);
  ctx.fillStyle='rgba(122,156,184,.35)'; ctx.font=`${Math.min(9,W*.022)}px JetBrains Mono`; 
  ctx.fillText(`Período: 2ⁿ−1 = 15 chips`, startX, H*.96);
  ctx.textBaseline='alphabetic';
}

function drawACF(cObj, t){
  const {ctx,W,H} = cObj;
  ctx.clearRect(0,0,W,H);
  
  const barker=[1,1,1,-1,-1,-1,1,-1,-1,1,-1],N=barker.length;
  const acf=[];
  for(let lag=-(N-1);lag<=N-1;lag++){
    let s=0;
    for(let i=0;i<N;i++){
      const j=i+lag;
      if(j>=0&&j<N) s+=barker[i]*barker[j];
    }
    acf.push({lag,val:s});
  }
  
  const pad={t:20,r:14,b:22,l:34};
  const pW=W-pad.l-pad.r,pH=H-pad.t-pad.b,midX=pad.l+pW/2;
  const zeroY=pad.t+pH*.68,scale=pH*.58/N;
  
  ctx.strokeStyle='rgba(255,255,255,.1)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(pad.l,pad.t);ctx.lineTo(pad.l,pad.t+pH);ctx.lineTo(pad.l+pW,pad.t+pH);ctx.stroke();
  ctx.beginPath();ctx.moveTo(pad.l,zeroY);ctx.lineTo(pad.l+pW,zeroY);ctx.stroke();
  
  ctx.fillStyle='rgba(122,156,184,.4)';ctx.font='7px JetBrains Mono';ctx.textAlign='center';ctx.fillText('τ (lag) →',pad.l+pW/2,H-3);
  ctx.save();ctx.translate(11,pad.t+pH/2);ctx.rotate(-Math.PI/2);ctx.fillText('R(τ)',0,0);ctx.restore();
  
  const barW2=pW/(acf.length+2);
  
  // Sweep animation:
  const sweepDur = 160; 
  const sweepP = (t % sweepDur) / sweepDur; // 0 to 1
  const currentTauRaw = -N + 1 + sweepP * (2*N - 2);
  const exactAlign = (Math.abs(currentTauRaw) < 0.45); 
  
  acf.forEach((item,i)=>{
    const bx=pad.l+(i+1)*barW2;
    const isMain = item.lag === 0;
    
    // Dynamic height for the main peak
    let drawVal = item.val;
    if (isMain) {
      if (!exactAlign) drawVal = -1 + (Math.sin(t*0.5)*1.5); // noise level when unaligned
      else drawVal = N; // snap to peak
    }
    
    const bh = drawVal * scale;
    const col = isMain ? (exactAlign ? '#00d4ff' : 'rgba(255,255,255,0.4)') : '#3d85ff';
    
    ctx.fillStyle = `rgba(${hexToRgb(col=== 'rgba(255,255,255,0.4)' ? '#ffffff' : col)},${isMain&&exactAlign ? 0.9 : 0.4})`;
    if (isMain && exactAlign) { ctx.shadowColor = col; ctx.shadowBlur = 20; }
    
    if(bh>=0) ctx.fillRect(bx,zeroY-bh,barW2-1.5,bh); else ctx.fillRect(bx,zeroY,barW2-1.5,-bh);
    ctx.shadowBlur=0;
    
    if(item.lag%5===0){
      ctx.fillStyle='rgba(122,156,184,.45)';ctx.font='7px JetBrains Mono';ctx.textAlign='center';
      ctx.fillText(item.lag,bx+(barW2-1.5)/2,pad.t+pH+12);
    }
  });
  
  // Ghost signal scanning
  const ghostX = pad.l + barW2 + ((currentTauRaw + N - 1)) * barW2;
  ctx.fillStyle = 'rgba(244,63,94,0.1)';
  ctx.fillRect(ghostX - barW2, pad.t, barW2*2, pH);
  ctx.strokeStyle = 'rgba(244,63,94,0.7)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(ghostX, pad.t); ctx.lineTo(ghostX, pad.t+pH); ctx.stroke();
  
  ctx.fillStyle='#00d4ff';ctx.font='bold 9px Inter';ctx.textAlign='center';ctx.fillText(`R(0)=N=${N}`,midX,pad.t+10);
  ctx.fillStyle='rgba(61,133,255,.55)';ctx.font='8px JetBrains Mono';ctx.fillText('R(τ≠0)∈{-1,0,1}',midX+pW*.22,zeroY+13);
}
function drawBarkerChips(){
  const row=document.getElementById('barkerChips');
  if(!row)return;
  const barker=[1,1,1,-1,-1,-1,1,-1,-1,1,-1];
  row.innerHTML='';
  barker.forEach((chip,i)=>{
    const cell=document.createElement('div');
    cell.className=`bk-chip ${chip>0?'pos':'neg'}`;
    cell.textContent=chip>0?'+1':'−1';
    cell.style.animationDelay=`${i*.06}s`;
    row.appendChild(cell);
  });
}

// ════════════════════════════════════════
// S12 · RAKE RECEIVER
// ════════════════════════════════════════
// ════════════════════════════════════════
// S12 · RAKE RECEIVER
// ════════════════════════════════════════
let rakeT = 0;
function animRAKE(){
  const r=setupCanvas(document.getElementById('rakeCanvas'));
  if(!r)return;
  const {ctx,W,H}=r;
  
  function draw() {
    if(!document.getElementById('s12').classList.contains('active')) return;
    ctx.clearRect(0,0,W,H);
    
    const paths=[
      {delay:0,amp:1,color:'#00d4ff',label:'τ₁=0 (LOS)'},
      {delay:.12,amp:.7,color:'#3d85ff',label:'τ₂=120ns'},
      {delay:.22,amp:.5,color:'#7c3aed',label:'τ₃=220ns'},
      {delay:.34,amp:.3,color:'#00c896',label:'τ₄=340ns'}
    ];
    
    const N=4,pad={t:22,r:22,b:22,l:22};
    const pW=W-pad.l-pad.r,pH=H-pad.t-pad.b;
    const mpW=pW*.22,fW=pW*.46,fStartX=pad.l+mpW+18,combX=fStartX+fW+18,combW=pW*.12;
    
    // Draw Canal
    ctx.fillStyle='rgba(0,212,255,.05)';ctx.strokeStyle='rgba(0,212,255,.14)';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(pad.l,pad.t,mpW,pH,8);ctx.fill();ctx.stroke();
    ctx.fillStyle='rgba(0,212,255,.45)';ctx.font='bold 8px JetBrains Mono';ctx.textAlign='center';
    ctx.fillText('Canal',pad.l+mpW/2,pad.t+12);ctx.fillText('Multitrayecto',pad.l+mpW/2,pad.t+24);
    
    // Draw static channel lines
    paths.forEach((p,i)=>{
      const ay=pad.t+18+(i+1)*(pH/(N+1)),ax=pad.l+mpW*p.delay/.4,bH=pH*.055*p.amp;
      ctx.fillStyle=`rgba(${hexToRgb(p.color)},.7)`;ctx.fillRect(ax,ay-bH/2,4,bH);
      ctx.fillStyle=p.color;ctx.font='7.5px JetBrains Mono';ctx.textAlign='left';ctx.fillText(p.label,ax+6,ay+3);
    });
    
    ctx.fillStyle='rgba(255,255,255,.12)';ctx.font='bold 8px JetBrains Mono';ctx.textAlign='center';
    ctx.fillText('Fingers RAKE',fStartX+fW/2,pad.t+8);
    
    // Draw Fingers
    paths.forEach((p,i)=>{
      const fy=pad.t+12+(i*(pH-12)/N),fx=fStartX,fH=Math.max((pH-12)/N-5,20);
      ctx.fillStyle=`rgba(${hexToRgb(p.color)},.08)`;ctx.strokeStyle=`rgba(${hexToRgb(p.color)},.4)`;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.roundRect(fx,fy,fW,fH,6);ctx.fill();ctx.stroke();
      
      const cx2=fx+fW*.3,cy2=fy+fH/2;
      ctx.beginPath();ctx.arc(cx2,cy2,Math.min(fH*.28,14),0,Math.PI*2);
      ctx.fillStyle=`rgba(${hexToRgb(p.color)},.15)`;ctx.strokeStyle=`rgba(${hexToRgb(p.color)},.5)`;ctx.lineWidth=1;ctx.fill();ctx.stroke();
      ctx.fillStyle=p.color;ctx.font='7px JetBrains Mono';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('∫·c(t-τ)',cx2,cy2);
      
      const wx=fx+fW*.68;
      ctx.fillStyle=`rgba(${hexToRgb(p.color)},.12)`;ctx.strokeStyle=`rgba(${hexToRgb(p.color)},.45)`;ctx.lineWidth=1;
      ctx.beginPath();ctx.roundRect(wx-14,cy2-10,28,20,4);ctx.fill();ctx.stroke();
      ctx.fillStyle=p.color;ctx.font='700 8px JetBrains Mono';ctx.fillText(`a${i+1}*`,wx,cy2);
      ctx.textBaseline='alphabetic';
      
      const mpY=pad.t+18+(i+1)*(pH/(N+1));
      ctx.strokeStyle=`rgba(${hexToRgb(p.color)},.28)`;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(pad.l+mpW,mpY);ctx.lineTo(fx,fy+fH/2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(fx+fW,fy+fH/2);ctx.lineTo(combX,H/2);ctx.stroke();
    });
    
    // Animation timing logic
    const t_loop = rakeT % 260; // 260 frames loop
    const t_out_start = 140;
    const t_out_end = 180;
    
    const getPointOnPath = (nodes, p) => {
      let totalDist = 0;
      const segs = [];
      for(let i=0; i<nodes.length-1; i++){
        const dx = nodes[i+1][0] - nodes[i][0];
        const dy = nodes[i+1][1] - nodes[i][1];
        const d = Math.hypot(dx, dy);
        segs.push({d, p0:nodes[i], p1:nodes[i+1]});
        totalDist += d;
      }
      let targetD = p * totalDist;
      for(let seg of segs) {
        if (targetD <= seg.d) {
          const sp = targetD / seg.d;
          return [seg.p0[0] + (seg.p1[0] - seg.p0[0]) * sp, seg.p0[1] + (seg.p1[1] - seg.p0[1]) * sp];
        }
        targetD -= seg.d;
      }
      return segs[segs.length-1].p1;
    };
    
    // Draw animated multipath packets
    paths.forEach((p, i) => {
      const mpY = pad.t+18+(i+1)*(pH/(N+1));
      const fy = pad.t+12+(i*(pH-12)/N);
      const fH = Math.max((pH-12)/N-5,20);
      const cx2 = fStartX + fW*.3;
      
      const inNodes = [[pad.l, mpY], [pad.l+mpW, mpY], [fStartX, fy+fH/2], [cx2, fy+fH/2]];
      const outNodes = [[cx2, fy+fH/2], [fStartX+fW, fy+fH/2], [combX, H/2]];
      
      const t_start = p.delay * 200; // max 68
      const t_in_end = t_start + 60; // max 128
      
      let pos = null;
      if (t_loop >= t_start && t_loop <= t_out_end) {
        if (t_loop < t_in_end) pos = getPointOnPath(inNodes, (t_loop - t_start) / 60);
        else if (t_loop < t_out_start) pos = [cx2, fy+fH/2];
        else pos = getPointOnPath(outNodes, (t_loop - t_out_start) / (t_out_end - t_out_start));
      }
      
      if (pos) {
        const packetH = 3 + p.amp * 5;
        const alpha = 0.5 + p.amp * 0.5;
        ctx.fillStyle = `rgba(${hexToRgb(p.color)},${alpha})`;
        ctx.shadowColor = p.color; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(pos[0], pos[1], packetH, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
    
    // MRC Flash logic
    let mrcFlash = 0;
    if (t_loop >= t_out_end && t_loop < t_out_end + 30) {
      mrcFlash = 1 - (t_loop - t_out_end) / 30;
    }
    
    ctx.textBaseline='alphabetic';
    ctx.fillStyle=`rgba(0,200,150,${0.1 + mrcFlash*0.5})`;
    ctx.strokeStyle=`rgba(0,200,150,${0.5 + mrcFlash*0.5})`;ctx.lineWidth=2;
    if(mrcFlash>0) { ctx.shadowColor='#00c896'; ctx.shadowBlur=15; }
    ctx.beginPath();ctx.roundRect(combX,H/2-pH*.28,combW,pH*.56,10);ctx.fill();ctx.stroke();
    ctx.shadowBlur=0;
    
    ctx.fillStyle='#00c896';ctx.font='bold 8px JetBrains Mono';ctx.textAlign='center';
    ctx.fillText('MRC',combX+combW/2,H/2-8);ctx.fillText('Σaₖ*xₖ',combX+combW/2,H/2+6);
    
    ctx.strokeStyle='rgba(0,200,150,.6)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(combX+combW,H/2);ctx.lineTo(combX+combW+20,H/2);ctx.stroke();
    ctx.fillStyle='rgba(0,200,150,.6)';ctx.beginPath();ctx.moveTo(combX+combW+20,H/2-5);ctx.lineTo(combX+combW+28,H/2);ctx.lineTo(combX+combW+20,H/2+5);ctx.closePath();ctx.fill();
    ctx.fillStyle='#00c896';ctx.font='8px JetBrains Mono';ctx.textAlign='left';ctx.fillText('d̂(t)',combX+combW+32,H/2+3);
    
    // Emitted unified packet
    if (t_loop >= t_out_end && t_loop < t_out_end + 40) {
      const p = (t_loop - t_out_end) / 40;
      const outX = combX + combW + p * 50;
      ctx.fillStyle = `rgba(0,212,255,${1 - p})`;
      ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(outX, H/2, 8, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    
    rakeT++;
    rafMap[20] = requestAnimationFrame(draw);
  }
  
  draw();
}

// ════════════════════════════════════════
// S13 · AJ + LPI
// ════════════════════════════════════════
// ════════════════════════════════════════
// S13 · AJ + LPI
// ════════════════════════════════════════
let ajT = 0;
let ajCorrelatorActive = false;
let isAjFormulaHovered = false;

function animAJ(){
  const btn = document.getElementById('btnCorrelator');
  if (btn && !btn._bound) {
    btn.addEventListener('click', () => {
      ajCorrelatorActive = true;
      ajT = 0; 
    });
    btn._bound = true;
  }
  
  const form = document.getElementById('formulaAJ');
  if (form && !form._bound) {
    form.addEventListener('mouseenter', () => isAjFormulaHovered = true);
    form.addEventListener('mouseleave', () => isAjFormulaHovered = false);
    form._bound = true;
  }
  
  const cvAJ = document.getElementById('ajCanvas');
  const cvLPI_ = document.getElementById('lpiCanvas');
  
  if (cvAJ) cvAJ._cleanup = () => { ajCorrelatorActive = false; };
  
  function draw() {
    if(!document.getElementById('s13').classList.contains('active')) return;
    
    if (cvAJ) drawAJPanel(cvAJ, 'aj', ajT, ajCorrelatorActive, isAjFormulaHovered);
    if (cvLPI_) drawAJPanel(cvLPI_, 'lpi', ajT, false, false);
    
    ajT++;
    rafMap[16] = requestAnimationFrame(draw);
  }
  draw();
}

function drawAJPanel(cv, type, t, correlatorActive, formulaHover){
  const r = setupCanvas(cv);
  if(!r) return;
  const {ctx,W,H} = r;
  ctx.clearRect(0,0,W,H);
  
  const pad={t:20,r:14,b:18,l:40};
  const pW=W-pad.l-pad.r,pH=H-pad.t-pad.b;
  
  ctx.strokeStyle='rgba(255,255,255,.1)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(pad.l,pad.t);ctx.lineTo(pad.l,pad.t+pH);ctx.lineTo(pad.l+pW,pad.t+pH);ctx.stroke();
  ctx.fillStyle='rgba(122,156,184,.35)';ctx.font='7px JetBrains Mono';ctx.textAlign='center';ctx.textBaseline='alphabetic';
  ctx.fillText('Frecuencia →',pad.l+pW/2,H-3);
  ctx.save();ctx.translate(11,pad.t+pH/2);ctx.rotate(-Math.PI/2);ctx.fillText('PSD',0,0);ctx.restore();
  
  if(type==='aj'){
    const ssLvl=pH*.24,ssY=pad.t+pH-ssLvl;
    const jx=pad.l+pW*.5, jW=pW*.05;
    
    ctx.beginPath();ctx.strokeStyle='rgba(0,212,255,.7)';ctx.lineWidth=2;
    ctx.shadowColor='rgba(0,212,255,.35)';ctx.shadowBlur=8;
    ctx.moveTo(pad.l+pW*.14,ssY);ctx.lineTo(pad.l+pW*.86,ssY);ctx.stroke();ctx.shadowBlur=0;
    ctx.fillStyle='rgba(0,212,255,.06)';ctx.fillRect(pad.l+pW*.14,ssY,pW*.72,ssLvl);
    
    let sweepX = pad.l;
    let crushProgress = 0; // 0 to 1 fluid morph
    
    if (correlatorActive) {
      const sweepP = Math.min(1, t / 100);
      sweepX = pad.l + sweepP * pW;
      
      ctx.strokeStyle = 'rgba(124,58,237,.8)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = pad.l; x <= sweepX; x+=2) {
         const y = ssY - 15 + Math.sin(x*0.6 + t*0.2)*8;
         x === pad.l ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      
      ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2; ctx.shadowColor='#7c3aed'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(sweepX, pad.t); ctx.lineTo(sweepX, pad.t+pH); ctx.stroke();
      ctx.shadowBlur = 0;
      
      if (sweepX > jx - jW*2) {
         crushProgress = Math.min(1, (sweepX - (jx - jW*2)) / (pW * 0.2)); 
      }
    }
    
    // Smooth morph calculations
    const pulse = crushProgress === 0 ? (1 + Math.sin(t*0.2)*0.1) : 1;
    const initialH = pH * 0.9 * pulse;
    const finalH = ssLvl * 1.3;
    const currentH = initialH - crushProgress * (initialH - finalH);
    
    const initialW = jW;
    const finalW = pW*.72;
    const currentW = initialW + crushProgress * (finalW - initialW);
    
    const initialX = jx - jW/2;
    const finalX = pad.l+pW*.14;
    const currentX = initialX - crushProgress * (initialX - finalX);
    
    const initialY = pad.t+pH-initialH;
    const finalY = pad.t+pH-finalH;
    const currentY = pad.t+pH-currentH;
    
    const initialAlpha = 0.22;
    const finalAlpha = 0.15;
    const currentAlpha = initialAlpha - crushProgress * (initialAlpha - finalAlpha);
    
    ctx.fillStyle=`rgba(244,63,94,${currentAlpha})`;
    ctx.fillRect(currentX, currentY, currentW, currentH);
    
    ctx.strokeStyle=`rgba(244,63,94,${0.85 - crushProgress*0.45})`;ctx.lineWidth=2;
    ctx.shadowColor='rgba(244,63,94,.5)';ctx.shadowBlur=12 * (1-crushProgress);
    if(crushProgress < 0.9) {
      ctx.beginPath();ctx.moveTo(jx,pad.t+pH);ctx.lineTo(jx,currentY);ctx.stroke();
    } else {
      ctx.beginPath();ctx.setLineDash([2,2]);ctx.moveTo(currentX,currentY);ctx.lineTo(currentX+currentW,currentY);ctx.stroke();ctx.setLineDash([]);
    }
    ctx.shadowBlur=0;
    
    ctx.fillStyle=`rgba(244,63,94,${1 - crushProgress*0.4})`;ctx.font='bold 8px JetBrains Mono';ctx.textAlign='center';
    if(crushProgress === 0) {
      ctx.fillText('Jammer',jx,currentY-5);
    } else if (crushProgress === 1) {
      ctx.fillText('Jammer (Ensanchado)',jx,currentY-5);
    }
    
    if (formulaHover) {
       ctx.strokeStyle = 'rgba(245,158,11,1)'; ctx.lineWidth = 2; ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 8;
       ctx.beginPath(); ctx.moveTo(jx-jW-15, ssY); ctx.lineTo(jx-jW-15, pad.t+pH*0.1); ctx.stroke();
       ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 10px JetBrains Mono'; ctx.textAlign='right';
       ctx.fillText('G_p', jx-jW-20, (ssY+pad.t+pH*0.1)/2 + 4);
       ctx.shadowBlur = 0;
       
       ctx.beginPath(); ctx.moveTo(jx-jW-18, ssY); ctx.lineTo(jx-jW-12, ssY); ctx.stroke();
       ctx.beginPath(); ctx.moveTo(jx-jW-18, pad.t+pH*0.1); ctx.lineTo(jx-jW-12, pad.t+pH*0.1); ctx.stroke();
    } else if (crushProgress === 0) {
       ctx.strokeStyle='rgba(0,212,255,.4)';ctx.lineWidth=1;
       ctx.beginPath();ctx.moveTo(pad.l+pW*.14,ssY-14);ctx.lineTo(pad.l+pW*.86,ssY-14);ctx.stroke();
       ctx.beginPath();ctx.moveTo(pad.l+pW*.14,ssY-16);ctx.lineTo(pad.l+pW*.14,ssY-12);ctx.stroke();
       ctx.beginPath();ctx.moveTo(pad.l+pW*.86,ssY-16);ctx.lineTo(pad.l+pW*.86,ssY-12);ctx.stroke();
       
       ctx.fillStyle='rgba(0,212,255,.6)';ctx.font='8px JetBrains Mono';ctx.textAlign='center';ctx.fillText('B_ss (ancha)',jx,ssY-17);
    }
    
  } else {
    const noiseY=pad.t+pH*.32,ssY=pad.t+pH*.58;
    ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);
    ctx.beginPath();ctx.moveTo(pad.l,noiseY);ctx.lineTo(pad.l+pW,noiseY);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(255,255,255,.35)';ctx.font='bold 8px JetBrains Mono';ctx.textAlign='left';ctx.fillText('N₀ = −174 dBm/Hz',pad.l+2,noiseY-4);
    
    ctx.beginPath();ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=1;
    const tOffset = t*0.05;
    for(let x=pad.l;x<=pad.l+pW;x+=2){
      const y=noiseY+Math.sin(x*.7 + tOffset)*4+(Math.random()-.5)*3;
      x===pad.l?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.stroke();
    
    ctx.beginPath();ctx.strokeStyle='rgba(0,212,255,.8)';ctx.lineWidth=2;ctx.shadowColor='rgba(0,212,255,.4)';ctx.shadowBlur=8;
    for(let x=pad.l;x<=pad.l+pW;x+=3){
      const y=ssY+Math.sin(x*.4 - tOffset)*3+Math.sin(x*.9 + tOffset)*2;
      x===pad.l?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.stroke();ctx.shadowBlur=0;
    
    ctx.fillStyle='rgba(0,212,255,.06)';ctx.fillRect(pad.l,ssY-8,pW,16);
    
    const scanDur = 200;
    const scanP = (t % scanDur) / scanDur;
    const scanX = pad.l + scanP * pW;
    
    const grad = ctx.createLinearGradient(scanX-25, 0, scanX, 0);
    grad.addColorStop(0, 'rgba(34,197,94,0)'); grad.addColorStop(1, 'rgba(34,197,94,0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(scanX-25, pad.t, 25, pH);
    
    ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(scanX, pad.t); ctx.lineTo(scanX, pad.t+pH); ctx.stroke();
    ctx.shadowBlur = 0;
    
    if (scanP > 0.05 && scanP < 0.95) {
      ctx.fillStyle = `rgba(34,197,94,${Math.sin(t*0.5)*0.5 + 0.5})`;
      ctx.font = 'bold 9px JetBrains Mono'; ctx.textAlign='right';
      ctx.fillText('NO DETECTADO - RUIDO TÉRMICO', scanX - 6, pad.t + pH/2);
    }
    
    ctx.fillStyle='rgba(0,212,255,.7)';ctx.font='bold 8px Inter';ctx.textAlign='center';
    ctx.fillText('PSD_SS < N₀ · Invisible · LPI',pad.l+pW/2,ssY+16);
    
    const bx=pad.l+pW*.82;
    ctx.strokeStyle='rgba(0,212,255,.4)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(bx,noiseY);ctx.lineTo(bx,ssY);ctx.stroke();
    ctx.fillStyle='rgba(0,212,255,.55)';ctx.font='7.5px JetBrains Mono';ctx.textAlign='left';ctx.fillText('G_p',(noiseY+ssY)/2+3,H/2);
    
    ctx.strokeStyle='rgba(0,212,255,.3)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(pad.l+2,pad.t+pH-5);ctx.lineTo(pad.l+pW-2,pad.t+pH-5);ctx.stroke();
    ctx.beginPath();ctx.moveTo(pad.l+2,pad.t+pH-7);ctx.lineTo(pad.l+2,pad.t+pH-3);ctx.stroke();
    ctx.beginPath();ctx.moveTo(pad.l+pW-2,pad.t+pH-7);ctx.lineTo(pad.l+pW-2,pad.t+pH-3);ctx.stroke();
    ctx.fillStyle='rgba(0,212,255,.3)';ctx.font='7px JetBrains Mono';ctx.textAlign='center';ctx.fillText('B_ss',pad.l+pW/2,pad.t+pH-7);
  }
}

// ════════════════════════════════════════
// S14 · CDMA
// ════════════════════════════════════════
let cdmaT = 0;
let cdmaMacroActive = false;
let cdmaMacroUser = 0;

function animCDMA(){
  cdmaMacroActive = false;
  cdmaT = 0;
  const form = document.getElementById('formulaCDMA');
  if (form && !form._bound) {
    form.addEventListener('click', () => {
      cdmaMacroActive = true;
      cdmaMacroUser = Math.floor(Math.random() * 4); // Random user U1-U4
      cdmaT = 0;
    });
    form._bound = true;
  }
  
  const cv = document.getElementById('cdmaCanvas');
  if (cv) cv._cleanup = () => { cdmaMacroActive = false; };
  
  function draw() {
    if(!document.getElementById('s14').classList.contains('active')) return;
    drawCDMAPanel(cv, cdmaT, cdmaMacroActive, cdmaMacroUser);
    cdmaT++;
    rafMap[17] = requestAnimationFrame(draw);
  }
  draw();
}

function drawCDMAPanel(cv, t, macroActive, macroUser) {
  const r = setupCanvas(cv);
  if(!r) return;
  const {ctx,W,H} = r;
  ctx.clearRect(0,0,W,H);
  
  const walsh=[[1,1,1,1,1,1,1,1],[1,-1,1,-1,1,-1,1,-1],[1,1,-1,-1,1,1,-1,-1],[1,-1,-1,1,1,-1,-1,1]];
  const colors=['#00d4ff','#3d85ff','#7c3aed','#00c896'];
  const data=[1,-1,1,1];
  const N_CHIPS=8,N_USERS=4,pad={t:18,r:14,b:18,l:35};
  const pW=W-pad.l-pad.r,pH=H-pad.t-pad.b;
  const rowH=pH/N_USERS,sec=pW/3;
  const cW2 = sec/N_CHIPS;
  
  const sHdrs=['Códigos Walsh W_n(t)','d_n · W_n (spread)','Σ Canal CDMA'];
  ctx.fillStyle='rgba(122,156,184,.4)';ctx.font='bold 8px JetBrains Mono';ctx.textAlign='center';
  sHdrs.forEach((s,i)=>ctx.fillText(s,pad.l+sec*(i+.5),pad.t+8));
  ctx.strokeStyle='rgba(255,255,255,.05)';ctx.lineWidth=1;
  [1,2].forEach(i=>{const x=pad.l+sec*i;ctx.beginPath();ctx.moveTo(x,pad.t+14);ctx.lineTo(x,pad.t+pH);ctx.stroke();});
  
  const sum=Array(N_CHIPS).fill(0);
  walsh.forEach((code,u)=>{
    const spread=code.map((c,k)=>c*data[u]);
    spread.forEach((v,k)=>sum[k]+=v);
  });
  
  const maxS=Math.max(...sum.map(Math.abs))||1;
  const sumAmp=rowH*1.5;
  const sMidY=pad.t+14+rowH*2;
  
  const sweepDur = 160;
  let scanP = 1;
  if (!macroActive) {
     const loopT = t % (sweepDur + 60);
     scanP = Math.min(1, loopT / sweepDur);
  }
  
  walsh.forEach((code,u)=>{
    const ry=pad.t+14+u*rowH,midY=ry+rowH/2,amp=rowH/2-7;
    const spread=code.map((c,k)=>c*data[u]);
    
    let alpha = 1;
    if (macroActive) alpha = (u === macroUser) ? 1 : 0.2;
    
    ctx.fillStyle = data[u] > 0 ? `rgba(34,197,94,${alpha})` : `rgba(244,63,94,${alpha})`;
    ctx.font='bold 8px JetBrains Mono';ctx.textAlign='right';ctx.textBaseline='middle';
    ctx.fillText(`U${u+1} [${data[u]>0?'+1':'-1'}]`,pad.l-5,midY);
    
    ctx.beginPath();ctx.strokeStyle=`rgba(${hexToRgb(colors[u])},${alpha*0.8})`;ctx.lineWidth=1.5;
    code.forEach((val,i)=>{
      const x1=pad.l+i*cW2,x2=x1+cW2,y=midY-val*amp,yP=i>0?midY-code[i-1]*amp:y;
      i===0?ctx.moveTo(x1,y):(ctx.lineTo(x1,yP),ctx.lineTo(x1,y));ctx.lineTo(x2,y);
    });
    ctx.stroke();
    
    ctx.beginPath();ctx.strokeStyle=`rgba(${hexToRgb(colors[u])},${alpha})`;ctx.lineWidth=1.5;
    const chipsToDraw = Math.floor(scanP * N_CHIPS);
    const partialChip = (scanP * N_CHIPS) % 1;
    for (let i=0; i<=chipsToDraw && i<N_CHIPS; i++) {
       const val = spread[i];
       const x1=pad.l+sec+i*cW2, y=midY-val*amp;
       let x2=x1+cW2;
       if (i === chipsToDraw) {
         if (partialChip === 0) break;
         x2 = x1 + partialChip*cW2;
       }
       const yP=i>0?midY-spread[i-1]*amp:y;
       i===0?ctx.moveTo(x1,y):(ctx.lineTo(x1,yP),ctx.lineTo(x1,y));ctx.lineTo(x2,y);
    }
    ctx.stroke();
  });
  
  ctx.beginPath();ctx.strokeStyle='rgba(245,158,11,.85)';ctx.lineWidth=2;
  if (!macroActive) { ctx.shadowColor='rgba(245,158,11,.4)';ctx.shadowBlur=8; }
  const chipsToDraw = Math.floor(scanP * N_CHIPS);
  const partialChip = (scanP * N_CHIPS) % 1;
  for (let i=0; i<=chipsToDraw && i<N_CHIPS; i++) {
     const v = sum[i];
     const x1=pad.l+sec*2+i*cW2, y=sMidY-(v/maxS)*sumAmp/2;
     let x2=x1+cW2;
     if (i === chipsToDraw) {
       if (partialChip === 0) break;
       x2 = x1 + partialChip*cW2;
     }
     const yP=i>0?sMidY-(sum[i-1]/maxS)*sumAmp/2:y;
     i===0?ctx.moveTo(x1,y):(ctx.lineTo(x1,yP),ctx.lineTo(x1,y));ctx.lineTo(x2,y);
  }
  ctx.stroke();ctx.shadowBlur=0;
  
  if (!macroActive && scanP > 0 && scanP < 1) {
    const curXSpread = pad.l + sec + scanP * sec;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(curXSpread, pad.t+14); ctx.lineTo(curXSpread, pad.t+pH); ctx.stroke();
    
    walsh.forEach((code, u) => {
       const ry=pad.t+14+u*rowH,midY=ry+rowH/2,amp=rowH/2-7;
       const chipIdx = Math.floor(scanP * N_CHIPS);
       if(chipIdx >= N_CHIPS) return;
       const val = code[chipIdx]*data[u];
       const ySpread = midY - val*amp;
       const sumY = sMidY - (sum[chipIdx]/maxS)*sumAmp/2;
       
       for(let p=0; p<3; p++) {
         const pt = (t*0.03 + p*0.33 + u*0.25) % 1;
         const px = curXSpread + pt * sec;
         const py = ySpread + pt * (sumY - ySpread);
         ctx.fillStyle = colors[u];
         ctx.beginPath(); ctx.arc(px, py, 1.2, 0, Math.PI*2); ctx.fill();
       }
    });
  }
  
  if (macroActive) {
     const phase1 = Math.min(1, t / 60);
     const phase2 = Math.min(1, Math.max(0, t - 60) / 60);
     const phase3 = Math.min(1, Math.max(0, t - 120) / 30);
     
     const targetCode = walsh[macroUser];
     const ry = pad.t+14+macroUser*rowH;
     const startY = ry + rowH/2;
     const curY = startY + phase1 * (sMidY - startY);
     const amp = rowH/2-7;
     
     ctx.beginPath();ctx.strokeStyle=`rgba(${hexToRgb(colors[macroUser])},${0.5 + phase1*0.5})`;
     ctx.lineWidth=2; ctx.setLineDash([4,4]);
     targetCode.forEach((val,i)=>{
        const x1=pad.l+sec*2+i*cW2,x2=x1+cW2,y=curY-val*amp,yP=i>0?curY-targetCode[i-1]*amp:y;
        i===0?ctx.moveTo(x1,y):(ctx.lineTo(x1,yP),ctx.lineTo(x1,y));ctx.lineTo(x2,y);
     });
     ctx.stroke(); ctx.setLineDash([]);
     
     if (phase2 > 0) {
        ctx.fillStyle = `rgba(${hexToRgb(colors[macroUser])},${Math.sin(t*0.3)*0.2 + 0.1})`;
        for(let i=0; i<N_CHIPS; i++) {
           const sumY = sMidY - (sum[i]/maxS)*sumAmp/2;
           const codeY = sMidY - targetCode[i]*amp;
           ctx.fillRect(pad.l+sec*2+i*cW2, Math.min(sumY, codeY), cW2, Math.abs(sumY - codeY));
        }
     }
     
     if (phase3 > 0) {
        walsh.forEach((code, u) => {
           const y = pad.t+14+u*rowH + rowH/2;
           const isTarget = (u === macroUser);
           const rx = pad.l+sec*2 + sec/2;
           
           ctx.fillStyle = `rgba(0,0,0,${phase3*0.8})`;
           ctx.fillRect(rx-45, y-10, 90, 20);
           ctx.strokeStyle = isTarget ? colors[u] : 'rgba(255,255,255,0.2)';
           ctx.strokeRect(rx-45, y-10, 90, 20);
           
           ctx.fillStyle = isTarget ? '#22c55e' : 'rgba(255,255,255,0.5)';
           ctx.font = 'bold 9px JetBrains Mono'; ctx.textAlign='center'; ctx.textBaseline='middle';
           const txt = isTarget ? `= ${data[u]>0?'+1':'-1'} (Recuperado)` : `= 0 (Anulado)`;
           ctx.fillText(txt, rx, y);
        });
     }
  } else {
     ctx.fillStyle='rgba(245,158,11,.55)';ctx.font='bold 8px JetBrains Mono';ctx.textAlign='center';
     ctx.fillText('s(t)=Σdₙ·Wₙ',pad.l+sec*2.5,pad.t+pH-5);
  }
}

// ════════════════════════════════════════
// S15 · BLUETOOTH AFH
// ════════════════════════════════════════
let afhT = 0;
let isAfhHovered = false;

function animBluetooth(){
  const counter = document.getElementById('afhCounter');
  if (counter && !counter._bound) {
    counter.addEventListener('mouseenter', () => isAfhHovered = true);
    counter.addEventListener('mouseleave', () => isAfhHovered = false);
    counter._bound = true;
  }
  
  const cvTL = document.getElementById('afhCanvas');
  const cvMap = document.getElementById('afhMapCanvas');
  
  function draw() {
    if(!document.getElementById('s15').classList.contains('active')) return;
    
    if (cvTL) drawAFHTimeline(cvTL, afhT);
    if (cvMap) drawAFHMap(cvMap, afhT, isAfhHovered, counter);
    
    afhT++;
    rafMap[18] = requestAnimationFrame(draw);
  }
  draw();
}

function drawAFHTimeline(cv, t) {
  const r=setupCanvas(cv);
  if(!r)return;
  const {ctx,W,H}=r;ctx.clearRect(0,0,W,H);
  
  const N=79, nT=30;
  const loopT = t % 600;
  const currentSlot = Math.floor(loopT / 20);
  
  // Wi-Fi interfering bands: Ch6 (24-45) and Ch11 (46-67)
  const isBad = ch => (ch>=24 && ch<=45) || (ch>=46 && ch<=67);
  
  // Pre-determined sequence: 
  // Slots 0-11: naive hopping (causes crashes)
  // Slots 12-29: adapted hopping (safe only)
  const hops = [
    10, 30, 5, 55, 70, 40, 15, 60, 2, 50, 75, 35, // 0-11
    10, 70, 5, 15, 75, 2, 12, 72, 8, 18, 78, 1, 19, 70, 4, 16, 73, 9 // 12-29
  ];
  
  const pad={t:20,r:10,b:20,l:45};
  const pW=W-pad.l-pad.r,pH=H-pad.t-pad.b;
  const cW = pW/nT;
  
  ctx.strokeStyle='rgba(255,255,255,.1)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(pad.l,pad.t);ctx.lineTo(pad.l,pad.t+pH);ctx.lineTo(pad.l+pW,pad.t+pH);ctx.stroke();
  ctx.fillStyle='rgba(122,156,184,.45)';ctx.font='8px JetBrains Mono';ctx.textAlign='right';
  ['79','60','40','20','0'].forEach((v,i)=>ctx.fillText(v,pad.l-3,pad.t+(i/4)*pH+3));
  ctx.textAlign='center';ctx.fillText('Tiempo →',pad.l+pW/2,H-3);
  
  // Draw Wi-Fi Red Bands
  const wiBands=[[46,67],[24,45]];
  wiBands.forEach(([f1,f2])=>{
    const y1=pad.t+(1-f1/N)*pH, y2=pad.t+(1-f2/N)*pH;
    ctx.fillStyle='rgba(244,63,94,.06)';ctx.fillRect(pad.l,y2,pW,y1-y2);
    ctx.strokeStyle='rgba(244,63,94,.25)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(pad.l,y2);ctx.lineTo(pad.l+pW,y2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(pad.l,y1);ctx.lineTo(pad.l+pW,y1);ctx.stroke();
  });
  ctx.fillStyle='rgba(244,63,94,.35)';ctx.font='7px JetBrains Mono';ctx.textAlign='right';
  ctx.fillText('Wi-Fi',pad.l+pW-2,pad.t+(1-55/N)*pH);
  
  let lastGoodPoint = null;
  
  for(let i=0; i<nT; i++){
    if (i > currentSlot) break;
    
    const ch = hops[i];
    const x = pad.l + i*cW;
    const yTarget = pad.t + (1 - ch/N)*pH;
    
    let drawY = yTarget;
    let color = 'rgba(61,133,255,.72)';
    let glitched = false;
    
    if (i < 12 && isBad(ch)) {
       const age = loopT - i*20;
       if (age > 4) {
          glitched = true;
          color = 'rgba(244,63,94,.85)';
          drawY = Math.min(pad.t + pH, yTarget + (age-4)*3);
          
          if (age < 15) {
             ctx.fillStyle='#f59e0b';
             ctx.beginPath();ctx.arc(x+cW/2, yTarget, 3 + Math.random()*4, 0, Math.PI*2);ctx.fill();
          }
       }
    }
    
    ctx.fillStyle = color;
    ctx.shadowColor = color; ctx.shadowBlur = glitched ? 10 : 4;
    ctx.fillRect(x+1, drawY, cW-2, 5); ctx.shadowBlur = 0;
    
    if (!glitched && lastGoodPoint && !isBad(ch)) {
       ctx.strokeStyle='rgba(61,133,255,.2)';ctx.lineWidth=.8;
       ctx.setLineDash([2,3]);
       ctx.beginPath();ctx.moveTo(lastGoodPoint.x, lastGoodPoint.y);ctx.lineTo(x+cW/2, drawY+2);ctx.stroke();
       ctx.setLineDash([]);
    }
    
    if (!glitched) {
       lastGoodPoint = {x: x+cW/2, y: drawY+2};
    } else {
       lastGoodPoint = null; // Break the connection on drop
    }
  }
  
  if (loopT > 180 && loopT < 260) {
     ctx.fillStyle = `rgba(245,158,11,${Math.sin(t*0.5)*0.5 + 0.5})`;
     ctx.font = 'bold 10px JetBrains Mono'; ctx.textAlign='center';
     ctx.fillText('INTERFERENCIA DETECTADA -> RECALCULANDO RUTEO', pad.l+pW/2, pad.t+pH*.2);
  }
  
  ctx.fillStyle='rgba(61,133,255,.55)';ctx.font='8px JetBrains Mono';ctx.textAlign='left';ctx.fillRect(pad.l+2,pad.t+2,8,5);
  ctx.fillStyle='rgba(122,156,184,.4)';ctx.fillText('Canal BT Seguro',pad.l+14,pad.t+9);
  ctx.fillStyle='rgba(244,63,94,.55)';ctx.fillRect(pad.l+2,pad.t+14,8,5);
  ctx.fillStyle='rgba(122,156,184,.4)';ctx.fillText('Packet Loss (Choque)',pad.l+14,pad.t+21);
}

function drawAFHMap(cv, t, hover, counter) {
  const r=setupCanvas(cv);
  if(!r)return;
  const {ctx,W,H}=r;ctx.clearRect(0,0,W,H);
  
  const N=79, pad={t:28,r:10,b:28,l:10};
  const pW=W-pad.l-pad.r, rowH=(H-pad.t-pad.b)/2-4;
  const bW=pW/N;
  
  const loopT = t % 600;
  const phase = loopT < 240 ? 0 : (loopT < 300 ? 1 : 2);
  const isBad = ch => (ch>=24 && ch<=45) || (ch>=46 && ch<=67);
  
  // Draw Top Block (Radar Sensing)
  ctx.fillStyle='rgba(255,255,255,.12)';ctx.font='bold 8px JetBrains Mono';ctx.textAlign='left';
  ctx.fillText('Radar de Calidad de Canal (PER Sensing)',pad.l,pad.t-5);
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(pad.l,pad.t,pW,rowH);
  
  for(let i=0; i<N; i++){
     let rCol=61, gCol=133, bCol=255;
     let alpha = 0.6;
     
     if (isBad(i)) {
        const redden = Math.min(1, loopT / 200);
        rCol = 61 + redden * (244 - 61);
        gCol = 133 + redden * (63 - 133);
        bCol = 255 + redden * (94 - 255);
        if (phase >= 1) alpha = 0.15; // Fade out dropped channels
     }
     ctx.fillStyle = `rgba(${rCol},${gCol},${bCol},${alpha})`;
     ctx.fillRect(pad.l+i*bW+.5, pad.t+2, bW-1, rowH-4);
  }
  
  // Radar scanner
  if (phase === 0) {
     const scanP = (loopT % 120) / 120;
     const scanX = pad.l + scanP * pW;
     ctx.fillStyle = `rgba(34,197,94,0.3)`; ctx.fillRect(scanX-10, pad.t, 10, rowH);
     ctx.strokeStyle = '#22c55e'; ctx.lineWidth=1.5; ctx.shadowColor='#22c55e'; ctx.shadowBlur=8;
     ctx.beginPath(); ctx.moveTo(scanX, pad.t); ctx.lineTo(scanX, pad.t+rowH); ctx.stroke(); ctx.shadowBlur=0;
  }
  
  // Draw Bottom Block (Adapted Map)
  if (phase >= 1) {
     const yOff = rowH + 10;
     const dropProgress = phase === 1 ? (loopT - 240)/60 : 1;
     
     ctx.fillStyle=`rgba(255,255,255,${0.12 * dropProgress})`;
     ctx.fillText('Channel Map Activo (Con AFH)',pad.l,pad.t+yOff-5);
     ctx.fillStyle=`rgba(0,0,0,${0.2 * dropProgress})`;ctx.fillRect(pad.l,pad.t+yOff,pW,rowH);
     
     for(let i=0; i<N; i++){
        if (isBad(i)) {
           // falling animation
           const curY = pad.t + 2 + dropProgress * yOff;
           ctx.fillStyle=`rgba(244,63,94,${0.45 * dropProgress})`;
           ctx.fillRect(pad.l+i*bW+.5, curY, bW-1, rowH-4);
        } else {
           // fade in
           ctx.fillStyle=`rgba(61,133,255,${0.6 * dropProgress})`;
           ctx.fillRect(pad.l+i*bW+.5, pad.t+yOff+2, bW-1, rowH-4);
        }
     }
     
     // Box exclusions
     ctx.strokeStyle=`rgba(245,158,11,${0.55 * dropProgress})`;ctx.lineWidth=1.5;
     ctx.fillStyle=`rgba(245,158,11,${0.45 * dropProgress})`;ctx.textAlign='center';
     [[24,45,'Ch6'],[46,67,'Ch11']].forEach(([s,e,l])=>{
       ctx.strokeRect(pad.l+s*bW,pad.t+yOff,(e-s)*bW,rowH);
       ctx.fillText(`WiFi ${l}`,pad.l+(s+(e-s)/2)*bW,pad.t+yOff+rowH-4);
     });
  }
  
  ctx.fillStyle='rgba(61,133,255,.55)';ctx.fillRect(pad.l,H-18,10,8);
  ctx.fillStyle='rgba(122,156,184,.35)';ctx.font='7px JetBrains Mono';ctx.textAlign='left';ctx.fillText('Canal bueno',pad.l+13,H-12);
  ctx.fillStyle='rgba(244,63,94,.45)';ctx.fillRect(pad.l+80,H-18,10,8);
  ctx.fillStyle='rgba(122,156,184,.35)';ctx.fillText('Interferido (AFH excluye)',pad.l+93,H-12);
  
  // Survival Counter
  if (counter) {
     let cVal = 79;
     if (phase === 1) cVal = Math.floor(79 - 44 * ((loopT - 240)/60));
     if (phase === 2) cVal = 35;
     
     counter.innerText = `${cVal} Canales Activos`;
     if (hover) {
        counter.style.color = (t % 20 < 10) ? '#f59e0b' : '#00d4ff';
        counter.style.textShadow = (t % 20 < 10) ? '0 0 8px #f59e0b' : 'none';
        counter.innerText += ' (LÍMITE: 20)';
     } else {
        counter.style.color = '#00d4ff';
        counter.style.textShadow = 'none';
     }
  }
}

// ════════════════════════════════════════
// S16 · GPS + 802.11b
// ════════════════════════════════════════
let appsT = 0;
let wifiMouse = null;

function animApps(){
  const cvW = document.getElementById('wifiCanvas');
  if (cvW && !cvW._bound) {
    cvW.addEventListener('mousemove', e => {
       const r = cvW.getBoundingClientRect();
       const scaleX = cvW.width / r.width;
       const scaleY = cvW.height / r.height;
       wifiMouse = {x: (e.clientX - r.left)*scaleX, y: (e.clientY - r.top)*scaleY};
    });
    cvW.addEventListener('mouseleave', () => wifiMouse = null);
    cvW._bound = true;
  }
  
  function draw() {
    if(!document.getElementById('s16').classList.contains('active')) return;
    drawGPS(appsT);
    drawWifi(appsT, wifiMouse);
    appsT++;
    rafMap[19] = requestAnimationFrame(draw);
  }
  draw();
}

function drawGPS(t){
  const r=setupCanvas(document.getElementById('gpsCanvas'));
  if(!r)return;
  const {ctx,W,H}=r;ctx.clearRect(0,0,W,H);
  
  const pad={t:16,r:12,b:16,l:12};
  const pW=W-pad.l-pad.r,pH=H-pad.t-pad.b,midY=pad.t+pH*.55;
  
  ctx.strokeStyle='rgba(255,255,255,.1)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(pad.l,midY);ctx.lineTo(pad.l+pW,midY);ctx.stroke();
  
  // Noise baseline
  ctx.beginPath();ctx.strokeStyle='rgba(0,200,150,.4)';ctx.lineWidth=1;
  for(let x=pad.l;x<=pad.l+pW;x+=2){
     const y=midY+Math.sin(x*.7+t*0.1)*8+Math.sin(x*2.3)*5+Math.sin(x*5.1)*3;
     x===pad.l?ctx.moveTo(x,y):ctx.lineTo(x,y);
  }
  ctx.stroke();
  
  // Scanner
  const scanDur = 240;
  const loopT = t % scanDur;
  const scanP = loopT / scanDur;
  const scanX = pad.l + scanP * pW;
  
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
  ctx.shadowColor = 'white'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(scanX, pad.t); ctx.lineTo(scanX, pad.t+pH); ctx.stroke();
  ctx.shadowBlur = 0;
  
  const targetP = 0.62;
  const peakX = pad.l + pW * targetP;
  const peakH = pH*.72;
  
  // Peak Lock Logic
  if (scanP >= targetP) {
     const age = loopT - targetP*scanDur;
     const currentPeakH = Math.min(1, age / 15) * peakH; // Springs up in 15 frames
     
     ctx.fillStyle='rgba(0,200,150,.18)';ctx.fillRect(peakX-7,midY-currentPeakH,14,currentPeakH);
     
     ctx.strokeStyle='rgba(0,200,150,.95)';ctx.lineWidth=2;
     ctx.shadowColor='rgba(0,200,150,1)';ctx.shadowBlur=14;
     ctx.beginPath();ctx.moveTo(peakX,midY);ctx.lineTo(peakX,midY-currentPeakH);ctx.stroke();
     ctx.shadowBlur=0;
     
     // Flash effect
     if (age < 10) {
        ctx.fillStyle = `rgba(255,255,255,${1 - age/10})`;
        ctx.beginPath(); ctx.arc(peakX, midY-currentPeakH, 15, 0, Math.PI*2); ctx.fill();
     }
     
     if (age > 15) {
        ctx.fillStyle='#00c896';ctx.font='bold 9px JetBrains Mono';ctx.textAlign='center';
        ctx.fillText('R(τₙ)=N=1023',peakX,midY-peakH-6);
        ctx.font='8px JetBrains Mono';ctx.fillStyle='rgba(0,200,150,.8)';
        ctx.fillText('Satélite Lock',peakX,midY-peakH-17);
     }
  }
  
  ctx.fillStyle='rgba(122,156,184,.35)';ctx.font='8px JetBrains Mono';ctx.textAlign='center';ctx.fillText('Retardo τ →',pad.l+pW/2,H-3);
  ctx.fillText('Salida correlador GPS C/A · G_p = 43.1 dB',pad.l+pW/2,pad.t+10);
}

function drawWifi(t, mouse){
  const r=setupCanvas(document.getElementById('wifiCanvas'));
  if(!r)return;
  const {ctx,W,H}=r;ctx.clearRect(0,0,W,H);
  
  const chFreq=[2412,2417,2422,2427,2432,2437,2442,2447,2452,2457,2462,2467,2472,2484];
  const pad={t:20,r:10,b:16,l:10};
  const pW=W-pad.l-pad.r,pH=H-pad.t-pad.b;
  const fMin=2400,fMax=2490,bw=22;
  const midY=pad.t+pH*.92;
  const peak=pH*.72;
  
  const drawTri = (cx, hw) => {
     ctx.beginPath();ctx.moveTo(cx-hw,midY);ctx.lineTo(cx,midY-peak);ctx.lineTo(cx+hw,midY);ctx.closePath();
  };
  
  const channels = chFreq.map((fc, i) => {
     const cx = pad.l+((fc-fMin)/(fMax-fMin))*pW;
     const hw = ((bw/2)/(fMax-fMin))*pW;
     const isNO = [1,6,11].includes(i+1);
     return {i: i+1, cx, hw, isNO};
  });
  
  let hoveredIntermediate = null;
  if (mouse) {
     for (const ch of channels) {
        if (!ch.isNO) {
           if (mouse.x > ch.cx - ch.hw && mouse.x < ch.cx + ch.hw && mouse.y > midY - peak && mouse.y < midY) {
              hoveredIntermediate = ch;
              break;
           }
        }
     }
  }
  
  // Draw intermediates first
  channels.filter(c => !c.isNO).forEach(ch => {
     drawTri(ch.cx, ch.hw);
     const pulse = 0.15 + Math.sin(t*0.05 + ch.cx*0.01)*0.05;
     
     ctx.fillStyle = `rgba(245,158,11,${pulse})`;
     ctx.strokeStyle = `rgba(245,158,11,${pulse*2})`; ctx.lineWidth=0.8;
     ctx.fill(); ctx.stroke();
  });
  
  // Draw primary non-overlapping
  channels.filter(c => c.isNO).forEach(ch => {
     drawTri(ch.cx, ch.hw);
     ctx.fillStyle = 'rgba(61,133,255,.2)';
     ctx.strokeStyle = 'rgba(61,133,255,.8)'; ctx.lineWidth=1.5;
     ctx.fill(); ctx.stroke();
     ctx.fillStyle='rgba(61,133,255,.9)';ctx.font='bold 8px JetBrains Mono';ctx.textAlign='center';
     ctx.fillText(`Ch${ch.i}`,ch.cx,pad.t+9);
  });
  
  // Highlight ACI overlaps if hovered
  if (hoveredIntermediate) {
     ctx.save();
     drawTri(hoveredIntermediate.cx, hoveredIntermediate.hw);
     ctx.clip(); // Restrict drawing to hovered intermediate triangle
     
     // Draw the main channels inside this clipped area in bright red
     channels.filter(c => c.isNO).forEach(ch => {
        drawTri(ch.cx, ch.hw);
        ctx.fillStyle = 'rgba(244,63,94,0.6)';
        ctx.fill();
     });
     
     ctx.restore(); // Remove clip
     
     // Draw an outline over the hovered intermediate to pop it out
     drawTri(hoveredIntermediate.cx, hoveredIntermediate.hw);
     ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.5; ctx.stroke();
     ctx.fillStyle='#f59e0b';ctx.font='bold 8px JetBrains Mono';ctx.textAlign='center';
     ctx.fillText(`Ch${hoveredIntermediate.i} ACI`,hoveredIntermediate.cx,pad.t+18);
  }
  
  ctx.strokeStyle='rgba(255,255,255,.1)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,midY);ctx.lineTo(pad.l+pW,midY);ctx.stroke();
  ctx.fillStyle='rgba(122,156,184,.35)';ctx.font='8px JetBrains Mono';ctx.textAlign='center';ctx.fillText('ISM 2.4 GHz · 2400–2490 MHz',pad.l+pW/2,H-3);
  ctx.fillText('Plan de Canales 802.11b · Pase el mouse para ver Interferencia ACI',pad.l+pW/2,pad.t+10);
  ctx.fillStyle='rgba(61,133,255,.4)';ctx.fillText('DSSS Barker-11 · 22 MHz/canal',pad.l+pW/2,pad.t+pH*.95);
}

// ════════════════════════════════════════
// S17 · CONCLUSION
// ════════════════════════════════════════
// ════════════════════════════════════════
// S17 · CONCLUSION
// ════════════════════════════════════════
let concT = 0;

function animConclusion(){
  const cv=document.getElementById('conclusionCanvas');
  if(!cv)return;
  const parent=cv.parentElement;
  cv.width=parent.offsetWidth;cv.height=parent.offsetHeight;
  const ctx=cv.getContext('2d');
  
  const metricVals = document.querySelectorAll('.cm-val');
  const cmBoxes = document.querySelectorAll('.cm');
  const quoteEl = document.querySelector('.conclusion-quote');
  
  if (quoteEl && !quoteEl._originalText) {
     quoteEl._originalText = quoteEl.innerText;
  }
  
  // Reset sequence when entering slide
  const slide = document.getElementById('s17');
  if (slide && !slide._concBound) {
     const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
           if (mutation.attributeName === 'class') {
              if (slide.classList.contains('active')) {
                 concT = 0; // Restart animation
                 if (quoteEl) quoteEl.innerText = '';
                 cmBoxes.forEach(b => { b.style.boxShadow = 'none'; b.style.borderColor = 'rgba(255,255,255,0.05)'; });
              }
           }
        });
     });
     observer.observe(slide, { attributes: true });
     slide._concBound = true;
  }
  
  function draw(){
    if(!document.getElementById('s17').classList.contains('active')) return;
    const W=cv.width,H=cv.height;
    ctx.clearRect(0,0,W,H);
    
    // Background ambient circles
    for(let i=0;i<6;i++){
      const rad=((concT*1.5+i*72)%600)+40;
      const alpha=1-rad/640;
      ctx.beginPath();ctx.arc(W/2,H/2,rad,0,Math.PI*2);
      ctx.strokeStyle=`rgba(0,212,255,${alpha*.1})`;ctx.lineWidth=1.5;ctx.stroke();
    }
    
    // Background ambient waves
    [[H*.2,'rgba(0,212,255,.28)',.01,.028,32,2],[H*.5,'rgba(61,133,255,.22)',.015,.042,22,1.5],[H*.8,'rgba(124,58,237,.18)',.02,.052,18,1.5]].forEach(([y,col,f,spd,a,lw])=>{
      ctx.beginPath();ctx.strokeStyle=col;ctx.lineWidth=lw;
      for(let x=0;x<=W;x+=4){
         const wy=y+Math.sin(x*f+concT*spd)*a+Math.sin(x*f*2+concT*spd*.7)*(a*.3);
         x===0?ctx.moveTo(x,wy):ctx.lineTo(x,wy);
      }
      ctx.stroke();
    });
    
    // DOM Animations
    // 1. Metrics Count-Up (0 to 120 frames)
    if (metricVals.length === 4) {
       const p = Math.min(1, concT / 120);
       metricVals[0].innerText = (p * 43.1).toFixed(1) + ' dB';
       metricVals[1].innerText = Math.floor(p * 5) + '×10⁹';
       metricVals[2].innerText = Math.floor(p * 31);
       metricVals[3].innerText = '<' + Math.max(3, Math.floor(30 - p*27)) + ' m';
       
       if (concT === 120) {
          cmBoxes.forEach(b => { 
             b.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.4)'; 
             b.style.borderColor = 'rgba(0, 212, 255, 0.5)';
             setTimeout(() => {
                b.style.boxShadow = 'none';
                b.style.borderColor = 'rgba(255,255,255,0.05)';
             }, 300);
          });
       }
    }
    
    // 2. Quote Decrypt (60 to 240 frames)
    if (quoteEl && quoteEl._originalText && concT > 60) {
       const txt = quoteEl._originalText;
       const decP = Math.min(1, (concT - 60) / 180);
       const charsRevealed = Math.floor(decP * txt.length);
       
       let displayTxt = txt.substring(0, charsRevealed);
       const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
       for(let i=charsRevealed; i<txt.length; i++){
          if (txt[i] === ' ' || txt[i] === '\n') displayTxt += txt[i];
          else displayTxt += chars[Math.floor(Math.random() * chars.length)];
       }
       quoteEl.innerText = displayTxt;
    }
    
    drawTimeline(concT);
    concT++;
    rafMap[21]=requestAnimationFrame(draw);
  }
  draw();
}

function drawTimeline(t){
  const cv=document.getElementById('timelineCanvas');
  if(!cv)return;
  const parent=cv.parentElement;
  cv.width=parent.offsetWidth;cv.height=parent.offsetHeight;
  const ctx=cv.getContext('2d');
  
  const W=cv.width,H=cv.height;
  const events=[
    {year:1942,label:'Lamarr\nPatente FH',col:'#7c3aed'},
    {year:1948,label:'Shannon\nTeorema',col:'#00d4ff'},
    {year:1978,label:'GPS\nInicio',col:'#00c896'},
    {year:1995,label:'CDMA\nIS-95',col:'#3d85ff'},
    {year:1999,label:'IEEE\n802.11b',col:'#3d85ff'},
    {year:2003,label:'BT AFH\nv1.2',col:'#00d4ff'},
    {year:2019,label:'5G NR\nZC Seq.',col:'#7c3aed'},
  ];
  const minY=1938,maxY=2025;
  const pad={l:24,r:24};
  const pW=W-pad.l-pad.r,midY=H/2;
  
  const drawProgress = Math.min(1, t / 200);
  const currentX = pad.l + drawProgress * pW;
  
  // Base line
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1.5;
  ctx.beginPath();ctx.moveTo(pad.l,midY);ctx.lineTo(pad.l+pW,midY);ctx.stroke();
  
  // Active drawn line
  const g=ctx.createLinearGradient(pad.l,0,currentX,0);
  g.addColorStop(0,'rgba(0,212,255,0)');
  g.addColorStop(0.2,'rgba(0,212,255,.8)');
  g.addColorStop(0.8,'rgba(124,58,237,.8)');
  g.addColorStop(1,'rgba(124,58,237,1)');
  
  ctx.strokeStyle=g;ctx.lineWidth=2;ctx.shadowColor='rgba(124,58,237,0.5)';ctx.shadowBlur=10;
  ctx.beginPath();ctx.moveTo(pad.l,midY);ctx.lineTo(currentX,midY);ctx.stroke();ctx.shadowBlur=0;
  
  events.forEach((ev,i)=>{
    const x=pad.l+((ev.year-minY)/(maxY-minY))*pW;
    if (x > currentX) return; // Not reached yet
    
    // Node appearance animation
    const age = Math.max(0, currentX - x);
    const pulseScale = age < 20 ? 1 + (20-age)/10 : 1;
    const fade = Math.min(1, age / 10);
    
    const above=i%2===0;const lh=above?-22:22;
    ctx.strokeStyle=`rgba(${hexToRgb(ev.col)},${0.55 * fade})`;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(x,midY);ctx.lineTo(x,midY+lh * fade);ctx.stroke();
    
    ctx.beginPath();ctx.arc(x,midY,4 * pulseScale,0,Math.PI*2);
    ctx.fillStyle=ev.col;
    ctx.shadowColor=ev.col;ctx.shadowBlur=15 * pulseScale;
    ctx.fill();ctx.shadowBlur=0;
    
    ctx.fillStyle=`rgba(${hexToRgb(ev.col)},${0.9 * fade})`;
    ctx.font='bold 7px JetBrains Mono';ctx.textAlign='center';
    ctx.fillText(ev.year, x, midY+lh*fade+(above?-8:12));
    
    ev.label.split('\n').forEach((l,k)=>{
       ctx.fillStyle=`rgba(176,208,232,${0.7 * fade})`;
       ctx.font='7px JetBrains Mono';
       ctx.fillText(l, x, midY+lh*fade+(above?-(20+k*9):(22+k*9)));
    });
    
     if (age > 0 && age < 30) {
       ctx.beginPath();ctx.arc(x,midY,4 + age*1.5,0,Math.PI*2);
       ctx.strokeStyle=`rgba(${hexToRgb(ev.col)},${1 - age/30})`;
       ctx.lineWidth=2;ctx.stroke();
     }
  });
}

// ════════════════════════════════════════
// S11-1 · BARKER SYNC SIMULATOR
// ════════════════════════════════════════
function animBarker() {
  const cv = document.getElementById('barkerCanvas');
  if(!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.width = cv.parentElement.offsetWidth;
  const H = cv.height = cv.parentElement.offsetHeight;
  
  const barker = [1, -1, 1, 1, -1, 1, 1, 1, -1, -1, -1];
  let bkT = 0;
  
  const st = document.getElementById('bkStatus');
  const eBar = document.getElementById('bkEnergyBar');
  const tauLbl = document.getElementById('bkTau');
  
  const chips = 11;
  const chipW = W * 0.05;
  const startX = W * 0.225;
  
  function draw() {
    if(!document.getElementById('s11-barker').classList.contains('active')) return;
    ctx.clearRect(0, 0, W, H);
    
    const cycle = 350;
    const progress = (bkT % cycle) / cycle; 
    const slideOffset = (progress - 0.5) * (chipW * chips * 2);
    const currentShift = Math.round(slideOffset / chipW);
    
    let corr = 0;
    for(let i=0; i<chips; i++) {
       const j = i - currentShift;
       if (j >= 0 && j < chips) {
          corr += barker[i] * barker[j];
       }
    }
    
    const isMatch = (currentShift === 0);
    
    if (st && eBar && tauLbl) {
      if (isMatch) {
         st.innerText = "ENGANCHADO (MATCH)";
         st.style.color = "#00c896";
         st.style.textShadow = "0 0 15px #00c896";
         eBar.style.width = "100%";
         eBar.style.background = "#00c896";
         eBar.style.boxShadow = "0 0 15px #00c896";
         tauLbl.innerText = "τ = 0 (ALINEADO)";
         tauLbl.style.color = "#00c896";
      } else {
         st.innerText = "BUSCANDO...";
         st.style.color = "#f59e0b";
         st.style.textShadow = "0 0 10px #f59e0b";
         eBar.style.width = Math.max(5, (Math.abs(corr)/11)*100) + "%";
         eBar.style.background = "#f59e0b";
         eBar.style.boxShadow = "0 0 10px #f59e0b";
         tauLbl.innerText = "τ = " + (currentShift > 0 ? '+' : '') + currentShift + " Tc";
         tauLbl.style.color = "var(--cyan)";
      }
    }
    
    const yRx = H * 0.25;
    const amp = H * 0.08;
    
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for(let i=0; i<chips; i++) {
       const b = barker[i];
       const x = startX + i*chipW;
       ctx.lineTo(x, yRx - b*amp);
       ctx.lineTo(x + chipW, yRx - b*amp);
    }
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(0, 212, 255, 0.5)';
    ctx.font = '12px var(--mono)';
    ctx.fillText("SEÑAL RX (CON RUIDO)", startX, yRx - amp - 20);
    
    const yRef = H * 0.55;
    const refX = startX + slideOffset;
    
    ctx.strokeStyle = isMatch ? '#00c896' : '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for(let i=0; i<chips; i++) {
       const b = barker[i];
       const x = refX + i*chipW;
       ctx.lineTo(x, yRef - b*amp);
       ctx.lineTo(x + chipW, yRef - b*amp);
    }
    ctx.stroke();
    
    ctx.fillStyle = isMatch ? 'rgba(0, 200, 150, 0.5)' : 'rgba(245, 158, 11, 0.5)';
    ctx.fillText("RÉPLICA LOCAL", refX, yRef - amp - 20);
    
    const yCorr = H * 0.85;
    const corrAmp = H * 0.1; 
    const baseLine = yCorr + corrAmp*0.8;
    
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX - chipW*chips, baseLine);
    for(let shift = -chips; shift <= chips; shift++) {
       let c = 0;
       for(let i=0; i<chips; i++) {
          const j = i - shift;
          if(j>=0 && j<chips) c += barker[i]*barker[j];
       }
       const x = startX + shift*chipW + (chipW*chips)/2;
       const y = baseLine - (c/11)*corrAmp*1.5;
       ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    const activeX = startX + currentShift*chipW + (chipW*chips)/2;
    const activeY = baseLine - (corr/11)*corrAmp*1.5;
    
    ctx.fillStyle = isMatch ? '#00c896' : '#f59e0b';
    ctx.beginPath();
    ctx.arc(activeX, activeY, isMatch ? 8 : 5, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowColor = isMatch ? '#00c896' : '#f59e0b';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;
    
    if(isMatch) {
       ctx.strokeStyle = 'rgba(0, 200, 150, 0.3)';
       ctx.lineWidth = 1;
       ctx.setLineDash([5,5]);
       ctx.beginPath();
       ctx.moveTo(startX, yRx);
       ctx.lineTo(startX, baseLine);
       ctx.moveTo(startX + chipW*chips, yRx);
       ctx.lineTo(startX + chipW*chips, baseLine);
       ctx.stroke();
       ctx.setLineDash([]);
       
       ctx.fillStyle = "rgba(0, 200, 150, " + Math.max(0, 0.3 - (bkT%cycle)*0.01) + ")";
       ctx.fillRect(startX, yRx - amp - 10, chipW*chips, yRef - yRx + amp*2);
    }

    bkT++;
    rafMap[10] = requestAnimationFrame(draw);
  }
  draw();
}

// ════════════════════════════════════════
// S11-2 · BARKER DASHBOARD (CHIP x CHIP)
// ════════════════════════════════════════
function animBarkerDash() {
  const row1 = document.getElementById('bkd-row1');
  const row2 = document.getElementById('bkd-row2');
  const row3 = document.getElementById('bkd-row3');
  const slider = document.getElementById('bkd-lag-slider');
  const lagVal = document.getElementById('bkd-lag-val');
  const sumVal = document.getElementById('bkd-sum-val');
  const energyBar = document.getElementById('bkd-energy-bar');
  const ledBulb = document.getElementById('bkd-led-bulb');
  const ledText = document.getElementById('bkd-led-text');
  
  if (!row1 || !row2 || !row3) return;
  
  const barker = [1, -1, 1, 1, -1, 1, 1, 1, -1, -1, -1];
  const blockW = 38;
  const gap = 4;
  const fullW = barker.length * (blockW + gap);
  
  if (row1.children.length === 0) {
     barker.forEach((val, i) => {
        const b1 = document.createElement('div');
        b1.className = 'bkd-block';
        b1.innerHTML = val > 0 ? '+1' : '-1';
        b1.style.background = val > 0 ? 'rgba(0,212,255,0.1)' : 'rgba(244,63,94,0.1)';
        b1.style.border = `1px solid ${val > 0 ? '#00d4ff' : '#f43f5e'}`;
        b1.style.color = val > 0 ? '#00d4ff' : '#f43f5e';
        row1.appendChild(b1);
        
        const b2 = document.createElement('div');
        b2.className = 'bkd-block';
        b2.innerHTML = val > 0 ? '+1' : '-1';
        b2.style.background = val > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(244,63,94,0.1)';
        b2.style.border = `1px solid ${val > 0 ? '#f59e0b' : '#f43f5e'}`;
        b2.style.color = val > 0 ? '#f59e0b' : '#f43f5e';
        row2.appendChild(b2);
        
        const b3 = document.createElement('div');
        b3.className = 'bkd-block';
        b3.id = `bkd-res-${i}`;
        row3.appendChild(b3);
     });
  }
  
  function updateDash() {
     const lag = parseInt(slider.value);
     lagVal.innerText = lag > 0 ? '+' + lag : lag;
     
     const offsetPx = lag * (blockW + gap);
     row2.style.transform = `translateX(calc(-50% + ${offsetPx}px))`;
     
     let sum = 0;
     const resBlocks = row3.children;
     
     for (let i = 0; i < barker.length; i++) {
        const j = i - lag;
        const rb = resBlocks[i];
        
        if (j >= 0 && j < barker.length) {
           const mult = barker[i] * barker[j];
           sum += mult;
           rb.innerHTML = mult > 0 ? '+1' : '-1';
           rb.style.opacity = '1';
           if (lag === 0) {
              rb.style.background = 'rgba(0,200,150,0.3)';
              rb.style.border = '1px solid #00c896';
              rb.style.color = '#00c896';
              rb.style.boxShadow = '0 0 15px #00c896';
           } else {
              rb.style.background = mult > 0 ? 'rgba(217,70,239,0.1)' : 'rgba(255,255,255,0.05)';
              rb.style.border = `1px solid ${mult > 0 ? '#d946ef' : 'rgba(255,255,255,0.2)'}`;
              rb.style.color = mult > 0 ? '#d946ef' : 'rgba(255,255,255,0.5)';
              rb.style.boxShadow = 'none';
           }
        } else {
           rb.innerHTML = '';
           rb.style.opacity = '0.2';
           rb.style.background = 'transparent';
           rb.style.border = '1px dashed rgba(255,255,255,0.2)';
           rb.style.boxShadow = 'none';
        }
     }
     
     sumVal.innerText = sum > 0 ? '+' + sum : sum;
     
     if (lag === 0) {
        energyBar.style.width = '100%';
        energyBar.style.background = '#00c896';
        energyBar.style.boxShadow = '0 0 20px #00c896';
        
        ledBulb.style.background = '#00c896';
        ledBulb.style.boxShadow = '0 0 20px #00c896';
        ledText.innerText = '¡ALERTA: SEÑAL ENGANCHADA (LOCK)!';
        ledText.style.color = '#00c896';
        ledText.style.textShadow = '0 0 10px #00c896';
     } else {
        const pct = Math.max(0, Math.min(100, (Math.abs(sum) / 11) * 100));
        energyBar.style.width = Math.max(5, pct) + '%';
        energyBar.style.background = 'rgba(255,255,255,0.3)';
        energyBar.style.boxShadow = 'none';
        
        ledBulb.style.background = '#f59e0b';
        ledBulb.style.boxShadow = '0 0 10px #f59e0b';
        ledText.innerText = 'BUSCANDO...';
        ledText.style.color = '#f59e0b';
        ledText.style.textShadow = '0 0 10px #f59e0b';
     }
  }
  
  slider.oninput = updateDash;
  updateDash();
  
  if (!document.getElementById('bkd-styles')) {
     const st = document.createElement('style');
     st.id = 'bkd-styles';
     st.innerHTML = `
        .bkd-block {
           width: 38px; height: 40px; border-radius: 6px;
           display: flex; align-items: center; justify-content: center;
           font-family: var(--mono); font-weight: bold; font-size: 1.1rem;
           transition: all 0.2s;
        }
        input[type=range]#bkd-lag-slider {
           -webkit-appearance: none; background: rgba(255,255,255,0.1);
           height: 4px; border-radius: 2px; outline: none;
        }
        input[type=range]#bkd-lag-slider::-webkit-slider-thumb {
           -webkit-appearance: none; width: 16px; height: 16px;
           border-radius: 50%; background: #00d4ff; box-shadow: 0 0 10px #00d4ff;
           cursor: pointer;
        }
     `;
     document.head.appendChild(st);
  }
}
