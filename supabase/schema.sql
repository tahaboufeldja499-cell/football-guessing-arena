-- =====================================================================
-- Football Guessing Arena — المخطط الكامل + سياسات الأمان + دوال الخادم
-- شغّله مرة واحدة في Supabase → SQL Editor.
-- فعّل قبلها: Authentication → Providers → "Allow anonymous sign-ins".
-- =====================================================================
create extension if not exists pgcrypto;

-- ---------- الجداول ----------
create table if not exists public.footballers (
  id serial primary key,
  name_ar text not null,
  name_en text not null,
  nationality text not null,
  club text,
  league text,
  position text not null check (position in ('GK','DF','MF','FW')),
  photo_url text,
  is_legend boolean not null default false,   -- إطار الأساطير الذهبي
  active boolean not null default true
);
-- للمشاريع التي أُنشئ جدولها قبل إضافة العمود:
alter table public.footballers add column if not exists is_legend boolean not null default false;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host uuid not null,
  status text not null default 'lobby'
    check (status in ('lobby','picking','playing','round_end','finished')),
  total_rounds int not null default 3 check (total_rounds between 1 and 9),
  current_round int not null default 1,   -- عدّاد مطلق لا يعود للصفر
  round_base int not null default 0,      -- يتغير عند إعادة المباراة
  turn_uid uuid,
  pending_question uuid,
  winner uuid,
  end_reason text,                        -- 'score' | 'forfeit' | 'draw'
  last_match jsonb,                       -- نتيجة المباراة السابقة بعد "إعادة"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_players (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null,
  nickname text not null,
  seat int not null check (seat in (1,2)),
  ready boolean not null default false,
  picked boolean not null default false,
  score int not null default 0,
  last_seen timestamptz not null default now(),
  primary key (room_id, user_id),
  unique (room_id, seat)
);

-- البطاقة السرية: لا يقرأها إلا صاحبها (RLS) ولا تُنشر عبر Realtime.
create table if not exists public.secret_picks (
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_no int not null,
  user_id uuid not null,
  footballer_id int not null references public.footballers(id),
  primary key (room_id, round_no, user_id)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_no int not null,
  asker uuid not null,
  body text not null check (char_length(body) between 1 and 200),
  answer boolean,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.guesses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_no int not null,
  guesser uuid not null,
  footballer_id int not null references public.footballers(id),
  correct boolean not null,
  created_at timestamptz not null default now(),
  unique (room_id, round_no, guesser, footballer_id)
);

create table if not exists public.rounds (
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_no int not null,
  winner uuid,
  secrets jsonb not null,                 -- { user_id: footballer_id } تُكشف بعد انتهاء الجولة فقط
  ended_at timestamptz not null default now(),
  primary key (room_id, round_no)
);

create index if not exists questions_room_idx on public.questions(room_id, round_no, created_at);
create index if not exists guesses_room_idx on public.guesses(room_id, round_no);

-- ---------- الأمان (RLS) ----------
create or replace function public.is_member(p_room uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.room_players where room_id = p_room and user_id = auth.uid());
$$;

alter table public.footballers  enable row level security;
alter table public.rooms        enable row level security;
alter table public.room_players enable row level security;
alter table public.secret_picks enable row level security;
alter table public.questions    enable row level security;
alter table public.guesses      enable row level security;
alter table public.rounds       enable row level security;

-- لا توجد أي سياسة INSERT/UPDATE/DELETE: كل الكتابة تمر عبر الدوال أدناه فقط.
drop policy if exists p_footballers_read on public.footballers;
create policy p_footballers_read on public.footballers for select to authenticated using (active);
drop policy if exists p_rooms_read on public.rooms;
create policy p_rooms_read on public.rooms for select to authenticated using (public.is_member(id));
drop policy if exists p_players_read on public.room_players;
create policy p_players_read on public.room_players for select to authenticated using (public.is_member(room_id));
drop policy if exists p_secret_read on public.secret_picks;
create policy p_secret_read on public.secret_picks for select to authenticated using (user_id = auth.uid());
drop policy if exists p_questions_read on public.questions;
create policy p_questions_read on public.questions for select to authenticated using (public.is_member(room_id));
drop policy if exists p_guesses_read on public.guesses;
create policy p_guesses_read on public.guesses for select to authenticated using (public.is_member(room_id));
drop policy if exists p_rounds_read on public.rounds;
create policy p_rounds_read on public.rounds for select to authenticated using (public.is_member(room_id));

revoke all on public.footballers, public.rooms, public.room_players, public.secret_picks,
              public.questions, public.guesses, public.rounds from anon, authenticated;
grant select on public.footballers, public.rooms, public.room_players, public.secret_picks,
                public.questions, public.guesses, public.rounds to authenticated;

