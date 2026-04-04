"""
Complete rebuild of ROMS CRM Google Sheet.
- Full Registro Calls with ALL payment/cuota columns
- Setter name resolution
- Live formulas in leaderboards, métricas, dashboard, estado de resultados
- Professional dark theme formatting with proper dropdowns
"""
import sys, io, json, os, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from google.oauth2 import service_account
from googleapiclient.discovery import build

SPREADSHEET_ID = "14l6eg-JfY5M00NRSmOT-38f5eRsC0xsOqZl9bsggDv4"
CREDS_FILE = os.path.join(os.path.dirname(__file__), "credentials.json")
DATA_DIR = os.path.join(os.path.dirname(__file__), "airtable-data")
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

# Setter ID -> Name mapping (from Airtable)
SETTER_MAP = {"recDCuKteFEdPDQMb": "Valen"}

CLOSERS = ["Valentino Granata", "Agustín", "Juan Martín", "Juanma", "Fran"]
SETTERS = ["Valen", "Guille"]
MONTHS = ["2026-1", "2026-2", "2026-3", "2026-4", "2026-5", "2026-6",
          "2026-7", "2026-8", "2026-9", "2026-10", "2026-11", "2026-12"]

# ── Colors ──
DARK   = {"red": 0.051, "green": 0.051, "blue": 0.059}
CARD   = {"red": 0.094, "green": 0.094, "blue": 0.106}
PURPLE = {"red": 0.545, "green": 0.361, "blue": 0.965}
PUR_DK = {"red": 0.30,  "green": 0.12,  "blue": 0.55}
GREEN  = {"red": 0.133, "green": 0.773, "blue": 0.369}
GRN_DK = {"red": 0.08,  "green": 0.22,  "blue": 0.12}
RED    = {"red": 0.937, "green": 0.267, "blue": 0.267}
RED_DK = {"red": 0.30,  "green": 0.08,  "blue": 0.08}
YELLOW = {"red": 0.918, "green": 0.702, "blue": 0.031}
YEL_DK = {"red": 0.25,  "green": 0.20,  "blue": 0.05}
GOLD   = {"red": 1.0,   "green": 0.84,  "blue": 0.0}
WHITE  = {"red": 0.93,  "green": 0.93,  "blue": 0.93}
MUTED  = {"red": 0.44,  "green": 0.44,  "blue": 0.48}
BLACK  = {"red": 0.0,   "green": 0.0,   "blue": 0.0}
FORM_W = {"red": 1.0,   "green": 1.0,   "blue": 1.0}
PINK   = {"red": 1.0,   "green": 0.75,  "blue": 0.75}
GOLD_B = {"red": 0.85,  "green": 0.75,  "blue": 0.45}
BLUE_B = {"red": 0.6,   "green": 0.75,  "blue": 0.9}

RC = "'📞 Registro Calls'"  # Sheet reference for formulas
RP = "'💳 Registro de Pagos'"


def get_service():
    creds = service_account.Credentials.from_service_account_file(CREDS_FILE, scopes=SCOPES)
    return build("sheets", "v4", credentials=creds)


def s(val):
    if val is None: return ""
    if isinstance(val, list): return ", ".join(str(v) for v in val)
    return str(val).strip()


def n(val):
    if val is None: return 0
    try: return float(val)
    except: return 0


def border(color=MUTED, style="SOLID"):
    return {"style": style, "color": color, "width": 1}


def load_and_process():
    """Load Airtable data and process into clean records."""
    with open(os.path.join(DATA_DIR, "reporte_llamadas.json"), "r", encoding="utf-8") as f:
        raw = json.load(f)
    with open(os.path.join(DATA_DIR, "gastos.json"), "r", encoding="utf-8") as f:
        gastos = json.load(f)

    data = []
    for r in raw:
        f = r.get("fields", {})

        # Resolve closer name
        closer_obj = f.get("👤 Closer")
        closer = closer_obj.get("name", "") if isinstance(closer_obj, dict) else s(closer_obj)

        # Resolve setter name from linked record
        setter_ids = f.get("🙎\u200d♂️ Setter", [])
        if isinstance(setter_ids, list) and setter_ids:
            setter = SETTER_MAP.get(setter_ids[0], "")
        else:
            setter = ""

        # Es presentada
        se_presento = "Sí" if f.get("✅ Es Presentada") == 1 else "No" if f.get("✅ Es Presentada") == 0 else ""

        # Calificado
        cal_raw = s(f.get("📌Lead Calificado?"))
        if "Calificado" in cal_raw and "No" not in cal_raw:
            calificado = "Sí"
        elif "No" in cal_raw:
            calificado = "No"
        else:
            calificado = s(f.get("Calificado Auto", ""))
            if calificado == "1": calificado = "Sí"
            elif calificado == "0": calificado = "No"
            else: calificado = ""

        # Month — derive from fecha_llamada if missing
        mes = s(f.get("📆 Año-mes"))
        fecha_ll = s(f.get("📆 Fecha de Llamada"))
        if (not mes or "No identificada" in mes) and fecha_ll:
            try:
                parts = fecha_ll.split("-")
                mes = f"{parts[0]}-{int(parts[1])}"
            except:
                pass

        data.append({
            "nombre": s(f.get("👤 Nombre del Lead")),
            "instagram": s(f.get("📲 Instagram")),
            "fecha_llamada": fecha_ll,
            "fecha_agenda": s(f.get("📆 Fecha de Agendado")),
            "setter": setter,
            "closer": closer,
            "fuente": s(f.get("🚀 Fuentes") or f.get("🚀 Funte del lead")),
            "medio": s(f.get("¿Desde dónde te agendaste?")),
            "calificado": calificado,
            "contexto_setter": s(f.get("📑 Contexto Setter")),
            "se_presento": se_presento,
            "estado": s(f.get("📌 Estado de la Llamada")),
            "programa": s(f.get("🏆 Programa Pitcheado")),
            "contexto_closer": s(f.get("📑 Contexto Closer (Post CAll)")),
            "cash_dia1": n(f.get("🚀 AOV Día 1")),
            "cash_total": n(f.get("general🏆 Cash Collected") or f.get("🏆 Cash Collected")),
            "ticket_total": n(f.get("💰 Ticket Total")),
            "plan_pago": s(f.get("🧾 Plan de Pago (Venta)")),
            "pago1": n(f.get("💰 Pago 1")),
            "estado_p1": s(f.get("📊 Estado 1")),
            "pago2": n(f.get("💰 Pago 2")),
            "estado_p2": s(f.get("📊 Estado 2")),
            "pago3": n(f.get("💰 Pago 3")),
            "estado_p3": s(f.get("📊 Estado 3")),
            "saldo": n(f.get("❗️ Saldo Pendiente")),
            "fecha_pago1": s(f.get("📆 Fecha de Pago 1")),
            "metodo_pago": s(f.get("Metodo de pago")),
            "email": s(f.get("📧 Email")),
            "telefono": s(f.get("📞 Teléfono")),
            "mes": mes,
            "es_venta": f.get("💰 Es Venta") == 1,
        })

    return data, gastos


