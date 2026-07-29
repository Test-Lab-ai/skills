---
description: Show recent test-lab.ai runs and summarize what is failing
argument-hint: [optional project or label filter]
allowed-tools:
  - mcp__plugin_test-lab_test-lab__whoami
  - mcp__plugin_test-lab_test-lab__list_runs
  - mcp__plugin_test-lab_test-lab__get_run
  - mcp__plugin_test-lab_test-lab__list_projects
  - mcp__plugin_test-lab_test-lab__list_test_plans
---

Report the current state of test-lab.ai runs. Filter: **$ARGUMENTS** (may be empty).

1. Call `whoami` first and state which account you are reporting on. A confusing
   "nothing is failing" is usually the wrong account.
2. Call `list_runs`. If `$ARGUMENTS` names a project or label, resolve it with
   `list_projects` / `list_test_plans` and scope the list to it.
3. Summarize the recent runs as a short table: plan name, status, when it ran,
   and the results URL. Always pair an id with the plan's name - a bare id is not
   useful to the reader.
4. For failures, call `get_run` and give the failing step and the reason. Group
   failures that share a root cause instead of listing them one by one.
5. Close with the one thing most worth attention: a plan that flipped from
   passing to failing, or a plan failing repeatedly.

This command is read-only. Do not trigger runs from here - that is `/testlab-run`.
