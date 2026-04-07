# Lauti CRM Phase 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Next.js project with Supabase, create all database tables/views/RLS, auth system, TypeScript types, and shared UI components.

**Architecture:** Next.js 16 app router with server/client component split. Supabase as backend (PostgreSQL + Auth + Realtime + Storage). PIN-based auth with JWT sessions stored in cookies. RLS policies enforce role-based access at DB level.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase JS v2, Recharts, Zod, date-fns, next-pwa

**Spec:** `docs/superpowers/specs/2026-04-06-lauti-crm-design.md`
**ROMS reference:** `C:\Users\matyc\projects\roms-crm\webapp\` (copy patterns, not code)

---

## File Structure

```
C:\Users\matyc\projects\lauti-crm\
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── .env.local                    # Supabase keys
├── .gitignore
├── supabase/
│   └── migrations/
│       ├── 001_enums.sql         # All enum types
│       ├── 002_tables.sql        # All tables
│       ├── 003_functions.sql     # get_month_7_7, health score
│       ├── 004_views.sql         # All materialized/regular views
│       ├── 005_rls.sql           # Row Level Security policies
│       └── 006_seed.sql          # Team members, payment methods
├── lib/
│   ├── supabase-server.ts        # Server-side Supabase client
│   ├── supabase-browser.ts       # Client-side Supabase client
│   ├── types.ts                  # All TypeScript types/enums
│   ├── constants.ts              # Programs, teams, commission rates
│   ├── auth.ts                   # Session management (PIN + JWT)
│   ├── schemas.ts                # Zod validation schemas
│   ├── date-utils.ts             # 7-7 month helpers
│   └── format.ts                 # Currency, percentage formatters
├── app/
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Theme + Tailwind
│   ├── login/
│   │   └── page.tsx              # Login page
│   ├── api/
│   │   └── auth/
│   │       ├── login/route.ts    # POST login
│   │       └── logout/route.ts   # POST logout
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   └── page.tsx              # Redirect based on role
│   └── components/
│       ├── Sidebar.tsx           # Role-based navigation
│       ├── KPICard.tsx           # KPI display card
│       ├── StatusBadge.tsx       # Colored status badges
│       ├── Semaforo.tsx          # Traffic light indicator
│       ├── DataTable.tsx         # Reusable table with search/filter/pagination
│       ├── MonthSelector77.tsx   # Month picker for 7-7 periods
│       ├── SaleBanner.tsx        # Real-time sale notification
│       └── EmptyState.tsx        # Empty state placeholder
└── middleware.ts                  # Auth redirect middleware
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `.env.local`, `.gitignore`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /c/Users/matyc/projects
npx create-next-app@latest lauti-crm --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```

- [ ] **Step 2: Install dependencies**

```bash
cd /c/Users/matyc/projects/lauti-crm
npm install @supabase/supabase-js @supabase/ssr jose zod date-fns recharts
npm install -D @types/node
```

- [ ] **Step 3: Create `.env.local`**

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
JWT_SECRET=lauti-crm-secret-change-me-in-production
AIRTABLE_TOKEN=AIRTABLE_TOKEN_REDACTED
AIRTABLE_BASE_ID=appRlYaISIRx0QEVe
```

- [ ] **Step 4: Update `.gitignore`**

Append to existing `.gitignore`:

```
.env.local
.env*.local
```

- [ ] **Step 5: Create `next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
```

- [ ] **Step 6: Verify project builds**

```bash
cd /c/Users/matyc/projects/lauti-crm
npm run build
```

Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git init
git add -A
git commit -m "feat: scaffold Next.js 16 project with Supabase deps"
```

---

### Task 2: Supabase Enums and Tables

**Files:**
- Create: `supabase/migrations/001_enums.sql`, `supabase/migrations/002_tables.sql`

- [ ] **Step 1: Create enum types**

Create `supabase/migrations/001_enums.sql`:

```sql
-- Enums for Lauti CRM

CREATE TYPE lead_fuente AS ENUM (
  'historias', 'lead_magnet', 'youtube', 'instagram', 'dm_directo',
  'historia_cta', 'historia_hr', 'comentario_manychat', 'encuesta',
  'why_now', 'win', 'fup', 'whatsapp', 'otro'
);

CREATE TYPE lead_estado AS ENUM (
  'pendiente', 'no_show', 'cancelada', 'reprogramada', 'seguimiento',
  'no_calificado', 'no_cierre', 'reserva', 'cerrado',
  'adentro_seguimiento', 'broke_cancelado'
);

CREATE TYPE lead_calificacion AS ENUM ('calificado', 'no_calificado', 'podria');

CREATE TYPE lead_score AS ENUM ('A', 'B', 'C', 'D');

CREATE TYPE programa AS ENUM (
  'mentoria_1k_pyf', 'mentoria_2_5k_pyf', 'mentoria_2_8k_pyf',
  'mentoria_5k', 'skool', 'vip_5k', 'mentoria_2_5k_cuotas',
  'mentoria_5k_cuotas', 'mentoria_1k_cuotas', 'mentoria_fee',
  'cuota_vip_mantencion'
);

CREATE TYPE concepto_pago AS ENUM ('pif', 'fee', 'primera_cuota', 'segunda_cuota');

CREATE TYPE plan_pago AS ENUM ('paid_in_full', '2_cuotas', '3_cuotas', 'personalizado');

CREATE TYPE payment_estado AS ENUM ('pendiente', 'pagado', 'perdido');

CREATE TYPE metodo_pago AS ENUM (
  'binance', 'transferencia', 'caja_ahorro_usd', 'link_mp',
  'cash', 'uruguayos', 'link_stripe'
);

CREATE TYPE moneda AS ENUM ('ars', 'usd');

CREATE TYPE client_estado AS ENUM (
  'activo', 'pausado', 'inactivo', 'solo_skool', 'no_termino_pagar'
);

CREATE TYPE semana_estado AS ENUM (
  'primeras_publicaciones', 'primera_venta', 'escalando_anuncios'
);

CREATE TYPE seguimiento_estado AS ENUM (
  'para_seguimiento', 'no_necesita', 'seguimiento_urgente'
);

CREATE TYPE contacto_estado AS ENUM (
  'por_contactar', 'contactado', 'respondio_renueva', 'respondio_debe_cuota',
  'es_socio', 'no_renueva', 'no_responde', 'numero_invalido',
  'retirar_acceso', 'verificar'
);

CREATE TYPE tipo_renovacion AS ENUM (
  'resell', 'upsell_vip', 'upsell_meli',
  'upsell_vip_cuotas', 'upsell_meli_cuotas', 'resell_cuotas'
);

CREATE TYPE renovacion_estado AS ENUM ('pago', 'no_renueva', 'cuota_1_pagada', 'cuota_2_pagada');

CREATE TYPE origen_cliente AS ENUM (
  'skool_ig', 'solo_skool', 'registro_normal', 'grupo_wa_esa', 'grupo_ig_ecom'
);

CREATE TYPE canal_contacto AS ENUM ('whatsapp', 'instagram_dm', 'email_skool', 'buscar');

CREATE TYPE prioridad_contacto AS ENUM (
  'a_wa_sin_nombre', 'b_ig_solo_username', 'c_solo_skool', 'd_nombre_parcial'
);

CREATE TYPE categoria_cliente AS ENUM (
  'activo_ok', 'cuotas_pendientes', 'deudor', 'solo_skool_verificar',
  'solo_wa_verificar', 'solo_ig_verificar', 'con_pagos_sin_skool',
  'por_verificar', 'equipo_lauty'
);

CREATE TYPE session_tipo AS ENUM (
  'estrategia_inicial', 'revision_ajuste', 'cierre_ciclo', 'adicional'
);

CREATE TYPE session_estado AS ENUM ('programada', 'done', 'cancelada_no_asistio');

CREATE TYPE etapa_ecommerce AS ENUM (
  'cero', 'experiencia_sin_resultados', 'experiencia_escalar'
);

CREATE TYPE agent_task_tipo AS ENUM (
  'cobrar_cuota', 'renovacion', 'seguimiento', 'oportunidad_upsell',
  'bienvenida', 'seguimiento_urgente', 'confirmar_pago'
);

CREATE TYPE agent_task_estado AS ENUM ('pending', 'in_progress', 'done', 'failed');

CREATE TYPE agent_asignacion AS ENUM ('agent', 'human');

CREATE TYPE canal_agente AS ENUM ('whatsapp', 'email', 'dm_instagram');

CREATE TYPE followup_tipo AS ENUM ('llamada', 'whatsapp', 'dm', 'email', 'presencial');
```

- [ ] **Step 2: Create all tables**

Create `supabase/migrations/002_tables.sql`:

```sql
-- ========================================
-- TEAM MEMBERS
-- ========================================
CREATE TABLE team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  nombre text NOT NULL,
  etiqueta text,
  rol text,
  email text,
  telefono text,
  fecha_nacimiento date,
  foto_url text,
  observaciones text,
  is_admin boolean DEFAULT false,
  is_closer boolean DEFAULT false,
  is_setter boolean DEFAULT false,
  is_cobranzas boolean DEFAULT false,
  is_seguimiento boolean DEFAULT false,
  comision_pct decimal DEFAULT 0,
  can_see_agent boolean DEFAULT false,
  pin text,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ========================================
-- PAYMENT METHODS
-- ========================================
CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  titular text,
  tipo_moneda moneda DEFAULT 'usd',
  cbu text,
  alias_cbu text,
  banco text,
  id_cuenta text,
  observaciones text
);

-- ========================================
-- LEADS
-- ========================================
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_id text,
  nombre text NOT NULL,
  email text,
  telefono text,
  instagram text,
  instagram_sin_arroba text GENERATED ALWAYS AS (
    CASE WHEN left(instagram, 1) = '@' THEN substring(instagram from 2)
    ELSE instagram END
  ) STORED,
  fuente lead_fuente,
  utm_source text,
  utm_medium text,
  utm_content text,
  evento_calendly text,
  calendly_event_id text,
  fecha_agendado timestamptz,
  fecha_llamada timestamptz,
  estado lead_estado DEFAULT 'pendiente',
  setter_id uuid REFERENCES team_members(id),
  closer_id uuid REFERENCES team_members(id),
  cobrador_id uuid REFERENCES team_members(id),
  contexto_setter text,
  reporte_general text,
  notas_internas text,
  experiencia_ecommerce text,
  seguridad_inversion text,
  tipo_productos text,
  compromiso_asistencia text,
  dispuesto_invertir text,
  decisor text,
  lead_calificado lead_calificacion,
  lead_score lead_score,
  link_llamada text,
  programa_pitcheado programa,
  concepto concepto_pago,
  plan_pago plan_pago,
  ticket_total decimal DEFAULT 0,
  fue_seguimiento boolean DEFAULT false,
  de_donde_viene_lead text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_leads_estado ON leads(estado);
