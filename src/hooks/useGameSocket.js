import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  ABILITY_ACTIVATION_KEY,
  INITIAL_STATE,
  MOVE_COOLDOWN_MS,
  getAbility,
} from "../constants";

export function useGameSocket() {
  const socketRef = useRef(null);
  const lastMoveAt = useRef(0);
  const [myId, setMyId] = useState(null);
  const [connected, setConnected] = useState(false);
  const [screen, setScreen] = useState("home");
  const [pendingRoomCode, setPendingRoomCode] = useState(null);
  const [gameState, setGameState] = useState(INITIAL_STATE);
  const [roomError, setRoomError] = useState(null);
  const [takenSprites, setTakenSprites] = useState([]);
  const [joining, setJoining] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const gameStateRef = useRef(gameState);
  const myIdRef = useRef(myId);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    myIdRef.current = myId;
  }, [myId]);

  useEffect(() => {
    const socket = io({
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setMyId(socket.id);
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("ON_ROOM_CREATED", (payload) => {
      const data = JSON.parse(payload);
      setRoomError(null);
      setPendingRoomCode(data.code);
      setTakenSprites([]);
      setScreen("character");
    });

    socket.on("ON_ROOM_JOINED", (payload) => {
      const data = JSON.parse(payload);
      setRoomError(null);
      setJoining(false);
      setPendingRoomCode(data.code);
      setScreen("inRoom");
    });

    socket.on("ON_ROOM_ERROR", (payload) => {
      const data = JSON.parse(payload);
      setJoining(false);
      setRoomError(data.reason || "Não foi possível entrar na sala.");
    });

    socket.on("ON_KICKED", (payload) => {
      const data = JSON.parse(payload);
      setJoining(false);
      setPendingRoomCode(null);
      setTakenSprites([]);
      setGameState(INITIAL_STATE);
      setChatMessages([]);
      setScreen("home");
      setRoomError(data.reason || "Você foi expulso da sala.");
    });

    socket.on("ON_TAKEN_SPRITES", (payload) => {
      const data = JSON.parse(payload);
      setTakenSprites(data.takenSprites || []);
    });

    socket.on("ON_GAME_STATE", (payload) => {
      const state = JSON.parse(payload);
      setGameState(state);
      setTakenSprites(state.takenSprites || []);
      setRoomError(null);
      setScreen("inRoom");
    });

    socket.on("ON_CHAT_HISTORY", (payload) => {
      const data = JSON.parse(payload);
      setChatMessages(Array.isArray(data.messages) ? data.messages : []);
    });

    socket.on("ON_CHAT_MESSAGE", (payload) => {
      const message = JSON.parse(payload);
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        const next = [...prev, message];
        return next.length > 80 ? next.slice(-80) : next;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (screen !== "character" || !pendingRoomCode) return;

    const socket = socketRef.current;
    if (!socket) return;

    const refresh = () => {
      socket.emit("ROOM_TAKEN_SPRITES", { code: pendingRoomCode });
    };

    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [screen, pendingRoomCode]);

  const movePlayer = useCallback((move) => {
    const state = gameStateRef.current;
    const id = myIdRef.current;
    const socket = socketRef.current;
    if (!socket || !state || state.phase !== "playing") return;
    if (!move || (move.x === 0 && move.y === 0)) return;

    const me = (state.players || []).find((p) => p.id === id);
    if (!me || !me.alive) return;

    const now = Date.now();
    const clockSkew = now - (state.serverNow || now);
    const serverAligned = now - clockSkew;
    if (me.stunUntil && me.stunUntil > serverAligned) return;

    const slowActive = me.slowUntil && me.slowUntil > serverAligned;
    const ability = getAbility(me.abilityId);
    const cooldown = slowActive
      ? ability?.slowMoveCooldownMs || MOVE_COOLDOWN_MS * 2
      : MOVE_COOLDOWN_MS;

    if (now - lastMoveAt.current < cooldown) return;
    lastMoveAt.current = now;
    socket.emit("ON_USER_MOVE", { move });
  }, []);

  const placeBomb = useCallback(() => {
    const state = gameStateRef.current;
    const id = myIdRef.current;
    const socket = socketRef.current;
    if (!socket || !state || state.phase !== "playing") return;
    const me = (state.players || []).find((p) => p.id === id);
    if (!me || !me.alive) return;
    socket.emit("ON_BOMB_PLACE");
  }, []);

  const useAbility = useCallback(() => {
    const state = gameStateRef.current;
    const id = myIdRef.current;
    const socket = socketRef.current;
    if (!socket || !state || state.phase !== "playing") return;
    const me = (state.players || []).find((p) => p.id === id);
    if (!me || !me.alive) return;
    socket.emit("ON_ABILITY_USE");
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        e.target?.isContentEditable
      ) {
        return;
      }

      const state = gameStateRef.current;
      if (!state || state.phase !== "playing") return;

      const abilityKey = state.activationKey || ABILITY_ACTIVATION_KEY || "KeyE";
      if (e.code === abilityKey) {
        e.preventDefault();
        useAbility();
        return;
      }

      const moves = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 },
        s: { x: 0, y: 1 },
        a: { x: -1, y: 0 },
        d: { x: 1, y: 0 },
        W: { x: 0, y: -1 },
        S: { x: 0, y: 1 },
        A: { x: -1, y: 0 },
        D: { x: 1, y: 0 },
      };

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        placeBomb();
        return;
      }

      const move = moves[e.key];
      if (!move) return;
      e.preventDefault();
      movePlayer(move);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [movePlayer, placeBomb, useAbility]);

  const createRoom = () => {
    setRoomError(null);
    socketRef.current?.emit("ROOM_CREATE");
  };

  const prepareJoin = (code) => {
    const normalized = String(code || "")
      .trim()
      .toUpperCase();
    if (!normalized) {
      setRoomError("Digite o código da sala.");
      return;
    }
    setRoomError(null);
    setPendingRoomCode(normalized);
    setTakenSprites([]);
    setScreen("character");
  };

  const joinRoom = ({ name, sprite, accessToken }) => {
    if (!pendingRoomCode) {
      setRoomError("Código da sala ausente.");
      return;
    }
    setJoining(true);
    setRoomError(null);
    socketRef.current?.emit("ROOM_JOIN", {
      code: pendingRoomCode,
      name,
      sprite,
      accessToken: accessToken || null,
    });
  };

  const backToHome = () => {
    socketRef.current?.emit("ROOM_CANCEL");
    setRoomError(null);
    setPendingRoomCode(null);
    setTakenSprites([]);
    setJoining(false);
    setGameState(INITIAL_STATE);
    setChatMessages([]);
    setScreen("home");
  };

  const toggleReady = () => {
    socketRef.current?.emit("LOBBY_TOGGLE_READY");
  };

  const selectAbility = (abilityId) => {
    socketRef.current?.emit("COUNTDOWN_SELECT_ABILITY", { abilityId });
  };

  const kickPlayer = (playerId) => {
    socketRef.current?.emit("ROOM_KICK", { playerId });
  };

  const sendChat = (text) => {
    const value = String(text || "").trim();
    if (!value) return;
    socketRef.current?.emit("ROOM_CHAT", { text: value });
  };

  return {
    myId,
    connected,
    screen,
    pendingRoomCode,
    gameState,
    roomError,
    takenSprites,
    joining,
    chatMessages,
    createRoom,
    prepareJoin,
    joinRoom,
    backToHome,
    toggleReady,
    selectAbility,
    kickPlayer,
    sendChat,
    movePlayer,
    placeBomb,
    useAbility,
  };
}
