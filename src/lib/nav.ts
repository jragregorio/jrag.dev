function getPageRevealInner(): HTMLElement | null {
  const inner = document.querySelector(".page-reveal__inner");
  return inner instanceof HTMLElement ? inner : null;
}

export function scrollToHome(): void {
  window.scrollTo({ top: 0, behavior: "smooth" });
  getPageRevealInner()?.scrollTo({ top: 0, behavior: "smooth" });
}

export function scrollToWork(): void {
  document.getElementById("work")?.scrollIntoView({ behavior: "smooth" });
  getPageRevealInner()?.scrollTo({ top: 0, behavior: "smooth" });
}

function scrollInnerToContact(inner: HTMLElement): void {
  const contact = document.getElementById("contact");
  if (!contact) {
    return;
  }
  const top =
    contact.getBoundingClientRect().top -
    inner.getBoundingClientRect().top +
    inner.scrollTop -
    24;
  inner.scrollTo({ top, behavior: "smooth" });
}

function scrollInnerToContactAfterLayout(inner: HTMLElement): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scrollInnerToContact(inner);
    });
  });
}

function waitForRevealThenScrollContact(inner: HTMLElement): void {
  let observer: MutationObserver | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const cleanup = () => {
    observer?.disconnect();
    observer = null;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const onRevealed = () => {
    cleanup();
    scrollInnerToContactAfterLayout(inner);
  };

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "class" &&
        inner.classList.contains("is-revealed")
      ) {
        onRevealed();
        return;
      }
    }
  });

  observer.observe(inner, { attributes: true, attributeFilter: ["class"] });

  if (inner.classList.contains("is-revealed")) {
    onRevealed();
    return;
  }

  timeoutId = setTimeout(() => {
    cleanup();
    scrollInnerToContact(inner);
  }, 2000);
}

export function scrollToContact(): void {
  document.getElementById("work")?.scrollIntoView({ behavior: "smooth" });
  const inner = getPageRevealInner();
  if (!inner) {
    return;
  }

  if (inner.classList.contains("is-revealed")) {
    scrollInnerToContact(inner);
  } else {
    waitForRevealThenScrollContact(inner);
  }
}
