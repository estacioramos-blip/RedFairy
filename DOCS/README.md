# Product OS Starter Kit — for an EXISTING project

This kit retrofits a disciplined Claude Code workflow onto software you've **already built**.
It does not ask you to start over. The whole idea: make Claude reverse-engineer your current
code into living docs, then keep code and docs in lockstep from here on.

It mirrors the system we've been running (PRD → Rules → Roadmap → Code Ledger → Decision Log,
plus security / no-drift / session-close protocols), with GSD underneath for execution and a
design plugin to kill the "AI slop" look.

---

## What's in this kit

| File | Role |
|------|------|
| `00_INDEX.md` | Front door / current status |
| `01_PRD.md` | What the product is + scope (the anti-scope-creep doc) |
| `02_PRODUCT_RULES.md` | Locked tech, **security**, and design rules |
| `03_ROADMAP.md` | Phases + what's next |
| `20_CODE_LEDGER.md` | Append-only log of what got built |
| `90_DECISION_LOG.md` | WHY every important call was made |
| `CLAUDE.md` | The brain: the rules Claude Code reads every session (no-drift + security + session-close) |

---

## Setup (≈15 minutes, do it once)

### Step 1 — Drop the kit into your project
Copy the 6 numbered files into a `docs/` folder at the root of your existing repo, and copy
`CLAUDE.md` to the repo root (merge it into your existing `CLAUDE.md` if you have one).

```
your-project/
├── CLAUDE.md          ← from this kit
└── docs/
    ├── 00_INDEX.md
    ├── 01_PRD.md
    ├── 02_PRODUCT_RULES.md
    ├── 03_ROADMAP.md
    ├── 20_CODE_LEDGER.md
    └── 90_DECISION_LOG.md
```

### Step 2 — Let Claude back-fill the docs from your real code
Open Claude Code in the project and paste the **Kickoff Prompt** below. It will read your
existing codebase and fill the `[BRACKETS]` in each doc with what's *actually there* — your real
features, stack, and rules — instead of you writing them from scratch. Review what it wrote;
correct anything it guessed wrong. That review is the most valuable 20 minutes you'll spend.

### Step 3 — Install GSD (execution engine)
GSD ("Get Shit Done") handles the *how*: it breaks work into phases, plans them, executes in
waves, and tracks atomic commits in a `.planning/` folder. The docs in this kit track the *what*
and *why*; GSD tracks the *how*. They complement each other.

GSD is **not** a normal Claude Code plugin — it installs globally as a set of `/gsd:*`
commands (`~/.claude/commands/gsd/`), a framework folder (`~/.claude/get-shit-done/`), and a
couple of `settings.json` hooks (update check + statusline). Because it's a custom installer,
the cleanest path is:

> **Ask me (your son) for the exact GSD installer command I used** — I already have it set up,
> so I'll send you the one-liner from the get-shit-done repo. Run it once on your machine; it's
> global, so every project then has `/gsd:*` available.

After it's installed, in Claude Code you'll have `/gsd:*` commands. The key ones for an existing project:
- `/gsd:map-codebase` — analyzes your current code into `.planning/codebase/` docs (run this first)
- `/gsd:new-milestone` — define the next chunk of work
- `/gsd:plan-phase` then `/gsd:execute-phase` — plan, then build
- `/gsd:progress` — "where are we, what's next"

> GSD rule of thumb: `/docs` is WHAT/WHY (source of truth) → `.planning/` is HOW → code.
> After a GSD phase finishes: add a Code Ledger row + a Decision Log entry if a rule/scope changed.

### Step 4 — Fix the UI/UX ("AI slop" → distinctive)
Install the **frontend-design** plugin — it's purpose-built to make Claude produce polished,
non-generic interfaces instead of the default bootstrap-y AI look.

In Claude Code:
```
/plugin marketplace add anthropics/claude-code
/plugin install frontend-design
```
Then, whenever building or redesigning UI, tell Claude: *"use the frontend-design skill."*
Pair it with a locked design section in `02_PRODUCT_RULES.md` (theme, ONE primary color for all
buttons, accent rules, shared components only, no raw hex) so every screen looks intentional and
consistent — that consistency is 80% of what separates "slop" from "designed."

For deploys/perf, the `vercel` plugin (`/plugin install vercel`) adds deploy + performance skills.

---

## The Kickoff Prompt (paste this into Claude Code, once)

> I've added a `docs/` Product OS and a `CLAUDE.md` to this **existing** project. I want you to
> adopt this workflow without changing my code's behavior yet.
>
> 1. Read `CLAUDE.md` so you understand the no-drift, security, and session-close rules.
> 2. Explore the actual codebase (run `/gsd:map-codebase` if GSD is installed). Then fill in every
>    `[BRACKET]` placeholder in `docs/01_PRD.md`, `02_PRODUCT_RULES.md`, and `03_ROADMAP.md` from
>    what the code *actually* does today — real features, real stack, real conventions. Mark
>    already-shipped roadmap milestones as **Done**.
> 3. Seed `docs/20_CODE_LEDGER.md` with one summary row for the major work already completed
>    (don't reconstruct full history — just a baseline "existing state as of today" entry).
> 4. Add a first `docs/90_DECISION_LOG.md` entry: "Adopted Product OS + GSD workflow on existing
>    codebase," with the reasons.
> 5. Fill in the GitHub/Vercel account + project-ID rows in `CLAUDE.md`'s security section by
>    running the verify commands, so deploy-safety checks work.
> 6. Show me everything you wrote and ask me to correct anything you inferred wrong. **Do not change
>    application code in this pass** — this is documentation-only.
>
> From now on: follow the SSOT and no-drift rules, keep docs in sync with every change, and run the
> session-close protocol whenever I wrap up.

---

## The daily loop (after setup)

1. **Start:** Claude reads the handoff note, confirms today's priority.
2. **Plan:** `/gsd:plan-phase` for anything non-trivial.
3. **Build:** `/gsd:execute-phase` — or just work, one change = one commit.
4. **Sync:** docs + ledger updated alongside the code (the rule, not an afterthought).
5. **Close:** say "done" → Claude runs the session-close protocol (sync, commit, push, handoff).

That's the whole system: **docs decide, GSD executes, the protocols stop drift and surprises.**
