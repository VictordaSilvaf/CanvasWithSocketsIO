const path = require("path");

const abilitiesConfig = require(path.join(__dirname, "..", "config", "abilities.json"));

const ABILITIES = abilitiesConfig.abilities || {};
const BASE_MOVE_COOLDOWN_MS = abilitiesConfig.baseMoveCooldownMs ?? 120;
const PROJECTILE_TICK_MS = abilitiesConfig.projectileTickMs ?? 50;
const MAX_ABILITIES_PER_PLAYER =
  abilitiesConfig.selection?.maxAbilitiesPerPlayer ?? 1;

function getAbility(id) {
  return ABILITIES[id] || null;
}

function isValidAbilityId(id) {
  return Boolean(getAbility(id));
}

function abilityIds() {
  return Object.keys(ABILITIES);
}

function pickRandomAbilityId() {
  const ids = abilityIds();
  if (!ids.length) return null;
  return ids[Math.floor(Math.random() * ids.length)];
}

function facingDelta(facing) {
  if (facing === "bk") return { dRow: -1, dCol: 0 };
  if (facing === "lf") return { dRow: 0, dCol: -1 };
  if (facing === "rt") return { dRow: 0, dCol: 1 };
  return { dRow: 1, dCol: 0 };
}

function publicAbilitiesMeta() {
  return Object.values(ABILITIES).map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    cooldownMs: a.cooldownMs,
  }));
}

function isGhostActive(player, now = Date.now()) {
  return Boolean(player?.ghostUntil && now < player.ghostUntil);
}

/**
 * @param {object} ctx helpers from game server
 */
