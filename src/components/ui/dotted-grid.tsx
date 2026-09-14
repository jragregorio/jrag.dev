import { useEffect, useRef } from "react";

import { createSuspendedRaf } from "@/lib/createSuspendedRaf";
import { cn } from "@/lib/utils";

const DEFAULT_SPACING = 24;
const DEFAULT_BASE_RADIUS = 7.2;
const DEFAULT_MOUSE_RADIUS = 380;
const DEFAULT_TRAIL_LENGTH = 456;
const DEFAULT_TRAIL_RADIUS = 230;
const DEFAULT_TRAIL_FADE_MS = 1200;
const BACKGROUND = "#111110";

const RANDOM_TIME = 0.6;
const COLLECT_TIME = 1.1;
const LETTERS = ["J", "R", "A", "G"] as const;
const FORM_COUNT = LETTERS.length + 1;
const FULL_FORM = LETTERS.length;
const COMPACT_MAX = 720;

function isCompact(width: number) {
  return width < COMPACT_MAX;
}

function paintLetter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  letter: string,
) {
  const compact = isCompact(width);
  const fontSize = compact
    ? Math.min(width * 0.5, height * 0.24)
    : Math.min(width * 0.42, height * 0.42);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  ctx.font = `500 ${fontSize}px "IBM Plex Sans"`;
  const cy = height * 0.46;
  ctx.fillText(letter, width / 2, cy);
  if (!compact) {
    ctx.lineWidth = Math.max(3, fontSize * 0.08);
    ctx.strokeText(letter, width / 2, cy);
  }
}

