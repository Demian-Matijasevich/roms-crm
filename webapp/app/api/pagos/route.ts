// webapp/app/api/pagos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { appendPayment } from "@/lib/sheets";
import { requireSession } from "@/lib/auth";
import { pagoSchema } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSession();
    if ("error" in auth) return auth.error;

    const body = await req.json();

    const parsed = pagoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
    }

    await appendPayment(parsed.data);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[POST /api/pagos]", err);
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
