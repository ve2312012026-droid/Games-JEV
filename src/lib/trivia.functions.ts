import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

export type AnswerRow = {
  id: number;
  label: string;
  isCorrect: boolean;
  points: number;
};

export type QuestionRow = {
  id: number;
  prompt: string;
  points: number;
  answers: AnswerRow[];
};

export type PartidaRow = {
  id: number;
  gameId: string;
  title: string;
  questions: QuestionRow[];
};

const ADMIN_PASSWORD = "GAMES JEV";

function norm(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function code() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export const checkAdmin = createServerFn({ method: "POST" })
  .validator((input: { password: string }) => input)
  .handler(async ({ data }) => ({ ok: data.password === ADMIN_PASSWORD }));

export const listOverview = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const partidas = await sql<{ id: number; game_id: string; title: string }>`
    select id, game_id, title from partidas order by sort_order, id
  `;
  const questions = await sql<{ id: number; partida_id: number; prompt: string; points: number }>`
    select id, partida_id, prompt, points from questions order by sort_order, id
  `;
  const answers = await sql<{
    id: number;
    question_id: number | null;
    label: string;
    is_correct: boolean;
    points: number;
  }>`
    select id, question_id, label, is_correct, points from answers order by sort_order, id
  `;
  const grouped: PartidaRow[] = partidas.map((p) => ({
    id: p.id,
    gameId: p.game_id,
    title: p.title,
    questions: questions
      .filter((q) => q.partida_id === p.id)
      .map((q) => ({
        id: q.id,
        prompt: q.prompt,
        points: q.points,
        answers: answers
          .filter((a) => a.question_id === q.id)
          .map((a) => ({
            id: a.id,
            label: a.label,
            isCorrect: a.is_correct,
            points: a.points,
          })),
      })),
  }));
  return { partidas: grouped };
});

type QInput = {
  prompt: string;
  points: number;
  answers: { label: string; isCorrect: boolean; points: number }[];
};

export const savePartida = createServerFn({ method: "POST" })
  .validator(
    (input: { id?: number; gameId: string; title: string; questions: QInput[] }) => input,
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const title = data.title.trim();
    const questions = data.questions
      .map((q) => ({
        prompt: q.prompt.trim(),
        points: q.points || 5,
        answers: q.answers.map((a) => ({ ...a, label: a.label.trim() })).filter((a) => a.label),
      }))
      .filter((q) => q.prompt);
    if (!title || questions.length < 1) throw new Error("Pon un nombre y al menos una pregunta.");
    for (const q of questions) {
      if (data.gameId === "ruleta") {
        if (q.answers.length !== 4) throw new Error("Cada pregunta de la ruleta lleva 4 respuestas.");
        if (q.answers.filter((a) => a.isCorrect).length !== 1) {
          throw new Error("Marca una sola respuesta correcta en cada pregunta.");
        }
      } else if (q.answers.length < 2) {
        throw new Error("Cien Hermanos necesita al menos dos respuestas.");
      }
    }
    let id = data.id;
    if (id) {
      await sql`update partidas set title = ${title}, game_id = ${data.gameId} where id = ${id}`;
      await sql`delete from answers where question_id in (select id from questions where partida_id = ${id})`;
      await sql`delete from questions where partida_id = ${id}`;
    } else {
      const rows = await sql<{ id: number }>`
        insert into partidas (game_id, title, prompt, points, sort_order)
        values (${data.gameId}, ${title}, ${title}, 5, 100)
        returning id
      `;
      id = rows[0].id;
    }
    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const inserted = await sql<{ id: number }>`
        insert into questions (partida_id, prompt, points, sort_order)
        values (${id}, ${q.prompt}, ${q.points}, ${qi + 1})
        returning id
      `;
      const qid = inserted[0].id;
      for (let ai = 0; ai < q.answers.length; ai++) {
        const a = q.answers[ai];
        await sql`
          insert into answers (partida_id, question_id, label, is_correct, points, sort_order)
          values (${id}, ${qid}, ${a.label}, ${a.isCorrect}, ${a.points || 0}, ${ai + 1})
        `;
      }
    }
    return { id };
  });

