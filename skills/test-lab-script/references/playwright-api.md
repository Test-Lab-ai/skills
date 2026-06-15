# Uploaded-script API reference

The precise allow / deny surface for an uploaded `.spec.ts`, plus what each rejection `[rule]` means and how to fix it. The validator is **default-deny**: ordinary computation is allowed, only *capabilities* are denied. When in doubt, drive the application through `sharedPage` and assert with `expect`.

## Available without declaring

These names can be used in any step body without destructuring or declaring them:

- `sharedPage` – the Playwright `Page` shared across all steps, already navigated to the plan's start URL before Step 1. Use this for a continuous flow.
- `context` – the shared `BrowserContext`.
- `expect` – Playwright assertions.
- `test` – to declare steps (and optionally `test.describe.serial(...)` to group them).
- Pure JS built-ins: `JSON`, `Math`, `Date`, `RegExp`, `Number`, `String`, `Boolean`, `Array`, `Object`, `Set`, `Map`, `WeakMap`, `WeakSet`, `Symbol`, `Promise`, `parseInt`, `parseFloat`, `isNaN`, `isFinite`, `encodeURIComponent`, `decodeURIComponent`, `encodeURI`, `decodeURI`, `console`, `Error`, `TypeError`, `RangeError`, `Intl`, `undefined`, `NaN`, `Infinity`.

## Fixtures (destructure in the step parameters)

A step may inject any of these by destructuring them from its first parameter (`async ({ ... }) => {}`), or `testInfo` as the second parameter:

`page`, `context`, `browser`, `run`, `credentials`, `pipeline`, `testInfo`, `browserName`

```ts
test("Step 1: ...", async ({ page, credentials, run }, testInfo) => { ... });
```

- `credentials.<key>` – values configured on the plan; injected at run time, never written in the file.
- `run.shortId` (and other `run` fields) – per-run values, e.g. to build a unique email or reference. Run `testlab examples` for the full shape.
- `page` (destructured) – a **fresh** page in a separate fixture context, **not** `sharedPage`. State does not carry between steps on it. Use `sharedPage` unless you deliberately want an isolated page.
- **Not** available as a fixture: `request` (the Playwright `APIRequestContext`). There is no direct HTTP client in an uploaded step; drive requests through the UI.

## Playwright surface you can use

Anything on `sharedPage` / `page` / locators / `expect` **except** the denied method names below. The common, fully-allowed set:

- Navigation: `goto`, `goBack`, `reload`, `waitForURL`, `waitForLoadState`.
- Locators: `locator`, `getByRole`, `getByText`, `getByLabel`, `getByPlaceholder`, `getByTestId`, `getByTitle`, `getByAltText`, `filter`, `nth`, `first`, `last`.
- Actions: `click`, `dblclick`, `fill`, `type`, `press`, `check`, `uncheck`, `selectOption`, `setInputFiles`, `hover`, `focus`, `scrollIntoViewIfNeeded`, `dragTo`.
- State / waits: `waitFor`, `isVisible`, `isEnabled`, `textContent`, `innerText`, `inputValue`, `getAttribute`, `count`.
- Assertions: `expect(locator).toBeVisible()/toHaveText()/toContainText()/toHaveValue()/toHaveURL()/toHaveCount()/toBeEnabled()`, etc.

## Denied capabilities

Denied by **identifier** (free-identifier rule):

`process`, `globalThis`, `global`, `Buffer`, `require`, `module`, `exports`, `__dirname`, `__filename`, `eval`, `Function`, `fetch`, `XMLHttpRequest`, `WebSocket`, `importScripts`, `Reflect`, `Proxy`, `WebAssembly`, `window`, `document`, `navigator`, `location`, `self`, `Deno`, `Bun` – and **any** name you didn't declare and that isn't listed above.

Denied by **member / method name** (denied-api rule), on any receiver:

`evaluate`, `evaluateHandle`, `evaluateAll`, `$eval`, `$$eval`, `waitForFunction`, `exposeFunction`, `exposeBinding`, `addInitScript`, `addScriptTag`, `route`, `routeFromHAR`, `unroute`, `unrouteAll`, `request`.

Denied **member access** (dangerous-member rule):

`constructor`, `__proto__`, `prototype`, `getPrototypeOf`, `setPrototypeOf`, `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`, `__lookupSetter__`.

Also: dynamic `import()` is denied, and computed member access with a non-literal key (`obj[expr]`) is denied. Static top-level `import`/`export` lines are **stripped** (the harness injects its own imports), so they're ignored rather than run – delete them to keep the file clean.

## Rejection rules → fix

When `testlab scripts upload` prints `L<line>:<col> [<rule>] <message>`, this is what each rule means:

| `[rule]` | Meaning | Fix |
|---|---|---|
| `parse-error` | The file is not valid TypeScript/Playwright. | Fix the syntax at the reported line. |
| `no-steps` | No `test(...)` step was found. | Wrap actions in `test("Step 1: ...", async ({ ... }) => { ... })`. |
| `import-in-step` | An `import`/`export` appears inside validated step/declaration code (a normal top-level import is stripped, not flagged). | Don't import; the harness injects Playwright. |
| `dynamic-import` | A dynamic `import()` call. | Remove it; uploaded steps cannot load modules. |
| `denied-api` | A method like `evaluate`/`route`/`request`. | Use locators + `expect` (drive the UI); remove network interception / in-page eval. |
| `dangerous-member` | `.constructor` / `.__proto__` / `.prototype` etc. | Access the value directly; don't walk the prototype chain. |
| `computed-member` | `x[expr]` with a non-literal key. | Use dot access, `.nth(i)`, or `.at(i)`. |
| `denied-fixture` | A step destructured a fixture that isn't allowed (e.g. `request`). | Use only `page`, `context`, `browser`, `run`, `credentials`, `pipeline`, `testInfo`, `browserName`; drive HTTP through the page. |
| `free-identifier` | A name that is neither a safe global, an allowed fixture, nor declared by you (e.g. `process`, `fetch`, a bare `credentials`). | Remove the host/browser global, or – if it's a fixture – add it to the step parameters (`async ({ credentials }) => ...`), or declare your own variable. |

## The page model, in one line

`sharedPage` persists across steps (the normal case); a destructured `page` is fresh per step. Pick `sharedPage` for a journey, `page` only for an intentionally isolated probe.
