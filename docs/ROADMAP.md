# Voidshatter Echo — Idea → Playable Product Roadmap

**Status date:** 2026-09-24  
**Live v1:** https://bakery-street-project.github.io/voidshatterecho/  
**Repo:** `Bakery-street-project/voidshatterecho` · default branch `main`  
**Engine today:** static HTML/JS/CSS, ~936 LOC `js/game.js`, no build step  
**Authoring stack:** opencode + Jev judgments + Baker Street Laboratory (factory) content later  

This is the single plan from **idea → shipped, maintainable video game**, covering product, frontend, backend, content, art, audio, QA, live ops, and monetization. Phases are ordered; each has exit criteria. Do not start a phase until the previous phase’s **Exit** is true.

---

## 0. Product thesis (locked)

| Layer | Decision |
| --- | --- |
| Fantasy | Cyberpunk mythic-horror RPG: dragons weep gold, lattice voids scream, Child AI decides if you leave |
| v1 fantasy | One gated zone path, one run, fail/win, save/resume — **finishable in ~10–15 minutes** |
| Audience | itch/HN/Reddit indie web players; later Godot/desktop players |
| Non-goals (until Phase 4+) | NFT market, weekly shard-wars multiplayer, full nine-faction campaign, desktop wrapper as day-one |
| IP sources | This repo is primary product; Elohim Shards lore/quest JSON is **optional content pack** (license: CC BY 4.0 content + watermark rules in `elohim-forge`) |
| License tension | `LICENSE` is proprietary while Pages is public — **decide before paid marketing** (Phase 2 gate) |

**North-star loop (all phases must protect this):**  
`enter → travel (gated) → act → risk (HP/sanity) → progress flags/items → fail | win → restart or meta-progress`

---

## 1. Where we are (shipped baseline)

### 1.1 Done — v1 vertical slice (2026-09-24)

- [x] Gated zones: Void Entrance → Dragon Realm (`void_key`) → Lattice Void → Elohim Chamber (checklist)
- [x] Hybrid travel: buttons + WASD/arrows on real exits
- [x] Fail: health ≤ 0 **or** sanity ≤ 0 → Game Over + Restart
- [x] Win: face dragon + repair lattice + AI bond ≥ 70 + Dragon Tear + Lattice Shard → Claim Victory
- [x] Inventory UI: `void_key`, `dragon_tear`, `lattice_shard`
- [x] Full-run `localStorage` save `voidshatterecho_save_v1` (autosave + `K`)
- [x] README, fixed org URLs, smoke script `scripts/smoke.js`
- [x] Commit `132f653` pushed to `main`
- [x] GitHub Pages **enabled and built** (legacy Pages from `main` `/`)

### 1.2 Baseline metrics

| Signal | Value |
| --- | --- |
| Public URL | 200 on `/`, `/game.html`, `/js/game.js`, `/css/game.css` |
| Local test | `npm test` → `node --check` + DOM hook smoke |
| Custom Actions (Smoke / CodeQL) | **Blocked:** account locked for billing — jobs never start |
| Branch protection expected checks | `security-scan`, `code-quality` (not Smoke) |
| Stars / players | 0 / unknown — need instrumentation before growth work |

### 1.3 Immediate blockers (do these first)

| # | Blocker | Owner action | Unblocks |
| --- | --- | --- | --- |
| B1 | GitHub Actions **billing lock** | Fix billing on the org/account that owns Actions minutes | Smoke CI, CodeQL, future deploy jobs |
| B2 | Proprietary LICENSE vs public Pages | Choose: (a) keep proprietary + “source available, no commercial use”, (b) switch game to MIT/CC, (c) keep code public but add clear “all rights reserved” + contact | Marketing, PRs, factory contributions |
| B3 | No telemetry | Add privacy-light play events (Phase 2) | Balance, funnel, retention |
| B4 | Single-file engine | Extract modules before content explosion (Phase 3) | Testability, multi-zone, backend |

---

## 2. Phase map (start → finish)

```text
Phase 0  Stabilize          ████████  (now → +3 days)
Phase 1  Content depth      ████████████  (+1–2 weeks)
Phase 2  Productize web     ████████████  (+2–3 weeks)
Phase 3  Architecture       ████████████████  (+3–5 weeks)
Phase 4  Backend + accounts ████████████████████  (+5–8 weeks)
Phase 5  Craft: art/audio/UI ████████████████  (+6–9 weeks, parallel after P2)
Phase 6  Campaign + systems ████████████████████  (+9–14 weeks)
Phase 7  Multiplayer/meta   ████████████  (post-v1, optional)
Phase 8  Ship, market, live ████████████  (continuous from P2, peak at P6)
```

