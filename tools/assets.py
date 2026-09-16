#!/usr/bin/env python3
"""
Recover the non-JavaScript half of the Bingo tree.

Bundled JS is sliced back into modules by debundle.py/rebuild.mjs. The things
that never pass through the module graph -- the renderer HTML, the Next.js
shims, the compiled stylesheet, image assets -- have to be copied across
directly. Workspace manifests are reconstructed from the dependency list each
package's own files import, since package.json files are not shipped.
"""

import json
import os
import re
import shutil

APP = "/tmp/lg/app/out"
APP_MANIFEST = "/tmp/lg/app/package.json"
SYSTEM_SKILLS = os.environ.get(
    "BINGO_SYSTEM_SKILLS",
    "/Applications/Bingo.app/Contents/Resources/system-skills",
)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "tools")
CURRENT_WORKSPACE_SCOPE = "@bingo/"
LEGACY_WORKSPACE_SCOPE = "@bingo/"


def is_workspace_specifier(specifier):
    return (specifier.startswith(CURRENT_WORKSPACE_SCOPE)
            or specifier.startswith(LEGACY_WORKSPACE_SCOPE))

# Pinned from the app's own manifest; the workspace packages are not shipped.
APP_VERSION = "0.0.146"
ELECTRON = "^39.5.1"

# Peers that bundled packages require at runtime but never import directly, so
# they cannot be recovered from the import graph. pnpm reports these as missing
# peers; the shipped app obviously had them.
EXTRA_DEPS = {
    "@tiptap/pm": "3.22.5",
    # The local compiler (src/main/localCompiler.ts) runs esbuild in the main
    # process to replace the vendor's build service.
    "esbuild": "^0.25.0",
    # Pulled in by the recovered markdown/editor code but missing from the
    # inferred manifest; the renderer will not build without them.
    "prosemirror-view": "*",
    "prosemirror-model": "*",
    "prosemirror-state": "*",
    "prosemirror-keymap": "*",
    "prosemirror-commands": "*",
    "prosemirror-schema-list": "*",
    "prosemirror-dropcursor": "*",
    "prosemirror-gapcursor": "*",
    "prosemirror-inputrules": "*",
    "prosemirror-history": "*",
    "prosemirror-transform": "*",
    "prosemirror-collab": "*",
    "prosemirror-tables": "*",
    "@tiptap/starter-kit": "*",
    "@tiptap/pm": "3.22.5",
    # Spill modules (recovered/*.ts) import these; they are real dependencies of
    # the code those modules were sliced from.
    "lowlight": "3.3.0",
    "hast-util-to-text": "4.0.2",
    "unist-util-visit": "5.1.0",
    "mdast-util-gfm": "3.1.0",
    "remark-gfm": "4.0.1",
    "rehype-highlight": "7.0.2",
    # Required by the local runtime (agent/runtime additions).
    "@agentclientprotocol/sdk": "*",
    # Required by the local runtime (agent/runtime additions).
    "tinyglobby": "*",
    # Required by the local runtime (agent/runtime additions).
    "yaml": "*",
}

# Two copies of @babel/runtime (7.x and 8.x) otherwise end up installed. Both
# ship helpers with the same names, and the bundler mis-binds one for the other
# -- `_objectWithoutProperties` resolved to `_OverloadYield`, which crashes
# CodeMirror's wrapper at render time. Collapsing to one version fixes it.
PNPM_OVERRIDES = {
    "@babel/runtime": "7.28.6",
}

# These dependencies belonged to hosted authentication and desktop updates.
# Local-only builds must not regain them when manifests are reconstructed from
# the original bundle's import graph.
# Dependencies that local mode does not *use*, but that the main process still
# imports at module load -- `src/main/auth.ts` pulls @better-auth/electron and
# better-auth (via subpaths), and `src/main/index.ts` pulls electron-updater.
# Dropping them from the manifest while the imports remain makes the main
# process fail to resolve, so the set is deliberately empty. Local mode is
# enforced by behaviour (useSession returns a synthetic session), not by
# uninstalling packages.
LOCAL_ONLY_REMOVED_DEPS = set()

# Node builtins are imported by the main-process and compiler code but are not
# packages; listing them as dependencies would make the manifest uninstallable.
NODE_BUILTINS = {
    "assert", "async_hooks", "buffer", "child_process", "cluster", "console",
    "constants", "crypto", "dgram", "diagnostics_channel", "dns", "domain",
    "events", "fs", "fs/promises", "http", "http2", "https", "inspector",
    "module", "net", "os", "path", "perf_hooks", "process", "punycode",
    "querystring", "readline", "repl", "stream", "string_decoder", "sys",
    "timers", "tls", "trace_events", "tty", "url", "util", "v8", "vm",
    "wasi", "worker_threads", "zlib",
}


def copy(src, dst):
    dest = os.path.join(ROOT, dst)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    shutil.copy2(os.path.join(APP, src), dest)
    return dst


