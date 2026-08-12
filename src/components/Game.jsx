import Arena from "./Arena";
import Hud from "./Hud";
import MobileControls from "./MobileControls";
import Overlay from "./Overlay";
import { useGameSounds } from "../hooks/useGameSounds";

export default function Game({
  gameState,
  myId,
  onSelectAbility,
  onMove,
  onBomb,
  onAbility,
  onLeave,
}) {
  useGameSounds(gameState, myId);
  const playing = gameState.phase === "playing";
  const me = (gameState.players || []).find((p) => p.id === myId);
  const alive = me?.alive !== false;

  return (
    <div className="relative flex min-h-dvh select-none flex-col items-center gap-2 overflow-hidden px-2 pb-[7.5rem] pt-2 md:justify-center md:gap-3 md:pb-2 md:pt-2">
      <Hud gameState={gameState} myId={myId} onLeave={onLeave} />
      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center md:flex-none">
        <Arena
          gameState={gameState}
          myId={myId}
          compactBottom={playing}
        />
      </div>
      <Overlay
        gameState={gameState}
        myId={myId}
        onSelectAbility={onSelectAbility}
      />
      <MobileControls
        visible={playing && alive}
        onMove={onMove}
        onBomb={onBomb}
        onAbility={onAbility}
        abilityCooldownUntil={me?.abilityCooldownUntil || 0}
        serverNow={gameState.serverNow || 0}
      />
    </div>
  );
}
