/* Bryan Gao — homepage interactions. No dependencies. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const cssv = (n) => getComputedStyle(root).getPropertyValue(n).trim();

  /* theme (circular reveal) */
  $('#theme').addEventListener('click', (e) => {
    const flip = () => {
      const cur = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = cur === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('bg-theme', next); } catch (err) {}
    };
    if (!document.startViewTransition || reduce) return flip();
    const r = e.currentTarget.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(flip).ready.then(() => root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`] },
      { duration: 620, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' }));
  });
  addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'd' && !e.metaKey && !e.ctrlKey && !/input|select|textarea/i.test(e.target.tagName)) $('#theme').click(); });

  /* reveal + counters */
  const countUp = (el) => {
    const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
    if (reduce) { el.textContent = to.toFixed(dec); return; }
    const t0 = performance.now();
    const step = (t) => { const p = Math.min(1, (t - t0) / 1300), e = 1 - Math.pow(1 - p, 3); el.textContent = (to * e).toFixed(dec); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); $$('[data-count]', e.target).forEach(countUp); io.unobserve(e.target);
  }), { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  $$('[data-r]').forEach((el, i) => { el.style.transitionDelay = (el.closest('.hero') ? i * 0.09 : 0) + 's'; io.observe(el); });
  $$('.sec-head h2').forEach((h) => { h.innerHTML = h.textContent.split(' ').map((w, i) => `<span class="wd" style="--i:${i}">${w}</span>`).join(' '); });

  /* nav */
  const island = $('#island'), pill = $('#pill'), links = $$('#navlinks a'), secs = links.map((a) => $(a.getAttribute('href')));
  let lastY = scrollY, cur = -1;
  const movePill = (i) => {
    links.forEach((a, k) => a.classList.toggle('cur', k === i));
    if (i < 0) { pill.style.opacity = 0; return; }
    const a = links[i]; pill.style.opacity = 1; pill.style.width = a.offsetWidth + 'px'; pill.style.transform = `translateX(${a.offsetLeft}px)`;
  };
  const railFill = $('#railFill'), timeline = $('#timeline');
  const onScroll = () => {
    const y = scrollY, h = root.scrollHeight - innerHeight;
    $('#progress').style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    let i = -1; secs.forEach((s, k) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) i = k; });
    if (i !== cur) { cur = i; movePill(i); }
    island.classList.toggle('hide', y > lastY && y > 500); lastY = y;
    $('#totop').classList.toggle('on', y > 900);
    const r = timeline.getBoundingClientRect();
    railFill.style.height = Math.max(0, Math.min(1, (innerHeight * 0.6 - r.top) / r.height)) * 100 + '%';
  };
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', () => movePill(cur)); onScroll();
  $('#totop').addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  /* toast, tooltip, ripple, spotlight */
  let tt; const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2200); };
  const copy = async (txt) => { try { await navigator.clipboard.writeText(txt); } catch (e) { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e2) {} ta.remove(); } };
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn'); if (!b || reduce) return;
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height), sp = document.createElement('span');
    sp.className = 'rip'; Object.assign(sp.style, { width: s + 'px', height: s + 'px', left: e.clientX - r.left - s / 2 + 'px', top: e.clientY - r.top - s / 2 + 'px' });
    b.appendChild(sp); setTimeout(() => sp.remove(), 650);
  });
  document.addEventListener('pointermove', (e) => {
    const c = e.target.closest && e.target.closest('.card'); if (!c) return;
    const r = c.getBoundingClientRect(); c.style.setProperty('--sx', e.clientX - r.left + 'px'); c.style.setProperty('--sy', e.clientY - r.top + 'px');
  }, { passive: true });
  const wm = $('#wordmark');
  wm.parentElement.addEventListener('pointermove', (e) => { const r = wm.getBoundingClientRect(); wm.style.setProperty('--fx', e.clientX - r.left + 'px'); wm.style.setProperty('--fy', e.clientY - r.top + 'px'); });

  /* id card tilt */
  const idc = $('#idcard');
  if (!reduce && matchMedia('(pointer:fine)').matches) {
    idc.addEventListener('pointermove', (e) => { const r = idc.getBoundingClientRect(); idc.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 7 + 'deg'); idc.style.setProperty('--rx', -((e.clientY - r.top) / r.height - 0.5) * 7 + 'deg'); });
    idc.addEventListener('pointerleave', () => { idc.style.setProperty('--ry', '0deg'); idc.style.setProperty('--rx', '0deg'); });
  }

  /* copy email */
  $('#copyMail').addEventListener('click', async (e) => {
    const b = e.currentTarget; await copy(b.dataset.mail); toast('Email copied: ' + b.dataset.mail);
    const s = $('span:not(.rip)', b); s.textContent = 'Copied'; setTimeout(() => (s.textContent = 'Copy email'), 1600);
  });

  /* interests highlight related work */
  const chips = $$('#focus .chips button'); let active = null;
  const applyFocus = () => {
    document.body.classList.toggle('filtering', !!active);
    $$('[data-tags]').forEach((el) => el.classList.toggle('hit', !!active && el.dataset.tags.split(' ').includes(active)));
    chips.forEach((c) => c.setAttribute('aria-pressed', c.dataset.k === active));
  };
  chips.forEach((c) => c.addEventListener('click', () => {
    active = active === c.dataset.k ? null : c.dataset.k; applyFocus();
    if (active) { const first = $('main [data-tags].hit'); if (first) first.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); toast('Highlighting: ' + c.textContent + ' (tap again to clear)'); }
  }));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { active = null; applyFocus(); closeModal(); } });

  /* segmented control: experience filter */
  const segEl = $('#expSeg'), knob = $('.knob', segEl);
  const place = () => { const b = $('button[aria-pressed="true"]', segEl); knob.style.width = b.offsetWidth + 'px'; knob.style.transform = `translateX(${b.offsetLeft - 3}px)`; };
  segEl.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', segEl).forEach((x) => x.setAttribute('aria-pressed', x === b)); place();
    $$('.tl').forEach((t) => t.classList.toggle('hide', b.dataset.v !== 'all' && t.dataset.kind !== b.dataset.v)); onScroll();
  });
  addEventListener('resize', place); requestAnimationFrame(place); document.fonts && document.fonts.ready.then(place);

  /* 384-well plate */
  const plate = $('#plate'), read = $('#plateRead'), ROLE = { v: 'virus-only control', t: 'treatment well (virus + compound)', m: 'mock control (no virus)' };
  const NOTE = { v: 'Infected and uninfected cells are mixed here, which is where the label noise comes from.', t: 'Unknown infection prevalence: the quantity the model estimates.', m: 'Negative reference: infection expected near zero.' };
  let h = '';
  for (let r = 0; r < 16; r++) for (let c = 0; c < 24; c++) {
    const k = c === 0 ? 'v' : c >= 22 ? 'm' : 't';
    h += `<i class="${k}" data-r="${r}" data-c="${c}" style="--d:${(r + c) * 14};--o:${k === 't' ? 0.42 + 0.3 * Math.abs(Math.sin(r * 1.7 + c * 0.9)) : 0.9}"></i>`;
  }
  plate.innerHTML = h;
  const wells = $$('i', plate);
  plate.addEventListener('pointermove', (e) => {
    const w = e.target.closest('i'); if (!w) return; const k = w.className.replace(' on', '').trim()[0];
    read.innerHTML = `<b>${'ABCDEFGHIJKLMNOP'[+w.dataset.r]}${+w.dataset.c + 1}</b> · ${ROLE[k]}<br>${NOTE[k]}`;
  });
  $$('.plate-wrap .legend span').forEach((s) => {
    const k = $('i', s).className;
    s.addEventListener('pointerenter', () => { plate.classList.add('dim'); wells.forEach((w) => w.classList.toggle('on', w.classList.contains(k))); read.innerHTML = `<b>${{ v: 16, t: 336, m: 32 }[k]} wells per plate</b> · ${ROLE[k]}<br>${NOTE[k]}`; });
    s.addEventListener('pointerleave', () => { plate.classList.remove('dim'); wells.forEach((w) => w.classList.remove('on')); });
  });

  /* GRAFT: an illustrative concept graph where isolated concepts get connected */
  const gw = $('#graft'), cv = $('canvas', gw), ctx = cv.getContext('2d');
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const N = 46, nodes = [];
  for (let i = 0; i < N; i++) nodes.push({ x: 0.06 + rnd() * 0.88, y: 0.1 + rnd() * 0.72, iso: i % 5 === 0, ph: rnd() * 6.28 });
  const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  const base = [], grow = [];
  nodes.forEach((a, i) => {
    const near = nodes.map((b, j) => [d2(a, b), j]).filter(([, j]) => j !== i).sort((p, q) => p[0] - q[0]);
    if (!a.iso) near.slice(0, 2).forEach(([, j]) => { if (!nodes[j].iso) base.push([i, j]); });
    else near.filter(([, j]) => !nodes[j].iso).slice(0, 2).forEach(([, j], k) => grow.push([i, j, grow.length]));
  });
  const size = () => { const r = gw.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); cv.width = r.width * dpr; cv.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return r; };
  let gr = size(); addEventListener('resize', () => (gr = size()));
  let gVisible = false; new IntersectionObserver((es) => (gVisible = es[0].isIntersecting)).observe(gw);
  const drawGraft = (t) => {
    const W = gr.width, H = gr.height, acc = cssv('--acc'), line = cssv('--faint'), ink = cssv('--ink');
    ctx.clearRect(0, 0, W, H);
    const P = (n) => [n.x * W + Math.sin(t / 1800 + n.ph) * 3, n.y * H + Math.cos(t / 2100 + n.ph) * 3];
    ctx.lineWidth = 1; ctx.strokeStyle = line; ctx.globalAlpha = 0.45;
    base.forEach(([i, j]) => { const [x1, y1] = P(nodes[i]), [x2, y2] = P(nodes[j]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); });
    const cyc = reduce ? 1 : (t / 9000) % 1;
    ctx.strokeStyle = acc; ctx.lineWidth = 2;
    grow.forEach(([i, j, k]) => {
      const p = Math.max(0, Math.min(1, (cyc * 1.25 - (k / grow.length) * 0.8) / 0.18)), fade = cyc > 0.92 ? (1 - cyc) / 0.08 : 1;
      nodes[i].lit = Math.max(nodes[i].litk === k ? 0 : nodes[i].lit || 0, p * fade); nodes[i].litk = k; if (k % 2 === 0) nodes[i].lit = p * fade;
      if (p <= 0) return; const [x1, y1] = P(nodes[i]), [x2, y2] = P(nodes[j]);
      ctx.globalAlpha = 0.9 * fade; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + (x2 - x1) * p, y1 + (y2 - y1) * p); ctx.stroke();
    });
    nodes.forEach((n) => { const [x, y] = P(n); ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, n.iso ? 5 : 3.2, 0, 6.29);
      if (n.iso) { ctx.fillStyle = acc; ctx.globalAlpha = 0.15 + 0.85 * (n.lit || 0); ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = acc; ctx.lineWidth = 1.8; ctx.stroke(); }
      else { ctx.fillStyle = ink; ctx.globalAlpha = 0.55; ctx.fill(); } });
    ctx.globalAlpha = 1;
  };
  drawGraft(8000);
  if (!reduce) (function loop(t) { if (gVisible) drawGraft(t); requestAnimationFrame(loop); })(0);

  /* soon buttons + BibTeX modal */
  $$('[data-soon]').forEach((b) => b.addEventListener('click', () => toast(b.dataset.soon)));
  const BIB = { vira: `@article{gao2026vira,\n  title   = {ViRA: Agentic Recovery for Robust Video Understanding under Corruption},\n  author  = {Gao, Bryan and Zhang, Ce and Jin, Bojiang and Feng, Weiguo},\n  journal = {arXiv preprint},\n  year    = {2026}\n}` };
  const modal = $('#modal'), closeModal = () => modal.classList.remove('open');
  $$('[data-bib]').forEach((b) => b.addEventListener('click', () => { $('#bibText').textContent = BIB[b.dataset.bib]; modal.classList.add('open'); }));
  $('#bibClose').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  $('#bibCopy').addEventListener('click', async () => { await copy($('#bibText').textContent); toast('BibTeX copied'); closeModal(); });
})();