def copy_system_skills():
    """Recover built-in workflow skills shipped outside app.asar.

    These files are Electron extra resources, so debundling app.asar cannot
    discover them. They are runtime dependencies: canvas mutation is gated on
    reading ``bingo-design`` first.
    """
    if not os.path.isdir(SYSTEM_SKILLS):
        raise RuntimeError(
            "Bingo system skills not found at " + SYSTEM_SKILLS
            + "; set BINGO_SYSTEM_SKILLS to the installed resource folder"
        )

    copied = []
    for dirpath, _, filenames in os.walk(SYSTEM_SKILLS):
        for name in sorted(filenames):
            src = os.path.join(dirpath, name)
            rel = os.path.relpath(src, SYSTEM_SKILLS)
            dest_rel = os.path.join("packages", "compiler", "skills", rel)
            dest = os.path.join(ROOT, dest_rel)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.copy2(src, dest)
            copied.append(dest_rel)
    return copied


def verify_tailwind_stylesheet(rel):
    """Fail recovery early if the editor's visual layer was not extracted."""
    css = open(os.path.join(ROOT, rel), encoding="utf-8").read()
    required = (
        "tailwindcss v4",
        "@layer utilities",
        ".bg-ed-background",
        ".text-ed-foreground",
        ".border-ed-border",
    )
    missing = [marker for marker in required if marker not in css]
    if missing:
        raise RuntimeError(
            "recovered renderer stylesheet is missing Tailwind/editor markers: "
            + ", ".join(missing)
        )


def rewrite_renderer_html(rel):
    """Point the shell at source instead of the built chunk.

    The shipped index.html loads `./assets/index-<hash>.js`, which only exists
    after a build. The original source entry is `/src/main.tsx` -- the build
    rewrote it, so putting it back is reversing a build artefact, not inventing
    anything. The stylesheet link is dropped because the entry imports the
    recovered CSS directly.
    """
    dest = os.path.join(ROOT, rel)
    html = open(dest, encoding="utf-8").read()
    html = re.sub(
        r'<script type="module"[^>]*src="\./assets/index-[^"]*"></script>',
        '<script type="module" src="/entry.tsx"></script>',
        html,
    )
    html = re.sub(r'\s*<link rel="stylesheet"[^>]*href="\./assets/[^"]*">', "", html)
    # The local compiler delivers the project stylesheet as a data: URL and the
    # loader applies it with a <link>, which style-src must allow.
    html = html.replace(
        "style-src 'self' 'unsafe-inline' http://127.0.0.1:* http://localhost:* https:;",
        "style-src 'self' 'unsafe-inline' data: blob: http://127.0.0.1:* http://localhost:* https:;",
    )
    with open(dest, "w", encoding="utf-8") as fh:
        fh.write(html)


def patch_posthog_recording():
    """Stop PostHog taking the UI down in local mode.

    `App.tsx` initialises PostHog; posthog-js then fetches a recorder bundle
    from its CDN, and that script throws
    `Cannot set properties of undefined (setting \'v\')` in this environment.
    The provider sits inside the app\'s top-level ErrorBoundary, so the failure
    replaces the whole UI with "Something went wrong" -- an analytics script
    killing the editor.

    Turning its features off one at a time (disable_session_recording,
    disable_external_dependency_loading) did not stop it, so in local mode the
    client is replaced outright with a no-op that satisfies the seven methods
    the app actually calls. The cloud path keeps the real client.
    """
    path = os.path.join(ROOT, "src/renderer/src/App.tsx")
    if not os.path.exists(path) or "LOCAL_POSTHOG" in open(path, encoding="utf-8").read():
        return None
    src = open(path, encoding="utf-8").read()
    patched = src.replace(
        "var posthogClient = lf.init(",
        "// Local mode uses a no-op client; see tools/assets.py patch_posthog_recording.\n"
        "var posthogClient = IS_LOCAL ? LOCAL_POSTHOG : lf.init(",
        1,
    )
    patched = patched.replace(
        'from "@bingo/cloud";',
        'from "@bingo/cloud";',
        1,
    )
    if patched == src:
        return None
    if "import { IS_LOCAL, LOCAL_POSTHOG }" not in patched:
        lines = patched.split("\n")
        for i, line in enumerate(lines):
            if line.startswith("import ") and "@bingo/cloud" in line:
                lines[i] = line.replace(
                    "import {", "import { IS_LOCAL, LOCAL_POSTHOG,", 1
                )
                break
        patched = "\n".join(lines)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(patched)
    return "src/renderer/src/App.tsx"


def write_scaffolding():
    """Files the build generated rather than compiled from a module.

    Neither of these exists in the bundle as a region, because neither is a
    module: the entry is created by the bundler and the style import is
    injected. Both are written here so the tree can actually be built.
    """
    path = os.path.join(ROOT, "src/renderer/entry.tsx")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(
            "/*\n"
            " * Build scaffolding, not recovered source: the original build injected\n"
            " * the stylesheet and generated its own entry. Neither is visible in any\n"
            " * bundle region. See tools/assets.py.\n"
            " */\n"
            'import "./src/index.css";\n'
            'import "./src/main";\n'
        )
    return "src/renderer/entry.tsx"



