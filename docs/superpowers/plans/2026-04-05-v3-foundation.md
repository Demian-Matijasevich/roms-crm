# ROMS CRM v3.0 — Foundation Plan (Security + Data)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secure the app (signed sessions, API auth, input validation) and extend the data layer with 20 new columns + a Seguimientos sheet, unblocking all v3 features.

**Architecture:** Replace base64 cookie auth with jose-signed JWTs. Add a `requireSession()` middleware helper used by all API routes. Extend the Llamada type with 20 new fields from Airtable. Create a new "🔄 Seguimientos" sheet for structured follow-up tracking. Use zod for all API input validation.

**Tech Stack:** jose (JWT signing), zod (validation), Google Sheets API v4 (batchUpdate for formatting)

**Parallelization:** Tasks 1-4 (security) are sequential (each builds on previous). Tasks 5-8 (data) can run in parallel with each other AFTER Task 1 is done (they need the updated types). Tasks 5 and 6 are independent. Task 7 depends on 5+6. Task 8 is independent.

---

### Task 1: Install dependencies + signed sessions with jose

**Files:**
- Modify: `webapp/package.json`
- Modify: `webapp/lib/auth.ts`
- Modify: `webapp/app/api/auth/login/route.ts`

- [ ] **Step 1: Install jose and zod**

```bash
cd webapp && npm install jose zod
```

- [ ] **Step 2: Rewrite auth.ts with signed sessions**

Replace the entire contents of `webapp/lib/auth.ts` with:

```typescript
// webapp/lib/auth.ts
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { TEAM } from "./constants";
import type { AuthSession, Role } from "./types";

const COOKIE_NAME = "roms_session";
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "roms-crm-default-secret-change-in-production"
);

const pins: Record<string, string> = {
  "Valentino": "1234",
  "Agustín": "1234",
  "Juan Martín": "1234",
  "Fede": "1234",
  "Guille": "1234",
  "Juanma": "0000",
  "Fran": "0000",
};

export function findUser(nombre: string, pin: string) {
  if (pins[nombre] !== pin) return null;
  const member = TEAM.find(t => t.nombre === nombre);
  if (!member) return null;
  return { nombre: member.nombre, roles: member.roles };
}

export async function createSessionToken(session: AuthSession): Promise<string> {
  return new SignJWT({ nombre: session.nombre, roles: session.roles })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { nombre: payload.nombre as string, roles: payload.roles as Role[] };
  } catch {
    return null;
  }
}

export function hasRole(session: AuthSession | null, role: Role): boolean {
  return session?.roles.includes(role) ?? false;
}

export function isAdmin(session: AuthSession | null): boolean {
  return hasRole(session, "admin");
}
```

- [ ] **Step 3: Update login route to use signed tokens**

Replace the entire contents of `webapp/app/api/auth/login/route.ts` with:

```typescript
// webapp/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { findUser, createSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  const { nombre, pin } = await request.json();
  const user = findUser(nombre, pin);

  if (!user) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  const token = await createSessionToken(user);
  const response = NextResponse.json({ success: true, user });
  response.cookies.set("roms_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}
```

- [ ] **Step 4: Build and verify**

```bash
cd webapp && npm run build
```

Expected: Build succeeds with no errors. The login flow now produces signed JWTs instead of base64 strings. Old cookies will be rejected (users will need to re-login, which is fine).

- [ ] **Step 5: Commit**

```bash
git add webapp/package.json webapp/package-lock.json webapp/lib/auth.ts webapp/app/api/auth/login/route.ts
git commit -m "feat: signed JWT sessions with jose, replace base64 cookies"
```

---

### Task 2: Add requireSession helper + protect all API routes

**Files:**
- Modify: `webapp/lib/auth.ts` (add `requireSession`)
- Modify: `webapp/app/api/llamadas/route.ts`
- Modify: `webapp/app/api/pagos/route.ts`
- Modify: `webapp/app/api/alumnos/route.ts`
- Modify: `webapp/app/api/reporte-setter/route.ts`
- Modify: `webapp/app/api/calendly/route.ts`
- Modify: `webapp/app/api/session/route.ts`

