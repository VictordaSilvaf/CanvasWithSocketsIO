import { useMemo, useState } from "react";
import {
  SPRITE_POOL,
  loadPlayerPrefs,
  savePlayerPrefs,
  spriteUrl,
} from "../constants";
import RoomCodeCopy from "./RoomCodeCopy";

export default function CharacterSelect({
  roomCode,
  roomName,
  visibility,
  takenSprites,
  roomError,
  joining,
  profile,
  onJoin,
  onBack,
}) {
  const prefs = useMemo(() => loadPlayerPrefs(), []);
  const taken = useMemo(() => new Set(takenSprites || []), [takenSprites]);
  const available = useMemo(
    () => SPRITE_POOL.filter((sprite) => !taken.has(sprite)),
    [taken]
  );
  const [sprite, setSprite] = useState(
    profile?.preferred_sprite || prefs.sprite
  );
  const [name, setName] = useState(
    profile?.display_name || prefs.name || ""
  );

  const selected =
    sprite && !taken.has(sprite) ? sprite : available[0] || null;

  const canSubmit =
    Boolean(selected) && name.trim().length > 0 && !joining;

  const submit = () => {
    if (!canSubmit) return;
    const next = {
      name: name.trim(),
      sprite: selected,
    };
    savePlayerPrefs({ ...next, abilityId: prefs.abilityId });
    onJoin(next);
  };

  return (
    <div className="mx-auto mt-3 w-[calc(100%-1rem)] max-w-2xl border-2 border-forest-600 bg-forest-950/85 px-3 py-5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] sm:mt-6 sm:px-6 sm:py-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="m-0 mb-1 text-2xl tracking-wide text-forest-300 sm:text-3xl">
            Seu personagem
          </h1>
          {roomName ? (
            <p className="m-0 mb-1 text-sm text-forest-100">
              {roomName}
              {visibility === "private" ? (
                <span className="ml-2 text-[10px] uppercase tracking-wider text-forest-300">
                  privada
                </span>
              ) : null}
            </p>
          ) : null}
          <RoomCodeCopy code={roomCode} compact className="mt-1" />
        </div>
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer border border-forest-600 bg-transparent px-3 py-1.5 text-xs uppercase tracking-wider text-forest-200 hover:bg-forest-600/20"
        >
          Voltar
        </button>
      </div>

      <p className="mb-3 text-sm text-forest-200">
        1. Escolha um sprite (únicos por sala)
      </p>

      <div className="mb-6 grid max-h-48 grid-cols-4 gap-2 overflow-y-auto p-1 sm:grid-cols-6 md:grid-cols-8">
        {SPRITE_POOL.map((id) => {
          const isTaken = taken.has(id);
          const isSelected = selected === id;
          return (
            <button
              key={id}
              type="button"
              disabled={isTaken}
              onClick={() => setSprite(id)}
              title={isTaken ? "Já em uso" : id}
              className={[
                "relative flex aspect-square items-center justify-center border bg-forest-900/60 p-1",
                isTaken
                  ? "cursor-not-allowed border-forest-700 opacity-35"
                  : "cursor-pointer border-forest-600 hover:border-forest-400",
                isSelected ? "border-forest-100 ring-2 ring-forest-400" : "",
              ].join(" ")}
            >
              <img
                src={spriteUrl(id, "fr", 1)}
                alt={id}
                className="h-10 w-10 object-contain [image-rendering:pixelated]"
                draggable={false}
              />
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="mb-5 flex items-center gap-3 border border-forest-600 bg-forest-900/50 px-3 py-2">
          <img
            src={spriteUrl(selected, "fr", 1)}
            alt={selected}
            className="h-12 w-12 object-contain [image-rendering:pixelated]"
          />
          <span className="text-sm text-forest-200">Selecionado: {selected}</span>
        </div>
      ) : (
        <p className="mb-5 text-sm text-[#ffb4a2]">
          Nenhum sprite disponível nesta sala.
        </p>
      )}

      <label className="mb-2 block text-sm text-forest-200" htmlFor="player-name">
        2. Digite seu nome
      </label>
      <input
        id="player-name"
        type="text"
        value={name}
        maxLength={16}
        autoComplete="off"
        placeholder="Seu nome"
        onChange={(e) => setName(e.target.value)}
        className="mb-3 w-full border border-forest-600 bg-forest-900 px-3.5 py-3 text-forest-100 outline-none placeholder:text-forest-300/50 focus:border-forest-400"
      />

      <p className="mb-5 text-center text-xs text-forest-400">
        O poder é escolhido no início de cada partida (15s)
      </p>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={submit}
        className={[
          "block w-full border-0 px-4 py-3.5 text-base font-bold tracking-wide uppercase text-forest-950",
          canSubmit
            ? "cursor-pointer bg-forest-500 hover:bg-forest-400"
            : "cursor-not-allowed bg-forest-500 opacity-50",
        ].join(" ")}
      >
        {joining ? "Entrando…" : "Entrar no lobby"}
      </button>

      {roomError ? (
        <p className="mt-4 text-center text-sm text-[#ffb4a2]">{roomError}</p>
      ) : null}
    </div>
  );
}
