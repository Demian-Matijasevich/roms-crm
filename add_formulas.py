"""
Add live formulas to ROMS CRM Google Sheet.
Converts cash strings to numbers, adds SUMIFS/COUNTIFS formulas to leaderboards,
métricas, and dashboard. Everything auto-calculates from Registro Calls data.
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from google.oauth2 import service_account
from googleapiclient.discovery import build
import os
import re

SPREADSHEET_ID = "14l6eg-JfY5M00NRSmOT-38f5eRsC0xsOqZl9bsggDv4"
CREDS_FILE = os.path.join(os.path.dirname(__file__), "credentials.json")
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

# Team members
CLOSERS = ["Valentino Granata", "Agustín", "Juan Martín", "Juanma", "Fran"]
SETTERS = ["Valentino Granata", "Guille"]
MONTH_OPTIONS = ["2026-1", "2026-2", "2026-3", "2026-4", "2026-5", "2026-6",
                 "2026-7", "2026-8", "2026-9", "2026-10", "2026-11", "2026-12"]
MONTH_LABELS = {
    "2026-1": "Enero 2026", "2026-2": "Febrero 2026", "2026-3": "Marzo 2026",
    "2026-4": "Abril 2026", "2026-5": "Mayo 2026", "2026-6": "Junio 2026",
    "2026-7": "Julio 2026", "2026-8": "Agosto 2026", "2026-9": "Septiembre 2026",
    "2026-10": "Octubre 2026", "2026-11": "Noviembre 2026", "2026-12": "Diciembre 2026",
}

# Registro Calls column references (1-indexed for formulas)
# A=Instagram, B=Nombre, C=FechaLlamada, D=FechaAgenda, E=Setter, F=Closer
# G=Fuente, H=MedioAgenda, I=Calificado, J=ContextoSetter, K=SePresentó
# L=Estado, M=Programa, N=ContextoCloser, O=CashDia1, P=CashTotal
# Q=FechaPago, R=Email, S=Teléfono, T=ModeloNegocio, U=Inversión, V=Objetivo, W=Mes
RC = "'📞 Registro Calls'"
RP = "'💳 Registro de Pagos'"


def get_service():
    creds = service_account.Credentials.from_service_account_file(CREDS_FILE, scopes=SCOPES)
    return build("sheets", "v4", credentials=creds)


def get_sheet_ids(service):
    meta = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    return {sh["properties"]["title"]: sh["properties"]["sheetId"] for sh in meta["sheets"]}


def parse_cash(val):
    """Convert '$1,234.00' string to float."""
    if not val or not isinstance(val, str):
        return 0
    cleaned = val.replace("$", "").replace(",", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return 0


def fix_cash_columns(service):
    """Convert cash string columns to raw numbers in Registro Calls and Registro de Pagos."""
    print("  Fixing Registro Calls cash columns (O, P)...")

    # Read O and P columns (cash dia 1 and cash total)
    result = service.spreadsheets().values().get(
        spreadsheetId=SPREADSHEET_ID,
        range=f"{RC}!O2:P700"
    ).execute()
    rows = result.get("values", [])

    # Convert to numbers
    new_values = []
    changed = 0
    for r in rows:
        o_val = parse_cash(r[0]) if len(r) > 0 and r[0] else ""
        p_val = parse_cash(r[1]) if len(r) > 1 and r[1] else ""
        if o_val or p_val:
            changed += 1
        new_values.append([o_val if o_val else "", p_val if p_val else ""])

    if new_values:
        service.spreadsheets().values().update(
            spreadsheetId=SPREADSHEET_ID,
            range=f"{RC}!O2:P{len(new_values)+1}",
            valueInputOption="RAW",
            body={"values": new_values}
        ).execute()
    print(f"    Converted {changed} rows")

    # Fix Registro de Pagos cash column (E)
    print("  Fixing Registro de Pagos cash column (E)...")
    result = service.spreadsheets().values().get(
        spreadsheetId=SPREADSHEET_ID,
        range=f"{RP}!E2:E200"
    ).execute()
    rows = result.get("values", [])

    new_values = []
    changed = 0
    for r in rows:
        val = parse_cash(r[0]) if r and r[0] else ""
        if val:
            changed += 1
        new_values.append([val if val else ""])

    if new_values:
        service.spreadsheets().values().update(
            spreadsheetId=SPREADSHEET_ID,
            range=f"{RP}!E2:E{len(new_values)+1}",
            valueInputOption="RAW",
            body={"values": new_values}
        ).execute()
    print(f"    Converted {changed} rows")


def apply_number_format(service, sheet_ids):
    """Apply currency number format to cash columns."""
    requests = []

    # Registro Calls - columns O and P (indices 14, 15) as currency
    sid = sheet_ids["📞 Registro Calls"]
    for col in [14, 15]:
        requests.append({
            "repeatCell": {
                "range": {"sheetId": sid, "startRowIndex": 1, "startColumnIndex": col, "endColumnIndex": col + 1, "endRowIndex": 700},
                "cell": {"userEnteredFormat": {"numberFormat": {"type": "CURRENCY", "pattern": "$#,##0.00"}}},
                "fields": "userEnteredFormat.numberFormat"
            }
        })

    # Registro de Pagos - column E (index 4) as currency
    sid = sheet_ids["💳 Registro de Pagos"]
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 1, "startColumnIndex": 4, "endColumnIndex": 5, "endRowIndex": 200},
            "cell": {"userEnteredFormat": {"numberFormat": {"type": "CURRENCY", "pattern": "$#,##0.00"}}},
            "fields": "userEnteredFormat.numberFormat"
        }
    })

    return requests


def write_leaderboard_closers(service, sheet_ids):
    """Rewrite Leaderboard Closers with live formulas."""
    print("  Writing Leaderboard Closers formulas...")

    # Clear existing content
    service.spreadsheets().values().clear(
        spreadsheetId=SPREADSHEET_ID,
        range="'🏆 Leaderboard Closers'!A1:S30"
    ).execute()

    # MES_CELL is C4 in this sheet
    MES = "'🏆 Leaderboard Closers'!$C$4"

    # Build rows with formulas
    rows = [
        ["🏆 Leaderboard de Closers 🏆"],  # A1
        [],  # 2
        [],  # 3
        ["", "Mes", "2026-4"],  # 4 - month selector (C4 = dropdown)
        [],  # 5
        # Headers
        ["Posición", "CLOSER", "", "",
         "Cash Collected", "Unidades Cerradas", "Llamadas Totales",
         "Presentadas", "Show Up %", "Cierre % (Total)",
         "Cierre % (Presentadas)", "Ticket Promedio", "COMISIONES"],  # Row 6
    ]

    # Data rows for each closer (rows 7+)
    for i, closer in enumerate(CLOSERS):
        pos = i + 1
        # Column references in Registro Calls:
        # F = Closer, W = Mes, O = Cash Dia 1, K = Se presentó, L = Estado
        cash = f'=SUMIFS({RC}!$O:$O,{RC}!$F:$F,B{pos+6},{RC}!$W:$W,$C$4)'
        units = f'=COUNTIFS({RC}!$F:$F,B{pos+6},{RC}!$W:$W,$C$4,{RC}!$L:$L,"*Cerrado*")'
        llamadas = f'=COUNTIFS({RC}!$F:$F,B{pos+6},{RC}!$W:$W,$C$4)'
        presentadas = f'=COUNTIFS({RC}!$F:$F,B{pos+6},{RC}!$W:$W,$C$4,{RC}!$K:$K,"Sí")'
        showup = f'=IFERROR(H{pos+6}/G{pos+6},0)'
        cierre_total = f'=IFERROR(F{pos+6}/G{pos+6},0)'
        cierre_pres = f'=IFERROR(F{pos+6}/H{pos+6},0)'
        aov = f'=IFERROR(E{pos+6}/F{pos+6},0)'
        comision = f'=E{pos+6}*0.10'

        rows.append([
            f"{'🥇' if pos==1 else '🥈' if pos==2 else '🥉' if pos==3 else ''}{pos}",
            closer, "", "",
            cash, units, llamadas, presentadas,
            showup, cierre_total, cierre_pres, aov, comision
        ])

    # Blank row
    data_end = 6 + len(CLOSERS)
    rows.append([])

    # Totals row
    total_row = data_end + 2
    rows.append([
        "", "TOTAL MENSUAL", "", "",
        f"=SUM(E7:E{data_end})",
        f"=SUM(F7:F{data_end})",
        f"=SUM(G7:G{data_end})",
        f"=SUM(H7:H{data_end})",
        f"=IFERROR(H{total_row}/G{total_row},0)",
        f"=IFERROR(F{total_row}/G{total_row},0)",
        f"=IFERROR(F{total_row}/H{total_row},0)",
        f"=IFERROR(E{total_row}/F{total_row},0)",
        f"=SUM(M7:M{data_end})",
    ])

    rows.append([])

    # Historical totals (all months)
    hist_row = total_row + 2
    rows.append([
        "", "TOTALES HISTÓRICOS", "", "",
        f'=SUMIFS({RC}!$O:$O,{RC}!$F:$F,"<>")',  # all cash
        f'=COUNTIFS({RC}!$L:$L,"*Cerrado*")',  # all units
        f'=COUNTA({RC}!$F:$F)-1',  # all calls minus header
        f'=COUNTIFS({RC}!$K:$K,"Sí")',  # all presentadas
        f"=IFERROR(H{hist_row}/G{hist_row},0)",
        f"=IFERROR(F{hist_row}/G{hist_row},0)",
        f"=IFERROR(F{hist_row}/H{hist_row},0)",
        f"=IFERROR(E{hist_row}/F{hist_row},0)",
        f"=E{hist_row}*0.10",
    ])

    # Commission scheme
    rows.extend([[], [], []])
    rows.append(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "ESQUEMA DE COMISIONES"])
    rows.append(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "Closer: 10% del Cash Collected"])

    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="'🏆 Leaderboard Closers'!A1",
        valueInputOption="USER_ENTERED",
        body={"values": rows}
    ).execute()

    # Format requests
    sid = sheet_ids["🏆 Leaderboard Closers"]
    requests = []

    # Month dropdown in C4
    requests.append({
        "setDataValidation": {
            "range": {"sheetId": sid, "startRowIndex": 3, "endRowIndex": 4, "startColumnIndex": 2, "endColumnIndex": 3},
            "rule": {
                "condition": {
                    "type": "ONE_OF_LIST",
                    "values": [{"userEnteredValue": m} for m in MONTH_OPTIONS]
                },
                "showCustomUi": True, "strict": True
            }
        }
    })

    # Currency format for cash columns (E=4, L=11, M=12)
    for col in [4, 11, 12]:
        requests.append({
            "repeatCell": {
                "range": {"sheetId": sid, "startRowIndex": 6, "startColumnIndex": col, "endColumnIndex": col + 1, "endRowIndex": 20},
                "cell": {"userEnteredFormat": {"numberFormat": {"type": "CURRENCY", "pattern": "$#,##0.00"}}},
                "fields": "userEnteredFormat.numberFormat"
            }
        })

    # Percentage format for show up, cierre columns (H=8, I=9, J=10)
    for col in [8, 9, 10]:
        requests.append({
            "repeatCell": {
                "range": {"sheetId": sid, "startRowIndex": 6, "startColumnIndex": col, "endColumnIndex": col + 1, "endRowIndex": 20},
                "cell": {"userEnteredFormat": {"numberFormat": {"type": "PERCENT", "pattern": "0.0%"}}},
                "fields": "userEnteredFormat.numberFormat"
            }
        })

    return requests


def write_leaderboard_setters(service, sheet_ids):
    """Rewrite Leaderboard Setters with live formulas."""
    print("  Writing Leaderboard Setters formulas...")

    service.spreadsheets().values().clear(
        spreadsheetId=SPREADSHEET_ID,
        range="'🏆 Leaderboard Setters'!A1:S30"
    ).execute()

    rows = [
        ["🏆 Leaderboard de Setters 🏆"],
        [],
        [],
        ["", "Mes", "2026-4"],
        [],
        # Headers
        ["Posición", "SETTER", "", "",
         "Agendas", "Agendas Presentadas", "Llamadas Cerradas",
         "Tasa de Agenda %", "Agendas Calificadas",
         "Cash (de sus leads)", "COMISIONES"],
    ]

    for i, setter in enumerate(SETTERS):
        pos = i + 1
        # E = Setter in Registro Calls
        agendas = f'=COUNTIFS({RC}!$E:$E,B{pos+6},{RC}!$W:$W,$C$4)'
        presentadas = f'=COUNTIFS({RC}!$E:$E,B{pos+6},{RC}!$W:$W,$C$4,{RC}!$K:$K,"Sí")'
        cerradas = f'=COUNTIFS({RC}!$E:$E,B{pos+6},{RC}!$W:$W,$C$4,{RC}!$L:$L,"*Cerrado*")'
        tasa_agenda = f'=IFERROR(F{pos+6}/E{pos+6},0)'
        calificadas = f'=COUNTIFS({RC}!$E:$E,B{pos+6},{RC}!$W:$W,$C$4,{RC}!$I:$I,"Sí")'
        cash = f'=SUMIFS({RC}!$O:$O,{RC}!$E:$E,B{pos+6},{RC}!$W:$W,$C$4)'
        comision = f'=J{pos+6}*0.05'

        rows.append([
            f"{'🥇' if pos==1 else '🥈' if pos==2 else ''}{pos}",
            setter, "", "",
            agendas, presentadas, cerradas, tasa_agenda, calificadas, cash, comision
        ])

    data_end = 6 + len(SETTERS)
    rows.append([])

    total_row = data_end + 2
    rows.append([
        "", "TOTAL MENSUAL", "", "",
        f"=SUM(E7:E{data_end})",
        f"=SUM(F7:F{data_end})",
        f"=SUM(G7:G{data_end})",
        f"=IFERROR(F{total_row}/E{total_row},0)",
        f"=SUM(I7:I{data_end})",
        f"=SUM(J7:J{data_end})",
        f"=SUM(K7:K{data_end})",
    ])

    rows.extend([[], []])
    rows.append(["", "", "", "", "", "", "", "", "", "", "", "ESQUEMA DE COMISIONES"])
    rows.append(["", "", "", "", "", "", "", "", "", "", "", "Setter: 5% del Cash de sus leads"])

    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="'🏆 Leaderboard Setters'!A1",
        valueInputOption="USER_ENTERED",
        body={"values": rows}
    ).execute()

    sid = sheet_ids["🏆 Leaderboard Setters"]
    requests = []

    # Month dropdown in C4
    requests.append({
        "setDataValidation": {
            "range": {"sheetId": sid, "startRowIndex": 3, "endRowIndex": 4, "startColumnIndex": 2, "endColumnIndex": 3},
            "rule": {
                "condition": {
                    "type": "ONE_OF_LIST",
                    "values": [{"userEnteredValue": m} for m in MONTH_OPTIONS]
                },
                "showCustomUi": True, "strict": True
            }
        }
    })

    # Currency format for cash and commission columns (J=9, K=10)
    for col in [9, 10]:
        requests.append({
            "repeatCell": {
                "range": {"sheetId": sid, "startRowIndex": 6, "startColumnIndex": col, "endColumnIndex": col + 1, "endRowIndex": 15},
                "cell": {"userEnteredFormat": {"numberFormat": {"type": "CURRENCY", "pattern": "$#,##0.00"}}},
                "fields": "userEnteredFormat.numberFormat"
            }
        })

    # Percentage format for tasa agenda (H=7)
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 6, "startColumnIndex": 7, "endColumnIndex": 8, "endRowIndex": 15},
            "cell": {"userEnteredFormat": {"numberFormat": {"type": "PERCENT", "pattern": "0.0%"}}},
            "fields": "userEnteredFormat.numberFormat"
        }
    })

    return requests


def write_metricas(service, sheet_ids):
    """Rewrite Métricas 2026 with live formulas from Registro Calls."""
    print("  Writing Métricas 2026 formulas...")

    service.spreadsheets().values().clear(
        spreadsheetId=SPREADSHEET_ID,
        range="'📊 Métricas 2026'!A1:N25"
    ).execute()

    meses_labels = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
    mes_keys = [f"2026-{i+1}" for i in range(12)]

    # Column B=Enero...M=Diciembre (indices 1-12)
    # All formulas reference Registro Calls

    rows = [
        ["Métricas 2026"] + meses_labels,  # Row 1
        [""] + mes_keys,  # Row 2 - month keys for reference
        ["VENTAS"],  # Row 3
    ]

    # Row 4: Llamadas Totales
    row = ["Llamadas Totales"]
    for mk in mes_keys:
        row.append(f'=COUNTIFS({RC}!$W:$W,"{mk}")')
    rows.append(row)

    # Row 5: Llamadas Presentadas
    row = ["Llamadas Presentadas"]
    for mk in mes_keys:
        row.append(f'=COUNTIFS({RC}!$W:$W,"{mk}",{RC}!$K:$K,"Sí")')
    rows.append(row)

    # Row 6: Llamadas Calificadas
    row = ["Llamadas Calificadas"]
    for mk in mes_keys:
        row.append(f'=COUNTIFS({RC}!$W:$W,"{mk}",{RC}!$I:$I,"Sí")')
    rows.append(row)

    # Row 7: % Calificadas (of presentadas)
    row = ["% Calificadas"]
    for i in range(12):
        col_letter = chr(66 + i)  # B=66
        row.append(f"=IFERROR({col_letter}6/{col_letter}5,0)")
    rows.append(row)

    # Row 8: Show Up Rate
    row = ["Show Up Rate"]
    for i in range(12):
        col_letter = chr(66 + i)
        row.append(f"=IFERROR({col_letter}5/{col_letter}4,0)")
    rows.append(row)

    # Row 9: Cerradas
    row = ["Cerradas"]
    for mk in mes_keys:
        row.append(f'=COUNTIFS({RC}!$W:$W,"{mk}",{RC}!$L:$L,"*Cerrado*")')
    rows.append(row)

    # Row 10: Tasa de Cierre (Total)
    row = ["Tasa de Cierre (Total)"]
    for i in range(12):
        col_letter = chr(66 + i)
        row.append(f"=IFERROR({col_letter}9/{col_letter}4,0)")
    rows.append(row)

    # Row 11: Tasa de Cierre (Presentadas)
    row = ["Tasa de Cierre (Presentadas)"]
    for i in range(12):
        col_letter = chr(66 + i)
        row.append(f"=IFERROR({col_letter}9/{col_letter}5,0)")
    rows.append(row)

    # Row 12: blank
    rows.append([])

    # Row 13: INGRESOS section
    rows.append(["INGRESOS"])

    # Row 14: Cash Collected Día 1
    row = ["Cash Collected Día 1"]
    for mk in mes_keys:
        row.append(f'=SUMIFS({RC}!$O:$O,{RC}!$W:$W,"{mk}")')
    rows.append(row)

    # Row 15: Cash Collected Total
    row = ["Cash Collected Total"]
    for mk in mes_keys:
        row.append(f'=SUMIFS({RC}!$P:$P,{RC}!$W:$W,"{mk}")')
    rows.append(row)

    # Row 16: Ticket Promedio
    row = ["Ticket Promedio"]
    for i in range(12):
        col_letter = chr(66 + i)
        row.append(f"=IFERROR({col_letter}14/{col_letter}9,0)")
    rows.append(row)

    # Row 17: blank
    rows.append([])

    # Row 18: COMISIONES
    rows.append(["COMISIONES"])

    # Row 19: Comisiones Closers (10%)
    row = ["Comisiones Closers (10%)"]
    for i in range(12):
        col_letter = chr(66 + i)
        row.append(f"={col_letter}14*0.10")
    rows.append(row)

    # Row 20: Comisiones Setters (5%)
    row = ["Comisiones Setters (5%)"]
    for i in range(12):
        col_letter = chr(66 + i)
        row.append(f"={col_letter}14*0.05")
    rows.append(row)

    # Row 21: Total Comisiones
    row = ["TOTAL COMISIONES"]
    for i in range(12):
        col_letter = chr(66 + i)
        row.append(f"={col_letter}19+{col_letter}20")
    rows.append(row)

    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="'📊 Métricas 2026'!A1",
        valueInputOption="USER_ENTERED",
        body={"values": rows}
    ).execute()

    # Formatting
    sid = sheet_ids["📊 Métricas 2026"]
    requests = []

    # Currency rows (14, 15, 16, 19, 20, 21) — indices 13, 14, 15, 18, 19, 20
    for row_idx in [13, 14, 15, 18, 19, 20]:
        requests.append({
            "repeatCell": {
                "range": {"sheetId": sid, "startRowIndex": row_idx, "endRowIndex": row_idx + 1, "startColumnIndex": 1, "endColumnIndex": 13},
                "cell": {"userEnteredFormat": {"numberFormat": {"type": "CURRENCY", "pattern": "$#,##0.00"}}},
                "fields": "userEnteredFormat.numberFormat"
            }
        })

    # Percentage rows (7, 8, 10, 11) — indices 6, 7, 9, 10
    for row_idx in [6, 7, 9, 10]:
        requests.append({
            "repeatCell": {
                "range": {"sheetId": sid, "startRowIndex": row_idx, "endRowIndex": row_idx + 1, "startColumnIndex": 1, "endColumnIndex": 13},
                "cell": {"userEnteredFormat": {"numberFormat": {"type": "PERCENT", "pattern": "0.0%"}}},
                "fields": "userEnteredFormat.numberFormat"
            }
        })

    return requests


def write_estado_resultados(service, sheet_ids):
    """Rewrite Estado de Resultados with live formulas."""
    print("  Writing Estado de Resultados formulas...")

    service.spreadsheets().values().clear(
        spreadsheetId=SPREADSHEET_ID,
        range="'📈 Estado de Resultados'!A1:M20"
    ).execute()

    meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
             "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]
    mes_keys = [f"2026-{i+1}" for i in range(12)]

    # Vertical layout: one column per category, months as rows
    rows = [
        ["Estado de Resultados — 2026"],
        [],
        ["", "Mes", "Cash Collected", "Comisiones (15%)", "Gastos", "RESULTADO NETO"],
    ]

    for i, (mes, mk) in enumerate(zip(meses, mes_keys)):
        r = i + 4  # row number (1-indexed)
        cash = f'=SUMIFS({RC}!$O:$O,{RC}!$W:$W,"{mk}")'
        comis = f"=C{r}*0.15"
        gastos = f'=SUMIFS(\'💸 Gastos\'!$C:$C,\'💸 Gastos\'!$A:$A,"*2026*")'  # simplified, all gastos
        # Better: match by month in gastos date
        # Actually gastos dates are like "2026-01-15", so we can use LEFT+MID
        gastos = f'=SUMPRODUCT((LEFT(\'💸 Gastos\'!$A$2:$A$100,4)="2026")*(MID(\'💸 Gastos\'!$A$2:$A$100,6,FIND("-",\'💸 Gastos\'!$A$2:$A$100&"-",6)-6)="{i+1}")*\'💸 Gastos\'!$C$2:$C$100)'
        neto = f"=C{r}-D{r}-E{r}"

        rows.append([
            "", mes, cash, comis, gastos, neto
        ])

    # Total row
    total_r = 4 + 12
    rows.append([])
    rows.append([
        "", "TOTAL ANUAL",
        f"=SUM(C4:C15)",
        f"=SUM(D4:D15)",
        f"=SUM(E4:E15)",
        f"=SUM(F4:F15)",
    ])

    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="'📈 Estado de Resultados'!A1",
        valueInputOption="USER_ENTERED",
        body={"values": rows}
    ).execute()

    sid = sheet_ids["📈 Estado de Resultados"]
    requests = []

    # Currency format for C, D, E, F columns (indices 2-5)
    for col in [2, 3, 4, 5]:
        requests.append({
            "repeatCell": {
                "range": {"sheetId": sid, "startRowIndex": 3, "startColumnIndex": col, "endColumnIndex": col + 1, "endRowIndex": 18},
                "cell": {"userEnteredFormat": {"numberFormat": {"type": "CURRENCY", "pattern": "$#,##0.00"}}},
                "fields": "userEnteredFormat.numberFormat"
            }
        })

    return requests


def write_dashboard_financiero(service, sheet_ids):
    """Rewrite Dashboard Financiero with live formulas."""
    print("  Writing Dashboard Financiero formulas...")

    service.spreadsheets().values().clear(
        spreadsheetId=SPREADSHEET_ID,
        range="'💰 Dashboard Financiero'!A1:L30"
    ).execute()

    rows = [
        ["DASHBOARD FINANCIERO"],
        [],
        ["", "Mes", "2026-4"],  # C3 = month selector dropdown
        [],
        # Summary cards
        ["", "RESUMEN DEL MES", "", "", "", "", "COMISIONES"],
        [],
        ["", "Cash Collected:",
         f'=SUMIFS({RC}!$O:$O,{RC}!$W:$W,$C$3)', "", "",
         "", "CLOSERS (10%):",
         f'=C7*0.10'],  # Row 7
        ["", "Unidades Cerradas:",
         f'=COUNTIFS({RC}!$W:$W,$C$3,{RC}!$L:$L,"*Cerrado*")', "", "",
         "", "SETTERS (5%):",
         f'=C7*0.05'],  # Row 8
        ["", "Llamadas Totales:",
         f'=COUNTIFS({RC}!$W:$W,$C$3)', "", "",
         "", "TOTAL COMISIONES:",
         f"=H7+H8"],  # Row 9
        ["", "Presentadas:",
         f'=COUNTIFS({RC}!$W:$W,$C$3,{RC}!$K:$K,"Sí")', "", "",
         "", "", ""],  # Row 10
        ["", "Show Up Rate:",
         f"=IFERROR(C10/C9,0)"],  # Row 11
        ["", "Tasa de Cierre:",
         f"=IFERROR(C8/C9,0)"],  # Row 12
        ["", "Ticket Promedio:",
         f"=IFERROR(C7/C8,0)"],  # Row 13
        [],
        # Comisiones per closer
        ["", "COMISIONES POR CLOSER", "", "", "", "", "COMISIONES POR SETTER"],
        [],
    ]

    # Add closer commissions
    for closer in CLOSERS:
        cash = f'=SUMIFS({RC}!$O:$O,{RC}!$F:$F,"{closer}",{RC}!$W:$W,$C$3)'
        comis = f'=C{len(rows)+1}*0.10'
        rows.append(["", closer, cash, comis])

    # Add setter commissions starting from column G
    setter_start_row = 17  # where closer list starts
    for i, setter in enumerate(SETTERS):
        row_idx = setter_start_row + i
        cash = f'=SUMIFS({RC}!$O:$O,{RC}!$E:$E,"{setter}",{RC}!$W:$W,$C$3)'
        comis = f'=H{row_idx}*0.05'
        if row_idx <= len(rows):
            # Add to existing row
            while len(rows[row_idx - 1]) < 7:
                rows[row_idx - 1].append("")
            rows[row_idx - 1].extend([setter, cash, comis])
        else:
            rows.append(["", "", "", "", "", "", "", setter, cash, comis])

    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="'💰 Dashboard Financiero'!A1",
        valueInputOption="USER_ENTERED",
        body={"values": rows}
    ).execute()

    sid = sheet_ids["💰 Dashboard Financiero"]
    requests = []

    # Month dropdown in C3
    requests.append({
        "setDataValidation": {
            "range": {"sheetId": sid, "startRowIndex": 2, "endRowIndex": 3, "startColumnIndex": 2, "endColumnIndex": 3},
            "rule": {
                "condition": {
                    "type": "ONE_OF_LIST",
                    "values": [{"userEnteredValue": m} for m in MONTH_OPTIONS]
                },
                "showCustomUi": True, "strict": True
            }
        }
    })

    # Currency format
    for col in [2, 3, 7, 8, 9]:
        requests.append({
            "repeatCell": {
                "range": {"sheetId": sid, "startRowIndex": 6, "startColumnIndex": col, "endColumnIndex": col + 1, "endRowIndex": 25},
                "cell": {"userEnteredFormat": {"numberFormat": {"type": "CURRENCY", "pattern": "$#,##0.00"}}},
                "fields": "userEnteredFormat.numberFormat"
            }
        })

    # Percentage for show up and cierre (rows 11, 12)
    for row_idx in [10, 11]:
        requests.append({
            "repeatCell": {
                "range": {"sheetId": sid, "startRowIndex": row_idx, "endRowIndex": row_idx + 1, "startColumnIndex": 2, "endColumnIndex": 3},
                "cell": {"userEnteredFormat": {"numberFormat": {"type": "PERCENT", "pattern": "0.0%"}}},
                "fields": "userEnteredFormat.numberFormat"
            }
        })

    return requests


def write_formulario_pagos_formulas(service, sheet_ids):
    """Add the Acumulado del Día formula to Formulario de Pagos."""
    print("  Adding Formulario de Pagos acumulado formula...")

    # A2 = sum of today's payments from Registro de Pagos
    # Registro de Pagos: A = Fecha, E = Efectivo Recaudado
    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="'📝 Formulario de Pagos'!A2",
        valueInputOption="USER_ENTERED",
        body={"values": [[f'=SUMIFS({RP}!$E:$E,{RP}!$A:$A,TEXT(TODAY(),"YYYY-MM-DD"))']]}
    ).execute()

    sid = sheet_ids["📝 Formulario de Pagos"]
    requests = []

    # Currency format for A2
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 1, "endRowIndex": 2, "startColumnIndex": 0, "endColumnIndex": 1},
            "cell": {"userEnteredFormat": {"numberFormat": {"type": "CURRENCY", "pattern": "$#,##0.00"}}},
            "fields": "userEnteredFormat.numberFormat"
        }
    })

    return requests


def main():
    print("Connecting to Sheets API...")
    service = get_service()
    sheet_ids = get_sheet_ids(service)

    # Step 1: Fix cash columns (convert strings to numbers)
    print("\n1. Fixing cash columns...")
    fix_cash_columns(service)

    # Step 2: Write formulas to all sheets
    print("\n2. Writing formulas...")
    all_requests = []

    all_requests.extend(apply_number_format(service, sheet_ids))
    all_requests.extend(write_leaderboard_closers(service, sheet_ids))
    all_requests.extend(write_leaderboard_setters(service, sheet_ids))
    all_requests.extend(write_metricas(service, sheet_ids))
    all_requests.extend(write_estado_resultados(service, sheet_ids))
    all_requests.extend(write_dashboard_financiero(service, sheet_ids))
    all_requests.extend(write_formulario_pagos_formulas(service, sheet_ids))

    # Step 3: Apply formatting
    print("\n3. Applying formatting...")
    for i in range(0, len(all_requests), 50):
        batch = all_requests[i:i+50]
        service.spreadsheets().batchUpdate(
            spreadsheetId=SPREADSHEET_ID, body={"requests": batch}
        ).execute()
        print(f"  Batch {i//50 + 1} done ({len(batch)} requests)")

    print(f"\n✅ Done! All formulas live.")
    print(f"   Sheet: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}")


if __name__ == "__main__":
    main()
