/** Load content/v1 JSON bundles (browser fetch or injected for tests). */

export async function loadContent(base = "content/v1") {
  const files = ["balance.json", "zones.json", "items.json", "dialogue.json", "encounters.json"];
  const entries = await Promise.all(
    files.map(async (file) => {
      const res = await fetch(`${base}/${file}`);
      if (!res.ok) {
        throw new Error(`Failed to load ${base}/${file}: ${res.status}`);
      }
      return [file.replace(/\.json$/, ""), await res.json()];
    })
  );
  const map = Object.fromEntries(entries);
  return {
    balance: map.balance.balance,
    winGate: map.balance.winGate,
    sacrificeGate: map.balance.sacrificeGate ?? null,
    saveKey: map.balance.saveKey,
    saveVersion: map.balance.saveVersion,
    zones: map.zones.zones,
    travelLabels: map.zones.travelLabels,
    items: map.items,
    dialogue: map.dialogue,
    encounters: map.encounters,
  };
}
