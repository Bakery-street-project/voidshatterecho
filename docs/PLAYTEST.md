# Voidshatter Echo — 15-minute playtest

Use this exact path for a fair first run (win or clean fail). Time each section.

**Setup:** Chromium or Firefox, desktop, sound optional. Clear site data for the origin first (or open a private window). Start at the live URL or `npm start` → `http://localhost:8000/game.html`.

## Path (target ≤ 15 min)

| Step | Where | Do | Expect |
| --- | --- | --- | --- |
| 0 | Landing | Open page, note load time, click **Play Now** | Game shell + zone art visible in ≤ 3s |
| 1 | Void Entrance | Read tutorial + objectives | Hint mentions Discover Secrets + East |
| 2 | Void Entrance | **Discover Secrets** | Void Key in inventory; flag key ✓ |
| 3 | Void Entrance | **Talk to AI** ×2–3 | Bond rises; mood line changes |
| 4 | Void Entrance | Optional: **Collect Gold** / **Scavenge Tonic** | Gold or tonic; no soft-lock |
| 5 | Void Entrance | Travel **East** (button or `D`) | Arrive Dragon Realm; entry beat once |
| 6 | Dragon Realm | **Battle Dragon** then **Collect Tears** | `faced_dragon` ✓; Dragon Tear if win/tears |
| 7 | Dragon Realm | **Upgrade AI** if gold ≥ 50; keep talking | Bond toward 70 |
| 8 | Dragon Realm | Travel **East** (needs Void Key) | Arrive Lattice Void or locked toast/event |
| 9 | Lattice Void | **Collect Gold** / **Discover Secrets** until ≥ 30 gold | Gold for repair |
| 10 | Lattice Void | **Repair Lattice** | Lattice Shard; flag lattice ✓ |
| 11 | Lattice Void | Raise bond to **70+** (Talk / Upgrade) | Checklist bond line done |
| 12 | Lattice Void | Travel **East** | Elohim Chamber (gate open only if full checklist) |
| 13 | Chamber | Confirm checklist all ● | Gate open message |
| 14 | Chamber | **Face Elohim** then **Claim Victory** | Victory screen **or** sear damage if incomplete |

## Also verify (even on fail)

- **Fail path:** let health or sanity hit 0 → Game Over + reason → **Restart Run** works.
- **Save:** press `K` (or wait for autosave), reload page → progress restored.
- **Pause:** pause stops the tick clock; resume continues.
- **Export/Import:** export save string, clear storage, import → same location/gold/bond.
- **Keyboard only:** WASD/arrows, Enter (talk), K (save), Space (interact) — no mouse required for core loop.
- **No console errors** on boot, travel, fail, restart.

## Notes template

```text
Date / browser / OS:
Time to first action:
Time to key / dragon / lattice / chamber / end:
Win or fail + cause:
Soft-locks or unreadable UI:
Balance feel (too hard / fair / too easy):
Save issues:
Other:
```

File notes as a GitHub issue with the **balance**, **crash**, or **save corrupt** template when something is wrong.
