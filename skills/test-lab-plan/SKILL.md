---
name: test-lab-plan
description: Write production-ready test plans for test-lab.ai, the AI QA platform that runs natural-language tests against websites. Use this skill whenever the user wants to write a test for test-lab.ai, draft a "natural language test" / "english test" / "AI test" / "test plan", set up acceptance criteria for a user flow, describe a journey to test, or generate prompts for the test-lab.ai dashboard. Trigger on mentions of test-lab, test-lab.ai, or testlab, and on requests like "test my login", "write a QA test for [page]", "smoke test for [flow]", or any browser-test description that does not reference Playwright/Cypress/Jest by name. Outputs a copy-pasteable test plan with explicit URLs, numbered acceptance criteria, mode + agent type recommendation, and {{credentials.<key>}} syntax for sensitive values.
allowed-tools:
  - Read
  - Glob
  - Grep
  - WebFetch
  - Bash
  - Write
---

# test-lab.ai test plans

[test-lab.ai](https://test-lab.ai) is an AI QA platform. A test plan is a plain-English prompt that describes a single user flow; an AI agent reads the prompt, drives a real browser, and reports pass/fail against the acceptance criteria you wrote. Your job in this skill is to turn whatever the user describes into a paste-ready plan that follows the conventions below.

You are **writing the prompt** (you don't run the test). There are two ways your output gets used — offer the second whenever it's available:

1. **Copy-paste** into the test-lab.ai dashboard (Test Plans → New) — the default.
2. **Create it directly** with the `@test-lab-ai/cli` (`testlab`), which creates the credentials, labels, test data (data fixtures), AND the plan(s) in the user's account in one step. See **"Creating it with the CLI"** below.

Either way the design rules are identical (explicit URLs, declarative criteria, credentials syntax) — the CLI just uploads what you'd otherwise hand back to paste.

## Workflow

Follow these steps in order. Each step has a reason — when you're tempted to skip one, re-read the reason.

### 1. Gather scope

Ask (or infer from context) four things, then confirm before drafting:

- **The flow**: one sentence — "user signs up", "shopper checks out with a saved card", "admin disables a schedule"
- **The starting URL or path**: `/login`, `https://example.com/cart`, etc. The agent has to navigate somewhere to begin.
- **What success looks like**: the visible signal that the flow worked (redirect, message, element appearing). The agent needs verifiable acceptance criteria, not "verify it works."
- **Who performs it**: anonymous visitor, logged-in user, admin. If the flow needs a logged-in user or other setup state, configure that as a pre-step on the plan in the dashboard — don't add it to the prompt body (see references/syntax.md).

Why first: every later step depends on this. Drafting before scope is set produces plans that need rewriting.

#### Read the source if it's in the repo

If you're operating inside a repo that contains the target site's code, **read the relevant components and routes before drafting**. This is the difference between guessing and knowing. Use Glob / Grep / Read to find:

- The page or form component (often in `app/`, `components/`, `src/components/`, or similar)
- The API route handler the form posts to
- Shared widgets the form composes (captcha, modal, error renderer)

Anchor every acceptance criterion to real DOM text or real response shape. If the success state is "the form is replaced by a card with the heading 'Message Sent!'", say that exactly — not "a confirmation message appears."

If the source is **not** available (you're not in the repo, or it's a third-party site), pull a snapshot via WebFetch or ask the user for screenshots of the key states. Do not invent placeholder text — vague criteria like "a success banner appears" make the AI agent flag false negatives whenever copy changes.

### 2. Pick the test mode

Two modes exist:

- **Quick** — single agent, ~10 steps max, ~2-5 min. Use for smoke tests, frequent CI runs, the happy path.
- **Deep** — multiple agents, 20-40+ steps, ~5-10 min. Use for critical pre-release flows, edge cases, sad paths, exploratory branches.

Default to **Quick** unless the user asked for thorough coverage or the flow has obvious sad paths the user wants exercised. A Quick plan with 30 acceptance criteria is wrong; rewrite it as Deep or split it.

Note the vocabulary mismatch: the dashboard says "Quick / Deep"; the API and DB use `quickTest` / `deepTest`. Teach the user both — they'll paste into different surfaces.

### 3. Pick the agent type

Two agent types are user-pickable in the dashboard today:

- **Functional** (default) — workflows, forms, navigation, CRUD, happy and sad paths. Use this unless the user is explicitly asking about accessibility.
- **Accessibility** — WCAG behavior, keyboard navigation, focus management, screen-reader-relevant patterns. Use only when the test is about a11y; do not silently pick it for general tests.

Other agent types (UI/UX, exploratory, performance, security) exist in the platform but are not yet exposed in the dashboard; do not recommend them.

**Labels:** assign exactly **one** label by default: the single most relevant tag, such as the feature area (`onboarding`, `auth`, `checkout`) or `smoke` for a basic health check. Add a second label only if the user explicitly asks for more. In the dashboard you set this on the plan; in a CLI bundle it is the plan's `labels` array, which should normally have a single entry.

### 4. Draft the plan from the template

Use the Template section below. Fill in the steps in the order a user would do them. Keep prose natural — write like you're briefing a human tester, not coding a DSL. Numbered steps are fine but not required for the action sequence; what *must* be numbered is the acceptance criteria block.

### 5. Write declarative, verifiable acceptance criteria

After the action sequence, add a numbered `Verify that:` block. Each item describes a state the agent can observe, not an action to take.

- Good: `2. The user menu in the header shows the logged-in user's email.`
- Bad: `2. Click the user menu and check that login worked.`

The agent will execute each item independently as a check. Vague items like "verify it works" produce noisy reports.

### 6. Plug in credentials and dynamic data

If the flow uses sensitive values (passwords, API keys, real emails), reference them through credentials instead of inlining:

- Use `{{credentials.<name>}}` — **no spaces** inside the braces. The dashboard validates this and rejects spaced variants.
- Never write a literal password into a plan you hand back. If the user gives you one, replace it with `{{credentials.<name>}}` and list the credential name in an "Assumes credentials:" footer so the user knows what to set up in Settings → Credentials.

If the flow needs to **input generated or unique data** — a fresh email per run, a random name, a unique order ref — define a **data fixture** and reference it as `{{data.<fixtureKey>.<fieldKey>}}` (no spaces). A fixture field is either *static* (a literal value) or *dynamic* (a generator like `internet.email`, `person.firstName`, or `string.uuid` that rolls a fresh value every run). Prefer this over a brittle hardcoded value or asking the user to pre-make one. You create fixtures with the CLI (see "Creating it with the CLI"); run `testlab examples` for the field shape and the full generator list.

Three things to know about data fixtures:

- **Each one is either account-level or scoped to a single project.** `testlab data create -f fixture.json --project <id|name>` scopes a fixture to that project; `--project none` (or omitting the flag) keeps it account-level, which is the default. An account-level fixture resolves on every run in the account; a project-scoped one resolves only on runs of that project's plans, and where both define the same `<fixtureKey>.<fieldKey>` the project's value wins there (account-level fields the project does not redefine still resolve). Scope to a project for values that only make sense in one app, tenant, or environment; keep shared defaults account-level. `testlab data list [--project <id|name>]` lists one scope at a time, so a fixture absent from `testlab data list` may still exist inside a project.
- **The CLI creates fixtures but cannot change them.** `testlab data` has only `list` and `create` (no `update`, no `delete`), and `create` returns 409 when the key already exists in the same scope, so it is never an upsert. Create with `testlab data create` or an import bundle; edit or delete in the dashboard's "Manage test data" modal, which has a tab per scope (Account, then each project). Every fixture that resolves for a run appears on that run's "Test data used" panel.
- **The same fixture works verbatim in an uploaded Playwright script.** The identical `{{data.<fixtureKey>.<fieldKey>}}` reference resolves server-side inside an uploaded script too (as a string literal, not a destructured fixture - see the test-lab-script skill). So when a plan will be implemented by an uploaded script, reference the fixture in both the prompt and the script; don't hardcode a different value in one of them.

For pipeline inputs (only in pre-steps), the syntax is `{{ input.<name> }}` **with spaces** — and the fallback form `{{ input.<name> | credentials.<fallback> }}`. The two syntaxes are intentionally different; do not mix them. Full detail in `references/syntax.md`.

For dynamic values in **acceptance criteria** (data you *check*, not data you *enter*), write the criterion as a pattern: "verify *a* product appears" rather than "verify 'Blue Widget' appears." Fixtures are for input; patterns are for assertions.

### 7. Self-check, then hand back

Before outputting the plan, run it through the Self-check section below. Fix anything the checklist catches. Then output exactly:

1. A single 3-backtick fenced code block containing the plan body (so the user can copy it cleanly).
2. Immediately after, a one-line summary in plain prose with mode + agent type + assumed credentials.

Do NOT wrap the output in another fence (e.g. 4-backticks around the whole thing). The user wants the code block to be copy-pasteable as-is — nesting fences leaks stray ``` lines into the visible output.

If the user's request is ambiguous about scope (step 1), ask before drafting — do not guess and produce a wrong-shaped plan.

## Template

```
Go to <URL or path>.

<Action 1 — one or two sentences in natural prose.>

<Action 2 — including any data the user provides.>

<… more actions, in the order a real user would perform them.>

Verify that:
1. <Observable state 1.>
2. <Observable state 2.>
3. <Observable state 3.>
```

Setup state (logged-in user, fixture data, etc.) is configured as a pre-step on the plan in the dashboard — never as a `Pre-condition:` line in the prompt body. Don't include such a line.

For sensitive values, references go inline:
```
Enter email {{credentials.testEmail}} and password {{credentials.testPassword}}.
```

End with an "Assumes credentials:" footer when applicable:
```
Assumes credentials: testEmail, testPassword (configure in Settings → Credentials before running).
```

## Inline example

User says: "Write a test for our login. Lands on /login, real email and password from credentials, expects to land on /dashboard."

You produce (one 3-backtick fenced code block, then the summary line as plain prose — no outer wrapper):

```
Go to /login.

Enter the email {{credentials.testEmail}} and the password {{credentials.testPassword}}.

Click the "Sign in" button.

Verify that:
1. The browser navigates to /dashboard.
2. A user menu or avatar is visible in the page header.
3. The header shows text matching the logged-in user's email or display name.
4. No error banner appears at the top of the page.
```

**Mode:** Quick · **Agent:** Functional · **Assumes credentials:** `testEmail`, `testPassword` (set in Settings → Credentials).

## Self-check (apply before handing back)

Walk this list before output. Each item failed = fix the plan, don't ship it.

1. **Start URL is explicit.** "Go to <something>" appears in the first action sentence.
2. **Acceptance criteria are numbered and declarative.** Each `Verify that:` item describes an observable state, not an action. No "verify it works."
3. **No inline secrets.** No literal passwords, API keys, or tokens in the prose. Sensitive values use `{{credentials.<name>}}` with no spaces.
4. **One flow only.** The plan covers a single user journey. "Test login and then test signup" → split into two plans.
5. **Mode + agent type declared** in the summary line beneath the fenced block.
6. **No brittle fixtures.** Where data is dynamic ("a product", "a recent order"), the criterion uses a pattern not a literal value. Where the user explicitly named a value, it stays.
7. **Variable spacing is correct.** `{{credentials.x}}` has no spaces; `{{ input.x }}` has spaces. Re-scan if the plan uses either.
8. **Credentials footer present** if any `{{credentials.x}}` appears.
9. **No `Pre-condition:` line in the prompt body.** Setup state (logged-in user, fixture data) belongs in the plan's pre-step config in the dashboard, not in the prose. If a draft has a `Pre-condition:` line, drop it.
10. **Acceptance criteria match real source where source was readable.** If you read the form/route code in step 1, every assertable text or shape comes from there, not from a guess. Quoting the wrong success-state copy is the most common drift cause.
11. **Output is a single 3-backtick fenced code block + a Mode/Agent/Credentials prose line, no nested fences.** Wrapping the output in a 4-backtick (or any outer) fence leaks stray ``` lines into the rendered output. One fence around the plan, then prose.

## Anti-patterns (refuse or fix)

These are the most common ways a draft goes wrong. Name the failure to the user when you correct it — they learn from watching you self-correct.

| Anti-pattern | Why it's wrong | Fix |
|---|---|---|
| `Test the login` | The agent has no flow to follow and no criteria to check. Reports come back vague. | Expand into actions + a numbered `Verify that:` block. |
| `Email: alice@example.com / Password: hunter2` inlined | Secrets in prose leak into reports and version control. | Replace with `{{credentials.x}}` and add an "Assumes credentials" footer. |
| `Test login, then create a project, then invite a user` | Multiple flows in one plan blur pass/fail; one failed step poisons the rest. | Split into separate plans. If they share state, chain them as a Pipeline (see `examples/pipelines.md`). |
| `Verify the product 'Blue Widget' shows up` | The agent now requires that exact product to exist; the test breaks the day it sells out. | `Verify that a product card with name, price, and image is shown.` |
| `{{ credentials.x }}` (with spaces) | Dashboard validation rejects this; the test will fail to parse. | `{{credentials.x}}` — no spaces inside the braces. |
| `Click the button and check it works` | The agent doesn't know what "works" means. | Split into the click action and a separate `Verify that:` item describing the resulting visible state. |
| Plan starts with re-doing the login the pre-step already did | The pre-step already authenticated the browser; re-logging in is wasted steps and may break shared state. | If a pre-step exists, the main plan starts after it. See `examples/pipelines.md`. |

## Vocabulary

| UI label | API / DB string |
|---|---|
| Quick mode | `quickTest` |
| Deep mode | `deepTest` |
| Functional | `functional` |
| Accessibility | `accessibility` |

When the user is pasting into the dashboard, use UI labels in your summary. When the user is calling the API or writing a CI script, use the string form. If you don't know which surface, default to UI labels and note the API equivalent in parentheses.

## Creating it with the CLI

The `@test-lab-ai/cli` (command `testlab`) creates everything you've designed — credentials, labels, data fixtures, and the plan(s) — directly in the user's test-lab account, so they don't copy-paste. Offer this whenever it's set up.

**1. Check it's available and authenticated.** Run `testlab whoami` (or, with no install, `npx @test-lab-ai/cli whoami`). If it says "not authenticated," the user runs `testlab login` once or sets `TESTLAB_API_KEY` — do NOT create anything until auth works. If the `testlab` command isn't found, fall back to `npx @test-lab-ai/cli …`.

**2. Survey what already exists, and reuse it.** Before creating anything, inventory the account so you don't duplicate resources or ask for things that already exist:
- `testlab projects list` (projects)
- `testlab credentials list` (credential keys; values are never shown)
- `testlab labels list` (labels)
- `testlab data list` (account-level data fixtures) and `testlab data list --project <id|name>` for each project in play - each call lists one scope only
- `testlab plans list` (existing plans)

Then design the plan to REUSE what fits:
- reference an existing credential key (e.g. `{{credentials.testPassword}}`) instead of asking for a secret that already exists;
- reuse an existing label and an existing data fixture rather than making near-duplicates;
- if the flow needs setup state (a login, a seeded record), wire an EXISTING plan as a pre-step by name (e.g. a "Login" plan for an auth-gated page) instead of writing a new one;
- choose the project: no projects means account-level; exactly one is used automatically; if there are several, **show the user the list and ask** (never silently fall back to `--project none`), and **propose a name-matching project** when one fits (e.g. "TestLab Admin" for an admin-dashboard test). An agent can't answer the CLI's interactive prompt, so resolve this now.

Create only the resources that are missing.

**3. Ask first.** `testlab import` writes to the user's account. Confirm they want you to create the resources (vs. just receiving the plan to paste).

**4. Build one import bundle** with only the NEW resources the plan needs (plus references to the existing ones found in step 2), created in order (credentials → labels → fixtures → plans). Run `testlab examples` for the exact shape of every resource. For example, write `bundle.json`:

```json
{
  "credentials": [ { "key": "password", "value": "<the user gives you this — never invent one>" } ],
  "labels": ["smoke"],
  "fixtures": [
    { "key": "newUser", "fields": [
      { "key": "email", "mode": "dynamic", "generator": "internet.email" }
    ] }
  ],
  "plans": [
    { "name": "Sign up", "prompt": "Go to https://app.example.com/signup and register with {{data.newUser.email}} / {{credentials.password}}. Confirm the welcome screen.", "labels": ["smoke"] }
  ]
}
```

**5. Preview, then create:** `testlab import bundle.json --dry-run`, then `testlab import bundle.json --project <id|name>` (use the project resolved in step 2; omit `--project` only when the account has zero or one projects).

Rules: get secret VALUES from the user (the CLI stores them encrypted, never echoed). Reference fixtures as `{{data.<fixture>.<field>}}` and credentials as `{{credentials.<key>}}` in the prompt. Wire plans together with pre-steps via a `ref` handle. The CLI ships a deep agent guide as `AGENTS.md`; `testlab examples` is the canonical, always-current reference.

## Going further

- **Write the Playwright yourself and upload it** (skip paid AI generation) instead of describing a flow — use the **test-lab-script** skill (`testlab scripts upload`). Best when the user already has a `.spec.ts` or wants exact control.
- **Create plans (and their credentials, labels, and data) directly** instead of pasting — the `@test-lab-ai/cli`. See "Creating it with the CLI" above.
- **Two ways to drive this skill** (author a test while you build a feature, or import tests you already have) — see `examples/workflows.md`.
- **Variable syntax in depth** (pre-steps, pipeline inputs, devices) — see `references/syntax.md`.
- **Triggering plans from CI** (only when the user has an API key + an existing `testPlanId`) — see `references/run-via-api.md`.
- **Auth flow templates** to adapt — `examples/auth.md`.
- **Pipeline patterns** for multi-step flows that share browser state — `examples/pipelines.md`.
- **The product's own example library** with cookbook plans for ecommerce, SaaS, social, booking, content, and general web — [test-lab.ai/docs/examples](https://test-lab.ai/docs/examples).
