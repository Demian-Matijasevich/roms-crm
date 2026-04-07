// webapp/lib/sheets.ts
import { google } from "googleapis";
import path from "path";
import { Llamada, Gasto, Seguimiento } from "./types";
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
    range: "'📞 Registro Calls'!A2:AX",
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
    // v3 fields
    eventoCalendario: str(r, 30),
    desdeDonde: str(r, 31),
    modeloNegocio: str(r, 32),
    objetivo6Meses: str(r, 33),
    capacidadInversion: str(r, 34),
    leadScore: str(r, 35),
    linkLlamada: str(r, 36),
    reporteGeneral: str(r, 37),
    conceptoPago: str(r, 38),
    comprobante1: str(r, 39),
    comprobante2: str(r, 40),
    comprobante3: str(r, 41),
    fechaPago2: str(r, 42),
    fechaPago3: str(r, 43),
    quienRecibe: str(r, 44),
    montoARS: num(r, 45),
    fueSeguimiento: str(r, 46),
    deDondeVieneLead: str(r, 47),
    tagManychat: str(r, 48),
    notasInternas: str(r, 49),
  }));
}

export interface Pago {
  fecha: string;
  producto: string;
  nombre: string;
  telefono: string;
  monto: number;
  closer: string;
  setter: string;
  comprobante: string;
  concepto: string;
  receptor: string;
  fuente: string;
  mes: string;
}

export async function fetchPagos(): Promise<Pago[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'💳 Registro de Pagos'!A2:L",
  });
  const rows = (res.data.values || []) as string[][];
  return rows.filter(r => r[0] || r[2]).map(r => ({
    fecha: str(r, 0),
    producto: str(r, 1),
    nombre: str(r, 2),
    telefono: str(r, 3),
    monto: num(r, 4),
    closer: str(r, 5),
    setter: str(r, 6),
    comprobante: str(r, 7),
    concepto: str(r, 8),
    receptor: str(r, 9),
    fuente: str(r, 10),
    mes: str(r, 11),
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
  receptor: string;
  fuente: string;
  mes: string;
}): Promise<void> {
  const sheets = getSheets(false);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "'💳 Registro de Pagos'!A:L",
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        data.fecha, data.producto, data.nombre, data.telefono,
        data.monto, data.closer, data.setter, data.comprobante,
        data.concepto, data.receptor, data.fuente, data.mes,
      ]],
    },
  });
}

// Column mapping: field name → column letter in "📞 Registro Calls"
const CALL_COLUMNS: Record<string, string> = {
  nombre: "A", instagram: "B", fechaLlamada: "C", fechaAgenda: "D",
  setter: "E", closer: "F", estado: "G", sePresentó: "H",
  calificado: "I", programa: "J", contextoSetter: "K", contextoCloser: "L",
  cashDia1: "M", cashTotal: "N", ticketTotal: "O", planPago: "P",
  pago1: "Q", estadoPago1: "R", pago2: "S", estadoPago2: "T",
  pago3: "U", estadoPago3: "V", saldoPendiente: "W", fechaPago1: "X",
  metodoPago: "Y", fuente: "Z", medioAgenda: "AA", email: "AB",
  telefono: "AC", mes: "AD",
  eventoCalendario: "AE", desdeDonde: "AF", modeloNegocio: "AG",
  objetivo6Meses: "AH", capacidadInversion: "AI", leadScore: "AJ",
  linkLlamada: "AK", reporteGeneral: "AL", conceptoPago: "AM",
  comprobante1: "AN", comprobante2: "AO", comprobante3: "AP",
  fechaPago2: "AQ", fechaPago3: "AR", quienRecibe: "AS",
  montoARS: "AT", fueSeguimiento: "AU", deDondeVieneLead: "AV",
  tagManychat: "AW", notasInternas: "AX",
};

export async function updateCallFields(
  rowIndex: number,
  fields: Record<string, string | number>
): Promise<void> {
  const sheets = getSheets(false);
  const updates = Object.entries(fields)
    .filter(([key]) => CALL_COLUMNS[key])
    .map(([key, value]) => ({
      range: `'📞 Registro Calls'!${CALL_COLUMNS[key]}${rowIndex}`,
      values: [[value]],
    }));

  if (updates.length === 0) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { valueInputOption: "RAW", data: updates },
  });
}

export async function fetchSeguimientos(): Promise<Seguimiento[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'🔄 Seguimientos'!A2:H",
  });
  const rows = (res.data.values || []) as string[][];

  return rows.map((r, i) => ({
    rowIndex: i + 2,
    fecha: str(r, 0),
    lead: str(r, 1),
    closer: str(r, 2),
    tipo: str(r, 3),
    nota: str(r, 4),
    resultado: str(r, 5),
    fechaProximoContacto: str(r, 6),
    leadRowIndex: num(r, 7),
  }));
}

export async function appendSeguimiento(data: {
  fecha: string;
  lead: string;
  closer: string;
  tipo: string;
  nota: string;
  resultado: string;
  fechaProximoContacto: string;
  leadRowIndex: number;
}): Promise<void> {
  const sheets = getSheets(false);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "'🔄 Seguimientos'!A:H",
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        data.fecha, data.lead, data.closer, data.tipo,
        data.nota, data.resultado, data.fechaProximoContacto,
        data.leadRowIndex,
      ]],
    },
  });
}