CREATE INDEX idx_leads_closer ON leads(closer_id);
CREATE INDEX idx_leads_setter ON leads(setter_id);
CREATE INDEX idx_leads_fecha_llamada ON leads(fecha_llamada);

-- ========================================
-- CLIENTS
-- ========================================
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_id text,
  lead_id uuid REFERENCES leads(id),
  nombre text NOT NULL,
  email text,
  telefono text,
  programa programa,
  estado client_estado DEFAULT 'activo',
  fecha_onboarding date,
  fecha_offboarding date,
  total_dias_programa int DEFAULT 90,
  llamadas_base int DEFAULT 3,
  pesadilla boolean DEFAULT false,
  exito boolean DEFAULT false,
  discord boolean DEFAULT false,
  skool boolean DEFAULT false,
  win_discord boolean DEFAULT false,
  semana_1_estado semana_estado,
  semana_1_accionables text,
  semana_2_estado semana_estado,
  semana_2_accionables text,
  semana_3_estado semana_estado,
  semana_3_accionables text,
  semana_4_estado semana_estado,
  semana_4_accionables text,
  facturacion_mes_1 text,
  facturacion_mes_2 text,
  facturacion_mes_3 text,
  facturacion_mes_4 text,
  estado_seguimiento seguimiento_estado DEFAULT 'para_seguimiento',
  fecha_ultimo_seguimiento date,
  fecha_proximo_seguimiento date,
  notas_seguimiento text,
  notas_conversacion text,
  estado_contacto contacto_estado DEFAULT 'por_contactar',
  responsable_renovacion uuid REFERENCES team_members(id),
  origen origen_cliente,
  canal_contacto canal_contacto,
  prioridad_contacto prioridad_contacto,
  categoria categoria_cliente,
  email_skool text,
  en_wa_esa boolean DEFAULT false,
  en_ig_grupo boolean DEFAULT false,
  deudor_usd decimal DEFAULT 0,
  deudor_vencimiento date,
  health_score int DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_clients_estado ON clients(estado);
CREATE INDEX idx_clients_programa ON clients(programa);
CREATE INDEX idx_clients_health ON clients(health_score);

-- ========================================
-- RENEWAL HISTORY
-- ========================================
CREATE TABLE renewal_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id),
  tipo_renovacion tipo_renovacion,
  programa_anterior programa,
  programa_nuevo programa,
  monto_total decimal DEFAULT 0,
  plan_pago plan_pago,
  estado renovacion_estado,
  fecha_renovacion date,
  comprobante_url text,
  responsable_id uuid REFERENCES team_members(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_renewals_client ON renewal_history(client_id);

-- ========================================
-- PAYMENTS
-- ========================================
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id),
  client_id uuid REFERENCES clients(id),
  renewal_id uuid REFERENCES renewal_history(id),
  numero_cuota int DEFAULT 1,
  monto_usd decimal DEFAULT 0,
  monto_ars decimal DEFAULT 0,
  fecha_pago date,
  fecha_vencimiento date,
  estado payment_estado DEFAULT 'pendiente',
  metodo_pago metodo_pago,
  receptor text,
  comprobante_url text,
  cobrador_id uuid REFERENCES team_members(id),
  verificado boolean DEFAULT false,
  es_renovacion boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_payments_lead ON payments(lead_id);
CREATE INDEX idx_payments_client ON payments(client_id);
CREATE INDEX idx_payments_estado ON payments(estado);
CREATE INDEX idx_payments_fecha ON payments(fecha_pago);
CREATE INDEX idx_payments_receptor ON payments(receptor);

-- ========================================
-- TRACKER SESSIONS (1a1)
-- ========================================
CREATE TABLE tracker_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id),
  fecha date,
  numero_sesion int DEFAULT 1,
  tipo_sesion session_tipo DEFAULT 'estrategia_inicial',
  estado session_estado DEFAULT 'programada',
  enlace_llamada text,
  assignee_id uuid REFERENCES team_members(id),
  notas_setup text,
  pitch_upsell boolean DEFAULT false,
  rating int CHECK (rating >= 1 AND rating <= 10),
  aprendizaje_principal text,
  feedback_cliente text,
  herramienta_mas_util text,
  action_items jsonb DEFAULT '[]'::jsonb,
  follow_up_date date,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sessions_client ON tracker_sessions(client_id);
CREATE INDEX idx_sessions_estado ON tracker_sessions(estado);

-- ========================================
-- DAILY REPORTS
-- ========================================
CREATE TABLE daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setter_id uuid NOT NULL REFERENCES team_members(id),
  fecha date NOT NULL,
  conversaciones_iniciadas int DEFAULT 0,
  respuestas_historias int DEFAULT 0,
  calendarios_enviados int DEFAULT 0,
  ventas_por_chat text,
  conversaciones_lead_inicio text,
  agendas_confirmadas text,
  origen_principal text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ========================================
-- IG METRICS
-- ========================================
CREATE TABLE ig_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo text,
  fecha_inicio date,
  fecha_fin date,
  cuentas_alcanzadas int DEFAULT 0,
  delta_alcance_pct decimal DEFAULT 0,
  impresiones int DEFAULT 0,
  delta_impresiones_pct decimal DEFAULT 0,
  visitas_perfil int DEFAULT 0,
  delta_visitas_pct decimal DEFAULT 0,
  toques_enlaces int DEFAULT 0,
  delta_enlaces_pct decimal DEFAULT 0,
  pct_alcance_no_seguidores decimal DEFAULT 0,
  nuevos_seguidores int DEFAULT 0,
  delta_seguidores_pct decimal DEFAULT 0,
  unfollows int DEFAULT 0,
  total_seguidores int DEFAULT 0,
  total_interacciones int DEFAULT 0,
  delta_interacciones_pct decimal DEFAULT 0,
  cuentas_interaccion int DEFAULT 0,
  pct_interaccion_no_seguidores decimal DEFAULT 0,
  reels_publicados int DEFAULT 0,
  interacciones_reels int DEFAULT 0,
  delta_reels_pct decimal DEFAULT 0,
  likes_reels int DEFAULT 0,
  comentarios_reels int DEFAULT 0,
  compartidos_reels int DEFAULT 0,
  guardados_reels int DEFAULT 0,
  posts_publicados int DEFAULT 0,
  interacciones_posts int DEFAULT 0,
  delta_posts_pct decimal DEFAULT 0,
  likes_posts int DEFAULT 0,
  comentarios_posts int DEFAULT 0,
  compartidos_posts int DEFAULT 0,
  guardados_posts int DEFAULT 0,
  stories_publicadas int DEFAULT 0,
  interacciones_stories int DEFAULT 0,
  delta_stories_pct decimal DEFAULT 0,
  respuestas_stories int DEFAULT 0,
  conversaciones_dm int DEFAULT 0,
  pct_hombres decimal DEFAULT 0,
  pct_mujeres decimal DEFAULT 0,
  top_paises text,
  top_ciudades text,
  top_edades text,
  leads_ig int DEFAULT 0,
  ventas_ig int DEFAULT 0,
  cash_ig decimal DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ========================================
-- ONBOARDING
-- ========================================
CREATE TABLE onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id),
  lead_id uuid REFERENCES leads(id),
  fecha_ingreso date,
  edad int,
  email text,
  telefono text,
  discord_user text,
  skool_user text,
  redes_sociales text,
  red_social_origen text[] DEFAULT '{}',
  porque_compro text,
  victoria_rapida text,
  resultado_esperado text,
  compromiso_pagos boolean DEFAULT false,
  confirmo_terminos boolean DEFAULT false,
  etapa_ecommerce etapa_ecommerce,
  topico_compra text,
  created_at timestamptz DEFAULT now()
);

-- ========================================
-- AGENT TASKS
-- ========================================
CREATE TABLE agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo agent_task_tipo NOT NULL,
  client_id uuid REFERENCES clients(id),
  lead_id uuid REFERENCES leads(id),
  payment_id uuid REFERENCES payments(id),
  prioridad int DEFAULT 3 CHECK (prioridad >= 1 AND prioridad <= 5),
  estado agent_task_estado DEFAULT 'pending',
  asignado_a agent_asignacion DEFAULT 'human',
  human_assignee_id uuid REFERENCES team_members(id),
  canal canal_agente DEFAULT 'whatsapp',
  contexto jsonb DEFAULT '{}'::jsonb,
  scheduled_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  resultado text,
  notas text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agent_tasks_estado ON agent_tasks(estado);
CREATE INDEX idx_agent_tasks_tipo ON agent_tasks(tipo);
CREATE INDEX idx_agent_tasks_prioridad ON agent_tasks(prioridad);

-- ========================================
-- AGENT LOG
-- ========================================
CREATE TABLE agent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES agent_tasks(id),
  accion text NOT NULL,
  mensaje_enviado text,
  respuesta_recibida text,
  resultado text,
  created_at timestamptz DEFAULT now()
);

-- ========================================
-- CLIENT FOLLOW-UPS
-- ========================================
CREATE TABLE client_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id),
  author_id uuid NOT NULL REFERENCES team_members(id),
  fecha date DEFAULT CURRENT_DATE,
  tipo followup_tipo DEFAULT 'whatsapp',
  notas text,
  proxima_accion text,
  proxima_fecha date,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_followups_client ON client_follow_ups(client_id);

-- ========================================
-- UTM CAMPAIGNS
-- ========================================
CREATE TABLE utm_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text,
  source text,
  medium text,
  content text,
  setter_id uuid REFERENCES team_members(id),
  created_at timestamptz DEFAULT now()
);

-- ========================================
-- AUTO-UPDATE updated_at
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 3: Verify SQL syntax locally**

```bash
cd /c/Users/matyc/projects/lauti-crm
cat supabase/migrations/001_enums.sql supabase/migrations/002_tables.sql | head -5
```