def clear_and_setup(service):
    """Delete all sheets, create fresh ones."""
    meta = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    existing = {sh["properties"]["title"]: sh["properties"]["sheetId"] for sh in meta["sheets"]}

    sheets = [
        "📞 Registro Calls",
        "🏆 Leaderboard Closers",
        "🏆 Leaderboard Setters",
        "📊 Métricas 2026",
        "💰 Dashboard Financiero",
        "📝 Formulario de Pagos",
        "💳 Registro de Pagos",
        "📈 Estado de Resultados",
        "💸 Gastos",
        "👥 Payroll",
    ]

    # Create temp
    if "__TEMP__" not in existing:
        service.spreadsheets().batchUpdate(spreadsheetId=SPREADSHEET_ID,
            body={"requests": [{"addSheet": {"properties": {"title": "__TEMP__"}}}]}).execute()

    # Delete all except temp
    meta = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    temp_id = None
    del_reqs = []
    for sh in meta["sheets"]:
        t, sid = sh["properties"]["title"], sh["properties"]["sheetId"]
        if t == "__TEMP__":
            temp_id = sid
        else:
            del_reqs.append({"deleteSheet": {"sheetId": sid}})
    if del_reqs:
        service.spreadsheets().batchUpdate(spreadsheetId=SPREADSHEET_ID, body={"requests": del_reqs}).execute()

    # Create new sheets
    add_reqs = [{"addSheet": {"properties": {"title": name, "index": i}}} for i, name in enumerate(sheets)]
    service.spreadsheets().batchUpdate(spreadsheetId=SPREADSHEET_ID, body={"requests": add_reqs}).execute()

    # Delete temp
    if temp_id:
        service.spreadsheets().batchUpdate(spreadsheetId=SPREADSHEET_ID,
            body={"requests": [{"deleteSheet": {"sheetId": temp_id}}]}).execute()

    meta = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    return {sh["properties"]["title"]: sh["properties"]["sheetId"] for sh in meta["sheets"]}


# ═══════════════════════════════════════════
#  REGISTRO CALLS — Complete CRM table
# ═══════════════════════════════════════════
def write_registro_calls(service, data, sid):
    """Write complete Registro Calls with ALL columns including payments."""
    # Column layout (A-AC = 29 columns):
    # A: Nombre | B: Instagram | C: Fecha Llamada | D: Fecha Agenda
    # E: Setter | F: Closer | G: Estado | H: ¿Se presentó?
    # I: Calificado | J: Programa | K: Contexto Setter | L: Contexto Closer
    # M: Cash Día 1 | N: Cash Total | O: Ticket Total | P: Plan de Pago
    # Q: Pago 1 | R: Estado Pago 1 | S: Pago 2 | T: Estado Pago 2
    # U: Pago 3 | V: Estado Pago 3 | W: Saldo Pendiente
    # X: Fecha Pago 1 | Y: Método Pago | Z: Fuente | AA: Medio Agenda
    # AB: Email | AC: Teléfono | AD: Mes

    headers = [
        "Nombre", "Instagram", "Fecha Llamada", "Fecha Agenda",
        "Setter", "Closer", "Estado", "¿Se presentó?",
        "Calificado", "Programa", "Contexto Setter", "Contexto Closer",
        "Cash Día 1", "Cash Total", "Ticket Total", "Plan de Pago",
        "Pago 1", "Estado Pago 1", "Pago 2", "Estado Pago 2",
        "Pago 3", "Estado Pago 3", "Saldo Pendiente",
        "Fecha Pago 1", "Método Pago", "Fuente", "Medio Agenda",
        "Email", "Teléfono", "Mes"
    ]

    rows = [headers]
    sorted_data = sorted(data, key=lambda x: x["fecha_llamada"] or "0", reverse=True)

    for d in sorted_data:
        rows.append([
            d["nombre"], d["instagram"], d["fecha_llamada"], d["fecha_agenda"],
            d["setter"], d["closer"], d["estado"], d["se_presento"],
            d["calificado"], d["programa"], d["contexto_setter"][:200] if d["contexto_setter"] else "",
            d["contexto_closer"][:200] if d["contexto_closer"] else "",
            d["cash_dia1"] if d["cash_dia1"] else "",
            d["cash_total"] if d["cash_total"] else "",
            d["ticket_total"] if d["ticket_total"] else "",
            d["plan_pago"],
            d["pago1"] if d["pago1"] else "",
            d["estado_p1"], d["pago2"] if d["pago2"] else "",
            d["estado_p2"], d["pago3"] if d["pago3"] else "",
            d["estado_p3"], d["saldo"] if d["saldo"] else "",
            d["fecha_pago1"], d["metodo_pago"],
            d["fuente"], d["medio"][:80] if d["medio"] else "",
            d["email"], d["telefono"],
            d["mes"],
        ])

    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="'📞 Registro Calls'!A1",
        valueInputOption="RAW",
        body={"values": rows}
    ).execute()

    return len(rows) - 1  # data row count


def format_registro_calls(sid, row_count):
    """Return formatting requests for Registro Calls."""
    reqs = []

    # Dark bg + white text whole sheet
    reqs.append({"repeatCell": {"range": {"sheetId": sid},
        "cell": {"userEnteredFormat": {"backgroundColor": DARK,
            "textFormat": {"foregroundColor": WHITE, "fontFamily": "Inter", "fontSize": 10}}},
        "fields": "userEnteredFormat(backgroundColor,textFormat)"}})

    # Header row — green dark bg, bold, centered, wrapped
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1, "endColumnIndex": 30},
        "cell": {"userEnteredFormat": {
            "backgroundColor": GRN_DK,
            "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 10},
            "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP",
            "borders": {"bottom": border(GREEN, "SOLID_MEDIUM")}}},
        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy,borders)"}})

    reqs.append({"updateDimensionProperties": {
        "range": {"sheetId": sid, "dimension": "ROWS", "startIndex": 0, "endIndex": 1},
        "properties": {"pixelSize": 40}, "fields": "pixelSize"}})

    # Freeze header + first 2 columns (Nombre, Instagram)
    reqs.append({"updateSheetProperties": {
        "properties": {"sheetId": sid, "gridProperties": {"frozenRowCount": 1, "frozenColumnCount": 2}},
        "fields": "gridProperties(frozenRowCount,frozenColumnCount)"}})

    # Alternating row colors
    reqs.append({"addBanding": {"bandedRange": {
        "range": {"sheetId": sid, "startRowIndex": 1, "endRowIndex": row_count + 1},
        "rowProperties": {"firstBandColor": DARK, "secondBandColor": CARD}}}})

    # Currency format: M(12), N(13), O(14), Q(16), S(18), U(20), W(22)
    for col in [12, 13, 14, 16, 18, 20, 22]:
        reqs.append({"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 1, "startColumnIndex": col, "endColumnIndex": col+1, "endRowIndex": row_count+1},
            "cell": {"userEnteredFormat": {"numberFormat": {"type": "CURRENCY", "pattern": "$#,##0.00"}}},
            "fields": "userEnteredFormat.numberFormat"}})

    # Conditional formatting — Estado (col G = index 6)
    for text, fg, bg in [
        ("Cerrado", GREEN, GRN_DK), ("No Cierre", RED, RED_DK),
        ("Pendiente", YELLOW, YEL_DK), ("Seguimiento", PURPLE, PUR_DK),
        ("Re-programada", GOLD, YEL_DK), ("Cancelada", RED, RED_DK),
        ("Reserva", PURPLE, PUR_DK),
    ]:
        reqs.append({"addConditionalFormatRule": {"rule": {
            "ranges": [{"sheetId": sid, "startRowIndex": 1, "startColumnIndex": 6, "endColumnIndex": 7}],
            "booleanRule": {
                "condition": {"type": "TEXT_CONTAINS", "values": [{"userEnteredValue": text}]},
                "format": {"backgroundColor": bg, "textFormat": {"foregroundColor": fg}}}}, "index": 0}})

    # Conditional — Se presentó (col H = index 7)
    for text, fg, bg in [("Sí", GREEN, GRN_DK), ("No", RED, RED_DK)]:
        reqs.append({"addConditionalFormatRule": {"rule": {
            "ranges": [{"sheetId": sid, "startRowIndex": 1, "startColumnIndex": 7, "endColumnIndex": 8}],
            "booleanRule": {
                "condition": {"type": "TEXT_EQ", "values": [{"userEnteredValue": text}]},
                "format": {"backgroundColor": bg, "textFormat": {"foregroundColor": fg}}}}, "index": 0}})

    # Conditional — Estado Pago 1/2/3 (cols R=17, T=19, V=21)
    for col in [17, 19, 21]:
        for text, fg, bg in [("Pagado", GREEN, GRN_DK), ("Pendiente", YELLOW, YEL_DK)]:
            reqs.append({"addConditionalFormatRule": {"rule": {
                "ranges": [{"sheetId": sid, "startRowIndex": 1, "startColumnIndex": col, "endColumnIndex": col+1}],
                "booleanRule": {
                    "condition": {"type": "TEXT_CONTAINS", "values": [{"userEnteredValue": text}]},
                    "format": {"backgroundColor": bg, "textFormat": {"foregroundColor": fg}}}}, "index": 0}})

    # Dropdowns
    dropdowns = {
        (6, 7): ["⏳ Pendiente", "🚀 Cerrado", "⚠️ No Cierre", "🔄 Seguimiento", "📅 Re-programada", "🚨 Cancelada", "💰 Reserva", "Adentro en Seguimiento"],
        (7, 8): ["Sí", "No"],
        (8, 9): ["Sí", "No", "Se desconoce"],
        (9, 10): ["Consultoría", "Omnipresencia", "Multicuentas", "ROMS 7"],
        (17, 18): ["Pagado", "Pendiente"],
        (19, 20): ["Pagado", "Pendiente"],
        (21, 22): ["Pagado", "Pendiente"],
    }
    for (start_col, end_col), values in dropdowns.items():
        reqs.append({"setDataValidation": {
            "range": {"sheetId": sid, "startRowIndex": 1, "startColumnIndex": start_col, "endColumnIndex": end_col, "endRowIndex": 700},
            "rule": {"condition": {"type": "ONE_OF_LIST",
                "values": [{"userEnteredValue": v} for v in values]},
                "showCustomUi": True, "strict": False}}})

    # Column widths
    col_widths = {0: 180, 1: 140, 2: 100, 3: 100, 4: 80, 5: 140, 6: 140, 7: 80,
                  8: 80, 9: 160, 10: 200, 11: 200, 12: 100, 13: 100, 14: 100,
                  15: 100, 16: 80, 17: 80, 18: 80, 19: 80, 20: 80, 21: 80, 22: 100,
                  23: 100, 24: 100, 25: 80, 26: 120, 27: 160, 28: 120, 29: 80}
    for col, w in col_widths.items():
        reqs.append({"updateDimensionProperties": {
            "range": {"sheetId": sid, "dimension": "COLUMNS", "startIndex": col, "endIndex": col+1},
            "properties": {"pixelSize": w}, "fields": "pixelSize"}})

    # Tab color
    reqs.append({"updateSheetProperties": {"properties": {"sheetId": sid, "tabColor": GREEN}, "fields": "tabColor"}})

    return reqs


