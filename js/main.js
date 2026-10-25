/* ===== 星空 / 雨滴背景 ===== */
(() => {
  const cv = document.getElementById('starfield');
  const ctx = cv.getContext('2d');
  const DPR = Math.min(devicePixelRatio || 1, 2);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TILT = 0.2;
  let W = 0, H = 0, stars = [], meteors = [];
  let lightMix = document.documentElement.dataset.theme === 'light' ? 1 : 0;
  let lightTarget = lightMix;
  let last = performance.now();
  // 长按彩蛋：holdMix 0→1 平滑进出，浅色=雨滴定格后逆流，深色=星点绕头像旋转
  let holdMix = 0, holding = false, holdTimer = 0, ax = 0, ay = 0;

  function makeStar() {
    const r = Math.random() * 1.2 + .35;
    return {
      x: Math.random() * W, y: Math.random() * H, r,
      len: r * 7 + Math.random() * 7,
      a: Math.random(), va: (Math.random() * .012 + .003) * (Math.random() < .5 ? 1 : -1),
      vy: Math.random() * .05 + .01,
      rain: (Math.random() * 2.2 + 1.9) * .6,
    };
  }

  function layout() {
    const w = innerWidth, h = innerHeight;
    if (w === W && h === H) return;
    const prevW = W;
    W = w; H = h;
    const pw = Math.floor(W * DPR), ph = Math.floor(H * DPR);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    if (cv.width !== pw) cv.width = pw;
    if (cv.height !== ph) cv.height = ph;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    if (!stars.length) {
      const count = Math.max(40, Math.floor(W / 6));
      for (let i = 0; i < count; i++) stars.push(makeStar());
      return;
    }
    if (prevW && prevW !== W) {
      const k = W / prevW;
      for (const s of stars) s.x *= k;
    }
    const count = Math.max(40, Math.floor(W / 6));
    if (count > stars.length) {
      for (let i = stars.length; i < count; i++) stars.push(makeStar());
    } else if (count < stars.length) {
      stars.length = count;
    }
    if (!reduce) tick(performance.now());
  }
  addEventListener('resize', layout);
  layout();

  function spawnMeteor() {
    meteors.push({
      x: Math.random() * W * .9,
      y: -20,
      len: Math.random() * 170 + 190,
      v: Math.random() * 14 + 40,
      ang: Math.PI / 3.4,
      life: 1,
    });
  }
  function scheduleMeteor() {
    setTimeout(() => {
      if (!document.hidden && lightTarget === 0 && lightMix < .35) spawnMeteor();
      scheduleMeteor();
    }, Math.random() * 4500 + 2500);
  }
  if (!reduce) {
    setTimeout(() => { if (!document.hidden && lightTarget === 0) spawnMeteor(); scheduleMeteor(); }, 1500);
  }

  new MutationObserver(() => {
    lightTarget = document.documentElement.dataset.theme === 'light' ? 1 : 0;
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  const avatarEl = document.querySelector('.avatar');
  addEventListener('pointerdown', e => {
    if (reduce || e.button !== 0) return;
    if (e.target instanceof Element && e.target.closest('a,button,input,textarea,select')) return;
    const sx = e.clientX, sy = e.clientY;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      if (!avatarEl) return;
      const b = avatarEl.getBoundingClientRect();
      ax = b.left + b.width / 2;
      ay = b.top + b.height / 2;
      holding = true;
      document.body.classList.add('holding');
    }, 380);
    function end() {
      clearTimeout(holdTimer);
      holding = false;
      document.body.classList.remove('holding');
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerup', end);
      removeEventListener('pointercancel', end);
    }
    function onMove(ev) {
      if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 14) end();
    }
    addEventListener('pointermove', onMove);
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);
  });

  function tick(now) {
    const dt = Math.max(0, Math.min(now - last, 48)) / 16.667;
    last = now;
    lightMix += (lightTarget - lightMix) * Math.min(1, dt * .06);
    if (Math.abs(lightTarget - lightMix) < .002) lightMix = lightTarget;
    const mix = lightMix;
    const holdTo = holding ? 1 : 0;
    holdMix += (holdTo - holdMix) * Math.min(1, dt * .045);
    if (Math.abs(holdTo - holdMix) < .002) holdMix = holdTo;
    // 1 = 下落，0 = 定格成点，-1 = 全速逆流；拖尾长度与方向随它连续变化
    const rainDir = 1 - 2 * holdMix;
    const spin = holdMix * (1 - mix); // 旋转彩蛋只在深色（星空）下生效
    ctx.clearRect(0, 0, W, H);

    const cr = Math.round(255 - 165 * mix);
    const cg = Math.round(255 - 125 * mix);
    const cb = Math.round(255 - 75 * mix);
    const slant = Math.sin(TILT) * mix;
    const drop = Math.cos(TILT) * mix;
    const rainLen = 1 + mix * 1.6; // 雨滴比星点拖尾更长

    ctx.lineCap = 'round';
    for (const s of stars) {
      s.a += s.va * dt;
      if (s.a > 1) { s.a = 1; s.va *= -1; }
      else if (s.a < .05) { s.a = .05; s.va *= -1; }

      if (spin > .002) {
        // canvas 的 y 轴向下，负角度才是视觉上的逆时针
        const dth = -.022 * spin * dt;
        const co = Math.cos(dth), si = Math.sin(dth);
        const dx = s.x - ax, dy = s.y - ay;
        s.x = ax + dx * co - dy * si;
        s.y = ay + dx * si + dy * co;
      }

      const fall = (s.vy * (1 - mix) + s.rain * mix * rainDir) * dt;
      s.y += fall;
      s.x += fall * TILT * mix;
      if (s.y > H + 24) { s.y = -24; s.x = Math.random() * W; }
      else if (s.y < -24) { s.y = H + 24; s.x = Math.random() * W; }
      else if (s.x > W + 24) s.x = -24;
      else if (s.x < -24) s.x = W + 24;

      const alpha = s.a * .8 * (1 - mix) + (s.a * .3 + .2) * mix;
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
      if (mix < .02) {
        // 旋转时沿轨道后方补一小段渐隐拖影（平时星点是纯圆点，不画尾巴）
        if (spin > .02) {
          const lag = .09 * spin;
          const dx0 = s.x - ax, dy0 = s.y - ay;
          let px = s.x, py = s.y;
          ctx.lineWidth = Math.max(.7, s.r * 1.1);
          for (let k = 1; k <= 3; k++) {
            const ang = lag * k / 3; // 与旋转方向相反，拖影始终落在运动后方
            const ca = Math.cos(ang), sa = Math.sin(ang);
            const nx = ax + dx0 * ca - dy0 * sa;
            const ny = ay + dx0 * sa + dy0 * ca;
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${(alpha * .5 * (1 - k / 3.5)).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(nx, ny);
            ctx.stroke();
            px = nx; py = ny;
          }
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 7);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
      } else {
        ctx.lineWidth = s.r * 2 * (1 - mix) + 1.4 * mix;
        const trail = s.len * rainLen * rainDir;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - slant * trail, s.y - drop * trail);
        ctx.stroke();
      }
    }

    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += Math.cos(m.ang) * m.v * dt;
      m.y += Math.sin(m.ang) * m.v * dt;
      m.life -= (mix > .5 ? .03 : .008) * dt;
      const a = Math.max(m.life, 0);
      const tx = m.x - Math.cos(m.ang) * m.len;
      const ty = m.y - Math.sin(m.ang) * m.len;
      const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
      g.addColorStop(0, `rgba(190,228,255,${a.toFixed(3)})`);
      g.addColorStop(1, 'rgba(140,200,255,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      // 头部亮点，让流星更像“流星”而不是一条细线
      ctx.beginPath();
      ctx.arc(m.x, m.y, 1.8, 0, 7);
      ctx.fillStyle = `rgba(225,242,255,${(a * .9).toFixed(3)})`;
      ctx.fill();
      if (m.life <= 0 || m.y > H + 80 || m.x > W + 80) meteors.splice(i, 1);
    }
  }

  if (!reduce) {
    requestAnimationFrame(function loop(now) {
      tick(now);
      requestAnimationFrame(loop);
    });
  }
})();

