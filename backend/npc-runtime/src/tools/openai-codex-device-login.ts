import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  DEFAULT_OPENAI_CODEX_AUTH_PROFILE,
  DEFAULT_OPENAI_CODEX_AUTH_STORE_PATH,
} from "../config.js";

// Creates the game runtime's `openai-codex` provider profile. This is not a
// Codex CLI login helper; run it only when the backend provider auth store must
// be created or refreshed.
const OPENAI_AUTH_BASE_URL = "https://auth.openai.com";
const OPENAI_CODEX_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const OPENAI_CODEX_DEVICE_CALLBACK_URL = `${OPENAI_AUTH_BASE_URL}/deviceauth/callback`;
const DEVICE_CODE_TIMEOUT_MS = 15 * 60_000;
const DEFAULT_POLL_INTERVAL_MS = 5_000;

function parseJsonObject(text: string): Record<string, unknown> {
  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("OpenAI auth response was not a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readIntervalMs(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value * 1000);
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10) * 1000;
  }
  return DEFAULT_POLL_INTERVAL_MS;
}

async function fetchText(url: string, init: RequestInit): Promise<{ ok: boolean; status: number; statusText: string; text: string }> {
  const response = await fetch(url, init);
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    text: await response.text(),
  };
}

async function requestDeviceCode(): Promise<{
  deviceAuthId: string;
  userCode: string;
  verificationUrl: string;
  intervalMs: number;
}> {
  const response = await fetchText(`${OPENAI_AUTH_BASE_URL}/api/accounts/deviceauth/usercode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      originator: "dream-of-one",
      "User-Agent": "dream-of-one",
    },
    body: JSON.stringify({ client_id: OPENAI_CODEX_CLIENT_ID }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI device code request failed: HTTP ${response.status} ${response.text.slice(0, 300)}`);
  }

  const body = parseJsonObject(response.text);
  const deviceAuthId = readString(body.device_auth_id);
  const userCode = readString(body.user_code) ?? readString(body.usercode);
  if (!deviceAuthId || !userCode) {
    throw new Error("OpenAI device code response was missing device_auth_id or user_code");
  }

  return {
    deviceAuthId,
    userCode,
    verificationUrl: `${OPENAI_AUTH_BASE_URL}/codex/device`,
    intervalMs: readIntervalMs(body.interval),
  };
}

async function pollAuthorizationCode(deviceAuthId: string, userCode: string, intervalMs: number): Promise<{
  authorizationCode: string;
  codeVerifier: string;
}> {
  const deadline = Date.now() + DEVICE_CODE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const response = await fetchText(`${OPENAI_AUTH_BASE_URL}/api/accounts/deviceauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        originator: "dream-of-one",
        "User-Agent": "dream-of-one",
      },
      body: JSON.stringify({
        device_auth_id: deviceAuthId,
        user_code: userCode,
      }),
    });

    if (response.ok) {
      const body = parseJsonObject(response.text);
      const authorizationCode = readString(body.authorization_code);
      const codeVerifier = readString(body.code_verifier);
      if (!authorizationCode || !codeVerifier) {
        throw new Error("OpenAI device authorization response was missing authorization_code or code_verifier");
      }
      return { authorizationCode, codeVerifier };
    }

    if (response.status !== 403 && response.status !== 404) {
      throw new Error(`OpenAI device authorization failed: HTTP ${response.status} ${response.text.slice(0, 300)}`);
    }

    await new Promise(resolve => setTimeout(resolve, Math.max(1000, intervalMs)));
  }

  throw new Error("OpenAI device authorization timed out after 15 minutes");
}

async function exchangeToken(authorizationCode: string, codeVerifier: string): Promise<{
  access: string;
  refresh: string;
  expires: number;
}> {
  const response = await fetchText(`${OPENAI_AUTH_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      originator: "dream-of-one",
      "User-Agent": "dream-of-one",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: authorizationCode,
      redirect_uri: OPENAI_CODEX_DEVICE_CALLBACK_URL,
      client_id: OPENAI_CODEX_CLIENT_ID,
      code_verifier: codeVerifier,
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI device token exchange failed: HTTP ${response.status} ${response.text.slice(0, 300)}`);
  }

  const body = parseJsonObject(response.text);
  const access = readString(body.access_token);
  const refresh = readString(body.refresh_token);
  const expiresInSeconds = typeof body.expires_in === "number" && Number.isFinite(body.expires_in)
    ? body.expires_in
    : 0;
  if (!access || !refresh) {
    throw new Error("OpenAI token exchange succeeded but did not return access and refresh tokens");
  }

  return {
    access,
    refresh,
    expires: expiresInSeconds > 0 ? Date.now() + Math.trunc(expiresInSeconds * 1000) : Date.now(),
  };
}

async function main(): Promise<void> {
  const authStorePath = process.env.OPENAI_CODEX_AUTH_STORE_PATH?.trim() || DEFAULT_OPENAI_CODEX_AUTH_STORE_PATH;
  const profile = process.env.OPENAI_CODEX_AUTH_PROFILE?.trim() || DEFAULT_OPENAI_CODEX_AUTH_PROFILE;
  const deviceCode = await requestDeviceCode();

  console.log(`Open this URL: ${deviceCode.verificationUrl}`);
  console.log(`Enter code: ${deviceCode.userCode}`);
  console.log("Waiting for authorization...");

  const authorization = await pollAuthorizationCode(
    deviceCode.deviceAuthId,
    deviceCode.userCode,
    deviceCode.intervalMs,
  );
  const credentials = await exchangeToken(authorization.authorizationCode, authorization.codeVerifier);

  const payload = {
    profiles: {
      [profile]: {
        type: "oauth",
        access: credentials.access,
        refresh: credentials.refresh,
        expires: credentials.expires,
      },
    },
  };

  await mkdir(dirname(authStorePath), { recursive: true });
  await writeFile(authStorePath, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
  console.log(`Saved OpenAI Codex auth profile "${profile}" to ${authStorePath}.`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