# ═══════════════════════════════════════════
#  LEADERBOARD CLOSERS
# ═══════════════════════════════════════════
def write_leaderboard_closers(service, sid):
    """Write leaderboard with SUMIFS/COUNTIFS from Registro Calls."""
    # New column mapping: F=Closer, AD=Mes(30th col), M=CashDia1, H=SePresentó, G=Estado

    rows = [
        ["🏆 LEADERBOARD DE CLOSERS 🏆"],
        [],
        ["", "📅 Mes:", "2026-3", "", "", "", "", "", "", "", "", "", ""],
        [],
        ["#", "CLOSER", "💰 Cash Collected", "🎯 Unidades", "📞 Llamadas",
         "✅ Presentadas", "📊 Show Up %", "📊 Cierre %", "📊 Cierre % (Pres.)",
         "💵 Ticket Promedio", "🤑 COMISIÓN (10%)"],
    ]

    for i, closer in enumerate(CLOSERS):
        r = i + 6  # 1-indexed row number
        pos = ["🥇", "🥈", "🥉"][i] if i < 3 else str(i+1)
        rows.append([
            pos, closer,
            f'=SUMIFS({RC}!$M:$M,{RC}!$F:$F,B{r},{RC}!$AD:$AD,$C$3)',
            f'=COUNTIFS({RC}!$F:$F,B{r},{RC}!$AD:$AD,$C$3,{RC}!$G:$G,"*Cerrado*")',
            f'=COUNTIFS({RC}!$F:$F,B{r},{RC}!$AD:$AD,$C$3)',
            f'=COUNTIFS({RC}!$F:$F,B{r},{RC}!$AD:$AD,$C$3,{RC}!$H:$H,"Sí")',
            f'=IFERROR(F{r}/E{r},0)',
            f'=IFERROR(D{r}/E{r},0)',
            f'=IFERROR(D{r}/F{r},0)',
            f'=IFERROR(C{r}/D{r},0)',
            f'=C{r}*0.10',
        ])

    de = 5 + len(CLOSERS)
    tr = de + 2
    rows.extend([[], [
        "", "📊 TOTAL MES", f"=SUM(C6:C{de})", f"=SUM(D6:D{de})", f"=SUM(E6:E{de})",
        f"=SUM(F6:F{de})", f"=IFERROR(F{tr}/E{tr},0)", f"=IFERROR(D{tr}/E{tr},0)",
        f"=IFERROR(D{tr}/F{tr},0)", f"=IFERROR(C{tr}/D{tr},0)", f"=SUM(K6:K{de})"
    ]])

    hr = tr + 2
    rows.extend([[], [
        "", "📈 TOTAL HISTÓRICO",
        f'=SUMIF({RC}!$F:$F,"<>",{RC}!$M:$M)',
        f'=COUNTIF({RC}!$G:$G,"*Cerrado*")',
        f'=COUNTA({RC}!$F:$F)-1',
        f'=COUNTIF({RC}!$H:$H,"Sí")',
        f"=IFERROR(F{hr}/E{hr},0)", f"=IFERROR(D{hr}/E{hr},0)",
        f"=IFERROR(D{hr}/F{hr},0)", f"=IFERROR(C{hr}/D{hr},0)", f"=C{hr}*0.10"
    ]])

    rows.extend([[], [], ["", "", "", "", "", "", "", "", "", "COMISIÓN CLOSER = 10% del Cash Collected"]])

    service.spreadsheets().values().update(spreadsheetId=SPREADSHEET_ID,
        range="'🏆 Leaderboard Closers'!A1", valueInputOption="USER_ENTERED",
        body={"values": rows}).execute()

    return _leaderboard_format(sid, len(CLOSERS))


