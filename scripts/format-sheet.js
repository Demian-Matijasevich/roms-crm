const { google } = require(require('path').join(__dirname, '..', 'webapp', 'node_modules', 'googleapis'));
const fs = require('fs');
const path = require('path');

async function main() {
  const creds = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'webapp', 'credentials.json'), 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const ssId = '14l6eg-JfY5M00NRSmOT-38f5eRsC0xsOqZl9bsggDv4';
  const sheetId = 205167958;

  const rgb = (r, g, b) => ({ red: r/255, green: g/255, blue: b/255 });
  const DARK_BG = rgb(13, 13, 15);
  const HEADER_BG = rgb(24, 24, 27);
  const PURPLE = rgb(139, 92, 246);
  const GREEN = rgb(34, 197, 94);
  const RED = rgb(239, 68, 68);
  const YELLOW = rgb(234, 179, 8);
  const WHITE = rgb(229, 229, 229);
  const CARD_BORDER = rgb(39, 39, 42);

  const requests = [];

  // 1. HEADER ROW
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 30 },
      cell: {
        userEnteredFormat: {
          backgroundColor: PURPLE,
          textFormat: { foregroundColor: rgb(255, 255, 255), bold: true, fontSize: 10, fontFamily: 'Inter' },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
        }
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
    }
  });

  // 2. DATA ROWS
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 30 },
      cell: {
        userEnteredFormat: {
          backgroundColor: DARK_BG,
          textFormat: { foregroundColor: WHITE, fontSize: 10, fontFamily: 'Inter' },
          verticalAlignment: 'MIDDLE',
        }
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)',
    }
  });

  // 4. FREEZE
  requests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 1, frozenColumnCount: 2 } },
      fields: 'gridProperties.frozenRowCount,gridProperties.frozenColumnCount',
    }
  });

  // 5. COLUMN WIDTHS
  const widths = [160,130,110,110,100,110,140,100,90,120,250,200,100,100,100,110,90,100,90,100,90,100,110,110,110,120,120,180,140,80];
  for (let i = 0; i < widths.length; i++) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: widths[i] },
        fields: 'pixelSize',
      }
    });
  }

  // 6. HEADER HEIGHT
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 36 },
      fields: 'pixelSize',
    }
  });

  // 7. DROPDOWNS
  const dropdowns = [
    { col: 6, values: ['\u23f3 Pendiente','\ud83d\ude80 Cerrado','\u26a0\ufe0f No Cierre','\ud83d\udd04 Seguimiento','\ud83d\udcc5 Re-programada','\ud83d\udea8 Cancelada','\ud83d\udcb0 Reserva','Adentro en Seguimiento'] },
    { col: 7, values: ['S\u00ed','No'] },
    { col: 8, values: ['S\u00ed','No','Parcial'] },
    { col: 9, values: ['ROMS 7','Consultor\u00eda','Omnipresencia','Multicuentas'] },
    { col: 15, values: ['PIF','Cuotas (3)'] },
    { col: 24, values: ['Transferencia','Efectivo','Tarjeta','Crypto','Otro'] },
    { col: 5, values: ['Juan Mart\u00edn','Agust\u00edn','Valentino','Fede'] },
    { col: 4, values: ['Valentino','Guille'] },
  ];
  for (const dd of dropdowns) {
    requests.push({
      setDataValidation: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: dd.col, endColumnIndex: dd.col + 1 },
        rule: {
          condition: { type: 'ONE_OF_LIST', values: dd.values.map(v => ({ userEnteredValue: v })) },
          showCustomUi: true, strict: false,
        }
      }
    });
  }

  // Estado Pagos dropdowns (cols 17, 19, 21)
  for (const col of [17, 19, 21]) {
    requests.push({
      setDataValidation: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: col, endColumnIndex: col + 1 },
        rule: {
          condition: { type: 'ONE_OF_LIST', values: ['Pagado','Pendiente','Vencido'].map(v => ({ userEnteredValue: v })) },
          showCustomUi: true, strict: false,
        }
      }
    });
  }

  // 8. CONDITIONAL FORMATTING
  const condFormats = [
    { col: 6, type: 'TEXT_CONTAINS', value: 'Cerrado', color: GREEN, bold: true },
    { col: 6, type: 'TEXT_CONTAINS', value: 'No Cierre', color: RED },
    { col: 6, type: 'TEXT_CONTAINS', value: 'Seguimiento', color: YELLOW },
    { col: 6, type: 'TEXT_CONTAINS', value: 'Cancelada', color: RED, strike: true },
    { col: 22, type: 'NUMBER_GREATER', value: '0', color: YELLOW, bold: true },
    { col: 12, type: 'NUMBER_GREATER', value: '0', color: GREEN, bold: true },
    { col: 7, type: 'TEXT_EQ', value: 'No', color: RED },
    { col: 7, type: 'TEXT_EQ', value: 'S\u00ed', color: GREEN },
  ];
  condFormats.forEach((cf, idx) => {
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: cf.col, endColumnIndex: cf.col + 1 }],
          booleanRule: {
            condition: { type: cf.type, values: [{ userEnteredValue: cf.value }] },
            format: { textFormat: { foregroundColor: cf.color, bold: cf.bold || false, strikethrough: cf.strike || false } },
          }
        },
        index: idx,
      }
    });
  });

  // Estado Pago coloring
  for (const col of [17, 19, 21]) {
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: col, endColumnIndex: col + 1 }],
          booleanRule: {
            condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Pagado' }] },
            format: { textFormat: { foregroundColor: GREEN, bold: true } },
          }
        },
        index: 20,
      }
    });
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: col, endColumnIndex: col + 1 }],
          booleanRule: {
            condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Vencido' }] },
            format: { textFormat: { foregroundColor: RED, bold: true } },
          }
        },
        index: 21,
      }
    });
  }

  // 9. CURRENCY FORMAT
  for (const col of [12, 13, 14, 16, 18, 20, 22]) {
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: col, endColumnIndex: col + 1 },
        cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0' } } },
        fields: 'userEnteredFormat.numberFormat',
      }
    });
  }

  // 10. BORDERS
  requests.push({
    updateBorders: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 30 },
      innerHorizontal: { style: 'SOLID', width: 1, color: CARD_BORDER },
      innerVertical: { style: 'SOLID', width: 1, color: CARD_BORDER },
    }
  });
  requests.push({
    updateBorders: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 30 },
      bottom: { style: 'SOLID_MEDIUM', width: 2, color: PURPLE },
    }
  });

  console.log(`Sending ${requests.length} formatting requests...`);
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: ssId, requestBody: { requests } });
  console.log('Sheet formatted successfully!');
}

main().catch(e => console.error('Error:', e.message));
