/** Save schema serialize/parse — pure; storage is the shell's job. */

export const SAVE_KEY = "voidshatterecho_save_v1";
export const SAVE_VERSION = 1;

/**
 * Versioned migrations toward SAVE_VERSION.
 * When bumping SAVE_VERSION to 2, add `1: (data) => ({ ...data, version: 2, ... })`
 * and a unit test that a serialized v1 payload upgrades cleanly.
 */
export const SAVE_MIGRATIONS = Object.freeze({});

/** Upgrade a raw save payload to SAVE_VERSION, or return null if impossible. */
export function migrateSaveData(data) {
  if (!data || typeof data.version !== "number" || !Number.isInteger(data.version)) {
    return null;
  }
  if (data.version > SAVE_VERSION) return null;
  let current = data;
  while (current.version < SAVE_VERSION) {
    const step = SAVE_MIGRATIONS[current.version];
    if (typeof step !== "function") return null;
    current = step(current);
    if (!current || current.version <= data.version) return null;
  }
  return current.version === SAVE_VERSION ? current : null;
}

export function serializeState(state) {
  return {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    player: { ...state.player },
    ai: {
      ...state.ai,
      memory: (state.ai.memory || []).map((m) => ({ ...m })),
    },
    game: {
      phase:
        state.game.phase === "game_over" || state.game.phase === "victory"
          ? "playing"
          : state.game.phase,
      time: state.game.time,
      events: state.game.events.map((e) => ({ ...e })),
      inventory: [...state.game.inventory],
      flags: { ...state.game.flags },
      consumed: { ...(state.game.consumed || {}) },
      seed: state.game.seed ?? 0,
    },
    meta: { version: SAVE_VERSION },
  };
}

export function parseSave(raw, defaultsFactory) {
  if (!raw) return null;
  let data;
  try {
    data = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
  const migrated = migrateSaveData(data);
  if (!migrated) return null;
  if (!migrated.player || !migrated.game) return null;
  data = migrated;

  const base = defaultsFactory();
  const aiMemory = Array.isArray(data.ai?.memory)
    ? data.ai.memory.map((m) => ({ ...m }))
    : [];
  return {
    player: { ...base.player, ...data.player },
    ai: { ...base.ai, ...data.ai, memory: aiMemory },
    game: {
      ...base.game,
      ...data.game,
      phase: data.game.phase === "game_over" || data.game.phase === "victory" ? "playing" : data.game.phase || "playing",
      flags: { ...base.game.flags, ...(data.game.flags || {}) },
      consumed: { ...base.game.consumed, ...(data.game.consumed || {}) },
      inventory: Array.isArray(data.game.inventory) ? [...data.game.inventory] : [],
      events: Array.isArray(data.game.events) ? data.game.events.map((e) => ({ ...e })) : [],
      seed:
        typeof data.game.seed === "number" && data.game.seed > 0
          ? data.game.seed
          : base.game.seed,
    },
    meta: { version: SAVE_VERSION, savedAt: data.savedAt || null },
  };
}

export { migrateSaveData as migrateSave };
