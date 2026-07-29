# test-lab.ai for AI agents

Skills and plugins for [test-lab.ai](https://test-lab.ai), the AI QA platform that
runs natural-language tests against real websites. You describe a user flow, an
agent drives a browser through it, and you get pass/fail against the acceptance
criteria you wrote.

This repo is a mirror. The canonical source is the `skills/` and `plugin/`
directories of the test-lab monorepo, synced here on every push to `main`.

## What is in here

| Skill | What it does |
| :--- | :--- |
| [`test-lab-plan`](./skills/test-lab-plan/SKILL.md) | Turns a described flow into a paste-ready test plan: explicit URLs, numbered observable acceptance criteria, mode and agent type, and `{{credentials.*}}` instead of inlined secrets. |
| [`test-lab-script`](./skills/test-lab-script/SKILL.md) | Writes a Playwright `.spec.ts` that passes test-lab's upload allow-list, for when you want exact control instead of AI generation. |
| [`testlab-setup`](./skills/testlab-setup/SKILL.md) | Connects an agent to your account and diagnoses auth failures. |

## Install

### As a plugin (Claude Code, Cowork, Codex, Cursor)

The plugin bundles the skills, and on Claude also the test-lab MCP connector plus
`/testlab-run` and `/testlab-status` commands.

```sh
# Claude Code
claude plugin marketplace add Test-Lab-ai/skills
claude plugin install test-lab@test-lab
```

On Claude you are prompted for a test-lab API key at enable time; it goes to your
OS keychain. Leave it blank if you have already run `testlab login`.

Codex and Cursor install the same package from their own marketplace manifests
(`.agents/plugins/` and `.cursor-plugin/`). Those two ship the skills only: the
MCP connector is Claude-only for now, because the key is injected through Claude's
plugin config. `testlab-setup` explains how to wire the server up by hand.

### As skills, on any agent

Works for Claude Code, Cursor, Codex, OpenCode, Cline, Warp, and 50+ others:

```sh
npx skills add Test-Lab-ai/skills -a claude-code
```

Add `--skill test-lab-plan` for one skill, `-g` to install globally, and
`npx skills update test-lab-plan` to refresh later.

### Bundled with the CLI

The skills also ship inside [`@test-lab-ai/cli`](https://www.npmjs.com/package/@test-lab-ai/cli),
version-locked to it, so installs are offline and reproducible:

```sh
npx @test-lab-ai/cli skills install
```

### Manually

```sh
git clone https://github.com/Test-Lab-ai/skills.git /tmp/test-lab-skills
cp -r /tmp/test-lab-skills/skills/test-lab-plan ~/.claude/skills/     # Claude
cp -r /tmp/test-lab-skills/skills/test-lab-plan ~/.agents/skills/     # Codex
```

## Usage

Describe what you want to test and the right skill triggers on its own:

> write a test for our checkout flow at /cart

Or invoke one directly with `/test-lab-plan`.

The skills author the work; they do not run tests on your behalf unless the MCP
connector is installed. With the plugin on Claude, `/testlab-run` triggers runs and
reports results. Without it, see
[`run-via-api.md`](./skills/test-lab-plan/references/run-via-api.md) for the API
contract to trigger runs from CI.

## Contributing

Edits here are overwritten by the sync. Open PRs against the monorepo instead.

## License

MIT. See [LICENSE](./LICENSE).
