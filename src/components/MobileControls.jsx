import { useEffect, useRef } from "react";

const DIRS = [
  { key: "up", label: "▲", move: { x: 0, y: -1 }, grid: "col-start-2 row-start-1" },
  { key: "left", label: "◀", move: { x: -1, y: 0 }, grid: "col-start-1 row-start-2" },
  { key: "right", label: "▶", move: { x: 1, y: 0 }, grid: "col-start-3 row-start-2" },
  { key: "down", label: "▼", move: { x: 0, y: 1 }, grid: "col-start-2 row-start-3" },
];

/**
 * On-screen controls for phones / coarse pointers.
 * Hold direction to keep stepping with the move cooldown.
 */
export default function MobileControls({
  visible,
  onMove,
  onBomb,
  onAbility,
  abilityLabel = "Z",
}) {
  const holdRef = useRef(null);
  const dirRef = useRef(null);

  useEffect(() => {
    return () => stopHold();
  }, []);

  if (!visible) return null;

  function stopHold() {
    if (holdRef.current) {
      clearInterval(holdRef.current);
      holdRef.current = null;
    }
    dirRef.current = null;
  }

  function startHold(move) {
    stopHold();
    dirRef.current = move;
    onMove?.(move);
    holdRef.current = setInterval(() => {
      if (dirRef.current) onMove?.(dirRef.current);
    }, 110);
  }

  const preventSelect = (e) => {
    e.preventDefault();
  };

  const bindDir = (move) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      startHold(move);
    },
    onPointerUp: stopHold,
    onPointerCancel: stopHold,
    onPointerLeave: stopHold,
    onContextMenu: preventSelect,
  });

  const bindTap = (fn) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      fn?.();
    },
    onContextMenu: preventSelect,
  });

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex touch-none select-none items-end justify-between gap-3 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 md:hidden"
      onContextMenu={preventSelect}
    >
      <div className="pointer-events-auto grid w-[9.5rem] grid-cols-3 grid-rows-3 gap-1.5">
        {DIRS.map((d) => (
          <button
            key={d.key}
            type="button"
            aria-label={d.key}
            className={[
              d.grid,
              "flex h-12 w-12 touch-none select-none items-center justify-center rounded-lg border-2 border-forest-500/80 bg-forest-950/85 text-lg text-forest-100 shadow-[0_4px_12px_rgba(0,0,0,0.4)] active:bg-forest-600/50",
            ].join(" ")}
            {...bindDir(d.move)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="pointer-events-auto flex flex-col gap-2">
        <button
          type="button"
          aria-label="Usar poder"
          className="flex h-14 w-14 touch-none select-none items-center justify-center rounded-full border-2 border-forest-300 bg-forest-700/90 text-xs font-bold uppercase tracking-wide text-forest-100 shadow-[0_4px_12px_rgba(0,0,0,0.4)] active:bg-forest-500"
          {...bindTap(onAbility)}
        >
          {abilityLabel}
        </button>
        <button
          type="button"
          aria-label="Soltar bomba"
          className="flex h-16 w-16 touch-none select-none items-center justify-center rounded-full border-2 border-[#e76f51] bg-[#9b2226]/90 text-sm font-bold uppercase tracking-wide text-white shadow-[0_4px_12px_rgba(0,0,0,0.45)] active:bg-[#e76f51]"
          {...bindTap(onBomb)}
        >
          Bomba
        </button>
      </div>
    </div>
  );
}
