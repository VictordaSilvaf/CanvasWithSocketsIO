import abilitiesConfig from "@config/abilities.json";

export const TILE = 30;
export const EMPTY = 0;
export const HARD = 1;
export const SOFT = 2;
export const SPRITE_BASE = "/assets/imgs/last-guardian-sprites";
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;

export const ABILITIES_CONFIG = abilitiesConfig;
export const ABILITIES = abilitiesConfig.abilities || {};
export const ABILITY_LIST = Object.values(ABILITIES);
export const MOVE_COOLDOWN_MS = abilitiesConfig.baseMoveCooldownMs ?? 120;
export const ABILITY_ACTIVATION_KEY = abilitiesConfig.activationKey || "KeyE";
export const ABILITY_ACTIVATION_LABEL =
  abilitiesConfig.activationKeyLabel || "E";

export const SPRITE_POOL = [
  "amg1", "amg2", "amg3", "amg4",
  "avt1", "avt2", "avt3", "avt4",
  "bmg1", "bmg2", "bmg3", "bmg4",
  "chr1", "dvl1",
  "ftr1", "ftr2", "ftr3", "ftr4",
  "gsd1", "isd1", "jli1", "kin1",
  "knt1", "knt2", "knt3", "knt4",
  "man1", "man2", "man3", "man4",
  "mnt1", "mnt2", "mnt3", "mnt4",
  "mnv1", "mnv2", "mnv3", "mnv4",
  "mst1", "mst2", "mst3", "mst4",
  "nja1", "nja2", "nja3", "nja4",
  "npc1", "npc2", "npc3", "npc4",
  "pdn1", "pdn2", "pdn3", "pdn4",
  "scr1", "scr2", "scr3", "scr4",
  "skl1",
  "smr1", "smr2", "smr3", "smr4",
  "spd1", "syb1",
  "thf1", "thf2", "thf3", "thf4",
  "trk1",
  "wmg1", "wmg2", "wmg3", "wmg4",
  "wmn1", "wmn2", "wmn3",
  "wnv1", "wnv2", "wnv3", "wnv4",
  "ybo1", "ygr1", "zph1",
];

export const INITIAL_STATE = {
  phase: "lobby",
  roomCode: null,
  hostId: null,
  winnerId: null,
  countdown: 0,
  players: [],
  takenSprites: [],
  map: [],
  bombs: [],
  pickups: [],
  projectiles: [],
  abilityFx: [],
  canvasSize: 450,
  tile: TILE,
  serverNow: 0,
  activationKey: ABILITY_ACTIVATION_KEY,
  activationKeyLabel: ABILITY_ACTIVATION_LABEL,
};

export function spriteUrl(sprite, facing = "fr", frame = 1) {
  return `${SPRITE_BASE}/${sprite}_${facing}${frame}.gif`;
}

export function getAbility(id) {
  return ABILITIES[id] || null;
}

const PLAYER_PREFS_KEY = "suprabom:playerPrefs";

export function loadPlayerPrefs() {
  try {
    const raw = localStorage.getItem(PLAYER_PREFS_KEY);
    if (!raw) return { name: "", sprite: null, abilityId: null };
    const data = JSON.parse(raw);
    const name = typeof data.name === "string" ? data.name.slice(0, 16) : "";
    const sprite =
      typeof data.sprite === "string" && SPRITE_POOL.includes(data.sprite)
        ? data.sprite
        : null;
    const abilityId =
      typeof data.abilityId === "string" && ABILITIES[data.abilityId]
        ? data.abilityId
        : null;
    return { name, sprite, abilityId };
  } catch {
    return { name: "", sprite: null, abilityId: null };
  }
}

export function savePlayerPrefs({ name, sprite, abilityId }) {
  try {
    localStorage.setItem(
      PLAYER_PREFS_KEY,
      JSON.stringify({
        name: String(name || "").trim().slice(0, 16),
        sprite: SPRITE_POOL.includes(sprite) ? sprite : null,
        abilityId: ABILITIES[abilityId] ? abilityId : null,
      })
    );
  } catch {
    // ignore quota / private mode
  }
}
