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
  const DARK_BG = rgb(13, 13, 15);
  const HEADER_BG = rgb(24, 24, 27);
  const WHITE = rgb(229, 229, 229);
  const GREEN = rgb(34, 197, 94);
  const RED = rgb(239, 68, 68);
  const YELLOW = rgb(234, 179, 8);
  const MUTED = rgb(113, 113, 122);
  const CARD_BORDER = rgb(39, 39, 42);

  const requests = [];

  // ══════════════════════════════════════
  // 💳 Registro de Pagos (id: 289901995)
  // ══════════════════════════════════════
  const pagosId = 289901995;

  // Fix headers first — add "Receptor" column that's missing
  await sheets.spreadsheets.values.update({
    spreadsheetId: ssId,
    range: "'💳 Registro de Pagos'!A1:L1",
    valueInputOption: 'RAW',
    requestBody: { values: [['Fecha', 'Programa', 'Nombre del Cliente', 'Teléfono', 'Monto USD', 'Closer', 'Setter', 'Comprobante', 'Concepto', 'Receptor', 'Fuente', 'Mes']] },
  });

  // Header format
  requests.push({
    repeatCell: {
      range: { sheetId: pagosId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 12 },
      cell: { userEnteredFormat: {
        backgroundColor: PURPLE,
        textFormat: { foregroundColor: rgb(255,255,255), bold: true, fontSize: 10, fontFamily: 'Inter' },
        horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE',
      }},
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
    }
  });

  // Data rows
  requests.push({
    repeatCell: {
      range: { sheetId: pagosId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 12 },
      cell: { userEnteredFormat: {
        backgroundColor: DARK_BG,
        textFormat: { foregroundColor: WHITE, fontSize: 10, fontFamily: 'Inter' },
        verticalAlignment: 'MIDDLE',
      }},
      fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)',
    }
  });

  // Freeze header + column widths
  requests.push({
    updateSheetProperties: {
      properties: { sheetId: pagosId, gridProperties: { frozenRowCount: 1 } },
      fields: 'gridProperties.frozenRowCount',
    }
  });

  const pagosWidths = [110, 140, 180, 130, 100, 110, 110, 200, 120, 120, 100, 80];
  for (let i = 0; i < pagosWidths.length; i++) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId: pagosId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: pagosWidths[i] }, fields: 'pixelSize',
      }
    });
  }

  // Currency format for Monto (col E = index 4)
  requests.push({
    repeatCell: {
      range: { sheetId: pagosId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 4, endColumnIndex: 5 },
      cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0' } } },
      fields: 'userEnteredFormat.numberFormat',
    }
  });

  // Borders
  requests.push({
    updateBorders: {
      range: { sheetId: pagosId, startRowIndex: 0, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 12 },
      innerHorizontal: { style: 'SOLID', width: 1, color: CARD_BORDER },
      innerVertical: { style: 'SOLID', width: 1, color: CARD_BORDER },
    }
  });

  // ══════════════════════════════════════
  // 💸 Gastos (id: 297306174)
  // ══════════════════════════════════════
  const gastosId = 297306174;

  requests.push({
    repeatCell: {
      range: { sheetId: gastosId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 7 },
      cell: { userEnteredFormat: {
        backgroundColor: RED,
        textFormat: { foregroundColor: rgb(255,255,255), bold: true, fontSize: 10, fontFamily: 'Inter' },
        horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE',
      }},
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
    }
  });

  requests.push({
    repeatCell: {
      range: { sheetId: gastosId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 7 },
      cell: { userEnteredFormat: {
        backgroundColor: DARK_BG,
        textFormat: { foregroundColor: WHITE, fontSize: 10, fontFamily: 'Inter' },
        verticalAlignment: 'MIDDLE',
      }},
      fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)',
    }
  });

  const gastosWidths = [110, 200, 110, 140, 120, 120, 100];
  for (let i = 0; i < gastosWidths.length; i++) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId: gastosId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: gastosWidths[i] }, fields: 'pixelSize',
      }
    });
  }

  // Currency for Monto (col C = index 2)
  requests.push({
    repeatCell: {
      range: { sheetId: gastosId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 2, endColumnIndex: 3 },
      cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0' } } },
      fields: 'userEnteredFormat.numberFormat',
    }
  });

  // Conditional: Estado = Pagado → green
  requests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId: gastosId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 6, endColumnIndex: 7 }],
        booleanRule: {
          condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Pagado' }] },
          format: { textFormat: { foregroundColor: GREEN, bold: true } },
        }
      }, index: 0,
    }
  });

  requests.push({
    updateBorders: {
      range: { sheetId: gastosId, startRowIndex: 0, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 7 },
      innerHorizontal: { style: 'SOLID', width: 1, color: CARD_BORDER },
      innerVertical: { style: 'SOLID', width: 1, color: CARD_BORDER },
    }
  });

  // ══════════════════════════════════════
  // 📋 Reportes Setter (id: 79657224)
  // ══════════════════════════════════════
  const setterId = 79657224;

  // Fix headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: ssId,
    range: "'📋 Reportes Setter'!A1:F1",
    valueInputOption: 'RAW',
    requestBody: { values: [['Fecha', 'Setter', 'Conversaciones', 'Respuestas Historias', 'Calendarios Enviados', 'Notas']] },
  });

  requests.push({
    repeatCell: {
      range: { sheetId: setterId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 6 },
      cell: { userEnteredFormat: {
        backgroundColor: YELLOW,
        textFormat: { foregroundColor: rgb(0,0,0), bold: true, fontSize: 10, fontFamily: 'Inter' },
        horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE',
      }},
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
    }
  });

  requests.push({
    repeatCell: {
      range: { sheetId: setterId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 6 },
      cell: { userEnteredFormat: {
        backgroundColor: DARK_BG,
        textFormat: { foregroundColor: WHITE, fontSize: 10, fontFamily: 'Inter' },
        verticalAlignment: 'MIDDLE',
      }},
      fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)',
    }
  });

  requests.push({
    updateSheetProperties: {
      properties: { sheetId: setterId, gridProperties: { frozenRowCount: 1 } },
      fields: 'gridProperties.frozenRowCount',
    }
  });

  const setterWidths = [110, 120, 130, 150, 150, 250];
  for (let i = 0; i < setterWidths.length; i++) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId: setterId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: setterWidths[i] }, fields: 'pixelSize',
      }
    });
  }

  // Tab color
  requests.push({
    updateSheetProperties: {
      properties: { sheetId: setterId, tabColor: { red: 234/255, green: 179/255, blue: 8/255 } },
      fields: 'tabColor',
    }
  });

  requests.push({
    updateBorders: {
      range: { sheetId: setterId, startRowIndex: 0, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 6 },
      innerHorizontal: { style: 'SOLID', width: 1, color: CARD_BORDER },
      innerVertical: { style: 'SOLID', width: 1, color: CARD_BORDER },
    }
  });

  // ══════════════════════════════════════
  // 🔄 Seguimientos (id: 1290835584)
  // ══════════════════════════════════════
  const segId = 1290835584;

  // Tab color
  requests.push({
    updateSheetProperties: {
      properties: { sheetId: segId, tabColor: { red: 234/255, green: 179/255, blue: 8/255 } },
      fields: 'tabColor',
    }
  });

  // ══════════════════════════════════════
  // 👥 Payroll (id: 243738312) — format as table
  // ══════════════════════════════════════
  const payrollId = 243738312;

  requests.push({
    repeatCell: {
      range: { sheetId: payrollId, startRowIndex: 0, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 10 },
      cell: { userEnteredFormat: {
        backgroundColor: PURPLE,
        textFormat: { foregroundColor: rgb(255,255,255), bold: true, fontSize: 11, fontFamily: 'Inter' },
        horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE',
      }},
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
    }
  });

  requests.push({
    repeatCell: {
      range: { sheetId: payrollId, startRowIndex: 2, endRowIndex: 100, startColumnIndex: 0, endColumnIndex: 10 },
      cell: { userEnteredFormat: {
        backgroundColor: DARK_BG,
        textFormat: { foregroundColor: WHITE, fontSize: 10, fontFamily: 'Inter' },
        verticalAlignment: 'MIDDLE',
      }},
      fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)',
    }
  });

  requests.push({
    updateBorders: {
      range: { sheetId: payrollId, startRowIndex: 0, endRowIndex: 100, startColumnIndex: 0, endColumnIndex: 10 },
      innerHorizontal: { style: 'SOLID', width: 1, color: CARD_BORDER },
      innerVertical: { style: 'SOLID', width: 1, color: CARD_BORDER },
    }
  });

  // ══════════════════════════════════════
  // EXECUTE ALL
  // ══════════════════════════════════════
  console.log(`Sending ${requests.length} formatting requests...`);
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: ssId, requestBody: { requests } });
  console.log('All sheets formatted!');
}

main().catch(e => console.error('Error:', e.message));
