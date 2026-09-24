# Voidshatter Echo

Cyberpunk mythic-horror RPG: dragons weep gold, lattice voids scream, and a Child AI decides whether you leave.

**Play:** [bakery-street-project.github.io/voidshatterecho](https://bakery-street-project.github.io/voidshatterecho/)

## About

You are the Elohim Seeker. Cross one gated zone path, bind the Child AI, and open the Elohim Chamber before divine fire ends the run.

- **Loop:** travel → actions → fail/win → restart
- **Fail:** health **or** sanity hits 0
- **Win (two endings):** **Covenant** — face a dragon, repair the lattice, AI bond ≥ 70, hold **Dragon Tear** + **Lattice Shard**; or **Ashen** — same except burn the Child AI's bond to 0 via Sacrifice AI
- **Save:** full run state in `localStorage` (`voidshatterecho_save_v1`), autosave each action
- **World:** zone entry/ambient beats + seeded ambient encounters (run `seed` in the header)
- **Child AI:** mood, short-term memory, location/mood/reactive dialogue — bond changes how it answers

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
| P / Escape | Pause / resume |
| Buttons | Actions, pause, export/import save, restart |

## Local run

```bash
git clone https://github.com/Bakery-street-project/voidshatterecho.git
cd voidshatterecho
npm start
# open http://localhost:8000/game.html
```

Optional local CI gate while GitHub Actions billing is locked:

```bash
npm run hooks   # git config core.hooksPath .githooks → pre-push runs npm test
npm test        # syntax + unit + smoke + content schema + security scan
npm run test:e2e
npm run test:balance
```

Static HTML/ES modules/CSS only — no build step. Content lives in `content/v1/*.json`.

### Layout

- `js/core/` — pure rules (state, travel, victory, actions, save, rng, **ai**, **beats**, **analytics**)
- `js/ui/` — DOM rendering (zone art, AI portrait/mood/memory)
- `js/content/loader.js` — loads `content/v1`
- `content/v1/` — zones (entry/ambient beats + art), items, dialogue (AI layers), encounters (`zoneAmbient`), balance
- `assets/` — optimized art only (webp/jpg derivatives; multi-MB sources stay untracked by the live path)
- `css/tokens.css` + `css/game.css` — shared design tokens
- `scripts/` — smoke, content schema, security scan, balance bot
- `tests/core.test.js` — unit tests for the loop, AI, beats, analytics, save migration
- `e2e/run.mjs` — Playwright boot/key/fail/restart/save suite (`npm run test:e2e`)
- `docs/PLAYTEST.md` · `docs/DESIGN.md` · `docs/launch/hn.md` · `docs/jev/`

## Smoke test

```bash
npm test
```

Runs syntax checks, unit tests (`node --test`), DOM/content smoke, content schema, and secret/ESM hygiene scan.

## Out of scope (v1)

NFT market, weekly multiplayer, full nine-faction campaign, desktop wrapper — **explicitly out of scope until M5 / Phase 7 unlocks** (see `docs/ROADMAP.md` §16 backlog). Do not open NFT issues for v1.

Lore cousins live in the org’s Elohim Shards materials; this repo ships the finishable web loop only.

## Roadmap

Full idea → playable product plan (frontend, backend, content, art, QA, live ops):  
**[docs/ROADMAP.md](docs/ROADMAP.md)**

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Proprietary — see [LICENSE](LICENSE). `package.json` references the same file; do not assume MIT.

## Security

See [SECURITY.md](SECURITY.md).
