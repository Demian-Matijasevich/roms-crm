import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { z } from "zod";
import { google } from "googleapis";
import path from "path";
import { SPREADSHEET_ID } from "@/lib/constants";

function safeStr(s: string) {
  const t = s.trim();
  return (t.startsWith("=") || t.startsWith("+") || t.startsWith("-") || t.startsWith("@")) ? "'" + t : t;
}

const schema = z.object({
  nombre: z.string().min(1).max(100),
  instagram: z.string().max(100).default(""),
  telefono: z.string().max(50).default(""),
  email: z.string().max(100).default(""),
  canal: z.string().max(50).default(""),
  setter: z.string().max(50).default(""),
  closer: z.string().max(50),
  programa: z.string().min(1).max(50),
  cashDia1: z.number().positive(),
  ticketTotal: z.number().min(0).default(0),
  planPago: z.string().max(30).default("PIF"),
  metodoPago: z.string().max(30).default(""),
  receptor: z.string().max(50).default(""),
  contexto: z.string().max(2000).default(""),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mes: z.string().max(20),
});

function getAuth() {
  const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
  if (process.env.GOOGLE_CREDENTIALS) {
    return new google.auth.GoogleAuth({ credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS), scopes });
  }
  return new google.auth.GoogleAuth({ keyFile: path.join(process.cwd(), "credentials.json"), scopes });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSession();
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
    }

    const d = parsed.data;
    const sheets = google.sheets({ version: "v4", auth: getAuth() });

    // Build a full row (A-AX = 50 columns) for the Registro Calls sheet
    const isSale = d.cashDia1 > 0;
    const row = [
      safeStr(d.nombre),        // A: Nombre
      safeStr(d.instagram),     // B: Instagram
      d.fecha,                  // C: FechaLlamada
      d.fecha,                  // D: FechaAgenda
      safeStr(d.setter),        // E: Setter
      safeStr(d.closer),        // F: Closer
      isSale ? "🚀 Cerrado" : "⏳ Pendiente", // G: Estado
      isSale ? "Sí" : "",       // H: Se presentó
      "",                       // I: Calificado
      safeStr(d.programa),      // J: Programa
      safeStr(d.contexto),      // K: ContextoSetter (usamos para notas)
      "Venta por chat",         // L: ContextoCloser
      d.cashDia1,               // M: CashDía1
      d.ticketTotal || d.cashDia1, // N: CashTotal
      d.ticketTotal || d.cashDia1, // O: TicketTotal
      safeStr(d.planPago),      // P: PlanPago
      d.cashDia1,               // Q: Pago1
      "Pagado",                 // R: EstadoP1
      "",                       // S: Pago2
      "",                       // T: EstadoP2
      "",                       // U: Pago3
      "",                       // V: EstadoP3
      d.planPago === "PIF" ? 0 : (d.ticketTotal || d.cashDia1) - d.cashDia1, // W: SaldoPendiente
      d.fecha,                  // X: FechaPago1
      safeStr(d.metodoPago),    // Y: MétodoPago
      safeStr(d.canal),         // Z: Fuente (canal como fuente)
      "Chat directo",           // AA: MedioAgenda
      safeStr(d.email),         // AB: Email
      safeStr(d.telefono),      // AC: Teléfono
      d.mes,                    // AD: Mes
      // v3 fields (AE-AX)
      "",                       // AE: Evento/Calendario
      safeStr(d.canal),         // AF: Desde dónde se agendó
      "",                       // AG: Modelo negocio
      "",                       // AH: Objetivo 6 meses
      "",                       // AI: Capacidad inversión
      "",                       // AJ: Lead Score
      "",                       // AK: Link llamada
      safeStr(d.contexto),      // AL: Reporte General
      d.planPago === "PIF" ? "PIF" : "1era Cuota", // AM: Concepto pago
      "",                       // AN: Comprobante 1
      "",                       // AO: Comprobante 2
      "",                       // AP: Comprobante 3
      "",                       // AQ: Fecha Pago 2
      "",                       // AR: Fecha Pago 3
      safeStr(d.receptor),      // AS: Quién recibe
      "",                       // AT: Monto ARS
      "No",                     // AU: Fue Seguimiento
      safeStr(d.canal),         // AV: De dónde viene el lead
      "",                       // AW: Tag Manychat
      "",                       // AX: Notas internas
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "'📞 Registro Calls'!A:AX",
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[POST /api/venta-directa]", err);
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