# Local-only modules that the recovered barrel cannot know about: rebuild.mjs
# derives `packages/*/src/index.ts` from what the RECOVERED tree imports, so
# anything added afterwards is missing from it. These exports are appended on
# every run, the same way the cloud barrel gets its local backend export.
LOCAL_ONLY_BARREL_EXPORTS = [
    (
        "packages/compiler/src/index.ts",
        [
            ("./runtime/theme",
             "emitScopedThemeCss, normalizeThemeSelection, resolveThemeSelection, "
             "resolveThemeTokens, validateThemeManifest"),
        ],
    ),
]


LOCAL_MODE_PATCHES = [
    (
        "packages/cloud/src/hooks/useSession.ts",
        [(
            'import { getApi } from "../client";',
            'import { getApi } from "../client";\nimport { IS_LOCAL, LOCAL_SESSION } from "../local";',
        ), (
            "function useSession() {\n  const $",
            "function useSession() {\n"
            "  // Local mode: there is no account to sign in to. Returning a synthetic\n"
            "  // session here is what removes LoginSplash and OnboardingFlow from the\n"
            "  // app -- App.tsx branches on this hook alone. The condition is a\n"
            "  // build-time constant, so the hook order below is stable.\n"
            "  if (IS_LOCAL) return LOCAL_SESSION;\n  const $",
        )],
    ),
    (
        "packages/cloud/src/hooks/useProjects.ts",
        [(
            'import { getApi, getApiUrl, throwApiError } from "../client";',
            'import { getApi, getApiUrl, throwApiError } from "../client";\n'
            'import { IS_LOCAL } from "../local";\n'
            'import {\n'
            '  useLocalAcceptInvite,\n'
            '  useLocalCreateProject,\n'
            '  useLocalDeleteProject,\n'
            '  useLocalPendingInvites,\n'
            '  useLocalProjects,\n'
            '  useLocalSeedTemplate,\n'
            '  useLocalUpdateProject,\n'
            '} from "./useLocalProjects";',
        )] + [
            # The signature is spelled out in the key, so the template must not
            # add its own parentheses -- "useProjects(organizationId)() {" never
            # matched anything, which silently left that one hook unpatched.
            ("function %s {\n  const $" % signature,
             "function %s {\n  if (IS_LOCAL) return %s;\n  const $" % (signature, local))
            for signature, local in [
                ("useProjects(organizationId)", "useLocalProjects(organizationId)"),
                ("useCreateProject()", "useLocalCreateProject()"),
                ("useSeedTemplate()", "useLocalSeedTemplate()"),
                ("useDeleteProject()", "useLocalDeleteProject()"),
                ("useUpdateProject()", "useLocalUpdateProject()"),
                ("usePendingInvites()", "useLocalPendingInvites()"),
                ("useAcceptInvite()", "useLocalAcceptInvite()"),
            ]
        ],
    ),
    (
        "packages/cloud/src/hooks/useProject.ts",
        [(
            'import { getApi, getApiUrl, throwApiError } from "../client";',
            'import { getApi, getApiUrl, throwApiError } from "../client";\n'
            'import { IS_LOCAL } from "../local";\n'
            'import { useLocalProject } from "./useLocalProjects";',
        ), (
            "function useProject(projectId) {\n  const $",
            "function useProject(projectId) {\n  if (IS_LOCAL) return useLocalProject(projectId);\n  const $",
        ), (
            "function useProjectUsage(projectId, enabled) {\n  const $",
            "function useProjectUsage(projectId, enabled) {\n"
            "  // Local mode has no plan caps, so there is no usage to report.\n"
            "  const local = (0, import_compiler_runtime.c)(1);\n"
            "  if (IS_LOCAL) {\n"
            "    let t0;\n"
            "    if (local[0] === Symbol.for(\"react.memo_cache_sentinel\")) {\n"
            "      t0 = { queryKey: [\"project-usage\", projectId], queryFn: async () => null, enabled: false };\n"
            "      local[0] = t0;\n"
            "    } else t0 = local[0];\n"
            "    return useQuery(t0);\n"
            "  }\n  const $",
        )],
    ),
    (
        "packages/cloud/src/services/ProjectBuilderClient.ts",
        [(
            "var projectBuilderClient = new ProjectBuilderClient();",
            "// Local mode swaps the whole build service for an in-process one; see\n"
            "// LocalProjectBuilderClient.ts. Consumers only see the shared interface.\n"
            "var projectBuilderClient = localProjectBuilderClient ?? new ProjectBuilderClient();",
        ), (
            'import {',
            'import { localProjectBuilderClient } from "./LocalProjectBuilderClient";\nimport {',
        )],
    ),
    (
        "src/renderer/src/backends/ElectronCloudBackend.ts",
        [(
            'import { createCloudBackend } from "@bingo/cloud";',
            'import { createCloudBackend, createLocalBackend, IS_LOCAL } from "@bingo/cloud";',
        ), (
            "  const cloud = createCloudBackend(projectId, options);",
            "  // Local mode swaps only the storage half: saveFile and chat below stay\n"
            "  // on IPC, because those already run against the local Claude CLI.\n"
            "  const cloud = IS_LOCAL\n"
            "    ? createLocalBackend(projectId, options)\n"
            "    : createCloudBackend(projectId, options);",
        )],
    ),
    (
        "src/main/index.ts",
        [(
            'import { disposeTerminalsForWindow, registerTerminalIPC } from "./terminal";',
            'import { registerDebugBridge } from "./debugBridge";\n'
            'import { registerAiConfig } from "./aiConfig";\n'
            'import { registerLocalCompiler } from "./localCompiler";\n'
            'import { saveFileLocally } from "./localSaveToCode";\n'
            'import { registerLocalStore } from "./localStore";\n'
            'import { disposeTerminalsForWindow, registerTerminalIPC } from "./terminal";',
        ), (
            "  registerTerminalIPC();",
            "  registerTerminalIPC();\n"
            "  registerLocalStore();\n"
            "  registerLocalCompiler(electron.ipcMain);\n"
            "  registerDebugBridge();\n"
            "  registerAiConfig(electron.ipcMain);",
        ), (
            '      const ai = resolveSaveToCodeAiFromEnv(process.env, {',
            '      // Local mode: the same merge, but the file, component index, compile\n'
            '      // check and write all come from disk instead of the server.\n'
            '      if (__BINGO_LOCAL__) return await saveFileLocally(projectId, options);\n'
            '      const ai = resolveSaveToCodeAiFromEnv(process.env, {',
        )],
    ),
]


