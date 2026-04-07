const { google } = require(require('path').join(__dirname, '..', 'webapp', 'node_modules', 'googleapis'));
const fs = require('fs');
const path = require('path');

const canceledData = [
  ['rafael','','2026-04-02','rafacanevaro@hotmail.com'],
  ['Nicolas','','2026-04-04','butyou.oficial@gmail.com'],
  ['Pedro Caero','','2026-04-04','pedrocaerotrainer@gmail.com'],
  ['Angie Morillo henriquez','','2026-04-04','angiefmorillo@gmail.com'],
  ['Juli\u00e1n Cantarella','','2026-04-04','juliancantarella@gmail.com'],
  ['Camila','','2026-04-05','camilaimberti1998@gmail.com'],
  ['Dario Nicolas Ligdas','','2026-04-05','nicolasligdas@gmail.com'],
  ['Romina Mauro','','2026-04-05','romynichuz81@hotmail.com'],
  ['Estefania Vega','','2026-04-05','estefaniaveg@gmail.com'],
  ['Mirna Lopez isea','','2026-04-05','lopezimirna_04@hotmail.com'],
  ['Fiorella Osorio','','2026-04-05','fiorella.osorior@gmail.com'],
  ['Lau','','2026-04-05','aguerolau81@gmail.com'],
  ['Juan Pablo branca','','2026-04-05','branca.jpablo@gmail.com'],
  ['Enzo luis','','2026-04-05','compianoenzo.prof@gmail.com'],
  ['Bautista Pasman','','2026-04-06','pasmanbautista@gmail.com'],
  ['Valentino javier Toledo','','2026-04-06','toledovalentinojavier@gmail.com'],
  ['Daiana Abrami','','2026-04-07','info@brujulaclub.com'],
  ['Ra\u00fal Horacio Castro','','2026-04-07','raulcastro@rieespania.es'],
  ['Enzo Canelo','','2026-04-07','enzo.canelo@gmail.com'],
  ['Micaela Franco','','2026-04-07','micaelafrancoeugenia@gmail.com'],
  ['romina gonzalez','','2026-04-07','rominacti@hotmail.com'],
  ['Kevin Bernal','','2026-04-07','knbernalb33@gmail.com'],
  ['Julian Esteban Varela','','2026-04-07','varelajulian11@gmail.com'],
  ['Gemma Fern\u00e1ndez Pugliese','','2026-04-07','mgfernandez@educacionlarioja.com'],
  ['Belen Soledad Marquez','','2026-04-07','belenmarquez157@gmail.com'],
  ['Nicolas Garcia','','2026-04-07','bngarcia17@gmail.com'],
  ['Romina','','2026-04-07','carlosyrominanutricion@gmail.com'],
  ['katerina','','2026-04-07','anonimolopezgonzalez@gmail.com'],
  ['Julieta Raso','','2026-04-07','julietaraso1@gmail.com'],
  ['Micaela','','2026-04-07','longopontemicaela@gmail.com'],
  ['Antony Gabriel Salazar','','2026-04-08','antonygabriel.sch@gmail.com'],
  ['Agust\u00edn Vacas','','2026-04-08','agusvacas98@gmail.com'],
  ['Carolina Colina','','2026-04-08','mccolina98@gmail.com'],
  ['Camila ayelen Urquiza Siles','','2026-04-08','zaylimusicawards@gmail.com'],
  ['Nicolas gomez','','2026-04-08','ng228827@gmail.com'],
  ['Nicolas Riveros','','2026-04-08','n.riveros.mancilla@gmail.com'],
  ['Noelia','','2026-04-08','gimelucci0@gmail.com'],
  ['Roxana','','2026-04-08','terapeutaroxanavas@gmail.com'],
  ['Jimena Burlando','','2026-04-08','jimeburlando24@gmail.com'],
  ['Clor','','2026-04-08','dcinteriordesing@gmail.com'],
  ['Mari Huasasquiche','','2026-04-08','hello@mari-imagine.com'],
  ['Luna Vecchietti','','2026-04-08','lunienmovimiento@gmail.com'],
  ['Matias','','2026-04-08','falconematias@outlook.com'],
  ['Isaac Bazzini','','2026-04-08','emaailen23@gmail.com'],
  ['Valenzuela Ayelen','','2026-04-08','dra.valenzuelaayelen@gmail.com'],
  ['Federico Santamaria','','2026-04-08','licenciado.fsantamaria@gmail.com'],
  ['Agustina Paez','','2026-04-08','m.agustinapaez@gmail.com'],
  ['Claudia Bielous','','2026-04-08','claudaneluk137@gmail.com'],
  ['Sebastian','','2026-04-08','sebastianhoraciocampos@gmail.com'],
  ['Pablo','','2026-04-08','mazzonipg@gmail.com'],
  ['Osca','','2026-04-08','oscar11_02@outlook.es'],
  ['Jhonny Sullcata','','2026-04-08','jsullcata@gmail.com'],
  ['Estefania','','2026-04-08','estefaniad74@gmail.com'],
  ['Jorge','','2026-04-08','estebananrango777@gmail.com'],
  ['Axel De mattia','','2026-04-08','axeldemattia@gmail.com'],
  ['Karina Muro Herrera','','2026-04-08','karinawpps@gmail.com'],
  ['Paula Rodr\u00edguez Sol\u00f3rzano','','2026-04-08','paula.sensainmob@gmail.com'],
  ['Fabricio','','2026-04-08','fabriciofalcon37@gmail.com'],
  ['Maria luz Arrua','','2026-04-08','arrualuz11@gmail.com'],
  ['agustin salda\u00f1o','','2026-04-08','agustinsaldano07@gmail.com'],
  ['Ezequiel','','2026-04-08','ezeperaltakpo@gmail.com'],
  ['Sebastian Camargo','','2026-04-08','camargogenet2019@gmail.com'],
  ['Maria virginia','','2026-04-09','toniolovirgi@gmail.com'],
  ['Pamela','','2026-04-09','pamelacor37@gmail.com'],
  ['Leonardo','','2026-04-09','licleonardoalvarez9@gmail.com'],
  ['Gabriel villq','','2026-04-09','gabrielvillabarber@gmail.com'],
  ['narella perrone','','2026-04-10','narellaperrone@gmail.com'],
  ['Bautista Ferreyra','','2026-04-10','bautiferreyra@hotmail.com'],
  ['Martina Cruzate','','2026-04-10','violetacruza@gmail.com'],
  ['Betiana Haines','','2026-04-10','betiana.haines@gmail.com'],
  ['Daniela Agustina','','2026-04-10','arancibiaagustina925@gmail.com'],
  ['Mar\u00eda soledad Yegros','','2026-04-10','soledadyegros12@gmail.com'],
  ['Maria Luz Calvetti','','2026-04-10','ab.luzcalvetti@gmail.com'],
  ['Vanina L\u00f3pez','','2026-04-10','vaninamlopez56@gmail.com'],
  ['Javier Bellinzona','','2026-04-10','javierbellinzona@yahoo.com.ar'],
  ['Augusto Lapetina','','2026-04-10','augustolapetina@gmail.com'],
  ['Lorena','','2026-04-10','lorenapucca1984@gmail.com'],
];

