import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { seguimientoSchema } from "@/lib/schemas";
import { appendSeguimiento, fetchSeguimientos, updateCallFields } from "@/lib/sheets";

export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const seguimientos = await fetchSeguimientos();
  return NextResponse.json(seguimientos);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSession();
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const parsed = seguimientoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
    }

    await appendSeguimiento(parsed.data);

    if (parsed.data.tipo.startsWith("Seguimiento")) {
      await updateCallFields(parsed.data.leadRowIndex, { fueSeguimiento: "Sí" });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[POST /api/seguimientos]", err);
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
