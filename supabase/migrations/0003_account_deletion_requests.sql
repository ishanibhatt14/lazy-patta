-- Account deletion requests: a user-initiated, auditable queue.
-- The user files a request and may cancel their own pending one; actual
-- deletion is performed server-side (service role), never by the client.

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'cancelled')),
  reason text check (reason is null or char_length(reason) <= 500),
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists account_deletion_requests_user_idx
  on public.account_deletion_requests (user_id);

alter table public.account_deletion_requests enable row level security;

create policy "account_deletion_requests_select_own"
  on public.account_deletion_requests for select
  using (auth.uid() = user_id);

create policy "account_deletion_requests_insert_own"
  on public.account_deletion_requests for insert
  with check (auth.uid() = user_id);

-- A user may only transition their own still-pending request (e.g. to cancel).
-- Advancing to processing/completed is done server-side under the service role.
create policy "account_deletion_requests_update_own_pending"
  on public.account_deletion_requests for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id);
