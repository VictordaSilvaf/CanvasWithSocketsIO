const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const CORS_ORIGINS = String(
  process.env.CORS_ORIGINS ||
    "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Allow listed origins plus private LAN (so phone/other PCs work via local IP). */
function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (CORS_ORIGINS.includes("*") || CORS_ORIGINS.includes(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    const parts = hostname.split(".").map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
    const [a, b] = parts;
    // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
  } catch {
    return false;
  }
}

const io = new Server(server, {
  cors: {
    origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
    methods: ["GET", "POST"],
  },
});

const TILE = 30;
const MAP_SIZE = 15;
const CANVAS_SIZE = MAP_SIZE * TILE;
const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;
const BOMB_FUSE_MS = 2000;
const EXPLOSION_MS = 600;
const SOFT_CHANCE = 0.65;
const FIRE_DROP_CHANCE = 0.12;
const BOMB_DROP_CHANCE = 0.1;
const MAX_BOMB_RANGE = 6;
const MAX_BOMBS = 4;
const GAMEOVER_RESET_MS = 5000;
const COUNTDOWN_TICK_MS = 1000;
const COUNTDOWN_START_S = 15;
const COUNTDOWN_ALL_PICKED_S = 3;
const GO_DISPLAY_MS = 700;
const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const EMPTY = 0;
const HARD = 1;
const SOFT = 2;

const SPRITE_POOL = [
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

const SPRITE_SET = new Set(SPRITE_POOL);

const SPAWNS = [
  { row: 1, col: 1 },
  { row: 1, col: MAP_SIZE - 2 },
  { row: MAP_SIZE - 2, col: 1 },
  { row: MAP_SIZE - 2, col: MAP_SIZE - 2 },
];

const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const {
  createAbilitySystem,
  isValidAbilityId,
  pickRandomAbilityId,
  publicAbilitiesMeta,
  abilitiesConfig,
} = require("./abilities.cjs");

const {
  verifyUserAccessToken,
  upsertProfilePrefs,
  recordMatchResult,
} = require("./supabase.cjs");

app.use(express.static(distDir));
app.use("/assets", express.static(path.join(rootDir, "public/assets")));
app.use("/config", express.static(path.join(rootDir, "config")));

app.get("/api/abilities", (_req, res) => {
  res.json(abilitiesConfig);
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/socket.io")) return next();
  res.sendFile(path.join(distDir, "index.html"), (err) => {
    if (err) next();
  });
});

/** @type {Record<string, object>} */
const rooms = {};

let abilitySystem = null;

function tileToPx(tile) {
  return tile * TILE;
}

function clearSpawnArea(grid, row, col) {
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (r <= 0 || c <= 0 || r >= MAP_SIZE - 1 || c >= MAP_SIZE - 1) continue;
      if (r % 2 === 0 && c % 2 === 0) continue;
      grid[r][c] = EMPTY;
    }
  }
  grid[row][col] = EMPTY;
}

function generateMap() {
  const grid = [];

  for (let r = 0; r < MAP_SIZE; r++) {
    grid[r] = [];
    for (let c = 0; c < MAP_SIZE; c++) {
      if (r === 0 || c === 0 || r === MAP_SIZE - 1 || c === MAP_SIZE - 1) {
        grid[r][c] = HARD;
      } else if (r % 2 === 0 && c % 2 === 0) {
        grid[r][c] = HARD;
      } else if (Math.random() < SOFT_CHANCE) {
        grid[r][c] = SOFT;
      } else {
        grid[r][c] = EMPTY;
      }
    }
  }

  for (const spawn of SPAWNS) {
    clearSpawnArea(grid, spawn.row, spawn.col);
  }

  return grid;
}

