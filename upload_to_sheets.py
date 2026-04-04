"""
Upload Airtable data to Google Sheets.
Creates 4 sheets: CRM Llamadas, Gastos, Equipo, Métricas.

Requirements:
  1. credentials.json in same directory
  2. Sheet shared with roms-crm@roms-crm.iam.gserviceaccount.com as Editor
  3. pip install google-auth google-api-python-client

Usage: python upload_to_sheets.py
"""
import json
import os
from google.oauth2 import service_account
from googleapiclient.discovery import build

SPREADSHEET_ID = "14l6eg-JfY5M00NRSmOT-38f5eRsC0xsOqZl9bsggDv4"
CREDS_FILE = os.path.join(os.path.dirname(__file__), "credentials.json")
DATA_DIR = os.path.join(os.path.dirname(__file__), "airtable-data")

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


def get_service():
    creds = service_account.Credentials.from_service_account_file(CREDS_FILE, scopes=SCOPES)
    return build("sheets", "v4", credentials=creds)


def str_val(val):
    if val is None:
        return ""
    if isinstance(val, dict):
        if "error" in val:
            return ""
        return val.get("name", val.get("email", str(val)))
    if isinstance(val, list):
        return ", ".join(str_val(v) for v in val)
    if isinstance(val, bool):
        return "Sí" if val else "No"
    return str(val)


def num_val(val):
    if val is None:
        return 0
    try:
        n = float(val)
        return n
    except (ValueError, TypeError):
        return 0


def prepare_llamadas():
    with open(os.path.join(DATA_DIR, "reporte_llamadas.json"), "r", encoding="utf-8") as f:
        records = json.load(f)

    headers = [
        "Nombre del Lead", "Email", "Teléfono", "Instagram",
        "Fecha Agendado", "Fecha Llamada", "Closer", "Estado",
        "Evento", "Fuente del Lead", "Lead Calificado", "Programa Pitcheado",
        "Contexto Setter", "Contexto Closer",
        "Link Llamada", "Desde dónde agendó", "Modelo de Negocio",
        "Inversión Disponible", "Objetivo",
        "Plan de Pago", "Ticket Total USD",
        "Pago 1 USD", "Fecha Pago 1", "Estado Pago 1",
        "Pago 2 USD", "Fecha Pago 2", "Estado Pago 2",
        "Pago 3 USD", "Fecha Pago 3", "Estado Pago 3",
        "Método de Pago", "Cash Collected", "Saldo Pendiente",
    ]

    rows = [headers]
    for r in records:
        fl = r.get("fields", {})
        closer_raw = fl.get("👤 Closer", "")
        closer = closer_raw.get("name", closer_raw.get("email", "")) if isinstance(closer_raw, dict) else str_val(closer_raw)

        rows.append([
            str_val(fl.get("👤 Nombre del Lead")),
            str_val(fl.get("📧 Email")),
            str_val(fl.get("📞 Teléfono")),
            str_val(fl.get("📲 Instagram")),
            str_val(fl.get("📆 Fecha de Agendado")),
            str_val(fl.get("📆 Fecha de Llamada")),
            closer,
            str_val(fl.get("📌 Estado de la Llamada")),
            str_val(fl.get("🏛️ Evento")),
            str_val(fl.get("🚀 Funte del lead")) or str_val(fl.get("🚀 Fuentes")),
            str_val(fl.get("📌Lead Calificado?")),
            str_val(fl.get("🏆 Programa Pitcheado")),
            str_val(fl.get("📑 Contexto Setter")),
            str_val(fl.get("📑 Contexto Closer (Post CAll)")),
            str_val(fl.get("🔗 Link de Llamada")),
            str_val(fl.get("¿Desde dónde te agendaste la sesión?")),
            str_val(fl.get("¿Cuál de estas opciones describe mejor tu modelo de negocio?")),
            str_val(fl.get("Si tuvieras que invertir en tu negocio/marca personal, disponés de 5.000 USD a 12.000 USD mensuales para hacerlo?")),
            str_val(fl.get("¿Cuál es tu objetivo trabajando con nosotros en los próximos 6 meses?")),
            str_val(fl.get("🧾 Plan de Pago (Venta)")),
            num_val(fl.get("💰 Ticket Total")),
            num_val(fl.get("💰 Pago 1")),
            str_val(fl.get("📆 Fecha de Pago 1")),
            str_val(fl.get("📊 Estado 1")),
            num_val(fl.get("💰 Pago 2")),
            str_val(fl.get("📆 Fecha de Pago 2")),
            str_val(fl.get("📊 Estado 2")),
            num_val(fl.get("💰 Pago 3")),
            str_val(fl.get("📆 Fecha de Pago 3")),
            str_val(fl.get("📊 Estado 3")),
            str_val(fl.get("Metodo de pago ")),
            num_val(fl.get("general🏆 Cash Collected")),
            num_val(fl.get("❗️ Saldo Pendiente")),
        ])

    return rows


