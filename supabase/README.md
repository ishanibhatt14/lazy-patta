# Supabase foundation

Phase 0 database foundation. Three migrations, each a single user-accessible
table with Row Level Security enabled and owner-scoped policies:

| Migration                            | Table                       | Purpose                                    |
| ------------------------------------ | --------------------------- | ------------------------------------------ |
| `0001_profiles.sql`                  | `profiles`                  | 1:1 account profile (display name, avatar) |
| `0002_user_preferences.sql`          | `user_preferences`          | locale + sound/haptics/motion settings     |
| `0003_account_deletion_requests.sql` | `account_deletion_requests` | user-initiated, auditable deletion queue   |

## Security model

- **RLS on every table.** Nothing is readable/writable without a policy.
- **Owner scoping via `auth.uid()`.** A user only ever touches their own rows.
- **Cascading ownership.** Every table references `auth.users(id) on delete
cascade`, so account removal cleans up dependent rows.
- **No client-side privilege escalation.** Advancing a deletion request past
  `pending`, and the deletion itself, happen server-side under the service role.

## Verification

Two tiers:

1. **Structural (CI, no Docker):** `pnpm --filter @lazy-patta/supabase test`
   parses the migration SQL and asserts RLS is enabled, ownership FKs cascade,
   and every policy is owner-scoped. Runs in the standard `pnpm test` pipeline.
2. **Behavioural (local, against a running instance):** apply the migrations to
   a local Supabase (`supabase start` + `supabase db reset`) and confirm a user
   can read/write only their own rows and cross-user access is denied. This
   requires the Supabase CLI and Docker and is run manually / in a dedicated job.
