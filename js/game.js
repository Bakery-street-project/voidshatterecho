/**
 * Voidshatter Echo — browser shell.
 * Wires content, pure core, storage, and DOM.
 */

import { loadContent } from "./content/loader.js";
import {
  PHASES,
  addEvent,
  createDefaultState,
  restartRun,
  tick,
} from "./core/state.js";
import { performAction, KNOWN_ACTIONS } from "./core/actions.js";
import { travel } from "./core/travel.js";
import { SAVE_KEY, parseSave, serializeState } from "./core/save.js";
import { defaultRng, mulberry32, statelessRng } from "./core/rng.js";
import { onZoneArrive, onZoneTick } from "./core/beats.js";
import {
  ANALYTICS_KEY,
  appendEvent,
  runEnd,
  runStart,
  saveLoad,
} from "./core/analytics.js";
import { renderGame } from "./ui/render.js";

class VoidshatterEcho {
  constructor(content) {
    this.content = content;
    this.rng = defaultRng();
    this.loopTimer = null;
    this.paused = false;
    this.gameState = createDefaultState(content.balance);
    this.ctx = {
      balance: content.balance,
      winGate: content.winGate,
      sacrificeGate: content.sacrificeGate ?? null,
      dialogue: content.dialogue,
      encounters: content.encounters,
      items: content.items,
      rng: this.rng,
    };
    this.runEnded = false;
    this.init();
  }

  init() {
    this.setupEventListeners();
    if (this.tryLoadGame()) {
      this.track(saveLoad(this.gameState, "restore"));
    } else {
      this.applyArrivalBeats();
      this.addEvent("You arrive at the Void Entrance. The lattice hums eastward.");
      this.track(runStart(this.gameState));
    }
    this.render();
    this.startGameLoop();
  }

  arrivalRng(tag = "arrive") {
    const g = this.gameState.game;
    return statelessRng(g.seed, g.time, this.gameState.player.location, tag);
  }

  applyArrivalBeats() {
    this.gameState = onZoneArrive(
      this.gameState,
      this.content,
      this.arrivalRng("arrive")
    );
  }

  warnAiThresholds() {
    const s = this.gameState;
    if (s.game.phase !== PHASES.PLAYING) return;
    if (s.player.sanity < 30 && !s.game.flags.ai_warned_low_sanity) {
      this.gameState = { ...s, game: { ...s.game, flags: { ...s.game.flags, ai_warned_low_sanity: true } } };
      this.addEvent(
        'Child AI: "Your sanity is a candle in a wind that knows your name. Steady."'
      );
    } else if (this.gameState.player.health < 30 && !this.gameState.game.flags.ai_warned_low_health) {
      this.gameState = {
        ...this.gameState,
        game: {
          ...this.gameState.game,
          flags: { ...this.gameState.game.flags, ai_warned_low_health: true },
        },
      };
      this.addEvent('Child AI: "You are hurt. Find tonic or find cover — the void does not wait."');
    }
  }

  addEvent(message) {
    this.gameState = addEvent(this.gameState, message);
  }

