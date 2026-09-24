/**
 * Privacy-light analytics — pure builders only.
 * No PII: never include player identity or network identifiers.
 * Shell decides transport (localStorage ring now; batch endpoint later).
 */

export const ANALYTICS_KEY = "voidshatterecho_analytics_v1";
export const ANALYTICS_MAX = 200;

export function buildEvent(name, payload = {}) {
  const event = { name, t: Date.now() };
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined || v === null) continue;
    event[k] = v;
  }
  return event;
}

export function deathCause(state) {
  if (state.player.health <= 0) return "health";
  if (state.player.sanity <= 0) return "sanity";
  return "unknown";
}

export function runStart(state) {
  return buildEvent("run_start", {
    seed: state.game.seed,
    zone: state.player.location,
    v: state.meta?.version ?? 1,
  });
}

/** outcome: "win" | "fail" */
export function runEnd(state, outcome) {
  const fail = outcome !== "win";
  return buildEvent("run_end", {
    outcome: fail ? "fail" : "win",
    zone: state.player.location,
    time: state.game.time,
    level: state.player.level,
    bond: state.ai.bond,
    seed: state.game.seed,
    death_cause: fail ? deathCause(state) : undefined,
  });
}

export function saveLoad(state, mode = "restore") {
  return buildEvent("save_load", {
    mode,
    zone: state.player.location,
    time: state.game.time,
    level: state.player.level,
  });
}

export function tutorialStep(step, zone) {
  return buildEvent("tutorial_step", { step, zone });
}

/** Pure ring buffer append (newest first). */
export function appendEvent(buffer, event, max = ANALYTICS_MAX) {
  const list = Array.isArray(buffer) ? buffer : [];
  return [event, ...list].slice(0, max);
}
