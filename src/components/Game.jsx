import Arena from "./Arena";
import Hud from "./Hud";
import Overlay from "./Overlay";
import { useGameSounds } from "../hooks/useGameSounds";

export default function Game({ gameState, myId, onSelectAbility }) {
  useGameSounds(gameState, myId);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-3 overflow-hidden px-2 py-2">
      <Hud gameState={gameState} myId={myId} />
      <div className="relative">
        <Arena gameState={gameState} myId={myId} />
      </div>
      <Overlay
        gameState={gameState}
        myId={myId}
        onSelectAbility={onSelectAbility}
      />
    </div>
  );
}
