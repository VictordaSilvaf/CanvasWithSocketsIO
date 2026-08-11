import { useEffect, useRef, useState } from "react";
import { HARD, SOFT, TILE, spriteUrl } from "../constants";

const FRAME_PAD = 20;

function MapTiles({ map, tile }) {
  if (!map?.length) return null;

  const tiles = [];
  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[row].length; col++) {
      const cell = map[row][col];
      if (cell === HARD) {
        tiles.push(
          <div
            key={`t-${row}-${col}`}
            className="pointer-events-none absolute z-0 shadow-[inset_0_0_0_1px_#0a2540]"
            style={{
              top: row * tile,
              left: col * tile,
              width: tile,
              height: tile,
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 45%), repeating-linear-gradient(0deg, #3d7ea6 0px, #3d7ea6 14px, #1e4d6b 14px, #1e4d6b 15px), repeating-linear-gradient(90deg, #5ba3c9 0px, #5ba3c9 14px, #1e4d6b 14px, #1e4d6b 15px)",
            }}
          />
        );
      } else if (cell === SOFT) {
        tiles.push(
          <div
            key={`t-${row}-${col}`}
            className="pointer-events-none absolute z-0 shadow-[inset_0_0_0_1px_#5c3317,inset_0_2px_0_rgba(255,220,170,0.25)]"
            style={{
              top: row * tile,
              left: col * tile,
              width: tile,
              height: tile,
              background: "linear-gradient(180deg, #c77d3a 0%, #8d5524 100%)",
            }}
          />
        );
      }
    }
  }
  return tiles;
}

function Pickups({ pickups, tile }) {
  return (pickups || []).map((item) => (
    <div
      key={item.id}
      title={item.type === "bomb" ? "Bomb +1" : "Fire +1"}
      className="absolute z-[2] grid place-items-center animate-pickup-bob"
      style={{ top: item.y, left: item.x, width: tile, height: tile }}
    >
      <span
        className={[
          "grid place-items-center border-2 text-xs font-bold",
          item.type === "bomb"
            ? "border-[#9a8c98] text-[#edf2f4] [background:radial-gradient(circle,#4a4e69_0%,#22223b_55%,#0b090a_100%)] shadow-[0_0_8px_rgba(74,78,105,0.7)]"
            : "border-[#9b2226] text-forest-950 [background:radial-gradient(circle,#fff3b0_0%,#f4a261_55%,#e76f51_100%)] shadow-[0_0_8px_rgba(231,111,81,0.7)]",
        ].join(" ")}
        style={{ width: tile * 0.73, height: tile * 0.73 }}
      >
        {item.type === "bomb" ? "B" : "F"}
      </span>
    </div>
  ));
}

function Bombs({ bombs, tile }) {
  return (bombs || []).flatMap((bomb) => {
    if (bomb.state === "exploding") {
      return (bomb.blast || []).map((cell, i) => (
        <div
          key={`${bomb.id}-blast-${i}`}
          className="pointer-events-none absolute z-[5] rounded animate-explode shadow-[0_0_10px_rgba(255,120,0,0.8)] [background:radial-gradient(circle,#fff7ae_0%,#ff9f1c_35%,#e71d36_70%,#9b2226_100%)]"
          style={{ top: cell.y, left: cell.x, width: tile, height: tile }}
        />
      ));
    }

    return (
      <div
        key={bomb.id}
        className="absolute z-[3] animate-bomb-pulse bg-[url('/assets/imgs/bomb.png')] bg-contain bg-center bg-no-repeat"
        style={{ top: bomb.y, left: bomb.x, width: tile, height: tile }}
      />
    );
  });
}

