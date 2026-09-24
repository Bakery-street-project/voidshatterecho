/** Save schema serialize/parse — pure; storage is the shell's job. */

export const SAVE_KEY = "voidshatterecho_save_v1";
export const SAVE_VERSION = 1;

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
  if (!data || data.version !== SAVE_VERSION) return null;
  if (!data.player || !data.game) return null;

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
