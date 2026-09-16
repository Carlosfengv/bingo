/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/compiler/src/codegen/claudeMerge.ts
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import * as child_process from "child_process";
import * as util from "util";

var execFileAsync = (0, util.promisify)(child_process.execFile);
/**
* Thrown when merge validation exhausts retries.
* `aiMessage` is for logs / debugging — callers should map this to a
* human-facing error string for the UI (do not surface `aiMessage` to users).
*/
var MergeValidationError = class extends Error {
  constructor(attempts, aiMessage) {
    super(`mergeWithClaude validation failed after ${attempts} attempts`);
    this.name = "MergeValidationError";
    this.attempts = attempts;
    this.aiMessage = aiMessage;
  }
};
var cachedShellEnv = null;
/**
* Get the user's full shell environment.
* Packaged Electron apps launched from Finder don't inherit shell profile.
*/
async function getShellEnvRaw() {
  if (cachedShellEnv) return cachedShellEnv;
  const shell = process.env.SHELL || "/bin/zsh";
  try {
    const {
      stdout
    } = await execFileAsync(shell, ["-ilc", "env"], {
      timeout: 5e3,
      env: {
        HOME: process.env.HOME,
        USER: process.env.USER,
        SHELL: shell
      }
    });
    const env = {};
    for (const line of stdout.split("\n")) {
      const idx = line.indexOf("=");
      if (idx > 0) env[line.slice(0, idx)] = line.slice(idx + 1);
    }
    cachedShellEnv = env;
    return env;
  } catch {
    return {
      ...process.env
    };
  }
}
var DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
var DEFAULT_GROK_MODEL = "grok-4.5";
var DEFAULT_GROK_BASE_URL = "https://api.x.ai/v1";
var DEFAULT_GROK_API_TIMEOUT_MS = 6e4;
var DEFAULT_VALIDATE_MAX_ATTEMPTS = 3;
var GROK_VALIDATE_MAX_ATTEMPTS = 2;
var GROK_PLAN_MAX_ATTEMPTS = 2;
var MAX_GROK_MERGE_API_CALLS = 4;
var MAX_GROK_EDIT_PLAN_CHARS = 2e5;
var MAX_GROK_REPLACEMENT_CHARS = 2e5;
function lineRangeToOffsets(code, range) {
  const lines = code.split("\n");
  const startLine = Math.max(1, Math.min(lines.length, Math.floor(range.startLine)));
  const endLine = Math.max(startLine, Math.min(lines.length, Math.floor(range.endLine)));
  let start = 0;
  for (let line = 1; line < startLine; line += 1) start += lines[line - 1].length + 1;
  let end = start;
  for (let line = startLine; line <= endLine; line += 1) end += lines[line - 1].length + (line < lines.length ? 1 : 0);
  return {
    start,
    end
  };
}
function applyGrokStringEditPlan(originalCode, rawPlan, options = {}) {
  if (rawPlan.length > MAX_GROK_EDIT_PLAN_CHARS) throw new Error(`Grok edit plan exceeded ${MAX_GROK_EDIT_PLAN_CHARS} characters`);
  const unfenced = rawPlan.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Grok edit plan did not contain a JSON object");
  let parsed;
  try {
    parsed = JSON.parse(unfenced.slice(start, end + 1));
  } catch (error) {
    throw new Error(`Grok edit plan was invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!Array.isArray(parsed.edits)) throw new Error("Grok edit plan must contain an edits array");
  let code = originalCode;
  let allowedOffsets = options.allowedLineRange ? lineRangeToOffsets(originalCode, options.allowedLineRange) : void 0;
  let replacementChars = 0;
  for (const [index, edit] of parsed.edits.entries()) {
    if (typeof edit?.old_string !== "string" || typeof edit?.new_string !== "string") throw new Error(`Grok edit ${index + 1} must contain string old_string and new_string values`);
    if (!edit.old_string) throw new Error(`Grok edit ${index + 1} has an empty old_string`);
    if (edit.old_string === edit.new_string) continue;
    const matchOffsets = [];
    let searchFrom = 0;
    while (true) {
      const match = code.indexOf(edit.old_string, searchFrom);
      if (match < 0) break;
      matchOffsets.push(match);
      searchFrom = match + edit.old_string.length;
    }
    const occurrences = matchOffsets.length;
    if (occurrences === 0) throw new Error(`Grok edit ${index + 1} old_string was not found`);
    if (!edit.replace_all && occurrences !== 1) throw new Error(`Grok edit ${index + 1} old_string matched ${occurrences} places; include more context`);
    const appliedOffsets = edit.replace_all ? matchOffsets : [matchOffsets[0]];
    replacementChars += edit.new_string.length * appliedOffsets.length;
    if (replacementChars > MAX_GROK_REPLACEMENT_CHARS) throw new Error(`Grok edit plan exceeded ${MAX_GROK_REPLACEMENT_CHARS} replacement characters`);
    if (allowedOffsets) {
      if (appliedOffsets.some(offset => offset < allowedOffsets.start || offset + edit.old_string.length > allowedOffsets.end)) throw new Error(`Grok edit ${index + 1} is outside the allowed internal component range`);
    }
    code = edit.replace_all ? code.split(edit.old_string).join(edit.new_string) : code.replace(edit.old_string, edit.new_string);
    if (allowedOffsets) allowedOffsets.end += appliedOffsets.length * (edit.new_string.length - edit.old_string.length);
  }
  return code;
}
async function fetchGrokWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`Grok API timed out after ${Math.ceil(timeoutMs / 1e3)} seconds. Try again.`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
/**
* Flatten a merge session into one growing user prompt for `claude -p`.
* First user turn is the base; later assistant/user turns are appended.
*/
function flattenMergeMessagesForCli(messages) {
  if (messages.length === 0) return "";
  const [first, ...rest] = messages;
  if (first.role !== "user") throw new Error("flattenMergeMessagesForCli: session must start with a user message");
  let out = first.content;
  for (const m of rest) if (m.role === "assistant") out += `\n\n--- PREVIOUS ATTEMPT (invalid) ---\n${m.content}`;else out += `\n\n--- CORRECTION ---\n${m.content}`;
  return out;
}
/**
* Shared merge loop: execute → (optional) repair → (optional) validate, continuing
* the same `messages` session on validation failure.
* Exported for unit tests.
*/
async function runMergeSession(options) {
  const {
    messages,
    execute,
    repair,
    validate,
    validationRetryPrompt
  } = options;
  const maxAttempts = validate?.maxAttempts ?? DEFAULT_VALIDATE_MAX_ATTEMPTS;
  let validateAttempts = 0;
  let lastValidateMessage;
  while (true) {
    const raw = await execute(messages);
    const repaired = repair ? await repair(raw) : raw;
    messages.push({
      role: "assistant",
      content: repaired
    });
    if (!validate) return repaired;
    validateAttempts += 1;
    const result = await validate.validator(repaired);
    if (result.ok) return repaired;
    lastValidateMessage = result.message;
    console.log(`  ⚠ Validation failed (attempt ${validateAttempts}/${maxAttempts}): ${lastValidateMessage}`);
    if (validateAttempts >= maxAttempts) {
      console.error(`mergeWithClaude validation failed after ${maxAttempts} attempts:`, lastValidateMessage);
      throw new MergeValidationError(maxAttempts, lastValidateMessage);
    }
    messages.push({
      role: "user",
      content: validationRetryPrompt ? validationRetryPrompt(lastValidateMessage) : `VALIDATION FAILED — fix these issues and output the COMPLETE corrected file:\n${lastValidateMessage}`
    });
  }
}
/**
* Resolve save-to-code AI backend from env (Doppler-friendly toggle).
*
*   SAVE_TO_CODE_MODE=cli|api     — toggle (fallback default: cli; Electron/web pass defaultMode='api')
*   SAVE_TO_CODE_PROVIDER=grok|anthropic — optional force when mode=api
*   SAVE_TO_CODE_MODEL=...        — optional model override
*   SAVE_TO_CODE_API_TIMEOUT_MS=... — optional Grok request timeout (default 60000)
*   GROK_API_KEY / ANTHROPIC_API_KEY
*/
function resolveSaveToCodeAiFromEnv(env = process.env, opts) {
  const mode = (env.SAVE_TO_CODE_MODE || opts?.defaultMode || "cli").toLowerCase() === "api" ? "api" : "cli";
  const forced = (env.SAVE_TO_CODE_PROVIDER || "").toLowerCase();
  let provider = forced === "grok" || forced === "xai" ? "grok" : forced === "anthropic" || forced === "claude" ? "anthropic" : env.GROK_API_KEY ? "grok" : "anthropic";
  const apiKey = provider === "grok" ? env.GROK_API_KEY || env.XAI_API_KEY : env.ANTHROPIC_API_KEY;
  const model = env.SAVE_TO_CODE_MODEL || (provider === "grok" ? DEFAULT_GROK_MODEL : DEFAULT_ANTHROPIC_MODEL);
  const configuredTimeoutMs = Number(env.SAVE_TO_CODE_API_TIMEOUT_MS);
  const apiTimeoutMs = Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0 ? configuredTimeoutMs : DEFAULT_GROK_API_TIMEOUT_MS;
  return {
    mode,
    provider,
    apiKey: apiKey || void 0,
    model,
    apiBaseUrl: provider === "grok" ? env.GROK_API_BASE_URL || DEFAULT_GROK_BASE_URL : void 0,
    apiTimeoutMs
  };
}
/**
* Use Claude CLI to intelligently merge generated JSX into existing file
* Preserves: logic, expressions, styling approach, imports, hooks
*/
async function mergeWithClaude(options) {
  const {
    originalCode,
    generatedJSX,
    componentImports,
    stateContext,
    userInstructions,
    internalComponentName,
    internalComponentRange,
    mode = "cli",
    provider = "anthropic",
    apiKey,
    model,
    apiBaseUrl,
    apiTimeoutMs,
    repair,
    validate
  } = options;
  if (mode === "api" && !apiKey) throw new Error(provider === "grok" ? "GROK_API_KEY is required when SAVE_TO_CODE_MODE=api and provider=grok" : "ANTHROPIC_API_KEY is required when SAVE_TO_CODE_MODE=api and provider=anthropic");
  const useGrokStringEdits = mode === "api" && provider === "grok";
  const sessionValidate = useGrokStringEdits && validate ? {
    ...validate,
    maxAttempts: Math.min(validate.maxAttempts ?? GROK_VALIDATE_MAX_ATTEMPTS, GROK_VALIDATE_MAX_ATTEMPTS)
  } : validate;
  let grokMergeApiCalls = 0;
  const execute = useGrokStringEdits ? async messages => {
    const promptTurns = messages.filter(message => message.role === "user");
    let planTurns = promptTurns;
    for (let planAttempt = 1; planAttempt <= GROK_PLAN_MAX_ATTEMPTS; planAttempt += 1) {
      if (grokMergeApiCalls >= MAX_GROK_MERGE_API_CALLS) throw new Error(`Grok could not produce a valid edit plan after ${MAX_GROK_MERGE_API_CALLS} API calls`);
      grokMergeApiCalls += 1;
      const plan = await executeGrokApi(planTurns, apiKey, model, apiBaseUrl, apiTimeoutMs, true);
      try {
        return applyGrokStringEditPlan(originalCode, plan, {
          allowedLineRange: internalComponentRange
        });
      } catch (error) {
        if (planAttempt >= GROK_PLAN_MAX_ATTEMPTS) throw error;
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`  ⚠ Grok edit plan could not be applied; requesting a corrected plan: ${message}`);
        planTurns = [...promptTurns, {
          role: "assistant",
          content: plan
        }, {
          role: "user",
          content: `EDIT PLAN COULD NOT BE APPLIED — return corrected JSON only. Re-read the ORIGINAL FILE and use exact, unique old_string text.\n${message}`
        }];
      }
    }
    throw new Error("Grok edit plan could not be applied");
  } : mode === "api" ? messages => executeMergeApi(messages, {
    provider,
    apiKey,
    model,
    apiBaseUrl,
    timeoutMs: apiTimeoutMs
  }) : executeClaude;
  const engineLabel = mode === "api" ? provider === "grok" ? "Grok API" : "Claude API" : "Claude CLI";
  let importsSection = "";
  if (componentImports && componentImports.length > 0) importsSection = `\n\nCOMPONENT IMPORTS NEEDED (required — do not invent alternate paths):
The edited snapshot uses these project components. EVERY one MUST appear as an import in your output if not already imported:
${componentImports.map(({
    component,
    importPath
  }) => `- import { ${component} } from '${importPath}'`).join("\n")}

If you emit <${componentImports[0].component} /> (or any listed name) without the matching import, the runtime will show [undefined component].
`;
  let stateContextSection = "";
  if (stateContext && Object.keys(stateContext).length > 0) stateContextSection = `\n\nIMPORTANT - SNAPSHOT RENDERING CONTEXT:
The JSX below is a RENDERED SNAPSHOT with these mock values:
${Object.entries(stateContext).map(([key, value]) => `  ${key} = ${JSON.stringify(value)}`).join("\n")}

This means:
- Any dynamic expressions ({variables}, loops, conditionals) were evaluated with the above values
- The JSX shows what the component looked like when rendered with this specific state
- DO NOT treat this as literal code to copy - treat it as a visual reference of what changed
`;
  let userInstructionsSection = "";
  if (userInstructions) userInstructionsSection = `\n\nUSER INSTRUCTIONS (from the designer):
${userInstructions}

Follow these instructions carefully when applying the changes.
`;
  const outputRequirements = useGrokStringEdits ? `OUTPUT REQUIREMENTS:
- Output one raw JSON object only: {"edits":[{"old_string":"exact source text","new_string":"replacement text","replace_all":false}]}
- Each old_string must match the ORIGINAL FILE exactly and uniquely, including whitespace
- Use the smallest edits that implement the visual change; include surrounding context when needed for uniqueness
- Edits are applied sequentially, so later old_string values may match text introduced by earlier edits
- For a broad structural change, one edit may replace the affected component or JSX block; do not split it into dozens of fragile micro-edits
- Preserve all code outside the edits
- An empty edits array is allowed only when the snapshot already matches the source
- No markdown fences, explanations, or complete-file output` : `OUTPUT REQUIREMENTS:
- Output must be valid, parseable TypeScript/TSX code
- Start with the import statements from the original file
- Include every line of the file
- No markdown code fences
- No explanations or comments about what changed
- Do not output anything except the updated source code`;
  const validationRetryPrompt = useGrokStringEdits ? message => `VALIDATION FAILED — return a corrected JSON string-edit plan applied to the ORIGINAL FILE. Do not output the complete file.\n${message}` : void 0;
  if (internalComponentName && internalComponentRange) {
    const prompt = `You are a code transformation tool. ${useGrokStringEdits ? "Output ONLY a JSON string-edit plan, nothing else." : "Output ONLY valid TypeScript code, nothing else."}

TASK: Update ONLY the internal component "${internalComponentName}" (lines ${internalComponentRange.startLine}-${internalComponentRange.endLine}) in this file.

ORIGINAL FILE:
\`\`\`tsx
${originalCode}
\`\`\`

EDITED SNAPSHOT (what the "${internalComponentName}" component should now render):
\`\`\`jsx
${generatedJSX}
\`\`\`${stateContextSection}${userInstructionsSection}${importsSection}

CRITICAL INSTRUCTIONS:
1. ONLY modify the "${internalComponentName}" component (approximately lines ${internalComponentRange.startLine}-${internalComponentRange.endLine})
2. DO NOT modify any other components in the file
3. DO NOT modify the main/exported component(s)
4. Compare the original "${internalComponentName}" vs the snapshot to find what changed
5. Apply those changes ONLY to "${internalComponentName}"
6. Keep all props, hooks, and logic within "${internalComponentName}" intact
7. If original uses Tailwind classes, convert any inline styles to Tailwind
8. ${useGrokStringEdits ? "Express the update as exact string replacements against the ORIGINAL FILE" : "Output the COMPLETE UPDATED FILE from start to end"}

${outputRequirements}
- The ONLY changes should be within the "${internalComponentName}" component
- All other components in the file must remain EXACTLY as they were
`;
    console.log(`  → Using ${engineLabel}${useGrokStringEdits ? " with targeted string edits" : ""} to update internal component: ${internalComponentName}...`);
    try {
      const result = await runMergeSession({
        messages: [{
          role: "user",
          content: prompt
        }],
        execute,
        repair,
        validate: sessionValidate,
        validationRetryPrompt
      });
      console.log(`  ✓ ${engineLabel} merge complete for ${internalComponentName}`);
      return result;
    } catch (error) {
      console.error(`  ✗ ${engineLabel} merge failed for ${internalComponentName}:`, error);
      throw error;
    }
  }
  const prompt = `You are a code transformation tool. ${useGrokStringEdits ? "Output ONLY a JSON string-edit plan, nothing else." : "Output ONLY valid TypeScript code, nothing else."}

TASK: Merge visual edits into a React component file.

ORIGINAL FILE:
\`\`\`tsx
${originalCode}
\`\`\`

EDITED SNAPSHOT (FINAL designed render — the designer's target UI, as JSX from the canvas):
\`\`\`jsx
${generatedJSX}
\`\`\`${stateContextSection}${userInstructionsSection}${importsSection}

INSTRUCTIONS:
1. Compare original vs the FINAL snapshot to find what changed (colors, text, styles, structure, nested components)
2. Apply those changes to the ORIGINAL FILE — the snapshot is the target render, not throwaway draft code
3. Keep all imports, hooks, logic, expressions, loops, conditionals intact
4. If original uses Tailwind classes, convert any inline styles to Tailwind
5. Prefer preserving component usages (e.g. <Button>) from the snapshot when they match project components
6. CRITICAL — IMPORTS: Every PascalCase JSX tag in the merged file MUST be imported or defined in this file. If COMPONENT IMPORTS NEEDED lists a component, you MUST add that exact import (do not invent paths, do not omit). Dragged-in components like CopyButton are real project components — import them.
7. ${useGrokStringEdits ? "Express the update as exact string replacements against the ORIGINAL FILE" : "Output the COMPLETE UPDATED FILE from start to end"}

${outputRequirements}`;
  console.log(`  → Using ${engineLabel}${useGrokStringEdits ? " with targeted string edits" : ""} to merge changes...`);
  try {
    const result = await runMergeSession({
      messages: [{
        role: "user",
        content: prompt
      }],
      execute,
      repair,
      validate: sessionValidate,
      validationRetryPrompt
    });
    console.log(`  ✓ ${engineLabel} merge complete`);
    return result;
  } catch (error) {
    console.error(`  ✗ ${engineLabel} merge failed:`, error);
    throw error;
  }
}
/**
* Execute Claude CLI — flattens the session into one growing user stdin prompt.
* Returns raw stdout (fence stripping happens in the caller's repair).
*/
async function executeClaude(messages) {
  const prompt = flattenMergeMessagesForCli(messages);
  const shellEnv = await getShellEnv();
  return new Promise((resolve, reject) => {
    const claude = (0, child_process.spawn)("claude", ["-p"], {
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
      env: {
        ...shellEnv,
        HOME: process.env.HOME || shellEnv.HOME
      }
    });
    let stdout = "";
    let stderr = "";
    claude.stdout.on("data", data => {
      stdout += data.toString();
    });
    claude.stderr.on("data", data => {
      stderr += data.toString();
    });
    claude.on("error", error => {
      reject(new Error(`Failed to spawn claude CLI: ${error.message}`));
    });
    claude.on("close", code => {
      if (code === 0) resolve(stdout);else reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
    });
    claude.stdin.write(prompt);
    claude.stdin.end();
  });
}
/**
* Execute merge via HTTP API (Anthropic Messages or Grok OpenAI-compatible chat).
* Multi-turn `messages` session — returns raw model text (cleaned in the caller's repair).
*/
async function executeMergeApi(messages, opts) {
  if (opts.provider === "grok") return executeGrokApi(messages, opts.apiKey, opts.model, opts.apiBaseUrl, opts.timeoutMs);
  return executeClaudeApi(messages, opts.apiKey, opts.model);
}
/**
* Execute Claude via the Anthropic SDK for an explicitly configured API connection.
* Explicit cache_control on the first user turn so validate retries hit the
* stable base-prompt prefix (SDK 0.39 has no top-level automatic caching).
*/
async function executeClaudeApi(messages, apiKey, model) {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const response = await new Anthropic({
    apiKey
  }).messages.create({
    model: model || DEFAULT_ANTHROPIC_MODEL,
    max_tokens: 16384,
    messages: messages.map((m, index) => {
      if (index === 0 && m.role === "user") return {
        role: "user",
        content: [{
          type: "text",
          text: m.content,
          cache_control: {
            type: "ephemeral"
          }
        }]
      };
      return {
        role: m.role,
        content: m.content
      };
    })
  });
  const usage = response.usage;
  console.log(`  → Anthropic cache: creation=${usage.cache_creation_input_tokens ?? 0} read=${usage.cache_read_input_tokens ?? 0} input=${usage.input_tokens ?? 0}`);
  return response.content.filter(block => block.type === "text").map(block => block.text).join("");
}
/**
* Grok via xAI OpenAI-compatible chat completions (multi-turn messages).
*/
async function executeGrokApi(messages, apiKey, model, apiBaseUrl, timeoutMs = DEFAULT_GROK_API_TIMEOUT_MS, structuredEditPlan = false) {
  const res = await fetchGrokWithTimeout(`${(apiBaseUrl || DEFAULT_GROK_BASE_URL).replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || DEFAULT_GROK_MODEL,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      max_tokens: 16384,
      temperature: 0,
      reasoning_effort: "low",
      ...(structuredEditPlan ? {
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "save_to_code_edits",
            strict: true,
            schema: {
              type: "object",
              properties: {
                edits: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      old_string: {
                        type: "string"
                      },
                      new_string: {
                        type: "string"
                      },
                      replace_all: {
                        type: "boolean"
                      }
                    },
                    required: ["old_string", "new_string", "replace_all"],
                    additionalProperties: false
                  }
                }
              },
              required: ["edits"],
              additionalProperties: false
            }
          }
        }
      } : {})
    })
  }, timeoutMs);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Grok API error ${res.status}: ${body.slice(0, 400)}`);
  }
  const text = (await res.json()).choices?.[0]?.message?.content;
  if (!text) throw new Error("Grok API returned empty content");
  return text;
}
/** Soft caps so a runaway model response can't bloat canvas state. */
var MAX_INSTANCE_PROPS_JSON_CHARS = 5e4;
var MAX_INSTANCE_PROPS_DEPTH = 8;
var MAX_INSTANCE_PROPS_KEYS = 200;
var DEFAULT_SUGGEST_TIMEOUT_MS = 15e3;
/**
* Shared post-write helper for API + Electron save-to-code.
* Call AFTER the merged file is persisted so a slow/hung props call cannot
* block the durable write. Returns updated props or undefined.
*/
async function resolveUpdatedInstanceProps(options) {
  if (!options.suggestInstanceProps) return void 0;
  if (options.originalCode === options.mergedCode) return void 0;
  const current = options.stateContext?.instanceProps;
  if (!current || typeof current !== "object" || Array.isArray(current) || Object.keys(current).length === 0) return;
  const timeoutMs = options.timeoutMs ?? DEFAULT_SUGGEST_TIMEOUT_MS;
  const suggestion = await Promise.race([suggestInstancePropsIfNeeded({
    originalCode: options.originalCode,
    mergedCode: options.mergedCode,
    instanceProps: current,
    userInstructions: options.userInstructions,
    mode: options.mode,
    provider: options.provider,
    apiKey: options.apiKey,
    model: options.model,
    apiBaseUrl: options.apiBaseUrl,
    apiTimeoutMs: options.apiTimeoutMs
  }), new Promise(resolve => {
    setTimeout(() => {
      console.warn(`  ⚠ Instance-props suggestion timed out after ${timeoutMs}ms`);
      resolve({
        update: false
      });
    }, timeoutMs);
  })]);
  return suggestion.update ? suggestion.instanceProps : void 0;
}
/**
* After a successful code merge, ask the model whether the edited canvas
* instance needs new props to actually show the change (e.g. new `option.image`
* fields). Returns `{ update: false }` when current props already suffice, or
* when the call fails — never blocks save-to-code.
*/
async function suggestInstancePropsIfNeeded(options) {
  const {
    originalCode,
    mergedCode,
    instanceProps,
    userInstructions,
    mode = "cli",
    provider = "anthropic",
    apiKey,
    model,
    apiBaseUrl,
    apiTimeoutMs
  } = options;
  if (!instanceProps || Object.keys(instanceProps).length === 0) return {
    update: false
  };
  if (mode === "api" && !apiKey) return {
    update: false
  };
  const engineLabel = mode === "api" ? provider === "grok" ? "Grok API" : "Claude API" : "Claude CLI";
  const prompt = `You decide whether a canvas component INSTANCE needs updated props after its definition was changed.

ORIGINAL COMPONENT SOURCE:
\`\`\`tsx
${originalCode}
\`\`\`

MERGED COMPONENT SOURCE (already written):
\`\`\`tsx
${mergedCode}
\`\`\`

CURRENT INSTANCE PROPS (what the canvas instance currently passes):
\`\`\`json
${JSON.stringify(instanceProps, null, 2)}
\`\`\`
${userInstructions ? `\nDESIGNER / MERGE CONTEXT:\n${userInstructions}\n` : ""}
TASK:
- If the merged source now reads prop data the current instance does not provide (new fields, richer mock data, images, labels, etc.), return updated props so the designer sees the intended UI.
- If the change is purely in the component definition (styles, structure, conditionals) and current props already suffice, do NOT update.
- Prefer enriching existing props (keep ids/values/labels) over replacing wholesale.
- For new image fields, use realistic https placeholder URLs (e.g. https://picsum.photos/seed/<id>/64/64).
- Only update THIS instance's props object — return the full props object when updating.

OUTPUT: raw JSON only, no markdown fences, no commentary. Exactly one of:
{"update":false}
{"update":true,"instanceProps":{...}}`;
  console.log(`  → Using ${engineLabel} to decide instance props update...`);
  try {
    const suggestion = parseInstancePropsSuggestion(mode === "api" ? await executeJsonApi(prompt, {
      provider,
      apiKey,
      model,
      apiBaseUrl,
      timeoutMs: apiTimeoutMs,
      maxTokens: 4096
    }) : await executeClaudeJson(prompt));
    if (suggestion.update) console.log(`  ✓ ${engineLabel}: updating instance props`);else console.log(`  ✓ ${engineLabel}: instance props unchanged`);
    return suggestion;
  } catch (error) {
    console.warn(`  ⚠ ${engineLabel} instance-props suggestion failed (continuing without):`, error);
    return {
      update: false
    };
  }
}
function isSafeInstancePropsValue(value, depth, keyCount) {
  if (value === null) return true;
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return true;
  if (t !== "object") return false;
  if (depth > MAX_INSTANCE_PROPS_DEPTH) return false;
  if (Array.isArray(value)) {
    if (value.length > MAX_INSTANCE_PROPS_KEYS) return false;
    return value.every(item => isSafeInstancePropsValue(item, depth + 1, keyCount));
  }
  const entries = Object.entries(value);
  keyCount.n += entries.length;
  if (keyCount.n > MAX_INSTANCE_PROPS_KEYS) return false;
  return entries.every(([, v]) => isSafeInstancePropsValue(v, depth + 1, keyCount));
}
/** @internal exported for tests */
function parseInstancePropsSuggestion(raw) {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return {
    update: false
  };
  text = text.slice(start, end + 1);
  if (text.length > MAX_INSTANCE_PROPS_JSON_CHARS) return {
    update: false
  };
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      update: false
    };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {
    update: false
  };
  const obj = parsed;
  if (obj.update !== true) return {
    update: false
  };
  const props = obj.instanceProps;
  if (!props || typeof props !== "object" || Array.isArray(props)) return {
    update: false
  };
  if (!isSafeInstancePropsValue(props, 0, {
    n: 0
  })) return {
    update: false
  };
  let normalized;
  try {
    const json = JSON.stringify(props);
    if (!json || json.length > MAX_INSTANCE_PROPS_JSON_CHARS) return {
      update: false
    };
    normalized = JSON.parse(json);
  } catch {
    return {
      update: false
    };
  }
  return {
    update: true,
    instanceProps: normalized
  };
}
async function executeClaudeJson(prompt) {
  const shellEnv = await getShellEnv();
  return new Promise((resolve, reject) => {
    const claude = (0, child_process.spawn)("claude", ["-p"], {
      stdio: ["pipe", "pipe", "pipe"],
      shell: true,
      env: {
        ...shellEnv,
        HOME: process.env.HOME || shellEnv.HOME
      }
    });
    let stdout = "";
    let stderr = "";
    claude.stdout.on("data", data => {
      stdout += data.toString();
    });
    claude.stderr.on("data", data => {
      stderr += data.toString();
    });
    claude.on("error", error => {
      reject(new Error(`Failed to spawn claude CLI: ${error.message}`));
    });
    claude.on("close", code => {
      if (code === 0) resolve(stdout.trim());else reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
    });
    claude.stdin.write(prompt);
    claude.stdin.end();
  });
}
async function executeJsonApi(prompt, opts) {
  if (opts.provider === "grok") {
    const base = (opts.apiBaseUrl || DEFAULT_GROK_BASE_URL).replace(/\/$/, "");
    const timeoutMs = opts.timeoutMs ?? DEFAULT_GROK_API_TIMEOUT_MS;
    const res = await fetchGrokWithTimeout(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`
      },
      body: JSON.stringify({
        model: opts.model || DEFAULT_GROK_MODEL,
        messages: [{
          role: "user",
          content: prompt
        }],
        max_tokens: opts.maxTokens ?? 4096,
        temperature: 0,
        reasoning_effort: "low"
      })
    }, timeoutMs);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Grok API error ${res.status}: ${body.slice(0, 400)}`);
    }
    const text = (await res.json()).choices?.[0]?.message?.content;
    if (!text) throw new Error("Grok API returned empty content");
    return text.trim();
  }
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  return (await new Anthropic({
    apiKey: opts.apiKey
  }).messages.create({
    model: opts.model || DEFAULT_ANTHROPIC_MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    messages: [{
      role: "user",
      content: prompt
    }]
  })).content.filter(block => block.type === "text").map(block => block.text).join("").trim();
}
/**
* Check if Claude CLI is available
*/
async function isClaudeAvailable() {
  const shellEnv = await getShellEnv();
  return new Promise(resolve => {
    const claude = (0, child_process.spawn)("which", ["claude"], {
      stdio: "pipe",
      shell: true,
      env: {
        ...shellEnv,
        HOME: process.env.HOME || shellEnv.HOME
      }
    });
    claude.on("close", code => {
      resolve(code === 0);
    });
    claude.on("error", () => {
      resolve(false);
    });
  });
}

/** Provider overrides installed by the app; see tools/assets.py. */
function withAiEnv(env) {
  const apply = globalThis.__lunaAiEnv;
  return typeof apply === 'function' ? apply(env) : env;
}

// Save-to-code's CLI call reads its env from here.
async function getShellEnv() {
  return withAiEnv(await getShellEnvRaw());
}

export { MergeValidationError, isClaudeAvailable, mergeWithClaude, resolveSaveToCodeAiFromEnv, resolveUpdatedInstanceProps };
