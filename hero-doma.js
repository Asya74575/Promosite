// Hero: the panel-wall poster tears open (CSS clip-path on --tear) to reveal the can + bag as the real heroes.
// No WebGL here — real product photography (client's own, cut to alpha) on a CSS 3D-ish parallax, driven by
// the same scroll progress that drives the tear. Follows the starter's setProgress(p) scene contract loosely.
export function createHero({ root, reducedMotion = false }) {
  const can = root.querySelector(".hero__can");
  const bag = root.querySelector(".hero__bag");
  const tag = root.querySelector(".hero__tag");
  const smooth = (t) => t * t * (3 - 2 * t);

  function setProgress(p) {
    const tear = Math.min(1, Math.max(0, p));
    root.style.setProperty("--tear", tear.toFixed(4));
    // Products and the tag finish arriving well before the tear itself completes, so they read as already
    // "held" through the last stretch of scroll rather than still moving when the wall is fully open.
    const r = smooth(Math.min(1, tear / 0.55));
    if (can) {
      can.style.opacity = r.toFixed(3);
      can.style.transform = `translate(${-108 + (1 - r) * -6}%, ${(1 - r) * 10}%) rotate(${-4 + (1 - r) * -10}deg)`;
    }
    if (bag) {
      bag.style.opacity = r.toFixed(3);
      bag.style.transform = `translate(${-4 + (1 - r) * 6}%, ${4 + (1 - r) * 10}%) rotate(${3 + (1 - r) * 8}deg)`;
    }
    if (tag) tag.style.opacity = (1 - Math.min(1, tear / 0.4)).toFixed(3);
  }

  if (reducedMotion) {
    root.style.setProperty("--tear", "1");
    if (can) { can.style.opacity = "1"; can.style.transform = "translate(-108%, 0) rotate(-4deg)"; }
    if (bag) { bag.style.opacity = "1"; bag.style.transform = "translate(-4%, 4%) rotate(3deg)"; }
    if (tag) tag.style.opacity = "0";
  } else {
    setProgress(0);
  }

  return { setProgress };
}