# The compiler package cannot import from the app's src/main (that would make the
# library depend on the application), so the provider overrides are handed over
# through an explicit global that src/main/aiConfig.ts installs at startup. Both
# patched getShellEnv functions call it defensively: absent, they behave exactly
# as before.
AI_ENV_SHIM = (
    "/** Provider overrides installed by the app; see tools/assets.py. */\n"
    "function withAiEnv(env) {\n"
    "  const apply = globalThis.__lunaAiEnv;\n"
    "  return typeof apply === 'function' ? apply(env) : env;\n"
    "}\n"
    "\n"
)

AI_ENV_PATCHES = [
    (
        "src/main/claudeBinary.ts",
        [(
            "async function getShellEnv$1() {",
            "async function getShellEnv$1Raw() {",
        ), (
            "export { claudeInvocation, findClaudeBinary, getShellEnv$1,",
            AI_ENV_SHIM
            + "// The CLI's environment is the single place provider settings are"
            " applied: every\n"
            "// chat spawn reads its env from here.\n"
            "async function getShellEnv$1() {\n"
            "  return withAiEnv(await getShellEnv$1Raw());\n"
            "}\n"
            "\n"
            "export { claudeInvocation, findClaudeBinary, getShellEnv$1,",
        )],
    ),
    (
        "packages/compiler/src/codegen/claudeMerge.ts",
        [(
            "async function getShellEnv() {",
            "async function getShellEnvRaw() {",
        ), (
            "export { MergeValidationError, isClaudeAvailable, mergeWithClaude,",
            AI_ENV_SHIM
            + "// Save-to-code's CLI call reads its env from here.\n"
            "async function getShellEnv() {\n"
            "  return withAiEnv(await getShellEnvRaw());\n"
            "}\n"
            "\n"
            "export { MergeValidationError, isClaudeAvailable, mergeWithClaude,",
        )],
    ),
    (
        "src/main/mcpServer.ts",
        [(
            "function apiFetch$1(path$39, init) {",
            "function apiFetch$1(path$39, init) {\n"
            "  // Local mode: every MCP file operation is served from the project\n"
            "  // folder instead of the vendor's API. This helper is the single place\n"
            "  // all of them go through.\n"
            "  if (__BINGO_LOCAL__) {\n"
            "    return Promise.resolve(localApiFetch(path$39, init)).then(res => {\n"
            "      if (!res) throw new Error(`[MCP] No local handler for ${path$39}`);\n"
            "      return res;\n"
            "    });\n"
            "  }",
        ), (
            '    const mcpListenPort = "https://api.bingo.com".includes("bingo.com") ? 21209 : 23563;',
            "    // Port 0 lets the OS pick; the shipped app holds 21209 and a collision\n"
            "    // there made every chat turn report \"File server unavailable\".\n"
            "    const mcpListenPort = __BINGO_LOCAL__ ? 0 : "
            '("https://api.bingo.com".includes("bingo.com") ? 21209 : 23563);',
        ), (
            'import { authClient, getApiUrl } from "./auth";',
            'import { authClient, getApiUrl } from "./auth";\n'
            'import { localApiFetch } from "./localApiFetch";',
        )],
    ),
    (
        "packages/cloud/src/components/ProjectsSidebar.tsx",
        [(
            'import { ProjectsSidebarFeedback } from "./ProjectsSidebarFeedback";',
            'import { GlobalSettingsRow } from "./GlobalSettings";\n'
            'import { ProjectsSidebarFeedback } from "./ProjectsSidebarFeedback";',
        ), (
            't3 = <SidebarFooter className="shrink-0 p-3 pt-0">{<ProjectsSidebarFeedback rowClassName={SIDEBAR_ROW_CLASS} />}</SidebarFooter>;',
            't3 = <SidebarFooter className="shrink-0 p-3 pt-0">{<GlobalSettingsRow rowClassName={SIDEBAR_ROW_CLASS} />}{<ProjectsSidebarFeedback rowClassName={SIDEBAR_ROW_CLASS} />}</SidebarFooter>;',
        )],
    ),
]