**Recommended public milestones**

| Milestone | Name | When | Definition |
| --- | --- | --- | --- |
| M0 | **Playable public** | Done | URL works, loop saves, fail/win exist |
| M1 | **Review-ready** | +2 w | Balance, tutorial, analytics, license clear, 15-min no-crash |
| M2 | **Modular v1.1** | +4 w | Modules, content JSON, unit tests, factory content PR |
| M3 | **Backend beta** | +7 w | Accounts, cloud saves, leaderboards (opt-in) |
| M4 | **Vertical campaign** | +12 w | 3–5 zones, arc ending, art/audio pass, trailer |
| M5 | **1.0** | +16–20 w | Steam/itch web or Godot export decision executed |

---

## 3. Phase 0 — Stabilize (days 0–3)

**Goal:** Trust the public build; remove shame-red CI; make the next change safe.

### Work

1. **Billing:** restore GitHub Actions minutes (B1); re-run Smoke until green.
2. **CI contract (once Actions work):**
   - Required on PR: `node --check`, `scripts/smoke.js`, secret-pattern scan.
   - Keep `ubuntu-latest`; pin Node 20.
   - Map branch protection contexts to real check names (`security-scan` / `code-quality` must be provided by real jobs or replaced — today they are aspirational names).
3. **License decision (B2):** write final `LICENSE` + README badge; if staying proprietary, add `CONTRIBUTING` “patches by invitation” line so Issues don’t imply OSS.
4. **Playtest script:** 15-minute manual path documented in `docs/PLAYTEST.md` (exact click order for key → dragon → lattice → bond → chamber).
5. **Hotfix channel:** GitHub Issue templates → “balance”, “crash”, “save corrupt”.
6. **Org links:** add game link to org profile README / `.github` community README.

### Exit criteria

- [ ] Live URL 200 and smoke-tested in two browsers (Chromium + Firefox).
- [ ] Actions billing fixed **or** documented waiver + local pre-push hook runs `npm test`.
- [ ] License text matches how you want strangers to use the source.
- [ ] One external playtester completes a run (win or fair fail).

---

## 4. Phase 1 — Content depth on the existing engine (weeks 1–2)

**Goal:** Make the one path feel like a game, not a tech demo — still pure client.

### 4.1 Design content (no backend)

| Deliverable | Detail |
| --- | --- |
| Zone beats table | Per location: 3–5 actions with costs, rewards, sanity risks, flavor lines |
| Enemy/encounter table | Dragon variants, void hazards, lattice events — seeded RNG optional |
| Item rules | Keep 3 key items for win gate; add 0–3 utility items max (tonic, focusing chip) |
| AI dialogue bank | 20–40 lines keyed to bond tiers; pull flavor from Elohim voices **only if license OK** |
| Tutorial | First-run coach marks on Discover Secrets / East / checklist |
| Difficulty knobs | JSON or consts: bond win threshold, gold costs, damage ranges |

### 4.2 Implement

- [ ] Seeded RNG helper for reproducible tests.
- [ ] Dialogue/encounter tables externalized to `content/v1/*.json` loaded by fetch (still static).
- [ ] Balance pass: median run 8–12 min; win rate target 35–50% after first loss.
- [ ] Save schema `version: 2` migration if flags grow.
- [ ] `docs/DESIGN.md` — zone map ASCII + win funnel.

### 4.3 Jev (engineering gates)

Run small Jev batches before large scope cuts:

- encounter reward curve vs fail rate  
- whether to add status effects (corruption) in v1.1 or defer  
- content pack: import Elohim quest ribbon vs stay original  

Persist requests/responses under `docs/jev/`.

### Exit criteria

- [ ] 10 random playtests, no soft-locks; save load works after each.
- [ ] Content lives in JSON, not hard-coded only in `game.js`.
- [ ] README “How to win” matches actual gates.

---

## 5. Phase 2 — Productize the web game (weeks 2–3)

**Goal:** Feels like a product page + game; you can measure and iterate.

### Frontend product surface

