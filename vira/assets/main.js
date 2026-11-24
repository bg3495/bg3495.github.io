/* ViRA project page interactions. No dependencies. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const fmt = (v, d = 1) => v.toFixed(d);
  const sgn = (v, d = 1) => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(d);

  /* ---------- theme (circular reveal) ---------- */
  $('#theme').addEventListener('click', (e) => {
    const root = document.documentElement;
    const flip = () => {
      const cur = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = cur === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('vira-theme', next); } catch (err) {}
    };
    if (!document.startViewTransition || reduce) return flip();
    const r = e.currentTarget.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(flip).ready.then(() => root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`] },
      { duration: 620, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' }));
  });

  /* ---------- reveal + counters ---------- */
  const countUp = (el) => {
    const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), pre = el.dataset.pre || '';
    if (reduce) { el.textContent = pre + to.toFixed(dec); return; }
    const t0 = performance.now(), dur = 1400;
    const step = (t) => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + (to * e).toFixed(dec); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    $$('[data-count]', e.target).forEach(countUp);
    io.unobserve(e.target);
  }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('[data-r]').forEach((el, i) => { el.style.transitionDelay = (el.closest('.hero') ? i * 0.08 : 0) + 's'; io.observe(el); });

  /* ---------- nav: progress, pill, toc, hide-on-scroll ---------- */
  const island = $('#island'), pill = $('#pill'), links = $$('#navlinks a'), tocLinks = $$('#toc a'), toc = $('#toc');
  const secs = links.map((a) => $(a.getAttribute('href')));
  let lastY = scrollY, cur = -1;
  const movePill = (i) => {
    links.forEach((a, k) => a.classList.toggle('cur', k === i));
    tocLinks.forEach((a, k) => a.classList.toggle('cur', k === i));
    if (i < 0) { pill.style.opacity = 0; return; }
    const a = links[i]; pill.style.opacity = 1; pill.style.width = a.offsetWidth + 'px'; pill.style.transform = `translateX(${a.offsetLeft}px)`;
  };
  const onScroll = () => {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    $('#progress').style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    let i = -1; secs.forEach((s, k) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.35) i = k; });
    if (i !== cur) { cur = i; movePill(i); }
    island.classList.toggle('hide', y > lastY && y > 500 && !$('#sheet').classList.contains('open'));
    lastY = y;
    $('#totop').classList.toggle('on', y > 900);
    toc.classList.toggle('show', y > innerHeight * 0.8);
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => movePill(cur));
  onScroll();
  $('#totop').addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
  const sheet = $('#sheet'), menu = $('#menu');
  menu.addEventListener('click', () => { const o = sheet.classList.toggle('open'); menu.setAttribute('aria-expanded', o); });
  $$('a', sheet).forEach((a) => a.addEventListener('click', () => { sheet.classList.remove('open'); menu.setAttribute('aria-expanded', false); }));

  /* ---------- ripple on buttons ---------- */
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn'); if (!b || reduce) return;
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height), sp = document.createElement('span');
    sp.className = 'rip'; Object.assign(sp.style, { width: s + 'px', height: s + 'px', left: e.clientX - r.left - s / 2 + 'px', top: e.clientY - r.top - s / 2 + 'px' });
    b.appendChild(sp); setTimeout(() => sp.remove(), 650);
  });
  $$('a.btn[href="#top"]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); toast(a.title || 'Coming soon'); }));

  /* ---------- toast + tooltip ---------- */
  let tt; const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2200); };
  const tip = $('#tip');
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest('[data-tip]');
    if (!el) { tip.classList.remove('on'); return; }
    tip.innerHTML = el.dataset.tip; tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; tip.classList.add('on');
  });

  /* ---------- segmented control ---------- */
  const seg = (el, onChange) => {
    const knob = $('.knob', el), place = () => {
      const b = $('button[aria-pressed="true"]', el); if (!b) return;
      knob.style.width = b.offsetWidth + 'px'; knob.style.transform = `translateX(${b.offsetLeft - 3}px)`;
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || b.getAttribute('aria-pressed') === 'true') return;
      $$('button', el).forEach((x) => x.setAttribute('aria-pressed', x === b)); place(); onChange(b.dataset.v);
    });
    addEventListener('resize', place); requestAnimationFrame(place); document.fonts && document.fonts.ready.then(place);
    return { place, set(v) { $$('button', el).forEach((x) => x.setAttribute('aria-pressed', x.dataset.v === v)); place(); } };
  };

  /* ---------- hero lens ---------- */
  const lens = $('#lens'), lensCard = $('#lensCard'), lays = $$('.lay', lens), dots = $('#lensDots');
  let lf = 3, hover = false, autoT;
  const setFrame = (i) => {
    lf = i; lays.forEach((l) => (l.style.backgroundPosition = `${(i / 7) * 100}% 0`));
    $('#lensNo').textContent = 'frame ' + (i + 5) + (i < 4 ? ' · glass' : ' · fog');
    $$('button', dots).forEach((b, k) => b.classList.toggle('on', k === i));
  };
  for (let i = 0; i < 8; i++) { const b = document.createElement('button'); b.textContent = i + 5; b.setAttribute('aria-label', 'Show frame ' + (i + 5)); b.onclick = () => { setFrame(i); restartAuto(); }; dots.appendChild(b); }
  setFrame(3);
  let t0 = performance.now();
  const restartAuto = () => { t0 = performance.now(); };
  const setLens = (x, y, r) => { lens.style.setProperty('--mx', x + 'px'); lens.style.setProperty('--my', y + 'px'); lens.style.setProperty('--rad', r + 'px'); };
  lens.addEventListener('pointermove', (e) => {
    hover = true; const r = lens.getBoundingClientRect();
    setLens(e.clientX - r.left, e.clientY - r.top, Math.max(70, r.width * 0.2));
    $('#lensHint').style.opacity = 0;
  });
  lens.addEventListener('pointerleave', () => { hover = false; });
  lens.addEventListener('pointerdown', (e) => { lens.setPointerCapture(e.pointerId); });
  lens.addEventListener('pointerleave', () => { setLens(0, 0, 0); restartAuto(); });
  // idle: diagnose -> restore (a scan line sweeps the frame clean) -> reason, then the next frame
  const trace = $$('#trace span'), CYCLE = 4600;
  const stage = (k) => trace.forEach((el, n) => { el.classList.toggle('on', n === k); el.classList.toggle('done', n < k); });
  (function loop(t) {
    if (hover) { lens.style.setProperty('--sw', '0%'); lens.classList.remove('sweeping'); stage(1); }
    else if (reduce) { lens.style.setProperty('--sw', '100%'); stage(2); }
    else {
      let p = (t - t0) / CYCLE;
      if (p >= 1) { setFrame((lf + 1) % 8); t0 = t; p = 0; }
      const q = Math.min(1, Math.max(0, (p - 0.16) / 0.42)), e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
      lens.style.setProperty('--sw', (p > 0.94 ? 0 : e * 100) + '%');
      lens.classList.toggle('sweeping', q > 0 && q < 1);
      stage(p < 0.16 ? 0 : q < 1 ? 1 : 2);
    }
    requestAnimationFrame(loop);
  })(performance.now());
  if (!reduce && matchMedia('(pointer:fine)').matches) {
    lensCard.addEventListener('pointermove', (e) => {
      const r = lensCard.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      lensCard.style.setProperty('--ry', px * 6 + 'deg'); lensCard.style.setProperty('--rx', -py * 6 + 'deg');
    });
    lensCard.addEventListener('pointerleave', () => { lensCard.style.setProperty('--ry', '0deg'); lensCard.style.setProperty('--rx', '0deg'); });
  }

  /* ---------- abstract ---------- */
  $('#absBtn').addEventListener('click', (e) => {
    const o = $('#absMore').classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', o);
    e.currentTarget.firstChild.textContent = o ? 'Show less ' : 'Read full abstract ';
  });

  /* ---------- lightbox ---------- */
  const lbox = $('#lbox'), lbImg = $('img', lbox);
  const openLb = (src, alt) => { lbImg.src = src; lbImg.alt = alt || ''; lbox.classList.add('open'); };
  const closeLb = () => lbox.classList.remove('open');
  lbox.addEventListener('click', closeLb);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLb(); });
  $$('[data-zoom]').forEach((el) => el.addEventListener('click', () => openLb(el.dataset.zoom, $('img', el).alt)));

  /* ---------- steps autoplay ---------- */
  const steps = $$('#steps .step'); let si = 0, stT;
  const setStep = (i) => { si = i; steps.forEach((s, k) => { s.classList.toggle('on', k === i); s.classList.remove('paused'); const b = $('.bar', s); b.style.animation = 'none'; b.offsetWidth; b.style.animation = ''; }); };
  const stepLoop = () => { clearInterval(stT); stT = setInterval(() => setStep((si + 1) % 3), 4000); };
  steps.forEach((s, k) => {
    s.addEventListener('click', () => { setStep(k); stepLoop(); });
    s.addEventListener('pointerenter', () => { clearInterval(stT); s.classList.add('paused'); });
    s.addEventListener('pointerleave', () => { s.classList.remove('paused'); stepLoop(); });
  });
  stepLoop();

  /* ---------- playground: temporally grounded tool calls ---------- */
  const CORR = {
    clean: { name: 'Clean', col: '#cfd8da' }, fog: { name: 'Fog / smoke', col: '#a7b4ba' }, glass: { name: 'Glass occlusion', col: '#7eb0f2' },
    under: { name: 'Underexposure', col: '#3b3f5c' }, over: { name: 'Overexposure', col: '#f4d77a' },
  };
  const TOOLS = [
    { id: 'dcp', name: 'DCP + CLAHE', fixes: ['fog', 'glass'], col: '#17907a' },
    { id: 'toenet', name: 'TOENet', fixes: ['glass'], col: '#3c7fd0' },
    { id: 'retinex', name: 'RetinexFormer', fixes: ['under'], col: '#7a5bd1' },
    { id: 'debright', name: 'DeBright', fixes: ['over'], col: '#d48a1c' },
    { id: 'restormer', name: 'Restormer', fixes: ['motion'], col: '#c7433f' },
  ];
  const REG = {
    all: { layout: Array(16).fill('fog'), rel: [1, 16], plan: [['dcp', 1, 16]], why: 'Fog covers the whole clip and hides the evidence everywhere: recover all 16 frames.' },
    half: { layout: [...Array(4).fill('clean'), ...Array(8).fill('glass'), ...Array(4).fill('clean')], rel: [5, 12], plan: [['toenet', 5, 12]], why: 'Only frames 5–12 are occluded; the clean frames are left alone.' },
    mixed: { layout: [...Array(4).fill('over'), ...Array(4).fill('glass'), ...Array(4).fill('fog'), ...Array(4).fill('under')], rel: [5, 12], plan: [['dcp', 5, 12]], why: 'The question hinges on frames 5–12 (the cyclist). Blocks 1–4 and 13–16 are degraded but not needed, so ViRA skips them.' },
  };
  let reg = 'mixed', calls = [];
  const track = $('#track'), lanes = $('#lanes');
  for (let t = 0; t < 16; t++) {
    const d = document.createElement('div'); d.className = 'fr';
    d.innerHTML = `<div class="im" style="background-position:${(Math.floor(t / 2) / 7) * 100}% 0"></div><div class="tint"></div><span class="n">${t + 1}</span><span class="ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"><path d="M5 12l5 5 9-10"/></svg></span>`;
    track.appendChild(d);
  }
  const frames = $$('.fr', track);
  TOOLS.forEach((t) => { const o = document.createElement('option'); o.value = t.id; o.textContent = t.name + ' — ' + t.fixes.join(', ').replace('motion', 'motion blur'); $('#toolPick').appendChild(o); });

  const evalPlay = () => {
    const R = REG[reg], state = R.layout.map((c) => ({ c, fixed: c === 'clean' }));
    let wasted = 0;
    calls.forEach((u) => { const tool = TOOLS.find((t) => t.id === u.tool);
      for (let f = u.l; f <= u.r; f++) { const s = state[f - 1];
        if (tool.fixes.includes(s.c) && !s.fixed) s.fixed = true; else if (!tool.fixes.includes(s.c)) wasted++; } });
    frames.forEach((fr, k) => {
      const s = state[k]; fr.className = 'fr ' + (s.c !== 'clean' ? 'c-' + s.c : '') + (s.fixed && s.c !== 'clean' ? ' rec' : '');
      const rel = k + 1 >= R.rel[0] && k + 1 <= R.rel[1];
      fr.dataset.tip = `<b>Frame ${k + 1}</b> · ${CORR[s.c].name}${s.c === 'clean' ? '' : s.fixed ? ' · recovered' : ''}${rel ? '<br>query-relevant evidence' : ''}`;
      fr.style.outline = rel ? '' : ''; fr.style.opacity = rel ? 1 : 0.72;
    });
    const relIdx = []; for (let f = R.rel[0]; f <= R.rel[1]; f++) relIdx.push(f);
    const need = relIdx.filter((f) => R.layout[f - 1] !== 'clean'), got = need.filter((f) => state[f - 1].fixed).length;
    $('#meterFill').style.width = (need.length ? (got / need.length) * 100 : 100) + '%';
    $('#meterTxt').textContent = `${got} / ${need.length} relevant`;
    const eq = calls.length
      ? 'z = 𝒰<sub>' + calls.length + '</sub> = ( ' + calls.map((u) => `(<span class="t">${TOOLS.find((t) => t.id === u.tool).name}</span>, [${u.l}, ${u.r}])`).join(', ') + ' )'
      : 'z = (<span class="t">ANSWER</span>, a) <span class="c">  // no recovery: answer directly from the degraded video</span>';
    $('#eqn').innerHTML = eq;
    const log = $('#log');
    if (!calls.length) log.innerHTML = '<span class="warn">⚠ Diagnose: evidence in frames ' + R.rel[0] + '–' + R.rel[1] + ' is obscured. Add a tool call, or press ViRA plan.</span>';
    else if (got === need.length) log.innerHTML = '<span class="good">✓ Evidence recovered → reason over 𝒱<sup>rec</sup>.</span>' + (wasted ? ` <span class="warn">${wasted} frame-calls had no effect (wrong tool or nothing to fix).</span>` : ' No wasted calls.');
    else log.innerHTML = `<span class="warn">${need.length - got} relevant frame(s) still degraded.</span>` + (wasted ? ` <span class="warn">${wasted} frame-call(s) had no effect: check the tool matches the corruption.</span>` : '');
  };

  const renderLanes = () => {
    lanes.innerHTML = '';
    calls.forEach((u, idx) => {
      const tool = TOOLS.find((t) => t.id === u.tool), lane = document.createElement('div'); lane.className = 'lane';
      const c = document.createElement('div'); c.className = 'call'; c.style.background = tool.col;
      c.innerHTML = `<span class="h l"></span><span class="lbl">${tool.name} · [${u.l}, ${u.r}]</span><button class="x" aria-label="Remove call">✕</button><span class="h r"></span>`;
      const place = () => { c.style.left = `calc(${((u.l - 1) / 16) * 100}% + 2px)`; c.style.width = `calc(${((u.r - u.l + 1) / 16) * 100}% - 4px)`; $('.lbl', c).textContent = `${tool.name} · [${u.l}, ${u.r}]`; };
      place(); lane.appendChild(c); lanes.appendChild(lane);
      $('.x', c).addEventListener('click', (e) => { e.stopPropagation(); calls.splice(idx, 1); renderLanes(); evalPlay(); });
      c.addEventListener('pointerdown', (e) => {
        if (e.target.classList.contains('x')) return;
        e.preventDefault(); c.setPointerCapture(e.pointerId); c.classList.add('drag');
        const mode = e.target.classList.contains('l') ? 'l' : e.target.classList.contains('r') ? 'r' : 'm';
        const w = lane.getBoundingClientRect().width / 16, x0 = e.clientX, l0 = u.l, r0 = u.r;
        const mv = (ev) => {
          const d = Math.round((ev.clientX - x0) / w);
          if (mode === 'm') { const len = r0 - l0; u.l = Math.min(Math.max(1, l0 + d), 16 - len); u.r = u.l + len; }
          else if (mode === 'l') u.l = Math.min(Math.max(1, l0 + d), u.r);
          else u.r = Math.max(Math.min(16, r0 + d), u.l);
          place(); evalPlay();
        };
        const up = () => { c.classList.remove('drag'); c.removeEventListener('pointermove', mv); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up); };
        c.addEventListener('pointermove', mv); c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
      });
    });
  };
  const renderLegend = () => {
    const used = [...new Set(REG[reg].layout)];
    $('#legend').innerHTML = used.map((c) => `<span><i style="background:${CORR[c].col}"></i>${CORR[c].name}</span>`).join('') + `<span style="color:var(--faint)">· dimmed frames aren't needed for this query</span>`;
  };
  const resetPlay = () => { calls = [{ tool: 'retinex', l: 2, r: 6 }]; renderLegend(); renderLanes(); evalPlay(); };
  seg($('#regSeg'), (v) => { reg = v; resetPlay(); });
  $('#addCall').addEventListener('click', () => { if (calls.length >= 4) return toast('Up to 4 calls in this demo'); calls.push({ tool: $('#toolPick').value, l: 1, r: 4 }); renderLanes(); evalPlay(); });
  $('#clearCalls').addEventListener('click', () => { calls = []; renderLanes(); evalPlay(); });
  $('#autoPlan').addEventListener('click', () => {
    const R = REG[reg]; calls = []; renderLanes(); evalPlay();
    $('#log').innerHTML = '<span>Diagnosing…</span>';
    setTimeout(() => { calls = R.plan.map(([tool, l, r]) => ({ tool, l, r })); renderLanes(); evalPlay(); $('#log').innerHTML += ' <span style="color:var(--text)">' + R.why + '</span>'; }, reduce ? 0 : 650);
  });
  resetPlay();

  /* ---------- toolbox: degradation previews + the tool that handles each ---------- */
  const FAM = { exp: ['Exposure & illumination', '#f0b34a'], col: ['Color distortion', '#d26ab0'], blur: ['Optical blur', '#3c7fd0'], atm: ['Atmosphere & occlusion', '#8a9aa1'] };
  const TTYPE = { model: 'Learned model', classical: 'Classical', tone: 'Tone tool', combo: 'Composite' };
  const TB = [
    ['exp', 'Underexposure', 'under', 'RetinexFormer', 'model', 'One-stage Retinex transformer for low-light enhancement.'],
    ['exp', 'Overexposure', 'over', 'DeBright', 'tone', 'Pulls back blown-out highlights.'],
    ['exp', 'Low-light noise', 'lln', 'Retinex + denoise', 'combo', 'Brightens, then suppresses the amplified sensor noise.', 'unseen'],
    ['col', 'Color cast', 'cast', 'Gray-World', 'classical', 'Color constancy: rebalances the channels to a neutral mean.'],
    ['col', 'Chromatic aberration', 'chroma', 'Channel realignment', 'classical', 'Shifts the color channels back into register to remove fringing.'],
    ['blur', 'Defocus blur', 'defocus', 'Richardson–Lucy', 'classical', 'Iterative deconvolution with a blind estimate of the blur width.'],
    ['blur', 'Motion blur', 'motion', 'Restormer', 'model', 'Restoration transformer trained for motion deblurring.'],
    ['atm', 'Fog / smoke', 'fog', 'Dark Channel Prior + CLAHE', 'classical', 'Dehazing prior, then local contrast enhancement.', 'real'],
    ['atm', 'Dust storm', 'dust', 'TOENet', 'model', 'Network for dust- and sandstorm visibility restoration.'],
    ['atm', 'Glass occlusion', 'glass', 'TOENet', 'model', 'Restores the view through wet or dirty glass.', 'real'],
  ];
  const grid = $('#toolsGrid');
  grid.innerHTML = TB.map(([f, n, c, t, ty, d, flag], i) => `<article class="tcard" data-f="${f}" tabindex="0" role="button" aria-pressed="false" aria-label="${n}, handled by ${t}. Press to preview the restoration." style="--i:${i}">
    <div class="pv d-${c}">
      <div class="lay deg"><img src="assets/img/sample.jpg" alt="" loading="lazy"><i class="fx"></i></div>
      <div class="lay cln"><img src="assets/img/sample.jpg" alt="" loading="lazy"></div>
      <span class="scanl"></span>
      <span class="state"><b class="s0">degraded</b><b class="s1">restored</b></span>
      ${flag === 'unseen' ? '<span class="badge">UNSEEN IN TRAINING</span>' : ''}
    </div>
    <div class="tb">
      <span class="cat"><i style="background:${FAM[f][1]}"></i>${FAM[f][0]}</span>
      <h4>${n}</h4>
      <div class="tool-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/></svg><b>${t}</b><span class="ty ty-${ty}">${TTYPE[ty]}</span></div>
      <p>${d}${flag === 'real' ? ' <a href="#case">Real example ↓</a>' : ''}</p>
    </div></article>`).join('');
  const tcards = $$('.tcard', grid);
  const setCard = (c, on) => { c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); };
  tcards.forEach((c) => {
    c.addEventListener('click', (e) => { if (e.target.closest('a')) return; setCard(c, !c.classList.contains('on')); });
    c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCard(c, !c.classList.contains('on')); } });
  });
  let allOn = false;
  $('#tbAll').addEventListener('click', (e) => {
    allOn = !allOn; $('span', e.currentTarget).textContent = allOn ? 'Degrade all' : 'Restore all';
    tcards.filter((c) => !c.classList.contains('dim')).forEach((c, i) => setTimeout(() => setCard(c, allOn), reduce ? 0 : i * 110));
  });
  const famOn = new Set(Object.keys(FAM)), fc = $('#famChips');
  fc.innerHTML = Object.entries(FAM).map(([k, [n, c]]) => `<button data-f="${k}" aria-pressed="true"><i style="background:${c}"></i>${n}</button>`).join('');
  fc.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; const k = b.dataset.f;
    if (famOn.size === 4) { famOn.clear(); famOn.add(k); } else if (famOn.has(k)) { famOn.delete(k); if (!famOn.size) Object.keys(FAM).forEach((x) => famOn.add(x)); } else famOn.add(k);
    $$('button', fc).forEach((x) => x.setAttribute('aria-pressed', famOn.has(x.dataset.f)));
    tcards.forEach((t) => t.classList.toggle('dim', !famOn.has(t.dataset.f)));
  });

  /* ---------- bar renderer ---------- */
  const COL = { none: 'var(--direct)', zs: 'var(--zs)', vira: 'var(--acc)', other: 'var(--sky)' };
  const renderBars = (box, groups, lo, hi) => {
    const pct = (v) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
    const key = groups.map((g) => g.name + ':' + g.rows.map((r) => r.who).join(',')).join('|');
    if (box.dataset.key !== key) {
      box.dataset.key = key;
      box.innerHTML = groups.map((g) => `<div class="bgroup"><div class="bname">${g.name}<span>${g.note || ''}</span></div>${g.rows.map((r) => `
        <div class="brow"><span class="who">${r.who}</span><div class="tr"><div class="fill" style="background:${r.col}"></div>${g.clean != null ? '<span class="clean"></span>' : ''}</div><span class="v"></span></div>`).join('')}</div>`).join('');
    }
    $$('.bgroup', box).forEach((ge, gi) => {
      const g = groups[gi];
      $('.bname span', ge).textContent = g.note || '';
      $$('.brow', ge).forEach((re, ri) => {
        const r = g.rows[ri], fill = $('.fill', re), cl = $('.clean', re);
        requestAnimationFrame(() => { fill.style.width = pct(r.v) + '%'; if (cl) cl.style.left = pct(g.clean) + '%'; });
        $('.v', re).innerHTML = r.v == null ? '—' : fmt(r.v) + (r.d != null ? `<span class="delta ${r.d > 0.05 ? 'up' : r.d < -0.05 ? 'dn' : 'eq'}">${sgn(r.d)}</span>` : '');
        re.dataset.tip = `<b>${r.who}</b> · ${g.name}<br>${fmt(r.v)}%${r.d != null ? ' (' + sgn(r.d) + ' vs. no recovery)' : ''}${g.clean != null ? '<br>clean reference ' + fmt(g.clean) + '%' : ''}`;
      });
    });
  };
  const growOnView = (el, fn) => { const o = new IntersectionObserver((es) => { if (es[0].isIntersecting) { fn(); o.disconnect(); } }, { threshold: 0.2 }); o.observe(el); };

  /* ---------- leaderboard ---------- */
  const BENCH = ['V-MME Short', 'V-MME Medium', 'V-MME Long', 'STAR', 'NExT-QA'];
  const D = {
    'Qwen3.5-9B': { clean: [71.8, 58.6, 53.0, 69.0, 81.8],
      none: [[57.9, 67.7, 60.6], [49.9, 56.7, 50.8], [46.7, 50.5, 46.4], [47.7, 65.9, 53.4], [65.6, 78.8, 71.4]],
      zs: [[60.5, 69.3, 62.2], [51.0, 58.5, 51.1], [49.2, 53.2, 49.7], [49.7, 66.4, 53.9], [67.0, 80.1, 73.5]],
      vira: [[62.6, 69.7, 64.4], [52.7, 57.3, 52.8], [49.8, 52.1, 50.5], [52.6, 67.2, 57.6], [75.1, 81.9, 78.7]] },
    'Qwen3-VL-8B': { clean: [71.7, 57.7, 50.6, 70.6, 80.8],
      none: [[56.9, 67.5, 60.1], [47.5, 54.7, 50.0], [46.7, 49.3, 48.0], [48.9, 66.9, 55.7], [66.9, 79.2, 73.3]],
      zs: [[60.5, 65.1, 62.4], [49.1, 52.7, 50.3], [47.5, 51.5, 45.7], [52.3, 67.4, 54.1], [67.5, 77.7, 74.6]],
      vira: [[62.1, 69.2, 64.2], [49.5, 53.6, 50.6], [48.3, 49.8, 50.1], [51.9, 65.8, 56.8], [74.8, 81.3, 78.4]] },
    'LLaVA-OV2-8B': { clean: [71.7, 57.8, 50.9, 67.9, 81.1],
      none: [[58.4, 67.6, 60.3], [48.3, 55.1, 50.4], [45.8, 49.2, 47.9], [49.1, 65.2, 54.8], [67.3, 78.8, 74.0]],
      zs: [[59.5, 67.4, 60.8], [49.7, 54.3, 50.6], [45.0, 49.7, 46.6], [50.4, 64.9, 55.4], [70.0, 78.6, 74.4]] },
    'GPT-5.4': { clean: [79.4, 66.4, 62.4, 69.9, 83.3],
      none: [[63.0, 74.0, 67.0], [58.8, 64.8, 59.6], [57.0, 60.7, 57.0], [47.6, 66.7, 53.2], [70.4, 81.0, 75.9]],
      zs: [[66.5, 74.4, 67.2], [60.4, 65.1, 58.0], [57.3, 60.7, 57.2], [51.8, 66.7, 55.6], [74.7, 81.0, 75.7]] },
  };
  const MN = { none: 'No recovery', zs: 'ViRA-ZS', vira: 'ViRA' };
  const bbSegEl = $('#bbSeg');
  Object.keys(D).forEach((k, i) => { const b = document.createElement('button'); b.dataset.v = k; b.textContent = k; b.setAttribute('aria-pressed', i === 0); bbSegEl.appendChild(b); });
  let dbSort = false, lbView = 'dumb', lbReg = 0, lbBB = 'Qwen3.5-9B', sortCol = 7, sortAsc = false;
  const lbBody = $('#lbBody');
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const drawLB = () => {
    $('#bbRow').style.display = lbView === 'table' ? 'none' : '';
    const noReg = lbView === 'gain' || lbView === 'dumb';
    $('#lbReg').parentElement.querySelectorAll('.lab')[1].style.display = noReg ? 'none' : '';
    $('#lbReg').style.display = noReg ? 'none' : '';
    const M = D[lbBB];
    if (lbView === 'dumb') {
      const best = M.vira ? 'vira' : 'zs', pc = (v) => ((v - 30) / 60) * 100, rows = [];
      BENCH.forEach((n, b) => [0, 1, 2].forEach((r) => rows.push({ n, b, r, a: M.none[b][r], z: M[best][b][r], g: M[best][b][r] - M.none[b][r] })));
      if (dbSort) rows.sort((x, y) => y.g - x.g);
      const up = rows.filter((x) => x.g > 0.05).length;
      lbBody.innerHTML = `<div class="view"><div class="db-head"><p><b>${MN[best]}</b> vs. no recovery on ${lbBB}: <b class="hl">${up} of 15</b> settings improve, ${sgn(avg(rows.map((x) => x.g)))} points on average.</p><button class="sbtn" id="dbSort">${dbSort ? 'Group by benchmark' : 'Sort by gain'}</button></div><div class="db">` +
        rows.map((x, i) => `<div class="db-row${!dbSort && x.r === 0 && i ? ' gap' : ''}" style="--i:${i}" data-tip="<b>${x.n}</b> · ${['All frames', 'Half', 'Mixed'][x.r]}<br>${fmt(x.a)} → ${fmt(x.z)} (${sgn(x.g)})<br>clean reference ${fmt(M.clean[x.b])}">
          <span class="who">${x.n}<i>${'AHM'[x.r]}</i></span>
          <div class="tr"><span class="cl" style="left:${pc(M.clean[x.b])}%"></span><span class="ln${x.g < 0 ? ' dn' : ''}" style="left:${pc(Math.min(x.a, x.z))}%;--w:${Math.abs(pc(x.z) - pc(x.a))}%"></span><span class="d0" style="left:${pc(x.a)}%"></span><span class="d1${x.g < 0 ? ' dn' : ''}" style="--from:${pc(x.a)}%;--to:${pc(x.z)}%"></span></div>
          <span class="v">${fmt(x.a)} → <b>${fmt(x.z)}</b><span class="delta ${x.g > 0.05 ? 'up' : x.g < -0.05 ? 'dn' : 'eq'}">${sgn(x.g)}</span></span></div>`).join('') +
        `<div class="db-row ax"><span></span><div class="tr">${[30, 45, 60, 75, 90].map((v) => `<em style="left:${pc(v)}%">${v}</em>`).join('')}</div><span></span></div></div>
        <div class="keyrow"><span><i style="background:var(--direct);border-radius:50%"></i>No recovery</span><span><i style="background:var(--acc);border-radius:50%"></i>${MN[best]}</span><span><i class="dash"></i>Clean reference</span><span style="color:var(--faint)">A = all frames, H = half, M = mixed. Axis spans 30–90%.</span></div></div>`;
      $('#dbSort').addEventListener('click', () => { dbSort = !dbSort; drawLB(); });
      requestAnimationFrame(() => requestAnimationFrame(() => $('.db', lbBody).classList.add('go')));
    } else if (lbView === 'bars') {
      if (!lbBody.querySelector('.bars')) { lbBody.innerHTML = `<div class="view"><div class="bars" id="lbBars"></div><div class="keyrow"><span><i style="background:var(--direct)"></i>No recovery</span><span><i style="background:var(--zs)"></i>ViRA-ZS</span><span><i style="background:var(--acc)"></i>ViRA</span><span><i class="dash"></i>Clean reference</span><span style="color:var(--faint)">Axis spans 30–90%. Chips show change vs. no recovery.</span></div></div>`; }
      const groups = BENCH.map((n, b) => ({ name: n, clean: M.clean[b], note: 'clean ' + fmt(M.clean[b]),
        rows: ['none', 'zs', 'vira'].filter((m) => M[m]).map((m) => ({ who: MN[m], col: COL[m], v: M[m][b][lbReg], d: m === 'none' ? null : M[m][b][lbReg] - M.none[b][lbReg] })) }));
      renderBars($('#lbBars'), groups, 30, 90);
    } else if (lbView === 'gain') {
      const best = M.vira ? 'vira' : 'zs';
      let h = `<div class="view"><p class="s" style="font-size:13.5px;margin-bottom:12px"><b>${MN[best]}</b> minus <b>No recovery</b> on ${lbBB}, in accuracy points.</p><div class="heat"><span></span><span class="hh">A · ALL</span><span class="hh">H · HALF</span><span class="hh">M · MIXED</span>`;
      BENCH.forEach((n, b) => { h += `<span class="rl">${n}</span>`; [0, 1, 2].forEach((r) => {
        const g = M[best][b][r] - M.none[b][r], a = Math.min(1, Math.abs(g) / 9.5);
        const bg = g >= 0 ? `color-mix(in srgb, var(--acc) ${10 + a * 70}%, var(--surface))` : `color-mix(in srgb, var(--bad) ${10 + a * 60}%, var(--surface))`;
        h += `<div class="cell" style="background:${bg}" data-tip="<b>${n}</b> · ${['All', 'Half', 'Mixed'][r]}<br>${fmt(M.none[b][r])} → ${fmt(M[best][b][r])}">${sgn(g)}</div>`; }); });
      lbBody.innerHTML = h + '</div></div>';
    } else {
      const rows = [];
      Object.entries(D).forEach(([bb, M2]) => ['none', 'zs', 'vira'].forEach((m) => { if (!M2[m]) return; const v = M2[m].map((x) => x[lbReg]); rows.push({ bb, m, v: [...v, avg(v)] }); }));
      const bestOf = {}; rows.forEach((r) => { r.v.forEach((x, i) => { const k = r.bb + i; if (!(k in bestOf) || x > bestOf[k]) bestOf[k] = x; }); });
      const sorted = [...rows].sort((a, b) => sortCol < 2 ? 0 : (sortAsc ? 1 : -1) * (a.v[sortCol - 2] - b.v[sortCol - 2]));
      const heads = ['Backbone', 'Method', ...BENCH, 'Avg'];
      lbBody.innerHTML = `<div class="view tbl-wrap"><table class="t"><thead><tr>${heads.map((h, i) => `<th data-c="${i}" class="${i === sortCol ? 's' + (sortAsc ? ' asc' : '') : ''}">${h}</th>`).join('')}</tr></thead><tbody>${sorted.map((r) => `<tr><td>${r.bb}</td><td><span class="meth"><i style="background:${COL[r.m]}"></i>${MN[r.m]}</span></td>${r.v.map((x, i) => `<td class="${x === bestOf[r.bb + i] ? 'best' : ''}">${fmt(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>
        <p class="cap">Regime ${['A (all frames)', 'H (half)', 'M (mixed)'][lbReg]}. Click a column to sort. Dots mark the best method within each backbone. ViRA (learned) is reported for the two open-weight Qwen backbones.</p></div>`;
      $$('th', lbBody).forEach((th) => th.addEventListener('click', () => { const c = +th.dataset.c; if (c < 2) { sortCol = 7; sortAsc = false; } else if (c === sortCol) sortAsc = !sortAsc; else { sortCol = c; sortAsc = false; } drawLB(); }));
    }
  };
  const vs = seg($('#viewSeg'), (v) => { lbView = v; lbBody.innerHTML = ''; drawLB(); requestAnimationFrame(() => { rs.place(); bs.place(); }); });
  const rs = seg($('#lbReg'), (v) => { lbReg = +v; drawLB(); });
  const bs = seg(bbSegEl, (v) => { lbBB = v; drawLB(); });
  growOnView(lbBody, drawLB);

  /* ---------- real-world + clean ---------- */
  growOnView($('#rwBody'), () => {
    const R = [['Qwen3.5-9B', 78.7, 78.1, 81.2], ['Qwen3-VL-8B', 74.4, 72.6, 75.6], ['LLaVA-OV2-8B', 68.6, 69.4, null]];
    const g = R.map(([n, a, b, c]) => ({ name: n, rows: [{ who: 'No recovery', col: COL.none, v: a }, { who: 'ViRA-ZS', col: COL.zs, v: b, d: b - a }, ...(c != null ? [{ who: 'ViRA', col: COL.vira, v: c, d: c - a }] : [])] }));
    g.push({ name: 'Qwen2.5-VL-3B · Robust-R1 (re-impl.)', rows: [{ who: 'No recovery', col: COL.none, v: 65.1 }, { who: 'Robust-R1 SFT', col: COL.other, v: 63.1, d: -2.0 }, { who: 'Robust-R1 RL', col: COL.other, v: 62.7, d: -2.4 }] });
    const box = document.createElement('div'); box.className = 'bars'; $('#rwBody').appendChild(box);
    renderBars(box, g, 50, 85);
    $$('.brow', box).forEach((r) => (r.style.gridTemplateColumns = '104px 1fr 108px'));
  });
  growOnView($('#cleanBody'), () => {
    const C = [['V-MME Short', 71.8, 74.3, 74.4], ['V-MME Medium', 58.6, 60.2, 60.7], ['V-MME Long', 53.0, 55.0, 55.0], ['STAR', 69.0, 69.8, 71.2], ['NExT-QA', 81.8, 82.2, 83.4]];
    const box = document.createElement('div'); box.className = 'bars'; $('#cleanBody').appendChild(box);
    renderBars(box, C.map(([n, a, b, c]) => ({ name: n, rows: [{ who: 'Qwen3.5-9B', col: COL.none, v: a }, { who: 'ViRA-ZS', col: COL.zs, v: b, d: b - a }, { who: 'ViRA', col: COL.vira, v: c, d: c - a }] })), 40, 90);
    $$('.brow', box).forEach((r) => (r.style.gridTemplateColumns = '96px 1fr 108px'));
  });

  /* ---------- case study ---------- */
  const opts = $('#opts');
  opts.addEventListener('click', (e) => {
    const b = e.target.closest('.opt'); if (!b || opts.classList.contains('done')) return;
    opts.classList.add('done'); b.classList.add('pick');
    $('[data-k="B"]', opts).classList.add('right'); $('[data-k="B"] .tagx', opts).textContent = 'ViRA ✓';
    $('[data-k="C"]', opts).classList.add('wrong'); $('[data-k="C"] .tagx', opts).textContent = 'No-recovery ✗';
    $('#quizmsg').innerHTML = b.dataset.k === 'B' ? '<b style="color:var(--acc)">Correct.</b> ViRA got there too, but only after recovering frames 5–12. Direct inference picked C.' : `You picked <b>${b.dataset.k}</b>. The answer is <b>B</b>: drag the slider to reveal the cyclist on the motorway.`;
    const cut = { v: 50 }; if (!reduce) { let t0 = performance.now(); const an = (t) => { const p = Math.min(1, (t - t0) / 900); setCut(50 - 45 * Math.sin(p * Math.PI)); if (p < 1) requestAnimationFrame(an); }; requestAnimationFrame(an); }
  });
  const cmp = $('#cmp'), thumbs = $('#thumbs'); let cf = 2;
  const setCut = (p) => { p = Math.max(0, Math.min(100, p)); cmp.style.setProperty('--cut', p + '%'); cmp.setAttribute('aria-valuenow', Math.round(p)); };
  const setCF = (i) => {
    cf = (i + 8) % 8; $$('.lay', cmp).forEach((l) => (l.style.backgroundPosition = `${(cf / 7) * 100}% 0`));
    $('#cmpCor').textContent = `Frame ${cf + 5} · ${cf < 4 ? 'glass occlusion' : 'fog / smoke'}`;
    $$('button', thumbs).forEach((b, k) => b.classList.toggle('on', k === cf));
  };
  for (let i = 0; i < 8; i++) { const b = document.createElement('button'); b.className = 'g ' + (i < 4 ? 'glass' : 'fog'); b.style.backgroundPosition = `${(i / 7) * 100}% 0`; b.innerHTML = `<span>${i + 5}</span>`; b.setAttribute('aria-label', 'Frame ' + (i + 5)); b.onclick = () => setCF(i); thumbs.appendChild(b); }
  setCF(2); setCut(50);
  let dragging = false;
  const cmpMove = (e) => { const r = cmp.getBoundingClientRect(); setCut(((e.clientX - r.left) / r.width) * 100); };
  cmp.addEventListener('pointerdown', (e) => { dragging = true; cmp.setPointerCapture(e.pointerId); cmpMove(e); });
  cmp.addEventListener('pointermove', (e) => { if (dragging) cmpMove(e); });
  cmp.addEventListener('pointerup', () => (dragging = false));
  cmp.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { setCF(cf - 1); e.preventDefault(); } if (e.key === 'ArrowRight') { setCF(cf + 1); e.preventDefault(); }
    if (e.key === 'ArrowUp') { setCut(+cmp.getAttribute('aria-valuenow') + 5); e.preventDefault(); } if (e.key === 'ArrowDown') { setCut(+cmp.getAttribute('aria-valuenow') - 5); e.preventDefault(); }
  });

  /* ---------- radar (interactive, values read from the paper figure) ---------- */
  const RAX = [['Underexposure'], ['Low-light', 'noise'], ['Over-', 'exposure'], ['Color', 'cast'], ['Chromatic', 'aberration'], ['Defocus blur'], ['Motion', 'blur'], ['Fog /', 'smoke'], ['Dust', 'storm'], ['Glass', 'occlusion']];
  const RRANGE = {
    short: [[46.1, 59.8], [58.1, 62.1], [59.6, 63.6], [67.7, 71.7], [65.1, 69.1], [59.2, 63.2], [46.9, 50.9], [58.0, 66.3], [50.7, 54.9], [55.3, 66.0]],
    medium: [[44.6, 50.4], [47.9, 51.9], [51.0, 55.0], [56.1, 60.1], [53.4, 57.4], [48.6, 52.6], [41.4, 45.4], [48.7, 52.7], [45.4, 49.7], [47.8, 52.7]],
    long: [[41.9, 47.4], [46.5, 51.1], [47.4, 51.4], [48.7, 54.3], [47.9, 53.2], [45.4, 49.4], [41.1, 45.1], [46.0, 51.8], [43.0, 47.0], [46.0, 51.0]],
  };
  const RDATA = {
    short: { direct: [46.1, 60.2, 63.0, 68.7, 67.7, 59.9, 49.9, 58.0, 50.7, 55.3], zs: [57.1, 61.6, 63.6, 71.3, 69.1, 62.3, 49.0, 61.9, 51.2, 58.1], vira: [59.8, 62.1, 63.0, 71.7, 68.6, 63.2, 50.9, 66.3, 54.9, 66.0] },
    medium: { direct: [44.6, 51.2, 53.1, 58.4, 53.9, 49.3, 44.6, 50.7, 45.4, 47.8], zs: [48.2, 51.9, 55.0, 59.8, 55.6, 49.8, 43.2, 51.4, 46.7, 48.4], vira: [50.4, 51.3, 54.3, 60.1, 57.4, 52.6, 45.4, 52.7, 49.7, 52.7] },
    long: { direct: [41.9, 46.5, 48.9, 48.7, 47.9, 47.6, 43.5, 46.0, 43.1, 46.0], zs: [47.4, 49.3, 50.6, 51.8, 50.3, 47.6, 45.1, 49.1, 47.0, 47.0], vira: [46.3, 51.1, 51.4, 54.3, 53.2, 49.4, 43.4, 51.8, 45.9, 51.0] },
  };
  const RS = ['direct', 'zs', 'vira'], RNAME = { direct: 'Direct', zs: 'ViRA-ZS', vira: 'ViRA' }, RCOL = { direct: 'var(--direct)', zs: 'var(--zs)', vira: 'var(--acc)' };
  const CX = 280, CY = 242, RR = 176, SH = [40, 72];
  let rDur = 'short', rMode = 'axis', rHover = 0, rShown = new Set(RS), rCur = null, rAnim, rAuto, rTouched = false;
  const rFrac = (i, v) => { const [lo, hi] = rMode === 'axis' ? RRANGE[rDur][i] : SH; return 0.3 + 0.7 * Math.max(-0.35, Math.min(1.05, (v - lo) / (hi - lo))); };
  const rXY = (i, f) => { const a = (i * 36 * Math.PI) / 180; return [CX + RR * f * Math.sin(a), CY - RR * f * Math.cos(a)]; };
  const stageEl = $('#radarStage');
  stageEl.innerHTML = `<svg viewBox="0 0 560 480" role="img" aria-label="Radar chart of accuracy per degradation type">
    ${[0.3, 0.475, 0.65, 0.825, 1].map((f) => `<circle class="rg" cx="${CX}" cy="${CY}" r="${RR * f}"/>`).join('')}
    ${RAX.map((_, i) => { const [x, y] = rXY(i, 1); return `<line class="sp" data-i="${i}" x1="${CX}" y1="${CY}" x2="${x}" y2="${y}"/>`; }).join('')}
    ${RS.map((k) => `<polygon class="pg" data-s="${k}" style="--c:${RCOL[k]}"/>`).join('')}
    ${RS.map((k) => RAX.map((_, i) => `<circle class="pt" data-s="${k}" data-i="${i}" r="3.6" style="--c:${RCOL[k]}"/>`).join('')).join('')}
    ${RAX.map((n, i) => { const [x, y] = rXY(i, 1.13), sx = Math.sin((i * 36 * Math.PI) / 180); const anc = sx > 0.2 ? 'start' : sx < -0.2 ? 'end' : 'middle';
      return `<text class="al" data-i="${i}" x="${x}" y="${y - (n.length - 1) * 8}" text-anchor="${anc}">${n.map((w, k) => `<tspan x="${x}" dy="${k ? 17 : 5}">${w}</tspan>`).join('')}</text>`; }).join('')}
    <g id="radTicks"></g></svg>`;
  const rPolys = $$('.pg', stageEl), rPts = $$('.pt', stageEl);
  const rDraw = (F) => {
    rPolys.forEach((pg) => pg.setAttribute('points', F[pg.dataset.s].map((f, i) => rXY(i, f).join(',')).join(' ')));
    rPts.forEach((c) => { const [x, y] = rXY(+c.dataset.i, F[c.dataset.s][+c.dataset.i]); c.setAttribute('cx', x); c.setAttribute('cy', y); });
  };
  const rTicks = () => {
    const g = $('#radTicks'), i = rHover; let h = '';
    const lab = (f, v, ax) => { const [x, y] = rXY(ax, f); return `<text class="tk" x="${x + 5}" y="${y - 4}">${fmt(v)}</text>`; };
    if (rMode === 'axis') { const [lo, hi] = RRANGE[rDur][i]; [0, 0.5, 1].forEach((u) => (h += lab(0.3 + 0.7 * u, lo + (hi - lo) * u, i))); }
    else [0, 0.25, 0.5, 0.75, 1].forEach((u) => (h += lab(0.3 + 0.7 * u, SH[0] + (SH[1] - SH[0]) * u, 0)));
    g.innerHTML = h;
  };
  const rOut = () => {
    const i = rHover, d = RDATA[rDur], base = d.direct[i];
    $$('.sp', stageEl).forEach((l) => l.classList.toggle('on', +l.dataset.i === i));
    $$('.al', stageEl).forEach((l) => l.classList.toggle('on', +l.dataset.i === i));
    rPts.forEach((c) => c.classList.toggle('on', +c.dataset.i === i));
    $('#radOut').innerHTML = `<div class="rk">${{ short: 'Video-MME Short', medium: 'Video-MME Medium', long: 'Video-MME Long' }[rDur]} · all frames corrupted</div><div class="rn">${RAX[i].join(' ').replace('- ', '')}</div>` +
      RS.map((k) => `<div class="rr"><span>${RNAME[k]}</span><div class="tr"><i style="width:${((d[k][i] - 35) / 40) * 100}%;background:${RCOL[k]}"></i></div><b>${fmt(d[k][i])}</b>${k === 'direct' ? '<em></em>' : `<span class="delta ${d[k][i] - base > 0.05 ? 'up' : d[k][i] - base < -0.05 ? 'dn' : 'eq'}">${sgn(d[k][i] - base)}</span>`}</div>`).join('');
    rTicks();
  };
  const rGo = () => {
    const T = {}; RS.forEach((k) => (T[k] = RDATA[rDur][k].map((v, i) => rFrac(i, v))));
    if (!rCur || reduce) { rCur = T; rDraw(T); rOut(); return; }
    const A = rCur, t0 = performance.now(); cancelAnimationFrame(rAnim);
    const tick = (t) => { const p = Math.min(1, (t - t0) / 750), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2, F = {};
      RS.forEach((k) => (F[k] = A[k].map((a, i) => a + (T[k][i] - a) * e))); rCur = F; rDraw(F); if (p < 1) rAnim = requestAnimationFrame(tick); };
    rAnim = requestAnimationFrame(tick); rOut();
  };
  const radSeg = seg($('#radSeg'), (v) => { rDur = v; rTouched = true; rGo(); });
  seg($('#radScale'), (v) => { rMode = v; rTouched = true; rGo(); });
  $('#radChips').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; const k = b.dataset.s;
    if (rShown.has(k) && rShown.size > 1) rShown.delete(k); else rShown.add(k);
    $$('button', $('#radChips')).forEach((x) => x.setAttribute('aria-pressed', rShown.has(x.dataset.s)));
    [...rPolys, ...rPts].forEach((el) => el.classList.toggle('off', !rShown.has(el.dataset.s)));
  });
  const rPick = (e) => {
    const svg = $('svg', stageEl), r = svg.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * 560 - CX, y = ((e.clientY - r.top) / r.height) * 480 - CY;
    const i = Math.round((((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360) / 36) % 10;
    rTouched = true; if (i !== rHover) { rHover = i; rOut(); }
  };
  stageEl.addEventListener('pointermove', rPick); stageEl.addEventListener('pointerdown', rPick);
  rGo();
  new IntersectionObserver((es) => {
    clearInterval(rAuto);
    if (es[0].isIntersecting && !reduce) rAuto = setInterval(() => { if (rTouched) return clearInterval(rAuto); rHover = (rHover + 1) % 10; rOut(); }, 1500);
  }, { threshold: 0.4 }).observe(stageEl);

  /* ---------- efficiency ---------- */
  const EFF = {
    zs: { name: 'ViRA-ZS', rate: 30.1, notool: 3.30, tool: 7.17, reason: 1.74, avg: 4.48 },
    vira: { name: 'ViRA', rate: 76.6, notool: 3.48, tool: 8.16, reason: 3.24, avg: 7.06 },
  };
  const DIRECT = 2.65, ROUTE = 3.9, MAXS = 9;
  let em = 'vira';
  const lat = $('#lat'), rng = $('#effRange');
  const seg_ = (v, col, tipTxt) => `<i style="background:${col}" data-w="${(v / MAXS) * 100}" data-tip="${tipTxt}"></i>`;
  const drawEff = () => {
    const E = EFF[em], rest = E.tool - ROUTE - E.reason;
    lat.innerHTML = [
      ['Direct inference', [seg_(DIRECT, 'var(--direct)', '<b>Direct</b> · 2.65 s')], DIRECT],
      ['No-tool path', [seg_(E.notool, 'var(--direct)', `<b>Routing → answer</b> · ${fmt(E.notool, 2)} s<br>+${fmt(E.notool - DIRECT, 2)} s over direct`)], E.notool],
      ['Recovery path', [seg_(ROUTE, 'var(--sky)', '<b>Routing</b> ≈ 3.9 s'), seg_(rest, 'var(--acc)', `<b>Restoration</b> ≈ ${fmt(rest, 2)} s`), seg_(E.reason, 'var(--zs)', `<b>Re-reasoning</b> · ${fmt(E.reason, 2)} s`)], E.tool],
    ].map(([n, s, v]) => `<div class="lrow"><span class="who">${n}</span><div class="tr">${s.join('')}</div><span class="v">${fmt(v, 2)} s</span></div>`).join('') +
      `<div class="lrow live"><span class="who" id="effLab"></span><div class="tr"><i class="lv" id="effA" style="background:var(--direct)"></i><i class="lv" id="effB" style="background:linear-gradient(90deg,var(--acc),var(--sky))"></i><b class="mk" id="effMk"></b></div><span class="v" id="effVal"></span></div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => $$('i[data-w]', lat).forEach((i) => (i.style.width = i.dataset.w + '%'))));
    $('#effMarks').innerHTML = Object.values(EFF).map((x) => `<button style="left:${x.rate}%" data-r="${x.rate}">${x.name} ${x.rate}%</button>`).join('');
    $$('#effMarks button').forEach((b) => b.addEventListener('click', () => { rng.value = b.dataset.r; upd(); }));
    rng.value = E.rate; upd();
  };
  const upd = () => {
    const E = EFF[em], r = rng.value / 100, t = Math.abs(rng.value - E.rate) < 0.06 ? E.avg : r * E.tool + (1 - r) * E.notool;
    rng.style.setProperty('--p', rng.value + '%');
    $('#effBig').innerHTML = `${fmt(t, 2)} s<small>${fmt(t / DIRECT)}× direct</small>`;
    $('#effRate').textContent = fmt(+rng.value) + '% recover';
    // the last chart row follows the slider: share of time on the no-tool path + share on the recovery path
    const a = $('#effA'), b = $('#effB'); if (!a) return;
    const wa = ((1 - r) * E.notool / MAXS) * 100, wb = (r * E.tool / MAXS) * 100, atMeasured = Math.abs(rng.value - E.rate) < 0.06;
    a.style.width = wa + '%'; b.style.width = wb + '%';
    a.dataset.tip = `<b>No-tool path</b> · ${fmt((1 - r) * 100)}% of samples × ${fmt(E.notool, 2)} s`;
    b.dataset.tip = `<b>Recovery path</b> · ${fmt(r * 100)}% of samples × ${fmt(E.tool, 2)} s`;
    $('#effLab').textContent = atMeasured ? `${E.name} average` : `Expected at ${fmt(+rng.value, 0)}%`;
    $('#effVal').textContent = fmt(t, 2) + ' s';
    $('#effMk').style.left = (E.avg / MAXS) * 100 + '%'; $('#effMk').dataset.tip = `<b>Measured ${E.name} average</b> · ${fmt(E.avg, 2)} s at ${E.rate}% recovery`;
  };
  rng.addEventListener('input', upd);
  seg($('#effSeg'), (v) => { em = v; drawEff(); });
  growOnView(lat, drawEff);

  /* ---------- AKS ---------- */
  const AKS = { clean: [[67.9, 71.8], [68.3, 69.0], [79.0, 81.8]], uni: [[54.4, 57.9], [46.3, 47.7], [65.2, 65.6]], aks: [[56.9, 59.3], [46.7, 47.7], [64.9, 66.9]], zs: [[57.1, 60.4], [44.6, 47.6], [68.0, 68.1]], vira: [[61.2, 63.1], [52.7, 52.2], [69.7, 71.3]] };
  let ab = 1;
  const drawAks = () => renderBars($('#aksBody'), ['V-MME Short', 'STAR', 'NExT-QA'].map((n, b) => ({ name: n, clean: AKS.clean[b][ab], note: 'clean ' + fmt(AKS.clean[b][ab]),
    rows: [{ who: 'Uniform', col: 'var(--line)', v: AKS.uni[b][ab] }, { who: 'AKS', col: COL.none, v: AKS.aks[b][ab] },
      { who: 'AKS + ZS', col: COL.zs, v: AKS.zs[b][ab], d: AKS.zs[b][ab] - AKS.aks[b][ab] }, { who: 'AKS + ViRA', col: COL.vira, v: AKS.vira[b][ab], d: AKS.vira[b][ab] - AKS.aks[b][ab] }] })), 30, 90);
  seg($('#aksSeg'), (v) => { ab = +v; drawAks(); });
  growOnView($('#aksBody'), drawAks);

  /* ---------- copy bibtex ---------- */
  $('#copyBib').addEventListener('click', async (e) => {
    const b = e.currentTarget, txt = $('#bib').innerText;
    try { await navigator.clipboard.writeText(txt); } catch (err) {
      const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e2) {} ta.remove();
    }
    b.classList.add('ok'); $('span', b).textContent = 'Copied'; toast('BibTeX copied to clipboard');
    setTimeout(() => { b.classList.remove('ok'); $('span', b).textContent = 'Copy'; }, 1800);
  });

  /* ---------- polish: marquee, card spotlight, heading words, footer wordmark ---------- */
  const MQ = ['Underexposure', 'Overexposure', 'Low-light noise', 'Color cast', 'Chromatic aberration', 'Defocus blur', 'Motion blur', 'Fog / smoke', 'Dust storm', 'Glass occlusion'];
  const mqHtml = MQ.map((n) => `<span><s>${n}</s><b>recovered</b></span>`).join('');
  $('#mq').innerHTML = mqHtml + mqHtml;
  document.addEventListener('pointermove', (e) => {
    const c = e.target.closest && e.target.closest('.card, .contents a'); if (!c) return;
    const r = c.getBoundingClientRect(); c.style.setProperty('--sx', e.clientX - r.left + 'px'); c.style.setProperty('--sy', e.clientY - r.top + 'px');
  }, { passive: true });
  $$('.sec-head h2').forEach((h) => { h.innerHTML = h.textContent.split(' ').map((w, i) => `<span class="wd" style="--i:${i}">${w}</span>`).join(' '); });
  const wm = $('#wordmark');
  wm.parentElement.addEventListener('pointermove', (e) => { const r = wm.getBoundingClientRect(); wm.style.setProperty('--fx', e.clientX - r.left + 'px'); wm.style.setProperty('--fy', e.clientY - r.top + 'px'); });
  addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'd' && !e.metaKey && !e.ctrlKey && !/input|select|textarea/i.test(e.target.tagName)) $('#theme').click(); });

  /* ---------- overview film ---------- */
  const fv = $('#filmV'), fbox = $('#filmBox'), fbar = $('#filmBar'), FD = 63;
  const CH = [['Title', 0], ['Background', 6], ['The problem', 16.5], ['Method', 25.5], ['Toolbox', 40], ['Results', 47.5]];
  $('#filmMarks').innerHTML = CH.slice(1).map(([, t]) => `<b style="left:${(t / FD) * 100}%"></b>`).join('');
  $('#filmCh').innerHTML = CH.map(([n, t], k) => `<button data-t="${t}"><i>${String(k + 1).padStart(2, '0')}</i>${n}</button>`).join('');
  const chBtns = $$('#filmCh button'); let fLoaded = false, fUser = false;
  const fLoad = () => { if (!fLoaded) { fv.src = fv.dataset.src; fLoaded = true; } };
  const fPlay = () => { fLoad(); const p = fv.play(); if (p && p.catch) p.catch(() => {}); };
  const fmtT = (x) => Math.floor(x / 60) + ':' + String(Math.floor(x % 60)).padStart(2, '0');
  const fSeek = (t) => { fLoad(); const go = () => { fv.currentTime = Math.max(0, Math.min(FD - 0.05, t)); }; if (fv.readyState >= 1) go(); else fv.addEventListener('loadedmetadata', go, { once: true }); };
  const fSync = () => {
    const t = fv.currentTime || 0; $('#filmFill').style.width = (t / FD) * 100 + '%'; $('#filmTime').textContent = fmtT(t) + ' / ' + fmtT(FD); fbar.setAttribute('aria-valuenow', Math.round(t));
    let k = 0; CH.forEach(([, s0], n) => { if (t >= s0 - 0.05) k = n; }); chBtns.forEach((b, n) => b.classList.toggle('on', n === k));
  };
  fv.addEventListener('timeupdate', fSync);
  fv.addEventListener('play', () => fbox.classList.add('playing')); fv.addEventListener('pause', () => fbox.classList.remove('playing'));
  const fToggle = () => { fUser = true; fbox.classList.add('started'); if (fv.paused) fPlay(); else fv.pause(); };
  $('#filmBig').addEventListener('click', fToggle); $('#filmPlay').addEventListener('click', fToggle); fv.addEventListener('click', fToggle);
  chBtns.forEach((b) => b.addEventListener('click', () => { fUser = true; fbox.classList.add('started'); fSeek(+b.dataset.t); fPlay(); }));
  let fDrag = false; const fAt = (e) => { const r = fbar.getBoundingClientRect(); fSeek(((e.clientX - r.left) / r.width) * FD); fSync(); };
  fbar.addEventListener('pointerdown', (e) => { fDrag = true; fbar.setPointerCapture(e.pointerId); fbox.classList.add('started'); fAt(e); });
  fbar.addEventListener('pointermove', (e) => { if (fDrag) fAt(e); }); fbar.addEventListener('pointerup', () => (fDrag = false));
  fbar.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') fSeek(fv.currentTime + 5); if (e.key === 'ArrowLeft') fSeek(fv.currentTime - 5); if (e.key === ' ') { e.preventDefault(); fToggle(); } });
  $('#filmFs').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else if (fbox.requestFullscreen) fbox.requestFullscreen(); else if (fv.webkitEnterFullscreen) fv.webkitEnterFullscreen(); });
  // plays muted while on screen unless the visitor paused it; never auto-plays under reduced motion
  new IntersectionObserver((es) => { const on = es[0].isIntersecting;
    if (on && !reduce && !fUser) { fbox.classList.add('started'); fPlay(); } else if (!on && !fv.paused) fv.pause();
  }, { threshold: 0.55 }).observe(fbox);
  fSync();
})();
