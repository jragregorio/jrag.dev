import { useEffect, useRef, useState } from "react";

import { isWorkUnlocked } from "@/lib/curtain";

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const unlockedRef = useRef(false);

  useEffect(() => {
    const update = () => {
      const reveal = document.getElementById("work");
      const unlocked = !!reveal &&
        isWorkUnlocked(reveal.getBoundingClientRect().top, unlockedRef.current);
      unlockedRef.current = unlocked;
      setIsRevealed(unlocked);
      setIsScrolled(window.scrollY > 10);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("hashchange", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("hashchange", update);
    };
  }, []);

  return (
    <header
      className={`site-header${isScrolled ? " is-scrolled" : ""}${isRevealed ? " is-revealed" : ""}`}
      aria-hidden={!isRevealed}
      inert={!isRevealed || undefined}
    >
      <nav className="site-header__nav" aria-label="Primary">
        <a className="site-header__name" href="#">
          JRAG
        </a>
        <ul className="site-header__links">
          <li>
            <a
              href="#work"
              onClick={(event) => {
                event.preventDefault();
                document.getElementById("work")?.scrollIntoView({
                  behavior: "smooth",
                });
                const inner = document.querySelector(".page-reveal__inner");
                if (inner instanceof HTMLElement) {
                  inner.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
            >
              Work
            </a>
          </li>
          <li>
            <a
              href="#contact"
              onClick={(event) => {
                event.preventDefault();
                document.getElementById("work")?.scrollIntoView({
                  behavior: "smooth",
                });
                const inner = document.querySelector(".page-reveal__inner");
                const contact = document.getElementById("contact");
                if (!(inner instanceof HTMLElement) || !contact) {
                  return;
                }
                const top =
                  contact.getBoundingClientRect().top -
                  inner.getBoundingClientRect().top +
                  inner.scrollTop -
                  24;
                inner.scrollTo({ top, behavior: "smooth" });
              }}
            >
              Contact
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
