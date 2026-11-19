/** Card motion stays independent of the queue and never grades an answer itself. */
const reducedMotion = () =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const currentCard = (root) => root.querySelector('.study-card');

async function play(card, frames, duration, easing = 'cubic-bezier(.2,.7,.2,1)') {
  if (!card?.isConnected || !card.animate || reducedMotion()) return;
  const animation = card.animate(frames, { duration, easing, fill: 'forwards' });
  try {
    await animation.finished;
  } catch {
    /* A navigation may detach the card. */
  } finally {
    animation.cancel();
  }
}

/** Root owns its busy flag and calls this only for an accepted answer. */
export async function animateCardChange(root, direction, update) {
  const card = currentCard(root);
  if (!reducedMotion() && card) {
    const sign = direction === 'left' ? -1 : 1;
    const distance = Math.max(420, card.getBoundingClientRect().width + 80);
    const from = card.style.transform || 'translateX(0) rotate(0deg)';
    await play(
      card,
      [
        { transform: from, opacity: 1 },
        { transform: `translateX(${sign * distance}px) rotate(${sign * 12}deg)`, opacity: 0 },
      ],
      170,
      'cubic-bezier(.4,0,.8,.4)',
    );
  }
  // Navigation can make update a no-op; never leave the old card displaced.
  card?.style.removeProperty('transform');
  await update();
  const next = currentCard(root);
  if (next && next !== card) {
    await play(
      next,
      [
        { transform: 'translateY(14px) scale(.98)', opacity: 0 },
        { transform: 'translateY(0) scale(1)', opacity: 1 },
      ],
      170,
    );
  }
}

/** Swap content at the narrow edge of the card so text is never mirrored. */
export async function animateCardFlip(root, update) {
  const card = currentCard(root);
  await play(
    card,
    [
      { transform: 'perspective(1100px) rotateY(0deg)', opacity: 1 },
      { transform: 'perspective(1100px) rotateY(-88deg)', opacity: 0.55 },
    ],
    140,
    'ease-in',
  );
  await update();
  const next = currentCard(root);
  await play(
    next,
    [
      { transform: 'perspective(1100px) rotateY(88deg)', opacity: 0.55 },
      { transform: 'perspective(1100px) rotateY(0deg)', opacity: 1 },
    ],
    170,
    'ease-out',
  );
}

/** Horizontal touch/mouse drag; vertical intent remains native scrolling. */
export function initCardGestures(root, { onSwipe, canSwipe = () => true, isLocked = () => false }) {
  let gesture = null;
  let suppressedCard = null;
  let suppressUntil = 0;
  const returning = new Set();
  const interactive = 'button, a, input, textarea, select, summary, [contenteditable="true"]';

  function clearTransform(card) {
    if (!card) return;
    card.style.removeProperty('transform');
    card.classList.remove('is-dragging');
  }
  function release(pointer) {
    if (pointer.card.hasPointerCapture?.(pointer.id))
      pointer.card.releasePointerCapture(pointer.id);
    pointer.card.classList.remove('is-dragging');
  }
  function springBack(card) {
    const transform = card.style.transform;
    if (!transform || reducedMotion() || !card.animate) {
      clearTransform(card);
      return;
    }
    returning.add(card);
    play(
      card,
      [{ transform }, { transform: 'translateX(0) rotate(0deg)' }],
      220,
      'cubic-bezier(.2,.8,.25,1.1)',
    ).finally(() => {
      clearTransform(card);
      returning.delete(card);
    });
  }
  function reset() {
    if (gesture) {
      release(gesture);
      clearTransform(gesture.card);
      gesture = null;
    }
    for (const card of returning) {
      for (const animation of card.getAnimations?.() ?? []) animation.cancel();
      clearTransform(card);
    }
    returning.clear();
  }
  function down(event) {
    if (!event.isPrimary || event.button !== 0 || isLocked() || event.target.closest(interactive))
      return;
    const card = event.target.closest('.study-card');
    if (!card || returning.has(card)) return;
    gesture = {
      id: event.pointerId,
      card,
      x: event.clientX,
      y: event.clientY,
      dx: 0,
      horizontal: false,
    };
  }
  function move(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    if (isLocked() || !gesture.card.isConnected) {
      reset();
      return;
    }
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.horizontal) {
      if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) {
        gesture = null;
        return;
      }
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
      gesture.horizontal = true;
      gesture.card.setPointerCapture?.(event.pointerId);
      gesture.card.classList.add('is-dragging');
    }
    event.preventDefault();
    gesture.dx = dx;
    const direction = dx < 0 ? 'left' : 'right';
    const offset = canSwipe(direction) ? dx : dx * 0.2;
    const rotation = Math.max(-10, Math.min(10, offset / 32));
    gesture.card.style.transform = `translateX(${offset}px) rotate(${reducedMotion() ? 0 : rotation}deg)`;
  }
  function finish(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const pointer = gesture;
    gesture = null;
    release(pointer);
    if (!pointer.horizontal) return;
    suppressedCard = pointer.card;
    suppressUntil = Date.now() + 700;
    const direction = pointer.dx < 0 ? 'left' : 'right';
    const threshold = Math.min(110, Math.max(65, pointer.card.getBoundingClientRect().width * 0.2));
    if (Math.abs(pointer.dx) >= threshold && !isLocked() && canSwipe(direction)) {
      // Root's callback sets its lock synchronously before starting the animation.
      try {
        Promise.resolve(onSwipe(direction)).catch(() => springBack(pointer.card));
      } catch {
        springBack(pointer.card);
      }
    } else springBack(pointer.card);
  }
  function cancel(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const pointer = gesture;
    gesture = null;
    release(pointer);
    springBack(pointer.card);
  }
  function click(event) {
    const isDragClick = Date.now() < suppressUntil && suppressedCard?.contains(event.target);
    if (isDragClick || (isLocked() && event.target.closest('.study-card'))) {
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressedCard = null;
    }
  }

  root.addEventListener('pointerdown', down);
  root.addEventListener('pointermove', move, { passive: false });
  root.addEventListener('pointerup', finish);
  root.addEventListener('pointercancel', cancel);
  root.addEventListener('click', click, true);
  return {
    reset,
    destroy() {
      reset();
      root.removeEventListener('pointerdown', down);
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerup', finish);
      root.removeEventListener('pointercancel', cancel);
      root.removeEventListener('click', click, true);
    },
  };
}
