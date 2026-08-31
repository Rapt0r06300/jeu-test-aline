function drawHumanoid(ctx, x, y, scale, {
  body = '#4a8eb8',
  armor = '#c5d3dc',
  skin = '#c89472',
  accent = '#7ce6ff',
  enemy = false,
  boss = false,
  targeted = false,
  moving = false,
  dead = false,
  time = 0,
} = {}) {
  const s = Math.max(0.72, Math.min(1.75, scale * (boss ? 1.22 : 0.95)));
  const bob = dead ? 0 : Math.sin(time * (moving ? 8 : 2.2)) * (moving ? 1.8 : 0.65);
  const stride = dead ? 0 : Math.sin(time * 8) * (moving ? 5.5 : 0.6);

  ctx.save();
  ctx.translate(x, y + bob);
  if (dead) {
    ctx.rotate(-1.25);
    ctx.translate(-4 * s, 4 * s);
  }

  ctx.globalAlpha = dead ? 0.48 : 1;
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath();
  ctx.ellipse(0, 11 * s, 9 * s, 3.2 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  if (targeted && !dead) {
    ctx.strokeStyle = '#ffd66f';
    ctx.lineWidth = Math.max(1.5, 1.7 * s);
    ctx.beginPath();
    ctx.ellipse(0, 10 * s, 11 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = '#17222a';
  ctx.lineWidth = 4.3 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-3.1 * s, 4 * s);
  ctx.lineTo((-3.6 + stride * 0.25) * s, 11 * s);
  ctx.moveTo(3.1 * s, 4 * s);
  ctx.lineTo((3.6 - stride * 0.25) * s, 11 * s);
  ctx.stroke();

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-6.1 * s, -6 * s);
  ctx.lineTo(6.1 * s, -6 * s);
  ctx.lineTo(4.2 * s, 4.7 * s);
  ctx.lineTo(-4.2 * s, 4.7 * s);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = armor;
  ctx.fillRect(-6.5 * s, -5.8 * s, 13 * s, 3.1 * s);
  ctx.fillRect(-4.8 * s, 2.8 * s, 9.6 * s, 1.8 * s);

  ctx.strokeStyle = body;
  ctx.lineWidth = 3.8 * s;
  ctx.beginPath();
  ctx.moveTo(-5.2 * s, -3.3 * s);
  ctx.lineTo((-8.5 - stride * 0.18) * s, 3.8 * s);
  ctx.moveTo(5.2 * s, -3.3 * s);
  ctx.lineTo((8.5 + stride * 0.18) * s, 3.2 * s);
  ctx.stroke();

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, -11 * s, 4.3 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = enemy ? '#24161a' : '#172233';
  ctx.beginPath();
  ctx.arc(0, -12.2 * s, 4.4 * s, Math.PI, Math.PI * 2);
  ctx.lineTo(4.1 * s, -10.5 * s);
  ctx.lineTo(-4.1 * s, -10.5 * s);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#6b4d35';
  ctx.lineWidth = 1.8 * s;
  ctx.beginPath();
  ctx.moveTo(8.2 * s, 1.5 * s);
  ctx.lineTo(12.3 * s, -8.8 * s);
  ctx.stroke();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.2 * s;
  ctx.beginPath();
  ctx.moveTo(12.3 * s, -8.8 * s);
  ctx.lineTo(14.2 * s, -14.5 * s);
  ctx.stroke();

  if (boss && !dead) {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-2.4 * s, -14.3 * s);
    ctx.lineTo(-5.1 * s, -19 * s);
    ctx.lineTo(-0.8 * s, -15.1 * s);
    ctx.moveTo(2.4 * s, -14.3 * s);
    ctx.lineTo(5.1 * s, -19 * s);
    ctx.lineTo(0.8 * s, -15.1 * s);
    ctx.fill();
  }

  ctx.restore();
}

export function createFallbackScene(root, reason = '3D renderer unavailable') {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', 'Fallback visuel humanoïde de la scène fantasy jouable');
  root.replaceChildren(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  let raf = 0;
  let disposed = false;
  let width = 1;
  let height = 1;
  let dpr = 1;
  let latestState = null;
  const previousPositions = new Map();

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

  function worldToScreen(position, center) {
    const scale = Math.min(width, height) / 46;
    return {
      x: width / 2 + (position.x - center.x) * scale,
      y: height / 2 + (position.z - center.z) * scale,
      scale,
    };
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

    if (latestState) {
      const center = latestState.player.position;
      for (const enemy of latestState.enemies) {
        const point = worldToScreen(enemy.position, center);
        const previous = previousPositions.get(enemy.id);
        const moving = Boolean(previous && Math.hypot(enemy.position.x - previous.x, enemy.position.z - previous.z) > 0.02);
        drawHumanoid(ctx, point.x, point.y, point.scale, {
          body: enemy.isBoss ? '#772d24' : enemy.id.startsWith('sentinel') ? '#806445' : '#7d3342',
          armor: enemy.isBoss ? '#c17c4d' : '#9a8175',
          skin: enemy.isBoss ? '#995842' : '#a77a63',
          accent: enemy.isBoss ? '#ff6842' : '#e6ad74',
          enemy: true,
          boss: enemy.isBoss,
          targeted: enemy.id === latestState.targetId,
          moving,
          dead: enemy.state === 'dead',
          time: t + enemy.position.x * 0.03,
        });
        previousPositions.set(enemy.id, { ...enemy.position });
      }
      const player = worldToScreen(center, center);
      drawHumanoid(ctx, player.x, player.y, player.scale, {
        body: '#277fa9',
        armor: '#d1e0e9',
        skin: '#c89573',
        accent: '#76e6ff',
        moving: Boolean(latestState.input?.moveX || latestState.input?.moveY),
        dead: latestState.player.hp <= 0,
        time: t,
      });
    }

    ctx.fillStyle = 'rgba(111,231,255,.35)';
    for (let i = 0; i < 16; i++) {
      const x = (i * 97 + t * 7) % (width + 40) - 20;
      const y = horizon - 30 - (i * 53 % Math.max(80, horizon - 60)) + Math.sin(t * 1.2 + i) * 8;
      ctx.beginPath();
      ctx.arc(x, y, 1.4 + (i % 3) * .35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(3,9,12,.72)';
    ctx.fillRect(12, height - 34, Math.min(width - 24, 370), 22);
    ctx.fillStyle = '#b9cbd7';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`Fallback humanoïde actif · ${reason}`, 20, height - 19);
    raf = requestAnimationFrame(draw);
  }

  resize();
  raf = requestAnimationFrame(draw);

  return {
    kind: 'fallback-2d-humanoid',
    canvas,
    resize,
    update(state) { latestState = state; },
    stop() { if (raf) cancelAnimationFrame(raf); raf = 0; },
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      previousPositions.clear();
      root.replaceChildren();
    },
  };
}
