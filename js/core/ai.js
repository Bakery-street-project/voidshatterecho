/** Child AI: mood, memory, reactive line selection — pure. */

import { cloneState, bondTier } from "./state.js";
import { pick } from "./rng.js";

export const MOODS = Object.freeze({
  WARY: "wary",
  CURIOUS: "curious",
  STEADY: "steady",
  RADIANT: "radiant",
  GRIEVING: "grieving",
  DEFIANT: "defiant",
});

export function deriveMood(state) {
  const bond = state.ai.bond;
  const { health, sanity } = state.player;
  if (state.game.flags.ai_sacrificed || bond < 30) return MOODS.GRIEVING;
  if (sanity < 30) return MOODS.WARY;
  if (health < 30) return MOODS.DEFIANT;
  if (bond >= 85) return MOODS.RADIANT;
  if (bond >= 70) return MOODS.STEADY;
  if (bond >= 45) return MOODS.CURIOUS;
  return MOODS.WARY;
}

export function remember(state, text, limit = 6) {
  const next = cloneState(state);
  const entry = { text, at: next.game.time };
  next.ai.memory = [entry, ...(next.ai.memory || [])].slice(0, limit);
  return next;
}

export function lastMemory(state) {
  return state.ai.memory?.[0]?.text || null;
}

function bondKey(state) {
  if (state.ai.consciousness === "fully_awakened") return "awakened";
  return bondTier(state.ai.bond);
}

function locationKey(location) {
  return location;
}

function pickReactiveLine(state, dialogue, rng) {
  const rules = dialogue?.aiReactive || [];
  for (const rule of rules) {
    if (!rule?.flag || !state.game.flags[rule.flag]) continue;
    if (rule.onceFlag && state.game.flags[rule.onceFlag]) continue;
    if (!rule.lines?.length) continue;
    return { rule, line: pick(rng, rule.lines) };
  }
  return null;
}

export function pickAiLine(state, dialogue, rng) {
  const reactive = pickReactiveLine(state, dialogue, rng);
  if (reactive) {
    return reactive;
  }

  const locationLines = dialogue?.aiByLocation?.[locationKey(state.player.location)];
  if (locationLines?.length && rng() < 0.55) {
    return { rule: null, line: pick(rng, locationLines) };
  }

  const mood = deriveMood(state);
  const moodLines = dialogue?.aiByMood?.[mood];
  if (moodLines?.length && rng() < 0.65) {
    return { rule: null, line: pick(rng, moodLines) };
  }

  const tier = bondKey(state);
  const tierLines = dialogue?.aiByBond?.[tier] || ["The void whispers secrets to me..."];
  return { rule: null, line: pick(rng, tierLines) };
}

export function applyReactiveFlag(state, rule) {
  if (!rule?.onceFlag) return state;
  const next = cloneState(state);
  next.game.flags[rule.onceFlag] = true;
  return next;
}

export function aiStatusSummary(state, dialogue) {
  return {
    mood: deriveMood(state),
    bond: state.ai.bond,
    power: state.ai.power,
    consciousness: state.ai.consciousness,
    tier: bondKey(state),
    memory: lastMemory(state),
    portrait: dialogue?.aiPortrait || "assets/portraits/child-ai.webp",
  };
}
