/** Action resolution — pure state transitions driven by content + balance. */

import {
  addEvent,
  clampVitals,
  cloneState,
  grantItem,
  hasItem,
  removeItem,
  checkLevelUp,
  triggerGameOver,
} from "./state.js";
import { claimVictory } from "./victory.js";
import { chance, pick, randomInt } from "./rng.js";

const HANDLERS = {
  collect_gold,
  talk_to_ai,
  discover_secrets,
  scavenge_tonic,
  battle_dragon,
  collect_tears,
  upgrade_ai,
  navigate_void,
  repair_lattice,
  face_elohim,
  claim_victory,
  sacrifice_ai,
  use_tonic,
};

export const KNOWN_ACTIONS = Object.keys(HANDLERS);

export function performAction(state, action, ctx) {
  if (state.game.phase !== "playing") {
    return state;
  }
  const handler = HANDLERS[action];
  if (!handler) {
    return addEvent(state, `Unknown action: ${action}`);
  }
  let next = handler(state, ctx);
  next = clampVitals(next);

  return failIfDead(next);
}

function failIfDead(state) {
  if (state.player.health <= 0 || state.player.sanity <= 0) {
    return triggerGameOver(state, "The cost of the void comes due mid-action.");
  }
  return state;
}

function collect_gold(state, ctx) {
  const found = randomInt(ctx.rng, ctx.balance.goldScavengeMin, ctx.balance.goldScavengeMax);
  const next = cloneState(state);
  next.player.gold += found;
  return addEvent(next, `You found ${found} gold pieces in the void.`);
}

function talk_to_ai(state, ctx) {
  const lines = ctx.dialogue?.aiByBond?.[state.ai.consciousness === "fully_awakened" ? "awakened" : pickBondKey(state.ai.bond)] || [
    "The void whispers secrets to me...",
  ];
  const line = pick(ctx.rng, lines);
  let next = addEvent(state, `Child AI: "${line}"`);
  next.ai.bond = Math.min(
    ctx.balance.talkBondCap ?? 100,
    next.ai.bond + (ctx.balance.talkBondGain ?? 5)
  );
  const threshold = ctx.balance.aiBondWinThreshold ?? 70;
  if (next.ai.bond >= threshold && next.ai.bond - (ctx.balance.talkBondGain ?? 5) < threshold) {
    next = addEvent(next, `Bond threshold met (${threshold}): the Child AI stands with you.`);
  }
  return next;
}

function pickBondKey(bond) {
  if (bond > 85) return "awakened";
  if (bond >= 70) return "high";
  if (bond >= 45) return "mid";
  return "low";
}

function discover_secrets(state, ctx) {
  const flags = state.game.flags;
  const loc = state.player.location;
  const grants = ctx.encounters.entrance_secrets?.grantsItem || "void_key";

  if (loc === "void_entrance" && !flags.void_key_found) {
    let next = cloneState(state);
    next.game.flags.void_key_found = true;
    const g = grantItem(next, grants);
    next = g.state;
    next.player.experience += ctx.balance.discoverSecretsXp ?? 20;
    next = addEvent(next, ctx.encounters.entrance_secrets.message);
    return checkLevelUp(next, ctx.balance);
  }

  if (loc === "void_entrance" && flags.void_key_found) {
    return addEvent(
      state,
      "The entrance offers nothing new. The key already burns in your pack."
    );
  }

  if (loc === "lattice_void") {
    let next = cloneState(state);
    next.game.flags.secrets_seen = true;
    const gold = randomInt(
      ctx.rng,
      ctx.balance.latticeCacheGoldMin ?? 5,
      ctx.balance.latticeCacheGoldMax ?? 35
    );
    next.player.gold += gold;
    next.player.sanity += ctx.balance.latticeCacheSanity ?? 5;
    next = addEvent(next, `${ctx.encounters.lattice_cache.message} +${gold} gold.`);
    if (!flags.chip_found && !hasItem(next, "focusing_chip") && chance(ctx.rng, 0.35)) {
      const g = grantItem(next, "focusing_chip");
      next = g.state;
      if (g.granted) {
        next.game.flags.chip_found = true;
        next = addEvent(next, "A Focusing Chip clicks into your deck.");
      }
    }
    return next;
  }

  return addEvent(state, "Nothing secret answers here.");
}

function scavenge_tonic(state, ctx) {
  if (state.game.flags.tonic_found && !hasItem(state, "healing_tonic")) {
    return addEvent(state, "The scavenge points are empty.");
  }
  if (hasItem(state, "healing_tonic")) {
    return addEvent(state, "You already carry a Healing Tonic.");
  }
  if (!chance(ctx.rng, 0.55) && state.game.time < 3) {
    return addEvent(state, "You scrape the nodes — nothing holds.");
  }
  let next = cloneState(state);
  const g = grantItem(next, "healing_tonic");
  next = g.state;
  if (g.granted) {
    next.game.flags.tonic_found = true;
    next = addEvent(next, "You recover a Healing Tonic from a dead dispenser.");
  }
  return next;
}