def prepare_gastos():
    with open(os.path.join(DATA_DIR, "gastos.json"), "r", encoding="utf-8") as f:
        records = json.load(f)

    headers = ["Concepto", "Fecha", "Monto USD", "Categoría", "Billetera", "Pagado a", "Estado"]

    rows = [headers]
    for r in records:
        fl = r.get("fields", {})
        rows.append([
            str_val(fl.get("👤 Nombre del Editor/Gasto")),
            str_val(fl.get("📆 Fecha de Pago 1")),
            num_val(fl.get("💰 Pago 1")),
            str_val(fl.get("Categoría")),
            str_val(fl.get("Billetera")),
            str_val(fl.get("Pago")),
            str_val(fl.get("📊 Estado 1")),
        ])

    return rows


def prepare_equipo():
    with open(os.path.join(DATA_DIR, "integrantes_equipo.json"), "r", encoding="utf-8") as f:
        records = json.load(f)

    headers = ["Nombre", "Rol", "Email", "Teléfono"]
    rows = [headers]
    for r in records:
        fl = r.get("fields", {})
        rows.append([
            str_val(fl.get("Nombre")),
            str_val(fl.get("Rol/ Cargo")),
            str_val(fl.get("Mail")),
            str_val(fl.get("Contacto")),
        ])

    return rows


def prepare_metricas(llamadas_data):
    """Build monthly summary from llamadas data."""
    headers = [
        "Mes", "Total Llamadas", "Presentadas", "Cerradas",
        "% Show Up", "% Cierre", "Cash Collected"
    ]

    # Skip header row
    months = {}
    for row in llamadas_data[1:]:
        fecha = row[5]  # Fecha Llamada
        if not fecha:
            continue
        parts = fecha.split("-")
        if len(parts) >= 2:
            mes = f"{parts[0]}-{int(parts[1])}"
        else:
            continue

        if mes not in months:
            months[mes] = {"total": 0, "presentadas": 0, "cerradas": 0, "cash": 0}

        m = months[mes]
        m["total"] += 1

        estado = row[7]  # Estado
        if estado and "Pendiente" not in estado and "No Se Presento" not in estado and "Reprogramada" not in estado:
            m["presentadas"] += 1

        if "Cerrado" in (estado or ""):
            m["cerradas"] += 1

        m["cash"] += row[31] if isinstance(row[31], (int, float)) else 0

    rows = [headers]
    for mes in sorted(months.keys()):
        m = months[mes]
        show_up = (m["presentadas"] / m["total"] * 100) if m["total"] > 0 else 0
        cierre = (m["cerradas"] / m["presentadas"] * 100) if m["presentadas"] > 0 else 0
        rows.append([
            mes, m["total"], m["presentadas"], m["cerradas"],
            round(show_up, 1), round(cierre, 1), m["cash"]
        ])

    return rows


def create_or_get_sheets(service, sheet_names):
    """Ensure the spreadsheet has all required sheets."""
    meta = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    existing = {s["properties"]["title"]: s["properties"]["sheetId"] for s in meta["sheets"]}

    requests = []
    for name in sheet_names:
        if name not in existing:
            requests.append({
                "addSheet": {
                    "properties": {"title": name}
                }
            })

    # Delete default "Sheet1" / "Hoja 1" if it exists and we don't need it
    for default_name in ["Sheet1", "Hoja 1"]:
        if default_name in existing and default_name not in sheet_names:
            requests.append({
                "deleteSheet": {"sheetId": existing[default_name]}
            })

    if requests:
        service.spreadsheets().batchUpdate(
            spreadsheetId=SPREADSHEET_ID,
            body={"requests": requests}
        ).execute()
        print(f"  Created/cleaned sheets: {sheet_names}")


