---
description: Run test-lab.ai test plans by name, project, or label, then report results
argument-hint: [plan name, project, or label]
allowed-tools:
  - mcp__plugin_test-lab_test-lab__whoami
  - mcp__plugin_test-lab_test-lab__list_test_plans
  - mcp__plugin_test-lab_test-lab__list_projects
  - mcp__plugin_test-lab_test-lab__list_labels
  - mcp__plugin_test-lab_test-lab__run_tests
  - mcp__plugin_test-lab_test-lab__get_run
---

Run test-lab.ai tests matching: **$ARGUMENTS**

Running tests consumes credits on pay-as-you-go accounts, so resolve the target
before you trigger anything, and confirm with the user if the selector is
ambiguous or would fan out to more than a handful of plans.

1. Resolve what `$ARGUMENTS` refers to. It may be a plan name, a project name, or
   a label. Use `list_test_plans`, `list_projects`, and `list_labels` to find the
   match. Match on names, then report the ids you resolved alongside those names.
   - No arguments: ask what to run. Do not default to running everything.
   - Several plausible matches: list them and ask which one.
2. Call `run_tests` with exactly one selector - `testPlanIds`, `projectId`, or
   `label`. Do not pass more than one.
3. Report each job id and its results URL immediately, so the user has a link
   even if they stop here.
4. Poll `get_run` until the jobs finish. Space the polls out; runs take minutes,
   not seconds. Tell the user you are waiting rather than going silent.
5. Summarize: how many passed, how many failed, and for each failure the step it
   died on and the reason. Link the results URL for any failed run.

If a run fails on something that looks like a platform problem rather than a real
regression (timeout, provider error, infrastructure), say so explicitly instead
of reporting it as a product bug.
