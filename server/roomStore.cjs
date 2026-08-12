const { stripRoomForPersist } = require("./roomHelpers.cjs");

const ROOMS_KEY = "suprabom:rooms";
const SAVE_DEBOUNCE_MS = 400;

let redis = null;
let enabled = false;
const pendingSaves = new Map();

function isEnabled() {
  return enabled && redis;
}

async function initRoomStore() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.log("[redis] REDIS_URL ausente — salas só em memória.");
    return { enabled: false };
  }

  try {
    const Redis = require("ioredis");
    redis = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    await redis.connect();
    enabled = true;
    console.log("[redis] conectado — persistência de salas ativa.");
    return { enabled: true };
  } catch (err) {
    console.warn("[redis] falha ao conectar:", err.message);
    redis = null;
    enabled = false;
    return { enabled: false, error: err.message };
  }
}

function scheduleSaveRoom(room) {
  if (!isEnabled() || !room?.code) return;

  const code = room.code;
  const prev = pendingSaves.get(code);
  if (prev) clearTimeout(prev);

  pendingSaves.set(
    code,
    setTimeout(() => {
      pendingSaves.delete(code);
      saveRoomNow(room).catch((err) =>
        console.warn("[redis] save:", err.message)
      );
    }, SAVE_DEBOUNCE_MS)
  );
}

async function saveRoomNow(room) {
  if (!isEnabled() || !room?.code) return;
  const snapshot = stripRoomForPersist(room);
  await redis.hset(ROOMS_KEY, room.code, JSON.stringify(snapshot));
}

async function deleteRoom(code) {
  if (!code) return;
  const prev = pendingSaves.get(code);
  if (prev) {
    clearTimeout(prev);
    pendingSaves.delete(code);
  }
  if (!isEnabled()) return;
  try {
    await redis.hdel(ROOMS_KEY, code);
  } catch (err) {
    console.warn("[redis] delete:", err.message);
  }
}

async function loadAllRooms() {
  if (!isEnabled()) return [];
  try {
    const raw = await redis.hgetall(ROOMS_KEY);
    return Object.values(raw || {})
      .map((json) => {
        try {
          return JSON.parse(json);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (err) {
    console.warn("[redis] loadAll:", err.message);
    return [];
  }
}

module.exports = {
  initRoomStore,
  isEnabled,
  scheduleSaveRoom,
  saveRoomNow,
  deleteRoom,
  loadAllRooms,
  stripRoomForPersist,
};