def _leaderboard_format(sid, n_members, is_setter=False):
    """Generate formatting for leaderboard sheets."""
    reqs = []
    end_col = 11 if not is_setter else 11

    # Dark bg
    reqs.append({"repeatCell": {"range": {"sheetId": sid},
        "cell": {"userEnteredFormat": {"backgroundColor": DARK,
            "textFormat": {"foregroundColor": WHITE, "fontFamily": "Inter", "fontSize": 10}}},
        "fields": "userEnteredFormat(backgroundColor,textFormat)"}})

    # Title row — big gold, merge
    reqs.append({"mergeCells": {"range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": end_col}, "mergeType": "MERGE_ALL"}})
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
        "cell": {"userEnteredFormat": {"textFormat": {"foregroundColor": GOLD, "bold": True, "fontSize": 20},
            "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE"}},
        "fields": "userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment)"}})
    reqs.append({"updateDimensionProperties": {
        "range": {"sheetId": sid, "dimension": "ROWS", "startIndex": 0, "endIndex": 1},
        "properties": {"pixelSize": 50}, "fields": "pixelSize"}})

    # Mes selector row — purple
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 2, "endRowIndex": 3, "startColumnIndex": 1, "endColumnIndex": 3},
        "cell": {"userEnteredFormat": {"textFormat": {"foregroundColor": PURPLE, "bold": True, "fontSize": 13}}},
        "fields": "userEnteredFormat.textFormat"}})

    # Mes dropdown
    reqs.append({"setDataValidation": {
        "range": {"sheetId": sid, "startRowIndex": 2, "endRowIndex": 3, "startColumnIndex": 2, "endColumnIndex": 3},
        "rule": {"condition": {"type": "ONE_OF_LIST",
            "values": [{"userEnteredValue": m} for m in MONTHS]},
            "showCustomUi": True, "strict": True}}})

    # Header row (row 5, idx 4) — purple bg
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 4, "endRowIndex": 5, "startColumnIndex": 0, "endColumnIndex": end_col},
        "cell": {"userEnteredFormat": {
            "backgroundColor": PUR_DK,
            "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 10},
            "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP",
            "borders": {"bottom": border(PURPLE, "SOLID_MEDIUM")}}},
        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy,borders)"}})
    reqs.append({"updateDimensionProperties": {
        "range": {"sheetId": sid, "dimension": "ROWS", "startIndex": 4, "endIndex": 5},
        "properties": {"pixelSize": 42}, "fields": "pixelSize"}})

    # Data rows (5 to 5+n) — centered, alternating
    for r in range(5, 5 + n_members):
        bg = CARD if (r - 5) % 2 == 0 else DARK
        reqs.append({"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": r, "endRowIndex": r+1, "startColumnIndex": 0, "endColumnIndex": end_col},
            "cell": {"userEnteredFormat": {"backgroundColor": bg,
                "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE",
                "borders": {"bottom": border({"red": 0.12, "green": 0.12, "blue": 0.14})}}},
            "fields": "userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,borders)"}})

    # First position gold
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 5, "endRowIndex": 6, "startColumnIndex": 0, "endColumnIndex": 1},
        "cell": {"userEnteredFormat": {"textFormat": {"foregroundColor": GOLD, "bold": True, "fontSize": 14}}},
        "fields": "userEnteredFormat.textFormat"}})

    # Totals rows formatting
    total_rows = [5 + n_members + 1, 5 + n_members + 3]
    for tr in total_rows:
        reqs.append({"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": tr, "endRowIndex": tr+1, "startColumnIndex": 0, "endColumnIndex": end_col},
            "cell": {"userEnteredFormat": {"backgroundColor": PUR_DK,
                "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 10},
                "horizontalAlignment": "CENTER"}},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"}})

    # Currency cols (C=2, J=9, K=10)
    cash_col = 2
    comis_col = 10
    ticket_col = 9
    for col in [cash_col, ticket_col, comis_col]:
        reqs.append({"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 5, "startColumnIndex": col, "endColumnIndex": col+1, "endRowIndex": 20},
            "cell": {"userEnteredFormat": {"numberFormat": {"type": "CURRENCY", "pattern": "$#,##0.00"}}},
            "fields": "userEnteredFormat.numberFormat"}})

    # Percentage cols (G=6, H=7, I=8)
    for col in [6, 7, 8]:
        reqs.append({"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 5, "startColumnIndex": col, "endColumnIndex": col+1, "endRowIndex": 20},
            "cell": {"userEnteredFormat": {"numberFormat": {"type": "PERCENT", "pattern": "0.0%"}}},
            "fields": "userEnteredFormat.numberFormat"}})

    # Cash column green color
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 5, "startColumnIndex": cash_col, "endColumnIndex": cash_col+1, "endRowIndex": 20},
        "cell": {"userEnteredFormat": {"textFormat": {"foregroundColor": GREEN}}},
        "fields": "userEnteredFormat.textFormat.foregroundColor"}})

    # Commission column yellow
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 5, "startColumnIndex": comis_col, "endColumnIndex": comis_col+1, "endRowIndex": 20},
        "cell": {"userEnteredFormat": {"textFormat": {"foregroundColor": YELLOW}}},
        "fields": "userEnteredFormat.textFormat.foregroundColor"}})

    # Tab color gold
    reqs.append({"updateSheetProperties": {"properties": {"sheetId": sid, "tabColor": GOLD}, "fields": "tabColor"}})

    # Freeze header
    reqs.append({"updateSheetProperties": {
        "properties": {"sheetId": sid, "gridProperties": {"frozenRowCount": 5}},
        "fields": "gridProperties.frozenRowCount"}})

    return reqs


# ═══════════════════════════════════════════
#  LEADERBOARD SETTERS
# ═══════════════════════════════════════════
def write_leaderboard_setters(service, sid):
    rows = [
        ["🏆 LEADERBOARD DE SETTERS 🏆"],
        [],
        ["", "📅 Mes:", "2026-3"],
        [],
        ["#", "SETTER", "📅 Agendas", "✅ Presentadas", "🎯 Cerradas",
         "📊 Tasa Agenda %", "📋 Calificadas",
         "💰 Cash (de sus leads)", "🤑 COMISIÓN (5%)"],
    ]

    for i, setter in enumerate(SETTERS):
        r = i + 6
        pos = ["🥇", "🥈"][i] if i < 2 else str(i+1)
        rows.append([
            pos, setter,
            f'=COUNTIFS({RC}!$E:$E,B{r},{RC}!$AD:$AD,$C$3)',
            f'=COUNTIFS({RC}!$E:$E,B{r},{RC}!$AD:$AD,$C$3,{RC}!$H:$H,"Sí")',
            f'=COUNTIFS({RC}!$E:$E,B{r},{RC}!$AD:$AD,$C$3,{RC}!$G:$G,"*Cerrado*")',
            f'=IFERROR(D{r}/C{r},0)',
            f'=COUNTIFS({RC}!$E:$E,B{r},{RC}!$AD:$AD,$C$3,{RC}!$I:$I,"Sí")',
            f'=SUMIFS({RC}!$M:$M,{RC}!$E:$E,B{r},{RC}!$AD:$AD,$C$3)',
            f'=H{r}*0.05',
        ])

    de = 5 + len(SETTERS)
    tr = de + 2
    rows.extend([[], [
        "", "📊 TOTAL MES", f"=SUM(C6:C{de})", f"=SUM(D6:D{de})", f"=SUM(E6:E{de})",
        f"=IFERROR(D{tr}/C{tr},0)", f"=SUM(G6:G{de})", f"=SUM(H6:H{de})", f"=SUM(I6:I{de})"
    ]])
    rows.extend([[], [], ["", "", "", "", "", "", "", "COMISIÓN SETTER = 5% del Cash de sus leads"]])

    service.spreadsheets().values().update(spreadsheetId=SPREADSHEET_ID,
        range="'🏆 Leaderboard Setters'!A1", valueInputOption="USER_ENTERED",
        body={"values": rows}).execute()

    reqs = _leaderboard_format(sid, len(SETTERS), is_setter=True)
    # Fix currency/pct cols for setters: H=7 cash, I=8 comis, F=5 pct
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 5, "startColumnIndex": 7, "endColumnIndex": 9, "endRowIndex": 15},
        "cell": {"userEnteredFormat": {"numberFormat": {"type": "CURRENCY", "pattern": "$#,##0.00"}}},
        "fields": "userEnteredFormat.numberFormat"}})
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 5, "startColumnIndex": 5, "endColumnIndex": 6, "endRowIndex": 15},
        "cell": {"userEnteredFormat": {"numberFormat": {"type": "PERCENT", "pattern": "0.0%"}}},
        "fields": "userEnteredFormat.numberFormat"}})
    return reqs