Expected: Files exist and contain valid SQL.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add supabase/
git commit -m "feat: add Supabase schema — enums and all tables"
```

---

### Task 3: SQL Functions and Views

**Files:**
- Create: `supabase/migrations/003_functions.sql`, `supabase/migrations/004_views.sql`

- [ ] **Step 1: Create 7-7 month function and health score**

Create `supabase/migrations/003_functions.sql`:

```sql
-- ========================================
-- FISCAL MONTH 7-7 HELPER
-- ========================================
-- Returns the fiscal month label for a given date.
-- Fiscal month runs from the 7th to the 6th of next month.
-- Example: 2026-04-07 to 2026-05-06 = 'Abril 2026'
CREATE OR REPLACE FUNCTION get_month_7_7(d date)
RETURNS text AS $$
DECLARE
  adjusted date;
  month_names text[] := ARRAY[
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ];
BEGIN
  -- If day < 7, the fiscal month is the previous calendar month
  IF EXTRACT(DAY FROM d) < 7 THEN
    adjusted := d - interval '1 month';
  ELSE
    adjusted := d;
  END IF;
  RETURN month_names[EXTRACT(MONTH FROM adjusted)::int] || ' ' || EXTRACT(YEAR FROM adjusted)::text;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Returns start date of the current fiscal month
CREATE OR REPLACE FUNCTION current_fiscal_start()
RETURNS date AS $$
BEGIN
  IF EXTRACT(DAY FROM CURRENT_DATE) >= 7 THEN
    RETURN make_date(
      EXTRACT(YEAR FROM CURRENT_DATE)::int,
      EXTRACT(MONTH FROM CURRENT_DATE)::int,
      7
    );
  ELSE
    RETURN make_date(
      EXTRACT(YEAR FROM (CURRENT_DATE - interval '1 month'))::int,
      EXTRACT(MONTH FROM (CURRENT_DATE - interval '1 month'))::int,
      7
    );
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Returns end date of the current fiscal month
CREATE OR REPLACE FUNCTION current_fiscal_end()
RETURNS date AS $$
BEGIN
  RETURN current_fiscal_start() + interval '1 month' - interval '1 day';
END;
$$ LANGUAGE plpgsql STABLE;

-- Returns start of PREVIOUS fiscal month
CREATE OR REPLACE FUNCTION prev_fiscal_start()
RETURNS date AS $$
BEGIN
  RETURN current_fiscal_start() - interval '1 month';
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if a date falls in the current fiscal month
CREATE OR REPLACE FUNCTION is_current_fiscal(d date)
RETURNS boolean AS $$
BEGIN
  RETURN d >= current_fiscal_start() AND d <= current_fiscal_end();
END;
$$ LANGUAGE plpgsql STABLE;

-- ========================================
-- HEALTH SCORE CALCULATION
-- ========================================
CREATE OR REPLACE FUNCTION calculate_health_score(client_uuid uuid)
RETURNS int AS $$
DECLARE
  score decimal := 0;
  payment_score decimal := 0;
  session_score decimal := 0;
  progress_score decimal := 0;
  activity_score decimal := 0;
  billing_score decimal := 0;
  c clients%ROWTYPE;
  total_payments int;
  paid_on_time int;
  total_sessions int;
  done_sessions int;
  avg_rating decimal;
  weeks_filled int;
  days_since_followup int;
BEGIN
  SELECT * INTO c FROM clients WHERE id = client_uuid;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- PAYMENT SCORE (30%) — ratio of on-time payments
  SELECT
    count(*),
    count(*) FILTER (WHERE estado = 'pagado')
  INTO total_payments, paid_on_time
  FROM payments WHERE client_id = client_uuid OR lead_id = c.lead_id;

  IF total_payments > 0 THEN
    payment_score := (paid_on_time::decimal / total_payments) * 30;
  ELSE
    payment_score := 15; -- No payments yet, neutral
  END IF;

  -- SESSION SCORE (20%) — avg rating + completion ratio
  SELECT
    count(*),
    count(*) FILTER (WHERE estado = 'done'),
    coalesce(avg(rating) FILTER (WHERE rating IS NOT NULL), 0)
  INTO total_sessions, done_sessions, avg_rating
  FROM tracker_sessions WHERE client_id = client_uuid;

  IF c.llamadas_base > 0 THEN
    session_score := (least(done_sessions::decimal / c.llamadas_base, 1.0) * 10)
                   + (least(avg_rating / 10.0, 1.0) * 10);
  ELSE
    session_score := 10;
  END IF;

  -- PROGRESS SCORE (20%) — weeks with status filled
  weeks_filled := 0;
  IF c.semana_1_estado IS NOT NULL THEN weeks_filled := weeks_filled + 1; END IF;
  IF c.semana_2_estado IS NOT NULL THEN weeks_filled := weeks_filled + 1; END IF;
  IF c.semana_3_estado IS NOT NULL THEN weeks_filled := weeks_filled + 1; END IF;
  IF c.semana_4_estado IS NOT NULL THEN weeks_filled := weeks_filled + 1; END IF;
  progress_score := (weeks_filled::decimal / 4) * 20;

  -- ACTIVITY SCORE (15%) — days since last follow-up
  IF c.fecha_ultimo_seguimiento IS NOT NULL THEN
    days_since_followup := CURRENT_DATE - c.fecha_ultimo_seguimiento;
    IF days_since_followup <= 7 THEN activity_score := 15;
    ELSIF days_since_followup <= 14 THEN activity_score := 10;
    ELSIF days_since_followup <= 30 THEN activity_score := 5;
    ELSE activity_score := 0;
    END IF;
  ELSE
    activity_score := 5;
  END IF;

  -- BILLING SCORE (15%) — has reported billing
  billing_score := 0;
  IF c.facturacion_mes_1 IS NOT NULL AND c.facturacion_mes_1 != '' THEN billing_score := billing_score + 3.75; END IF;
  IF c.facturacion_mes_2 IS NOT NULL AND c.facturacion_mes_2 != '' THEN billing_score := billing_score + 3.75; END IF;
  IF c.facturacion_mes_3 IS NOT NULL AND c.facturacion_mes_3 != '' THEN billing_score := billing_score + 3.75; END IF;
  IF c.facturacion_mes_4 IS NOT NULL AND c.facturacion_mes_4 != '' THEN billing_score := billing_score + 3.75; END IF;

  score := payment_score + session_score + progress_score + activity_score + billing_score;
  RETURN least(greatest(round(score)::int, 0), 100);
END;
$$ LANGUAGE plpgsql STABLE;
```

- [ ] **Step 2: Create SQL views**

Create `supabase/migrations/004_views.sql`:

```sql
-- ========================================
-- V_MONTHLY_CASH: Cash collected del 7-7
-- ========================================
CREATE OR REPLACE VIEW v_monthly_cash AS
SELECT
  get_month_7_7(p.fecha_pago) AS mes_fiscal,
  sum(p.monto_usd) FILTER (WHERE NOT p.es_renovacion) AS cash_ventas_nuevas,
  sum(p.monto_usd) FILTER (WHERE p.es_renovacion) AS cash_renovaciones,
  sum(p.monto_usd) FILTER (WHERE p.numero_cuota > 1 AND NOT p.es_renovacion) AS cash_cuotas,
  sum(p.monto_usd) AS cash_total,
  count(DISTINCT p.lead_id) FILTER (WHERE NOT p.es_renovacion AND p.numero_cuota = 1) AS ventas_nuevas_count,
  count(*) FILTER (WHERE p.es_renovacion AND p.numero_cuota = 1) AS renovaciones_count
FROM payments p
WHERE p.estado = 'pagado' AND p.fecha_pago IS NOT NULL
GROUP BY get_month_7_7(p.fecha_pago);

-- ========================================
-- V_COMMISSIONS: Comisiones por persona del 7-7
-- ========================================
CREATE OR REPLACE VIEW v_commissions AS
SELECT
  tm.id AS team_member_id,
  tm.nombre,
  get_month_7_7(p.fecha_pago) AS mes_fiscal,
  -- Closer commission (10% of cash where they are closer on the lead)
  sum(p.monto_usd) FILTER (WHERE l.closer_id = tm.id) * 0.10 AS comision_closer,
  -- Setter commission (5% of cash where they are setter on the lead)
  sum(p.monto_usd) FILTER (WHERE l.setter_id = tm.id) * 0.05 AS comision_setter,
  -- Cobranzas commission (10% of cuotas/renewals they collected)
  sum(p.monto_usd) FILTER (WHERE p.cobrador_id = tm.id AND (p.numero_cuota > 1 OR p.es_renovacion)) * 0.10 AS comision_cobranzas,
  -- Total
  coalesce(sum(p.monto_usd) FILTER (WHERE l.closer_id = tm.id) * 0.10, 0)
  + coalesce(sum(p.monto_usd) FILTER (WHERE l.setter_id = tm.id) * 0.05, 0)
  + coalesce(sum(p.monto_usd) FILTER (WHERE p.cobrador_id = tm.id AND (p.numero_cuota > 1 OR p.es_renovacion)) * 0.10, 0) AS comision_total
FROM team_members tm
CROSS JOIN payments p
LEFT JOIN leads l ON p.lead_id = l.id
WHERE p.estado = 'pagado' AND p.fecha_pago IS NOT NULL AND tm.activo = true
GROUP BY tm.id, tm.nombre, get_month_7_7(p.fecha_pago);

-- ========================================
-- V_TREASURY: Flujo por receptor
-- ========================================
CREATE OR REPLACE VIEW v_treasury AS
SELECT
  p.receptor,
  get_month_7_7(p.fecha_pago) AS mes_fiscal,
  p.metodo_pago,
  sum(p.monto_usd) AS total_usd,
  sum(p.monto_ars) AS total_ars,
  count(*) AS num_pagos,
  sum(p.monto_usd) FILTER (WHERE NOT p.es_renovacion AND p.numero_cuota = 1) AS usd_ventas_nuevas,
  sum(p.monto_usd) FILTER (WHERE NOT p.es_renovacion AND p.numero_cuota > 1) AS usd_cuotas,
  sum(p.monto_usd) FILTER (WHERE p.es_renovacion) AS usd_renovaciones
FROM payments p
WHERE p.estado = 'pagado' AND p.fecha_pago IS NOT NULL
GROUP BY p.receptor, get_month_7_7(p.fecha_pago), p.metodo_pago;

