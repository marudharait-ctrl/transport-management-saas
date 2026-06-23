import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function openclawInvocation(args: string[]) {
  if (process.env.OPENCLAW_CLI_PATH) {
    return {
      command: process.env.OPENCLAW_CLI_PATH,
      args
    };
  }

  if (process.platform === "win32") {
    const appData = process.env.APPDATA ?? "";
    return {
      command: "node",
      args: [`${appData}\\npm\\node_modules\\openclaw\\openclaw.mjs`, ...args]
    };
  }

  return {
    command: "openclaw",
    args
  };
}

export function parseJsonOutput(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return { raw: value };
  }
}

async function ensureWhatsAppAllowedTarget(accountId: string, target: string) {
  if (process.env.OPENCLAW_SYNC_WHATSAPP_ALLOWLIST === "false") {
    return;
  }

  const homeDir = process.env.USERPROFILE ?? process.env.HOME;
  if (!homeDir && !process.env.OPENCLAW_CONFIG_PATH) {
    return;
  }

  const configPath =
    process.env.OPENCLAW_CONFIG_PATH ??
    (process.platform === "win32" ? `${homeDir}\\.openclaw\\openclaw.json` : `${homeDir}/.openclaw/openclaw.json`);

  try {
    const { readFile, writeFile } = await import("node:fs/promises");
    const raw = await readFile(configPath, "utf8");
    const config = JSON.parse(raw) as {
      channels?: {
        whatsapp?: {
          accounts?: Record<string, { dmPolicy?: string; allowFrom?: string[] }>;
        };
      };
    };
    const account = config.channels?.whatsapp?.accounts?.[accountId];

    if (!account || account.dmPolicy !== "allowlist") {
      return;
    }

    const allowFrom = Array.isArray(account.allowFrom) ? account.allowFrom : [];
    if (allowFrom.includes(target)) {
      return;
    }

    account.allowFrom = [...allowFrom, target];
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  } catch {
    // Sending will still surface the underlying gateway error if the target remains blocked.
  }
}

export async function sendWhatsAppMessage(target: string, message: string) {
  const accountId = process.env.OPENCLAW_WHATSAPP_ACCOUNT ?? "saasdev";
  await ensureWhatsAppAllowedTarget(accountId, target);

  const invocation = openclawInvocation([
    "message",
    "send",
    "--account",
    accountId,
    "--channel",
    "whatsapp",
    "--target",
    target,
    "--message",
    message,
    "--json"
  ]);

  const { stdout } = await execFileAsync(invocation.command, invocation.args, {
    timeout: 30000,
    windowsHide: true,
    maxBuffer: 1024 * 1024
  });

  return stdout ? parseJsonOutput(stdout) : null;
}
