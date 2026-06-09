# Two ways to drive the test-lab-plan skill

The skill turns a described flow into a test-lab plan. There are two common
workflows. In both, the design rules are identical (explicit URL, declarative
`Verify that:` criteria, `{{credentials.<key>}}` for secrets, `{{data.<fixture>.<field>}}` for
generated data, and **one label** by default). They differ in where the input
comes from and whether you create one plan or many.

## A. Author a test while building or changing a feature

You are in the repo adding or changing behavior and want a test-lab test that
covers it.

1. Trigger the skill ("write a test-lab test for the new password-reset page").
2. The skill **reads the real source** (the new or changed component and route),
   so the criteria quote actual on-screen text and response shapes, not guesses.
3. It drafts one plan, with a single label (the feature area).
4. If the `testlab` CLI is set up, it **offers to create the plan directly** in
   your account (see SKILL.md, "Creating it with the CLI"). Otherwise it hands
   back a paste-ready plan for the dashboard.

Example. You just added `/account/reset-password`. After reading the form
component, the skill produces:

```
Go to https://app.example.com/account/reset-password.

Request a reset for {{data.user.email}}, then open the reset link and set a new password that meets the strength rules shown on the form.

Verify that:
1. A confirmation reading "Check your email" appears after requesting the reset.
2. After the new password is set, the page redirects to /login.
3. A success banner with the text "Password updated" is shown.
```
**Mode:** Quick · **Agent:** Functional · **Label:** `auth` · **Fixture:** `user.email`

With the CLI set up, the skill writes a bundle and runs `testlab import bundle.json`:

```json
{
  "fixtures": [
    { "key": "user", "fields": [ { "key": "email", "mode": "dynamic", "generator": "internet.email" } ] }
  ],
  "plans": [
    { "name": "Reset password", "prompt": "Go to https://app.example.com/account/reset-password. …", "labels": ["auth"] }
  ]
}
```

## B. Import test plans you already have

You have tests elsewhere (Playwright/Cypress specs, Cucumber `.feature` files, a
TestRail/Zephyr export, or a prose doc) and want them in test-lab.

1. Point the skill at them ("convert these Playwright specs into test-lab plans").
2. For each test, it produces a plan: explicit URL in the prompt, secrets as
   `{{credentials.<key>}}`, generated data as `{{data.<fixture>.<field>}}`, and one label.
3. It assembles a single **import bundle** (credentials + fixtures + plans) and
   runs `testlab import ./plans` (with `--dry-run` first). See the CLI's
   `AGENTS.md` and `testlab examples` for the exact shapes.

Example bundle from one converted login spec:

```json
{
  "credentials": [ { "key": "password", "value": "<the user provides this>" } ],
  "fixtures": [
    { "key": "user", "fields": [ { "key": "email", "mode": "dynamic", "generator": "internet.email" } ] }
  ],
  "plans": [
    { "name": "Login", "prompt": "Go to https://app.example.com/login and sign in with {{data.user.email}} / {{credentials.password}}. Confirm the dashboard loads.", "labels": ["smoke"] }
  ]
}
```

The difference from A: importing is usually **batch** (many tests at once, often
a directory of `*.json`), while authoring-while-building is usually **one** plan
grounded in the code you just wrote.

## The CLI and the skill, in one line

The **skill writes** plans (this skill); the **CLI imports** them
(`@test-lab-ai/cli`). Install the CLI with `npm i -g @test-lab-ai/cli`, and the
skill itself with `testlab skills install`. The canonical, always-current
reference for every resource shape is `testlab examples`.
