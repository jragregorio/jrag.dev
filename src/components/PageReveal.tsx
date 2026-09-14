import { useEffect, useRef, useState, type ReactNode } from "react";

import { isWorkUnlocked, snapWorkIntoView } from "@/lib/curtain";

const AXIS_LOCK_PX = 12;

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
      if (!unlockedRef.current || inner.scrollTop > 0 || event.deltaY >= 0) {
        return;
      }
      event.preventDefault();
      window.scrollBy(0, event.deltaY);
    };

    const onTouchStart = (event: TouchEvent) => {
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
      window.scrollBy(0, -step);
    };

    const onTouchEnd = () => {
      if (unlockedRef.current) {
        snapWorkIntoView(reveal);
      }
      gesture.current.axis = "pending";
    };

    const onInnerScroll = () => {
      if (!unlockedRef.current) {
        inner.scrollTop = 0;
      }
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    inner.addEventListener("scroll", onInnerScroll, { passive: true });
    inner.addEventListener("wheel", onWheel, { passive: false });
    inner.addEventListener("touchstart", onTouchStart, { passive: true });
    inner.addEventListener("touchmove", onTouchMove, { passive: false });
    inner.addEventListener("touchend", onTouchEnd);
    inner.addEventListener("touchcancel", onTouchEnd);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      inner.removeEventListener("scroll", onInnerScroll);
      inner.removeEventListener("wheel", onWheel);
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
