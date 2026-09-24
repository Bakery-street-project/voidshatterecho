/** Zone arrival beats and seeded ambient encounters — pure. */

import { cloneState, addEvent, clampVitals } from "./state.js";
import { pick } from "./rng.js";

function firstVisitFlag(zoneId) {
  return `visited_${zoneId}`;
}

function applyAmbientEffects(state, enc) {
  let next = cloneState(state);
  if (enc.gold) next.player.gold += enc.gold;
  if (enc.sanity) next.player.sanity += enc.sanity;
  if (enc.health) next.player.health += enc.health;
  if (enc.bond) next.ai.bond += enc.bond;
  if (enc.xp) next.player.experience += enc.xp;
  if (Array.isArray(enc.grantsItem)) {
    for (const id of enc.grantsItem) {
      if (!next.game.inventory.includes(id)) next.game.inventory.push(id);
    }
  }
  return clampVitals(next);
}

/**
 * Fire first-visit entry beat and a seeded ambient encounter/beat.
 * `rng` must be provided by the shell (stateless from run seed).
 */
export function onZoneArrive(state, content, rng) {
  const loc = state.player.location;
  const zone = content.zones?.[loc];
  if (!zone) return state;

  let next = state;
  const visitFlag = firstVisitFlag(loc);
  if (!next.game.flags[visitFlag] && zone.entryBeats?.length) {
    next = cloneState(next);
    next.game.flags[visitFlag] = true;
    const line = pick(rng, zone.entryBeats);
    if (line) next = addEvent(next, line);
  }

  const chance = content.balance?.ambientEncounterChance ?? 0.5;
  if (rng() < chance) {
    const table = content.encounters?.zoneAmbient?.[loc];
    if (table?.length) {
      const enc = pick(rng, table);
      if (enc) {
        next = applyAmbientEffects(next, enc);
        if (enc.message) next = addEvent(next, enc.message);
        return next;
      }
    }
    if (zone.ambientBeats?.length) {
      const beat = pick(rng, zone.ambientBeats);
      if (beat) next = addEvent(next, beat);
    }
  }

  return next;
}

/** Low-frequency ambient while standing in a zone (called from shell tick). */
export function onZoneTick(state, content, rng) {
  const loc = state.player.location;
  const zone = content.zones?.[loc];
  if (!zone?.ambientBeats?.length) return state;
  const chance = content.balance?.zoneTickBeatChance ?? 0.12;
  if (rng() >= chance) return state;
  const beat = pick(rng, zone.ambientBeats);
  if (!beat) return state;
  return addEvent(state, beat);
}
