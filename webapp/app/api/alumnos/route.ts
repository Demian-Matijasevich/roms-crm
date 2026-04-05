import { NextRequest, NextResponse } from "next/server";
import { updateCallFields } from "@/lib/sheets";
import { requireSession } from "@/lib/auth";
import { alumnoUpdateSchema } from "@/lib/schemas";

const EDITABLE_FIELDS = [
  "nombre", "instagram", "closer", "setter", "programa",
  "email", "telefono", "cashTotal", "ticketTotal",
  "saldoPendiente", "planPago", "estado", "contextoCloser",
  "metodoPago", "fuente", "medioAgenda",
];

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireSession();
    if ("error" in auth) return auth.error;

    const body = await req.json();

    const parsed = alumnoUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    const { rowIndex, fields } = parsed.data;

    // Only allow editable fields
    const safe: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (EDITABLE_FIELDS.includes(key)) {
        safe[key] = value as string | number;
      }
    }

    if (Object.keys(safe).length === 0) {
      return NextResponse.json({ error: "No hay campos válidos para actualizar" }, { status: 400 });
    }

    await updateCallFields(rowIndex, safe);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[PUT /api/alumnos]", err);
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
