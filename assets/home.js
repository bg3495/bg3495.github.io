/* Bryan Gao — homepage interactions. No dependencies. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const root = document.documentElement;
  const cssv = (n) => getComputedStyle(root).getPropertyValue(n).trim();
  let colors = {}; const readColors = () => (colors = { acc: cssv('--hl'), faint: cssv('--faint'), ink: cssv('--ink'), line: cssv('--line') });
  readColors();

  /* theme: circular reveal from the switch */
  $('#theme').addEventListener('click', (e) => {
    const flip = () => { const next = root.dataset.theme === 'light' ? 'dark' : 'light'; root.dataset.theme = next; try { localStorage.setItem('bg-theme2', next); } catch (err) {} readColors(); };
    if (!document.startViewTransition || reduce) return flip();
    const r = e.currentTarget.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(flip).ready.then(() => root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`] },
      { duration: 650, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' }));
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { setFocus(null); closeModal(); }
    if (e.key.toLowerCase() === 'd' && !e.metaKey && !e.ctrlKey && !/input|select|textarea/i.test(e.target.tagName)) $('#theme').click();
  });

  /* name: split into letters */
  const nameEl = $('#name');
  nameEl.innerHTML = [...nameEl.textContent].map((c, i) => c === ' ' ? '<span class="ch sp"> </span>' : `<span class="ch${i > 5 ? ' it' : ''}" style="--i:${i}" aria-hidden="true">${c}</span>`).join('');

  /* reveal + counters */
  const countUp = (el) => {
    const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0); if (reduce) return;
    const t0 = performance.now();
    const step = (t) => { const p = Math.min(1, (t - t0) / 1400), e = 1 - Math.pow(1 - p, 4); el.textContent = (to * e).toFixed(dec); if (p < 1) requestAnimationFrame(step); else el.textContent = to.toFixed(dec); };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return; e.target.classList.add('in'); $$('[data-count]', e.target).forEach(countUp); io.unobserve(e.target);
  }), { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  $$('[data-r]').forEach((el) => {
    const sibs = el.parentElement ? $$(':scope > [data-r]', el.parentElement) : [el];
    el.style.transitionDelay = Math.min(sibs.indexOf(el), 6) * 0.07 + (el.closest('.hero') ? 0.5 : 0) + 's'; io.observe(el);
  });

  /* nav + progress + timeline rail */
  const bar = $('#bar'), links = $$('#navlinks a'), secs = links.map((a) => $(a.getAttribute('href')));
  const railFill = $('#railFill'), timeline = $('#timeline'); let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY, h = root.scrollHeight - innerHeight;
    $('#progress').style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    let cur = -1; secs.forEach((s, k) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.45) cur = k; });
    links.forEach((a, k) => a.classList.toggle('cur', k === cur));
    bar.classList.toggle('scrolled', y > 20); bar.classList.toggle('hide', y > lastY && y > 600); lastY = y;
    const r = timeline.getBoundingClientRect();
    railFill.style.height = Math.max(0, Math.min(1, (innerHeight * 0.6 - r.top) / r.height)) * 100 + '%';
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* pointer glow, tile spotlight, tilt, magnetic buttons */
  let gx = -900, gy = -900, tx = -900, ty = -900; const glow = $('#glow');
  if (fine && !reduce) {
    addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    (function g() { gx += (tx - gx) * 0.12; gy += (ty - gy) * 0.12; glow.style.setProperty('--gx', gx + 'px'); glow.style.setProperty('--gy', gy + 'px'); requestAnimationFrame(g); })();
    $$('.tilt').forEach((c) => {
      c.addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(); c.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 5 + 'deg'); c.style.setProperty('--rx', -((e.clientY - r.top) / r.height - 0.5) * 5 + 'deg'); });
      c.addEventListener('pointerleave', () => { c.style.setProperty('--ry', '0deg'); c.style.setProperty('--rx', '0deg'); });
    });
    $$('.mag').forEach((b) => {
      b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`; });
      b.addEventListener('pointerleave', () => { b.style.transition = 'transform .5s cubic-bezier(.3,1.6,.5,1), border-color .25s, background .25s, color .25s'; b.style.transform = ''; setTimeout(() => (b.style.transition = ''), 500); });
    });
  }
  document.addEventListener('pointermove', (e) => {
    const c = e.target.closest && e.target.closest('.tile, .paper'); if (!c) return;
    const r = c.getBoundingClientRect(); c.style.setProperty('--sx', e.clientX - r.left + 'px'); c.style.setProperty('--sy', e.clientY - r.top + 'px');
  }, { passive: true });

  /* hero field: a jittery dot grid that snaps into order near the pointer */
  const cv = $('#field'), ctx = cv.getContext('2d'), hero = $('#hero');
  let W = 0, H = 0, pts = [], fx = 0, fy = 0, px = null, py = null, heroVisible = true;
  const build = () => {
    const r = hero.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gap = W < 700 ? 24 : 30; pts = [];
    for (let y = gap / 2; y < H; y += gap) for (let x = gap / 2; x < W; x += gap) pts.push({ x, y, a: Math.random() * 6.28, s: 0.5 + Math.random(), r: 5 + Math.random() * 9 });
    fx = W * 0.72; fy = H * 0.42;
  };
  build(); addEventListener('resize', () => { build(); if (reduce) drawField(0); });
  hero.addEventListener('pointermove', (e) => { const r = hero.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; });
  hero.addEventListener('pointerleave', () => { px = py = null; });
  new IntersectionObserver((es) => (heroVisible = es[0].isIntersecting)).observe(hero);
  const drawField = (t) => {
    const tgx = px ?? W * (0.66 + 0.2 * Math.sin(t / 2600)), tgy = py ?? H * (0.42 + 0.22 * Math.sin(t / 1900 + 1));
    fx += (tgx - fx) * 0.07; fy += (tgy - fy) * 0.07;
    const sig = Math.max(150, W * 0.14), s2 = 2 * sig * sig;
    ctx.clearRect(0, 0, W, H);
    for (const p of pts) {
      const d2 = (p.x - fx) ** 2 + (p.y - fy) ** 2, k = Math.exp(-d2 / s2), n = 1 - k;
      const x = p.x + Math.cos(p.a + (t / 900) * p.s) * p.r * n, y = p.y + Math.sin(p.a * 1.7 + (t / 1100) * p.s) * p.r * n;
      ctx.globalAlpha = 0.16 + 0.84 * k; ctx.fillStyle = k > 0.18 ? colors.acc : colors.faint;
      ctx.beginPath(); ctx.arc(x, y, 1 + 1.5 * k, 0, 6.29); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  if (reduce) { drawField(0); addEventListener('load', () => { build(); drawField(0); }); } else (function loop(t) { if (heroVisible) drawField(t); requestAnimationFrame(loop); })(0);

  /* decode text: noisy glyphs resolve into the phrase */
  const scr = $('#scr'), PH = ['robust video understanding', 'agents that repair what they see', 'RL post-training of VLMs', 'infection estimates from microscopy', 'data a model is actually missing'], GL = '▓▒░<>/\\|=+*#%&01';
  if (!reduce) {
    let k = 0;
    const decode = (txt) => new Promise((res) => {
      const t0 = performance.now(), dur = 900;
      const step = (t) => { const p = Math.min(1, (t - t0) / dur);
        scr.textContent = [...txt].map((c, i) => (c === ' ' || i / txt.length < p ? c : GL[(Math.random() * GL.length) | 0])).join('');
        if (p < 1) requestAnimationFrame(step); else res(); };
      requestAnimationFrame(step);
    });
    (async function run() { for (;;) { await decode(PH[k]); await new Promise((r) => setTimeout(r, 2400)); k = (k + 1) % PH.length; } })();
  }

  /* ticker */
  const TK = ['Video MLLMs', 'Agentic perception', 'Robustness under corruption', 'Tool use', 'RL post-training', 'Verifiable rewards', 'Data selection', 'Vision foundation models', 'Weak supervision', 'High-content screening'];
  const tkh = TK.map((x) => `<span>${x}</span>`).join(''); $('#tk').innerHTML = tkh + tkh;

  /* Ann Arbor clock */
  const clock = $('#clock'), csub = $('#clockSub');
  const tick = () => { try { const d = new Date();
    clock.textContent = d.toLocaleTimeString('en-US', { timeZone: 'America/Detroit', hour: '2-digit', minute: '2-digit', hour12: false });
    const hr = +d.toLocaleTimeString('en-US', { timeZone: 'America/Detroit', hour: '2-digit', hour12: false }).slice(0, 2);
    csub.textContent = hr < 6 ? 'probably asleep' : hr < 12 ? 'morning, local time' : hr < 18 ? 'afternoon, local time' : 'evening, local time'; } catch (e) {} };
  tick(); setInterval(tick, 20000);

  /* toast + copy */
  let tt; const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2400); };
  const copy = async (txt) => { try { await navigator.clipboard.writeText(txt); } catch (e) { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e2) {} ta.remove(); } };
  $('#copyMail').addEventListener('click', async (e) => { const b = e.currentTarget; await copy(b.dataset.mail); toast('Copied ' + b.dataset.mail); const s = $('span', b); s.textContent = 'Copied ✓'; setTimeout(() => (s.textContent = 'Copy email'), 1600); });

  /* interests highlight related work */
  const chips = $$('#focus .chips button'); let active = null;
  const setFocus = (k) => {
    active = k; document.body.classList.toggle('filtering', !!k);
    $$('[data-tags]').forEach((el) => el.classList.toggle('hit', !!k && el.dataset.tags.split(' ').includes(k)));
    chips.forEach((c) => c.setAttribute('aria-pressed', c.dataset.k === k));
  };
  chips.forEach((c) => c.addEventListener('click', () => { setFocus(active === c.dataset.k ? null : c.dataset.k); if (active) toast(c.textContent + ': related work is highlighted below'); }));

  /* experience filter */
  const segEl = $('#expSeg'), knob = $('.knob', segEl);
  const place = () => { const b = $('button[aria-pressed="true"]', segEl); knob.style.width = b.offsetWidth + 'px'; knob.style.transform = `translateX(${b.offsetLeft - 3}px)`; };
  segEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return;
    $$('button', segEl).forEach((x) => x.setAttribute('aria-pressed', x === b)); place();
    $$('.tl').forEach((t) => t.classList.toggle('hide', b.dataset.v !== 'all' && t.dataset.kind !== b.dataset.v)); onScroll(); });
  addEventListener('resize', place); requestAnimationFrame(place); document.fonts && document.fonts.ready.then(place);

  /* 384-well plate */
  const plate = $('#plate'), read = $('#plateRead'), ROLE = { v: 'virus-only control', t: 'treatment well (virus + compound)', m: 'mock control (no virus)' };
  const NOTE = { v: 'Infected and uninfected cells are mixed here, which is where the label noise comes from.', t: 'Unknown infection prevalence: the quantity the model estimates.', m: 'Negative reference: infection expected near zero.' };
  let h = '';
  for (let r = 0; r < 16; r++) for (let c = 0; c < 24; c++) { const k = c === 0 ? 'v' : c >= 22 ? 'm' : 't';
    h += `<i class="${k}" data-r="${r}" data-c="${c}" style="--d:${(r + c) * 14};--o:${k === 't' ? (0.35 + 0.35 * Math.abs(Math.sin(r * 1.7 + c * 0.9))).toFixed(2) : 0.9}"></i>`; }
  plate.innerHTML = h; const wells = $$('i', plate);
  plate.addEventListener('pointermove', (e) => { const w = e.target.closest('i'); if (!w) return; const k = w.classList[0];
    read.innerHTML = `<b>${'ABCDEFGHIJKLMNOP'[+w.dataset.r]}${+w.dataset.c + 1}</b> · ${ROLE[k]}<br>${NOTE[k]}`; });
  $$('.legend span').forEach((s) => { const k = $('i', s).className;
    s.addEventListener('pointerenter', () => { plate.classList.add('dim'); wells.forEach((w) => w.classList.toggle('on', w.classList.contains(k))); read.innerHTML = `<b>${{ v: 16, t: 336, m: 32 }[k]} wells per plate</b> · ${ROLE[k]}<br>${NOTE[k]}`; });
    s.addEventListener('pointerleave', () => { plate.classList.remove('dim'); wells.forEach((w) => w.classList.remove('on')); }); });

  /* GRAFT: illustrative concept graph where isolated concepts get connected */
  const gw = $('#graft'), gc = $('canvas', gw), g = gc.getContext('2d');
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const nodes = []; for (let i = 0; i < 46; i++) nodes.push({ x: 0.06 + rnd() * 0.88, y: 0.1 + rnd() * 0.72, iso: i % 5 === 0, ph: rnd() * 6.28, lit: 0 });
  const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2, base = [], grow = [];
  nodes.forEach((a, i) => { const near = nodes.map((b, j) => [d2(a, b), j]).filter(([, j]) => j !== i).sort((p, q) => p[0] - q[0]);
    if (!a.iso) near.slice(0, 2).forEach(([, j]) => { if (!nodes[j].iso) base.push([i, j]); });
    else near.filter(([, j]) => !nodes[j].iso).slice(0, 2).forEach(([, j]) => grow.push([i, j, grow.length])); });
  let gr; const gsize = () => { gr = gw.getBoundingClientRect(); const dpr = Math.min(2, devicePixelRatio || 1); gc.width = gr.width * dpr; gc.height = gr.height * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
  gsize(); addEventListener('resize', () => { gsize(); drawGraft(8000); });
  let gVis = false; new IntersectionObserver((es) => (gVis = es[0].isIntersecting)).observe(gw);
  const drawGraft = (t) => {
    const Wg = gr.width, Hg = gr.height; g.clearRect(0, 0, Wg, Hg);
    const P = (n) => [n.x * Wg + Math.sin(t / 1800 + n.ph) * 3, n.y * Hg + Math.cos(t / 2100 + n.ph) * 3];
    g.lineWidth = 1; g.strokeStyle = colors.faint; g.globalAlpha = 0.5;
    base.forEach(([i, j]) => { const [x1, y1] = P(nodes[i]), [x2, y2] = P(nodes[j]); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); });
    const cyc = reduce ? 0.9 : (t / 9000) % 1, fade = cyc > 0.92 ? (1 - cyc) / 0.08 : 1;
    nodes.forEach((n) => (n.lit = 0)); g.strokeStyle = colors.acc; g.lineWidth = 2;
    grow.forEach(([i, j, k]) => { const p = Math.max(0, Math.min(1, (cyc * 1.25 - (k / grow.length) * 0.8) / 0.18));
      nodes[i].lit = Math.max(nodes[i].lit, p * fade); if (p <= 0) return; const [x1, y1] = P(nodes[i]), [x2, y2] = P(nodes[j]);
      g.globalAlpha = 0.9 * fade; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 + (x2 - x1) * p, y1 + (y2 - y1) * p); g.stroke(); });
    nodes.forEach((n) => { const [x, y] = P(n); g.beginPath(); g.arc(x, y, n.iso ? 5 : 3.2, 0, 6.29);
      if (n.iso) { g.fillStyle = colors.acc; g.globalAlpha = 0.12 + 0.88 * n.lit; g.fill(); g.globalAlpha = 1; g.strokeStyle = colors.acc; g.lineWidth = 1.8; g.stroke(); }
      else { g.fillStyle = colors.ink; g.globalAlpha = 0.6; g.fill(); } });
    g.globalAlpha = 1;
  };
  drawGraft(8000); addEventListener('load', () => { gsize(); drawGraft(8000); }); if (!reduce) (function loop(t) { if (gVis) drawGraft(t); requestAnimationFrame(loop); })(0);

  /* soon buttons + BibTeX modal */
  $$('[data-soon]').forEach((b) => b.addEventListener('click', () => toast(b.dataset.soon)));
  const BIB = { vira: `@article{gao2026vira,\n  title   = {ViRA: Agentic Recovery for Robust Video Understanding under Corruption},\n  author  = {Gao, Bryan and Zhang, Ce and Jin, Bojiang and Feng, Weiguo},\n  journal = {arXiv preprint},\n  year    = {2026}\n}` };
  const modal = $('#modal'); function closeModal() { modal.classList.remove('open'); }
  $$('[data-bib]').forEach((b) => b.addEventListener('click', () => { $('#bibText').textContent = BIB[b.dataset.bib]; modal.classList.add('open'); }));
  $('#bibClose').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  $('#bibCopy').addEventListener('click', async () => { await copy($('#bibText').textContent); toast('BibTeX copied'); closeModal(); });
})();
