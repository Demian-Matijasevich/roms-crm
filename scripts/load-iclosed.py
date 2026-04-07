import openpyxl
import json
import subprocess

# Read iClosed calls export
wb = openpyxl.load_workbook("C:/Users/matyc/Downloads/Global Data - calls - 06-Apr 14_02.xlsx")
ws = wb.active
iclosed_rows = [r for r in ws.iter_rows(min_row=2, values_only=True) if any(v is not None for v in r)]

# Read existing Sheet names+emails via Google Sheets API
result = subprocess.run([
    "node", "-e", """
    const { google } = require('googleapis');
    const fs = require('fs');
    const path = require('path');
    async function main() {
      const creds = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'webapp', 'credentials.json'), 'utf8'));
      const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
      const sheets = google.sheets({ version: 'v4', auth });
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: '14l6eg-JfY5M00NRSmOT-38f5eRsC0xsOqZl9bsggDv4',
        range: "'📞 Registro Calls'!A2:AC"
      });
      const rows = res.data.values || [];
      const names = rows.map(r => (r[0] || '').trim().toLowerCase());
      const emails = rows.map(r => (r[27] || '').trim().toLowerCase()).filter(e => e);
      console.log(JSON.stringify({ names, emails }));
    }
    main().catch(e => console.error(e.message));
    """
], capture_output=True, text=True, encoding='utf-8', cwd="C:/Users/matyc/projects/roms-crm/scripts")

existing = json.loads(result.stdout)
existing_names = set(existing['names'])
existing_emails = set(existing['emails'])

# Map closer names
closer_map = {
    "Federico Kohen": "Fede",
    "Valentino Granata": "Valentino",
    "Agustin Olivero": "Agustín",
    "Juan Martin Blanco": "Juan Martín",
}

# Map status
def map_status(status, outcome):
    s = (status or "").strip().lower()
    o = (outcome or "").strip().lower()
    if s == "cancelled" or o == "no_sale":
        return "🚨 Cancelada"
    if s == "completed" and o == "sale":
        return "🚀 Cerrado"
    if s == "completed":
        return "⏳ Pendiente"
    if s == "scheduled":
        return "⏳ Pendiente"
    return "⏳ Pendiente"

# Build new rows
new_rows = []
for r in iclosed_rows:
    # Columns: Contact, FirstName, LastName, CallCreationDate, SchedulingStatus,
    #          CallStartDate, EventType, CallLocation, CallDuration, CallCloserOwner,
    #          CallStatus, Event, CallOutcome
    email = str(r[0] or "").strip()
    first = str(r[1] or "").strip()
    last = str(r[2] or "").strip()
    name = f"{first} {last}".strip()

    call_date = str(r[5] or "")[:10] if r[5] else ""
    closer_raw = str(r[9] or "").strip()
    closer = closer_map.get(closer_raw, closer_raw)
    status = map_status(str(r[10] or ""), str(r[12] or ""))
    event = str(r[11] or "").strip()

    # Skip if already exists
    name_lower = name.lower()
    email_lower = email.lower() if "@" in email else ""

    if name_lower in existing_names:
        continue
    if email_lower and email_lower in existing_emails:
        continue

    # Parse mes
    if call_date:
        parts = call_date.split("-")
        mes = f"{parts[0]}-{int(parts[1])}" if len(parts) >= 2 else ""
    else:
        mes = ""

    row = [
        name,           # A: Nombre
        "",             # B: Instagram
        call_date,      # C: FechaLlamada
        call_date,      # D: FechaAgenda
        "",             # E: Setter
        closer,         # F: Closer
        status,         # G: Estado
        "",             # H: Se presentó
        "",             # I: Calificado
        "",             # J: Programa
        f"iClosed: {event}", # K: ContextoSetter
        "",             # L: ContextoCloser
        "",             # M-Y: payment fields empty
        "", "", "", "", "", "", "", "", "", "", "", "", "",
        "iClosed",      # Z: Fuente
        "",             # AA: MedioAgenda
        email if "@" in email else "",  # AB: Email
        email if "@" not in email else "",  # AC: Teléfono (some contacts are phone numbers)
        mes,            # AD: Mes
    ]
    new_rows.append(row)
    print(f"  NEW: {call_date} | {name} | {closer} | {status}")

print(f"\nTotal new rows: {len(new_rows)}")

# Save for Node to upload
with open("C:/tmp/iclosed_new_rows.json", "w", encoding="utf-8") as f:
    json.dump(new_rows, f, ensure_ascii=False)
