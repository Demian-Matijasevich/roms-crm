// webapp/lib/sheets.ts
import { google } from "googleapis";
import path from "path";
import { Llamada, Gasto } from "./types";
import { SPREADSHEET_ID } from "./constants";

function getAuth(readOnly = true) {
  const scopes = [readOnly
    ? "https://www.googleapis.com/auth/spreadsheets.readonly"
    : "https://www.googleapis.com/auth/spreadsheets"];

  // Vercel: credentials from env var (JSON string)
  if (process.env.GOOGLE_CREDENTIALS) {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    return new google.auth.GoogleAuth({ credentials, scopes });
  }

  // Local: credentials from file
  return new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), "credentials.json"),
    scopes,
  });
}

function getSheets(readOnly = true) {
  return google.sheets({ version: "v4", auth: getAuth(readOnly) });
}

function str(r: string[] | undefined, i: number): string {
  return r?.[i]?.trim() ?? "";
}

function num(r: string[] | undefined, i: number): number {
  const v = r?.[i];
  if (!v) return 0;
  const n = parseFloat(v.replace(/[$,]/g, ""));
  return isNaN(n) ? 0 : n;
}

// ── READ ──

export async function fetchLlamadas(): Promise<Llamada[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'📞 Registro Calls'!A2:AD",
  });
  const rows = (res.data.values || []) as string[][];

  return rows.map((r, i) => ({
    rowIndex: i + 2,
    nombre: str(r, 0),
    instagram: str(r, 1),
    fechaLlamada: str(r, 2),
    fechaAgenda: str(r, 3),
    setter: str(r, 4),
    closer: str(r, 5),
    estado: str(r, 6),
    sePresentó: str(r, 7),
    calificado: str(r, 8),
    programa: str(r, 9),
    contextoSetter: str(r, 10),
    contextoCloser: str(r, 11),
    cashDia1: num(r, 12),
    cashTotal: num(r, 13),
    ticketTotal: num(r, 14),
    planPago: str(r, 15),
    pago1: num(r, 16),
    estadoPago1: str(r, 17),
    pago2: num(r, 18),
    estadoPago2: str(r, 19),
    pago3: num(r, 20),
    estadoPago3: str(r, 21),
    saldoPendiente: num(r, 22),
    fechaPago1: str(r, 23),
    metodoPago: str(r, 24),
    fuente: str(r, 25),
    medioAgenda: str(r, 26),
    email: str(r, 27),
    telefono: str(r, 28),
    mes: str(r, 29),
  }));
}

export async function fetchGastos(): Promise<Gasto[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'💸 Gastos'!A2:G",
  });
  const rows = (res.data.values || []) as string[][];

  return rows.map((r, i) => ({
    rowIndex: i + 2,
    fecha: str(r, 0),
    concepto: str(r, 1),
    monto: num(r, 2),
    categoria: str(r, 3),
    billetera: str(r, 4),
    pagadoA: str(r, 5),
    estado: str(r, 6),
  }));
}

// ── WRITE ──

export async function appendCallResult(data: {
  estado: string;
  sePresentó: string;
  calificado: string;
  programa: string;
  contextoCloser: string;
  cashDia1: number;
  planPago: string;
  pago1: number;
  metodoPago: string;
}, rowIndex: number): Promise<void> {
  const sheets = getSheets(false);
  const updates = [
    { range: `'📞 Registro Calls'!G${rowIndex}`, values: [[data.estado]] },
    { range: `'📞 Registro Calls'!H${rowIndex}`, values: [[data.sePresentó]] },
    { range: `'📞 Registro Calls'!I${rowIndex}`, values: [[data.calificado]] },
    { range: `'📞 Registro Calls'!J${rowIndex}`, values: [[data.programa]] },
    { range: `'📞 Registro Calls'!L${rowIndex}`, values: [[data.contextoCloser]] },
    { range: `'📞 Registro Calls'!M${rowIndex}`, values: [[data.cashDia1]] },
    { range: `'📞 Registro Calls'!P${rowIndex}`, values: [[data.planPago]] },
    { range: `'📞 Registro Calls'!Q${rowIndex}`, values: [[data.pago1]] },
    { range: `'📞 Registro Calls'!R${rowIndex}`, values: [["Pagado"]] },
    { range: `'📞 Registro Calls'!Y${rowIndex}`, values: [[data.metodoPago]] },
  ];

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: "RAW",
      data: updates,
    },
  });
}

export async function appendPayment(data: {
  fecha: string;
  producto: string;
  nombre: string;
  telefono: string;
  monto: number;
  closer: string;
  setter: string;
  comprobante: string;
  concepto: string;
  fuente: string;
  mes: string;
}): Promise<void> {
  const sheets = getSheets(false);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "'💳 Registro de Pagos'!A:K",
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        data.fecha, data.producto, data.nombre, data.telefono,
        data.monto, data.closer, data.setter, data.comprobante,
        data.concepto, data.fuente, data.mes,
      ]],
    },
  });
}
