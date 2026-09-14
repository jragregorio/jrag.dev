import { useEffect, useId, useRef } from "react";

export function DottedGrid() {
  const rootRef = useRef<HTMLDivElement>(null);
  const patternId = `intro-dots-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const host = root.parentElement;
    if (!host) {
      return;
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") {
        return;
      }
      const rect = root.getBoundingClientRect();
      root.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
      root.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
      root.style.setProperty("--spot-opacity", "1");
    };

    const onLeave = () => {
      root.style.setProperty("--spot-opacity", "0");
    };

    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointercancel", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointercancel", onLeave);
    };
  }, []);

  return (
    <div className="dotted-grid" ref={rootRef} aria-hidden="true">
      <svg className="dotted-grid__dots" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id={patternId}
            width="22"
            height="22"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="11" cy="11" r="5" fill="#3a3936" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
      <div className="dotted-grid__spot" />
    </div>
  );
}