# ═══════════════════════════════════════════
#  MÉTRICAS 2026
# ═══════════════════════════════════════════
def write_metricas(service, sid):
    meses_l = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    mks = [f"2026-{i+1}" for i in range(12)]

    rows = [
        ["📊 MÉTRICAS 2026"] + [""] * 12,
        [""] + meses_l,
        ["VENTAS"],
        ["Llamadas Totales"] + [f'=COUNTIFS({RC}!$AD:$AD,"{mk}")' for mk in mks],
        ["Presentadas"] + [f'=COUNTIFS({RC}!$AD:$AD,"{mk}",{RC}!$H:$H,"Sí")' for mk in mks],
        ["Calificadas"] + [f'=COUNTIFS({RC}!$AD:$AD,"{mk}",{RC}!$I:$I,"Sí")' for mk in mks],
        ["Show Up %"] + [f"=IFERROR({chr(66+i)}5/{chr(66+i)}4,0)" for i in range(12)],
        ["Cerradas"] + [f'=COUNTIFS({RC}!$AD:$AD,"{mk}",{RC}!$G:$G,"*Cerrado*")' for mk in mks],
        ["Cierre % (Total)"] + [f"=IFERROR({chr(66+i)}8/{chr(66+i)}4,0)" for i in range(12)],
        ["Cierre % (Presentadas)"] + [f"=IFERROR({chr(66+i)}8/{chr(66+i)}5,0)" for i in range(12)],
        [],
        ["INGRESOS"],
        ["Cash Collected Día 1"] + [f'=SUMIFS({RC}!$M:$M,{RC}!$AD:$AD,"{mk}")' for mk in mks],
        ["Cash Collected Total"] + [f'=SUMIFS({RC}!$N:$N,{RC}!$AD:$AD,"{mk}")' for mk in mks],
        ["Ticket Promedio"] + [f"=IFERROR({chr(66+i)}13/{chr(66+i)}8,0)" for i in range(12)],
        [],
        ["COMISIONES"],
        ["Closers (10%)"] + [f"={chr(66+i)}13*0.10" for i in range(12)],
        ["Setters (5%)"] + [f"={chr(66+i)}13*0.05" for i in range(12)],
        ["TOTAL COMISIONES"] + [f"={chr(66+i)}18+{chr(66+i)}19" for i in range(12)],
    ]

    service.spreadsheets().values().update(spreadsheetId=SPREADSHEET_ID,
        range="'📊 Métricas 2026'!A1", valueInputOption="USER_ENTERED",
        body={"values": rows}).execute()

    reqs = []
    # Dark bg
    reqs.append({"repeatCell": {"range": {"sheetId": sid},
        "cell": {"userEnteredFormat": {"backgroundColor": DARK,
            "textFormat": {"foregroundColor": WHITE, "fontFamily": "Inter", "fontSize": 10}}},
        "fields": "userEnteredFormat(backgroundColor,textFormat)"}})

    # Title
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": 13},
        "cell": {"userEnteredFormat": {"backgroundColor": PUR_DK,
            "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 14}, "horizontalAlignment": "CENTER"}},
        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"}})

    # Month headers
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 1, "endRowIndex": 2, "startColumnIndex": 1, "endColumnIndex": 13},
        "cell": {"userEnteredFormat": {"backgroundColor": CARD,
            "textFormat": {"foregroundColor": GOLD, "bold": True, "fontSize": 11}, "horizontalAlignment": "CENTER"}},
        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"}})

    # Section headers
    for row in [2, 11, 16]:
        reqs.append({"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": row, "endRowIndex": row+1, "startColumnIndex": 0, "endColumnIndex": 13},
            "cell": {"userEnteredFormat": {"backgroundColor": CARD,
                "textFormat": {"foregroundColor": PURPLE, "bold": True, "fontSize": 11}}},
            "fields": "userEnteredFormat(backgroundColor,textFormat)"}})

    # First col bold
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startColumnIndex": 0, "endColumnIndex": 1, "startRowIndex": 3},
        "cell": {"userEnteredFormat": {"textFormat": {"bold": True}}},
        "fields": "userEnteredFormat.textFormat.bold"}})

    # Data cells centered
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 3, "startColumnIndex": 1, "endColumnIndex": 13},
        "cell": {"userEnteredFormat": {"horizontalAlignment": "CENTER"}},
        "fields": "userEnteredFormat.horizontalAlignment"}})

    # Currency rows (12-14, 17-19)
    for r in [12, 13, 14, 17, 18, 19]:
        reqs.append({"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": r, "endRowIndex": r+1, "startColumnIndex": 1, "endColumnIndex": 13},
            "cell": {"userEnteredFormat": {"numberFormat": {"type": "CURRENCY", "pattern": "$#,##0"}}},
            "fields": "userEnteredFormat.numberFormat"}})

    # Percentage rows
    for r in [6, 8, 9]:
        reqs.append({"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": r, "endRowIndex": r+1, "startColumnIndex": 1, "endColumnIndex": 13},
            "cell": {"userEnteredFormat": {"numberFormat": {"type": "PERCENT", "pattern": "0.0%"}}},
            "fields": "userEnteredFormat.numberFormat"}})

    reqs.append({"updateSheetProperties": {
        "properties": {"sheetId": sid, "gridProperties": {"frozenRowCount": 2, "frozenColumnCount": 1}},
        "fields": "gridProperties(frozenRowCount,frozenColumnCount)"}})
    reqs.append({"updateSheetProperties": {"properties": {"sheetId": sid, "tabColor": PURPLE}, "fields": "tabColor"}})

    return reqs


