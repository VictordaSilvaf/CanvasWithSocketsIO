import { useEffect, useRef, useState } from "react";

function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 767px)").matches
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return mobile;
}

export default function RoomChat({
  messages,
  myId,
  onSend,
  collapsed = false,
}) {
  const isMobile = useIsMobile();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(!collapsed && !isMobile);
  const listRef = useRef(null);
  const wasMobile = useRef(isMobile);

  useEffect(() => {
    if (isMobile && !wasMobile.current) setOpen(false);
    wasMobile.current = isMobile;
  }, [isMobile]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const submit = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || typeof onSend !== "function") return;
    onSend(value);
    setText("");
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-2 top-[max(0.75rem,env(safe-area-inset-top))] z-30 cursor-pointer border-2 border-forest-600 bg-forest-950/95 px-3 py-2 text-xs font-bold uppercase tracking-wider text-forest-100 shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:bg-forest-900 md:right-3 md:top-1/2 md:-translate-y-1/2 md:px-2 md:py-4"
        title="Abrir chat"
      >
        Chat
        {messages?.length ? (
          <span className="ml-1 inline text-[10px] font-normal text-forest-300 md:ml-0 md:mt-1 md:block">
            ({messages.length})
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <aside
      className={[
        "fixed z-40 flex flex-col border-forest-600 bg-forest-950/98",
        "inset-x-0 bottom-[calc(7.5rem+env(safe-area-inset-bottom))] max-h-[min(55dvh,calc(100dvh-9rem))] border-t-2 shadow-[0_-8px_24px_rgba(0,0,0,0.35)]",
        "md:inset-y-0 md:bottom-0 md:left-auto md:right-0 md:max-h-none md:h-dvh md:w-[min(100vw,320px)] md:border-l-2 md:border-t-0 md:shadow-[-8px_0_24px_rgba(0,0,0,0.35)]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between border-b border-forest-600 px-3 py-2.5">
        <div>
          <p className="m-0 text-sm font-bold uppercase tracking-wider text-forest-100">
            Chat da sala
          </p>
          <p className="m-0 text-[10px] text-forest-400">Só quem está na sala</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="cursor-pointer border border-forest-600 bg-transparent px-2 py-1 text-[10px] uppercase tracking-wider text-forest-200 hover:bg-forest-600/20"
        >
          Ocultar
        </button>
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3"
      >
        {(messages || []).length === 0 ? (
          <p className="text-center text-xs text-forest-400">
            Nenhuma mensagem ainda. Digite algo!
          </p>
        ) : (
          (messages || []).map((msg) => {
            const mine = msg.playerId === myId;
            return (
              <div
                key={msg.id}
                className={[
                  "rounded border px-2.5 py-1.5 text-sm",
                  mine
                    ? "border-forest-400/50 bg-forest-600/25"
                    : "border-forest-700 bg-forest-900/60",
                ].join(" ")}
              >
                <div className="mb-0.5 flex items-baseline justify-between gap-2">
                  <span
                    className={[
                      "truncate text-[11px] font-bold",
                      mine ? "text-forest-200" : "text-forest-300",
                    ].join(" ")}
                  >
                    {mine ? "Você" : msg.name || "Jogador"}
                  </span>
                  <span className="shrink-0 text-[10px] text-forest-500">
                    {formatTime(msg.at)}
                  </span>
                </div>
                <p className="m-0 break-words text-forest-100">{msg.text}</p>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={submit}
        className="border-t border-forest-600 p-3 md:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            maxLength={120}
            autoComplete="off"
            enterKeyHint="send"
            placeholder="Mensagem…"
            onChange={(e) => setText(e.target.value)}
            className="min-w-0 flex-1 border border-forest-600 bg-forest-900 px-3 py-2.5 text-base text-forest-100 outline-none placeholder:text-forest-400 focus:border-forest-400 md:text-sm"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className={[
              "shrink-0 border-0 px-3 py-2 text-xs font-bold uppercase tracking-wide text-forest-950",
              text.trim()
                ? "cursor-pointer bg-forest-500 hover:bg-forest-400"
                : "cursor-not-allowed bg-forest-500 opacity-50",
            ].join(" ")}
          >
            Enviar
          </button>
        </div>
      </form>
    </aside>
  );
}

function formatTime(at) {
  if (!at) return "";
  try {
    return new Date(at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
