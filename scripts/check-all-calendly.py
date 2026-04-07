import json, subprocess, sys
sys.stdout.reconfigure(encoding='utf-8')

tokens = {
    "Juan Mart\u00edn": {
        "token": "eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzc1MzI0NDAzLCJqdGkiOiI0YzRlNWUzOS0wOTY5LTQ3ZDMtOGMwMC05ZTRlNDhjOWVkZWEiLCJ1c2VyX3V1aWQiOiJjOTgzYjUwOS1kZjFjLTQ2NjEtYWFkNS04ZmI3YmY0MGY4YzQiLCJzY29wZSI6ImF2YWlsYWJpbGl0eTpyZWFkIGF2YWlsYWJpbGl0eTp3cml0ZSBldmVudF90eXBlczpyZWFkIGV2ZW50X3R5cGVzOndyaXRlIGxvY2F0aW9uczpyZWFkIHJvdXRpbmdfZm9ybXM6cmVhZCBzaGFyZXM6d3JpdGUgc2NoZWR1bGVkX2V2ZW50czpyZWFkIHNjaGVkdWxlZF9ldmVudHM6d3JpdGUgc2NoZWR1bGluZ19saW5rczp3cml0ZSBncm91cHM6cmVhZCBvcmdhbml6YXRpb25zOnJlYWQgb3JnYW5pemF0aW9uczp3cml0ZSB1c2VyczpyZWFkIGFjdGl2aXR5X2xvZzpyZWFkIGRhdGFfY29tcGxpYW5jZTp3cml0ZSBvdXRnb2luZ19jb21tdW5pY2F0aW9uczpyZWFkIHdlYmhvb2tzOnJlYWQgd2ViaG9va3M6d3JpdGUifQ.0VJLgOPshmZf79KYmzfbnJvTWjeF95LnMfXY3wzm2zZRuM-L8fzuzKrLXq6YpR-fJ34Lz3b0MkL5DZWtzFWu8Q",
        "user": "c983b509-df1c-4661-aad5-8fb7bf40f8c4",
        "org": "2a0ace2a-e6d4-4391-a23e-8a70c6a255c7"
    },
    "Agust\u00edn": {
        "token": "eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzc1MzI0ODQzLCJqdGkiOiI4OGRhMDlkOS0wZTA2LTRiODUtOGMxMi01OTkzYWI3NzkwZDMiLCJ1c2VyX3V1aWQiOiI5MDhiZjEwMy1jYWYzLTQ0NzYtOTJmNi00MDgzYWQ2MTVhYjgiLCJzY29wZSI6ImF2YWlsYWJpbGl0eTpyZWFkIGF2YWlsYWJpbGl0eTp3cml0ZSBldmVudF90eXBlczpyZWFkIGV2ZW50X3R5cGVzOndyaXRlIGxvY2F0aW9uczpyZWFkIHJvdXRpbmdfZm9ybXM6cmVhZCBzaGFyZXM6d3JpdGUgc2NoZWR1bGVkX2V2ZW50czpyZWFkIHNjaGVkdWxlZF9ldmVudHM6d3JpdGUgc2NoZWR1bGluZ19saW5rczp3cml0ZSBncm91cHM6cmVhZCBvcmdhbml6YXRpb25zOnJlYWQgb3JnYW5pemF0aW9uczp3cml0ZSB1c2VyczpyZWFkIGFjdGl2aXR5X2xvZzpyZWFkIGRhdGFfY29tcGxpYW5jZTp3cml0ZSBvdXRnb2luZ19jb21tdW5pY2F0aW9uczpyZWFkIHdlYmhvb2tzOnJlYWQgd2ViaG9va3M6d3JpdGUifQ.rO2voESBFmiBzv6HwvQ4RNauAAkJc5NsY_dGrdmPoQ5YQzq2ey_B_js33qc-5jWXUGhj5q8YzajU2bfXOceoFA",
        "user": "908bf103-caf3-4476-92f6-4083ad615ab8",
        "org": "388f0528-3f2c-4ad7-b30f-2029aa1dacde"
    },
    "Fede": {
        "token": "eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzc1NDE2OTk3LCJqdGkiOiIyYjUzODA4Mi1iZWIxLTQzZmEtOWU1OC0wOTEwZWI4MGRmNGIiLCJ1c2VyX3V1aWQiOiJiZjE4NjEzNy1jM2JlLTRhZjItOTQ1My1iZWM2YWY3ZWEzYzIiLCJzY29wZSI6ImF2YWlsYWJpbGl0eTpyZWFkIGF2YWlsYWJpbGl0eTp3cml0ZSBldmVudF90eXBlczpyZWFkIGV2ZW50X3R5cGVzOndyaXRlIGxvY2F0aW9uczpyZWFkIHJvdXRpbmdfZm9ybXM6cmVhZCBzaGFyZXM6d3JpdGUgc2NoZWR1bGVkX2V2ZW50czpyZWFkIHNjaGVkdWxlZF9ldmVudHM6d3JpdGUgc2NoZWR1bGluZ19saW5rczp3cml0ZSBncm91cHM6cmVhZCBvcmdhbml6YXRpb25zOnJlYWQgb3JnYW5pemF0aW9uczp3cml0ZSB1c2VyczpyZWFkIGFjdGl2aXR5X2xvZzpyZWFkIGRhdGFfY29tcGxpYW5jZTp3cml0ZSBvdXRnb2luZ19jb21tdW5pY2F0aW9uczpyZWFkIHdlYmhvb2tzOnJlYWQgd2ViaG9va3M6d3JpdGUifQ.i2QBsmehMt4ly5b394fNmpj1xyWFGZDxaaWWiMsjAuetzzZoh90mElJAy7dODCH48FwL-vGEYV9SWcltcVEZ7g",
        "user": "bf186137-c3be-4af2-9453-bec6af7ea3c2",
        "org": "d51d490b-c199-4856-aa5d-24cbf0cdecd5"
    },
}

