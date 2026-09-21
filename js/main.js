/* ===== 星空粒子背景 ===== */
(() => {
  const cv = document.getElementById('starfield');
  const ctx = cv.getContext('2d');
  let stars = [], meteors = [], W, H;
  const DPR = Math.min(devicePixelRatio || 1, 2);

  function resize() {
    W = cv.width = innerWidth * DPR;
    H = cv.height = innerHeight * DPR;
    cv.style.width = innerWidth + 'px';
    cv.style.height = innerHeight + 'px';
    const n = Math.floor(innerWidth / 6);
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: (Math.random() * 1.3 + .3) * DPR,
      a: Math.random(), va: (Math.random() * .012 + .003) * (Math.random() < .5 ? 1 : -1),
      vy: (Math.random() * .06 + .01) * DPR,
    }));
  }
  addEventListener('resize', resize); resize();

  function spawnMeteor() {
    meteors.push({
      x: Math.random() * W * .9, y: -20,
      len: (Math.random() * 120 + 80) * DPR,
      v: (Math.random() * 6 + 7) * DPR, ang: Math.PI / 3.4, life: 1,
    });
    setTimeout(spawnMeteor, Math.random() * 4500 + 2500);
  }
  setTimeout(spawnMeteor, 1500);

  function tick() {
    ctx.clearRect(0, 0, W, H);
    const light = document.documentElement.dataset.theme === 'light';
    for (const s of stars) {
      s.a += s.va; if (s.a > 1 || s.a < .05) s.va *= -1;
      s.y += s.vy; if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, 7);
      ctx.fillStyle = light
        ? `rgba(120,110,160,${s.a * .5})`
        : `rgba(255,255,255,${s.a * .85})`;
      ctx.fill();
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += Math.cos(m.ang) * m.v; m.y += Math.sin(m.ang) * m.v; m.life -= .008;
      const g = ctx.createLinearGradient(m.x, m.y, m.x - Math.cos(m.ang) * m.len, m.y - Math.sin(m.ang) * m.len);
      g.addColorStop(0, `rgba(255,200,150,${Math.max(m.life, 0)})`);
      g.addColorStop(1, 'rgba(255,200,150,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.6 * DPR;
      ctx.beginPath(); ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - Math.cos(m.ang) * m.len, m.y - Math.sin(m.ang) * m.len);
      ctx.stroke();
      if (m.life <= 0 || m.y > H + 50) meteors.splice(i, 1);
    }
    requestAnimationFrame(tick);
  }
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) tick();
})();

/* ===== 打字机 ===== */
(() => {
  const el = document.getElementById('typewriter');
  const phrases = ['cute Android apps', 'EMOO 图片工具', 'full-stack things', 'tiny warm tools'];
  let pi = 0, ci = 0, del = false;
  function step() {
    const p = phrases[pi];
    ci += del ? -1 : 1;
    el.textContent = p.slice(0, ci);
    let wait = del ? 45 : 95;
    if (!del && ci === p.length) { del = true; wait = 1600; }
    else if (del && ci === 0) { del = false; pi = (pi + 1) % phrases.length; wait = 400; }
    setTimeout(step, wait);
  }
  step();
})();

/* ===== 技术栈轮播 ===== */
(() => {
  const el = document.getElementById('tech-rotator');
  const list = ['Android', 'Kotlin', 'Vue', 'Node.js', 'Compose'];
  let i = 0;
  setInterval(() => {
    el.style.opacity = 0; el.style.transform = 'translateY(-6px)';
    setTimeout(() => {
      i = (i + 1) % list.length;
      el.textContent = list[i];
      el.style.opacity = 1; el.style.transform = 'none';
    }, 250);
  }, 2200);
})();

/* ===== 滚动显现 + 导航高亮 ===== */
(() => {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  const links = [...document.querySelectorAll('.nav-link')];
  const secIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id));
  }), { threshold: .4 });
  document.querySelectorAll('main section').forEach(s => secIO.observe(s));
})();

/* ===== 主题切换（light / system / dark）===== */
(() => {
  const root = document.documentElement;
  const mq = matchMedia('(prefers-color-scheme: light)');
  const btns = [...document.querySelectorAll('[data-set-theme]')];
  function apply(mode) {
    localStorage.setItem('theme-mode', mode);
    const eff = mode === 'system' ? (mq.matches ? 'light' : 'dark') : mode;
    root.dataset.theme = eff;
    btns.forEach(b => b.classList.toggle('on', b.dataset.setTheme === mode));
  }
  btns.forEach(b => b.addEventListener('click', () => apply(b.dataset.setTheme)));
  mq.addEventListener('change', () => apply(localStorage.getItem('theme-mode') || 'dark'));
  apply(localStorage.getItem('theme-mode') || 'dark');
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
