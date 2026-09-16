import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  cancelCurtainDown,
  isCurtainDownRunning,
  isWorkUnlocked,
  snapSlightRevealToHome,
} from "@/lib/curtain";

const AXIS_LOCK_PX = 12;
const WHEEL_SETTLE_MS = 125;

type GestureAxis = "pending" | "x" | "y";

export function PageReveal({ children }: { children: ReactNode }) {
  const revealRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const unlockedRef = useRef(false);
  const gesture = useRef({
    x: 0,
    y: 0,
    lastY: 0,
    axis: "pending" as GestureAxis,
  });
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const reveal = revealRef.current;
    const inner = innerRef.current;
    if (!reveal || !inner) {
      return;
    }

    let wheelSettleTimer: ReturnType<typeof setTimeout> | null = null;
    let peekedTowardHome = false;

    const maybeSnapToHome = () => {
      if (isCurtainDownRunning()) {
        return;
      }

      if (!unlockedRef.current || inner.scrollTop !== 0) {
        peekedTowardHome = false;
        return;
      }

      if (!peekedTowardHome) {
        return;
      }

      snapSlightRevealToHome(reveal);
      peekedTowardHome = false;
    };

    const scheduleSnapToHome = () => {
      if (wheelSettleTimer !== null) {
        clearTimeout(wheelSettleTimer);
      }
      wheelSettleTimer = setTimeout(() => {
        wheelSettleTimer = null;
        maybeSnapToHome();
      }, WHEEL_SETTLE_MS);
    };

    const update = () => {
      const unlocked = isWorkUnlocked(
        reveal.getBoundingClientRect().top,
        unlockedRef.current,
      );
      unlockedRef.current = unlocked;
      setIsRevealed((current) => (current === unlocked ? current : unlocked));
      if (!unlocked) {
        inner.scrollTop = 0;
      }
    };

    const onWheel = (event: WheelEvent) => {
      cancelCurtainDown();
      if (!unlockedRef.current || inner.scrollTop > 0 || event.deltaY >= 0) {
        return;
      }
      event.preventDefault();
      peekedTowardHome = true;
      window.scrollBy(0, event.deltaY);
      scheduleSnapToHome();
    };

    const onScrollEnd = () => {
      maybeSnapToHome();
    };

    const onTouchStart = (event: TouchEvent) => {
      cancelCurtainDown();
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      gesture.current = {
        x: touch.clientX,
        y: touch.clientY,
        lastY: touch.clientY,
        axis: "pending",
      };
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!unlockedRef.current || inner.scrollTop > 0) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      const dx = touch.clientX - gesture.current.x;
      const dy = touch.clientY - gesture.current.y;

      if (gesture.current.axis === "pending") {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK_PX) {
          return;
        }
        gesture.current.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }

      if (gesture.current.axis !== "y") {
        return;
      }

      const step = touch.clientY - gesture.current.lastY;
      gesture.current.lastY = touch.clientY;
      if (step <= 0) {
        return;
      }

      event.preventDefault();
      peekedTowardHome = true;
      window.scrollBy(0, -step);
    };

    const onTouchEnd = () => {
      maybeSnapToHome();
      gesture.current.axis = "pending";
    };

    const onInnerScroll = () => {
      if (!unlockedRef.current) {
        inner.scrollTop = 0;
      }
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    if ("onscrollend" in window) {
      window.addEventListener("scrollend", onScrollEnd);
    }
    window.addEventListener("resize", update);
    inner.addEventListener("scroll", onInnerScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    inner.addEventListener("touchstart", onTouchStart, { passive: true });
    inner.addEventListener("touchmove", onTouchMove, { passive: false });
    inner.addEventListener("touchend", onTouchEnd);
    inner.addEventListener("touchcancel", onTouchEnd);

    return () => {
      cancelCurtainDown();
      if (wheelSettleTimer !== null) {
        clearTimeout(wheelSettleTimer);
      }
      window.removeEventListener("scroll", update);
      if ("onscrollend" in window) {
        window.removeEventListener("scrollend", onScrollEnd);
      }
      window.removeEventListener("resize", update);
      inner.removeEventListener("scroll", onInnerScroll);
      window.removeEventListener("wheel", onWheel, { capture: true });
      inner.removeEventListener("touchstart", onTouchStart);
      inner.removeEventListener("touchmove", onTouchMove);
      inner.removeEventListener("touchend", onTouchEnd);
      inner.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return (
    <div
      ref={revealRef}
      className="page-reveal"
      id="work"
      style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
    >
      <div
        ref={innerRef}
        className={`page-reveal__inner${isRevealed ? " is-revealed" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
