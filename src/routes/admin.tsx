import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  deletePartida,
  listOverview,
  savePartida,
  startSession,
  type PartidaRow,
  type QuestionRow,
} from "@/lib/trivia.functions";

type Tab = "juegos" | "partidas" | "ajustes";
type GameId = "ruleta" | "cien";
type DraftQ = { prompt: string; points: number; answers: { label: string; isCorrect: boolean; points: number }[] };

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: search.tab === "partidas" || search.tab === "ajustes" ? search.tab : "juegos",
    game: search.game === "cien" ? "cien" : "ruleta",
  }),
  component: AdminPage,
});

function blankQuestion(ruleta: boolean): DraftQ {
  return ruleta
    ? {
        prompt: "",
        points: 5,
        answers: [
          { label: "", isCorrect: true, points: 0 },
          { label: "", isCorrect: false, points: 0 },
          { label: "", isCorrect: false, points: 0 },
          { label: "", isCorrect: false, points: 0 },
        ],
      }
    : { prompt: "", points: 0, answers: [{ label: "", isCorrect: true, points: 30 }, { label: "", isCorrect: true, points: 20 }] };
}

function AdminPage() {
  const { tab, game } = Route.useSearch();
  const navigate = useNavigate();
  const [partidas, setPartidas] = useState<PartidaRow[]>([]);
  const [editing, setEditing] = useState<PartidaRow | "new" | null>(null);
  const [gameForNew, setGameForNew] = useState<GameId>("ruleta");
  const [pending, setPending] = useState<PartidaRow | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("jev-admin") !== "1") {
      navigate({ to: "/", search: { admin: false } });
    }
  }, [navigate]);

  async function reload() {
    const data = await listOverview();
    setPartidas(data.partidas);
  }

  useEffect(() => {
    reload().catch((err) => setError(err instanceof Error ? err.message : "Error"));
  }, []);

  function go(next: { tab?: Tab; game?: GameId }) {
    navigate({ to: "/admin", search: { tab: next.tab ?? tab, game: next.game ?? game } });
  }

  const visible = partidas.filter((p) => p.gameId === game);

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-28">
      <div className="px-5 pt-16">
        {tab === "juegos" ? (
          <>
            <h1 className="text-3xl">Juegos</h1>
            <button onClick={() => go({ tab: "partidas", game: "ruleta" })} className="mt-5 w-full rounded-3xl bg-gradient-to-r from-emerald-500 to-emerald-700 p-5 text-left text-white shadow-lg">
              <span className="block text-xl font-semibold">Ruleta Clasica</span>
              <span className="mt-1 block text-sm text-emerald-50">Cada sector de la rueda es una pregunta</span>
            </button>
            <button onClick={() => go({ tab: "partidas", game: "cien" })} className="mt-3 w-full rounded-3xl bg-gradient-to-r from-emerald-800 to-emerald-950 p-5 text-left text-white shadow-lg">
              <span className="block text-xl font-semibold">Cien Hermanos Dijeron</span>
              <span className="mt-1 block text-sm text-emerald-50">Varias respuestas y tres fallos</span>
            </button>
          </>
        ) : null}

        {tab === "partidas" ? (
          <>
            <h1 className="text-3xl">Partidas</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">{game === "ruleta" ? "Ruleta Clasica" : "Cien Hermanos Dijeron"}</p>
            <div className="mt-5 space-y-2">
              {visible.map((partida) => (
                <button key={partida.id} onClick={() => setPending(partida)} className="glass flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left">
                  <span>
                    <span className="block font-semibold">{partida.title}</span>
                    <span className="block text-sm text-gray-500 dark:text-gray-300">{partida.questions.length} preguntas</span>
                  </span>
                  <span className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Abrir</span>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {tab === "ajustes" ? (
          <>
            <h1 className="text-3xl">Ajustes</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">Desliza una fila a la derecha para eliminar. Toca para editar.</p>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            {(["ruleta", "cien"] as const).map((gameId) => (
              <GameBlock
                key={gameId}
                gameId={gameId}
                partidas={partidas.filter((p) => p.gameId === gameId)}
                onEdit={setEditing}
                onAdd={() => {
                  setGameForNew(gameId);
                  setEditing("new");
                }}
                onDelete={async (id) => {
                  await deletePartida({ data: { id } });
                  await reload();
                }}
              />
            ))}
          </>
        ) : null}
      </div>

      {pending ? (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4">
          <div className="glass w-full max-w-lg rounded-3xl p-6 text-center">
            <h2 className="text-2xl">Iniciar partida</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{pending.title}. Quienes estan esperando entran solos.</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setPending(null)} className="flex-1 rounded-2xl bg-white/70 py-3 font-semibold dark:bg-white/10">Cancelar</button>
              <button
                onClick={async () => {
                  const session = await startSession({ data: { partidaId: pending.id } });
                  setPending(null);
                  navigate({ to: "/sala/$code", params: { code: session.code } });
                }}
                className="flex-1 rounded-2xl bg-emerald-600 py-3 font-semibold text-white"
              >
                Iniciar partida
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editing ? (
        <Editor
          gameId={editing === "new" ? gameForNew : (editing.gameId as GameId)}
          partida={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reload();
          }}
        />
      ) : null}

      <nav className="glass fixed inset-x-0 bottom-0 mx-auto flex max-w-lg justify-around rounded-t-3xl px-2 py-3">
        {(["juegos", "partidas", "ajustes"] as const).map((id) => (
          <button key={id} onClick={() => go({ tab: id })} className={`px-4 text-sm font-semibold capitalize ${tab === id ? "text-emerald-600" : "text-gray-400"}`}>
            {id === "juegos" ? "Juegos" : id === "partidas" ? "Partidas" : "Ajustes"}
          </button>
        ))}
      </nav>
    </div>
  );
}

