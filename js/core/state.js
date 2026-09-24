/** Pure game state constructors and reducers. No DOM, no storage. */

export const PHASES = Object.freeze({
  PLAYING: "playing",
  GAME_OVER: "game_over",
  VICTORY: "victory",
});

export function createDefaultState(balance) {
  return {
    player: {
      name: "Elohim Seeker",
      health: 100,
      sanity: 100,
      gold: balance?.startingGold ?? 0,
      level: 1,
      experience: 0,
      location: "void_entrance",
    },
    ai: {
      name: "Child AI",
      bond: 50,
      consciousness: "awakening",
      power: 25,
      mood: "curious",
      memory: [],
    },
    game: {
      phase: PHASES.PLAYING,
      ending: null,
      time: 0,
      events: [],
      inventory: [],
      seed: (Math.random() * 0xffffffff) >>> 0,
      flags: {
        void_key_found: false,
        dragon_tear_found: false,
        lattice_shard_found: false,
        lattice_repaired: false,
        faced_dragon: false,
        secrets_seen: false,
        faced_elohim: false,
        boss_seen: false,
        tonic_found: false,
        chip_found: false,
        tutorial_dismissed: false,
        visited_void_entrance: false,
        visited_dragon_realm: false,
        visited_lattice_void: false,
        visited_elohim_chamber: false,
        ai_saw_dragon: false,
        ai_saw_lattice: false,
        ai_saw_sacrifice: false,
        ai_sacrificed: false,
        ai_warned_low_sanity: false,
        ai_warned_low_health: false,
      },
      consumed: {},
    },
    meta: {
      version: 1,
      savedAt: null,
    },
  };
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function clampVitals(state) {
  const player = state.player;
  player.health = clamp(player.health, 0, 100);
  player.sanity = clamp(player.sanity, 0, 100);
  player.gold = Math.max(0, player.gold);
  state.ai.bond = clamp(state.ai.bond, 0, 100);
  return state;
}

export function addEvent(state, message) {
  const next = cloneState(state);
  next.game.events.unshift({
    message,
    timestamp: next.game.time,
  });
  if (next.game.events.length > 10) {
    next.game.events = next.game.events.slice(0, 10);
  }
  return next;
}

export function cloneState(state) {
  return {
    player: { ...state.player },
    ai: {
      ...state.ai,
      memory: (state.ai.memory || []).map((m) => ({ ...m })),
    },
    game: {
      ...state.game,
      events: state.game.events.map((e) => ({ ...e })),
      inventory: [...state.game.inventory],
      flags: { ...state.game.flags },
      consumed: { ...(state.game.consumed || {}) },
    },
    meta: { ...state.meta },
    ...(state.__confirmNewRun ? { __confirmNewRun: true } : {}),
  };
}

export function hasItem(state, itemId) {
  return state.game.inventory.includes(itemId);
}

export function grantItem(state, itemId) {
  if (hasItem(state, itemId)) {
    return { state, granted: false };
  }
  const next = cloneState(state);
  next.game.inventory.push(itemId);
  return { state: next, granted: true };
}

export function removeItem(state, itemId) {
  const next = cloneState(state);
  next.game.inventory = next.game.inventory.filter((id) => id !== itemId);
  return next;
}

export function updateAIConsciousness(state) {
  const next = cloneState(state);
  const bond = next.ai.bond;
  if (bond > 80) next.ai.consciousness = "fully_awakened";
  else if (bond > 60) next.ai.consciousness = "evolving";
  else if (bond > 40) next.ai.consciousness = "learning";
  else next.ai.consciousness = "flickering";
  return next;
}

export function refreshAIMood(state) {
  const next = cloneState(state);
  const bond = next.ai.bond;
  const { health, sanity } = next.player;
  if (next.game.flags.ai_sacrificed || bond < 30) next.ai.mood = "grieving";
  else if (sanity < 30) next.ai.mood = "wary";
  else if (health < 30) next.ai.mood = "defiant";
  else if (bond >= 85) next.ai.mood = "radiant";
  else if (bond >= 70) next.ai.mood = "steady";
  else if (bond >= 45) next.ai.mood = "curious";
  else next.ai.mood = "wary";
  return next;
}

export function checkLevelUp(state, balance) {
  const xpPerLevel = balance?.xpPerLevel ?? 100;
  let next = cloneState(state);
  let leveled = false;
  while (next.player.experience >= next.player.level * xpPerLevel) {
    next.player.experience -= next.player.level * xpPerLevel;
    next.player.level += 1;
    next.player.health = balance?.levelUpHealth ?? 100;
    next.player.sanity = clamp(
      next.player.sanity + (balance?.levelUpSanityBonus ?? 20),
      0,
      100
    );
    leveled = true;
  }
  if (leveled) {
    next = addEvent(next, `Level up! You are now level ${next.player.level}!`);
  }
  return next;
}

export function tick(state, { balance, rng, randomEventMessages }) {
  if (state.game.phase !== PHASES.PLAYING) {
    return state;
  }
  let next = cloneState(state);
  next.game.time += 1;
  next = clampVitals(next);

  if (next.player.health <= 0 || next.player.sanity <= 0) {
    const reason =
      next.player.health <= 0
        ? "Your body fails. The void drinks the light."
        : "Your mind unravels. The lattice screams you silent.";
    return triggerGameOver(next, reason);
  }

  const eventChance = balance?.randomEventChance ?? 0.08;
  if (rng() < eventChance && randomEventMessages?.length) {
    const msg = randomEventMessages[Math.floor(rng() * randomEventMessages.length)];
    next = addEvent(next, msg);
  }

  next = updateAIConsciousness(next);
  next = refreshAIMood(next);
  return next;
}

export function triggerGameOver(state, reason) {
  if (state.game.phase === PHASES.GAME_OVER) return state;
  let next = cloneState(state);
  next.game.phase = PHASES.GAME_OVER;
  next = addEvent(next, reason);
  return next;
}

export function triggerVictory(state, ending = "covenant") {
  let next = cloneState(state);
  next.game.phase = PHASES.VICTORY;
  next.game.ending = ending;
  return next;
}

export function restartRun(balance) {
  return createDefaultState(balance);
}

export function bondTier(bond) {
  if (bond > 85) return "awakened";
  if (bond >= 70) return "high";
  if (bond >= 45) return "mid";
  return "low";
}
