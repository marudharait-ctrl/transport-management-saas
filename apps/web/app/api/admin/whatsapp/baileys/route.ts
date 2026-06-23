import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/auth";
import { getBaileysSessionStatus, startBaileysQrSession, stopBaileysSession } from "@/lib/baileys-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireApiAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (user.role !== "ADMIN") {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user };
}

function sessionNameFromUrl(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("sessionName") ?? "marudhara-main";
}

export async function GET(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.error) {
    return auth.error;
  }

  return Response.json(getBaileysSessionStatus(sessionNameFromUrl(request)));
}

export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.error) {
    return auth.error;
  }

  const body = (await request.json().catch(() => ({}))) as { sessionName?: string };
  const sessionName = body.sessionName ?? "marudhara-main";
  const qr = await startBaileysQrSession(sessionName);

  if (!qr) {
    return Response.json({
      ...getBaileysSessionStatus(sessionName),
      qrDataUrl: null
    });
  }

  return Response.json({
    ...getBaileysSessionStatus(sessionName),
    qrDataUrl: await QRCode.toDataURL(qr, {
      errorCorrectionLevel: "M",
      margin: 1,
      scale: 7
    })
  });
}

export async function DELETE(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.error) {
    return auth.error;
  }

  return Response.json(await stopBaileysSession(sessionNameFromUrl(request)));
}
