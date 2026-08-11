import { useEffect, useRef } from "react";
import { sfx, unlockAudio } from "../sounds";

export function useGameSounds(gameState, myId) {
  const prevRef = useRef(null);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = gameState;
    if (!prev || !gameState) return;

    const me = (gameState.players || []).find((p) => p.id === myId);
    const prevMe = (prev.players || []).find((p) => p.id === myId);

    if (prev.phase !== "countdown" && gameState.phase === "countdown") {
      if (gameState.countdown > 0 && gameState.countdown <= 3) sfx.countdown();
    } else if (
      prev.phase === "countdown" &&
      gameState.phase === "countdown" &&
      prev.countdown !== gameState.countdown
    ) {
      if (gameState.countdown > 0 && gameState.countdown <= 3) sfx.countdown();
      else if (gameState.countdown === 0) sfx.go();
    }

    if (prev.phase === "countdown" && gameState.phase === "playing") {
      sfx.go();
    }

    const prevBombs = prev.bombs || [];
    const nextBombs = gameState.bombs || [];
    const prevIds = new Set(prevBombs.map((b) => b.id));

    for (const bomb of nextBombs) {
      if (!prevIds.has(bomb.id) && bomb.state === "ticking") {
        sfx.placeBomb();
      }
      const before = prevBombs.find((b) => b.id === bomb.id);
      if (before?.state === "ticking" && bomb.state === "exploding") {
        sfx.explode();
      }
    }

    const prevPickups = prev.pickups || [];
    const nextPickupIds = new Set((gameState.pickups || []).map((p) => p.id));
    if (
      prevPickups.some((p) => !nextPickupIds.has(p.id)) &&
      gameState.phase === "playing"
    ) {
      sfx.pickup();
    }

    if (prevMe?.alive && me && !me.alive && gameState.phase === "playing") {
      sfx.death();
    }

    const prevCd = prevMe?.abilityCooldownUntil || 0;
    const nextCd = me?.abilityCooldownUntil || 0;
    if (nextCd > prevCd) {
      sfx.abilityCast();
    }

    const prevProj = prev.projectiles || [];
    const nextProj = gameState.projectiles || [];
    if (prevProj.length > nextProj.length) {
      sfx.abilityHit();
    }

    const prevFx = (prev.abilityFx || []).length;
    const nextFx = (gameState.abilityFx || []).length;
    if (nextFx > prevFx) {
      sfx.abilityCast();
    }

    if (prev.phase !== "gameover" && gameState.phase === "gameover") {
      if (gameState.winnerId && gameState.winnerId === myId) sfx.win();
      else sfx.lose();
    }
  }, [gameState, myId]);
}