- [ ] **Step 1: Add requireSession to auth.ts**

Add this function at the end of `webapp/lib/auth.ts`:

```typescript
import { NextResponse } from "next/server";

export async function requireSession(): Promise<{ session: AuthSession } | { error: NextResponse }> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }
  return { session };
}

export async function requireAdmin(): Promise<{ session: AuthSession } | { error: NextResponse }> {
  const result = await requireSession();
  if ("error" in result) return result;
  if (!isAdmin(result.session)) {
    return { error: NextResponse.json({ error: "Acceso denegado" }, { status: 403 }) };
  }
  return result;
}
```

Note: The `NextResponse` import needs to be added at the top of `auth.ts`. Since `auth.ts` is used by both server components (which use `next/headers`) and API routes, this import is safe — Next.js tree-shakes appropriately.

- [ ] **Step 2: Protect POST /api/llamadas**

At the start of the POST handler in `webapp/app/api/llamadas/route.ts`, after `try {`, add:

```typescript
import { requireSession } from "@/lib/auth";

// Inside POST, first line after try {:
const auth = await requireSession();
if ("error" in auth) return auth.error;
```

- [ ] **Step 3: Protect POST /api/pagos**

Same pattern in `webapp/app/api/pagos/route.ts`:

```typescript
import { requireSession } from "@/lib/auth";

// Inside POST, first line after try {:
const auth = await requireSession();
if ("error" in auth) return auth.error;
```

- [ ] **Step 4: Protect PUT /api/alumnos**

Same pattern in `webapp/app/api/alumnos/route.ts`:

```typescript
import { requireSession } from "@/lib/auth";

// Inside PUT, first line after try {:
const auth = await requireSession();
if ("error" in auth) return auth.error;
```

- [ ] **Step 5: Protect POST /api/reporte-setter**

Same pattern in `webapp/app/api/reporte-setter/route.ts`:

```typescript
import { requireSession } from "@/lib/auth";

// Inside POST, first line after try {:
const auth = await requireSession();
if ("error" in auth) return auth.error;
```

- [ ] **Step 6: Protect GET /api/calendly**

Same pattern in `webapp/app/api/calendly/route.ts`:

```typescript
import { requireSession } from "@/lib/auth";

// Inside GET, first line:
const auth = await requireSession();
if ("error" in auth) return auth.error;
```

- [ ] **Step 7: Build and verify**

```bash
cd webapp && npm run build
```

Expected: Build succeeds. All API routes now require a valid signed session.

- [ ] **Step 8: Commit**

```bash
git add webapp/lib/auth.ts webapp/app/api/llamadas/route.ts webapp/app/api/pagos/route.ts webapp/app/api/alumnos/route.ts webapp/app/api/reporte-setter/route.ts webapp/app/api/calendly/route.ts
git commit -m "feat: protect all API routes with requireSession auth check"
```

---

### Task 3: Input validation with zod on all API routes

**Files:**
- Create: `webapp/lib/schemas.ts`
- Modify: `webapp/app/api/llamadas/route.ts`
- Modify: `webapp/app/api/pagos/route.ts`
- Modify: `webapp/app/api/alumnos/route.ts`
- Modify: `webapp/app/api/reporte-setter/route.ts`
- Modify: `webapp/app/api/auth/login/route.ts`

- [ ] **Step 1: Create schemas.ts**

Create `webapp/lib/schemas.ts`:

