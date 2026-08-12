/**
 * Pure room helpers (testable without Socket.IO).
 */

const MAX_PLAYERS_DEFAULT = 4;

function normalizeRoomName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 24);
}

function filterPublicRooms(roomsMap, { maxPlayers = MAX_PLAYERS_DEFAULT } = {}) {
  const list = Array.isArray(roomsMap)
    ? roomsMap
    : Object.values(roomsMap || {});

  return list
    .filter((room) => {
      const players = room.players
        ? Object.values(room.players)
        : room.playerList || [];
      const count =
        typeof room.playerCount === "number" ? room.playerCount : players.length;
      return (
        room.visibility === "public" &&
        room.phase === "lobby" &&
        count >= 1 &&
        count < maxPlayers
      );
    })
    .map((room) => {
      const players = room.players
        ? Object.values(room.players)
        : room.playerList || [];
      const count =
        typeof room.playerCount === "number" ? room.playerCount : players.length;
      return {
        code: room.code,
        name: room.name || `Sala ${room.code}`,
        playerCount: count,
        maxPlayers,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function stripRoomForPersist(room) {
  if (!room) return null;
  const {
    countdownTimer: _ct,
    resetTimer: _rt,
    projectileTimer: _pt,
    ...rest
  } = room;
  return JSON.parse(JSON.stringify(rest));
}

module.exports = {
  MAX_PLAYERS_DEFAULT,
  normalizeRoomName,
  filterPublicRooms,
  stripRoomForPersist,
};
