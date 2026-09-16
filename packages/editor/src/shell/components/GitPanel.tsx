/*
 * Reconstructed from the shipped Bingo bundle by luna/tools/rebuild.mjs.
 * Original module: ../../packages/editor/src/shell/components/GitPanel.tsx
 *
 * The build erased TypeScript types, lowered JSX, and ran React Compiler, so
 * this is build output with the build's own rewrites undone -- not the
 * author's original file. See luna/RECOVERY.md.
 */
import { ConfirmDialog } from "./ConfirmDialog";
import { ArrowClockwiseIcon, ArrowSquareOutIcon, Badge, Button, CloudUploadIcon, FileIcon, FileMinusIcon, FilePlusIcon, GitBranchIcon, ScrollArea, SearchIcon, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SpinnerIcon, Tooltip } from "@bingo/ui";
import { Layout as n$10 } from "@phosphor-icons/react/dist/icons/Layout";
import { useTranslation } from "@bingo/i18n";
import * as import_react from "react";
import * as import_compiler_runtime from "react/compiler-runtime";
import { toast } from "sonner";

function GitHubIcon(t0) {
  const $ = (0, import_compiler_runtime.c)(4);
  const {
    size: t1,
    className
  } = t0;
  const size = t1 === void 0 ? 16 : t1;
  let t2;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = <path d="M10.303 16.652c-2.837-.344-4.835-2.385-4.835-5.028 0-1.074.387-2.235 1.031-3.008-.279-.709-.236-2.214.086-2.837.86-.107 2.02.344 2.708.967.816-.258 1.676-.386 2.728-.386 1.053 0 1.913.128 2.686.365.666-.602 1.848-1.053 2.708-.946.3.581.344 2.085.064 2.815.688.817 1.053 1.913 1.053 3.03 0 2.643-1.998 4.641-4.877 5.006.73.473 1.224 1.504 1.224 2.686v2.235c0 .644.537 1.01 1.182.752 3.889-1.483 6.94-5.372 6.94-10.185 0-6.081-4.942-11.044-11.022-11.044-6.081 0-10.98 4.963-10.98 11.044a10.84 10.84 0 0 0 7.112 10.206c.58.215 1.139-.172 1.139-.752v-1.719a2.768 2.768 0 0 1-1.032.215c-1.418 0-2.256-.773-2.857-2.213-.237-.58-.495-.924-.989-.988-.258-.022-.344-.129-.344-.258 0-.258.43-.451.86-.451.623 0 1.16.386 1.719 1.181.43.623.881.903 1.418.903.537 0 .881-.194 1.375-.688.365-.365.645-.687.903-.902Z" />;
    $[0] = t2;
  } else t2 = $[0];
  let t3;
  if ($[1] !== className || $[2] !== size) {
    t3 = <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>{t2}</svg>;
    $[1] = className;
    $[2] = size;
    $[3] = t3;
  } else t3 = $[3];
  return t3;
}
function GitPanel(t0) {
  const $ = (0, import_compiler_runtime.c)(40);
  const { t } = useTranslation("editor");
  const {
    gitStatus,
    isLoadingStatus,
    githubConnected,
    installations,
    activeInstallationId,
    onSelectInstallation,
    isOwner: t1,
    repos,
    isLoadingRepos,
    onConnectRepo,
    onDisconnectRepo,
    onCommit,
    onPull,
    onCreateRepo,
    onInstallGitHubApp,
    onAddGitHubAccount,
    onDisconnectGitHub,
    onManageGitHub,
    onRefresh,
    isCommitting,
    isPulling,
    isCreatingRepo,
    isConnecting,
    error
  } = t0;
  if (!(t1 === void 0 ? true : t1)) {
    if (gitStatus?.connected) {
      let t2;
      if ($[0] !== error || $[1] !== gitStatus || $[2] !== isCommitting || $[3] !== isLoadingStatus || $[4] !== isPulling || $[5] !== onCommit || $[6] !== onDisconnectRepo || $[7] !== onManageGitHub || $[8] !== onPull || $[9] !== onRefresh) {
        t2 = <ConnectedView gitStatus={gitStatus} isLoadingStatus={isLoadingStatus} onCommit={onCommit} onPull={onPull} onDisconnectRepo={onDisconnectRepo} onManageGitHub={onManageGitHub} onRefresh={onRefresh} isCommitting={isCommitting} isPulling={isPulling} error={error} />;
        $[0] = error;
        $[1] = gitStatus;
        $[2] = isCommitting;
        $[3] = isLoadingStatus;
        $[4] = isPulling;
        $[5] = onCommit;
        $[6] = onDisconnectRepo;
        $[7] = onManageGitHub;
        $[8] = onPull;
        $[9] = onRefresh;
        $[10] = t2;
      } else t2 = $[10];
      return t2;
    }
    let t2;
    if (true) {
      t2 = <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-2">{<GitBranchIcon width={32} height={32} className="text-ed-muted-foreground" />}{<p className="text-sm text-ed-muted-foreground">{t("git.ownerSetup")}</p>}</div>;
      $[11] = t2;
    } else t2 = $[11];
    return t2;
  }
  if (!githubConnected) {
    let t2;
    if ($[12] !== onInstallGitHubApp) {
      t2 = <NotConnectedView onInstall={onInstallGitHubApp} />;
      $[12] = onInstallGitHubApp;
      $[13] = t2;
    } else t2 = $[13];
    return t2;
  }
  if (!gitStatus?.connected) {
    let t2;
    if ($[14] !== activeInstallationId || $[15] !== error || $[16] !== installations || $[17] !== isConnecting || $[18] !== isCreatingRepo || $[19] !== isLoadingRepos || $[20] !== onAddGitHubAccount || $[21] !== onConnectRepo || $[22] !== onCreateRepo || $[23] !== onDisconnectGitHub || $[24] !== onManageGitHub || $[25] !== onRefresh || $[26] !== onSelectInstallation || $[27] !== repos) {
      t2 = <ConnectRepoView repos={repos} isLoadingRepos={isLoadingRepos} installations={installations} activeInstallationId={activeInstallationId} onSelectInstallation={onSelectInstallation} onConnectRepo={onConnectRepo} onCreateRepo={onCreateRepo} onAddGitHubAccount={onAddGitHubAccount} onDisconnectGitHub={onDisconnectGitHub} onManageGitHub={onManageGitHub} onRefresh={onRefresh} isCreatingRepo={isCreatingRepo} isConnecting={isConnecting} error={error} />;
      $[14] = activeInstallationId;
      $[15] = error;
      $[16] = installations;
      $[17] = isConnecting;
      $[18] = isCreatingRepo;
      $[19] = isLoadingRepos;
      $[20] = onAddGitHubAccount;
      $[21] = onConnectRepo;
      $[22] = onCreateRepo;
      $[23] = onDisconnectGitHub;
      $[24] = onManageGitHub;
      $[25] = onRefresh;
      $[26] = onSelectInstallation;
      $[27] = repos;
      $[28] = t2;
    } else t2 = $[28];
    return t2;
  }
  let t2;
  if ($[29] !== error || $[30] !== gitStatus || $[31] !== isCommitting || $[32] !== isLoadingStatus || $[33] !== isPulling || $[34] !== onCommit || $[35] !== onDisconnectRepo || $[36] !== onManageGitHub || $[37] !== onPull || $[38] !== onRefresh) {
    t2 = <ConnectedView gitStatus={gitStatus} isLoadingStatus={isLoadingStatus} onCommit={onCommit} onPull={onPull} onDisconnectRepo={onDisconnectRepo} onManageGitHub={onManageGitHub} onRefresh={onRefresh} isCommitting={isCommitting} isPulling={isPulling} error={error} />;
    $[29] = error;
    $[30] = gitStatus;
    $[31] = isCommitting;
    $[32] = isLoadingStatus;
    $[33] = isPulling;
    $[34] = onCommit;
    $[35] = onDisconnectRepo;
    $[36] = onManageGitHub;
    $[37] = onPull;
    $[38] = onRefresh;
    $[39] = t2;
  } else t2 = $[39];
  return t2;
}
function NotConnectedView(t0) {
  const $ = (0, import_compiler_runtime.c)(5);
  const { t } = useTranslation("editor");
  const {
    onInstall
  } = t0;
  let t1;
  if (true) {
    t1 = <div className="p-4 pb-3">{<div className="flex items-center gap-2">{<GitHubIcon size={16} />}{<span className="text-[13px] font-medium text-ed-foreground">{t("git.connectTitle")}</span>}</div>}{<p className="text-xs text-ed-muted-foreground mt-1.5 leading-relaxed">{t("git.connectDescription")}</p>}</div>;
    $[0] = t1;
  } else t1 = $[0];
  let t2;
  let t3;
  if (true) {
    t2 = <GitHubIcon size={14} />;
    t3 = <span className="text-xs font-medium">{t("git.connect")}</span>;
    $[1] = t2;
    $[2] = t3;
  } else {
    t2 = $[1];
    t3 = $[2];
  }
  let t4;
  if (true) {
    t4 = <div className="flex flex-col h-full">{t1}{<div className="flex-1 px-4 pt-6">{<Button className="w-full" size="sm" onClick={onInstall} isChildText={false}>{t2}{t3}</Button>}</div>}</div>;
    $[3] = onInstall;
    $[4] = t4;
  } else t4 = $[4];
  return t4;
}
function ConnectRepoView({
  repos,
  isLoadingRepos,
  installations,
  activeInstallationId,
  onSelectInstallation,
  onConnectRepo,
  onCreateRepo,
  onAddGitHubAccount,
  onDisconnectGitHub,
  onManageGitHub,
  onRefresh,
  isCreatingRepo,
  isConnecting,
  error
}) {
  const { t } = useTranslation("editor");
  const [newRepoName, setNewRepoName] = (0, import_react.useState)("");
  const [search, setSearch] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    if (error) toast.error(t("git.operationFailed"), { description: error });
  }, [error, t]);
  const [connectingRepo, setConnectingRepo] = (0, import_react.useState)(null);
  const activeOwner = (repos ? [...new Set(repos.map(r => r.fullName.split("/")[0]))] : [])[0] || "";
  const filteredRepos = repos?.filter(r_0 => {
    const [owner, name] = r_0.fullName.split("/");
    if (owner !== activeOwner) return false;
    if (search && !name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }) ?? [];
  const handleCreateRepo = async () => {
    if (!newRepoName.trim()) return;
    try {
      const repo = await onCreateRepo(newRepoName.trim());
      await onConnectRepo(repo.fullName, repo.defaultBranch);
    } catch {}
  };
  const handleConnectExisting = async repo_0 => {
    setConnectingRepo(repo_0.fullName);
    try {
      await onConnectRepo(repo_0.fullName, repo_0.defaultBranch);
    } catch {} finally {
      setConnectingRepo(null);
    }
  };
  return <div className="flex flex-col h-full">{<div className="p-4 pb-3">{<div className="flex items-center gap-2">{<GitHubIcon size={16} />}{<span className="text-[13px] font-medium text-ed-foreground flex-1">{t("git.connectTitle")}</span>}{<Tooltip content={t("git.refresh")}>{<button type="button" aria-label={t("git.refresh")} onClick={onRefresh} className="p-0.5 rounded hover:bg-ed-accent text-ed-muted-foreground hover:text-ed-foreground shrink-0">{<ArrowClockwiseIcon width={14} height={14} className={isLoadingRepos ? "animate-spin" : ""} />}</button>}</Tooltip>}</div>}{<p className="text-xs text-ed-muted-foreground mt-1.5 leading-relaxed">{t("git.connectDescription")}</p>}</div>}{<ScrollArea className="flex-1">{<div className="flex flex-col gap-6 px-4 pt-6 pb-4">{<div className="flex flex-col gap-2">{<span className="text-[11px] text-ed-muted-foreground">{t("git.createRepo")}</span>}{<input className="h-8 px-3 text-[13px] bg-ed-background border border-ed-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ed-ring" placeholder="my-bingo-project" value={newRepoName} onChange={e => setNewRepoName(e.target.value)} onKeyDown={e_0 => {
            if (e_0.key === "Enter" && !e_0.nativeEvent.isComposing) handleCreateRepo();
          }} />}{<Button className="w-full" size="sm" onClick={handleCreateRepo} disabled={isCreatingRepo || isConnecting || !newRepoName.trim()} loading={isCreatingRepo}>{t("git.createRepoAction")}</Button>}</div>}{<div className="flex items-center gap-3">{<div className="flex-1 h-px bg-ed-border" />}{<span className="text-[11px] text-ed-muted-foreground">{t("git.or")}</span>}{<div className="flex-1 h-px bg-ed-border" />}</div>}{<div className="flex flex-col gap-2">{<span className="text-[11px] text-ed-muted-foreground">{t("git.connectExisting")}</span>}{<div className="flex gap-2">{<Select value={String(activeInstallationId ?? "")} onValueChange={v => {
              if (v === "__add__") onAddGitHubAccount();else onSelectInstallation?.(Number(v));
            }} disabled={isLoadingRepos}>{<SelectTrigger className="flex-1 text-[13px]">{<SelectValue>{installations?.find(i => i.installationId === activeInstallationId)?.accountLogin ?? t("git.selectAccount")}</SelectValue>}</SelectTrigger>}{<SelectContent>{installations?.map(inst => <SelectItem key={inst.installationId} value={String(inst.installationId)}>{inst.accountLogin}{inst.accountType === "Organization" ? ` (${t("git.organization")})` : ""}</SelectItem>)}{<SelectItem value="__add__">+ {t("git.addAccount")}</SelectItem>}</SelectContent>}</Select>}{<div className="flex-1 relative">{<SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ed-muted-foreground pointer-events-none" width={14} height={14} />}{<input className="w-full h-9 pl-8 pr-3 text-[13px] bg-ed-background border border-ed-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ed-ring" placeholder={t("git.search")} value={search} onChange={e_1 => setSearch(e_1.target.value)} />}</div>}</div>}{isLoadingRepos ? <div className="flex items-center justify-center py-6">{<SpinnerIcon className="animate-spin text-ed-muted-foreground" width={16} height={16} />}</div> : <div className="border border-ed-border rounded-md overflow-hidden">{filteredRepos.length === 0 ? <div className="px-3 py-4 text-center text-xs text-ed-muted-foreground">{t(search ? "git.noSearchResults" : "git.noRepos")}</div> : filteredRepos.slice(0, 20).map(repo_1 => {
              const repoName = repo_1.fullName.split("/")[1];
              const isThisConnecting = connectingRepo === repo_1.fullName;
              return <div key={repo_1.fullName} className="flex items-center px-3 py-2.5 border-b border-ed-border last:border-b-0 bg-ed-background">{<div className="flex items-center shrink-0 mr-3">{<GitHubIcon size={20} className="text-ed-muted-foreground" />}</div>}{<div className="flex-1 min-w-0 flex flex-col gap-0.5">{<span className="text-[13px] font-medium text-ed-foreground truncate">{repoName}</span>}{repo_1.private && <span className="text-[10px] text-ed-muted-foreground leading-none">{t("git.private")}</span>}</div>}{<div className="shrink-0 ml-3">{<Button size="xs" variant="outline" onClick={() => handleConnectExisting(repo_1)} disabled={isConnecting} loading={isThisConnecting}>{t("git.connect")}</Button>}</div>}</div>;
            })}</div>}</div>}</div>}</ScrollArea>}{<div className="mt-auto p-4 pt-2 flex gap-1">{<Button className="flex-1 gap-1.5 text-ed-muted-foreground" size="sm" variant="ghost" onClick={onManageGitHub} isChildText={false}>{<ArrowSquareOutIcon width={13} height={13} />}{<span className="text-xs">{t("git.manageRepos")}</span>}</Button>}{<Button className="flex-1 text-ed-muted-foreground" size="sm" variant="ghost" onClick={() => {
        onDisconnectGitHub().then(() => toast.success(t("git.disconnected")));
      }}>{<span className="text-xs">{t("git.disconnect")}</span>}</Button>}</div>}</div>;
}
function ConnectedView(t0) {
  const $ = (0, import_compiler_runtime.c)(83);
  const { t } = useTranslation("editor");
  const {
    gitStatus,
    isLoadingStatus,
    onCommit,
    onPull,
    onDisconnectRepo,
    onManageGitHub,
    onRefresh,
    isCommitting,
    isPulling,
    error
  } = t0;
  const [commitMessage, setCommitMessage] = (0, import_react.useState)("");
  const [showDisconnect, setShowDisconnect] = (0, import_react.useState)(false);
  let t1;
  let t2;
  if (true) {
    t1 = () => {
      if (error) toast.error(t("git.operationFailed"), { description: error });
    };
    t2 = [error, t];
    $[0] = error;
    $[1] = t1;
    $[2] = t2;
  } else {
    t1 = $[1];
    t2 = $[2];
  }
  (0, import_react.useEffect)(t1, t2);
  let t3;
  if ($[3] !== commitMessage || $[4] !== onCommit) {
    t3 = async () => {
      if (!commitMessage.trim()) return;
      try {
        await onCommit(commitMessage.trim());
        setCommitMessage("");
      } catch {}
    };
    $[3] = commitMessage;
    $[4] = onCommit;
    $[5] = t3;
  } else t3 = $[5];
  const handleCommit = t3;
  let t4;
  if ($[6] !== gitStatus.changes) {
    t4 = gitStatus.changes ?? [];
    $[6] = gitStatus.changes;
    $[7] = t4;
  } else t4 = $[7];
  const changes = t4;
  const isClean = gitStatus.clean ?? changes.length === 0;
  let t5;
  if ($[8] === Symbol.for("react.memo_cache_sentinel")) {
    t5 = <GitHubIcon size={16} />;
    $[8] = t5;
  } else t5 = $[8];
  let t6;
  if ($[9] !== gitStatus.repo) {
    t6 = <span className="text-[13px] font-medium text-ed-foreground flex-1 truncate">{gitStatus.repo}</span>;
    $[9] = gitStatus.repo;
    $[10] = t6;
  } else t6 = $[10];
  const t7 = isLoadingStatus ? "animate-spin" : "";
  let t8;
  if ($[11] !== t7) {
    t8 = <ArrowClockwiseIcon width={14} height={14} className={t7} />;
    $[11] = t7;
    $[12] = t8;
  } else t8 = $[12];
  let t9;
  if (true) {
    t9 = <Tooltip content={t("git.refresh")}>{<button type="button" aria-label={t("git.refresh")} onClick={onRefresh} className="p-0.5 rounded hover:bg-ed-accent text-ed-muted-foreground hover:text-ed-foreground shrink-0">{t8}</button>}</Tooltip>;
    $[13] = onRefresh;
    $[14] = t8;
    $[15] = t9;
  } else t9 = $[15];
  let t10;
  if ($[16] !== t6 || $[17] !== t9) {
    t10 = <div className="flex items-center gap-2">{t5}{t6}{t9}</div>;
    $[16] = t6;
    $[17] = t9;
    $[18] = t10;
  } else t10 = $[18];
  let t11;
  if ($[19] === Symbol.for("react.memo_cache_sentinel")) {
    t11 = <GitBranchIcon className="text-ed-muted-foreground" width={13} height={13} />;
    $[19] = t11;
  } else t11 = $[19];
  let t12;
  if ($[20] !== gitStatus.branch) {
    t12 = <span className="text-xs text-ed-muted-foreground">{gitStatus.branch}</span>;
    $[20] = gitStatus.branch;
    $[21] = t12;
  } else t12 = $[21];
  let t13;
  if (true) {
    t13 = gitStatus.behind ? <Badge variant="outline" className="h-[18px] px-1.5 text-[10px] ml-1 gap-[3px] text-blue-600 bg-blue-50 border-blue-300">{<span className="w-1.5 h-1.5 inline-block rounded-full bg-blue-500" />}{t("git.behind")}</Badge> : !isClean ? <Badge variant="outline" className="h-[18px] px-1.5 text-[10px] ml-1 gap-[3px] text-amber-600 bg-amber-50 border-amber-300">{<span className="w-1.5 h-1.5 inline-block rounded-full bg-amber-500" />}{t("git.uncommitted")}</Badge> : <Badge variant="outline" className="h-[18px] px-1.5 text-[10px] ml-1 gap-[3px] text-green-600 bg-green-50 border-green-300">{t("git.upToDate")}</Badge>;
    $[22] = gitStatus.behind;
    $[23] = isClean;
    $[24] = t13;
  } else t13 = $[24];
  let t14;
  if ($[25] !== t12 || $[26] !== t13) {
    t14 = <div className="flex items-center gap-1.5 mt-1.5">{t11}{t12}{t13}</div>;
    $[25] = t12;
    $[26] = t13;
    $[27] = t14;
  } else t14 = $[27];
  let t15;
  if ($[28] !== t10 || $[29] !== t14) {
    t15 = <div className="px-4 pt-3.5 pb-3">{t10}{t14}</div>;
    $[28] = t10;
    $[29] = t14;
    $[30] = t15;
  } else t15 = $[30];
  let t16;
  if ($[31] === Symbol.for("react.memo_cache_sentinel")) {
    t16 = e => setCommitMessage(e.target.value);
    $[31] = t16;
  } else t16 = $[31];
  let t17;
  if ($[32] !== handleCommit) {
    t17 = e_0 => {
      if (e_0.key === "Enter" && !e_0.nativeEvent.isComposing && (e_0.metaKey || e_0.ctrlKey)) handleCommit();
    };
    $[32] = handleCommit;
    $[33] = t17;
  } else t17 = $[33];
  let t18;
  if (true) {
    t18 = <textarea className="w-full h-20 px-3 py-2 text-[13px] bg-ed-background border border-ed-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ed-ring placeholder:text-ed-muted-foreground" placeholder={t("git.commitMessage")} value={commitMessage} onChange={t16} onKeyDown={t17} />;
    $[34] = commitMessage;
    $[35] = t17;
    $[36] = t18;
  } else t18 = $[36];
  let t19;
  if ($[37] !== commitMessage || $[38] !== isClean || $[39] !== isCommitting) {
    t19 = isCommitting || isClean || !commitMessage.trim();
    $[37] = commitMessage;
    $[38] = isClean;
    $[39] = isCommitting;
    $[40] = t19;
  } else t19 = $[40];
  let t20;
  let t21;
  if (true) {
    t20 = <CloudUploadIcon width={14} height={14} />;
    t21 = <span className="text-xs font-medium">{t("git.commitPush")}</span>;
    $[41] = t20;
    $[42] = t21;
  } else {
    t20 = $[41];
    t21 = $[42];
  }
  let t22;
  if ($[43] !== handleCommit || $[44] !== isCommitting || $[45] !== t19) {
    t22 = <Button className="w-full gap-1.5" size="sm" onClick={handleCommit} disabled={t19} loading={isCommitting} isChildText={false}>{t20}{t21}</Button>;
    $[43] = handleCommit;
    $[44] = isCommitting;
    $[45] = t19;
    $[46] = t22;
  } else t22 = $[46];
  let t23;
  if (true) {
    t23 = gitStatus.behind && <Button className="w-full" size="sm" variant="outline" onClick={onPull} disabled={isPulling} loading={isPulling}>{t("git.pull")}</Button>;
    $[47] = gitStatus.behind;
    $[48] = isPulling;
    $[49] = onPull;
    $[50] = t23;
  } else t23 = $[50];
  let t24;
  if ($[51] !== t18 || $[52] !== t22 || $[53] !== t23) {
    t24 = <div className="flex flex-col gap-2 px-4 pt-4 pb-4">{t18}{t22}{t23}</div>;
    $[51] = t18;
    $[52] = t22;
    $[53] = t23;
    $[54] = t24;
  } else t24 = $[54];
  let t25;
  if (true) {
    t25 = <span className="text-[11px] text-ed-muted-foreground">{t("git.changedFiles")}</span>;
    $[55] = t25;
  } else t25 = $[55];
  let t26;
  if ($[56] !== changes.length) {
    t26 = <div className="flex items-center justify-between px-4 pb-1">{t25}{<Badge variant="secondary" className="h-[18px] px-1.5 text-[10px]">{changes.length}</Badge>}</div>;
    $[56] = changes.length;
    $[57] = t26;
  } else t26 = $[57];
  let t27;
  if (true) {
    t27 = isLoadingStatus && changes.length === 0 ? <div className="flex items-center justify-center py-6">{<SpinnerIcon className="animate-spin text-ed-muted-foreground" width={16} height={16} />}</div> : changes.length === 0 ? <div className="px-2 py-6 text-center text-xs text-ed-muted-foreground">{t("git.noChanges")}</div> : changes.map(_temp$11);
    $[58] = changes;
    $[59] = isLoadingStatus;
    $[60] = t27;
  } else t27 = $[60];
  let t28;
  if ($[61] !== t27) {
    t28 = <ScrollArea className="flex-1" viewportClassName="px-2 py-1">{t27}</ScrollArea>;
    $[61] = t27;
    $[62] = t28;
  } else t28 = $[62];
  let t29;
  let t30;
  if (true) {
    t29 = <ArrowSquareOutIcon width={13} height={13} />;
    t30 = <span className="text-xs">{t("git.manage")}</span>;
    $[63] = t29;
    $[64] = t30;
  } else {
    t29 = $[63];
    t30 = $[64];
  }
  let t31;
  if ($[65] !== onManageGitHub) {
    t31 = <Button className="flex-1 gap-1.5 text-ed-muted-foreground" size="sm" variant="ghost" onClick={onManageGitHub} isChildText={false}>{t29}{t30}</Button>;
    $[65] = onManageGitHub;
    $[66] = t31;
  } else t31 = $[66];
  let t32;
  if (true) {
    t32 = <Button className="flex-1 text-ed-muted-foreground" size="sm" variant="ghost" onClick={() => setShowDisconnect(true)}>{<span className="text-xs">{t("git.disconnect")}</span>}</Button>;
    $[67] = t32;
  } else t32 = $[67];
  let t33;
  if ($[68] !== t31) {
    t33 = <div className="mt-auto p-4 pt-2 flex gap-2">{t31}{t32}</div>;
    $[68] = t31;
    $[69] = t33;
  } else t33 = $[69];
  let t34;
  if ($[70] === Symbol.for("react.memo_cache_sentinel")) {
    t34 = () => setShowDisconnect(false);
    $[70] = t34;
  } else t34 = $[70];
  let t35;
  if ($[71] !== onDisconnectRepo) {
    t35 = () => {
      onDisconnectRepo();
    };
    $[71] = onDisconnectRepo;
    $[72] = t35;
  } else t35 = $[72];
  let t36;
  if (true) {
    t36 = <ConfirmDialog isOpen={showDisconnect} onClose={t34} onConfirm={t35} title={t("git.disconnectTitle")} description={t("git.disconnectDescription")} confirmText={t("git.disconnect")} destructive={true} />;
    $[73] = showDisconnect;
    $[74] = t35;
    $[75] = t36;
  } else t36 = $[75];
  let t37;
  if ($[76] !== t15 || $[77] !== t24 || $[78] !== t26 || $[79] !== t28 || $[80] !== t33 || $[81] !== t36) {
    t37 = <div className="flex flex-col h-full">{t15}{t24}{t26}{t28}{t33}{t36}</div>;
    $[76] = t15;
    $[77] = t24;
    $[78] = t26;
    $[79] = t28;
    $[80] = t33;
    $[81] = t36;
    $[82] = t37;
  } else t37 = $[82];
  return t37;
}
function _temp$11(change) {
  return <ChangeRow key={change.path} change={change} />;
}
function ChangeRow(t0) {
  const $ = (0, import_compiler_runtime.c)(23);
  const {
    change
  } = t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = /^\.bingo\/canvases\/[^/]+\/canvas\.json$/;
    $[0] = t1;
  } else t1 = $[0];
  let t2;
  if ($[1] !== change.path) {
    t2 = t1.test(change.path);
    $[1] = change.path;
    $[2] = t2;
  } else t2 = $[2];
  const isCanvas = t2;
  let filename;
  let t3;
  if ($[3] !== change.path || $[4] !== isCanvas) {
    const parts = change.path.split("/");
    filename = parts[parts.length - 1];
    t3 = isCanvas ? "Canvas" : parts.length > 1 ? parts.slice(0, -1).join("/") : "/";
    $[3] = change.path;
    $[4] = isCanvas;
    $[5] = filename;
    $[6] = t3;
  } else {
    filename = $[5];
    t3 = $[6];
  }
  const dir = t3;
  const displayName = change.displayName ?? filename;
  const statusChar = change.status === "added" ? "A" : change.status === "deleted" ? "D" : "M";
  const statusColor = change.status === "added" ? "#22c55e" : change.status === "deleted" ? "#ef4444" : "#f59e0b";
  const RowIcon = isCanvas ? n$10 : change.status === "added" ? FilePlusIcon : change.status === "deleted" ? FileMinusIcon : FileIcon;
  let t4;
  if ($[7] !== RowIcon) {
    t4 = <RowIcon className="text-ed-muted-foreground shrink-0" width={14} height={14} />;
    $[7] = RowIcon;
    $[8] = t4;
  } else t4 = $[8];
  let t5;
  if ($[9] !== displayName) {
    t5 = <span className="text-[13px] text-ed-foreground truncate flex-1 min-w-0">{displayName}</span>;
    $[9] = displayName;
    $[10] = t5;
  } else t5 = $[10];
  let t6;
  if ($[11] !== dir) {
    t6 = <span className="text-[11px] text-ed-muted-foreground shrink-0 truncate max-w-[120px] text-right">{dir}</span>;
    $[11] = dir;
    $[12] = t6;
  } else t6 = $[12];
  let t7;
  if ($[13] !== statusColor) {
    t7 = {
      color: statusColor
    };
    $[13] = statusColor;
    $[14] = t7;
  } else t7 = $[14];
  let t8;
  if ($[15] !== statusChar || $[16] !== t7) {
    t8 = <span className="text-[11px] font-semibold font-mono shrink-0" style={t7}>{statusChar}</span>;
    $[15] = statusChar;
    $[16] = t7;
    $[17] = t8;
  } else t8 = $[17];
  let t9;
  if ($[18] !== t4 || $[19] !== t5 || $[20] !== t6 || $[21] !== t8) {
    t9 = <div className="flex items-center gap-2 px-2 py-1.5 rounded-[5px] hover:bg-ed-accent/50 cursor-default">{t4}{t5}{t6}{t8}</div>;
    $[18] = t4;
    $[19] = t5;
    $[20] = t6;
    $[21] = t8;
    $[22] = t9;
  } else t9 = $[22];
  return t9;
}

export { GitPanel };
