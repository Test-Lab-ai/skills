---
name: test-lab-plan
description: Write production-ready test plans for test-lab.ai, the AI QA platform that runs natural-language tests against websites. Use this skill whenever the user wants to write a test for test-lab.ai, draft a "natural language test" / "english test" / "AI test" / "test plan", set up acceptance criteria for a user flow, describe a journey to test, or generate prompts for the test-lab.ai dashboard. Trigger on mentions of test-lab, test-lab.ai, or testlab, and on requests like "test my login", "write a QA test for [page]", "smoke test for [flow]", or any browser-test description that does not reference Playwright/Cypress/Jest by name. Outputs a copy-pasteable test plan with explicit URLs, numbered acceptance criteria, mode + agent type recommendation, and {{credentials.X}} syntax for sensitive values.
allowed-tools:
  - Read
  - Glob
  - Grep
  - WebFetch
---

# test-lab.ai test plans

[test-lab.ai](https://test-lab.ai) is an AI QA platform. A test plan is a plain-English prompt that describes a single user flow; an AI agent reads the prompt, drives a real browser, and reports pass/fail against the acceptance criteria you wrote. Your job in this skill is to turn whatever the user describes into a paste-ready plan that follows the conventions below.

You are **not** running the test. You are **writing the prompt**. Your output goes into the test-lab.ai dashboard (Test Plans → New) or into a file the user will paste from. Do not call any test-lab.ai API.

## Workflow

Follow these steps in order. Each step has a reason — when you're tempted to skip one, re-read the reason.

### 1. Gather scope

Ask (or infer from context) four things, then confirm before drafting:

- **The flow**: one sentence — "user signs up", "shopper checks out with a saved card", "admin disables a schedule"
- **The starting URL or path**: `/login`, `https://example.com/cart`, etc. The agent has to navigate somewhere to begin.
- **What success looks like**: the visible signal that the flow worked (redirect, message, element appearing). The agent needs verifiable acceptance criteria, not "verify it works."
- **Who performs it**: anonymous visitor, logged-in user, admin. This decides whether the plan needs a logged-in pre-step (see references/syntax.md).

Why first: every later step depends on this. Drafting before scope is set produces plans that need rewriting.

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

For pipeline inputs (only in pre-steps), the syntax is `{{ input.<name> }}` **with spaces** — and the fallback form `{{ input.<name> | credentials.<fallback> }}`. The two syntaxes are intentionally different; do not mix them. Full detail in `references/syntax.md`.

For dynamic values the agent shouldn't pin to a fixture, write the criterion as a pattern: "verify *a* product appears" rather than "verify 'Blue Widget' appears."

### 7. Self-check, then hand back

Before outputting the plan, run it through the Self-check section below. Fix anything the checklist catches. Then output the plan inside a fenced markdown block (so the user can copy it cleanly), followed by a one-line summary of mode + agent type + assumed credentials.

If the user's request is ambiguous about scope (step 1), ask before drafting — do not guess and produce a wrong-shaped plan.

## Template

```
[Optional one-line context, e.g. "Pre-condition: user is logged out."]

Go to <URL or path>.

<Action 1 — one or two sentences in natural prose.>

<Action 2 — including any data the user provides.>

<… more actions, in the order a real user would perform them.>

Verify that:
1. <Observable state 1.>
2. <Observable state 2.>
3. <Observable state 3.>
```

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

You produce:

````
```
Pre-condition: user is logged out.

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
````

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

## Going further

- **Variable syntax in depth** (pre-steps, pipeline inputs, devices) — see `references/syntax.md`.
- **Triggering plans from CI** (only when the user has an API key + an existing `testPlanId`) — see `references/run-via-api.md`.
- **Auth flow templates** to adapt — `examples/auth.md`.
- **Pipeline patterns** for multi-step flows that share browser state — `examples/pipelines.md`.
- **The product's own example library** with cookbook plans for ecommerce, SaaS, social, booking, content, and general web — [test-lab.ai/docs/examples](https://test-lab.ai/docs/examples).