# ═══════════════════════════════════════════
#  DASHBOARD FINANCIERO
# ═══════════════════════════════════════════
def write_dashboard(service, sid):
    rows = [
        ["💰 DASHBOARD FINANCIERO"],
        [],
        ["", "📅 Mes:", "2026-3"],
        [],
        # Summary
        ["", "RESUMEN DEL MES", "", "", "", "COMISIONES DEL MES"],
        [],
        ["", "Cash Collected:", f'=SUMIFS({RC}!$M:$M,{RC}!$AD:$AD,$C$3)', "", "",
         "Closers (10%):", f'=C7*0.10'],
        ["", "Unidades Cerradas:", f'=COUNTIFS({RC}!$AD:$AD,$C$3,{RC}!$G:$G,"*Cerrado*")', "", "",
         "Setters (5%):", f'=C7*0.05'],
        ["", "Llamadas:", f'=COUNTIFS({RC}!$AD:$AD,$C$3)', "", "",
         "TOTAL:", f'=G7+G8'],
        ["", "Presentadas:", f'=COUNTIFS({RC}!$AD:$AD,$C$3,{RC}!$H:$H,"Sí")'],
        ["", "Show Up %:", f"=IFERROR(C10/C9,0)"],
        ["", "Cierre %:", f"=IFERROR(C8/C9,0)"],
        ["", "Ticket Promedio:", f"=IFERROR(C7/C8,0)"],
        [],
        ["", "COMISIONES POR CLOSER"],
    ]

    for closer in CLOSERS:
        r = len(rows) + 1
        rows.append(["", closer,
            f'=SUMIFS({RC}!$M:$M,{RC}!$F:$F,"{closer}",{RC}!$AD:$AD,$C$3)',
            f'=C{r}*0.10'])

    rows.extend([[], ["", "COMISIONES POR SETTER"]])
    for setter in SETTERS:
        r = len(rows) + 1
        rows.append(["", setter,
            f'=SUMIFS({RC}!$M:$M,{RC}!$E:$E,"{setter}",{RC}!$AD:$AD,$C$3)',
            f'=C{r}*0.05'])

    service.spreadsheets().values().update(spreadsheetId=SPREADSHEET_ID,
        range="'💰 Dashboard Financiero'!A1", valueInputOption="USER_ENTERED",
        body={"values": rows}).execute()

    reqs = []
    reqs.append({"repeatCell": {"range": {"sheetId": sid},
        "cell": {"userEnteredFormat": {"backgroundColor": DARK,
            "textFormat": {"foregroundColor": WHITE, "fontFamily": "Inter", "fontSize": 10}}},
        "fields": "userEnteredFormat(backgroundColor,textFormat)"}})

    # Title
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
        "cell": {"userEnteredFormat": {"textFormat": {"foregroundColor": GOLD, "bold": True, "fontSize": 18}}},
        "fields": "userEnteredFormat.textFormat"}})

    # Mes selector
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 2, "endRowIndex": 3, "startColumnIndex": 1, "endColumnIndex": 3},
        "cell": {"userEnteredFormat": {"textFormat": {"foregroundColor": PURPLE, "bold": True, "fontSize": 13}}},
        "fields": "userEnteredFormat.textFormat"}})
    reqs.append({"setDataValidation": {
        "range": {"sheetId": sid, "startRowIndex": 2, "endRowIndex": 3, "startColumnIndex": 2, "endColumnIndex": 3},
        "rule": {"condition": {"type": "ONE_OF_LIST",
            "values": [{"userEnteredValue": m} for m in MONTHS]}, "showCustomUi": True, "strict": True}}})

    # Section headers
    for row in [4, 14]:
        reqs.append({"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": row, "endRowIndex": row+1},
            "cell": {"userEnteredFormat": {"backgroundColor": PUR_DK,
                "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 11}}},
            "fields": "userEnteredFormat(backgroundColor,textFormat)"}})

    # Currency format
    for col in [2, 3, 6]:
        reqs.append({"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 6, "startColumnIndex": col, "endColumnIndex": col+1, "endRowIndex": 30},
            "cell": {"userEnteredFormat": {"numberFormat": {"type": "CURRENCY", "pattern": "$#,##0.00"}}},
            "fields": "userEnteredFormat.numberFormat"}})

    # Pct format
    for row in [10, 11]:
        reqs.append({"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": row, "endRowIndex": row+1, "startColumnIndex": 2, "endColumnIndex": 3},
            "cell": {"userEnteredFormat": {"numberFormat": {"type": "PERCENT", "pattern": "0.0%"}}},
            "fields": "userEnteredFormat.numberFormat"}})

    reqs.append({"updateSheetProperties": {"properties": {"sheetId": sid, "tabColor": YELLOW}, "fields": "tabColor"}})
    return reqs


# ═══════════════════════════════════════════
#  FORMULARIO DE PAGOS (light bg, form-like)
# ═══════════════════════════════════════════
def write_formulario(service, sid):
    rows = [
        ["Acumulado del Día"],
        [f'=SUMIFS({RP}!$E:$E,{RP}!$A:$A,TEXT(TODAY(),"YYYY-MM-DD"))'],
        [],
        ["", "", "CARGA DE PAGOS"],
        [],
        ["", "Fecha de carga"],
        ["", "Programa"],
        ["", "Nombre"],
        ["", "Telefono"],
        ["", "Efectivo Recaudado"],
        ["", "Pesos"],
        ["", "Closer"],
        ["", "Setter"],
        ["", "Comprobante"],
        ["", "Concepto"],
        ["", "Fuente"],
        ["", "Comisión (Pasarela)"],
        [],
        ["", "", "CARGAR"],
        [],
        [],
        ["", "", "", "", "", "RECORDÁ AGREGAR EL COMPROBANTE"],
        ["", "", "", "", "", "CORRESPONDIENTE AL PAGO"],
        ["", "", "", "", "", "QUE SE ESTÁ CARGANDO"],
        [],
        ["", "", "", "", "", "", "LIMPIAR"],
    ]

    service.spreadsheets().values().update(spreadsheetId=SPREADSHEET_ID,
        range="'📝 Formulario de Pagos'!A1", valueInputOption="USER_ENTERED",
        body={"values": rows}).execute()

    reqs = []
    # White bg for form sheet
    reqs.append({"repeatCell": {"range": {"sheetId": sid},
        "cell": {"userEnteredFormat": {"backgroundColor": FORM_W,
            "textFormat": {"foregroundColor": BLACK, "fontFamily": "Arial", "fontSize": 10}}},
        "fields": "userEnteredFormat(backgroundColor,textFormat)"}})

    # Acumulado red
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": 1},
        "cell": {"userEnteredFormat": {"textFormat": {"foregroundColor": RED, "bold": True, "fontSize": 13}}},
        "fields": "userEnteredFormat.textFormat"}})
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 1, "endRowIndex": 2, "startColumnIndex": 0, "endColumnIndex": 1},
        "cell": {"userEnteredFormat": {"numberFormat": {"type": "CURRENCY", "pattern": "$#,##0.00"},
            "textFormat": {"bold": True, "fontSize": 14}}},
        "fields": "userEnteredFormat(numberFormat,textFormat)"}})

    # Banner "CARGA DE PAGOS"
    reqs.append({"mergeCells": {"range": {"sheetId": sid, "startRowIndex": 3, "endRowIndex": 4, "startColumnIndex": 2, "endColumnIndex": 6}, "mergeType": "MERGE_ALL"}})
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 3, "endRowIndex": 4, "startColumnIndex": 2, "endColumnIndex": 6},
        "cell": {"userEnteredFormat": {
            "backgroundColor": {"red": 0.15, "green": 0.15, "blue": 0.15},
            "textFormat": {"foregroundColor": FORM_W, "bold": True, "fontSize": 16},
            "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE",
            "borders": {"top": border(BLACK, "SOLID_MEDIUM"), "bottom": border(BLACK, "SOLID_MEDIUM"),
                         "left": border(BLACK, "SOLID_MEDIUM"), "right": border(BLACK, "SOLID_MEDIUM")}}},
        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,borders)"}})
    reqs.append({"updateDimensionProperties": {
        "range": {"sheetId": sid, "dimension": "ROWS", "startIndex": 3, "endIndex": 4},
        "properties": {"pixelSize": 50}, "fields": "pixelSize"}})

    # Labels (B6:B17, idx 5-16) — right aligned
    for row in range(5, 17):
        reqs.append({"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": row, "endRowIndex": row+1, "startColumnIndex": 1, "endColumnIndex": 2},
            "cell": {"userEnteredFormat": {"textFormat": {"fontSize": 11}, "horizontalAlignment": "RIGHT"}},
            "fields": "userEnteredFormat(textFormat,horizontalAlignment)"}})

    # Input cells (C6:E17) — merge + underline border
    for row in range(5, 17):
        reqs.append({"mergeCells": {"range": {"sheetId": sid, "startRowIndex": row, "endRowIndex": row+1, "startColumnIndex": 2, "endColumnIndex": 5}, "mergeType": "MERGE_ALL"}})
        reqs.append({"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": row, "endRowIndex": row+1, "startColumnIndex": 2, "endColumnIndex": 5},
            "cell": {"userEnteredFormat": {"horizontalAlignment": "CENTER",
                "borders": {"bottom": border(BLACK)}}},
            "fields": "userEnteredFormat(horizontalAlignment,borders)"}})

    # Dropdowns for form
    dd = {6: ["Consultoría", "Omnipresencia", "Multicuentas", "ROMS 7"],
          11: CLOSERS, 12: SETTERS,
          14: ["Pago completo", "Cuota 1/3", "Cuota 2/3", "Cuota 3/3"],
          15: ["Instagram", "TikTok", "YouTube", "WhatsApp", "Landing", "Otro"]}
    for row, vals in dd.items():
        reqs.append({"setDataValidation": {
            "range": {"sheetId": sid, "startRowIndex": row, "endRowIndex": row+1, "startColumnIndex": 2, "endColumnIndex": 5},
            "rule": {"condition": {"type": "ONE_OF_LIST",
                "values": [{"userEnteredValue": v} for v in vals]}, "showCustomUi": True, "strict": False}}})

    # CARGAR button
    reqs.append({"mergeCells": {"range": {"sheetId": sid, "startRowIndex": 18, "endRowIndex": 19, "startColumnIndex": 2, "endColumnIndex": 4}, "mergeType": "MERGE_ALL"}})
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 18, "endRowIndex": 19, "startColumnIndex": 2, "endColumnIndex": 4},
        "cell": {"userEnteredFormat": {"backgroundColor": GOLD_B,
            "textFormat": {"foregroundColor": BLACK, "bold": True, "fontSize": 14},
            "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE",
            "borders": {"top": border(BLACK, "SOLID_MEDIUM"), "bottom": border(BLACK, "SOLID_MEDIUM"),
                         "left": border(BLACK, "SOLID_MEDIUM"), "right": border(BLACK, "SOLID_MEDIUM")}}},
        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,borders)"}})

    # Pink reminder note
    reqs.append({"mergeCells": {"range": {"sheetId": sid, "startRowIndex": 21, "endRowIndex": 24, "startColumnIndex": 5, "endColumnIndex": 9}, "mergeType": "MERGE_ALL"}})
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 21, "endRowIndex": 24, "startColumnIndex": 5, "endColumnIndex": 9},
        "cell": {"userEnteredFormat": {"backgroundColor": PINK,
            "textFormat": {"foregroundColor": BLACK, "bold": True, "fontSize": 11},
            "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP",
            "borders": {"top": border(BLACK), "bottom": border(BLACK), "left": border(BLACK), "right": border(BLACK)}}},
        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy,borders)"}})

    # LIMPIAR button
    reqs.append({"mergeCells": {"range": {"sheetId": sid, "startRowIndex": 25, "endRowIndex": 26, "startColumnIndex": 6, "endColumnIndex": 8}, "mergeType": "MERGE_ALL"}})
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 25, "endRowIndex": 26, "startColumnIndex": 6, "endColumnIndex": 8},
        "cell": {"userEnteredFormat": {"backgroundColor": BLUE_B,
            "textFormat": {"foregroundColor": BLACK, "bold": True, "fontSize": 14},
            "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE",
            "borders": {"top": border(BLACK, "SOLID_MEDIUM"), "bottom": border(BLACK, "SOLID_MEDIUM"),
                         "left": border(BLACK, "SOLID_MEDIUM"), "right": border(BLACK, "SOLID_MEDIUM")}}},
        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,borders)"}})

    reqs.append({"updateSheetProperties": {"properties": {"sheetId": sid, "tabColor": GOLD}, "fields": "tabColor"}})
    return reqs


