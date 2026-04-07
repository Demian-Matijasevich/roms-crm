# Lauti CRM Phase 3: Clients & Seguimiento

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** Build the full client management module: client list, client detail with tabs, onboarding form, tracker 1a1 with calendar/table views, seguimiento priority queue, and health score integration.

**Architecture:** Server components fetch data via Supabase queries in `lib/queries/`, then pass to "use client" components for interactivity. API routes use requireSession() + Zod validation. Client detail uses tab navigation for payments, sessions, follow-ups, semanas, and renewals. Seguimiento page is the primary view for the `seguimiento` role (Pepito).

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase JS v2, Zod, date-fns

**Depends on:** Phase 1 (types, constants, auth, components, DB schema, views)

---

## File Structure (Phase 3)

```
lib/
  queries/
    clients.ts          # fetchClients, fetchClientById, updateClient
    tracker.ts          # fetchSessions, fetchSessionsByClient, createSession
    followups.ts        # fetchFollowUpsByClient, createFollowUp
  schemas.ts            # (append: onboardingSchema, sessionSchema, clientUpdateSchema)
app/
  (dashboard)/
    clientes/
      page.tsx                    # Server: fetch clients list
      ClientesClient.tsx          # Client: DataTable + filters
      [id]/
        page.tsx                  # Server: fetch client with relations
        ClientDetailClient.tsx    # Client: tabbed detail view
    form/
      onboarding/
        page.tsx                  # Server wrapper
        OnboardingForm.tsx        # Client: onboarding form
    tracker/
      page.tsx                    # Server: fetch sessions + availability
      TrackerClient.tsx           # Client: calendar/table toggle + dashboard
      SessionFormModal.tsx        # Client: create/edit session modal
    seguimiento/
      page.tsx                    # Server: fetch clients for seguimiento
      SeguimientoClient.tsx       # Client: priority queue + timeline
  api/
    onboarding/
      route.ts                   # POST create onboarding
    tracker/
      route.ts                   # POST create, PATCH update session
    followups/
      route.ts                   # POST create follow-up
    health-score/
      refresh/
        route.ts                 # POST refresh all health scores
    clients/
      [id]/
        route.ts                 # PATCH update client fields
```

---

### Task 1: Supabase Queries for Clients Module

**Files:**
- Create: `lib/queries/clients.ts`, `lib/queries/tracker.ts`, `lib/queries/followups.ts`
- Modify: `lib/schemas.ts` (append new schemas)

- [ ] **Step 1: Create `lib/queries/clients.ts`**

```typescript
import { createServerClient } from "@/lib/supabase-server";
import type { Client, Payment, TrackerSession, ClientFollowUp, RenewalHistory, SessionAvailability } from "@/lib/types";

export interface ClientWithRelations extends Client {
  payments: Payment[];
  sessions: TrackerSession[];
  follow_ups: ClientFollowUp[];
  renewals: RenewalHistory[];
  session_availability: SessionAvailability | null;
}

export async function fetchClients(): Promise<Client[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("[fetchClients]", error);
    return [];
  }
  return data as Client[];
}

export async function fetchClientById(id: string): Promise<ClientWithRelations | null> {
  const supabase = createServerClient();

  // Fetch client
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (clientErr || !client) {
    console.error("[fetchClientById]", clientErr);
    return null;
  }

  // Parallel fetch relations
  const [paymentsRes, sessionsRes, followUpsRes, renewalsRes, availRes] = await Promise.all([
    supabase
      .from("payments")
      .select("*")
      .or(`client_id.eq.${id},lead_id.eq.${client.lead_id}`)
      .order("fecha_pago", { ascending: false }),
    supabase
      .from("tracker_sessions")
      .select("*")
      .eq("client_id", id)
      .order("fecha", { ascending: false }),
    supabase
      .from("client_follow_ups")
      .select("*, author:team_members(id, nombre)")
      .eq("client_id", id)
      .order("fecha", { ascending: false }),
    supabase
      .from("renewal_history")
      .select("*")
      .eq("client_id", id)
      .order("fecha_renovacion", { ascending: false }),
    supabase
      .from("v_session_availability")
      .select("*")
      .eq("client_id", id)
      .single(),
  ]);

  return {
    ...(client as Client),
    payments: (paymentsRes.data ?? []) as Payment[],
    sessions: (sessionsRes.data ?? []) as TrackerSession[],
    follow_ups: (followUpsRes.data ?? []) as ClientFollowUp[],
    renewals: (renewalsRes.data ?? []) as RenewalHistory[],
    session_availability: (availRes.data as SessionAvailability) ?? null,
  };
}

export async function updateClient(
  id: string,
  fields: Partial<Pick<Client,
    | "estado" | "estado_seguimiento" | "estado_contacto"
    | "semana_1_estado" | "semana_1_accionables"
    | "semana_2_estado" | "semana_2_accionables"
    | "semana_3_estado" | "semana_3_accionables"
    | "semana_4_estado" | "semana_4_accionables"
    | "notas_seguimiento" | "notas_conversacion"
    | "fecha_ultimo_seguimiento" | "fecha_proximo_seguimiento"
    | "facturacion_mes_1" | "facturacion_mes_2" | "facturacion_mes_3" | "facturacion_mes_4"
  >>
): Promise<Client | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("clients")
    .update(fields)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[updateClient]", error);
    return null;
  }
  return data as Client;
}
```

- [ ] **Step 2: Create `lib/queries/tracker.ts`**

```typescript
import { createServerClient } from "@/lib/supabase-server";
import type { TrackerSession, SessionAvailability } from "@/lib/types";

export async function fetchSessions(): Promise<TrackerSession[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("tracker_sessions")
    .select("*, client:clients(id, nombre, programa)")
    .order("fecha", { ascending: false });

  if (error) {
    console.error("[fetchSessions]", error);
    return [];
  }
  return data as TrackerSession[];
}

export async function fetchSessionsByClient(clientId: string): Promise<TrackerSession[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("tracker_sessions")
    .select("*")
    .eq("client_id", clientId)
    .order("fecha", { ascending: false });

  if (error) {
    console.error("[fetchSessionsByClient]", error);
    return [];
  }
  return data as TrackerSession[];
}

export async function fetchSessionAvailability(): Promise<SessionAvailability[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("v_session_availability")
    .select("*")
    .order("sesiones_disponibles", { ascending: true });

  if (error) {
    console.error("[fetchSessionAvailability]", error);
    return [];
  }
  return data as SessionAvailability[];
}

export async function createSession(
  session: Omit<TrackerSession, "id" | "created_at">
): Promise<TrackerSession | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("tracker_sessions")
    .insert(session)
    .select()
    .single();

  if (error) {
    console.error("[createSession]", error);
    return null;
  }
  return data as TrackerSession;
}

export async function updateSession(
  id: string,
  fields: Partial<Omit<TrackerSession, "id" | "created_at">>
): Promise<TrackerSession | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("tracker_sessions")
    .update(fields)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[updateSession]", error);
    return null;
  }
  return data as TrackerSession;
}
```

- [ ] **Step 3: Create `lib/queries/followups.ts`**

```typescript
import { createServerClient } from "@/lib/supabase-server";
import type { ClientFollowUp } from "@/lib/types";

export interface FollowUpWithAuthor extends ClientFollowUp {
  author?: { id: string; nombre: string };
}

export async function fetchFollowUpsByClient(clientId: string): Promise<FollowUpWithAuthor[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("client_follow_ups")
    .select("*, author:team_members(id, nombre)")
    .eq("client_id", clientId)
    .order("fecha", { ascending: false });

  if (error) {
    console.error("[fetchFollowUpsByClient]", error);
    return [];
  }
  return data as FollowUpWithAuthor[];
}

export async function createFollowUp(
  followUp: Omit<ClientFollowUp, "id" | "created_at">
): Promise<ClientFollowUp | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("client_follow_ups")
    .insert(followUp)
    .select()
    .single();

  if (error) {
    console.error("[createFollowUp]", error);
    return null;
  }
  return data as ClientFollowUp;
}
```

- [ ] **Step 4: Append new Zod schemas to `lib/schemas.ts`**

Add to the end of the existing `lib/schemas.ts`:

```typescript
export const onboardingSchema = z.object({
  client_id: z.string().uuid(),
  lead_id: z.string().uuid().optional(),
  fecha_ingreso: z.string(),
  edad: z.number().int().min(15).max(99).optional(),
  email: z.string().email().optional().or(z.literal("")),
  telefono: safeString(30).optional(),
  discord_user: safeString(100).optional(),
  skool_user: safeString(100).optional(),
  redes_sociales: safeString(500).optional(),
  red_social_origen: z.array(z.string()).default([]),
  porque_compro: safeString(2000).optional(),
  victoria_rapida: safeString(1000).optional(),
  resultado_esperado: safeString(1000).optional(),
  compromiso_pagos: z.boolean().default(false),
  confirmo_terminos: z.boolean().default(false),
  etapa_ecommerce: z.enum(["cero", "experiencia_sin_resultados", "experiencia_escalar"]).optional(),
  topico_compra: safeString(500).optional(),
});

export const sessionSchema = z.object({
  client_id: z.string().uuid(),
  fecha: z.string(),
  numero_sesion: z.number().int().min(1).default(1),
  tipo_sesion: z.enum(["estrategia_inicial", "revision_ajuste", "cierre_ciclo", "adicional"]).default("estrategia_inicial"),
  estado: z.enum(["programada", "done", "cancelada_no_asistio"]).default("programada"),
  enlace_llamada: safeString(500).optional(),
  assignee_id: z.string().uuid().optional(),
  notas_setup: safeString(2000).optional(),
  pitch_upsell: z.boolean().default(false),
  rating: z.number().int().min(1).max(10).optional(),
  aprendizaje_principal: safeString(2000).optional(),
  feedback_cliente: safeString(2000).optional(),
  herramienta_mas_util: safeString(500).optional(),
  action_items: z.array(z.object({
    task: z.string(),
    done: z.boolean().default(false),
  })).default([]),
  follow_up_date: z.string().optional(),
});

export const clientUpdateSchema = z.object({
  estado: z.enum(["activo", "pausado", "inactivo", "solo_skool", "no_termino_pagar"]).optional(),
  estado_seguimiento: z.enum(["para_seguimiento", "no_necesita", "seguimiento_urgente"]).optional(),
  estado_contacto: z.enum([
    "por_contactar", "contactado", "respondio_renueva", "respondio_debe_cuota",
    "es_socio", "no_renueva", "no_responde", "numero_invalido",
    "retirar_acceso", "verificar",
  ]).optional(),
  semana_1_estado: z.enum(["primeras_publicaciones", "primera_venta", "escalando_anuncios"]).optional().nullable(),
  semana_1_accionables: safeString(2000).optional().nullable(),
  semana_2_estado: z.enum(["primeras_publicaciones", "primera_venta", "escalando_anuncios"]).optional().nullable(),
  semana_2_accionables: safeString(2000).optional().nullable(),
  semana_3_estado: z.enum(["primeras_publicaciones", "primera_venta", "escalando_anuncios"]).optional().nullable(),
  semana_3_accionables: safeString(2000).optional().nullable(),
  semana_4_estado: z.enum(["primeras_publicaciones", "primera_venta", "escalando_anuncios"]).optional().nullable(),
  semana_4_accionables: safeString(2000).optional().nullable(),
  notas_seguimiento: safeString(5000).optional().nullable(),
  notas_conversacion: safeString(5000).optional().nullable(),
  fecha_ultimo_seguimiento: z.string().optional().nullable(),
  fecha_proximo_seguimiento: z.string().optional().nullable(),
  facturacion_mes_1: safeString(500).optional().nullable(),
  facturacion_mes_2: safeString(500).optional().nullable(),
  facturacion_mes_3: safeString(500).optional().nullable(),
  facturacion_mes_4: safeString(500).optional().nullable(),
});
```