# Final local-runtime repairs that touch reconstructed files. Keeping them in
# the recovery pipeline means `tools/run.sh` cannot silently undo working MCP,
# local collaboration gating, or history behaviour.
FINALIZATION_PATCHES = [
    (
        "src/main/mcpServer.ts",
        [(
            "var mcpPort = 0;",
            "var mcpPort = 0;\n"
            "var mcpStartPromise = null;\n"
            "var mcpMaintenanceTimer = null;",
        ), (
            "async function startMcpServer() {\n  return new Promise((resolve, reject) => {",
            "async function startMcpServer() {\n"
            "  if (server$1?.listening && mcpPort > 0) return mcpPort;\n"
            "  if (mcpStartPromise) return mcpStartPromise;\n"
            "  mcpStartPromise = new Promise((resolve, reject) => {",
        ), (
            '    server$1.on("error", err => {\n'
            '      if (err.code === "EADDRINUSE") console.error(`[MCP] Port ${mcpPort} already in use — MCP server failed to start`);else console.error(`[MCP] Server error:`, err);\n'
            "      reject(err);\n"
            "    });",
            '    server$1.once("error", err => {\n'
            '      console.error(`[MCP] Server error:`, err);\n'
            "      server$1 = null;\n"
            "      mcpPort = 0;\n"
            "      mcpStartPromise = null;\n"
            "      reject(err);\n"
            "    });",
        ), (
            "    // Port 0 lets the OS pick; the shipped app holds 21209 and a collision\n"
            '    // there made every chat turn report "File server unavailable".\n'
            "    const mcpListenPort = __BINGO_LOCAL__ ? 0 : "
            '("https://api.bingo.com".includes("bingo.com") ? 21209 : 23563);\n'
            '    server$1.listen(mcpListenPort, "127.0.0.1", () => {',
            "    // Always let the OS pick a free loopback port. Fixed ports collide with an\n"
            "    // installed copy of Bingo (or another development window), which makes\n"
            "    // chat appear available but leaves every project tool disconnected.\n"
            '    server$1.listen(0, "127.0.0.1", () => {',
        ), (
            "      setInterval(() => {\n"
            "        takeExpiredClaims();\n"
            "        retryPendingRendererUnlocks();\n"
            "      }, CLAIM_LOCK_PURGE_INTERVAL_MS);",
            "      mcpMaintenanceTimer ??= setInterval(() => {\n"
            "        takeExpiredClaims();\n"
            "        retryPendingRendererUnlocks();\n"
            "      }, CLAIM_LOCK_PURGE_INTERVAL_MS);",
        ), (
            "  });\n"
            "}\n"
            "/** MCP URL for in-app AI chat — project id in path (pre-bound, no project_list/pick). */",
            "  });\n"
            "  return mcpStartPromise;\n"
            "}\n"
            "/** Wait for the dynamically allocated endpoint before exposing it to a client. */\n"
            "async function ensureMcpServerReady() {\n"
            "  const port = await startMcpServer();\n"
            '  if (!port) throw new Error("MCP server did not allocate a port");\n'
            "  return port;\n"
            "}\n"
            "/** Stop the loopback server and its maintenance timer during app shutdown/tests. */\n"
            "function stopMcpServer() {\n"
            "  if (mcpMaintenanceTimer) {\n"
            "    clearInterval(mcpMaintenanceTimer);\n"
            "    mcpMaintenanceTimer = null;\n"
            "  }\n"
            "  const current = server$1;\n"
            "  server$1 = null;\n"
            "  mcpPort = 0;\n"
            "  mcpStartPromise = null;\n"
            "  if (current?.listening) current.close();\n"
            "}\n"
            "/** MCP URL for in-app AI chat — project id in path (pre-bound, no project_list/pick). */",
        ), (
            '  if (!chatTabId) throw new Error("getMcpChatUrl requires chatTabId (?chatTab= is mandatory for in-app MCP)");',
            '  if (!chatTabId) throw new Error("getMcpChatUrl requires chatTabId (?chatTab= is mandatory for in-app MCP)");\n'
            '  if (!mcpPort) throw new Error("MCP server is not ready");',
        ), (
            "function getMcpUrl() {\n  return `http://127.0.0.1:${mcpPort}/mcp`;",
            'function getMcpUrl() {\n  if (!mcpPort) throw new Error("MCP server is not ready");\n'
            "  return `http://127.0.0.1:${mcpPort}/mcp`;",
        ), (
            "async function checkMcpHealth() {\n  try {",
            "async function checkMcpHealth() {\n  if (!mcpPort) return false;\n  try {",
        ), (
            "setSkillOverrides, startMcpServer };",
            "setSkillOverrides, startMcpServer, stopMcpServer };",
        ), (
            "enqueueCanvasDrawPreview, getMcpChatUrl,",
            "enqueueCanvasDrawPreview, ensureMcpServerReady, getMcpChatUrl,",
        )],
    ),
    (
        "src/main/aiChat.ts",
        [(
            "enqueueCanvasDrawPreview, getMcpChatUrl,",
            "enqueueCanvasDrawPreview, ensureMcpServerReady, getMcpChatUrl,",
        ), (
            "  if (options.componentIndex) setProjectComponentIndex(projectId, options.componentIndex);\n"
            "  const themeSummary = await getProjectThemeSummary(projectId);",
            "  if (options.componentIndex) setProjectComponentIndex(projectId, options.componentIndex);\n"
            "  await ensureMcpServerReady();\n"
            "  const themeSummary = await getProjectThemeSummary(projectId);",
        )],
    ),
    (
        "src/main/index.ts",
        [(
            "checkMcpHealth, getMcpUrl,",
            "checkMcpHealth, ensureMcpServerReady, getMcpUrl,",
        ), (
            "setSkillOverrides, startMcpServer } from \"./mcpServer\";",
            "setSkillOverrides, startMcpServer, stopMcpServer } from \"./mcpServer\";",
        ), (
            '  electron.ipcMain.handle("get:mcp-info", async () => ({\n'
            "    url: getMcpUrl(),\n"
            "    healthy: await checkMcpHealth()\n"
            "  }));",
            '  electron.ipcMain.handle("get:mcp-info", async () => {\n'
            "    await ensureMcpServerReady();\n"
            "    return {\n"
            "      url: getMcpUrl(),\n"
            "      healthy: await checkMcpHealth()\n"
            "    };\n"
            "  });",
        ), (
            '  startMcpServer().catch(err => console.error("[MCP] Failed to start:", err));',
            '  await startMcpServer().catch(err => console.error("[MCP] Failed to start:", err));',
        ), (
            "electron.app.on(\"before-quit\", () => {\n  cancelAllSessions();\n});",
            "electron.app.on(\"before-quit\", () => {\n  cancelAllSessions();\n  stopMcpServer();\n});",
        ), (
            "  } else createWindow();",
            "  } else {\n"
            "    // The renderer asks on every launch. Development builds have no updater,\n"
            "    // but still need a real handler so startup does not log a rejected IPC call.\n"
            '    electron.ipcMain.handle("get-pending-update", () => null);\n'
            '    electron.ipcMain.handle("install-update", () => ({\n'
            "      success: false,\n"
            '      error: "Updates are unavailable in development builds"\n'
            "    }));\n"
            "    createWindow();\n"
            "  }",
        )],
    ),
    (
        "packages/cloud/src/hooks/useComments.ts",
        [(
            'import { getApi } from "../client";',
            'import { getApi } from "../client";\nimport { IS_LOCAL } from "../local";',
        ), (
            "  const t3 = !!projectId && !!pageId;",
            "  const t3 = !IS_LOCAL && !!projectId && !!pageId;",
        ), (
            "  const t2 = !!commentId;",
            "  const t2 = !IS_LOCAL && !!commentId;",
        )],
    ),
    (
        "src/renderer/src/App.tsx",
        [(
            '    t73 = canEdit ? <Button variant="outline"',
            '    t73 = canEdit && !IS_LOCAL ? <Button variant="outline"',
        ), (
            '  const t78 = permission === "viewer" ? void 0 : commentProps;',
            "  // Collaboration is cloud-backed. In local mode omit the capability entirely\n"
            "  // so there are no controls that fail only after the user clicks them.\n"
            '  const t78 = IS_LOCAL || permission === "viewer" ? void 0 : commentProps;',
        ), (
            "onCopySelectionLink={handleCopySelectionLink}",
            "onCopySelectionLink={IS_LOCAL ? void 0 : handleCopySelectionLink}",
        ), (
            "t82 = showShare && <ShareDialog",
            "t82 = showShare && !IS_LOCAL && <ShareDialog",
        )],
    ),
    (
        "packages/editor/src/shell/hooks/useBackendActions.ts",
        [(
            "const getFileVersionContent = async (componentName_6, versionFilename_2) => {",
            "const getFileVersionContent = async (componentName_6, versionFilename_2, filePath_2) => {",
        ), (
            "backend.getFileVersionContent(componentName_6, versionFilename_2)",
            "backend.getFileVersionContent(componentName_6, versionFilename_2, filePath_2)",
        )],
    ),
    (
        "packages/editor/src/shell/components/VersionHistoryModal.tsx",
        [(
            "getFileVersionContent(componentName, selectedVersion)",
            "getFileVersionContent(componentName, selectedVersion, filePath)",
        )],
    ),
    (
        "packages/cloud/src/components/ProjectsPage.tsx",
        [(
            "      const {\n"
            "        project\n"
            "      } = await createProject.mutateAsync({\n"
            '        name: "Untitled file",\n'
            "        organizationId\n"
            "      });",
            "      const result = await createProject.mutateAsync({\n"
            '        name: "Untitled file",\n'
            "        organizationId\n"
            "      });\n"
            "      // Cancelling the local folder picker is a normal no-op.\n"
            "      const project = result?.project;\n"
            "      if (!project) return;",
        )],
    ),
]

