/**
 * Single source of truth for plugin metadata across every agent surface.
 *
 * The name, description, keywords, and URLs previously appeared in six manifest
 * files (two Claude, one Codex, two Cursor, one Codex marketplace). Editing the
 * description meant editing six files and, in practice, forgetting one - which
 * ships a plugin that describes itself differently depending on where you found
 * it.
 *
 * `node scripts/generate-plugin-manifests.mjs` regenerates them all from here.
 * The generated files ARE committed (the sync workflow copies plugin/ verbatim
 * to the public mirror and must not depend on a build step), so the generator is
 * a consistency tool, not a build stage. Run it after editing this file; CI
 * checks the tree is clean.
 */

export const PLUGIN = {
  name: "test-lab",
  displayName: "test-lab.ai",
  version: "0.1.0",

  /** Shown by Claude, which has no separate short/long split. */
  description:
    "Write, run, and debug browser QA tests on test-lab.ai. Bundles the test-lab MCP connector plus skills for authoring plain-English test plans and hand-written Playwright scripts.",

  /** Codex and Cursor take a short and a long form. */
  shortDescription: "Author browser QA tests for test-lab.ai without leaving your agent.",
  longDescription:
    "test-lab.ai runs natural-language QA tests against real websites: you describe a user flow, an agent drives a browser through it, and you get pass/fail against the acceptance criteria you wrote. These skills teach the agent to author that work properly - test plans with explicit URLs, numbered observable acceptance criteria, and credential references instead of inlined secrets; hand-written Playwright that passes the upload allow-list; and account setup and auth troubleshooting.",

  author: { name: "test-lab.ai", email: "hello@test-lab.ai", url: "https://test-lab.ai" },
  homepage: "https://test-lab.ai/docs/skills",
  repository: "https://github.com/Test-Lab-ai/skills",
  license: "MIT",
  category: "Developer Tools",
  brandColor: "#00A97F",

  websiteURL: "https://test-lab.ai",
  privacyPolicyURL: "https://test-lab.ai/privacy",
  termsOfServiceURL: "https://test-lab.ai/terms",

  keywords: [
    "test-lab",
    "testing",
    "qa",
    "e2e",
    "playwright",
    "browser-testing",
    "test-automation",
    "regression-testing",
  ],

  defaultPrompt: [
    "Write a test-lab plan for my checkout flow.",
    "Turn this Playwright spec into one I can upload to test-lab.",
    "Connect me to my test-lab account.",
  ],

  /**
   * Only Claude declares the MCP server.
   *
   * Codex/Cursor omit it for two independent reasons: OpenAI rejects a submitted
   * plugin whose MCP is not a public production URL, and `${user_config.*}` is a
   * Claude-only substitution that those surfaces would pass through as a literal
   * string - which auth resolution treats as a real (invalid) key rather than
   * falling back to the stored profile.
   */
  claudeMcpConfigPath: "./claude-mcp.json",

  /**
   * Shown in the plugin's configuration dialog.
   *
   * The warning is load-bearing: TESTLAB_API_KEY and TESTLAB_PROFILE outrank a
   * per-folder .test-lab.json in the CLI's resolution order, so filling these in
   * pins EVERY folder to one account and silently defeats multi-account setups.
   * Leaving them blank is the right default for anyone using folder bindings.
   */
  userConfig: {
    apiKeyDescription:
      "Optional. Create one at https://test-lab.ai/admin/settings/api-keys. Leave BLANK if you use `testlab login` or per-folder .test-lab.json bindings: a key set here overrides those everywhere, pinning every project to this one account. Blank is the right choice for multi-account setups.",
    profileDescription:
      "Optional. Name of a stored profile in ~/.test-lab/config.json. Leave BLANK to let each folder's .test-lab.json choose its own account; setting it here pins every folder to this profile.",
  },
}
