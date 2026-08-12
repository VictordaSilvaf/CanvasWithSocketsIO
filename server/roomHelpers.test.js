import { describe, expect, it } from "vitest";
import {
  filterPublicRooms,
  normalizeRoomName,
  stripRoomForPersist,
} from "../server/roomHelpers.cjs";

describe("normalizeRoomName", () => {
  it("trims and collapses spaces", () => {
    expect(normalizeRoomName("  Arena   Top  ")).toBe("Arena Top");
  });

  it("limits to 24 chars", () => {
    expect(normalizeRoomName("a".repeat(40))).toHaveLength(24);
  });
});

describe("filterPublicRooms", () => {
  it("requires public lobby with at least one player and free slot", () => {
    const rooms = {
      A: {
        code: "AAAAAA",
        name: "Vazia",
        visibility: "public",
        phase: "lobby",
        players: {},
      },
      B: {
        code: "BBBBBB",
        name: "Cheia",
        visibility: "public",
        phase: "lobby",
        players: { 1: {}, 2: {}, 3: {}, 4: {} },
      },
      C: {
        code: "CCCCCC",
        name: "Ok",
        visibility: "public",
        phase: "lobby",
        players: { 1: {} },
      },
      D: {
        code: "DDDDDD",
        name: "Privada",
        visibility: "private",
        phase: "lobby",
        players: { 1: {} },
      },
      E: {
        code: "EEEEEE",
        name: "Jogando",
        visibility: "public",
        phase: "playing",
        players: { 1: {} },
      },
    };

    const list = filterPublicRooms(rooms, { maxPlayers: 4 });
    expect(list).toHaveLength(1);
    expect(list[0].code).toBe("CCCCCC");
    expect(list[0].playerCount).toBe(1);
  });
});

describe("stripRoomForPersist", () => {
  it("removes timer handles", () => {
    const snap = stripRoomForPersist({
      code: "XYZ",
      phase: "lobby",
      countdownTimer: 123,
      resetTimer: 456,
      projectileTimer: 789,
      players: { a: { id: "a", name: "Bob" } },
    });
    expect(snap.countdownTimer).toBeUndefined();
    expect(snap.resetTimer).toBeUndefined();
    expect(snap.projectileTimer).toBeUndefined();
    expect(snap.players.a.name).toBe("Bob");
  });
});
