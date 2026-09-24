# Voidshatter Echo

Cyberpunk mythic-horror RPG: dragons weep gold, lattice voids scream, and a Child AI decides whether you leave.

**Play:** [bakery-street-project.github.io/voidshatterecho](https://bakery-street-project.github.io/voidshatterecho/)

## About

You are the Elohim Seeker. Cross one gated zone path, bind the Child AI, and open the Elohim Chamber before divine fire ends the run.

- **Loop:** travel → actions → fail/win → restart
- **Fail:** health **or** sanity hits 0
- **Win:** chamber checklist — face a dragon, repair the lattice, AI bond ≥ 70, hold **Dragon Tear** + **Lattice Shard**
- **Save:** full run state in `localStorage` (`voidshatterecho_save_v1`), autosave each action

## How to play

1. Open `game.html` (or the live Pages URL).
2. At **Void Entrance**, use **Discover Secrets** for the **Void Key**.
3. Go **East** to the **Dragon Realm** — battle or collect tears; get the **Dragon Tear**.
4. With the key, go **East** to the **Lattice Void** — raise gold, **Repair Lattice** for the **Lattice Shard**.
5. Bond the AI to **70+** (talk, upgrade).
6. Enter the **Elohim Chamber** and **Claim Victory**.

### Controls

| Input | Action |
| --- | --- |
| WASD / Arrows | Travel (gated exits) |
| Enter | Talk to Child AI |
| K | Manual save |
| Space | Interact prompt |
| Buttons | Actions, travel, restart |

## Local run

```bash
git clone https://github.com/Bakery-street-project/voidshatterecho.git
cd voidshatterecho
npm start
# open http://localhost:8000/game.html
```

Static HTML/JS/CSS only — no build step.

## Smoke test

```bash
npm test
```

Runs `node --check` on the engine and asserts required DOM/action hooks.

## Out of scope (v1)

NFT market, weekly multiplayer, full nine-faction campaign, desktop wrapper.

Lore cousins live in the org’s Elohim Shards materials; this repo ships the finishable web loop only.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Proprietary — see [LICENSE](LICENSE). `package.json` references the same file; do not assume MIT.

## Security

See [SECURITY.md](SECURITY.md).
