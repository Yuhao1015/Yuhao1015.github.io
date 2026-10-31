// 首页交互：配色切换、作品视频、开场滚动叙事（磁流体 + 拿手电筒的小人）。
// 项目内容由 scripts/render-projects.cjs 生成，这里只负责行为。
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => (t = clamp(t), t * t * (3 - 2 * t));
  const seg = (p, a, b) => smooth((p - a) / (b - a));
  const pad3 = n => String(Math.max(0, n)).padStart(3, '0');

  /* 配色方向切换 */
  const themeMeta = $('meta[name="theme-color"]');
  function setTheme(t) {
    root.dataset.theme = t;
    $$('[data-theme-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeSet === t)));
    themeMeta.content = t === 'ink' ? '#f1eee6' : '#f6f5f2';
    try { localStorage.setItem('folio-theme', t); } catch {}
    readPalette();
    if (g) kick();
  }
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('folio-theme'); } catch {}
  $$('[data-theme-set]').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.themeSet)));

  /* 作品视频：默认静音速览，点击切换完整演示 */
  const medias = $$('[data-media]');
  const vids = medias.map(m => $('video', m));
  const loopVideo = $('[data-loop]');
  const loopToggle = $('[data-loop-toggle]');

  const place = (m, x, y) => { m.style.setProperty('--bx', x + 'px'); m.style.setProperty('--by', y + 'px'); };
  function home(m) {
    const f = $('.media-frame', m), b = $('[data-play]', m);
    place(m, f.clientWidth - b.offsetWidth / 2 - 20, f.clientHeight - b.offsetHeight / 2 - 20);
  }
  function setMode(m, mode, play) {
    const v = $('video', m), full = mode === 'full';
    if (v.dataset.mode !== mode) {
      v.dataset.mode = mode;
      v.poster = full ? m.dataset.fullPoster : m.dataset.previewPoster;
      v.src = full ? m.dataset.full : m.dataset.preview;
      v.muted = !full; v.loop = !full; v.controls = full;
    }
    m.classList.toggle('is-full', full);
    if (full) m.classList.remove('is-hover');
    $$('[data-mode]', m).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    $('[data-note]', m).textContent = full ? '完整演示' : '静音循环';
    $('[data-cap]', m).textContent = full ? '完整演示 · ' + m.dataset.fullLen : '项目速览 · ' + m.dataset.previewLen;
    if (play) v.play().catch(() => {});
  }
  medias.forEach(m => {
    const f = $('.media-frame', m), v = $('video', m);
    setMode(m, 'preview', false);
    $$('[data-mode]', m).forEach(b => b.addEventListener('click', () => setMode(m, b.dataset.mode, true)));
    $('[data-play]', m).addEventListener('click', () => setMode(m, 'full', true));
    f.addEventListener('pointermove', e => {
      if (!fine.matches || m.classList.contains('is-full')) return;
      if (e.target.closest('.media-ui')) { m.classList.remove('is-hover'); home(m); return; }
      const r = f.getBoundingClientRect();
      place(m, e.clientX - r.left, e.clientY - r.top);
      m.classList.add('is-hover');
    });
    f.addEventListener('pointerleave', () => { m.classList.remove('is-hover'); home(m); });
    v.addEventListener('play', () => {
      if (v.dataset.mode !== 'full') return;
      vids.forEach(o => { if (o !== v) o.pause(); });
      loopVideo?.pause();
    });
  });
  const mediaIO = new IntersectionObserver(entries => entries.forEach(e => {
    const v = $('video', e.target);
    if (e.intersectionRatio >= .35) {
      if (v.dataset.mode === 'preview' && !reduced.matches && !document.hidden) v.play().catch(() => {});
    } else v.pause();
  }), { threshold: [0, .35] });
  medias.forEach(m => mediaIO.observe(m));

  /* 滚动进入 */
  const revealIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    revealIO.unobserve(e.target);
  }), { rootMargin: '0px 0px -10% 0px', threshold: .12 });
  $$('[data-reveal], .mask-lines, [data-media], [data-media-static]').forEach(el => revealIO.observe(el));

  /* 开场滚动叙事 */
  const TAU = Math.PI * 2;
  const story = $('[data-story]'), stage = $('[data-stage]'), obj = $('[data-obj]'), shape = $('[data-shape]');
  const panel = $('[data-panel]'), win = $('[data-win]'), ghost = $('[data-ghost]');
  const canvas = $('[data-fluid]'), ctx = canvas.getContext('2d');
  const floor = $('[data-floor]'), aura = $('[data-aura]'), frame = $('[data-frame]');
  const kid = $('[data-kid]'), kidFlip = $('[data-kid-flip]'), kidArm = $('[data-kid-arm]'), kidHead = $('[data-kid-head]'), kidEyes = $('[data-kid-eyes]');
  const kidLegF = $('[data-kid-leg-f]'), kidLegB = $('[data-kid-leg-b]'), kidArmB = $('[data-kid-arm-b]'), kidWalk = $('[data-kid-walk]'), kidShadow = $('[data-kid-shadow]');
  const beam = $('[data-beam]'), spot = $('[data-spot]'), hole = $('[data-hole]');
  const readout = $('[data-readout]'), mark = $('[data-brand-mark]'), nav = $('[data-nav]');
  const track = $$('[data-track] li');
  const blocks = Object.fromEntries($$('[data-block]').map(el => [el.dataset.block, { el, lines: $$('.ln', el), hidden: null }]));
  const PHASES = [[0, .19], [.19, .43], [.43, .64], [.64, 1]];
  const t0 = performance.now();
  const ptr = { x: 0, y: 0, on: false, type: 'mouse', last: 0 };
  const mag = { x: 0, y: 0, ready: false };
  // exit：退场进度 0→1（开洞、转身、走过去、走进洞里、洞合上），按时间推进，往回滚动时倒放
  const kidState = { flip: 0, ang: 0, left: false, exit: 0 };
  const KID_EXIT_MS = 2800;
  let g = null, target = 0, current = 0, raf = 0, inView = true, lastReadout = '', loopPref = null, loopOn = false, dpr = 1, palette = null, lastDrawT = 0;

  const progress = () => clamp((scrollY - g.start) / g.dist);
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const elastic = x => x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -9 * x) * Math.sin((x * 10 - .75) * TAU / 3) + 1;
  const backOut = x => (x = clamp(x), 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2));

  function readPalette() {
    const cs = getComputedStyle(root), v = n => cs.getPropertyValue(n).trim();
    palette = { a: v('--obj-a'), b: v('--obj-b'), c: v('--obj-c'), d: v('--obj-d'), sh: (v('--shadow-c').match(/[\d.]+/g) || [64, 32, 140, .38]).map(Number) };
  }

  // 磁流体：表面是 N 个点组成的弹簧环，相邻点互相牵引，所以扰动会变成沿表面传播的波纹
  const N = 300;
  const off = new Float32Array(N), vel = new Float32Array(N), acc = new Float32Array(N);
  let simT = 0, nextDrop = 0;

  function simulate(t, phi, pull) {
    const steps = Math.min(3, Math.round((t - simT) / 16.7));
    if (steps < 1) return;
    simT = t;
    for (let k = 0; k < steps; k++) {
      // 每隔一两秒在表面随机"滴"一下，让波纹一直不停
      if (t > nextDrop) {
        const a0 = Math.random() * TAU, amp = .006 + Math.random() * .007;
        for (let i = 0; i < N; i++) { const rel = wrap(i / N * TAU - a0); vel[i] += amp * Math.exp(-rel * rel / .02); }
        nextDrop = t + 800 + Math.random() * 1200;
      }
      for (let i = 0; i < N; i++) {
        const th = i / N * TAU, facing = Math.max(0, Math.cos(th - phi));
        const ambient = .02 * Math.sin(3 * th + t * .0011) + .014 * Math.sin(5 * th - t * .0016 + 1.3) + .009 * Math.sin(8 * th + t * .0024 + .7);
        const lap = off[(i + N - 1) % N] + off[(i + 1) % N] - 2 * off[i];
        acc[i] = (ambient + pull * .2 * facing * facing * facing - off[i]) * .05 + lap * .24 - vel[i] * .035;
      }
      for (let i = 0; i < N; i++) { vel[i] += acc[i]; off[i] += vel[i]; }
    }
  }

  // 朝向磁铁的一侧长出尖刺，越靠近磁铁越长，像真实磁流体在磁场里的"刺猬"形态
  function blobPath(cx, cy, R, fluid, phi, spikes, t) {
    const path = new Path2D(), K = 18;
    for (let i = 0; i < N; i++) {
      const th = i / N * TAU, rel = wrap(th - phi), facing = Math.max(0, Math.cos(rel));
      let spike = 0;
      if (spikes > .001 && facing > 0) {
        const jitter = 1 + .14 * Math.sin(t * .004 + Math.round(rel * K / TAU) * 1.7);
        spike = spikes * .3 * facing * facing * Math.pow((Math.cos(K * rel) + 1) / 2, 5) * jitter;
      }
      const rr = R * (1 + fluid * (off[i] + spike));
      const px = cx + Math.cos(th) * rr, py = cy + Math.sin(th) * rr;
      if (i) path.lineTo(px, py); else path.moveTo(px, py);
    }
    path.closePath();
    return path;
  }

  function paintFace(path, cx, cy, w, h, st) {
    const M = Math.max(w, h), R = Math.min(w, h) / 2, blob = 1 - st.open;
    const ox = cx - M * 1.2, oy = cy - M * 1.2, os = M * 2.4;
    const glow = (gx, gy, gr, stops) => {
      const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      stops.forEach(([o, c]) => gg.addColorStop(o, c));
      ctx.fillStyle = gg; ctx.fillRect(ox, oy, os, os);
    };
    ctx.save();
    ctx.globalAlpha = st.alpha;
    const L = w * .6428 + h * .766, ux = .6428 * L / 2, uy = .766 * L / 2;
    const base = ctx.createLinearGradient(cx - ux, cy - uy, cx + ux, cy + uy);
    base.addColorStop(0, palette.a); base.addColorStop(.3, palette.b); base.addColorStop(.64, palette.c); base.addColorStop(1, palette.d);
    if (st.shadowA > .01) {
      const [sr, sg, sb, sa] = palette.sh;
      ctx.shadowColor = `rgba(${sr},${sg},${sb},${(sa * st.shadowA).toFixed(3)})`;
      ctx.shadowBlur = 44 * dpr; ctx.shadowOffsetY = 28 * dpr;
    }
    ctx.fillStyle = base; ctx.fill(path);
    ctx.shadowColor = 'transparent';
    ctx.clip(path);
    glow(cx - .256 * M, cy - .384 * M, .571 * M, [[0, 'rgba(255,255,255,.5)'], [1, 'rgba(255,255,255,0)']]);
    glow(cx + .384 * M, cy + .512 * M, .813 * M, [[0, 'rgba(8,3,24,.3)'], [1, 'rgba(8,3,24,0)']]);
    if (blob > .01) {
      ctx.globalAlpha = st.alpha * blob;
      // 边缘压暗 + 一道湿润的镜面高光 + 左上方的亮边，让液体有体积和光泽
      glow(cx - .2 * R, cy - .25 * R, 1.32 * R, [[0, 'rgba(8,3,24,0)'], [.62, 'rgba(8,3,24,0)'], [1, 'rgba(8,3,24,.4)']]);
      ctx.save();
      ctx.translate(cx - .34 * R, cy - .5 * R); ctx.rotate(-.62); ctx.scale(1, .42);
      const sp = ctx.createRadialGradient(0, 0, 0, 0, 0, .3 * R);
      sp.addColorStop(0, 'rgba(255,255,255,.85)'); sp.addColorStop(.45, 'rgba(255,255,255,.25)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sp; ctx.fillRect(-.3 * R, -.3 * R, .6 * R, .6 * R);
      ctx.restore();
      const rim = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
      rim.addColorStop(0, 'rgba(255,255,255,.75)'); rim.addColorStop(.45, 'rgba(255,255,255,0)'); rim.addColorStop(1, 'rgba(255,255,255,.12)');
      ctx.strokeStyle = rim; ctx.lineWidth = 3; ctx.stroke(path);
      // 手电筒照到液体表面时的光斑
      const lt = st.light;
      if (lt.a > .01 && Math.hypot(lt.x - cx, lt.y - cy) < R * 1.8) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = st.alpha * blob * lt.a;
        glow(lt.x, lt.y, .62 * R, [[0, 'rgba(255,240,200,.8)'], [.4, 'rgba(255,214,130,.32)'], [1, 'rgba(255,214,130,0)']]);
        glow(lt.x, lt.y, .12 * R, [[0, 'rgba(255,255,255,.9)'], [1, 'rgba(255,255,255,0)']]);
      }
    }
    ctx.restore();
  }

  function renderFace(st, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (st.alpha <= .003 || st.R < 1) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (st.open > 0) {
      const path = new Path2D();
      path.roundRect(st.x - st.vw / 2, st.y - st.vh / 2, st.vw, st.vh, st.r);
      paintFace(path, st.x, st.y, st.vw, st.vh, st);
    } else {
      paintFace(blobPath(st.cx, st.cy, st.R, st.fluid, st.phi, st.spikes, t), st.cx, st.cy, st.R * 2, st.R * 2, st);
    }
  }

  // 小人：面朝目标，手臂绕肩膀转动瞄准；目标跑到身后时整个人转身。
  // 一开始往下滚，就关掉手电筒、转身走进左边地上冒出来的洞里；回到顶部时再从洞里走出来
  function updateKid(p, t, tgt, dt) {
    const k = g.kid, hl = g.hole, leaving = p > .04;
    kidState.exit = reduced.matches ? (leaving ? 1 : 0) : clamp(kidState.exit + (leaving ? 1 : -1) * dt / KID_EXIT_MS);
    const e = kidState.exit;
    const holeS = backOut(e / .12) * (1 - smooth((e - .9) / .1));
    hole.style.transform = `translate3d(${hl.cx - hl.rx}px, ${hl.cy - hl.ry}px, 0) scale(${Math.max(0, holeS).toFixed(3)})`;
    kid.style.visibility = e >= 1 ? 'hidden' : 'visible';
    if (e >= 1) { beam.style.opacity = spot.style.opacity = 0; return { x: 0, y: 0, a: 0 }; }

    const lower = seg(e, 0, .12), walk = seg(e, .1, .66), sink = seg(e, .6, .9);
    const cx = mix(k.cx, hl.cx, walk) - sink * k.w * .1;
    const top = k.ground - k.h + sink * k.h * 1.08;
    kid.style.transform = `translate3d(${cx - k.w / 2}px, ${top}px, 0)`;
    // 下沉时只露出洞口线以上的部分，看起来就是一步步走进洞里
    const cut = (hl.cy - top).toFixed(1);
    kid.style.clipPath = sink > 0 ? `polygon(-60% -60%, 160% -60%, 160% ${cut}px, -60% ${cut}px)` : 'none';
    kidShadow.setAttribute('opacity', (.6 * (1 - seg(e, .5, .62))).toFixed(3));

    if (e > 0) kidState.left = leaving;
    else if (tgt.x < cx - 26) kidState.left = true;
    else if (tgt.x > cx + 26) kidState.left = false;
    const snap = reduced.matches ? 1 : .2;
    kidState.flip += ((kidState.left ? 1 : 0) - kidState.flip) * snap;
    const sx = 1 - 2 * kidState.flip, dir = sx < 0 ? -1 : 1;
    kidFlip.style.transform = `scaleX(${sx.toFixed(3)})`;

    // 走路：步伐相位跟走过的距离挂钩，脚不会在地上打滑
    const stride = seg(e, .06, .14) * (1 - seg(e, .88, .95));
    const phase = Math.abs(cx - k.cx) / (k.w * .5) * Math.PI;
    const leg = Math.sin(phase) * 24 * stride;
    kidLegF.setAttribute('transform', `rotate(${leg.toFixed(2)} 58 160)`);
    kidLegB.setAttribute('transform', `rotate(${(-leg).toFixed(2)} 80 160)`);
    kidArmB.setAttribute('transform', `rotate(${(-leg * .7).toFixed(2)} 54 118)`);
    kidWalk.setAttribute('transform', `translate(0 ${(-Math.abs(Math.sin(phase)) * 2.4 * stride).toFixed(2)})`);

    const shX = cx + 16 * sx * k.s, shY = top + 114 * k.s;
    const aim = clamp(Math.atan2(tgt.y - shY, (tgt.x - shX) * dir), -1.25, 1.1);
    kidState.ang += (mix(aim, 1.05, lower) - kidState.ang) * snap;
    const a = kidState.ang, ca = Math.cos(a), sa = Math.sin(a);
    kidArm.setAttribute('transform', `rotate(${(a * 180 / Math.PI).toFixed(2)} 86 114)`);
    kidHead.setAttribute('transform', `rotate(${(a * 7).toFixed(2)} 70 100)`);
    const hx = cx + 4 * sx * k.s, hy = top + 81 * k.s;
    const ex = mix(clamp((tgt.x - hx) * dir / 140, -1, 1) * 2.6, 2.2, lower), ey = mix(clamp((tgt.y - hy) / 140, -1, 1) * 2, .8, lower);
    kidEyes.setAttribute('transform', `translate(${ex.toFixed(2)} ${ey.toFixed(2)})`);
    // 镜头位置 = 肩膀 + 手臂方向 × 57（SVG 单位），再换算到舞台坐标
    const lx = shX + 57 * k.s * ca * sx, ly = shY + 57 * k.s * sa, ang = Math.atan2(sa, ca * sx);
    const reach = Math.hypot(tgt.x - lx, tgt.y - ly);
    const lit = (1 - lower) * Math.abs(sx) * (reduced.matches ? 1 : seg(t - t0, 2000, 2700));
    beam.style.transform = `translate3d(${lx}px, ${ly - g.beamH / 2}px, 0) rotate(${ang}rad)`;
    beam.style.opacity = lit * .6;
    const hitX = lx + Math.cos(ang) * reach, hitY = ly + Math.sin(ang) * reach;
    spot.style.transform = `translate3d(${hitX - 80}px, ${hitY - 80}px, 0)`;
    spot.style.opacity = lit * clamp(1.4 - reach / g.beamL);
    return { x: hitX, y: hitY, a: lit };
  }

  function measure() {
    const w = stage.clientWidth, h = stage.clientHeight, mobile = w <= 760;
    const base = mobile ? Math.min(148, w * .4) : Math.min(300, w * .2, h * .34);
    const bars = mobile ? 80 : 88;
    let W = Math.min(w * (mobile ? .9 : .7), 1080), H = W * 9 / 16 + bars;
    const maxH = h * (mobile ? .46 : .6);
    if (H > maxH) { H = maxH; W = (H - bars) * 16 / 9; }
    g = { w, h, mobile, base, W, H,
      x0: w * (mobile ? .5 : .72), y0: h * (mobile ? .74 : .53), x1: w * .5, y1: h * .6,
      start: story.getBoundingClientRect().top + scrollY, dist: Math.max(1, story.offsetHeight - h) };
    panel.style.width = W + 'px'; panel.style.height = H + 'px';
    shape.style.setProperty('--W', W + 'px'); shape.style.setProperty('--H', H + 'px');
    const fs = base * 1.45;
    Object.assign(frame.style, { left: g.x0 - fs / 2 + 'px', top: g.y0 - fs / 2 + 'px', width: fs + 'px', height: fs + 'px' });
    floor.style.width = base * 1.1 + 'px';
    aura.style.width = aura.style.height = base * 2.8 + 'px';
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    // 小人站在和液体同一条"地面"上，位于液体左侧
    const kh = mobile ? 108 : clamp(base * .68, 112, 196), kw = kh * .7;
    g.kid = { cx: mobile ? Math.max(kw / 2 + 32, g.x0 - base * .8) : g.x0 - base * 1.28, ground: g.y0 + base * .74 + 14, h: kh, w: kw, s: kh / 200 };
    kid.style.width = kw + 'px'; kid.style.height = kh + 'px';
    // 洞口开在小人左边的地面上；手机上左边空间小，只走一小段
    const hrx = kw * (mobile ? .44 : .48);
    // 桌面端洞口不能压到左边的"关于我"链接上
    const linkRight = $('.hero-actions .btn-link').getBoundingClientRect().right - stage.getBoundingClientRect().left;
    const holeX = mobile ? Math.max(hrx + 8, g.kid.cx - kw * .9) : clamp(g.kid.cx - kw * 1.3, linkRight + hrx + 24, g.kid.cx - kw * .5);
    g.hole = { cx: holeX, cy: g.kid.ground - 3, rx: hrx, ry: hrx * .3 };
    hole.style.width = hrx * 2 + 'px'; hole.style.height = hrx * .6 + 'px';
    g.beamL = mobile ? 440 : 780; g.beamH = g.beamL * .5;
    beam.style.width = g.beamL + 'px'; beam.style.height = g.beamH + 'px';
    target = current = progress();
    draw(current, performance.now());
    medias.forEach(home);
  }

  // 每行文字在遮罩里进出，进场从下往上、退场继续向上，两段文字永不叠在一起
  function reveal(b, enter, exit) {
    const n = b.lines.length, st = .22, span = 1 + st * (n - 1);
    b.lines.forEach((ln, i) => {
      const e = clamp(enter * span - st * i), x = clamp(exit * span - st * i);
      ln.style.transform = `translate3d(0, ${((1 - e) - x) * 112}%, 0)`;
    });
    const hidden = enter <= 0 || exit >= 1;
    if (b.hidden !== hidden) {
      b.hidden = hidden;
      b.el.style.visibility = hidden ? 'hidden' : 'visible';
      b.el.setAttribute('aria-hidden', String(hidden));
      b.el.inert = hidden;
    }
  }

  function draw(p, t) {
    const { mobile, base, W, H, x0, y0, x1, y1 } = g;
    // 起点是被磁铁牵着走的液体；滚到"成形"时波纹和尖刺收回成一个干净的圆，
    // 圆再一边长大一边移到中央，最后张开成作品窗口
    const intro = reduced.matches ? 1 : clamp((t - t0 - 300) / 1400);
    const fluid = reduced.matches ? 0 : 1 - seg(p, .3, .56);
    const round = seg(p, .28, .56), move = seg(p, .56, .74), grow = seg(p, .58, .72), open = seg(p, .7, .9);
    const s = mix(base, base * 1.08, round);
    const d = mix(s, Math.min(W, H) * .78, grow);
    const vw = mix(d, W, open), vh = mix(d, H, open);
    const r = mix(d / 2, mobile ? 14 : 18, open);
    const calm = 1 - grow;
    const float = reduced.matches ? 0 : Math.sin(t / 950) * 7 * calm;
    const x = mix(x0, x1, move), y = mix(y0, y1, grow) + float;
    const R = d / 2 * (open > 0 ? 1 : elastic(intro));

    obj.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    shape.style.setProperty('--vw', vw + 'px');
    shape.style.setProperty('--vh', vh + 'px');
    shape.style.setProperty('--r', r + 'px');
    ghost.style.opacity = seg(p, .6, .7);
    win.style.opacity = seg(p, .7, .83);

    // 指针就是磁铁；没有指针（或触屏松手 3 秒后）时，磁铁沿一条慢轨道在液体右侧绕行
    const active = ptr.on && !reduced.matches && (ptr.type === 'mouse' || t - ptr.last < 3200);
    const tgt = active ? { x: ptr.x, y: ptr.y }
      : reduced.matches ? { x: x - R * .3, y: y - R * .45 }
      : { x: x + R * (.6 + 1.5 * Math.cos(t * .00042)), y: y + R * (1.25 * Math.sin(t * .00067) - .3) };
    if (!mag.ready) { mag.x = tgt.x; mag.y = tgt.y; mag.ready = true; }
    mag.x += (tgt.x - mag.x) * .12; mag.y += (tgt.y - mag.y) * .12;
    const dist = Math.hypot(mag.x - x, mag.y - y) || 1, phi = Math.atan2(mag.y - y, mag.x - x);
    const pull = clamp((R * 5.5 - dist) / (R * 4.5)) * (active ? 1 : .6) * fluid;
    const spikes = pull * smooth((dist - R * .75) / (R * .7)) * (active ? 1 : .55);
    if (fluid > 0) simulate(t, phi, pull);
    const dt = clamp(t - (lastDrawT || t), 0, 64);
    lastDrawT = t;
    const light = updateKid(p, t, tgt, dt);
    const lean = pull * R * .08;
    renderFace({ open, x, y, vw, vh, r, R, fluid, phi, spikes, light,
      cx: x + Math.cos(phi) * lean, cy: y + Math.sin(phi) * lean,
      alpha: 1 - seg(p, .75, .85), shadowA: (1 - seg(p, .6, .7)) * Math.min(1, intro * 2) }, t);

    floor.style.transform = `translate3d(${x - base * .55}px, ${y0 + base * .74}px, 0) scaleX(${1 + float / 40})`;
    floor.style.opacity = (1 - seg(p, .5, .64)) * (.75 + float / 40) * Math.min(1, intro * 2);
    const A = base * 2.8;
    aura.style.transform = `translate3d(${x - A / 2}px, ${y - A / 2}px, 0)`;
    aura.style.opacity = (1 - open) * Math.min(1, intro * 1.5);
    frame.style.opacity = 1 - seg(p, .03, .14);

    reveal(blocks.hero, 1, seg(p, .07, .17));
    reveal(blocks.a, seg(p, .18, .25), seg(p, .35, .42));
    reveal(blocks.b, seg(p, .43, .5), seg(p, .58, .64));
    reveal(blocks.d, seg(p, .66, .78), 0);

    track.forEach((li, i) => {
      const [from, to] = PHASES[i];
      li.style.setProperty('--f', clamp((p - from) / (to - from)));
      li.classList.toggle('is-on', p >= from && (p < to || i === 3));
    });
    const text = `MAG ${pad3(Math.round(pull * 100))}% · R ${pad3(Math.round(open > 0 ? r : R))} · ${pad3(Math.round(p * 100))}%`;
    if (text !== lastReadout) { readout.textContent = text; lastReadout = text; }
    mark.style.borderRadius = mix(8, 3, open) + 'px';

    panel.inert = p < .86;
    syncLoop(p);
  }

  function syncLoop(p) {
    if (!loopVideo) return;
    const want = loopPref === null ? !reduced.matches : loopPref;
    const fullPlaying = vids.some(v => v.dataset.mode === 'full' && !v.paused);
    const should = p > .86 && inView && !document.hidden && want && !fullPlaying;
    if (should === loopOn) return;
    loopOn = should;
    if (should) {
      if (!loopVideo.getAttribute('src')) loopVideo.src = loopVideo.dataset.src;
      loopVideo.play().catch(() => { loopOn = false; });
    } else loopVideo.pause();
  }
  function updateLoopButton() {
    const playing = !loopVideo.paused;
    loopToggle.textContent = playing ? '暂停预览 Ⅱ' : '播放预览 ▷';
    loopToggle.setAttribute('aria-pressed', String(playing));
  }
  // 精选项目没有速览视频时，开场窗口里放的是封面图，没有播放按钮
  if (loopVideo && loopToggle) {
    loopVideo.addEventListener('play', updateLoopButton);
    loopVideo.addEventListener('pause', updateLoopButton);
    loopToggle.addEventListener('click', () => { loopPref = loopVideo.paused; loopOn = !loopPref; syncLoop(current); });
  }
  $$('[data-open-full]').forEach(a => a.addEventListener('click', e => {
    const m = $(`#${a.dataset.openFull} [data-media]`);
    if (!m) return;
    e.preventDefault();
    m.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'center' });
    setMode(m, 'full', true);
  }));

  function tick(t) {
    raf = 0;
    const k = reduced.matches ? 1 : .14;
    current = Math.abs(target - current) < 1e-4 ? target : current + (target - current) * k;
    draw(current, t);
    // 液体和小人一直在动，开场区可见时持续刷新；滚到窗口阶段后只在滚动时刷新
    const kidBusy = current > .04 ? kidState.exit < 1 : kidState.exit > 0;
    const alive = current !== target || kidBusy || (!reduced.matches && current < .86);
    if (inView && !document.hidden && alive) raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

  let lastY = scrollY;
  function onScroll() {
    const y = scrollY;
    target = progress();
    nav.classList.toggle('is-compact', y > 40);
    if (y > lastY + 6 && y > 200) nav.classList.add('is-hidden');
    else if (y < lastY - 6) nav.classList.remove('is-hidden');
    lastY = y;
    kick();
  }
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));
  const setPointer = e => {
    const rc = stage.getBoundingClientRect();
    ptr.x = e.clientX - rc.left; ptr.y = e.clientY - rc.top;
    ptr.on = true; ptr.type = e.pointerType; ptr.last = performance.now();
    kick();
  };
  stage.addEventListener('pointermove', setPointer);
  stage.addEventListener('pointerdown', setPointer);
  stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { ptr.on = false; kick(); } });
  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    if (inView) kick();
    else { current = target; draw(current, 0); }
  }).observe(story);

  const navLinks = $$('.nav-links a');
  const sectionIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['work', 'about', 'contact'].forEach(id => sectionIO.observe(document.getElementById(id)));

  let resizeFrame = 0;
  addEventListener('resize', () => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(measure); }, { passive: true });
  addEventListener('scroll', onScroll, { passive: true });
  reduced.addEventListener('change', () => { loopPref = null; measure(); kick(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { vids.forEach(v => v.pause()); syncLoop(current); }
    else kick();
  });
  setTheme(savedTheme === 'ink' ? 'ink' : 'violet');
  measure();
  onScroll();
})();
