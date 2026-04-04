// webapp/app/api/llamadas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { appendCallResult } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      rowIndex,
      estado,
      sePresentó,
      calificado,
      programa,
      contextoCloser,
      cashDia1,
      planPago,
      pago1,
      metodoPago,
    } = body;

    if (!rowIndex || typeof rowIndex !== "number") {
      return NextResponse.json({ error: "rowIndex requerido" }, { status: 400 });
    }

    if (!estado) {
      return NextResponse.json({ error: "estado requerido" }, { status: 400 });
    }

    await appendCallResult(
      {
        estado: estado ?? "",
        sePresentó: sePresentó ?? "",
        calificado: calificado ?? "",
        programa: programa ?? "",
        contextoCloser: contextoCloser ?? "",
        cashDia1: typeof cashDia1 === "number" ? cashDia1 : 0,
        planPago: planPago ?? "",
        pago1: typeof pago1 === "number" ? pago1 : 0,
        metodoPago: metodoPago ?? "",
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