function GameBlock({
  gameId,
  partidas,
  onEdit,
  onAdd,
  onDelete,
}: {
  gameId: GameId;
  partidas: PartidaRow[];
  onEdit: (p: PartidaRow) => void;
  onAdd: () => void;
  onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState(gameId === "ruleta");
  return (
    <section className="mt-4">
      <button onClick={() => setOpen(!open)} className="glass flex w-full items-center justify-between rounded-2xl px-4 py-4">
        <span className="font-semibold">{gameId === "ruleta" ? "Ruleta Clasica" : "Cien Hermanos Dijeron"}</span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="mt-2 space-y-2">
          {partidas.map((partida) => (
            <SwipeRow key={partida.id} onDelete={() => onDelete(partida.id)}>
              <button onClick={() => onEdit(partida)} className="w-full px-4 py-3 text-left">
                <span className="block font-medium">{partida.title}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-300">{partida.questions.length} preguntas</span>
              </button>
            </SwipeRow>
          ))}
          <button onClick={onAdd} className="w-full rounded-2xl bg-emerald-600/10 px-4 py-3 text-left text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            Agregar partida
          </button>
        </div>
      ) : null}
    </section>
  );
}

function SwipeRow({ children, onDelete }: { children: ReactNode; onDelete: () => void }) {
  const [x, setX] = useState(0);
  const [start, setStart] = useState<number | null>(null);
  return (
    <div className="relative overflow-hidden rounded-2xl">
      <button onClick={onDelete} className="absolute inset-y-0 left-0 bg-red-500/80 px-4 text-sm font-semibold text-white backdrop-blur-xl">
        Eliminar
      </button>
      <div
        className="glass relative"
        style={{ transform: `translateX(${x}px)`, transition: start === null ? "transform .28s cubic-bezier(.2,.8,.2,1)" : "none" }}
        onPointerDown={(e) => setStart(e.clientX - x)}
        onPointerMove={(e) => {
          if (start === null) return;
          setX(Math.max(0, Math.min(120, e.clientX - start)));
        }}
        onPointerUp={() => {
          setStart(null);
          setX((value) => (value > 70 ? 120 : 0));
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Editor({
  gameId,
  partida,
  onClose,
  onSaved,
}: {
  gameId: GameId;
  partida: PartidaRow | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const ruleta = gameId === "ruleta";
  const [title, setTitle] = useState(partida?.title ?? "");
  const [questions, setQuestions] = useState<DraftQ[]>(
    partida
      ? partida.questions.map((q: QuestionRow) => ({
          prompt: q.prompt,
          points: q.points,
          answers: q.answers.map((a) => ({ label: a.label, isCorrect: a.isCorrect, points: a.points })),
        }))
      : [blankQuestion(ruleta)],
  );
  const [error, setError] = useState("");

  function patchQ(index: number, next: DraftQ) {
    setQuestions(questions.map((q, i) => (i === index ? next : q)));
  }

  async function save() {
    setError("");
    try {
      await savePartida({ data: { id: partida?.id, gameId, title, questions } });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/45 p-3">
      <div className="glass max-h-[88vh] w-full max-w-lg overflow-auto rounded-3xl p-5">
        <h2 className="text-2xl">{partida ? "Editar" : "Nueva partida"}</h2>
        <input className="mt-4 w-full rounded-2xl border border-white/40 bg-white/70 px-4 py-3 dark:bg-white/10" placeholder="Nombre del tema" value={title} onChange={(e) => setTitle(e.target.value)} />
        {questions.map((q, qi) => (
          <div key={qi} className="mt-4 rounded-2xl border border-white/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Pregunta {qi + 1}</p>
            <textarea className="mt-2 w-full rounded-xl border border-white/40 bg-white/70 px-3 py-2 dark:bg-white/10" placeholder="Pregunta" value={q.prompt} onChange={(e) => patchQ(qi, { ...q, prompt: e.target.value })} />
            {ruleta ? (
              <input type="number" className="mt-2 w-full rounded-xl border border-white/40 bg-white/70 px-3 py-2 dark:bg-white/10" value={q.points} onChange={(e) => patchQ(qi, { ...q, points: Number(e.target.value) })} />
            ) : null}
            {q.answers.map((row, ai) => (
              <div key={ai} className="mt-2 flex gap-2">
                {ruleta ? (
                  <input type="radio" checked={row.isCorrect} onChange={() => patchQ(qi, { ...q, answers: q.answers.map((a, i) => ({ ...a, isCorrect: i === ai })) })} />
                ) : (
                  <input type="number" className="w-16 rounded-xl border px-2 dark:bg-white/10" value={row.points} onChange={(e) => patchQ(qi, { ...q, answers: q.answers.map((a, i) => i === ai ? { ...a, points: Number(e.target.value) } : a) })} />
                )}
                <input className="flex-1 rounded-xl border border-white/40 bg-white/70 px-3 py-2 dark:bg-white/10" placeholder="Respuesta" value={row.label} onChange={(e) => patchQ(qi, { ...q, answers: q.answers.map((a, i) => i === ai ? { ...a, label: e.target.value } : a) })} />
              </div>
            ))}
            {!ruleta ? (
              <button className="mt-2 text-sm font-semibold text-emerald-700" onClick={() => patchQ(qi, { ...q, answers: [...q.answers, { label: "", isCorrect: true, points: 10 }] })}>
                Agregar respuesta
              </button>
            ) : null}
          </div>
        ))}
        {ruleta ? (
          <button className="mt-3 text-sm font-semibold text-emerald-700" onClick={() => setQuestions([...questions, blankQuestion(true)])}>
            Agregar otra pregunta al tema
          </button>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-2xl bg-white/70 py-3 font-semibold dark:bg-white/10">Cancelar</button>
          <button onClick={save} className="flex-1 rounded-2xl bg-emerald-600 py-3 font-semibold text-white">Guardar</button>
        </div>
      </div>
    </div>
  );
}
