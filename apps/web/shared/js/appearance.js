(function () {
  const root = document.documentElement;
  const key = 'ciya2026:theme';
  const { userAgentData, userAgent } = window.navigator;
  const isPhone = userAgentData?.mobile ?? /iPhone|iPod|Windows Phone|Android.*Mobile/i.test(userAgent);
  const defaultTheme = isPhone ? 'dark' : 'light';
  const chrome = document.querySelector('meta[name="theme-color"]');
  let preference;
  let button;
  let snow;

  function savedTheme(value) {
    return value === 'dark' || value === 'light' ? value : null;
  }

  function readPreference() {
    try { preference = savedTheme(localStorage.getItem(key)); } catch {}
  }

  function applyTheme() {
    const theme = preference || defaultTheme;
    const dark = theme === 'dark';
    root.dataset.theme = theme;
    if (chrome) chrome.content = dark ? '#0d1b2c' : '#f8f9ff';
    if (button) {
      button.setAttribute('aria-pressed', dark);
      button.title = dark ? 'Activar modo claro' : 'Activar modo oscuro';
      button.firstElementChild.textContent = dark ? '☀︎' : '☾';
    }
    if (snow) snow.refresh();
  }

  readPreference();
  applyTheme();
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      readPreference();
      applyTheme();
    }
  });
  window.addEventListener('storage', function (event) {
    if (event.key !== key && event.key !== null) return;
    preference = savedTheme(event.newValue);
    applyTheme();
  });

  function createSnow() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    canvas.className = 'site-snow';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

    let width, height, ratio, flakes, color;
    let frame = null;
    let lastTime;
    let wind = 0;

    function draw(seconds) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      for (const flake of flakes) {
        flake.y += flake.speed * seconds;
        flake.x += (flake.drift + wind) * seconds;
        if (flake.y > height + 4) flake.y = -4;
        if (flake.x > width + 4) flake.x = -4;
        if (flake.x < -4) flake.x = width + 4;
        ctx.globalAlpha = flake.alpha;
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, 2 * Math.PI);
        ctx.fill();
      }
      wind *= Math.max(0, 1 - 1.5 * seconds);
      ctx.globalAlpha = 1;
    }

    function tick(time) {
      const elapsed = time - lastTime;
      if (elapsed >= 32) {
        draw(Math.min(elapsed, 80) / 1000);
        lastTime = time;
      }
      frame = window.requestAnimationFrame(tick);
    }

    function refresh() {
      color = getComputedStyle(root).getPropertyValue('--snow-color').trim();
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      if (document.hidden || document.fullscreenElement) return;
      draw(0);
      if (!reduced.matches) {
        lastTime = performance.now();
        frame = window.requestAnimationFrame(tick);
      }
    }

    function resize() {
      const newWidth = canvas.clientWidth;
      const newHeight = canvas.clientHeight;
      const newRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      if (!newWidth || !newHeight) return;
      if (width === newWidth && height === newHeight && ratio === newRatio) return;
      width = newWidth;
      height = newHeight;
      ratio = newRatio;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const compact = width <= 640;
      flakes = Array.from({ length: compact ? 62 : 86 }, function (_, index) {
        const x = Math.random() * width;
        const gutter = Math.min(25, width / 10);
        return {
          x: compact && index % 3 === 0 ? x % gutter + (index % 2 ? width - gutter : 0) : x,
          y: Math.random() * height,
          radius: .65 + Math.random() * 1.1,
          speed: 9 + Math.random() * 19,
          drift: Math.random() * 9 - 4.5,
          alpha: .37 + Math.random() * .51
        };
      });
      refresh();
    }

    function moveSnow(event) {
      if (!reduced.matches && width > 0) wind = (event.clientX / width - .5) * 32;
    }

    window.addEventListener('pointermove', moveSnow, { passive: true });
    window.addEventListener('pointerdown', moveSnow, { passive: true });
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', refresh);
    document.addEventListener('fullscreenchange', refresh);
    reduced.addEventListener('change', refresh);
    resize();
    return { refresh };
  }

  document.addEventListener('DOMContentLoaded', function () {
    const actions = document.querySelector('.topbar .site-actions');
    if (actions) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn ghost small theme-toggle';
      button.setAttribute('aria-label', 'Modo oscuro');
      button.innerHTML = '<span aria-hidden="true"></span>';
      button.addEventListener('click', function () {
        preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(key, preference); } catch {}
        applyTheme();
      });
      actions.prepend(button);
    }
    applyTheme();
    snow = createSnow();
  }, { once: true });
})();