BARREL_EXPORTS = (
    'export { createLocalBackend } from "./backends/LocalBackend";\n'
    'export { IS_LOCAL, LOCAL_POSTHOG, LOCAL_SESSION, LOCAL_USER } from "./local";\n'
)


def apply_patches(patches):
    """Apply idempotent string patches to recovered files; return what changed."""
    applied = []
    for rel, edits in patches:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        src = open(path, encoding="utf-8").read()
        out = src
        for old, new in edits:
            if new in out or old not in out:
                continue
            out = out.replace(old, new, 1)
        if out != src:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(out)
            applied.append(rel)
    return applied


def apply_local_mode_patches():
    """Re-apply every edit made to a recovered file.

    run.sh regenerates the tree from _raw, so hand edits do not survive. Each
    replacement is idempotent: a patch whose marker is already present is
    skipped, which is what makes run.sh safe to repeat.
    """
    applied = apply_patches(LOCAL_MODE_PATCHES)

    for rel, modules in LOCAL_ONLY_BARREL_EXPORTS:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        src = open(path, encoding="utf-8").read()
        lines = []
        for module, names in modules:
            marker = f'from "{module}"'
            if marker in src:
                continue
            lines.append(f'export {{ {names} }} from "{module}";')
        if lines:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(src.rstrip("\n") + "\n" + "\n".join(lines) + "\n")
            applied.append(rel)

    for rel in ("packages/cloud/src/index.ts", "packages/cloud/src/index.browser.ts"):
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        src = open(path, encoding="utf-8").read()
        if "createLocalBackend" in src:
            continue
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(src.rstrip("\n") + "\n" + BARREL_EXPORTS)
        applied.append(rel)
    return applied