| Piece | Spec |
| --- | --- |
| Landing | Title, GIF/loop, Play, controls, credits, license, “report bug” |
| In-game UX | HP/sanity always visible; checklist persistent; inventory tooltips; toast for autosave |
| Feedback | Pause; confirm New Run; export/import save string (share backup) |
| a11y | Keyboard-only path; focus rings; reduced-motion; aria-live for events |
| Perf | Lazy images; no framework; total JS budget &lt; 150 KB gz for game shell |
| Meta | OG tags, favicon, `manifest.webmanifest`, theme-color |

### Analytics (privacy-light)

- Events: `run_start`, `run_end{win|fail, zone, time, level}`, `save_load`, `death_cause`, `tutorial_step`.
- Tooling options (pick one): Plausible / GoatCounter / self-host later.
- **No PII** until Phase 4 accounts.

### QA harness

| Layer | Tool | When |
| --- | --- | --- |
| Unit | Node test runner on pure logic (gates, inventory, RNG) | Phase 2–3 |
| DOM smoke | keep `scripts/smoke.js` | now |
| Browser E2E | Playwright: boot, discover key, travel, fail, restart, save roundtrip | Phase 2 |
| Visual | Screenshot smoke of end screens | Phase 3 |

### Exit criteria

- [ ] E2E green in CI (after billing fix).
- [ ] ≥100 runs of analytics with `run_end` breakdown.
- [ ] Landing + game share one design system (CSS tokens).

---

## 6. Phase 3 — Frontend architecture (weeks 3–5)

**Goal:** Codebase can grow zones/systems without collapsing into one 3k-line file.

### Target structure (static-first, optional bundler)

```text
voidshatterecho/
  index.html                 # landing
  game.html                  # shell
  css/
    tokens.css
    game.css
  js/
    main.js                  # bootstrap
    core/
      state.js               # pure state + reducers
      rng.js
      save.js                # schema versioning, migration
      events.js
    systems/
      travel.js
      combat.js
      inventory.js
      economy.js
      ai_bond.js
      victory.js
    ui/
      render.js              # or tiny renderer
      screens/               # playing, gameover, victory, menu
    content/
      loader.js
  content/
    v1/
      zones.json
      encounters.json
      dialogue.json
      items.json
  tests/
    state.test.js
    victory.test.js
    save.test.js
  e2e/
    run.spec.ts
  scripts/smoke.js
```

### Rules

1. **Pure core, impure edges:** `state` + systems are pure functions `(state, action) → state`; DOM/localStorage/network only in adapters.
2. **Illegal states unrepresentable:** phases are a discriminated union; travel only via `canExit(state, dir)`.
3. **No silent catch:** save failures surface in UI event log.
4. **Content is data:** designers edit JSON; code reads schema (validate with a tiny schema check in CI).
5. **Bundler optional:** start with native ES modules (`type="module"`); add Vite only if import maps hurt.

### Factory hook (org synergy)

- Baker Street Laboratory / `go-ai-coder` generate **content PRs** (dialogue, encounter yaml → JSON).
- DoD for factory demo: one issue → content PR → human merge → smoke green.

### Exit criteria

- [ ] `game.js` monolith gone or reduced to shim; coverage on pure systems ≥ meaningful gates (victory, save migrate, travel).
- [ ] Content pack from factory opens as real PR once.

---

## 7. Phase 4 — Backend (weeks 5–8) — only after M2

**Goal:** Accounts, cloud saves, leaderboards, optional async “echoes” — without betraying the offline-first web game.

### 7.1 Principles

1. **Offline-first:** localStorage remains source of truth; backend is sync/backup.
2. **Thin API:** JSON over HTTPS; no GraphQL until needed.
3. **Auth:** passkey or magic link preferred; GitHub OAuth acceptable for beta.
4. **No blockchain** in critical path.
5. **Region:** single small region first (e.g. Fly/Render/Cloudflare + Neon/Turso).

### 7.2 System design

```text
Browser (static game)
  │  HTTPS JSON
  ▼
API gateway / edge (Cloudflare Workers or Fastify on Fly)
  ├── Auth service        (sessions / JWT short-lived)
  ├── Save service        (versioned blobs, conflict = higher version or timestamp+etag)
  ├── Profile service     (display name, settings)
  ├── Leaderboard service (periodic top runs; anti-cheat light)
  ├── Content CDN         (signed content packs / feature flags)
  └── Analytics sink      (batched events)
  │
  ├── Postgres            (users, saves metadata, scores)
  ├── Object storage      (optional full save blobs)
  └── Redis (optional)    (rate limit, sessions)
```