function generateRoomCode() {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

function createRoom(createdBy) {
  let code = generateRoomCode();
  while (rooms[code]) {
    code = generateRoomCode();
  }

  rooms[code] = {
    code,
    createdBy: createdBy || null,
    hostId: createdBy || null,
    players: {},
    bombs: {},
    pickups: {},
    projectiles: {},
    abilityFx: [],
    map: [],
    phase: "lobby",
    winnerId: null,
    countdown: 0,
    bombSeq: 0,
    pickupSeq: 0,
    projectileSeq: 0,
    fxSeq: 0,
    resetTimer: null,
    countdownTimer: null,
    projectileTimer: null,
  };

  return rooms[code];
}

function getRoom(code) {
  if (!code) return null;
  return rooms[String(code).toUpperCase()] || null;
}

function getPlayerList(room) {
  return Object.values(room.players);
}

function getAlivePlayers(room) {
  return getPlayerList(room).filter((p) => p.alive);
}

function takenSprites(room) {
  return new Set(getPlayerList(room).map((p) => p.sprite));
}

function emitRoomError(socket, reason) {
  socket.emit("ON_ROOM_ERROR", JSON.stringify({ reason }));
}

function ensureHost(room) {
  if (room.hostId && room.players[room.hostId]) return;
  const next = getPlayerList(room)[0];
  room.hostId = next ? next.id : null;
}

function emitState(room) {
  const now = Date.now();
  room.abilityFx = (room.abilityFx || []).filter((fx) => fx.until > now);

  io.to(room.code).emit(
    "ON_GAME_STATE",
    JSON.stringify({
      roomCode: room.code,
      hostId: room.hostId,
      phase: room.phase,
      winnerId: room.winnerId,
      countdown: room.countdown,
      canvasSize: CANVAS_SIZE,
      tile: TILE,
      mapSize: MAP_SIZE,
      serverNow: now,
      activationKey: abilitiesConfig.activationKey || "KeyE",
      activationKeyLabel: abilitiesConfig.activationKeyLabel || "E",
      abilitiesMeta: publicAbilitiesMeta(),
      takenSprites: [...takenSprites(room)],
      players: getPlayerList(room).map((p) => ({
        id: p.id,
        userId: p.userId || null,
        name: p.name,
        ready: p.ready,
        alive: p.alive,
        wins: p.wins || 0,
        abilityId: p.abilityId || null,
        abilityCooldownUntil: p.abilityCooldownUntil || 0,
        slowUntil: p.slowUntil || 0,
        confusedUntil: p.confusedUntil || 0,
        stunUntil: p.stunUntil || 0,
        ghostUntil: p.ghostUntil || 0,
        x: p.x,
        y: p.y,
        row: p.row,
        col: p.col,
        sprite: p.sprite,
        facing: p.facing,
        frame: p.frame,
        bombRange: p.bombRange,
        maxBombs: p.maxBombs,
      })),
      map: room.map,
      bombs: Object.values(room.bombs),
      pickups: Object.values(room.pickups),
      projectiles: Object.values(room.projectiles || {}),
      abilityFx: room.abilityFx || [],
    })
  );
}

function clearCountdownTimer(room) {
  if (room.countdownTimer) {
    clearTimeout(room.countdownTimer);
    room.countdownTimer = null;
  }
}

function scheduleCountdownTick(room, delayMs = COUNTDOWN_TICK_MS) {
  clearCountdownTimer(room);
  room.countdownTimer = setTimeout(
    () => runCountdownTick(room.code),
    delayMs
  );
}

function assignMissingAbilities(room) {
  for (const player of getPlayerList(room)) {
    if (!isValidAbilityId(player.abilityId)) {
      player.abilityId = pickRandomAbilityId();
    }
  }
}

function allPlayersPickedAbility(room) {
  const list = getPlayerList(room);
  return list.length > 0 && list.every((p) => isValidAbilityId(p.abilityId));
}

function maybeShrinkCountdownAfterPicks(room) {
  if (!allPlayersPickedAbility(room)) return;
  if (room.phase !== "countdown") return;
  if (room.countdown <= COUNTDOWN_ALL_PICKED_S) return;
  room.countdown = COUNTDOWN_ALL_PICKED_S;
  emitState(room);
  scheduleCountdownTick(room, COUNTDOWN_TICK_MS);
}

function runCountdownTick(roomCode) {
  const room = getRoom(roomCode);
  if (!room || room.phase !== "countdown") return;

  if (room.countdown > 1) {
    room.countdown -= 1;
    emitState(room);
    scheduleCountdownTick(room, COUNTDOWN_TICK_MS);
    return;
  }

  if (room.countdown === 1) {
    assignMissingAbilities(room);
    room.countdown = 0;
    emitState(room);
    scheduleCountdownTick(room, GO_DISPLAY_MS);
    return;
  }

  room.countdownTimer = null;
  room.countdown = 0;
  room.phase = "playing";
  emitState(room);
}

function canStartGame(room) {
  const list = getPlayerList(room);
  return (
    list.length >= MIN_PLAYERS &&
    list.length <= MAX_PLAYERS &&
    list.every((p) => p.ready)
  );
}

function startGame(room) {
  if (room.phase !== "lobby" || !canStartGame(room)) return;

  if (room.resetTimer) {
    clearTimeout(room.resetTimer);
    room.resetTimer = null;
  }
  clearCountdownTimer(room);

  room.map = generateMap();
  Object.keys(room.bombs).forEach((id) => delete room.bombs[id]);
  Object.keys(room.pickups).forEach((id) => delete room.pickups[id]);
  if (abilitySystem) {
    abilitySystem.clearProjectiles(room);
    abilitySystem.clearAbilityFx(room);
  }
  room.winnerId = null;

  getPlayerList(room).forEach((player, index) => {
    const spawn = SPAWNS[index];
    player.alive = true;
    player.ready = true;
    player.abilityId = null;
    player.row = spawn.row;
    player.col = spawn.col;
    player.x = tileToPx(spawn.col);
    player.y = tileToPx(spawn.row);
    player.facing = "fr";
    player.frame = 1;
    player.bombRange = 1;
    player.maxBombs = 1;
    if (abilitySystem) abilitySystem.resetPlayerAbilityState(player);
  });

  room.phase = "countdown";
  room.countdown = COUNTDOWN_START_S;
  emitState(room);
  scheduleCountdownTick(room, COUNTDOWN_TICK_MS);
}

function returnToLobby(room) {
  clearCountdownTimer(room);
  if (abilitySystem) {
    abilitySystem.clearProjectiles(room);
    abilitySystem.clearAbilityFx(room);
  }
  room.phase = "lobby";
  room.winnerId = null;
  room.countdown = 0;
  room.map = [];
  Object.keys(room.bombs).forEach((id) => delete room.bombs[id]);
  Object.keys(room.pickups).forEach((id) => delete room.pickups[id]);

  for (const player of getPlayerList(room)) {
    player.ready = false;
    player.alive = true;
    player.abilityId = null;
    player.bombRange = 1;
    player.maxBombs = 1;
    player.row = 0;
    player.col = 0;
    player.x = 0;
    player.y = 0;
    if (abilitySystem) abilitySystem.resetPlayerAbilityState(player);
  }

  emitState(room);
}

function checkWinCondition(room) {
  if (room.phase !== "playing") return;

  const alive = getAlivePlayers(room);
  if (alive.length > 1) return;

  room.phase = "gameover";
  room.winnerId = alive.length === 1 ? alive[0].id : null;
  if (room.winnerId && room.players[room.winnerId]) {
    room.players[room.winnerId].wins =
      (room.players[room.winnerId].wins || 0) + 1;
  }
  emitState(room);

  const winnerSocket = room.winnerId ? room.players[room.winnerId] : null;
  recordMatchResult({
    roomCode: room.code,
    winnerId: winnerSocket?.userId || null,
    players: getPlayerList(room),
  }).catch((err) => console.warn("[supabase] record match:", err.message));

  if (room.resetTimer) clearTimeout(room.resetTimer);
  room.resetTimer = setTimeout(() => {
    room.resetTimer = null;
    if (rooms[room.code]) returnToLobby(room);
  }, GAMEOVER_RESET_MS);
}

function removePlayerFromRoom(room, playerId, { kicked = false } = {}) {
  const targetSocket = io.sockets.sockets.get(playerId);
  delete room.players[playerId];

  if (targetSocket) {
    targetSocket.leave(room.code);
    targetSocket.data.roomCode = null;
    if (kicked) {
      targetSocket.emit(
        "ON_KICKED",
        JSON.stringify({ reason: "Você foi expulso da sala pelo host." })
      );
    }
  }

  if (room.hostId === playerId) {
    room.hostId = null;
    ensureHost(room);
  }
}

function isBlocked(room, row, col) {
  if (row < 0 || col < 0 || row >= MAP_SIZE || col >= MAP_SIZE) return true;
  const cell = room.map[row][col];
  return cell === HARD || cell === SOFT;
}

function hasBombAt(room, row, col) {
  return Object.values(room.bombs).some(
    (bomb) => bomb.state === "ticking" && bomb.row === row && bomb.col === col
  );
}

function collectPickup(room, player) {
  const found = Object.values(room.pickups).find(
    (item) => item.row === player.row && item.col === player.col
  );
  if (!found) return false;

  if (found.type === "fire") {
    player.bombRange = Math.min(MAX_BOMB_RANGE, player.bombRange + 1);
  } else if (found.type === "bomb") {
    player.maxBombs = Math.min(MAX_BOMBS, player.maxBombs + 1);
  }

  delete room.pickups[found.id];
  return true;
}

function placeBombAt(room, player, row, col) {
  if (!room || !player || room.phase !== "playing") return null;
  if (player.stunUntil && Date.now() < player.stunUntil) return null;

  const planted = Object.values(room.bombs).filter(
    (bomb) => bomb.ownerId === player.id && bomb.state === "ticking"
  ).length;
  if (planted >= (player.maxBombs || 1)) return null;
  if (hasBombAt(room, row, col)) return null;
  if (isBlocked(room, row, col)) return null;

  const bombId = `bomb-${++room.bombSeq}`;
  const bomb = {
    id: bombId,
    ownerId: player.id,
    row,
    col,
    x: tileToPx(col),
    y: tileToPx(row),
    range: player.bombRange,
    state: "ticking",
    blast: [],
  };
  room.bombs[bombId] = bomb;
  setTimeout(() => explodeBomb(room.code, bombId), BOMB_FUSE_MS);
  return bomb;
}

abilitySystem = createAbilitySystem({
  EMPTY,
  HARD,
  SOFT,
  tileToPx,
  isBlocked,
  hasBombAt,
  getAlivePlayers,
  getPlayerList,
  emitState,
  collectPickup,
  placeBombAt,
});

function buildBlast(room, bomb) {
  const cells = [{ row: bomb.row, col: bomb.col }];
  const destroyedSoft = [];
  const directions = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  for (const dir of directions) {
    for (let i = 1; i <= bomb.range; i++) {
      const row = bomb.row + dir.dr * i;
      const col = bomb.col + dir.dc * i;
      if (row < 0 || col < 0 || row >= MAP_SIZE || col >= MAP_SIZE) break;

      const cell = room.map[row][col];
      if (cell === HARD) break;

      cells.push({ row, col });
      if (cell === SOFT) {
        destroyedSoft.push({ row, col });
        break;
      }
    }
  }

  return { cells, destroyedSoft };
}

function explodeBomb(roomCode, bombId) {
  const room = getRoom(roomCode);
  if (!room) return;

  const bomb = room.bombs[bombId];
  if (!bomb || bomb.state !== "ticking") return;
  if (room.phase !== "playing") {
    delete room.bombs[bombId];
    return;
  }

  const { cells, destroyedSoft } = buildBlast(room, bomb);
  bomb.state = "exploding";
  bomb.blast = cells.map((cell) => ({
    row: cell.row,
    col: cell.col,
    x: tileToPx(cell.col),
    y: tileToPx(cell.row),
  }));

  for (const soft of destroyedSoft) {
    room.map[soft.row][soft.col] = EMPTY;
    const roll = Math.random();
    let type = null;
    if (roll < FIRE_DROP_CHANCE) type = "fire";
    else if (roll < FIRE_DROP_CHANCE + BOMB_DROP_CHANCE) type = "bomb";

    if (type) {
      const pickupId = `pickup-${++room.pickupSeq}`;
      room.pickups[pickupId] = {
        id: pickupId,
        type,
        row: soft.row,
        col: soft.col,
        x: tileToPx(soft.col),
        y: tileToPx(soft.row),
      };
    }
  }

  for (const player of getAlivePlayers(room)) {
    const hit = cells.some(
      (cell) => cell.row === player.row && cell.col === player.col
    );
    if (hit) player.alive = false;
  }

  emitState(room);
  checkWinCondition(room);

  setTimeout(() => {
    const current = getRoom(roomCode);
    if (!current) return;
    delete current.bombs[bombId];
    if (current.phase === "playing" || current.phase === "gameover") {
      emitState(current);
    }
  }, EXPLOSION_MS);
}

function normalizeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 16);
}

