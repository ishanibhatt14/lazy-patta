alter table public.lal_satti_score_sessions
  add column if not exists score_rule text not null default 'card-count-v1'
  check (score_rule in ('card-count-v1', 'rank-value-v2'));
