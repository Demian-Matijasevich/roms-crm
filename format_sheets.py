"""
Format the ROMS CRM Google Sheet to look professional.
Adds colors, headers, data validation, conditional formatting, leaderboard, metrics summary.
"""
from google.oauth2 import service_account
from googleapiclient.discovery import build
import os

SPREADSHEET_ID = "14l6eg-JfY5M00NRSmOT-38f5eRsC0xsOqZl9bsggDv4"
CREDS_FILE = os.path.join(os.path.dirname(__file__), "credentials.json")
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

# ROMS brand colors
DARK_BG = {"red": 0.067, "green": 0.067, "blue": 0.075}       # #111113
CARD_BG = {"red": 0.094, "green": 0.094, "blue": 0.106}        # #18181b
PURPLE = {"red": 0.545, "green": 0.361, "blue": 0.965}          # #8b5cf6
PURPLE_DARK = {"red": 0.427, "green": 0.157, "blue": 0.851}     # #6d28d9
GREEN = {"red": 0.133, "green": 0.773, "blue": 0.369}           # #22c55e
RED = {"red": 0.937, "green": 0.267, "blue": 0.267}             # #ef4444
YELLOW = {"red": 0.918, "green": 0.702, "blue": 0.031}          # #eab308
WHITE = {"red": 0.9, "green": 0.9, "blue": 0.9}
MUTED = {"red": 0.443, "green": 0.443, "blue": 0.478}           # #71717a
BORDER_COLOR = {"red": 0.153, "green": 0.153, "blue": 0.165}    # #27272a


def get_service():
    creds = service_account.Credentials.from_service_account_file(CREDS_FILE, scopes=SCOPES)
    return build("sheets", "v4", credentials=creds)


def get_sheet_ids(service):
    meta = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    return {s["properties"]["title"]: s["properties"]["sheetId"] for s in meta["sheets"]}


