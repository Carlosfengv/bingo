import { useSharedAgentQuery } from "./useSharedAgentQuery";
import { useCallback, useEffect, useRef, useState } from "react";
import { AGENT_IDS, AGENT_INFO, type AgentId, type AgentModel, type InstalledAgent } from "../../../../../src/shared/codingAgents";

const modelCache = new Map<AgentId, AgentModel[]>();
const modelRequests = new Map<AgentId, Promise<AgentModel[]>>();

async function requestAgentModels(agent: AgentId, force = false) {
  if (agent === "claude") return [];
  if (!force && modelCache.has(agent)) return modelCache.get(agent)!;
  if (!force && modelRequests.has(agent)) return modelRequests.get(agent)!;
  const request = window.api.invoke("agent:models", { agent }).then(result => {
    const models = Array.isArray(result?.models) ? result.models : [];
    modelCache.set(agent, models);
    return models;
  });
  modelRequests.set(agent, request);
  try {
    return await request;
  } finally {
    if (modelRequests.get(agent) === request) modelRequests.delete(agent);
  }
}

const DEFAULT_CLAUDE_MODEL = "claude-opus-4-8";
function modelPreferenceKey(agent: AgentId) {
  return `bingo-ai-model:${agent}`;
}
function readModelPreference(agent: AgentId) {
  try {
    return localStorage.getItem(modelPreferenceKey(agent)) ||
      (agent === "claude" ? localStorage.getItem("bingo-ai-model") || DEFAULT_CLAUDE_MODEL : "");
  } catch {
    return agent === "claude" ? DEFAULT_CLAUDE_MODEL : "";
  }
}
function writeModelPreference(agent: AgentId, model: string) {
  try {
    const key = modelPreferenceKey(agent);
    if (model) localStorage.setItem(key, model);
    else localStorage.removeItem(key);
    if (agent === "claude" && model) localStorage.setItem("bingo-ai-model", model);
  } catch {}
}

export function useLocalAgents({ includeModels = false } = {}) {
  const catalog = useSharedAgentQuery("agent:list");
  const agents = catalog.value?.agents ?? [];
  const selectedAgent: AgentId | null = catalog.value?.selectedAgent ?? null;
  const loading = catalog.loading;
  const error = catalog.error;
  const refresh = catalog.refresh;
  const [saving, setSaving] = useState(false);
  const [models, setModels] = useState<AgentModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedEffort, setSelectedEffort] = useState(() => {
    try { return localStorage.getItem("bingo-ai-effort") || "high"; }
    catch { return "high"; }
  });
  const modelGeneration = useRef(0);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; ++modelGeneration.current; };
  }, []);

  const loadModels = useCallback(async (agent: AgentId, force: boolean) => {
    const request = ++modelGeneration.current;
    setModelsLoading(agent !== "claude");
    setModelsError(false);
    try {
      const nextModels = await requestAgentModels(agent, force);
      if (!mounted.current || request !== modelGeneration.current) return;
      setModels(nextModels);
    } catch {
      if (mounted.current && request === modelGeneration.current) {
        setModels([]);
        setModelsError(true);
      }
    } finally {
      if (mounted.current && request === modelGeneration.current) setModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedAgent) {
      ++modelGeneration.current;
      setModels([]);
      setModelsLoading(false);
      setModelsError(false);
      setSelectedModel("");
      return;
    }
    setSelectedModel(readModelPreference(selectedAgent));
    if (includeModels) void loadModels(selectedAgent, false);
    else {
      ++modelGeneration.current;
      setModels([]);
      setModelsLoading(false);
      setModelsError(false);
    }
  }, [includeModels, loadModels, selectedAgent]);

  useEffect(() => {
    if (!includeModels || !selectedAgent || selectedAgent === "claude" || !selectedModel || modelsLoading || modelsError) return;
    if (models.some(model => model.id === selectedModel)) return;
    setSelectedModel("");
    writeModelPreference(selectedAgent, "");
  }, [includeModels, models, modelsError, modelsLoading, selectedAgent, selectedModel]);

  const selectAgent = async (agent: AgentId) => {
    if (saving || !agents.some(entry => entry.agent === agent && entry.installed)) return;
    setSaving(true);
    try {
      await window.api.invoke("ai-config:set", { agent });
      await refresh();
    } catch {
      if (mounted.current) setError(true);
    } finally {
      if (mounted.current) setSaving(false);
    }
  };

  const refreshModels = useCallback(() => {
    if (!selectedAgent) return Promise.resolve();
    return loadModels(selectedAgent, true);
  }, [loadModels, selectedAgent]);

  const selectModel = useCallback((model: string) => {
    if (!selectedAgent) return;
    setSelectedModel(model);
    writeModelPreference(selectedAgent, model);
  }, [selectedAgent]);

  const selectEffort = useCallback((effort: string) => {
    setSelectedEffort(effort);
    try { localStorage.setItem("bingo-ai-effort", effort); } catch {}
  }, []);

  return { agents, selectedAgent, loading, saving, error, refresh, selectAgent,
    models, modelsLoading, modelsError, refreshModels, selectedModel, selectModel,
    selectedEffort, selectEffort };
}
