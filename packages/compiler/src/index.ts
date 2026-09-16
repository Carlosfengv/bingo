/*
 * Reconstructed barrel: the original was tree-shaken out of the bundle,
 * since a module that only re-exports emits no code. Rebuilt from the
 * symbols the rest of the tree imports from this package. See RECOVERY.md.
 */
export { BINGO_SLASH_COMMANDS, buildCLIPrompt, buildChatSystemPrompt, buildMcpServerInstructions } from "./codegen/aiShared";
export { ancestorChainMatchesQuery, applyJsxStringEdit, formatComponentSearchLine, lintNewlyIntroducedRawHtmlControls, lintRawHtmlControls, matchElementGrep, normalizeUpdateSubtree, preserveMatchingSubtreeIds, summarizeSubtreeChange } from "./codegen/canvasAiEdit";
export { CLAUDE_EFFORT_LEVELS, getClaudeEffortLevels, resolveClaudeEffort, toClaudeEffortEnvValue } from "./codegen/claudeEffort";
export { MergeValidationError, isClaudeAvailable, mergeWithClaude, resolveSaveToCodeAiFromEnv, resolveUpdatedInstanceProps } from "./codegen/claudeMerge";
export { closeIncompleteJsx } from "./codegen/closeIncompleteJsx";
export { parseCompositionFile } from "./codegen/extractCompositionElement";
export { extractComponentDependencies, extractIconDependencies } from "./codegen/extractDependencies";
export { extractPartialCanvasDrawArgs, extractPartialFileWriteArgs, extractPartialMcpToolName, isCanvasDrawToolName, isFileWriteToolName } from "./codegen/extractPartialJson";
export { generateCompleteFile } from "./codegen/generateCompleteFile";
export { generateIconImports, generateImports, getComponentImportMappings } from "./codegen/generateImports";
export { generateJSX, generateJSXWithinBudget, hashAllElementSubtreesFrom, hashElementSubtreeFrom, jsxContainsTruncationStub } from "./codegen/generateJSX";
export { normalizeReactAttrs } from "./codegen/htmlAttrCasing";
export { buildParseContextFromImports, parseCompositionJsx, parseCompositionJsxToNestedRoots } from "./codegen/parseComposition";
export { parseJSX } from "./codegen/parseJSX";
export { parseCanvasJsx } from "./recovery/parseCanvasJsx";
export { parseJSXPartial } from "./codegen/parseJSXPartial";
export { inspectLocalCopyBuffer, normalizeProjectCopyFileArgs } from "./codegen/projectCopyFile";
export { repairComponentImports, repairStripMarkdownCodeFences, validateHasEsmExports, validateJsxComponentsResolved, validateLooksLikeSourceModule, validateNotEmpty, validateParsesAsTsx } from "./codegen/saveToCode";
export { applySourceEdit, resolveElementInSource } from "./codegen/sourceEdit";
export { ComponentCompiler, componentDisplayName } from "./runtime/ComponentCompiler";
export { buildCompositionTemplates, getCompositionPathForBase, isCompositionFile } from "./runtime/compositionFiles";
export { executeCompiledModule, executeCompiledModuleSource } from "./runtime/executeModule";
export { isFigmaClipboardHtml, parseFigmaClipboardHtml } from "./runtime/figma/parser/clipboard";
export { parseFigmaArchive } from "./runtime/figma/parser/kiwi";
export { vectorNetworkBlobToPaths } from "./runtime/figma/parser/vector";
export { convertFigmaClipboardHtmlSync } from "./runtime/figma/paste";
export { getInstanceChildIds, getInstancePathScale, resolveInstanceSubtree } from "./runtime/figma/translator/instance";
export { mapEffectStyles } from "./runtime/figma/translator/styles/effect";
export { nodeStylesToCss } from "./runtime/figma/translator/styles/index";
export { getParentNode, isAbsoluteStackChild, isAutoLayoutFrame, mapAutoLayoutChildStyles, mapContainerLayoutStyles, mapCornerRadiusStyles, mapFirstStackChildTopRadiusStyles, mapTransformStyles } from "./runtime/figma/translator/styles/layout";
export { buildFigmaImageStylePatches, mapFillAndStrokeStyles, mapImageFillStyles, resolveSolidPaint } from "./runtime/figma/translator/styles/paint";
export { applyTextAutoResize, figmaTextContent, mapTextStyles } from "./runtime/figma/translator/styles/text";
export { convertFigmaNode } from "./runtime/figma/translator/toStore";
export { convertBooleanOperationNode, convertEllipseNode, convertVectorNode, extractLocalClipPathD, extractMaskClipPathD } from "./runtime/figma/translator/vector";
export { uniqueFigmaImageHashes } from "./runtime/figma/types";
export { rgbaToCss } from "./runtime/figma/utils/color";
export { paintImageHashHex } from "./runtime/figma/utils/imagePaint";
export { figGuidKey } from "./runtime/figma/utils/node";
export { stripUnresolvableCssImports } from "./runtime/projectCss";
export { scanProject } from "./runtime/projectScanner";
export { WEBGL_CANVAS_ATTR, createInteropJsxRuntime, initBingoRuntime } from "./runtime/runtime";
export { getIconLibraryDependencyName, isLikelyIconLibraryPackage, isLoadableIconLibrary, normalizeIconLibrarySpecifier } from "./runtime/settingsParser";
export { loadSystemSkills } from "./runtime/skills";
export { extractClassNames } from "./runtime/tailwindUtils";
export { applyOps, collectDescendantIds } from "./store/apply";
export { COMMENTED_STYLES_KEY, commentedStyleComment, parseCommentedStyleComment, parseCommentedStyles, serializeCommentedStyles, splitCommentedStyles } from "./store/commentedStyles";
export { emptyMutableStore, emptyStore, ensureV2, registerElement, storeFromNested } from "./store/ensureV2";
export { storeSubtreeToLegacyNested, storeToLegacyNested } from "./store/legacy";
export { getById, getChildren$2, getDescendantIds, getIndex, getParentId, getRootIds, isDescendant, isTextLikeOwner, isTextOwner, resolveTextOwner, walk } from "./store/read";
export { coerceClassName, isBingoOwnedDomProp, isPlainObject$2, isTransientUploadProp, sanitizeDomRenderProps, sanitizeElementProps } from "./store/sanitize";
export { ROOT, canAcceptChild, hasChildren$1 } from "./store/types";
export { CANVAS_EXECUTION_STATES, CANVAS_OBSERVATION_STATES, CANVAS_OPERATION_ERROR_CODES, CANVAS_OPERATION_PROTOCOL_VERSION, CANVAS_PERSISTENCE_STATES, isCanvasOperationStatus } from "./protocol/canvasOperation";
export { toWire } from "./store/wire";
export { emitScopedThemeCss, normalizeThemeSelection, resolveThemeSelection, resolveThemeTokens, validateThemeManifest } from "./runtime/theme";
