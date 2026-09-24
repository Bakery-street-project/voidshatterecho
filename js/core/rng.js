/** Deterministic RNG helpers for tests and optional seeded runs. */

export function mulberry32(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(rng, min, max) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function chance(rng, p) {
  return rng() < p;
}

export function pick(rng, list) {
  if (!list || list.length === 0) return undefined;
  return list[Math.floor(rng() * list.length)];
}

export function defaultRng() {
  return Math.random;
}

export function randomSeed() {
  return (Math.random() * 0xffffffff) >>> 0;
}

/** FNV-1a style string hash mixed into a 32-bit seed. */
export function hashParts(...parts) {
  let h = 2166136261;
  for (const part of parts) {
    const s = String(part);
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= 0xff;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Deterministic RNG for one decision from saved state (seed, time, location, tag).
 * Avoids persisting an RNG stream across save/load.
 */
export function statelessRng(seed, ...parts) {
  return mulberry32(hashParts(seed, ...parts));
}
