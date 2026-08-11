import { useState } from "react";

export default function RoomCodeCopy({
  code,
  className = "",
  compact = false,
  label = "Código da sala",
  showLabel = true,
}) {
  const [copied, setCopied] = useState(false);

  if (!code) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(code));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      const el = document.createElement("textarea");
      el.value = String(code);
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      } finally {
        document.body.removeChild(el);
      }
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={copy}
        title="Clique para copiar"
        className={[
          "m-0 cursor-pointer border-0 bg-transparent p-0 text-left text-sm text-forest-200",
          "hover:text-forest-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest-400",
          className,
        ].join(" ")}
      >
        Sala{" "}
        <span className="tracking-widest text-forest-100">{code}</span>
        <span className="ml-2 text-[10px] uppercase tracking-wider text-forest-400">
          {copied ? "copiado!" : "copiar"}
        </span>
      </button>
    );
  }

  return (
    <div className={className}>
      {showLabel ? (
        <p className="mb-1 text-center text-sm text-forest-200">{label}</p>
      ) : null}
      <button
        type="button"
        onClick={copy}
        title="Clique para copiar"
        className="mx-auto block cursor-pointer border-0 bg-transparent p-0 text-center outline-none transition-colors hover:text-forest-300 focus-visible:ring-2 focus-visible:ring-forest-400"
      >
        <span className="text-2xl font-bold tracking-[0.35em] text-forest-100">
          {code}
        </span>
        <span className="mt-1 block text-[10px] uppercase tracking-wider text-forest-300">
          {copied ? "Copiado!" : "Clique para copiar"}
        </span>
      </button>
    </div>
  );
}
