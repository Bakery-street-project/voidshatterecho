/** Victory checklist and chamber claims — pure. */

import { cloneState, hasItem, addEvent, triggerVictory } from "./state.js";

export function bossGateMissing(state, winGate) {
  const missing = [];
  if (winGate.requireFacedDragon && !state.game.flags.faced_dragon) {
    missing.push("face a dragon");
  }
  if (winGate.requireLatticeRepaired && !state.game.flags.lattice_repaired) {
    missing.push("repair the lattice");
  }
  const bondNeed = winGate.requireAiBond ?? 70;
  if (state.ai.bond < bondNeed) {
    missing.push(`AI bond >= ${bondNeed}`);
  }
  for (const itemId of winGate.requireItems || []) {
    if (!hasItem(state, itemId)) {
      const label =
        itemId === "dragon_tear"
          ? "Dragon Tear"
          : itemId === "lattice_shard"
            ? "Lattice Shard"
            : itemId;
      missing.push(label);
    }
  }
  return missing;
}

export function isBossGateOpen(state, winGate) {
  return bossGateMissing(state, winGate).length === 0;
}

export function claimVictory(state, winGate, balance) {
  if (state.player.location !== "elohim_chamber") {
    return addEvent(state, "Victory must be claimed inside the Elohim Chamber.");
  }
  if (winGate.requireFacedDragon && !state.game.flags.faced_dragon) {
    let next = addEvent(state, "Elohim burns the untested: face a dragon first.");
    next.player.health -= balance?.claimUntestedHealth ?? 20;
    return next;
  }

  const missing = bossGateMissing(state, winGate);
  if (missing.length > 0) {
    let next = addEvent(
      state,
      `Divine fire sears you. Incomplete offering: ${missing.join(", ")}.`
    );
    next.player.health -= balance?.claimFailHealth ?? 30;
    next.player.sanity -= balance?.claimFailSanity ?? 10;
    return next;
  }

  const next = addEvent(
    state,
    "אֵל נָצַח! You have claimed victory! The void is yours to command."
  );
  return triggerVictory(next);
}