- [ ] **Step 5: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add lib/
git commit -m "feat: add Supabase queries (clients, tracker, followups) and Zod schemas for Phase 3"
```

---

### Task 2: Clients List Page

**Files:**
- Create: `app/(dashboard)/clientes/page.tsx`, `app/(dashboard)/clientes/ClientesClient.tsx`

- [ ] **Step 1: Create server page `app/(dashboard)/clientes/page.tsx`**

```typescript
import { fetchClients } from "@/lib/queries/clients";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientesClient from "./ClientesClient";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const clients = await fetchClients();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Base de Clientes</h1>
        <span className="text-sm text-[var(--muted)]">{clients.length} clientes</span>
      </div>
      <ClientesClient clients={clients} />
    </div>
  );
}
```

- [ ] **Step 2: Create client component `app/(dashboard)/clientes/ClientesClient.tsx`**

```typescript
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import DataTable from "@/app/components/DataTable";
import Semaforo from "@/app/components/Semaforo";
import StatusBadge from "@/app/components/StatusBadge";
import type { Client } from "@/lib/types";
import { healthToSemaforo } from "@/lib/types";
import { PROGRAMS, CLIENT_ESTADOS_LABELS } from "@/lib/constants";
import { daysUntil } from "@/lib/format";

interface Props {
  clients: Client[];
}