/* ===== 点击反馈（BASpark 风格：扩散圆 + 旋转光弧 + 火花） ===== */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.getElementById('fx');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const DPR = Math.min(devicePixelRatio || 1, 2);
  const SCALE = 1.4;
  const waves = [], sparks = [];
  let W = 0, H = 0, running = false, last = 0;

  function resize() {
    W = innerWidth; H = innerHeight;
    const pw = Math.floor(W * DPR), ph = Math.floor(H * DPR);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    if (cv.width !== pw) cv.width = pw;
    if (cv.height !== ph) cv.height = ph;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  addEventListener('resize', resize);
  resize();

  function palette() {
    return document.documentElement.dataset.theme === 'light'
      ? { fill: '224,122,63', ring0: [255, 255, 255], ring1: [224, 79, 124], spark: '224,79,124' }
      : { fill: '249,168,108', ring0: [250, 252, 252], ring1: [150, 210, 255], spark: '255,255,255' };
  }

  function spawn(x, y) {
    const P = palette();
    waves.push({
      x, y, r: 0, life: 0, ang: Math.random() * Math.PI * 2, P,
      rs: [0, .08, .1][Math.floor(Math.random() * 3)],
      segs: [
        { off: 0, len: 1.1 * Math.PI, rate: [0, 1, 1.5, 2][Math.floor(Math.random() * 4)] },
        { off: (Math.random() * 3 - 1.5) * Math.PI, len: 1.1 * Math.PI, rate: [0, 1, 1.5, 2][Math.floor(Math.random() * 4)] },
      ],
    });
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (4.8 + Math.random() * 2) * SCALE;
      sparks.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        rot: Math.random() * Math.PI * 2, rs: (Math.random() - .5) * .28,
        s: (4 + Math.random() * 3) * SCALE, a: 1, P,
      });
    }
    start();
  }

  function start() {
    if (running) return;
    running = true;
    cv.classList.add('live');
    last = performance.now();
    requestAnimationFrame(loop);
  }

  function weight(t) { return Math.min(2 - Math.abs(4 * (t - .5)), 1); }

  function drawRings(w, p) {
    const stopAdd = .1, startDim = .4;
    for (let n = 0; n < 2; n++) {
      const seg = w.segs[n];
      const base = w.ang + seg.off;
      let start, end;
      if (p <= stopAdd) {
        end = base + seg.len;
        start = end - seg.len * (p / stopAdd);
      } else if (p > startDim) {
        start = base;
        end = start + seg.len * (1 - (p - startDim) / (1 - startDim));
      } else {
        start = base;
        end = start + seg.len;
      }
      const widthMul = Math.min(-.8 * (p - .8) + 1, 1);
      const t = Math.min(1.2 * p, 1);
      const rr = Math.round(w.P.ring0[0] * (1 - t) + w.P.ring1[0] * t);
      const gg = Math.round(w.P.ring0[1] * (1 - t) + w.P.ring1[1] * t);
      const bb = Math.round(w.P.ring0[2] * (1 - t) + w.P.ring1[2] * t);
      const alpha = Math.min(1.1 - .3 * p, 1);
      const radius = w.r + seg.rate * SCALE;
      for (let k = 0; k < 10; k++) {
        const t0 = k / 10, t1 = (k + 1) / 10;
        const a0 = start + (end - start) * t0;
        const a1 = start + (end - start) * t1;
        if (Math.abs(a1 - a0) < .01) continue;
        const lw = (.4 * (1 - weight(t0)) + 3.3 * weight(t0)) * widthMul * 1.15;
        ctx.beginPath();
        ctx.arc(w.x, w.y, radius, a0, a1);
        ctx.lineWidth = Math.max(lw, .1);
        ctx.strokeStyle = `rgba(${rr},${gg},${bb},${alpha})`;
        ctx.stroke();
      }
    }
  }

  function loop(now) {
    const dt = Math.max(0, Math.min(now - last, 50)) / 16.667;
    last = now;
    ctx.clearRect(0, 0, W, H);

    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.life += dt;
      const fp = Math.min(w.life / 16, 1);
      const rp = Math.min(w.life / 23, 1);
      const ease = 1 - Math.pow(1 - fp, 3);
      w.r = Math.max(0, 26 * SCALE * ease);
      const fa = 1 - fp;
      if (fa > 0) {
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r, 0, 7);
        ctx.fillStyle = `rgba(${w.P.fill},${(fa * .4).toFixed(3)})`;
        ctx.fill();
      }
      w.ang -= w.rs * dt;
      drawRings(w, rp);
      if (fp >= 1 && rp >= 1) waves.splice(i, 1);
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= Math.pow(.9, dt);
      s.vy *= Math.pow(.9, dt);
      s.rot += s.rs * dt;
      s.a -= .032 * dt;
      if (s.a <= 0) { sparks.splice(i, 1); continue; }
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.beginPath();
      ctx.moveTo(0, -s.s);
      ctx.lineTo(s.s * .6, s.s * .6);
      ctx.lineTo(-s.s * .6, s.s * .6);
      ctx.fillStyle = `rgba(${s.P.spark},${s.a.toFixed(3)})`;
      ctx.fill();
      ctx.restore();
    }

    if (waves.length || sparks.length) requestAnimationFrame(loop);
    else { running = false; cv.classList.remove('live'); ctx.clearRect(0, 0, W, H); }
  }

  addEventListener('pointerdown', e => {
    if (e.button) return;
    spawn(e.clientX, e.clientY);
  }, { passive: true });

  addEventListener('click', e => {
    if (e.detail !== 0) return;
    const el = e.target.closest('a, button');
    if (!el) return;
    const b = el.getBoundingClientRect();
    spawn(b.left + b.width / 2, b.top + b.height / 2);
  });
})();