-- ---------- دوال مساعدة داخلية ----------
create or replace function public._me() returns uuid language plpgsql stable as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'NOT_AUTHENTICATED'; end if;
  return u;
end $$;

create or replace function public._clean(p text, p_min int, p_max int, p_err text)
returns text language plpgsql immutable as $$
declare t text := btrim(regexp_replace(coalesce(p,''), '[[:cntrl:]]', '', 'g'));
begin
  if char_length(t) < p_min or char_length(t) > p_max then raise exception '%', p_err; end if;
  return t;
end $$;

create or replace function public._finish_round(p_room uuid, p_winner uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.rooms; secrets jsonb; s1 int; s2 int; p1 uuid; p2 uuid;
begin
  select * into r from public.rooms where id = p_room;
  select coalesce(jsonb_object_agg(user_id::text, footballer_id), '{}'::jsonb) into secrets
    from public.secret_picks where room_id = p_room and round_no = r.current_round;
  insert into public.rounds(room_id, round_no, winner, secrets)
    values (p_room, r.current_round, p_winner, secrets) on conflict do nothing;
  if p_winner is not null then
    update public.room_players set score = score + 1 where room_id = p_room and user_id = p_winner;
  end if;
  select score, user_id into s1, p1 from public.room_players where room_id = p_room and seat = 1;
  select score, user_id into s2, p2 from public.room_players where room_id = p_room and seat = 2;
  if (r.current_round - r.round_base) >= r.total_rounds then
    update public.rooms set status = 'finished', turn_uid = null, pending_question = null,
      winner = case when s1 > s2 then p1 when s2 > s1 then p2 else null end,
      end_reason = case when s1 = s2 then 'draw' else 'score' end, updated_at = now()
    where id = p_room;
  else
    update public.rooms set status = 'round_end', turn_uid = null, pending_question = null, updated_at = now()
    where id = p_room;
  end if;
end $$;

-- ---------- الدوال العامة (RPC) ----------
create or replace function public._new_code() returns text language plpgsql as $$
declare alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; c text; i int;
begin
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.rooms where code = c);
  end loop;
  return c;
end $$;

create or replace function public.create_room(p_nickname text)
returns table(room_id uuid, code text) language plpgsql security definer set search_path = public as $$
declare u uuid := public._me(); nick text := public._clean(p_nickname, 2, 20, 'BAD_NICKNAME'); rid uuid; c text;
begin
  c := public._new_code();
  insert into public.rooms(code, host) values (c, u) returning id into rid;
  insert into public.room_players(room_id, user_id, nickname, seat) values (rid, u, nick, 1);
  return query select rid, c;
end $$;

