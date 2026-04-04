"""
Convert Airtable JSON exports to CSV files ready for Google Sheets import.
Run: python migrate_to_csv.py
Output: csv/ directory with one CSV per sheet.
"""
import json
import csv
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "airtable-data")
CSV_DIR = os.path.join(os.path.dirname(__file__), "csv")
os.makedirs(CSV_DIR, exist_ok=True)


def str_val(val):
    if val is None:
        return ""
    if isinstance(val, dict):
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
        return float(val)
    except (ValueError, TypeError):
        return 0


def export_llamadas():
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

    rows = []
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

    path = os.path.join(CSV_DIR, "crm_llamadas.csv")
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

    print(f"CRM Llamadas: {len(rows)} rows -> {path}")


def export_gastos():
    with open(os.path.join(DATA_DIR, "gastos.json"), "r", encoding="utf-8") as f:
        records = json.load(f)

    headers = ["Concepto", "Fecha", "Monto USD", "Categoría", "Billetera", "Pagado a", "Estado"]

    rows = []
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

    path = os.path.join(CSV_DIR, "gastos.csv")
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

    print(f"Gastos: {len(rows)} rows -> {path}")


def export_equipo():
    with open(os.path.join(DATA_DIR, "integrantes_equipo.json"), "r", encoding="utf-8") as f:
        records = json.load(f)

    headers = ["Nombre", "Rol", "Email", "Teléfono"]

    rows = []
    for r in records:
        fl = r.get("fields", {})
        rows.append([
            str_val(fl.get("Nombre")),
            str_val(fl.get("Rol/ Cargo")),
            str_val(fl.get("Mail")),
            str_val(fl.get("Contacto")),
        ])

    path = os.path.join(CSV_DIR, "equipo.csv")
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

    print(f"Equipo: {len(rows)} rows -> {path}")


if __name__ == "__main__":
    export_llamadas()
    export_gastos()
    export_equipo()
    print("\nCSVs listos en:", CSV_DIR)
    print("Importá cada CSV como una hoja en Google Sheets.")
