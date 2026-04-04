// webapp/app/api/reporte-setter/route.ts
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import path from "path";
import { SPREADSHEET_ID } from "@/lib/constants";

function getAuth() {
  return new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), "credentials.json"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      fecha,
      setter,
      conversacionesIniciadas,
      respuestasHistorias,
      calendariosEnviados,
      notas,
    } = body;

    // Validations
    if (!fecha) {
      return NextResponse.json({ error: "Fecha requerida" }, { status: 400 });
    }
    if (!setter) {
      return NextResponse.json({ error: "Setter requerido" }, { status: 400 });
    }
    if (
      typeof conversacionesIniciadas !== "number" ||
      typeof respuestasHistorias !== "number" ||
      typeof calendariosEnviados !== "number"
    ) {
      return NextResponse.json(
        { error: "Valores numéricos requeridos" },
        { status: 400 }
      );
    }

    const sheets = getSheets();

    // Try to append to "📋 Reportes Setter" sheet
    // If it doesn't exist, the API will fail gracefully
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "'📋 Reportes Setter'!A:F",
        valueInputOption: "RAW",
        requestBody: {
          values: [[
            fecha,
            setter,
            conversacionesIniciadas,
            respuestasHistorias,
            calendariosEnviados,
            notas || "",
          ]],
        },
      });
    } catch (sheetError: unknown) {
      // If sheet doesn't exist, try a different sheet or log for later creation
      console.error("[reporte-setter] Sheet append failed:", sheetError);
      const err = sheetError as any;
      if (err?.status === 400 && err?.message?.includes("range")) {
        // Sheet might not exist yet - that's OK per task spec
        throw new Error(
          "La hoja '📋 Reportes Setter' no existe aún. Contactá a un admin para crearla."
        );
      }
      throw sheetError;
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[POST /api/reporte-setter]", err);
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
