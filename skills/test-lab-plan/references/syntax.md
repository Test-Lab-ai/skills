# Variable, pre-step, and device syntax

Read this file when a test plan needs credentials, pipeline inputs, multi-step shared state, or a non-default device. Skip it for plain plans that just describe a flow.

## Credentials

Store credentials in the dashboard at **Settings → Credentials** (key/value pairs, organization-scoped). Reference them in plans:

```
Enter the email {{credentials.loginEmail}} and the password {{credentials.loginPassword}}.
```

The AI agent never sees the actual values — they're injected directly into form fields at runtime.

### Syntax rules (validated by the dashboard)

| Pattern | Valid | Notes |
|---|---|---|
| `{{credentials.loginEmail}}` | yes | Canonical form |
| `{{credentials.user_password}}` | yes | Underscores allowed |
| `{{credentials.api2Key}}` | yes | Numbers allowed (not at start) |
| `{{credentials.2faCode}}` | no | Name cannot start with a number |
| `{{ credentials.email }}` | no | No spaces inside braces |
| `{credentials.email}` | no | Must use double braces |

Names are case-sensitive. The dashboard rejects plans that reference a credential that doesn't exist, so **always include an "Assumes credentials:" footer** in your output listing what the user needs to set up.

### Where credentials work

- **Test prompts** (the plan body) – primary use case.
- **Project/plan cookie values**: `Value: {{credentials.sessionToken}}`
- **Custom HTTP headers**: `Value: Bearer {{credentials.apiKey}}`

## Pipelines and pre-steps

A **pipeline** chains test plans on the same browser instance. Cookies, localStorage, and DOM state persist across steps. The most common pattern is a login pre-step + a feature test that runs already authenticated.

### Pre-steps

A pre-step is just a regular test plan with the **"Use as a pre-step for other test plans"** checkbox enabled. It accepts inputs declared with `{{ input.<name> }}` syntax:

```
Go to https://myapp.com/login.
Enter {{ input.email | credentials.loginEmail }} in the email field.
Enter {{ input.password | credentials.loginPassword }} in the password field.
Click Sign In and verify the dashboard loads.
```

### Input syntax (pre-steps only — **with spaces**)

| Form | Meaning |
|---|---|
| `{{ input.email }}` | Required parameter, no default |
| `{{ input.email \| 'fallback@test.com' }}` | Parameter with a literal default |
| `{{ input.email \| credentials.loginEmail }}` | Parameter defaulting to a stored credential |

### Why two syntaxes

`{{credentials.x}}` and `{{ input.x }}` are intentionally distinguishable. Credentials are static lookups (no spaces, terse). Inputs are template expressions that may include filters (spaces, more like Liquid). Don't normalize the spacing — the dashboard validators rely on the difference.

### Attaching pre-steps

In the dashboard:
1. Open the main plan, click **Add pre-step**
2. Pick the pre-step from the dropdown
3. Fill the input values (use the key icon to select credentials)
4. Toggle **"Fail entire test if a pre-step fails"** when later steps depend on earlier ones (almost always for login pre-steps)

When the user describes a flow that requires being logged in, the right-shaped output is **two plans**: a login pre-step + the main plan that starts after login. Don't put the login at the top of the main plan.

### When to use pipelines vs cookie injection

- **Cookie injection** (configured at the project or plan level) – fastest; use when you can extract session cookies from your app and don't need to test the login UI itself.
- **Pipelines** – when you're testing the login flow, when cookies are HTTP-only and hard to extract, or when setup needs multiple browser steps. Recommend pipelines if the user wants reusable, shareable building blocks.

## Devices

Plans run on Playwright device descriptors. The dashboard's default is `Desktop Chrome`. Common values:

- `Desktop Chrome`, `Desktop Firefox`, `Desktop Safari`, `Desktop Edge`
- `iPhone 15 Pro`, `iPhone SE`
- `Pixel 8`, `Pixel 5`
- `iPad Pro 11`

A single plan can be configured to run on multiple devices — the same plan executes once per device, producing one report each. Use this when a flow has known mobile/desktop differences (responsive nav, mobile-only menus, touch interactions).

## Test type strings

When pasting into the dashboard, the user picks **Quick mode** or **Deep mode** from a dropdown. When the same plan is triggered via the API or stored in the DB, the strings are:

- `quickTest` – Quick mode
- `deepTest` – Deep mode

These are the only two valid values for `testType` in the `/api/v1/run` payload and for the `default_test_type` column. There is no third option.