/* ===== 打字机 ===== */
(() => {
  const el = document.getElementById('typewriter');
  const ghost = document.getElementById('tw-ghost');
  const phrases = ['cute Android apps', 'EMOO 图片工具', 'LiveXP 实况模块', 'full-stack things', 'tiny warm tools'];
  if (ghost) {
    let widest = ghost.textContent, w = 0;
    for (const p of phrases) {
      ghost.textContent = p;
      const cw = ghost.offsetWidth;
      if (cw > w) { w = cw; widest = p; }
    }
    ghost.textContent = widest;
  }
  let pi = 0, ci = 0, del = false;
  let timer = 0, running = false, lastAt = 0, lastWait = 0;
  function step() {
    timer = 0;
    const now = performance.now();
    // 系统休眠/长卡顿恢复：跳过补帧，重新排程，界面不会凭空跳字
    if (lastAt && now - lastAt > lastWait * 8 + 600) {
      lastAt = now;
      timer = setTimeout(step, 200);
      return;
    }
    lastAt = now;
    const p = phrases[pi];
    ci += del ? -1 : 1;
    el.textContent = p.slice(0, ci);
    let wait = del ? 45 : 95;
    if (!del && ci === p.length) { del = true; wait = 1600; }
    else if (del && ci === 0) { del = false; pi = (pi + 1) % phrases.length; wait = 400; }
    lastWait = wait;
    timer = setTimeout(step, wait);
  }
  // 后台标签页的定时器会被浏览器节流，节流波动时积压的链条会爆发式补跑，
  // 表现为页面内容“自己刷新”。隐藏时彻底停表，可见时从干净状态续跑。
  function pause() { running = false; clearTimeout(timer); timer = 0; }
  function resume() {
    if (running) return;
    running = true;
    timer = setTimeout(step, 200);
  }
  document.addEventListener('visibilitychange', () => document.hidden ? pause() : resume());
  if (!document.hidden) resume();
})();

