import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { checkAdmin, joinLobby } from "@/lib/trivia.functions";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    admin: search.admin === "" || search.admin === true || search.admin === "1",
  }),
  component: Home,
});

function Home() {
  const { admin } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"splash" | "name">("splash");
  const [error, setError] = useState("");

  async function enterAdmin() {
    setError("");
    const result = await checkAdmin({ data: { password } });
    if (!result.ok) {
      setError("Contrasena incorrecta.");
      return;
    }
    sessionStorage.setItem("jev-admin", "1");
    navigate({ to: "/admin", search: { tab: "juegos", game: "ruleta" } });
  }

  async function enterPlayer() {
    setError("");
    try {
      const joined = await joinLobby({ data: { name } });
      sessionStorage.setItem("jev-player", String(joined.playerId));
      navigate({ to: "/jugar", search: { code: "" } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#9ed0c0] px-5 py-16 dark:bg-[#07111a]">
      <section className="w-full max-w-md px-6 py-8 text-center">
        <img src="/logo-jev.png" alt="jev+" className="mx-auto h-36 w-auto object-contain" />
        <h1 className="mt-2 text-4xl text-gray-950 dark:text-white">GAMES JEV</h1>
        {admin ? (
          <>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">Acceso de administrador</p>
            <input
              type="password"
              className="mt-6 w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-3 outline-none dark:bg-white/10 dark:text-white"
              placeholder="Contrasena"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            <button onClick={enterAdmin} className="mt-4 w-full rounded-2xl bg-emerald-600 py-4 font-semibold text-white">
              Iniciar a jugar
            </button>
          </>
        ) : step === "splash" ? (
          <button
            onClick={() => setStep("name")}
            className="mt-8 w-full rounded-2xl bg-emerald-600 py-4 font-semibold text-white"
          >
            Empezar a jugar
          </button>
        ) : (
          <>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">Escribe tu nombre y espera a que el administrador inicie.</p>
            <input
              className="mt-6 w-full rounded-2xl border border-white/50 bg-white/70 px-4 py-3 outline-none dark:bg-white/10 dark:text-white"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            <button onClick={enterPlayer} className="mt-4 w-full rounded-2xl bg-emerald-600 py-4 font-semibold text-white">
              Empezar a jugar
            </button>
          </>
        )}
      </section>
    </main>
  );
}
