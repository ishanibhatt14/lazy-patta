# Parallel Agent Worktrees

Use one branch, one Git worktree, and one clearly owned area per agent. This keeps
parallel work fast without letting agents overwrite each other's branches,
indexes, or lockfile edits.

## Start small

Do not launch every implementation lane at once. Begin with three or four agents,
then expand after the platform branch merges and CI is green.

Recommended first wave:

| Lane       | Branch                          | Owned area                                          |
| ---------- | ------------------------------- | --------------------------------------------------- |
| Platform   | `chore/modernize-expo-57`       | Node, pnpm, Expo, React Native, CI, lockfile        |
| Design     | `design/rich-game-ui-v2`        | Design tokens, component contracts, animation specs |
| Game rules | `docs/gadha-chor-rules`         | Rule variants, fixtures, tutorials, edge cases      |
| Security   | `docs/multiplayer-threat-model` | RLS model, card privacy, reconnect, anti-cheat      |

Only the platform lane should edit:

```text
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
.github/workflows/
.nvmrc
apps/mobile/package.json
```

## Manual setup

From the parent directory of this repository:

```bash
cd lazy-patta
git switch main
git pull --ff-only
git fetch origin

git worktree add -b chore/modernize-expo-57 ../lazy-patta-platform origin/main
git worktree add -b design/rich-game-ui-v2 ../lazy-patta-design origin/main
git worktree add -b docs/gadha-chor-rules ../lazy-patta-rules origin/main
git worktree add -b docs/multiplayer-threat-model ../lazy-patta-security origin/main

git worktree list
```

If a branch already exists locally, attach it to a worktree without `-b`:

```bash
git worktree add ../lazy-patta-platform chore/modernize-expo-57
```

Start each agent from its own worktree directory.

## Required agent preflight

Every agent must run this before editing:

```bash
pwd
git branch --show-current
git status --short --branch
git log --oneline -3
git worktree list
```

The agent must stop if its directory, branch, or worktree does not match the
assignment.

## Assignment template

```text
Role:
[ROLE]

Branch:
[BRANCH]

Worktree:
[WORKTREE PATH]

Owned paths:
[ALLOWED PATHS]

Do not modify:
[FORBIDDEN PATHS]

Requirements:
[EXACT TASK REQUIREMENTS]

Validation:
[REQUIRED COMMANDS]
```

Coordination rules:

- Do not switch branches.
- Do not run `git reset`, `git rebase`, `git merge`, `git clean`, or force-push.
- Do not edit files outside the owned paths.
- Do not upgrade shared dependencies unless assigned as the platform owner.
- Do not modify the lockfile unless explicitly authorized.
- Do not assume another agent's unmerged work exists.
- Consume only contracts currently present in the branch.
- If a required contract is missing, document the need instead of inventing a competing contract.

## Merge flow

```text
Agent completes task
-> Draft PR
-> CI
-> QA/reviewer agent
-> Human review
-> Merge one at a time
-> Remaining branches update from main
```

Recommended merge order:

1. Platform modernization
2. Shared contracts
3. Design tokens
4. Game engine
5. Backend/auth
6. Web UI
7. Mobile UI
8. Integration and QA

## Local service ports

Do not run multiple local Supabase instances. Only the backend worktree should run
Supabase locally; other agents should use mocks, fixtures, or a documented shared
environment.

Recommended web ports:

| Lane                  | Port   |
| --------------------- | ------ |
| Platform verification | `3000` |
| Web UI agent          | `3001` |
| Design preview        | `3002` |
| QA/E2E                | `3003` |