-- ========================================
-- V_PIPELINE: Estado del pipeline
-- ========================================
CREATE OR REPLACE VIEW v_pipeline AS
SELECT
  get_month_7_7(l.fecha_llamada::date) AS mes_fiscal,
  count(*) AS total_leads,
  count(*) FILTER (WHERE l.estado NOT IN ('pendiente', 'cancelada')) AS presentadas,
  count(*) FILTER (WHERE l.lead_calificado = 'calificado') AS calificadas,
  count(*) FILTER (WHERE l.estado = 'cerrado') AS cerradas,
  CASE WHEN count(*) > 0 THEN
    round(count(*) FILTER (WHERE l.estado NOT IN ('pendiente', 'cancelada', 'no_show'))::decimal / count(*) * 100, 1)
  ELSE 0 END AS show_up_rate,
  CASE WHEN count(*) FILTER (WHERE l.estado NOT IN ('pendiente', 'cancelada', 'no_show')) > 0 THEN
    round(count(*) FILTER (WHERE l.estado = 'cerrado')::decimal / count(*) FILTER (WHERE l.estado NOT IN ('pendiente', 'cancelada', 'no_show')) * 100, 1)
  ELSE 0 END AS cierre_rate,
  CASE WHEN count(*) FILTER (WHERE l.estado = 'cerrado') > 0 THEN
    round(avg(l.ticket_total) FILTER (WHERE l.estado = 'cerrado'), 0)
  ELSE 0 END AS aov
FROM leads l
WHERE l.fecha_llamada IS NOT NULL
GROUP BY get_month_7_7(l.fecha_llamada::date);

-- ========================================
-- V_RENEWAL_QUEUE: Cola de renovaciones
-- ========================================
CREATE OR REPLACE VIEW v_renewal_queue AS
SELECT
  c.id,
  c.nombre,
  c.programa,
  c.fecha_onboarding,
  c.total_dias_programa,
  c.fecha_onboarding + c.total_dias_programa AS fecha_vencimiento,
  (c.fecha_onboarding + c.total_dias_programa) - CURRENT_DATE AS dias_restantes,
  c.estado_contacto,
  c.health_score,
  CASE
    WHEN (c.fecha_onboarding + c.total_dias_programa) - CURRENT_DATE < 0 THEN 'vencido'
    WHEN (c.fecha_onboarding + c.total_dias_programa) - CURRENT_DATE <= 7 THEN 'urgente'
    WHEN (c.fecha_onboarding + c.total_dias_programa) - CURRENT_DATE <= 15 THEN 'proximo'
    ELSE 'ok'
  END AS semaforo
FROM clients c
WHERE c.estado = 'activo' AND c.fecha_onboarding IS NOT NULL
ORDER BY dias_restantes ASC;

-- ========================================
-- V_SESSION_AVAILABILITY: Sesiones 1a1
-- ========================================
CREATE OR REPLACE VIEW v_session_availability AS
SELECT
  c.id AS client_id,
  c.nombre,
  c.programa,
  c.llamadas_base,
  count(ts.id) FILTER (WHERE ts.estado = 'done') AS sesiones_consumidas,
  c.llamadas_base - count(ts.id) FILTER (WHERE ts.estado = 'done') AS sesiones_disponibles,
  CASE
    WHEN c.llamadas_base - count(ts.id) FILTER (WHERE ts.estado = 'done') <= 0 THEN 'agotadas'
    WHEN c.llamadas_base - count(ts.id) FILTER (WHERE ts.estado = 'done') = 1 THEN 'ultima'
    ELSE 'disponible'
  END AS semaforo,
  round(avg(ts.rating) FILTER (WHERE ts.rating IS NOT NULL), 1) AS rating_promedio
FROM clients c
LEFT JOIN tracker_sessions ts ON ts.client_id = c.id
WHERE c.estado = 'activo'
GROUP BY c.id, c.nombre, c.programa, c.llamadas_base;

-- ========================================
-- V_CLOSER_KPIS
-- ========================================
CREATE OR REPLACE VIEW v_closer_kpis AS
SELECT
  tm.id AS team_member_id,
  tm.nombre,
  get_month_7_7(l.fecha_llamada::date) AS mes_fiscal,
  count(*) AS total_agendas,
  count(*) FILTER (WHERE l.estado NOT IN ('pendiente', 'cancelada', 'no_show')) AS presentadas,
  count(*) FILTER (WHERE l.lead_calificado = 'calificado') AS calificadas,
  count(*) FILTER (WHERE l.estado = 'cerrado') AS cerradas,
  CASE WHEN count(*) > 0 THEN
    round(count(*) FILTER (WHERE l.estado NOT IN ('pendiente', 'cancelada', 'no_show'))::decimal / count(*) * 100, 1)
  ELSE 0 END AS show_up_pct,
  CASE WHEN count(*) FILTER (WHERE l.estado NOT IN ('pendiente', 'cancelada', 'no_show')) > 0 THEN
    round(count(*) FILTER (WHERE l.estado = 'cerrado')::decimal / count(*) FILTER (WHERE l.estado NOT IN ('pendiente', 'cancelada', 'no_show')) * 100, 1)
  ELSE 0 END AS cierre_pct,
  coalesce(round(avg(l.ticket_total) FILTER (WHERE l.estado = 'cerrado'), 0), 0) AS aov
FROM team_members tm
JOIN leads l ON l.closer_id = tm.id
WHERE tm.is_closer = true AND l.fecha_llamada IS NOT NULL
GROUP BY tm.id, tm.nombre, get_month_7_7(l.fecha_llamada::date);

-- ========================================
-- V_SETTER_KPIS
-- ========================================
CREATE OR REPLACE VIEW v_setter_kpis AS
SELECT
  tm.id AS team_member_id,
  tm.nombre,
  get_month_7_7(l.fecha_agendado::date) AS mes_fiscal,
  count(*) AS total_agendas,
  count(*) FILTER (WHERE l.estado = 'cerrado') AS cerradas
FROM team_members tm
JOIN leads l ON l.setter_id = tm.id
WHERE tm.is_setter = true AND l.fecha_agendado IS NOT NULL
GROUP BY tm.id, tm.nombre, get_month_7_7(l.fecha_agendado::date);
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add supabase/
git commit -m "feat: add SQL functions (7-7, health score) and views"
```

---

### Task 4: RLS Policies and Seed Data

**Files:**
- Create: `supabase/migrations/005_rls.sql`, `supabase/migrations/006_seed.sql`

- [ ] **Step 1: Create RLS policies**

Create `supabase/migrations/005_rls.sql`:

```sql
-- Enable RLS on all tables
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracker_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ig_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE utm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's team_member row
CREATE OR REPLACE FUNCTION get_my_team_member()
RETURNS team_members AS $$
  SELECT * FROM team_members WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ADMIN: full access to everything
CREATE POLICY admin_all_leads ON leads FOR ALL
  USING ((get_my_team_member()).is_admin = true);

CREATE POLICY admin_all_clients ON clients FOR ALL
  USING ((get_my_team_member()).is_admin = true);

CREATE POLICY admin_all_payments ON payments FOR ALL
  USING ((get_my_team_member()).is_admin = true);

CREATE POLICY admin_all_sessions ON tracker_sessions FOR ALL
  USING ((get_my_team_member()).is_admin = true);

CREATE POLICY admin_all_reports ON daily_reports FOR ALL
  USING ((get_my_team_member()).is_admin = true);

CREATE POLICY admin_all_ig ON ig_metrics FOR ALL
  USING ((get_my_team_member()).is_admin = true);

CREATE POLICY admin_all_onboarding ON onboarding FOR ALL
  USING ((get_my_team_member()).is_admin = true);

CREATE POLICY admin_all_followups ON client_follow_ups FOR ALL
  USING ((get_my_team_member()).is_admin = true);

CREATE POLICY admin_all_renewals ON renewal_history FOR ALL
  USING ((get_my_team_member()).is_admin = true);

CREATE POLICY admin_all_utm ON utm_campaigns FOR ALL
  USING ((get_my_team_member()).is_admin = true);

CREATE POLICY admin_all_payment_methods ON payment_methods FOR ALL
  USING ((get_my_team_member()).is_admin = true);

-- AGENT TASKS: admin sees all, but agent visibility controlled by can_see_agent
CREATE POLICY admin_all_tasks ON agent_tasks FOR ALL
  USING ((get_my_team_member()).is_admin = true);

-- Agent log: only visible to users with can_see_agent
CREATE POLICY agent_log_visible ON agent_log FOR SELECT
  USING ((get_my_team_member()).can_see_agent = true OR (get_my_team_member()).is_admin = true);

CREATE POLICY agent_log_insert ON agent_log FOR INSERT
  WITH CHECK (true); -- Service role inserts

-- CLOSER: see own leads
CREATE POLICY closer_own_leads ON leads FOR SELECT
  USING (closer_id = (get_my_team_member()).id);

CREATE POLICY closer_own_payments ON payments FOR SELECT
  USING (lead_id IN (SELECT id FROM leads WHERE closer_id = (get_my_team_member()).id));

-- SETTER: see own leads + insert
CREATE POLICY setter_own_leads ON leads FOR SELECT
  USING (setter_id = (get_my_team_member()).id);

CREATE POLICY setter_insert_reports ON daily_reports FOR INSERT
  WITH CHECK (setter_id = (get_my_team_member()).id);

CREATE POLICY setter_own_reports ON daily_reports FOR SELECT
  USING (setter_id = (get_my_team_member()).id);

-- SEGUIMIENTO: see clients and follow-ups
CREATE POLICY seguimiento_clients ON clients FOR SELECT
  USING ((get_my_team_member()).is_seguimiento = true);

CREATE POLICY seguimiento_followups ON client_follow_ups FOR ALL
  USING ((get_my_team_member()).is_seguimiento = true);

CREATE POLICY seguimiento_sessions ON tracker_sessions FOR SELECT
  USING ((get_my_team_member()).is_seguimiento = true);

-- TEAM MEMBERS: everyone can read
CREATE POLICY team_read ON team_members FOR SELECT
  USING (true);

-- Leaderboard: all closers/setters can read all leads for ranking
CREATE POLICY leaderboard_leads ON leads FOR SELECT
  USING ((get_my_team_member()).is_closer = true OR (get_my_team_member()).is_setter = true);

