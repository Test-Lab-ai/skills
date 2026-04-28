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

Exactly **one** of `testPlanId`, `testPlanIds`, or `projectId` is required:

| Field | Type | Description |
|---|---|---|
| `testPlanId` | number | Run a single plan |
| `testPlanIds` | number[] or comma-string | Run a batch (e.g., `[1,2,3]` or `"1,2,3"`) |
| `projectId` | number | Run every plan in the project |
| `testType` | `"quickTest"` or `"deepTest"` | Optional — overrides the plan's saved default |
| `buildId` | string (≤100 chars) | Optional — your CI commit SHA / build number for traceability |
| `cookies` | array of `{name, value, domain}` | Optional — runtime cookies; override stored ones |

## Response

**Single plan:**
```json
{ "jobId": "uuid", "status": "running", "testPlanId": 123, "testType": "quickTest" }
```

**Batch / project:**
```json
{
  "jobs": [{ "jobId": "uuid", "testPlanId": 123, "status": "running" }, ...],
  "triggered": 3,
  "failed": 0
}
```

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
| 400 | `One of testPlanId, testPlanIds, or projectId is required` | Body missing the selector |

## When pipelines / pre-steps are involved

Plans that have pre-steps configured (in the dashboard) execute pre-steps automatically before the main test. No special API parameter needed — just trigger the main plan's `testPlanId`. The response includes per-step status.

## Skill behavior

When you cite this file to the user, output:
1. The minimal `curl` for their case (single / batch / project)
2. A note about which env var to set the API key in
3. A reminder that the API takes IDs, so the plan must already exist in the dashboard
4. A pointer to webhooks if they ask "how do I know when it's done"

Do **not** generate API keys, do **not** infer `testPlanId` values, and do **not** offer to actually call the API. The skill's role ends at "here is the curl you would run."
