import { wrapAdjacentRootsRule } from "./rules/wrapAdjacentRoots";
import type { JsxRecoveryRule } from "./types";

const JSX_RECOVERY_RULES: readonly JsxRecoveryRule[] = [wrapAdjacentRootsRule];

export function getJsxRecoveryRules(disabledRuleIds: Iterable<string> = []): readonly JsxRecoveryRule[] {
  const disabled = new Set(disabledRuleIds);
  return JSX_RECOVERY_RULES.filter(rule => !disabled.has(rule.id));
}

export { JSX_RECOVERY_RULES };