-- Service role bypass (for n8n and migrations)
-- Note: service_role key bypasses RLS automatically in Supabase
```

- [ ] **Step 2: Create seed data**

Create `supabase/migrations/006_seed.sql`:

```sql
-- Seed team members
INSERT INTO team_members (nombre, etiqueta, rol, is_admin, is_closer, is_setter, is_cobranzas, is_seguimiento, comision_pct, can_see_agent, pin) VALUES
  ('Lauti', 'lauti', 'admin', true, false, false, false, false, 0, false, '1001'),
  ('Mel', 'mel', 'admin', true, false, false, true, false, 0.10, true, '1002'),
  ('Juanma', 'juanma', 'admin', true, false, false, false, false, 0, false, '1003'),
  ('Iván', 'ivan', 'closer', false, true, false, false, false, 0.10, false, '2001'),
  ('Joaquín', 'joaquin', 'setter', false, false, true, false, false, 0.05, false, '3001'),
  ('Jorge', 'jorge', 'setter_closer', false, true, true, false, false, 0.05, false, '3002'),
  ('Pepito', 'pepito', 'seguimiento', false, false, false, false, true, 0, false, '4001');

-- Seed payment methods
INSERT INTO payment_methods (nombre, titular, tipo_moneda) VALUES
  ('JUANMA', 'Juanma Wohl', 'usd'),
  ('Cuenta pesos Lauti', 'Lautaro Cardozo', 'ars'),
  ('Cuenta dolares Lauti', 'Lautaro Cardozo', 'usd'),
  ('Efectivo', NULL, 'usd'),
  ('Binance lauti', 'Lautaro Cardozo', 'usd'),
  ('Stripe', 'Lautaro Cardozo', 'usd'),
  ('Financiera Payments', NULL, 'usd'),
  ('Becheq', NULL, 'ars');
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add supabase/
git commit -m "feat: add RLS policies and seed data for team + payment methods"
```

---

### Task 5: TypeScript Types and Constants

**Files:**
- Create: `lib/types.ts`, `lib/constants.ts`

- [ ] **Step 1: Create all TypeScript types**

Create `lib/types.ts`:

```typescript
// ========================================
// ENUMS (mirror Supabase enums)
// ========================================

export type LeadFuente =
  | "historias" | "lead_magnet" | "youtube" | "instagram" | "dm_directo"
  | "historia_cta" | "historia_hr" | "comentario_manychat" | "encuesta"
  | "why_now" | "win" | "fup" | "whatsapp" | "otro";

export type LeadEstado =
  | "pendiente" | "no_show" | "cancelada" | "reprogramada" | "seguimiento"
  | "no_calificado" | "no_cierre" | "reserva" | "cerrado"
  | "adentro_seguimiento" | "broke_cancelado";

export type LeadCalificacion = "calificado" | "no_calificado" | "podria";
export type LeadScore = "A" | "B" | "C" | "D";

export type Programa =
  | "mentoria_1k_pyf" | "mentoria_2_5k_pyf" | "mentoria_2_8k_pyf"
  | "mentoria_5k" | "skool" | "vip_5k" | "mentoria_2_5k_cuotas"
  | "mentoria_5k_cuotas" | "mentoria_1k_cuotas" | "mentoria_fee"
  | "cuota_vip_mantencion";

export type ConceptoPago = "pif" | "fee" | "primera_cuota" | "segunda_cuota";
export type PlanPago = "paid_in_full" | "2_cuotas" | "3_cuotas" | "personalizado";
export type PaymentEstado = "pendiente" | "pagado" | "perdido";

export type MetodoPago =
  | "binance" | "transferencia" | "caja_ahorro_usd"
  | "link_mp" | "cash" | "uruguayos" | "link_stripe";

export type ClientEstado = "activo" | "pausado" | "inactivo" | "solo_skool" | "no_termino_pagar";
export type SemanaEstado = "primeras_publicaciones" | "primera_venta" | "escalando_anuncios";
export type SeguimientoEstado = "para_seguimiento" | "no_necesita" | "seguimiento_urgente";

export type ContactoEstado =
  | "por_contactar" | "contactado" | "respondio_renueva" | "respondio_debe_cuota"
  | "es_socio" | "no_renueva" | "no_responde" | "numero_invalido"
  | "retirar_acceso" | "verificar";

export type TipoRenovacion =
  | "resell" | "upsell_vip" | "upsell_meli"
  | "upsell_vip_cuotas" | "upsell_meli_cuotas" | "resell_cuotas";

export type RenovacionEstado = "pago" | "no_renueva" | "cuota_1_pagada" | "cuota_2_pagada";
export type SessionTipo = "estrategia_inicial" | "revision_ajuste" | "cierre_ciclo" | "adicional";
export type SessionEstado = "programada" | "done" | "cancelada_no_asistio";
export type AgentTaskTipo = "cobrar_cuota" | "renovacion" | "seguimiento" | "oportunidad_upsell" | "bienvenida" | "seguimiento_urgente" | "confirmar_pago";
export type AgentTaskEstado = "pending" | "in_progress" | "done" | "failed";
export type FollowUpTipo = "llamada" | "whatsapp" | "dm" | "email" | "presencial";

// ========================================
// ROW TYPES
// ========================================

export interface TeamMember {
  id: string;
  user_id: string | null;
  nombre: string;
  etiqueta: string | null;
  rol: string | null;
  email: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  foto_url: string | null;
  observaciones: string | null;
  is_admin: boolean;
  is_closer: boolean;
  is_setter: boolean;
  is_cobranzas: boolean;
  is_seguimiento: boolean;
  comision_pct: number;
  can_see_agent: boolean;
  pin: string | null;
  activo: boolean;
}

export interface Lead {
  id: string;
  airtable_id: string | null;
  nombre: string;
  email: string | null;
  telefono: string | null;
  instagram: string | null;
  instagram_sin_arroba: string | null;
  fuente: LeadFuente | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  evento_calendly: string | null;
  calendly_event_id: string | null;
  fecha_agendado: string | null;
  fecha_llamada: string | null;
  estado: LeadEstado;
  setter_id: string | null;
  closer_id: string | null;
  cobrador_id: string | null;
  contexto_setter: string | null;
  reporte_general: string | null;
  notas_internas: string | null;
  experiencia_ecommerce: string | null;
  seguridad_inversion: string | null;
  tipo_productos: string | null;
  compromiso_asistencia: string | null;
  dispuesto_invertir: string | null;
  decisor: string | null;
  lead_calificado: LeadCalificacion | null;
  lead_score: LeadScore | null;
  link_llamada: string | null;
  programa_pitcheado: Programa | null;
  concepto: ConceptoPago | null;
  plan_pago: PlanPago | null;
  ticket_total: number;
  fue_seguimiento: boolean;
  de_donde_viene_lead: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  setter?: TeamMember;
  closer?: TeamMember;
}

export interface Payment {
  id: string;
  lead_id: string | null;
  client_id: string | null;
  renewal_id: string | null;
  numero_cuota: number;
  monto_usd: number;
  monto_ars: number;
  fecha_pago: string | null;
  fecha_vencimiento: string | null;
  estado: PaymentEstado;
  metodo_pago: MetodoPago | null;
  receptor: string | null;
  comprobante_url: string | null;
  cobrador_id: string | null;
  verificado: boolean;
  es_renovacion: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  airtable_id: string | null;
  lead_id: string | null;
  nombre: string;
  email: string | null;
  telefono: string | null;
  programa: Programa | null;
  estado: ClientEstado;
  fecha_onboarding: string | null;
  fecha_offboarding: string | null;
  total_dias_programa: number;
  llamadas_base: number;
  pesadilla: boolean;
  exito: boolean;
  discord: boolean;
  skool: boolean;
  win_discord: boolean;
  semana_1_estado: SemanaEstado | null;
  semana_1_accionables: string | null;
  semana_2_estado: SemanaEstado | null;
  semana_2_accionables: string | null;
  semana_3_estado: SemanaEstado | null;
  semana_3_accionables: string | null;
  semana_4_estado: SemanaEstado | null;
  semana_4_accionables: string | null;
  facturacion_mes_1: string | null;
  facturacion_mes_2: string | null;
  facturacion_mes_3: string | null;
  facturacion_mes_4: string | null;
  estado_seguimiento: SeguimientoEstado;
  fecha_ultimo_seguimiento: string | null;
  fecha_proximo_seguimiento: string | null;
  notas_seguimiento: string | null;
  notas_conversacion: string | null;
  estado_contacto: ContactoEstado;
  responsable_renovacion: string | null;
  origen: string | null;
  canal_contacto: string | null;
  prioridad_contacto: string | null;
  categoria: string | null;
  email_skool: string | null;
  en_wa_esa: boolean;
  en_ig_grupo: boolean;
  deudor_usd: number;
  deudor_vencimiento: string | null;
  health_score: number;
  created_at: string;
  updated_at: string;
}

export interface TrackerSession {
  id: string;
  client_id: string;
  fecha: string | null;
  numero_sesion: number;
  tipo_sesion: SessionTipo;
  estado: SessionEstado;
  enlace_llamada: string | null;
  assignee_id: string | null;
  notas_setup: string | null;
  pitch_upsell: boolean;
  rating: number | null;
  aprendizaje_principal: string | null;
  feedback_cliente: string | null;
  herramienta_mas_util: string | null;
  action_items: Record<string, unknown>[];
  follow_up_date: string | null;
  created_at: string;
}

export interface DailyReport {
  id: string;
  setter_id: string;
  fecha: string;
  conversaciones_iniciadas: number;
  respuestas_historias: number;
  calendarios_enviados: number;
  ventas_por_chat: string | null;
  conversaciones_lead_inicio: string | null;
  agendas_confirmadas: string | null;
  origen_principal: string[];
  created_at: string;
}

export interface AgentTask {
  id: string;
  tipo: AgentTaskTipo;
  client_id: string | null;
  lead_id: string | null;
  payment_id: string | null;
  prioridad: number;
  estado: AgentTaskEstado;
  asignado_a: "agent" | "human";
  human_assignee_id: string | null;
  canal: "whatsapp" | "email" | "dm_instagram";
  contexto: Record<string, unknown>;
  scheduled_at: string;
  completed_at: string | null;
  resultado: string | null;
  notas: string | null;
  created_at: string;
}

export interface AgentLog {
  id: string;
  task_id: string;
  accion: string;
  mensaje_enviado: string | null;
  respuesta_recibida: string | null;
  resultado: string | null;
  created_at: string;
}

export interface ClientFollowUp {
  id: string;
  client_id: string;
  author_id: string;
  fecha: string;
  tipo: FollowUpTipo;
  notas: string | null;
  proxima_accion: string | null;
  proxima_fecha: string | null;
  created_at: string;
}

