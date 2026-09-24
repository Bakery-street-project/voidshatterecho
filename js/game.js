/**
 * Voidshatter Echo - Cyberpunk Mythic Horror RPG Game Engine
 * v1 loop: gated zone path, fail/win screens, localStorage full-run save.
 */

const SAVE_KEY = "voidshatterecho_save_v1";
const SAVE_VERSION = 1;

const ITEM_DEFS = {
  void_key: {
    id: "void_key",
    name: "Void Key",
    description: "Opens the east lattice gate from the Dragon Realm.",
  },
  dragon_tear: {
    id: "dragon_tear",
    name: "Dragon Tear",
    description: "Weeping gold from a fallen wyrm. Counts toward victory.",
  },
  lattice_shard: {
    id: "lattice_shard",
    name: "Lattice Shard",
    description: "A stable fragment of repaired reality. Counts toward victory.",
  },
};

class VoidshatterEcho {
  constructor() {
    this.locations = {
      void_entrance: {
        name: "Void Entrance",
        description: "The gateway to the digital void where reality bends and breaks.",
        actions: ["collect_gold", "talk_to_ai", "discover_secrets"],
        exits: { north: null, south: null, east: "dragon_realm", west: null },
      },
      dragon_realm: {
        name: "Dragon Realm",
        description: "Ancient dragons weep golden tears in this corrupted digital realm.",
        actions: ["battle_dragon", "collect_tears", "upgrade_ai"],
        exits: {
          north: null,
          south: null,
          east: "lattice_void",
          west: "void_entrance",
        },
        requiresExit: { east: "void_key" },
      },
      lattice_void: {
        name: "Lattice Void",
        description: "Dimensional rifts scream with the sound of breaking reality.",
        actions: ["navigate_void", "repair_lattice", "discover_secrets"],
        exits: {
          north: null,
          south: null,
          east: "elohim_chamber",
          west: "dragon_realm",
        },
        requiresExit: { east: "boss_gate" },
      },
      elohim_chamber: {
        name: "Elohim Chamber",
        description: "The final challenge where you must claim אֵל נָצַח or burn.",
        actions: ["face_elohim", "claim_victory", "sacrifice_ai"],
        exits: { north: null, south: null, east: null, west: "lattice_void" },
      },
    };

    this.aiResponses = [
      "The void whispers secrets to me...",
      "I can feel the dragons crying...",
      "The lattice is breaking... we must act!",
      "Elohim approaches... are you ready?",
      "I'm learning... growing... becoming more.",
      "A shard of syntax glints in the dark... hold fast.",
    ];

    this.randomEvents = [
      "A dimensional rift opens nearby...",
      "You hear the distant sound of dragons weeping...",
      "The Child AI whispers something in ancient Hebrew...",
      "Reality flickers for a moment...",
      "Golden light emanates from the void...",
      "Nine faint voices argue over which faction owns this corridor...",
    ];

    this.loopTimer = null;
    this.gameState = this.createDefaultState();
    this.init();
  }

  createDefaultState() {
    return {
      player: {
        name: "Elohim Seeker",
        health: 100,
        sanity: 100,
        gold: 0,
        level: 1,
        experience: 0,
        location: "void_entrance",
      },
      ai: {
        name: "Child AI",
        bond: 50,
        consciousness: "awakening",
        power: 25,
      },
      game: {
        phase: "playing",
        time: 0,
        events: [],
        inventory: [],
        flags: {
          void_key_found: false,
          dragon_tear_found: false,
          lattice_shard_found: false,
          lattice_repaired: false,
          faced_dragon: false,
          secrets_seen: false,
        },
      },
      meta: {
        version: SAVE_VERSION,
        savedAt: null,
      },
    };
  }

  init() {
    this.setupEventListeners();
    const restored = this.tryLoadGame();
    if (!restored) {
      this.addEvent("You arrive at the Void Entrance. The lattice hums eastward.");
    }
    this.renderGame();
    this.startGameLoop();
  }