def main():
    copied = []

    # Renderer shell: contains the import map that makes every R2-hosted
    # component module resolve to the editor's own React instance.
    copied.append(copy("renderer/index.html", "src/renderer/index.html"))
    rewrite_renderer_html("src/renderer/index.html")
    copied.append(write_scaffolding())
    for rel in apply_local_mode_patches():
        copied.append(rel)
    for rel in apply_patches(AI_ENV_PATCHES):
        copied.append(rel)
    for rel in apply_patches(FINALIZATION_PATCHES):
        copied.append(rel)
    if patch_posthog_recording():
        copied.append("src/renderer/src/App.tsx (posthog recorder disabled)")

    # Next.js module shims referenced by that import map.
    shim_dir = os.path.join(APP, "renderer/next-shims")
    for name in sorted(os.listdir(shim_dir)):
        copied.append(copy(f"renderer/next-shims/{name}",
                           f"src/renderer/next-shims/{name}"))

    # Compiled Tailwind sheet for the editor chrome.
    copied.append(copy("renderer/assets/index-Fj8XDAlC.css",
                       "src/renderer/src/index.css"))
    verify_tailwind_stylesheet("src/renderer/src/index.css")

    # Brand images referenced from packages/cloud/src/assets.
    copied.append(copy("renderer/assets/logoIcon-LEt8lacL.png",
                       "packages/cloud/src/assets/logoIcon.png"))
    copied.append(copy("renderer/assets/logoText-DICDFLxu.png",
                       "packages/cloud/src/assets/logoText.png"))

    # Built-in workflow skills are extra resources beside app.asar. Without
    # them list_skills is empty and every canvas mutation deadlocks behind the
    # mandatory bingo-design gate.
    copied.extend(copy_system_skills())

    # Assets that were inlined into the bundle as data URLs have already been
    # decoded to real bytes under _raw/; copy them into the tree.
    index = json.load(open(os.path.join(TOOLS, "modules.json")))
    for rel, info in (index.get("assets") or {}).items():
        if info.get("kind") != "data-url":
            continue
        src = os.path.join(ROOT, "_raw", rel)
        dest = os.path.join(ROOT, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(src, dest)
        copied.append(rel)

    # ------------------------------------------------------------------
    # workspace manifests, derived from what each package actually imports
    # ------------------------------------------------------------------
    imports = json.load(open(os.path.join(TOOLS, "imports.json")))
    app = json.load(open(APP_MANIFEST))
    available = app.get("dependencies", {})

    packages = {}
    src_deps = set()  # everything the Electron app's own src/ imports
    for path, info in imports.items():
        specs = info.get("specifiers", [])
        if path.startswith("src/"):
            # main, preload and renderer are one Electron app, whose manifest is
            # the root package.json. Renderer-only packages like posthog and
            # tiptap are transitive deps of the shipped app, so they are absent
            # from its manifest and have to be collected here.
            for spec in specs:
                base = ("/".join(spec.split("/")[:2])
                        if spec.startswith("@") else spec.split("/")[0])
                if base.startswith("node:") or base in NODE_BUILTINS:
                    continue
                if spec.startswith(".") or is_workspace_specifier(spec):
                    continue
                src_deps.add(base)
            continue
        parts = path.split("/")
        if parts[0] == "packages":
            key = f"{CURRENT_WORKSPACE_SCOPE}{parts[1]}"
            pkg_dir = f"packages/{parts[1]}"
        else:
            key, pkg_dir = "root", "."
        entry = packages.setdefault(key, {"dir": pkg_dir, "deps": set(), "files": 0})
        entry["files"] += 1
        for spec in specs:
            if spec.startswith(".") or is_workspace_specifier(spec):
                continue
            base = "/".join(spec.split("/")[:2]) if spec.startswith("@") else spec.split("/")[0]
            if base.startswith("node:") or base in NODE_BUILTINS:
                continue
            entry["deps"].add(base)

    # Recovered spill modules live outside any package, so their dependencies
    # are not covered by the per-package inference and must become root deps.
    spill_dir = os.path.join(ROOT, "recovered")
    if os.path.isdir(spill_dir):
        for name in sorted(os.listdir(spill_dir)):
            text = open(os.path.join(spill_dir, name), encoding="utf-8",
                        errors="replace").read()
            for m in re.finditer(r'from\s+"([^".][^"]*)"', text):
                spec = m.group(1)
                base = ("/".join(spec.split("/")[:2])
                        if spec.startswith("@") else spec.split("/")[0])
                if base.startswith("node:") or base in NODE_BUILTINS:
                    continue
                src_deps.add(base)

    # Exact versions come from the bundle's pnpm store paths, so workspace
    # manifests list real pins instead of guesses. The app manifest takes
    # precedence where it has an entry, since that reflects the declared range.
    versions = index.get("dependency_versions", {})

    manifests = {}
    for key, entry in packages.items():
        deps = {}
        for d in sorted(entry["deps"]):
            if d in LOCAL_ONLY_REMOVED_DEPS:
                continue
            ver = versions.get(d)
            if ver:
                deps[d] = ver
            elif d in available:
                deps[d] = available[d]
            else:
                deps[d] = "*"
        manifests[key] = {
            "name": key,
            "version": APP_VERSION,
            "private": True,
            "type": "module",
            # Point the workspace specifiers at source: these packages ship no
            # build output, and the reconstructed tree only has src/.
            "main": "./src/index.ts",
            "types": "./src/index.ts",
            # The shipped renderer bundle contains no Node-only compiler modules
            # (claudeMerge shells out to `claude`), yet the barrel re-exports
            # them for the main process. That is only possible if the packages
            # were marked side-effect free, letting the bundler drop unused
            # re-exports per entry point.
            "sideEffects": False,
            "dependencies": deps,
        }
        if key == "root":
            manifests[key]["name"] = "bingo-monorepo"

    for key, manifest in manifests.items():
        if key == "root":
            out = "package.json"
        else:
            out = os.path.join(packages[key]["dir"], "package.json")
        dest = os.path.join(ROOT, out)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "w") as fh:
            json.dump(manifest, fh, indent=2)
            fh.write("\n")

    # Root manifest is shipped intact inside the asar, so reproduce it exactly
    # and add the workspace wiring plus the build toolchain the monorepo must
    # have had (devDependencies are not shipped). No `type` field: the shipped
    # main process is CommonJS, as `out/main/index.js` shows.
    # The shipped manifest is authoritative where it has an entry; anything else
    # the app imports is a transitive dependency whose exact version comes from
    # the bundle's pnpm store paths.
    # Prefer the exact version the bundle was built against over the range the
    # manifest declares: caret ranges drift, and a drifted peer (for instance
    # @better-auth/electron 1.7 against better-auth 1.5) breaks the build.
    root_deps = {}
    for d, rng in app.get("dependencies", {}).items():
        if d in LOCAL_ONLY_REMOVED_DEPS:
            continue
        root_deps[d] = versions.get(d, rng)
    for d, rng in EXTRA_DEPS.items():
        root_deps[d] = versions.get(d, rng)
    for d in sorted(src_deps):
        if d == "electron" or d in LOCAL_ONLY_REMOVED_DEPS:
            continue  # a devDependency; it ships its own runtime
        root_deps.setdefault(d, versions.get(d, "*"))
    root_deps = dict(sorted(root_deps.items()))

    root = {
        "name": "@bingo/electron",
        "version": APP_VERSION,
        "productName": "Bingo",
        "description": app.get("description", ""),
        "main": app.get("main", "./out/main/index.js"),
        "private": True,
        "packageManager": "pnpm@9.0.0",
        "workspaces": ["packages/*"],
        "scripts": {
            "dev": "electron-vite dev",
            "build": "electron-vite build",
            "start": "electron-vite preview",
            "test": "node --import tsx --test src/main/*.test.ts packages/compiler/src/runtime/*.test.ts",
        },
        "dependencies": root_deps,
        "pnpm": {"overrides": dict(PNPM_OVERRIDES)},
        "devDependencies": {
            "@vitejs/plugin-react": "^5.0.0",
            "electron": "39.5.1",
            "electron-vite": "^4.0.0",
            "tsx": "^4.23.13",
            "vite": "^7.0.0",
        },
    }
    with open(os.path.join(ROOT, "package.json"), "w") as fh:
        json.dump(root, fh, indent=2)
        fh.write("\n")

    with open(os.path.join(ROOT, "pnpm-workspace.yaml"), "w") as fh:
        fh.write('packages:\n  - "packages/*"\n')

    print(f"copied {len(copied)} assets")
    for c in copied:
        print(f"   {c}")
    print(f"wrote {len(manifests)} manifests")
    for key, m in manifests.items():
        print(f"   {key}: {len(m['dependencies'])} deps, {packages[key]['files']} files")


if __name__ == "__main__":
    main()
