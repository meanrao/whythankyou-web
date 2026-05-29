alter table share_tokens
  add column if not exists open_count integer not null default 0;
