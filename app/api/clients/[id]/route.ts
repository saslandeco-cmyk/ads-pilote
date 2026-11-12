import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clientId = Number(id);

  if (!Number.isInteger(clientId)) {
    return NextResponse.json({ error: "id invalide" }, { status: 400 });
  }

  const body = await request.json();
  const update: { sector?: string; targetCpa?: string | null } = {};

  if (typeof body.sector === "string") {
    update.sector = body.sector;
  }
  if (body.targetCpa === null) {
    update.targetCpa = null;
  } else if (typeof body.targetCpa === "number") {
    update.targetCpa = String(body.targetCpa);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Aucun champ valide fourni (sector: string, targetCpa: number | null)" }, { status: 400 });
  }

  const [client] = await db.update(clients).set(update).where(eq(clients.id, clientId)).returning();

  if (!client) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }

  return NextResponse.json(client);
}