function paintForm(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  formIndex: number,
) {
  if (formIndex === FULL_FORM) {
    paintJrag(ctx, width, height);
    return;
  }
  paintLetter(ctx, width, height, LETTERS[formIndex]);
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const smoothstep = (e0: number, e1: number, v: number): number => {
  const t = clamp01((v - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

interface Dot {
  x: number;
  y: number;
  phase: number;
  speed: number;
  randomOffset: number;
  currentShapeStrength: number;
  currentRandomStrength: number;
  currentMouseStrength: number;
  currentTrailStrength: number;
  currentGrayDisperseStrength: number;
}

export interface DottedGridProps {
  spacing?: number;
  baseRadius?: number;
  mouseRadius?: number;
  trailLength?: number;
  trailRadius?: number;
  trailFadeMs?: number;
  backgroundColor?: string;
  className?: string;
}

function paintJrag(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const compact = isCompact(width);
  let fontSize = compact
    ? Math.min(width * 0.34, height * 0.16)
    : Math.min(width * 0.24, height * 0.3);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";

  const layout = (size: number) => {
    ctx.font = `500 ${size}px "IBM Plex Sans"`;
    ctx.lineWidth = compact ? 0 : Math.max(3, size * 0.08);
    const gap = size * (compact ? 0.04 : 0.1);
    const widths = LETTERS.map((letter) => ctx.measureText(letter).width);
    const total = widths.reduce((sum, value) => sum + value, 0) + gap * 3;
    return { gap, widths, total };
  };

  let metrics = layout(fontSize);
  const maxWidth = width * (compact ? 0.92 : 0.78);
  if (metrics.total > maxWidth) {
    fontSize *= maxWidth / metrics.total;
    metrics = layout(fontSize);
  }

  const cy = height * 0.46;
  let x = (width - metrics.total) / 2;
  for (let i = 0; i < LETTERS.length; i += 1) {
    ctx.fillText(LETTERS[i], x, cy);
    if (!compact) {
      ctx.strokeText(LETTERS[i], x, cy);
    }
    x += metrics.widths[i] + metrics.gap;
  }
}

function sampleMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  scale: number,
  dilate: number,
): number {
  let maxA = 0;
  const sx = x * scale;
  const sy = y * scale;
  const x0 = Math.floor(sx) - dilate;
  const y0 = Math.floor(sy) - dilate;
  for (let oy = 0; oy <= dilate * 2; oy += 1) {
    for (let ox = 0; ox <= dilate * 2; ox += 1) {
      const ix = x0 + ox;
      const iy = y0 + oy;
      if (ix < 0 || iy < 0 || ix >= width || iy >= height) continue;
      maxA = Math.max(maxA, data[(iy * width + ix) * 4 + 3]);
    }
  }
  const t = maxA / 255;
  return dilate === 0 ? smoothstep(0.22, 0.58, t) : t;
}

function DottedGrid({
  spacing = DEFAULT_SPACING,
  baseRadius = DEFAULT_BASE_RADIUS,
  mouseRadius = DEFAULT_MOUSE_RADIUS,
  trailLength = DEFAULT_TRAIL_LENGTH,
  trailRadius = DEFAULT_TRAIL_RADIUS,
  trailFadeMs = DEFAULT_TRAIL_FADE_MS,
  backgroundColor = BACKGROUND,
  className = "",
}: DottedGridProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const patternRef = useRef<{
    currentFormIndex: number;
    transitionStartTime: number | null;
  }>({
    currentFormIndex: FULL_FORM,
    transitionStartTime: null,
  });
  const mouseRef = useRef<{
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    active: boolean;
    trail: { x: number; y: number; t: number }[];
  }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    active: false,
    trail: [],
  });

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) {
      return;
    }

    const host = root.parentElement ?? root;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      return;
    }

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let gridSpacing = spacing;
    let gridRadius = baseRadius;
    let maskScale = 1;
    let maskDilate = 1;
    let dots: Dot[] = [];
    let masks: ImageData[] = [];
    let reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const reduceMotionMq = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    );

    const handleReduceMotionChange = (event: MediaQueryListEvent) => {
      reduceMotion = event.matches;
      if (reduceMotion) {
        mouseRef.current.active = false;
        mouseRef.current.trail = [];
        patternRef.current.transitionStartTime = null;
      }
    };

    const createDots = () => {
      dots = [];
      for (let y = gridSpacing / 2; y < height; y += gridSpacing) {
        for (let x = gridSpacing / 2; x < width; x += gridSpacing) {
          dots.push({
            x,
            y,
            phase: Math.random() * Math.PI * 2,
            speed: 0.3 + Math.random() * 1.0,
            randomOffset: Math.random() * 10,
            currentShapeStrength: 0,
            currentRandomStrength: 1,
            currentMouseStrength: 0,
            currentTrailStrength: 0,
            currentGrayDisperseStrength: 0,
          });
        }
      }
    };

    const rebuildMask = () => {
      if (!width || !height) {
        masks = [];
        return;
      }
      const offscreen = document.createElement("canvas");
      offscreen.width = Math.max(1, Math.floor(width * maskScale));
      offscreen.height = Math.max(1, Math.floor(height * maskScale));
      const maskCtx = offscreen.getContext("2d");
      if (!maskCtx) {
        masks = [];
        return;
      }
      masks = [];
      for (let form = 0; form < FORM_COUNT; form += 1) {
        maskCtx.setTransform(maskScale, 0, 0, maskScale, 0, 0);
        maskCtx.clearRect(0, 0, width, height);
        paintForm(maskCtx, width, height, form);
        maskCtx.setTransform(1, 0, 0, 1, 0, 0);
        masks.push(
          maskCtx.getImageData(0, 0, offscreen.width, offscreen.height),
        );
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const compact = isCompact(width);
      gridSpacing = compact ? 10 : spacing;
      gridRadius = compact ? 3.05 : baseRadius;
      maskScale = compact ? 2 : 1;
      maskDilate = compact ? 0 : 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createDots();
      rebuildMask();
    };

    const getFormStrength = (formIndex: number, x: number, y: number): number => {
      const mask = masks[formIndex];
      if (!mask) return 0;
      return sampleMask(
        mask.data,
        mask.width,
        mask.height,
        x,
        y,
        maskScale,
        maskDilate,
      );
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      mouseRef.current.targetX = x;
      mouseRef.current.targetY = y;
      mouseRef.current.active = true;
      mouseRef.current.trail.push({ x, y, t: performance.now() });

      if (mouseRef.current.trail.length > trailLength) {
        mouseRef.current.trail.shift();
      }
    };

    const handlePointerLeave = () => {
      mouseRef.current.active = false;
    };

    const handleClick = (event: MouseEvent) => {
      if ((event.target as HTMLElement | null)?.closest("a, button")) {
        return;
      }
      patternRef.current.currentFormIndex =
        (patternRef.current.currentFormIndex + 1) % FORM_COUNT;
      patternRef.current.transitionStartTime = reduceMotion
        ? null
        : performance.now() * 0.001;
    };

    const getShapeData = (x: number, y: number, time: number) => {
      const shapeStrength = getFormStrength(
        patternRef.current.currentFormIndex,
        x,
        y,
      );
      const { transitionStartTime } = patternRef.current;

      if (transitionStartTime === null) {
        return { shapeStrength, randomStrength: 0, grayDisperseStrength: 0 };
      }

      const cyclePosition = time - transitionStartTime;

      if (cyclePosition < RANDOM_TIME) {
        return { shapeStrength: 0, randomStrength: 1, grayDisperseStrength: 0.35 };
      }

      if (cyclePosition < RANDOM_TIME + COLLECT_TIME) {
        const eased = smoothstep(
          0,
          1,
          (cyclePosition - RANDOM_TIME) / COLLECT_TIME,
        );
        return {
          shapeStrength: shapeStrength * eased,
          randomStrength: 1 - eased,
          grayDisperseStrength: 0.35 * (1 - eased),
        };
      }

      patternRef.current.transitionStartTime = null;
      return { shapeStrength, randomStrength: 0, grayDisperseStrength: 0 };
    };

    const drawDot = (
      x: number,
      y: number,
      radius: number,
      brightness: number,
      grayDisperseStrength: number,
      trailStrength: number,
      mouseStrength: number,
    ) => {
      const mouseFade = mouseStrength * mouseStrength * 0.72;
      const trailFade = trailStrength * 0.38;
      const alpha = clamp01(0.16 + brightness * 0.84 - mouseFade - trailFade);

      const normalL = 10 + brightness * 86;
      const disperseL = 12 + brightness * 58 + grayDisperseStrength * 22;
      const lightness = lerp(normalL, disperseL, grayDisperseStrength);

      const mouseLift = mouseStrength * (1 - mouseStrength) * 18;
      const mouseDark = mouseStrength * mouseStrength * 38;
      const trailLift = trailStrength * 38 * (1 - trailStrength * 0.55);

      const finalLightness =
        clamp01((lightness - mouseDark + mouseLift + trailLift) / 100) * 100;
      const saturation = trailStrength * trailStrength * 8;

      ctx.beginPath();
      ctx.fillStyle = `hsla(40, ${saturation}%, ${finalLightness}%, ${alpha})`;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    };

    const loop = createSuspendedRaf({
      root: canvas,
      onFrame: (ms) => {
        const time = ms * 0.001;
        const mouse = mouseRef.current;
        const now = performance.now();

        mouse.x = lerp(mouse.x, mouse.targetX, 0.12);
        mouse.y = lerp(mouse.y, mouse.targetY, 0.12);

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        for (const dot of dots) {
          if (reduceMotion) {
            const shapeStrength = getFormStrength(
              patternRef.current.currentFormIndex,
              dot.x,
              dot.y,
            );
            const brightness = clamp01(0.1 + shapeStrength * 0.9);
            const radius = gridRadius + shapeStrength * 1.15;
            drawDot(dot.x, dot.y, radius, brightness, 0, 0, 0);
            continue;
          }

          const { shapeStrength, randomStrength, grayDisperseStrength } =
            getShapeData(dot.x, dot.y, time);

          dot.currentShapeStrength = lerp(
            dot.currentShapeStrength,
            shapeStrength,
            0.12,
          );
          dot.currentRandomStrength = lerp(
            dot.currentRandomStrength,
            randomStrength,
            0.14,
          );
          dot.currentGrayDisperseStrength = lerp(
            dot.currentGrayDisperseStrength,
            grayDisperseStrength,
            0.14,
          );

          let targetMouseStrength = 0;
          if (mouse.active) {
            const dx = dot.x - mouse.x;
            const dy = dot.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < mouseRadius) {
              const norm = dist / mouseRadius;
              targetMouseStrength = (1 - norm) * (1 - norm) * (1 - norm);
            }
          }
          dot.currentMouseStrength = lerp(
            dot.currentMouseStrength,
            targetMouseStrength,
            0.12,
          );

          let targetTrailStrength = 0;
          for (let i = 0; i < mouse.trail.length; i += 1) {
            const pt = mouse.trail[i];
            const age = (now - pt.t) / trailFadeMs;
            if (age >= 1) continue;

            const ageFade = (1 - age) * (1 - age) * (1 - age);
            const positionFade = (i + 1) / mouse.trail.length;
            const fade = ageFade * positionFade;

            const dx = dot.x - pt.x;
            const dy = dot.y - pt.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < trailRadius) {
              const proximity = 1 - smoothstep(0, 1, dist / trailRadius);
              const softProximity = proximity * proximity * proximity;
              targetTrailStrength = Math.max(
                targetTrailStrength,
                softProximity * fade,
              );
            }
          }
          dot.currentTrailStrength = lerp(
            dot.currentTrailStrength,
            targetTrailStrength,
            0.08,
          );

          const randomBlink =
            Math.sin(
              time * (1.2 + dot.speed * 1.2) +
                dot.phase +
                dot.randomOffset +
                dot.x * 0.02 +
                dot.y * 0.016,
            ) ** 2;

          const softPulse =
            Math.sin(time * 1.4 + dot.phase + dot.x * 0.015) ** 2;

          const stableBrightness = clamp01(
            0.08 + dot.currentShapeStrength * 0.92 + softPulse * 0.015,
          );
          const randomBrightness = clamp01(0.08 + randomBlink * 0.16);
          const brightness = lerp(
            stableBrightness,
            randomBrightness,
            dot.currentRandomStrength,
          );

          const grayDisperseBlink = clamp01(
            dot.currentGrayDisperseStrength * (0.45 + randomBlink * 0.55),
          );

          const mouseShrink = 1 - dot.currentMouseStrength * 0.75;
          const trailShrink = 1 - dot.currentTrailStrength * 0.65;

          const stableRadius = gridRadius + dot.currentShapeStrength * 1.15;
          const randomRadius = gridRadius + randomBlink * 0.28;
          const radius =
            lerp(stableRadius, randomRadius, dot.currentRandomStrength) *
            mouseShrink *
            trailShrink;

          drawDot(
            dot.x,
            dot.y,
            radius,
            brightness,
            grayDisperseBlink,
            dot.currentTrailStrength,
            dot.currentMouseStrength,
          );
        }
      },
    });

    resize();
    void document.fonts.ready.then(() => {
      rebuildMask();
    });

    window.addEventListener("resize", resize);
    reduceMotionMq?.addEventListener?.("change", handleReduceMotionChange);
    host.addEventListener("pointermove", handlePointerMove);
    host.addEventListener("pointerleave", handlePointerLeave);
    host.addEventListener("pointercancel", handlePointerLeave);
    host.addEventListener("click", handleClick);
    loop.start();

    return () => {
      window.removeEventListener("resize", resize);
      reduceMotionMq?.removeEventListener?.("change", handleReduceMotionChange);
      host.removeEventListener("pointermove", handlePointerMove);
      host.removeEventListener("pointerleave", handlePointerLeave);
      host.removeEventListener("pointercancel", handlePointerLeave);
      host.removeEventListener("click", handleClick);
      loop.destroy();
    };
  }, [
    baseRadius,
    backgroundColor,
    mouseRadius,
    spacing,
    trailFadeMs,
    trailLength,
    trailRadius,
  ]);

  return (
    <div
      ref={rootRef}
      className={cn("dotted-grid", className)}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="dotted-grid__canvas" />
    </div>
  );
}

export { DottedGrid };
export default DottedGrid;
