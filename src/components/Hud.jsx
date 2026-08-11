import { useEffect, useState } from "react";
import { ABILITY_ACTIVATION_LABEL, getAbility } from "../constants";

export default function Hud({ gameState, myId }) {
  const players = gameState.players || [];
  const me = players.find((p) => p.id === myId);
  const alive = players.filter((p) => p.alive).length;
  const ranked = [...players].sort((a, b) => (b.wins || 0) - (a.wins || 0));
  const ability = getAbility(me?.abilityId);
  const keyLabel =
    gameState.activationKeyLabel || ABILITY_ACTIVATION_LABEL || "E";

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  const skew = now - (gameState.serverNow || now);
  const serverAligned = now - skew;
  const cdLeft = Math.max(
    0,
    Math.ceil(((me?.abilityCooldownUntil || 0) - serverAligned) / 1000)
  );

  const statuses = [];
  if (me?.slowUntil > serverAligned) statuses.push("lento");
  if (me?.confusedUntil > serverAligned) statuses.push("confuso");
  if (me?.stunUntil > serverAligned) statuses.push("stun");
  if (me?.ghostUntil > serverAligned) statuses.push("fantasma");

  return (
    <div className="flex w-full max-w-[1100px] flex-wrap items-center justify-between gap-x-3 gap-y-1 border border-forest-600 bg-forest-950/80 px-2 py-1.5 text-[11px] text-forest-100 sm:px-4 sm:py-2 sm:text-sm">
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <span>Alcance: {me?.bombRange ?? 1}</span>
        <span>Bombas: {me?.maxBombs ?? 1}</span>
        <span>Vivos: {alive}</span>
        <span className="hidden xs:inline sm:inline">Vitórias: {me?.wins ?? 0}</span>
        <span>
          Poder: {ability?.name || "—"}
          <span className="hidden sm:inline"> [{keyLabel}]</span>
          {cdLeft > 0 ? ` · CD ${cdLeft}s` : " · pronto"}
        </span>
        {statuses.length ? (
          <span className="text-[#ffb4a2]">{statuses.join(" · ")}</span>
        ) : null}
      </div>
      <div className="hidden flex-wrap gap-3 text-xs text-forest-200 sm:flex">
        {ranked.map((p) => (
          <span key={p.id} className={p.id === myId ? "text-forest-100" : ""}>
            {p.name}: {p.wins || 0}
          </span>
        ))}
      </div>
    </div>
  );
}