```typescript
// webapp/lib/schemas.ts
import { z } from "zod";

// Sanitize strings to prevent Google Sheets formula injection
function safeString(maxLen = 500) {
  return z.string().max(maxLen).transform(s => {
    const trimmed = s.trim();
    if (trimmed.startsWith("=") || trimmed.startsWith("+") || trimmed.startsWith("-") || trimmed.startsWith("@")) {
      return "'" + trimmed; // Prefix with ' to escape formula
    }
    return trimmed;
  });
}

export const loginSchema = z.object({
  nombre: z.string().min(1).max(50),
  pin: z.string().length(4).regex(/^\d{4}$/),
});

export const llamadaSchema = z.object({
  rowIndex: z.number().int().min(2),
  estado: safeString(50),
  sePresentó: z.enum(["Sí", "No", ""]).default(""),
  calificado: z.enum(["Sí", "No", "Parcial", ""]).default(""),
  programa: safeString(50).default(""),
  contextoCloser: safeString(2000).default(""),
  cashDia1: z.number().min(0).default(0),
  planPago: safeString(30).default(""),
  pago1: z.number().min(0).default(0),
  metodoPago: safeString(30).default(""),
});

export const pagoSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(""),
  producto: safeString(50).default(""),
  nombre: safeString(100),
  telefono: safeString(30).default(""),
  monto: z.number().positive(),
  closer: safeString(50).default(""),
  setter: safeString(50).default(""),
  comprobante: safeString(500).default(""),
  concepto: safeString(50),
  receptor: safeString(50).default(""),
  fuente: safeString(50).default(""),
  mes: safeString(20).default(""),
});

export const alumnoUpdateSchema = z.object({
  rowIndex: z.number().int().min(2),
  fields: z.record(z.string(), z.union([safeString(500), z.number()])),
});

export const reporteSetterSchema = z.object({
  fecha: z.string().min(1),
  setter: safeString(50),
  conversacionesIniciadas: z.number().int().min(0),
  respuestasHistorias: z.number().int().min(0),
  calendariosEnviados: z.number().int().min(0),
  notas: safeString(2000).default(""),
});
```

- [ ] **Step 2: Apply loginSchema to login route**

In `webapp/app/api/auth/login/route.ts`, replace `const { nombre, pin } = await request.json();` with:

```typescript
import { loginSchema } from "@/lib/schemas";

const parsed = loginSchema.safeParse(await request.json());
if (!parsed.success) {
  return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
}
const { nombre, pin } = parsed.data;
```

- [ ] **Step 3: Apply llamadaSchema to llamadas route**

In `webapp/app/api/llamadas/route.ts`, replace the destructuring block with:

```typescript
import { llamadaSchema } from "@/lib/schemas";

const parsed = llamadaSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
}
const { rowIndex, estado, sePresentó, calificado, programa, contextoCloser, cashDia1, planPago, pago1, metodoPago } = parsed.data;
```

Remove the manual validation checks (`if (!rowIndex...)`, `if (!estado...)`) since zod handles them.

- [ ] **Step 4: Apply pagoSchema to pagos route**

In `webapp/app/api/pagos/route.ts`, replace the destructuring + validation with:

```typescript
import { pagoSchema } from "@/lib/schemas";

const parsed = pagoSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
}
```

Then use `parsed.data` fields directly in the `appendPayment` call.

- [ ] **Step 5: Apply alumnoUpdateSchema to alumnos route**

In `webapp/app/api/alumnos/route.ts`, replace the manual validation with:

```typescript
import { alumnoUpdateSchema } from "@/lib/schemas";

const parsed = alumnoUpdateSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
}
const { rowIndex, fields } = parsed.data;
```

- [ ] **Step 6: Apply reporteSetterSchema to reporte-setter route**

In `webapp/app/api/reporte-setter/route.ts`, replace the manual validation with:

```typescript
import { reporteSetterSchema } from "@/lib/schemas";

const parsed = reporteSetterSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
}
```

- [ ] **Step 7: Build and verify**

```bash
cd webapp && npm run build
```

Expected: Build succeeds. All inputs are now validated and sanitized against formula injection.

- [ ] **Step 8: Commit**

```bash
git add webapp/lib/schemas.ts webapp/app/api/
git commit -m "feat: zod validation + formula injection protection on all API routes"
```

---

### Task 4: Rate limiting on login

**Files:**
- Create: `webapp/lib/rate-limit.ts`
- Modify: `webapp/app/api/auth/login/route.ts`

- [ ] **Step 1: Create in-memory rate limiter**

Create `webapp/lib/rate-limit.ts`:

```typescript
// webapp/lib/rate-limit.ts
// Simple in-memory rate limiter. Resets on server restart (acceptable for this scale).
const attempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now > record.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }

  if (record.count >= maxAttempts) {
    return false; // blocked
  }

  record.count++;
  return true; // allowed
}
```

