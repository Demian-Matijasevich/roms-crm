// webapp/app/api/pagos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { appendPayment } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      fecha,
      producto,
      nombre,
      telefono,
      monto,
      closer,
      setter,
      comprobante,
      concepto,
      fuente,
      mes,
    } = body;

    if (!nombre) {
      return NextResponse.json({ error: "nombre requerido" }, { status: 400 });
    }

    if (!concepto) {
      return NextResponse.json({ error: "concepto requerido" }, { status: 400 });
    }

    if (typeof monto !== "number" || monto <= 0) {
      return NextResponse.json({ error: "monto debe ser mayor a 0" }, { status: 400 });
    }

    await appendPayment({
      fecha: fecha ?? "",
      producto: producto ?? "",
      nombre: nombre ?? "",
      telefono: telefono ?? "",
      monto: typeof monto === "number" ? monto : 0,
      closer: closer ?? "",
      setter: setter ?? "",
      comprobante: comprobante ?? "",
      concepto: concepto ?? "",
      fuente: fuente ?? "",
      mes: mes ?? "",
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[POST /api/pagos]", err);
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
