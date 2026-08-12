import { MAX_PLAYERS, MIN_PLAYERS, getAbility, spriteUrl } from "../constants";
import RoomCodeCopy from "./RoomCodeCopy";

export default function Lobby({
  gameState,
  myId,
  roomError,
  onToggleReady,
  onKick,
}) {
  const players = gameState.players || [];
  const me = players.find((p) => p.id === myId);
  const readyCount = players.filter((p) => p.ready).length;
  const roomCode = gameState.roomCode;
  const isHost = gameState.hostId === myId;
  const hostInRoom = players.some((p) => p.id === gameState.hostId);

  let status;
  if (players.length < MIN_PLAYERS) {
    status = `Jogadores: ${players.length}/${MAX_PLAYERS} — mínimo ${MIN_PLAYERS} para iniciar`;
  } else if (readyCount < players.length) {
    status = `Prontos: ${readyCount}/${players.length} — todos precisam confirmar`;
  } else {
    status = "Iniciando partida…";
  }

  const slots = Array.from({ length: MAX_PLAYERS }, (_, i) => players[i] || null);
  const ranked = [...players].sort((a, b) => (b.wins || 0) - (a.wins || 0));

  return (
    <div className="mx-auto mt-4 w-[calc(100%-1.5rem)] max-w-md border-2 border-forest-600 bg-forest-950/85 px-4 py-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)] sm:mt-12 sm:px-7 sm:py-8">
      <h1 className="m-0 mb-2 text-center text-[32px] tracking-wide text-forest-300 sm:text-[42px]">
        SupraBom
      </h1>
      {gameState.roomName ? (
        <p className="mb-1 text-center text-base text-forest-100">
          {gameState.roomName}
          {gameState.visibility === "private" ? (
            <span className="ml-2 text-[10px] uppercase tracking-wider text-forest-300">
              privada
            </span>
          ) : null}
        </p>
      ) : null}
      <RoomCodeCopy code={roomCode} className="mb-4" />
      <p className="mb-5 text-center text-sm text-forest-200">
        {players.length}/{MAX_PLAYERS} jogadores · mín. {MIN_PLAYERS} prontos
        {isHost ? " · você é o host" : ""}
      </p>

      {ranked.length > 0 ? (
        <div className="mb-5 border border-forest-600 bg-forest-900/40 px-3 py-2">
          <p className="mb-2 text-center text-xs uppercase tracking-wider text-forest-300">
            Placar da sala
          </p>
          <ul className="m-0 grid list-none gap-1 p-0 text-sm text-forest-100">
            {ranked.map((p) => (
              <li key={p.id} className="flex justify-between gap-3">
                <span className="truncate">
                  {p.name}
                  {p.id === gameState.hostId ? " ★" : ""}
                </span>
                <span>{p.wins || 0}V</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="mb-5 grid list-none gap-2.5 p-0">
        {slots.map((player, index) => {
          if (!player) {
            return (
              <li
                key={`empty-${index}`}
                className="flex items-center justify-between border border-dashed border-forest-600 bg-forest-600/20 px-3.5 py-3 opacity-55"
              >
                <span className="text-[15px]">Aguardando…</span>
                <span className="text-xs uppercase tracking-wider text-forest-300">
                  vazio
                </span>
              </li>
            );
          }

          const isMe = player.id === myId;
          const canKick =
            isHost && hostInRoom && !isMe && typeof onKick === "function";

          return (
            <li
              key={player.id}
              className={[
                "flex items-center justify-between gap-3 border px-3.5 py-3",
                player.ready
                  ? "border-forest-500 bg-forest-600/20 shadow-[inset_3px_0_0_#52b788]"
                  : "border-forest-600 bg-forest-600/20",
                isMe ? "border-forest-100 bg-forest-100/10" : "",
              ].join(" ")}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-forest-600/40 bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
                  <img
                    src={spriteUrl(player.sprite, "fr", 1)}
                    alt={player.sprite}
                    className="h-8 w-8 object-contain [image-rendering:pixelated]"
                  />
                </div>
                <div className="min-w-0">
                  <span className="block truncate text-[15px]">
                    {player.name}
                    {isMe ? " (você)" : ""}
                    {player.id === gameState.hostId ? " ★" : ""}
                  </span>
                  <span className="text-xs text-forest-300">
                    {player.wins || 0} vitória
                    {(player.wins || 0) === 1 ? "" : "s"}
                    {player.abilityId
                      ? ` · ${getAbility(player.abilityId)?.name || player.abilityId}`
                      : " · poder no início"}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {canKick ? (
                  <button
                    type="button"
                    onClick={() => onKick(player.id)}
                    className="cursor-pointer border border-[#ffb4a2]/60 bg-transparent px-2 py-1 text-[10px] uppercase tracking-wider text-[#ffb4a2] hover:bg-[#ffb4a2]/10"
                  >
                    Expulsar
                  </button>
                ) : null}
                <span
                  className={[
                    "text-xs uppercase tracking-wider",
                    player.ready ? "text-forest-100" : "text-forest-300",
                  ].join(" ")}
                >
                  {player.ready ? "pronto" : "aguardando"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mb-4 text-center text-sm text-forest-200">{status}</p>

      <button
        type="button"
        disabled={!me || Boolean(roomError)}
        onClick={onToggleReady}
        className={[
          "block w-full border-0 px-4 py-3.5 text-base font-bold tracking-wide uppercase text-forest-950",
          me?.ready ? "bg-forest-100" : "bg-forest-500 hover:bg-forest-400",
          !me || roomError
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer",
        ].join(" ")}
      >
        {me?.ready ? "Cancelar pronto" : "Pronto"}
      </button>

      {roomError ? (
        <p className="mt-4 text-center text-sm text-[#ffb4a2]">{roomError}</p>
      ) : null}
    </div>
  );
}