- [ ] **Step 2: Apply rate limiting to login route**

In `webapp/app/api/auth/login/route.ts`, add rate limiting before the PIN check:

```typescript
import { checkRateLimit } from "@/lib/rate-limit";

// Inside POST handler, before findUser:
const ip = request.headers.get("x-forwarded-for") || "unknown";
if (!checkRateLimit(ip)) {
  return NextResponse.json(
    { error: "Demasiados intentos. Esperá 1 minuto." },
    { status: 429 }
  );
}
```

- [ ] **Step 3: Build and verify**

```bash
cd webapp && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add webapp/lib/rate-limit.ts webapp/app/api/auth/login/route.ts
git commit -m "feat: rate limiting on login (5 attempts per minute per IP)"
```

---

### Task 5: Add 20 new columns to Google Sheet with formatting

**Files:**
- Modify: `scripts/format-sheet.js` (or create a new script `scripts/add-columns.js`)

- [ ] **Step 1: Create the column addition script**

Create `webapp/scripts/add-columns.js`:

```javascript
const { google } = require(require('path').join(__dirname, '..', 'node_modules', 'googleapis'));
const fs = require('fs');
const path = require('path');

async function main() {
  const creds = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'credentials.json'), 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const ssId = '14l6eg-JfY5M00NRSmOT-38f5eRsC0xsOqZl9bsggDv4';
  const sheetId = 205167958;

  // 1. Add headers for new columns (AE-AX = indices 30-49)
  const newHeaders = [
    'Evento/Calendario', 'Desde dónde se agendó', 'Modelo de negocio',
    'Objetivo 6 meses', 'Capacidad de inversión', 'Lead Score',
    'Link de llamada', 'Reporte General', 'Concepto de pago',
    'Comprobante 1', 'Comprobante 2', 'Comprobante 3',
    'Fecha Pago 2', 'Fecha Pago 3', 'Quién recibe',
    'Monto ARS', 'Fue Seguimiento', 'De dónde viene el lead',
    'Tag Manychat', 'Notas internas',
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: ssId,
    range: "'📞 Registro Calls'!AE1:AX1",
    valueInputOption: 'RAW',
    requestBody: { values: [newHeaders] },
  });
  console.log('Headers added');

  const rgb = (r, g, b) => ({ red: r/255, green: g/255, blue: b/255 });
  const PURPLE = rgb(139, 92, 246);
  const DARK_BG = rgb(13, 13, 15);
  const WHITE = rgb(229, 229, 229);
  const CARD_BORDER = rgb(39, 39, 42);

  const requests = [];

  // 2. Format new header cells
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 30, endColumnIndex: 50 },
      cell: {
        userEnteredFormat: {
          backgroundColor: PURPLE,
          textFormat: { foregroundColor: rgb(255, 255, 255), bold: true, fontSize: 10, fontFamily: 'Inter' },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
        }
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
    }
  });

  // 3. Format data cells
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 30, endColumnIndex: 50 },
      cell: {
        userEnteredFormat: {
          backgroundColor: DARK_BG,
          textFormat: { foregroundColor: WHITE, fontSize: 10, fontFamily: 'Inter' },
          verticalAlignment: 'MIDDLE',
        }
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)',
    }
  });

  // 4. Column widths
  const widths = [140,160,160,140,160,80,200,250,120,200,200,200,110,110,120,100,100,160,120,250];
  for (let i = 0; i < widths.length; i++) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: 30 + i, endIndex: 31 + i },
        properties: { pixelSize: widths[i] },
        fields: 'pixelSize',
      }
    });
  }

  // 5. Dropdowns
  const dropdowns = [
    { col: 30, values: ['Sesión Auditoría Martin', 'Sesión Auditoría Agus', 'Sesión Auditoría Valentino', 'Sesión Auditoría Fede'] },
    { col: 31, values: ['Instagram DM', 'Instagram Stories', 'WhatsApp', 'YouTube', 'Página web', 'Referido', 'Otro'] },
    { col: 32, values: ['Experto/referente', 'Negocio tradicional', 'Ecommerce/marca', 'Ya posicionado'] },
    { col: 33, values: ['Incrementar ventas', 'Volverse referente', 'Crecer horizontal'] },
    { col: 34, values: ['Sí dispuesto', 'No pero puede', 'No ni dispuesto'] },
    { col: 38, values: ['1era Cuota', 'PIF', '2da Cuota', '3ra Cuota', 'Resell'] },
    { col: 44, values: ['Juanma', 'Fran', 'Financiera BECHECK', 'Binance', 'Efectivo', 'Link MP'] },
    { col: 46, values: ['Sí', 'No'] },
  ];
  for (const dd of dropdowns) {
    requests.push({
      setDataValidation: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: dd.col, endColumnIndex: dd.col + 1 },
        rule: {
          condition: { type: 'ONE_OF_LIST', values: dd.values.map(v => ({ userEnteredValue: v })) },
          showCustomUi: true, strict: false,
        }
      }
    });
  }

  // 6. Currency format for Monto ARS (col AT = index 45)
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 45, endColumnIndex: 46 },
      cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"ARS $"#,##0' } } },
      fields: 'userEnteredFormat.numberFormat',
    }
  });

  // 7. Borders
  requests.push({
    updateBorders: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1000, startColumnIndex: 30, endColumnIndex: 50 },
      innerHorizontal: { style: 'SOLID', width: 1, color: CARD_BORDER },
      innerVertical: { style: 'SOLID', width: 1, color: CARD_BORDER },
    }
  });

  console.log(`Sending ${requests.length} formatting requests...`);
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: ssId, requestBody: { requests } });
  console.log('Done! 20 new columns added and formatted.');
}

main().catch(e => console.error('Error:', e.message));
```

