# Triggering plans from CI / via API

Read this file **only** when the user explicitly asks how to run a plan from CI, programmatically, or via API. The skill's primary job is writing plans; running them is a separate concern that requires an API key and an existing `testPlanId` the user already created in the dashboard.

If the user has not yet saved their plan in the dashboard, they cannot run it via API yet — the API takes IDs, not prose. Steer them through paste → save → grab ID → then return to this guide.

## Endpoint

```
POST https://test-lab.ai/api/v1/run
Authorization: Bearer tl_xxxxx
Content-Type: application/json
```

API keys come from **Settings → API Keys** in the dashboard. Treat them like passwords; do not commit them. In CI, supply via secret env (e.g., `TESTLAB_API_KEY`).

## Request body

Exactly **one** of `testPlanIds`, `projectId`, or `label` is required. Every selector is scoped to the API key's account — the API never resolves plans, projects, or labels owned by other accounts.

| Field | Type | Description |
|---|---|---|
| `testPlanIds` | number[] or comma-string | Run one or more plans (e.g., `[1,2,3]` or `"1,2,3"`) |
| `projectId` | number | Run every plan in the project |
| `label` | string | Run every plan tagged with this label name (matched by name within the account) |
| `testType` | `"quickTest"` or `"deepTest"` | Optional - overrides the plan's saved default |
| `buildId` | string (≤100 chars) | Optional - your CI commit SHA / build number for traceability |
| `cookies` | array of `{name, value, domain}` | Optional - runtime cookies; override stored ones |
| `preferScript` | boolean | Optional - when true, each plan runs as its saved Playwright script if one exists (deterministic, no LLM cost). Falls back to AI when no script is on file. |
| `triggerPipelinePreSteps` | boolean | Optional, default `false`. Plans configured as a pipeline pre-step (referenced by another plan as a pre-step) are silently excluded from batch runs by default — they expect input parameters or a specific browser state and produce false-failures when run solo. Set `true` to include them (e.g. you want to smoke-test the login pre-step on its own with default credentials). |

## Response

Always the same array shape regardless of selector:

```json
{
  "jobs": [{ "jobId": "uuid", "testPlanId": 123, "testPlanName": "...", "testType": "quickTest", "status": "running" }, ...],
  "triggered": 3,
  "failed": 0,
  "skipped": 0,
  "buildId": "abc123"
}
```

`status` per job is one of: `running`, `queued`, `pending`, `error`, `skipped`. A `skipped` entry carries an `error` message explaining why (e.g. "Plan is configured as a pipeline pre-step. Pass triggerPipelinePreSteps: true to include pre-step plans in batch runs."). `triggered` excludes both `error` and `skipped`.

The endpoint returns immediately after queueing — it does not wait for tests to finish. Poll the job, set up a webhook, or use the `buildId` to look up status from a CI status check later.

## CI example (GitHub Actions)

```yaml
- name: Trigger test-lab.ai smoke
  env:
    TESTLAB_API_KEY: ${{ secrets.TESTLAB_API_KEY }}
  run: |
    curl -fsSL -X POST https://test-lab.ai/api/v1/run \
      -H "Authorization: Bearer $TESTLAB_API_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"projectId\": ${{ vars.TESTLAB_PROJECT_ID }}, \"testType\": \"quickTest\", \"buildId\": \"$GITHUB_SHA\"}"
```

For per-PR runs, `projectId` runs the whole project's plans; `testPlanIds` lets you pick a subset.

## Webhooks

Configure webhooks at **Settings → Webhooks** to get notified when a job completes (instead of polling). The webhook payload includes `jobId`, `status`, `testPlanId`, `buildId`, and a link to the report. See [test-lab.ai/docs/webhooks](https://test-lab.ai/docs/webhooks) for the full event schema.

## Common errors

| Status | Body | What to check |
|---|---|---|
| 401 | `Invalid API key` | Token revoked, typo in `Authorization` header, missing `Bearer ` prefix |
| 402 | `Insufficient credits...` | Top up the org's credit balance |
| 404 | `No test plans found` | Wrong `testPlanId` / `projectId`, or the key belongs to a different org |
| 400 | `One of testPlanIds, projectId, or label is required` | Body missing the selector |

## When pipelines / pre-steps are involved

A plan with pre-steps configured in the dashboard runs as a pipeline automatically — pre-steps execute first, then the main test, all sharing browser state. No special API parameter needed; just include the master plan in `testPlanIds` (or its `projectId` / `label`).

With `preferScript: true`: if **every step** (every pre-step + the main) has a saved script for the chosen device, the whole pipeline runs as a script pipeline (state chains via Playwright `storageState`, no LLM cost). If **any step is missing a script**, the entire pipeline falls back to AI mode — mixing script + AI mid-pipeline can't share state cleanly. All-or-nothing.

The `jobs[]` entry returned carries the **main plan's** job ID. Pre-step jobs share the same `pipeline_id` + `run_group_id` and can be looked up by querying jobs with that group ID.

Don't confuse `triggerPipelinePreSteps` (above) with this: that flag controls whether plans that ARE pre-steps (used by others) get triggered when listed in a batch — independent from the auto-pipeline-execution behavior here, which fires for plans that HAVE pre-steps.

## Skill behavior

When you cite this file to the user, output:
1. The minimal `curl` for their case (testPlanIds / projectId / label)
2. A note about which env var to set the API key in
3. A reminder that the API takes IDs (or label names) and only resolves them on the API key's account; the plan / project / label must already exist there
4. If they want script-mode runs (cheaper, no LLM cost), include `"preferScript": true` in the body and explain it falls back to AI per-plan when no script is on file
5. A pointer to webhooks if they ask "how do I know when it's done"

Do **not** generate API keys, do **not** infer `testPlanIds` / `projectId` / `label` values, and do **not** offer to actually call the API. The skill's role ends at "here is the curl you would run."