create or replace function public.peek_room(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := public._me(); r public.rooms; n int; mem boolean; host_nick text;
begin
  select * into r from public.rooms where code = upper(btrim(p_code));
  if not found then return jsonb_build_object('exists', false); end if;
  select count(*) into n from public.room_players where room_id = r.id;
  select exists(select 1 from public.room_players where room_id = r.id and user_id = u) into mem;
  select nickname into host_nick from public.room_players where room_id = r.id and seat = 1;
  return jsonb_build_object('exists', true, 'is_member', mem, 'players', n, 'status', r.status,
    'host_nickname', host_nick, 'room_id', case when mem then r.id else null end);
end $$;

create or replace function public.join_room(p_code text, p_nickname text)
returns uuid language plpgsql security definer set search_path = public as $$
declare u uuid := public._me(); r public.rooms; n int; seat_free int;
begin
  select * into r from public.rooms where code = upper(btrim(p_code)) for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if exists (select 1 from public.room_players where room_id = r.id and user_id = u) then
    update public.room_players set last_seen = now() where room_id = r.id and user_id = u;
    return r.id;
  end if;
  select count(*) into n from public.room_players where room_id = r.id;
  if n >= 2 then raise exception 'ROOM_FULL'; end if;
  if r.status <> 'lobby' then raise exception 'MATCH_ALREADY_STARTED'; end if;
  select s into seat_free from generate_series(1,2) s
    where s not in (select seat from public.room_players where room_id = r.id) order by s limit 1;
  insert into public.room_players(room_id, user_id, nickname, seat)
    values (r.id, u, public._clean(p_nickname, 2, 20, 'BAD_NICKNAME'), seat_free);
  update public.rooms set updated_at = now() where id = r.id;
  return r.id;
end $$;

create or replace function public.heartbeat(p_room uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.room_players set last_seen = now() where room_id = p_room and user_id = public._me();
end $$;

create or replace function public.set_ready(p_room uuid, p_ready boolean)
returns void language plpgsql security definer set search_path = public as $$
declare u uuid := public._me(); r public.rooms; n int; rdy int;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found or not public.is_member(p_room) then raise exception 'NOT_IN_ROOM'; end if;
  if r.status <> 'lobby' then raise exception 'BAD_STATE'; end if;
  update public.room_players set ready = p_ready where room_id = p_room and user_id = u;
  select count(*), count(*) filter (where ready) into n, rdy from public.room_players where room_id = p_room;
  if n = 2 and rdy = 2 then
    update public.room_players set ready = false where room_id = p_room;
    update public.rooms set status = 'picking', updated_at = now() where id = p_room;
  else
    update public.rooms set updated_at = now() where id = p_room;
  end if;
end $$;

create or replace function public.pick_secret(p_room uuid, p_footballer int)
returns void language plpgsql security definer set search_path = public as $$
declare u uuid := public._me(); r public.rooms; n int; first_uid uuid; rn int;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found or not public.is_member(p_room) then raise exception 'NOT_IN_ROOM'; end if;
  if r.status <> 'picking' then raise exception 'BAD_STATE'; end if;
  if not exists (select 1 from public.footballers where id = p_footballer and active) then
    raise exception 'BAD_FOOTBALLER'; end if;
  if exists (select 1 from public.secret_picks where room_id = p_room and round_no = r.current_round and user_id = u) then
    raise exception 'ALREADY_PICKED'; end if;
  insert into public.secret_picks(room_id, round_no, user_id, footballer_id)
    values (p_room, r.current_round, u, p_footballer);
  update public.room_players set picked = true where room_id = p_room and user_id = u;
  select count(*) into n from public.secret_picks where room_id = p_room and round_no = r.current_round;
  if n = 2 then
    rn := r.current_round - r.round_base;   -- 1,2,3...
    select user_id into first_uid from public.room_players
      where room_id = p_room and seat = case when rn % 2 = 1 then 1 else 2 end;
    update public.rooms set status = 'playing', turn_uid = first_uid, pending_question = null, updated_at = now()
      where id = p_room;
  else
    update public.rooms set updated_at = now() where id = p_room;
  end if;
end $$;

create or replace function public.ask_question(p_room uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare u uuid := public._me(); r public.rooms; qid uuid; body text := public._clean(p_body, 1, 200, 'BAD_QUESTION');
begin
  select * into r from public.rooms where id = p_room for update;
  if not found or not public.is_member(p_room) then raise exception 'NOT_IN_ROOM'; end if;
  if r.status <> 'playing' then raise exception 'BAD_STATE'; end if;
  if r.turn_uid is distinct from u then raise exception 'NOT_YOUR_TURN'; end if;
  if r.pending_question is not null then raise exception 'QUESTION_PENDING'; end if;
  if exists (select 1 from public.questions where room_id = p_room and asker = u
             and created_at > now() - interval '1 second') then raise exception 'TOO_FAST'; end if;
  insert into public.questions(room_id, round_no, asker, body)
    values (p_room, r.current_round, u, body) returning id into qid;
  update public.rooms set pending_question = qid, updated_at = now() where id = p_room;
  return qid;
end $$;

create or replace function public.answer_question(p_room uuid, p_question uuid, p_answer boolean)
returns void language plpgsql security definer set search_path = public as $$
declare u uuid := public._me(); r public.rooms; q public.questions;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found or not public.is_member(p_room) then raise exception 'NOT_IN_ROOM'; end if;
  if r.status <> 'playing' then raise exception 'BAD_STATE'; end if;
  if r.pending_question is distinct from p_question then raise exception 'NO_SUCH_PENDING_QUESTION'; end if;
  select * into q from public.questions where id = p_question;
  if q.asker = u then raise exception 'CANNOT_ANSWER_OWN_QUESTION'; end if;
  if q.answer is not null then raise exception 'ALREADY_ANSWERED'; end if;
  update public.questions set answer = p_answer, answered_at = now() where id = p_question;
  -- تناوب صارم: بعد الإجابة ينتقل الدور إلى المجيب ليسأل أو يخمّن.
  update public.rooms set pending_question = null, turn_uid = u, updated_at = now() where id = p_room;
end $$;

create or replace function public.make_guess(p_room uuid, p_footballer int)
returns boolean language plpgsql security definer set search_path = public as $$
declare u uuid := public._me(); r public.rooms; opp uuid; target int; ok boolean;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found or not public.is_member(p_room) then raise exception 'NOT_IN_ROOM'; end if;
  if r.status <> 'playing' then raise exception 'BAD_STATE'; end if;
  if r.turn_uid is distinct from u then raise exception 'NOT_YOUR_TURN'; end if;
  if r.pending_question is not null then raise exception 'QUESTION_PENDING'; end if;
  select user_id into opp from public.room_players where room_id = p_room and user_id <> u;
  select footballer_id into target from public.secret_picks
    where room_id = p_room and round_no = r.current_round and user_id = opp;
  if target is null then raise exception 'BAD_STATE'; end if;
  if exists (select 1 from public.guesses where room_id = p_room and round_no = r.current_round
             and guesser = u and footballer_id = p_footballer) then raise exception 'DUPLICATE_GUESS'; end if;
  ok := (p_footballer = target);
  insert into public.guesses(room_id, round_no, guesser, footballer_id, correct)
    values (p_room, r.current_round, u, p_footballer, ok);
  if ok then
    perform public._finish_round(p_room, u);
  else
    -- القاعدة الثابتة: التخمين الخاطئ يخسّرك الدور فقط.
    update public.rooms set turn_uid = opp, updated_at = now() where id = p_room;
  end if;
  return ok;
end $$;

create or replace function public.next_round(p_room uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.rooms;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found or not public.is_member(p_room) then raise exception 'NOT_IN_ROOM'; end if;
  if r.status <> 'round_end' then raise exception 'BAD_STATE'; end if;
  update public.room_players set picked = false where room_id = p_room;
  update public.rooms set status = 'picking', current_round = current_round + 1, turn_uid = null,
    pending_question = null, updated_at = now() where id = p_room;
end $$;

create or replace function public.rematch(p_room uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.rooms; s jsonb;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found or not public.is_member(p_room) then raise exception 'NOT_IN_ROOM'; end if;
  if r.status <> 'finished' then raise exception 'BAD_STATE'; end if;
  if (select count(*) from public.room_players where room_id = p_room) < 2 then raise exception 'OPPONENT_LEFT'; end if;
  select jsonb_agg(jsonb_build_object('nickname', nickname, 'score', score) order by seat) into s
    from public.room_players where room_id = p_room;
  update public.room_players set score = 0, picked = false, ready = false where room_id = p_room;
  update public.rooms set status = 'picking', round_base = current_round, current_round = current_round + 1,
    turn_uid = null, pending_question = null, winner = null, end_reason = null,
    last_match = jsonb_build_object('scores', s, 'reason', r.end_reason), updated_at = now()
  where id = p_room;
end $$;

create or replace function public.leave_room(p_room uuid)
returns void language plpgsql security definer set search_path = public as $$
declare u uuid := public._me(); r public.rooms; opp uuid;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found or not public.is_member(p_room) then return; end if;
  select user_id into opp from public.room_players where room_id = p_room and user_id <> u;
  if r.status in ('picking','playing','round_end') and opp is not null then
    update public.rooms set status = 'finished', winner = opp, end_reason = 'forfeit',
      turn_uid = null, pending_question = null, updated_at = now() where id = p_room;
  end if;
  delete from public.room_players where room_id = p_room and user_id = u;
  if opp is null then
    delete from public.rooms where id = p_room;
  elsif r.host = u then
    update public.rooms set host = opp, updated_at = now() where id = p_room;
  else
    update public.rooms set updated_at = now() where id = p_room;
  end if;
end $$;

-- إن اختفى الخصم أكثر من 60 ثانية أثناء اللعب يمكن للاعب المتصل إعلان فوزه.
create or replace function public.claim_forfeit(p_room uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare u uuid := public._me(); r public.rooms; opp_seen timestamptz;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found or not public.is_member(p_room) then raise exception 'NOT_IN_ROOM'; end if;
  if r.status not in ('picking','playing','round_end') then return false; end if;
  select last_seen into opp_seen from public.room_players where room_id = p_room and user_id <> u;
  if opp_seen is null or opp_seen > now() - interval '60 seconds' then return false; end if;
  update public.rooms set status = 'finished', winner = u, end_reason = 'forfeit',
    turn_uid = null, pending_question = null, updated_at = now() where id = p_room;
  return true;
end $$;

-- صلاحيات التنفيذ: المستخدمون الموثّقون (بمن فيهم الضيوف المجهولون) فقط.
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.create_room(text), public.peek_room(text), public.join_room(text, text),
  public.heartbeat(uuid), public.set_ready(uuid, boolean), public.pick_secret(uuid, int),
  public.ask_question(uuid, text), public.answer_question(uuid, uuid, boolean),
  public.make_guess(uuid, int), public.next_round(uuid), public.rematch(uuid),
  public.leave_room(uuid), public.claim_forfeit(uuid)
to authenticated;
revoke execute on function public._finish_round(uuid, uuid), public._new_code(),
  public._clean(text, int, int, text), public._me() from authenticated;
grant execute on function public.is_member(uuid) to authenticated;

-- ---------- Realtime ----------
-- secret_picks غير مضافة عمدًا حتى لا تُبث البطاقات السرية.
do $$ begin
  begin alter publication supabase_realtime add table public.rooms; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.room_players; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.questions; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.guesses; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.rounds; exception when duplicate_object then null; end;
end $$;
