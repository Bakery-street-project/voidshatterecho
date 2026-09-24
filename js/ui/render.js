/** DOM rendering for game screens — impure edge. */

import { bossGateMissing, isBossGateOpen } from "../core/victory.js";
import { PHASES } from "../core/state.js";
import { aiStatusSummary } from "../core/ai.js";

function formatActionName(action) {
  return action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function renderInventory(state, items) {
  const inv = state.game.inventory;
  if (inv.length === 0) {
    return `<div class="inventory-empty">Inventory empty — find key items for the chamber.</div>`;
  }
  return inv
    .map((id) => {
      const def = items[id] || { name: id, description: "", emoji: "•" };
      return `<div class="inventory-item" data-item="${id}">
        <strong>${def.emoji || ""} ${def.name}</strong>
        <span>${def.description}</span>
        ${def.consumable ? `<button class="game-action secondary" data-action="use_tonic" type="button">Use</button>` : ""}
      </div>`;
    })
    .join("");
}

function renderObjectives(state, dialogue) {
  const objectives = dialogue.objectives || [];
  const rows = objectives.map((o) => {
    let done = false;
    if (o.flag) done = Boolean(state.game.flags[o.flag]);
    else if (o.item) done = state.game.inventory.includes(o.item);
    else if (o.location) done = state.player.location === o.location || passedLocation(state, o.location);
    else if (o.aiBond) done = state.ai.bond >= o.aiBond;
    else if (o.phase) done = state.game.phase === o.phase;
    return `<li class="${done ? "done" : "missing"}">${done ? "●" : "○"} ${o.text}</li>`;
  });
  const active = objectives.find((o) => {
    if (o.flag) return !state.game.flags[o.flag];
    if (o.item) return !state.game.inventory.includes(o.item);
    if (o.aiBond) return state.ai.bond < o.aiBond;
    if (o.phase) return state.game.phase !== o.phase;
    if (o.location) return !passedLocation(state, o.location) && state.player.location !== o.location;
    return false;
  });
  return `<div class="objectives">
    <h4>Objectives</h4>
    <ul>${rows.join("")}</ul>
    ${active ? `<p class="objective-active">Next: ${active.text}</p>` : `<p class="objective-active">All objectives clear — claim victory.</p>`}
  </div>`;
}

const ORDER = ["void_entrance", "dragon_realm", "lattice_void", "elohim_chamber"];
function passedLocation(state, loc) {
  const idx = ORDER.indexOf(loc);
  const cur = ORDER.indexOf(state.player.location);
  return idx >= 0 && cur > idx;
}

function renderTravel(state, zones, labels, winGate) {
  const zone = zones[state.player.location];
  return Object.entries(zone.exits || {})
    .filter(([, dest]) => dest)
    .map(([dir, dest]) => {
      const req = zone.requiresExit?.[dir];
      let blocked = false;
      if (req === "void_key") blocked = !state.game.inventory.includes("void_key");
      if (req === "boss_gate") blocked = !isBossGateOpen(state, winGate);
      const destName = zones[dest].name;
      return `<button class="game-action travel-action${blocked ? " blocked" : ""}"
        data-travel="${dir}"
        title="${destName}${blocked ? " (locked)" : ""}"
        type="button">${labels[dir] || dir} · ${destName}${blocked ? " 🔒" : ""}</button>`;
    })
    .join("");
}

function renderChecklist(state, winGate) {
  const missing = bossGateMissing(state, winGate);
  const bondNeed = winGate.requireAiBond ?? 70;
  const items = [
    ["faced a dragon", winGate.requireFacedDragon && !state.game.flags.faced_dragon],
    ["repaired the lattice", winGate.requireLatticeRepaired && !state.game.flags.lattice_repaired],
    [`AI bond >= ${bondNeed}`, state.ai.bond < bondNeed],
    ["Dragon Tear", winGate.requireItems.includes("dragon_tear") && !state.game.inventory.includes("dragon_tear")],
    ["Lattice Shard", winGate.requireItems.includes("lattice_shard") && !state.game.inventory.includes("lattice_shard")],
  ];
  return `<div class="boss-checklist">
    <h4>Chamber checklist</h4>
    <ul>
      ${items
        .map(
          ([label, isMissing]) =>
            `<li class="${isMissing ? "missing" : "done"}">${isMissing ? "○" : "●"} ${label}</li>`
        )
        .join("")}
    </ul>
    <p class="checklist-status">${missing.length === 0 ? "Gate open — claim victory." : `${missing.length} remaining.`}</p>
  </div>`;
}

function renderEndScreen(state) {
  const phase = state.game.phase;
  if (phase === PHASES.GAME_OVER) {
    const last = state.game.events[0]?.message || "The void wins.";
    return `<div class="end-screen game-over" role="alertdialog" aria-live="assertive">
      <h2>Game Over</h2>
      <p class="end-reason">${last}</p>
      <p class="end-stats">Depth: ${state.player.location.replace(/_/g, " ")} · Level ${state.player.level} · Time ${state.game.time}s</p>
      <button class="game-action" data-new-game type="button">Restart Run</button>
    </div>`;
  }
  if (phase === PHASES.VICTORY) {
    return `<div class="end-screen victory" role="alertdialog" aria-live="polite">
      <h2>אֵל נָצַח — Victory</h2>
      <p class="end-reason">The void answers to you. The Child AI gleams awake.</p>
      <p class="end-stats">Level ${state.player.level} · Bond ${state.ai.bond} · Gold ${state.player.gold} · Time ${state.game.time}s</p>
      <button class="game-action" data-new-game type="button">New Run</button>
    </div>`;
  }
  return "";
}

export function renderGame(container, state, content) {
  if (!container) return;
  const { zones, items, dialogue, travelLabels, winGate, balance } = content;

  if (state.game.phase === PHASES.GAME_OVER || state.game.phase === PHASES.VICTORY) {
    container.innerHTML = `
      <div class="game-header">
        <h2>🐉 Voidshatter Echo</h2>
        <div class="hebrew-text">אֵל נָצַח</div>
      </div>
      ${renderEndScreen(state)}
    `;
    return;
  }

  const zone = zones[state.player.location];
  const p = state.player;
  const ai = aiStatusSummary(state, dialogue);
  const showChecklist =
    p.location === "elohim_chamber" || p.location === "lattice_void";

  container.innerHTML = `
    <div class="game-header">
      <h2>🐉 Voidshatter Echo</h2>
      <div class="hebrew-text">אֵל נָצַח</div>
      <div class="save-meta">t=${state.game.time}s · seed=${state.game.seed} · autosave on · K=save</div>
    </div>

    <div class="game-stats">
      <div class="stat">
        <span class="stat-label">Health:</span>
        <div class="stat-bar"><div class="stat-fill" style="width: ${p.health}%"></div></div>
        <span class="stat-value">${p.health}/100</span>
      </div>
      <div class="stat">
        <span class="stat-label">Sanity:</span>
        <div class="stat-bar"><div class="stat-fill" style="width: ${p.sanity}%"></div></div>
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
      <div class="ai-header">
        <img
          class="ai-portrait"
          src="${ai.portrait}"
          alt="Child AI"
          width="72"
          height="54"
          loading="lazy"
        />
        <div>
          <h3>🤖 Child AI Status</h3>
          <div class="ai-mood mood-${ai.mood}">Mood: ${ai.mood}</div>
        </div>
      </div>
      <div class="ai-info">
        <div>Bond: ${state.ai.bond}/100</div>
        <div>Power: ${state.ai.power}</div>
        <div>Consciousness: ${state.ai.consciousness}</div>
        <div>Tier: ${ai.tier}</div>
      </div>
      ${ai.memory ? `<p class="ai-memory">Memory: “${ai.memory}”</p>` : ""}
    </div>

    <div class="location">
      ${
        zone.art
          ? `<img class="zone-art" src="${zone.art}" alt="" width="720" height="405" loading="lazy" />`
          : ""
      }
      <h3>📍 ${zone.name}</h3>
      <p>${zone.description}</p>
      ${zone.tutorial ? `<p class="zone-hint">💡 ${zone.tutorial}</p>` : ""}
      <p class="flags-line">Flags: key ${state.game.flags.void_key_found ? "✓" : "·"} · dragon ${state.game.flags.faced_dragon ? "✓" : "·"} · lattice ${state.game.flags.lattice_repaired ? "✓" : "·"}</p>
    </div>

    ${renderObjectives(state, dialogue)}

    <div class="actions">
      <h4>Actions:</h4>
      ${zone.actions
        .map(
          (action) =>
            `<button class="game-action" data-action="${action}" type="button">${formatActionName(action)}</button>`
        )
        .join("")}
    </div>

    <div class="travel">
      <h4>Travel (WASD / arrows):</h4>
      ${renderTravel(state, zones, travelLabels, winGate) || '<div class="inventory-empty">No exits.</div>'}
    </div>

    <div class="inventory">
      <h4>Inventory:</h4>
      ${renderInventory(state, items)}
    </div>

    ${showChecklist ? renderChecklist(state, winGate) : ""}

    <div class="events">
      <h4>Recent Events:</h4>
      <div class="event-log">
        ${state.game.events.map((event) => `<div class="event">${event.message}</div>`).join("")}
      </div>
    </div>

    <div class="controls">
      <p><strong>Controls:</strong> WASD/arrows travel · Enter talk to AI · K save · Space interact</p>
      <button class="game-action secondary" data-new-game type="button">New Run</button>
    </div>
  `;
}
