import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { fetchLlamadas } from "@/lib/sheets";
import { isCerrado } from "@/lib/data";

export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const llamadas = await fetchLlamadas();
  const today = new Date().toISOString().split("T")[0];
  const todaySales = llamadas
    .filter(l => isCerrado(l) && (l.fechaLlamada === today || l.fechaAgenda === today))
    .map(l => ({
      closer: l.closer,
      cash: l.cashDia1,
      programa: l.programa,
      nombre: l.nombre,
    }));

  const latest = todaySales[todaySales.length - 1] || null;
  return NextResponse.json({ latest });
}
