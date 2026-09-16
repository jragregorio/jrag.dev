const CURTAIN_ENTER = 2;
export const CURTAIN_EXIT = 80;

const CURTAIN_DOWN_DURATION_MIN = 450;
const CURTAIN_DOWN_DURATION_MAX = 750;
const CURTAIN_DOWN_EASE = cubicBezier(0.22, 1, 0.36, 1);

let activeCurtainDownCancel: (() => void) | null = null;

export function isWorkUnlocked(top: number, currentlyUnlocked: boolean) {
  return currentlyUnlocked ? top <= CURTAIN_EXIT : top <= CURTAIN_ENTER;
}

export function cancelCurtainDown() {
  activeCurtainDownCancel?.();
  activeCurtainDownCancel = null;
}

export function isCurtainDownRunning(): boolean {
  return activeCurtainDownCancel !== null;
}

export function snapSlightRevealToHome(reveal: HTMLElement): () => void {
  const top = reveal.getBoundingClientRect().top;
  if (top <= 0 || top > CURTAIN_EXIT) {
    return noop;
  }

  cancelCurtainDown();

  const startY = window.scrollY;
  if (startY <= 0) {
    return noop;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, 0);
    return noop;
  }

  const ratio = Math.min(1, startY / CURTAIN_EXIT);
  const duration = Math.round(
    CURTAIN_DOWN_DURATION_MIN +
      ratio * (CURTAIN_DOWN_DURATION_MAX - CURTAIN_DOWN_DURATION_MIN),
  );

  const startTime = performance.now();
  let rafId = 0;
  let cancelled = false;

  const cancel = () => {
    if (cancelled) {
      return;
    }
    cancelled = true;
    cancelAnimationFrame(rafId);
    if (activeCurtainDownCancel === cancel) {
      activeCurtainDownCancel = null;
    }
  };

  const tick = (now: number) => {
    if (cancelled) {
      return;
    }

    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const eased = CURTAIN_DOWN_EASE(progress);
    window.scrollTo(0, startY * (1 - eased));

    if (progress < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      activeCurtainDownCancel = null;
    }
  };

  activeCurtainDownCancel = cancel;
  rafId = requestAnimationFrame(tick);
  return cancel;
}

function noop() {}

function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number) {
  const ax = 3 * p1x - 3 * p2x + 1;
  const bx = 3 * p2x - 6 * p1x;
  const cx = 3 * p1x;
  const ay = 3 * p1y - 3 * p2y + 1;
  const by = 3 * p2y - 6 * p1y;
  const cy = 3 * p1y;

  const sampleCurveX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleCurveY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleCurveDerivativeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const currentX = sampleCurveX(t) - x;
      if (Math.abs(currentX) < 1e-7) {
        return sampleCurveY(t);
      }
      const slope = sampleCurveDerivativeX(t);
      if (Math.abs(slope) < 1e-6) {
        break;
      }
      t -= currentX / slope;
    }

    let t0 = 0;
    let t1 = 1;
    t = x;
    while (t0 < t1) {
      const currentX = sampleCurveX(t);
      if (Math.abs(currentX - x) < 1e-7) {
        return sampleCurveY(t);
      }
      if (x > currentX) {
        t0 = t;
      } else {
        t1 = t;
      }
      t = (t0 + t1) / 2;
    }

    return sampleCurveY(t);
  };
}