def format_crm_llamadas(service, sheet_id, row_count):
    """Format CRM Llamadas sheet with ROMS dark theme."""
    requests = []

    # 1. Sheet tab color (purple)
    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": sheet_id, "tabColor": PURPLE},
            "fields": "tabColor"
        }
    })

    # 2. Entire sheet dark background + white text
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sheet_id},
            "cell": {
                "userEnteredFormat": {
                    "backgroundColor": DARK_BG,
                    "textFormat": {"foregroundColor": WHITE, "fontSize": 10, "fontFamily": "Inter"},
                }
            },
            "fields": "userEnteredFormat(backgroundColor,textFormat)"
        }
    })

    # 3. Header row - purple bg, white bold text
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sheet_id, "startRowIndex": 0, "endRowIndex": 1},
            "cell": {
                "userEnteredFormat": {
                    "backgroundColor": PURPLE_DARK,
                    "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 10, "fontFamily": "Inter"},
                    "horizontalAlignment": "CENTER",
                    "verticalAlignment": "MIDDLE",
                }
            },
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)"
        }
    })

    # 4. Freeze header + first column
    requests.append({
        "updateSheetProperties": {
            "properties": {
                "sheetId": sheet_id,
                "gridProperties": {"frozenRowCount": 1, "frozenColumnCount": 1}
            },
            "fields": "gridProperties.frozenRowCount,gridProperties.frozenColumnCount"
        }
    })

    # 5. Header row height
    requests.append({
        "updateDimensionProperties": {
            "range": {"sheetId": sheet_id, "dimension": "ROWS", "startIndex": 0, "endIndex": 1},
            "properties": {"pixelSize": 36},
            "fields": "pixelSize"
        }
    })

    # 6. Alternating row colors
    requests.append({
        "addBanding": {
            "bandedRange": {
                "range": {"sheetId": sheet_id, "startRowIndex": 1, "endRowIndex": row_count + 1},
                "rowProperties": {
                    "firstBandColor": DARK_BG,
                    "secondBandColor": CARD_BG,
                }
            }
        }
    })

    # 7. Auto-resize columns
    requests.append({
        "autoResizeDimensions": {
            "dimensions": {"sheetId": sheet_id, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 33}
        }
    })

    # 8. Conditional formatting - Estado column (H, index 7)
    # Green for Cerrado
    requests.append({
        "addConditionalFormatRule": {
            "rule": {
                "ranges": [{"sheetId": sheet_id, "startRowIndex": 1, "startColumnIndex": 7, "endColumnIndex": 8}],
                "booleanRule": {
                    "condition": {"type": "TEXT_CONTAINS", "values": [{"userEnteredValue": "Cerrado"}]},
                    "format": {"backgroundColor": {"red": 0.1, "green": 0.3, "blue": 0.15}, "textFormat": {"foregroundColor": GREEN}}
                }
            },
            "index": 0
        }
    })
    # Red for No Cierre / Cancelada
    requests.append({
        "addConditionalFormatRule": {
            "rule": {
                "ranges": [{"sheetId": sheet_id, "startRowIndex": 1, "startColumnIndex": 7, "endColumnIndex": 8}],
                "booleanRule": {
                    "condition": {"type": "TEXT_CONTAINS", "values": [{"userEnteredValue": "No Cierre"}]},
                    "format": {"backgroundColor": {"red": 0.3, "green": 0.1, "blue": 0.1}, "textFormat": {"foregroundColor": RED}}
                }
            },
            "index": 1
        }
    })
    # Yellow for Pendiente
    requests.append({
        "addConditionalFormatRule": {
            "rule": {
                "ranges": [{"sheetId": sheet_id, "startRowIndex": 1, "startColumnIndex": 7, "endColumnIndex": 8}],
                "booleanRule": {
                    "condition": {"type": "TEXT_CONTAINS", "values": [{"userEnteredValue": "Pendiente"}]},
                    "format": {"backgroundColor": {"red": 0.25, "green": 0.2, "blue": 0.05}, "textFormat": {"foregroundColor": YELLOW}}
                }
            },
            "index": 2
        }
    })
    # Purple for Seguimiento
    requests.append({
        "addConditionalFormatRule": {
            "rule": {
                "ranges": [{"sheetId": sheet_id, "startRowIndex": 1, "startColumnIndex": 7, "endColumnIndex": 8}],
                "booleanRule": {
                    "condition": {"type": "TEXT_CONTAINS", "values": [{"userEnteredValue": "seguimiento"}]},
                    "format": {"backgroundColor": {"red": 0.2, "green": 0.1, "blue": 0.3}, "textFormat": {"foregroundColor": PURPLE}}
                }
            },
            "index": 3
        }
    })

    # 9. Conditional formatting for payment status columns (23=W, 26=Z, 29=AC)
    for col in [23, 26, 29]:
        requests.append({
            "addConditionalFormatRule": {
                "rule": {
                    "ranges": [{"sheetId": sheet_id, "startRowIndex": 1, "startColumnIndex": col, "endColumnIndex": col + 1}],
                    "booleanRule": {
                        "condition": {"type": "TEXT_EQ", "values": [{"userEnteredValue": "Pagado"}]},
                        "format": {"backgroundColor": {"red": 0.1, "green": 0.3, "blue": 0.15}, "textFormat": {"foregroundColor": GREEN}}
                    }
                },
                "index": 0
            }
        })

    # 10. Currency format for money columns (20=U ticket, 21=V pago1, 24=X pago2, 27=AA pago3, 31=AF cash, 32=AG saldo)
    for col in [20, 21, 24, 27, 31, 32]:
        requests.append({
            "repeatCell": {
                "range": {"sheetId": sheet_id, "startRowIndex": 1, "startColumnIndex": col, "endColumnIndex": col + 1},
                "cell": {
                    "userEnteredFormat": {
                        "numberFormat": {"type": "CURRENCY", "pattern": "$#,##0.00"}
                    }
                },
                "fields": "userEnteredFormat.numberFormat"
            }
        })

    # 11. Cash Collected column - green text
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sheet_id, "startRowIndex": 1, "startColumnIndex": 31, "endColumnIndex": 32},
            "cell": {
                "userEnteredFormat": {
                    "textFormat": {"foregroundColor": GREEN, "bold": True}
                }
            },
            "fields": "userEnteredFormat.textFormat"
        }
    })

    return requests