export interface RenewalHistory {
  id: string;
  client_id: string;
  tipo_renovacion: TipoRenovacion | null;
  programa_anterior: Programa | null;
  programa_nuevo: Programa | null;
  monto_total: number;
  plan_pago: PlanPago | null;
  estado: RenovacionEstado | null;
  fecha_renovacion: string | null;
  comprobante_url: string | null;
  responsable_id: string | null;
  created_at: string;
}

export interface IgMetrics {
  id: string;
  periodo: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  cuentas_alcanzadas: number;
  impresiones: number;
  visitas_perfil: number;
  toques_enlaces: number;
  nuevos_seguidores: number;
  unfollows: number;
  total_seguidores: number;
  total_interacciones: number;
  reels_publicados: number;
  interacciones_reels: number;
  likes_reels: number;
  comentarios_reels: number;
  compartidos_reels: number;
  guardados_reels: number;
  leads_ig: number;
  ventas_ig: number;
  cash_ig: number;
  created_at: string;
  // Deltas and other fields omitted for brevity — added as needed
  [key: string]: unknown;
}

// ========================================
// VIEW TYPES
// ========================================

export interface MonthlyCash {
  mes_fiscal: string;
  cash_ventas_nuevas: number;
  cash_renovaciones: number;
  cash_cuotas: number;
  cash_total: number;
  ventas_nuevas_count: number;
  renovaciones_count: number;
}

export interface TreasuryRow {
  receptor: string;
  mes_fiscal: string;
  metodo_pago: MetodoPago | null;
  total_usd: number;
  total_ars: number;
  num_pagos: number;
  usd_ventas_nuevas: number;
  usd_cuotas: number;
  usd_renovaciones: number;
}

export interface RenewalQueueRow {
  id: string;
  nombre: string;
  programa: Programa;
  fecha_onboarding: string;
  total_dias_programa: number;
  fecha_vencimiento: string;
  dias_restantes: number;
  estado_contacto: ContactoEstado;
  health_score: number;
  semaforo: "vencido" | "urgente" | "proximo" | "ok";
}

export interface SessionAvailability {
  client_id: string;
  nombre: string;
  programa: Programa;
  llamadas_base: number;
  sesiones_consumidas: number;
  sesiones_disponibles: number;
  semaforo: "agotadas" | "ultima" | "disponible";
  rating_promedio: number | null;
}

export interface CloserKPI {
  team_member_id: string;
  nombre: string;
  mes_fiscal: string;
  total_agendas: number;
  presentadas: number;
  calificadas: number;
  cerradas: number;
  show_up_pct: number;
  cierre_pct: number;
  aov: number;
}

// ========================================
// AUTH
// ========================================

export interface AuthSession {
  team_member_id: string;
  nombre: string;
  roles: string[];
  is_admin: boolean;
  can_see_agent: boolean;
}

// ========================================
// UI HELPERS
// ========================================

export type Semaforo = "verde" | "amarillo" | "rojo";

export function healthToSemaforo(score: number): Semaforo {
  if (score >= 80) return "verde";
  if (score >= 50) return "amarillo";
  return "rojo";
}
```

- [ ] **Step 2: Create constants**

Create `lib/constants.ts`:

```typescript
export const COMMISSION_CLOSER = 0.10;
export const COMMISSION_SETTER = 0.05;
export const COMMISSION_COBRANZAS = 0.10;
export const PROGRAM_DURATION_DAYS = 90;

export const PROGRAMS: Record<string, { label: string; precio: number }> = {
  mentoria_1k_pyf: { label: "Mentoría 1K PYF", precio: 1000 },
  mentoria_2_5k_pyf: { label: "Mentoría 2.5K PYF", precio: 2500 },
  mentoria_2_8k_pyf: { label: "Mentoría 2.8K PYF", precio: 2800 },
  mentoria_5k: { label: "Mentoría 5K", precio: 5000 },
  skool: { label: "Skool", precio: 0 },
  vip_5k: { label: "VIP 5K", precio: 5000 },
  mentoria_2_5k_cuotas: { label: "Mentoría 2.5K Cuotas", precio: 2500 },
  mentoria_5k_cuotas: { label: "Mentoría 5K Cuotas", precio: 5000 },
  mentoria_1k_cuotas: { label: "Mentoría 1K Cuotas", precio: 1000 },
  mentoria_fee: { label: "Mentoría Fee", precio: 0 },
  cuota_vip_mantencion: { label: "Cuota VIP Mantención", precio: 0 },
};

export const RECEPTORES = [
  "JUANMA", "Cuenta pesos Lauti", "Cuenta dolares Lauti",
  "Efectivo", "Binance lauti", "Stripe",
  "Financiera Payments", "Becheq",
];

export const LEAD_ESTADOS_LABELS: Record<string, string> = {
  pendiente: "⏳ Pendiente",
  no_show: "👤 No-Show",
  cancelada: "🚨 Cancelada",
  reprogramada: "🕒 Re-programada",
  seguimiento: "🔄 Seguimiento",
  no_calificado: "🚫 No Calificado",
  no_cierre: "⚠️ No Cierre",
  reserva: "💰 Reserva",
  cerrado: "🚀 Cerrado",
  adentro_seguimiento: "🔄 Adentro en Seguimiento",
  broke_cancelado: "❌ Broke/Cancelado",
};

export const CLIENT_ESTADOS_LABELS: Record<string, string> = {
  activo: "✅ Activo",
  pausado: "⏸️ Pausado",
  inactivo: "❌ Inactivo",
  solo_skool: "📚 Solo Skool",
  no_termino_pagar: "💸 No Terminó de Pagar",
};
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add lib/
git commit -m "feat: add TypeScript types and constants"
```

---

### Task 6: Supabase Clients and Auth

**Files:**
- Create: `lib/supabase-server.ts`, `lib/supabase-browser.ts`, `lib/auth.ts`, `lib/schemas.ts`, `lib/date-utils.ts`, `lib/format.ts`

- [ ] **Step 1: Create Supabase server client**

Create `lib/supabase-server.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
```

- [ ] **Step 2: Create Supabase browser client**

Create `lib/supabase-browser.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowser() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
```

- [ ] **Step 3: Create auth system**

Create `lib/auth.ts`:

```typescript
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "./supabase-server";
import type { AuthSession, TeamMember } from "./types";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "lauti-crm-default-secret"
);
const COOKIE_NAME = "lauti_session";

