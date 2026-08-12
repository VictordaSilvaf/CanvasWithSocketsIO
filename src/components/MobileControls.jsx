import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";

const DIRS = [
  {
    key: "up",
    Icon: ChevronUp,
    move: { x: 0, y: -1 },
    grid: "col-start-2 row-start-1",
  },
  {
    key: "left",
    Icon: ChevronLeft,
    move: { x: -1, y: 0 },
    grid: "col-start-1 row-start-2",
  },
  {
    key: "right",
    Icon: ChevronRight,
    move: { x: 1, y: 0 },
    grid: "col-start-3 row-start-2",
  },
  {
    key: "down",
    Icon: ChevronDown,
    move: { x: 0, y: 1 },
    grid: "col-start-2 row-start-3",
  },
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
  abilityCooldownUntil = 0,
  serverNow = 0,
}) {
  const holdRef = useRef(null);
  const dirRef = useRef(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    return () => stopHold();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  const skew = now - (serverNow || now);
  const serverAligned = now - skew;
  const onCooldown = abilityCooldownUntil > serverAligned;

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
        {DIRS.map(({ key, Icon, move, grid }) => (
          <button
            key={key}
            type="button"
            aria-label={key}
            className={[
              grid,
              "flex h-12 w-12 touch-none select-none items-center justify-center rounded-lg border-2 border-forest-500/80 bg-forest-950/85 text-forest-100 shadow-[0_4px_12px_rgba(0,0,0,0.4)] active:bg-forest-600/50",
            ].join(" ")}
            {...bindDir(move)}
          >
            <Icon
              className="pointer-events-none h-7 w-7"
              strokeWidth={2.5}
              aria-hidden
            />
          </button>
        ))}
      </div>

      <div className="pointer-events-auto flex flex-col gap-2">
        <button
          type="button"
          aria-label="Usar poder"
          aria-disabled={onCooldown}
          className={[
            "flex h-14 w-14 touch-none select-none items-center justify-center overflow-hidden rounded-full border-2 shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-colors",
            onCooldown
              ? "border-zinc-500 bg-zinc-600/90 opacity-70"
              : "border-white bg-white active:bg-forest-100",
          ].join(" ")}
          {...bindTap(onAbility)}
        >
          <img
            src="/assets/imgs/power.png"
            alt=""
            draggable={false}
            className={[
              "pointer-events-none h-9 w-9 object-contain [image-rendering:auto] transition-[filter]",
              onCooldown ? "grayscale" : "",
            ].join(" ")}
          />
        </button>
        <button
          type="button"
          aria-label="Soltar bomba"
          className="flex h-16 w-16 touch-none select-none items-center justify-center overflow-hidden rounded-full border-2 border-[#e76f51] bg-[#9b2226]/90 shadow-[0_4px_12px_rgba(0,0,0,0.45)] active:bg-[#e76f51]"
          {...bindTap(onBomb)}
        >
          <img
            src="/assets/imgs/bomb.png"
            alt=""
            draggable={false}
            className="pointer-events-none h-10 w-10 object-contain [image-rendering:pixelated]"
          />
        </button>
      </div>
    </div>
  );
}