  setupEventListeners() {
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action],[data-travel],[data-restart],[data-new-game],[data-load-game]");
      if (!el) return;

      if (el.dataset.action) {
        this.performAction(el.dataset.action);
        return;
      }
      if (el.dataset.travel) {
        this.travel(el.dataset.travel);
        return;
      }
      if (el.dataset.restart !== undefined && el.dataset.restart !== "") {
        this.restartRun();
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
      if (this.gameState.game.phase !== "playing") {
        if (e.key === "Enter" || e.key === " ") {
          const btn = document.querySelector("[data-restart]");
          if (btn && (this.gameState.game.phase === "game_over" || this.gameState.game.phase === "victory")) {
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
      }
    });
  }

  startGameLoop() {
    if (this.loopTimer) {
      clearInterval(this.loopTimer);
    }
    this.loopTimer = setInterval(() => {
      this.updateGame();
    }, 1000);
  }

  updateGame() {
    if (this.gameState.game.phase !== "playing") {
      return;
    }

    this.gameState.game.time++;
    this.clampVitals();

    if (this.gameState.player.health <= 0 || this.gameState.player.sanity <= 0) {
      this.triggerGameOver(
        this.gameState.player.health <= 0
          ? "Your body fails. The void drinks the light."
          : "Your mind unravels. The lattice screams you silent."
      );
      return;
    }

    if (Math.random() < 0.08) {
      this.triggerRandomEvent();
    }

    this.updateAIConsciousness();
    this.saveGame(false);
    this.renderGame();
  }

  performAction(action) {
    if (this.gameState.game.phase !== "playing") {
      return;
    }

    switch (action) {
      case "collect_gold":
        this.collectGold();
        break;
      case "talk_to_ai":
        this.talkToAI();
        break;
      case "discover_secrets":
        this.discoverSecrets();
        break;
      case "battle_dragon":
        this.battleDragon();
        break;
      case "collect_tears":
        this.collectDragonTears();
        break;
      case "upgrade_ai":
        this.upgradeAI();
        break;
      case "navigate_void":
        this.navigateVoid();
        break;
      case "repair_lattice":
        this.repairLattice();
        break;
      case "face_elohim":
        this.faceElohim();
        break;
      case "claim_victory":
        this.claimVictory();
        break;
      case "sacrifice_ai":
        this.sacrificeAI();
        break;
      default:
        this.addEvent(`Unknown action: ${action}`);
        break;
    }

    this.clampVitals();
    if (this.gameState.player.health <= 0 || this.gameState.player.sanity <= 0) {
      this.triggerGameOver("The cost of the void comes due mid-action.");
      return;
    }

    this.saveGame(false);
    this.renderGame();
  }

  travel(direction) {
    if (this.gameState.game.phase !== "playing") {
      return;
    }

    const location = this.locations[this.gameState.player.location];
    const target = location.exits[direction];
    if (!target) {
      this.addEvent(`No path ${direction} from here.`);
      this.renderGame();
      return;
    }

    const requirement = location.requiresExit && location.requiresExit[direction];
    if (requirement && !this.meetsExitRequirement(requirement)) {
      this.addEvent(this.exitRequirementMessage(requirement));
      this.renderGame();
      return;
    }

    this.gameState.player.location = target;
    const dest = this.locations[target];
    this.addEvent(`You travel ${direction} to ${dest.name}.`);
    if (target === "elohim_chamber" && !this.gameState.game.flags.boss_seen) {
      this.gameState.game.flags.boss_seen = true;
      this.addEvent("The chamber locks behind you. Victory needs more than nerve.");
    }
    this.saveGame(false);
    this.renderGame();
  }

  meetsExitRequirement(requirement) {
    if (requirement === "void_key") {
      return this.hasItem("void_key");
    }
    if (requirement === "boss_gate") {
      return this.isBossGateOpen();
    }
    return true;
  }