### 7.3 API surface (v1 backend)

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/github` or `/auth/magic` | establish session |
| GET | `/me` | profile |
| GET/PUT | `/saves/active` | cloud save (etag) |
| GET | `/saves/:id` | restore |
| GET | `/leaderboards/global?window=week` | top scores |
| POST | `/runs` | submit completed run (server timestamps) |
| POST | `/analytics/batch` | client events |
| GET | `/content/v2/manifest` | feature-flagged content |

### 7.4 Save sync algorithm

1. Client keeps `localVersion` and `deviceId`.
2. On load: fetch remote if newer; offer “Use cloud / Use local”.
3. On save: `PUT` with `If-Match` etag; on 409, resolve (newest wins or merge by `updatedAt` + player progress flags union for beta).
4. Never block play on network; queue writes.

### 7.5 Anti-cheat (honest limits)

- Client remains authoritative for single-player fun.
- Server validates **shape** of submitted runs (levels reachable, inventory subset, time ≥ min).
- Leaderboards marked “untrusted casual” until Phase 7 competitive mode.

### 7.6 Security checklist

- [ ] Rate limit auth + save writes  
- [ ] Helmet/CORS locked to Pages origin  
- [ ] Secrets in GitHub Actions / platform secrets only  
- [ ] PII minimized; GDPR delete endpoint  
- [ ] Dependency audit + secret scan (align with graveyard-forensics hygiene)

### Exit criteria

- [ ] Beta users sync saves across devices.
- [ ] Leaderboard shows week top 20 with light validation.
- [ ] Load test: 100 RPS read path without incident (soak).
- [ ] Runbook: `docs/RUNBOOK.md` (deploy, rollback, rotate keys).

---

## 8. Phase 5 — Craft: art, UI, audio (weeks 4–9, parallel)

**Goal:** Ship something that looks and sounds intentional without boiling the ocean.

### Art pipeline

| Tier | Approach |
| --- | --- |
| T0 (now) | Typography + gradient + existing PNG/JPG placeholders |
| T1 | Consistent palette from `palettes.json` or original tokens; pixel frames for 4 locations |
| T2 | Character/dragon sprites (Aseprite or commissioned); 9-slice UI |
| T3 | Portrait set for AI bond stages; death/victory key art |

**Rules:** one art bible `docs/ART.md` (palette hex, 16/32px grid, no random AI slop without human pass).

### UI

- Screen reader labels; focus order; mobile thumb targets for buttons.
- Gamepad later (Phase 6), not blocking.

### Audio

| Layer | Plan |
| --- | --- |
| SFX | Click, error, gold, heal, death, victory (CC0 or commissioned) |
| Ambient | Low drone + lattice scream loop per zone |
| Music | 1 theme + 1 victory motif (loopable, &lt; 2 min) |
| Tool | Howler.js or Web Audio raw; respect autoplay policies (start on first gesture) |

### Exit criteria

- [ ] No stock “unfinished template” visual language.
- [ ] Mute toggle; volume persists in save/meta.
- [ ] Audio does not break silent autoplay environments.

---

## 9. Phase 6 — Campaign & systems (weeks 8–14)

**Goal:** From one loop → a **complete game** worth 1.0.

### Scope ladder (choose one track by Jev + playtest data)

| Track | Scope | Approx build |
| --- | --- | --- |
| **A. Web campaign (recommended)** | 4–6 zones, 2 endings, meta unlocks (titles, starting loadout) | 6–8 weeks |
| **B. Godot vertical** | Port loop to Godot, keep JSON content, export web+desktop | 8–12 weeks |
| **C. Elohim merge** | Faction/quest graph grafted onto Voidshatter systems | high risk; only if lore license + clear owner |

### Systems backlog (priority order)

1. Status effects (corruption, static) — affects sanity drain  
2. Loadout / meta unlocks between runs  
3. Codex (collected lore entries)  
4. Shop sink for gold (already partial via upgrade AI)  
5. Boss phase 2 / alternate win (sacrifice AI path — currently flavor only)  
6. New Game+ modifiers  
7. Localization scaffold (i18n keys from day of first long text)

### Content factory loop

```text
Issue (lore brief) → Lab agent drafts JSON → PR → schema+unit tests
  → human edit → smoke+E2E → merge → Pages auto-deploy
