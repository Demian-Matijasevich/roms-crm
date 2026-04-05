// webapp/app/api/llamadas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { appendCallResult } from "@/lib/sheets";
import { requireSession } from "@/lib/auth";
import { llamadaSchema } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSession();
    if ("error" in auth) return auth.error;

    const body = await req.json();

    const parsed = llamadaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
    }
    const { rowIndex, estado, sePresentó, calificado, programa, contextoCloser, cashDia1, planPago, pago1, metodoPago } = parsed.data;

    await appendCallResult(
      {
        estado,
        sePresentó,
        calificado,
        programa,
        contextoCloser,
        cashDia1,
        planPago,
        pago1,
        metodoPago,
      },
      rowIndex
    );

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[POST /api/llamadas]", err);
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