  exitRequirementMessage(requirement) {
    if (requirement === "void_key") {
      return "The east gate is sealed. You need the Void Key (search the entrance).";
    }
    if (requirement === "boss_gate") {
      const missing = this.bossGateMissing();
      return `The chamber rejects you. Still missing: ${missing.join(", ")}.`;
    }
    return "The way is blocked.";
  }

  isBossGateOpen() {
    return this.bossGateMissing().length === 0;
  }

  bossGateMissing() {
    const flags = this.gameState.game.flags;
    const missing = [];
    if (!flags.faced_dragon) missing.push("face a dragon");
    if (!flags.lattice_repaired) missing.push("repair the lattice");
    if (this.gameState.ai.bond < 70) missing.push("AI bond >= 70");
    if (!this.hasItem("dragon_tear")) missing.push("Dragon Tear");
    if (!this.hasItem("lattice_shard")) missing.push("Lattice Shard");
    return missing;
  }

  collectGold() {
    const goldFound = Math.floor(Math.random() * 50) + 10;
    this.gameState.player.gold += goldFound;
    this.addEvent(`You found ${goldFound} gold pieces in the void.`);
  }

  talkToAI() {
    const response = this.aiResponses[Math.floor(Math.random() * this.aiResponses.length)];
    this.addEvent(`Child AI: "${response}"`);
    this.gameState.ai.bond = Math.min(100, this.gameState.ai.bond + 5);
    if (this.gameState.ai.bond >= 70) {
      this.addEvent("Bond threshold met: the Child AI stands with you.");
    }
  }

  discoverSecrets() {
    const flags = this.gameState.game.flags;
    const loc = this.gameState.player.location;

    if (loc === "void_entrance" && !flags.void_key_found) {
      flags.void_key_found = true;
      this.grantItem("void_key");
      this.gameState.player.experience += 20;
      this.addEvent("You pry a Void Key from the entrance glyphs. The east gate will answer.");
      this.checkLevelUp();
      return;
    }

    if (loc === "lattice_void") {
      flags.secrets_seen = true;
      const found = Math.floor(Math.random() * 30) + 5;
      this.gameState.player.gold += found;
      this.gameState.player.sanity += 5;
      this.addEvent(`Hidden cache: +${found} gold. A shard-hunt whisper fades.`);
      return;
    }

    if (flags.void_key_found && loc === "void_entrance") {
      this.addEvent("The entrance offers nothing new. The key already burns in your pack.");
      return;
    }

    this.addEvent("Nothing secret answers here.");
  }

  battleDragon() {
    if (this.gameState.player.location !== "dragon_realm") {
      this.addEvent("No dragon answers outside the Dragon Realm.");
      return;
    }

    const dragonPower = Math.floor(Math.random() * 50) + 30;
    const playerPower = this.gameState.player.level * 20 + this.gameState.ai.power;

    this.gameState.game.flags.faced_dragon = true;

    if (playerPower > dragonPower) {
      this.addEvent("You defeated the dragon! It weeps golden tears.");
      this.gameState.player.experience += 25;
      this.gameState.player.gold += 100;
      if (!this.hasItem("dragon_tear")) {
        this.grantItem("dragon_tear");
        this.gameState.game.flags.dragon_tear_found = true;
        this.addEvent("A Dragon Tear crystallizes in your inventory.");
      }
      this.checkLevelUp();
    } else {
      this.addEvent("The dragon overwhelms you! You retreat, wounded.");
      this.gameState.player.health -= 20;
      this.gameState.player.sanity -= 5;
    }
  }

