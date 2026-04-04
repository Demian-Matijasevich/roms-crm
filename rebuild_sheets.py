"""
Rebuild ROMS CRM Google Sheet to match the example sheets style.
Combines both reference sheets into one complete CRM with Airtable data.
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from google.oauth2 import service_account
from googleapiclient.discovery import build
import json
import os

SPREADSHEET_ID = "14l6eg-JfY5M00NRSmOT-38f5eRsC0xsOqZl9bsggDv4"
CREDS_FILE = os.path.join(os.path.dirname(__file__), "credentials.json")
DATA_DIR = os.path.join(os.path.dirname(__file__), "airtable-data")
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

# Colors
DARK = {"red": 0.067, "green": 0.067, "blue": 0.075}
CARD = {"red": 0.094, "green": 0.094, "blue": 0.106}
PURPLE = {"red": 0.545, "green": 0.361, "blue": 0.965}
PURPLE_DK = {"red": 0.30, "green": 0.12, "blue": 0.55}
GREEN = {"red": 0.133, "green": 0.773, "blue": 0.369}
GREEN_DK = {"red": 0.08, "green": 0.22, "blue": 0.12}
RED = {"red": 0.937, "green": 0.267, "blue": 0.267}
RED_DK = {"red": 0.30, "green": 0.08, "blue": 0.08}
YELLOW = {"red": 0.918, "green": 0.702, "blue": 0.031}
YELLOW_DK = {"red": 0.25, "green": 0.20, "blue": 0.05}
GOLD = {"red": 1.0, "green": 0.84, "blue": 0.0}
WHITE = {"red": 0.93, "green": 0.93, "blue": 0.93}
MUTED = {"red": 0.44, "green": 0.44, "blue": 0.48}
BORDER = {"red": 0.153, "green": 0.153, "blue": 0.165}
BLACK = {"red": 0.04, "green": 0.04, "blue": 0.05}


def get_service():
    creds = service_account.Credentials.from_service_account_file(CREDS_FILE, scopes=SCOPES)
    return build("sheets", "v4", credentials=creds)


def load_data():
    with open(os.path.join(DATA_DIR, "reporte_llamadas.json"), "r", encoding="utf-8") as f:
        llamadas = json.load(f)
    with open(os.path.join(DATA_DIR, "gastos.json"), "r", encoding="utf-8") as f:
        gastos = json.load(f)
    return llamadas, gastos


def s(val):
    if val is None: return ""
    if isinstance(val, dict):
        if "error" in val: return ""
        return val.get("name", val.get("email", str(val)))
    if isinstance(val, list): return ", ".join(s(v) for v in val)
    if isinstance(val, bool): return "Sí" if val else "No"
    return str(val)


def n(val):
    if val is None: return 0
    try: return float(val)
    except: return 0


def process_llamadas(raw):
    """Process raw Airtable records into structured data."""
    results = []
    for r in raw:
        f = r.get("fields", {})
        closer_raw = f.get("👤 Closer", "")
        closer = closer_raw.get("name", closer_raw.get("email", "")) if isinstance(closer_raw, dict) else s(closer_raw)

        results.append({
            "nombre": s(f.get("👤 Nombre del Lead")),
            "fecha_agenda": s(f.get("📆 Fecha de Agendado")),
            "fecha_llamada": s(f.get("📆 Fecha de Llamada")),
            "setter": "",  # Most records don't have setter in this base
            "closer": closer,
            "fuente": s(f.get("🚀 Funte del lead")) or s(f.get("🚀 Fuentes")),
            "medio_agenda": s(f.get("¿Desde dónde te agendaste la sesión?")),
            "calificado": s(f.get("📌Lead Calificado?")),
            "contexto_setter": s(f.get("📑 Contexto Setter")),
            "se_presento": "Sí" if n(f.get("✅ Es Presentada")) == 1 else "No",
            "estado": s(f.get("📌 Estado de la Llamada")),
            "programa": s(f.get("🏆 Programa Pitcheado")),
            "contexto_closer": s(f.get("📑 Contexto Closer (Post CAll)")),
            "cash_dia1": n(f.get("🚀 AOV Día 1")),
            "cash_total": n(f.get("general🏆 Cash Collected")),
            "pago1": n(f.get("💰 Pago 1")),
            "fecha_pago1": s(f.get("📆 Fecha de Pago 1")),
            "instagram": s(f.get("📲 Instagram")),
            "email": s(f.get("📧 Email")),
            "telefono": s(f.get("📞 Teléfono")),
            "evento": s(f.get("🏛️ Evento")),
            "modelo_negocio": s(f.get("¿Cuál de estas opciones describe mejor tu modelo de negocio?")),
            "inversion": s(f.get("Si tuvieras que invertir en tu negocio/marca personal, disponés de 5.000 USD a 12.000 USD mensuales para hacerlo?")),
            "objetivo": s(f.get("¿Cuál es tu objetivo trabajando con nosotros en los próximos 6 meses?")),
            "es_venta": n(f.get("💰 Es Venta")) == 1,
            "es_presentada": n(f.get("✅ Es Presentada")) == 1,
            "ano_mes": s(f.get("📆 Año-mes")),
            "plan_pago": s(f.get("🧾 Plan de Pago (Venta)")),
            "ticket_total": n(f.get("💰 Ticket Total")),
            "pago2": n(f.get("💰 Pago 2")),
            "pago3": n(f.get("💰 Pago 3")),
            "estado_pago1": s(f.get("📊 Estado 1")),
            "estado_pago2": s(f.get("📊 Estado 2")),
            "estado_pago3": s(f.get("📊 Estado 3")),
            "metodo_pago": s(f.get("Metodo de pago ")),
            "link_llamada": s(f.get("🔗 Link de Llamada")),
            "saldo_pendiente": n(f.get("❗️ Saldo Pendiente")),
        })
    return results


def calc_monthly_metrics(data):
    """Calculate monthly metrics from processed data."""
    months = {}
    for d in data:
        mes = d["ano_mes"]
        if not mes or "No identificada" in mes:
            continue
        if mes not in months:
            months[mes] = {
                "llamadas": 0, "presentadas": 0, "cerradas": 0,
                "calificadas": 0, "cash": 0, "cash_dia1": 0,
            }
        m = months[mes]
        m["llamadas"] += 1
        if d["es_presentada"]: m["presentadas"] += 1
        if d["es_venta"]:
            m["cerradas"] += 1
            m["cash_dia1"] += d["cash_dia1"]
        m["cash"] += d["cash_total"]
        if d["calificado"] and "Calificado" in d["calificado"]:
            m["calificadas"] += 1
    return months


def calc_closer_stats(data, mes_filter=None):
    """Calculate closer stats."""
    closers = {}
    for d in data:
        if mes_filter and d["ano_mes"] != mes_filter:
            continue
        name = d["closer"] or "Sin asignar"
        if name not in closers:
            closers[name] = {"llamadas": 0, "presentadas": 0, "cerradas": 0, "cash": 0, "cash_dia1": 0, "calificadas": 0}
        c = closers[name]
        c["llamadas"] += 1
        if d["es_presentada"]: c["presentadas"] += 1
        if d["es_venta"]:
            c["cerradas"] += 1
            c["cash_dia1"] += d["cash_dia1"]
        c["cash"] += d["cash_total"]
    return closers


def clear_and_setup_sheets(service):
    """Delete all existing sheets and create new ones."""
    meta = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    existing = {sh["properties"]["title"]: sh["properties"]["sheetId"] for sh in meta["sheets"]}

    new_sheets = [
        "🏆 Leaderboard Closers",
        "🏆 Leaderboard Setters",
        "📊 Métricas 2026",
        "📞 Registro Calls",
        "💰 Dashboard Financiero",
        "📝 Formulario de Pagos",
        "💳 Registro de Pagos",
        "📈 Estado de Resultados",
        "💸 Gastos",
        "👥 Payroll",
    ]

    # Step 1: Create a temp sheet (so we can delete everything else)
    temp_name = "__TEMP__"
    if temp_name not in existing:
        service.spreadsheets().batchUpdate(
            spreadsheetId=SPREADSHEET_ID,
            body={"requests": [{"addSheet": {"properties": {"title": temp_name}}}]}
        ).execute()

    # Step 2: Delete ALL existing sheets except temp
    meta = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    del_requests = []
    temp_id = None
    for sh in meta["sheets"]:
        title = sh["properties"]["title"]
        sid = sh["properties"]["sheetId"]
        if title == temp_name:
            temp_id = sid
        else:
            del_requests.append({"deleteSheet": {"sheetId": sid}})

    if del_requests:
        service.spreadsheets().batchUpdate(
            spreadsheetId=SPREADSHEET_ID, body={"requests": del_requests}
        ).execute()

    # Step 3: Create all new sheets
    add_requests = []
    for i, name in enumerate(new_sheets):
        add_requests.append({
            "addSheet": {"properties": {"title": name, "index": i}}
        })
    service.spreadsheets().batchUpdate(
        spreadsheetId=SPREADSHEET_ID, body={"requests": add_requests}
    ).execute()

    # Step 4: Delete temp sheet
    if temp_id is not None:
        service.spreadsheets().batchUpdate(
            spreadsheetId=SPREADSHEET_ID,
            body={"requests": [{"deleteSheet": {"sheetId": temp_id}}]}
        ).execute()

    # Get final sheet IDs
    meta = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    return {sh["properties"]["title"]: sh["properties"]["sheetId"] for sh in meta["sheets"]}


def write_leaderboard_closers(service, data, sheet_ids):
    """Write Leaderboard Closers sheet matching example style."""
    sid = sheet_ids["🏆 Leaderboard Closers"]

    # Get current month
    from datetime import datetime
    now = datetime.now()
    mes_actual = f"{now.year}-{now.month}"
    mes_label = f"{['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][now.month-1]}-{now.year}"

    # Calc stats
    stats_mes = calc_closer_stats(data, mes_actual)
    stats_total = calc_closer_stats(data)

    # Sort by cash desc
    sorted_closers = sorted(stats_mes.items(), key=lambda x: -x[1]["cash"])

    positions = ["🥇1ro🥇", "2do", "3ro", "4to", "5to"]

    rows = [
        ["🏆 Leaderboard de Closers 🏆"],
        [],
        [],
        ["", "Mes", mes_label],
        [],
        ["Posición", "CLOSER", "", "", "Cash Collected Día 1", "Unidades", "Llamadas", "Llamadas Tomadas", "Show Up Rate", "Tasa de Cierre % Total", "Tasa de Cierre % Presentada", "AOV Upfront", "COMISIONES"],
    ]

    for i, (name, st) in enumerate(sorted_closers):
        if name == "Sin asignar":
            continue
        show_up = f"{st['presentadas']/st['llamadas']*100:.2f}%" if st['llamadas'] > 0 else "0%"
        cierre_total = f"{st['cerradas']/st['llamadas']*100:.2f}%" if st['llamadas'] > 0 else "0%"
        cierre_pres = f"{st['cerradas']/st['presentadas']*100:.2f}%" if st['presentadas'] > 0 else "0%"
        aov = f"${st['cash_dia1']/st['cerradas']:,.2f}" if st['cerradas'] > 0 else "$0.00"
        comision = st['cash'] * 0.10

        rows.append([
            positions[min(i, len(positions)-1)],
            name, "", "",
            f"${st['cash_dia1']:,.2f}",
            st['cerradas'],
            st['llamadas'],
            st['presentadas'],
            show_up,
            cierre_total,
            cierre_pres,
            aov,
            f"${comision:,.2f}",
        ])

    # Total row
    total_cash = sum(st['cash_dia1'] for _, st in sorted_closers if _ != "Sin asignar")
    total_units = sum(st['cerradas'] for _, st in sorted_closers if _ != "Sin asignar")
    total_calls = sum(st['llamadas'] for _, st in sorted_closers if _ != "Sin asignar")
    total_pres = sum(st['presentadas'] for _, st in sorted_closers if _ != "Sin asignar")
    total_comision = sum(st['cash'] * 0.10 for _, st in sorted_closers if _ != "Sin asignar")

    rows.append([])
    rows.append([
        "", "Total Mensual", "", "",
        f"${total_cash:,.2f}",
        total_units,
        total_calls,
        total_pres,
        f"{total_pres/total_calls*100:.2f}%" if total_calls > 0 else "0%",
        f"{total_units/total_calls*100:.2f}%" if total_calls > 0 else "0%",
        f"{total_units/total_pres*100:.2f}%" if total_pres > 0 else "0%",
        f"${total_cash/total_units:,.2f}" if total_units > 0 else "$0.00",
        f"${total_comision:,.2f}",
    ])

    # All-time totals
    total_all_cash = sum(st['cash'] for _, st in stats_total.items() if _ != "Sin asignar")
    total_all_units = sum(st['cerradas'] for _, st in stats_total.items() if _ != "Sin asignar")
    total_all_calls = sum(st['llamadas'] for _, st in stats_total.items() if _ != "Sin asignar")

    rows.append([])
    rows.append([
        "", "Totales Históricos", "", "",
        f"${total_all_cash:,.2f}",
        total_all_units,
        total_all_calls,
    ])

    # Commissions scheme
    rows.extend([[], [], []])
    rows.append(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "ESQUEMA DE COMISIONES"])
    rows.append(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "Closer"])
    rows.append(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "Comisión Base", "", "", "", "10%"])

    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="'🏆 Leaderboard Closers'!A1",
        valueInputOption="RAW",
        body={"values": rows}
    ).execute()

    return sid


def write_leaderboard_setters(service, data, sheet_ids):
    """Write Leaderboard Setters sheet."""
    sid = sheet_ids["🏆 Leaderboard Setters"]
    from datetime import datetime
    now = datetime.now()
    mes_label = f"{['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][now.month-1]}-{now.year}"

    rows = [
        ["🏆 Leaderboard de Setters 🏆"],
        [],
        [],
        ["", "Mes", mes_label],
        [],
        ["Posición", "SETTER", "", "", "Agendas", "Agendas Presentadas", "Llamadas Cerradas", "Tasa de Agenda %", "Agendas Calificadas", "Cash Collected Día 1", "COMISIONES"],
        ["🥇1ro🥇", "Valentino", "", "", "—", "—", "—", "—", "—", "—", "—"],
        ["2do", "Guille", "", "", "—", "—", "—", "—", "—", "—", "—"],
        [],
        ["", "Total Mensual", "", "", "—", "—", "—", "—", "—", "—", "—"],
        [],
        ["", "Totales Históricos", "", "", "—", "—", "—", "—", "—", "—", "—"],
        [], [], [],
        ["", "", "", "", "", "", "", "", "", "", "", "ESQUEMA DE COMISIONES"],
        ["", "", "", "", "", "", "", "", "", "", "", "Setter"],
        ["", "", "", "", "", "", "", "", "", "", "", "Comisión Base", "", "", "", "5%"],
    ]

    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="'🏆 Leaderboard Setters'!A1",
        valueInputOption="RAW",
        body={"values": rows}
    ).execute()

    return sid


def write_metricas(service, data, sheet_ids):
    """Write Métricas 2026 sheet matching example layout."""
    sid = sheet_ids["📊 Métricas 2026"]
    monthly = calc_monthly_metrics(data)

    meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
             "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
    mes_keys = [f"2026-{i+1}" for i in range(12)]

    def mv(key, field):
        return monthly.get(key, {}).get(field, 0)

    rows = [
        ["Métricas"] + meses,
        [""] + [f"{m.lower()}-2026" for m in meses],
        ["VENTAS"],
        ["Llamadas Totales"] + [mv(k, "llamadas") for k in mes_keys],
        ["Llamadas Presentadas"] + [mv(k, "presentadas") for k in mes_keys],
        ["Llamadas Calificadas"] + [mv(k, "calificadas") for k in mes_keys],
        ["% Calificadas"] + [
            f"{mv(k,'calificadas')/mv(k,'presentadas')*100:.1f}%" if mv(k,"presentadas") > 0 else "—"
            for k in mes_keys
        ],
        ["Show Up Rate"] + [
            f"{mv(k,'presentadas')/mv(k,'llamadas')*100:.1f}%" if mv(k,"llamadas") > 0 else "—"
            for k in mes_keys
        ],
        ["Cerradas"] + [mv(k, "cerradas") for k in mes_keys],
        ["Tasa de Cierre (Total)"] + [
            f"{mv(k,'cerradas')/mv(k,'llamadas')*100:.1f}%" if mv(k,"llamadas") > 0 else "—"
            for k in mes_keys
        ],
        ["Tasa de Cierre (Presentadas)"] + [
            f"{mv(k,'cerradas')/mv(k,'presentadas')*100:.1f}%" if mv(k,"presentadas") > 0 else "—"
            for k in mes_keys
        ],
        [],
        ["INGRESOS"],
        ["Cash Collected Día 1"] + [f"${mv(k, 'cash_dia1'):,.2f}" for k in mes_keys],
        ["Cash Collected Total"] + [f"${mv(k, 'cash'):,.2f}" for k in mes_keys],
        [],
        ["COMISIONES"],
        ["Comisiones Closers (10%)"] + [f"${mv(k, 'cash') * 0.10:,.2f}" for k in mes_keys],
        ["Comisiones Setters (5%)"] + [f"${mv(k, 'cash') * 0.05:,.2f}" for k in mes_keys],
    ]

    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="'📊 Métricas 2026'!A1",
        valueInputOption="RAW",
        body={"values": rows}
    ).execute()

    return sid


def write_registro_calls(service, data, sheet_ids):
    """Write Registro Calls sheet matching example format."""
    sid = sheet_ids["📞 Registro Calls"]

    headers = [
        "Instagram", "Nombre", "Fecha de Llamada", "Fecha de Agenda",
        "Setter", "Closer", "Fuente", "Medio de Agenda",
        "Calificado", "Contexto Setter (pre call)", "¿Se presentó?",
        "Estado", "Programa", "Contexto Closer (post call)",
        "Cash Collected Día 1", "Cash Collected Total",
        "Fecha de Pago", "Email", "Teléfono",
        "Modelo de Negocio", "Inversión Disponible", "Objetivo",
        "Mes"
    ]

    rows = [headers]
    # Sort by fecha_llamada desc
    sorted_data = sorted(data, key=lambda x: x["fecha_llamada"] or "0", reverse=True)

    for d in sorted_data:
        rows.append([
            d["instagram"],
            d["nombre"],
            d["fecha_llamada"],
            d["fecha_agenda"],
            d["setter"],
            d["closer"],
            d["fuente"],
            d["medio_agenda"],
            d["calificado"],
            d["contexto_setter"],
            d["se_presento"],
            d["estado"],
            d["programa"],
            d["contexto_closer"],
            f"${d['cash_dia1']:,.2f}" if d["cash_dia1"] > 0 else "",
            f"${d['cash_total']:,.2f}" if d["cash_total"] > 0 else "",
            d["fecha_pago1"],
            d["email"],
            d["telefono"],
            d["modelo_negocio"][:60] if d["modelo_negocio"] else "",
            d["inversion"][:60] if d["inversion"] else "",
            d["objetivo"][:60] if d["objetivo"] else "",
            d["ano_mes"],
        ])

    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="'📞 Registro Calls'!A1",
        valueInputOption="RAW",
        body={"values": rows}
    ).execute()

    return sid


def write_dashboard_financiero(service, data, sheet_ids):
    """Write Dashboard Financiero sheet."""
    sid = sheet_ids["💰 Dashboard Financiero"]

    closers_stats = calc_closer_stats(data)

    rows = [
        ["COMISIONES VENTAS", "", "", "", "", "", "", "DASHBOARD FINANCIERO"],
        [],
        [],
        ["", "Rango de Fechas"],
        ["", "Inicio", "Finalización"],
        ["", "2026-01-01", "2026-12-31"],
        [],
        [],
        ["", "COMISIONES CLOSERS", "", "", "COMISIONES SETTERS"],
    ]

    closer_names = [name for name in closers_stats if name != "Sin asignar"]
    setter_names = ["Valentino", "Guille"]

    max_len = max(len(closer_names), len(setter_names))
    for i in range(max_len):
        c_name = closer_names[i] if i < len(closer_names) else ""
        c_val = f"${closers_stats.get(c_name, {}).get('cash', 0) * 0.10:,.2f}" if c_name else ""
        s_name = setter_names[i] if i < len(setter_names) else ""
        s_val = f"${closers_stats.get(s_name, {}).get('cash', 0) * 0.05:,.2f}" if s_name else ""
        rows.append(["", c_name, c_val, "", s_name, s_val])

    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="'💰 Dashboard Financiero'!A1",
        valueInputOption="RAW",
        body={"values": rows}
    ).execute()

    return sid


def write_formulario_pagos(service, sheet_ids):
    """Write empty Formulario de Pagos template."""
    sid = sheet_ids["📝 Formulario de Pagos"]

    rows = [
        ["Acumulado del Día"],
        ["$0.00"],
        ["", "", "Fecha de carga", ""],
        ["", "", "Programa", ""],
        ["", "", "Nombre", ""],
        ["", "", "Teléfono", ""],
        ["", "", "Efectivo Recaudado", ""],
        ["", "", "Closer", ""],
        ["", "", "Setter", ""],
        ["", "", "Método de Pago", ""],
        ["", "", "Comprobante", ""],
    ]

    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="'📝 Formulario de Pagos'!A1",
        valueInputOption="RAW",
        body={"values": rows}
    ).execute()

    return sid


def write_registro_pagos(service, data, sheet_ids):
    """Write Registro de Pagos from closed deals."""
    sid = sheet_ids["💳 Registro de Pagos"]

    headers = [
        "Fecha", "Producto", "Nombre del Cliente", "Teléfono",
        "Efectivo Recaudado", "Closer", "Setter",
        "Comprobante", "Concepto", "Fuente", "Mes"
    ]

    rows = [headers]
    ventas = [d for d in data if d["es_venta"] and d["cash_total"] > 0]
    for v in ventas:
        rows.append([
            v["fecha_pago1"],
            v["programa"],
            v["nombre"],
            v["telefono"],
            f"${v['cash_total']:,.2f}",
            v["closer"],
            v["setter"],
            "",
            "Pago" if v["pago1"] > 0 else "",
            v["fuente"],
            v["ano_mes"],
        ])

    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="'💳 Registro de Pagos'!A1",
        valueInputOption="RAW",
        body={"values": rows}
    ).execute()

    return sid


def write_estado_resultados(service, data, gastos_raw, sheet_ids):
    """Write Estado de Resultados - monthly P&L."""
    sid = sheet_ids["📈 Estado de Resultados"]
    monthly = calc_monthly_metrics(data)

    meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL"]

    # Build horizontal layout like example
    rows = [["Estado de Resultados - 2026"]]
    rows.append([])

    # Headers
    header = []
    for m in meses:
        header.extend([m, ""])
    rows.append(header)

    # Cash Collected
    cc_row = []
    for i, m in enumerate(meses):
        key = f"2026-{i+1}"
        val = monthly.get(key, {}).get("cash", 0)
        cc_row.extend([f"Cash Collected", f"${val:,.2f}"])
    rows.append(cc_row)

    # Comisiones
    com_row = []
    for i, m in enumerate(meses):
        key = f"2026-{i+1}"
        val = monthly.get(key, {}).get("cash", 0)
        com_row.extend(["Comisiones (15%)", f"${val * 0.15:,.2f}"])
    rows.append(com_row)

    # Gastos
    gastos_by_month = {}
    for g in gastos_raw:
        f = g.get("fields", {})
        mes = s(f.get("📆 Año-mes"))
        monto = n(f.get("💰 Pago 1"))
        if mes:
            gastos_by_month[mes] = gastos_by_month.get(mes, 0) + monto

    g_row = []
    for i, m in enumerate(meses):
        key = f"2026-{i+1}"
        val = gastos_by_month.get(key, 0)
        g_row.extend(["Gastos", f"${val:,.2f}"])
    rows.append(g_row)

    # Neto
    rows.append([])
    neto_row = []
    for i, m in enumerate(meses):
        key = f"2026-{i+1}"
        cash = monthly.get(key, {}).get("cash", 0)
        comis = cash * 0.15
        gastos = gastos_by_month.get(key, 0)
        neto = cash - comis - gastos
        neto_row.extend(["RESULTADO NETO", f"${neto:,.2f}"])
    rows.append(neto_row)

    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="'📈 Estado de Resultados'!A1",
        valueInputOption="RAW",
        body={"values": rows}
    ).execute()

    return sid


def write_gastos(service, gastos_raw, sheet_ids):
    """Write Gastos sheet."""
    sid = sheet_ids["💸 Gastos"]

    headers = ["Fecha", "Concepto", "Monto (en USD)", "Categoría", "Billetera", "Pagado a", "Estado"]
    rows = [headers]

    for g in gastos_raw:
        f = g.get("fields", {})
        rows.append([
            s(f.get("📆 Fecha de Pago 1")),
            s(f.get("👤 Nombre del Editor/Gasto")),
            n(f.get("💰 Pago 1")),
            s(f.get("Categoría")),
            s(f.get("Billetera")),
            s(f.get("Pago")),
            s(f.get("📊 Estado 1")),
        ])

    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="'💸 Gastos'!A1",
        valueInputOption="RAW",
        body={"values": rows}
    ).execute()

    return sid


def write_payroll(service, sheet_ids):
    """Write Payroll template."""
    sid = sheet_ids["👥 Payroll"]

    rows = [
        ["", "CONTRATISTAS FIJOS", "", "", "", "", "", "Abril"],
        ["", "Nombre y Apellido", "Medio de Pago", "Dirección de Pago", "Nº de Teléfono", "Puesto", "Departamento", "Honorarios Base", "Bonuses", "Comisión", "TOTAL", "Fecha de Pago", "Pagado"],
        [],
        ["1", "Valentino", "", "", "", "Closer / Setter", "Ventas", "", "", "", "", "", "FALSE"],
        ["2", "Agustín", "", "", "", "Closer", "Ventas", "", "", "", "", "", "FALSE"],
        ["3", "Juan Martín", "", "", "", "Closer", "Ventas", "", "", "", "", "", "FALSE"],
        ["4", "Guille", "", "", "", "Setter", "Ventas", "", "", "", "", "", "FALSE"],
    ]

    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="'👥 Payroll'!A1",
        valueInputOption="RAW",
        body={"values": rows}
    ).execute()

    return sid


def apply_formatting(service, sheet_ids):
    """Apply dark theme formatting to all sheets."""
    requests = []

    for name, sid in sheet_ids.items():
        # Dark bg + white text for all
        requests.append({
            "repeatCell": {
                "range": {"sheetId": sid},
                "cell": {
                    "userEnteredFormat": {
                        "backgroundColor": DARK,
                        "textFormat": {"foregroundColor": WHITE, "fontSize": 10, "fontFamily": "Inter"},
                    }
                },
                "fields": "userEnteredFormat(backgroundColor,textFormat)"
            }
        })

        # Freeze row 1 (except leaderboards which have custom headers)
        if "Leaderboard" not in name:
            requests.append({
                "updateSheetProperties": {
                    "properties": {"sheetId": sid, "gridProperties": {"frozenRowCount": 1}},
                    "fields": "gridProperties.frozenRowCount"
                }
            })

    # === LEADERBOARD CLOSERS ===
    sid = sheet_ids["🏆 Leaderboard Closers"]
    requests.append({"updateSheetProperties": {"properties": {"sheetId": sid, "tabColor": GOLD}, "fields": "tabColor"}})
    # Title row
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
            "cell": {"userEnteredFormat": {"textFormat": {"foregroundColor": GOLD, "bold": True, "fontSize": 18}, "horizontalAlignment": "CENTER"}},
            "fields": "userEnteredFormat(textFormat,horizontalAlignment)"
        }
    })
    # Header row (row 6, index 5)
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 5, "endRowIndex": 6},
            "cell": {"userEnteredFormat": {"backgroundColor": PURPLE_DK, "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 9}, "horizontalAlignment": "CENTER"}},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
        }
    })
    # Freeze at row 6
    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": sid, "gridProperties": {"frozenRowCount": 6}},
            "fields": "gridProperties.frozenRowCount"
        }
    })

    # === LEADERBOARD SETTERS ===
    sid = sheet_ids["🏆 Leaderboard Setters"]
    requests.append({"updateSheetProperties": {"properties": {"sheetId": sid, "tabColor": GOLD}, "fields": "tabColor"}})
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
            "cell": {"userEnteredFormat": {"textFormat": {"foregroundColor": GOLD, "bold": True, "fontSize": 18}, "horizontalAlignment": "CENTER"}},
            "fields": "userEnteredFormat(textFormat,horizontalAlignment)"
        }
    })
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 5, "endRowIndex": 6},
            "cell": {"userEnteredFormat": {"backgroundColor": PURPLE_DK, "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 9}, "horizontalAlignment": "CENTER"}},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
        }
    })

    # === METRICAS ===
    sid = sheet_ids["📊 Métricas 2026"]
    requests.append({"updateSheetProperties": {"properties": {"sheetId": sid, "tabColor": PURPLE}, "fields": "tabColor"}})
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
            "cell": {"userEnteredFormat": {"backgroundColor": PURPLE_DK, "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 11}, "horizontalAlignment": "CENTER"}},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
        }
    })
    # Section headers (VENTAS, INGRESOS, COMISIONES)
    for row_idx in [2, 12, 16]:
        requests.append({
            "repeatCell": {
                "range": {"sheetId": sid, "startRowIndex": row_idx, "endRowIndex": row_idx + 1},
                "cell": {"userEnteredFormat": {"backgroundColor": CARD, "textFormat": {"foregroundColor": PURPLE, "bold": True, "fontSize": 10}}},
                "fields": "userEnteredFormat(backgroundColor,textFormat)"
            }
        })
    # First col bold
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startColumnIndex": 0, "endColumnIndex": 1},
            "cell": {"userEnteredFormat": {"textFormat": {"bold": True}}},
            "fields": "userEnteredFormat.textFormat.bold"
        }
    })

    # === REGISTRO CALLS ===
    sid = sheet_ids["📞 Registro Calls"]
    requests.append({"updateSheetProperties": {"properties": {"sheetId": sid, "tabColor": GREEN}, "fields": "tabColor"}})
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
            "cell": {"userEnteredFormat": {"backgroundColor": GREEN_DK, "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 9}, "horizontalAlignment": "CENTER", "wrapStrategy": "WRAP"}},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)"
        }
    })
    requests.append({
        "updateDimensionProperties": {
            "range": {"sheetId": sid, "dimension": "ROWS", "startIndex": 0, "endIndex": 1},
            "properties": {"pixelSize": 40}, "fields": "pixelSize"
        }
    })
    # Alternating rows
    requests.append({
        "addBanding": {
            "bandedRange": {
                "range": {"sheetId": sid, "startRowIndex": 1, "endRowIndex": 622},
                "rowProperties": {"firstBandColor": DARK, "secondBandColor": CARD}
            }
        }
    })
    # Conditional formatting - Estado col (K, index 11)
    for text, color, bg in [("Cerrado", GREEN, GREEN_DK), ("No Cierre", RED, RED_DK), ("Pendiente", YELLOW, YELLOW_DK), ("seguimiento", PURPLE, PURPLE_DK)]:
        requests.append({
            "addConditionalFormatRule": {
                "rule": {
                    "ranges": [{"sheetId": sid, "startRowIndex": 1, "startColumnIndex": 11, "endColumnIndex": 12}],
                    "booleanRule": {
                        "condition": {"type": "TEXT_CONTAINS", "values": [{"userEnteredValue": text}]},
                        "format": {"backgroundColor": bg, "textFormat": {"foregroundColor": color}}
                    }
                }, "index": 0
            }
        })
    # Se presento col (J, index 10)
    requests.append({
        "addConditionalFormatRule": {
            "rule": {
                "ranges": [{"sheetId": sid, "startRowIndex": 1, "startColumnIndex": 10, "endColumnIndex": 11}],
                "booleanRule": {
                    "condition": {"type": "TEXT_EQ", "values": [{"userEnteredValue": "Sí"}]},
                    "format": {"backgroundColor": GREEN_DK, "textFormat": {"foregroundColor": GREEN}}
                }
            }, "index": 0
        }
    })
    requests.append({
        "addConditionalFormatRule": {
            "rule": {
                "ranges": [{"sheetId": sid, "startRowIndex": 1, "startColumnIndex": 10, "endColumnIndex": 11}],
                "booleanRule": {
                    "condition": {"type": "TEXT_EQ", "values": [{"userEnteredValue": "No"}]},
                    "format": {"backgroundColor": RED_DK, "textFormat": {"foregroundColor": RED}}
                }
            }, "index": 0
        }
    })

    # === DASHBOARD FINANCIERO ===
    sid = sheet_ids["💰 Dashboard Financiero"]
    requests.append({"updateSheetProperties": {"properties": {"sheetId": sid, "tabColor": YELLOW}, "fields": "tabColor"}})
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
            "cell": {"userEnteredFormat": {"textFormat": {"foregroundColor": GOLD, "bold": True, "fontSize": 14}}},
            "fields": "userEnteredFormat.textFormat"
        }
    })

    # === FORMULARIO DE PAGOS ===
    sid = sheet_ids["📝 Formulario de Pagos"]
    requests.append({"updateSheetProperties": {"properties": {"sheetId": sid, "tabColor": GREEN}, "fields": "tabColor"}})
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
            "cell": {"userEnteredFormat": {"textFormat": {"foregroundColor": GREEN, "bold": True, "fontSize": 16}}},
            "fields": "userEnteredFormat.textFormat"
        }
    })
    # Labels column C bold
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 2, "startColumnIndex": 2, "endColumnIndex": 3},
            "cell": {"userEnteredFormat": {"textFormat": {"bold": True, "foregroundColor": MUTED}}},
            "fields": "userEnteredFormat.textFormat"
        }
    })
    # Input cells D - light bg
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 2, "startColumnIndex": 3, "endColumnIndex": 4, "endRowIndex": 11},
            "cell": {"userEnteredFormat": {"backgroundColor": CARD, "textFormat": {"foregroundColor": WHITE, "fontSize": 11}}},
            "fields": "userEnteredFormat(backgroundColor,textFormat)"
        }
    })

    # === REGISTRO DE PAGOS ===
    sid = sheet_ids["💳 Registro de Pagos"]
    requests.append({"updateSheetProperties": {"properties": {"sheetId": sid, "tabColor": GREEN}, "fields": "tabColor"}})
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
            "cell": {"userEnteredFormat": {"backgroundColor": GREEN_DK, "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 9}, "horizontalAlignment": "CENTER"}},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
        }
    })

    # === ESTADO DE RESULTADOS ===
    sid = sheet_ids["📈 Estado de Resultados"]
    requests.append({"updateSheetProperties": {"properties": {"sheetId": sid, "tabColor": PURPLE}, "fields": "tabColor"}})
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
            "cell": {"userEnteredFormat": {"textFormat": {"foregroundColor": PURPLE, "bold": True, "fontSize": 14}}},
            "fields": "userEnteredFormat.textFormat"
        }
    })

    # === GASTOS ===
    sid = sheet_ids["💸 Gastos"]
    requests.append({"updateSheetProperties": {"properties": {"sheetId": sid, "tabColor": RED}, "fields": "tabColor"}})
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
            "cell": {"userEnteredFormat": {"backgroundColor": RED_DK, "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 9}, "horizontalAlignment": "CENTER"}},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
        }
    })

    # === PAYROLL ===
    sid = sheet_ids["👥 Payroll"]
    requests.append({"updateSheetProperties": {"properties": {"sheetId": sid, "tabColor": YELLOW}, "fields": "tabColor"}})
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 2},
            "cell": {"userEnteredFormat": {"backgroundColor": CARD, "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 10}}},
            "fields": "userEnteredFormat(backgroundColor,textFormat)"
        }
    })

    # Auto-resize all sheets
    for name, sid in sheet_ids.items():
        requests.append({
            "autoResizeDimensions": {
                "dimensions": {"sheetId": sid, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 25}
            }
        })

    # Execute all formatting
    print(f"  Applying {len(requests)} formatting requests...")
    # Split into batches of 50 to avoid limits
    for i in range(0, len(requests), 50):
        batch = requests[i:i+50]
        service.spreadsheets().batchUpdate(
            spreadsheetId=SPREADSHEET_ID, body={"requests": batch}
        ).execute()
        print(f"    Batch {i//50 + 1} done ({len(batch)} requests)")


def main():
    print("Loading data...")
    llamadas_raw, gastos_raw = load_data()
    data = process_llamadas(llamadas_raw)
    print(f"  {len(data)} llamadas, {len(gastos_raw)} gastos")

    print("\nConnecting to Sheets API...")
    service = get_service()

    print("\nCreating sheets...")
    sheet_ids = clear_and_setup_sheets(service)
    print(f"  Created: {list(sheet_ids.keys())}")

    print("\nWriting data...")
    write_leaderboard_closers(service, data, sheet_ids)
    print("  ✓ Leaderboard Closers")
    write_leaderboard_setters(service, data, sheet_ids)
    print("  ✓ Leaderboard Setters")
    write_metricas(service, data, sheet_ids)
    print("  ✓ Métricas 2026")
    write_registro_calls(service, data, sheet_ids)
    print("  ✓ Registro Calls (620 rows)")
    write_dashboard_financiero(service, data, sheet_ids)
    print("  ✓ Dashboard Financiero")
    write_formulario_pagos(service, sheet_ids)
    print("  ✓ Formulario de Pagos")
    write_registro_pagos(service, data, sheet_ids)
    print("  ✓ Registro de Pagos")
    write_estado_resultados(service, data, gastos_raw, sheet_ids)
    print("  ✓ Estado de Resultados")
    write_gastos(service, gastos_raw, sheet_ids)
    print("  ✓ Gastos")
    write_payroll(service, sheet_ids)
    print("  ✓ Payroll")

    print("\nFormatting...")
    apply_formatting(service, sheet_ids)

    print(f"\n✅ Done! Sheet: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}")


if __name__ == "__main__":
    main()