export const deletePartida = createServerFn({ method: "POST" })
  .validator((input: { id: number }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from answers where partida_id = ${data.id}`;
    await sql`delete from questions where partida_id = ${data.id}`;
    await sql`delete from partidas where id = ${data.id}`;
    return { ok: true };
  });

async function activeSessionId(sql: Awaited<ReturnType<typeof getSql>>) {
  const rows = await sql<{ id: number }>`
    select id from sessions where status <> 'done' order by id desc limit 1
  `;
  return rows[0]?.id ?? null;
}

export const joinLobby = createServerFn({ method: "POST" })
  .validator((input: { name: string }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const name = data.name.trim().slice(0, 24);
    if (!name) throw new Error("Escribe tu nombre.");
    const active = await activeSessionId(sql);
    const rows = await sql<{ id: number }>`
      insert into lobby (name, session_id) values (${name}, ${active}) returning id
    `;
    return { playerId: rows[0].id, live: Boolean(active) };
  });

export const startSession = createServerFn({ method: "POST" })
  .validator((input: { partidaId: number }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const partidas = await sql<{ id: number; game_id: string }>`
      select id, game_id from partidas where id = ${data.partidaId}
    `;
    const partida = partidas[0];
    if (!partida) throw new Error("Esa partida ya no existe.");
    const count = await sql<{ n: number }>`
      select count(*)::int as n from questions where partida_id = ${partida.id}
    `;
    if (!count[0] || count[0].n < 1) throw new Error("Agrega preguntas en Ajustes antes de iniciar.");
    await sql`update sessions set status = 'done' where status <> 'done'`;
    const status = partida.game_id === "cien" ? "question" : "lobby";
    let next = code();
    const rows = await sql<{ id: number; code: string }>`
      insert into sessions (code, game_id, partida_id, status)
      values (${next}, ${partida.game_id}, ${partida.id}, ${status})
      returning id, code
    `;
    const session = rows[0];
    if (partida.game_id === "cien") {
      const first = await sql<{ id: number }>`
        select id from questions where partida_id = ${partida.id} order by sort_order, id limit 1
      `;
      if (first[0]) {
        await sql`update sessions set question_id = ${first[0].id} where id = ${session.id}`;
      }
    }
    await sql`update lobby set session_id = ${session.id}, score = 0 where session_id is null`;
    return { code: session.code };
  });

type Live = {
  code: string;
  gameId: string;
  status: string;
  strikes: number;
  title: string;
  prompt: string;
  points: number;
  segment: number;
  total: number;
  spinUntil: string | null;
  answers: { id: number; label: string; points: number; revealed: boolean; isCorrect: boolean }[];
  players: { id: number; name: string; score: number }[];
  waiting: boolean;
};

async function loadBySession(sessionId: number, revealSecrets: boolean): Promise<Live | null> {
  const sql = await getSql();
  const sessions = await sql<{
    id: number;
    code: string;
    game_id: string;
    partida_id: number;
    question_id: number | null;
    status: string;
    strikes: number;
    spin_until: string | null;
  }>`
    select id, code, game_id, partida_id, question_id, status, strikes, spin_until::text as spin_until
    from sessions where id = ${sessionId}
  `;
  const session = sessions[0];
  if (!session) return null;
  const partidas = await sql<{ title: string }>`select title from partidas where id = ${session.partida_id}`;
  const questions = await sql<{ id: number; prompt: string; points: number }>`
    select id, prompt, points from questions where partida_id = ${session.partida_id} order by sort_order, id
  `;
  const current = questions.find((q) => q.id === session.question_id) ?? null;
  const segment = Math.max(0, questions.findIndex((q) => q.id === session.question_id));
  const answers = current
    ? await sql<{ id: number; label: string; is_correct: boolean; points: number }>`
        select id, label, is_correct, points from answers where question_id = ${current.id} order by sort_order, id
      `
    : [];
  const revealed = await sql<{ answer_id: number }>`
    select answer_id from reveals where session_id = ${session.id}
  `;
  const revealedSet = new Set(revealed.map((r) => r.answer_id));
  const showSecrets = revealSecrets || session.status === "result" || session.status === "done";
  const players = await sql<{ id: number; name: string; score: number }>`
    select id, name, score from lobby where session_id = ${session.id} order by score desc, id
  `;
  return {
    code: session.code,
    gameId: session.game_id,
    status: session.status,
    strikes: session.strikes,
    title: partidas[0]?.title ?? "Partida",
    prompt: current?.prompt ?? "",
    points: current?.points ?? 5,
    segment,
    total: questions.length,
    spinUntil: session.spin_until,
    answers: answers.map((a) => {
      const open =
        session.game_id === "ruleta"
          ? session.status === "question" || showSecrets
          : revealedSet.has(a.id) || showSecrets;
      return {
        id: a.id,
        label: open ? a.label : "",
        points: a.points,
        revealed: session.game_id === "ruleta" ? showSecrets : revealedSet.has(a.id) || showSecrets,
        isCorrect: showSecrets ? a.is_correct : false,
      };
    }),
    players,
    waiting: false,
  };
}

export const getLive = createServerFn({ method: "POST" })
  .validator((input: { code: string; host?: boolean }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: number }>`
      select id from sessions where code = ${data.code.trim().toUpperCase()}
    `;
    if (!rows[0]) throw new Error("Partida no encontrada.");
    const live = await loadBySession(rows[0].id, Boolean(data.host));
    if (!live) throw new Error("Partida no encontrada.");
    return live;
  });

export const getPlayer = createServerFn({ method: "POST" })
  .validator((input: { playerId: number }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<{ session_id: number | null; name: string; score: number }>`
      select session_id, name, score from lobby where id = ${data.playerId}
    `;
    const me = rows[0];
    if (!me) throw new Error("No estas en la sala.");
    if (!me.session_id) {
      const active = await activeSessionId(sql);
      if (active) {
        await sql`update lobby set session_id = ${active} where id = ${data.playerId}`;
        const live = await loadBySession(active, false);
        return { waiting: false, name: me.name, live };
      }
      return { waiting: true, name: me.name, live: null };
    }
    const live = await loadBySession(me.session_id, false);
    return { waiting: false, name: me.name, live };
  });

export const spin = createServerFn({ method: "POST" })
  .validator((input: { code: string }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const sessions = await sql<{ id: number; partida_id: number; status: string }>`
      select id, partida_id, status from sessions where code = ${data.code.trim().toUpperCase()}
    `;
    const session = sessions[0];
    if (!session) throw new Error("Partida no encontrada.");
    const questions = await sql<{ id: number }>`
      select q.id from questions q
      where q.partida_id = ${session.partida_id}
        and not exists (
          select 1 from used_questions u where u.session_id = ${session.id} and u.question_id = q.id
        )
      order by q.sort_order, q.id
    `;
    if (!questions.length) {
      await sql`update sessions set status = 'done' where id = ${session.id}`;
      throw new Error("Ya se usaron todas las preguntas de esta ruleta.");
    }
    const pick = questions[Math.floor(Math.random() * questions.length)];
    const all = await sql<{ id: number }>`
      select id from questions where partida_id = ${session.partida_id} order by sort_order, id
    `;
    const segment = all.findIndex((q) => q.id === pick.id);
    await sql`
      update sessions
      set status = 'spinning', question_id = ${pick.id}, spin_until = now() + interval '5 seconds'
      where id = ${session.id}
    `;
    await sql`
      insert into used_questions (session_id, question_id) values (${session.id}, ${pick.id})
      on conflict do nothing
    `;
    return { segment, total: all.length };
  });

export const openQuestion = createServerFn({ method: "POST" })
  .validator((input: { code: string }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`
      update sessions set status = 'question'
      where code = ${data.code.trim().toUpperCase()} and status = 'spinning'
    `;
    return { ok: true };
  });

export const answerChoice = createServerFn({ method: "POST" })
  .validator((input: { playerId: number; answerId: number }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const people = await sql<{ session_id: number | null }>`
      select session_id from lobby where id = ${data.playerId}
    `;
    const sessionId = people[0]?.session_id;
    if (!sessionId) throw new Error("Todavia no inicia la partida.");
    const sessions = await sql<{ id: number; status: string; question_id: number | null }>`
      select id, status, question_id from sessions where id = ${sessionId}
    `;
    const session = sessions[0];
    if (!session || session.status !== "question") throw new Error("Todavia no se puede responder.");
    const prior = await sql<{ id: number }>`
      select id from guesses where session_id = ${session.id} and player_id = ${data.playerId}
    `;
    if (prior[0]) throw new Error("Ya respondiste esta pregunta.");
    const answers = await sql<{ is_correct: boolean }>`
      select is_correct from answers where id = ${data.answerId} and question_id = ${session.question_id}
    `;
    if (!answers[0]) throw new Error("Respuesta invalida.");
    const qs = await sql<{ points: number }>`select points from questions where id = ${session.question_id}`;
    const gained = answers[0].is_correct ? (qs[0]?.points ?? 5) : 0;
    await sql`
      insert into guesses (session_id, player_id, answer_id, correct, points)
      values (${session.id}, ${data.playerId}, ${data.answerId}, ${answers[0].is_correct}, ${gained})
    `;
    if (gained) await sql`update lobby set score = score + ${gained} where id = ${data.playerId}`;
    await sql`update sessions set status = 'result' where id = ${session.id}`;
    return { correct: answers[0].is_correct, points: gained };
  });

export const guessText = createServerFn({ method: "POST" })
  .validator((input: { playerId: number; text: string }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const people = await sql<{ session_id: number | null }>`
      select session_id from lobby where id = ${data.playerId}
    `;
    const sessionId = people[0]?.session_id;
    if (!sessionId) throw new Error("Todavia no inicia la partida.");
    const sessions = await sql<{ id: number; status: string; question_id: number | null; strikes: number }>`
      select id, status, question_id, strikes from sessions where id = ${sessionId}
    `;
    const session = sessions[0];
    if (!session || session.status === "done") throw new Error("La partida ya termino.");
    const answers = await sql<{ id: number; label: string; points: number }>`
      select a.id, a.label, a.points from answers a
      where a.question_id = ${session.question_id}
        and not exists (
          select 1 from reveals r where r.session_id = ${session.id} and r.answer_id = a.id
        )
    `;
    const wanted = norm(data.text);
    const hit = answers.find((a) => {
      const label = norm(a.label);
      return label === wanted || (wanted.length > 3 && label.includes(wanted));
    });
    if (!hit) {
      const strikes = Math.min(3, session.strikes + 1);
      const status = strikes >= 3 ? "done" : session.status;
      await sql`update sessions set strikes = ${strikes}, status = ${status} where id = ${session.id}`;
      if (strikes >= 3) {
        await sql`
          insert into reveals (session_id, answer_id)
          select ${session.id}, id from answers where question_id = ${session.question_id}
          on conflict do nothing
        `;
      }
      return { matched: false as const, points: 0, strikes, label: "" };
    }
    await sql`
      insert into reveals (session_id, answer_id) values (${session.id}, ${hit.id})
      on conflict do nothing
    `;
    await sql`update lobby set score = score + ${hit.points} where id = ${data.playerId}`;
    return { matched: true as const, points: hit.points, strikes: session.strikes, label: hit.label };
  });

export const revealOne = createServerFn({ method: "POST" })
  .validator((input: { code: string; answerId: number }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const sessions = await sql<{ id: number }>`
      select id from sessions where code = ${data.code.trim().toUpperCase()}
    `;
    if (!sessions[0]) throw new Error("Partida no encontrada.");
    await sql`
      insert into reveals (session_id, answer_id) values (${sessions[0].id}, ${data.answerId})
      on conflict do nothing
    `;
    return { ok: true };
  });

export const revealAll = createServerFn({ method: "POST" })
  .validator((input: { code: string }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const sessions = await sql<{ id: number; question_id: number | null }>`
      select id, question_id from sessions where code = ${data.code.trim().toUpperCase()}
    `;
    if (!sessions[0]) throw new Error("Partida no encontrada.");
    await sql`
      insert into reveals (session_id, answer_id)
      select ${sessions[0].id}, id from answers where question_id = ${sessions[0].question_id}
      on conflict do nothing
    `;
    await sql`update sessions set status = 'done' where id = ${sessions[0].id}`;
    return { ok: true };
  });