# ═══════════════════════════════════════════
#  REGISTRO DE PAGOS
# ═══════════════════════════════════════════
def write_registro_pagos(service, data, sid):
    headers = ["Fecha", "Producto", "Nombre del Cliente", "Teléfono",
               "Efectivo Recaudado", "Closer", "Setter", "Comprobante",
               "Concepto", "Fuente", "Mes"]
    rows = [headers]
    ventas = [d for d in data if d["es_venta"] and d["pago1"] > 0]
    for v in ventas:
        rows.append([v["fecha_pago1"], v["programa"], v["nombre"], v["telefono"],
                     v["pago1"], v["closer"], v["setter"], "", "Pago", v["fuente"], v["mes"]])

    service.spreadsheets().values().update(spreadsheetId=SPREADSHEET_ID,
        range=f"{RP}!A1", valueInputOption="RAW", body={"values": rows}).execute()

    reqs = []
    reqs.append({"repeatCell": {"range": {"sheetId": sid},
        "cell": {"userEnteredFormat": {"backgroundColor": DARK,
            "textFormat": {"foregroundColor": WHITE, "fontFamily": "Inter", "fontSize": 10}}},
        "fields": "userEnteredFormat(backgroundColor,textFormat)"}})
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
        "cell": {"userEnteredFormat": {"backgroundColor": GRN_DK,
            "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 10},
            "horizontalAlignment": "CENTER", "wrapStrategy": "WRAP"}},
        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)"}})
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 1, "startColumnIndex": 4, "endColumnIndex": 5, "endRowIndex": 50},
        "cell": {"userEnteredFormat": {"numberFormat": {"type": "CURRENCY", "pattern": "$#,##0.00"}}},
        "fields": "userEnteredFormat.numberFormat"}})
    reqs.append({"updateSheetProperties": {
        "properties": {"sheetId": sid, "gridProperties": {"frozenRowCount": 1}}, "fields": "gridProperties.frozenRowCount"}})
    reqs.append({"updateSheetProperties": {"properties": {"sheetId": sid, "tabColor": GREEN}, "fields": "tabColor"}})
    return reqs


# ═══════════════════════════════════════════
#  ESTADO DE RESULTADOS
# ═══════════════════════════════════════════
def write_estado_resultados(service, sid):
    meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
             "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]
    mks = [f"2026-{i+1}" for i in range(12)]

    rows = [
        ["📈 ESTADO DE RESULTADOS — 2026"],
        [],
        ["", "Mes", "Cash Collected", "Comisiones (15%)", "Gastos", "RESULTADO NETO"],
    ]
    for i, (mes, mk) in enumerate(zip(meses, mks)):
        r = i + 4
        rows.append(["", mes,
            f'=SUMIFS({RC}!$M:$M,{RC}!$AD:$AD,"{mk}")',
            f"=C{r}*0.15",
            f'=SUMPRODUCT((MONTH(DATEVALUE(\'💸 Gastos\'!$A$2:$A$30))={i+1})*\'💸 Gastos\'!$C$2:$C$30)',
            f"=C{r}-D{r}-E{r}"])

    rows.extend([[], ["", "TOTAL ANUAL", "=SUM(C4:C15)", "=SUM(D4:D15)", "=SUM(E4:E15)", "=SUM(F4:F15)"]])

    service.spreadsheets().values().update(spreadsheetId=SPREADSHEET_ID,
        range="'📈 Estado de Resultados'!A1", valueInputOption="USER_ENTERED",
        body={"values": rows}).execute()

    reqs = []
    reqs.append({"repeatCell": {"range": {"sheetId": sid},
        "cell": {"userEnteredFormat": {"backgroundColor": DARK,
            "textFormat": {"foregroundColor": WHITE, "fontFamily": "Inter", "fontSize": 10}}},
        "fields": "userEnteredFormat(backgroundColor,textFormat)"}})
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
        "cell": {"userEnteredFormat": {"backgroundColor": PUR_DK,
            "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 14}, "horizontalAlignment": "CENTER"}},
        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"}})
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 2, "endRowIndex": 3},
        "cell": {"userEnteredFormat": {"backgroundColor": CARD,
            "textFormat": {"foregroundColor": GOLD, "bold": True, "fontSize": 11}, "horizontalAlignment": "CENTER"}},
        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"}})
    # Currency
    for col in [2, 3, 4, 5]:
        reqs.append({"repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 3, "startColumnIndex": col, "endColumnIndex": col+1, "endRowIndex": 18},
            "cell": {"userEnteredFormat": {"numberFormat": {"type": "CURRENCY", "pattern": "$#,##0.00"}}},
            "fields": "userEnteredFormat.numberFormat"}})
    # Neto green for positive
    reqs.append({"addConditionalFormatRule": {"rule": {
        "ranges": [{"sheetId": sid, "startRowIndex": 3, "startColumnIndex": 5, "endColumnIndex": 6, "endRowIndex": 18}],
        "booleanRule": {"condition": {"type": "NUMBER_GREATER", "values": [{"userEnteredValue": "0"}]},
            "format": {"textFormat": {"foregroundColor": GREEN}}}}, "index": 0}})
    reqs.append({"addConditionalFormatRule": {"rule": {
        "ranges": [{"sheetId": sid, "startRowIndex": 3, "startColumnIndex": 5, "endColumnIndex": 6, "endRowIndex": 18}],
        "booleanRule": {"condition": {"type": "NUMBER_LESS", "values": [{"userEnteredValue": "0"}]},
            "format": {"textFormat": {"foregroundColor": RED}}}}, "index": 0}})

    reqs.append({"updateSheetProperties": {"properties": {"sheetId": sid, "tabColor": PURPLE}, "fields": "tabColor"}})
    return reqs


