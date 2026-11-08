create table if not exists games (
  id text primary key,
  name text not null,
  blurb text not null
);

insert into games (id, name, blurb) values
  ('ruleta', 'Ruleta Clasica', 'Cuatro opciones y una sola correcta'),
  ('cien', 'Cien Hermanos Dijeron', 'Varias respuestas y tres fallos')
on conflict (id) do nothing;

create table if not exists partidas (
  id serial primary key,
  game_id text not null references games(id),
  title text not null,
  prompt text not null,
  points int not null default 5,
  sort_order int not null default 0
);

create table if not exists answers (
  id serial primary key,
  partida_id int not null references partidas(id) on delete cascade,
  label text not null,
  is_correct boolean not null default false,
  points int not null default 0,
  sort_order int not null default 0
);

create table if not exists sessions (
  id serial primary key,
  code text not null unique,
  game_id text not null,
  partida_id int not null,
  status text not null default 'lobby',
  strikes int not null default 0,
  spin_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id serial primary key,
  session_id int not null,
  name text not null,
  score int not null default 0
);

create table if not exists guesses (
  id serial primary key,
  session_id int not null,
  player_id int not null,
  answer_id int,
  correct boolean not null default false,
  points int not null default 0
);

create table if not exists reveals (
  session_id int not null,
  answer_id int not null,
  primary key (session_id, answer_id)
);

insert into partidas (game_id, title, prompt, points, sort_order)
select * from (values
  ('ruleta', 'El arca', '¿Quien construyo el arca?', 5, 1),
  ('ruleta', 'El desierto', '¿Cuantos dias estuvo Jesus en el desierto?', 5, 2),
  ('ruleta', 'Primer libro', '¿Cual es el primer libro de la Biblia?', 5, 3),
  ('cien', 'Milagros', 'Nombra un milagro de Jesus', 0, 1),
  ('cien', 'Frutos', 'Nombra un fruto del Espiritu', 0, 2),
  ('cien', 'Dudas', 'Nombra un personaje que dudo', 0, 3)
) as v(game_id, title, prompt, points, sort_order)
where not exists (select 1 from partidas);

insert into answers (partida_id, label, is_correct, points, sort_order)
select p.id, a.label, a.is_correct::boolean, a.points::int, a.sort_order::int
from (values
  ('El arca', 'Abraham', 'false', '0', '1'),
  ('El arca', 'Noe', 'true', '0', '2'),
  ('El arca', 'Moises', 'false', '0', '3'),
  ('El arca', 'David', 'false', '0', '4'),
  ('El desierto', '20', 'false', '0', '1'),
  ('El desierto', '30', 'false', '0', '2'),
  ('El desierto', '40', 'true', '0', '3'),
  ('El desierto', '50', 'false', '0', '4'),
  ('Primer libro', 'Exodo', 'false', '0', '1'),
  ('Primer libro', 'Genesis', 'true', '0', '2'),
  ('Primer libro', 'Levitico', 'false', '0', '3'),
  ('Primer libro', 'Numeros', 'false', '0', '4'),
  ('Milagros', 'Multiplicacion de los panes', 'true', '30', '1'),
  ('Milagros', 'Caminar sobre el agua', 'true', '25', '2'),
  ('Milagros', 'Resucitar a Lazaro', 'true', '20', '3'),
  ('Milagros', 'Sanar al ciego', 'true', '15', '4'),
  ('Milagros', 'Convertir el agua en vino', 'true', '10', '5'),
  ('Frutos', 'Amor', 'true', '25', '1'),
  ('Frutos', 'Gozo', 'true', '20', '2'),
  ('Frutos', 'Paz', 'true', '18', '3'),
  ('Frutos', 'Paciencia', 'true', '15', '4'),
  ('Frutos', 'Benignidad', 'true', '12', '5'),
  ('Dudas', 'Tomas', 'true', '30', '1'),
  ('Dudas', 'Moises', 'true', '25', '2'),
  ('Dudas', 'Jonas', 'true', '20', '3'),
  ('Dudas', 'Gedeon', 'true', '15', '4'),
  ('Dudas', 'Pedro', 'true', '10', '5')
) as a(title, label, is_correct, points, sort_order)
join partidas p on p.title = a.title
where not exists (select 1 from answers);