/* ===== 技术栈轮播 ===== */
(() => {
  const el = document.getElementById('tech-rotator');
  const list = ['Android', 'Kotlin', 'Vue', 'Node.js', 'Compose'];
  let i = 0, t1 = 0, t2 = 0, running = false;
  function cycle() {
    t1 = 0;
    const started = performance.now();
    el.style.opacity = 0; el.style.transform = 'translateY(-6px)';
    t2 = setTimeout(() => {
      t2 = 0;
      // 系统休眠/长卡顿恢复：不切换内容，直接排下一轮，避免“凭空刷新”
      if (performance.now() - started > 2500) {
        el.style.opacity = 1; el.style.transform = 'none';
        t1 = setTimeout(cycle, 1950);
        return;
      }
      i = (i + 1) % list.length;
      el.textContent = list[i];
      el.style.opacity = 1; el.style.transform = 'none';
      t1 = setTimeout(cycle, 1950);
    }, 250);
  }
  // 同打字机：隐藏时停表，避免节流积压后回到前台时内容连跳
  function pause() {
    running = false;
    clearTimeout(t1); clearTimeout(t2);
    t1 = t2 = 0;
    el.style.opacity = 1; el.style.transform = 'none';
  }
  function resume() {
    if (running) return;
    running = true;
    t1 = setTimeout(cycle, 2200);
  }
  document.addEventListener('visibilitychange', () => document.hidden ? pause() : resume());
  if (!document.hidden) resume();
})();

