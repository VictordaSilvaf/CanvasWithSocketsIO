import { useState } from "react";

export default function AuthScreen({
  configured,
  authError,
  onSignIn,
  onSignUp,
  onContinueAsGuest,
}) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    if (!email.trim() || !password) {
      setLocalError("Preencha e-mail e senha.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        await onSignIn(email.trim(), password);
      } else {
        await onSignUp(email.trim(), password, displayName.trim());
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mt-12 max-w-md border-2 border-forest-600 bg-forest-950/85 px-7 py-8 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
      <h1 className="m-0 mb-2 text-center text-[42px] tracking-wide text-forest-300">
        SupraBom
      </h1>
      <p className="mb-6 text-center text-sm text-forest-200">
        {mode === "login"
          ? "Entre para salvar progresso"
          : "Crie sua conta"}
      </p>

      {!configured ? (
        <p className="mb-4 text-center text-sm text-[#ffb4a2]">
          Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env
        </p>
      ) : null}

      <form onSubmit={submit} className="grid gap-3">
        {mode === "signup" ? (
          <>
            <label className="text-sm text-forest-200" htmlFor="display-name">
              Nome de exibição
            </label>
            <input
              id="display-name"
              type="text"
              maxLength={16}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="border border-forest-600 bg-forest-900 px-3.5 py-3 text-forest-100 outline-none focus:border-forest-400"
              placeholder="Seu nick"
            />
          </>
        ) : null}

        <label className="text-sm text-forest-200" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-forest-600 bg-forest-900 px-3.5 py-3 text-forest-100 outline-none focus:border-forest-400"
          placeholder="voce@email.com"
        />

        <label className="text-sm text-forest-200" htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          className="border border-forest-600 bg-forest-900 px-3.5 py-3 text-forest-100 outline-none focus:border-forest-400"
          placeholder="Mín. 6 caracteres"
        />

        <button
          type="submit"
          disabled={busy || !configured}
          className={[
            "mt-2 w-full border-0 px-4 py-3.5 text-base font-bold tracking-wide uppercase text-forest-950",
            busy || !configured
              ? "cursor-not-allowed bg-forest-500 opacity-50"
              : "cursor-pointer bg-forest-500 hover:bg-forest-400",
          ].join(" ")}
        >
          {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setLocalError(null);
        }}
        className="mt-4 w-full cursor-pointer border-0 bg-transparent text-sm text-forest-300 underline"
      >
        {mode === "login"
          ? "Não tem conta? Cadastre-se"
          : "Já tem conta? Faça login"}
      </button>

      {typeof onContinueAsGuest === "function" ? (
        <>
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-forest-600" />
            <span className="text-xs uppercase tracking-wider text-forest-300">
              ou
            </span>
            <div className="h-px flex-1 bg-forest-600" />
          </div>
          <button
            type="button"
            onClick={onContinueAsGuest}
            className="w-full cursor-pointer border border-forest-500 bg-transparent px-4 py-3.5 text-base font-bold tracking-wide uppercase text-forest-100 hover:bg-forest-600/30"
          >
            Jogar como convidado
          </button>
          <p className="mt-2 text-center text-[11px] text-forest-400">
            Sem conta: progresso e placar online não são salvos
          </p>
        </>
      ) : null}

      {localError || authError ? (
        <p className="mt-4 text-center text-sm text-[#ffb4a2]">
          {localError || authError}
        </p>
      ) : null}
    </div>
  );
}
