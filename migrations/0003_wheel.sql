create table if not exists questions (
  id serial primary key,
  partida_id int not null references partidas(id) on delete cascade,
  prompt text not null,
  points int not null default 5,
  sort_order int not null default 0
);

alter table answers add column if not exists question_id int;

insert into questions (partida_id, prompt, points, sort_order)
select p.id, p.prompt, p.points, 1
from partidas p
where not exists (select 1 from questions q where q.partida_id = p.id);

update answers a
set question_id = q.id
from questions q
where q.partida_id = a.partida_id
  and q.sort_order = 1
  and a.question_id is null;

create table if not exists used_questions (
  session_id int not null,
  question_id int not null,
  primary key (session_id, question_id)
);

alter table sessions add column if not exists question_id int;

create table if not exists lobby (
  id serial primary key,
  name text not null,
  session_id int,
  score int not null default 0
);

insert into questions (partida_id, prompt, points, sort_order)
select p.id, v.prompt, 5, v.ord
from partidas p
join (values
  ('El arca', '¿Que ave regreso a Noe con una rama?', 2),
  ('El arca', '¿Cuantos de cada animal limpio entraron al arca?', 3),
  ('El desierto', '¿Quien tentó a Jesus en el desierto?', 2),
  ('El desierto', '¿Con que ayuno Jesus esos dias?', 3),
  ('Primer libro', '¿Quien escribio Genesis?', 2),
  ('Primer libro', '¿Como se llama el primer hombre?', 3)
) as v(title, prompt, ord) on v.title = p.title
where not exists (
  select 1 from questions q where q.partida_id = p.id and q.prompt = v.prompt
);

insert into answers (partida_id, question_id, label, is_correct, points, sort_order)
select q.partida_id, q.id, a.label, a.ok::boolean, 0, a.ord::int
from questions q
join (values
  ('¿Que ave regreso a Noe con una rama?', 'Cuervo', 'false', '1'),
  ('¿Que ave regreso a Noe con una rama?', 'Paloma', 'true', '2'),
  ('¿Que ave regreso a Noe con una rama?', 'Aguila', 'false', '3'),
  ('¿Que ave regreso a Noe con una rama?', 'Gorrion', 'false', '4'),
  ('¿Cuantos de cada animal limpio entraron al arca?', 'Dos', 'false', '1'),
  ('¿Cuantos de cada animal limpio entraron al arca?', 'Siete', 'true', '2'),
  ('¿Cuantos de cada animal limpio entraron al arca?', 'Diez', 'false', '3'),
  ('¿Cuantos de cada animal limpio entraron al arca?', 'Doce', 'false', '4'),
  ('¿Quien tentó a Jesus en el desierto?', 'Pedro', 'false', '1'),
  ('¿Quien tentó a Jesus en el desierto?', 'El diablo', 'true', '2'),
  ('¿Quien tentó a Jesus en el desierto?', 'Herodes', 'false', '3'),
  ('¿Quien tentó a Jesus en el desierto?', 'Caifas', 'false', '4'),
  ('¿Con que ayuno Jesus esos dias?', 'Solo agua', 'false', '1'),
  ('¿Con que ayuno Jesus esos dias?', 'Sin comer', 'true', '2'),
  ('¿Con que ayuno Jesus esos dias?', 'Pan y pescado', 'false', '3'),
  ('¿Con que ayuno Jesus esos dias?', 'Miel', 'false', '4'),
  ('¿Quien escribio Genesis?', 'David', 'false', '1'),
  ('¿Quien escribio Genesis?', 'Moises', 'true', '2'),
  ('¿Quien escribio Genesis?', 'Salomón', 'false', '3'),
  ('¿Quien escribio Genesis?', 'Pablo', 'false', '4'),
  ('¿Como se llama el primer hombre?', 'Noe', 'false', '1'),
  ('¿Como se llama el primer hombre?', 'Adan', 'true', '2'),
  ('¿Como se llama el primer hombre?', 'Cain', 'false', '3'),
  ('¿Como se llama el primer hombre?', 'Set', 'false', '4')
) as a(prompt, label, ok, ord) on a.prompt = q.prompt
where not exists (select 1 from answers x where x.question_id = q.id);