def upload_sheet_data(service, sheet_name, rows):
    """Clear and write data to a specific sheet."""
    # Clear existing
    service.spreadsheets().values().clear(
        spreadsheetId=SPREADSHEET_ID,
        range=f"'{sheet_name}'!A:ZZ"
    ).execute()

    # Write new data
    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range=f"'{sheet_name}'!A1",
        valueInputOption="RAW",
        body={"values": rows}
    ).execute()

    print(f"  {sheet_name}: {len(rows) - 1} rows uploaded")


def format_headers(service):
    """Bold headers and freeze first row on all sheets."""
    meta = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    sheets = {s["properties"]["title"]: s["properties"]["sheetId"] for s in meta["sheets"]}

    requests = []
    for name, sheet_id in sheets.items():
        # Freeze first row
        requests.append({
            "updateSheetProperties": {
                "properties": {
                    "sheetId": sheet_id,
                    "gridProperties": {"frozenRowCount": 1}
                },
                "fields": "gridProperties.frozenRowCount"
            }
        })
        # Bold header row
        requests.append({
            "repeatCell": {
                "range": {
                    "sheetId": sheet_id,
                    "startRowIndex": 0,
                    "endRowIndex": 1
                },
                "cell": {
                    "userEnteredFormat": {
                        "textFormat": {"bold": True},
                        "backgroundColor": {"red": 0.15, "green": 0.15, "blue": 0.17}
                    }
                },
                "fields": "userEnteredFormat(textFormat,backgroundColor)"
            }
        })

    if requests:
        service.spreadsheets().batchUpdate(
            spreadsheetId=SPREADSHEET_ID,
            body={"requests": requests}
        ).execute()
        print("  Headers formatted (bold + frozen)")


def add_data_validation(service):
    """Add dropdown validation for key columns in CRM Llamadas."""
    meta = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    sheets = {s["properties"]["title"]: s["properties"]["sheetId"] for s in meta["sheets"]}

    crm_id = sheets.get("CRM Llamadas")
    if not crm_id:
        return

    # Column index -> dropdown values
    dropdowns = {
        7: ["⏳ Pendiente", "🚀 Cerrado", "❌ No Se Presento", "❌ No Cierre", "🔁 Seguimiento", "📌 Reprogramada"],  # Estado
        11: ["Consultoría", "Omnipresencia", "Multicuentas"],  # Programa Pitcheado
        23: ["Pagado", "Pendiente"],  # Estado Pago 1
        26: ["Pagado", "Pendiente"],  # Estado Pago 2
        29: ["Pagado", "Pendiente"],  # Estado Pago 3
    }

    requests = []
    for col_idx, values in dropdowns.items():
        requests.append({
            "setDataValidation": {
                "range": {
                    "sheetId": crm_id,
                    "startRowIndex": 1,
                    "startColumnIndex": col_idx,
                    "endColumnIndex": col_idx + 1,
                },
                "rule": {
                    "condition": {
                        "type": "ONE_OF_LIST",
                        "values": [{"userEnteredValue": v} for v in values]
                    },
                    "showCustomUi": True,
                    "strict": False,
                }
            }
        })

    if requests:
        service.spreadsheets().batchUpdate(
            spreadsheetId=SPREADSHEET_ID,
            body={"requests": requests}
        ).execute()
        print("  Data validation (dropdowns) added")


def main():
    print("Connecting to Google Sheets API...")
    service = get_service()

    sheet_names = ["CRM Llamadas", "Gastos", "Equipo", "Métricas"]
    print("Setting up sheets...")
    create_or_get_sheets(service, sheet_names)

    print("\nPreparing data...")
    llamadas = prepare_llamadas()
    gastos_data = prepare_gastos()
    equipo = prepare_equipo()
    metricas = prepare_metricas(llamadas)

    print("\nUploading data...")
    upload_sheet_data(service, "CRM Llamadas", llamadas)
    upload_sheet_data(service, "Gastos", gastos_data)
    upload_sheet_data(service, "Equipo", equipo)
    upload_sheet_data(service, "Métricas", metricas)

    print("\nFormatting...")
    format_headers(service)
    add_data_validation(service)

    print(f"\nDone! Sheet: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}")


if __name__ == "__main__":
    main()
