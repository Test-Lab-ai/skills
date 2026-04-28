# test-lab.ai skills

Claude Code (and Cursor / Codex / OpenCode / Cline / Warp / 50+ other agents) skills for [test-lab.ai](https://test-lab.ai), the AI QA platform that runs natural-language tests against websites.

This directory is the canonical source. The contents are mirrored to [github.com/Test-Lab-ai/skills](https://github.com/Test-Lab-ai/skills) on every push to `main`, and that mirror is what the install commands below point at.

## Available skills

- **[`test-lab-plan`](./test-lab-plan/SKILL.md)** – Convert a flow description into a paste-ready test-lab.ai test plan with explicit URLs, numbered acceptance criteria, mode and agent type, and proper credential syntax. Slash command: `/test-lab-plan`.

More skills planned: result analysis, CI integration, pipeline design.

## Install

### Via the [`skills`](https://www.npmjs.com/package/skills) CLI (recommended)

Works for Claude Code, Cursor, Codex, OpenCode, Cline, Warp, and 50+ other agents:

```sh
# Install all test-lab skills to a single agent (Claude Code shown)
npx skills add Test-Lab-ai/skills -a claude-code

# Install a specific skill
npx skills add Test-Lab-ai/skills --skill test-lab-plan -a claude-code

# Install globally (available across all projects)
npx skills add Test-Lab-ai/skills --skill test-lab-plan -g -a claude-code

# Update later
npx skills update test-lab-plan
```

For Claude Code specifically, this drops the skill into `~/.claude/skills/test-lab-plan/` (with `-g`) or `<project>/.claude/skills/test-lab-plan/` (without `-g`).

### Manually (Claude Code)

Clone or copy the skill directory into your Claude Code skills folder:

```sh
# Global
git clone https://github.com/Test-Lab-ai/skills.git /tmp/test-lab-skills
cp -r /tmp/test-lab-skills/skills/test-lab-plan ~/.claude/skills/

# Or project-local
cp -r /tmp/test-lab-skills/skills/test-lab-plan <your-project>/.claude/skills/
```

## Usage

After install, invoke via the slash command:

```
/test-lab-plan
```

Or just describe what you want to test ("write a test for our checkout flow at /cart") and the skill triggers on its own.

The skill outputs a copy-pasteable plan ready for the test-lab.ai dashboard. It does **not** submit plans on your behalf — see [`test-lab-plan/references/run-via-api.md`](./test-lab-plan/references/run-via-api.md) for the API contract if you want to trigger runs from CI.

## Contributing

The canonical source lives in this directory of the [test-lab](https://github.com/AdrianNeatu/test-lab) monorepo. Edits here are auto-synced to the public mirror. PRs against the mirror should be opened against the monorepo instead.

## License

MIT. See [LICENSE](./LICENSE).