export async function createSessionToken(member: TeamMember): Promise<string> {
  const roles: string[] = [];
  if (member.is_admin) roles.push("admin");
  if (member.is_closer) roles.push("closer");
  if (member.is_setter) roles.push("setter");
  if (member.is_cobranzas) roles.push("cobranzas");
  if (member.is_seguimiento) roles.push("seguimiento");

  return new SignJWT({
    team_member_id: member.id,
    nombre: member.nombre,
    roles,
    is_admin: member.is_admin,
    can_see_agent: member.can_see_agent,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function getSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as AuthSession;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<
  { session: AuthSession } | { error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }
  return { session };
}

export async function requireAdmin(): Promise<
  { session: AuthSession } | { error: NextResponse }
> {
  const result = await requireSession();
  if ("error" in result) return result;
  if (!result.session.is_admin) {
    return { error: NextResponse.json({ error: "Solo admins" }, { status: 403 }) };
  }
  return result;
}

export async function loginWithPin(
  nombre: string,
  pin: string
): Promise<{ token: string; session: AuthSession } | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("team_members")
    .select("*")
    .eq("nombre", nombre)
    .eq("pin", pin)
    .eq("activo", true)
    .single();

  if (!data) return null;

  const member = data as TeamMember;
  const token = await createSessionToken(member);

  const roles: string[] = [];
  if (member.is_admin) roles.push("admin");
  if (member.is_closer) roles.push("closer");
  if (member.is_setter) roles.push("setter");
  if (member.is_cobranzas) roles.push("cobranzas");
  if (member.is_seguimiento) roles.push("seguimiento");

  return {
    token,
    session: {
      team_member_id: member.id,
      nombre: member.nombre,
      roles,
      is_admin: member.is_admin,
      can_see_agent: member.can_see_agent,
    },
  };
}

export { COOKIE_NAME };
```

- [ ] **Step 4: Create Zod schemas**

Create `lib/schemas.ts`:

```typescript
import { z } from "zod";

function safeString(maxLen = 500) {
  return z.string().max(maxLen).transform((s) => {
    const trimmed = s.trim();
    if (/^[=+\-@]/.test(trimmed)) return "'" + trimmed;
    return trimmed;
  });
}

export const loginSchema = z.object({
  nombre: z.string().min(1).max(50),
  pin: z.string().length(4).regex(/^\d{4}$/),
});

export const llamadaSchema = z.object({
  lead_id: z.string().uuid(),
  estado: safeString(50),
  programa_pitcheado: safeString(50).optional(),
  concepto: safeString(30).optional(),
  plan_pago: safeString(30).optional(),
  ticket_total: z.number().min(0).default(0),
  reporte_general: safeString(2000).optional(),
  notas_internas: safeString(2000).optional(),
  lead_calificado: safeString(20).optional(),
});

export const pagoSchema = z.object({
  lead_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  numero_cuota: z.number().int().min(1).max(10),
  monto_usd: z.number().min(0).default(0),
  monto_ars: z.number().min(0).default(0),
  fecha_pago: z.string(),
  estado: z.enum(["pendiente", "pagado", "perdido"]).default("pagado"),
  metodo_pago: safeString(30),
  receptor: safeString(50),
  es_renovacion: z.boolean().default(false),
});

export const ventaChatSchema = z.object({
  nombre: safeString(100),
  instagram: safeString(100).optional(),
  telefono: safeString(30).optional(),
  email: z.string().email().optional().or(z.literal("")),
  programa_pitcheado: safeString(50),
  ticket_total: z.number().min(0),
  plan_pago: safeString(30),
  monto_usd: z.number().min(0),
  metodo_pago: safeString(30),
  receptor: safeString(50),
  setter_id: z.string().uuid(),
});

export const reporteSetterSchema = z.object({
  setter_id: z.string().uuid(),
  fecha: z.string(),
  conversaciones_iniciadas: z.number().int().min(0).default(0),
  respuestas_historias: z.number().int().min(0).default(0),
  calendarios_enviados: z.number().int().min(0).default(0),
  ventas_por_chat: safeString(500).optional(),
  agendas_confirmadas: safeString(500).optional(),
  origen_principal: z.array(z.string()).default([]),
});

export const followUpSchema = z.object({
  client_id: z.string().uuid(),
  tipo: z.enum(["llamada", "whatsapp", "dm", "email", "presencial"]),
  notas: safeString(2000),
  proxima_accion: safeString(500).optional(),
  proxima_fecha: z.string().optional(),
});
```

- [ ] **Step 5: Create date utilities**

Create `lib/date-utils.ts`:

```typescript
import { format, subMonths, startOfMonth, endOfMonth, setDate, isAfter, isBefore, addMonths } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Get the fiscal month label for a date (7-7 month).
 * If day < 7, belongs to previous month.
 */
export function getFiscalMonth(date: Date): string {
  const adjusted = date.getDate() < 7 ? subMonths(date, 1) : date;
  return format(adjusted, "MMMM yyyy", { locale: es });
}

/**
 * Get the start date of a fiscal month (always the 7th).
 */
export function getFiscalStart(date: Date = new Date()): Date {
  if (date.getDate() >= 7) {
    return setDate(date, 7);
  }
  return setDate(subMonths(date, 1), 7);
}

/**
 * Get the end date of a fiscal month (always the 6th of next month).
 */
export function getFiscalEnd(date: Date = new Date()): Date {
  const start = getFiscalStart(date);
  return setDate(addMonths(start, 1), 6);
}

/**
 * Check if a date is within the current fiscal month.
 */
export function isCurrentFiscal(date: Date): boolean {
  const start = getFiscalStart();
  const end = getFiscalEnd();
  return !isBefore(date, start) && !isAfter(date, end);
}

/**
 * Get previous fiscal month start/end.
 */
export function getPrevFiscalStart(): Date {
  return subMonths(getFiscalStart(), 1);
}

/**
 * Generate fiscal month options for a selector.
 */
export function getFiscalMonthOptions(count: number = 6): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  let current = new Date();
  for (let i = 0; i < count; i++) {
    const start = getFiscalStart(current);
    const label = getFiscalMonth(current);
    options.push({ value: start.toISOString().split("T")[0], label });
    current = subMonths(current, 1);
  }
  return options;
}
```

- [ ] **Step 6: Create formatters**

Create `lib/format.ts`:

```typescript
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatARS(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPct(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatPctRaw(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
```

- [ ] **Step 7: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add lib/
git commit -m "feat: add Supabase clients, auth, schemas, date utils, formatters"
```

---

### Task 7: Login Page and Auth API

**Files:**
- Create: `app/login/page.tsx`, `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, `middleware.ts`

- [ ] **Step 1: Create login API route**

Create `app/api/auth/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/schemas";
import { loginWithPin, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "PIN inválido" }, { status: 400 });
    }

    const result = await loginWithPin(parsed.data.nombre, parsed.data.pin);
    if (!result) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, session: result.session });
    response.cookies.set(COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create logout API route**

Create `app/api/auth/logout/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
```

- [ ] **Step 3: Create login page**

Create `app/login/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TEAM = [
  { nombre: "Lauti", emoji: "👑" },
  { nombre: "Mel", emoji: "💰" },
  { nombre: "Juanma", emoji: "📊" },
  { nombre: "Iván", emoji: "📞" },
  { nombre: "Joaquín", emoji: "💬" },
  { nombre: "Jorge", emoji: "🔄" },
  { nombre: "Pepito", emoji: "📋" },
];

export default function LoginPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!selected || pin.length !== 4) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: selected, pin }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Error al iniciar sesión");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Lauti CRM</h1>
          <p className="text-[var(--muted)] mt-1">Seleccioná tu usuario</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {TEAM.map((t) => (
            <button
              key={t.nombre}
              onClick={() => { setSelected(t.nombre); setPin(""); setError(""); }}
              className={`p-3 rounded-lg border text-left transition-all ${
                selected === t.nombre
                  ? "border-[var(--purple)] bg-[var(--purple)]/10 text-white"
                  : "border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--muted)] hover:border-[var(--purple)]/50"
              }`}
            >
              <span className="text-lg">{t.emoji}</span>{" "}
              <span className="font-medium">{t.nombre}</span>
            </button>
          ))}
        </div>

        {selected && (
          <div className="space-y-3">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="PIN (4 dígitos)"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-white text-center text-2xl tracking-[0.5em] focus:border-[var(--purple)] outline-none"
              autoFocus
            />
            {error && <p className="text-[var(--red)] text-sm text-center">{error}</p>}
            <button
              onClick={handleLogin}
              disabled={pin.length !== 4 || loading}
              className="w-full p-3 rounded-lg bg-[var(--purple)] text-white font-semibold disabled:opacity-50 hover:bg-[var(--purple-dark)] transition-colors"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create middleware for auth redirect**

Create `middleware.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "lauti-crm-default-secret"
);

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("lauti_session")?.value;

  // Allow login page and API routes
  if (req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 5: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/ middleware.ts
git commit -m "feat: add login page, auth API, and middleware"
```

---

### Task 8: Theme, Layout, and Sidebar

**Files:**
- Create: `app/globals.css`, `app/layout.tsx`, `app/(dashboard)/layout.tsx`, `app/(dashboard)/page.tsx`, `app/components/Sidebar.tsx`

- [ ] **Step 1: Create global styles**

Create `app/globals.css`:

```css
@import "tailwindcss";

@theme inline {
  --color-background: #0d0d0f;
  --color-foreground: #e5e5e5;
  --color-card-bg: #18181b;
  --color-card-border: #27272a;
  --color-purple: #8b5cf6;
  --color-purple-light: #a78bfa;
  --color-purple-dark: #6d28d9;
  --color-green: #22c55e;
  --color-red: #ef4444;
  --color-yellow: #eab308;
  --color-muted: #71717a;
}

:root {
  --background: #0d0d0f;
  --foreground: #e5e5e5;
  --card-bg: #18181b;
  --card-border: #27272a;
  --purple: #8b5cf6;
  --purple-light: #a78bfa;
  --purple-dark: #6d28d9;
  --green: #22c55e;
  --red: #ef4444;
  --yellow: #eab308;
  --muted: #71717a;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, sans-serif;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #555; }
```

- [ ] **Step 2: Create root layout**

Create `app/layout.tsx`:

```typescript
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lauti CRM",
  description: "CRM para Lautaro Cardozo — Mentoría Ecommerce",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0d0d0f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Create Sidebar**

Create `app/components/Sidebar.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AuthSession } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

function getNav(session: AuthSession): NavSection[] {
  const { is_admin, roles, can_see_agent } = session;
  const isCloser = roles.includes("closer");
  const isSetter = roles.includes("setter");
  const isSeguimiento = roles.includes("seguimiento");

  if (is_admin) {
    const sections: NavSection[] = [
      {
        title: "PRINCIPAL",
        items: [
          { href: "/", label: "Dashboard", icon: "📊" },
          { href: "/pipeline", label: "Pipeline", icon: "📞" },
          { href: "/llamadas", label: "CRM Llamadas", icon: "📋" },
          { href: "/tesoreria", label: "Tesorería", icon: "🏦" },
        ],
      },
      {
        title: "CLIENTES",
        items: [
          { href: "/clientes", label: "Base de Clientes", icon: "👥" },
          { href: "/seguimiento", label: "Seguimiento", icon: "📈" },
          { href: "/tracker", label: "Tracker 1a1", icon: "🎯" },
          { href: "/renovaciones", label: "Renovaciones", icon: "♻️" },
        ],
      },
      {
        title: "COBRANZAS",
        items: [
          { href: "/cobranzas", label: "Cola de Cobranzas", icon: "💰" },
        ],
      },
      {
        title: "ANALYTICS",
        items: [
          { href: "/closers", label: "Closers Analytics", icon: "🏆" },
          { href: "/leaderboard", label: "Leaderboard", icon: "🥇" },
          { href: "/ig-metrics", label: "IG Metrics", icon: "📱" },
          { href: "/reportes", label: "Reportes Diarios", icon: "📝" },
        ],
      },
      {
        title: "HERRAMIENTAS",
        items: [
          { href: "/form/llamada", label: "Cargar Llamada", icon: "📞" },
          { href: "/form/pago", label: "Cargar Pago", icon: "💳" },
          { href: "/form/venta-chat", label: "Venta por Chat", icon: "💬" },
          { href: "/form/reporte-setter", label: "Reporte Setter", icon: "📝" },
          { href: "/utm", label: "UTM Builder", icon: "🔗" },
        ],
      },
      {
        title: "CONFIG",
        items: [
          { href: "/admin", label: "Admin Panel", icon: "⚙️" },
        ],
      },
    ];
    return sections;
  }

  if (isSeguimiento) {
    return [
      {
        title: "SEGUIMIENTO",
        items: [
          { href: "/", label: "Cola de Seguimientos", icon: "📋" },
          { href: "/clientes", label: "Clientes", icon: "👥" },
          { href: "/tracker", label: "Tracker 1a1", icon: "🎯" },
        ],
      },
    ];
  }

  if (isCloser && isSetter) {
    return [
      {
        title: "MI PANEL",
        items: [
          { href: "/", label: "Mi Dashboard", icon: "📊" },
          { href: "/pipeline", label: "Mi Pipeline", icon: "📞" },
          { href: "/leaderboard", label: "Leaderboard", icon: "🥇" },
        ],
      },
      {
        title: "ACCIONES",
        items: [
          { href: "/form/llamada", label: "Cargar Llamada", icon: "📞" },
          { href: "/form/venta-chat", label: "Venta por Chat", icon: "💬" },
          { href: "/form/reporte-setter", label: "Reporte Diario", icon: "📝" },
        ],
      },
    ];
  }

  if (isCloser) {
    return [
      {
        title: "MI PANEL",
        items: [
          { href: "/", label: "Mi Dashboard", icon: "📊" },
          { href: "/pipeline", label: "Mi Pipeline", icon: "📞" },
          { href: "/leaderboard", label: "Leaderboard", icon: "🥇" },
        ],
      },
      {
        title: "ACCIONES",
        items: [
          { href: "/form/llamada", label: "Cargar Llamada", icon: "📞" },
        ],
      },
    ];
  }

  // Setter only
  return [
    {
      title: "MI PANEL",
      items: [
        { href: "/", label: "Mi Dashboard", icon: "📊" },
        { href: "/leaderboard", label: "Leaderboard", icon: "🥇" },
      ],
    },
    {
      title: "ACCIONES",
      items: [
        { href: "/form/venta-chat", label: "Venta por Chat", icon: "💬" },
        { href: "/form/reporte-setter", label: "Reporte Diario", icon: "📝" },
      ],
    },
  ];
}

export default function Sidebar({ session }: { session: AuthSession }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const nav = getNav(session);

  useEffect(() => { setOpen(false); }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[var(--card-bg)] border-b border-[var(--card-border)] flex items-center justify-between px-4 z-40">
        <button onClick={() => setOpen(true)} className="text-white text-xl">☰</button>
        <span className="text-white font-semibold">Lauti CRM</span>
        <div className="w-6" />
      </div>

      {/* Overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/60 z-50" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 bottom-0 w-64 bg-[var(--card-bg)] border-r border-[var(--card-border)] z-50 transition-transform duration-200 ${
        open ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0 overflow-y-auto`}>
        <div className="p-4 border-b border-[var(--card-border)]">
          <h2 className="text-lg font-bold text-white">Lauti CRM</h2>
          <p className="text-xs text-[var(--muted)]">{session.nombre} — {session.roles.join(", ")}</p>
        </div>

        <nav className="p-2">
          {nav.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="px-3 py-1 text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                {section.title}
              </p>
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      active
                        ? "bg-[var(--purple)]/15 text-[var(--purple-light)] font-medium"
                        : "text-[var(--muted)] hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-[var(--card-border)] mt-auto">
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-[var(--muted)] hover:text-[var(--red)] transition-colors"
          >
            🚪 Salir
          </button>
        </div>
      </aside>
    </>
  );
}
```

- [ ] **Step 4: Create dashboard layout**

Create `app/(dashboard)/layout.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar from "@/app/components/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen">
      <Sidebar session={session} />
      <main className="lg:ml-64 pt-14 lg:pt-0 p-4 lg:p-6">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Create dashboard landing page**

