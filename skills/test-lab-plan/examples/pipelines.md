# Pipeline patterns

Pipelines chain test plans on the same browser instance. Use them when a flow requires being already-logged-in, or when a multi-step user journey is more debuggable as separate plans than one giant one.

A pipeline is **two or more plans** in the dashboard:
- One or more **pre-steps** (regular plans with the "Use as a pre-step" checkbox enabled)
- One **main plan** that the user attaches the pre-step(s) to

The agent in each step is fresh (no memory of previous steps), but the **browser state carries forward** — cookies, localStorage, the current URL. That's how "log in once, test ten things" works.

When you produce a pipeline, output **both plans** and label which is the pre-step and which is the main plan. The user has to create them as separate entries in the dashboard.

---

## Pattern 1 — Reusable login pre-step

The most common pipeline. Build this once; attach it to every authed test.

### Pre-step: "Login (reusable)"

**Mode:** Quick · **Agent:** Functional · **Use as a pre-step:** ✅

```
Go to /login.

Enter the email {{ input.email | credentials.loginEmail }} in the email field.

Enter the password {{ input.password | credentials.loginPassword }} in the password field.

Click the "Sign in" button.

Verify that:
1. The browser navigates away from /login.
2. A user menu, avatar, or "Sign out" control is visible in the page header.
```

The `{{ input.x | credentials.y }}` form lets the same pre-step serve any caller: most tests will leave the inputs empty and fall back to the default credential, but a specific test can override with different inputs (e.g., admin vs. regular user).

### Main plan: "Dashboard loads correctly"

**Mode:** Quick · **Agent:** Functional · **Pre-step:** Login (reusable), with **Fail entire test if a pre-step fails** ✅

```
Go to /dashboard.

Verify that:
1. The dashboard page loads without an error banner.
2. The user's name or email is visible in the header.
3. The primary navigation (sidebar or top nav) is visible with the expected sections.
4. No loading spinner remains on the page after 5 seconds.
```

Note: the main plan starts with `Go to /dashboard`, **not** with a re-login. The pre-step has already authenticated the browser. Re-doing login in the main plan wastes steps and may break shared state.

---

## Pattern 2 — Multi-role testing

Test admin and regular user perspectives in sequence. Two pre-steps, each with a different credential.

### Pre-step A: "Login as admin"

**Use as a pre-step:** ✅ · **Assumes credentials:** `adminEmail`, `adminPassword`

```
Go to /login.
Enter {{ input.email | credentials.adminEmail }} and {{ input.password | credentials.adminPassword }}.
Click "Sign in" and verify the dashboard loads.
```

### Pre-step B: "Login as regular user"

Same prompt, but defaults to `userEmail` / `userPassword` instead.

### Main plan: "Permission boundaries visible"

Attach **only** the admin or only the user pre-step (depending on which role you're testing), then:

```
Go to /settings.

Verify that:
1. The "Team Management" section is visible (admin) OR not visible (user).
2. The "Billing" tab is clickable (admin) OR shows a "contact your admin" message (user).
3. The "Audit Log" link is present (admin) OR absent (user).
```

Two main plans — one per role — give you clean pass/fail per role. Don't try to put both roles in one plan.

---

## Pattern 3 — Multi-step CRUD with shared state

Each step is independently debuggable. If "delete" breaks, you re-run only that step.

### Pre-step: "Login" (the reusable one from Pattern 1)

### Step 1: "Create a project"

**Use as a pre-step:** ✅ (so step 2 can attach this as its pre-step)

```
Go to /projects/new.

Fill the form with:
- Name: "Pipeline Test Project {{ input.suffix | 'default' }}"
- URL: https://example.com

Click "Create".

Verify that:
1. The browser redirects to /projects/<id> (the new project's surface).
2. A success message confirms creation.
3. The project name appears in the page header.
```

### Step 2 (main plan): "List shows the new project, can be deleted"

**Pre-steps in order:** Login → Create a project (with `suffix: "step2"`)

```
Go to /projects.

Verify that:
1. A project card with name containing "Pipeline Test Project step2" is visible.
2. The card has visible "Edit" and "Delete" controls.

Click the "Delete" control on that project card.

Confirm the deletion in the dialog that appears.

Verify that:
3. The card disappears from the list.
4. A "Project deleted" confirmation appears (toast or banner).
5. Reloading /projects does not bring the project back.
```

The `suffix` input on step 1 lets you reference the exact name in step 2's verification, since the same data created in step 1 is what step 2 expects to see.

---

## Anti-patterns

- **Pre-step that does too much.** A single pre-step that logs in *and* seeds data *and* navigates to a section gives you one big black box if something fails. Split: one step per setup concern.
- **Main plan re-runs setup.** If the pre-step logs in, the main plan starts logged-in. Don't add `Go to /login` at the top of the main plan.
- **Hardcoded credentials in pre-step prose.** Same rule as solo plans: use `{{ input.x | credentials.y }}` so callers can override and so values aren't leaked.
- **Forgetting fail-fast.** A pre-step failure usually means later steps will fail in unhelpful ways (missing auth, missing data). Default to **Fail entire test if a pre-step fails ✅** unless the steps are genuinely independent.
- **Pre-step verifies too aggressively.** A login pre-step's verifications should confirm "I'm logged in" — not "the dashboard renders perfectly." Heavy verification belongs in the main plan, not the setup.

---

## When to recommend a pipeline

Recommend splitting into a pipeline when:
- The flow requires being logged in (separate login pre-step).
- The user describes setup that could be reused across many tests (login, seed-a-project, pick-a-tenant).
- The user describes a sequence where each step is independently meaningful (CRUD, multi-role).

Don't split into a pipeline when:
- The whole flow is a single user journey ("user lands on /pricing → clicks Buy → fills card → sees confirmation"). One plan.
- The user just wants a smoke test. One plan.

Pipelines have overhead (more dashboard config, more reports to scan). Default to a single plan; introduce pipelines when the structure earns it.
