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

const HOVER_ZOOM = 1.2;
const LIVE_WIDTH = 1440;
const LIVE_HEIGHT = 810;

function hasExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function canShowLivePreview(href: string | undefined, isPrivate?: boolean): boolean {
  return !isPrivate && !!href && hasExternalHref(href);
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

function useDesktopViewport(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(desktop.matches);
    sync();
    desktop.addEventListener("change", sync);
    return () => desktop.removeEventListener("change", sync);
  }, []);

  return isDesktop;
}

function useNearViewport(ref: React.RefObject<HTMLElement | null>): boolean {
  const [near, setNear] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
        }
      },
      { rootMargin: "200px 0px", threshold: 0 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return near;
}

interface WorkMediaProps {
  image: string;
  imageClassName?: string;
  href?: string;
  isPrivate?: boolean;
}

function WorkMedia({ image, imageClassName, href, isPrivate }: WorkMediaProps) {
  const parallaxEnabled = useParallaxEnabled();
  const isDesktop = useDesktopViewport();
  const mediaRef = useRef<HTMLDivElement>(null);
  const moveRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);
  const [liveFailed, setLiveFailed] = useState(false);
  const nearViewport = useNearViewport(mediaRef);

  const liveEligible = canShowLivePreview(href, isPrivate);
  const showLive = liveEligible && isDesktop && nearViewport && !liveFailed;

  const applyTransform = (nx: number, ny: number, zoom = HOVER_ZOOM) => {
    const move = moveRef.current;
    const media = mediaRef.current;
    if (!move || !media) return;

    const { width: mediaWidth, height: mediaHeight } =
      media.getBoundingClientRect();
    if (mediaWidth === 0 || mediaHeight === 0) return;

    const maxX = (mediaWidth * (zoom - 1)) / 2;
    const maxY = (mediaHeight * (zoom - 1)) / 2;

    move.style.setProperty("--zoom", String(zoom));
    move.style.setProperty("--pan-x", `${-nx * maxX}px`);
    move.style.setProperty("--pan-y", `${-ny * maxY}px`);
  };

  const resetTransform = () => {
    const move = moveRef.current;
    if (!move) return;

    move.style.setProperty("--zoom", "1");
    move.style.setProperty("--pan-x", "0px");
    move.style.setProperty("--pan-y", "0px");
  };

  const flushPending = () => {
    rafRef.current = null;
    const pending = pendingRef.current;
    if (!pending) return;
    applyTransform(pending.x, pending.y);
  };

  const pointerNormFromEvent = (event: React.PointerEvent<HTMLDivElement>) => {
    const media = mediaRef.current;
    if (!media) return null;

    const rect = media.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
      y: clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1),
    };
  };

  const queueTransform = (nx: number, ny: number) => {
    pendingRef.current = { x: nx, y: ny };
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(flushPending);
    }
  };

  const handlePointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
    const norm = pointerNormFromEvent(event);
    if (!norm) return;
    queueTransform(norm.x, norm.y);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const norm = pointerNormFromEvent(event);
    if (!norm) return;
    queueTransform(norm.x, norm.y);
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

  useEffect(() => {
    const media = mediaRef.current;
    const scale = scaleRef.current;
    if (!media || !scale || !showLive) return;

    const updateScale = () => {
      const width = media.getBoundingClientRect().width;
      scale.style.setProperty("--live-scale", String(width / LIVE_WIDTH));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(media);
    return () => observer.disconnect();
  }, [showLive]);

  return (
    <div
      ref={mediaRef}
      className="work-stack__media"
      onPointerEnter={parallaxEnabled ? handlePointerEnter : undefined}
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
        {showLive && href ? (
          <div ref={scaleRef} className="work-stack__live-scale">
            <iframe
              src={href}
              className="work-stack__live"
              width={LIVE_WIDTH}
              height={LIVE_HEIGHT}
              loading="lazy"
              tabIndex={-1}
              aria-hidden="true"
              title=""
              referrerPolicy="no-referrer"
              onError={() => setLiveFailed(true)}
            />
          </div>
        ) : null}
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
                  href={item.href}
                  isPrivate={item.isPrivate}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
