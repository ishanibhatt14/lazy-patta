# 06 · Developer Handbook

Everything an engineer needs to build Lazy Patta well. These docs describe the
**target** conventions; some reference code that doesn't exist yet (this Bible
precedes implementation) — they are the contract the code will meet.

| Doc                                                       | Purpose                                                          |
| --------------------------------------------------------- | ---------------------------------------------------------------- |
| [Getting Started](./getting-started.md)                   | Prereqs, install, run web/mobile/backend locally                 |
| [Folder Structure](./folder-structure.md)                 | Monorepo layout + what goes where                                |
| [Coding Standards](./coding-standards.md)                 | TypeScript, SOLID, tokens-only, naming                           |
| [Git Strategy](./git-strategy.md)                         | Branches, commits, PRs, reviews                                  |
| [Parallel Agent Worktrees](./parallel-agent-worktrees.md) | Safe multi-agent branches, worktrees, ownership, and merge order |
| [Testing Strategy](./testing-strategy.md)                 | Unit/property/integration/e2e + gates                            |
| [Release Process](./release-process.md)                   | How a change reaches users                                       |
| [Deploying to Vercel](./deploying-vercel.md)              | UI-only vs full-online deploy, hosted Supabase, env vars         |

Root-level repo files (to be created with the scaffold): `README.md`, `LICENSE`,
`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `.github/`.
