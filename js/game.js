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
import { defaultRng } from "./core/rng.js";
import { renderGame } from "./ui/render.js";

class VoidshatterEcho {
  constructor(content) {
    this.content = content;
    this.rng = defaultRng();
    this.loopTimer = null;
    this.gameState = createDefaultState(content.balance);
    this.ctx = {
      balance: content.balance,
      winGate: content.winGate,
      dialogue: content.dialogue,
      encounters: content.encounters,
      items: content.items,
      rng: this.rng,
    };
    this.init();
  }

  init() {
    this.setupEventListeners();
    if (!this.tryLoadGame()) {
      this.addEvent("You arrive at the Void Entrance. The lattice hums eastward.");
    }
    this.render();
    this.startGameLoop();
  }

  addEvent(message) {
    this.gameState = addEvent(this.gameState, message);
  }

  setupEventListeners() {
    document.addEventListener("click", (e) => {
      const el = e.target.closest(
        "[data-action],[data-travel],[data-new-game],[data-load-game]"
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
      if (el.hasAttribute("data-new-game")) {
        this.restartRun();
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
      if (this.gameState.game.phase !== PHASES.PLAYING) {
        if (e.key === "Enter" || e.key === " ") {
          if (
            this.gameState.game.phase === PHASES.GAME_OVER ||
            this.gameState.game.phase === PHASES.VICTORY
          ) {
            e.preventDefault();
            this.restartRun();
          }
        }
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
      this.gameState = tick(this.gameState, {
        balance: this.content.balance,
        rng: this.rng,
        randomEventMessages: this.content.dialogue.randomEvents,
      });
      if (this.gameState.game.phase === PHASES.PLAYING) {
        this.saveGame(false);
      }
      this.render();
    }, ms);
  }

  performAction(action) {
    if (this.gameState.game.phase !== PHASES.PLAYING) return;
    if (!KNOWN_ACTIONS.includes(action)) {
      this.addEvent(`Unknown action: ${action}`);
      this.render();
      return;
    }
    this.gameState = performAction(this.gameState, action, this.ctx);
    this.saveGame(false);
    this.render();
  }

  travel(direction) {
    const result = travel(
      this.gameState,
      this.content.zones,
      direction,
      this.content.winGate
    );
    this.gameState = result.state;
    if (result.moved) {
      this.saveGame(false);
    }
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
    this.clearSave();
    this.addEvent("A new run begins at the Void Entrance.");
    this.render();
  }

  saveGame(explicit) {
    try {
      const payload = serializeState(this.gameState);
      localStorage.setItem(this.content.saveKey || SAVE_KEY, JSON.stringify(payload));
      this.gameState.meta.savedAt = payload.savedAt;
      if (explicit) {
        this.addEvent("Game saved to this browser.");
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
    this.addEvent("Save loaded.");
    this.render();
  }

  render() {
    renderGame(document.getElementById("game-container"), this.gameState, this.content);
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
