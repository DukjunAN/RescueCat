-- RescueCat 리더보드 스키마
-- 실행: supabase db query --linked -f supabase/schema.sql

create table if not exists scores (
  id         bigserial primary key,
  user_id    uuid not null,
  nickname   text,
  avatar_url text,
  score      integer not null,
  created_at timestamptz default now()
);

alter table scores enable row level security;

create policy "본인 점수만 저장"
  on scores for insert
  with check (auth.uid() = user_id);

create policy "리더보드 전체 공개"
  on scores for select
  using (true);

create or replace view leaderboard as
select
  user_id,
  nickname,
  avatar_url,
  max(score) as best_score
from scores
group by user_id, nickname, avatar_url
order by best_score desc
limit 20;
