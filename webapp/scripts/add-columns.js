const path = require('path');
const { google } = require(path.join(__dirname, '..', 'node_modules', 'googleapis'));

const SPREADSHEET_ID = '14l6eg-JfY5M00NRSmOT-38f5eRsC0xsOqZl9bsggDv4';
const SHEET_ID = 205167958;

const HEADERS = [
  'Evento/Calendario', 'Desde dónde se agendó', 'Modelo de negocio',
  'Objetivo 6 meses', 'Capacidad de inversión', 'Lead Score',
  'Link de llamada', 'Reporte General', 'Concepto de pago',
  'Comprobante 1', 'Comprobante 2', 'Comprobante 3',
  'Fecha Pago 2', 'Fecha Pago 3', 'Quién recibe',
  'Monto ARS', 'Fue Seguimiento', 'De dónde viene el lead',
  'Tag Manychat', 'Notas internas'
];

const COL_WIDTHS = [140,160,160,140,160,80,200,250,120,200,200,200,110,110,120,100,100,160,120,250];

const START_COL = 30; // column AE (0-indexed)

const DROPDOWNS = {
  30: ['Sesión Auditoría Martin', 'Sesión Auditoría Agus', 'Sesión Auditoría Valentino', 'Sesión Auditoría Fede'],
  31: ['Instagram DM', 'Instagram Stories', 'WhatsApp', 'YouTube', 'Página web', 'Referido', 'Otro'],
  32: ['Experto/referente', 'Negocio tradicional', 'Ecommerce/marca', 'Ya posicionado'],
  33: ['Incrementar ventas', 'Volverse referente', 'Crecer horizontal'],
  34: ['Sí dispuesto', 'No pero puede', 'No ni dispuesto'],
  38: ['1era Cuota', 'PIF', '2da Cuota', '3ra Cuota', 'Resell'],
  44: ['Juanma', 'Fran', 'Financiera BECHECK', 'Binance', 'Efectivo', 'Link MP'],
  46: ['Sí', 'No']
};

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '..', 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // 0. Expand grid: add 20 columns
  console.log('Expanding grid by 20 columns...');
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        appendDimension: {
          sheetId: SHEET_ID,
          dimension: 'COLUMNS',
          length: 20,
        },
      }],
    },
  });

  // 1. Write headers to AE1:AX1
  console.log('Writing headers...');
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: '📞 Registro Calls!AE1:AX1',
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS] },
  });
  console.log('Headers written.');

  // Build batchUpdate requests
  const requests = [];

  // 2. Format header row (row 0) for cols 30-49
  requests.push({
    repeatCell: {
      range: { sheetId: SHEET_ID, startRowIndex: 0, endRowIndex: 1, startColumnIndex: START_COL, endColumnIndex: START_COL + 20 },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 139/255, green: 92/255, blue: 246/255 },
          textFormat: {
            foregroundColor: { red: 1, green: 1, blue: 1 },
            bold: true,
            fontFamily: 'Inter',
          },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
    },
  });

  // 3. Format data rows (rows 1-1000) for cols 30-49
  requests.push({
    repeatCell: {
      range: { sheetId: SHEET_ID, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: START_COL, endColumnIndex: START_COL + 20 },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 13/255, green: 13/255, blue: 15/255 },
          textFormat: {
            foregroundColor: { red: 229/255, green: 229/255, blue: 229/255 },
            fontFamily: 'Inter',
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  });

  // 4. Column widths
  for (let i = 0; i < 20; i++) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId: SHEET_ID, dimension: 'COLUMNS', startIndex: START_COL + i, endIndex: START_COL + i + 1 },
        properties: { pixelSize: COL_WIDTHS[i] },
        fields: 'pixelSize',
      },
    });
  }

  // 5. Dropdowns
  for (const [colStr, values] of Object.entries(DROPDOWNS)) {
    const col = parseInt(colStr);
    requests.push({
      setDataValidation: {
        range: { sheetId: SHEET_ID, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: col, endColumnIndex: col + 1 },
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: values.map(v => ({ userEnteredValue: v })),
          },
          showCustomUi: true,
          strict: false,
        },
      },
    });
  }

  // 6. Currency format for col 45 (Monto ARS)
  requests.push({
    repeatCell: {
      range: { sheetId: SHEET_ID, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 45, endColumnIndex: 46 },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'CURRENCY', pattern: '"ARS $"#,##0' },
          backgroundColor: { red: 13/255, green: 13/255, blue: 15/255 },
          textFormat: {
            foregroundColor: { red: 229/255, green: 229/255, blue: 229/255 },
            fontFamily: 'Inter',
          },
        },
      },
      fields: 'userEnteredFormat(numberFormat,backgroundColor,textFormat)',
    },
  });

  // 7. Borders
  const borderColor = { red: 39/255, green: 39/255, blue: 42/255 };
  const borderStyle = { style: 'SOLID', color: borderColor };
  requests.push({
    updateBorders: {
      range: { sheetId: SHEET_ID, startRowIndex: 0, endRowIndex: 1000, startColumnIndex: START_COL, endColumnIndex: START_COL + 20 },
      innerHorizontal: borderStyle,
      innerVertical: borderStyle,
    },
  });

  console.log('Applying formatting...');
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests },
  });

  console.log('Done! 20 columns added and formatted (AE-AX).');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