def curl_get(url, token):
    result = subprocess.run(["curl", "-s", url, "-H", f"Authorization: Bearer {token}"], capture_output=True, text=True, encoding='utf-8')
    return json.loads(result.stdout)

# Get existing
existing = json.loads(open("C:/tmp/existing_sheet2.json").read())
existing_names = set(existing['names'])
existing_emails = set(existing['emails'])

# Re-read to get latest
result = subprocess.run([
    "node", "-e",
    'const{google:g}=require("googleapis"),f=require("fs"),p=require("path");(async()=>{const c=JSON.parse(f.readFileSync(p.join(process.cwd(),"credentials.json"),"utf8")),a=new g.auth.GoogleAuth({credentials:c,scopes:["https://www.googleapis.com/auth/spreadsheets.readonly"]}),s=g.sheets({version:"v4",auth:a}),r=await s.spreadsheets.values.get({spreadsheetId:"14l6eg-JfY5M00NRSmOT-38f5eRsC0xsOqZl9bsggDv4",range:"\'📞 Registro Calls\'!A2:AC"});const rows=r.data.values||[];const names=rows.map(r=>(r[0]||"").trim().toLowerCase());const emails=rows.map(r=>(r[27]||"").trim().toLowerCase()).filter(e=>e);f.writeFileSync("C:/tmp/existing_sheet3.json",JSON.stringify({names,emails}));console.log(names.length+" "+emails.length)})();'
], capture_output=True, text=True, encoding='utf-8', cwd="C:/Users/matyc/projects/roms-crm/webapp")
print("Sheet refreshed:", result.stdout.strip())

existing = json.loads(open("C:/tmp/existing_sheet3.json").read())
existing_names = set(existing['names'])
existing_emails = set(existing['emails'])

all_new = []

for closer_name, info in tokens.items():
    print(f"\n=== {closer_name} ===")
    all_events = []
    next_page = None
    while True:
        url = f"https://api.calendly.com/scheduled_events?user=https://api.calendly.com/users/{info['user']}&count=100&sort=start_time:asc&organization=https://api.calendly.com/organizations/{info['org']}"
        if next_page:
            url += f"&page_token={next_page}"
        data = curl_get(url, info['token'])
        events = data.get("collection", [])
        all_events.extend(events)
        next_page = data.get("pagination", {}).get("next_page_token")
        if not next_page:
            break

    active = [e for e in all_events if e.get("status") != "canceled"]
    print(f"  Total: {len(all_events)}, Active: {len(active)}")

    missing = 0
    for event in active:
        event_uri = event["uri"]
        start_time = event.get("start_time", "")[:10]

        inv_data = curl_get(f"{event_uri}/invitees?count=100", info['token'])
        invitees = [i for i in inv_data.get("collection", []) if i.get("status") != "canceled"]

        for inv in invitees:
            name = inv.get("name", "").strip()
            email = inv.get("email", "").strip()
            if not name: continue

            if name.lower() in existing_names or (email.lower() and email.lower() in existing_emails):
                continue

            missing += 1
            questions = inv.get("questions_and_answers", [])
            telefono, instagram, contexto = "", "", ""
            for q in questions:
                ql = q.get("question", "").lower()
                ans = q.get("answer", "")
                if "tel" in ql or "whatsapp" in ql: telefono = ans
                elif "instagram" in ql or "ig" in ql or "usuario" in ql: instagram = ans

            tracking = inv.get("tracking", {}) or {}
            parts = start_time.split("-")
            mes = f"{parts[0]}-{int(parts[1])}" if len(parts) >= 2 else ""

            row = [name, instagram, start_time, start_time, "", closer_name,
                   "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
                   tracking.get("utm_source", "") or "", tracking.get("utm_medium", "") or "",
                   email, telefono, mes]
            all_new.append(row)
            print(f"  MISSING: {start_time} | {name} | {email}")

    print(f"  Missing: {missing}")

print(f"\n\nTOTAL NEW: {len(all_new)}")
if all_new:
    with open("C:/tmp/calendly_missing_all.json", "w", encoding="utf-8") as f:
        json.dump(all_new, f, ensure_ascii=False)