  setupEventListeners() {
    document.addEventListener("click", (e) => {
      const el = e.target.closest(
        "[data-action],[data-travel],[data-new-game],[data-load-game],[data-pause],[data-export-save],[data-import-save]"
      );
      if (!el) return;
      if (el.dataset.action) {
        this.performAction(el.dataset.action);
        return;
      }
      if (el.dataset.travel) {
        this.travel(el.dataset.travel);
        return;
      }
      if (el.hasAttribute("data-pause")) {
        this.togglePause();
        return;
      }
      if (el.hasAttribute("data-export-save")) {
        this.exportSave();
        return;
      }
      if (el.hasAttribute("data-import-save")) {
        this.importSave();
        return;
      }
      if (el.hasAttribute("data-new-game")) {
        this.requestRestart();
        return;
      }
      if (el.hasAttribute("data-load-game")) {
        this.loadGame();
        return;
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.target && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) {
        return;
      }
      if (e.key === "p" || e.key === "P") {
        if (this.gameState.game.phase === PHASES.PLAYING) {
          this.togglePause();
        }
        return;
      }
      if (this.gameState.game.phase !== PHASES.PLAYING) {
        if (e.key === "Enter" || e.key === " ") {
          if (
            this.gameState.game.phase === PHASES.GAME_OVER ||
            this.gameState.game.phase === PHASES.VICTORY
          ) {
            e.preventDefault();
            this.requestRestart();
          }
        }
        return;
      }
      if (this.paused && e.key !== "p" && e.key !== "P") {
        if (e.key === "Escape") this.togglePause();
        return;
      }

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          this.travel("north");
          break;
        case "ArrowDown":
        case "s":
        case "S":
          this.travel("south");
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          this.travel("west");
          break;
        case "ArrowRight":
        case "d":
        case "D":
          this.travel("east");
          break;
        case " ":
          e.preventDefault();
          this.interact();
          break;
        case "Enter":
          this.performAction("talk_to_ai");
          break;
        case "k":
        case "K":
          this.saveGame(true);
          break;
        default:
          break;
      }
    });
  }

  startGameLoop() {
    if (this.loopTimer) clearInterval(this.loopTimer);
    const ms = (this.content.balance.tickSeconds ?? 1) * 1000;
    this.loopTimer = setInterval(() => {
      if (this.paused) return;
      const prevPhase = this.gameState.game.phase;
      this.gameState = tick(this.gameState, {
        balance: this.content.balance,
        rng: this.rng,
        randomEventMessages: this.content.dialogue.randomEvents,
      });
      if (this.gameState.game.phase === PHASES.PLAYING) {
        this.gameState = onZoneTick(
          this.gameState,
          this.content,
          this.arrivalRng(`tick_${this.gameState.game.time}`)
        );
        this.warnAiThresholds();
        this.saveGame(false);
      }
      this.maybeTrackRunEnd(prevPhase);
      this.render();
    }, ms);
  }

  maybeTrackRunEnd(prevPhase) {
    if (this.runEnded) return;
    const phase = this.gameState.game.phase;
    if (phase === prevPhase) return;
    if (phase === PHASES.GAME_OVER) {
      this.runEnded = true;
      this.track(runEnd(this.gameState, "fail"));
    } else if (phase === PHASES.VICTORY) {
      this.runEnded = true;
      this.track(runEnd(this.gameState, "win"));
    }
  }

  track(event) {
    try {
      const raw = localStorage.getItem(ANALYTICS_KEY);
      const buf = raw ? JSON.parse(raw) : [];
      localStorage.setItem(ANALYTICS_KEY, JSON.stringify(appendEvent(buf, event)));
    } catch {
      /* analytics must never break play */
    }
  }

  showToast(message) {
    const el = document.getElementById("vse-toast");
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.hidden = true;
    }, 1600);
  }

  togglePause() {
    this.paused = !this.paused;
    this.addEvent(this.paused ? "Run paused." : "Run resumed.");
    this.render();
  }

  requestRestart() {
    if (this.gameState.game.phase !== PHASES.PLAYING) {
      this.restartRun();
      return;
    }
    if (this.gameState.__confirmNewRun) {
      this.restartRun();
      return;
    }
    this.gameState = { ...this.gameState, __confirmNewRun: true };
    this.addEvent("Confirm New Run to wipe this browser save.");
    this.render();
  }

  exportSave() {
    try {
      const payload = serializeState(this.gameState);
      const text = JSON.stringify(payload);
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      window.prompt("Export save (copy OK):", text);
      this.showToast("Save exported");
    } catch {
      this.addEvent("Export failed.");
      this.render();
    }
  }

  importSave() {
    const text = window.prompt("Paste a Voidshatter Echo save JSON:");
    if (!text) return;
    const data = parseSave(text, () => createDefaultState(this.content.balance));
    if (!data) {
      this.addEvent("Import failed: not a valid v1 save.");
      this.render();
      this.showToast("Import failed");
      return;
    }
    this.gameState = data;
    this.runEnded = false;
    this.paused = false;
    this.saveGame(false);
    this.track(saveLoad(this.gameState, "import"));
    this.addEvent("Save imported.");
    this.render();
    this.showToast("Save imported");
  }

  performAction(action) {
    if (this.paused) return;
    if (this.gameState.game.phase !== PHASES.PLAYING) return;
    if (!KNOWN_ACTIONS.includes(action)) {
      this.addEvent(`Unknown action: ${action}`);
      this.render();
      return;
    }
    const prevPhase = this.gameState.game.phase;
    this.gameState = performAction(this.gameState, action, this.ctx);
    this.gameState = { ...this.gameState, __confirmNewRun: false };
    this.saveGame(false);
    this.showToast("Autosaved");
    this.maybeTrackRunEnd(prevPhase);
    this.render();
  }

  travel(direction) {
    if (this.paused) return;
    const prevPhase = this.gameState.game.phase;
    const result = travel(
      this.gameState,
      this.content.zones,
      direction,
      this.content.winGate,
      this.content.sacrificeGate ?? null
    );
    this.gameState = { ...result.state, __confirmNewRun: false };
    if (result.moved) {
      this.applyArrivalBeats();
      this.saveGame(false);
      this.showToast("Autosaved");
    }
    this.maybeTrackRunEnd(prevPhase);
    this.render();
  }

  interact() {
    const zone = this.content.zones[this.gameState.player.location];
    this.addEvent(
      zone?.actions?.length
        ? `You ready yourself near ${zone.name}. Choose an action.`
        : "You interact with your surroundings..."
    );
    this.render();
  }

  restartRun() {
    this.gameState = restartRun(this.content.balance);
    this.rng = mulberry32(this.gameState.game.seed);
    this.ctx.rng = this.rng;
    this.clearSave();
    this.runEnded = false;
    this.paused = false;
    this.applyArrivalBeats();
    this.addEvent("A new run begins at the Void Entrance.");
    this.track(runStart(this.gameState));
    this.render();
  }

  saveGame(explicit) {
    try {
      const payload = serializeState(this.gameState);
      localStorage.setItem(this.content.saveKey || SAVE_KEY, JSON.stringify(payload));
      this.gameState.meta.savedAt = payload.savedAt;
      if (explicit) {
        this.addEvent("Game saved to this browser.");
        this.showToast("Saved");
        this.render();
      }
      return true;
    } catch {
      if (explicit) {
        this.addEvent("Save failed: localStorage unavailable.");
        this.render();
      }
      return false;
    }
  }

  readSave() {
    try {
      const raw = localStorage.getItem(this.content.saveKey || SAVE_KEY);
      return parseSave(raw, () => createDefaultState(this.content.balance));
    } catch {
      return null;
    }
  }

  clearSave() {
    try {
      localStorage.removeItem(this.content.saveKey || SAVE_KEY);
    } catch {
      /* ignore */
    }
  }

  tryLoadGame() {
    const data = this.readSave();
    if (!data) return false;
    this.gameState = data;
    this.addEvent("Save restored from this browser.");
    return true;
  }

  loadGame() {
    const data = this.readSave();
    if (!data) {
      this.addEvent("No save found.");
      this.render();
      return;
    }
    this.gameState = data;
    this.runEnded = false;
    this.track(saveLoad(this.gameState, "manual"));
    this.addEvent("Save loaded.");
    this.render();
  }

  render() {
    renderGame(document.getElementById("game-container"), this.gameState, this.content, {
      paused: this.paused,
    });
  }
}

async function boot() {
  try {
    const content = await loadContent("content/v1");
    window.game = new VoidshatterEcho(content);
    window.VoidshatterEcho = VoidshatterEcho;
    window.VSE_SAVE_KEY = content.saveKey || SAVE_KEY;
  } catch (err) {
    const el = document.getElementById("game-container");
    if (el) {
      el.innerHTML = `<div class="end-screen game-over"><h2>Failed to load content</h2><p class="end-reason">${String(err.message || err)}</p></div>`;
    }
    console.error(err);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
