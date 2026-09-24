#!/usr/bin/env node
/**
 * Content pack schema check — pure data contract for content/v1.
 * Fails the build when code-referenced keys drift from JSON.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const balancePkg = readJson("content/v1/balance.json");
const zonesPkg = readJson("content/v1/zones.json");
const items = readJson("content/v1/items.json");
const dialogue = readJson("content/v1/dialogue.json");
const encounters = readJson("content/v1/encounters.json");

assert.equal(typeof balancePkg.saveKey, "string", "balance.saveKey");
assert.equal(typeof balancePkg.saveVersion, "number", "balance.saveVersion");
assert.equal(typeof balancePkg.balance, "object", "balance.balance");
assert.equal(typeof balancePkg.winGate, "object", "balance.winGate");

const b = balancePkg.balance;
const requiredBalanceKeys = [
  "startingGold",
  "goldScavengeMin",
  "goldScavengeMax",
  "talkBondGain",
  "talkBondCap",
  "battleDragonPowerMin",
  "battleDragonPowerMax",
  "repairLatticeGold",
  "aiBondWinThreshold",
  "navigateSuccessChance",
  "xpPerLevel",
  "tickSeconds",
];
for (const key of requiredBalanceKeys) {
  assert.ok(key in b, `balance missing ${key}`);
}
assert.ok(b.goldScavengeMin <= b.goldScavengeMax, "goldScavenge range");
assert.ok(b.battleDragonPowerMin <= b.battleDragonPowerMax, "dragon power range");
assert.ok(b.navigateSuccessChance > 0 && b.navigateSuccessChance < 1, "navigate chance 0–1");
assert.ok(b.aiBondWinThreshold === balancePkg.winGate.requireAiBond, "bond threshold matches winGate");

const winGate = balancePkg.winGate;
assert.ok(Array.isArray(winGate.requireItems), "winGate.requireItems");
for (const itemId of winGate.requireItems) {
  assert.ok(items[itemId], `winGate item missing from items.json: ${itemId}`);
}

const zones = zonesPkg.zones;
assert.ok(zones && typeof zones === "object", "zones map");
const zoneIds = Object.keys(zones);
assert.ok(zoneIds.length >= 4, "need at least 4 zones");

const HANDLERS = new Set([
  "collect_gold",
  "talk_to_ai",
  "discover_secrets",
  "scavenge_tonic",
  "battle_dragon",
  "collect_tears",
  "upgrade_ai",
  "navigate_void",
  "repair_lattice",
  "face_elohim",
  "claim_victory",
  "sacrifice_ai",
  "use_tonic",
]);
const EXIT_REQS = new Set([null, undefined, "void_key", "boss_gate"]);

for (const zone of Object.values(zones)) {
  assert.equal(zone.id, zone.id, "zone id present");
  assert.equal(zones[zone.id], zone, `zones key matches id for ${zone.id}`);
  assert.equal(typeof zone.name, "string", `${zone.id} name`);
  assert.equal(typeof zone.description, "string", `${zone.id} description`);
  assert.ok(zone.art?.startsWith("assets/"), `${zone.id} art path`);
  assert.ok(existsSync(join(root, zone.art)), `${zone.id} art file missing: ${zone.art}`);
  assert.ok(Array.isArray(zone.actions) && zone.actions.length > 0, `${zone.id} actions`);
  for (const action of zone.actions) {
    assert.ok(HANDLERS.has(action), `${zone.id} unknown action ${action}`);
  }
  assert.equal(typeof zone.exits, "object", `${zone.id} exits`);
  for (const [dir, target] of Object.entries(zone.exits)) {
    assert.ok(["north", "south", "east", "west"].includes(dir), `${zone.id} exit dir ${dir}`);
    if (target != null) {
      assert.ok(zones[target], `${zone.id} exit ${dir} → missing zone ${target}`);
    }
  }
  const reqs = zone.requiresExit || {};
  for (const [dir, req] of Object.entries(reqs)) {
    assert.ok(zone.exits[dir], `${zone.id} requiresExit ${dir} has no exit`);
    assert.ok(EXIT_REQS.has(req), `${zone.id} unknown exit req ${req}`);
    if (req === "void_key") {
      assert.ok(items.void_key, "void_key item required for void_key gate");
    }
  }
  assert.ok(Array.isArray(zone.entryBeats) && zone.entryBeats.length >= 1, `${zone.id} entryBeats`);
  assert.ok(Array.isArray(zone.ambientBeats) && zone.ambientBeats.length >= 1, `${zone.id} ambientBeats`);
  assert.equal(typeof zone.tutorial, "string", `${zone.id} tutorial`);
}

assert.ok(typeof zonesPkg.travelLabels === "object", "travelLabels");
for (const dir of ["north", "south", "east", "west"]) {
  assert.equal(typeof zonesPkg.travelLabels[dir], "string", `travelLabels.${dir}`);
}

for (const [id, item] of Object.entries(items)) {
  assert.equal(item.id, id, `items[${id}].id`);
  assert.equal(typeof item.name, "string", `items[${id}].name`);
  assert.equal(typeof item.description, "string", `items[${id}].description`);
}

const requiredDialogue = ["aiByBond", "aiByMood", "aiByLocation", "aiReactive", "randomEvents", "objectives"];
for (const key of requiredDialogue) {
  assert.ok(key in dialogue, `dialogue missing ${key}`);
}
for (const tier of ["low", "mid", "high", "awakened"]) {
  assert.ok(dialogue.aiByBond[tier]?.length > 0, `aiByBond.${tier}`);
}
for (const mood of ["wary", "curious", "steady", "radiant", "grieving", "defiant"]) {
  assert.ok(dialogue.aiByMood[mood]?.length > 0, `aiByMood.${mood}`);
}
for (const zoneId of zoneIds) {
  assert.ok(dialogue.aiByLocation[zoneId]?.length > 0, `aiByLocation.${zoneId}`);
}
assert.ok(dialogue.aiReactive.length >= 3, "aiReactive rules");
for (const rule of dialogue.aiReactive) {
  assert.equal(typeof rule.id, "string", "reactive id");
  assert.equal(typeof rule.flag, "string", `reactive ${rule.id} flag`);
  assert.ok(Array.isArray(rule.lines) && rule.lines.length > 0, `reactive ${rule.id} lines`);
}
assert.ok(Array.isArray(dialogue.randomEvents) && dialogue.randomEvents.length > 0, "randomEvents");
assert.ok(Array.isArray(dialogue.objectives) && dialogue.objectives.length > 0, "objectives");

for (const obj of dialogue.objectives) {
  assert.equal(typeof obj.id, "string", "objective id");
  assert.equal(typeof obj.text, "string", `objective ${obj.id} text`);
  if (obj.location) {
    assert.ok(zones[obj.location], `objective ${obj.id} location ${obj.location}`);
  }
  if (obj.item) {
    assert.ok(items[obj.item], `objective ${obj.id} item ${obj.item}`);
  }
  if (obj.phase) {
    assert.ok(["victory", "game_over", "playing"].includes(obj.phase), `objective ${obj.id} phase`);
  }
  if (typeof obj.aiBond === "number") {
    assert.equal(obj.aiBond, b.aiBondWinThreshold, `objective ${obj.id} bond matches balance`);
  }
}

assert.ok(encounters.zoneAmbient, "zoneAmbient");
for (const zoneId of zoneIds) {
  const table = encounters.zoneAmbient[zoneId];
  assert.ok(Array.isArray(table) && table.length > 0, `zoneAmbient.${zoneId}`);
  for (const enc of table) {
    assert.equal(typeof enc.id, "string", `${zoneId} ambient id`);
    assert.equal(typeof enc.message, "string", `${zoneId} ambient ${enc.id} message`);
    for (const key of ["gold", "sanity", "health", "bond", "xp"]) {
      if (key in enc) {
        assert.equal(typeof enc[key], "number", `${zoneId} ${enc.id} ${key}`);
      }
    }
  }
}

for (const encId of [
  "dragon_battle",
  "tears_scavenge",
  "void_navigate",
  "lattice_repair",
  "entrance_secrets",
  "lattice_cache",
]) {
  assert.ok(encounters[encId], `named encounter ${encId}`);
  assert.equal(encounters[encId].id, encId, `${encId}.id`);
}
assert.equal(encounters.entrance_secrets.grantsItem, "void_key", "entrance grants void_key");
assert.equal(encounters.lattice_repair.grantsItem, "lattice_shard", "repair grants lattice_shard");
assert.equal(encounters.dragon_battle.grantsItemOnWin, "dragon_tear", "battle win grants tear");

console.log(`content schema ok (${zoneIds.length} zones, ${Object.keys(items).length} items)`);