- [ ] **Step 2: Run the script**

```bash
cd webapp && node scripts/add-columns.js
```

Expected: "Done! 20 new columns added and formatted."

- [ ] **Step 3: Commit**

```bash
git add webapp/scripts/add-columns.js
git commit -m "feat: add 20 new columns to Sheet with formatting and dropdowns"
```

---

### Task 6: Create "🔄 Seguimientos" sheet

**Files:**
- Create: `webapp/scripts/create-seguimientos-sheet.js`

- [ ] **Step 1: Create the script**

Create `webapp/scripts/create-seguimientos-sheet.js`:

```javascript
const { google } = require(require('path').join(__dirname, '..', 'node_modules', 'googleapis'));
const fs = require('fs');
const path = require('path');

async function main() {
  const creds = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'credentials.json'), 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const ssId = '14l6eg-JfY5M00NRSmOT-38f5eRsC0xsOqZl9bsggDv4';

  const rgb = (r, g, b) => ({ red: r/255, green: g/255, blue: b/255 });
  const PURPLE = rgb(139, 92, 246);
  const DARK_BG = rgb(13, 13, 15);
  const WHITE = rgb(229, 229, 229);
  const CARD_BORDER = rgb(39, 39, 42);

  // 1. Create the sheet
  const addSheet = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: ssId,
    requestBody: {
      requests: [{
        addSheet: {
          properties: {
            title: '🔄 Seguimientos',
            gridProperties: { rowCount: 1000, columnCount: 8, frozenRowCount: 1 },
          }
        }
      }]
    }
  });
  const newSheetId = addSheet.data.replies[0].addSheet.properties.sheetId;
  console.log('Sheet created with ID:', newSheetId);

  // 2. Add headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: ssId,
    range: "'🔄 Seguimientos'!A1:H1",
    valueInputOption: 'RAW',
    requestBody: {
      values: [['Fecha', 'Lead', 'Closer', 'Tipo', 'Nota', 'Resultado', 'Fecha Próximo Contacto', 'Row Index Lead']],
    },
  });

  // 3. Format
  const requests = [];

  // Header formatting
  requests.push({
    repeatCell: {
      range: { sheetId: newSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 },
      cell: {
        userEnteredFormat: {
          backgroundColor: PURPLE,
          textFormat: { foregroundColor: rgb(255, 255, 255), bold: true, fontSize: 10, fontFamily: 'Inter' },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
        }
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
    }
  });

  // Data rows
  requests.push({
    repeatCell: {
      range: { sheetId: newSheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 8 },
      cell: {
        userEnteredFormat: {
          backgroundColor: DARK_BG,
          textFormat: { foregroundColor: WHITE, fontSize: 10, fontFamily: 'Inter' },
          verticalAlignment: 'MIDDLE',
        }
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)',
    }
  });

  // Column widths
  const widths = [110, 160, 110, 140, 300, 200, 140, 80];
  for (let i = 0; i < widths.length; i++) {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId: newSheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: widths[i] },
        fields: 'pixelSize',
      }
    });
  }

  // Tipo dropdown (col D = index 3)
  requests.push({
    setDataValidation: {
      range: { sheetId: newSheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 3, endColumnIndex: 4 },
      rule: {
        condition: {
          type: 'ONE_OF_LIST',
          values: ['Call inicial', 'Seguimiento #1', 'Seguimiento #2', 'Seguimiento #3', 'Re-agenda', 'Cierre', 'Descarte']
            .map(v => ({ userEnteredValue: v }))
        },
        showCustomUi: true, strict: false,
      }
    }
  });

  // Borders
  requests.push({
    updateBorders: {
      range: { sheetId: newSheetId, startRowIndex: 0, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 8 },
      innerHorizontal: { style: 'SOLID', width: 1, color: CARD_BORDER },
      innerVertical: { style: 'SOLID', width: 1, color: CARD_BORDER },
    }
  });

  await sheets.spreadsheets.batchUpdate({ spreadsheetId: ssId, requestBody: { requests } });
  console.log('Seguimientos sheet formatted.');
}

main().catch(e => console.error('Error:', e.message));
```

