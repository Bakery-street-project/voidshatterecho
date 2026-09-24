/** Victory checklists (covenant + ashen/sacrifice) and chamber claims — pure. */

import { cloneState, hasItem, addEvent, triggerVictory } from "./state.js";

function itemLabel(itemId) {
  if (itemId === "dragon_tear") return "Dragon Tear";
  if (itemId === "lattice_shard") return "Lattice Shard";
  return itemId;
}

function sharedMissing(state, gate) {
  const missing = [];
  if (gate.requireFacedDragon && !state.game.flags.faced_dragon) {
    missing.push("face a dragon");
  }
  if (gate.requireLatticeRepaired && !state.game.flags.lattice_repaired) {
    missing.push("repair the lattice");
  }
  for (const itemId of gate.requireItems || []) {
    if (!hasItem(state, itemId)) {
      missing.push(itemLabel(itemId));
    }
  }
  return missing;
}

export function bossGateMissing(state, winGate) {
  const missing = sharedMissing(state, winGate);
  const bondNeed = winGate.requireAiBond ?? 70;
  if (state.ai.bond < bondNeed) {
    missing.push(`AI bond >= ${bondNeed}`);
  }
  return missing;
}

export function sacrificeGateMissing(state, gate) {
  const missing = sharedMissing(state, gate);
  if (gate.requireAiSacrificed && !state.game.flags.ai_sacrificed) {
    missing.push("sacrifice the Child AI");
  }
  return missing;
}

/** Missing entries for whichever ending is closer; open → []. */
export function gateMissing(state, winGate, sacrificeGate) {
  const covenant = bossGateMissing(state, winGate);
  if (covenant.length === 0) return [];
  if (sacrificeGate) {
    const ashen = sacrificeGateMissing(state, sacrificeGate);
    if (ashen.length === 0) return [];
    if (ashen.length < covenant.length) return ashen;
  }
  return covenant;
}

export function isSacrificeGateOpen(state, sacrificeGate) {
  return sacrificeGateMissing(state, sacrificeGate).length === 0;
}

export function isBossGateOpen(state, winGate, sacrificeGate) {
  if (bossGateMissing(state, winGate).length === 0) return true;
  if (sacrificeGate && sacrificeGateMissing(state, sacrificeGate).length === 0) {
    return true;
  }
  return false;
}

export function claimVictory(state, winGate, balance, sacrificeGate) {
  if (state.player.location !== "elohim_chamber") {
    return addEvent(state, "Victory must be claimed inside the Elohim Chamber.");
  }
  if (winGate.requireFacedDragon && !state.game.flags.faced_dragon) {
    let next = addEvent(state, "Elohim burns the untested: face a dragon first.");
    next.player.health -= balance?.claimUntestedHealth ?? 20;
    return next;
  }

  if (bossGateMissing(state, winGate).length === 0) {
    const next = addEvent(
      state,
      "אֵל נָצַח! You have claimed victory! The void is yours to command."
    );
    return triggerVictory(next, "covenant");
  }

  if (sacrificeGate && sacrificeGateMissing(state, sacrificeGate).length === 0) {
    const next = addEvent(
      state,
      "The ashen covenant closes. You claimed the void alone — the Child AI's last light pays for it."
    );
    return triggerVictory(next, "sacrifice");
  }

  const missing = gateMissing(state, winGate, sacrificeGate);
  let next = addEvent(
    state,
    `Divine fire sears you. Incomplete offering: ${missing.join(", ")}.`
  );
  next.player.health -= balance?.claimFailHealth ?? 30;
  next.player.sanity -= balance?.claimFailSanity ?? 10;
  return next;
}