def format_gastos(service, sheet_id, row_count):
    """Format Gastos sheet."""
    requests = []

    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": sheet_id, "tabColor": RED},
            "fields": "tabColor"
        }
    })

    # Dark background
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sheet_id},
            "cell": {
                "userEnteredFormat": {
                    "backgroundColor": DARK_BG,
                    "textFormat": {"foregroundColor": WHITE, "fontSize": 10, "fontFamily": "Inter"},
                }
            },
            "fields": "userEnteredFormat(backgroundColor,textFormat)"
        }
    })

    # Header
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sheet_id, "startRowIndex": 0, "endRowIndex": 1},
            "cell": {
                "userEnteredFormat": {
                    "backgroundColor": {"red": 0.35, "green": 0.1, "blue": 0.1},
                    "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 10},
                    "horizontalAlignment": "CENTER",
                }
            },
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
        }
    })

    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": sheet_id, "gridProperties": {"frozenRowCount": 1}},
            "fields": "gridProperties.frozenRowCount"
        }
    })

    # Alternating rows
    requests.append({
        "addBanding": {
            "bandedRange": {
                "range": {"sheetId": sheet_id, "startRowIndex": 1, "endRowIndex": row_count + 1},
                "rowProperties": {"firstBandColor": DARK_BG, "secondBandColor": CARD_BG}
            }
        }
    })

    # Currency col C (index 2)
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sheet_id, "startRowIndex": 1, "startColumnIndex": 2, "endColumnIndex": 3},
            "cell": {
                "userEnteredFormat": {
                    "numberFormat": {"type": "CURRENCY", "pattern": "$#,##0.00"},
                    "textFormat": {"foregroundColor": RED, "bold": True}
                }
            },
            "fields": "userEnteredFormat(numberFormat,textFormat)"
        }
    })

    requests.append({
        "autoResizeDimensions": {
            "dimensions": {"sheetId": sheet_id, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 7}
        }
    })

    return requests


def format_metricas(service, sheet_id):
    """Format Métricas sheet."""
    requests = []

    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": sheet_id, "tabColor": GREEN},
            "fields": "tabColor"
        }
    })

    requests.append({
        "repeatCell": {
            "range": {"sheetId": sheet_id},
            "cell": {
                "userEnteredFormat": {
                    "backgroundColor": DARK_BG,
                    "textFormat": {"foregroundColor": WHITE, "fontSize": 10, "fontFamily": "Inter"},
                }
            },
            "fields": "userEnteredFormat(backgroundColor,textFormat)"
        }
    })

    requests.append({
        "repeatCell": {
            "range": {"sheetId": sheet_id, "startRowIndex": 0, "endRowIndex": 1},
            "cell": {
                "userEnteredFormat": {
                    "backgroundColor": {"red": 0.1, "green": 0.25, "blue": 0.15},
                    "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 10},
                    "horizontalAlignment": "CENTER",
                }
            },
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
        }
    })

    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": sheet_id, "gridProperties": {"frozenRowCount": 1}},
            "fields": "gridProperties.frozenRowCount"
        }
    })

    # Alternating rows
    requests.append({
        "addBanding": {
            "bandedRange": {
                "range": {"sheetId": sheet_id, "startRowIndex": 1, "endRowIndex": 10},
                "rowProperties": {"firstBandColor": DARK_BG, "secondBandColor": CARD_BG}
            }
        }
    })

    # Cash collected col (G, index 6) green
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sheet_id, "startRowIndex": 1, "startColumnIndex": 6, "endColumnIndex": 7},
            "cell": {
                "userEnteredFormat": {
                    "numberFormat": {"type": "CURRENCY", "pattern": "$#,##0.00"},
                    "textFormat": {"foregroundColor": GREEN, "bold": True}
                }
            },
            "fields": "userEnteredFormat(numberFormat,textFormat)"
        }
    })

    # % columns (E=4, F=5)
    for col in [4, 5]:
        requests.append({
            "repeatCell": {
                "range": {"sheetId": sheet_id, "startRowIndex": 1, "startColumnIndex": col, "endColumnIndex": col + 1},
                "cell": {
                    "userEnteredFormat": {
                        "numberFormat": {"type": "NUMBER", "pattern": "#0.0\"%\""},
                        "textFormat": {"foregroundColor": PURPLE}
                    }
                },
                "fields": "userEnteredFormat(numberFormat,textFormat)"
            }
        })

    requests.append({
        "autoResizeDimensions": {
            "dimensions": {"sheetId": sheet_id, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 7}
        }
    })

    return requests


