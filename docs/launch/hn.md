# Show HN — draft (do not submit yet)

**Title:** Show HN: Voidshatter Echo — a 15-minute browser RPG where dragons weep gold

**URL:** https://bakery-street-project.github.io/voidshatterecho/

---

I built a finishable web RPG loop in plain HTML/ES modules — no framework, no build step.

You play the Elohim Seeker: find a Void Key, cross a dragon realm, repair a screaming lattice, and bond with a Child AI before claiming victory in the Elohim Chamber. Fail if health or sanity hits zero.

What I care about showing:

- Pure game core (`js/core/*`) separate from DOM/storage so the rules are unit-tested with `node --test`
- Content as versioned JSON (`content/v1/`) — zones, dialogue, balance, seeded ambient encounters
- Full-run localStorage save + autosave
- Playwright E2E for boot / fail / restart / save roundtrip

Live: https://bakery-street-project.github.io/voidshatterecho/  
Source: https://github.com/Bakery-street-project/voidshatterecho  
Design notes: docs/DESIGN.md · Roadmap: docs/ROADMAP.md

Feedback wanted on pacing (target 8–12 min) and whether the Child AI bond reads as a character rather than a meter.

---

## Submission checklist (when ready)

- [ ] License decision (B2) settled so the repo link is honest
- [ ] Live URL 200 on `/` and `/game.html`
- [ ] External playtest notes in `docs/PLAYTEST.md`
- [ ] Analytics events flowing (`run_end` at minimum)
- [ ] Prefer Tue–Thu morning US; avoid launch spam in multiple threads same day