/* ===== 滚动显现 + 导航高亮 ===== */
(() => {
  const revealIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
  }), { threshold: .15 });
  // 会话内重载：直接呈现，不重新播放入场动画
  if (document.documentElement.classList.contains('no-intro')) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  } else {
    document.querySelectorAll('.reveal').forEach(el => revealIO.observe(el));
  }

  const links = [...document.querySelectorAll('.nav-link')];
  const sections = [...document.querySelectorAll('main section')];
  const targets = new Map(links.map(l => [l.getAttribute('href').slice(1), l]));
  const navPill = document.querySelector('.nav-pill');
  let active = 'hero';
  let queued = false;

  function movePill(link) {
    if (!navPill || !link) return;
    navPill.style.width = link.offsetWidth + 'px';
    navPill.style.transform = `translateX(${link.offsetLeft}px)`;
  }
  function update() {
    queued = false;
    const line = innerHeight * .35;
    let id = sections[0]?.id;
    for (const s of sections) {
      if (s.getBoundingClientRect().top <= line) id = s.id;
    }
    const next = id && targets.get(id);
    if (next && id !== active) {
      active = id;
      links.forEach(l => l.classList.toggle('active', l === next));
    }
    movePill(next || targets.get(active));
  }
  function queueUpdate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }
  addEventListener('scroll', queueUpdate, { passive: true });
  addEventListener('resize', queueUpdate);
  update();
})();