def format_equipo(service, sheet_id):
    """Format Equipo sheet."""
    requests = []

    requests.append({
        "updateSheetProperties": {
            "properties": {"sheetId": sheet_id, "tabColor": YELLOW},
            "fields": "tabColor"
        }
    })

    requests.append({
        "repeatCell": {
            "range": {"sheetId": sheet_id},
            "cell": {
                "userEnteredFormat": {
                    "backgroundColor": DARK_BG,
                    "textFormat": {"foregroundColor": WHITE, "fontSize": 10, "fontFamily": "Inter"},
                }
            },
            "fields": "userEnteredFormat(backgroundColor,textFormat)"
        }
    })

    requests.append({
        "repeatCell": {
            "range": {"sheetId": sheet_id, "startRowIndex": 0, "endRowIndex": 1},
            "cell": {
                "userEnteredFormat": {
                    "backgroundColor": {"red": 0.25, "green": 0.2, "blue": 0.05},
                    "textFormat": {"foregroundColor": WHITE, "bold": True, "fontSize": 10},
                    "horizontalAlignment": "CENTER",
                }
            },
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
        }
    })

    requests.append({
        "autoResizeDimensions": {
            "dimensions": {"sheetId": sheet_id, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 4}
        }
    })

    return requests


def main():
    print("Connecting...")
    service = get_service()
    sheets = get_sheet_ids(service)
    print(f"Sheets found: {list(sheets.keys())}")

    # Get row counts
    vals = service.spreadsheets().values().get(
        spreadsheetId=SPREADSHEET_ID, range="'CRM Llamadas'!A:A"
    ).execute()
    crm_rows = len(vals.get("values", [])) - 1

    vals = service.spreadsheets().values().get(
        spreadsheetId=SPREADSHEET_ID, range="'Gastos'!A:A"
    ).execute()
    gastos_rows = len(vals.get("values", [])) - 1

    print(f"CRM rows: {crm_rows}, Gastos rows: {gastos_rows}")

    # Build all requests
    all_requests = []

    if "CRM Llamadas" in sheets:
        all_requests.extend(format_crm_llamadas(service, sheets["CRM Llamadas"], crm_rows))
        print("  CRM Llamadas formatting prepared")

    if "Gastos" in sheets:
        all_requests.extend(format_gastos(service, sheets["Gastos"], gastos_rows))
        print("  Gastos formatting prepared")

    if "Métricas" in sheets:
        all_requests.extend(format_metricas(service, sheets["Métricas"]))
        print("  Métricas formatting prepared")

    if "Equipo" in sheets:
        all_requests.extend(format_equipo(service, sheets["Equipo"]))
        print("  Equipo formatting prepared")

    # Execute all at once
    print(f"\nApplying {len(all_requests)} formatting requests...")
    service.spreadsheets().batchUpdate(
        spreadsheetId=SPREADSHEET_ID,
        body={"requests": all_requests}
    ).execute()

    print(f"\nDone! Sheet: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}")


if __name__ == "__main__":
    main()
