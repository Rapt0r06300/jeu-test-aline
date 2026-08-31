export function createFallbackScene(root, reason = '3D renderer unavailable') {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', 'Fallback visuel de la scène fantasy');
  root.replaceChildren(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  let raf = 0;
  let disposed = false;
  let width = 1;
  let height = 1;
  let dpr = 1;

  function resize() {
    if (disposed) return;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = Math.max(1, root.clientWidth);
    height = Math.max(1, root.clientHeight);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(time) {
    if (!ctx || disposed) return;
    const t = time * 0.001;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#0a1b29');
    sky.addColorStop(0.55, '#173328');
    sky.addColorStop(1, '#07110d');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    const horizon = height * 0.62;
    ctx.fillStyle = '#1e3325';
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    for (let x = 0; x <= width; x += 24) {
      const y = horizon - 24 - Math.sin(x * 0.017 + t * 0.05) * 14 - Math.sin(x * 0.043) * 9;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(111,231,255,.35)';
    for (let i = 0; i < 22; i++) {
      const x = (i * 97 + t * 7) % (width + 40) - 20;
      const y = horizon - 30 - (i * 53 % Math.max(80, horizon - 60)) + Math.sin(t * 1.2 + i) * 8;
      ctx.beginPath();
      ctx.arc(x, y, 1.4 + (i % 3) * .35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(3,9,12,.72)';
    ctx.fillRect(12, height - 34, Math.min(width - 24, 330), 22);
    ctx.fillStyle = '#b9cbd7';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`Fallback actif · ${reason}`, 20, height - 19);

    raf = requestAnimationFrame(draw);
  }

  resize();
  raf = requestAnimationFrame(draw);

  return {
    kind: 'fallback-2d',
    canvas,
    resize,
    stop() { if (raf) cancelAnimationFrame(raf); raf = 0; },
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      root.replaceChildren();
    },
  };
}
