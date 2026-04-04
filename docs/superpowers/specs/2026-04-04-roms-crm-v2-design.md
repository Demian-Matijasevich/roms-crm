# ROMS CRM v2 — Design Spec

## Overview

Rebuild the ROMS CRM web app into a full operational dashboard with role-based access, live Google Sheets integration, forms for closers to load calls/payments, student management with expiration tracking, leaderboards, commission tracking, and goal setting.

**Client:** 7 ROMS — Consultoría y Crecimiento Digital (Fran Castro + Juan Martín Wohl)

## Programs & Pricing

| Programa | Mensual | PIF (3 meses) | Duración |
|----------|---------|---------------|----------|
| ROMS 7 (Consultoría básica) | $3,000 (pago único) | — | 3 meses |
| Consultoría | $4,000/mes | $10,000 | 3 meses |
| Omnipresencia | $7,000/mes | $18,000 | 3 meses |
| Multicuentas | $12,000/mes | $30,000 | 3 meses |

## Commissions

- **Closer:** 10% of cash collected (what the client actually pays)
- **Setter:** 5% of cash collected (what the client actually pays)
- Commissions calculated per payment received, not on ticket total

## Team & Roles

### Users

| Nombre | Rol Closer | Rol Setter | Login |
|--------|-----------|-----------|-------|
| Valentino | ✅ | ✅ | Simple PIN/code |
| Agustín | ✅ | ❌ | Simple PIN/code |
| Juan Martín | ✅ | ❌ | Simple PIN/code |
| Guille | ❌ | ✅ | Simple PIN/code |
| Juanma | Admin (+ occasional calls) | — | Simple PIN/code |
| Fran | Admin (+ occasional calls) | — | Simple PIN/code |

### Role Permissions

**Admin (Juanma, Fran):**
- Full access to everything
- Can create/edit users
- Can set monthly objectives
- Can see all data across all team members
- Can filter by month, by person, by program

**Closer (Valentino, Agustín, Juan Martín):**
- See only their own metrics
- Load call results via form
- Load payments via form
- See their scheduled calls
- See leaderboard (all closers visible)
- See their commission breakdown

**Setter (Valentino, Guille):**
- See only their own setter metrics
- UTM builder tool
- Daily report form
- See their commission breakdown
- See leaderboard (all setters visible)

**Note:** Valentino has BOTH closer and setter access — he sees a combined sidebar.

## Architecture

### Data Flow

```
Calendly → n8n webhook → Google Sheets (new row in CRM)
                                ↓
                        Web App reads Sheets API
                                ↓
                    Closer finds lead by name → loads call result (form)
                                ↓
                    Closer loads payment (form) → writes to Sheets
                                ↓
                    Dashboard calculates metrics from Sheets data
```

### Tech Stack

- **Frontend:** Next.js 16 (App Router), Tailwind CSS, Recharts
- **Backend:** Next.js API routes (server actions for forms)
- **Data:** Google Sheets API (read/write)
- **Auth:** Simple PIN-based login, stored in a `users` sheet
- **Automation:** n8n (local) for Calendly → Sheets

### Google Sheets Structure

| Sheet | Purpose | Who writes |
|-------|---------|-----------|
| CRM Llamadas | All leads & call data | Calendly (auto) + Closers (form) |
| Gastos | Expenses | Admin |
| Equipo | Team members + PINs | Admin |
| Métricas | Auto-calculated monthly summary | Formulas |
| Alumnos | Active students + expiration | Auto (from closed deals) |
| Cuotas | Payment schedule tracking | Auto + Admin |

## Pages

### 1. Login Page (`/login`)

Simple screen: select your name from dropdown → enter 4-digit PIN → enter.
No email, no password complexity. Session stored in cookie.

### 2. Admin Dashboard (`/`)

**Header:** Title + month selector (dropdown) + "Hoy: $X" badge

**Today Strip (full width):**
- Ingreso Hoy: total cash received today (big green number)
- Llamadas Hoy: scheduled for today with status breakdown
- Cash Collected Mes: running total vs objective
- Resultado Neto: cash collected - gastos

**Alerts Row:**
- 🔴 Cuotas vencidas (count + link)
- 🟡 Alumnos próximos a vencer in 7 days (count + link)
- 🟢 Alumnos activos (count)