- [ ] **Step 2: Run the script**

```bash
cd webapp && node scripts/create-seguimientos-sheet.js
```

Expected: "Sheet created with ID: [number]" then "Seguimientos sheet formatted."

- [ ] **Step 3: Commit**

```bash
git add webapp/scripts/create-seguimientos-sheet.js
git commit -m "feat: create formatted Seguimientos sheet in Google Sheets"
```

---

### Task 7: Update types.ts, sheets.ts, data.ts for new columns + seguimientos

**Files:**
- Modify: `webapp/lib/types.ts`
- Modify: `webapp/lib/sheets.ts`
- Modify: `webapp/lib/data.ts`

- [ ] **Step 1: Add new fields to Llamada interface in types.ts**

Add these fields at the end of the `Llamada` interface in `webapp/lib/types.ts` (before the closing `}`):

```typescript
  // v3 fields (columns AE-AX)
  eventoCalendario: string;
  desdeDonde: string;
  modeloNegocio: string;
  objetivo6Meses: string;
  capacidadInversion: string;
  leadScore: string;
  linkLlamada: string;
  reporteGeneral: string;
  conceptoPago: string;
  comprobante1: string;
  comprobante2: string;
  comprobante3: string;
  fechaPago2: string;
  fechaPago3: string;
  quienRecibe: string;
  montoARS: number;
  fueSeguimiento: string;
  deDondeVieneLead: string;
  tagManychat: string;
  notasInternas: string;
```

Add new Seguimiento interface:

```typescript
export interface Seguimiento {
  rowIndex: number;
  fecha: string;
  lead: string;
  closer: string;
  tipo: string;
  nota: string;
  resultado: string;
  fechaProximoContacto: string;
  leadRowIndex: number;
}
```

- [ ] **Step 2: Update fetchLlamadas in sheets.ts**

In `webapp/lib/sheets.ts`, change the range from `A2:AD` to `A2:AX`:

```typescript
range: "'📞 Registro Calls'!A2:AX",
```

Add the new fields to the mapping (after `mes: str(r, 29),`):

