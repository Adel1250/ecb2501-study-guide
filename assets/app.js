(function(){
  /* ---------- Shared top navigation ---------- */
  const PAGES = [
    ['index.html', 'Home'],
    ['toolkit.html', 'Math toolkit'],
    ['lecture-1.html', 'L1 · Intro'],
    ['lecture-2.html', 'L2 · Atoms'],
    ['lecture-3.html', 'L3 · Bonding + Sec 2'],
    ['lecture-4.html', 'L4 · Crystals + Sec 3 & 4'],
    ['cheat-sheet.html', 'Cheat sheet']
  ];
  const here = (location.pathname.split('/').pop() || 'index.html');
  const bar = document.createElement('nav');
  bar.className = 'topbar';
  bar.innerHTML = '<div class="in">' + PAGES.map(([href, label], i) => {
    const cls = [i === 0 ? 'brand' : '', href === here ? 'on' : ''].filter(Boolean).join(' ');
    return '<a href="' + href + '"' + (cls ? ' class="' + cls + '"' : '') + (href === here ? ' aria-current="page"' : '') + '>' + (i === 0 ? '🔬 ECB2501' : label) + '</a>';
  }).join('') + '</div>';
  document.body.prepend(bar);
  // on narrow screens, scroll the nav so the current page's link is visible
  const onLink = bar.querySelector('a.on:not(.brand)');
  if (onLink){ const row = bar.firstChild; row.scrollLeft = onLink.offsetLeft - (row.clientWidth - onLink.offsetWidth) / 2; }
  const idx = PAGES.findIndex(p => p[0] === here);
  const pager = document.getElementById('pager');
  if (pager && idx >= 0){
    const prev = PAGES[idx - 1], next = PAGES[idx + 1];
    pager.className = 'pager';
    pager.innerHTML = (prev ? '<a href="' + prev[0] + '"><small>← Previous</small><b>' + prev[1] + '</b></a>' : '<span></span>') +
                      (next ? '<a class="next" href="' + next[0] + '"><small>Next →</small><b>' + next[1] + '</b></a>' : '');
  }

  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function setupCanvas(c){
    if (!c._ar) c._ar = c.height / c.width;
    const dpr = window.devicePixelRatio || 1, w = c.clientWidth;
    // phones: use a taller drawing so plots don't get squashed
    const ar = w < 560 ? Math.max(c._ar, +(c.dataset.mobileAr || 0.85)) : c._ar;
    const h = Math.round(w * ar);
    c._w = w; c._h = h; c.width = w * dpr; c.height = h * dpr;
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return ctx;
  }
  const redraws = [];

  /* ---------- Bond energy curve (Lecture 3 / Section 2) ---------- */
  const bc = document.getElementById('bondCanvas');
  if (bc){
    const A = 1.436, B = 5.86e-6, n = 9;
    const EA = r => -A / r, ER = r => B / Math.pow(r, n), EN = r => EA(r) + ER(r);
    const r0 = Math.pow(A / (n * B), 1 / (1 - n)), E0 = EN(r0);
    const slider = document.getElementById('rSlider'), ro = document.getElementById('bondReadout');
    function drawBond(){
      const ctx = setupCanvas(bc), W = bc._w, H = bc._h;
      const padL = 46, padR = 14, padT = 18, padB = Math.min(120, Math.round(H * 0.3));
      const rmin = 0.2, rmax = 0.8, emin = -7, emax = 6;
      const X = r => padL + (r - rmin) / (rmax - rmin) * (W - padL - padR);
      const Y = e => padT + (emax - e) / (emax - emin) * (H - padT - padB);
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = css('--line'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, Y(0)); ctx.lineTo(W - padR, Y(0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, H - padB); ctx.stroke();
      ctx.fillStyle = css('--muted'); ctx.font = '12px sans-serif';
      ctx.fillText('Energy (eV)', padL + 4, padT + 10);
      ctx.fillText('distance r (nm) →', W - padR - 110, Y(0) - 6);
      function curve(f, col, w){
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); let started = false;
        for (let px = 0; px <= W - padL - padR; px += 1.5){
          const r = rmin + px / (W - padL - padR) * (rmax - rmin);
          const y = Math.max(padT - 4, Math.min(H - padB + 4, Y(f(r))));
          if (!started){ ctx.moveTo(X(r), y); started = true; } else ctx.lineTo(X(r), y);
        }
        ctx.stroke();
      }
      ctx.save(); ctx.beginPath(); ctx.rect(padL, padT, W - padL - padR, H - padT - padB); ctx.clip();
      curve(EA, css('--accent'), 2); curve(ER, css('--blue'), 2); curve(EN, css('--green'), 4);
      ctx.restore();
      ctx.setLineDash([4, 4]); ctx.strokeStyle = css('--muted'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(r0), Y(0)); ctx.lineTo(X(r0), Y(E0)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = css('--ink'); ctx.font = 'bold 13px sans-serif';
      ctx.fillText('r₀', X(r0) - 6, Y(0) - 8);
      ctx.fillText('E₀ (depth)', X(r0) + 10, Y(E0) + 4);
      const r = +slider.value, e = EN(r);
      ctx.fillStyle = css('--ink'); ctx.beginPath(); ctx.arc(X(r), Math.max(padT, Y(e)), 8, 0, 7); ctx.fill();
      const cy = H - padB / 2 + 5, cx = W / 2, scale = (W - 80) / 1.9, d = r * scale, rad = Math.min(38, W / 14);
      [[cx - d / 2, css('--accent'), 'K⁺'], [cx + d / 2, css('--blue'), 'Cl⁻']].forEach(([x, c, t]) => {
        const g = ctx.createRadialGradient(x - rad / 3, cy - rad / 3, 2, x, cy, rad);
        g.addColorStop(0, '#fff'); g.addColorStop(1, c);
        ctx.globalAlpha = .92; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, cy, rad, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(t, x, cy + 5); ctx.textAlign = 'left';
      });
      const h = 1e-5, F = -(EN(r + h) - EN(r - h)) / (2 * h);
      const len = Math.max(-1, Math.min(1, F / 15)) * 50;
      if (Math.abs(len) > 3){
        ctx.strokeStyle = css('--ink'); ctx.fillStyle = css('--ink'); ctx.lineWidth = 3;
        [[-1, cx - d / 2 - rad - 6], [1, cx + d / 2 + rad + 6]].forEach(([s, x0]) => {
          const dir = s * Math.sign(len), L = Math.abs(len);
          const start = len > 0 ? x0 : x0 + s * (L + 6), end = start + dir * L;
          ctx.beginPath(); ctx.moveTo(start, cy); ctx.lineTo(end, cy); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(end + dir * 8, cy); ctx.lineTo(end, cy - 6); ctx.lineTo(end, cy + 6); ctx.fill();
        });
      }
      if (Math.abs(r - r0) < 0.008) ro.textContent = '⚖️ Perfect balance! r = r₀ ≈ ' + r0.toFixed(3) + ' nm, force = 0, energy at its lowest (E₀ ≈ ' + E0.toFixed(2) + ' eV)';
      else if (r < r0) ro.textContent = '💥 Too close! Repulsion wins, so the ions get pushed apart. (r = ' + r.toFixed(3) + ' nm)';
      else ro.textContent = '🧲 Too far! Attraction wins, so the ions get pulled together. (r = ' + r.toFixed(3) + ' nm)';
    }
    slider.addEventListener('input', drawBond);
    redraws.push(drawBond);
  }

  /* ---------- Bonding energy vs melting temperature (Section 2, Example 2) ---------- */
  const mc = document.getElementById('meltCanvas');
  if (mc){
    const pts = [['Hg', -39, 62], ['Al', 660, 330], ['Ag', 962, 285], ['W', 3414, 850]];
    const mx = pts.reduce((s, p) => s + p[1], 0) / 4, my = pts.reduce((s, p) => s + p[2], 0) / 4;
    const slope = pts.reduce((s, p) => s + (p[1] - mx) * (p[2] - my), 0) / pts.reduce((s, p) => s + (p[1] - mx) ** 2, 0);
    const icpt = my - slope * mx;
    const ms = document.getElementById('meltSlider'), mro = document.getElementById('meltReadout');
    function drawMelt(){
      const T = ms ? +ms.value : 1085, est = icpt + slope * T;
      const ctx = setupCanvas(mc), W = mc._w, H = mc._h, pl = 56, pr = 16, pt = 16, pb = 44;
      const X = t => pl + (t + 500) / 4500 * (W - pl - pr), Y = e => pt + (950 - e) / 950 * (H - pt - pb);
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = css('--line'); ctx.fillStyle = css('--muted'); ctx.font = '12px sans-serif'; ctx.lineWidth = 1;
      for (let t = -500; t <= 4000; t += 500){ ctx.beginPath(); ctx.moveTo(X(t), pt); ctx.lineTo(X(t), H - pb); ctx.stroke(); if (W > 500 || t % 1000 === 0) ctx.fillText(t, X(t) - 12, H - pb + 16); }
      for (let e = 0; e <= 900; e += 100){ ctx.beginPath(); ctx.moveTo(pl, Y(e)); ctx.lineTo(W - pr, Y(e)); ctx.stroke(); ctx.fillText(e, pl - 34, Y(e) + 4); }
      ctx.fillText('Melting temperature (°C)', W / 2 - 70, H - 6);
      ctx.save(); ctx.translate(14, H / 2 + 60); ctx.rotate(-Math.PI / 2); ctx.fillText('Bonding energy (kJ/mol)', 0, 0); ctx.restore();
      ctx.strokeStyle = css('--green'); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(-300), Y(icpt + slope * -300)); ctx.lineTo(X(3800), Y(icpt + slope * 3800)); ctx.stroke();
      ctx.setLineDash([5, 5]); ctx.strokeStyle = css('--accent'); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(X(T), Y(0)); ctx.lineTo(X(T), Y(est)); ctx.lineTo(pl, Y(est)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = css('--accent'); ctx.beginPath(); ctx.arc(X(T), Y(est), 7, 0, 7); ctx.fill();
      ctx.font = 'bold 14px sans-serif'; ctx.fillText((T === 1085 ? 'Cu ' : '') + '≈ ' + Math.round(est), X(T) + 10, Y(est) - 8);
      pts.forEach(p => { ctx.fillStyle = css('--blue'); ctx.beginPath(); ctx.arc(X(p[1]), Y(p[2]), 7, 0, 7); ctx.fill(); ctx.fillStyle = css('--ink'); ctx.fillText(p[0], X(p[1]) + 10, Y(p[2]) + 18); });
      mro.textContent = T === 1085
        ? '👉 Copper (1085 °C): reading the line gives ≈ ' + Math.round(est) + ' kJ/mol. The slides say ≈ 345. ✅'
        : '👉 A metal melting at ' + T + ' °C would have a bonding energy of about ' + Math.round(est) + ' kJ/mol.';
    }
    if (ms) ms.addEventListener('input', drawMelt);
    redraws.push(drawMelt);
  }

  /* ---------- 3D unit cell viewer (Lecture 4 / Sections 3 & 4) ---------- */
  const cc = document.getElementById('cellCanvas');
  if (cc){
    const facts = document.getElementById('cellFacts'), note = document.getElementById('cellNote'), sizeBtn = document.getElementById('sizeBtn');
    let cell = cc.dataset.start || 'SC', realSize = false, rotY = 0.6, rotX = -0.35, dragging = false, lx = 0, ly = 0, auto = true;
    const S3 = Math.sqrt(3), S2 = Math.sqrt(2);
    const cubeCorners = () => { const p = []; for (const x of [0, 1]) for (const y of [0, 1]) for (const z of [0, 1]) p.push([x, y, z, 'c']); return p; };
    const cubeEdges = (() => { const e = [], c = cubeCorners(); for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++){ const d = c[i].slice(0, 3).reduce((s, v, k) => s + Math.abs(v - c[j][k]), 0); if (d === 1) e.push([c[i], c[j]]); } return e; })();
    function build(){
      if (cell === 'SC') return {atoms: cubeCorners(), edges: cubeEdges, R: .5, info: [['a', '2R'], ['Atoms', '8 × ⅛ = 1'], ['Neighbours', '6'], ['APF', '0.52']], txt: 'Corner atoms only. Turn on "real size" to see them touch along each edge.'};
      if (cell === 'BCC') return {atoms: cubeCorners().concat([[.5, .5, .5, 'i']]), edges: cubeEdges, R: S3 / 4, info: [['a', '4R/√3'], ['Atoms', '8 × ⅛ + 1 = 2'], ['Neighbours', '8'], ['APF', '0.68']], txt: 'The orange atom in the middle touches all 8 corners, along the body diagonals.'};
      if (cell === 'FCC'){
        const atoms = cubeCorners(); [[.5, .5, 0], [.5, .5, 1], [.5, 0, .5], [.5, 1, .5], [0, .5, .5], [1, .5, .5]].forEach(p => atoms.push(p.concat('f')));
        return {atoms, edges: cubeEdges, R: S2 / 4, info: [['a', '2√2 R'], ['Atoms', '8 × ⅛ + 6 × ½ = 4'], ['Neighbours', '12'], ['APF', '0.74']], txt: 'The green face atoms touch the corner atoms along each face diagonal.'};
      }
      const a = 0.62, c = 1.633 * a, edges = [];
      const hex = z => { const pts = []; for (let k = 0; k < 6; k++){ const t = k * Math.PI / 3; pts.push([.5 + a * Math.cos(t), z, .5 + a * Math.sin(t), 'c']); } return pts; };
      const top = hex(.5 + c / 2), bot = hex(.5 - c / 2);
      const atoms = top.concat(bot, [[.5, .5 + c / 2, .5, 'f'], [.5, .5 - c / 2, .5, 'f']]);
      for (let k = 0; k < 3; k++){ const t = Math.PI / 6 + k * 2 * Math.PI / 3; atoms.push([.5 + a / S3 * Math.cos(t), .5, .5 + a / S3 * Math.sin(t), 'i']); }
      for (let k = 0; k < 6; k++) edges.push([top[k], top[(k + 1) % 6]], [bot[k], bot[(k + 1) % 6]], [top[k], bot[k]]);
      return {atoms, edges, R: a / 2, hcp: true, info: [['c / a', '1.633'], ['Atoms', '12×⅙ + 2×½ + 3 = 6'], ['Neighbours', '12'], ['APF', '0.74']], txt: 'Grey = hexagon corners, green = face centres, orange = the 3 middle atoms sitting in the dips at height c/2.'};
    }
    function drawCell(){
      const ctx = setupCanvas(cc), W = cc._w, H = cc._h, m = build();
      ctx.clearRect(0, 0, W, H);
      const sc = Math.min(W, H) * 0.5;
      const proj = p => {
        const x = p[0] - .5, y = m.hcp ? p[1] - .5 : p[2] - .5, z = m.hcp ? p[2] - .5 : p[1] - .5;
        const x1 = x * Math.cos(rotY) + z * Math.sin(rotY), z1 = -x * Math.sin(rotY) + z * Math.cos(rotY);
        const y1 = y * Math.cos(rotX) - z1 * Math.sin(rotX), z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);
        const f = 3.2 / (3.2 + z2);
        return [W / 2 + x1 * sc * f, H / 2 - y1 * sc * f, z2, f];
      };
      ctx.strokeStyle = css('--muted'); ctx.lineWidth = 1.6;
      m.edges.forEach(([p, q]) => { const a = proj(p), b = proj(q); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); });
      const col = {c: '#9aa3b5', i: css('--accent'), f: css('--green')};
      const list = m.atoms.map(p => ({p, s: proj(p)})).sort((u, v) => v.s[2] - u.s[2]);
      const rr = realSize ? m.R : 0.09;
      ctx.globalAlpha = realSize ? 0.82 : 1;
      list.forEach(({p, s}) => {
        const r = rr * sc * s[3], g = ctx.createRadialGradient(s[0] - r / 3, s[1] - r / 3, r * 0.1, s[0], s[1], r);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, col[p[3]]);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s[0], s[1], r, 0, 7); ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (realSize && !m.hcp){ ctx.fillStyle = css('--muted'); ctx.font = '12px sans-serif'; ctx.fillText('Real size: atoms poke outside the box; only the slices inside belong to this cell.', 10, H - 10); }
    }
    function renderFacts(){ const m = build(); facts.innerHTML = m.info.map(([k, v]) => '<div class="fact"><b>' + k + '</b><span>' + v + '</span></div>').join(''); note.textContent = m.txt; }
    document.querySelectorAll('#cellBtns [data-cell]').forEach(b => {
      b.classList.toggle('on', b.dataset.cell === cell);
      b.addEventListener('click', () => {
        document.querySelectorAll('#cellBtns [data-cell]').forEach(x => x.classList.remove('on')); b.classList.add('on'); cell = b.dataset.cell; renderFacts(); drawCell();
      });
    });
    document.querySelectorAll('[data-show-cell]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault(); const btn = document.querySelector('#cellBtns [data-cell="' + a.dataset.showCell + '"]'); if (btn) btn.click();
      cc.scrollIntoView({behavior: 'smooth', block: 'center'});
    }));
    sizeBtn.addEventListener('click', () => { realSize = !realSize; sizeBtn.classList.toggle('on', realSize); sizeBtn.textContent = realSize ? 'Show skeleton' : 'Show real size'; drawCell(); });
    cc.addEventListener('pointerdown', e => { dragging = true; auto = false; lx = e.clientX; ly = e.clientY; cc.setPointerCapture(e.pointerId); });
    cc.addEventListener('pointermove', e => { if (!dragging) return; rotY += (e.clientX - lx) * 0.01; rotX = Math.max(-1.4, Math.min(1.4, rotX + (e.clientY - ly) * 0.01)); lx = e.clientX; ly = e.clientY; drawCell(); });
    cc.addEventListener('pointerup', () => dragging = false);
    (function tick(){ if (auto){ rotY += 0.006; drawCell(); } requestAnimationFrame(tick); })();
    renderFacts();
    redraws.push(drawCell);
  }

  /* ---------- Density calculator (Lecture 4) ---------- */
  const dc = document.getElementById('densityCalc');
  if (dc){
    // name, structure, R (nm), A (g/mol), measured density (g/cm3)
    const METALS = [
      ['Aluminum', 'FCC', 0.1431, 26.98, 2.71], ['Copper', 'FCC', 0.1278, 63.55, 8.94], ['Gold', 'FCC', 0.1442, 196.97, 19.32],
      ['Lead', 'FCC', 0.1750, 207.2, 11.35], ['Nickel', 'FCC', 0.1246, 58.69, 8.90], ['Platinum', 'FCC', 0.1387, 195.08, 21.45],
      ['Silver', 'FCC', 0.1445, 107.87, 10.49], ['Chromium', 'BCC', 0.1249, 52.00, 7.19], ['Iron (α)', 'BCC', 0.1241, 55.85, 7.87],
      ['Molybdenum', 'BCC', 0.1363, 95.94, 10.22], ['Tantalum', 'BCC', 0.1430, 180.95, 16.6], ['Tungsten', 'BCC', 0.1371, 183.84, 19.3]
    ];
    const sel = dc.querySelector('select'), out = dc.querySelector('.calcout');
    sel.innerHTML = METALS.map((m, i) => '<option value="' + i + '">' + m[0] + ' (' + m[1] + ')</option>').join('');
    sel.value = 1;
    function calc(){
      const [name, st, Rnm, A, meas] = METALS[+sel.value];
      const R = Rnm * 1e-7; // cm
      const n = st === 'FCC' ? 4 : 2;
      const k = st === 'FCC' ? 16 * Math.SQRT2 : 64 / (3 * Math.sqrt(3));
      const Vc = k * R ** 3, rho = n * A / (Vc * 6.022e23);
      const err = Math.abs(rho - meas) / meas * 100;
      const R3 = (R ** 3).toExponential(3).replace('e', ' × 10^');
      out.innerHTML =
        '<ol class="steps">' +
        '<li><b>Structure:</b> ' + name + ' is <b>' + st + '</b> → n = <b>' + n + '</b> atoms per cell, and V<sub>C</sub> = ' + (st === 'FCC' ? '16√2 R³ ≈ 22.63 R³' : '(4R/√3)³ ≈ 12.32 R³') + '</li>' +
        '<li><b>Radius in cm:</b> R = ' + Rnm + ' nm = ' + Rnm + ' × 10⁻⁷ cm, so R³ = ' + R3.replace(/\^(-?\d+)/, (s, p) => '<sup>' + p + '</sup>') + ' cm³</li>' +
        '<li><b>Cell volume:</b> V<sub>C</sub> = ' + k.toFixed(2) + ' × R³ = <b>' + Vc.toExponential(3).replace(/e(-?\d+)/, (s, p) => ' × 10<sup>' + p + '</sup>') + ' cm³</b></li>' +
        '<li><b>Plug in:</b> ρ = nA / (V<sub>C</sub> N<sub>A</sub>) = (' + n + ' × ' + A + ') / (' + Vc.toExponential(3).replace(/e(-?\d+)/, (s, p) => ' × 10<sup>' + p + '</sup>') + ' × 6.022 × 10<sup>23</sup>) = <b style="color:var(--accent)">' + rho.toFixed(2) + ' g/cm³</b></li>' +
        '<li><b>Compare:</b> measured density is ' + meas + ' g/cm³, a difference of only ' + err.toFixed(1) + '%! 🎯</li></ol>';
    }
    sel.addEventListener('change', calc); calc();
  }

  /* ---------- Checkpoint quizzes ---------- */
  document.querySelectorAll('.checkpoint').forEach((cp, ci) => {
    let qs;
    try { qs = JSON.parse(cp.querySelector('script[type="application/json"]').textContent); } catch (e) { return; }
    const title = cp.dataset.title || 'Checkpoint';
    let answered = 0, right = 0;
    cp.innerHTML = '<div class="cphead"><span class="cptag">🏁 CHECKPOINT</span><b>' + title + '</b></div>' +
      qs.map((q, qi) => '<div class="cpq" data-q="' + qi + '"><p class="cpquestion">' + (qi + 1) + '. ' + q.q + '</p><div class="cpopts">' +
        q.o.map((o, oi) => '<button type="button" class="cpopt" data-o="' + oi + '">' + o + '</button>').join('') +
        '</div><p class="cpwhy" hidden></p></div>').join('') +
      '<div class="cpscore" aria-live="polite">Answer all ' + qs.length + ' questions to see your score.</div>' +
      '<button type="button" class="chip cpreset" hidden>↺ Try again</button>';
    const score = cp.querySelector('.cpscore'), reset = cp.querySelector('.cpreset');
    cp.querySelectorAll('.cpq').forEach(div => {
      const q = qs[+div.dataset.q], why = div.querySelector('.cpwhy');
      div.querySelectorAll('.cpopt').forEach(btn => btn.addEventListener('click', () => {
        if (div.dataset.done) return;
        div.dataset.done = '1'; answered++;
        const ok = +btn.dataset.o === q.a; if (ok) right++;
        div.querySelectorAll('.cpopt').forEach(b => { b.disabled = true; if (+b.dataset.o === q.a) b.classList.add('right'); });
        if (!ok) btn.classList.add('wrong');
        why.hidden = false; why.innerHTML = (ok ? '✅ <b>Correct!</b> ' : '❌ <b>Not quite.</b> ') + (q.why || '');
        if (answered === qs.length){
          const msg = right === qs.length ? '🎉 Perfect! You\'ve got this part. On to the next one!'
                    : right >= qs.length / 2 ? '👍 Nice work! Re-read the explanation for the one(s) you missed, then keep going.'
                    : '💪 No stress, that\'s what checkpoints are for. Scroll up, re-read this part slowly, and try again.';
          score.innerHTML = '<b>Score: ' + right + ' / ' + qs.length + '</b> &nbsp; ' + msg;
          reset.hidden = false;
        } else score.textContent = answered + ' of ' + qs.length + ' answered…';
      }));
    });
    reset.addEventListener('click', () => {
      answered = right = 0; reset.hidden = true; score.textContent = 'Answer all ' + qs.length + ' questions to see your score.';
      cp.querySelectorAll('.cpq').forEach(div => { delete div.dataset.done; div.querySelector('.cpwhy').hidden = true;
        div.querySelectorAll('.cpopt').forEach(b => { b.disabled = false; b.classList.remove('right', 'wrong'); }); });
    });
  });

  function all(){ redraws.forEach(f => f()); }
  all();
  window.addEventListener('resize', all);
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', all);
})();