export default function ClientesClient({ clients }: Props) {
  const router = useRouter();
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [filterPrograma, setFilterPrograma] = useState<string>("todos");
  const [filterSalud, setFilterSalud] = useState<string>("todos");

  const filtered = useMemo(() => {
    let result = clients;
    if (filterEstado !== "todos") {
      result = result.filter((c) => c.estado === filterEstado);
    }
    if (filterPrograma !== "todos") {
      result = result.filter((c) => c.programa === filterPrograma);
    }
    if (filterSalud !== "todos") {
      result = result.filter((c) => healthToSemaforo(c.health_score) === filterSalud);
    }
    return result;
  }, [clients, filterEstado, filterPrograma, filterSalud]);

  const columns = [
    {
      key: "nombre",
      label: "Nombre",
      sortable: true,
      render: (row: Client) => (
        <span className="font-medium text-white">{row.nombre}</span>
      ),
    },
    {
      key: "programa",
      label: "Programa",
      render: (row: Client) => (
        <span className="text-sm">
          {row.programa ? PROGRAMS[row.programa]?.label ?? row.programa : "---"}
        </span>
      ),
    },
    {
      key: "estado",
      label: "Estado",
      render: (row: Client) => (
        <StatusBadge
          status={row.estado}
          label={CLIENT_ESTADOS_LABELS[row.estado] ?? row.estado}
        />
      ),
    },
    {
      key: "health_score",
      label: "Salud",
      sortable: true,
      render: (row: Client) => (
        <div className="flex items-center gap-2">
          <Semaforo value={healthToSemaforo(row.health_score)} />
          <span className="text-xs text-[var(--muted)]">{row.health_score}</span>
        </div>
      ),
    },
    {
      key: "dias_restantes",
      label: "Dias Rest.",
      sortable: true,
      render: (row: Client) => {
        if (!row.fecha_onboarding) return <span className="text-[var(--muted)]">---</span>;
        const offboarding = new Date(row.fecha_onboarding);
        offboarding.setDate(offboarding.getDate() + row.total_dias_programa);
        const days = daysUntil(offboarding.toISOString().split("T")[0]);
        if (days === null) return <span className="text-[var(--muted)]">---</span>;
        return (
          <span className={days <= 0 ? "text-[var(--red)]" : days <= 15 ? "text-[var(--yellow)]" : "text-white"}>
            {days <= 0 ? `Vencido (${Math.abs(days)}d)` : `${days}d`}
          </span>
        );
      },
    },
    {
      key: "estado_contacto",
      label: "Contacto",
      render: (row: Client) => (
        <StatusBadge status={row.estado_contacto} />
      ),
    },
  ];

  const uniqueEstados = [...new Set(clients.map((c) => c.estado))];
  const uniqueProgramas = [...new Set(clients.map((c) => c.programa).filter(Boolean))];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
        >
          <option value="todos">Todos los estados</option>
          {uniqueEstados.map((e) => (
            <option key={e} value={e}>{CLIENT_ESTADOS_LABELS[e] ?? e}</option>
          ))}
        </select>

        <select
          value={filterPrograma}
          onChange={(e) => setFilterPrograma(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
        >
          <option value="todos">Todos los programas</option>
          {uniqueProgramas.map((p) => (
            <option key={p} value={p!}>{PROGRAMS[p!]?.label ?? p}</option>
          ))}
        </select>

        <select
          value={filterSalud}
          onChange={(e) => setFilterSalud(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
        >
          <option value="todos">Toda la salud</option>
          <option value="verde">Verde (80-100)</option>
          <option value="amarillo">Amarillo (50-79)</option>
          <option value="rojo">Rojo (0-49)</option>
        </select>
      </div>

      <DataTable
        data={filtered as unknown as Record<string, unknown>[]}
        columns={columns as { key: string; label: string; render?: (row: Record<string, unknown>) => React.ReactNode; sortable?: boolean }[]}
        searchKey={"nombre" as keyof Record<string, unknown>}
        searchPlaceholder="Buscar por nombre..."
        pageSize={25}
        onRowClick={(row) => router.push(`/clientes/${(row as unknown as Client).id}`)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
cd /c/Users/matyc/projects/lauti-crm
npm run build
```

- [ ] **Step 4: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/
git commit -m "feat: add clients list page with filters and DataTable"
```

---

### Task 3: Client Detail Page

**Files:**
- Create: `app/(dashboard)/clientes/[id]/page.tsx`, `app/(dashboard)/clientes/[id]/ClientDetailClient.tsx`
- Create: `app/api/clients/[id]/route.ts`

- [ ] **Step 1: Create server page `app/(dashboard)/clientes/[id]/page.tsx`**

```typescript
import { fetchClientById } from "@/lib/queries/clients";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import ClientDetailClient from "./ClientDetailClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const client = await fetchClientById(id);
  if (!client) notFound();

  return <ClientDetailClient client={client} session={session} />;
}
```

- [ ] **Step 2: Create client detail component `app/(dashboard)/clientes/[id]/ClientDetailClient.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Semaforo from "@/app/components/Semaforo";
import StatusBadge from "@/app/components/StatusBadge";
import KPICard from "@/app/components/KPICard";
import EmptyState from "@/app/components/EmptyState";
import type { ClientWithRelations } from "@/lib/queries/clients";
import type { AuthSession, SemanaEstado, FollowUpTipo } from "@/lib/types";
import { healthToSemaforo } from "@/lib/types";
import { PROGRAMS, CLIENT_ESTADOS_LABELS } from "@/lib/constants";
import { formatUSD, formatDate, daysUntil } from "@/lib/format";

type Tab = "overview" | "pagos" | "sesiones" | "seguimiento" | "followups" | "renovaciones";

interface Props {
  client: ClientWithRelations;
  session: AuthSession;
}

const SEMANA_LABELS: Record<string, string> = {
  primeras_publicaciones: "Primeras Publicaciones",
  primera_venta: "Primera Venta",
  escalando_anuncios: "Escalando Anuncios",
};

export default function ClientDetailClient({ client, session }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Follow-up form state
  const [fuTipo, setFuTipo] = useState<FollowUpTipo>("whatsapp");
  const [fuNotas, setFuNotas] = useState("");
  const [fuProxAccion, setFuProxAccion] = useState("");
  const [fuProxFecha, setFuProxFecha] = useState("");

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Resumen" },
    { key: "pagos", label: `Pagos (${client.payments.length})` },
    { key: "sesiones", label: `Sesiones (${client.sessions.length})` },
    { key: "seguimiento", label: "Seguimiento" },
    { key: "followups", label: `Follow-ups (${client.follow_ups.length})` },
    { key: "renovaciones", label: `Renovaciones (${client.renewals.length})` },
  ];

  const diasRestantes = (() => {
    if (!client.fecha_onboarding) return null;
    const off = new Date(client.fecha_onboarding);
    off.setDate(off.getDate() + client.total_dias_programa);
    return daysUntil(off.toISOString().split("T")[0]);
  })();

  async function handleSaveSemana(week: 1 | 2 | 3 | 4, estado: SemanaEstado | null, accionables: string | null) {
    setSaving(true);
    await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [`semana_${week}_estado`]: estado,
        [`semana_${week}_accionables`]: accionables,
      }),
    });
    setSaving(false);
    router.refresh();
  }

  async function handleSaveEstadoSeguimiento(estado: string) {
    setSaving(true);
    await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado_seguimiento: estado }),
    });
    setSaving(false);
    router.refresh();
  }

  async function handleAddFollowUp() {
    if (!fuNotas.trim()) return;
    setSaving(true);
    const res = await fetch("/api/followups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: client.id,
        tipo: fuTipo,
        notas: fuNotas,
        proxima_accion: fuProxAccion || undefined,
        proxima_fecha: fuProxFecha || undefined,
      }),
    });
    if (res.ok) {
      setShowFollowUpForm(false);
      setFuNotas("");
      setFuProxAccion("");
      setFuProxFecha("");
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.push("/clientes")} className="text-sm text-[var(--muted)] hover:text-white mb-2">
            &larr; Volver a clientes
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            {client.nombre}
            {client.pesadilla && <span title="Cliente pesadilla">💀</span>}
            {client.exito && <span title="Caso de exito">🌟</span>}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={client.estado} label={CLIENT_ESTADOS_LABELS[client.estado] ?? client.estado} />
            {client.programa && (
              <span className="text-sm text-[var(--muted)]">{PROGRAMS[client.programa]?.label ?? client.programa}</span>
            )}
            <Semaforo value={healthToSemaforo(client.health_score)} label={`Salud: ${client.health_score}`} />
          </div>
        </div>
        <div className="text-right">
          {diasRestantes !== null && (
            <p className={`text-lg font-bold ${diasRestantes <= 0 ? "text-[var(--red)]" : diasRestantes <= 15 ? "text-[var(--yellow)]" : "text-white"}`}>
              {diasRestantes <= 0 ? `Vencido (${Math.abs(diasRestantes)}d)` : `${diasRestantes} dias`}
            </p>
          )}
          <p className="text-xs text-[var(--muted)]">
            {client.fecha_onboarding ? `Onboarding: ${formatDate(client.fecha_onboarding)}` : "Sin onboarding"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--card-border)] overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? "border-[var(--purple)] text-[var(--purple-light)]"
                : "border-transparent text-[var(--muted)] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--muted)] uppercase">Datos Personales</h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-[var(--muted)]">Email:</span> <span className="text-white">{client.email || "---"}</span></p>
              <p><span className="text-[var(--muted)]">Telefono:</span> <span className="text-white">{client.telefono || "---"}</span></p>
              <p><span className="text-[var(--muted)]">Discord:</span> <span className="text-white">{client.discord ? "Si" : "No"}</span></p>
              <p><span className="text-[var(--muted)]">Skool:</span> <span className="text-white">{client.skool ? "Si" : "No"}</span></p>
              <p><span className="text-[var(--muted)]">Win Discord:</span> <span className="text-white">{client.win_discord ? "Si" : "No"}</span></p>
            </div>
          </div>

          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--muted)] uppercase">Programa</h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-[var(--muted)]">Programa:</span> <span className="text-white">{client.programa ? PROGRAMS[client.programa]?.label ?? client.programa : "---"}</span></p>
              <p><span className="text-[var(--muted)]">Duracion:</span> <span className="text-white">{client.total_dias_programa} dias</span></p>
              <p><span className="text-[var(--muted)]">Sesiones base:</span> <span className="text-white">{client.llamadas_base}</span></p>
              <p><span className="text-[var(--muted)]">Offboarding:</span> <span className="text-white">{formatDate(client.fecha_offboarding)}</span></p>
            </div>
          </div>

          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--muted)] uppercase">Sesiones 1a1</h3>
            {client.session_availability ? (
              <div className="space-y-1 text-sm">
                <p><span className="text-[var(--muted)]">Consumidas:</span> <span className="text-white">{client.session_availability.sesiones_consumidas}</span></p>
                <p><span className="text-[var(--muted)]">Disponibles:</span> <span className="text-white">{client.session_availability.sesiones_disponibles}</span></p>
                <Semaforo value={client.session_availability.semaforo} />
                {client.session_availability.rating_promedio !== null && (
                  <p><span className="text-[var(--muted)]">Rating promedio:</span> <span className="text-white">{client.session_availability.rating_promedio}/10</span></p>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">Sin datos de sesiones</p>
            )}
          </div>

          {/* Health score KPIs */}
          <KPICard label="Health Score" value={client.health_score} icon="💚" />
          <KPICard label="Pagos registrados" value={client.payments.length} icon="💳" />
          <KPICard label="Sesiones 1a1" value={client.sessions.length} icon="🎯" />
        </div>
      )}

      {tab === "pagos" && (
        <div className="space-y-4">
          {client.payments.length === 0 ? (
            <EmptyState message="Sin pagos registrados" icon="💳" />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--card-bg)]">
                    <th className="px-3 py-2 text-left text-xs text-[var(--muted)] font-medium">Cuota</th>
                    <th className="px-3 py-2 text-left text-xs text-[var(--muted)] font-medium">Monto USD</th>
                    <th className="px-3 py-2 text-left text-xs text-[var(--muted)] font-medium">Fecha Pago</th>
                    <th className="px-3 py-2 text-left text-xs text-[var(--muted)] font-medium">Vencimiento</th>
                    <th className="px-3 py-2 text-left text-xs text-[var(--muted)] font-medium">Estado</th>
                    <th className="px-3 py-2 text-left text-xs text-[var(--muted)] font-medium">Metodo</th>
                    <th className="px-3 py-2 text-left text-xs text-[var(--muted)] font-medium">Comprobante</th>
                  </tr>
                </thead>
                <tbody>
                  {client.payments.map((p) => {
                    const vencida = p.estado === "pendiente" && p.fecha_vencimiento && new Date(p.fecha_vencimiento) < new Date();
                    return (
                      <tr key={p.id} className="border-t border-[var(--card-border)]">
                        <td className="px-3 py-2 text-white">
                          #{p.numero_cuota} {p.es_renovacion && <span className="text-xs text-[var(--purple-light)]">(renovacion)</span>}
                        </td>
                        <td className="px-3 py-2 text-white">{formatUSD(p.monto_usd)}</td>
                        <td className="px-3 py-2">{formatDate(p.fecha_pago)}</td>
                        <td className={`px-3 py-2 ${vencida ? "text-[var(--red)]" : ""}`}>
                          {formatDate(p.fecha_vencimiento)}
                          {vencida && <span className="ml-1 text-xs">VENCIDA</span>}
                        </td>
                        <td className="px-3 py-2"><StatusBadge status={p.estado} /></td>
                        <td className="px-3 py-2 text-[var(--muted)]">{p.metodo_pago ?? "---"}</td>
                        <td className="px-3 py-2">
                          {p.comprobante_url ? (
                            <a href={p.comprobante_url} target="_blank" rel="noreferrer" className="text-[var(--purple-light)] hover:underline">Ver</a>
                          ) : (
                            <span className="text-[var(--muted)]">---</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "sesiones" && (
        <div className="space-y-4">
          {client.session_availability && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard label="Base" value={client.session_availability.llamadas_base} icon="📋" />
              <KPICard label="Consumidas" value={client.session_availability.sesiones_consumidas} icon="✅" />
              <KPICard label="Disponibles" value={client.session_availability.sesiones_disponibles} icon="🎯" />
              <KPICard label="Rating Prom." value={client.session_availability.rating_promedio ?? 0} icon="⭐" />
            </div>
          )}
          {client.sessions.length === 0 ? (
            <EmptyState message="Sin sesiones 1a1 registradas" icon="🎯" />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--card-bg)]">
                    <th className="px-3 py-2 text-left text-xs text-[var(--muted)] font-medium">#</th>
                    <th className="px-3 py-2 text-left text-xs text-[var(--muted)] font-medium">Fecha</th>
                    <th className="px-3 py-2 text-left text-xs text-[var(--muted)] font-medium">Tipo</th>
                    <th className="px-3 py-2 text-left text-xs text-[var(--muted)] font-medium">Estado</th>
                    <th className="px-3 py-2 text-left text-xs text-[var(--muted)] font-medium">Rating</th>
                    <th className="px-3 py-2 text-left text-xs text-[var(--muted)] font-medium">Upsell</th>
                    <th className="px-3 py-2 text-left text-xs text-[var(--muted)] font-medium">Follow-up</th>
                  </tr>
                </thead>
                <tbody>
                  {client.sessions.map((s) => (
                    <tr key={s.id} className="border-t border-[var(--card-border)]">
                      <td className="px-3 py-2 text-white">#{s.numero_sesion}</td>
                      <td className="px-3 py-2">{formatDate(s.fecha)}</td>
                      <td className="px-3 py-2 text-[var(--muted)]">{s.tipo_sesion.replace(/_/g, " ")}</td>
                      <td className="px-3 py-2"><StatusBadge status={s.estado} /></td>
                      <td className="px-3 py-2 text-white">{s.rating ?? "---"}</td>
                      <td className="px-3 py-2">{s.pitch_upsell ? <span className="text-[var(--green)]">Si</span> : "No"}</td>
                      <td className="px-3 py-2">{formatDate(s.follow_up_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "seguimiento" && (
        <div className="space-y-6">
          {/* Estado seguimiento */}
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--muted)] uppercase">Estado de Seguimiento</h3>
            <div className="flex gap-2">
              {(["para_seguimiento", "no_necesita", "seguimiento_urgente"] as const).map((e) => (
                <button
                  key={e}
                  onClick={() => handleSaveEstadoSeguimiento(e)}
                  disabled={saving}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    client.estado_seguimiento === e
                      ? "bg-[var(--purple)] text-white"
                      : "bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--purple)]"
                  }`}
                >
                  {e === "para_seguimiento" ? "Para seguimiento" : e === "no_necesita" ? "No necesita" : "Urgente"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <p><span className="text-[var(--muted)]">Ultimo seguimiento:</span> <span className="text-white">{formatDate(client.fecha_ultimo_seguimiento)}</span></p>
              <p><span className="text-[var(--muted)]">Proximo seguimiento:</span> <span className="text-white">{formatDate(client.fecha_proximo_seguimiento)}</span></p>
            </div>
          </div>

          {/* Semanas 1-4 */}
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--muted)] uppercase">Avance Semanal</h3>
            {([1, 2, 3, 4] as const).map((week) => {
              const estadoKey = `semana_${week}_estado` as keyof typeof client;
              const accKey = `semana_${week}_accionables` as keyof typeof client;
              const currentEstado = client[estadoKey] as SemanaEstado | null;
              const currentAcc = (client[accKey] as string) || "";

              return (
                <div key={week} className="border-b border-[var(--card-border)] pb-3 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">Semana {week}</span>
                    <div className="flex gap-1">
                      {(["primeras_publicaciones", "primera_venta", "escalando_anuncios"] as const).map((e) => (
                        <button
                          key={e}
                          onClick={() => handleSaveSemana(week, e, currentAcc)}
                          disabled={saving}
                          className={`px-2 py-0.5 rounded text-xs transition-colors ${
                            currentEstado === e
                              ? "bg-[var(--purple)] text-white"
                              : "bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--purple)]"
                          }`}
                        >
                          {SEMANA_LABELS[e]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    defaultValue={currentAcc}
                    onBlur={(e) => handleSaveSemana(week, currentEstado, e.target.value)}
                    placeholder="Accionables de la semana..."
                    className="w-full px-3 py-2 rounded-lg bg-black/20 border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none resize-none"
                    rows={2}
                  />
                </div>
              );
            })}
          </div>

          {/* Facturacion */}
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--muted)] uppercase">Facturacion Mensual</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {([1, 2, 3, 4] as const).map((mes) => (
                <div key={mes}>
                  <label className="text-[var(--muted)] text-xs">Mes {mes}</label>
                  <p className="text-white">{(client as Record<string, unknown>)[`facturacion_mes_${mes}`] as string || "---"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "followups" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowFollowUpForm(!showFollowUpForm)}
              className="px-4 py-2 rounded-lg bg-[var(--purple)] text-white text-sm hover:bg-[var(--purple-dark)] transition-colors"
            >
              + Agregar Follow-up
            </button>
          </div>

          {showFollowUpForm && (
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--muted)]">Tipo</label>
                  <select
                    value={fuTipo}
                    onChange={(e) => setFuTipo(e.target.value as FollowUpTipo)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-black/20 border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="llamada">Llamada</option>
                    <option value="dm">DM Instagram</option>
                    <option value="email">Email</option>
                    <option value="presencial">Presencial</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)]">Proxima Fecha</label>
                  <input
                    type="date"
                    value={fuProxFecha}
                    onChange={(e) => setFuProxFecha(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-black/20 border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--muted)]">Notas</label>
                <textarea
                  value={fuNotas}
                  onChange={(e) => setFuNotas(e.target.value)}
                  placeholder="Que paso en este seguimiento..."
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-black/20 border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted)]">Proxima Accion</label>
                <input
                  type="text"
                  value={fuProxAccion}
                  onChange={(e) => setFuProxAccion(e.target.value)}
                  placeholder="Que hay que hacer despues..."
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-black/20 border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowFollowUpForm(false)}
                  className="px-4 py-2 text-sm text-[var(--muted)] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddFollowUp}
                  disabled={saving || !fuNotas.trim()}
                  className="px-4 py-2 rounded-lg bg-[var(--purple)] text-white text-sm disabled:opacity-50 hover:bg-[var(--purple-dark)]"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          )}

          {client.follow_ups.length === 0 ? (
            <EmptyState message="Sin follow-ups registrados" icon="📝" />
          ) : (
            <div className="space-y-3">
              {client.follow_ups.map((fu) => (
                <div key={fu.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={fu.tipo} />
                      <span className="text-xs text-[var(--muted)]">{formatDate(fu.fecha)}</span>
                    </div>
                    <span className="text-xs text-[var(--muted)]">
                      por {(fu as Record<string, unknown> & { author?: { nombre: string } }).author?.nombre ?? "---"}
                    </span>
                  </div>
                  <p className="text-sm text-white">{fu.notas}</p>
                  {fu.proxima_accion && (
                    <p className="text-xs text-[var(--muted)] mt-2">
                      Proxima accion: <span className="text-[var(--purple-light)]">{fu.proxima_accion}</span>
                      {fu.proxima_fecha && ` — ${formatDate(fu.proxima_fecha)}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "renovaciones" && (
        <div className="space-y-4">
          {client.renewals.length === 0 ? (
            <EmptyState message="Sin historial de renovaciones" icon="♻️" />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--card-bg)]">
                    <th className="px-3 py-2 text-left text-xs text-[var(--muted)] font-medium">Fecha</th>
                    <th className="px-3 py-2 text-left text-xs text-[var(--muted)] font-medium">Tipo</th>
                    <th className="px-3 py-2 text-left text-xs text-[var(--muted)] font-medium">Programa Anterior</th>
                    <th className="px-3 py-2 text-left text-xs text-[var(--muted)] font-medium">Programa Nuevo</th>
                    <th className="px-3 py-2 text-left text-xs text-[var(--muted)] font-medium">Monto</th>
                    <th className="px-3 py-2 text-left text-xs text-[var(--muted)] font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {client.renewals.map((r) => (
                    <tr key={r.id} className="border-t border-[var(--card-border)]">
                      <td className="px-3 py-2">{formatDate(r.fecha_renovacion)}</td>
                      <td className="px-3 py-2 text-white">{r.tipo_renovacion?.replace(/_/g, " ") ?? "---"}</td>
                      <td className="px-3 py-2 text-[var(--muted)]">{r.programa_anterior ? PROGRAMS[r.programa_anterior]?.label ?? r.programa_anterior : "---"}</td>
                      <td className="px-3 py-2 text-white">{r.programa_nuevo ? PROGRAMS[r.programa_nuevo]?.label ?? r.programa_nuevo : "---"}</td>
                      <td className="px-3 py-2 text-white">{formatUSD(r.monto_total)}</td>
                      <td className="px-3 py-2"><StatusBadge status={r.estado ?? "---"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create API route `app/api/clients/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { clientUpdateSchema } from "@/lib/schemas";
import { updateClient } from "@/lib/queries/clients";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireSession();
    if ("error" in result) return result.error;

    const { id } = await params;
    const body = await req.json();
    const parsed = clientUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const client = await updateClient(id, parsed.data);
    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, client });
  } catch (err) {
    console.error("[PATCH /api/clients/:id]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify build**

```bash
cd /c/Users/matyc/projects/lauti-crm
npm run build
```

- [ ] **Step 5: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/ lib/
git commit -m "feat: add client detail page with tabs — payments, sessions, seguimiento, follow-ups, renewals"
```

---

### Task 4: Onboarding Form

**Files:**
- Create: `app/(dashboard)/form/onboarding/page.tsx`, `app/(dashboard)/form/onboarding/OnboardingForm.tsx`, `app/api/onboarding/route.ts`

- [ ] **Step 1: Create API route `app/api/onboarding/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { onboardingSchema } from "@/lib/schemas";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const result = await requireSession();
    if ("error" in result) return result.error;

    const body = await req.json();
    const parsed = onboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Create onboarding record
    const { data: onboarding, error: obErr } = await supabase
      .from("onboarding")
      .insert(parsed.data)
      .select()
      .single();

    if (obErr) {
      console.error("[POST /api/onboarding] insert", obErr);
      return NextResponse.json({ error: "Error creando onboarding" }, { status: 500 });
    }

    // Update client: set fecha_onboarding, discord, skool access flags
    const updateFields: Record<string, unknown> = {
      fecha_onboarding: parsed.data.fecha_ingreso,
    };
    if (parsed.data.discord_user) updateFields.discord = true;
    if (parsed.data.skool_user) updateFields.skool = true;
    if (parsed.data.email) updateFields.email = parsed.data.email;
    if (parsed.data.telefono) updateFields.telefono = parsed.data.telefono;

    const { error: updateErr } = await supabase
      .from("clients")
      .update(updateFields)
      .eq("id", parsed.data.client_id);

    if (updateErr) {
      console.error("[POST /api/onboarding] update client", updateErr);
      // Non-fatal: onboarding was created, client update failed
    }

    return NextResponse.json({ ok: true, onboarding });
  } catch (err) {
    console.error("[POST /api/onboarding]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create server page `app/(dashboard)/form/onboarding/page.tsx`**

```typescript
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import OnboardingForm from "./OnboardingForm";
import type { Client } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Fetch active clients without onboarding date for the dropdown
  const supabase = createServerClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, nombre, programa, lead_id")
    .is("fecha_onboarding", null)
    .eq("estado", "activo")
    .order("nombre");

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Formulario de Onboarding</h1>
      <p className="text-[var(--muted)]">Completar datos del alumno al ingresar al programa.</p>
      <OnboardingForm
        clients={(clients ?? []) as Pick<Client, "id" | "nombre" | "programa" | "lead_id">[]}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create client component `app/(dashboard)/form/onboarding/OnboardingForm.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Client } from "@/lib/types";
import { PROGRAMS } from "@/lib/constants";

interface Props {
  clients: Pick<Client, "id" | "nombre" | "programa" | "lead_id">[];
}

const REDES_OPTIONS = ["Instagram", "TikTok", "YouTube", "Facebook", "Twitter/X", "LinkedIn"];

export default function OnboardingForm({ clients }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [clientId, setClientId] = useState("");
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().split("T")[0]);
  const [edad, setEdad] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [discordUser, setDiscordUser] = useState("");
  const [skoolUser, setSkoolUser] = useState("");
  const [redesSociales, setRedesSociales] = useState("");
  const [redSocialOrigen, setRedSocialOrigen] = useState<string[]>([]);
  const [porqueCompro, setPorqueCompro] = useState("");
  const [victoriaRapida, setVictoriaRapida] = useState("");
  const [resultadoEsperado, setResultadoEsperado] = useState("");
  const [compromisoPagos, setCompromisoPagos] = useState(false);
  const [confirmoTerminos, setConfirmoTerminos] = useState(false);
  const [etapaEcommerce, setEtapaEcommerce] = useState("");
  const [topicoCompra, setTopicoCompra] = useState("");

  const selectedClient = clients.find((c) => c.id === clientId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) { setError("Selecciona un cliente"); return; }
    setSaving(true);
    setError("");

    const body: Record<string, unknown> = {
      client_id: clientId,
      lead_id: selectedClient?.lead_id || undefined,
      fecha_ingreso: fechaIngreso,
      edad: edad ? parseInt(edad) : undefined,
      email: email || undefined,
      telefono: telefono || undefined,
      discord_user: discordUser || undefined,
      skool_user: skoolUser || undefined,
      redes_sociales: redesSociales || undefined,
      red_social_origen: redSocialOrigen,
      porque_compro: porqueCompro || undefined,
      victoria_rapida: victoriaRapida || undefined,
      resultado_esperado: resultadoEsperado || undefined,
      compromiso_pagos: compromisoPagos,
      confirmo_terminos: confirmoTerminos,
      etapa_ecommerce: etapaEcommerce || undefined,
      topico_compra: topicoCompra || undefined,
    };

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push(`/clientes/${clientId}`), 1500);
    } else {
      const data = await res.json();
      setError(data.error || "Error al guardar");
    }
    setSaving(false);
  }

  function toggleRedOrigen(red: string) {
    setRedSocialOrigen((prev) =>
      prev.includes(red) ? prev.filter((r) => r !== red) : [...prev, red]
    );
  }

  if (success) {
    return (
      <div className="bg-[var(--green)]/10 border border-[var(--green)]/30 rounded-xl p-6 text-center">
        <p className="text-[var(--green)] font-bold text-lg">Onboarding guardado!</p>
        <p className="text-[var(--muted)] mt-1">Redirigiendo al perfil del cliente...</p>
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none";
  const labelCls = "block text-xs text-[var(--muted)] mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client selector */}
      <div>
        <label className={labelCls}>Cliente *</label>
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls} required>
          <option value="">Seleccionar cliente...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} {c.programa ? `— ${PROGRAMS[c.programa]?.label ?? c.programa}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Fecha de Ingreso *</label>
          <input type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className={labelCls}>Edad</label>
          <input type="number" value={edad} onChange={(e) => setEdad(e.target.value)} className={inputCls} min="15" max="99" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Telefono</label>
          <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Discord User</label>
          <input type="text" value={discordUser} onChange={(e) => setDiscordUser(e.target.value)} className={inputCls} placeholder="username#1234" />
        </div>
        <div>
          <label className={labelCls}>Skool User</label>
          <input type="text" value={skoolUser} onChange={(e) => setSkoolUser(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Redes Sociales (links)</label>
        <textarea value={redesSociales} onChange={(e) => setRedesSociales(e.target.value)} className={inputCls + " resize-none"} rows={2} placeholder="@instagram, tiktok.com/..." />
      </div>

      <div>
        <label className={labelCls}>Red Social de Origen</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {REDES_OPTIONS.map((red) => (
            <button
              key={red}
              type="button"
              onClick={() => toggleRedOrigen(red)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                redSocialOrigen.includes(red)
                  ? "bg-[var(--purple)] text-white"
                  : "bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--purple)]"
              }`}
            >
              {red}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Por que compro?</label>
        <textarea value={porqueCompro} onChange={(e) => setPorqueCompro(e.target.value)} className={inputCls + " resize-none"} rows={3} />
      </div>

      <div>
        <label className={labelCls}>Victoria rapida que busca</label>
        <textarea value={victoriaRapida} onChange={(e) => setVictoriaRapida(e.target.value)} className={inputCls + " resize-none"} rows={2} />
      </div>

      <div>
        <label className={labelCls}>Resultado esperado</label>
        <textarea value={resultadoEsperado} onChange={(e) => setResultadoEsperado(e.target.value)} className={inputCls + " resize-none"} rows={2} />
      </div>

      <div>
        <label className={labelCls}>Etapa de Ecommerce</label>
        <select value={etapaEcommerce} onChange={(e) => setEtapaEcommerce(e.target.value)} className={inputCls}>
          <option value="">Seleccionar...</option>
          <option value="cero">Desde cero</option>
          <option value="experiencia_sin_resultados">Tiene experiencia, sin resultados</option>
          <option value="experiencia_escalar">Tiene experiencia, quiere escalar</option>
        </select>
      </div>

      <div>
        <label className={labelCls}>Topico de compra</label>
        <input type="text" value={topicoCompra} onChange={(e) => setTopicoCompra(e.target.value)} className={inputCls} />
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
          <input type="checkbox" checked={compromisoPagos} onChange={(e) => setCompromisoPagos(e.target.checked)} className="accent-[var(--purple)]" />
          Compromiso de pagos
        </label>
        <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
          <input type="checkbox" checked={confirmoTerminos} onChange={(e) => setConfirmoTerminos(e.target.checked)} className="accent-[var(--purple)]" />
          Confirmo terminos
        </label>
      </div>

      {error && <p className="text-[var(--red)] text-sm">{error}</p>}

      <button
        type="submit"
        disabled={saving || !clientId}
        className="w-full p-3 rounded-lg bg-[var(--purple)] text-white font-semibold disabled:opacity-50 hover:bg-[var(--purple-dark)] transition-colors"
      >
        {saving ? "Guardando..." : "Guardar Onboarding"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/
git commit -m "feat: add onboarding form with API route — creates onboarding + updates client"
```

---

### Task 5: Tracker 1a1 Page

**Files:**
- Create: `app/(dashboard)/tracker/page.tsx`, `app/(dashboard)/tracker/TrackerClient.tsx`

- [ ] **Step 1: Create server page `app/(dashboard)/tracker/page.tsx`**

```typescript
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchSessions, fetchSessionAvailability } from "@/lib/queries/tracker";
import TrackerClient from "./TrackerClient";

export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [sessions, availability] = await Promise.all([
    fetchSessions(),
    fetchSessionAvailability(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Tracker 1a1</h1>
      <TrackerClient sessions={sessions} availability={availability} session={session} />
    </div>
  );
}
```

- [ ] **Step 2: Create client component `app/(dashboard)/tracker/TrackerClient.tsx`**

```typescript
"use client";

import { useState, useMemo } from "react";
import KPICard from "@/app/components/KPICard";
import DataTable from "@/app/components/DataTable";
import Semaforo from "@/app/components/Semaforo";
import StatusBadge from "@/app/components/StatusBadge";
import EmptyState from "@/app/components/EmptyState";
import SessionFormModal from "./SessionFormModal";
import type { TrackerSession, SessionAvailability, AuthSession } from "@/lib/types";
import { formatDate } from "@/lib/format";

type View = "table" | "calendar";

interface SessionWithClient extends TrackerSession {
  client?: { id: string; nombre: string; programa: string };
}

interface Props {
  sessions: SessionWithClient[];
  availability: SessionAvailability[];
  session: AuthSession;
}

const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function TrackerClient({ sessions, availability, session: authSession }: Props) {
  const [view, setView] = useState<View>("table");
  const [showModal, setShowModal] = useState(false);
  const [editSession, setEditSession] = useState<SessionWithClient | null>(null);
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());

  // KPIs
  const totalClients = availability.length;
  const totalAvail = availability.reduce((sum, a) => sum + Math.max(a.sesiones_disponibles, 0), 0);
  const totalConsumed = availability.reduce((sum, a) => sum + a.sesiones_consumidas, 0);
  const avgRating = (() => {
    const rated = sessions.filter((s) => s.rating !== null);
    return rated.length > 0 ? rated.reduce((sum, s) => sum + (s.rating ?? 0), 0) / rated.length : 0;
  })();

  // Alert cards: clients with 0 sessions
  const alertClients = availability.filter((a) => a.semaforo === "agotadas");

  // Calendar data
  const calendarSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (!s.fecha) return false;
      const d = new Date(s.fecha);
      return d.getMonth() === calMonth && d.getFullYear() === calYear;
    });
  }, [sessions, calMonth, calYear]);

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();

  const columns = [
    {
      key: "client_nombre",
      label: "Cliente",
      sortable: true,
      render: (row: SessionWithClient) => (
        <span className="font-medium text-white">{row.client?.nombre ?? "---"}</span>
      ),
    },
    {
      key: "numero_sesion",
      label: "Sesion #",
      sortable: true,
      render: (row: SessionWithClient) => <span className="text-white">#{row.numero_sesion}</span>,
    },
    {
      key: "fecha",
      label: "Fecha",
      sortable: true,
      render: (row: SessionWithClient) => formatDate(row.fecha),
    },
    {
      key: "tipo_sesion",
      label: "Tipo",
      render: (row: SessionWithClient) => (
        <span className="text-sm">{row.tipo_sesion.replace(/_/g, " ")}</span>
      ),
    },
    {
      key: "estado",
      label: "Estado",
      render: (row: SessionWithClient) => <StatusBadge status={row.estado} />,
    },
    {
      key: "rating",
      label: "Rating",
      sortable: true,
      render: (row: SessionWithClient) => (
        <span className={row.rating !== null ? (row.rating! >= 7 ? "text-[var(--green)]" : row.rating! >= 5 ? "text-[var(--yellow)]" : "text-[var(--red)]") : "text-[var(--muted)]"}>
          {row.rating ?? "---"}
        </span>
      ),
    },
    {
      key: "pitch_upsell",
      label: "Upsell",
      render: (row: SessionWithClient) => row.pitch_upsell ? <span className="text-[var(--green)]">Si</span> : <span className="text-[var(--muted)]">No</span>,
    },
    {
      key: "action_items",
      label: "Items",
      render: (row: SessionWithClient) => (
        <span className="text-[var(--muted)]">{Array.isArray(row.action_items) ? row.action_items.length : 0}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Clientes Activos" value={totalClients} icon="👥" />
        <KPICard label="Sesiones Disponibles" value={totalAvail} icon="🎯" />
        <KPICard label="Sesiones Consumidas" value={totalConsumed} icon="✅" />
        <KPICard label="Rating Promedio" value={Math.round(avgRating * 10) / 10} icon="⭐" />
      </div>

      {/* Alert cards */}
      {alertClients.length > 0 && (
        <div className="space-y-2">
          {alertClients.map((a) => (
            <div key={a.client_id} className="bg-[var(--red)]/10 border border-[var(--red)]/30 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <span className="text-white font-medium">{a.nombre}</span>
                <span className="text-[var(--red)] text-sm ml-2">tiene 0 sesiones disponibles</span>
              </div>
              <Semaforo value="agotadas" />
            </div>
          ))}
        </div>
      )}

      {/* View toggle + add button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-[var(--card-bg)] rounded-lg p-1 border border-[var(--card-border)]">
          <button
            onClick={() => setView("table")}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              view === "table" ? "bg-[var(--purple)] text-white" : "text-[var(--muted)] hover:text-white"
            }`}
          >
            Tabla
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              view === "calendar" ? "bg-[var(--purple)] text-white" : "text-[var(--muted)] hover:text-white"
            }`}
          >
            Calendario
          </button>
        </div>
        <button
          onClick={() => { setEditSession(null); setShowModal(true); }}
          className="px-4 py-2 rounded-lg bg-[var(--purple)] text-white text-sm hover:bg-[var(--purple-dark)] transition-colors"
        >
          + Nueva Sesion
        </button>
      </div>

      {/* Session availability per client */}
      <div className="overflow-x-auto">
        <div className="flex gap-2">
          {availability.map((a) => (
            <div key={a.client_id} className="min-w-[140px] bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-3">
              <p className="text-xs text-white font-medium truncate">{a.nombre}</p>
              <div className="flex items-center gap-1 mt-1">
                <Semaforo value={a.semaforo} />
                <span className="text-xs text-[var(--muted)]">{a.sesiones_consumidas}/{a.llamadas_base}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Views */}
      {view === "table" && (
        sessions.length === 0 ? (
          <EmptyState message="Sin sesiones registradas" icon="🎯" />
        ) : (
          <DataTable
            data={sessions as unknown as Record<string, unknown>[]}
            columns={columns as { key: string; label: string; render?: (row: Record<string, unknown>) => React.ReactNode; sortable?: boolean }[]}
            searchKey={"client_nombre" as keyof Record<string, unknown>}
            searchPlaceholder="Buscar por cliente..."
            pageSize={20}
            onRowClick={(row) => {
              setEditSession(row as unknown as SessionWithClient);
              setShowModal(true);
            }}
          />
        )
      )}

      {view === "calendar" && (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
                else setCalMonth(calMonth - 1);
              }}
              className="text-[var(--muted)] hover:text-white px-2"
            >
              &larr;
            </button>
            <span className="text-white font-semibold">{MONTHS_ES[calMonth]} {calYear}</span>
            <button
              onClick={() => {
                if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
                else setCalMonth(calMonth + 1);
              }}
              className="text-[var(--muted)] hover:text-white px-2"
            >
              &rarr;
            </button>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((d) => (
              <div key={d} className="text-center text-xs text-[var(--muted)] py-1">{d}</div>
            ))}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const daySessions = calendarSessions.filter((s) => s.fecha === dateStr);
              const isToday = dateStr === new Date().toISOString().split("T")[0];

              return (
                <div
                  key={day}
                  className={`min-h-[60px] rounded-lg p-1 text-xs ${
                    isToday ? "bg-[var(--purple)]/10 border border-[var(--purple)]/30" : "bg-black/20"
                  }`}
                >
                  <span className={`${isToday ? "text-[var(--purple-light)]" : "text-[var(--muted)]"}`}>{day}</span>
                  {daySessions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => { setEditSession(s); setShowModal(true); }}
                      className="mt-0.5 px-1 py-0.5 rounded bg-[var(--purple)]/20 text-[var(--purple-light)] truncate cursor-pointer hover:bg-[var(--purple)]/30"
                    >
                      {s.client?.nombre ?? "Sesion"}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Session form modal */}
      {showModal && (
        <SessionFormModal
          session={editSession}
          onClose={() => { setShowModal(false); setEditSession(null); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/
git commit -m "feat: add tracker 1a1 page — calendar/table views, KPI dashboard, session availability"
```

---

### Task 6: Create/Edit Session Form

**Files:**
- Create: `app/(dashboard)/tracker/SessionFormModal.tsx`, `app/api/tracker/route.ts`

- [ ] **Step 1: Create API route `app/api/tracker/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { sessionSchema } from "@/lib/schemas";
import { createSession, updateSession } from "@/lib/queries/tracker";

export async function POST(req: NextRequest) {
  try {
    const result = await requireSession();
    if ("error" in result) return result.error;

    const body = await req.json();
    const parsed = sessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const session = await createSession({
      ...parsed.data,
      assignee_id: parsed.data.assignee_id ?? null,
      enlace_llamada: parsed.data.enlace_llamada ?? null,
      notas_setup: parsed.data.notas_setup ?? null,
      rating: parsed.data.rating ?? null,
      aprendizaje_principal: parsed.data.aprendizaje_principal ?? null,
      feedback_cliente: parsed.data.feedback_cliente ?? null,
      herramienta_mas_util: parsed.data.herramienta_mas_util ?? null,
      follow_up_date: parsed.data.follow_up_date ?? null,
    } as Parameters<typeof createSession>[0]);

    if (!session) {
      return NextResponse.json({ error: "Error creando sesion" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, session });
  } catch (err) {
    console.error("[POST /api/tracker]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const result = await requireSession();
    if ("error" in result) return result.error;

    const body = await req.json();
    const { id, ...fields } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const parsed = sessionSchema.partial().safeParse(fields);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const session = await updateSession(id, parsed.data as Parameters<typeof updateSession>[1]);
    if (!session) {
      return NextResponse.json({ error: "Sesion no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, session });
  } catch (err) {
    console.error("[PATCH /api/tracker]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create modal `app/(dashboard)/tracker/SessionFormModal.tsx`**

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { TrackerSession, SessionTipo, SessionEstado } from "@/lib/types";

interface SessionWithClient extends TrackerSession {
  client?: { id: string; nombre: string; programa: string };
}

interface ActionItem {
  task: string;
  done: boolean;
}

interface Props {
  session: SessionWithClient | null; // null = create new
  onClose: () => void;
}

const TIPOS: { value: SessionTipo; label: string }[] = [
  { value: "estrategia_inicial", label: "Estrategia Inicial" },
  { value: "revision_ajuste", label: "Revision y Ajuste" },
  { value: "cierre_ciclo", label: "Cierre de Ciclo" },
  { value: "adicional", label: "Adicional" },
];

const ESTADOS: { value: SessionEstado; label: string }[] = [
  { value: "programada", label: "Programada" },
  { value: "done", label: "Completada" },
  { value: "cancelada_no_asistio", label: "Cancelada / No asistio" },
];

export default function SessionFormModal({ session, onClose }: Props) {
  const router = useRouter();
  const isEdit = session !== null;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Search clients for new session
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<{ id: string; nombre: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(session?.client_id ?? "");
  const [selectedClientName, setSelectedClientName] = useState(session?.client?.nombre ?? "");

  // Form fields
  const [fecha, setFecha] = useState(session?.fecha ?? new Date().toISOString().split("T")[0]);
  const [numeroSesion, setNumeroSesion] = useState(session?.numero_sesion ?? 1);
  const [tipoSesion, setTipoSesion] = useState<SessionTipo>(session?.tipo_sesion ?? "estrategia_inicial");
  const [estado, setEstado] = useState<SessionEstado>(session?.estado ?? "programada");
  const [notasSetup, setNotasSetup] = useState(session?.notas_setup ?? "");
  const [pitchUpsell, setPitchUpsell] = useState(session?.pitch_upsell ?? false);
  const [rating, setRating] = useState(session?.rating?.toString() ?? "");
  const [aprendizaje, setAprendizaje] = useState(session?.aprendizaje_principal ?? "");
  const [feedback, setFeedback] = useState(session?.feedback_cliente ?? "");
  const [actionItems, setActionItems] = useState<ActionItem[]>(
    Array.isArray(session?.action_items)
      ? (session!.action_items as ActionItem[])
      : []
  );
  const [followUpDate, setFollowUpDate] = useState(session?.follow_up_date ?? "");

  // Client search with debounce
  useEffect(() => {
    if (!clientSearch || clientSearch.length < 2 || isEdit) return;
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/clients/search?q=${encodeURIComponent(clientSearch)}`);
      if (res.ok) {
        const data = await res.json();
        setClientResults(data.clients ?? []);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch, isEdit]);

  function addActionItem() {
    setActionItems([...actionItems, { task: "", done: false }]);
  }

  function updateActionItem(index: number, field: keyof ActionItem, value: string | boolean) {
    const updated = [...actionItems];
    updated[index] = { ...updated[index], [field]: value };
    setActionItems(updated);
  }

  function removeActionItem(index: number) {
    setActionItems(actionItems.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClientId && !isEdit) { setError("Selecciona un cliente"); return; }
    setSaving(true);
    setError("");

    const body: Record<string, unknown> = {
      client_id: selectedClientId || session?.client_id,
      fecha,
      numero_sesion: numeroSesion,
      tipo_sesion: tipoSesion,
      estado,
      notas_setup: notasSetup || undefined,
      pitch_upsell: pitchUpsell,
      rating: rating ? parseInt(rating) : undefined,
      aprendizaje_principal: aprendizaje || undefined,
      feedback_cliente: feedback || undefined,
      action_items: actionItems.filter((ai) => ai.task.trim()),
      follow_up_date: followUpDate || undefined,
    };

    if (isEdit) body.id = session!.id;

    const res = await fetch("/api/tracker", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      onClose();
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Error al guardar");
    }
    setSaving(false);
  }

  const inputCls = "w-full px-3 py-2 rounded-lg bg-black/20 border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none";
  const labelCls = "block text-xs text-[var(--muted)] mb-1";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">
            {isEdit ? `Editar Sesion #${session!.numero_sesion}` : "Nueva Sesion 1a1"}
          </h2>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-white text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client selector (only for new) */}
          {!isEdit ? (
            <div>
              <label className={labelCls}>Cliente *</label>
              {selectedClientId ? (
                <div className="flex items-center gap-2">
                  <span className="text-white">{selectedClientName}</span>
                  <button type="button" onClick={() => { setSelectedClientId(""); setSelectedClientName(""); setClientSearch(""); }} className="text-[var(--muted)] hover:text-[var(--red)] text-xs">&times; Cambiar</button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Buscar cliente..."
                    className={inputCls}
                  />
                  {clientResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg z-10 max-h-40 overflow-y-auto">
                      {clientResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setSelectedClientId(c.id); setSelectedClientName(c.nombre); setClientResults([]); }}
                          className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5"
                        >
                          {c.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">Cliente: <span className="text-white">{session!.client?.nombre ?? session!.client_id}</span></p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Fecha *</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Sesion #</label>
              <input type="number" value={numeroSesion} onChange={(e) => setNumeroSesion(parseInt(e.target.value) || 1)} className={inputCls} min="1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tipo de Sesion</label>
              <select value={tipoSesion} onChange={(e) => setTipoSesion(e.target.value as SessionTipo)} className={inputCls}>
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select value={estado} onChange={(e) => setEstado(e.target.value as SessionEstado)} className={inputCls}>
                {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Notas de Setup</label>
            <textarea value={notasSetup} onChange={(e) => setNotasSetup(e.target.value)} className={inputCls + " resize-none"} rows={2} placeholder="Contexto antes de la sesion..." />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Rating (1-10)</label>
              <input type="number" value={rating} onChange={(e) => setRating(e.target.value)} className={inputCls} min="1" max="10" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer pb-2">
                <input type="checkbox" checked={pitchUpsell} onChange={(e) => setPitchUpsell(e.target.checked)} className="accent-[var(--purple)]" />
                Pitch Upsell
              </label>
            </div>
            <div>
              <label className={labelCls}>Follow-up</label>
              <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Aprendizaje Principal</label>
            <textarea value={aprendizaje} onChange={(e) => setAprendizaje(e.target.value)} className={inputCls + " resize-none"} rows={2} />
          </div>

          <div>
            <label className={labelCls}>Feedback del Cliente</label>
            <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} className={inputCls + " resize-none"} rows={2} />
          </div>

          {/* Action items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls}>Action Items</label>
              <button type="button" onClick={addActionItem} className="text-xs text-[var(--purple-light)] hover:text-white">+ Agregar</button>
            </div>
            <div className="space-y-2">
              {actionItems.map((ai, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={ai.done}
                    onChange={(e) => updateActionItem(i, "done", e.target.checked)}
                    className="accent-[var(--purple)]"
                  />
                  <input
                    type="text"
                    value={ai.task}
                    onChange={(e) => updateActionItem(i, "task", e.target.value)}
                    placeholder="Tarea..."
                    className={inputCls}
                  />
                  <button type="button" onClick={() => removeActionItem(i)} className="text-[var(--red)] hover:text-white text-sm">&times;</button>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-[var(--red)] text-sm">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-[var(--muted)] hover:text-white">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[var(--purple)] text-white text-sm disabled:opacity-50 hover:bg-[var(--purple-dark)]"
            >
              {saving ? "Guardando..." : isEdit ? "Actualizar" : "Crear Sesion"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create client search API endpoint for the modal's client selector**

Create `app/api/clients/search/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const result = await requireSession();
    if ("error" in result) return result.error;

    const q = req.nextUrl.searchParams.get("q") ?? "";
    if (q.length < 2) {
      return NextResponse.json({ clients: [] });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("clients")
      .select("id, nombre")
      .ilike("nombre", `%${q}%`)
      .eq("estado", "activo")
      .order("nombre")
      .limit(10);

    if (error) {
      console.error("[GET /api/clients/search]", error);
      return NextResponse.json({ clients: [] });
    }

    return NextResponse.json({ clients: data });
  } catch (err) {
    console.error("[GET /api/clients/search]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify build**

```bash
cd /c/Users/matyc/projects/lauti-crm
npm run build
```

- [ ] **Step 5: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/ lib/
git commit -m "feat: add session create/edit modal, tracker API routes, client search endpoint"
```

---

### Task 7: Seguimiento de Alumnos Page

**Files:**
- Create: `app/(dashboard)/seguimiento/page.tsx`, `app/(dashboard)/seguimiento/SeguimientoClient.tsx`, `app/api/followups/route.ts`

- [ ] **Step 1: Create follow-ups API route `app/api/followups/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { followUpSchema } from "@/lib/schemas";
import { createFollowUp } from "@/lib/queries/followups";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const result = await requireSession();
    if ("error" in result) return result.error;

    const body = await req.json();
    const parsed = followUpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const followUp = await createFollowUp({
      client_id: parsed.data.client_id,
      author_id: result.session.team_member_id,
      fecha: new Date().toISOString().split("T")[0],
      tipo: parsed.data.tipo,
      notas: parsed.data.notas,
      proxima_accion: parsed.data.proxima_accion ?? null,
      proxima_fecha: parsed.data.proxima_fecha ?? null,
    });

    if (!followUp) {
      return NextResponse.json({ error: "Error creando follow-up" }, { status: 500 });
    }

    // Update client's seguimiento dates
    const supabase = createServerClient();
    const updateFields: Record<string, unknown> = {
      fecha_ultimo_seguimiento: new Date().toISOString().split("T")[0],
    };
    if (parsed.data.proxima_fecha) {
      updateFields.fecha_proximo_seguimiento = parsed.data.proxima_fecha;
    }

    await supabase
      .from("clients")
      .update(updateFields)
      .eq("id", parsed.data.client_id);

    return NextResponse.json({ ok: true, followUp });
  } catch (err) {
    console.error("[POST /api/followups]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create server page `app/(dashboard)/seguimiento/page.tsx`**

```typescript
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchClients } from "@/lib/queries/clients";
import { createServerClient } from "@/lib/supabase-server";
import SeguimientoClient from "./SeguimientoClient";
import type { SessionAvailability } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SeguimientoPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const clients = await fetchClients();
  const activeClients = clients.filter((c) => c.estado === "activo");

  // Fetch session availability for all
  const supabase = createServerClient();
  const { data: availability } = await supabase
    .from("v_session_availability")
    .select("*");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Seguimiento de Alumnos</h1>
      <SeguimientoClient
        clients={activeClients}
        availability={(availability ?? []) as SessionAvailability[]}
        session={session}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create client component `app/(dashboard)/seguimiento/SeguimientoClient.tsx`**

```typescript
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Semaforo from "@/app/components/Semaforo";
import StatusBadge from "@/app/components/StatusBadge";
import EmptyState from "@/app/components/EmptyState";
import type { Client, SessionAvailability, AuthSession, FollowUpTipo, SeguimientoEstado } from "@/lib/types";
import { healthToSemaforo } from "@/lib/types";
import { PROGRAMS } from "@/lib/constants";
import { formatDate } from "@/lib/format";

type ViewMode = "queue" | "semanas";

interface Props {
  clients: Client[];
  availability: SessionAvailability[];
  session: AuthSession;
}

const SEMANA_LABELS: Record<string, string> = {
  primeras_publicaciones: "Publicaciones",
  primera_venta: "1ra Venta",
  escalando_anuncios: "Escalando",
};

function getPriority(client: Client): { level: number; label: string; color: string } {
  // Days since last follow-up
  const daysSince = client.fecha_ultimo_seguimiento
    ? Math.floor((Date.now() - new Date(client.fecha_ultimo_seguimiento).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (client.estado_seguimiento === "seguimiento_urgente" || (daysSince >= 7 && client.estado_seguimiento === "para_seguimiento")) {
    return { level: 0, label: "Urgente", color: "rojo" };
  }
  if (client.estado_seguimiento === "para_seguimiento") {
    return { level: 1, label: "Pendiente", color: "amarillo" };
  }
  return { level: 2, label: "Al dia", color: "verde" };
}

export default function SeguimientoClient({ clients, availability, session: authSession }: Props) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("queue");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Inline follow-up form state
  const [inlineFuClientId, setInlineFuClientId] = useState<string | null>(null);
  const [inlineFuTipo, setInlineFuTipo] = useState<FollowUpTipo>("whatsapp");
  const [inlineFuNotas, setInlineFuNotas] = useState("");
  const [inlineFuProxAccion, setInlineFuProxAccion] = useState("");
  const [inlineFuProxFecha, setInlineFuProxFecha] = useState("");

  // Availability map
  const availMap = useMemo(() => {
    const map: Record<string, SessionAvailability> = {};
    availability.forEach((a) => { map[a.client_id] = a; });
    return map;
  }, [availability]);

  // Sorted by priority
  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const pa = getPriority(a);
      const pb = getPriority(b);
      if (pa.level !== pb.level) return pa.level - pb.level;
      // Within same priority, sort by health score ascending (worse first)
      return a.health_score - b.health_score;
    });
  }, [clients]);

  async function handleAddInlineFollowUp() {
    if (!inlineFuClientId || !inlineFuNotas.trim()) return;
    setSaving(true);
    const res = await fetch("/api/followups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: inlineFuClientId,
        tipo: inlineFuTipo,
        notas: inlineFuNotas,
        proxima_accion: inlineFuProxAccion || undefined,
        proxima_fecha: inlineFuProxFecha || undefined,
      }),
    });
    if (res.ok) {
      setInlineFuClientId(null);
      setInlineFuNotas("");
      setInlineFuProxAccion("");
      setInlineFuProxFecha("");
      router.refresh();
    }
    setSaving(false);
  }

  async function handleRefreshScores() {
    setSaving(true);
    await fetch("/api/health-score/refresh", { method: "POST" });
    setSaving(false);
    router.refresh();
  }

  const inputCls = "w-full px-3 py-2 rounded-lg bg-black/20 border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none";

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-[var(--card-bg)] rounded-lg p-1 border border-[var(--card-border)]">
          <button
            onClick={() => setViewMode("queue")}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              viewMode === "queue" ? "bg-[var(--purple)] text-white" : "text-[var(--muted)] hover:text-white"
            }`}
          >
            Cola Prioridad
          </button>
          <button
            onClick={() => setViewMode("semanas")}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              viewMode === "semanas" ? "bg-[var(--purple)] text-white" : "text-[var(--muted)] hover:text-white"
            }`}
          >
            Vista Semanas
          </button>
        </div>
        {authSession.is_admin && (
          <button
            onClick={handleRefreshScores}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--muted)] text-sm hover:text-white hover:border-[var(--purple)] disabled:opacity-50"
          >
            {saving ? "Actualizando..." : "Refresh Scores"}
          </button>
        )}
      </div>

      {/* Priority Queue View */}
      {viewMode === "queue" && (
        <div className="space-y-3">
          {sortedClients.length === 0 ? (
            <EmptyState message="Sin alumnos activos" icon="📋" />
          ) : (
            sortedClients.map((client) => {
              const priority = getPriority(client);
              const avail = availMap[client.id];
              const isExpanded = expandedId === client.id;

              return (
                <div key={client.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
                  <div
                    className="p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5"
                    onClick={() => setExpandedId(isExpanded ? null : client.id)}
                  >
                    {/* Priority indicator */}
                    <Semaforo value={priority.color} label={priority.label} />

                    {/* Client info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">{client.nombre}</span>
                        <span className="text-xs text-[var(--muted)]">{client.programa ? PROGRAMS[client.programa]?.label : ""}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted)]">
                        <span>Ultimo: {formatDate(client.fecha_ultimo_seguimiento)}</span>
                        <span>Proximo: {formatDate(client.fecha_proximo_seguimiento)}</span>
                        {client.semana_1_estado && (
                          <span>S1: {SEMANA_LABELS[client.semana_1_estado] ?? client.semana_1_estado}</span>
                        )}
                      </div>
                    </div>

                    {/* Health + sessions */}
                    <Semaforo value={healthToSemaforo(client.health_score)} label={`${client.health_score}`} />
                    {avail && <Semaforo value={avail.semaforo} label={`${avail.sesiones_consumidas}/${avail.llamadas_base}`} />}

                    <span className="text-[var(--muted)]">{isExpanded ? "▲" : "▼"}</span>
                  </div>

                  {/* Expanded: timeline + inline follow-up */}
                  {isExpanded && (
                    <div className="border-t border-[var(--card-border)] p-4 space-y-4">
                      {/* Quick info */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-[var(--muted)] text-xs">Estado</span>
                          <p><StatusBadge status={client.estado} /></p>
                        </div>
                        <div>
                          <span className="text-[var(--muted)] text-xs">Seguimiento</span>
                          <p><StatusBadge status={client.estado_seguimiento} /></p>
                        </div>
                        <div>
                          <span className="text-[var(--muted)] text-xs">Contacto</span>
                          <p><StatusBadge status={client.estado_contacto} /></p>
                        </div>
                        <div>
                          <span className="text-[var(--muted)] text-xs">Onboarding</span>
                          <p className="text-white text-sm">{formatDate(client.fecha_onboarding)}</p>
                        </div>
                      </div>

                      {/* Semanas */}
                      <div className="grid grid-cols-4 gap-2">
                        {([1, 2, 3, 4] as const).map((w) => {
                          const est = client[`semana_${w}_estado` as keyof Client] as string | null;
                          return (
                            <div key={w} className="bg-black/20 rounded-lg p-2 text-center">
                              <span className="text-xs text-[var(--muted)]">Semana {w}</span>
                              <p className="text-sm text-white mt-1">{est ? SEMANA_LABELS[est] ?? est : "---"}</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/clientes/${client.id}`)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-sm text-[var(--muted)] hover:text-white hover:border-[var(--purple)]"
                        >
                          Ver perfil completo
                        </button>
                        <button
                          onClick={() => setInlineFuClientId(inlineFuClientId === client.id ? null : client.id)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--purple)] text-white text-sm hover:bg-[var(--purple-dark)]"
                        >
                          + Follow-up
                        </button>
                      </div>

                      {/* Inline follow-up form */}
                      {inlineFuClientId === client.id && (
                        <div className="bg-black/20 rounded-lg p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-[var(--muted)]">Tipo</label>
                              <select value={inlineFuTipo} onChange={(e) => setInlineFuTipo(e.target.value as FollowUpTipo)} className={inputCls}>
                                <option value="whatsapp">WhatsApp</option>
                                <option value="llamada">Llamada</option>
                                <option value="dm">DM</option>
                                <option value="email">Email</option>
                                <option value="presencial">Presencial</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-[var(--muted)]">Proxima Fecha</label>
                              <input type="date" value={inlineFuProxFecha} onChange={(e) => setInlineFuProxFecha(e.target.value)} className={inputCls} />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-[var(--muted)]">Notas *</label>
                            <textarea value={inlineFuNotas} onChange={(e) => setInlineFuNotas(e.target.value)} className={inputCls + " resize-none"} rows={2} placeholder="Que paso..." />
                          </div>
                          <div>
                            <label className="text-xs text-[var(--muted)]">Proxima Accion</label>
                            <input type="text" value={inlineFuProxAccion} onChange={(e) => setInlineFuProxAccion(e.target.value)} className={inputCls} placeholder="Que hacer despues..." />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setInlineFuClientId(null)} className="text-sm text-[var(--muted)]">Cancelar</button>
                            <button
                              onClick={handleAddInlineFollowUp}
                              disabled={saving || !inlineFuNotas.trim()}
                              className="px-4 py-1.5 rounded-lg bg-[var(--purple)] text-white text-sm disabled:opacity-50"
                            >
                              {saving ? "..." : "Guardar"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Semanas Grid View */}
      {viewMode === "semanas" && (
        <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--card-bg)]">
                <th className="px-3 py-2 text-left text-xs text-[var(--muted)] font-medium sticky left-0 bg-[var(--card-bg)] z-10">Alumno</th>
                <th className="px-3 py-2 text-center text-xs text-[var(--muted)] font-medium">Salud</th>
                <th className="px-3 py-2 text-center text-xs text-[var(--muted)] font-medium">Semana 1</th>
                <th className="px-3 py-2 text-center text-xs text-[var(--muted)] font-medium">Semana 2</th>
                <th className="px-3 py-2 text-center text-xs text-[var(--muted)] font-medium">Semana 3</th>
                <th className="px-3 py-2 text-center text-xs text-[var(--muted)] font-medium">Semana 4</th>
                <th className="px-3 py-2 text-center text-xs text-[var(--muted)] font-medium">Seguimiento</th>
              </tr>
            </thead>
            <tbody>
              {sortedClients.map((client) => (
                <tr
                  key={client.id}
                  className="border-t border-[var(--card-border)] cursor-pointer hover:bg-white/5"
                  onClick={() => router.push(`/clientes/${client.id}`)}
                >
                  <td className="px-3 py-2 sticky left-0 bg-[var(--card-bg)] z-10">
                    <span className="font-medium text-white">{client.nombre}</span>
                    <span className="text-xs text-[var(--muted)] ml-2">{client.programa ? PROGRAMS[client.programa]?.label : ""}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Semaforo value={healthToSemaforo(client.health_score)} label={`${client.health_score}`} />
                  </td>
                  {([1, 2, 3, 4] as const).map((w) => {
                    const est = client[`semana_${w}_estado` as keyof Client] as string | null;
                    return (
                      <td key={w} className="px-3 py-2 text-center">
                        {est ? (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                            est === "escalando_anuncios" ? "bg-[var(--green)]/15 text-[var(--green)]" :
                            est === "primera_venta" ? "bg-[var(--yellow)]/15 text-[var(--yellow)]" :
                            "bg-[var(--purple)]/15 text-[var(--purple-light)]"
                          }`}>
                            {SEMANA_LABELS[est] ?? est}
                          </span>
                        ) : (
                          <span className="text-[var(--muted)]">---</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center">
                    <StatusBadge status={client.estado_seguimiento} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
cd /c/Users/matyc/projects/lauti-crm
npm run build
```

- [ ] **Step 5: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/
git commit -m "feat: add seguimiento page — priority queue, semanas grid, inline follow-ups"
```

---

### Task 8: Health Score Display Integration

**Files:**
- Create: `app/api/health-score/refresh/route.ts`

- [ ] **Step 1: Create health score refresh API route `app/api/health-score/refresh/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase-server";

export async function POST() {
  try {
    const result = await requireAdmin();
    if ("error" in result) return result.error;

    const supabase = createServerClient();

    // Fetch all active client IDs
    const { data: clients, error: fetchErr } = await supabase
      .from("clients")
      .select("id")
      .eq("estado", "activo");

    if (fetchErr) {
      console.error("[POST /api/health-score/refresh] fetch clients", fetchErr);
      return NextResponse.json({ error: "Error obteniendo clientes" }, { status: 500 });
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json({ ok: true, updated: 0 });
    }

    // Update each client's health score using the SQL function
    // Batch via raw SQL for efficiency
    const ids = clients.map((c) => `'${c.id}'`).join(",");
    const { error: updateErr } = await supabase.rpc("exec_sql", {
      sql: `UPDATE clients SET health_score = calculate_health_score(id) WHERE id IN (${ids})`,
    });

    // Fallback: if rpc doesn't exist, do it one by one
    if (updateErr) {
      console.warn("[POST /api/health-score/refresh] rpc fallback, updating individually");
      let updated = 0;
      for (const client of clients) {
        const { data: score } = await supabase.rpc("calculate_health_score", {
          client_uuid: client.id,
        });
        if (score !== null && score !== undefined) {
          await supabase
            .from("clients")
            .update({ health_score: score })
            .eq("id", client.id);
          updated++;
        }
      }
      return NextResponse.json({ ok: true, updated });
    }

    return NextResponse.json({ ok: true, updated: clients.length });
  } catch (err) {
    console.error("[POST /api/health-score/refresh]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify health score semaforo appears in all relevant pages**

Checklist (all already implemented in previous tasks):
- Clients list (`ClientesClient.tsx`): health_score column with Semaforo + numeric value
- Client detail (`ClientDetailClient.tsx`): header has Semaforo with health_score, KPICard for score
- Seguimiento page (`SeguimientoClient.tsx`): each card shows health Semaforo, "Refresh Scores" button (admin only)
- Tracker page (`TrackerClient.tsx`): session availability semaforo per client

- [ ] **Step 3: Verify build**

```bash
cd /c/Users/matyc/projects/lauti-crm
npm run build
```

- [ ] **Step 4: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/
git commit -m "feat: add health score refresh API route — admin-only bulk recalculation"
```

---

## Phase 3 Complete

After all 8 tasks, the project has:
- Supabase queries layer: `lib/queries/clients.ts`, `tracker.ts`, `followups.ts`
- Zod schemas: `onboardingSchema`, `sessionSchema`, `clientUpdateSchema`
- **Clients list** page with search, filters (estado, programa, salud), DataTable, click-to-detail
- **Client detail** page with 6 tabs: overview, pagos, sesiones, seguimiento semanal, follow-ups timeline, renovaciones
- **Onboarding form** that creates onboarding record + updates client
- **Tracker 1a1** page with calendar/table toggle, KPI dashboard, session availability semaforo per client, alert cards for exhausted sessions
- **Session create/edit modal** with dynamic action items editor, client search, all session fields
- **Seguimiento de Alumnos** page with priority queue (urgente/pendiente/al dia), semanas grid view, inline follow-up form, admin-only score refresh
- **Health score refresh** API endpoint (admin-only, calls `calculate_health_score()` for all active clients)
- **6 API routes**: `/api/clients/[id]` (PATCH), `/api/clients/search` (GET), `/api/onboarding` (POST), `/api/tracker` (POST/PATCH), `/api/followups` (POST), `/api/health-score/refresh` (POST)

**Next:** Phase 4 (Pipeline, Cobranzas, Tesoreria) and Phase 5 (Analytics, Gamificacion, IG Metrics).
