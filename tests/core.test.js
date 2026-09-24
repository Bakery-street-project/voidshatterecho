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
import { mulberry32, randomInt, chance, pick, statelessRng, hashParts } from "../js/core/rng.js";
import { deriveMood, pickAiLine, remember, lastMemory } from "../js/core/ai.js";
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

test("ai mood tracks bond and vitals", () => {
  assert.equal(deriveMood(stateWith([], {}, { ai: { bond: 50 } })), "curious");
  assert.equal(deriveMood(stateWith([], {}, { ai: { bond: 90 } })), "radiant");
  assert.equal(
    deriveMood(stateWith([], {}, { ai: { bond: 50 }, player: { sanity: 10 } })),
    "wary"
  );
  assert.equal(
    deriveMood(stateWith([], {}, { ai: { bond: 50 }, player: { health: 10 } })),
    "defiant"
  );
  const sacrificed = stateWith([], { ai_sacrificed: true }, { ai: { bond: 0 } });
  assert.equal(deriveMood(sacrificed), "grieving");
});

test("remember caps memory and lastMemory reads newest", () => {
  let s = createDefaultState(content.balance);
  for (let i = 0; i < 9; i += 1) s = remember(s, `m${i}`);
  assert.equal(s.ai.memory.length, 6);
  assert.equal(lastMemory(s), "m8");
});

test("pickAiLine prefers reactive rule once flag set", () => {
  const s = stateWith([], { faced_dragon: true }, { ai: { bond: 50 } });
  const selection = pickAiLine(s, dialogue, mulberry32(5));
  assert.ok(selection.rule);
  assert.equal(selection.rule.id, "saw_dragon");
  assert.ok(selection.line.length > 0);
});

test("statelessRng is deterministic for same parts", () => {
  const a = statelessRng(42, 3, "lattice_void", "arrive");
  const b = statelessRng(42, 3, "lattice_void", "arrive");
  assert.equal(a(), b());
  assert.notEqual(hashParts(1, "a"), hashParts(1, "b"));
});

test("onZoneArrive fires first-visit entry beat once", () => {
  let s = createDefaultState(content.balance);
  s.player.location = "dragon_realm";
  s.game.flags.visited_dragon_realm = false;
  const first = onZoneArrive(s, content, mulberry32(9));
  assert.equal(first.game.flags.visited_dragon_realm, true);
  assert.ok(first.game.events.length >= 1);
  const second = onZoneArrive(first, content, mulberry32(9));
  const entryCount = second.game.events.filter((e) =>
    (content.zones.dragon_realm.entryBeats || []).includes(e.message)
  ).length;
  const firstEntryCount = first.game.events.filter((e) =>
    (content.zones.dragon_realm.entryBeats || []).includes(e.message)
  ).length;
  assert.equal(entryCount, firstEntryCount);
});

test("onZoneArrive ambient is deterministic under seed", () => {
  const base = createDefaultState(content.balance);
  base.player.location = "void_entrance";
  base.game.flags.visited_void_entrance = true;
  const r1 = onZoneArrive(base, content, statelessRng(77, 10, "void_entrance", "arrive"));
  const r2 = onZoneArrive(base, content, statelessRng(77, 10, "void_entrance", "arrive"));
  assert.deepEqual(
    r1.game.events.map((e) => e.message),
    r2.game.events.map((e) => e.message)
  );
  assert.deepEqual(r1.player, r2.player);
});

test("save preserves seed mood and memory", () => {
  let s = stateWith([], {}, { ai: { bond: 66, mood: "steady", memory: [{ text: "hello", at: 1 }] } });
  s.game.seed = 12345;
  const restored = parseSave(JSON.stringify(serializeState(s)), () => createDefaultState(content.balance));
  assert.equal(restored.game.seed, 12345);
  assert.equal(restored.ai.mood, "steady");
  assert.equal(restored.ai.memory[0].text, "hello");
});

test("zone content has art beats and ambient tables", () => {
  for (const zone of Object.values(content.zones)) {
    assert.ok(zone.art?.startsWith("assets/"), `${zone.id} art`);
    assert.ok(zone.entryBeats?.length > 0, `${zone.id} entryBeats`);
    assert.ok(zone.ambientBeats?.length > 0, `${zone.id} ambientBeats`);
    assert.ok(content.encounters.zoneAmbient?.[zone.id]?.length > 0, `${zone.id} ambient`);
  }
  assert.ok(dialogue.aiByMood);
  assert.ok(dialogue.aiByLocation);
  assert.ok(dialogue.aiReactive?.length >= 3);
});

test("onZoneTick can emit ambient beat deterministically", () => {
  const s = createDefaultState(content.balance);
  s.player.location = "lattice_void";
  let fired = null;
  for (let t = 0; t < 50; t += 1) {
    const next = onZoneTick(s, content, statelessRng(3, t, "lattice_void", `tick_${t}`));
    if (next !== s) {
      fired = next;
      break;
    }
  }
  assert.ok(fired, "expected at least one tick beat in 50 rolls");
  assert.ok(content.zones.lattice_void.ambientBeats.includes(fired.game.events[0].message));
});