Create `app/(dashboard)/page.tsx`:

```typescript
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Placeholder — will be replaced with actual dashboard in Phase 5
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">
        Bienvenido, {session.nombre}
      </h1>
      <p className="text-[var(--muted)]">
        Dashboard en construcción. Roles: {session.roles.join(", ")}
      </p>
    </div>
  );
}
```

- [ ] **Step 6: Verify app runs**

```bash
cd /c/Users/matyc/projects/lauti-crm
npm run dev
```

Expected: App starts, visiting localhost:3000 redirects to /login, login page shows team members.

- [ ] **Step 7: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/ 
git commit -m "feat: add theme, layout, sidebar with role-based nav, dashboard landing"
```

---

### Task 9: Shared UI Components

**Files:**
- Create: `app/components/KPICard.tsx`, `app/components/StatusBadge.tsx`, `app/components/Semaforo.tsx`, `app/components/DataTable.tsx`, `app/components/MonthSelector77.tsx`, `app/components/SaleBanner.tsx`, `app/components/EmptyState.tsx`

- [ ] **Step 1: Create KPICard**

Create `app/components/KPICard.tsx`:

```typescript
import { formatUSD, formatPctRaw } from "@/lib/format";

interface Props {
  label: string;
  value: number;
  format?: "usd" | "pct" | "number";
  delta?: number | null;
  icon?: string;
}

export default function KPICard({ label, value, format = "number", delta, icon }: Props) {
  const formatted =
    format === "usd" ? formatUSD(value) :
    format === "pct" ? formatPctRaw(value) :
    value.toLocaleString();

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[var(--muted)] uppercase">{label}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <p className="text-2xl font-bold text-white">{formatted}</p>
      {delta !== undefined && delta !== null && (
        <p className={`text-xs mt-1 ${delta >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs mes anterior
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create StatusBadge**

Create `app/components/StatusBadge.tsx`:

```typescript
const COLORS: Record<string, string> = {
  cerrado: "bg-[var(--green)]/15 text-[var(--green)]",
  pagado: "bg-[var(--green)]/15 text-[var(--green)]",
  activo: "bg-[var(--green)]/15 text-[var(--green)]",
  done: "bg-[var(--green)]/15 text-[var(--green)]",
  pendiente: "bg-[var(--yellow)]/15 text-[var(--yellow)]",
  pending: "bg-[var(--yellow)]/15 text-[var(--yellow)]",
  programada: "bg-[var(--purple)]/15 text-[var(--purple-light)]",
  seguimiento: "bg-blue-500/15 text-blue-400",
  in_progress: "bg-blue-500/15 text-blue-400",
  no_show: "bg-[var(--red)]/15 text-[var(--red)]",
  cancelada: "bg-[var(--red)]/15 text-[var(--red)]",
  perdido: "bg-[var(--red)]/15 text-[var(--red)]",
  failed: "bg-[var(--red)]/15 text-[var(--red)]",
  inactivo: "bg-[var(--muted)]/15 text-[var(--muted)]",
};

export default function StatusBadge({ status, label }: { status: string; label?: string }) {
  const color = COLORS[status] || "bg-[var(--muted)]/15 text-[var(--muted)]";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label || status}
    </span>
  );
}
```

- [ ] **Step 3: Create Semaforo**

Create `app/components/Semaforo.tsx`:

```typescript
import type { Semaforo as SemaforoType } from "@/lib/types";

const COLORS: Record<string, { bg: string; text: string; label: string }> = {
  verde: { bg: "bg-[var(--green)]/15", text: "text-[var(--green)]", label: "Al día" },
  amarillo: { bg: "bg-[var(--yellow)]/15", text: "text-[var(--yellow)]", label: "Atención" },
  rojo: { bg: "bg-[var(--red)]/15", text: "text-[var(--red)]", label: "Urgente" },
  vencido: { bg: "bg-[var(--red)]/15", text: "text-[var(--red)]", label: "Vencido" },
  urgente: { bg: "bg-[var(--red)]/15", text: "text-[var(--red)]", label: "Urgente" },
  proximo: { bg: "bg-[var(--yellow)]/15", text: "text-[var(--yellow)]", label: "Próximo" },
  ok: { bg: "bg-[var(--green)]/15", text: "text-[var(--green)]", label: "OK" },
  agotadas: { bg: "bg-[var(--red)]/15", text: "text-[var(--red)]", label: "Agotadas" },
  ultima: { bg: "bg-[var(--yellow)]/15", text: "text-[var(--yellow)]", label: "Última" },
  disponible: { bg: "bg-[var(--green)]/15", text: "text-[var(--green)]", label: "Disponible" },
};

export default function Semaforo({ value, label }: { value: string; label?: string }) {
  const config = COLORS[value] || COLORS.verde;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label || config.label}
    </span>
  );
}
```

- [ ] **Step 4: Create DataTable**

Create `app/components/DataTable.tsx`:

```typescript
"use client";

import { useState, useMemo } from "react";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  searchKey?: keyof T;
  searchPlaceholder?: string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
}

export default function DataTable<T extends Record<string, unknown>>({
  data, columns, searchKey, searchPlaceholder = "Buscar...", pageSize = 20, onRowClick,
}: Props<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    let result = data;
    if (search && searchKey) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        String(row[searchKey] ?? "").toLowerCase().includes(q)
      );
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [data, search, searchKey, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="space-y-3">
      {searchKey && (
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full max-w-sm px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
        />
      )}

      <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--card-bg)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  className={`px-3 py-2 text-left text-xs text-[var(--muted)] font-medium uppercase ${
                    col.sortable ? "cursor-pointer hover:text-white" : ""
                  }`}
                >
                  {col.label}
                  {sortKey === col.key && (sortDir === "asc" ? " ▲" : " ▼")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr
                key={i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-t border-[var(--card-border)] ${
                  onRowClick ? "cursor-pointer hover:bg-white/5" : ""
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2 text-[var(--foreground)]">
                    {col.render ? col.render(row) : String(row[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-[var(--muted)]">
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[var(--muted)]">
          <span>{filtered.length} registros</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-2 py-1 rounded bg-[var(--card-bg)] disabled:opacity-30"
            >
              ←
            </button>
            <span className="px-2 py-1">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 rounded bg-[var(--card-bg)] disabled:opacity-30"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create MonthSelector77**

Create `app/components/MonthSelector77.tsx`:

```typescript
"use client";

import { getFiscalMonthOptions } from "@/lib/date-utils";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function MonthSelector77({ value, onChange }: Props) {
  const options = getFiscalMonthOptions(12);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 6: Create SaleBanner and EmptyState**

Create `app/components/SaleBanner.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { formatUSD } from "@/lib/format";

interface Sale {
  nombre: string;
  closer: string;
  programa: string;
  monto: number;
}

export default function SaleBanner() {
  const [sale, setSale] = useState<Sale | null>(null);
  const [visible, setVisible] = useState(false);

  // Will be connected to Supabase Realtime in Phase 7
  // For now, expose a global function for testing
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__showSale = (s: Sale) => {
      setSale(s);
      setVisible(true);
      setTimeout(() => setVisible(false), 5000);
    };
  }, []);

  if (!visible || !sale) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className="bg-[var(--green)]/10 border border-[var(--green)]/30 rounded-xl p-4 backdrop-blur-sm max-w-sm">
        <p className="text-[var(--green)] font-bold text-lg">🚀 Nueva Venta!</p>
        <p className="text-white">{sale.closer} cerró a {sale.nombre}</p>
        <p className="text-[var(--muted)] text-sm">{sale.programa} — {formatUSD(sale.monto)}</p>
      </div>
    </div>
  );
}
```

Create `app/components/EmptyState.tsx`:

```typescript
export default function EmptyState({ message = "No hay datos", icon = "📭" }: { message?: string; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-[var(--muted)]">{message}</p>
    </div>
  );
}
```

- [ ] **Step 7: Verify build**

```bash
cd /c/Users/matyc/projects/lauti-crm
npm run build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 8: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/components/
git commit -m "feat: add shared UI components — KPICard, StatusBadge, Semaforo, DataTable, MonthSelector, SaleBanner, EmptyState"
```

---

## Phase 1 Complete

After all 9 tasks, the project has:
- Next.js 16 scaffold with all dependencies
- Complete Supabase schema (14 tables, 6 enums, 2 functions, 9 views, RLS policies, seed data)
- Auth system (PIN + JWT + middleware)
- Login page
- Role-based sidebar navigation
- All TypeScript types and constants
- 7 reusable UI components
- Date utilities for 7-7 fiscal month
- Formatters (USD, ARS, %, dates)

**Next:** Phase 2 (Core CRM — Leads, Payments, Pipeline, Forms) and Phase 3 (Clients, Tracker 1a1, Seguimiento) can be executed in parallel.
