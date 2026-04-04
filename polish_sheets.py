"""
Polish ROMS CRM Google Sheet — apply professional formatting matching the example sheets.
Run AFTER rebuild_sheets.py. Adds: merged cells, borders, dropdowns, banners, proper spacing.
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from google.oauth2 import service_account
from googleapiclient.discovery import build
import os

SPREADSHEET_ID = "14l6eg-JfY5M00NRSmOT-38f5eRsC0xsOqZl9bsggDv4"
CREDS_FILE = os.path.join(os.path.dirname(__file__), "credentials.json")
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

# === COLORS ===
DARK_BG = {"red": 0.051, "green": 0.051, "blue": 0.059}       # #0d0d0f
CARD_BG = {"red": 0.094, "green": 0.094, "blue": 0.106}       # #18181b
INPUT_BG = {"red": 0.13, "green": 0.13, "blue": 0.15}         # slightly lighter for inputs
PURPLE = {"red": 0.545, "green": 0.361, "blue": 0.965}        # #8b5cf6
PURPLE_DK = {"red": 0.30, "green": 0.12, "blue": 0.55}
GREEN = {"red": 0.133, "green": 0.773, "blue": 0.369}         # #22c55e
GREEN_DK = {"red": 0.08, "green": 0.22, "blue": 0.12}
RED = {"red": 0.937, "green": 0.267, "blue": 0.267}           # #ef4444
RED_DK = {"red": 0.30, "green": 0.08, "blue": 0.08}
YELLOW = {"red": 0.918, "green": 0.702, "blue": 0.031}        # #eab308
YELLOW_DK = {"red": 0.25, "green": 0.20, "blue": 0.05}
GOLD = {"red": 1.0, "green": 0.84, "blue": 0.0}
WHITE = {"red": 0.93, "green": 0.93, "blue": 0.93}
MUTED = {"red": 0.44, "green": 0.44, "blue": 0.48}
BORDER_COLOR = {"red": 0.20, "green": 0.20, "blue": 0.22}     # #333338
BLACK = {"red": 0.0, "green": 0.0, "blue": 0.0}
CREAM_BG = {"red": 1.0, "green": 0.97, "blue": 0.88}         # light cream for form banner
GOLD_BTN = {"red": 0.85, "green": 0.75, "blue": 0.45}        # gold button
BLUE_BTN = {"red": 0.6, "green": 0.75, "blue": 0.9}          # blue button
PINK_NOTE = {"red": 1.0, "green": 0.75, "blue": 0.75}        # pink note bg
FORM_LABEL_BG = {"red": 0.96, "green": 0.96, "blue": 0.96}   # light gray for labels
FORM_WHITE = {"red": 1.0, "green": 1.0, "blue": 1.0}
FORM_BLACK = {"red": 0.0, "green": 0.0, "blue": 0.0}
FORM_BG = {"red": 0.95, "green": 0.95, "blue": 0.95}         # light bg for form sheet


def get_service():
    creds = service_account.Credentials.from_service_account_file(CREDS_FILE, scopes=SCOPES)
    return build("sheets", "v4", credentials=creds)


def solid_border(color=BORDER_COLOR, style="SOLID"):
    return {"style": style, "color": color, "width": 1}


def thick_border(color=BORDER_COLOR):
    return {"style": "SOLID_MEDIUM", "color": color, "width": 2}


def get_sheet_ids(service):
    meta = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    return {sh["properties"]["title"]: sh["properties"]["sheetId"] for sh in meta["sheets"]}


def rewrite_formulario_pagos(service, sid):
    """Rewrite the Formulario de Pagos to match the example: light bg, banner, form fields, dropdowns."""

    # First clear existing content
    service.spreadsheets().values().clear(
        spreadsheetId=SPREADSHEET_ID,
        range="'📝 Formulario de Pagos'!A1:Z100"
    ).execute()

    # Write form data with proper layout
    rows = [
        ["Acumulado del Día"],       # A1
        ["#N/A"],                     # A2 - formula placeholder
        [],                           # 3
        ["", "", "CARGA DE PAGOS"],   # 4 - banner title (merge C4:E4)
        [],                           # 5
        [],                           # 6
        ["", "Fecha de carga", "", ""],            # 7: label B, input D
        ["", "Programa", "", ""],                   # 8
        ["", "Nombre", "", ""],                     # 9
        ["", "Telefono", "", ""],                   # 10
        ["", "Efectivo Recaudado", "", ""],         # 11
        ["", "Pesos", "", ""],                      # 12
        ["", "Closer", "", ""],                     # 13
        ["", "Setter", "", ""],                     # 14
        ["", "Comprobante", "", ""],                # 15
        ["", "Concepto", "", ""],                   # 16
        ["", "Fuente", "", ""],                     # 17
        ["", "Comisión (Pasarela)", "", ""],        # 18
        [],                                         # 19
        ["", "", "CARGAR"],                         # 20 - button placeholder
        [],                                         # 21
        [],                                         # 22
        ["", "", "", "", "", "", "RECORDÁ AGREGAR EL"],      # 23
        ["", "", "", "", "", "", "COMPROBANTE CORRESPONDIENTE"],  # 24
        ["", "", "", "", "", "", "AL PAGO QUE SE ESTÁ CARGANDO"],# 25
        [],                                         # 26
        ["", "", "", "", "", "", "", "LIMPIAR"],     # 27 - button placeholder
    ]

    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="'📝 Formulario de Pagos'!A1",
        valueInputOption="RAW",
        body={"values": rows}
    ).execute()

    return sid


def format_formulario_pagos(service, sid):
    """Apply professional formatting to the Formulario de Pagos."""
    requests = []

    # Light background for entire sheet
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid},
            "cell": {"userEnteredFormat": {
                "backgroundColor": FORM_WHITE,
                "textFormat": {"foregroundColor": FORM_BLACK, "fontFamily": "Arial", "fontSize": 10}
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat)"
        }
    })

    # Tab color
    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": sid, "tabColor": {"red": 0.95, "green": 0.77, "blue": 0.06}},
            "fields": "tabColor"
        }
    })

    # A1 "Acumulado del Día" - red bold text
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": 1},
            "cell": {"userEnteredFormat": {
                "textFormat": {"foregroundColor": RED, "bold": True, "fontSize": 12}
            }},
            "fields": "userEnteredFormat.textFormat"
        }
    })

    # A2 value - bold
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 1, "endRowIndex": 2, "startColumnIndex": 0, "endColumnIndex": 1},
            "cell": {"userEnteredFormat": {
                "textFormat": {"bold": True, "fontSize": 11}
            }},
            "fields": "userEnteredFormat.textFormat"
        }
    })

    # CARGA DE PAGOS banner - merge C4:E4 with dark bg + white text + rounded look
    requests.append({
        "mergeCells": {
            "range": {"sheetId": sid, "startRowIndex": 3, "endRowIndex": 4, "startColumnIndex": 2, "endColumnIndex": 6},
            "mergeType": "MERGE_ALL"
        }
    })
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 3, "endRowIndex": 4, "startColumnIndex": 2, "endColumnIndex": 6},
            "cell": {"userEnteredFormat": {
                "backgroundColor": {"red": 0.15, "green": 0.15, "blue": 0.15},
                "textFormat": {"foregroundColor": FORM_WHITE, "bold": True, "fontSize": 16, "fontFamily": "Arial"},
                "horizontalAlignment": "CENTER",
                "verticalAlignment": "MIDDLE",
                "borders": {
                    "top": thick_border(BLACK), "bottom": thick_border(BLACK),
                    "left": thick_border(BLACK), "right": thick_border(BLACK)
                }
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,borders)"
        }
    })
    # Banner row height
    requests.append({
        "updateDimensionProperties": {
            "range": {"sheetId": sid, "dimension": "ROWS", "startIndex": 3, "endIndex": 4},
            "properties": {"pixelSize": 50}, "fields": "pixelSize"
        }
    })

    # Form labels (B7:B18) - right aligned, normal weight
    for row_idx in range(6, 18):  # rows 7-18 (0-indexed: 6-17)
        requests.append({
            "repeatCell": {
                "range": {"sheetId": sid, "startRowIndex": row_idx, "endRowIndex": row_idx + 1, "startColumnIndex": 1, "endColumnIndex": 2},
                "cell": {"userEnteredFormat": {
                    "textFormat": {"fontSize": 10, "fontFamily": "Arial"},
                    "horizontalAlignment": "RIGHT",
                    "verticalAlignment": "MIDDLE"
                }},
                "fields": "userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment)"
            }
        })

    # Input cells D7:D18 - with bottom border (underline style like the example)
    for row_idx in range(6, 18):
        # Merge D:E for input area
        requests.append({
            "mergeCells": {
                "range": {"sheetId": sid, "startRowIndex": row_idx, "endRowIndex": row_idx + 1, "startColumnIndex": 3, "endColumnIndex": 6},
                "mergeType": "MERGE_ALL"
            }
        })
        requests.append({
            "repeatCell": {
                "range": {"sheetId": sid, "startRowIndex": row_idx, "endRowIndex": row_idx + 1, "startColumnIndex": 3, "endColumnIndex": 6},
                "cell": {"userEnteredFormat": {
                    "textFormat": {"fontSize": 10, "fontFamily": "Arial"},
                    "horizontalAlignment": "CENTER",
                    "verticalAlignment": "MIDDLE",
                    "borders": {
                        "bottom": solid_border(FORM_BLACK)
                    }
                }},
                "fields": "userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,borders)"
            }
        })

    # Row heights for form rows
    for row_idx in range(6, 18):
        requests.append({
            "updateDimensionProperties": {
                "range": {"sheetId": sid, "dimension": "ROWS", "startIndex": row_idx, "endIndex": row_idx + 1},
                "properties": {"pixelSize": 30}, "fields": "pixelSize"
            }
        })

    # CARGAR button (C20) - gold bg, bold, centered
    requests.append({
        "mergeCells": {
            "range": {"sheetId": sid, "startRowIndex": 19, "endRowIndex": 20, "startColumnIndex": 2, "endColumnIndex": 4},
            "mergeType": "MERGE_ALL"
        }
    })
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 19, "endRowIndex": 20, "startColumnIndex": 2, "endColumnIndex": 4},
            "cell": {"userEnteredFormat": {
                "backgroundColor": GOLD_BTN,
                "textFormat": {"foregroundColor": FORM_BLACK, "bold": True, "fontSize": 14, "fontFamily": "Arial"},
                "horizontalAlignment": "CENTER",
                "verticalAlignment": "MIDDLE",
                "borders": {
                    "top": thick_border(BLACK), "bottom": thick_border(BLACK),
                    "left": thick_border(BLACK), "right": thick_border(BLACK)
                }
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,borders)"
        }
    })
    requests.append({
        "updateDimensionProperties": {
            "range": {"sheetId": sid, "dimension": "ROWS", "startIndex": 19, "endIndex": 20},
            "properties": {"pixelSize": 45}, "fields": "pixelSize"
        }
    })

    # Reminder note (G23:I25) - pink bg with dark text
    requests.append({
        "mergeCells": {
            "range": {"sheetId": sid, "startRowIndex": 22, "endRowIndex": 25, "startColumnIndex": 6, "endColumnIndex": 10},
            "mergeType": "MERGE_ALL"
        }
    })
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 22, "endRowIndex": 25, "startColumnIndex": 6, "endColumnIndex": 10},
            "cell": {"userEnteredFormat": {
                "backgroundColor": PINK_NOTE,
                "textFormat": {"foregroundColor": FORM_BLACK, "bold": True, "fontSize": 11, "fontFamily": "Arial"},
                "horizontalAlignment": "CENTER",
                "verticalAlignment": "MIDDLE",
                "wrapStrategy": "WRAP",
                "borders": {
                    "top": solid_border(FORM_BLACK), "bottom": solid_border(FORM_BLACK),
                    "left": solid_border(FORM_BLACK), "right": solid_border(FORM_BLACK)
                }
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy,borders)"
        }
    })
    # Write the note text as single cell
    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="'📝 Formulario de Pagos'!G23",
        valueInputOption="RAW",
        body={"values": [["RECORDÁ AGREGAR EL COMPROBANTE CORRESPONDIENTE AL PAGO QUE SE ESTÁ CARGANDO"]]}
    ).execute()

    # Arrow from comprobante to note (E15 area) - just a text arrow
    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range="'📝 Formulario de Pagos'!F15",
        valueInputOption="RAW",
        body={"values": [["◄——"]]}
    ).execute()

    # LIMPIAR button (H27)
    requests.append({
        "mergeCells": {
            "range": {"sheetId": sid, "startRowIndex": 26, "endRowIndex": 27, "startColumnIndex": 7, "endColumnIndex": 9},
            "mergeType": "MERGE_ALL"
        }
    })
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 26, "endRowIndex": 27, "startColumnIndex": 7, "endColumnIndex": 9},
            "cell": {"userEnteredFormat": {
                "backgroundColor": BLUE_BTN,
                "textFormat": {"foregroundColor": FORM_BLACK, "bold": True, "fontSize": 14, "fontFamily": "Arial"},
                "horizontalAlignment": "CENTER",
                "verticalAlignment": "MIDDLE",
                "borders": {
                    "top": thick_border(BLACK), "bottom": thick_border(BLACK),
                    "left": thick_border(BLACK), "right": thick_border(BLACK)
                }
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,borders)"
        }
    })

    # Column widths
    col_widths = [(0, 80), (1, 160), (2, 50), (3, 120), (4, 120), (5, 60), (6, 50), (7, 80), (8, 80), (9, 80)]
    for col, width in col_widths:
        requests.append({
            "updateDimensionProperties": {
                "range": {"sheetId": sid, "dimension": "COLUMNS", "startIndex": col, "endIndex": col + 1},
                "properties": {"pixelSize": width}, "fields": "pixelSize"
            }
        })

    # Data validation dropdowns
    dropdowns = {
        7: {"values": ["Consultoría", "Omnipresencia", "Multicuentas", "ROMS 7"]},       # Programa (row 8, idx 7)
        12: {"values": ["Valentino", "Agustín", "Juan Martín", "Juanma", "Fran"]},       # Closer (row 13, idx 12)
        13: {"values": ["Valentino", "Guille"]},                                          # Setter (row 14, idx 13)
        15: {"values": ["Pago completo", "Cuota 1/3", "Cuota 2/3", "Cuota 3/3"]},       # Concepto (row 16, idx 15)
        16: {"values": ["Instagram", "TikTok", "YouTube", "WhatsApp", "Landing", "Otro"]},  # Fuente (row 17, idx 16)
    }

    for row_idx, dd in dropdowns.items():
        requests.append({
            "setDataValidation": {
                "range": {"sheetId": sid, "startRowIndex": row_idx, "endRowIndex": row_idx + 1, "startColumnIndex": 3, "endColumnIndex": 6},
                "rule": {
                    "condition": {
                        "type": "ONE_OF_LIST",
                        "values": [{"userEnteredValue": v} for v in dd["values"]]
                    },
                    "showCustomUi": True,
                    "strict": False
                }
            }
        })

    # Método de pago dropdown (row 18 doesn't exist in original mapping, let's add it)
    # Actually row index needs checking... labels are B7-B18 which is indices 6-17
    # Método de Pago is missing from our labels. Let me check:
    # Row 7 (idx 6): Fecha de carga
    # Row 8 (idx 7): Programa
    # Row 9 (idx 8): Nombre
    # Row 10 (idx 9): Telefono
    # Row 11 (idx 10): Efectivo Recaudado
    # Row 12 (idx 11): Pesos
    # Row 13 (idx 12): Closer
    # Row 14 (idx 13): Setter
    # Row 15 (idx 14): Comprobante
    # Row 16 (idx 15): Concepto
    # Row 17 (idx 16): Fuente
    # Row 18 (idx 17): Comisión (Pasarela)

    return requests


def format_leaderboard(service, sid, title_row=0, header_row=5, data_start=6, data_end=10, is_setters=False):
    """Format a leaderboard sheet to match the example gold/dark theme."""
    requests = []

    # Dark bg for whole sheet
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid},
            "cell": {"userEnteredFormat": {
                "backgroundColor": DARK_BG,
                "textFormat": {"foregroundColor": WHITE, "fontFamily": "Arial", "fontSize": 10}
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat)"
        }
    })

    # Title row - big gold centered text
    requests.append({
        "mergeCells": {
            "range": {"sheetId": sid, "startRowIndex": title_row, "endRowIndex": title_row + 1, "startColumnIndex": 0, "endColumnIndex": 15},
            "mergeType": "MERGE_ALL"
        }
    })
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": title_row, "endRowIndex": title_row + 1},
            "cell": {"userEnteredFormat": {
                "textFormat": {"foregroundColor": GOLD, "bold": True, "fontSize": 22, "fontFamily": "Arial"},
                "horizontalAlignment": "CENTER",
                "verticalAlignment": "MIDDLE"
            }},
            "fields": "userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment)"
        }
    })
    requests.append({
        "updateDimensionProperties": {
            "range": {"sheetId": sid, "dimension": "ROWS", "startIndex": title_row, "endIndex": title_row + 1},
            "properties": {"pixelSize": 55}, "fields": "pixelSize"
        }
    })

    # "Mes" label row (row 4, idx 3) - purple highlight
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 3, "endRowIndex": 4, "startColumnIndex": 1, "endColumnIndex": 3},
            "cell": {"userEnteredFormat": {
                "textFormat": {"foregroundColor": PURPLE, "bold": True, "fontSize": 12},
            }},
            "fields": "userEnteredFormat.textFormat"
        }
    })

    # Header row - purple dark bg, white bold, centered
    end_col = 11 if is_setters else 15
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": header_row, "endRowIndex": header_row + 1, "startColumnIndex": 0, "endColumnIndex": end_col},
            "cell": {"userEnteredFormat": {
                "backgroundColor": PURPLE_DK,
                "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 9, "fontFamily": "Arial"},
                "horizontalAlignment": "CENTER",
                "verticalAlignment": "MIDDLE",
                "wrapStrategy": "WRAP",
                "borders": {
                    "top": solid_border(PURPLE), "bottom": solid_border(PURPLE),
                }
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy,borders)"
        }
    })
    requests.append({
        "updateDimensionProperties": {
            "range": {"sheetId": sid, "dimension": "ROWS", "startIndex": header_row, "endIndex": header_row + 1},
            "properties": {"pixelSize": 40}, "fields": "pixelSize"
        }
    })

    # Data rows - alternating colors, centered
    for r in range(data_start, data_end):
        bg = CARD_BG if (r - data_start) % 2 == 0 else DARK_BG
        requests.append({
            "repeatCell": {
                "range": {"sheetId": sid, "startRowIndex": r, "endRowIndex": r + 1, "startColumnIndex": 0, "endColumnIndex": end_col},
                "cell": {"userEnteredFormat": {
                    "backgroundColor": bg,
                    "horizontalAlignment": "CENTER",
                    "verticalAlignment": "MIDDLE",
                    "borders": {
                        "bottom": solid_border({"red": 0.12, "green": 0.12, "blue": 0.14})
                    }
                }},
                "fields": "userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,borders)"
            }
        })

    # Position column (A) - gold for 1st place
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": data_start, "endRowIndex": data_start + 1, "startColumnIndex": 0, "endColumnIndex": 1},
            "cell": {"userEnteredFormat": {"textFormat": {"foregroundColor": GOLD, "bold": True, "fontSize": 12}}},
            "fields": "userEnteredFormat.textFormat"
        }
    })

    # Cash/commission columns - green/yellow color
    cash_col = 4  # Cash Collected
    comis_col = end_col - 1  # Commission (last data col)
    for r in range(data_start, data_end):
        requests.append({
            "repeatCell": {
                "range": {"sheetId": sid, "startRowIndex": r, "endRowIndex": r + 1, "startColumnIndex": cash_col, "endColumnIndex": cash_col + 1},
                "cell": {"userEnteredFormat": {"textFormat": {"foregroundColor": GREEN}}},
                "fields": "userEnteredFormat.textFormat"
            }
        })
        requests.append({
            "repeatCell": {
                "range": {"sheetId": sid, "startRowIndex": r, "endRowIndex": r + 1, "startColumnIndex": comis_col, "endColumnIndex": comis_col + 1},
                "cell": {"userEnteredFormat": {"textFormat": {"foregroundColor": YELLOW}}},
                "fields": "userEnteredFormat.textFormat"
            }
        })

    # Totals rows - slightly different bg
    for total_row_label in ["Total Mensual", "Totales Históricos"]:
        # These have bold text
        pass  # Will be handled by general bold on column B

    # "ESQUEMA DE COMISIONES" section - gold header
    # Find it roughly at row 14+ area
    comis_section_row = data_end + 4
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": comis_section_row, "endRowIndex": comis_section_row + 1},
            "cell": {"userEnteredFormat": {
                "textFormat": {"foregroundColor": GOLD, "bold": True, "fontSize": 12}
            }},
            "fields": "userEnteredFormat.textFormat"
        }
    })

    # Freeze header
    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": sid, "gridProperties": {"frozenRowCount": header_row + 1}},
            "fields": "gridProperties.frozenRowCount"
        }
    })

    # Tab color gold
    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": sid, "tabColor": GOLD},
            "fields": "tabColor"
        }
    })

    return requests


def format_metricas(service, sid):
    """Format Métricas 2026 sheet."""
    requests = []

    # Dark bg
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid},
            "cell": {"userEnteredFormat": {
                "backgroundColor": DARK_BG,
                "textFormat": {"foregroundColor": WHITE, "fontFamily": "Arial", "fontSize": 10}
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat)"
        }
    })

    # Title row (row 1) - purple bg (no merge to avoid freeze conflict)
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": 13},
            "cell": {"userEnteredFormat": {
                "backgroundColor": PURPLE_DK,
                "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 14},
                "horizontalAlignment": "CENTER"
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
        }
    })
    requests.append({
        "updateDimensionProperties": {
            "range": {"sheetId": sid, "dimension": "ROWS", "startIndex": 0, "endIndex": 1},
            "properties": {"pixelSize": 40}, "fields": "pixelSize"
        }
    })

    # Month headers (row 2) - centered, muted
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 1, "endRowIndex": 2, "startColumnIndex": 1, "endColumnIndex": 13},
            "cell": {"userEnteredFormat": {
                "textFormat": {"foregroundColor": MUTED, "fontSize": 9},
                "horizontalAlignment": "CENTER"
            }},
            "fields": "userEnteredFormat(textFormat,horizontalAlignment)"
        }
    })

    # Section headers (VENTAS, INGRESOS, COMISIONES) - purple text, card bg
    for row_idx in [2, 12, 16]:
        requests.append({
            "repeatCell": {
                "range": {"sheetId": sid, "startRowIndex": row_idx, "endRowIndex": row_idx + 1, "startColumnIndex": 0, "endColumnIndex": 13},
                "cell": {"userEnteredFormat": {
                    "backgroundColor": CARD_BG,
                    "textFormat": {"foregroundColor": PURPLE, "bold": True, "fontSize": 11}
                }},
                "fields": "userEnteredFormat(backgroundColor,textFormat)"
            }
        })

    # First column bold (metric labels)
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startColumnIndex": 0, "endColumnIndex": 1, "startRowIndex": 3},
            "cell": {"userEnteredFormat": {"textFormat": {"bold": True}}},
            "fields": "userEnteredFormat.textFormat.bold"
        }
    })

    # All data cells centered
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 3, "startColumnIndex": 1, "endColumnIndex": 13},
            "cell": {"userEnteredFormat": {"horizontalAlignment": "CENTER"}},
            "fields": "userEnteredFormat.horizontalAlignment"
        }
    })

    # Freeze first column + first 2 rows
    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": sid, "gridProperties": {"frozenRowCount": 2, "frozenColumnCount": 1}},
            "fields": "gridProperties(frozenRowCount,frozenColumnCount)"
        }
    })

    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": sid, "tabColor": PURPLE},
            "fields": "tabColor"
        }
    })

    return requests


def format_registro_calls(service, sid):
    """Format Registro Calls sheet."""
    requests = []

    # Dark bg
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid},
            "cell": {"userEnteredFormat": {
                "backgroundColor": DARK_BG,
                "textFormat": {"foregroundColor": WHITE, "fontFamily": "Arial", "fontSize": 10}
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat)"
        }
    })

    # Header row - green dark bg, bold
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
            "cell": {"userEnteredFormat": {
                "backgroundColor": GREEN_DK,
                "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 9},
                "horizontalAlignment": "CENTER",
                "verticalAlignment": "MIDDLE",
                "wrapStrategy": "WRAP"
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)"
        }
    })
    requests.append({
        "updateDimensionProperties": {
            "range": {"sheetId": sid, "dimension": "ROWS", "startIndex": 0, "endIndex": 1},
            "properties": {"pixelSize": 40}, "fields": "pixelSize"
        }
    })

    # Alternating rows - skip if banding already exists (from rebuild_sheets.py)
    # The banding was already applied, so we don't add it again

    # Conditional formatting - Estado col (L, index 11)
    for text, fg, bg in [
        ("Cerrado", GREEN, GREEN_DK), ("No Cierre", RED, RED_DK),
        ("Pendiente", YELLOW, YELLOW_DK), ("Seguimiento", PURPLE, PURPLE_DK)
    ]:
        requests.append({
            "addConditionalFormatRule": {
                "rule": {
                    "ranges": [{"sheetId": sid, "startRowIndex": 1, "startColumnIndex": 11, "endColumnIndex": 12}],
                    "booleanRule": {
                        "condition": {"type": "TEXT_CONTAINS", "values": [{"userEnteredValue": text}]},
                        "format": {"backgroundColor": bg, "textFormat": {"foregroundColor": fg}}
                    }
                }, "index": 0
            }
        })

    # Se presentó col (K, index 10) conditional
    for text, fg, bg in [("Sí", GREEN, GREEN_DK), ("No", RED, RED_DK)]:
        requests.append({
            "addConditionalFormatRule": {
                "rule": {
                    "ranges": [{"sheetId": sid, "startRowIndex": 1, "startColumnIndex": 10, "endColumnIndex": 11}],
                    "booleanRule": {
                        "condition": {"type": "TEXT_EQ", "values": [{"userEnteredValue": text}]},
                        "format": {"backgroundColor": bg, "textFormat": {"foregroundColor": fg}}
                    }
                }, "index": 0
            }
        })

    # Freeze header
    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": sid, "gridProperties": {"frozenRowCount": 1}},
            "fields": "gridProperties.frozenRowCount"
        }
    })

    # Dropdowns for Estado (col L, index 11)
    requests.append({
        "setDataValidation": {
            "range": {"sheetId": sid, "startRowIndex": 1, "startColumnIndex": 11, "endColumnIndex": 12, "endRowIndex": 700},
            "rule": {
                "condition": {
                    "type": "ONE_OF_LIST",
                    "values": [{"userEnteredValue": v} for v in ["⏳ Pendiente", "✅ Cerrado", "❌ No Cierre", "🔄 Seguimiento", "📅 Reprogramada", "🚫 Cancelada"]]
                },
                "showCustomUi": True, "strict": False
            }
        }
    })

    # Dropdown for Calificado (col I, index 8)
    requests.append({
        "setDataValidation": {
            "range": {"sheetId": sid, "startRowIndex": 1, "startColumnIndex": 8, "endColumnIndex": 9, "endRowIndex": 700},
            "rule": {
                "condition": {
                    "type": "ONE_OF_LIST",
                    "values": [{"userEnteredValue": v} for v in ["Sí", "No", "Se desconoce"]]
                },
                "showCustomUi": True, "strict": False
            }
        }
    })

    # Dropdown for Se presentó (col K, index 10)
    requests.append({
        "setDataValidation": {
            "range": {"sheetId": sid, "startRowIndex": 1, "startColumnIndex": 10, "endColumnIndex": 11, "endRowIndex": 700},
            "rule": {
                "condition": {
                    "type": "ONE_OF_LIST",
                    "values": [{"userEnteredValue": v} for v in ["Sí", "No"]]
                },
                "showCustomUi": True, "strict": False
            }
        }
    })

    # Dropdown for Programa (col M, index 12)
    requests.append({
        "setDataValidation": {
            "range": {"sheetId": sid, "startRowIndex": 1, "startColumnIndex": 12, "endColumnIndex": 13, "endRowIndex": 700},
            "rule": {
                "condition": {
                    "type": "ONE_OF_LIST",
                    "values": [{"userEnteredValue": v} for v in ["Consultoría", "Omnipresencia", "Multicuentas", "ROMS 7"]]
                },
                "showCustomUi": True, "strict": False
            }
        }
    })

    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": sid, "tabColor": GREEN},
            "fields": "tabColor"
        }
    })

    return requests


def format_dashboard_financiero(service, sid):
    """Format Dashboard Financiero."""
    requests = []

    # Dark bg
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid},
            "cell": {"userEnteredFormat": {
                "backgroundColor": DARK_BG,
                "textFormat": {"foregroundColor": WHITE, "fontFamily": "Arial", "fontSize": 10}
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat)"
        }
    })

    # Title "DASHBOARD FINANCIERO" in row 1 col H - big, gold
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 7, "endColumnIndex": 12},
            "cell": {"userEnteredFormat": {
                "textFormat": {"foregroundColor": GOLD, "bold": True, "fontSize": 18}
            }},
            "fields": "userEnteredFormat.textFormat"
        }
    })

    # "COMISIONES VENTAS" title
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": 3},
            "cell": {"userEnteredFormat": {
                "textFormat": {"foregroundColor": PURPLE, "bold": True, "fontSize": 14}
            }},
            "fields": "userEnteredFormat.textFormat"
        }
    })

    # Section headers
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 8, "endRowIndex": 9},
            "cell": {"userEnteredFormat": {
                "backgroundColor": PURPLE_DK,
                "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 10},
                "horizontalAlignment": "CENTER"
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
        }
    })

    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": sid, "tabColor": YELLOW},
            "fields": "tabColor"
        }
    })

    return requests


def format_registro_pagos(service, sid):
    """Format Registro de Pagos."""
    requests = []

    # Dark bg
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid},
            "cell": {"userEnteredFormat": {
                "backgroundColor": DARK_BG,
                "textFormat": {"foregroundColor": WHITE, "fontFamily": "Arial", "fontSize": 10}
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat)"
        }
    })

    # Header row
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
            "cell": {"userEnteredFormat": {
                "backgroundColor": GREEN_DK,
                "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 9},
                "horizontalAlignment": "CENTER",
                "wrapStrategy": "WRAP"
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)"
        }
    })
    requests.append({
        "updateDimensionProperties": {
            "range": {"sheetId": sid, "dimension": "ROWS", "startIndex": 0, "endIndex": 1},
            "properties": {"pixelSize": 35}, "fields": "pixelSize"
        }
    })

    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": sid, "gridProperties": {"frozenRowCount": 1}},
            "fields": "gridProperties.frozenRowCount"
        }
    })

    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": sid, "tabColor": GREEN},
            "fields": "tabColor"
        }
    })

    return requests


def format_estado_resultados(service, sid):
    """Format Estado de Resultados."""
    requests = []

    # Dark bg
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid},
            "cell": {"userEnteredFormat": {
                "backgroundColor": DARK_BG,
                "textFormat": {"foregroundColor": WHITE, "fontFamily": "Arial", "fontSize": 10}
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat)"
        }
    })

    # Title
    requests.append({
        "mergeCells": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": 8},
            "mergeType": "MERGE_ALL"
        }
    })
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
            "cell": {"userEnteredFormat": {
                "backgroundColor": PURPLE_DK,
                "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 14},
                "horizontalAlignment": "CENTER"
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
        }
    })
    requests.append({
        "updateDimensionProperties": {
            "range": {"sheetId": sid, "dimension": "ROWS", "startIndex": 0, "endIndex": 1},
            "properties": {"pixelSize": 40}, "fields": "pixelSize"
        }
    })

    # Month headers row
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 2, "endRowIndex": 3},
            "cell": {"userEnteredFormat": {
                "backgroundColor": CARD_BG,
                "textFormat": {"foregroundColor": GOLD, "bold": True, "fontSize": 11},
                "horizontalAlignment": "CENTER"
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
        }
    })

    # RESULTADO NETO row - green
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 7, "endRowIndex": 8},
            "cell": {"userEnteredFormat": {
                "backgroundColor": GREEN_DK,
                "textFormat": {"foregroundColor": GREEN, "bold": True, "fontSize": 12}
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat)"
        }
    })

    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": sid, "tabColor": PURPLE},
            "fields": "tabColor"
        }
    })

    return requests


def format_gastos(service, sid):
    """Format Gastos sheet."""
    requests = []

    # Dark bg
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid},
            "cell": {"userEnteredFormat": {
                "backgroundColor": DARK_BG,
                "textFormat": {"foregroundColor": WHITE, "fontFamily": "Arial", "fontSize": 10}
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat)"
        }
    })

    # Header row - red theme
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
            "cell": {"userEnteredFormat": {
                "backgroundColor": RED_DK,
                "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 9},
                "horizontalAlignment": "CENTER"
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
        }
    })
    requests.append({
        "updateDimensionProperties": {
            "range": {"sheetId": sid, "dimension": "ROWS", "startIndex": 0, "endIndex": 1},
            "properties": {"pixelSize": 35}, "fields": "pixelSize"
        }
    })

    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": sid, "gridProperties": {"frozenRowCount": 1}},
            "fields": "gridProperties.frozenRowCount"
        }
    })

    # Dropdown for Categoría (col D, index 3)
    requests.append({
        "setDataValidation": {
            "range": {"sheetId": sid, "startRowIndex": 1, "startColumnIndex": 3, "endColumnIndex": 4, "endRowIndex": 100},
            "rule": {
                "condition": {
                    "type": "ONE_OF_LIST",
                    "values": [{"userEnteredValue": v} for v in ["Nómina", "Marketing", "Software", "Oficina", "Otros"]]
                },
                "showCustomUi": True, "strict": False
            }
        }
    })

    # Dropdown for Estado (col G, index 6)
    requests.append({
        "setDataValidation": {
            "range": {"sheetId": sid, "startRowIndex": 1, "startColumnIndex": 6, "endColumnIndex": 7, "endRowIndex": 100},
            "rule": {
                "condition": {
                    "type": "ONE_OF_LIST",
                    "values": [{"userEnteredValue": v} for v in ["✅ Pagado", "⏳ Pendiente", "❌ Cancelado"]]
                },
                "showCustomUi": True, "strict": False
            }
        }
    })

    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": sid, "tabColor": RED},
            "fields": "tabColor"
        }
    })

    return requests


def format_payroll(service, sid):
    """Format Payroll sheet."""
    requests = []

    # Dark bg
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid},
            "cell": {"userEnteredFormat": {
                "backgroundColor": DARK_BG,
                "textFormat": {"foregroundColor": WHITE, "fontFamily": "Arial", "fontSize": 10}
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat)"
        }
    })

    # Title row
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
            "cell": {"userEnteredFormat": {
                "textFormat": {"foregroundColor": GOLD, "bold": True, "fontSize": 14},
            }},
            "fields": "userEnteredFormat.textFormat"
        }
    })

    # Header row (row 2, idx 1)
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 1, "endRowIndex": 2},
            "cell": {"userEnteredFormat": {
                "backgroundColor": PURPLE_DK,
                "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 9},
                "horizontalAlignment": "CENTER",
                "wrapStrategy": "WRAP"
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,wrapStrategy)"
        }
    })
    requests.append({
        "updateDimensionProperties": {
            "range": {"sheetId": sid, "dimension": "ROWS", "startIndex": 1, "endIndex": 2},
            "properties": {"pixelSize": 40}, "fields": "pixelSize"
        }
    })

    # Data rows centered
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sid, "startRowIndex": 3, "endRowIndex": 7},
            "cell": {"userEnteredFormat": {
                "horizontalAlignment": "CENTER",
                "verticalAlignment": "MIDDLE"
            }},
            "fields": "userEnteredFormat(horizontalAlignment,verticalAlignment)"
        }
    })

    # Pagado column conditional (col M, index 12)
    requests.append({
        "setDataValidation": {
            "range": {"sheetId": sid, "startRowIndex": 3, "startColumnIndex": 12, "endColumnIndex": 13, "endRowIndex": 20},
            "rule": {
                "condition": {
                    "type": "ONE_OF_LIST",
                    "values": [{"userEnteredValue": "TRUE"}, {"userEnteredValue": "FALSE"}]
                },
                "showCustomUi": True, "strict": False
            }
        }
    })

    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": sid, "tabColor": YELLOW},
            "fields": "tabColor"
        }
    })

    return requests


def main():
    print("Connecting to Sheets API...")
    service = get_service()

    print("Getting sheet IDs...")
    sheet_ids = get_sheet_ids(service)
    print(f"  Found: {list(sheet_ids.keys())}")

    all_requests = []

    # Rewrite Formulario de Pagos content first
    print("\nRewriting Formulario de Pagos...")
    sid = sheet_ids["📝 Formulario de Pagos"]
    rewrite_formulario_pagos(service, sid)
    form_reqs = format_formulario_pagos(service, sid)
    all_requests.extend(form_reqs)

    # Format all sheets
    print("Formatting Leaderboard Closers...")
    all_requests.extend(format_leaderboard(service, sheet_ids["🏆 Leaderboard Closers"], data_end=10))

    print("Formatting Leaderboard Setters...")
    all_requests.extend(format_leaderboard(service, sheet_ids["🏆 Leaderboard Setters"], data_end=9, is_setters=True))

    print("Formatting Métricas 2026...")
    all_requests.extend(format_metricas(service, sheet_ids["📊 Métricas 2026"]))

    print("Formatting Registro Calls...")
    all_requests.extend(format_registro_calls(service, sheet_ids["📞 Registro Calls"]))

    print("Formatting Dashboard Financiero...")
    all_requests.extend(format_dashboard_financiero(service, sheet_ids["💰 Dashboard Financiero"]))

    print("Formatting Registro de Pagos...")
    all_requests.extend(format_registro_pagos(service, sheet_ids["💳 Registro de Pagos"]))

    print("Formatting Estado de Resultados...")
    all_requests.extend(format_estado_resultados(service, sheet_ids["📈 Estado de Resultados"]))

    print("Formatting Gastos...")
    all_requests.extend(format_gastos(service, sheet_ids["💸 Gastos"]))

    print("Formatting Payroll...")
    all_requests.extend(format_payroll(service, sheet_ids["👥 Payroll"]))

    # Auto-resize columns for all sheets
    for name, sid in sheet_ids.items():
        if "Formulario" not in name:  # Skip form (has manual widths)
            all_requests.append({
                "autoResizeDimensions": {
                    "dimensions": {"sheetId": sid, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 20}
                }
            })

    # Execute all formatting in batches
    print(f"\nApplying {len(all_requests)} formatting requests...")
    for i in range(0, len(all_requests), 50):
        batch = all_requests[i:i+50]
        service.spreadsheets().batchUpdate(
            spreadsheetId=SPREADSHEET_ID, body={"requests": batch}
        ).execute()
        print(f"  Batch {i//50 + 1} done ({len(batch)} requests)")

    print(f"\n✅ Done! Sheet: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}")


if __name__ == "__main__":
    main()
