import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getLive, openQuestion, revealAll, revealOne, spin } from "@/lib/trivia.functions";

export const Route = createFileRoute("/sala/$code")({
  component: SalaPage,
});

function SalaPage() {
  const { code } = Route.useParams();
  const [live, setLive] = useState<Awaited<ReturnType<typeof getLive>> | null>(null);
  const [spinTo, setSpinTo] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("jev-admin") !== "1") window.location.href = "/";
  }, []);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const next = await getLive({ data: { code, host: true } });
        if (stop) return;
        setLive(next);
        if (next.status === "spinning" && next.spinUntil && Date.parse(next.spinUntil) <= Date.now()) {
          await openQuestion({ data: { code } });
        }
      } catch (err) {
        if (!stop) setError(err instanceof Error ? err.message : "Error");
      }
    };
    tick();
    const id = setInterval(tick, 800);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [code]);

  const slices = Math.max(live?.total ?? 1, 1);
  const colors = ["#10b981", "#047857", "#34d399", "#065f46", "#6ee7b7", "#059669"];

  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 pb-10 pt-16">
      <Link to="/admin" search={{ tab: "partidas", game: live?.gameId === "cien" ? "cien" : "ruleta" }} className="text-sm font-semibold text-emerald-700">
        Volver
      </Link>
      <h1 className="mt-2 text-3xl">{live?.title ?? "Partida"}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-300">{live?.total ?? 0} preguntas en la rueda</p>

      {live?.players?.length ? (
        <ul className="mt-4 space-y-1">
          {live.players.map((player) => (
            <li key={player.id} className="glass flex justify-between rounded-2xl px-4 py-2 text-sm">
              <span>{player.name}</span>
              <span className="font-semibold">{player.score} pts</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-gray-500">Nadie ha entrado todavia. Quienes esperan aparecen aqui al iniciar.</p>
      )}

      {live?.gameId === "ruleta" ? (
        <div className="relative mx-auto mt-8 h-64 w-64">
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-emerald-700">▼</div>
          <div
            className="h-full w-full rounded-full shadow-xl"
            style={{
              background: `conic-gradient(${Array.from({ length: slices }, (_, i) => `${colors[i % colors.length]} ${(i * 360) / slices}deg ${((i + 1) * 360) / slices}deg`).join(",")})`,
              transform: `rotate(${spinTo}deg)`,
              transition: "transform 5s cubic-bezier(.15,.8,.2,1)",
            }}
          />
        </div>
      ) : null}

      {live?.gameId === "ruleta" && (live.status === "lobby" || live.status === "result") ? (
        <button
          onClick={async () => {
            setError("");
            try {
              const result = await spin({ data: { code } });
              const turns = 5 * 360;
              const slice = 360 / result.total;
              setSpinTo((prev) => prev + turns + (360 - ((prev % 360) + result.segment * slice + slice / 2)));
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se pudo girar");
            }
          }}
          className="mt-6 w-full rounded-2xl bg-emerald-600 py-4 font-semibold text-white"
        >
          Girar ruleta
        </button>
      ) : null}

      {live && live.prompt && live.status !== "lobby" && live.status !== "spinning" ? (
        <section className="glass mt-5 rounded-3xl p-5">
          <h2 className="text-center text-xl">{live.prompt}</h2>
          {live.gameId === "ruleta" ? (
            <div className="mt-4 space-y-2">
              {live.answers.map((answer) => (
                <div key={answer.id} className={`rounded-2xl px-4 py-3 ${live.status === "result" && answer.isCorrect ? "bg-emerald-200/80 text-emerald-950" : "bg-white/50 dark:bg-white/10"}`}>
                  {answer.label}
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm">Fallos {live.strikes}/3</p>
              <div className="mt-3 space-y-2">
                {live.answers.map((answer, index) => (
                  <button key={answer.id} onClick={() => revealOne({ data: { code, answerId: answer.id } })} className={`flex w-full justify-between rounded-2xl px-4 py-3 ${answer.revealed ? "bg-emerald-200/70" : "bg-white/50 dark:bg-white/10"}`}>
                    <span>{answer.revealed ? `${index + 1}. ${answer.label}` : `${index + 1}. --------`}</span>
                    <span>{answer.points}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => revealAll({ data: { code } })} className="mt-4 w-full rounded-2xl bg-emerald-600 py-3 font-semibold text-white">Revelar todas</button>
            </>
          )}
        </section>
      ) : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </main>
  );
}
