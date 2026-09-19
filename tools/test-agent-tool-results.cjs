/* pnpm exec electron tools/test-agent-tool-results.cjs
 * Exercises the real Electron main-process adapter and installed Claude CLI.
 * Sends synthetic test data to Claude; uses isolated project/app data.
 */
require("tsx/cjs");
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs/promises");
const syncFs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const base = syncFs.realpathSync(syncFs.mkdtempSync(path.join(os.tmpdir(), "bingo-result-live-")));
app.setPath("userData", base);
app.on("window-all-closed", () => {}); // Finish writing the report before explicit exit.
const output = path.resolve(__dirname, "../output/qa/agent-tool-results");

app.whenReady().then(async () => {
  const { runClaudeCLI, cancelAllSessions } = require("../src/main/aiChat.ts");
  const { configureProjectAccess, getProjectExtraPaths, setProjectAccessMode } = require("../src/main/projectAccess.ts");
  const { registerProjectRenderer, unregisterProjectRenderer } = require("../src/main/windowManager.ts");
  const { classifyToolResultPath } = require("../src/main/agentToolResultAccess.ts");
  const { startMcpServer, stopMcpServer, getMcpChatUrl, registerMcpChatSession, mcpEvents, resolveFolderAccess, resolveApproval } = require("../src/main/mcpServer.ts");
  const project = path.join(base, "project");
  await fs.mkdir(project);
  const marker = `RESULT_QA_${randomUUID().replaceAll("-", "")}`;
  await fs.writeFile(path.join(project, "large.txt"), Array.from({ length: 9000 }, (_, index) => `${marker} row-${index} ${"synthetic-data ".repeat(8)}`).join("\n"));
  configureProjectAccess({ userDataRoot: base, resolveProjectRoot: id => id === project ? project : null });
  const win = new BrowserWindow({ show: false });
  await win.loadURL("data:text/html,<p>Tool result integration test</p>");
  registerProjectRenderer(win, win.webContents, project, () => {});
  const report = { platform: process.platform, electron: process.versions.electron, runs: [], passed: false };
  const timer = setTimeout(() => { cancelAllSessions(); console.error("Live CLI verification timed out"); app.exit(1); }, 180000);
  const onPrompt = event => { report.runs.at(-1).folderPrompts++; resolveFolderAccess(event.requestId, false); };
  const onApproval = event => { report.runs.at(-1).toolApprovals++; resolveApproval(event.approvalId, false); };
  const onTool = event => {
    if (event.name === "local_read" && event.input?.file_path?.includes("/tool-results/")) report.runs.at(-1).resultFile = event.input.file_path;
  };
  mcpEvents.on("local_access_needed", onPrompt);
  mcpEvents.on("tool_approval_needed", onApproval);
  mcpEvents.on("tool_call", onTool);
  try {
    await startMcpServer();
    for (const [permissionMode, accessMode] of [["auto", "edit"], ["default", "edit"], ["auto", "read-only"]]) {
      setProjectAccessMode(project, accessMode);
      const chatTabId = randomUUID(), chatRunId = randomUUID(), claudeSessionId = randomUUID();
      const unregister = registerMcpChatSession(project, chatTabId, chatRunId);
      const mcpConfig = path.join(base, `mcp-${chatRunId}.json`);
      await fs.writeFile(mcpConfig, JSON.stringify({ mcpServers: { bingo: { type: "http", url: getMcpChatUrl(project, chatTabId, chatRunId) } } }));
      const run = { permissionMode, accessMode, claudeSessionId, folderPrompts: 0, toolApprovals: 0, resultFile: null, passed: false };
      report.runs.push(run);
      try {
        const result = await runClaudeCLI(
          `This is a tool integration test on synthetic data. First call mcp__bingo__local_grep with pattern="${marker}", output_mode="content", head_limit=0. This intentionally produces a large persisted result. Then use mcp__bingo__local_read with the exact persisted result file path, offset=1, limit=3. Do not search again or request folder access. Only after the read succeeds, reply RESULT_PASS and the first row number you read.`,
          mcpConfig, chatRunId, () => {}, "haiku", undefined, claudeSessionId, undefined,
          { permissionMode, workDir: project, extraDirs: [], systemPromptAppend: "Use Bingo MCP local file tools for this test. The current run can read its own persisted tool results directly." }, project, chatTabId
        );
        assert.ok(run.resultFile, "Claude must read an actual persisted result");
        assert.match(result.text, /RESULT_PASS/);
        assert.equal(run.folderPrompts, 0);
        assert.equal(run.toolApprovals, 0);
        assert.deepEqual(getProjectExtraPaths(project), []);
        run.resultBytes = (await fs.stat(run.resultFile)).size;
        await assert.rejects(classifyToolResultPath({ source: "in-app", projectId: project, chatTabId, chatRunId }, run.resultFile), { code: "AGENT_RESULT_SCOPE_MISMATCH" });
        run.passed = true;
      } finally { unregister(); }
    }
    report.passed = true;
  } catch (error) { report.error = error.message; console.error(error); }
  finally {
    clearTimeout(timer); cancelAllSessions(); stopMcpServer();
    mcpEvents.off("local_access_needed", onPrompt); mcpEvents.off("tool_approval_needed", onApproval); mcpEvents.off("tool_call", onTool);
    unregisterProjectRenderer(win.webContents.id); win.destroy(); configureProjectAccess();
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
    await fs.rm(base, { recursive: true, force: true });
    console.log(JSON.stringify(report));
    app.exit(report.passed ? 0 : 1);
  }
});
