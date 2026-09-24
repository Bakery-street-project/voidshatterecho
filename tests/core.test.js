import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { createDefaultState, PHASES, tick, grantItem, hasItem, addEvent } from "../js/core/state.js";
import { bossGateMissing, claimVictory, isBossGateOpen } from "../js/core/victory.js";
import { travel, meetsExitRequirement, canExit } from "../js/core/travel.js";
import { performAction, KNOWN_ACTIONS } from "../js/core/actions.js";
import { parseSave, serializeState, SAVE_VERSION } from "../js/core/save.js";
import { mulberry32, randomInt, chance, pick } from "../js/core/rng.js";

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
  zones: zonesPkg.zones,
  travelLabels: zonesPkg.travelLabels,
  dialogue,
  encounters,
  items,
  saveKey: balancePkg.saveKey,
};

function ctx(rngSeed = 1) {
  return {
    balance: content.balance,
    winGate: content.winGate,
    dialogue,
    encounters,
    items,
    rng: mulberry32(rngSeed),
  };
}

function stateWith(itemsList = [], flags = {}, overrides = {}) {
  let s = createDefaultState(content.balance);
  for (const id of itemsList) {
    const g = grantItem(s, id);
    s = g.state;
  }
  s.game.flags = { ...s.game.flags, ...flags };
  s = { ...s, ...overrides };
  if (overrides.player) s.player = { ...s.player, ...overrides.player };
  if (overrides.ai) s.ai = { ...s.ai, ...overrides.ai };
  return s;
}

test("rng is deterministic under seed", () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  assert.equal(a(), b());
  assert.equal(randomInt(mulberry32(7), 1, 10), randomInt(mulberry32(7), 1, 10));
  assert.equal(chance(mulberry32(3), 0.5), chance(mulberry32(3), 0.5));
  assert.equal(pick(mulberry32(9), ["x", "y", "z"]), pick(mulberry32(9), ["x", "y", "z"]));
});

test("default state starts at void entrance playing", () => {
  const s = createDefaultState(content.balance);
  assert.equal(s.player.location, "void_entrance");
  assert.equal(s.game.phase, PHASES.PLAYING);
  assert.equal(s.ai.bond, 50);
});

test("all known actions exist and zone actions are subset", () => {
  for (const zone of Object.values(content.zones)) {
    for (const action of zone.actions) {
      assert.ok(KNOWN_ACTIONS.includes(action), `missing handler for ${action}`);
    }
  }
  assert.ok(KNOWN_ACTIONS.includes("discover_secrets"));
  assert.ok(KNOWN_ACTIONS.includes("sacrifice_ai"));
  assert.ok(KNOWN_ACTIONS.includes("use_tonic"));
});

test("void key gates east from dragon realm", () => {
  const locked = stateWith([], {}, { player: { location: "dragon_realm" } });
  const r1 = travel(locked, content.zones, "east", content.winGate);
  assert.equal(r1.moved, false);
  assert.equal(r1.reason, "locked");

  const open = stateWith(["void_key"], { void_key_found: true }, { player: { location: "dragon_realm" } });
  const r2 = travel(open, content.zones, "east", content.winGate);
  assert.equal(r2.moved, true);
  assert.equal(r2.state.player.location, "lattice_void");
});

test("boss gate requires checklist items and flags", () => {
  const empty = stateWith([], {}, { player: { location: "lattice_void" }, ai: { bond: 50 } });
  assert.equal(isBossGateOpen(empty, content.winGate), false);
  const missing = bossGateMissing(empty, content.winGate);
  assert.ok(missing.some((m) => m.includes("dragon")));
  assert.ok(missing.some((m) => m.includes("lattice")));
  assert.ok(missing.some((m) => m.includes("bond")));
  assert.ok(missing.some((m) => m.includes("Dragon Tear")));
  assert.ok(missing.some((m) => m.includes("Lattice Shard")));

  const ready = stateWith(
    ["void_key", "dragon_tear", "lattice_shard"],
    {
      void_key_found: true,
      faced_dragon: true,
      lattice_repaired: true,
      dragon_tear_found: true,
      lattice_shard_found: true,
    },
    { player: { location: "lattice_void" }, ai: { bond: 70 } }
  );
  assert.equal(isBossGateOpen(ready, content.winGate), true);
  assert.equal(canExit(ready, content.zones, "east", content.winGate), true);
});

test("claim victory succeeds only with full checklist in chamber", () => {
  const ready = stateWith(
    ["dragon_tear", "lattice_shard"],
    { faced_dragon: true, lattice_repaired: true },
    { player: { location: "elohim_chamber" }, ai: { bond: 70 } }
  );
  const won = claimVictory(ready, content.winGate, content.balance);
  assert.equal(won.game.phase, PHASES.VICTORY);

  const early = stateWith([], {}, { player: { location: "void_entrance" } });
  const earlyResult = claimVictory(early, content.winGate, content.balance);
  assert.equal(earlyResult.game.phase, PHASES.PLAYING);

  const incomplete = stateWith(
    ["dragon_tear", "lattice_shard"],
    { faced_dragon: true, lattice_repaired: true },
    { player: { location: "elohim_chamber", health: 100 }, ai: { bond: 50 } }
  );
  const burned = claimVictory(incomplete, content.winGate, content.balance);
  assert.equal(burned.game.phase, PHASES.PLAYING);
  assert.ok(burned.player.health < 100);
});

