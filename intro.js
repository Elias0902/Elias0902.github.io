/* Showreel de 15 s · eliasarmas.dev
   Motion graphics en <canvas>, sin librerías. Responsive (horizontal y vertical).
   Se reproduce cuando la sección está a la vista y se pausa al salir. */
(() => {
  const sec = document.getElementById('showreel');
  if (!sec) return;
  const cv = sec.querySelector('canvas');
  const ctx = cv.getContext('2d');
  const buf = document.createElement('canvas');
  const bctx = buf.getContext('2d');
  const btnReplay = document.getElementById('srReplay');
  const btnSkip = document.getElementById('srSkip');

  const DUR = 15;
  const C = { bg: '#0B0C08', ink: '#13140F', lime: '#C8F03C', cream: '#F3F0E8', muted: '#A9AB9F' };
  const BR = "'Bricolage Grotesque', system-ui, sans-serif";
  const MO = "'JetBrains Mono', ui-monospace, monospace";
  const fb = (s, w = 800) => `${w} ${s}px ${BR}`;
  const fm = (s, w = 500) => `${w} ${s}px ${MO}`;

  /* ---------- utilidades ---------- */
  const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const P = (t, a, b) => cl((t - a) / (b - a));
  const lerp = (a, b, x) => a + (b - a) * x;
  const eo = x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  const eio = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const eb = x => { if (x <= 0) return 0; const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  let W = 0, H = 0, DPR = 1, U = 1, PORT = false;
  function resize() {
    const r = sec.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = buf.width = Math.round(W * DPR);
    cv.height = buf.height = Math.round(H * DPR);
    U = Math.min(W, H) / 100;
    PORT = W / H < .9;
  }

  function rr(x, y, w, h, r) {
    w = Math.max(0, w); h = Math.max(0, h);
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Texto letra por letra con tracking negativo
  function measureLine(txt, font, fs, tr) {
    ctx.font = font(fs);
    const ad = [...txt].map(ch => ctx.measureText(ch).width);
    const tot = ad.reduce((a, b) => a + b, 0) - tr * fs * (ad.length - 1);
    return { ad, tot };
  }
  function fitFs(lines, font, tr, maxW, maxH, lh) {
    let m = 1;
    for (const l of lines) m = Math.max(m, measureLine(l, font, 100, tr).tot);
    return Math.min(maxW / m * 100, maxH / (lines.length * lh));
  }
  function drawLine(txt, x, y, fs, font, tr, align, each) {
    const { ad, tot } = measureLine(txt, font, fs, tr);
    let cx = align === 'center' ? x - tot / 2 : x;
    ctx.font = font(fs); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    [...txt].forEach((ch, i) => { each(ch, cx, y, i, ad[i]); cx += ad[i] - tr * fs; });
    return tot;
  }

  // Logo (mismo diseño que favicon.svg)
  function drawLogo(cx, cy, s, o = {}) {
    const { sc = 1, rot = 0, glyph = 1, bar = 1, sweep = 0 } = o;
    if (sc <= .001 || s <= 0) return;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(sc, sc);
    const k = s / 64;
    ctx.translate(-s / 2, -s / 2); ctx.scale(k, k);
    rr(0, 0, 64, 64, 14); ctx.fillStyle = C.ink; ctx.fill();
    ctx.lineWidth = 1.4 / k; ctx.strokeStyle = 'rgba(243,240,232,.18)'; ctx.stroke();
    if (bar > 0) { rr(14, 40, 36 * bar, 8, 2); ctx.fillStyle = C.lime; ctx.fill(); }
    if (glyph > 0) {
      ctx.save(); ctx.globalAlpha *= cl(glyph);
      ctx.translate(32, 36); const g = lerp(.5, 1, glyph); ctx.scale(g, g);
      ctx.font = '800 30px Arial, Helvetica, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = C.cream; ctx.fillText('a', 0, 0); ctx.restore();
    }
    if (sweep > 0 && sweep < 1) {
      ctx.save(); rr(0, 0, 64, 64, 14); ctx.clip();
      ctx.transform(1, 0, -.45, 1, 0, 0);
      const x = lerp(-20, 110, sweep);
      const g = ctx.createLinearGradient(x - 14, 0, x + 14, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.38)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(-40, -10, 160, 84); ctx.restore();
    }
    ctx.restore();
  }

  function cursor(x, y, s, fill, stroke) {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, s); ctx.lineTo(s * .28, s * .74); ctx.lineTo(s * .72, s * .72); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = Math.max(1, s * .07); ctx.strokeStyle = stroke; ctx.stroke();
    ctx.restore();
  }

  /* ---------- capas globales ---------- */
  function bg(t) {
    ctx.fillStyle = C.bg; ctx.fillRect(-60, -60, W + 120, H + 120);
    const g = Math.max(28, U * 7), off = (t * g * .35) % g;
    ctx.strokeStyle = 'rgba(243,240,232,.045)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = -off; x < W + g; x += g) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = -off * .5; y < H + g; y += g) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    const gx = W * (.5 + .3 * Math.sin(t * .4)), gy = H * (.5 + .25 * Math.cos(t * .33)), r = Math.max(W, H) * .6;
    const grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
    grd.addColorStop(0, 'rgba(200,240,60,.10)'); grd.addColorStop(1, 'rgba(200,240,60,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  }

  function vignette() {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.hypot(W, H) * .62);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.42)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  const IMPACTS = [2.2, 6.2, 7.08, 7.96, 8.84, 9.72, 10.65, 13.05];
  function shake(t) {
    let x = 0, y = 0;
    for (const s of IMPACTS) {
      const d = t - s; if (d < 0 || d > .35) continue;
      const a = U * 1.1 * Math.pow(1 - d / .35, 2);
      x += a * Math.sin(d * 90); y += a * Math.cos(d * 77);
    }
    return [x, y];
  }

  function flash(t) {
    for (const s of [2.2, 13.05]) {
      const d = t - s;
      if (d >= 0 && d < .3) { ctx.fillStyle = `rgba(200,240,60,${.32 * (1 - d / .3)})`; ctx.fillRect(0, 0, W, H); }
    }
  }

  // Partículas deterministas (dependen solo de t)
  const BURSTS = [
    { t: 2.2, n: 80, seed: 11, o: () => [W / 2, H / 2] },
    { t: 6.2, n: 46, seed: 23, o: () => [W * .05, H / 2] },
    { t: 13.05, n: 100, seed: 37, o: () => [W / 2, L6().logoY] },
  ].map(b => {
    const r = rng(b.seed);
    b.ps = Array.from({ length: b.n }, () => ({
      a: r() * Math.PI * 2, sp: 18 + r() * 75, life: .6 + r() * 1.1, sz: .25 + r() * 1, lime: r() > .35, streak: r() > .6,
    }));
    return b;
  });
  function particles(t) {
    for (const b of BURSTS) {
      const dt = t - b.t; if (dt < 0 || dt > 1.8) continue;
      const [ox, oy] = b.o();
      for (const p of b.ps) {
        if (dt > p.life) continue;
        const d = p.sp * U * (1 - Math.exp(-3 * dt)) / 3;
        const x = ox + Math.cos(p.a) * d, y = oy + Math.sin(p.a) * d + 6 * U * dt * dt;
        const a = 1 - dt / p.life;
        ctx.globalAlpha = a; ctx.fillStyle = p.lime ? C.lime : C.cream;
        if (p.streak) {
          ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = Math.max(1, p.sz * U * .35);
          const v = p.sp * U * Math.exp(-3 * dt) * .05;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(p.a) * v, y - Math.sin(p.a) * v); ctx.stroke();
        } else {
          const s = Math.max(1.5, p.sz * U * .7 * a);
          ctx.fillRect(x - s / 2, y - s / 2, s, s);
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  const GL = [1.62, 6.18, 10.58, 12.98];
  function glitch(t) {
    let g = 0;
    for (const s of GL) { const d = t - s; if (d >= 0 && d < .16) g = Math.max(g, 1 - d / .16); }
    if (!g) return;
    const r = rng(Math.floor(t * 60) + 7);
    const cw = cv.width, ch = cv.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.clearRect(0, 0, cw, ch); bctx.drawImage(cv, 0, 0);
    const n = 4 + Math.floor(r() * 6);
    for (let i = 0; i < n; i++) {
      const y = Math.floor(r() * ch * .95), h = Math.max(1, Math.min(ch - y, Math.floor((r() * .08 + .01) * ch * g)));
      const dx = (r() - .5) * cw * .09 * g;
      ctx.drawImage(buf, 0, y, cw, h, dx, y, cw, h);
    }
    ctx.globalAlpha = .3 * g; ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(buf, cw * .007 * g, 0);
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = .55 * g; ctx.fillStyle = r() > .5 ? C.lime : C.cream;
      ctx.fillRect(0, r() * ch, cw, Math.max(1, r() * 4 * DPR));
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  /* ---------- ESCENA 1 · terminal (0 – 1.7 s) ---------- */
  function s1(t) {
    const a = 1 - P(t, 1.5, 1.7); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    const cmd = '> eliasarmas.dev --init';
    ctx.font = fm(100, 700);
    const fs = cl(Math.min(W * .86, 720) / ctx.measureText(cmd).width * 100, 13, 36);
    ctx.font = fm(fs, 700);
    const full = ctx.measureText(cmd).width;
    const x0 = W / 2 - full / 2, y0 = H / 2 - fs * 2.2;
    const n = Math.floor(P(t, .12, .8) * cmd.length);
    const shown = cmd.slice(0, n);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = C.cream; ctx.fillText(shown, x0, y0);
    if (n > 0) { ctx.fillStyle = C.lime; ctx.fillText('>', x0, y0); }
    const cw = ctx.measureText(shown).width;
    if (n < cmd.length || Math.floor(t * 5) % 2 === 0) { ctx.fillStyle = C.lime; ctx.fillRect(x0 + cw + 3, y0 - fs * .55, fs * .55, fs * 1.1); }
    const logs = ['✓ html · css · javascript', '✓ react · php · ia', '✓ 100% responsive'];
    ctx.font = fm(fs * .6, 500);
    logs.forEach((l, i) => {
      const p = eo(P(t, .8 + i * .12, 1.05 + i * .12)); if (p <= 0) return;
      ctx.globalAlpha = a * p; ctx.fillStyle = i === 2 ? C.lime : C.muted;
      ctx.fillText(l, x0 + (1 - p) * 24, y0 + fs * 1.6 + i * fs * 1.05);
    });
    ctx.globalAlpha = a;
    const by = y0 + fs * 1.6 + 3 * fs * 1.05 + fs * .3, bh = Math.max(3, fs * .16), bp = eio(P(t, .65, 1.45));
    ctx.fillStyle = 'rgba(243,240,232,.12)'; ctx.fillRect(x0, by, full, bh);
    ctx.fillStyle = C.lime; ctx.fillRect(x0, by, full * bp, bh);
    ctx.font = fm(fs * .55, 700); ctx.textAlign = 'right'; ctx.fillText(Math.round(bp * 100) + '%', x0 + full, by + fs * .95);
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.fillText('compilando…', x0, by + fs * .95);
    ctx.restore();
  }

  /* ---------- ESCENA 2-3 · logo + nombre (1.6 – 6.4 s) ---------- */
  function nameLayout() {
    const lines = ['ELÍAS', 'ARMAS'], lh = .86;
    const fs = fitFs(lines, fb, .045, W * (PORT ? .86 : .7), H * .44, lh);
    const logoS = fs * .62, sub = Math.max(11, fs * .12);
    const gap = fs * .34;
    const blockH = logoS + gap + lines.length * fs * lh + sub * 2.6;
    const top = (H - blockH) / 2;
    return { lines, fs, lh, logoS, sub, logoY: top + logoS / 2, y0: top + logoS + gap, subY: top + logoS + gap + lines.length * fs * lh + sub * 1.6 };
  }

  function s23(t) {
    const NL = nameLayout(), L = Math.min(W, H) * .3;
    const zo = eio(P(t, 5.9, 6.4));
    ctx.save();
    if (zo > 0) { ctx.translate(W / 2, H / 2); ctx.scale(1 + zo * .14, 1 + zo * .14); ctx.translate(-W / 2, -H / 2); ctx.globalAlpha = 1 - zo * .7; }
    const mv = eio(P(t, 3.2, 3.85));
    const s = lerp(L, NL.logoS, mv), cx = W / 2, cy = lerp(H / 2, NL.logoY, mv);

    // ondas de choque
    const rp = P(t, 2.2, 3.0);
    if (rp > 0 && rp < 1) for (let j = 0; j < 3; j++) {
      const q = cl((rp - j * .12) / (1 - j * .12)); if (q <= 0 || q >= 1) continue;
      ctx.save(); ctx.globalAlpha *= (1 - q) * .8; ctx.strokeStyle = j === 1 ? C.cream : C.lime;
      ctx.lineWidth = Math.max(1, U * .6 * (1 - q)); ctx.beginPath(); ctx.arc(cx, cy, s * (.55 + eo(q) * (1.2 + j * .5)), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    // órbita + marcas
    const op = eo(P(t, 1.9, 2.5)), of = 1 - P(t, 2.9, 3.35);
    if (op > 0 && of > 0) {
      ctx.save(); ctx.globalAlpha *= of; ctx.translate(cx, cy);
      ctx.rotate(t * 1.4); ctx.strokeStyle = C.lime; ctx.lineWidth = Math.max(1.5, U * .4); ctx.lineCap = 'round';
      for (let j = 0; j < 3; j++) { const a0 = j * 2.094; ctx.beginPath(); ctx.arc(0, 0, s * .92, a0, a0 + 1.3 * op); ctx.stroke(); }
      ctx.rotate(-t * 2.4); ctx.strokeStyle = 'rgba(243,240,232,.4)'; ctx.lineWidth = 1;
      for (let j = 0; j < 48; j++) {
        if (j / 48 > op) break;
        const a = j / 48 * Math.PI * 2, r1 = s * 1.06, r2 = s * (j % 4 ? 1.1 : 1.17);
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); ctx.stroke();
      }
      ctx.restore();
    }
    drawLogo(cx, cy, s, {
      sc: eb(P(t, 1.65, 2.2)), rot: (1 - eo(P(t, 1.65, 2.35))) * -1.1,
      glyph: eo(P(t, 1.95, 2.35)), bar: eio(P(t, 2.1, 2.5)), sweep: P(t, 2.55, 3.1),
    });

    // nombre
    NL.lines.forEach((ln, li) => {
      const yTop = NL.y0 + li * NL.fs * NL.lh, yb = yTop + NL.fs * .76;
      ctx.save(); ctx.beginPath(); ctx.rect(-50, yTop - NL.fs * .3, W + 100, NL.fs * 1.1); ctx.clip();
      drawLine(ln, W / 2, yb, NL.fs, fb, .045, 'center', (ch, x, y, i) => {
        const st = 3.55 + li * .16 + i * .05, p = eo(P(t, st, st + .6)); if (p <= 0) return;
        ctx.fillStyle = li ? C.lime : C.cream; ctx.fillText(ch, x, y + (1 - p) * NL.fs * 1.05);
      });
      ctx.restore();
    });
    // subtítulo
    const subT = 'Desarrollador de aplicaciones · Barquisimeto, VE';
    const n = Math.floor(P(t, 4.35, 5.2) * subT.length);
    if (t > 4.3) {
      ctx.font = fm(100, 500);
      const sz = Math.min(NL.sub, W * .9 / ctx.measureText('// ' + subT).width * 100);
      ctx.font = fm(sz, 500); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      const fw = ctx.measureText('// ' + subT).width, x = W / 2 - fw / 2;
      ctx.fillStyle = C.lime; ctx.fillText('//', x, NL.subY);
      const px = x + ctx.measureText('// ').width;
      ctx.fillStyle = C.muted; const sh = subT.slice(0, n); ctx.fillText(sh, px, NL.subY);
      if (Math.floor(t * 5) % 2 === 0) { ctx.fillStyle = C.lime; ctx.fillRect(px + ctx.measureText(sh).width + 2, NL.subY - sz * .5, sz * .5, sz); }
    }
    ctx.restore();
  }

  /* ---------- ESCENA 4 · servicios (6.2 – 10.6 s) ---------- */
  function gBrowser(x, y, w, h, p, fg, acc, bgc) {
    const R = 1.45, ww = Math.min(w, h * R), wh = ww / R, ox = x + (w - ww) / 2, oy = y + (h - wh) / 2;
    const a0 = eo(P(p, 0, .22)); if (a0 <= 0) return;
    ctx.save(); ctx.globalAlpha *= a0; ctx.translate(0, (1 - a0) * wh * .08);
    ctx.lineWidth = Math.max(1.5, ww * .006); ctx.strokeStyle = fg; ctx.fillStyle = fg;
    rr(ox, oy, ww, wh, ww * .03); ctx.stroke();
    const tb = wh * .11;
    ctx.beginPath(); ctx.moveTo(ox, oy + tb); ctx.lineTo(ox + ww, oy + tb); ctx.stroke();
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(ox + ww * .04 + i * ww * .03, oy + tb / 2, tb * .13, 0, 7); ctx.fill(); }
    ctx.font = fm(tb * .34, 500); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = a0 * .7; ctx.fillText('eliasarmas.dev', ox + ww * .5, oy + tb * .52); ctx.globalAlpha = a0;
    const pad = ww * .06, cx = ox + pad, cw = ww - pad * 2; let cy = oy + tb + pad * .7;
    const pn = eo(P(p, .18, .38));
    ctx.fillStyle = acc; rr(cx, cy, cw * .16 * pn, wh * .045, wh * .02); ctx.fill();
    ctx.fillStyle = fg; ctx.globalAlpha = a0 * .5 * pn;
    for (let i = 0; i < 3; i++) { rr(cx + cw * (.62 + i * .13), cy + wh * .012, cw * .09, wh * .02, wh * .01); ctx.fill(); }
    ctx.globalAlpha = a0;
    cy += wh * .12;
    const ph = eo(P(p, .28, .5));
    rr(cx, cy, cw * .62 * ph, wh * .075, wh * .02); ctx.fill();
    rr(cx, cy + wh * .1, cw * .44 * ph, wh * .075, wh * .02); ctx.fill();
    const btnX = cx + cw * .11, btnY = cy + wh * .255;
    const pb = eb(P(p, .42, .62));
    if (pb > 0) { ctx.save(); ctx.translate(btnX, btnY); ctx.scale(pb, pb); ctx.fillStyle = acc; rr(-cw * .11, -wh * .035, cw * .22, wh * .07, wh * .035); ctx.fill(); ctx.restore(); }
    cy += wh * .36;
    const gap = cw * .04, cwd = (cw - gap * 2) / 3, chh = oy + wh - pad * .7 - cy;
    for (let i = 0; i < 3; i++) {
      const pc = eb(P(p, .5 + i * .07, .72 + i * .07)); if (pc <= 0) continue;
      ctx.save(); ctx.translate(cx + i * (cwd + gap) + cwd / 2, cy + chh / 2); ctx.scale(pc, pc);
      rr(-cwd / 2, -chh / 2, cwd, chh, wh * .025); ctx.stroke();
      ctx.globalAlpha *= .35; ctx.fillStyle = acc; rr(-cwd / 2, -chh / 2, cwd, chh * .5, wh * .025); ctx.fill(); ctx.restore();
    }
    const pm = eio(P(p, .55, .85));
    if (pm > 0) {
      const mx = lerp(ox + ww * .92, btnX, pm), my = lerp(oy + wh * .95, btnY, pm);
      if (p > .86) { const q = P(p, .86, 1); ctx.save(); ctx.globalAlpha *= 1 - q; ctx.strokeStyle = acc; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(btnX, btnY, ww * (.02 + q * .06), 0, 7); ctx.stroke(); ctx.restore(); }
      cursor(mx, my, ww * .045, fg, bgc);
    }
    ctx.restore();
  }

  function gDash(x, y, w, h, p, fg, acc) {
    const R = 1.5, ww = Math.min(w, h * R), wh = ww / R, ox = x + (w - ww) / 2, oy = y + (h - wh) / 2;
    const a0 = eo(P(p, 0, .2)); if (a0 <= 0) return;
    ctx.save(); ctx.globalAlpha *= a0; ctx.translate(0, (1 - a0) * wh * .08);
    ctx.lineWidth = Math.max(1.5, ww * .006); ctx.strokeStyle = fg;
    rr(ox, oy, ww, wh, ww * .03); ctx.stroke();
    const k = eo(P(p, .15, .8));
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = acc; ctx.font = fb(wh * .15, 800); ctx.fillText('+' + Math.round(38 * k) + '%', ox + ww * .06, oy + wh * .22);
    ctx.fillStyle = fg; ctx.globalAlpha = a0 * .7; ctx.font = fm(wh * .045, 500);
    ctx.fillText('ventas este mes', ox + ww * .06, oy + wh * .3);
    ctx.textAlign = 'right'; ctx.fillText('pedidos hoy: ' + Math.round(128 * k), ox + ww * .94, oy + wh * .12);
    ctx.globalAlpha = a0;
    const vals = [.35, .55, .45, .7, .58, .86, .74, 1];
    const n = vals.length, x0 = ox + ww * .06, x1 = ox + ww * .94, base = oy + wh * .9, maxH = wh * .48;
    const bw = (x1 - x0) / n * .62, step = (x1 - x0) / n;
    const pts = [];
    vals.forEach((v, i) => {
      const pb = eo(P(p, .15 + i * .05, .5 + i * .05));
      const bh = v * maxH * pb, bx = x0 + i * step + (step - bw) / 2;
      ctx.fillStyle = i === n - 1 ? acc : fg; ctx.globalAlpha = a0 * (i === n - 1 ? 1 : .25);
      rr(bx, base - bh, bw, bh, Math.min(bw * .2, 6)); ctx.fill();
      pts.push([bx + bw / 2, base - v * maxH - wh * .06]);
    });
    ctx.globalAlpha = a0;
    const lp = P(p, .45, .9);
    if (lp > 0) {
      ctx.strokeStyle = acc; ctx.lineWidth = Math.max(2, ww * .009); ctx.lineJoin = 'round'; ctx.beginPath();
      const segs = (pts.length - 1) * lp;
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i <= Math.ceil(segs); i++) {
        const f = Math.min(1, segs - (i - 1));
        ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f));
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function gChat(x, y, w, h, p, fg, acc, bgc) {
    let ph = h, pw = ph * .56; if (pw > w) { pw = w; ph = pw / .56; }
    const ox = x + (w - pw) / 2, oy = y + (h - ph) / 2;
    const a0 = eo(P(p, 0, .2)); if (a0 <= 0) return;
    ctx.save(); ctx.globalAlpha *= a0; ctx.translate(0, (1 - a0) * ph * .06);
    ctx.lineWidth = Math.max(1.5, pw * .012); ctx.strokeStyle = fg;
    rr(ox, oy, pw, ph, pw * .12); ctx.stroke();
    ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(ox + pw * .16, oy + ph * .1, pw * .065, 0, 7); ctx.fill();
    ctx.fillStyle = bgc; ctx.font = fb(pw * .06, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('IA', ox + pw * .16, oy + ph * .1);
    ctx.textAlign = 'left'; ctx.fillStyle = fg; ctx.font = fb(pw * .062, 700); ctx.fillText('Asistente IA', ox + pw * .27, oy + ph * .088);
    ctx.font = fm(pw * .042, 500); ctx.globalAlpha = a0 * .7; ctx.fillText('● en línea 24/7', ox + pw * .27, oy + ph * .125); ctx.globalAlpha = a0;
    ctx.beginPath(); ctx.moveTo(ox, oy + ph * .17); ctx.lineTo(ox + pw, oy + ph * .17); ctx.globalAlpha = a0 * .4; ctx.stroke(); ctx.globalAlpha = a0;
    const msgs = [[0, 'Hola 👋 ¿tienen tortas?'], [1, '¡Sí! Te paso el menú 🍰'], [0, 'Quiero una para hoy'], [1, 'Listo ✅ pedido #128']];
    const fs = pw * .056; let by = oy + ph * .22;
    msgs.forEach(([me, txt], i) => {
      ctx.font = fb(fs, 500);
      const tw = ctx.measureText(txt).width, bw = Math.min(pw * .8, tw + fs * 1.4), bh = fs * 2.1;
      const bx = me ? ox + pw * .93 - bw : ox + pw * .07;
      const pm = eb(P(p, .12 + i * .16, .3 + i * .16));
      if (pm > 0) {
        ctx.save(); const ax = me ? bx + bw : bx, ay = by + bh;
        ctx.translate(ax, ay); ctx.scale(pm, pm); ctx.translate(-ax, -ay);
        rr(bx, by, bw, bh, bh * .45);
        if (me) { ctx.fillStyle = acc; ctx.fill(); ctx.fillStyle = bgc; }
        else { ctx.lineWidth = Math.max(1, pw * .008); ctx.strokeStyle = fg; ctx.stroke(); ctx.fillStyle = fg; }
        ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(txt, bx + fs * .7, by + bh / 2);
        ctx.restore();
      }
      by += bh + fs * .75;
    });
    ctx.globalAlpha = a0 * .5; ctx.lineWidth = Math.max(1, pw * .008);
    rr(ox + pw * .07, oy + ph * .86, pw * .7, ph * .07, ph * .035); ctx.stroke();
    ctx.globalAlpha = a0; ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(ox + pw * .86, oy + ph * .895, ph * .035, 0, 7); ctx.fill();
    ctx.restore();
  }

  function gLogo(x, y, w, h, p, fg) {
    const s = Math.min(w, h) * .6, cx = x + w / 2, cy = y + h * .42;
    ctx.save(); ctx.strokeStyle = fg; ctx.lineWidth = 1;
    ctx.globalAlpha *= .45;
    const pc = eio(P(p, 0, .35));
    ctx.beginPath(); ctx.arc(cx, cy, s * .72, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pc); ctx.stroke();
    const pl = eo(P(p, .05, .3)), e = s * .95 * pl;
    ctx.beginPath(); ctx.moveTo(cx - e, cy); ctx.lineTo(cx + e, cy); ctx.moveTo(cx, cy - e); ctx.lineTo(cx, cy + e);
    ctx.moveTo(cx - e * .7, cy - e * .7); ctx.lineTo(cx + e * .7, cy + e * .7); ctx.moveTo(cx + e * .7, cy - e * .7); ctx.lineTo(cx - e * .7, cy + e * .7); ctx.stroke();
    const sq = s * .5 * 2; ctx.setLineDash([sq * 4, sq * 4]); ctx.lineDashOffset = sq * 4 * (1 - pc);
    rr(cx - sq / 2, cy - sq / 2, sq, sq, sq * .22); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    drawLogo(cx, cy, s * .78, { sc: eb(P(p, .3, .6)), glyph: eo(P(p, .4, .65)), bar: eio(P(p, .5, .75)), sweep: P(p, .7, .98) });
    [C.ink, C.lime, C.cream].forEach((c, i) => {
      const q = eb(P(p, .6 + i * .06, .8 + i * .06)); if (q <= 0) return;
      const r = s * .08 * q, sx = cx + (i - 1) * s * .3, sy = cy + s * .82;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = fg; ctx.stroke();
    });
  }

  function gResp(x, y, w, h, p, fg, acc) {
    const ratio = p < .5 ? lerp(1.6, .78, eio(P(p, .1, .42))) : lerp(.78, .48, eio(P(p, .55, .85)));
    let dh = h * .82, dw = dh * ratio; if (dw > w) { dw = w; dh = dw / ratio; }
    const ox = x + (w - dw) / 2, oy = y + (h - dh) / 2 + h * .06;
    const a0 = eo(P(p, 0, .2)); if (a0 <= 0) return;
    ctx.save(); ctx.globalAlpha *= a0;
    ctx.lineWidth = Math.max(1.5, U * .4); ctx.strokeStyle = fg;
    rr(ox, oy, dw, dh, Math.min(dw, dh) * .07); ctx.stroke();
    const px = ratio > .78 ? lerp(768, 1440, (ratio - .78) / .82) : lerp(390, 768, (ratio - .48) / .3);
    ctx.fillStyle = acc; ctx.font = fm(Math.max(11, h * .055), 700); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(Math.round(px) + 'px', x + w / 2, oy - h * .035);
    const cols = ratio > 1.15 ? 3 : ratio > .62 ? 2 : 1;
    const pad = Math.min(dw, dh) * .09, aw = dw - pad * 2;
    ctx.fillStyle = acc; rr(ox + pad, oy + pad, aw * .35, dh * .045, dh * .02); ctx.fill();
    const ay = oy + pad + dh * .1, ah = dh - pad * 2 - dh * .1, gap = Math.min(dw, dh) * .05;
    const n = 6, rows = Math.ceil(n / cols);
    const cw = (aw - gap * (cols - 1)) / cols, chh = (ah - gap * (rows - 1)) / rows;
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const bx = ox + pad + c * (cw + gap), by = ay + r * (chh + gap);
      ctx.globalAlpha = a0 * .18; ctx.fillStyle = fg; rr(bx, by, cw, chh, Math.min(cw, chh) * .12); ctx.fill();
      ctx.globalAlpha = a0 * .9; ctx.fillStyle = acc; rr(bx + cw * .1, by + chh * .2, cw * .5, Math.max(2, chh * .12), 2); ctx.fill();
    }
    ctx.restore();
  }

  const SV = [
    { l: ['WEBS A', 'MEDIDA'], n: 'Landing pages y sitios que venden', g: gBrowser },
    { l: ['SISTEMAS', 'DE GESTIÓN'], n: 'Pedidos, inventario y caja', g: gDash },
    { l: ['IA PARA', 'WHATSAPP'], n: 'Asistentes que responden 24/7', g: gChat },
    { l: ['LOGOS', '& MARCA'], n: 'Identidad que se recuerda', g: gLogo },
    { l: ['100%', 'RESPONSIVE'], n: 'Perfecto en móvil, tablet y PC', g: gResp },
  ];
  const S4 = 6.2, SD = .88;

  function svItem(k, lt) {
    const it = SV[k], lime = k % 2 === 1;
    const bgc = lime ? C.lime : C.ink, fg = lime ? C.ink : C.cream, acc = lime ? C.ink : C.lime, sub = lime ? 'rgba(19,20,15,.7)' : C.muted;
    ctx.fillStyle = bgc; ctx.fillRect(-60, -60, W + 120, H + 120);
    // número fantasma
    const num = '0' + (k + 1);
    ctx.save(); ctx.globalAlpha = lime ? .09 : .06; ctx.fillStyle = fg; ctx.font = fb(Math.min(H * .95, W * .55));
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(num, W * .99 - lt * U * 4 + (1 - eo(P(lt, 0, .6))) * W * .06, H * .95); ctx.restore();
    // rayas diagonales
    ctx.save(); ctx.globalAlpha = lime ? .07 : .04; ctx.strokeStyle = fg; ctx.lineWidth = 1;
    const sp = Math.max(14, U * 2.4), off = (lt * 60) % sp; ctx.beginPath();
    for (let x = -H + off; x < W; x += sp) { ctx.moveTo(x, H); ctx.lineTo(x + H, 0); }
    ctx.stroke(); ctx.restore();

    const lab = Math.max(11, U * 1.7), note = Math.max(13, U * 2.2);
    let fs, wx, y0, gx, gy, gw, gh, align;
    if (PORT) {
      fs = fitFs(it.l, fb, .04, W * .86, H * .24, .9); gw = W * .8; gh = Math.min(H * .34, W * .7);
      const tot = lab * 2.2 + fs * 1.8 + note * 2 + H * .05 + gh;
      y0 = (H - tot) / 2; align = 'center'; wx = W / 2; gx = (W - gw) / 2; gy = y0 + lab * 2.2 + fs * 1.8 + note * 2 + H * .05;
    } else {
      fs = fitFs(it.l, fb, .04, W * .5, H * .42, .9); gw = W * .35; gh = H * .58;
      const tot = lab * 2.2 + fs * 1.8 + note * 2;
      y0 = (H - tot) / 2; align = 'left'; wx = W * .07; gx = W * .585; gy = (H - gh) / 2;
    }
    const pl = eo(P(lt, 0, .3));
    ctx.globalAlpha = pl; ctx.font = fm(lab, 700); ctx.fillStyle = acc; ctx.textAlign = align; ctx.textBaseline = 'top';
    ctx.fillText(`${num} / 05 — SERVICIO`, wx + (1 - pl) * 30, y0); ctx.globalAlpha = 1;
    it.l.forEach((ln, li) => {
      const p = eo(P(lt, .03 + li * .07, .5 + li * .07)); if (p <= 0) return;
      const yb = y0 + lab * 2.2 + fs * .9 * li + fs * .74;
      ctx.save(); ctx.globalAlpha = Math.min(1, p * 1.4);
      const sk = -.35 * (1 - p); ctx.transform(1, 0, sk, 1, -sk * yb + (1 - p) * W * .14, 0);
      drawLine(ln, wx, yb, fs, fb, .04, align, (ch, x, y) => {
        if (li === 1 && lime) { ctx.lineWidth = Math.max(1.5, fs * .028); ctx.strokeStyle = fg; ctx.lineJoin = 'round'; ctx.strokeText(ch, x, y); }
        else { ctx.fillStyle = li === 1 ? acc : fg; ctx.fillText(ch, x, y); }
      });
      ctx.restore();
    });
    const pn = eo(P(lt, .25, .55));
    ctx.globalAlpha = pn; ctx.fillStyle = sub; ctx.font = fb(note, 500); ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ctx.fillText(it.n, wx, y0 + lab * 2.2 + fs * 1.8 + note * 1.3 + (1 - pn) * note); ctx.globalAlpha = 1;
    it.g(gx, gy, gw, gh, P(lt, .06, .82), fg, acc, bgc);
  }

  function s4(t) {
    if (t < S4 || t >= 11.0) return;
    const k = Math.min(SV.length - 1, Math.floor((t - S4) / SD)), lt = t - S4 - k * SD;
    const wp = eio(P(lt, 0, .22));
    if (k > 0 && wp < 1) svItem(k - 1, lt + SD);
    ctx.save();
    const sk = H * .35, e = lerp(-sk, W + sk, wp);
    ctx.beginPath(); ctx.moveTo(-60, -60); ctx.lineTo(e + sk, -60); ctx.lineTo(e, H + 60); ctx.lineTo(-60, H + 60); ctx.closePath(); ctx.clip();
    svItem(k, lt);
    ctx.restore();
    if (wp > 0 && wp < 1) {
      const bw = Math.max(6, U * 2.2);
      ctx.fillStyle = k % 2 ? C.cream : C.lime;
      ctx.beginPath(); ctx.moveTo(e + sk, -60); ctx.lineTo(e + sk + bw, -60); ctx.lineTo(e + bw, H + 60); ctx.lineTo(e, H + 60); ctx.closePath(); ctx.fill();
    }
  }

  /* ---------- ESCENA 5 · números (10.6 – 13.1 s) ---------- */
  const CODE = ['const cliente = await nuevoPedido();', 'if (web.responsive) vender(24 / 7);', '<section class="hero">', 'SELECT * FROM pedidos WHERE fecha = hoy;', "ia.responder('¡Hola! 👋');", 'function crecer(negocio) {', '  return negocio * 10;', '}', 'git push origin main', 'deploy → eliasarmas.dev ✓', 'npm run build', 'fetch("/api/inventario")'];
  const STATS = [
    { v: 4, pre: '', suf: '+', l: 'años creando software' },
    { v: 24, pre: '<', suf: 'h', l: 'tiempo de respuesta' },
    { v: 100, pre: '', suf: '%', l: 'código a medida y tuyo' },
  ];
  function s5(t) {
    const rp = eo(P(t, 10.6, 11.0)), R = Math.hypot(W, H) / 2 * 1.05 * rp;
    const out = P(t, 12.85, 13.15), a = 1 - out;
    if (a <= 0 || R <= .5) return;
    ctx.save();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, R, 0, Math.PI * 2); ctx.clip();
    ctx.globalAlpha = a;
    bg(t);
    if (out > 0) { const z = 1 + eio(out) * .3; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2); }
    // lluvia de código
    const cf = Math.max(10, U * 1.8), lh = cf * 2.2, tot = CODE.length * lh;
    ctx.font = fm(cf, 500); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = a * .09; ctx.fillStyle = C.cream;
    const scroll = (t - 10.6) * U * 7;
    for (let rep = 0; rep * tot < H + tot; rep++) CODE.forEach((c, i) => {
      const base = (((i * lh - scroll) % tot) + tot) % tot;
      ctx.fillText(c, (i * 137) % Math.max(1, W * .5) + W * .03, base + rep * tot);
    });
    ctx.globalAlpha = a;
    const title = '// POR QUÉ TRABAJAR CONMIGO';
    const tn = Math.floor(P(t, 10.8, 11.3) * title.length);
    ctx.font = fm(Math.max(11, U * 1.9), 700); ctx.fillStyle = C.lime; ctx.textAlign = 'center';
    ctx.fillText(title.slice(0, tn), W / 2, H * (PORT ? .14 : .2));
    const nfs = PORT ? Math.min(H * .1, W * .26) : Math.min(W * .11, H * .24);
    STATS.forEach((s, i) => {
      const st = 10.85 + i * .2, p = eo(P(t, st, st + .9)), al = P(t, st, st + .25);
      if (al <= 0) return;
      const cx = PORT ? W / 2 : W * (.2 + i * .3), cy = PORT ? H * (.36 + i * .22) : H * .55;
      const rise = (1 - eo(P(t, st, st + .5))) * nfs * .4;
      ctx.save(); ctx.globalAlpha = a * al;
      const main = s.pre + Math.round(s.v * p);
      ctx.font = fb(nfs, 800); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      const mw = ctx.measureText(main).width, sw = ctx.measureText(s.suf).width, x0 = cx - (mw + sw) / 2;
      ctx.fillStyle = C.cream; ctx.fillText(main, x0, cy + rise);
      ctx.fillStyle = C.lime; ctx.fillText(s.suf, x0 + mw, cy + rise);
      const bw = nfs * 1.6 * eio(P(t, st + .2, st + .9));
      ctx.fillRect(cx - bw / 2, cy + nfs * .16, bw, Math.max(2, U * .45));
      ctx.font = fm(Math.max(11, nfs * .15), 500); ctx.fillStyle = C.muted; ctx.textAlign = 'center';
      ctx.fillText(s.l, cx, cy + nfs * .16 + Math.max(11, nfs * .15) * 2.2);
      ctx.restore();
    });
    ctx.restore();
    if (rp > 0 && rp < 1) { ctx.strokeStyle = C.lime; ctx.lineWidth = Math.max(2, U * .7); ctx.beginPath(); ctx.arc(W / 2, H / 2, R, 0, Math.PI * 2); ctx.stroke(); }
  }

  /* ---------- ESCENA 6 · cierre (13 – 15 s) ---------- */
  const TAG = 'Hago que tu negocio venda incluso cuando duermes.';
  function L6() {
    const nameFs = fitFs(['Elías Armas'], fb, .04, W * .8, H * .17, 1);
    const logoS = Math.min(Math.min(W, H) * .2, nameFs * 1.3);
    const urlFs = Math.max(13, nameFs * .28);
    ctx.font = fb(100, 500);
    const tagFs = Math.min(Math.max(12, nameFs * .17), W * .86 / ctx.measureText(TAG).width * 100);
    const g1 = nameFs * .35, tot = logoS + g1 + nameFs * .76 + urlFs * 1.4 + urlFs + tagFs * 2.4;
    const top = (H - tot) / 2;
    const nameB = top + logoS + g1 + nameFs * .76;
    const urlB = nameB + urlFs * 1.4 + urlFs * .8;
    return { nameFs, logoS, urlFs, tagFs, logoY: top + logoS / 2, nameB, urlB, tagB: urlB + tagFs * 2.4 };
  }
  function s6(t) {
    const L = L6(), a = P(t, 13.0, 13.2);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    // halo
    const hp = eo(P(t, 13.05, 14));
    const g = ctx.createRadialGradient(W / 2, L.logoY, 0, W / 2, L.logoY, L.logoS * 2.4);
    g.addColorStop(0, `rgba(200,240,60,${.18 * hp})`); g.addColorStop(1, 'rgba(200,240,60,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // anillo
    const rq = P(t, 13.3, 15);
    ctx.save(); ctx.translate(W / 2, L.logoY); ctx.rotate(t * .6); ctx.strokeStyle = 'rgba(200,240,60,.5)'; ctx.lineWidth = Math.max(1, U * .25);
    ctx.setLineDash([L.logoS * .08, L.logoS * .06]); ctx.beginPath(); ctx.arc(0, 0, L.logoS * .9, 0, Math.PI * 2 * eio(rq)); ctx.stroke(); ctx.restore();
    drawLogo(W / 2, L.logoY, L.logoS, { sc: eb(P(t, 13.0, 13.5)), glyph: eo(P(t, 13.1, 13.4)), bar: eio(P(t, 13.25, 13.6)), sweep: P(t, 14.2, 14.85) });
    // nombre con revelado por bloque
    const { tot } = measureLine('Elías Armas', fb, L.nameFs, .04);
    const x0 = W / 2 - tot / 2, p1 = eio(P(t, 13.3, 13.6)), p2 = eio(P(t, 13.6, 13.92));
    const yT = L.nameB - L.nameFs * .82, hT = L.nameFs * 1.02;
    if (p2 > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(x0 - 4, yT - L.nameFs * .2, tot * p2 + 4, hT + L.nameFs * .4); ctx.clip();
      drawLine('Elías Armas', x0, L.nameB, L.nameFs, fb, .04, 'left', (ch, x, y) => { ctx.fillStyle = C.cream; ctx.fillText(ch, x, y); });
      ctx.restore();
    }
    if (p1 > p2) { ctx.fillStyle = C.lime; ctx.fillRect(x0 + tot * p2, yT, tot * (p1 - p2), hT); }
    // url
    const url = 'eliasarmas.dev', un = Math.floor(P(t, 13.85, 14.35) * url.length);
    ctx.font = fm(L.urlFs, 700); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const uw = ctx.measureText(url).width, ux = W / 2 - uw / 2, us = url.slice(0, un);
    ctx.fillStyle = C.lime; ctx.fillText(us, ux, L.urlB);
    if (t > 13.8 && Math.floor(t * 3) % 2 === 0) ctx.fillRect(ux + ctx.measureText(us).width + 3, L.urlB - L.urlFs * .8, L.urlFs * .5, L.urlFs);
    // eslogan
    const tp = eo(P(t, 14.15, 14.7));
    if (tp > 0) {
      ctx.globalAlpha = a * tp; ctx.font = fb(L.tagFs, 500); ctx.fillStyle = C.muted; ctx.textAlign = 'center';
      ctx.fillText(TAG, W / 2, L.tagB + (1 - tp) * L.tagFs);
    }
    ctx.restore();
  }

  /* ---------- HUD (marco tipo cámara) ---------- */
  function limeBg(t) {
    if (t < S4 || t >= 10.75) return false;
    const k = Math.min(4, Math.floor((t - S4) / SD)), lt = t - S4 - k * SD, wp = eio(P(lt, 0, .22));
    const cur = wp > .5 ? k : k - 1;
    return cur >= 0 && cur % 2 === 1;
  }
  function hud(t) {
    const ink = limeBg(t);
    const col = ink ? 'rgba(19,20,15,.85)' : 'rgba(243,240,232,.7)', acc = ink ? C.ink : C.lime;
    const m = Math.max(14, U * 3), l = Math.max(14, U * 3);
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath();
    [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx, sy]) => {
      ctx.moveTo(x, y + sy * l); ctx.lineTo(x, y); ctx.lineTo(x + sx * l, y);
    });
    ctx.stroke();
    const fs = Math.max(10, U * 1.45);
    ctx.font = fm(fs, 500); ctx.textBaseline = 'middle';
    ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.fillText('EA — SHOWREEL 2026', m + fs * .9, m + fs * .9);
    ctx.textAlign = 'right'; ctx.fillText('REC', W - m - fs * .9, m + fs * .9);
    if (t < DUR && Math.floor(t * 2) % 2 === 0) {
      ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(W - m - fs * .9 - ctx.measureText('REC').width - fs * .8, m + fs * .9, fs * .35, 0, 7); ctx.fill();
    }
    const sec = Math.floor(t), fr = Math.floor((t % 1) * 30), pad = n => String(n).padStart(2, '0');
    ctx.fillStyle = col; ctx.textAlign = 'left';
    ctx.fillText(`00:${pad(sec)}:${pad(fr)} / 00:15:00`, m + fs * .9, H - m - fs * .9);
    ctx.fillStyle = acc; ctx.fillRect(0, H - 3, W * (t / DUR), 3);
  }

  /* ---------- composición ---------- */
  function frame(t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    bg(t);
    ctx.save();
    const [sx, sy] = shake(t); ctx.translate(sx, sy);
    if (t < 1.75) s1(t);
    if (t >= 1.6 && t < 6.65) s23(t);
    if (t >= S4 && t < 11.0) s4(t);
    if (t >= 10.6 && t < 13.2) s5(t);
    if (t >= 12.95) s6(t);
    particles(t);
    ctx.restore();
    flash(t);
    vignette();
    hud(t);
    glitch(t);
  }

  /* ---------- reproducción ---------- */
  let t = 0, playing = false, last = 0, raf = 0, done = false, inView = false, ready = false;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const render = () => frame(t);
  function tick(now) {
    raf = 0; if (!playing) return;
    t += Math.min(.05, (now - last) / 1000); last = now;
    if (t >= DUR) { t = DUR; playing = false; done = true; ended(); }
    render();
    if (playing) raf = requestAnimationFrame(tick);
  }
  function play() {
    if (!ready || playing || done || !inView || document.hidden) return;
    playing = true; last = performance.now(); raf = requestAnimationFrame(tick);
  }
  function pause() { playing = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  function ended() { sec.classList.add('sr-done'); if (btnSkip) btnSkip.textContent = 'Ver más ↓'; }
  function replay() { pause(); t = 0; done = false; sec.classList.remove('sr-done'); if (btnSkip) btnSkip.textContent = 'Saltar intro ↓'; render(); play(); }
  if (btnReplay) btnReplay.addEventListener('click', replay);

  new IntersectionObserver(es => { inView = es[0].isIntersecting; inView ? play() : pause(); }, { threshold: .35 }).observe(sec);
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));
  new ResizeObserver(() => { resize(); render(); }).observe(sec);

  const fontsReady = document.fonts
    ? Promise.race([
        Promise.all([document.fonts.load(fb(80, 800), 'ELÍAS'), document.fonts.load(fb(40, 500)), document.fonts.load(fm(20, 700)), document.fonts.load(fm(20, 500))]),
        new Promise(r => setTimeout(r, 1800)),
      ])
    : Promise.resolve();
  fontsReady.then(() => {
    resize(); ready = true;
    if (reduce) { t = DUR; done = true; render(); ended(); return; }
    render(); play();
  });

  // Para exportar fotogramas (pruebas): window.__srFrame(segundos)
  window.__srFrame = s => { pause(); t = cl(s, 0, DUR); render(); };
})();