function destroyRoomIfEmpty(room) {
  if (getPlayerList(room).length > 0) return;
  clearCountdownTimer(room);
  if (abilitySystem) {
    abilitySystem.clearProjectiles(room);
    abilitySystem.clearAbilityFx(room);
  }
  if (room.resetTimer) {
    clearTimeout(room.resetTimer);
    room.resetTimer = null;
  }
  delete rooms[room.code];
}

io.sockets.on("connection", (socket) => {
  socket.data.roomCode = null;
  socket.data.pendingRoomCode = null;

  socket.on("ROOM_CREATE", () => {
    if (socket.data.roomCode) {
      emitRoomError(socket, "Você já está em uma sala.");
      return;
    }

    // Drop any empty room this socket created and never joined.
    for (const room of Object.values(rooms)) {
      if (
        room.createdBy === socket.id &&
        getPlayerList(room).length === 0
      ) {
        destroyRoomIfEmpty(room);
      }
    }

    const room = createRoom(socket.id);
    socket.data.pendingRoomCode = room.code;
    socket.emit("ON_ROOM_CREATED", JSON.stringify({ code: room.code }));
  });

  socket.on("ROOM_CANCEL", () => {
    const pending = socket.data.pendingRoomCode;
    if (!pending) return;
    socket.data.pendingRoomCode = null;
    const room = getRoom(pending);
    if (room && getPlayerList(room).length === 0) {
      destroyRoomIfEmpty(room);
    }
  });

  socket.on("ROOM_JOIN", async (payload) => {
    if (socket.data.roomCode) {
      emitRoomError(socket, "Você já está em uma sala.");
      return;
    }

    const code = String(payload?.code || "")
      .trim()
      .toUpperCase();
    const name = normalizeName(payload?.name);
    const sprite = String(payload?.sprite || "").trim();
    const accessToken = String(payload?.accessToken || "").trim();

    const authRequired =
      String(process.env.SUPABASE_AUTH_REQUIRED || "true").toLowerCase() !==
      "false";

    let user = null;
    if (accessToken) {
      user = await verifyUserAccessToken(accessToken);
    }

    if (authRequired && !user) {
      emitRoomError(socket, "Faça login para entrar na sala.");
      return;
    }

    const room = getRoom(code);
    if (!room) {
      emitRoomError(socket, "Sala inexistente.");
      return;
    }

    if (room.phase !== "lobby") {
      emitRoomError(socket, "Partida em andamento. Aguarde o lobby.");
      return;
    }

    if (getPlayerList(room).length >= MAX_PLAYERS) {
      emitRoomError(socket, "Sala cheia (máx. 4 jogadores).");
      return;
    }

    if (!name) {
      emitRoomError(socket, "Digite um nome válido.");
      return;
    }

    if (!SPRITE_SET.has(sprite)) {
      emitRoomError(socket, "Sprite inválido.");
      return;
    }

    if (takenSprites(room).has(sprite)) {
      emitRoomError(socket, "Esse sprite já está em uso na sala.");
      return;
    }

    if (user) {
      const alreadyIn = getPlayerList(room).some((p) => p.userId === user.id);
      if (alreadyIn) {
        emitRoomError(socket, "Esta conta já está nesta sala.");
        return;
      }
    }

    socket.join(room.code);
    socket.data.roomCode = room.code;
    socket.data.pendingRoomCode = null;
    socket.data.userId = user?.id || null;
    room.createdBy = null;

    if (!room.hostId) {
      room.hostId = socket.id;
    }

    room.players[socket.id] = {
      id: socket.id,
      userId: user?.id || null,
      name,
      ready: false,
      alive: true,
      wins: 0,
      abilityId: null,
      row: 0,
      col: 0,
      x: 0,
      y: 0,
      sprite,
      facing: "fr",
      frame: 1,
      bombRange: 1,
      maxBombs: 1,
    };
    abilitySystem.resetPlayerAbilityState(room.players[socket.id]);

    if (user) {
      upsertProfilePrefs(user.id, {
        displayName: name,
        sprite,
        email: user.email,
      }).catch((err) => console.warn("[supabase] prefs:", err.message));
    }

    socket.emit("ON_ROOM_JOINED", JSON.stringify({ code: room.code }));
    emitState(room);
  });

  socket.on("ROOM_KICK", (payload) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) {
      emitRoomError(socket, "Você não está em uma sala.");
      return;
    }
    if (room.hostId !== socket.id) {
      emitRoomError(socket, "Só o host pode expulsar jogadores.");
      return;
    }
    if (room.phase !== "lobby") {
      emitRoomError(socket, "Só é possível expulsar no lobby.");
      return;
    }

    const targetId = String(payload?.playerId || "");
    if (!targetId || targetId === socket.id) {
      emitRoomError(socket, "Não é possível expulsar este jogador.");
      return;
    }
    if (!room.players[targetId]) {
      emitRoomError(socket, "Jogador não encontrado na sala.");
      return;
    }

    removePlayerFromRoom(room, targetId, { kicked: true });

    if (getPlayerList(room).length === 0) {
      destroyRoomIfEmpty(room);
      return;
    }

    emitState(room);
  });

  socket.on("ROOM_TAKEN_SPRITES", (payload) => {
    const code = String(payload?.code || "")
      .trim()
      .toUpperCase();
    const room = getRoom(code);
    if (!room) {
      emitRoomError(socket, "Sala inexistente.");
      return;
    }

    socket.emit(
      "ON_TAKEN_SPRITES",
      JSON.stringify({
        code: room.code,
        takenSprites: [...takenSprites(room)],
      })
    );
  });

  socket.on("disconnect", () => {
    const pending = socket.data.pendingRoomCode;
    if (pending) {
      const pendingRoom = getRoom(pending);
      if (pendingRoom) {
        if (getPlayerList(pendingRoom).length === 0) {
          destroyRoomIfEmpty(pendingRoom);
        } else if (pendingRoom.hostId === socket.id) {
          pendingRoom.hostId = null;
          ensureHost(pendingRoom);
          emitState(pendingRoom);
        }
      }
    }

    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    const room = getRoom(roomCode);
    if (!room) return;

    const wasPlaying = room.phase === "playing";
    const wasCountdown = room.phase === "countdown";
    delete room.players[socket.id];
    socket.data.roomCode = null;

    if (room.hostId === socket.id) {
      room.hostId = null;
      ensureHost(room);
    }

    if (getPlayerList(room).length === 0) {
      destroyRoomIfEmpty(room);
      return;
    }

    if (room.phase === "lobby") {
      emitState(room);
      return;
    }

    if (wasCountdown) {
      clearCountdownTimer(room);
      returnToLobby(room);
      return;
    }

    if (wasPlaying) {
      checkWinCondition(room);
      emitState(room);
    } else if (room.phase === "gameover") {
      emitState(room);
    }
  });

  socket.on("LOBBY_TOGGLE_READY", () => {
    const room = getRoom(socket.data.roomCode);
    if (!room || room.phase !== "lobby") return;
    const player = room.players[socket.id];
    if (!player) return;

    player.ready = !player.ready;
    emitState(room);

    if (canStartGame(room)) startGame(room);
  });

  socket.on("COUNTDOWN_SELECT_ABILITY", (payload) => {
    const room = getRoom(socket.data.roomCode);
    if (!room || room.phase !== "countdown") return;
    if (!(room.countdown > 0)) return;

    const player = room.players[socket.id];
    if (!player) return;
    if (isValidAbilityId(player.abilityId)) return;

    const abilityId = String(payload?.abilityId || "").trim();
    if (!isValidAbilityId(abilityId)) {
      emitRoomError(socket, "Escolha um poder válido.");
      return;
    }

    player.abilityId = abilityId;

    if (player.userId) {
      upsertProfilePrefs(player.userId, { abilityId }).catch((err) =>
        console.warn("[supabase] prefs:", err.message)
      );
    }

    emitState(room);
    maybeShrinkCountdownAfterPicks(room);
  });

  socket.on("ON_USER_MOVE", (payload) => {
    const room = getRoom(socket.data.roomCode);
    if (!room || room.phase !== "playing") return;
    const player = room.players[socket.id];
    if (!player || !player.alive) return;

    const move = payload?.move || {};
    let dCol = move.x === 0 ? 0 : move.x > 0 ? 1 : -1;
    let dRow = move.y === 0 ? 0 : move.y > 0 ? 1 : -1;
    if (dCol === 0 && dRow === 0) return;

    const mod = abilitySystem.applyMoveModifiers(player, dRow, dCol);
    if (mod.blocked) return;
    dRow = mod.dRow;
    dCol = mod.dCol;
    if (dCol === 0 && dRow === 0) return;

    const nextRow = player.row + dRow;
    const nextCol = player.col + dCol;

    if (isBlocked(room, nextRow, nextCol)) return;
    const canPassBomb =
      typeof abilitySystem.canPassBomb === "function" &&
      abilitySystem.canPassBomb(player);
    if (!canPassBomb && hasBombAt(room, nextRow, nextCol)) return;

    const canPassPlayers =
      typeof abilitySystem.canPassPlayers === "function" &&
      abilitySystem.canPassPlayers(player);
    if (
      !canPassPlayers &&
      typeof abilitySystem.hasBlockingPlayerAt === "function" &&
      abilitySystem.hasBlockingPlayerAt(room, nextRow, nextCol, player.id)
    ) {
      return;
    }

    player.row = nextRow;
    player.col = nextCol;
    player.x = tileToPx(nextCol);
    player.y = tileToPx(nextRow);
    player.frame = player.frame === 1 ? 2 : 1;
    player.lastMoveAt = Date.now();

    if (dRow < 0) player.facing = "bk";
    else if (dRow > 0) player.facing = "fr";
    else if (dCol < 0) player.facing = "lf";
    else if (dCol > 0) player.facing = "rt";

    collectPickup(room, player);
    emitState(room);
  });

  socket.on("ON_ABILITY_USE", () => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    const player = room.players[socket.id];
    if (!player) return;
    abilitySystem.tryUseAbility(room, player);
  });

  socket.on("ON_BOMB_PLACE", () => {
    const room = getRoom(socket.data.roomCode);
    if (!room || room.phase !== "playing") return;
    const player = room.players[socket.id];
    if (!player || !player.alive) return;

    const bomb = placeBombAt(room, player, player.row, player.col);
    if (!bomb) return;
    emitState(room);
  });
});

server.listen(PORT, HOST, () =>
  console.log(`listening on http://${HOST}:${PORT}`)
);
