import { useEffect, useState } from "react";

export default function Leaderboard({ onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/leaderboard?limit=20")
      .then(async (res) => {
        if (!res.ok) throw new Error("Falha ao carregar ranking.");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setRows(Array.isArray(data.rows) ? data.rows : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Falha ao carregar ranking.");
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto mt-4 w-[calc(100%-1.5rem)] max-w-md border-2 border-forest-600 bg-forest-950/85 px-4 py-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)] sm:mt-12 sm:px-7 sm:py-8">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[28px] tracking-wide text-forest-300 sm:text-[36px]">
            Ranking
          </h1>
          <p className="mt-1 text-xs text-forest-300">Top vitórias globais</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer border border-forest-600 bg-transparent px-2 py-1 text-[10px] uppercase tracking-wider text-forest-200 hover:bg-forest-600/20"
        >
          Voltar
        </button>
      </div>

      {loading ? (
        <p className="text-center text-sm text-forest-300">Carregando…</p>
      ) : null}

      {error ? (
        <p className="text-center text-sm text-[#ffb4a2]">{error}</p>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <p className="text-center text-sm text-forest-300">
          Ainda sem partidas registradas.
        </p>
      ) : null}

      {!loading && rows.length > 0 ? (
        <ol className="m-0 list-none space-y-2 p-0">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 border border-forest-600 bg-forest-900/40 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-6 shrink-0 text-center text-sm font-bold text-forest-300">
                  {row.rank}
                </span>
                <span className="truncate text-sm text-forest-100">
                  {row.displayName}
                </span>
              </div>
              <span className="shrink-0 text-xs text-forest-200">
                {row.totalWins}W / {row.totalGames}J
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
