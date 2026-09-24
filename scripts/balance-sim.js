#!/usr/bin/env node
/**
 * Deterministic balance bot over pure core.
 * Estimates win rate + action budget for M1 targets (8–12 min, 35–50% first-loss win).
 *
 * Usage: node scripts/balance-sim.js [runs] [baseSeed]
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createDefaultState, tick, hasItem, grantItem } from "../js/core/state.js";
import { performAction, KNOWN_ACTIONS } from "../js/core/actions.js";
import { travel } from "../js/core/travel.js";
import { claimVictory, isBossGateOpen, bossGateMissing } from "../js/core/victory.js";
import { mulberry32, randomInt } from "../js/core/rng.js";
import { onZoneArrive, onZoneTick } from "../js/core/beats.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const balancePkg = readJson("content/v1/balance.json");
const zonesPkg = readJson("content/v1/zones.json");
const dialogue = readJson("content/v1/dialogue.json");
const encounters = readJson("content/v1/encounters.json");
const items = readJson("content/v1/items.json");

const content = {
  balance: balancePkg.balance,
  winGate: balancePkg.winGate,
  sacrificeGate: balancePkg.sacrificeGate ?? null,
  zones: zonesPkg.zones,
  dialogue,
  encounters,
  items,
};

function makeCtx(seed) {
  const rng = mulberry32(seed);
  return {
    balance: content.balance,
    winGate: content.winGate,
    sacrificeGate: content.sacrificeGate,
    dialogue,
    encounters,
    items,
    rng,
  };
}

function advance(state, ctx, seconds = 1) {
  let next = state;
  for (let i = 0; i < seconds; i += 1) {
    next = tick(next, {
      balance: content.balance,
      rng: ctx.rng,
      randomEventMessages: dialogue.randomEvents,
    });
    if (next.game.phase !== "playing") return next;
    next = onZoneTick(next, content, ctx.rng);
  }
  return next;
}

function act(state, ctx, action) {
  let next = performAction(state, action, ctx);
  // ~1–2s per deliberate player action in the live shell
  const secs = 1 + (ctx.rng() < 0.35 ? 1 : 0);
  return advance(next, ctx, secs);
}

function moveTo(state, ctx, direction) {
  const result = travel(state, content.zones, direction, content.winGate, content.sacrificeGate);
  if (!result.moved) return state;
  let next = result.state;
  next = onZoneArrive(next, content, ctx.rng);
  next = advance(next, ctx, 1);
  return next;
}

function goldForRepair(state, ctx, safety = 40) {
  let next = state;
  let guard = 0;
  while (next.player.gold < content.balance.repairLatticeGold && guard < safety) {
    if (next.player.location === "dragon_realm" && !hasItem(next, "healing_tonic") && next.player.health < 70) {
      next = act(next, ctx, "scavenge_tonic");
    }
    if (next.player.location === "dragon_realm") {
      next = act(next, ctx, "collect_tears");
    } else if (next.player.location === "void_entrance" || next.player.location === "lattice_void") {
      next = act(next, ctx, "collect_gold");
      if (!hasItem(next, "healing_tonic") && next.player.health < 60 && next.game.flags.tonic_found === false) {
        next = act(next, ctx, "scavenge_tonic");
      }
    } else {
      next = act(next, ctx, "collect_gold");
    }
    if (next.game.phase !== "playing") return next;
    guard += 1;
  }
  return next;
}

function raiseBond(state, ctx, target = content.balance.aiBondWinThreshold, safety = 30) {
  let next = state;
  let guard = 0;
  while (next.ai.bond < target && guard < safety && next.game.phase === "playing") {
    if (next.player.gold >= content.balance.upgradeAiGold) {
      next = act(next, ctx, "upgrade_ai");
    } else {
      next = act(next, ctx, "talk_to_ai");
    }
    guard += 1;
  }
  return next;
}

/** Greedy but imperfect bot: follows the win funnel with risk choices. */
function playRun(seed) {
  const ctx = makeCtx(seed);
  let s = createDefaultState(content.balance);
  s.game.seed = seed;
  s = onZoneArrive(s, content, ctx.rng);
  let actions = 0;
  const maxActions = 80;

  const step = (fn) => {
    if (s.game.phase !== "playing") return false;
    const before = s;
    s = fn(s);
    if (s !== before) actions += 1;
    return s.game.phase === "playing";
  };

  // Entrance: key first, stash some gold, optional tonic
  step(() => {
    let n = s;
    if (!n.game.flags.void_key_found) n = act(n, ctx, "discover_secrets");
    return n;
  });
  while (s.player.gold < 40 && s.game.phase === "playing" && actions < maxActions) {
    step(() => act(s, ctx, "collect_gold"));
  }
  if (!s.game.flags.tonic_found && actions < maxActions) {
    step(() => act(s, ctx, "scavenge_tonic"));
  }
  // Bond some early talks for reactive dialogue / threshold head start
  for (let i = 0; i < 3 && s.game.phase === "playing" && actions < maxActions; i += 1) {
    step(() => act(s, ctx, "talk_to_ai"));
  }

  // East → dragons
  if (s.player.location === "void_entrance") {
    step(() => moveTo(s, ctx, "east"));
  }

  if (s.player.location === "dragon_realm") {
    // Battle once for flag + tear chance; fall back to tears if hurt
    if (!s.game.flags.faced_dragon) {
      step(() => act(s, ctx, "battle_dragon"));
      if (s.player.health < 40 && hasItem(s, "healing_tonic")) {
        step(() => act(s, ctx, "use_tonic"));
      }
    }
    if (!hasItem(s, "dragon_tear")) {
      step(() => act(s, ctx, "collect_tears"));
    }
    // Power through upgrades while gold allows
    while (s.player.gold >= content.balance.upgradeAiGold && s.ai.bond < content.balance.aiBondWinThreshold + 10 && actions < maxActions) {
      step(() => act(s, ctx, "upgrade_ai"));
    }
    step(() => moveTo(s, ctx, "east"));
  }

  // Lattice: gold + repair + bond
  if (s.player.location === "lattice_void") {
    step(() => goldForRepair(s, ctx));
    if (s.game.phase === "playing" && !s.game.flags.lattice_repaired) {
      step(() => act(s, ctx, "repair_lattice"));
    }
    // chip / cache once
    if (actions < maxActions) {
      step(() => act(s, ctx, "discover_secrets"));
    }
    step(() => raiseBond(s, ctx));
    // navigate for XP if still low level and safe sanity
    if (s.player.sanity > 70 && s.player.level < 2 && actions < maxActions) {
      step(() => act(s, ctx, "navigate_void"));
      if (s.player.sanity < 40 && hasItem(s, "focusing_chip")) {
        // chip passive already applied; tonic path if available
      }
      if (s.player.health < 40 && hasItem(s, "healing_tonic")) {
        step(() => act(s, ctx, "use_tonic"));
      }
    }
    step(() => raiseBond(s, ctx));

    const gateOk = isBossGateOpen(s, content.winGate, content.sacrificeGate);
    if (!gateOk && actions < maxActions + 20) {
      // last-ditch: more gold/tears path
      step(() => goldForRepair(s, ctx));
      step(() => raiseBond(s, ctx));
      if (!hasItem(s, "dragon_tear") || !hasItem(s, "lattice_shard")) {
        step(() => moveTo(s, ctx, "west"));
        if (s.player.location === "dragon_realm") {
          step(() => act(s, ctx, "collect_tears"));
          step(() => moveTo(s, ctx, "east"));
        }
      }
    }

    step(() => moveTo(s, ctx, "east"));
  }

  if (s.player.location === "elohim_chamber") {
    step(() => act(s, ctx, "face_elohim"));
    step(() => act(s, ctx, "claim_victory"));
    // If incomplete claim seared us, try to finish checklist items still missing
    if (s.game.phase === "playing" && actions < maxActions + 30) {
      step(() => raiseBond(s, ctx));
      step(() => act(s, ctx, "claim_victory"));
    }
  }

  const outcome =
    s.game.phase === "victory"
      ? "win"
      : s.game.phase === "game_over"
        ? "fail"
        : "timeout";

  return {
    seed,
    outcome,
    actions,
    time: s.game.time,
    zone: s.player.location,
    bond: s.ai.bond,
    health: s.player.health,
    sanity: s.player.sanity,
    level: s.player.level,
    gold: s.player.gold,
    missing: bossGateMissing(s, content.winGate),
    death:
      s.game.phase === "game_over"
        ? s.player.health <= 0
          ? "health"
          : "sanity"
        : null,
  };
}

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function percentile(nums, p) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[idx];
}