function Players({ players, phase, myId, tile, serverNow }) {
  const now = Date.now();
  const skew = now - (serverNow || now);
  const aligned = now - skew;

  return (players || [])
    .map((player) => {
      if (!player.alive && phase === "playing") {
        return (
          <div
            key={player.id}
            className="absolute z-[4] bg-black/35 opacity-25 grayscale"
            style={{ top: player.y, left: player.x, width: tile, height: tile }}
          />
        );
      }

      if (!player.alive && phase !== "lobby") return null;

      const url = spriteUrl(player.sprite, player.facing || "fr", player.frame || 1);
      const slow = player.slowUntil > aligned;
      const confused = player.confusedUntil > aligned;
      const stunned = player.stunUntil > aligned;
      const ghost = player.ghostUntil > aligned;

      return (
        <div
          key={player.id}
          title={player.name}
          className={[
            "absolute z-[4] bg-contain bg-bottom bg-no-repeat [image-rendering:pixelated]",
            player.id === myId ? "drop-shadow-[0_0_3px_#d8f3dc]" : "",
            slow ? "brightness-125 hue-rotate-180" : "",
            confused ? "saturate-150" : "",
            stunned ? "opacity-70" : "",
            ghost ? "opacity-45 brightness-125" : "",
          ].join(" ")}
          style={{
            top: player.y,
            left: player.x,
            width: tile,
            height: tile,
            backgroundImage: `url('${url}')`,
            boxShadow: ghost
              ? "0 0 10px #e9ecef"
              : slow
                ? "0 0 8px #7bdff2"
                : confused
                  ? "0 0 8px #c77dff"
                  : stunned
                    ? "0 0 8px #ffd166"
                    : undefined,
          }}
        />
      );
    })
    .filter(Boolean);
}

function Projectiles({ projectiles, tile }) {
  return (projectiles || []).map((p) => (
    <div
      key={p.id}
      className={[
        "pointer-events-none absolute z-[6] rounded-full",
        p.type === "ice_ray"
          ? "bg-[#7bdff2] shadow-[0_0_8px_#7bdff2]"
          : "bg-[#c77dff] shadow-[0_0_8px_#c77dff]",
      ].join(" ")}
      style={{
        top: p.y + tile * 0.25,
        left: p.x + tile * 0.25,
        width: tile * 0.5,
        height: tile * 0.5,
      }}
    />
  ));
}

function AbilityFx({ abilityFx, tile }) {
  return (abilityFx || []).flatMap((fx) => {
    if (fx.type === "local_blast") {
      return (fx.cells || []).map((cell, i) => (
        <div
          key={`${fx.id}-${i}`}
          className="pointer-events-none absolute z-[5] animate-explode bg-orange-400/70"
          style={{
            top: cell.y,
            left: cell.x,
            width: tile,
            height: tile,
          }}
        />
      ));
    }
    if (fx.type === "miner") {
      return (
        <div
          key={fx.id}
          className="pointer-events-none absolute z-[5] animate-explode bg-amber-600/80"
          style={{ top: fx.y, left: fx.x, width: tile, height: tile }}
        />
      );
    }
    return [];
  });
}

export default function Arena({ gameState, myId, compactBottom = false }) {
  const tile = gameState.tile || TILE;
  const canvasSize = gameState.canvasSize || 450;
  const frameSize = canvasSize + FRAME_PAD;
  const shellRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;

    const update = () => {
      const mobile =
        window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
      const maxW = window.innerWidth * (mobile ? 0.96 : 0.9);
      const heightRatio = mobile
        ? compactBottom
          ? 0.46
          : 0.72
        : 0.9;
      const maxH = window.innerHeight * heightRatio;
      const next = Math.min(maxW / frameSize, maxH / frameSize, 1.15);
      setScale(Number.isFinite(next) && next > 0 ? next : 1);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [frameSize, compactBottom]);

  return (
    <div
      ref={shellRef}
      className="relative flex items-center justify-center"
      style={{
        width: frameSize * scale,
        height: frameSize * scale,
      }}
    >
      <div
        className="absolute left-1/2 top-1/2 origin-center border-4 border-[#0a2540] bg-gradient-to-br from-[#3d7ea6] to-[#1e4d6b] p-2.5 shadow-[inset_0_0_0_2px_#7eb8d9,0_8px_24px_rgba(0,0,0,0.35)]"
        style={{
          width: frameSize,
          height: frameSize,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <div
          className="relative overflow-hidden border-2 border-[#212529] bg-[url('/assets/imgs/grass.png')] bg-[length:30px_30px]"
          style={{ width: canvasSize, height: canvasSize }}
        >
          <MapTiles map={gameState.map} tile={tile} />
          <Pickups pickups={gameState.pickups} tile={tile} />
          <Bombs bombs={gameState.bombs} tile={tile} />
          <AbilityFx abilityFx={gameState.abilityFx} tile={tile} />
          <Projectiles projectiles={gameState.projectiles} tile={tile} />
          <Players
            players={gameState.players}
            phase={gameState.phase}
            myId={myId}
            tile={tile}
            serverNow={gameState.serverNow}
          />
        </div>
      </div>
    </div>
  );
}