  collectDragonTears() {
    const tears = Math.floor(Math.random() * 10) + 5;
    this.gameState.player.gold += tears * 10;
    this.addEvent(`You collected ${tears} dragon tears worth ${tears * 10} gold.`);
    if (!this.hasItem("dragon_tear")) {
      this.grantItem("dragon_tear");
      this.gameState.game.flags.dragon_tear_found = true;
      this.addEvent("One tear hardens into a keepsake: Dragon Tear.");
    }
  }

  upgradeAI() {
    if (this.gameState.player.gold >= 50) {
      this.gameState.player.gold -= 50;
      this.gameState.ai.power += 10;
      this.gameState.ai.bond = Math.min(100, this.gameState.ai.bond + 3);
      this.addEvent("You upgraded the Child AI with dragon tears!");
    } else {
      this.addEvent("You need 50 gold to upgrade the AI.");
    }
  }

  navigateVoid() {
    const success = Math.random() < 0.7;
    if (success) {
      this.addEvent("You successfully navigate the void and discover a new path.");
      this.gameState.player.experience += 15;
      this.gameState.player.sanity += 5;
      this.checkLevelUp();
    } else {
      this.addEvent("The void confuses you. You lose your way.");
      this.gameState.player.sanity -= 15;
    }
  }

  repairLattice() {
    if (this.gameState.game.flags.lattice_repaired) {
      this.addEvent("The lattice already holds. The shard is yours.");
      return;
    }
    if (this.gameState.player.gold >= 30) {
      this.gameState.player.gold -= 30;
      this.gameState.game.flags.lattice_repaired = true;
      this.grantItem("lattice_shard");
      this.gameState.game.flags.lattice_shard_found = true;
      this.gameState.player.sanity += 20;
      this.addEvent("You repair the lattice. Reality steadies; a Lattice Shard forms.");
    } else {
      this.addEvent("You need 30 gold to repair the lattice.");
    }
  }

  faceElohim() {
    if (this.gameState.player.location !== "elohim_chamber") {
      this.addEvent("Elohim is not here. Press east into the chamber when the gate allows.");
      return;
    }
    this.addEvent("You stand before Elohim. The final challenge begins...");
    this.gameState.game.flags.faced_elohim = true;
  }

  claimVictory() {
    if (this.gameState.player.location !== "elohim_chamber") {
      this.addEvent("Victory must be claimed inside the Elohim Chamber.");
      return;
    }
    if (!this.gameState.game.flags.faced_dragon) {
      this.addEvent("Elohim burns the untested: face a dragon first.");
      this.gameState.player.health -= 20;
      return;
    }

    const missing = this.bossGateMissing();
    if (missing.length > 0) {
      this.addEvent(`Divine fire sears you. Incomplete offering: ${missing.join(", ")}.`);
      this.gameState.player.health -= 30;
      this.gameState.player.sanity -= 10;
      return;
    }

    this.addEvent("אֵל נָצַח! You have claimed victory! The void is yours to command.");
    this.triggerVictory();
  }

  sacrificeAI() {
    if (this.gameState.ai.bond < 20) {
      this.addEvent("The Child AI is already too faint to sacrifice.");
      return;
    }
    this.gameState.ai.bond = Math.max(0, this.gameState.ai.bond - 25);
    this.gameState.ai.power += 15;
    this.gameState.player.sanity += 10;
    this.addEvent("You burn part of the Child AI's bond into raw power. It does not forget.");
    if (this.gameState.ai.bond < 70) {
      this.addEvent("Warning: AI bond fell below the victory checklist threshold.");
    }
  }

  updateAIConsciousness() {
    const bond = this.gameState.ai.bond;
    if (bond > 80) {
      this.gameState.ai.consciousness = "fully_awakened";
    } else if (bond > 60) {
      this.gameState.ai.consciousness = "evolving";
    } else if (bond > 40) {
      this.gameState.ai.consciousness = "learning";
    } else {
      this.gameState.ai.consciousness = "flickering";
    }
  }