/* ===== 主题切换（黑幕从开关胶囊形扩散 / 收回，可随时打断） ===== */
(() => {
  const root = document.documentElement;
  const body = document.body;
  const mq = matchMedia('(prefers-color-scheme: light)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const btns = [...document.querySelectorAll('[data-set-theme]')];
  const pill = document.querySelector('.theme-switch');
  const swPill = document.querySelector('.sw-pill');
  const veil = document.querySelector('.theme-veil');

  let mode = localStorage.getItem('theme-mode') || 'system';
  let coverage = 0; // 0 = 收到开关胶囊大小，1 = 铺满全屏
  let inT = 0, inR = 0, inB = 0, inL = 0, rad0 = 0;
  let shown = false, dest = null, raf = 0, fadeTimer = 0;

  const effective = m => m === 'system' ? (mq.matches ? 'light' : 'dark') : m;
  const commit = t => { root.dataset.theme = t; };
  function mark(animate = true) {
    btns.forEach(b => b.classList.toggle('on', b.dataset.setTheme === mode));
    if (!swPill) return;
    const on = btns.find(b => b.dataset.setTheme === mode) || btns[0];
    if (!animate) {
      swPill.style.transition = 'none';
      swPill.style.transform = `translateX(${on.offsetLeft - btns[0].offsetLeft}px)`;
      void swPill.offsetWidth;
      swPill.style.transition = '';
    } else {
      swPill.style.transform = `translateX(${on.offsetLeft - btns[0].offsetLeft}px)`;
    }
  }

  function geometry() {
    const b = pill.getBoundingClientRect();
    // 终点形状 = 开关模块的操场形外框（略放大 2px，收口时完全盖住描边）
    inT = Math.max(0, b.top - 2);
    inL = Math.max(0, b.left - 2);
    inB = Math.max(0, innerHeight - b.bottom - 2);
    inR = Math.max(0, innerWidth - b.right - 2);
    rad0 = b.height / 2 + 2;
  }
  function paint() {
    const k = 1 - coverage; // 1 = 胶囊收口，0 = 铺满全屏
    veil.style.clipPath = `inset(${(inT * k).toFixed(1)}px ${(inR * k).toFixed(1)}px ${(inB * k).toFixed(1)}px ${(inL * k).toFixed(1)}px round ${(rad0 * k).toFixed(1)}px)`;
  }
  function show() {
    if (shown) return;
    clearTimeout(fadeTimer);
    body.classList.add('theme-transition');
    veil.classList.add('on');
    shown = true;
  }
  // 遮罩收回到开关里，颜色渐变再多留一会儿再摘掉过渡类
  function endVeil() {
    veil.classList.remove('on');
    shown = false;
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => body.classList.remove('theme-transition'), 450);
  }
  function reset() {
    stop();
    clearTimeout(fadeTimer);
    veil.classList.remove('on');
    body.classList.remove('theme-transition');
    shown = false;
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    dest = null;
  }

  function tween(to, done) {
    stop();
    dest = to;
    const from = coverage;
    const dur = Math.max(180, 480 * Math.abs(to - from));
    const t0 = performance.now();
    function step(now) {
      const p = Math.min(Math.max((now - t0) / dur, 0), 1);
      const eased = 1 - Math.pow(1 - p, 3);
      coverage = from + (to - from) * eased;
      paint();
      if (p < 1) {
        raf = requestAnimationFrame(step);
      } else {
        raf = 0;
        dest = null;
        done();
      }
    }
    raf = requestAnimationFrame(step);
  }

  function go(target) {
    geometry();
    if (reduce.matches) {
      reset();
      commit(target);
      return;
    }
    if (!shown && root.dataset.theme === target) return;
    const to = target === 'dark' ? 1 : 0;
    if (shown && dest === to) return;
    if (!shown) {
      coverage = target === 'dark' ? 0 : 1;
      show();
      paint();
    }
    if (root.dataset.theme !== target) {
      void body.offsetWidth; // 先让渐变规则生效，再切主题色
      commit(target);
    }
    tween(to, endVeil);
  }

  btns.forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.setTheme;
    try { localStorage.setItem('theme-mode', mode); } catch (e) {}
    mark();
    go(effective(mode));
  }));

  mq.addEventListener('change', () => {
    if (mode !== 'system') return;
    reset();
    commit(effective(mode));
  });

  commit(effective(mode));
  mark(false);
})();

/* ===== 点击复制联系方式 ===== */
(() => {
  let timer;
  function toast(msg) {
    let el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.append(el); }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove('show'), 1800);
  }
  document.querySelectorAll('[data-copy]').forEach(el => el.addEventListener('click', async e => {
    e.preventDefault();
    const v = el.dataset.copy;
    try {
      await navigator.clipboard.writeText(v);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = v; document.body.append(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    toast(`已复制：${v}`);
  }));
})();

/* ===== Hero CTA 磁吸效果 ===== */
(() => {
  const cta = document.getElementById('hero-cta');
  if (!cta || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  cta.addEventListener('mousemove', e => {
    const r = cta.getBoundingClientRect();
    cta.style.transform = `translate(${(e.clientX - r.x - r.width / 2) * .06}px, ${(e.clientY - r.y - r.height / 2) * .12 - 3}px)`;
  });
  cta.addEventListener('mouseleave', () => cta.style.transform = '');
})();

/* ===== 页脚年份自动更新 ===== */
(() => {
  const el = document.getElementById('footer-year');
  el.textContent = new Date().getFullYear();
})();

/* ===== LiveXP 最新版本号（拉取失败则保留 HTML 里的兜底值） ===== */
(() => {
  const el = document.getElementById('lxv');
  if (!el) return;
  fetch('https://api.github.com/repos/mingyu0401/liveXP/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(d => { if (d && d.tag_name) el.textContent = d.tag_name; })
    .catch(() => {});
})();