# ═══════════════════════════════════════════
#  GASTOS
# ═══════════════════════════════════════════
def write_gastos(service, gastos_raw, sid):
    headers = ["Fecha", "Concepto", "Monto (USD)", "Categoría", "Billetera", "Pagado a", "Estado"]
    rows = [headers]
    for g in gastos_raw:
        f = g.get("fields", {})
        rows.append([
            s(f.get("📆 Fecha de Pago 1")), s(f.get("👤 Nombre del Editor/Gasto")),
            n(f.get("💰 Pago 1")), s(f.get("Categoría")), s(f.get("Billetera")),
            s(f.get("Pago")), s(f.get("📊 Estado 1"))])

    service.spreadsheets().values().update(spreadsheetId=SPREADSHEET_ID,
        range="'💸 Gastos'!A1", valueInputOption="RAW", body={"values": rows}).execute()

    reqs = []
    reqs.append({"repeatCell": {"range": {"sheetId": sid},
        "cell": {"userEnteredFormat": {"backgroundColor": DARK,
            "textFormat": {"foregroundColor": WHITE, "fontFamily": "Inter", "fontSize": 10}}},
        "fields": "userEnteredFormat(backgroundColor,textFormat)"}})
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
        "cell": {"userEnteredFormat": {"backgroundColor": RED_DK,
            "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 10}, "horizontalAlignment": "CENTER"}},
        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"}})
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 1, "startColumnIndex": 2, "endColumnIndex": 3, "endRowIndex": 30},
        "cell": {"userEnteredFormat": {"numberFormat": {"type": "CURRENCY", "pattern": "$#,##0.00"}}},
        "fields": "userEnteredFormat.numberFormat"}})
    reqs.append({"updateSheetProperties": {
        "properties": {"sheetId": sid, "gridProperties": {"frozenRowCount": 1}}, "fields": "gridProperties.frozenRowCount"}})
    reqs.append({"updateSheetProperties": {"properties": {"sheetId": sid, "tabColor": RED}, "fields": "tabColor"}})
    return reqs


# ═══════════════════════════════════════════
#  PAYROLL
# ═══════════════════════════════════════════
def write_payroll(service, sid):
    rows = [
        ["👥 PAYROLL", "", "", "", "", "", "", "Abril 2026"],
        ["#", "Nombre", "Medio de Pago", "Dirección de Pago", "Teléfono", "Puesto", "Departamento",
         "Base", "Bonuses", "Comisión", "TOTAL", "Fecha Pago", "Pagado"],
        [],
        ["1", "Valentino Granata", "", "", "", "Closer / Setter", "Ventas", "", "", "", "", "", ""],
        ["2", "Agustín", "", "", "", "Closer", "Ventas", "", "", "", "", "", ""],
        ["3", "Juan Martín", "", "", "", "Closer", "Ventas", "", "", "", "", "", ""],
        ["4", "Guille", "", "", "", "Setter", "Ventas", "", "", "", "", "", ""],
    ]

    service.spreadsheets().values().update(spreadsheetId=SPREADSHEET_ID,
        range="'👥 Payroll'!A1", valueInputOption="RAW", body={"values": rows}).execute()

    reqs = []
    reqs.append({"repeatCell": {"range": {"sheetId": sid},
        "cell": {"userEnteredFormat": {"backgroundColor": DARK,
            "textFormat": {"foregroundColor": WHITE, "fontFamily": "Inter", "fontSize": 10}}},
        "fields": "userEnteredFormat(backgroundColor,textFormat)"}})
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
        "cell": {"userEnteredFormat": {"textFormat": {"foregroundColor": GOLD, "bold": True, "fontSize": 14}}},
        "fields": "userEnteredFormat.textFormat"}})
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 1, "endRowIndex": 2},
        "cell": {"userEnteredFormat": {"backgroundColor": PUR_DK,
            "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 9},
            "horizontalAlignment": "CENTER", "wrapStrategy": "WRAP"}},
        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)"}})
    reqs.append({"repeatCell": {
        "range": {"sheetId": sid, "startRowIndex": 3, "endRowIndex": 7},
        "cell": {"userEnteredFormat": {"horizontalAlignment": "CENTER"}},
        "fields": "userEnteredFormat.horizontalAlignment"}})
    reqs.append({"updateSheetProperties": {"properties": {"sheetId": sid, "tabColor": YELLOW}, "fields": "tabColor"}})
    return reqs


# ═══════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════
def main():
    print("Loading data...")
    data, gastos = load_and_process()
    print(f"  {len(data)} llamadas, {len(gastos)} gastos")

    service = get_service()

    print("\nRecreating sheets...")
    ids = clear_and_setup(service)
    print(f"  Created: {list(ids.keys())}")

    all_reqs = []

    print("\nWriting Registro Calls...")
    rc = write_registro_calls(service, data, ids["📞 Registro Calls"])
    all_reqs.extend(format_registro_calls(ids["📞 Registro Calls"], rc))

    print("Writing Leaderboard Closers...")
    all_reqs.extend(write_leaderboard_closers(service, ids["🏆 Leaderboard Closers"]))

    print("Writing Leaderboard Setters...")
    all_reqs.extend(write_leaderboard_setters(service, ids["🏆 Leaderboard Setters"]))

    print("Writing Métricas 2026...")
    all_reqs.extend(write_metricas(service, ids["📊 Métricas 2026"]))

    print("Writing Dashboard Financiero...")
    all_reqs.extend(write_dashboard(service, ids["💰 Dashboard Financiero"]))

    print("Writing Formulario de Pagos...")
    all_reqs.extend(write_formulario(service, ids["📝 Formulario de Pagos"]))

    print("Writing Registro de Pagos...")
    all_reqs.extend(write_registro_pagos(service, data, ids["💳 Registro de Pagos"]))

    print("Writing Estado de Resultados...")
    all_reqs.extend(write_estado_resultados(service, ids["📈 Estado de Resultados"]))

    print("Writing Gastos...")
    all_reqs.extend(write_gastos(service, gastos, ids["💸 Gastos"]))

    print("Writing Payroll...")
    all_reqs.extend(write_payroll(service, ids["👥 Payroll"]))

    # Auto-resize columns (except form and registro calls which have manual widths)
    for name, sid in ids.items():
        if "Formulario" not in name and "Registro Calls" not in name:
            all_reqs.append({"autoResizeDimensions": {
                "dimensions": {"sheetId": sid, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 15}}})

    print(f"\nApplying {len(all_reqs)} formatting requests...")
    for i in range(0, len(all_reqs), 50):
        batch = all_reqs[i:i+50]
        service.spreadsheets().batchUpdate(spreadsheetId=SPREADSHEET_ID, body={"requests": batch}).execute()
        print(f"  Batch {i//50+1} done ({len(batch)} reqs)")

    print(f"\n✅ DONE! https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}")


if __name__ == "__main__":
    main()
