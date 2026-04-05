import { NextRequest, NextResponse } from "next/server";
import { updateCallFields } from "@/lib/sheets";

const EDITABLE_FIELDS = [
  "nombre", "instagram", "closer", "setter", "programa",
  "email", "telefono", "cashTotal", "ticketTotal",
  "saldoPendiente", "planPago", "estado", "contextoCloser",
  "metodoPago", "fuente", "medioAgenda",
];

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { rowIndex, fields } = body;

    if (!rowIndex || typeof rowIndex !== "number") {
      return NextResponse.json({ error: "rowIndex requerido" }, { status: 400 });
    }

    if (!fields || typeof fields !== "object" || Object.keys(fields).length === 0) {
      return NextResponse.json({ error: "fields requerido" }, { status: 400 });
    }

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
