import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { answerChoice, getPlayer, guessText } from "@/lib/trivia.functions";

export const Route = createFileRoute("/jugar")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : "",
  }),
  component: PlayPage,
});

function PlayPage() {
  const navigate = useNavigate();
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [live, setLive] = useState<Awaited<ReturnType<typeof getPlayer>>["live"]>(null);
  const [waiting, setWaiting] = useState(true);
  const [note, setNote] = useState("");
  const [guess, setGuess] = useState("");
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("jev-player");
    if (!raw) {
      navigate({ to: "/", search: { admin: false } });
      return;
    }
    setPlayerId(Number(raw));
  }, [navigate]);

  useEffect(() => {
    if (!playerId) return;
    let stop = false;
    const tick = async () => {
      try {
        const next = await getPlayer({ data: { playerId } });
        if (stop) return;
        setName(next.name);
        setWaiting(next.waiting || !next.live);
        setLive(next.live);
        if (next.live?.status === "lobby" || next.live?.status === "spinning") setLocked(false);
      } catch {
        /* keep waiting */
      }
    };
    tick();
    const id = setInterval(tick, 800);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [playerId]);

  async function pick(answerId: number) {
    if (!playerId || locked) return;
    setLocked(true);
    try {
      const result = await answerChoice({ data: { playerId, answerId } });
      setNote(result.correct ? `Correcto. +${result.points} puntos` : "Incorrecto");
    } catch (err) {
      setLocked(false);
      setNote(err instanceof Error ? err.message : "Error");
    }
  }

  async function sendGuess() {
    if (!playerId || !guess.trim()) return;
    try {
      const result = await guessText({ data: { playerId, text: guess } });
      setGuess("");
      setNote(result.matched ? `Acertaste: ${result.label}. +${result.points}` : `No esta. Fallos ${result.strikes}/3`);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Error");
    }
  }

  if (waiting || !live) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#9ed0c0] px-5 dark:bg-[#07111a]">
        <section className="w-full max-w-md p-8 text-center">
          <img src="/logo-jev.png" alt="jev+" className="mx-auto h-28 object-contain" />
          <h1 className="mt-4 text-3xl dark:text-white">Hola, {name || "..."}</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Espera a que el administrador inicie la partida.</p>
          <div className="mx-auto mt-6 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-16">
      <section className="mx-auto max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{live.title}</p>
        <h1 className="mt-1 text-3xl">{name}</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">
          {live.players.map((p) => `${p.name} ${p.score}`).join(" · ")}
        </p>
        {live.status === "lobby" ? <p className="glass mt-6 rounded-3xl p-6 text-center">La ruleta esta lista. Espera el giro.</p> : null}
        {live.status === "spinning" ? <p className="glass mt-6 rounded-3xl p-6 text-center">La ruleta esta girando.</p> : null}
        {(live.status === "question" || live.status === "result" || live.status === "done") && (
          <div className="glass mt-6 rounded-3xl p-5">
            <h2 className="text-center text-xl">{live.prompt}</h2>
            {live.gameId === "ruleta" && live.status === "question" ? (
              <div className="mt-4 space-y-2">
                {live.answers.map((answer) => (
                  <button key={answer.id} disabled={locked} onClick={() => pick(answer.id)} className="w-full rounded-2xl bg-white/70 px-4 py-3 text-left font-medium dark:bg-white/10">
                    {answer.label}
                  </button>
                ))}
              </div>
            ) : null}
            {live.gameId === "cien" && live.status !== "done" ? (
              <div className="mt-4 flex gap-2">
                <input className="flex-1 rounded-2xl border border-white/40 bg-white/70 px-4 py-3 dark:bg-white/10" placeholder="Di la respuesta" value={guess} onChange={(e) => setGuess(e.target.value)} />
                <button onClick={sendGuess} className="rounded-2xl bg-emerald-600 px-4 font-semibold text-white">Enviar</button>
              </div>
            ) : null}
            {live.gameId === "cien" ? (
              <ul className="mt-4 space-y-2">
                {live.answers.map((answer, index) => (
                  <li key={answer.id} className="flex justify-between rounded-2xl bg-emerald-500/10 px-4 py-3">
                    <span>{answer.revealed ? `${index + 1}. ${answer.label}` : `${index + 1}. --------`}</span>
                    <span>{answer.points}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {note ? <p className="mt-4 text-center text-lg font-semibold text-emerald-700">{note}</p> : null}
            {live.status === "result" && live.gameId === "ruleta" ? (
              <p className="mt-2 text-center text-sm">Correcta: {live.answers.find((a) => a.isCorrect)?.label}</p>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
