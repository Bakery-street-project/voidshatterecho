/** Zone travel with gated exits — pure. */

import { cloneState, addEvent, hasItem } from "./state.js";
import { gateMissing, isBossGateOpen } from "./victory.js";

const DIRECTIONS = ["north", "south", "east", "west"];

export function meetsExitRequirement(state, requirement, winGate, sacrificeGate) {
  if (!requirement) return true;
  if (requirement === "void_key") return hasItem(state, "void_key");
  if (requirement === "boss_gate") return isBossGateOpen(state, winGate, sacrificeGate);
  return true;
}

export function exitRequirementMessage(state, requirement, winGate, sacrificeGate) {
  if (requirement === "void_key") {
    return "The east gate is sealed. You need the Void Key (search the entrance).";
  }
  if (requirement === "boss_gate") {
    const missing = gateMissing(state, winGate, sacrificeGate);
    return `The chamber rejects you. Still missing: ${missing.join(", ")}.`;
  }
  return "The way is blocked.";
}

export function travel(state, zones, direction, winGate, sacrificeGate) {
  if (state.game.phase !== "playing") {
    return { state, moved: false, reason: "not_playing" };
  }
  if (!DIRECTIONS.includes(direction)) {
    return { state: addEvent(state, `Unknown direction: ${direction}`), moved: false };
  }

  const zone = zones[state.player.location];
  if (!zone) {
    return { state, moved: false, reason: "bad_zone" };
  }

  const target = zone.exits?.[direction];
  if (!target) {
    return {
      state: addEvent(state, `No path ${direction} from here.`),
      moved: false,
      reason: "no_exit",
    };
  }

  const requirement = zone.requiresExit?.[direction];
  if (!meetsExitRequirement(state, requirement, winGate, sacrificeGate)) {
    return {
      state: addEvent(state, exitRequirementMessage(state, requirement, winGate, sacrificeGate)),
      moved: false,
      reason: "locked",
    };
  }

  let next = cloneState(state);
  next.player.location = target;
  next = addEvent(next, `You travel ${direction} to ${zones[target].name}.`);
  if (target === "elohim_chamber" && !next.game.flags.boss_seen) {
    next.game.flags.boss_seen = true;
    next = addEvent(
      next,
      "The chamber locks behind you. Victory needs more than nerve."
    );
  }
  return { state: next, moved: true };
}

export function canExit(state, zones, direction, winGate, sacrificeGate) {
  const zone = zones[state.player.location];
  if (!zone) return false;
  const target = zone.exits?.[direction];
  if (!target) return false;
  return meetsExitRequirement(state, zone.requiresExit?.[direction], winGate, sacrificeGate);
}