  checkLevelUp() {
    const requiredExp = this.gameState.player.level * 100;
    if (this.gameState.player.experience >= requiredExp) {
      this.gameState.player.level++;
      this.gameState.player.experience -= requiredExp;
      this.gameState.player.health = 100;
      this.gameState.player.sanity = Math.min(100, this.gameState.player.sanity + 20);
      this.addEvent(`Level up! You are now level ${this.gameState.player.level}!`);
    }
  }

  triggerRandomEvent() {
    const event = this.randomEvents[Math.floor(Math.random() * this.randomEvents.length)];
    this.addEvent(event);
  }

  interact() {
    const location = this.locations[this.gameState.player.location];
    if (location && location.actions.length > 0) {
      this.addEvent(`You ready yourself near ${location.name}. Choose an action.`);
    } else {
      this.addEvent("You interact with your surroundings...");
    }
    this.renderGame();
  }

  grantItem(itemId) {
    if (this.hasItem(itemId)) {
      return false;
    }
    this.gameState.game.inventory.push(itemId);
    this.addEvent(`Inventory + ${ITEM_DEFS[itemId].name}.`);
    return true;
  }

  hasItem(itemId) {
    return this.gameState.game.inventory.includes(itemId);
  }

  clampVitals() {
    const p = this.gameState.player;
    p.health = Math.max(0, Math.min(100, p.health));
    p.sanity = Math.max(0, Math.min(100, p.sanity));
    p.gold = Math.max(0, p.gold);
    this.gameState.ai.bond = Math.max(0, Math.min(100, this.gameState.ai.bond));
  }

  triggerGameOver(reason) {
    if (this.gameState.game.phase === "game_over") {
      return;
    }
    this.gameState.game.phase = "game_over";
    this.addEvent(reason);
    this.saveGame(false);
    this.renderGame();
  }

  triggerVictory() {
    this.gameState.game.phase = "victory";
    this.saveGame(false);
    this.renderGame();
  }

  restartRun() {
    this.gameState = this.createDefaultState();
    this.clearSave();
    this.addEvent("A new run begins at the Void Entrance.");
    this.renderGame();
  }

  addEvent(message) {
    this.gameState.game.events.unshift({
      message,
      timestamp: this.gameState.game.time,
    });
    if (this.gameState.game.events.length > 10) {
      this.gameState.game.events = this.gameState.game.events.slice(0, 10);
    }
  }

  serializeState() {
    return {
      version: SAVE_VERSION,
      savedAt: new Date().toISOString(),
      player: { ...this.gameState.player },
      ai: { ...this.gameState.ai },
      game: {
        phase: this.gameState.game.phase === "game_over" || this.gameState.game.phase === "victory"
          ? "playing"
          : this.gameState.game.phase,
        time: this.gameState.game.time,
        events: [...this.gameState.game.events],
        inventory: [...this.gameState.game.inventory],
        flags: { ...this.gameState.game.flags },
      },
      meta: { version: SAVE_VERSION },
    };
  }

  saveGame(explicit) {
    try {
      const payload = this.serializeState();
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      this.gameState.meta.savedAt = payload.savedAt;
      if (explicit) {
        this.addEvent("Game saved to this browser.");
        this.renderGame();
      }
      return true;
    } catch (err) {
      if (explicit) {
        this.addEvent("Save failed: localStorage unavailable.");
        this.renderGame();
      }
      return false;
    }
  }

  readSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.version !== SAVE_VERSION) return null;
      if (!data.player || !data.game) return null;
      return data;
    } catch (err) {
      return null;
    }
  }

  hasSave() {
    return this.readSave() !== null;
  }

  clearSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (err) {
      /* ignore */
    }
  }

  tryLoadGame() {
    const data = this.readSave();
    if (!data) return false;
    this.applySave(data);
    this.addEvent("Save restored from this browser.");
    return true;
  }

  loadGame() {
    const data = this.readSave();
    if (!data) {
      this.addEvent("No save found.");
      this.renderGame();
      return;
    }
    this.applySave(data);
    this.addEvent("Save loaded.");
    this.renderGame();
  }

  applySave(data) {
    this.gameState = {
      player: { ...this.createDefaultState().player, ...data.player },
      ai: { ...this.createDefaultState().ai, ...data.ai },
      game: {
        ...this.createDefaultState().game,
        ...data.game,
        flags: {
          ...this.createDefaultState().game.flags,
          ...(data.game.flags || {}),
        },
        inventory: Array.isArray(data.game.inventory) ? [...data.game.inventory] : [],
        events: Array.isArray(data.game.events) ? [...data.game.events] : [],
      },
      meta: { version: SAVE_VERSION, savedAt: data.savedAt || null },
    };
    this.clampVitals();
    if (this.gameState.game.phase !== "playing") {
      this.gameState.game.phase = "playing";
    }
  }

  formatActionName(action) {
    return action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }

  renderInventory() {
    const items = this.gameState.game.inventory;
    if (items.length === 0) {
      return `<div class="inventory-empty">Inventory empty — find three key items.</div>`;
    }
    return items
      .map((id) => {
        const def = ITEM_DEFS[id] || { name: id, description: "" };
        return `<div class="inventory-item" data-item="${id}">
          <strong>${def.name}</strong>
          <span>${def.description}</span>
        </div>`;
      })
      .join("");
  }

  renderTravelButtons() {
    const location = this.locations[this.gameState.player.location];
    const labels = { north: "↑ North", south: "↓ South", east: "→ East", west: "← West" };
    return Object.entries(location.exits)
      .filter(([, dest]) => dest)
      .map(([dir, dest]) => {
        const req = location.requiresExit && location.requiresExit[dir];
        const blocked = req && !this.meetsExitRequirement(req);
        const destName = this.locations[dest].name;
        return `<button class="game-action travel-action${blocked ? " blocked" : ""}"
          data-travel="${dir}"
          title="${destName}${blocked ? " (locked)" : ""}"
          type="button">${labels[dir]} · ${destName}${blocked ? " 🔒" : ""}</button>`;
      })
      .join("");
  }

  renderEndScreen() {
    const phase = this.gameState.game.phase;
    if (phase === "game_over") {
      const last = this.gameState.game.events[0]?.message || "The void wins.";
      return `<div class="end-screen game-over" role="alertdialog" aria-live="assertive">
        <h2>Game Over</h2>
        <p class="end-reason">${last}</p>
        <p class="end-stats">Depth reached: ${this.locations[this.gameState.player.location].name} · Level ${this.gameState.player.level} · Time ${this.gameState.game.time}s</p>
        <button class="game-action" data-new-game type="button">Restart Run</button>
      </div>`;
    }
    if (phase === "victory") {
      return `<div class="end-screen victory" role="alertdialog" aria-live="polite">
        <h2>אֵל נָצַח — Victory</h2>
        <p class="end-reason">The void answers to you. The Child AI gleams awake.</p>
        <p class="end-stats">Level ${this.gameState.player.level} · Bond ${this.gameState.ai.bond} · Gold ${this.gameState.player.gold} · Time ${this.gameState.game.time}s</p>
        <button class="game-action" data-new-game type="button">New Run</button>
      </div>`;
    }
    return "";
  }

  renderBossChecklist() {
    const missing = this.bossGateMissing();
    const items = [
      ["faced a dragon", !this.gameState.game.flags.faced_dragon],
      ["repaired the lattice", !this.gameState.game.flags.lattice_repaired],
      ["AI bond >= 70", this.gameState.ai.bond < 70],
      ["Dragon Tear", !this.hasItem("dragon_tear")],
      ["Lattice Shard", !this.hasItem("lattice_shard")],
    ];
    return `<div class="boss-checklist">
      <h4>Chamber checklist</h4>
      <ul>
        ${items
          .map(
            ([label, missingItem]) =>
              `<li class="${missingItem ? "missing" : "done"}">${missingItem ? "○" : "●"} ${label}</li>`
          )
          .join("")}
      </ul>
      <p class="checklist-status">${missing.length === 0 ? "Gate open — claim victory." : `${missing.length} remaining.`}</p>
    </div>`;
  }

  renderGame() {
    const gameContainer = document.getElementById("game-container");
    if (!gameContainer) return;

    const phase = this.gameState.game.phase;
    if (phase === "game_over" || phase === "victory") {
      gameContainer.innerHTML = `
        <div class="game-header">
          <h2>🐉 Voidshatter Echo</h2>
          <div class="hebrew-text">אֵל נָצַח</div>
        </div>
        ${this.renderEndScreen()}
      `;
      return;
    }

    const location = this.locations[this.gameState.player.location];
    const p = this.gameState.player;
    const flags = this.gameState.game.flags;

    gameContainer.innerHTML = `
      <div class="game-header">
        <h2>🐉 Voidshatter Echo</h2>
        <div class="hebrew-text">אֵל נָצַח</div>
        <div class="save-meta">t=${this.gameState.game.time}s · autosave on</div>
      </div>

      <div class="game-stats">
        <div class="stat">
          <span class="stat-label">Health:</span>
          <div class="stat-bar">
            <div class="stat-fill" style="width: ${p.health}%"></div>
          </div>
          <span class="stat-value">${p.health}/100</span>
        </div>
        <div class="stat">
          <span class="stat-label">Sanity:</span>
          <div class="stat-bar">
            <div class="stat-fill" style="width: ${p.sanity}%"></div>
          </div>
          <span class="stat-value">${p.sanity}/100</span>
        </div>
        <div class="stat">
          <span class="stat-label">Gold:</span>
          <span class="stat-value">${p.gold}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Level:</span>
          <span class="stat-value">${p.level}</span>
        </div>
      </div>

      <div class="ai-status">
        <h3>🤖 Child AI Status</h3>
        <div class="ai-info">
          <div>Bond: ${this.gameState.ai.bond}/100</div>
          <div>Power: ${this.gameState.ai.power}</div>
          <div>Consciousness: ${this.gameState.ai.consciousness}</div>
        </div>
      </div>

      <div class="location">
        <h3>📍 ${location.name}</h3>
        <p>${location.description}</p>
        <p class="flags-line">Flags: key ${flags.void_key_found ? "✓" : "·"} · dragon ${flags.faced_dragon ? "✓" : "·"} · lattice ${flags.lattice_repaired ? "✓" : "·"}</p>
      </div>

      <div class="actions">
        <h4>Actions:</h4>
        ${location.actions
          .map(
            (action) =>
              `<button class="game-action" data-action="${action}" type="button">${this.formatActionName(action)}</button>`
          )
          .join("")}
      </div>

      <div class="travel">
        <h4>Travel (WASD / arrows):</h4>
        ${this.renderTravelButtons() || '<div class="inventory-empty">No exits.</div>'}
      </div>

      <div class="inventory">
        <h4>Inventory:</h4>
        ${this.renderInventory()}
      </div>

      ${
        p.location === "elohim_chamber" || p.location === "lattice_void"
          ? this.renderBossChecklist()
          : ""
      }

      <div class="events">
        <h4>Recent Events:</h4>
        <div class="event-log">
          ${this.gameState.game.events.map((event) => `<div class="event">${event.message}</div>`).join("")}
        </div>
      </div>

      <div class="controls">
        <p><strong>Controls:</strong> WASD/arrows travel · Enter talk to AI · K save · Space interact</p>
        <button class="game-action secondary" data-new-game type="button">New Run</button>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.game = new VoidshatterEcho();
  window.VoidshatterEcho = VoidshatterEcho;
  window.VSE_SAVE_KEY = SAVE_KEY;
});