const runs = Number(process.argv[2] || 120);
const baseSeed = Number(process.argv[3] || 1000);

const results = [];
for (let i = 0; i < runs; i += 1) {
  results.push(playRun(baseSeed + i * 17));
}

const wins = results.filter((r) => r.outcome === "win").length;
const fails = results.filter((r) => r.outcome === "fail").length;
const timeouts = results.filter((r) => r.outcome === "timeout").length;
const deathHealth = results.filter((r) => r.death === "health").length;
const deathSanity = results.filter((r) => r.death === "sanity").length;
const winTimes = results.filter((r) => r.outcome === "win").map((r) => r.time);
const allTimes = results.map((r) => r.time);
const allActions = results.map((r) => r.actions);

const summary = {
  generatedAt: new Date().toISOString().slice(0, 10),
  runs,
  baseSeed,
  winRate: Number((wins / runs).toFixed(3)),
  failRate: Number((fails / runs).toFixed(3)),
  timeoutRate: Number((timeouts / runs).toFixed(3)),
  deathHealth,
  deathSanity,
  medianTime: median(allTimes),
  p90Time: percentile(allTimes, 90),
  medianWinTime: median(winTimes),
  medianActions: median(allActions),
  p90Actions: percentile(allActions, 90),
  sampleMisses: results
    .filter((r) => r.outcome !== "win")
    .slice(0, 8)
    .map((r) => ({ outcome: r.outcome, zone: r.zone, missing: r.missing, actions: r.actions })),
};

const inBand =
  summary.winRate >= 0.35 && summary.winRate <= 0.55
    ? "win-rate in/near M1 band"
    : summary.winRate > 0.55
      ? "win-rate high (bot may be too optimal vs humans)"
      : "win-rate low (soft risk)";

console.log(JSON.stringify({ ...summary, note: inBand }, null, 2));

// Non-zero exit only if bot itself is broken (never finishes any run meaningfully)
if (wins + fails === 0) {
  console.error("balance-sim: no terminal runs — bot or engine broken");
  process.exit(1);
}
