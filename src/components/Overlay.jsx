import { useEffect, useState } from "react";
import { ABILITY_LIST, getAbility, loadPlayerPrefs } from "../constants";

export default function Overlay({ gameState, myId, onSelectAbility }) {
  const { phase, countdown, winnerId, players } = gameState;
  const [animKey, setAnimKey] = useState(0);
  const preferredAbility = loadPlayerPrefs().abilityId;

  useEffect(() => {
    if (phase === "countdown") setAnimKey((k) => k + 1);
  }, [phase, countdown]);

  if (phase === "countdown") {
    const isGo = !(countdown > 0);
    const me = (players || []).find((p) => p.id === myId);
    const locked = Boolean(getAbility(me?.abilityId));
    const pickedCount = (players || []).filter((p) =>
      getAbility(p.abilityId)
    ).length;
    const total = (players || []).length;
    const canPick = !isGo && !locked && typeof onSelectAbility === "function";

    return (
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-start gap-3 overflow-y-auto overscroll-contain bg-forest-950/80 px-2 py-3 sm:justify-center sm:gap-4 sm:px-3 sm:py-4">
        <p
          key={animKey}
          className={[
            "m-0 min-w-24 border-2 px-6 py-4 text-center font-bold leading-none tracking-wide sm:min-w-32 sm:px-8 sm:py-5",
            isGo
              ? "animate-go-flash border-forest-100 bg-forest-500 text-4xl text-forest-950 sm:text-5xl"
              : "animate-countdown-pop border-forest-300 bg-forest-950/90 text-5xl text-forest-100 sm:text-6xl",
          ].join(" ")}
        >
          {isGo ? "GO!" : String(countdown)}
        </p>

        {!isGo ? (
          <div className="w-full max-w-xl border border-forest-600 bg-forest-950/95 px-3 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.35)] sm:px-4">
            <p className="mb-1 text-center text-sm font-bold text-forest-100">
              {locked
                ? `Poder: ${getAbility(me.abilityId)?.name}`
                : "Escolha seu poder"}
            </p>
            <p className="mb-3 text-center text-[11px] text-forest-300">
              {pickedCount}/{total} escolheram
              {!locked
                ? " · sem escolha = aleatório · todos prontos → 3s"
                : " · aguardando os outros"}
            </p>

            <div className="grid max-h-[45dvh] gap-2 overflow-y-auto sm:max-h-none sm:grid-cols-2">
              {ABILITY_LIST.map((ability) => {
                const active = me?.abilityId === ability.id;
                const suggested =
                  !locked && preferredAbility === ability.id && !active;
                return (
                  <button
                    key={ability.id}
                    type="button"
                    disabled={!canPick}
                    onClick={() => onSelectAbility(ability.id)}
                    className={[
                      "border px-3 py-2.5 text-left",
                      active
                        ? "border-forest-100 bg-forest-100/15 ring-1 ring-forest-400"
                        : "border-forest-600 bg-forest-900/50",
                      canPick
                        ? "cursor-pointer hover:border-forest-400 active:bg-forest-600/30"
                        : "cursor-default opacity-80",
                      suggested ? "border-forest-400/70" : "",
                    ].join(" ")}
                  >
                    <span className="block text-sm font-bold text-forest-100">
                      {ability.name}
                    </span>
                    <span className="mt-1 block text-[11px] leading-snug text-forest-300">
                      {ability.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (phase !== "gameover") return null;

  const winner = players.find((p) => p.id === winnerId);
  let message = "Empate — ninguém sobreviveu";
  if (winnerId) {
    message =
      winnerId === myId
        ? "Você venceu!"
        : `${winner?.name || "Jogador"} venceu!`;
  }

  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-forest-950/72">
      <div className="min-w-[200px] border-2 border-forest-500 bg-forest-950/90 px-8 py-6 text-center">
        <p className="m-0 mb-2 text-[28px] font-bold text-forest-100">{message}</p>
        {winner ? (
          <p className="m-0 text-sm text-forest-200">
            Placar: {winner.wins || 0} vitória
            {(winner.wins || 0) === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>
    </div>
  );
}
