import path from "node:path";

type BaileysSessionStatus = "idle" | "qr" | "connecting" | "connected" | "disconnected" | "error";

type ManagedBaileysSession = {
  sessionName: string;
  status: BaileysSessionStatus;
  qr?: string;
  phone?: string;
  error?: string;
  updatedAt: string;
  socket?: {
    end(error?: Error): void;
    sendMessage(jid: string, content: { text: string }): Promise<{ key?: { id?: string; remoteJid?: string } } | undefined>;
    user?: { id?: string };
    ev: {
      on(event: "creds.update", listener: () => void | Promise<void>): void;
      on(event: "connection.update", listener: (update: ConnectionUpdate) => void): void;
    };
  };
  qrWaiters: Array<(qr: string) => void>;
  connectionWaiters: Array<() => void>;
};

type ConnectionUpdate = {
  qr?: string;
  connection?: "open" | "close" | "connecting";
  lastDisconnect?: {
    error?: Error;
  };
};

const globalForBaileys = globalThis as typeof globalThis & {
  tmsBaileysSessions?: Map<string, ManagedBaileysSession>;
};

const sessions = globalForBaileys.tmsBaileysSessions ?? new Map<string, ManagedBaileysSession>();
globalForBaileys.tmsBaileysSessions = sessions;

function cleanSessionName(value: string) {
  const cleaned = value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
  return cleaned || "default";
}

function sessionDirectory(sessionName: string) {
  return path.join(process.cwd(), ".baileys-sessions", cleanSessionName(sessionName));
}

function getOrCreateSession(sessionName: string) {
  const key = cleanSessionName(sessionName);
  const existing = sessions.get(key);

  if (existing) {
    return existing;
  }

  const session: ManagedBaileysSession = {
    sessionName: key,
    status: "idle",
    updatedAt: new Date().toISOString(),
    qrWaiters: [],
    connectionWaiters: []
  };
  sessions.set(key, session);
  return session;
}

function publicStatus(session: ManagedBaileysSession) {
  return {
    sessionName: session.sessionName,
    status: session.status,
    phone: session.phone,
    error: session.error,
    updatedAt: session.updatedAt,
    hasQr: Boolean(session.qr)
  };
}

export function getBaileysSessionStatus(sessionName: string) {
  return publicStatus(getOrCreateSession(sessionName));
}

export async function stopBaileysSession(sessionName: string) {
  const session = getOrCreateSession(sessionName);
  session.socket?.end(new Error("Session stopped by admin"));
  session.socket = undefined;
  session.qr = undefined;
  session.status = "disconnected";
  session.updatedAt = new Date().toISOString();
  return publicStatus(session);
}

export async function startBaileysQrSession(sessionName: string) {
  const session = getOrCreateSession(sessionName);

  if (session.qr) {
    return session.qr;
  }

  if (session.status === "connected") {
    return null;
  }

  if (!session.socket) {
    session.status = "connecting";
    session.error = undefined;
    session.updatedAt = new Date().toISOString();

    const [{ default: makeWASocket, fetchLatestBaileysVersion, useMultiFileAuthState: createMultiFileAuthState }, { default: P }] =
      await Promise.all([import("@whiskeysockets/baileys"), import("pino")]);
    const logger = P({ level: process.env.BAILEYS_LOG_LEVEL ?? "silent" });
    const { state, saveCreds } = await createMultiFileAuthState(sessionDirectory(session.sessionName));
    const { version } = await fetchLatestBaileysVersion();
    const socket = makeWASocket({
      auth: state,
      browser: ["Marudhara TMS", "Chrome", "1.0.0"],
      logger,
      markOnlineOnConnect: false,
      printQRInTerminal: false,
      version
    });

    session.socket = socket as ManagedBaileysSession["socket"];

    socket.ev.on("creds.update", saveCreds);
    socket.ev.on("connection.update", (update) => {
      if (update.qr) {
        session.qr = update.qr;
        session.status = "qr";
        session.updatedAt = new Date().toISOString();
        for (const resolve of session.qrWaiters.splice(0)) {
          resolve(update.qr);
        }
      }

      if (update.connection === "open") {
        session.status = "connected";
        session.qr = undefined;
        session.phone = socket.user?.id?.split(":")[0] ?? socket.user?.id;
        session.updatedAt = new Date().toISOString();
        for (const resolve of session.connectionWaiters.splice(0)) {
          resolve();
        }
      }

      if (update.connection === "close") {
        session.status = "disconnected";
        session.socket = undefined;
        session.qr = undefined;
        session.error = update.lastDisconnect?.error?.message;
        session.updatedAt = new Date().toISOString();
      }
    });
  }

  return new Promise<string | null>((resolve, reject) => {
    if (session.qr) {
      resolve(session.qr);
      return;
    }

    if (session.status === "connected") {
      resolve(null);
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error("QR code was not ready yet. Please try again."));
    }, 25000);

    session.qrWaiters.push((qr) => {
      clearTimeout(timeout);
      resolve(qr);
    });
  });
}

function waitForConnection(session: ManagedBaileysSession) {
  return new Promise<void>((resolve, reject) => {
    if (session.status === "connected") {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error("WhatsApp number is not connected yet. Generate and scan the QR first."));
    }, 20000);

    session.connectionWaiters.push(() => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function whatsappJid(target: string) {
  const digits = target.replace(/\D/g, "");
  if (!digits) {
    throw new Error("Test recipient WhatsApp number is required.");
  }

  return `${digits}@s.whatsapp.net`;
}

export async function sendBaileysTextMessage(sessionName: string, target: string, message: string) {
  const session = getOrCreateSession(sessionName);

  if (session.status !== "connected") {
    const qr = await startBaileysQrSession(session.sessionName);
    if (qr) {
      throw new Error("WhatsApp number is waiting for QR scan. Scan the QR before sending a test message.");
    }
  }

  await waitForConnection(session);

  if (!session.socket) {
    throw new Error("WhatsApp connection is not available.");
  }

  return session.socket.sendMessage(whatsappJid(target), { text: message });
}
