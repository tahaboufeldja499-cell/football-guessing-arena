-- =====================================================================
-- إصلاح تكرار اللاعبين (سببه تشغيل seed.sql أكثر من مرة) — شغّله مرة واحدة في SQL Editor.
-- آمن عند التكرار. ما يفعله:
--   1) يدمج بيانات النسخ المكررة (الصورة، الأسطورة، المركز) في الصف الأقدم لكل لاعب
--   2) يعيد توجيه الأسرار المحفوظة إلى الصف المُبقى، ويحذف التخمينات القديمة للنسخ المحذوفة
--   3) يحذف النسخ المكررة
--   4) يضيف قيد "اسم فريد" لمنع التكرار مستقبلًا (فيصير on conflict do nothing في seed.sql يعمل)
--   5) يحدّث make_guess لتقارن اللاعب بالاسم أيضًا
-- ملاحظة: جولات قديمة منتهية قد تعرض بطاقة فارغة عند الكشف (لا تأثير على الجولات الجديدة).
-- =====================================================================
alter table public.footballers add column if not exists is_legend boolean not null default false;
alter table public.footballers add column if not exists position_detail text;

with agg as (
  select name_en, min(id) as keep_id,
         max(photo_url) as photo_url, bool_or(is_legend) as is_legend, max(position_detail) as position_detail
  from public.footballers group by name_en
)
update public.footballers f set
  photo_url = coalesce(f.photo_url, agg.photo_url),
  is_legend = f.is_legend or agg.is_legend,
  position_detail = coalesce(f.position_detail, agg.position_detail)
from agg where f.id = agg.keep_id;

update public.secret_picks sp set footballer_id = c.keep_id
from public.footballers f
join (select name_en, min(id) as keep_id from public.footballers group by name_en) c on c.name_en = f.name_en
where sp.footballer_id = f.id and f.id <> c.keep_id;

delete from public.guesses g
using public.footballers f,
      (select name_en, min(id) as keep_id from public.footballers group by name_en) c
where g.footballer_id = f.id and c.name_en = f.name_en and f.id <> c.keep_id;

delete from public.footballers f
using (select name_en, min(id) as keep_id from public.footballers group by name_en) c
where f.name_en = c.name_en and f.id <> c.keep_id;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'footballers_name_en_key') then
    alter table public.footballers add constraint footballers_name_en_key unique (name_en);
  end if;
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
  -- المقارنة بالاسم أيضًا: لو وُجدت نسختان من اللاعب نفسه يُحسب التخمين صحيحًا
  ok := (p_footballer = target) or exists (
    select 1 from public.footballers a join public.footballers b on a.name_en = b.name_en
    where a.id = p_footballer and b.id = target);
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

grant execute on function public.make_guess(uuid, int) to authenticated;

-- تحقق: يجب ألا يعيد أي صف
select name_en, count(*) from public.footballers group by name_en having count(*) > 1;