```

### Exit criteria

- [ ] Crit path ≥ 45 minutes with 2 distinct endings.
- [ ] Achievement/flag list frozen; save migrations tested.
- [ ] Trailer script + 60s capture.

---

## 10. Phase 7 — Multiplayer / “Shard Wars” (post-1.0, optional)

Only after M5. Do **not** promise weekly NFT wars in README until designed.

| Mode | Minimal viable | Later |
| --- | --- | --- |
| Async ghosts | Submit path seed + outcome; watch replay | Full replay system |
| Weekly seed run | Global seed, same RNG, leaderboard | Rewards |
| Co-op | — | after netcode budget exists |
| NFT/crypto | — | separate product decision + legal; default **no** |

Backend additions: replay storage, authoritative weekly seed, rate limits, economy for cosmetics (fiat first).

---

## 11. Phase 8 — Distribution, monetization, live ops (continuous)

### Distribution (aligned with Graveyard Forensics / estate plan)

| Channel | Asset |
| --- | --- |
| itch.io | WebGL/HTML build + GIF |
| HN Show | 300-word post: loop, save, open process |
| Reddit | r/webgames, r/indie gaming — gameplay video |
| X | GIF thread + devlog |
| Org Pages | link from bakery-street-project.github.io |
| Steam (later) | Godot or Electron wrapper after M5 |

### Monetization options (decide at M3+, not before license B2)

| Model | Fit |
| --- | --- |
| Free + tip | Lowest friction; good for audience build |
| Pay-what-you-want itch | Same |
| $5–$9 premium web/desktop | After campaign depth (M4) |
| Cosmetic meta | Only with backend accounts |
| Bundle with estate products | Separate from game purity |

**Do not** attach live Stripe to the game until ops + refund policy exist (Graveyard test-mode link stays for the audit product).

### Live ops

- Weekly content pack flag (`/content/manifest`)  
- Status page + `CHANGELOG.md`  
- Crash/error beacon (Sentry or lightweight)  
- Quarterly “estate hygiene”: secrets scan, dependency audit (reuse graveyard tooling)

### Exit criteria for “launched”

- [ ] 3 channels posted with same URL and one trailer/GIF.  
- [ ] ≥50 `run_end` events with &lt;5% technical crash rate.  
- [ ] Backlog groomed; no README promises you didn’t ship.

---

## 12. Frontend vs backend responsibility matrix

| Concern | Frontend (Phase 0–3) | Backend (Phase 4+) |
| --- | --- | --- |
| Game rules | **Authoritative offline** | Validate shape of submitted runs |
| Save | localStorage + export string | Cloud backup, sync, conflict |
| Identity | Anonymous device id | Accounts |
| Content | Static JSON | Versioned packs, flags, A/B |
| Leaderboard | Local best | Global week boards |
| Payments | None | Later, separate service |
| Analytics | Fire-and-forget | Aggregate + retention |
| Anti-cheat | None (PvE) | Light validation for boards |

---

## 13. Engineering standards (apply every phase)

1. **Pure functions** for rules; adapters for IO.  
2. **Explicit errors** — failed save/load always visible.  
3. **Schema-versioned saves** with migration tests.  
4. **Deterministic RNG** in tests (`rng(seed)`).  
5. **CI:** syntax → unit → smoke → E2E (layer as phases land).  
6. **No secrets** in repo; scan before every push.  
7. **Commits:** small, conventional (`feat:`, `fix:`, `content:`, `chore:`).  
8. **Jev:** use for scope/architecture forks; never as substitute for playtests.  
9. **Factory:** prefer generating content/tests via lab over greenfield stubs.  
10. **Definition of done:** merged + tested + documented + URL still 200.

---

## 14. Risks & mitigations

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| GitHub billing blocks all CI | High (active) | Fix billing; local `npm test` pre-push meanwhile |
| Scope creep to 9 factions + NFT | High | Phase ladder; Jev non-goals; README honesty |
| Monolith rewrite stall | Medium | Strangler: extract pure modules first, keep HTML shell |
| License confusion blocks contributors | Medium | B2 decision in Phase 0 |
| Elohim content license/watermark misuse | Medium | Keep separate; attribute; don’t strip `_metadata` |
| No players → no feedback | Medium | Analytics at M1; post at M1 not M5 |
| Backend before content | Medium | Hard gate: no Phase 4 until M2 |
| Art bottleneck | Medium | T1 typography-only still shippable |

---

## 15. 90-day execution calendar (concrete)

| Days | Focus | Deliverables |
| --- | --- | --- |
| 0–3 | Stabilize | Billing, license, playtest doc, org links, CI green |
| 4–14 | Content + balance | JSON encounters/dialogue, tutorial, 10 playtests |
| 15–21 | Productize | Landing polish, analytics, E2E, M1 release notes |
| 22–35 | Modularize | ES modules, pure tests, factory content PR (M2) |
| 36–56 | Backend beta | Auth, cloud save, leaderboard, runbook (M3) |
| 40–63 | Craft parallel | Palette, SFX, UI pass |
| 57–84 | Campaign | Zones 2–3, endings, trailer capture (M4→M5 path) |
| 85–90 | Launch prep | itch + HN draft, load test, changelog, 1.0 RC |

---

## 16. Idea backlog (parked, prioritized when phase unlocks)

1. **Sacrifice-AI true ending** — currently penalty only; make alternate victory.  
2. **Void key as weapon** — spend key for one emergency escape.  
3. **Daily seed** — same layout gifts.  
4. **Codex + lore from** `elohim-forge/docs` with attribution.  
5. **Godot port** — evaluate after M4 if desktop demand appears.  
6. **Mobile controls** — big hit targets + swipe travel.  
7. **Spectator “echo” replays** — Phase 7.  
8. **Factory-generated side quests** — weekly PR cadence.

---

## 17. First week task list (start here)

| # | Task | Phase | Done when |
| --- | --- | --- | --- |
| 1 | Fix GitHub Actions billing; re-run Smoke to green | 0 | Check green on `main` |
| 2 | Resolve LICENSE vs public URL (B2) | 0 | LICENSE + README consistent |
| 3 | External 15-min playtest + write `docs/PLAYTEST.md` notes | 0 | One stranger finishes a run |
| 4 | Link game from org README | 0 | Clickable from org profile |
| 5 | Extract `victory` + `save` into pure modules with unit tests | 3 early | `npm test` covers gates |
| 6 | Move dialogue/encounters to `content/v1/*.json` | 1 | No balance numbers hard-coded only |
| 7 | Add privacy-light `run_end` analytics | 2 | Dashboard or raw feed shows events |
| 8 | Playwright: save roundtrip + fail screen | 2 | CI job (post-billing) |
| 9 | Draft HN “Show HN” post (don’t submit yet) | 8 | Stored in `docs/launch/hn.md` |
| 10 | Backlog grooming: mark Phase 7 NFT as out-of-scope until M5 | all | README + issues clean |

---

## 18. Success metrics by milestone

| Milestone | Primary metric | Guardrail |
| --- | --- | --- |
| M0 | URL 200, loop completes | No save-corrupt reports |
| M1 | Completion rate ≥ 30% among starts | Crash-free ≥ 95% |
| M2 | Median run length 8–12 min | Unit+smoke green |
| M3 | Sync success ≥ 99% | No PII leaks |
| M4 | Wishlists / email list growth | Content cadence holds |
| M5 / 1.0 | Paid conversion or large free audience | Support load manageable |

---

## 19. How to use this document

- **Engineering:** implement phase order; update checkboxes in PRs.  
- **Design:** Phase 1 tables are source of truth until `DESIGN.md` supersedes detail.  
- **Ops:** Phase 0 B1/B2 are the only accepted blockers.  
- **Jev:** re-ask architecture questions at Phase 3 and Phase 4 gates; store JSON under `docs/jev/`.  
- **Factory:** first content PR is the org’s living proof of `issue → merged PR`.

---

## Appendix A — v1 control reference (as shipped)

| Input | Effect |
| --- | --- |
| WASD / Arrows | Travel exits |
| Enter | Talk to Child AI (+bond) |
| K | Manual save |
| Space | Interact prompt |
| Buttons | Actions / New Run / travel |

**Win checklist:** faced dragon · lattice repaired · AI bond ≥ 70 · Dragon Tear · Lattice Shard  

**Save key:** `voidshatterecho_save_v1`

## Appendix B — Related docs

- `README.md` — player-facing  
- `scripts/smoke.js` — CI hooks  
- `../monetization-launch/jev-voidshatter-completion-notes-2026-09-24.md` — Jev slice decisions  
- `../monetization-launch/jev-bakery-factory-game-plan-2026-09-24.md` — factory + game joint plan  
- Org: Baker Street Laboratory spine for content automation  
