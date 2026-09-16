/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/utils/chatTitleAnimation.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */

/** Frame generator taken directly from the title-animation playground. */
var CHAT_TITLE_ANIMATION = {
  duration: 600,
  interval: 50,
  hold: 0,
  settle: 16,
  length: "gradual",
  direction: "left",
  alphabet: "letters",
  motion: "shuffle",
  preserve: true,
  spaces: true,
  easing: "linear",
  fontSize: 11,
  mono: false
};
var ALPHABETS = {
  letters: "abcdefghijklmnopqrstuvwxyz",
  mixed: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!<>-_[]{}+=*?#"
};
var clamp = value => Math.max(0, Math.min(1, value));
var noise = (index, step, seed) => {
  let value = Math.imul(index + 17, 374761393) ^ Math.imul(step + 31, 668265263) ^ seed;
  value = Math.imul(value ^ value >>> 13, 1274126177);
  return ((value ^ value >>> 16) >>> 0) / 4294967296;
};
function ease(progress, easing) {
  if (easing === "ease-out") return 1 - (1 - progress) ** 3;
  if (easing === "ease-in-out") return progress * progress * (3 - 2 * progress);
  return progress;
}
function getTitleAnimationFrame(settings, progress, seed) {
  const {
    from,
    to,
    duration,
    interval,
    hold,
    settle,
    length,
    direction,
    alphabet,
    preserve,
    spaces,
    easing,
    motion
  } = settings;
  const elapsed = progress * duration;
  if (progress >= 1) return to;
  if (elapsed <= hold) return from;
  const original = Array.from(from),
    target = Array.from(to);
  const start = Math.min(hold, duration - 1);
  const active = clamp((elapsed - start) / Math.max(1, duration - start));
  const settleFraction = settle / 100;
  const growth = ease(clamp(active / Math.max(.01, 1 - settleFraction)), easing);
  let size = Math.round(original.length + (target.length - original.length) * growth);
  if (length === "new") size = target.length;
  if (length === "end") size = active < 1 - settleFraction ? original.length : target.length;
  if (length === "type") {
    if (active < .5) return original.slice(0, Math.round(original.length * (1 - active * 2))).join("");
    return target.slice(0, Math.round(target.length * (active - .5) * 2)).join("");
  }
  const step = Math.floor((elapsed - start) / interval);
  return Array.from({
    length: size
  }, (_, index) => {
    const source = original[index],
      destination = target[index];
    const reference = destination ?? source ?? "";
    if (preserve && source === destination) return reference;
    let order = index / Math.max(1, target.length - 1);
    if (direction === "right") order = 1 - order;
    if (direction === "random") order = noise(index, 0, seed);
    if (direction === "together") order = 1;
    if (motion === "overtake") {
      if (direction === "left") order = (index + 1) / Math.max(1, target.length);
      if (direction === "right") order = (target.length - index) / Math.max(1, target.length);
      return destination !== void 0 && ease(active, easing) >= clamp(order) ? destination : source ?? destination ?? "";
    }
    if (destination !== void 0 && active >= 1 - settleFraction + clamp(order) * settleFraction) return destination;
    if (spaces && /\s/u.test(reference)) return reference;
    if (spaces && /[^\p{L}\p{N}]/u.test(reference)) return reference;
    const letters = ALPHABETS[alphabet] || ALPHABETS.letters;
    const random = letters[Math.floor(noise(index, step, seed) * letters.length)];
    return alphabet === "letters" && reference !== reference.toLowerCase() ? random.toUpperCase() : random;
  }).join("");
}

export { CHAT_TITLE_ANIMATION, getTitleAnimationFrame };