async function main() {
  const creds = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'webapp', 'credentials.json'), 'utf8'));
  const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const sheets = google.sheets({ version: 'v4', auth });
  const dstId = '14l6eg-JfY5M00NRSmOT-38f5eRsC0xsOqZl9bsggDv4';

  const existing = await sheets.spreadsheets.values.get({ spreadsheetId: dstId, range: "'📞 Registro Calls'!AB2:AB" });
  const existingEmails = new Set((existing.data.values || []).map(r => (r[0] || '').trim().toLowerCase()).filter(e => e));

  const rows = [];
  for (const [name, ig, date, email] of canceledData) {
    if (existingEmails.has(email.toLowerCase())) continue;
    const parts = date.split('-');
    const mes = parts[0] + '-' + parseInt(parts[1]);
    rows.push([
      name, '', date, date, '', 'Fede',
      '🚨 Cancelada', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', email, '', mes
    ]);
  }

  console.log('Canceled rows to add:', rows.length);
  if (rows.length > 0) {
    rows.sort((a, b) => a[2].localeCompare(b[2]));
    const res = await sheets.spreadsheets.values.append({
      spreadsheetId: dstId,
      range: "'📞 Registro Calls'!A:AD",
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });
    console.log('Done!', res.data.updates?.updatedRows, 'rows added');
  }
}
main().catch(e => console.error(e.message));