test("health or sanity zero ends the run on tick", () => {
  const s = createDefaultState(content.balance);
  s.player.health = 0;
  const dead = tick(s, { balance: content.balance, rng: mulberry32(1), randomEventMessages: [] });
  assert.equal(dead.game.phase, PHASES.GAME_OVER);

  const s2 = createDefaultState(content.balance);
  s2.player.sanity = 0;
  const mad = tick(s2, { balance: content.balance, rng: mulberry32(1), randomEventMessages: [] });
  assert.equal(mad.game.phase, PHASES.GAME_OVER);
});

test("discover secrets grants void key once", () => {
  let s = createDefaultState(content.balance);
  s = performAction(s, "discover_secrets", ctx(2));
  assert.ok(hasItem(s, "void_key"));
  assert.equal(s.game.flags.void_key_found, true);
  const again = performAction(s, "discover_secrets", ctx(2));
  assert.ok(hasItem(again, "void_key"));
  assert.equal(again.game.inventory.filter((i) => i === "void_key").length, 1);
});

test("repair lattice consumes gold and grants shard", () => {
  let s = createDefaultState(content.balance);
  s.player.location = "lattice_void";
  s.player.gold = 30;
  s = performAction(s, "repair_lattice", ctx(3));
  assert.ok(hasItem(s, "lattice_shard"));
  assert.equal(s.game.flags.lattice_repaired, true);
  assert.equal(s.player.gold, 0);
});

test("use tonic heals and consumes", () => {
  let s = stateWith(["healing_tonic"], {}, { player: { health: 40 } });
  s = performAction(s, "use_tonic", ctx(4));
  assert.equal(s.player.health, 70);
  assert.equal(hasItem(s, "healing_tonic"), false);
});

test("save roundtrip preserves progress", () => {
  let s = stateWith(
    ["void_key", "dragon_tear"],
    { faced_dragon: true },
    { player: { location: "dragon_realm", gold: 42, level: 2 }, ai: { bond: 66, power: 35 } }
  );
  s = addEvent(s, "hello");
  const payload = serializeState(s);
  assert.equal(payload.version, SAVE_VERSION);
  const restored = parseSave(JSON.stringify(payload), () => createDefaultState(content.balance));
  assert.ok(restored);
  assert.equal(restored.player.location, "dragon_realm");
  assert.equal(restored.player.gold, 42);
  assert.equal(restored.ai.bond, 66);
  assert.ok(restored.game.inventory.includes("void_key"));
  assert.equal(restored.game.flags.faced_dragon, true);
  assert.ok(restored.game.events[0].message.includes("hello"));
});

test("parseSave rejects garbage", () => {
  assert.equal(parseSave(null, () => createDefaultState(content.balance)), null);
  assert.equal(parseSave("{", () => createDefaultState(content.balance)), null);
  assert.equal(parseSave(JSON.stringify({ version: 99 }), () => createDefaultState(content.balance)), null);
});

test("full path: key → dragons → lattice → chamber → win", () => {
  let s = createDefaultState(content.balance);
  const c = ctx(11);

  s = performAction(s, "discover_secrets", c);
  s = travel(s, content.zones, "east", content.winGate).state;
  assert.equal(s.player.location, "dragon_realm");

  s = performAction(s, "battle_dragon", c);
  s = performAction(s, "collect_tears", c);
  assert.ok(hasItem(s, "dragon_tear"));

  s = travel(s, content.zones, "east", content.winGate).state;
  assert.equal(s.player.location, "lattice_void");

  s.player.gold = Math.max(s.player.gold, 30);
  s = performAction(s, "repair_lattice", c);
  assert.ok(hasItem(s, "lattice_shard"));

  s.ai.bond = 70;
  const gate = travel(s, content.zones, "east", content.winGate);
  assert.equal(gate.moved, true, gate.state.game.events[0]?.message);
  s = gate.state;
  assert.equal(s.player.location, "elohim_chamber");

  s = performAction(s, "claim_victory", c);
  assert.equal(s.game.phase, PHASES.VICTORY);
});

test("meet exit requirement void_key only", () => {
  const noKey = createDefaultState(content.balance);
  assert.equal(meetsExitRequirement(noKey, "void_key", content.winGate), false);
  const withKey = stateWith(["void_key"]);
  assert.equal(meetsExitRequirement(withKey, "void_key", content.winGate), true);
  assert.equal(meetsExitRequirement(withKey, null, content.winGate), true);
});
