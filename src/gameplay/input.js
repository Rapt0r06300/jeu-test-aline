const MOVEMENT_KEYS = Object.freeze({
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
});

export function createInputController({ joystick, actionButtons, actionConfig, onAction, onInteract }) {
  const pressed = new Set();
  let touchVector = { x: 0, z: 0 };
  let activePointer = null;

  function keyboardVector() {
    let x = 0;
    let z = 0;
    for (const code of pressed) {
      const vector = MOVEMENT_KEYS[code];
      if (!vector) continue;
      x += vector[0];
      z += vector[1];
    }
    return { x, z };
  }

  function sampleMovement() {
    const keyboard = keyboardVector();
    return {
      x: Math.max(-1, Math.min(1, keyboard.x + touchVector.x)),
      z: Math.max(-1, Math.min(1, keyboard.z + touchVector.z)),
    };
  }

  function reset() {
    pressed.clear();
    touchVector = { x: 0, z: 0 };
    activePointer = null;
    joystick?.style.setProperty('--stick-x', '0px');
    joystick?.style.setProperty('--stick-y', '0px');
  }

  function onKeyDown(event) {
    if (MOVEMENT_KEYS[event.code]) {
      pressed.add(event.code);
      event.preventDefault();
      return;
    }
    if (event.code === 'KeyE' && !event.repeat) {
      onInteract?.();
      event.preventDefault();
      return;
    }
    const action = Object.values(actionConfig).find((candidate) => candidate.key === event.code);
    if (action && !event.repeat) {
      onAction(action.id);
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    if (MOVEMENT_KEYS[event.code]) {
      pressed.delete(event.code);
      event.preventDefault();
    }
  }

  function updatePointer(event) {
    if (!joystick || activePointer !== event.pointerId) return;
    const rect = joystick.getBoundingClientRect();
    const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.34);
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;
    const length = Math.hypot(dx, dy);
    if (length > radius) {
      dx = (dx / length) * radius;
      dy = (dy / length) * radius;
    }
    touchVector = { x: dx / radius, z: dy / radius };
    joystick.style.setProperty('--stick-x', `${dx}px`);
    joystick.style.setProperty('--stick-y', `${dy}px`);
  }

  function onPointerDown(event) {
    if (!joystick || activePointer !== null) return;
    activePointer = event.pointerId;
    joystick.setPointerCapture?.(event.pointerId);
    updatePointer(event);
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (event.pointerId !== activePointer) return;
    updatePointer(event);
    event.preventDefault();
  }

  function onPointerEnd(event) {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    touchVector = { x: 0, z: 0 };
    joystick?.style.setProperty('--stick-x', '0px');
    joystick?.style.setProperty('--stick-y', '0px');
    event.preventDefault();
  }

  function onVisibilityChange() {
    if (document.visibilityState !== 'visible') reset();
  }

  const actionListeners = [];
  for (const [actionId, button] of Object.entries(actionButtons ?? {})) {
    const listener = (event) => {
      event.preventDefault();
      onAction(actionId);
    };
    button.addEventListener('pointerdown', listener);
    actionListeners.push([button, listener]);
  }

  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp, { passive: false });
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', onVisibilityChange);
  joystick?.addEventListener('pointerdown', onPointerDown, { passive: false });
  joystick?.addEventListener('pointermove', onPointerMove, { passive: false });
  joystick?.addEventListener('pointerup', onPointerEnd, { passive: false });
  joystick?.addEventListener('pointercancel', onPointerEnd, { passive: false });
  joystick?.addEventListener('lostpointercapture', onPointerEnd, { passive: false });

  return {
    sampleMovement,
    reset,
    dispose() {
      reset();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      joystick?.removeEventListener('pointerdown', onPointerDown);
      joystick?.removeEventListener('pointermove', onPointerMove);
      joystick?.removeEventListener('pointerup', onPointerEnd);
      joystick?.removeEventListener('pointercancel', onPointerEnd);
      joystick?.removeEventListener('lostpointercapture', onPointerEnd);
      for (const [button, listener] of actionListeners) button.removeEventListener('pointerdown', listener);
    },
  };
}
