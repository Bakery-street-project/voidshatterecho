# Voidshatter Echo — Design (v1)

Source of truth for zone gates, win funnel, and balance knobs until a later content pack supersedes it. Numbers live in `content/v1/balance.json`.

## Zone map

```text
                    (no north/south exits in v1)

  [void_entrance] --east--> [dragon_realm] --east--> [lattice_void] --east--> [elohim_chamber]
         ^                      |  (requires void_key)        |  (requires boss_gate)          |
         +----------------------+                              +-------------------> west -----+
```

| Zone | Actions | East gate | West |
| --- | --- | --- | --- |
| Void Entrance | collect_gold, talk_to_ai, discover_secrets, scavenge_tonic | open → Dragon Realm | — |
| Dragon Realm | battle_dragon, collect_tears, upgrade_ai, talk_to_ai | **void_key** → Lattice Void | Void Entrance |
| Lattice Void | navigate_void, repair_lattice, discover_secrets, scavenge_tonic | **boss_gate** (full checklist) → Chamber | Dragon Realm |
| Elohim Chamber | face_elohim, claim_victory, sacrifice_ai, talk_to_ai | — | Lattice Void |

## Win funnel

```text
start (bond 50, gold 0)
  → discover_secrets          [void_key, flag void_key_found]
  → east                      [gate: void_key]
  → battle_dragon             [flag faced_dragon]  (win grants dragon_tear; collect_tears also grants)
  → collect_tears / upgrade   [dragon_tear + gold toward 70 bond]
  → east                      [gate: void_key already held]
  → gold ≥ 30 + repair_lattice [flag lattice_repaired, item lattice_shard]
  → bond ≥ 70                 [talk_to_ai ×N or upgrade_ai]
  → east                      [gate: boss_gate = covenant OR ashen checklist]
  → face_elohim → claim_victory
```

**Covenant ending (primary):**

1. `faced_dragon`
2. `lattice_repaired`
3. AI bond ≥ `winGate.requireAiBond` (70)
4. Item `dragon_tear`
5. Item `lattice_shard`

**Ashen ending (sacrifice path):**

1. `faced_dragon`
2. `lattice_repaired`
3. `ai_sacrificed` (bond burned to 0 via `sacrifice_ai`)
4. Item `dragon_tear`
5. Item `lattice_shard`

Gates: `winGate` (covenant) and `sacrificeGate` (ashen) in `balance.json`. The chamber opens if **either** is complete; claim prefers covenant when both qualify. `game.ending` is `"covenant" | "sacrifice"` and is serialized + sent on `run_end`.

Fail: `health ≤ 0` **or** `sanity ≤ 0` → `game_over`. Incomplete claim deals sear damage (`claimFailHealth` / `claimFailSanity`).

## Difficulty knobs (`balance.json`)

| Knob | v1 | Role |
| --- | --- | --- |
| `goldScavengeMin/Max` | 10–60 | Entrance income |
| `talkBondGain` | 5 | Bond per talk (cap `talkBondCap`) |
| `battleDragonPowerMin/Max` | 30–50 | Dragon oppose roll vs `level*20 + ai.power` |
| `battleLoseHealth/Sanity` | 20 / 5 | Failed duel cost |
| `repairLatticeGold` | 30 | Shard price |
| `navigateSuccessChance` | 0.7 | Void navigation gamble |
| `navigateFailSanity` | 15 | Navigate fail cost (−5 with focusing chip) |
| `aiBondWinThreshold` / `requireAiBond` | 70 | Bond gate |
| `tickSeconds` | 1 | Real-time pressure |
| `randomEventChance` | 0.08 | Ambient noise |

**Balance targets (M1):** median run 8–12 min; first-time win rate ~35–50% after one loss. Tune via JSON only when possible.

## Content map

| File | Owns |
| --- | --- |
| `content/v1/zones.json` | exits, requiresExit, actions, art, entry/ambient beats, tutorial |
| `content/v1/items.json` | key + utility items |
| `content/v1/dialogue.json` | AI by bond/mood/location/reactive, objectives, randomEvents |
| `content/v1/encounters.json` | named encounters + `zoneAmbient[zoneId]` |
| `content/v1/balance.json` | balance + winGate + saveKey |

## Child AI

- Mood from bond + vitals + sacrifice flags (`js/core/state.js` / `js/core/ai.js`).
- Memory ring (~6); reactive rules fire once via `onceFlag`.
- Line priority: reactive → location → mood → bond tier.