**KPI Cards (5 columns):**
- Llamadas del mes
- Presentadas (+ % show up)
- Cerradas (+ % cierre)
- Ticket Promedio (+ upfront vs cuotas count)
- Comisiones del mes (closers + setters breakdown)

**Grid (2x2):**
- Cash Collected bar chart by month
- Leaderboard mini-table (top closers this month)
- Objetivos progress bars
- Próximas cuotas table with urgency colors

### 3. CRM Llamadas (`/llamadas`)

Full table of all calls with:
- Search by name/email/IG
- Filter by: estado, closer, setter, mes, programa, calificado
- Sortable columns
- Color-coded status badges
- Click row to expand details
- "Nueva Llamada" button (for manual entry)

### 4. Alumnos (`/alumnos`)

Table of active students (created when a deal closes):
- Nombre, Programa, Fecha Onboarding, Fecha Vencimiento
- Semáforo: 🟢 >15 días | 🟡 7-15 días | 🔴 <7 días | ⚫ Vencido
- Renovación status (Sí/No/Pendiente)
- Filter: activos, por vencer, vencidos, renovados
- Total active count + renewal rate

**Fields per student:**
- Nombre
- Programa (Consultoría/Omnipresencia/Multicuentas/ROMS7)
- Fecha primer pago (= onboarding)
- Duración: 3 meses (all programs)
- Fecha vencimiento: fecha primer pago + 90 días
- Estado: Activo / Por vencer / Vencido
- Renovado: Sí / No / Pendiente
- Closer que cerró
- Setter que agendó

### 5. Cuotas & Cobros (`/cuotas`)

**Summary cards:**
- Total pendiente de cobro
- Cuotas vencidas (monto)
- Próximas 7 días (monto)
- Cobrado este mes

**Table:**
- Alumno, Cuota (1/3, 2/3, 3/3), Monto, Fecha vencimiento, Estado
- Color: 🔴 vencida | 🟡 próxima 7 días | 🟢 al día | ✅ pagada
- Action button: "Marcar como pagada" (opens mini form to register payment)

### 6. Finanzas (`/finanzas`)

**Month selector** at top

**Estado de Resultados:**
- Cash Collected (ingresos)
  - Desglose: Upfront vs Cuotas
  - Por programa
- Gastos operativos
  - Por categoría
- Comisiones (closers + setters)
- **Resultado Neto** = Cash Collected - Gastos - Comisiones

**Gastos table** (same as current but with add form)

### 7. Leaderboard (`/leaderboard`)

Two tabs: **Closers** | **Setters**

**Closer Leaderboard:**

| Pos | Closer | Cash Collected | Unidades | Llamadas | Presentadas | Show Up% | Cierre% | AOV | Comisión |
|-----|--------|---------------|----------|----------|-------------|----------|---------|-----|----------|

With 🥇🥈🥉 for top 3. Monthly filter. Totals row at bottom.

**Setter Leaderboard:**

| Pos | Setter | Agendas | Presentadas | Cerradas (por su closer) | Tasa Agenda% | Cash (de sus leads) | Comisión |
|-----|--------|---------|-------------|--------------------------|--------------|---------------------|----------|

### 8. Objetivos (`/objetivos`)

Admin sets monthly goals. Progress bars show real-time progress.

**Configurable objectives:**
- Cash Collected target
- Llamadas target
- Alumnos nuevos target
- Tasa de cierre target

**Per-closer objectives** (optional): admin can set individual targets per closer.

Visual: progress bar with current vs goal, percentage, trend arrow.

### 9. Cargar Llamada — Form (`/form/llamada`)

The main form closers use after a call. Steps:

1. **Search lead** — type name, autocomplete from Sheets data (leads loaded from Calendly)
2. **Select lead** — shows lead card with: nombre, fecha agendado, setter, evento, pre-call questions
3. **Fill result:**
   - ¿Se presentó? (Sí/No)
   - Estado: Cerrado / No Cierre / Seguimiento / Reprogramada / Cancelada
   - Lead Calificado: Sí / No / Se desconoce
   - Programa pitcheado: dropdown (Consultoría/Omni/Multi/ROMS7)
   - Contexto Closer (text area — post-call notes)