```typescript
    // v3 fields
    eventoCalendario: str(r, 30),
    desdeDonde: str(r, 31),
    modeloNegocio: str(r, 32),
    objetivo6Meses: str(r, 33),
    capacidadInversion: str(r, 34),
    leadScore: str(r, 35),
    linkLlamada: str(r, 36),
    reporteGeneral: str(r, 37),
    conceptoPago: str(r, 38),
    comprobante1: str(r, 39),
    comprobante2: str(r, 40),
    comprobante3: str(r, 41),
    fechaPago2: str(r, 42),
    fechaPago3: str(r, 43),
    quienRecibe: str(r, 44),
    montoARS: num(r, 45),
    fueSeguimiento: str(r, 46),
    deDondeVieneLead: str(r, 47),
    tagManychat: str(r, 48),
    notasInternas: str(r, 49),
```

- [ ] **Step 3: Update CALL_COLUMNS mapping in sheets.ts**

Add the new columns to the `CALL_COLUMNS` record:

```typescript
  eventoCalendario: "AE", desdeDonde: "AF", modeloNegocio: "AG",
  objetivo6Meses: "AH", capacidadInversion: "AI", leadScore: "AJ",
  linkLlamada: "AK", reporteGeneral: "AL", conceptoPago: "AM",
  comprobante1: "AN", comprobante2: "AO", comprobante3: "AP",
  fechaPago2: "AQ", fechaPago3: "AR", quienRecibe: "AS",
  montoARS: "AT", fueSeguimiento: "AU", deDondeVieneLead: "AV",
  tagManychat: "AW", notasInternas: "AX",
```

- [ ] **Step 4: Add fetchSeguimientos and appendSeguimiento to sheets.ts**

Add at the end of `webapp/lib/sheets.ts`:

```typescript
import { Seguimiento } from "./types";

export async function fetchSeguimientos(): Promise<Seguimiento[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'🔄 Seguimientos'!A2:H",
  });
  const rows = (res.data.values || []) as string[][];

  return rows.map((r, i) => ({
    rowIndex: i + 2,
    fecha: str(r, 0),
    lead: str(r, 1),
    closer: str(r, 2),
    tipo: str(r, 3),
    nota: str(r, 4),
    resultado: str(r, 5),
    fechaProximoContacto: str(r, 6),
    leadRowIndex: num(r, 7),
  }));
}

export async function appendSeguimiento(data: {
  fecha: string;
  lead: string;
  closer: string;
  tipo: string;
  nota: string;
  resultado: string;
  fechaProximoContacto: string;
  leadRowIndex: number;
}): Promise<void> {
  const sheets = getSheets(false);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "'🔄 Seguimientos'!A:H",
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        data.fecha, data.lead, data.closer, data.tipo,
        data.nota, data.resultado, data.fechaProximoContacto,
        data.leadRowIndex,
      ]],
    },
  });
}
```

Note: Update the import at the top of sheets.ts to include Seguimiento:

```typescript
import { Llamada, Gasto, Seguimiento } from "./types";
```

- [ ] **Step 5: Add calculateLeadScore to data.ts**

Add at the end of `webapp/lib/data.ts`:

```typescript
export function calculateLeadScore(l: Llamada): string {
  const inversion = l.capacidadInversion.toLowerCase();
  const modelo = l.modeloNegocio.toLowerCase();
  const fuente = l.desdeDonde.toLowerCase();

  const siPuedeInvertir = inversion.includes("sí") || inversion.includes("si ");
  const noPeroConsigue = inversion.includes("no pero") || inversion.includes("puede");
  const buenModelo = modelo.includes("experto") || modelo.includes("posicionado");
  const fuenteDirecta = fuente.includes("dm") || fuente.includes("whatsapp") || fuente.includes("instagram");

  if (siPuedeInvertir && buenModelo && fuenteDirecta) return "A+";
  if (siPuedeInvertir) return "A";
  if (noPeroConsigue && buenModelo) return "B";
  if (noPeroConsigue) return "C";
  return "D";
}
```

- [ ] **Step 6: Update Alumno fields in data.ts getAlumnos**

Add the new Calendly response fields to the Alumno return object in `getAlumnos()`:

First update the Alumno interface in types.ts to include:

```typescript
  // v3 additions
  modeloNegocio: string;
  capacidadInversion: string;
  leadScore: string;
  quienRecibe: string;
```

Then in `data.ts` `getAlumnos()`, add to the return object:

