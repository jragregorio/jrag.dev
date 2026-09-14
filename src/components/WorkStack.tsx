import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export interface WorkStackItem {
  id: string;
  title: string;
  description: string;
  href: string;
  image: string;
  imageClassName?: string;
  isPrivate?: boolean;
}

export interface WorkStackProps {
  items: WorkStackItem[];
  headingId?: string;
}

const PARALLAX_X = 40;
const PARALLAX_Y = 28;

function hasExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function useParallaxEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => {
      setEnabled(finePointer.matches && !reducedMotion.matches);
    };

    sync();
    finePointer.addEventListener("change", sync);
    reducedMotion.addEventListener("change", sync);

    return () => {
      finePointer.removeEventListener("change", sync);
      reducedMotion.removeEventListener("change", sync);
    };
  }, []);

  return enabled;
}

interface WorkMediaProps {
  image: string;
  imageClassName?: string;
}

function WorkMedia({ image, imageClassName }: WorkMediaProps) {
  const parallaxEnabled = useParallaxEnabled();
  const mediaRef = useRef<HTMLDivElement>(null);
  const moveRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);

  const applyTransform = (nx: number, ny: number) => {
    const move = moveRef.current;
    if (!move) return;

    move.style.setProperty("--parallax-x", `${nx * PARALLAX_X}px`);
    move.style.setProperty("--parallax-y", `${ny * PARALLAX_Y}px`);
  };

  const resetTransform = () => {
    const move = moveRef.current;
    if (!move) return;

    move.style.setProperty("--parallax-x", "0px");
    move.style.setProperty("--parallax-y", "0px");
  };

  const flushPending = () => {
    rafRef.current = null;
    const pending = pendingRef.current;
    if (!pending) return;
    applyTransform(pending.x, pending.y);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const media = mediaRef.current;
    if (!media) return;

    const rect = media.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const nx = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    const ny = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);

    pendingRef.current = { x: nx, y: ny };
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(flushPending);
    }
  };

  const handlePointerLeave = () => {
    pendingRef.current = null;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    resetTransform();
  };

  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={mediaRef}
      className="work-stack__media"
      onPointerMove={parallaxEnabled ? handlePointerMove : undefined}
      onPointerLeave={parallaxEnabled ? handlePointerLeave : undefined}
    >
      <div ref={moveRef} className="work-stack__media-move">
        <img
          src={image}
          alt=""
          className={cn(
            "work-stack__image",
            imageClassName ?? "object-center",
          )}
        />
      </div>
    </div>
  );
}

export function WorkStack({
  items,
  headingId = "work-heading",
}: WorkStackProps) {
  return (
    <section className="work-stack" aria-labelledby={headingId}>
      <header className="work-stack__header">
        <h2 id={headingId} className="work-stack__heading">
          Selected work
        </h2>
      </header>

      <div className="work-stack__panels">
        {items.map((item) => {
          const canOpen = !item.isPrivate && hasExternalHref(item.href);

          return (
            <article
              key={item.id}
              className="work-stack__panel"
              aria-labelledby={`${item.id}-title`}
            >
              <div className="work-stack__panel-inner">
                <div className="work-stack__copy">
                  <h3 id={`${item.id}-title`} className="work-stack__title">
                    {item.title}
                  </h3>
                  <p className="work-stack__description">{item.description}</p>
                  {canOpen ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="work-stack__link"
                    >
                      Open →
                    </a>
                  ) : item.isPrivate ? (
                    <span className="work-stack__status">Private</span>
                  ) : null}
                </div>

                <WorkMedia
                  image={item.image}
                  imageClassName={item.imageClassName}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
