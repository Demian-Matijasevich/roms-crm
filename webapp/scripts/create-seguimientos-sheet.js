const { google } = require(require('path').join(__dirname, '..', 'node_modules', 'googleapis'));
const fs = require('fs');
const path = require('path');

async function main() {
  const creds = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'credentials.json'), 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const ssId = '14l6eg-JfY5M00NRSmOT-38f5eRsC0xsOqZl9bsggDv4';

  const rgb = (r, g, b) => ({ red: r / 255, green: g / 255, blue: b / 255 });
  const PURPLE = rgb(139, 92, 246);
  const DARK_BG = rgb(13, 13, 15);
  const WHITE = rgb(229, 229, 229);
  const CARD_BORDER = rgb(39, 39, 42);

  // 1. Create sheet
  console.log('Creating sheet...');
  const addSheet = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: ssId,
    requestBody: {
      requests: [{
        addSheet: {
          properties: {
            title: '\uD83D\uDD04 Seguimientos',
            gridProperties: { rowCount: 1000, columnCount: 8, frozenRowCount: 1 },
          }
        }
      }]
    }
  });

  const sheetId = addSheet.data.replies[0].addSheet.properties.sheetId;
  console.log(`Sheet created with ID: ${sheetId}`);

  // 2. Write headers
  const headers = ['Fecha', 'Lead', 'Closer', 'Tipo', 'Nota', 'Resultado', 'Fecha Pr\u00f3ximo Contacto', 'Row Index Lead'];
  await sheets.spreadsheets.values.update({
    spreadsheetId: ssId,
    range: `'\uD83D\uDD04 Seguimientos'!A1:H1`,
    valueInputOption: 'RAW',
    requestBody: { values: [headers] },
  });
  console.log('Headers written.');

  // 3-8. Formatting requests
  const requests = [];

  // 3. Header format: purple bg, white bold, center, Inter 10
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 },
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

  // 4. Data rows format: dark bg, light text, Inter
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 8 },
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

  // 5. Column widths
  const widths = [110, 160, 110, 140, 300, 200, 140, 80];
  for (let i = 0; i < widths.length; i++) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: widths[i] },
        fields: 'pixelSize',
      }
    });
  }

  // 6. Tipo dropdown (col index 3)
  requests.push({
    setDataValidation: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 3, endColumnIndex: 4 },
      rule: {
        condition: {
          type: 'ONE_OF_LIST',
          values: ['Call inicial', 'Seguimiento #1', 'Seguimiento #2', 'Seguimiento #3', 'Re-agenda', 'Cierre', 'Descarte']
            .map(v => ({ userEnteredValue: v })),
        },
        showCustomUi: true,
        strict: false,
      }
    }
  });

  // 7. Borders: inner horizontal + inner vertical
  requests.push({
    updateBorders: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 8 },
      innerHorizontal: { style: 'SOLID', width: 1, color: CARD_BORDER },
      innerVertical: { style: 'SOLID', width: 1, color: CARD_BORDER },
    }
  });

  // 8. Header bottom border: SOLID_MEDIUM purple
  requests.push({
    updateBorders: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 },
      bottom: { style: 'SOLID_MEDIUM', width: 2, color: PURPLE },
    }
  });

  console.log(`Sending ${requests.length} formatting requests...`);
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: ssId, requestBody: { requests } });
  console.log('Seguimientos sheet created and formatted successfully!');
}

main().catch(e => console.error('Error:', e.message));