```typescript
      modeloNegocio: l.modeloNegocio,
      capacidadInversion: l.capacidadInversion,
      leadScore: calculateLeadScore(l),
      quienRecibe: l.quienRecibe,
```

- [ ] **Step 7: Build and verify**

```bash
cd webapp && npm run build
```

Expected: Build succeeds. Some pages may show warnings about unused variables if the new fields aren't displayed yet — that's fine.

- [ ] **Step 8: Commit**

```bash
git add webapp/lib/types.ts webapp/lib/sheets.ts webapp/lib/data.ts
git commit -m "feat: extend data layer with 20 new Llamada fields + Seguimientos read/write"
```

---

### Task 8: Create seguimientos API route

**Files:**
- Create: `webapp/app/api/seguimientos/route.ts`
- Modify: `webapp/lib/schemas.ts`

- [ ] **Step 1: Add seguimiento schema to schemas.ts**

Add to `webapp/lib/schemas.ts`:

```typescript
export const seguimientoSchema = z.object({
  fecha: z.string().min(1),
  lead: safeString(100),
  closer: safeString(50),
  tipo: z.enum(["Call inicial", "Seguimiento #1", "Seguimiento #2", "Seguimiento #3", "Re-agenda", "Cierre", "Descarte"]),
  nota: safeString(2000),
  resultado: safeString(500).default(""),
  fechaProximoContacto: z.string().default(""),
  leadRowIndex: z.number().int().min(2),
});
```

- [ ] **Step 2: Create the API route**

Create directory and file `webapp/app/api/seguimientos/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { seguimientoSchema } from "@/lib/schemas";
import { appendSeguimiento, fetchSeguimientos, updateCallFields } from "@/lib/sheets";

export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const seguimientos = await fetchSeguimientos();
  return NextResponse.json(seguimientos);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSession();
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const parsed = seguimientoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
    }

    await appendSeguimiento(parsed.data);

    // Also mark the lead as "Fue Seguimiento" in the main sheet
    if (parsed.data.tipo.startsWith("Seguimiento")) {
      await updateCallFields(parsed.data.leadRowIndex, { fueSeguimiento: "Sí" });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[POST /api/seguimientos]", err);
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create the directory**

```bash
mkdir -p webapp/app/api/seguimientos
```

- [ ] **Step 4: Build and verify**

```bash
cd webapp && npm run build
```

Expected: Build succeeds. New `/api/seguimientos` route appears in the route list.

- [ ] **Step 5: Commit**

```bash
git add webapp/app/api/seguimientos/route.ts webapp/lib/schemas.ts
git commit -m "feat: seguimientos API route with GET/POST + zod validation"
```

---

### Task 9: Push and deploy

- [ ] **Step 1: Push all foundation changes**

```bash
git push origin main
```

- [ ] **Step 2: Add SESSION_SECRET to Vercel env vars**

In Vercel dashboard → Settings → Environment Variables, add:

```
SESSION_SECRET = [generate a random 64-char string]
```

This is used by jose to sign the JWT tokens.

- [ ] **Step 3: Verify deployment**

Wait for Vercel auto-deploy. Verify:
- Login still works (users will need to re-login since old cookies are invalid)
- All forms submit correctly
- No errors in Vercel logs

- [ ] **Step 4: Commit any hotfixes if needed**

---

## Parallelization Map

```
Task 1 (jose) ──► Task 2 (API auth) ──► Task 3 (zod) ──► Task 4 (rate limit)
                                                              │
Task 5 (Sheet columns) ◄──────────────────────────────────────┘
Task 6 (Seguimientos sheet)     [parallel with Task 5]
                  │
Task 7 (types/sheets/data) ◄── depends on 5 + 6
Task 8 (seguimientos API) ◄── depends on 7
Task 9 (deploy) ◄── depends on all
```

**Can run in parallel:**
- Tasks 5 + 6 (Sheet scripts, independent of each other)
- Tasks 1-4 are sequential but can run while someone else does 5+6

**Must be sequential:**
- 1 → 2 → 3 → 4 (each builds on previous auth changes)
- 5 + 6 → 7 → 8 (data layer depends on sheet structure)