4. **If Cerrado → Payment section:**
   - Plan de pago: PIF / 3 cuotas
   - Monto total (auto-fills based on programa + plan)
   - Pago 1 monto
   - Método de pago: dropdown
   - Comprobante: file upload (link to Drive)
5. **Submit** → writes to Sheets, shows confirmation with daily accumulator

### 10. Cargar Pago — Form (`/form/pago`)

For recording subsequent payments (cuota 2, cuota 3):

1. **Search student** by name (from Alumnos sheet, only those with pending cuotas)
2. **Shows:** programa, plan, cuotas pagadas/pendientes, montos, fechas
3. **Fill:**
   - Cuota # (auto-detected: next pending)
   - Monto
   - Fecha de pago
   - Método de pago
   - Comprobante link
4. **Submit** → updates Sheets

### 11. UTM Builder (`/utm`)

Setter tool to generate tracked links:

- Base URL input
- Fuente (preset: Instagram, TikTok, YouTube, WhatsApp, Landing)
- Medio (preset: DM, Historia, Bio, Calendario, Orgánico)
- Setter name (auto from logged-in user)
- **Generate** button → shows formatted UTM link + copy button
- History of generated UTMs

### 12. Reporte Diario Setter (`/form/reporte-setter`)

Quick form for daily setter report:
- Fecha (defaults today)
- Conversaciones iniciadas (number)
- Respuestas a historias (number)
- Calendarios enviados (number)
- Submit

### 13. Admin — Usuarios (`/admin/usuarios`)

- List of users with name, role, PIN
- Add user form
- Edit/deactivate user

## Sidebar Navigation by Role

### Admin
```
PRINCIPAL
  📊 Dashboard
  📅 Hoy
  📞 CRM Llamadas

GESTIÓN
  👥 Alumnos
  💳 Cuotas & Cobros
  💰 Finanzas

EQUIPO
  🏆 Leaderboard
  🎯 Objetivos

CONFIG
  ⚙️ Admin
```

### Closer
```
MI PANEL
  📊 Mi Dashboard
  📞 Mis Llamadas

CARGAR
  📝 Cargar Llamada
  💰 Cargar Pago

EQUIPO
  🏆 Leaderboard
```

### Setter
```
MI PANEL
  📊 Mi Dashboard
  💰 Mis Comisiones

HERRAMIENTAS
  🔗 UTM Builder
  📝 Reporte Diario

EQUIPO
  🏆 Leaderboard
```

### Closer + Setter (Valentino)
```
MI PANEL
  📊 Mi Dashboard
  📞 Mis Llamadas
  💰 Mis Comisiones

CARGAR
  📝 Cargar Llamada
  💰 Cargar Pago
  📝 Reporte Diario

HERRAMIENTAS
  🔗 UTM Builder

EQUIPO
  🏆 Leaderboard
```

## Visual Design

- **Theme:** Dark mode (ROMS brand — #0d0d0f background, #18181b cards)
- **Accent:** Purple (#8b5cf6) for primary actions, highlights
- **Success:** Green (#22c55e) for money, closed deals
- **Warning:** Yellow (#eab308) for pending, upcoming
- **Danger:** Red (#ef4444) for overdue, losses
- **Font:** Inter / Geist Sans
- **Cards:** Rounded (12px), subtle border (#27272a)
- **Tables:** Alternating row colors, frozen headers
- **Forms:** Dark inputs with purple focus border, clear labels

## n8n Workflow (Calendly → Sheets)

**Trigger:** Calendly webhook (invitee.created)

**Steps:**
1. Receive webhook with lead data
2. Extract: name, email, phone, event type, scheduled time, UTM params, pre-call answers
3. Format row matching CRM Llamadas columns
4. Append row to Google Sheets via Sheets API
5. Set Estado = "⏳ Pendiente", Closer = assigned based on round-robin or manual

**Pending:** Calendly API token from the team.

## Out of Scope (v2)

- Mobile app (responsive web is enough)
- Real-time notifications (push)
- Chat/messaging integration
- Automated email reminders for cuotas
- Multi-tenant (this is ROMS-only)
