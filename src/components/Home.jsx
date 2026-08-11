import { useState } from "react";

export default function Home({
  connected,
  roomError,
  user,
  profile,
  isGuest,
  onSignOut,
  onLogin,
  onCreateRoom,
  onPrepareJoin,
}) {
  const [code, setCode] = useState("");

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

      <p className="mb-8 text-center text-sm text-forest-200">
        Crie uma sala ou entre com um código
      </p>

      <button
        type="button"
        disabled={!connected}
        onClick={onCreateRoom}
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
