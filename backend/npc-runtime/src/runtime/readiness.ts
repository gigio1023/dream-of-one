import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { delimiter, dirname, join, resolve } from "node:path";
import type { RuntimeConfig } from "../config.js";

export type ReadinessReason =
  | "codex_command_not_resolvable"
  | "thread_store_path_not_accessible"
  | "workspace_root_path_not_accessible";

interface CodexCommandReadiness {
  ok: boolean;
  command: string;
  resolvedPath?: string;
  reason?: "codex_command_not_resolvable";
}

interface ThreadStorePathReadiness {
  ok: boolean;
  path: string;
  resolvedPath: string;
  reason?: "thread_store_path_not_accessible";
}

interface WorkspaceRootPathReadiness {
  ok: boolean;
  path: string;
  resolvedPath: string;
  reason?: "workspace_root_path_not_accessible";
}

export interface RuntimeReadinessReport {
  status: "ready" | "not_ready";
  service: "npc-runtime";
  reasons: ReadinessReason[];
  checks: {
    codexCommand: CodexCommandReadiness;
    threadStorePath: ThreadStorePathReadiness;
    workspaceRootPath: WorkspaceRootPathReadiness;
  };
}

function hasPathSeparator(value: string): boolean {
  return value.includes("/") || value.includes("\\");
}

function commandCandidates(command: string): string[] {
  if (process.platform !== "win32") {
    return [command];
  }

  if (/\.[^./\\]+$/.test(command)) {
    return [command];
  }

  const pathExt = (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM")
    .split(";")
    .map(ext => ext.trim())
    .filter(Boolean);

  return [command, ...pathExt.map(ext => `${command}${ext.toLowerCase()}`)];
}

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveCodexCommand(command: string): Promise<string | undefined> {
  const trimmed = command.trim();
  if (!trimmed) {
    return undefined;
  }

  if (hasPathSeparator(trimmed)) {
    const absolutePath = resolve(trimmed);
    return (await isExecutable(absolutePath)) ? absolutePath : undefined;
  }

  const pathEntries = (process.env.PATH ?? "").split(delimiter).filter(Boolean);
  for (const dir of pathEntries) {
    for (const candidateName of commandCandidates(trimmed)) {
      const candidate = join(dir, candidateName);
      if (await isExecutable(candidate)) {
        return candidate;
      }
    }
  }

  return undefined;
}

async function checkCodexCommand(command: string): Promise<CodexCommandReadiness> {
  const resolvedPath = await resolveCodexCommand(command);
  if (!resolvedPath) {
    return {
      ok: false,
      command,
      reason: "codex_command_not_resolvable",
    };
  }

  return {
    ok: true,
    command,
    resolvedPath,
  };
}

async function checkThreadStorePath(path: string): Promise<ThreadStorePathReadiness> {
  const resolvedPath = resolve(path);
  const parentDirectory = dirname(resolvedPath);

  try {
    await mkdir(parentDirectory, { recursive: true });
    await access(parentDirectory, constants.R_OK | constants.W_OK);

    try {
      await access(resolvedPath, constants.R_OK | constants.W_OK);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== "ENOENT") {
        throw error;
      }
    }

    return {
      ok: true,
      path,
      resolvedPath,
    };
  } catch {
    return {
      ok: false,
      path,
      resolvedPath,
      reason: "thread_store_path_not_accessible",
    };
  }
}

async function checkWorkspaceRootPath(path: string): Promise<WorkspaceRootPathReadiness> {
  const resolvedPath = resolve(path);
  try {
    await mkdir(resolvedPath, { recursive: true });
    await access(resolvedPath, constants.R_OK | constants.W_OK);
    return {
      ok: true,
      path,
      resolvedPath,
    };
  } catch {
    return {
      ok: false,
      path,
      resolvedPath,
      reason: "workspace_root_path_not_accessible",
    };
  }
}

export async function evaluateRuntimeReadiness(config: RuntimeConfig): Promise<RuntimeReadinessReport> {
  const codexCommand = await checkCodexCommand(config.codexCommand);
  const threadStorePath = await checkThreadStorePath(config.threadStorePath);
  const workspaceRootPath = await checkWorkspaceRootPath(config.workspaceRootPath);

  const reasons: ReadinessReason[] = [];
  if (!codexCommand.ok && codexCommand.reason) {
    reasons.push(codexCommand.reason);
  }
  if (!threadStorePath.ok && threadStorePath.reason) {
    reasons.push(threadStorePath.reason);
  }
  if (!workspaceRootPath.ok && workspaceRootPath.reason) {
    reasons.push(workspaceRootPath.reason);
  }

  return {
    status: reasons.length === 0 ? "ready" : "not_ready",
    service: "npc-runtime",
    reasons,
    checks: {
      codexCommand,
      threadStorePath,
      workspaceRootPath,
    },
  };
}
