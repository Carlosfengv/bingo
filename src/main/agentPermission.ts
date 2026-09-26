export async function resolveAcpPermission(
  params: any,
  autoApprove: boolean,
  requestPermission?: (toolName: string, input: unknown) => Promise<boolean>,
) {
  const choices = Array.isArray(params?.options) ? params.options : [];
  let approved = autoApprove;
  if (!approved && requestPermission) {
    const call = params?.toolCall ?? {};
    const toolName = call.title || call.name || params?.title || "Agent tool";
    try { approved = await requestPermission(String(toolName), call.rawInput ?? params?.input ?? {}); }
    catch { approved = false; }
  }
  const selected = approved
    ? choices.find((option: any) => option.kind === "allow_once") || (autoApprove && choices.find((option: any) => option.kind === "allow_always"))
    : choices.find((option: any) => option.kind === "reject_once");
  return selected ? { outcome: { outcome: "selected", optionId: selected.optionId } } : { outcome: { outcome: "cancelled" } };
}
