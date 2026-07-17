---
name: test-lab-script
description: Write and upload a Playwright .spec.ts to test-lab.ai to skip paid AI script generation. Use this skill when the user wants to hand-write a Playwright test (or already has one) and attach it to an EXISTING test-lab.ai test plan via the CLI (`testlab scripts upload`), instead of describing a flow in English for the AI to generate. Trigger on "upload a Playwright script to test-lab", "write the Playwright myself", "I already have a .spec.ts", "skip AI generation / save credits", "attach my own test script", "testlab scripts upload". For describing a flow in plain English so the platform generates the Playwright, use the test-lab-plan skill instead. Outputs a .spec.ts that passes the upload allow-list (no imports, no lifecycle hooks, Playwright + safe JS only) plus the exact upload command.
allowed-tools:
  - Read
  - Glob
  - Grep
  - WebFetch
  - Bash
  - Write
---

# test-lab.ai uploaded scripts

[test-lab.ai](https://test-lab.ai) is an AI QA platform. Normally you describe a flow in plain English and the platform's AI generates the Playwright that runs it (that is the `test-lab-plan` skill). This skill is the other path: you **write the Playwright `.spec.ts` yourself** and upload it to an existing plan, so the plan runs your exact script and skips paid generation.

Use this skill when the user says they want to write the Playwright themselves, already have a `.spec.ts`, or wants to save generation credits. If they instead want to describe a flow and let the AI build it, use **test-lab-plan**.

## The one thing to understand first

You write **only the test steps**. You do **not** write the scaffolding. When you upload, the platform throws away everything except your step bodies and your top-level shared variables, then re-wraps them in its own harness that:

- imports Playwright and sets up the browser, context, tracing, and teardown for you,
- opens a shared page named `sharedPage`, already navigated to the plan's start URL, before your first step,
- runs your steps **serially**, in order, sharing that one page and browser context,
- **captures a screenshot after every action** on `sharedPage` (each `click`, `fill`, `type`, `press`, `check`, `selectOption`, `setInputFiles`, `hover`, `goto`, and so on), so the run report shows a per-action screenshot timeline automatically.

That last point matters for how you chunk steps: **screenshot granularity is per action, not per `test()` block.** You do **not** need to split each click and fill into its own step to get a screenshot for it. Write natural steps that group a logical action + its checks; the harness still captures one screenshot per action inside them. (For safety, the capture right after typing into a `type="password"` field is skipped, so a typed secret is never the subject of a screenshot.)

So your file must **not** contain `import` lines or `beforeAll`/`afterAll` hooks. If you write them, they are ignored (the harness owns them). What you write is a sequence of `test(...)` steps that drive `sharedPage`.

This also means the script runs in a **restricted environment**: Playwright and ordinary JavaScript only. No Node APIs (`fs`, `process`, `require`), no network clients (`fetch`, the `request` fixture), no `page.evaluate`. You drive the application the way a user would: through the page. The full allow / deny list is in `references/playwright-api.md` and is summarized below.

## Workflow

Follow these in order.

### 1. Design the test as a plan prompt first (with test-lab-plan)

The plan's English **prompt is the spec; your script is one implementation of it.** Design the spec before you write a line of Playwright — that is what keeps the script honest and reviewable, and it is the fallback the platform runs if the script is ever cleared. Skipping this is how you end up with a script glued to a throwaway prompt that describes something else.

- **No plan yet?** Use the **test-lab-plan** skill to design it: one user journey, an explicit start URL, and a numbered `Verify that:` block of observable acceptance criteria. Create it (dashboard or `testlab import`), then attach your script.
- **Plan already exists?** Read its prompt — that *is* your spec. If the prompt is vague, wrong, or describes a different flow, fix it with test-lab-plan **before** writing the script. Never encode behaviour in the script that the prompt doesn't claim.

Keep the prompt a clean user-journey spec: **no setup, auth, or implementation detail in the prose** (logged-in state, injected cookies, environment config, "no login needed", framework internals: none of it belongs there). Setup lives in the plan's pre-step / project environment, not the prompt body (test-lab-plan enforces this). Your script then *implements* that spec: map the prompt's actions to `test("Step N: ...")` steps and add an `expect` for each numbered acceptance criterion. Group naturally: a step can drive several actions in a row (fill username, fill password, click sign in) and still gets a screenshot per action. Don't inflate the step list by splitting every action into its own `test()`; that's not needed for screenshots.

### 2. Confirm the plan is reachable and read the real UI

- `testlab whoami` – confirm the CLI is authenticated. If not, the user runs `testlab login` once or sets `TESTLAB_API_KEY`. If `testlab` is not found, use `npx @test-lab-ai/cli` instead.
- `testlab plans list` – find the plan id to upload to. The plan must already have a target URL (from its prompt or its project), because the script runs against that origin. Uploading a script replaces AI generation for that plan + device, so from then on the prompt's job is to be the spec you implemented and the fallback — keep the two in sync.
- **Read the real UI before asserting.** If you are in the target site's repo, read the relevant component / route so your locators and assertions match real DOM text and real success states, not guesses. If you are not in the repo, pull a snapshot with WebFetch or ask the user for the key screens. Anchor every `expect` to something real **and to a criterion in the prompt.**
- **Fixing a script the plan already runs?** Download the live one with `testlab scripts get <id> [--device] [--out <file>]` (works for uploaded *and* generated scripts) instead of guessing at it, then edit and re-upload. That is the full fetch → fix → `scripts upload` loop, no dashboard needed.

### 3. Write the steps against `sharedPage`

Use the Template below. Each step is a `test("Step N: ...", async (...) => { ... })` block that acts on `sharedPage` and asserts with `expect`. The browser already sits on the start URL when Step 1 begins, so go straight into the flow. Group a logical action + its checks per step; steps run in order and share state. A step may perform several actions in a row, and the harness captures a screenshot after each one, so you get a full per-action timeline without splitting them into separate `test()` blocks.

### 4. Plug in credentials and per-run data through fixtures

Never inline a real password, token, or email. Uploaded scripts pull dynamic values in through fixtures, and there are **two different mechanisms** - pick the right one for the value.

**A. Destructured fixtures** (`credentials`, `run`, `page`, `context`, `browser`, `pipeline`, `testInfo`, `browserName`). Add them to the step's parameters and read fields off the object. Use these for secrets (`credentials`) and per-run values (`run`):

```ts
test("Step 1: Sign in", async ({ credentials }) => {
  await sharedPage.getByLabel("Email").fill(credentials.testEmail);
  await sharedPage.getByLabel("Password").fill(credentials.testPassword);
  await sharedPage.getByRole("button", { name: "Sign in" }).click();
});
```

The real values are injected at run time and never appear in your file. Configure the credential keys on the plan first (the dashboard's Credentials screen, or `testlab credentials`). For a fresh value each run (a unique email, an order ref), use the `run` fixture (e.g. `run.shortId`); run `testlab examples` for the exact fixture shape. A bare `credentials` / `run` / `page` reference (not destructured) is rejected with a message telling you to add it to the step parameters.

**B. Server-resolved template literals** - `{{data.<fixture>.<field>}}` and `{{run.<field>}}`. These are **not** fixtures you destructure; they are string literals the server substitutes into your step code before it runs, exactly like the templating in plan prompts, cookie values, and header values. Use them for **data fixtures**: generated or unique input (a fresh email, a per-run code) defined on the account.

```ts
test("Step 1: Register the company", async () => {
  await sharedPage.getByLabel("Company name").fill("{{data.ownerCompany.name}}");
  await sharedPage.getByLabel("Code").fill("{{data.ownerCompany.code}}");
  await sharedPage.getByRole("button", { name: "Create" }).click();
});
```

`{{run.shortId}}` works as a literal too (in addition to the destructured `run` fixture); both `{{run.*}}` and `{{data.*}}` resolve server-side at run time. **Do not destructure a `data` fixture** - `async ({ data }) => ...` is rejected (`denied-fixture`: `data` is not an allowed fixture). The `{{data.*}}` literal is the only way to reach a data fixture from a script.

Because the **same** `{{data.<fixture>.<field>}}` reference works in both the plan prompt and the uploaded script, use the fixture in both (or neither). Never define a data fixture that only the plan prompt references while the script fills a different hardcoded value - that silently desyncs the spec (prompt) from the implementation (script), which Workflow step 1 forbids.

A fixture is **either account-level or scoped to a single project**: `testlab data create -f fixture.json --project <id|name>` scopes it, while `--project none` (or omitting the flag) keeps it account-level, the default. An account-level fixture resolves on every run; a project-scoped one resolves only on runs of that project's plans, and wins over an account-level field of the same name. Your `{{data.*}}` literals therefore resolve against the scope of the plan's project, so when a reference comes back unresolved, check `testlab data list --project <id|name>` and not just `testlab data list` - each lists one scope only. Create fixtures with `testlab data create` or an import bundle; the CLI has no `update` or `delete` and `create` 409s on an existing key in the same scope, so edit them in the dashboard's "Manage test data" modal. A fixture shows on every run it resolves for, in the "Test data used" panel. Use the test-lab-plan skill to define the fixture and its generators.

### 5. Self-check, then upload

Run the Self-check list below. Then write the file and upload:

```bash
testlab scripts upload login.spec.ts --plan 1234
```

- `--device` is optional; omit it and the server uses the plan's first configured device. If you pass one it must match a device configured on the plan, or the upload is rejected.
- On success you see `✓ Uploaded … → plan #1234 (N steps, <device>)` and the plan now runs your script instead of AI generation.
- On rejection the CLI prints the issues to fix. Allow-list problems come as `L<line>:<col> [<rule>] <message>` lines (the `[rule]` → fix map is in `references/playwright-api.md`); a security-review or device-mismatch rejection prints a plain reason instead. Fix what each says and re-upload. Don't try to "trick" the validator; rewrite the step to drive the page.

## Template

A passing uploaded script looks like this. Note: no imports, no `beforeAll`/`afterAll`, steps drive `sharedPage`, shared state is a top-level `let`.

```ts
// Optional cross-step state (top-level let/const is allowed and carried over).
let orderRef = "";

test("Step 1: Sign in", async ({ credentials }) => {
  // sharedPage is already on the plan's start URL.
  await sharedPage.getByLabel("Email").fill(credentials.testEmail);
  await sharedPage.getByLabel("Password").fill(credentials.testPassword);
  await sharedPage.getByRole("button", { name: "Sign in" }).click();
  await expect(sharedPage.getByRole("navigation")).toContainText("Dashboard");
});

test("Step 2: Place an order", async ({ run }) => {
  orderRef = `TEST-${run.shortId}`;
  await sharedPage.getByRole("link", { name: "New order" }).click();
  await sharedPage.getByLabel("Reference").fill(orderRef);
  await sharedPage.getByRole("button", { name: "Submit" }).click();
});

test("Step 3: Confirm it was created", async () => {
  await expect(sharedPage.getByRole("heading")).toHaveText("Order created");
  await expect(sharedPage.getByText(orderRef)).toBeVisible();
});
```

You may wrap the steps in `test.describe.serial("...", () => { ... })` if you prefer; it is optional (the harness already runs them serially). Top-level `let`/`const`/`function` declarations are carried over so steps can share them.

### What you can write inside a step

- **Playwright:** `sharedPage` actions (`goto`, `click`, `fill`, `getByRole`/`getByLabel`/`getByText`/`locator`, `waitForURL`, `waitForLoadState`, …) and `expect(...)` matchers (`toBeVisible`, `toHaveText`, `toHaveURL`, …).
- **Plain JavaScript:** variables, `if`/`for`/`while`/`try`, arrow and named functions, destructuring, `async`/`await`, template literals, regex, `Promise.all([...])`.
- **Safe built-ins:** `JSON`, `Math`, `Date`, `RegExp`, `Number`, `String`, `Array`, `Object`, `Set`, `Map`, `console`, `Intl`, and similar pure helpers.
- **Fixtures**, by destructuring step parameters: `page`, `context`, `browser`, `run`, `credentials`, `pipeline`, `testInfo`, `browserName`. (`sharedPage`, `context`, and `expect` are already available without destructuring.)
- **Server-resolved template literals** inside any string: `{{data.<fixture>.<field>}}` (data-fixture values) and `{{run.<field>}}`, substituted server-side before the step runs. The `{{data.*}}` literal is the only way to use a data fixture in a script - `data` is not destructurable. See Workflow step 4.

### What you must not write (and the fix)

| Don't | Why / Fix |
|---|---|
| `import ...` / `export ...` | The harness provides imports. Delete them. |
| `test.beforeAll` / `afterAll` / `beforeEach` | The harness owns lifecycle. Put setup in Step 1 against `sharedPage`. |
| `process`, `require`, `fs`, `Buffer`, `__dirname` | Node host APIs are unavailable. Drive the app through the page. |
| `fetch`, `XMLHttpRequest`, `WebSocket`, the `request` fixture | No direct network clients. Trigger requests via UI actions and assert the visible result. |
| `page.evaluate` / `$eval` / `waitForFunction` / `addInitScript` / `page.route` | In-page code execution and network interception are unavailable. Use locators + `expect`. |
| `eval`, `Function(...)`, `globalThis`, `Reflect`, `Proxy` | Not available. Write the logic directly. |
| `window`, `document`, `navigator`, `location` | Step bodies run in Node, not the browser. Use Playwright locators (`sharedPage.getBy…`). |
| `el["some" + x]` (computed key) or `.constructor` / `.__proto__` | Use dot access, `.nth(i)`, or `.at(i)`; don't touch prototype/constructor. |
| `async ({ data }) => data.foo.bar` | `data` is not a destructurable fixture (rejected: `denied-fixture`). Use the `{{data.foo.bar}}` string literal inside the step instead; it is resolved server-side. |
| Downloading a file to disk via Node | Not available in an uploaded step. Assert the download was offered (e.g. a `download` event or the link/state) through the page. |

The complete lists and the per-rule fixes are in `references/playwright-api.md`.

## Self-check (apply before upload)

1. **No `import`/`export` lines** anywhere in the file.
2. **No `beforeAll`/`afterAll`/`beforeEach`.** Setup lives in Step 1 against `sharedPage`.
3. **At least one `test("...", async (...) => { ... })` step**, each a logical action-group + its checks. Grouping several actions in one step is fine; the harness screenshots each action, so you never need one `test()` per click.
4. **Steps drive `sharedPage`** for continuity (a destructured `page` is a fresh, un-navigated page – only use it for a deliberately isolated check).
5. **Every assertion is real.** `expect` targets DOM text / state that actually exists (read the source where you could).
6. **No inlined secrets.** Passwords / tokens / real emails come from `{ credentials }`; unique-per-run values from `{ run }`. Each is destructured in the step that uses it.
7. **No Node / browser / network globals** (`process`, `fs`, `fetch`, `window`, `request`, …) and **no `page.evaluate`/`route`**. If you reached for one, rewrite the step to use the page.
8. **No computed member keys or prototype access** (`x[expr]`, `.constructor`, `.__proto__`).
9. **The plan id is right** (`testlab plans list`) and the plan has a target URL.
10. **The script implements the plan's prompt.** Every prompt action maps to a `test("Step N: …")`, and every numbered acceptance criterion maps to an `expect`. The prompt itself reads as a clean user journey — no setup/auth/implementation detail leaked into the prose (that belongs in the plan's pre-step / environment). If the prompt and the script disagree, fix the prompt with test-lab-plan first.
11. **Data fixtures go through `{{data.*}}` literals and match the prompt.** A data fixture is used via the `{{data.<fixture>.<field>}}` string literal (never a `{ data }` destructure). If the plan prompt references a fixture, the script uses the same `{{data.*}}` literal - don't define a fixture the prompt uses while the script fills a different hardcoded value, or vice versa.

If any item fails, fix it before uploading – it will be rejected server-side anyway, and fixing first saves a round-trip.

## Anti-patterns (fix before upload)

| Anti-pattern | Why it's wrong | Fix |
|---|---|---|
| File starts with `import { test, expect } from "@playwright/test"` | The harness injects these and strips any imports you write (a leftover import is ignored, not run), so they're dead weight. | Delete all import lines. |
| `test.beforeAll(async () => { await page.goto(...) })` | Lifecycle is owned by the platform and discarded. | Do first-step setup inside `test("Step 1: …")` on `sharedPage`. |
| Using a destructured `page` across steps and wondering why state resets | Destructured `page` is a fresh page per step, not the shared one. | Use `sharedPage` for a continuous flow. |
| `const data = await page.evaluate(() => window.__STATE__)` | In-page execution is unavailable. | Assert on rendered DOM via locators + `expect`. |
| `await fetch("/api/orders")` to seed data | No network client in a step. | Drive the seeding through the UI, or set it up as a plan pre-step. |
| `password: "hunter2"` inlined | Secrets in scripts leak into reports and version control. | `async ({ credentials }) => …` and `credentials.password`. |
| `async ({ data }) => data.company.code` | `data` is not a destructurable fixture; upload is rejected (`denied-fixture`). | Use the `{{data.company.code}}` string literal in the step (resolved server-side). Reserve destructuring for `credentials` / `run` / etc. |
| Plan prompt uses `{{data.company.code}}` but the script fills a hardcoded `"ACME-123"` | The spec (prompt) and implementation (script) silently disagree; the same fixture should back both. | Use the same `{{data.company.code}}` literal in the script so both reference one fixture. |
| Re-implementing login in every script | Wasted steps; brittle. | If the plan has a login pre-step, start after it; otherwise keep login as Step 1 only. |

## Relationship to test-lab-plan

These **compose; they are not either/or.** test-lab-plan designs the spec (the plan's prompt); test-lab-script implements it (the Playwright). Even when you will hand-write the script, start with test-lab-plan so the spec is a clean, reviewable user journey and the script has a concrete contract to satisfy — see Workflow step 1.

- **test-lab-plan** – describe a flow in English; the AI generates and maintains the Playwright. Best when you want low effort, or as the spec step before you write your own script.
- **test-lab-script** (this skill) – you own the Playwright and upload it verbatim to implement that spec. Best when you need exact control, already have a script, or want to save generation credits.

An uploaded script can still be refined later with AI from the dashboard (it is tagged as uploaded vs generated). `testlab examples` is the canonical, always-current reference for fixture shapes and resource formats.