function createAbilitySystem(ctx) {
  const {
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
  } = ctx;

  function clearAbilityFx(room) {
    room.abilityFx = [];
  }

  function clearProjectiles(room) {
    room.projectiles = {};
    if (room.projectileTimer) {
      clearInterval(room.projectileTimer);
      room.projectileTimer = null;
    }
  }

  function resetPlayerAbilityState(player) {
    player.abilityCooldownUntil = 0;
    player.slowUntil = 0;
    player.confusedUntil = 0;
    player.confusedImmuneUntil = 0;
    player.stunUntil = 0;
    player.ghostUntil = 0;
    player.slowMoveCooldownMs = BASE_MOVE_COOLDOWN_MS;
    player.lastMoveAt = 0;
  }

  function ensureProjectileLoop(room) {
    if (room.projectileTimer) return;
    room.projectileTimer = setInterval(() => {
      if (!Object.keys(room.projectiles || {}).length) {
        clearInterval(room.projectileTimer);
        room.projectileTimer = null;
        return;
      }
      tickProjectiles(room);
    }, PROJECTILE_TICK_MS);
  }

  function spawnProjectile(room, {
    type,
    ownerId,
    row,
    col,
    facing,
    speedTilesPerSec,
    maxRangeTiles,
  }) {
    const id = `proj-${++room.projectileSeq}`;
    const { dRow, dCol } = facingDelta(facing);
    room.projectiles[id] = {
      id,
      type,
      ownerId,
      row,
      col,
      x: tileToPx(col),
      y: tileToPx(row),
      dRow,
      dCol,
      facing,
      speedTilesPerSec,
      maxRangeTiles,
      traveled: 0,
      progress: 0,
    };
    ensureProjectileLoop(room);
  }

  function applyTimedEffect(target, {
    untilKey,
    durationMs,
    stackable,
    refreshDurationOnHit,
    immuneUntilKey,
    immunityAfterEffectMs,
    onApply,
  }) {
    const now = Date.now();
    if (immuneUntilKey && target[immuneUntilKey] && now < target[immuneUntilKey]) {
      return false;
    }
    const active = target[untilKey] && now < target[untilKey];
    if (active && stackable === false && !refreshDurationOnHit) {
      return false;
    }
    target[untilKey] = now + durationMs;
    if (immuneUntilKey && immunityAfterEffectMs) {
      target[immuneUntilKey] = target[untilKey] + immunityAfterEffectMs;
    }
    if (typeof onApply === "function") onApply(now);
    return true;
  }

  function hitPlayerWithProjectile(room, projectile, target) {
    if (projectile.type === "ice_ray") {
      const cfg = getAbility("ice_ray");
      applyTimedEffect(target, {
        untilKey: "slowUntil",
        durationMs: cfg.slowDurationMs || 2500,
        stackable: cfg.stackable,
        refreshDurationOnHit: cfg.refreshDurationOnHit !== false,
        onApply: () => {
          target.slowMoveCooldownMs = cfg.slowMoveCooldownMs || 240;
        },
      });
    } else if (projectile.type === "confusion") {
      const cfg = getAbility("confusion");
      applyTimedEffect(target, {
        untilKey: "confusedUntil",
        durationMs: cfg.durationMs || 3000,
        stackable: cfg.stackable,
        refreshDurationOnHit: cfg.refreshDurationOnHit !== false,
        immuneUntilKey: "confusedImmuneUntil",
        immunityAfterEffectMs: cfg.immunityAfterEffectMs || 0,
      });
    }
  }

  function tickProjectiles(room) {
    if (room.phase !== "playing") {
      clearProjectiles(room);
      emitState(room);
      return;
    }

    const dt = PROJECTILE_TICK_MS / 1000;
    let changed = false;
    const toDelete = [];

    for (const proj of Object.values(room.projectiles)) {
      proj.progress += proj.speedTilesPerSec * dt;
      while (proj.progress >= 1) {
        proj.progress -= 1;
        proj.row += proj.dRow;
        proj.col += proj.dCol;
        proj.traveled += 1;
        proj.x = tileToPx(proj.col);
        proj.y = tileToPx(proj.row);
        changed = true;

        if (
          proj.row < 0 ||
          proj.col < 0 ||
          proj.row >= room.map.length ||
          proj.col >= (room.map[0] || []).length
        ) {
          toDelete.push(proj.id);
          break;
        }

        const cell = room.map[proj.row][proj.col];
        if (cell === HARD || cell === SOFT) {
          toDelete.push(proj.id);
          break;
        }

        if (proj.traveled > proj.maxRangeTiles) {
          toDelete.push(proj.id);
          break;
        }

        const hit = getAlivePlayers(room).find(
          (p) =>
            p.id !== proj.ownerId &&
            p.row === proj.row &&
            p.col === proj.col &&
            !isGhostActive(p)
        );
        if (hit) {
          hitPlayerWithProjectile(room, proj, hit);
          toDelete.push(proj.id);
          break;
        }
      }
    }

    for (const id of toDelete) {
      delete room.projectiles[id];
      changed = true;
    }

    if (changed) emitState(room);

    if (!Object.keys(room.projectiles).length && room.projectileTimer) {
      clearInterval(room.projectileTimer);
      room.projectileTimer = null;
    }
  }

  function useIceRay(room, player, cfg) {
    spawnProjectile(room, {
      type: "ice_ray",
      ownerId: player.id,
      row: player.row,
      col: player.col,
      facing: player.facing,
      speedTilesPerSec: cfg.projectileSpeedTilesPerSec || 8,
      maxRangeTiles: cfg.maxRangeTiles || 6,
    });
  }

  function useConfusion(room, player, cfg) {
    spawnProjectile(room, {
      type: "confusion",
      ownerId: player.id,
      row: player.row,
      col: player.col,
      facing: player.facing,
      speedTilesPerSec: cfg.projectileSpeedTilesPerSec || 10,
      maxRangeTiles: cfg.maxRangeTiles || 5,
    });
  }

  function useMiner(room, player, cfg) {
    const range = cfg.rangeTiles || 1;
    const { dRow, dCol } = facingDelta(player.facing);
    const row = player.row + dRow * range;
    const col = player.col + dCol * range;
    if (row < 0 || col < 0 || row >= room.map.length || col >= room.map[0].length) {
      return false;
    }
    if (room.map[row][col] !== SOFT) return false;
    if (cfg.affectsSolidBlocks === false && room.map[row][col] === HARD) {
      return false;
    }
    room.map[row][col] = EMPTY;
    room.abilityFx.push({
      id: `fx-${++room.fxSeq}`,
      type: "miner",
      row,
      col,
      x: tileToPx(col),
      y: tileToPx(row),
      until: Date.now() + 300,
    });
    return true;
  }

  function useLocalBlast(room, player, cfg) {
    const radius = cfg.radiusTiles || 2;
    const knockback = cfg.knockback || {};
    const pushEnabled = knockback.enabled !== false;
    const pushTiles = knockback.maxTiles ?? cfg.pushTiles ?? 1;
    const stunMs = cfg.stunMs || 800;
    const stunOnBlocked = knockback.stunOnBlockedPush !== false;
    const now = Date.now();
    const cells = [];

    for (let r = player.row - radius; r <= player.row + radius; r++) {
      for (let c = player.col - radius; c <= player.col + radius; c++) {
        if (r < 0 || c < 0 || r >= room.map.length || c >= room.map[0].length) continue;
        const dist = Math.abs(r - player.row) + Math.abs(c - player.col);
        if (dist === 0 || dist > radius) continue;
        if (room.map[r][c] === SOFT) {
          room.map[r][c] = EMPTY;
        }
        cells.push({ row: r, col: c, x: tileToPx(c), y: tileToPx(r) });
      }
    }

    room.abilityFx.push({
      id: `fx-${++room.fxSeq}`,
      type: "local_blast",
      cells,
      until: now + (cfg.fxDurationMs || 400),
    });

    if (!pushEnabled) return true;

    for (const enemy of getAlivePlayers(room)) {
      if (enemy.id === player.id) continue;
      if (isGhostActive(enemy, now)) continue;
      const dist =
        Math.abs(enemy.row - player.row) + Math.abs(enemy.col - player.col);
      if (dist === 0 || dist > radius) continue;

      let dRow = Math.sign(enemy.row - player.row);
      let dCol = Math.sign(enemy.col - player.col);
      if (dRow === 0 && dCol === 0) continue;

      if (Math.abs(enemy.row - player.row) >= Math.abs(enemy.col - player.col)) {
        dCol = 0;
        dRow = Math.sign(enemy.row - player.row) || 0;
      } else {
        dRow = 0;
        dCol = Math.sign(enemy.col - player.col) || 0;
      }

      let pushed = false;
      let blocked = false;
      for (let i = 0; i < pushTiles; i++) {
        const nextRow = enemy.row + dRow;
        const nextCol = enemy.col + dCol;
        if (isBlocked(room, nextRow, nextCol) || hasBombAt(room, nextRow, nextCol)) {
          blocked = true;
          break;
        }
        enemy.row = nextRow;
        enemy.col = nextCol;
        enemy.x = tileToPx(nextCol);
        enemy.y = tileToPx(nextRow);
        pushed = true;
        if (knockback.stopsOnObstacle === false) continue;
      }

      if (stunOnBlocked && (blocked || !pushed)) {
        enemy.stunUntil = now + stunMs;
      }
    }

    return true;
  }

  function useGhost(room, player, cfg) {
    const now = Date.now();
    if (cfg.restrictions?.cannotActivateWhileStunned !== false) {
      if (player.stunUntil && now < player.stunUntil) return false;
    }
    // Não acumula / não reativa enquanto já está ghost
    if (cfg.restrictions?.cannotStack !== false && isGhostActive(player, now)) {
      return false;
    }
    player.ghostUntil = now + (cfg.durationMs || 1500);
    room.abilityFx.push({
      id: `fx-${++room.fxSeq}`,
      type: "ghost",
      ownerId: player.id,
      until: player.ghostUntil,
    });
    return true;
  }

  function obstacleFlag(obstacles, key, legacyKeys = []) {
    if (Object.prototype.hasOwnProperty.call(obstacles, key)) {
      return obstacles[key] !== false;
    }
    for (const legacy of legacyKeys) {
      if (Object.prototype.hasOwnProperty.call(obstacles, legacy)) {
        return obstacles[legacy] !== false;
      }
    }
    return true;
  }

  function throwTileBlocked(room, row, col, obstacles = {}) {
    const mapRows = room.map.length;
    const mapCols = (room.map[0] || []).length;
    if (row < 0 || col < 0 || row >= mapRows || col >= mapCols) {
      return obstacleFlag(obstacles, "blocksWalls");
    }
    const cell = room.map[row][col];
    if (
      cell === HARD &&
      obstacleFlag(obstacles, "blocksSolidBlocks", ["blocksSolid"])
    ) {
      return true;
    }
    if (
      cell === SOFT &&
      obstacleFlag(obstacles, "blocksSoftBlocks", ["blocksSoft"])
    ) {
      return true;
    }
    if (
      obstacleFlag(obstacles, "blocksExistingBombs") &&
      hasBombAt(room, row, col)
    ) {
      return true;
    }
    if (obstacles.blocksPlayers === true) {
      const occupied = getAlivePlayers(room).some(
        (p) => p.row === row && p.col === col
      );
      if (occupied) return true;
    }
    return false;
  }

  function useRemoteBomb(room, player, cfg) {
    if (typeof placeBombAt !== "function") return false;

    const maxTiles = cfg.maxThrowTiles || 2;
    const { dRow, dCol } = facingDelta(player.facing);
    const freeTiles = [];

    // Verificação sequencial: para no primeiro obstáculo (bomba não atravessa)
    for (let i = 1; i <= maxTiles; i++) {
      const row = player.row + dRow * i;
      const col = player.col + dCol * i;
      if (throwTileBlocked(room, row, col, cfg.obstacles)) break;
      freeTiles.push({ row, col });
    }

    if (!freeTiles.length) {
      // Tile 1 bloqueado → cancela sem consumir cooldown
      return false;
    }

    // Preferir o tile livre mais distante (tile 2 se ambos livres, senão tile 1)
    const preferFarthest = cfg.placement?.preferFarthestValidTile !== false;
    const dest = preferFarthest
      ? freeTiles[freeTiles.length - 1]
      : freeTiles[0];

    const bomb = placeBombAt(room, player, dest.row, dest.col);
    if (!bomb) return false;

    room.abilityFx.push({
      id: `fx-${++room.fxSeq}`,
      type: "remote_bomb",
      row: dest.row,
      col: dest.col,
      x: tileToPx(dest.col),
      y: tileToPx(dest.row),
      until: Date.now() + 350,
    });
    return true;
  }

  function tryUseAbility(room, player) {
    const now = Date.now();
    if (room.phase !== "playing") return false;
    if (!player || !player.alive) return false;
    if (player.stunUntil && now < player.stunUntil) return false;
    if (player.abilityCooldownUntil && now < player.abilityCooldownUntil) return false;

    const cfg = getAbility(player.abilityId);
    if (!cfg) return false;

    let ok = true;
    if (cfg.id === "ice_ray") useIceRay(room, player, cfg);
    else if (cfg.id === "confusion") useConfusion(room, player, cfg);
    else if (cfg.id === "miner") ok = useMiner(room, player, cfg);
    else if (cfg.id === "local_blast") ok = useLocalBlast(room, player, cfg);
    else if (cfg.id === "ghost") ok = useGhost(room, player, cfg);
    else if (cfg.id === "remote_bomb") ok = useRemoteBomb(room, player, cfg);
    else ok = false;

    if (!ok) return false;

    player.abilityCooldownUntil = now + (cfg.cooldownMs || 5000);
    room.abilityFx = (room.abilityFx || []).filter((fx) => fx.until > now);
    emitState(room);
    return true;
  }

  function applyMoveModifiers(player, dRow, dCol) {
    const now = Date.now();
    const ghost = isGhostActive(player, now);
    // Stun não interrompe Ghost: durante Ghost o movimento não é bloqueado por stun.
    // Depois que o Ghost acaba, stunUntil ainda vigente passa a valer normalmente.
    if (!ghost && player.stunUntil && now < player.stunUntil) {
      return { blocked: true, dRow: 0, dCol: 0 };
    }

    let nextRowDelta = dRow;
    let nextColDelta = dCol;
    if (player.confusedUntil && now < player.confusedUntil) {
      const cfg = getAbility("confusion");
      const map = cfg?.invertControls;
      if (map) {
        // Input deltas: up=-1 row, down=+1 row, left=-1 col, right=+1 col
        if (dRow < 0) nextRowDelta = map.up === "down" ? 1 : map.up === "up" ? -1 : 0;
        else if (dRow > 0) nextRowDelta = map.down === "up" ? -1 : map.down === "down" ? 1 : 0;
        if (dCol < 0) nextColDelta = map.left === "right" ? 1 : map.left === "left" ? -1 : 0;
        else if (dCol > 0) nextColDelta = map.right === "left" ? -1 : map.right === "right" ? 1 : 0;
        // Keep single-axis moves: clear the unused axis after invert
        if (dRow !== 0) nextColDelta = 0;
        if (dCol !== 0) nextRowDelta = 0;
      } else {
        nextRowDelta = -dRow;
        nextColDelta = -dCol;
      }
    }

    const cooldown =
      player.slowUntil && now < player.slowUntil
        ? player.slowMoveCooldownMs || BASE_MOVE_COOLDOWN_MS
        : BASE_MOVE_COOLDOWN_MS;

    if (now - (player.lastMoveAt || 0) < cooldown) {
      return { blocked: true, dRow: 0, dCol: 0 };
    }

    return { blocked: false, dRow: nextRowDelta, dCol: nextColDelta, cooldown };
  }

  function canPassBomb(player, now = Date.now()) {
    if (!isGhostActive(player, now)) return false;
    const cfg = getAbility("ghost");
    return cfg?.intangibility?.canPassThroughBombs !== false;
  }

  function canPassPlayers(player, now = Date.now()) {
    if (!isGhostActive(player, now)) return false;
    const cfg = getAbility("ghost");
    return cfg?.intangibility?.canPassThroughPlayers !== false;
  }

  function hasBlockingPlayerAt(room, row, col, moverId, now = Date.now()) {
    return getAlivePlayers(room).some((p) => {
      if (p.id === moverId) return false;
      if (p.row !== row || p.col !== col) return false;
      // Ghost no tile não bloqueia (também intangível)
      if (isGhostActive(p, now)) return false;
      return true;
    });
  }

  return {
    abilitiesConfig,
    ABILITIES,
    BASE_MOVE_COOLDOWN_MS,
    getAbility,
    isValidAbilityId,
    publicAbilitiesMeta,
    clearAbilityFx,
    clearProjectiles,
    resetPlayerAbilityState,
    tryUseAbility,
    applyMoveModifiers,
    facingDelta,
    isGhostActive,
    canPassBomb,
    canPassPlayers,
    hasBlockingPlayerAt,
  };
}

module.exports = {
  abilitiesConfig,
  createAbilitySystem,
  isValidAbilityId,
  getAbility,
  abilityIds,
  pickRandomAbilityId,
  publicAbilitiesMeta,
  BASE_MOVE_COOLDOWN_MS,
  MAX_ABILITIES_PER_PLAYER,
  isGhostActive,
};
