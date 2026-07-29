---
name: testlab-setup
description: Connect an agent to a test-lab.ai account and diagnose test-lab authentication failures. Use when the user has just installed the test-lab skills or plugin, when a test-lab command or tool reports "not authenticated" / "invalid API key" / 401, when the user asks to switch test-lab accounts or profiles, or when they ask how to log in to test-lab / testlab. Also use to confirm which account is active before creating plans or triggering runs, since acting on the wrong account is the most common cause of confusing results.
allowed-tools:
  - Bash
  - Read
---

# Connecting to test-lab.ai

Everything in test-lab needs one authenticated account. This skill gets you there,
and tells you what went wrong when it fails.

## Two ways to reach test-lab

Check which one you have before doing anything else, because the rest of this
skill branches on it.

**MCP tools.** If tools named `whoami`, `list_test_plans`, and `run_tests` are
available, the test-lab MCP server is connected. Prefer these: no install, no
shell.

**The `testlab` CLI.** Otherwise, shell out. If `testlab` is not on PATH, use
`npx @test-lab-ai/cli` in its place; every command below works the same way.

Both read the same credential file (`~/.test-lab/config.json`), so logging in
through either one authenticates both.

## The command / tool map

| Task | CLI | MCP tool |
| :--- | :--- | :--- |
| Who am I | `testlab whoami` | `whoami` |
| Log in | `testlab login` | `login` |
| List plans | `testlab plans list` | `list_test_plans` |
| List projects | `testlab projects list` | `list_projects` |
| List credentials | `testlab credentials list` | `list_credentials` |
| List labels | `testlab labels list` | `list_labels` |
| List fixtures | `testlab data list` | `list_data_fixtures` |
| Create a fixture | `testlab data create` | `create_data_fixture` |
| Create resources | `testlab import bundle.json` | `import_bundle` |
| Upload a script | `testlab scripts upload` | `upload_script` |
| Fetch a script | `testlab scripts get <id>` | `get_script` |
| Resource reference | `testlab examples` | `examples` |
| Run tests | `testlab run` | `run_tests` |

`examples` is the canonical, always-current reference for every resource shape.
Read it before creating anything, on either surface.

## Getting connected

Start with `whoami`. If it names an account, you are done - say which account, and
stop.

If it fails, pick the path that matches the user:

**No key yet.** Run `login` with no arguments. It opens a browser for device-code
approval and writes the key to `~/.test-lab/config.json`. Tell the user a browser
window will open before you run it.

**Has a key.** Put it somewhere the agent can read without anyone pasting a secret
into chat:

- Claude plugin: set it in the plugin's own config (`/plugin`, test-lab,
  configure). It goes to the OS keychain.
- Anywhere else: export `TESTLAB_API_KEY`, or pass the key to `login`.

Keys look like `tl_...` and are created at
<https://test-lab.ai/admin/settings/api-keys>. Never echo a key back, never read
one out of a config file to show the user, and do not ask for one in chat when a
config field or environment variable is available.

**Already used the CLI.** Nothing to do.

## How auth resolves

First match wins, highest first:

1. A per-call `apiKey` argument (MCP) or `--key` flag (CLI).
2. The session profile set by `switch_profile`, or `--profile`.
3. `TESTLAB_API_KEY` in the environment.
4. `TESTLAB_PROFILE` in the environment.
5. A `.test-lab.json` in the working directory or any ancestor.
6. The default profile in `~/.test-lab/config.json`.

An empty value counts as unset, so a blank config field falls through to the next
source instead of failing.

## Multiple accounts

Named profiles keep accounts apart. `list_profiles` / `testlab profiles list`
shows what is stored; `switch_profile` changes the active one for this session
only. To bind a project folder to an account permanently, write a `.test-lab.json`
in that folder rather than switching every session.

## When it still does not work

- **`whoami` works but one tool 403s.** The key is valid; the account lacks that
  resource. Confirm the plan or project belongs to this account with
  `list_projects`. Do not assume an id is right just because it exists.
- **Everything fails with a transport or spawn error.** The MCP server did not
  start. It runs through `npx`, so the machine needs Node 18+ and access to the
  npm registry. Check `node --version`.
- **It worked yesterday.** The key may have been revoked at
  `/admin/settings/api-keys`. Run `login` again.
- **Right key, wrong data.** You are almost certainly on another account. Run
  `whoami` and report the account name before digging further.
