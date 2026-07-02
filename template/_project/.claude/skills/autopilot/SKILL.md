---
name: autopilot
description: Kick off / grow this togo project via the Autopilot loop — turn a product idea into Autopilot issues and let the agent runner implement them. Use when starting a new project or adding a batch of features.
---

# Build this project's core with Autopilot

This app ships **autopilot** (`togo-framework/autopilot`) — an Issues → Agent →
Code → Deploy loop. Board at **`/autopilot`**, API at **`/api/autopilot/*`**. You
build the product by filing issues; agents implement them; you review the PRs.

## 1. Capture the vision → issues

Ask the user what the product is, then break the **core** into small, concrete
issues (one shippable change each). File them:

```bash
curl -sX POST localhost:8080/api/autopilot/issues -H 'Content-Type: application/json' \
  -d '{"title":"Add a Customer resource (name, email, status)","body":"togo make:resource Customer name:string email:string status:string, then wire a list page","kind":"feature","status":"ready"}'
```

Good core issues for a fresh togo app: the domain resources (`make:resource`),
auth wiring, the primary list/detail pages, and one end-to-end happy path. Keep
each issue small enough that one agent run can finish it.

## 2. Let the agents build

Start the runner (it invokes Claude Code headless in this repo):

```bash
AUTOPILOT_RUNNER=1 AUTOPILOT_WORKDIR="$PWD" AUTOPILOT_PUSH=1 togo serve
```

`ready` issues get claimed, implemented on a branch, and moved to `in_review`
with a PR. Run multiple agents by giving each a unique `AUTOPILOT_AGENT_ID`.

## 3. Human in the loop

- Open the board at `/autopilot`, review each `in_review` issue's branch/PR, and
  **Accept** (→ done) or **Re-run**.
- If an agent is **blocked**, it asked a question in the thread — reply and it
  auto-unblocks and resumes.
- **Feedback everywhere:** add `<script src="/autopilot/feedback.js"></script>`
  to any page; submissions become `feedback` issues.
- **Self-healing:** run with `AUTOPILOT_SELF_HEAL=1` so panics/5xx auto-file
  `bug` issues the agents then fix.

## Rules for issues you file for agents

- One concern per issue; put acceptance criteria in the body.
- Prefer the togo generators (`togo make:resource`) — say so in the body.
- If a decision is genuinely the user's, don't file it as work; ask the user.
