const CURTAIN_ENTER = 2;
const CURTAIN_EXIT = 80;

export function isWorkUnlocked(top: number, currentlyUnlocked: boolean) {
  return currentlyUnlocked ? top <= CURTAIN_EXIT : top <= CURTAIN_ENTER;
}

export function snapWorkIntoView(reveal: HTMLElement) {
  const top = reveal.getBoundingClientRect().top;
  if (top <= 0 || top > CURTAIN_EXIT) {
    return;
  }
  window.scrollTo({
    top: window.scrollY + top,
    behavior: "instant",
  });
}