function battle_dragon(state, ctx) {
  if (state.player.location !== "dragon_realm") {
    return addEvent(state, "No dragon answers outside the Dragon Realm.");
  }
  const b = ctx.balance;
  const dragonPower = randomInt(ctx.rng, b.battleDragonPowerMin, b.battleDragonPowerMax);
  const playerPower = state.player.level * 20 + state.ai.power;
  let next = cloneState(state);
  next.game.flags.faced_dragon = true;

  if (playerPower > dragonPower) {
    next = addEvent(next, ctx.encounters.dragon_battle.winMessage);
    next.player.experience += b.battleWinXp;
    next.player.gold += b.battleWinGold;
    if (!hasItem(next, "dragon_tear")) {
      const g = grantItem(next, "dragon_tear");
      next = g.state;
      next.game.flags.dragon_tear_found = true;
      next = addEvent(next, "A Dragon Tear crystallizes in your inventory.");
    }
    return checkLevelUp(next, b);
  }

  next = addEvent(next, ctx.encounters.dragon_battle.loseMessage);
  next.player.health -= b.battleLoseHealth;
  next.player.sanity -= b.battleLoseSanity;
  return next;
}

function collect_tears(state, ctx) {
  const b = ctx.balance;
  const tears = randomInt(ctx.rng, b.tearsMin, b.tearsMax);
  let next = cloneState(state);
  next.player.gold += tears * b.tearsGoldEach;
  next = addEvent(next, `You collected ${tears} dragon tears worth ${tears * b.tearsGoldEach} gold.`);
  if (!hasItem(next, "dragon_tear")) {
    const g = grantItem(next, "dragon_tear");
    next = g.state;
    next.game.flags.dragon_tear_found = true;
    next = addEvent(next, "One tear hardens into a keepsake: Dragon Tear.");
  }
  return next;
}

function upgrade_ai(state, ctx) {
  const b = ctx.balance;
  if (state.player.gold >= b.upgradeAiGold) {
    let next = cloneState(state);
    next.player.gold -= b.upgradeAiGold;
    next.ai.power += b.upgradeAiPower;
    next.ai.bond = Math.min(100, next.ai.bond + b.upgradeAiBond);
    return addEvent(next, "You upgraded the Child AI with dragon tears!");
  }
  return addEvent(state, `You need ${b.upgradeAiGold} gold to upgrade the AI.`);
}

function navigate_void(state, ctx) {
  const b = ctx.balance;
  if (chance(ctx.rng, b.navigateSuccessChance)) {
    let next = cloneState(state);
    next = addEvent(next, ctx.encounters.void_navigate.winMessage);
    next.player.experience += b.navigateWinXp;
    next.player.sanity += b.navigateWinSanity;
    return checkLevelUp(next, b);
  }
  let next = cloneState(state);
  let loss = b.navigateFailSanity;
  if (hasItem(next, "focusing_chip")) {
    loss = Math.max(0, loss - 5);
    next = addEvent(next, "Focusing Chip dampens the scream.");
  }
  next = addEvent(next, ctx.encounters.void_navigate.loseMessage);
  next.player.sanity -= loss;
  return next;
}

function repair_lattice(state, ctx) {
  const b = ctx.balance;
  if (state.game.flags.lattice_repaired) {
    return addEvent(state, "The lattice already holds. The shard is yours.");
  }
  if (state.player.gold < b.repairLatticeGold) {
    return addEvent(state, `You need ${b.repairLatticeGold} gold to repair the lattice.`);
  }
  let next = cloneState(state);
  next.player.gold -= b.repairLatticeGold;
  next.game.flags.lattice_repaired = true;
  const g = grantItem(next, "lattice_shard");
  next = g.state;
  next.game.flags.lattice_shard_found = true;
  next.player.sanity += b.repairSanity;
  return addEvent(next, ctx.encounters.lattice_repair.message + " A Lattice Shard forms.");
}

function face_elohim(state) {
  if (state.player.location !== "elohim_chamber") {
    return addEvent(state, "Elohim is not here. Press east into the chamber when the gate allows.");
  }
  let next = cloneState(state);
  next.game.flags.faced_elohim = true;
  return addEvent(next, "You stand before Elohim. The final challenge begins...");
}

function claim_victory(state, ctx) {
  return claimVictory(state, ctx.winGate, ctx.balance);
}

function sacrifice_ai(state, ctx) {
  const b = ctx.balance;
  if (state.ai.bond < 20) {
    return addEvent(state, "The Child AI is already too faint to sacrifice.");
  }
  let next = cloneState(state);
  next.ai.bond = Math.max(0, next.ai.bond - b.sacrificeBondCost);
  next.ai.power += b.sacrificePowerGain;
  next.player.sanity += b.sacrificeSanityGain;
  next = addEvent(next, "You burn part of the Child AI's bond into raw power. It does not forget.");
  if (next.ai.bond < (b.aiBondWinThreshold ?? 70)) {
    next = addEvent(next, "Warning: AI bond fell below the victory checklist threshold.");
  }
  return next;
}

function use_tonic(state) {
  if (!hasItem(state, "healing_tonic")) {
    return addEvent(state, "No Healing Tonic to use.");
  }
  if (state.player.health >= 100) {
    return addEvent(state, "You are already at full health.");
  }
  let next = removeItem(state, "healing_tonic");
  next.player.health = Math.min(100, next.player.health + 30);
  return addEvent(next, "The tonic burns clean. +30 health.");
}
