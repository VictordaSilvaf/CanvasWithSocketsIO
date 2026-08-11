import { useState } from "react";

export default function Home({
  connected,
  roomError,
  user,
  profile,
  isGuest,
  publicRooms = [],
  onSignOut,
  onLogin,
  onCreateRoom,
  onPrepareJoin,
  onRefreshPublicRooms,
}) {
  const [code, setCode] = useState("");
  const [roomName, setRoomName] = useState("");
  const [visibility, setVisibility] = useState("public");

  return (
    <div className="mx-auto mt-4 w-[calc(100%-1.5rem)] max-w-md border-2 border-forest-600 bg-forest-950/85 px-4 py-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)] sm:mt-12 sm:px-7 sm:py-8">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[32px] tracking-wide text-forest-300 sm:text-[42px]">
            SupraBom
          </h1>
          {user ? (
            <p className="mt-1 text-xs text-forest-300">
              {profile?.display_name || user.email}
              {typeof profile?.total_wins === "number"
                ? ` · ${profile.total_wins}W / ${profile.total_games || 0}J`
                : ""}
            </p>
          ) : isGuest ? (
            <p className="mt-1 text-xs text-forest-300">Modo convidado</p>
          ) : null}
        </div>
        {onSignOut ? (
          <button
            type="button"
            onClick={onSignOut}
            className="cursor-pointer border border-forest-600 bg-transparent px-2 py-1 text-[10px] uppercase tracking-wider text-forest-200 hover:bg-forest-600/20"
          >
            Sair
          </button>
        ) : onLogin ? (
          <button
            type="button"
            onClick={onLogin}
            className="cursor-pointer border border-forest-600 bg-transparent px-2 py-1 text-[10px] uppercase tracking-wider text-forest-200 hover:bg-forest-600/20"
          >
            Entrar
          </button>
        ) : null}
      </div>

      <p className="mb-6 text-center text-sm text-forest-200">
        Crie uma sala, entre com código ou escolha uma pública
      </p>

      <label className="mb-2 block text-sm text-forest-200" htmlFor="room-name">
        Nome da sala (opcional)
      </label>
      <input
        id="room-name"
        type="text"
        value={roomName}
        maxLength={24}
        autoComplete="off"
        spellCheck={false}
        placeholder="Ex: Arena dos amigos"
        onChange={(e) => setRoomName(e.target.value)}
        className="mb-4 w-full border border-forest-600 bg-forest-900 px-3.5 py-3 text-sm text-forest-100 outline-none placeholder:text-forest-300/50 focus:border-forest-400"
      />

      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setVisibility("public")}
          className={[
            "border px-3 py-2.5 text-xs font-bold uppercase tracking-wider",
            visibility === "public"
              ? "border-forest-400 bg-forest-500/30 text-forest-100"
              : "border-forest-600 bg-transparent text-forest-300 hover:bg-forest-600/20",
          ].join(" ")}
        >
          Pública
        </button>
        <button
          type="button"
          onClick={() => setVisibility("private")}
          className={[
            "border px-3 py-2.5 text-xs font-bold uppercase tracking-wider",
            visibility === "private"
              ? "border-forest-400 bg-forest-500/30 text-forest-100"
              : "border-forest-600 bg-transparent text-forest-300 hover:bg-forest-600/20",
          ].join(" ")}
        >
          Privada
        </button>
      </div>

      <p className="mb-4 text-center text-[11px] text-forest-300">
        {visibility === "public"
          ? "Aparece na lista para qualquer um entrar"
          : "Só entra quem tiver o código"}
      </p>

      <button
        type="button"
        disabled={!connected}
        onClick={() =>
          onCreateRoom({
            name: roomName.trim(),
            visibility,
          })
        }
        className={[
          "mb-6 block w-full border-0 px-4 py-3.5 text-base font-bold tracking-wide uppercase text-forest-950",
          connected
            ? "cursor-pointer bg-forest-500 hover:bg-forest-400"
            : "cursor-not-allowed bg-forest-500 opacity-50",
        ].join(" ")}
      >
        Criar sala
      </button>

      <div className="mb-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-forest-600" />
        <span className="text-xs uppercase tracking-wider text-forest-300">
          salas públicas
        </span>
        <div className="h-px flex-1 bg-forest-600" />
      </div>

      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="m-0 text-xs text-forest-300">
          {publicRooms.length === 0
            ? "Nenhuma sala pública no momento"
            : `${publicRooms.length} disponível${publicRooms.length === 1 ? "" : "is"}`}
        </p>
        {onRefreshPublicRooms ? (
          <button
            type="button"
            disabled={!connected}
            onClick={onRefreshPublicRooms}
            className="cursor-pointer border border-forest-600 bg-transparent px-2 py-1 text-[10px] uppercase tracking-wider text-forest-200 hover:bg-forest-600/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Atualizar
          </button>
        ) : null}
      </div>

      {publicRooms.length > 0 ? (
        <ul className="mb-6 max-h-48 list-none space-y-2 overflow-y-auto p-0">
          {publicRooms.map((room) => (
            <li key={room.code}>
              <button
                type="button"
                disabled={!connected}
                onClick={() =>
                  onPrepareJoin(room.code, {
                    name: room.name,
                    visibility: "public",
                  })
                }
                className={[
                  "flex w-full items-center justify-between gap-3 border border-forest-600 bg-forest-900/50 px-3 py-2.5 text-left",
                  connected
                    ? "cursor-pointer hover:border-forest-400 hover:bg-forest-600/20"
                    : "cursor-not-allowed opacity-50",
                ].join(" ")}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-forest-100">
                    {room.name}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-forest-300">
                    {room.code}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-forest-200">
                  {room.playerCount}/{room.maxPlayers}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mb-6" />
      )}

      <div className="mb-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-forest-600" />
        <span className="text-xs uppercase tracking-wider text-forest-300">
          ou
        </span>
        <div className="h-px flex-1 bg-forest-600" />
      </div>

      <label className="mb-2 block text-sm text-forest-200" htmlFor="room-code">
        Código da sala
      </label>
      <input
        id="room-code"
        type="text"
        value={code}
        maxLength={6}
        autoComplete="off"
        spellCheck={false}
        placeholder="Ex: A1B2C3"
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === "Enter") onPrepareJoin(code);
        }}
        className="mb-4 w-full border border-forest-600 bg-forest-900 px-3.5 py-3 text-center text-base tracking-[0.35em] text-forest-100 outline-none placeholder:tracking-normal placeholder:text-forest-300/50 focus:border-forest-400 sm:text-lg"
      />

      <button
        type="button"
        disabled={!connected || !code.trim()}
        onClick={() => onPrepareJoin(code)}
        className={[
          "block w-full border border-forest-500 bg-transparent px-4 py-3.5 text-base font-bold tracking-wide uppercase text-forest-100",
          connected && code.trim()
            ? "cursor-pointer hover:bg-forest-600/30"
            : "cursor-not-allowed opacity-50",
        ].join(" ")}
      >
        Entrar na sala
      </button>

      {!connected ? (
        <p className="mt-4 text-center text-sm text-forest-300">
          Conectando ao servidor…
        </p>
      ) : null}

      {roomError ? (
        <p className="mt-4 text-center text-sm text-[#ffb4a2]">{roomError}</p>
      ) : null}
    </div>
  );
}
