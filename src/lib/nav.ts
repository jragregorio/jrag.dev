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

export function scrollToContact(): void {
  document.getElementById("work")?.scrollIntoView({ behavior: "smooth" });
  const inner = getPageRevealInner();
  const contact = document.getElementById("contact");
  if (!inner || !contact) {
    return;
  }
  const top =
    contact.getBoundingClientRect().top -
    inner.getBoundingClientRect().top +
    inner.scrollTop -
    24;
  inner.scrollTo({ top, behavior: "smooth" });
}
