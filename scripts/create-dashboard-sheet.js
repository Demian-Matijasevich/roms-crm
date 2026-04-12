const { google } = require(require('path').join(__dirname, '..', 'webapp', 'node_modules', 'googleapis'));
const fs = require('fs');
const path = require('path');

async function main() {
  const creds = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'webapp', 'credentials.json'), 'utf8'));
  const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const sheets = google.sheets({ version: 'v4', auth });
  const ssId = '14l6eg-JfY5M00NRSmOT-38f5eRsC0xsOqZl9bsggDv4';

  const rgb = (r, g, b) => ({ red: r/255, green: g/255, blue: b/255 });
  const PURPLE = rgb(139, 92, 246);
  const DARK = rgb(13, 13, 15);
  const DARK2 = rgb(24, 24, 27);
  const WHITE = rgb(229, 229, 229);
  const GREEN = rgb(34, 197, 94);
  const RED = rgb(239, 68, 68);
  const YELLOW = rgb(234, 179, 8);
  const BORDER = rgb(39, 39, 42);

  // Delete existing dashboard sheet if exists
  const info = await sheets.spreadsheets.get({ spreadsheetId: ssId });
  const existingDash = info.data.sheets.find(s => s.properties.title === '📊 Dashboard');
  if (existingDash) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: ssId,
      requestBody: { requests: [{ deleteSheet: { sheetId: existingDash.properties.sheetId } }] },
    });
    console.log('Deleted old dashboard');
  }

  // Create new sheet
  const addRes = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: ssId,
    requestBody: {
      requests: [{
        addSheet: {
          properties: {
            title: '📊 Dashboard',
            index: 0, // First tab
            gridProperties: { rowCount: 50, columnCount: 12 },
            tabColor: { red: 139/255, green: 92/255, blue: 246/255 },
          }
        }
      }]
    }
  });
  const dashId = addRes.data.replies[0].addSheet.properties.sheetId;
  console.log('Created dashboard, id:', dashId);

  // Populate with formulas
  const formulas = [
    // Row 1: Title
    ['📊 ROMS CRM — DASHBOARD EN VIVO', '', '', '', '', '', '', '', '', '', '', ''],
    // Row 2: Subtitle
    ['Actualizado automáticamente desde los datos del Sheet', '', '', '', '', '', '', '', '', '', '', ''],
    // Row 3: Empty
    ['', '', '', '', '', '', '', '', '', '', '', ''],
    // Row 4: KPI Headers
    ['💰 CASH COLLECTED', '', '📞 LLAMADAS', '', '🚀 VENTAS', '', '📊 CIERRE %', '', '🎫 TICKET PROM', '', '💸 GASTOS', ''],
    // Row 5: KPI Values (formulas)
    [
      '=SUMPRODUCT((FIND("Cerrado",\'📞 Registro Calls\'!G2:G)>0)*VALUE(SUBSTITUTE(SUBSTITUTE(\'📞 Registro Calls\'!M2:M,"$",""),",","")))',
      '',
      '=COUNTA(\'📞 Registro Calls\'!A2:A)',
      '',
      '=COUNTIF(\'📞 Registro Calls\'!G2:G,"*Cerrado*")',
      '',
      '=IFERROR(E5/C5*100,0)&"%"',
      '',
      '=IFERROR(A5/E5,0)',
      '',
      '=SUM(\'💸 Gastos\'!C2:C)',
      '',
    ],
    // Row 6: Empty
    ['', '', '', '', '', '', '', '', '', '', '', ''],
    // Row 7: Section header
    ['📈 CASH POR MES', '', '', '', '', '', '👥 CLOSERS', '', '', '', '', ''],
    // Row 8-11: Monthly sparklines + Closer stats
    [
      'Enero', '=SUMPRODUCT((\'📞 Registro Calls\'!AD2:AD="2026-1")*(FIND("Cerrado",\'📞 Registro Calls\'!G2:G)>0)*VALUE(SUBSTITUTE(SUBSTITUTE(\'📞 Registro Calls\'!M2:M,"$",""),",","")))',
      '=SPARKLINE(B8:B11,{"charttype","bar";"color1","#22c55e";"max",MAX(B8:B11)})', '', '', '',
      'Valentino', '=COUNTIFS(\'📞 Registro Calls\'!F2:F,"Valentino",\'📞 Registro Calls\'!G2:G,"*Cerrado*")',
      '=SUMPRODUCT((\'📞 Registro Calls\'!F2:F="Valentino")*(FIND("Cerrado",\'📞 Registro Calls\'!G2:G)>0)*VALUE(SUBSTITUTE(SUBSTITUTE(\'📞 Registro Calls\'!M2:M,"$",""),",","")))',
      '', '', '',
    ],
    [
      'Febrero', '=SUMPRODUCT((\'📞 Registro Calls\'!AD2:AD="2026-2")*(FIND("Cerrado",\'📞 Registro Calls\'!G2:G)>0)*VALUE(SUBSTITUTE(SUBSTITUTE(\'📞 Registro Calls\'!M2:M,"$",""),",","")))',
      '', '', '', '',
      'Fede', '=COUNTIFS(\'📞 Registro Calls\'!F2:F,"Fede",\'📞 Registro Calls\'!G2:G,"*Cerrado*")',
      '=SUMPRODUCT((\'📞 Registro Calls\'!F2:F="Fede")*(FIND("Cerrado",\'📞 Registro Calls\'!G2:G)>0)*VALUE(SUBSTITUTE(SUBSTITUTE(\'📞 Registro Calls\'!M2:M,"$",""),",","")))',
      '', '', '',
    ],
    [
      'Marzo', '=SUMPRODUCT((\'📞 Registro Calls\'!AD2:AD="2026-3")*(FIND("Cerrado",\'📞 Registro Calls\'!G2:G)>0)*VALUE(SUBSTITUTE(SUBSTITUTE(\'📞 Registro Calls\'!M2:M,"$",""),",","")))',
      '', '', '', '',
      'Agustín', '=COUNTIFS(\'📞 Registro Calls\'!F2:F,"Agustín",\'📞 Registro Calls\'!G2:G,"*Cerrado*")',
      '=SUMPRODUCT((\'📞 Registro Calls\'!F2:F="Agustín")*(FIND("Cerrado",\'📞 Registro Calls\'!G2:G)>0)*VALUE(SUBSTITUTE(SUBSTITUTE(\'📞 Registro Calls\'!M2:M,"$",""),",","")))',
      '', '', '',
    ],
    [
      'Abril', '=SUMPRODUCT((\'📞 Registro Calls\'!AD2:AD="2026-4")*(FIND("Cerrado",\'📞 Registro Calls\'!G2:G)>0)*VALUE(SUBSTITUTE(SUBSTITUTE(\'📞 Registro Calls\'!M2:M,"$",""),",","")))',
      '', '', '', '',
      'Juan Martín', '=COUNTIFS(\'📞 Registro Calls\'!F2:F,"Juan Martín",\'📞 Registro Calls\'!G2:G,"*Cerrado*")',
      '=SUMPRODUCT((\'📞 Registro Calls\'!F2:F="Juan Martín")*(FIND("Cerrado",\'📞 Registro Calls\'!G2:G)>0)*VALUE(SUBSTITUTE(SUBSTITUTE(\'📞 Registro Calls\'!M2:M,"$",""),",","")))',
      '', '', '',
    ],
    // Row 12: Empty
    ['', '', '', '', '', '', '', '', '', '', '', ''],
    // Row 13: Pipeline header
    ['📞 PIPELINE', '', '', '', '', '', '💳 CUOTAS POR COBRAR', '', '', '', '', ''],
    // Row 14: Pipeline stats
    [
      '⏳ Pendientes', '=COUNTIF(\'📞 Registro Calls\'!G2:G,"*Pendiente*")',
      '🔄 Seguimiento', '=COUNTIF(\'📞 Registro Calls\'!G2:G,"*Seguimiento*")',
      '🚀 Cerrados', '=COUNTIF(\'📞 Registro Calls\'!G2:G,"*Cerrado*")',
      '❌ Canceladas', '=COUNTIF(\'📞 Registro Calls\'!G2:G,"*Cancelada*")',
      '', '', '', '',
    ],
    // Row 15: Empty
    ['', '', '', '', '', '', '', '', '', '', '', ''],
    // Row 16: Fuentes header
    ['🔍 FUENTES DE LEADS', '', '', '', '', '', '', '', '', '', '', ''],
    // Row 17-20: Top fuentes
    [
      'Instagram', '=COUNTIF(\'📞 Registro Calls\'!Z2:Z,"*Instagram*")',
      'iClosed', '=COUNTIF(\'📞 Registro Calls\'!Z2:Z,"iClosed")',
      'WhatsApp', '=COUNTIF(\'📞 Registro Calls\'!Z2:Z,"*WhatsApp*")',
      'Otro', '=COUNTA(\'📞 Registro Calls\'!Z2:Z)-B17-D17-F17',
      '', '', '', '',
    ],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: ssId,
    range: "'📊 Dashboard'!A1:L18",
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: formulas },
  });
  console.log('Formulas populated');

  // Format the dashboard
  const requests2 = [];

  // Full sheet dark background
  requests2.push({
    repeatCell: {
      range: { sheetId: dashId, startRowIndex: 0, endRowIndex: 50, startColumnIndex: 0, endColumnIndex: 12 },
      cell: { userEnteredFormat: {
        backgroundColor: DARK,
        textFormat: { foregroundColor: WHITE, fontSize: 11, fontFamily: 'Inter' },
      }},
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    }
  });

  // Title row
  requests2.push({
    repeatCell: {
      range: { sheetId: dashId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 12 },
      cell: { userEnteredFormat: {
        backgroundColor: DARK,
        textFormat: { foregroundColor: rgb(167, 139, 250), bold: true, fontSize: 18, fontFamily: 'Inter' },
      }},
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    }
  });

  // Subtitle
  requests2.push({
    repeatCell: {
      range: { sheetId: dashId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 12 },
      cell: { userEnteredFormat: {
        textFormat: { foregroundColor: rgb(113, 113, 122), fontSize: 10 },
      }},
      fields: 'userEnteredFormat.textFormat',
    }
  });

  // KPI header row (row 4)
  requests2.push({
    repeatCell: {
      range: { sheetId: dashId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 12 },
      cell: { userEnteredFormat: {
        textFormat: { foregroundColor: rgb(113, 113, 122), bold: true, fontSize: 9 },
      }},
      fields: 'userEnteredFormat.textFormat',
    }
  });

  // KPI values row (row 5) — big green numbers
  requests2.push({
    repeatCell: {
      range: { sheetId: dashId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 0, endColumnIndex: 12 },
      cell: { userEnteredFormat: {
        textFormat: { foregroundColor: GREEN, bold: true, fontSize: 20 },
        numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0' },
      }},
      fields: 'userEnteredFormat(textFormat,numberFormat)',
    }
  });

  // Section headers (rows 7, 13, 16)
  for (const row of [6, 12, 15]) {
    requests2.push({
      repeatCell: {
        range: { sheetId: dashId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: 12 },
        cell: { userEnteredFormat: {
          backgroundColor: DARK2,
          textFormat: { foregroundColor: PURPLE, bold: true, fontSize: 12 },
        }},
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      }
    });
  }

  // Closer stats — cash in green
  for (const row of [7, 8, 9, 10]) {
    requests2.push({
      repeatCell: {
        range: { sheetId: dashId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 8, endColumnIndex: 9 },
        cell: { userEnteredFormat: {
          textFormat: { foregroundColor: GREEN, bold: true },
          numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0' },
        }},
        fields: 'userEnteredFormat(textFormat,numberFormat)',
      }
    });
  }

  // Cash por mes — values in green
  for (const row of [7, 8, 9, 10]) {
    requests2.push({
      repeatCell: {
        range: { sheetId: dashId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 1, endColumnIndex: 2 },
        cell: { userEnteredFormat: {
          textFormat: { foregroundColor: GREEN, bold: true },
          numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0' },
        }},
        fields: 'userEnteredFormat(textFormat,numberFormat)',
      }
    });
  }

  // Pipeline numbers
  requests2.push({
    repeatCell: {
      range: { sheetId: dashId, startRowIndex: 13, endRowIndex: 14, startColumnIndex: 1, endColumnIndex: 2 },
      cell: { userEnteredFormat: { textFormat: { foregroundColor: PURPLE, bold: true, fontSize: 16 } } },
      fields: 'userEnteredFormat.textFormat',
    }
  });
  requests2.push({
    repeatCell: {
      range: { sheetId: dashId, startRowIndex: 13, endRowIndex: 14, startColumnIndex: 3, endColumnIndex: 4 },
      cell: { userEnteredFormat: { textFormat: { foregroundColor: YELLOW, bold: true, fontSize: 16 } } },
      fields: 'userEnteredFormat.textFormat',
    }
  });
  requests2.push({
    repeatCell: {
      range: { sheetId: dashId, startRowIndex: 13, endRowIndex: 14, startColumnIndex: 5, endColumnIndex: 6 },
      cell: { userEnteredFormat: { textFormat: { foregroundColor: GREEN, bold: true, fontSize: 16 } } },
      fields: 'userEnteredFormat.textFormat',
    }
  });
  requests2.push({
    repeatCell: {
      range: { sheetId: dashId, startRowIndex: 13, endRowIndex: 14, startColumnIndex: 7, endColumnIndex: 8 },
      cell: { userEnteredFormat: { textFormat: { foregroundColor: RED, bold: true, fontSize: 16 } } },
      fields: 'userEnteredFormat.textFormat',
    }
  });

  // Column widths
  const widths = [140, 100, 140, 100, 140, 100, 140, 100, 100, 80, 100, 80];
  for (let i = 0; i < widths.length; i++) {
    requests2.push({
      updateDimensionProperties: {
        range: { sheetId: dashId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: widths[i] }, fields: 'pixelSize',
      }
    });
  }

  // Row heights
  requests2.push({ updateDimensionProperties: {
    range: { sheetId: dashId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
    properties: { pixelSize: 40 }, fields: 'pixelSize',
  }});
  requests2.push({ updateDimensionProperties: {
    range: { sheetId: dashId, dimension: 'ROWS', startIndex: 4, endIndex: 5 },
    properties: { pixelSize: 40 }, fields: 'pixelSize',
  }});

  console.log(`Sending ${requests2.length} format requests...`);
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: ssId, requestBody: { requests: requests2 } });
  console.log('Dashboard sheet created and formatted!');
}

main().catch(e => console.error('Error:', e.message));
