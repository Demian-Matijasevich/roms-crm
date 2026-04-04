"""
Extract all data from ROMS Airtable base to JSON files.
"""
import urllib.request
import json
import os
import time

API_TOKEN = "" # Token removed for security
BASE_ID = "appAOrWjnFV3wWjD3"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "airtable-data")

TABLES = {
    "tbleCytRILP3D7Q3N": "reporte_llamadas",
    "tbl5IvNQJQUbFrE6O": "gastos",
    "tblhr7BbirhvrorZo": "setter",
    "tblA5iKXDDqpBUh0x": "utms_builder",
    "tbl0Jw1vRoaSAcZgP": "onboarding",
    "tbloD4rZPAyBKoylS": "base_clientes",
    "tblDSzP54VuEfce8e": "historial_renovaciones",
    "tblRxMpUKOhfkF0ys": "integrantes_equipo",
    "tblpfZMziou1Ny9sU": "reportes_diarios",
    "tblBB1qH1c8q42rxU": "metodos_pago",
}

def fetch_table(table_id, table_name):
    all_records = []
    offset = None
    page = 1

    while True:
        url = f"https://api.airtable.com/v0/{BASE_ID}/{table_id}"
        if offset:
            url += f"?offset={offset}"

        req = urllib.request.Request(url)
        req.add_header("Authorization", f"Bearer {API_TOKEN}")

        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode())
        except Exception as e:
            print(f"  ERROR fetching {table_name} page {page}: {e}")
            break

        records = data.get("records", [])
        all_records.extend(records)
        print(f"  {table_name}: page {page}, got {len(records)} records (total: {len(all_records)})")

        offset = data.get("offset")
        if not offset:
            break
        page += 1
        time.sleep(0.2)  # Rate limit

    return all_records

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    summary = {}
    for table_id, table_name in TABLES.items():
        print(f"\nFetching: {table_name} ({table_id})")
        records = fetch_table(table_id, table_name)

        output_path = os.path.join(OUTPUT_DIR, f"{table_name}.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, indent=2)

        summary[table_name] = len(records)
        print(f"  Saved {len(records)} records to {output_path}")

    print("\n=== SUMMARY ===")
    for name, count in summary.items():
        print(f"  {name}: {count} records")

    with open(os.path.join(OUTPUT_DIR, "summary.json"), "w") as f:
        json.dump(summary, f, indent=2)

if __name__ == "__main__":
    main()
