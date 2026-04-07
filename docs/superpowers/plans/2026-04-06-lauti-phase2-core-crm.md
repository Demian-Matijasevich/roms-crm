# Lauti CRM Phase 2: Core CRM

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core CRM experience: data queries, leads table, lead detail, pipeline kanban, and all forms (llamada, pago, venta por chat, reporte setter).

**Architecture:** Server components fetch data via Supabase queries and pass it to `"use client"` components. API routes handle mutations with Zod validation and requireSession() auth. All queries use createServerClient() from lib/supabase-server.ts with types from lib/types.ts. File uploads go to Supabase Storage.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase JS v2, Zod

**Depends on:** Phase 1 (scaffold, DB, auth, types, constants, shared components)

---

## File Structure (Phase 2)

```
C:\Users\matyc\projects\lauti-crm\
├── lib/
│   └── queries/
│       ├── leads.ts                          # Lead queries
│       └── payments.ts                       # Payment queries
├── app/
│   ├── (dashboard)/
│   │   ├── llamadas/
│   │   │   ├── page.tsx                      # Server: fetch leads
│   │   │   └── LlamadasClient.tsx            # Client: table + filters
│   │   ├── pipeline/
│   │   │   ├── page.tsx                      # Server: fetch leads + team
│   │   │   ├── PipelineClient.tsx            # Client: kanban board
│   │   │   └── LeadDetailPanel.tsx           # Client: slide-over detail
│   │   └── form/
│   │       ├── llamada/
│   │       │   ├── page.tsx                  # Server: fetch leads
│   │       │   └── CargarLlamadaForm.tsx     # Client: multi-step form
│   │       ├── pago/
│   │       │   ├── page.tsx                  # Server: fetch leads/clients
│   │       │   └── CargarPagoForm.tsx        # Client: payment form
│   │       ├── venta-chat/
│   │       │   ├── page.tsx                  # Server: fetch team
│   │       │   └── VentaChatForm.tsx         # Client: quick sale form
│   │       └── reporte-setter/
│   │           ├── page.tsx                  # Server: get session
│   │           └── ReporteSetterForm.tsx     # Client: daily report form
│   └── api/
│       ├── llamadas/
│       │   └── route.ts                      # POST update lead + payment
│       ├── pagos/
│       │   └── route.ts                      # POST create payment
│       ├── venta-directa/
│       │   └── route.ts                      # POST create lead + payment
│       └── reporte-setter/
│           └── route.ts                      # POST create daily report
```

---

### Task 1: Supabase Data Queries

**Files:**
- Create: `lib/queries/leads.ts`
- Create: `lib/queries/payments.ts`

- [ ] **Step 1: Create leads query module**

Create `lib/queries/leads.ts`:

```typescript
import { createServerClient } from "@/lib/supabase-server";
import type { Lead, TeamMember } from "@/lib/types";

export interface LeadWithTeam extends Lead {
  setter: TeamMember | null;
  closer: TeamMember | null;
}

/**
 * Fetch all leads with setter/closer joined.
 * Ordered by created_at desc.
 */
export async function fetchLeads(): Promise<LeadWithTeam[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("leads")
    .select(`
      *,
      setter:team_members!leads_setter_id_fkey(*),
      closer:team_members!leads_closer_id_fkey(*)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchLeads]", error.message);
    return [];
  }
  return (data ?? []) as LeadWithTeam[];
}

/**
 * Fetch a single lead by ID with setter/closer.
 */
export async function fetchLeadById(id: string): Promise<LeadWithTeam | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("leads")
    .select(`
      *,
      setter:team_members!leads_setter_id_fkey(*),
      closer:team_members!leads_closer_id_fkey(*)
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("[fetchLeadById]", error.message);
    return null;
  }
  return data as LeadWithTeam;
}

/**
 * Fetch leads filtered by closer_id (for non-admin closers).
 */
export async function fetchLeadsByCloser(closerId: string): Promise<LeadWithTeam[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("leads")
    .select(`
      *,
      setter:team_members!leads_setter_id_fkey(*),
      closer:team_members!leads_closer_id_fkey(*)
    `)
    .eq("closer_id", closerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchLeadsByCloser]", error.message);
    return [];
  }
  return (data ?? []) as LeadWithTeam[];
}

/**
 * Fetch leads filtered by setter_id (for non-admin setters).
 */
export async function fetchLeadsBySetter(setterId: string): Promise<LeadWithTeam[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("leads")
    .select(`
      *,
      setter:team_members!leads_setter_id_fkey(*),
      closer:team_members!leads_closer_id_fkey(*)
    `)
    .eq("setter_id", setterId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchLeadsBySetter]", error.message);
    return [];
  }
  return (data ?? []) as LeadWithTeam[];
}

/**
 * Update a lead by ID. Returns the updated lead.
 */
export async function updateLead(
  id: string,
  updates: Partial<Omit<Lead, "id" | "created_at" | "updated_at" | "instagram_sin_arroba">>
): Promise<Lead | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[updateLead]", error.message);
    return null;
  }
  return data as Lead;
}

/**
 * Create a new lead. Returns the created lead.
 */
export async function createLead(
  lead: Omit<Lead, "id" | "created_at" | "updated_at" | "instagram_sin_arroba">
): Promise<Lead | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("leads")
    .insert(lead)
    .select()
    .single();

  if (error) {
    console.error("[createLead]", error.message);
    return null;
  }
  return data as Lead;
}

/**
 * Fetch all team members (for filter dropdowns).
 */
export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("activo", true)
    .order("nombre");

  if (error) {
    console.error("[fetchTeamMembers]", error.message);
    return [];
  }
  return (data ?? []) as TeamMember[];
}
```

- [ ] **Step 2: Create payments query module**

Create `lib/queries/payments.ts`:

```typescript
import { createServerClient } from "@/lib/supabase-server";
import type { Payment } from "@/lib/types";

/**
 * Fetch all payments ordered by fecha_pago desc.
 */
export async function fetchPayments(): Promise<Payment[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchPayments]", error.message);
    return [];
  }
  return (data ?? []) as Payment[];
}

/**
 * Fetch payments for a specific lead.
 */
export async function fetchPaymentsByLead(leadId: string): Promise<Payment[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("lead_id", leadId)
    .order("numero_cuota", { ascending: true });

  if (error) {
    console.error("[fetchPaymentsByLead]", error.message);
    return [];
  }
  return (data ?? []) as Payment[];
}

/**
 * Fetch payments for a specific client.
 */
export async function fetchPaymentsByClient(clientId: string): Promise<Payment[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("client_id", clientId)
    .order("numero_cuota", { ascending: true });

  if (error) {
    console.error("[fetchPaymentsByClient]", error.message);
    return [];
  }
  return (data ?? []) as Payment[];
}

/**
 * Create a new payment. Returns the created payment.
 */
export async function createPayment(
  payment: Omit<Payment, "id" | "created_at">
): Promise<Payment | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("payments")
    .insert(payment)
    .select()
    .single();

  if (error) {
    console.error("[createPayment]", error.message);
    return null;
  }
  return data as Payment;
}

/**
 * Upload a comprobante file to Supabase Storage.
 * Returns the public URL.
 */
export async function uploadComprobante(
  file: File,
  leadId: string
): Promise<string | null> {
  const supabase = createServerClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `comprobantes/${leadId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("comprobantes")
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("[uploadComprobante]", error.message);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from("comprobantes")
    .getPublicUrl(path);

  return urlData.publicUrl;
}
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add lib/queries/
git commit -m "feat: add Supabase query modules for leads and payments"
```

---

### Task 2: CRM Llamadas Page (Admin)

**Files:**
- Create: `app/(dashboard)/llamadas/page.tsx`
- Create: `app/(dashboard)/llamadas/LlamadasClient.tsx`

- [ ] **Step 1: Create server page**

Create `app/(dashboard)/llamadas/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { fetchLeads, fetchTeamMembers } from "@/lib/queries/leads";
import LlamadasClient from "./LlamadasClient";

export const dynamic = "force-dynamic";

export default async function LlamadasPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [leads, team] = await Promise.all([
    fetchLeads(),
    fetchTeamMembers(),
  ]);

  const closers = team.filter((t) => t.is_closer);
  const setters = team.filter((t) => t.is_setter);

  return (
    <LlamadasClient
      leads={leads}
      closers={closers}
      setters={setters}
      session={session}
    />
  );
}
```

- [ ] **Step 2: Create client component**

Create `app/(dashboard)/llamadas/LlamadasClient.tsx`:

```typescript
"use client";

import { useState, useMemo } from "react";
import type { TeamMember, AuthSession, LeadEstado, LeadScore } from "@/lib/types";
import type { LeadWithTeam } from "@/lib/queries/leads";
import { LEAD_ESTADOS_LABELS } from "@/lib/constants";
import { formatUSD, formatDate } from "@/lib/format";
import { getFiscalMonthOptions, getFiscalStart, getFiscalEnd } from "@/lib/date-utils";
import StatusBadge from "@/app/components/StatusBadge";
import DataTable from "@/app/components/DataTable";

interface Props {
  leads: LeadWithTeam[];
  closers: TeamMember[];
  setters: TeamMember[];
  session: AuthSession;
}

const SCORE_COLORS: Record<string, string> = {
  A: "bg-green-500/15 text-green-400 border-green-500/20",
  B: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  C: "bg-orange-400/15 text-orange-400 border-orange-400/20",
  D: "bg-red-500/15 text-red-400 border-red-500/20",
};

function LeadScoreBadge({ score }: { score: LeadScore | null }) {
  if (!score) return <span className="text-xs text-muted">--</span>;
  const color = SCORE_COLORS[score] || "bg-gray-500/15 text-gray-400 border-gray-500/20";
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${color}`}>
      {score}
    </span>
  );
}

export default function LlamadasClient({ leads, closers, setters, session }: Props) {
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [closerFilter, setCloserFilter] = useState<string>("todos");
  const [setterFilter, setSetterFilter] = useState<string>("todos");
  const [monthFilter, setMonthFilter] = useState<string>("todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const monthOptions = useMemo(() => getFiscalMonthOptions(12), []);

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesSearch =
          lead.nombre?.toLowerCase().includes(q) ||
          lead.instagram?.toLowerCase().includes(q) ||
          lead.email?.toLowerCase().includes(q) ||
          lead.telefono?.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Estado filter
      if (estadoFilter !== "todos" && lead.estado !== estadoFilter) return false;

      // Closer filter
      if (closerFilter !== "todos" && lead.closer_id !== closerFilter) return false;

      // Setter filter
      if (setterFilter !== "todos" && lead.setter_id !== setterFilter) return false;

      // Month filter (7-7)
      if (monthFilter !== "todos" && lead.fecha_llamada) {
        const llamadaDate = new Date(lead.fecha_llamada);
        const monthStart = new Date(monthFilter);
        const monthEnd = getFiscalEnd(monthStart);
        if (llamadaDate < monthStart || llamadaDate > monthEnd) return false;
      }

      return true;
    });
  }, [leads, search, estadoFilter, closerFilter, setterFilter, monthFilter]);

  const estadoOptions = Object.entries(LEAD_ESTADOS_LABELS);

  const inputClass =
    "bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--purple)]";
  const selectClass = inputClass;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Llamadas</h1>
        <p className="text-sm text-[var(--muted)]">
          {filtered.length} de {leads.length} leads
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre, IG, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} w-64`}
        />

        <select
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value)}
          className={selectClass}
        >
          <option value="todos">Todos los estados</option>
          {estadoOptions.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          value={closerFilter}
          onChange={(e) => setCloserFilter(e.target.value)}
          className={selectClass}
        >
          <option value="todos">Todos los closers</option>
          {closers.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>

        <select
          value={setterFilter}
          onChange={(e) => setSetterFilter(e.target.value)}
          className={selectClass}
        >
          <option value="todos">Todos los setters</option>
          {setters.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>

        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className={selectClass}
        >
          <option value="todos">Todos los meses</option>
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-left">
                <th className="px-4 py-3 text-[var(--muted)] font-medium">Nombre</th>
                <th className="px-4 py-3 text-[var(--muted)] font-medium">Instagram</th>
                <th className="px-4 py-3 text-[var(--muted)] font-medium">Fecha</th>
                <th className="px-4 py-3 text-[var(--muted)] font-medium">Estado</th>
                <th className="px-4 py-3 text-[var(--muted)] font-medium">Closer</th>
                <th className="px-4 py-3 text-[var(--muted)] font-medium">Setter</th>
                <th className="px-4 py-3 text-[var(--muted)] font-medium text-right">Ticket</th>
                <th className="px-4 py-3 text-[var(--muted)] font-medium text-center">Score</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[var(--muted)]">
                    No se encontraron leads con esos filtros.
                  </td>
                </tr>
              )}
              {filtered.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                  className="border-b border-[var(--card-border)] hover:bg-[var(--purple)]/5 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                    {lead.nombre || "Sin nombre"}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {lead.instagram ? `@${lead.instagram.replace(/^@/, "")}` : "---"}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {formatDate(lead.fecha_llamada)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={LEAD_ESTADOS_LABELS[lead.estado] || lead.estado}
                      variant={
                        lead.estado === "cerrado" ? "success" :
                        lead.estado === "seguimiento" || lead.estado === "reprogramada" || lead.estado === "reserva" ? "warning" :
                        lead.estado === "pendiente" ? "info" : "danger"
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {lead.closer?.nombre || "---"}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {lead.setter?.nombre || "---"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {lead.ticket_total > 0 ? formatUSD(lead.ticket_total) : "---"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <LeadScoreBadge score={lead.lead_score} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded Lead Detail (inline) */}
      {expandedId && (() => {
        const lead = filtered.find((l) => l.id === expandedId);
        if (!lead) return null;
        return (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">{lead.nombre}</h3>
              <button
                onClick={() => setExpandedId(null)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] text-lg"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[var(--muted)] text-xs mb-0.5">Email</p>
                <p>{lead.email || "---"}</p>
              </div>
              <div>
                <p className="text-[var(--muted)] text-xs mb-0.5">Telefono</p>
                <p>{lead.telefono || "---"}</p>
              </div>
              <div>
                <p className="text-[var(--muted)] text-xs mb-0.5">Fuente</p>
                <p>{lead.fuente || "---"}</p>
              </div>
              <div>
                <p className="text-[var(--muted)] text-xs mb-0.5">Programa</p>
                <p>{lead.programa_pitcheado || "---"}</p>
              </div>
              <div>
                <p className="text-[var(--muted)] text-xs mb-0.5">Plan de pago</p>
                <p>{lead.plan_pago || "---"}</p>
              </div>
              <div>
                <p className="text-[var(--muted)] text-xs mb-0.5">Calificado</p>
                <p>{lead.lead_calificado || "---"}</p>
              </div>
              <div>
                <p className="text-[var(--muted)] text-xs mb-0.5">Decisor</p>
                <p>{lead.decisor || "---"}</p>
              </div>
              <div>
                <p className="text-[var(--muted)] text-xs mb-0.5">Experiencia ecommerce</p>
                <p>{lead.experiencia_ecommerce || "---"}</p>
              </div>
            </div>

            {(lead.contexto_setter || lead.reporte_general || lead.notas_internas) && (
              <div className="space-y-3 pt-3 border-t border-[var(--card-border)]">
                {lead.contexto_setter && (
                  <div>
                    <p className="text-xs text-[var(--muted)] mb-1">Contexto setter</p>
                    <p className="text-sm leading-relaxed">{lead.contexto_setter}</p>
                  </div>
                )}
                {lead.reporte_general && (
                  <div>
                    <p className="text-xs text-[var(--muted)] mb-1">Reporte general</p>
                    <p className="text-sm leading-relaxed">{lead.reporte_general}</p>
                  </div>
                )}
                {lead.notas_internas && (
                  <div>
                    <p className="text-xs text-[var(--muted)] mb-1">Notas internas</p>
                    <p className="text-sm leading-relaxed">{lead.notas_internas}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <a
                href="/form/llamada"
                className="text-sm font-medium bg-[var(--purple)] hover:bg-[var(--purple-dark)] text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cargar resultado
              </a>
              <a
                href={`/pipeline`}
                className="text-sm font-medium border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--muted)] px-4 py-2 rounded-lg transition-colors"
              >
                Ver en pipeline
              </a>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/\(dashboard\)/llamadas/
git commit -m "feat: add Llamadas page with DataTable, filters, and inline detail"
```

---

### Task 3: Lead Detail Panel (Slide-over)

**Files:**
- Create: `app/(dashboard)/pipeline/LeadDetailPanel.tsx`

- [ ] **Step 1: Create lead detail slide-over component**

Create `app/(dashboard)/pipeline/LeadDetailPanel.tsx`:

```typescript
"use client";

import { useState } from "react";
import type { LeadWithTeam } from "@/lib/queries/leads";
import type { Payment, LeadEstado } from "@/lib/types";
import { LEAD_ESTADOS_LABELS } from "@/lib/constants";
import { formatUSD, formatDate } from "@/lib/format";
import StatusBadge from "@/app/components/StatusBadge";

interface Props {
  lead: LeadWithTeam;
  payments: Payment[];
  onClose: () => void;
  onEstadoChange?: (leadId: string, newEstado: LeadEstado) => void;
}

const SCORE_COLORS: Record<string, string> = {
  A: "bg-green-500/20 text-green-400 border-green-500/30",
  B: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  C: "bg-orange-400/20 text-orange-400 border-orange-400/30",
  D: "bg-red-500/20 text-red-400 border-red-500/30",
};

const QUICK_ESTADOS: LeadEstado[] = [
  "pendiente", "seguimiento", "cerrado", "no_cierre", "no_show", "cancelada",
];

export default function LeadDetailPanel({ lead, payments, onClose, onEstadoChange }: Props) {
  const [changingEstado, setChangingEstado] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(lead.notas_internas || "");
  const [showNoteEditor, setShowNoteEditor] = useState(false);

  async function handleEstadoChange(newEstado: LeadEstado) {
    if (!onEstadoChange) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/llamadas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          estado: newEstado,
        }),
      });
      if (res.ok) {
        onEstadoChange(lead.id, newEstado);
        setChangingEstado(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotes() {
    setSaving(true);
    try {
      const res = await fetch(`/api/llamadas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          notas_internas: notes,
        }),
      });
      if (res.ok) {
        setShowNoteEditor(false);
      }
    } finally {
      setSaving(false);
    }
  }

  const scoreColor = lead.lead_score
    ? SCORE_COLORS[lead.lead_score] || ""
    : "";

  const totalCash = payments
    .filter((p) => p.estado === "pagado")
    .reduce((sum, p) => sum + p.monto_usd, 0);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[var(--card-bg)] border-l border-[var(--card-border)] shadow-2xl z-50 overflow-y-auto">
        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">{lead.nombre || "Sin nombre"}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <StatusBadge
                  label={LEAD_ESTADOS_LABELS[lead.estado] || lead.estado}
                  variant={
                    lead.estado === "cerrado" ? "success" :
                    lead.estado === "seguimiento" || lead.estado === "reserva" ? "warning" :
                    lead.estado === "pendiente" ? "info" : "danger"
                  }
                />
                {lead.lead_score && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${scoreColor}`}>
                    {lead.lead_score}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[var(--muted)] hover:text-[var(--foreground)] text-2xl leading-none p-1 shrink-0"
            >
              &times;
            </button>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[var(--muted)] text-xs mb-0.5">Instagram</p>
              <p className="truncate">
                {lead.instagram ? `@${lead.instagram.replace(/^@/, "")}` : "---"}
              </p>
            </div>
            <div>
              <p className="text-[var(--muted)] text-xs mb-0.5">Email</p>
              <p className="truncate">{lead.email || "---"}</p>
            </div>
            <div>
              <p className="text-[var(--muted)] text-xs mb-0.5">Telefono</p>
              <p className="truncate">{lead.telefono || "---"}</p>
            </div>
            <div>
              <p className="text-[var(--muted)] text-xs mb-0.5">Closer / Setter</p>
              <p className="truncate">
                {lead.closer?.nombre || "---"} / {lead.setter?.nombre || "---"}
              </p>
            </div>
          </div>

          {/* Lead Details */}
          <div className="bg-[#111113] rounded-lg border border-[var(--card-border)] p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--muted)]">Detalle</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Programa" value={lead.programa_pitcheado || undefined} />
              <InfoRow label="Ticket total" value={lead.ticket_total > 0 ? formatUSD(lead.ticket_total) : undefined} />
              <InfoRow label="Plan de pago" value={lead.plan_pago || undefined} />
              <InfoRow label="Fuente" value={lead.fuente || undefined} />
              <InfoRow label="Calificado" value={lead.lead_calificado || undefined} />
              <InfoRow label="Experiencia ecommerce" value={lead.experiencia_ecommerce || undefined} />
              <InfoRow label="Dispuesto a invertir" value={lead.dispuesto_invertir || undefined} />
              <InfoRow label="Decisor" value={lead.decisor || undefined} />
              <InfoRow label="Fecha agendado" value={lead.fecha_agendado ? formatDate(lead.fecha_agendado) : undefined} />
              <InfoRow label="Fecha llamada" value={lead.fecha_llamada ? formatDate(lead.fecha_llamada) : undefined} />
            </div>
          </div>

          {/* Contexto */}
          {lead.contexto_setter && (
            <div className="bg-[#111113] rounded-lg border border-[var(--card-border)] p-4">
              <h3 className="text-sm font-semibold text-[var(--muted)] mb-2">Contexto Setter</h3>
              <p className="text-sm leading-relaxed">{lead.contexto_setter}</p>
            </div>
          )}

          {lead.reporte_general && (
            <div className="bg-[#111113] rounded-lg border border-[var(--card-border)] p-4">
              <h3 className="text-sm font-semibold text-[var(--muted)] mb-2">Reporte General</h3>
              <p className="text-sm leading-relaxed">{lead.reporte_general}</p>
            </div>
          )}

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="bg-[#111113] rounded-lg border border-[var(--card-border)] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--muted)]">Pagos</h3>
                <span className="text-sm font-mono text-green-400">
                  {formatUSD(totalCash)} cobrado
                </span>
              </div>
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        p.estado === "pagado" ? "bg-green-400" :
                        p.estado === "perdido" ? "bg-red-400" : "bg-yellow-400"
                      }`} />
                      <span>Cuota {p.numero_cuota}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--muted)]">{formatDate(p.fecha_pago)}</span>
                      <span className="font-mono">{formatUSD(p.monto_usd)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Estado Change */}
          {!changingEstado ? (
            <button
              onClick={() => setChangingEstado(true)}
              className="w-full text-sm font-medium border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--muted)] py-2 rounded-lg transition-colors"
            >
              Cambiar estado
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-[var(--muted)]">Seleccionar nuevo estado:</p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ESTADOS.map((e) => (
                  <button
                    key={e}
                    onClick={() => handleEstadoChange(e)}
                    disabled={saving || e === lead.estado}
                    className={`text-xs py-2 rounded-lg border transition-colors ${
                      e === lead.estado
                        ? "border-[var(--purple)] bg-[var(--purple)]/10 text-[var(--purple)] cursor-default"
                        : "border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--purple)]/50 hover:text-[var(--foreground)]"
                    } disabled:opacity-50`}
                  >
                    {LEAD_ESTADOS_LABELS[e] || e}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setChangingEstado(false)}
                className="w-full text-xs text-[var(--muted)] hover:text-[var(--foreground)] py-1"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Notes Editor */}
          {!showNoteEditor ? (
            <button
              onClick={() => setShowNoteEditor(true)}
              className="w-full text-sm font-medium border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--muted)] py-2 rounded-lg transition-colors"
            >
              {lead.notas_internas ? "Editar notas" : "Agregar notas"}
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Notas internas..."
                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--purple)] resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNoteEditor(false)}
                  className="flex-1 text-xs border border-[var(--card-border)] text-[var(--muted)] py-2 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={saving}
                  className="flex-1 text-xs bg-[var(--purple)] text-white py-2 rounded-lg disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar notas"}
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2">
            <a
              href="/form/llamada"
              className="flex-1 text-center text-sm font-medium bg-[var(--purple)] hover:bg-[var(--purple)]/80 text-white px-3 py-2 rounded-lg transition-colors"
            >
              Cargar resultado
            </a>
            <a
              href="/form/pago"
              className="flex-1 text-center text-sm font-medium border border-green-500 text-green-400 hover:bg-green-500/10 px-3 py-2 rounded-lg transition-colors"
            >
              Cargar pago
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-[var(--muted)] shrink-0">{label}</span>
      <span className="text-[var(--foreground)] text-right">{value}</span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/\(dashboard\)/pipeline/LeadDetailPanel.tsx
git commit -m "feat: add LeadDetailPanel slide-over with payments, estado change, notes"
```

---

### Task 4: Pipeline Kanban

**Files:**
- Create: `app/(dashboard)/pipeline/page.tsx`
- Create: `app/(dashboard)/pipeline/PipelineClient.tsx`

- [ ] **Step 1: Create server page**

Create `app/(dashboard)/pipeline/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { fetchLeads, fetchLeadsByCloser, fetchTeamMembers } from "@/lib/queries/leads";
import { fetchPayments } from "@/lib/queries/payments";
import PipelineClient from "./PipelineClient";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const isAdmin = session.is_admin;

  const [allLeads, payments, team] = await Promise.all([
    isAdmin ? fetchLeads() : fetchLeadsByCloser(session.team_member_id),
    fetchPayments(),
    fetchTeamMembers(),
  ]);

  const closers = team.filter((t) => t.is_closer);
  const setters = team.filter((t) => t.is_setter);

  // Build a payments lookup by lead_id
  const paymentsByLead: Record<string, typeof payments> = {};
  for (const p of payments) {
    if (p.lead_id) {
      if (!paymentsByLead[p.lead_id]) paymentsByLead[p.lead_id] = [];
      paymentsByLead[p.lead_id].push(p);
    }
  }

  return (
    <PipelineClient
      leads={allLeads}
      paymentsByLead={paymentsByLead}
      closers={closers}
      setters={setters}
      session={session}
      isAdmin={isAdmin}
    />
  );
}
```

- [ ] **Step 2: Create pipeline kanban client component**

Create `app/(dashboard)/pipeline/PipelineClient.tsx`:

```typescript
"use client";

import { useState, useMemo } from "react";
import type { AuthSession, TeamMember, Payment, LeadEstado, LeadScore } from "@/lib/types";
import type { LeadWithTeam } from "@/lib/queries/leads";
import { LEAD_ESTADOS_LABELS, PROGRAMS } from "@/lib/constants";
import { formatUSD } from "@/lib/format";
import { getFiscalMonthOptions, getFiscalStart, getFiscalEnd } from "@/lib/date-utils";
import LeadDetailPanel from "./LeadDetailPanel";

interface Props {
  leads: LeadWithTeam[];
  paymentsByLead: Record<string, Payment[]>;
  closers: TeamMember[];
  setters: TeamMember[];
  session: AuthSession;
  isAdmin: boolean;
}

const SCORE_COLORS: Record<string, string> = {
  A: "bg-green-500/20 text-green-400 border-green-500/30",
  B: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  C: "bg-orange-400/20 text-orange-400 border-orange-400/30",
  D: "bg-red-500/20 text-red-400 border-red-500/30",
};

type Column = {
  key: string;
  title: string;
  emoji: string;
  headerColor: string;
  borderColor: string;
  matchEstados: LeadEstado[];
};

const COLUMNS: Column[] = [
  {
    key: "pendiente",
    title: "Pendiente",
    emoji: "hourglass",
    headerColor: "bg-purple-500/20 text-purple-300",
    borderColor: "border-purple-500/30",
    matchEstados: ["pendiente", "reprogramada"],
  },
  {
    key: "seguimiento",
    title: "Seguimiento",
    emoji: "arrows_counterclockwise",
    headerColor: "bg-yellow-500/20 text-yellow-400",
    borderColor: "border-yellow-500/30",
    matchEstados: ["seguimiento", "reserva", "adentro_seguimiento"],
  },
  {
    key: "cerrado",
    title: "Cerrado",
    emoji: "rocket",
    headerColor: "bg-green-500/20 text-green-400",
    borderColor: "border-green-500/30",
    matchEstados: ["cerrado"],
  },
  {
    key: "perdido",
    title: "Perdido",
    emoji: "x",
    headerColor: "bg-red-500/20 text-red-400",
    borderColor: "border-red-500/30",
    matchEstados: ["no_show", "cancelada", "no_calificado", "no_cierre", "broke_cancelado"],
  },
];

function classifyLead(estado: LeadEstado): string {
  for (const col of COLUMNS) {
    if (col.matchEstados.includes(estado)) return col.key;
  }
  return "pendiente";
}

function LeadScoreBadge({ score }: { score: LeadScore | null }) {
  if (!score) return null;
  const color = SCORE_COLORS[score] || "bg-gray-500/15 text-gray-400 border-gray-500/20";
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${color}`}>
      {score}
    </span>
  );
}

export default function PipelineClient({
  leads,
  paymentsByLead,
  closers,
  setters,
  session,
  isAdmin,
}: Props) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [closerFilter, setCloserFilter] = useState<string>("todos");
  const [setterFilter, setSetterFilter] = useState<string>("todos");
  const [monthFilter, setMonthFilter] = useState<string>("todos");

  const monthOptions = useMemo(() => getFiscalMonthOptions(12), []);

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      if (closerFilter !== "todos" && lead.closer_id !== closerFilter) return false;
      if (setterFilter !== "todos" && lead.setter_id !== setterFilter) return false;

      if (monthFilter !== "todos" && lead.fecha_llamada) {
        const llamadaDate = new Date(lead.fecha_llamada);
        const monthStart = new Date(monthFilter);
        const monthEnd = getFiscalEnd(monthStart);
        if (llamadaDate < monthStart || llamadaDate > monthEnd) return false;
      }

      return true;
    });
  }, [leads, closerFilter, setterFilter, monthFilter]);

  const buckets = useMemo(() => {
    const map: Record<string, LeadWithTeam[]> = {
      pendiente: [],
      seguimiento: [],
      cerrado: [],
      perdido: [],
    };
    for (const lead of filtered) {
      const key = classifyLead(lead.estado);
      map[key].push(lead);
    }
    return map;
  }, [filtered]);

  const selectedLead = selectedLeadId
    ? leads.find((l) => l.id === selectedLeadId) || null
    : null;

  function handleEstadoChange(leadId: string, newEstado: LeadEstado) {
    // Optimistic: we'd need a state setter. For now, close the panel.
    setSelectedLeadId(null);
  }

  const selectClass =
    "bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--purple)]";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">{isAdmin ? "Pipeline" : "Mi Pipeline"}</h1>
          <p className="text-sm text-[var(--muted)]">{filtered.length} leads en total</p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <select
              value={closerFilter}
              onChange={(e) => setCloserFilter(e.target.value)}
              className={selectClass}
            >
              <option value="todos">Todos los closers</option>
              {closers.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>

            <select
              value={setterFilter}
              onChange={(e) => setSetterFilter(e.target.value)}
              className={selectClass}
            >
              <option value="todos">Todos los setters</option>
              {setters.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>

            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className={selectClass}
            >
              <option value="todos">Todos los meses</option>
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const items = buckets[col.key];
          return (
            <div key={col.key} className="flex flex-col">
              {/* Column Header */}
              <div className={`rounded-t-lg px-3 py-2 ${col.headerColor} border ${col.borderColor} border-b-0`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{col.title}</span>
                  <span className="text-xs font-mono opacity-80">{items.length}</span>
                </div>
              </div>

              {/* Cards Container */}
              <div className={`flex-1 border ${col.borderColor} border-t-0 rounded-b-lg bg-[var(--card-bg)]/30 p-2 space-y-2 max-h-[70vh] overflow-y-auto`}>
                {items.length === 0 && (
                  <p className="text-xs text-[var(--muted)] text-center py-6">Sin leads</p>
                )}
                {items.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className="w-full text-left bg-[#0d0d0f] border border-[var(--card-border)] rounded-lg p-3 hover:border-[var(--purple)]/40 hover:bg-[#111113] transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm truncate">{lead.nombre || "Sin nombre"}</p>
                      <LeadScoreBadge score={lead.lead_score} />
                    </div>

                    {/* Programa + ticket */}
                    {lead.programa_pitcheado && (
                      <p className="text-[10px] text-[var(--muted)] mt-1">
                        {PROGRAMS[lead.programa_pitcheado]?.label || lead.programa_pitcheado}
                      </p>
                    )}

                    {col.key === "cerrado" && lead.ticket_total > 0 && (
                      <p className="text-xs text-green-400 font-medium mt-1">
                        {formatUSD(lead.ticket_total)}
                      </p>
                    )}

                    {col.key === "perdido" && (
                      <p className="text-xs text-[var(--muted)]/60 mt-1">
                        {LEAD_ESTADOS_LABELS[lead.estado] || lead.estado}
                      </p>
                    )}

                    {/* Setter/Closer for admin */}
                    {isAdmin && (
                      <div className="flex items-center gap-2 mt-1.5">
                        {lead.setter?.nombre && (
                          <span className="text-[10px] text-[var(--muted)]">S: {lead.setter.nombre}</span>
                        )}
                        {lead.closer?.nombre && (
                          <span className="text-[10px] text-[var(--muted)]">C: {lead.closer.nombre}</span>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lead Detail Panel */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          payments={paymentsByLead[selectedLead.id] || []}
          onClose={() => setSelectedLeadId(null)}
          onEstadoChange={handleEstadoChange}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/\(dashboard\)/pipeline/
git commit -m "feat: add Pipeline kanban with filters, cards, and lead detail drawer"
```

---

### Task 5: Cargar Llamada Form

**Files:**
- Create: `app/(dashboard)/form/llamada/page.tsx`
- Create: `app/(dashboard)/form/llamada/CargarLlamadaForm.tsx`
- Create: `app/api/llamadas/route.ts`

- [ ] **Step 1: Create server page**

Create `app/(dashboard)/form/llamada/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { fetchLeads, fetchLeadsByCloser, fetchTeamMembers } from "@/lib/queries/leads";
import CargarLlamadaForm from "./CargarLlamadaForm";

export const dynamic = "force-dynamic";

export default async function CargarLlamadaPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const isAdmin = session.is_admin;
  const isCloser = session.roles.includes("closer");

  if (!isAdmin && !isCloser) redirect("/");

  const [leads, team] = await Promise.all([
    isAdmin ? fetchLeads() : fetchLeadsByCloser(session.team_member_id),
    fetchTeamMembers(),
  ]);

  // Only show pendientes (leads without a result)
  const pendientes = leads.filter(
    (l) => l.estado === "pendiente" || l.estado === "reprogramada"
  );

  return <CargarLlamadaForm leads={pendientes} team={team} session={session} />;
}
```

- [ ] **Step 2: Create multi-step form component**

Create `app/(dashboard)/form/llamada/CargarLlamadaForm.tsx`:

```typescript
"use client";

import { useState, useMemo } from "react";
import type { AuthSession, TeamMember, LeadEstado, Programa } from "@/lib/types";
import type { LeadWithTeam } from "@/lib/queries/leads";
import { LEAD_ESTADOS_LABELS, PROGRAMS, RECEPTORES } from "@/lib/constants";
import { formatDate } from "@/lib/format";

interface Props {
  leads: LeadWithTeam[];
  team: TeamMember[];
  session: AuthSession;
}

type Step = 1 | 2 | 3 | 4;

const METODOS_PAGO = [
  "binance", "transferencia", "caja_ahorro_usd",
  "link_mp", "cash", "uruguayos", "link_stripe",
] as const;

const METODOS_PAGO_LABELS: Record<string, string> = {
  binance: "Binance",
  transferencia: "Transferencia",
  caja_ahorro_usd: "Caja Ahorro USD",
  link_mp: "Link MercadoPago",
  cash: "Efectivo",
  uruguayos: "Uruguayos",
  link_stripe: "Link Stripe",
};

const PLAN_PAGO_OPTIONS = [
  { value: "paid_in_full", label: "PIF (Paid in Full)" },
  { value: "2_cuotas", label: "2 Cuotas" },
  { value: "3_cuotas", label: "3 Cuotas" },
  { value: "personalizado", label: "Personalizado" },
];

const CALIFICACION_OPTIONS = [
  { value: "calificado", label: "Calificado" },
  { value: "no_calificado", label: "No calificado" },
  { value: "podria", label: "Podria" },
];

const CERRADO_ESTADOS: LeadEstado[] = ["cerrado", "reserva"];

function isCerrado(estado: string): boolean {
  return CERRADO_ESTADOS.includes(estado as LeadEstado);
}

const inputClass =
  "w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--purple)] placeholder:text-[var(--muted)]";
const labelClass = "text-sm text-[var(--muted)] block mb-1";
const selectClass =
  "w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--purple)]";

export default function CargarLlamadaForm({ leads, team, session }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<LeadWithTeam | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 3 fields
  const [sePresentó, setSePresentó] = useState<"si" | "no" | "">("");
  const [estado, setEstado] = useState<string>("");
  const [calificado, setCalificado] = useState<string>("");
  const [programa, setPrograma] = useState<string>("");
  const [reporteGeneral, setReporteGeneral] = useState("");

  // Step 4 fields (payment)
  const [planPago, setPlanPago] = useState<string>("");
  const [ticketTotal, setTicketTotal] = useState("");
  const [cashDia1, setCashDia1] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [receptor, setReceptor] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(
      (l) =>
        l.nombre?.toLowerCase().includes(q) ||
        l.instagram?.toLowerCase().includes(q)
    );
  }, [leads, search]);

  function selectLead(lead: LeadWithTeam) {
    setSelectedLead(lead);
    setStep(2);
  }

  function volver() {
    if (step === 2) { setSelectedLead(null); setStep(1); }
    else if (step === 3) { setStep(2); }
    else if (step === 4) { setStep(3); }
  }

  function handleStep3Next() {
    if (!sePresentó || !estado) {
      setError("Completa Se Presento y Estado antes de continuar.");
      return;
    }
    setError("");
    if (isCerrado(estado)) {
      setStep(4);
    } else {
      handleSubmit();
    }
  }

  async function handleSubmit() {
    if (!selectedLead) return;
    setLoading(true);
    setError("");

    const body: Record<string, unknown> = {
      lead_id: selectedLead.id,
      estado,
      lead_calificado: calificado || undefined,
      programa_pitcheado: programa || undefined,
      reporte_general: reporteGeneral || undefined,
    };

    // If cerrado, include payment info
    if (isCerrado(estado)) {
      body.plan_pago = planPago || undefined;
      body.ticket_total = ticketTotal ? parseFloat(ticketTotal) : 0;
      body.payment = {
        monto_usd: cashDia1 ? parseFloat(cashDia1) : 0,
        metodo_pago: metodoPago || undefined,
        receptor: receptor || undefined,
      };
    }

    // If no-show, mark estado accordingly
    if (sePresentó === "no" && estado === "pendiente") {
      body.estado = "no_show";
    }

    try {
      const res = await fetch("/api/llamadas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al guardar");
      }

      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep(1);
    setSearch("");
    setSelectedLead(null);
    setSePresentó("");
    setEstado("");
    setCalificado("");
    setPrograma("");
    setReporteGeneral("");
    setPlanPago("");
    setTicketTotal("");
    setCashDia1("");
    setMetodoPago("");
    setReceptor("");
    setError("");
    setSubmitted(false);
  }

  // ── Success state ──
  if (submitted) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-10 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Llamada cargada correctamente</h3>
        <p className="text-sm text-[var(--muted)]">Los datos se guardaron en Supabase.</p>
        <button
          onClick={reset}
          className="mt-2 bg-[var(--purple)] hover:bg-[var(--purple-dark)] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Cargar otra llamada
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                step === s
                  ? "bg-[var(--purple)] text-white"
                  : step > s
                  ? "bg-[var(--purple)]/30 text-purple-300"
                  : "bg-[var(--card-border)] text-[var(--muted)]"
              }`}
            >
              {s}
            </div>
            {s < 4 && (
              <div className={`h-px w-8 transition-colors ${step > s ? "bg-[var(--purple)]/50" : "bg-[var(--card-border)]"}`} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Buscar lead ── */}
      {step === 1 && (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
          <h2 className="text-base font-semibold mb-1">Buscar lead</h2>
          <p className="text-sm text-[var(--muted)] mb-4">
            Mostrando {leads.length} leads pendientes de cierre
          </p>

          <input
            type="text"
            placeholder="Nombre o Instagram..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass}
            autoFocus
          />

          <div className="mt-4 space-y-2 max-h-80 overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <p className="text-sm text-[var(--muted)] text-center py-6">
                No hay leads que coincidan.
              </p>
            )}
            {filtered.map((lead) => (
              <button
                key={lead.id}
                onClick={() => selectLead(lead)}
                className="w-full bg-[#111113] border border-[var(--card-border)] rounded-lg p-4 cursor-pointer hover:border-[var(--purple)]/50 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--foreground)]">{lead.nombre || "Sin nombre"}</span>
                  {lead.fecha_agendado && (
                    <span className="text-xs text-[var(--muted)]">{formatDate(lead.fecha_agendado)}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {lead.instagram && (
                    <span className="text-xs text-[var(--muted)]">@{lead.instagram.replace(/^@/, "")}</span>
                  )}
                  {lead.setter?.nombre && (
                    <span className="text-xs text-purple-300">Setter: {lead.setter.nombre}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: Lead Card ── */}
      {step === 2 && selectedLead && (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
          <h2 className="text-base font-semibold mb-4">Detalle del lead</h2>

          <div className="space-y-3 mb-6">
            <InfoRow label="Nombre" value={selectedLead.nombre} />
            <InfoRow label="Instagram" value={selectedLead.instagram ? `@${selectedLead.instagram.replace(/^@/, "")}` : undefined} />
            <InfoRow label="Fecha agendada" value={selectedLead.fecha_agendado ? formatDate(selectedLead.fecha_agendado) : undefined} />
            <InfoRow label="Setter" value={selectedLead.setter?.nombre} />
            {selectedLead.contexto_setter && (
              <div className="pt-2 border-t border-[var(--card-border)]">
                <p className={labelClass}>Contexto setter</p>
                <p className="text-sm text-[var(--foreground)] leading-relaxed">{selectedLead.contexto_setter}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={volver} className="flex-1 bg-transparent border border-[var(--card-border)] hover:border-[var(--muted)] text-[var(--muted)] hover:text-[var(--foreground)] py-2.5 rounded-lg text-sm font-medium transition-colors">
              Volver
            </button>
            <button onClick={() => setStep(3)} className="flex-1 bg-[var(--purple)] hover:bg-[var(--purple-dark)] text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
              Cargar resultado
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Resultado de la llamada ── */}
      {step === 3 && selectedLead && (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
          <h2 className="text-base font-semibold mb-1">Resultado de la llamada</h2>
          <p className="text-xs text-[var(--muted)] mb-5">{selectedLead.nombre}</p>

          <div className="space-y-4">
            {/* Se presento */}
            <div>
              <label className={labelClass}>Se presento *</label>
              <div className="flex gap-3">
                {(["si", "no"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSePresentó(opt)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      sePresentó === opt
                        ? opt === "si"
                          ? "bg-green-500/10 border-green-500 text-green-400"
                          : "bg-red-500/10 border-red-500 text-red-400"
                        : "border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--muted)]"
                    }`}
                  >
                    {opt === "si" ? "Si" : "No"}
                  </button>
                ))}
              </div>
            </div>

            {/* Estado */}
            <div>
              <label className={labelClass}>Estado *</label>
              <select value={estado} onChange={(e) => setEstado(e.target.value)} className={selectClass}>
                <option value="">Seleccionar estado...</option>
                {Object.entries(LEAD_ESTADOS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Lead calificado */}
            <div>
              <label className={labelClass}>Lead calificado</label>
              <div className="flex gap-2">
                {CALIFICACION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setCalificado(opt.value)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      calificado === opt.value
                        ? "bg-[var(--purple)]/10 border-[var(--purple)] text-purple-300"
                        : "border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--muted)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Programa pitcheado */}
            <div>
              <label className={labelClass}>Programa pitcheado</label>
              <select value={programa} onChange={(e) => setPrograma(e.target.value)} className={selectClass}>
                <option value="">Sin programa / no aplica</option>
                {Object.entries(PROGRAMS).map(([key, p]) => (
                  <option key={key} value={key}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Reporte general */}
            <div>
              <label className={labelClass}>Reporte de la llamada</label>
              <textarea
                value={reporteGeneral}
                onChange={(e) => setReporteGeneral(e.target.value)}
                rows={3}
                placeholder="Notas post-llamada, objeciones, proximos pasos..."
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 mt-6">
            <button onClick={volver} className="flex-1 bg-transparent border border-[var(--card-border)] hover:border-[var(--muted)] text-[var(--muted)] hover:text-[var(--foreground)] py-2.5 rounded-lg text-sm font-medium transition-colors">
              Volver
            </button>
            <button
              onClick={handleStep3Next}
              disabled={loading}
              className="flex-1 bg-[var(--purple)] hover:bg-[var(--purple-dark)] disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? "Guardando..." : isCerrado(estado) ? "Siguiente - Pago" : "Guardar llamada"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Pago (solo si cerrado) ── */}
      {step === 4 && selectedLead && (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
          <h2 className="text-base font-semibold mb-1">Datos de pago</h2>
          <p className="text-xs text-[var(--muted)] mb-5">
            {selectedLead.nombre} - {LEAD_ESTADOS_LABELS[estado as LeadEstado] || estado}
          </p>

          <div className="space-y-4">
            {/* Plan de pago */}
            <div>
              <label className={labelClass}>Plan de pago *</label>
              <div className="grid grid-cols-2 gap-2">
                {PLAN_PAGO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPlanPago(opt.value)}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      planPago === opt.value
                        ? "bg-[var(--purple)]/10 border-[var(--purple)] text-purple-300"
                        : "border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--muted)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ticket total */}
            <div>
              <label className={labelClass}>Ticket total (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={ticketTotal}
                  onChange={(e) => setTicketTotal(e.target.value)}
                  placeholder="0"
                  className={`${inputClass} pl-7`}
                />
              </div>
            </div>

            {/* Monto cobrado hoy */}
            <div>
              <label className={labelClass}>Monto cobrado hoy (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={cashDia1}
                  onChange={(e) => setCashDia1(e.target.value)}
                  placeholder="0"
                  className={`${inputClass} pl-7`}
                />
              </div>
            </div>

            {/* Metodo de pago */}
            <div>
              <label className={labelClass}>Metodo de pago</label>
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className={selectClass}>
                <option value="">Seleccionar...</option>
                {METODOS_PAGO.map((m) => (
                  <option key={m} value={m}>{METODOS_PAGO_LABELS[m]}</option>
                ))}
              </select>
            </div>

            {/* Receptor */}
            <div>
              <label className={labelClass}>Quien recibe el pago</label>
              <select value={receptor} onChange={(e) => setReceptor(e.target.value)} className={selectClass}>
                <option value="">Seleccionar...</option>
                {RECEPTORES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 mt-6">
            <button onClick={volver} className="flex-1 bg-transparent border border-[var(--card-border)] hover:border-[var(--muted)] text-[var(--muted)] hover:text-[var(--foreground)] py-2.5 rounded-lg text-sm font-medium transition-colors">
              Volver
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !planPago}
              className="flex-1 bg-[var(--purple)] hover:bg-[var(--purple-dark)] disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? "Guardando..." : "Guardar llamada"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-sm text-[var(--muted)] shrink-0">{label}</span>
      <span className="text-sm text-[var(--foreground)] text-right">{value}</span>
    </div>
  );
}
```

- [ ] **Step 3: Create API route for llamadas**

Create `app/api/llamadas/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { llamadaSchema } from "@/lib/schemas";
import { updateLead } from "@/lib/queries/leads";
import { createPayment } from "@/lib/queries/payments";
import type { LeadEstado, MetodoPago } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const result = await requireSession();
    if ("error" in result) return result.error;

    const body = await req.json();
    const parsed = llamadaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { lead_id, estado, programa_pitcheado, concepto, plan_pago, ticket_total, reporte_general, notas_internas, lead_calificado } = parsed.data;

    // Update the lead
    const leadUpdate: Record<string, unknown> = {
      estado: estado as LeadEstado,
      fecha_llamada: new Date().toISOString(),
    };

    if (programa_pitcheado) leadUpdate.programa_pitcheado = programa_pitcheado;
    if (concepto) leadUpdate.concepto = concepto;
    if (plan_pago) leadUpdate.plan_pago = plan_pago;
    if (ticket_total !== undefined) leadUpdate.ticket_total = ticket_total;
    if (reporte_general) leadUpdate.reporte_general = reporte_general;
    if (notas_internas) leadUpdate.notas_internas = notas_internas;
    if (lead_calificado) leadUpdate.lead_calificado = lead_calificado;

    const updatedLead = await updateLead(lead_id, leadUpdate);
    if (!updatedLead) {
      return NextResponse.json({ error: "Error al actualizar lead" }, { status: 500 });
    }

    // If cerrado/reserva and has payment data, create payment
    const isCerrado = estado === "cerrado" || estado === "reserva";
    if (isCerrado && body.payment) {
      const paymentData = body.payment as {
        monto_usd?: number;
        metodo_pago?: string;
        receptor?: string;
      };

      if (paymentData.monto_usd && paymentData.monto_usd > 0) {
        await createPayment({
          lead_id,
          client_id: null,
          renewal_id: null,
          numero_cuota: 1,
          monto_usd: paymentData.monto_usd,
          monto_ars: 0,
          fecha_pago: new Date().toISOString().split("T")[0],
          fecha_vencimiento: null,
          estado: "pagado",
          metodo_pago: (paymentData.metodo_pago as MetodoPago) || null,
          receptor: paymentData.receptor || null,
          comprobante_url: null,
          cobrador_id: null,
          verificado: false,
          es_renovacion: false,
        });
      }
    }

    return NextResponse.json({ ok: true, lead: updatedLead });
  } catch (err) {
    console.error("[POST /api/llamadas]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/\(dashboard\)/form/llamada/ app/api/llamadas/
git commit -m "feat: add Cargar Llamada multi-step form with API route"
```

---

### Task 6: Cargar Pago Form

**Files:**
- Create: `app/(dashboard)/form/pago/page.tsx`
- Create: `app/(dashboard)/form/pago/CargarPagoForm.tsx`
- Create: `app/api/pagos/route.ts`

- [ ] **Step 1: Create server page**

Create `app/(dashboard)/form/pago/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { fetchLeads, fetchTeamMembers } from "@/lib/queries/leads";
import { fetchPayments } from "@/lib/queries/payments";
import CargarPagoForm from "./CargarPagoForm";

export const dynamic = "force-dynamic";

export default async function CargarPagoPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [leads, payments, team] = await Promise.all([
    fetchLeads(),
    fetchPayments(),
    fetchTeamMembers(),
  ]);

  // Only show leads that have been cerrado (have a deal)
  const cerrados = leads.filter(
    (l) => l.estado === "cerrado" || l.estado === "reserva"
  );

  // Build payments lookup by lead_id
  const paymentsByLead: Record<string, typeof payments> = {};
  for (const p of payments) {
    if (p.lead_id) {
      if (!paymentsByLead[p.lead_id]) paymentsByLead[p.lead_id] = [];
      paymentsByLead[p.lead_id].push(p);
    }
  }

  return (
    <CargarPagoForm
      leads={cerrados}
      paymentsByLead={paymentsByLead}
      team={team}
      session={session}
    />
  );
}
```

- [ ] **Step 2: Create payment form component**

Create `app/(dashboard)/form/pago/CargarPagoForm.tsx`:

```typescript
"use client";

import { useState, useMemo, useRef } from "react";
import type { AuthSession, TeamMember, Payment } from "@/lib/types";
import type { LeadWithTeam } from "@/lib/queries/leads";
import { PROGRAMS, RECEPTORES } from "@/lib/constants";
import { formatUSD, formatDate } from "@/lib/format";

interface Props {
  leads: LeadWithTeam[];
  paymentsByLead: Record<string, Payment[]>;
  team: TeamMember[];
  session: AuthSession;
}

type Step = 1 | 2;

const METODOS_PAGO = [
  { value: "binance", label: "Binance" },
  { value: "transferencia", label: "Transferencia" },
  { value: "caja_ahorro_usd", label: "Caja Ahorro USD" },
  { value: "link_mp", label: "Link MercadoPago" },
  { value: "cash", label: "Efectivo" },
  { value: "uruguayos", label: "Uruguayos" },
  { value: "link_stripe", label: "Link Stripe" },
];

const inputClass =
  "w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--purple)] placeholder:text-[var(--muted)]";
const labelClass = "text-sm text-[var(--muted)] block mb-1";
const selectClass =
  "w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--purple)]";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function getPaymentSummary(payments: Payment[]): { pagadas: number; pendientes: number; totalPagado: number } {
  let pagadas = 0;
  let pendientes = 0;
  let totalPagado = 0;
  for (const p of payments) {
    if (p.estado === "pagado") {
      pagadas++;
      totalPagado += p.monto_usd;
    } else if (p.estado === "pendiente") {
      pendientes++;
    }
  }
  return { pagadas, pendientes, totalPagado };
}

export default function CargarPagoForm({ leads, paymentsByLead, team, session }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<LeadWithTeam | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [numeroCuota, setNumeroCuota] = useState<number>(2);
  const [montoUsd, setMontoUsd] = useState("");
  const [montoArs, setMontoArs] = useState("");
  const [fechaPago, setFechaPago] = useState(todayISO());
  const [metodoPago, setMetodoPago] = useState("");
  const [receptor, setReceptor] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(
      (l) =>
        l.nombre?.toLowerCase().includes(q) ||
        l.instagram?.toLowerCase().includes(q) ||
        l.closer?.nombre?.toLowerCase().includes(q)
    );
  }, [leads, search]);

  function selectLead(lead: LeadWithTeam) {
    setSelected(lead);
    const existingPayments = paymentsByLead[lead.id] || [];
    setNumeroCuota(existingPayments.length + 1);
    setStep(2);
  }

  function volver() {
    setSelected(null);
    setStep(1);
    setError("");
  }

  async function handleSubmit() {
    if (!selected) return;
    const monto = parseFloat(montoUsd);
    if (!montoUsd || isNaN(monto) || monto <= 0) {
      setError("Ingresa un monto valido mayor a 0.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      // Upload comprobante if present
      let comprobanteUrl: string | undefined;
      if (comprobante) {
        const formData = new FormData();
        formData.append("file", comprobante);
        formData.append("lead_id", selected.id);

        const uploadRes = await fetch("/api/pagos?upload=1", {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          comprobanteUrl = uploadData.url;
        }
      }

      const body = {
        lead_id: selected.id,
        numero_cuota: numeroCuota,
        monto_usd: monto,
        monto_ars: montoArs ? parseFloat(montoArs) : 0,
        fecha_pago: fechaPago,
        estado: "pagado",
        metodo_pago: metodoPago || undefined,
        receptor: receptor || undefined,
        comprobante_url: comprobanteUrl,
        es_renovacion: false,
      };

      const res = await fetch("/api/pagos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al guardar");
      }

      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep(1);
    setSearch("");
    setSelected(null);
    setNumeroCuota(2);
    setMontoUsd("");
    setMontoArs("");
    setFechaPago(todayISO());
    setMetodoPago("");
    setReceptor("");
    setComprobante(null);
    setError("");
    setSubmitted(false);
  }

  // ── Success ──
  if (submitted) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-10 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Pago registrado correctamente</h3>
        <p className="text-sm text-[var(--muted)]">El pago se guardo en Supabase.</p>
        <button
          onClick={reset}
          className="mt-2 bg-[var(--purple)] hover:bg-[var(--purple-dark)] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Registrar otro pago
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {([1, 2] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                step === s
                  ? "bg-[var(--purple)] text-white"
                  : step > s
                  ? "bg-[var(--purple)]/30 text-purple-300"
                  : "bg-[var(--card-border)] text-[var(--muted)]"
              }`}
            >
              {s}
            </div>
            {s < 2 && (
              <div className={`h-px w-8 transition-colors ${step > s ? "bg-[var(--purple)]/50" : "bg-[var(--card-border)]"}`} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Buscar alumno ── */}
      {step === 1 && (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
          <h2 className="text-base font-semibold mb-1">Buscar alumno</h2>
          <p className="text-sm text-[var(--muted)] mb-4">
            Mostrando {leads.length} alumnos con deal cerrado
          </p>

          <input
            type="text"
            placeholder="Nombre, Instagram o closer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass}
            autoFocus
          />

          <div className="mt-4 space-y-2 max-h-80 overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <p className="text-sm text-[var(--muted)] text-center py-6">
                No hay alumnos que coincidan.
              </p>
            )}
            {filtered.map((lead) => {
              const payments = paymentsByLead[lead.id] || [];
              const summary = getPaymentSummary(payments);
              const saldoPendiente = lead.ticket_total - summary.totalPagado;
              return (
                <button
                  key={lead.id}
                  onClick={() => selectLead(lead)}
                  className="w-full bg-[#111113] border border-[var(--card-border)] rounded-lg p-4 cursor-pointer hover:border-[var(--purple)]/50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {lead.nombre || "Sin nombre"}
                    </span>
                    {saldoPendiente > 0 && (
                      <span className="text-xs text-amber-400">
                        Saldo: {formatUSD(saldoPendiente)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {lead.programa_pitcheado && (
                      <span className="text-xs text-purple-300">{PROGRAMS[lead.programa_pitcheado]?.label}</span>
                    )}
                    {lead.closer?.nombre && (
                      <span className="text-xs text-[var(--muted)]">Closer: {lead.closer.nombre}</span>
                    )}
                    <span className="text-xs text-[var(--muted)]">
                      {summary.pagadas}/{payments.length} pagadas
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Step 2: Info alumno + form pago ── */}
      {step === 2 && selected && (() => {
        const payments = paymentsByLead[selected.id] || [];
        const summary = getPaymentSummary(payments);
        const saldoPendiente = selected.ticket_total - summary.totalPagado;

        return (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
            <h2 className="text-base font-semibold mb-1">Registrar pago</h2>
            <p className="text-xs text-[var(--muted)] mb-5">{selected.nombre}</p>

            {/* Student info card */}
            <div className="bg-[#111113] border border-[var(--card-border)] rounded-lg p-4 mb-6 space-y-2">
              <InfoRow label="Programa" value={selected.programa_pitcheado ? PROGRAMS[selected.programa_pitcheado]?.label : undefined} />
              <InfoRow label="Closer" value={selected.closer?.nombre} />
              <InfoRow label="Setter" value={selected.setter?.nombre} />
              <InfoRow label="Plan de pago" value={selected.plan_pago || undefined} />
              <InfoRow label="Ticket total" value={selected.ticket_total > 0 ? formatUSD(selected.ticket_total) : undefined} />

              {/* Existing payments */}
              {payments.length > 0 && (
                <div className="pt-2 border-t border-[var(--card-border)] space-y-1">
                  {payments.map((p) => (
                    <div key={p.id} className="flex justify-between text-xs">
                      <span className="text-[var(--muted)]">Cuota {p.numero_cuota}</span>
                      <span className={p.estado === "pagado" ? "text-green-400" : "text-amber-400"}>
                        {formatUSD(p.monto_usd)} - {p.estado}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {saldoPendiente > 0 && (
                <div className="pt-2 border-t border-[var(--card-border)]">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--muted)]">Saldo pendiente</span>
                    <span className="text-sm font-semibold text-amber-400">
                      {formatUSD(saldoPendiente)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment form */}
            <div className="space-y-4">
              {/* Numero cuota */}
              <div>
                <label className={labelClass}>Numero de cuota *</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={numeroCuota}
                  onChange={(e) => setNumeroCuota(parseInt(e.target.value) || 1)}
                  className={inputClass}
                />
              </div>

              {/* Fecha */}
              <div>
                <label className={labelClass}>Fecha de pago</label>
                <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className={inputClass} />
              </div>

              {/* Monto USD */}
              <div>
                <label className={labelClass}>Monto USD *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">$</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={montoUsd}
                    onChange={(e) => setMontoUsd(e.target.value)}
                    placeholder="0"
                    className={`${inputClass} pl-7`}
                  />
                </div>
              </div>

              {/* Monto ARS (optional) */}
              <div>
                <label className={labelClass}>Monto ARS (opcional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">$</span>
                  <input
                    type="number"
                    min={0}
                    value={montoArs}
                    onChange={(e) => setMontoArs(e.target.value)}
                    placeholder="0"
                    className={`${inputClass} pl-7`}
                  />
                </div>
              </div>

              {/* Metodo de pago */}
              <div>
                <label className={labelClass}>Metodo de pago</label>
                <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className={selectClass}>
                  <option value="">Seleccionar...</option>
                  {METODOS_PAGO.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Receptor */}
              <div>
                <label className={labelClass}>Quien recibe el pago</label>
                <select value={receptor} onChange={(e) => setReceptor(e.target.value)} className={selectClass}>
                  <option value="">Seleccionar...</option>
                  {RECEPTORES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Comprobante upload */}
              <div>
                <label className={labelClass}>Comprobante (imagen/PDF)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setComprobante(e.target.files?.[0] || null)}
                  className="w-full text-sm text-[var(--muted)] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[var(--purple)]/10 file:text-purple-300 hover:file:bg-[var(--purple)]/20"
                />
                {comprobante && (
                  <p className="text-xs text-[var(--muted)] mt-1">{comprobante.name}</p>
                )}
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button onClick={volver} className="flex-1 bg-transparent border border-[var(--card-border)] hover:border-[var(--muted)] text-[var(--muted)] hover:text-[var(--foreground)] py-2.5 rounded-lg text-sm font-medium transition-colors">
                Volver
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-[var(--purple)] hover:bg-[var(--purple-dark)] disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? "Guardando..." : "Registrar pago"}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-sm text-[var(--muted)] shrink-0">{label}</span>
      <span className="text-sm text-[var(--foreground)] text-right">{value}</span>
    </div>
  );
}
```

- [ ] **Step 3: Create API route for pagos**

Create `app/api/pagos/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { pagoSchema } from "@/lib/schemas";
import { createPayment, uploadComprobante } from "@/lib/queries/payments";
import type { MetodoPago, PaymentEstado } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const result = await requireSession();
    if ("error" in result) return result.error;

    // Handle file upload
    const isUpload = req.nextUrl.searchParams.get("upload") === "1";
    if (isUpload) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const leadId = formData.get("lead_id") as string;

      if (!file || !leadId) {
        return NextResponse.json({ error: "Archivo y lead_id requeridos" }, { status: 400 });
      }

      const url = await uploadComprobante(file, leadId);
      if (!url) {
        return NextResponse.json({ error: "Error al subir comprobante" }, { status: 500 });
      }

      return NextResponse.json({ ok: true, url });
    }

    // Handle payment creation
    const body = await req.json();
    const parsed = pagoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const paymentData = {
      lead_id: parsed.data.lead_id || null,
      client_id: parsed.data.client_id || null,
      renewal_id: null,
      numero_cuota: parsed.data.numero_cuota,
      monto_usd: parsed.data.monto_usd,
      monto_ars: parsed.data.monto_ars,
      fecha_pago: parsed.data.fecha_pago,
      fecha_vencimiento: null,
      estado: parsed.data.estado as PaymentEstado,
      metodo_pago: (parsed.data.metodo_pago as MetodoPago) || null,
      receptor: parsed.data.receptor || null,
      comprobante_url: (body.comprobante_url as string) || null,
      cobrador_id: null,
      verificado: false,
      es_renovacion: parsed.data.es_renovacion,
    };

    const payment = await createPayment(paymentData);
    if (!payment) {
      return NextResponse.json({ error: "Error al crear pago" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, payment });
  } catch (err) {
    console.error("[POST /api/pagos]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/\(dashboard\)/form/pago/ app/api/pagos/
git commit -m "feat: add Cargar Pago form with file upload and API route"
```

---

### Task 7: Venta por Chat Form (for Setters)

**Files:**
- Create: `app/(dashboard)/form/venta-chat/page.tsx`
- Create: `app/(dashboard)/form/venta-chat/VentaChatForm.tsx`
- Create: `app/api/venta-directa/route.ts`

- [ ] **Step 1: Create server page**

Create `app/(dashboard)/form/venta-chat/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { fetchTeamMembers } from "@/lib/queries/leads";
import VentaChatForm from "./VentaChatForm";

export const dynamic = "force-dynamic";

export default async function VentaChatPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const team = await fetchTeamMembers();
  const setters = team.filter((t) => t.is_setter);

  return <VentaChatForm session={session} setters={setters} />;
}
```

- [ ] **Step 2: Create venta por chat form component**

Create `app/(dashboard)/form/venta-chat/VentaChatForm.tsx`:

```typescript
"use client";

import { useState } from "react";
import type { AuthSession, TeamMember } from "@/lib/types";
import { PROGRAMS, RECEPTORES } from "@/lib/constants";

interface Props {
  session: AuthSession;
  setters: TeamMember[];
}

const METODOS_PAGO = [
  { value: "binance", label: "Binance" },
  { value: "transferencia", label: "Transferencia" },
  { value: "caja_ahorro_usd", label: "Caja Ahorro USD" },
  { value: "link_mp", label: "Link MercadoPago" },
  { value: "cash", label: "Efectivo" },
  { value: "uruguayos", label: "Uruguayos" },
  { value: "link_stripe", label: "Link Stripe" },
];

const PLAN_PAGO_OPTIONS = [
  { value: "paid_in_full", label: "PIF" },
  { value: "2_cuotas", label: "2 Cuotas" },
  { value: "3_cuotas", label: "3 Cuotas" },
];

const inputClass =
  "w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--purple)] placeholder:text-[var(--muted)]";
const selectClass =
  "w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--purple)]";
const labelClass = "text-sm text-[var(--muted)] block mb-1";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export default function VentaChatForm({ session, setters }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [nombre, setNombre] = useState("");
  const [instagram, setInstagram] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [setterId, setSetterId] = useState(session.team_member_id);
  const [programa, setPrograma] = useState("");
  const [ticketTotal, setTicketTotal] = useState("");
  const [cashDia1, setCashDia1] = useState("");
  const [planPago, setPlanPago] = useState("paid_in_full");
  const [metodoPago, setMetodoPago] = useState("");
  const [receptor, setReceptor] = useState("");
  const [contexto, setContexto] = useState("");
  const [fecha, setFecha] = useState(todayISO());

  async function handleSubmit() {
    if (!nombre.trim()) { setError("Nombre requerido"); return; }
    if (!programa) { setError("Selecciona un programa"); return; }
    const cash = parseFloat(cashDia1);
    if (!cashDia1 || isNaN(cash) || cash <= 0) { setError("Ingresa un monto valido"); return; }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/venta-directa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          instagram: instagram.trim() || undefined,
          telefono: telefono.trim() || undefined,
          email: email.trim() || undefined,
          programa_pitcheado: programa,
          ticket_total: parseFloat(ticketTotal) || cash,
          plan_pago: planPago,
          monto_usd: cash,
          metodo_pago: metodoPago || undefined,
          receptor: receptor || undefined,
          setter_id: setterId,
          contexto: contexto.trim() || undefined,
          fecha,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al guardar");
      }

      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setNombre(""); setInstagram(""); setTelefono(""); setEmail("");
    setSetterId(session.team_member_id); setPrograma(""); setTicketTotal("");
    setCashDia1(""); setPlanPago("paid_in_full"); setMetodoPago("");
    setReceptor(""); setContexto(""); setFecha(todayISO());
    setError(""); setSubmitted(false);
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-10 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">Venta registrada</h3>
        <p className="text-sm text-[var(--muted)]">La venta por chat se guardo en Supabase y aparece en el dashboard.</p>
        <button onClick={reset} className="mt-2 bg-[var(--purple)] hover:bg-[var(--purple-dark)] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
          Registrar otra venta
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-[var(--card-border)]">
        <div>
          <p className="text-sm font-semibold">Venta por Chat</p>
          <p className="text-xs text-[var(--muted)]">Se registra como cerrado directo (fuente: dm_directo)</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Lead info */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Nombre del lead *</label>
            <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" />
          </div>
          <div>
            <label className={labelClass}>Instagram</label>
            <input className={inputClass} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@usuario" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Telefono / WhatsApp</label>
            <input className={inputClass} value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+54 11..." />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@..." />
          </div>
        </div>

        {/* Setter */}
        <div>
          <label className={labelClass}>Setter</label>
          <select className={selectClass} value={setterId} onChange={(e) => setSetterId(e.target.value)}>
            {setters.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>

        {/* Programa */}
        <div>
          <label className={labelClass}>Programa *</label>
          <select className={selectClass} value={programa} onChange={(e) => setPrograma(e.target.value)}>
            <option value="">Seleccionar programa...</option>
            {Object.entries(PROGRAMS).map(([key, p]) => (
              <option key={key} value={key}>{p.label} - ${p.precio.toLocaleString()}</option>
            ))}
          </select>
        </div>

        {/* Cash + Ticket */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Cash cobrado hoy *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">$</span>
              <input type="number" className={`${inputClass} pl-7`} value={cashDia1} onChange={(e) => setCashDia1(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Ticket total</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">$</span>
              <input type="number" className={`${inputClass} pl-7`} value={ticketTotal} onChange={(e) => setTicketTotal(e.target.value)} placeholder="Igual al cash si PIF" />
            </div>
          </div>
        </div>

        {/* Pago details */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Plan de pago</label>
            <select className={selectClass} value={planPago} onChange={(e) => setPlanPago(e.target.value)}>
              {PLAN_PAGO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Metodo</label>
            <select className={selectClass} value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
              <option value="">Seleccionar...</option>
              {METODOS_PAGO.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Quien recibe</label>
            <select className={selectClass} value={receptor} onChange={(e) => setReceptor(e.target.value)}>
              <option value="">Seleccionar...</option>
              {RECEPTORES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Fecha + Contexto */}
        <div>
          <label className={labelClass}>Fecha del cierre</label>
          <input type="date" className={inputClass} value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>Contexto / notas</label>
          <textarea className={`${inputClass} h-20 resize-none`} value={contexto} onChange={(e) => setContexto(e.target.value)} placeholder="Como se dio la venta, que se hablo..." />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full mt-6 bg-[var(--purple)] hover:bg-[var(--purple-dark)] disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        {loading ? "Guardando..." : "Registrar venta"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create API route for venta directa**

Create `app/api/venta-directa/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { ventaChatSchema } from "@/lib/schemas";
import { createLead } from "@/lib/queries/leads";
import { createPayment } from "@/lib/queries/payments";
import type { LeadEstado, LeadFuente, MetodoPago, PlanPago, Programa } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const result = await requireSession();
    if ("error" in result) return result.error;

    const body = await req.json();
    const parsed = ventaChatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      nombre,
      instagram,
      telefono,
      email,
      programa_pitcheado,
      ticket_total,
      plan_pago,
      monto_usd,
      metodo_pago,
      receptor,
      setter_id,
    } = parsed.data;

    // Create lead with estado=cerrado, fuente=dm_directo
    const lead = await createLead({
      airtable_id: null,
      nombre,
      email: email || null,
      telefono: telefono || null,
      instagram: instagram || null,
      fuente: "dm_directo" as LeadFuente,
      utm_source: null,
      utm_medium: null,
      utm_content: null,
      evento_calendly: null,
      calendly_event_id: null,
      fecha_agendado: null,
      fecha_llamada: new Date().toISOString(),
      estado: "cerrado" as LeadEstado,
      setter_id: setter_id,
      closer_id: null,
      cobrador_id: null,
      contexto_setter: (body.contexto as string) || null,
      reporte_general: null,
      notas_internas: null,
      experiencia_ecommerce: null,
      seguridad_inversion: null,
      tipo_productos: null,
      compromiso_asistencia: null,
      dispuesto_invertir: null,
      decisor: null,
      lead_calificado: null,
      lead_score: null,
      link_llamada: null,
      programa_pitcheado: programa_pitcheado as Programa,
      concepto: plan_pago === "paid_in_full" ? "pif" : "primera_cuota",
      plan_pago: plan_pago as PlanPago,
      ticket_total,
      fue_seguimiento: false,
      de_donde_viene_lead: null,
    });

    if (!lead) {
      return NextResponse.json({ error: "Error al crear lead" }, { status: 500 });
    }

    // Create first payment
    const payment = await createPayment({
      lead_id: lead.id,
      client_id: null,
      renewal_id: null,
      numero_cuota: 1,
      monto_usd,
      monto_ars: 0,
      fecha_pago: (body.fecha as string) || new Date().toISOString().split("T")[0],
      fecha_vencimiento: null,
      estado: "pagado",
      metodo_pago: (metodo_pago as MetodoPago) || null,
      receptor: receptor || null,
      comprobante_url: null,
      cobrador_id: null,
      verificado: false,
      es_renovacion: false,
    });

    if (!payment) {
      return NextResponse.json({ error: "Lead creado pero error al crear pago" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, lead, payment });
  } catch (err) {
    console.error("[POST /api/venta-directa]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/\(dashboard\)/form/venta-chat/ app/api/venta-directa/
git commit -m "feat: add Venta por Chat form — creates lead + payment in one go"
```

---

### Task 8: Reporte Setter Form

**Files:**
- Create: `app/(dashboard)/form/reporte-setter/page.tsx`
- Create: `app/(dashboard)/form/reporte-setter/ReporteSetterForm.tsx`
- Create: `app/api/reporte-setter/route.ts`

- [ ] **Step 1: Create server page**

Create `app/(dashboard)/form/reporte-setter/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ReporteSetterForm from "./ReporteSetterForm";

export const dynamic = "force-dynamic";

export default async function ReporteSetterPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const isSetter = session.roles.includes("setter");
  const isAdmin = session.is_admin;

  if (!isSetter && !isAdmin) redirect("/");

  return <ReporteSetterForm session={session} />;
}
```

- [ ] **Step 2: Create reporte setter form component**

Create `app/(dashboard)/form/reporte-setter/ReporteSetterForm.tsx`:

```typescript
"use client";

import { useState } from "react";
import type { AuthSession } from "@/lib/types";

interface Props {
  session: AuthSession;
}

const inputClass =
  "w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--purple)] placeholder:text-[var(--muted)]";
const labelClass = "text-sm text-[var(--muted)] block mb-1";

const ORIGENES = [
  "Historias", "DM directo", "Lead magnet", "YouTube",
  "Comentarios", "Reels", "Encuesta", "WhatsApp", "Otro",
];

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export default function ReporteSetterForm({ session }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [fecha, setFecha] = useState(todayISO());
  const [conversacionesIniciadas, setConversacionesIniciadas] = useState("");
  const [respuestasHistorias, setRespuestasHistorias] = useState("");
  const [calendariosEnviados, setCalendariosEnviados] = useState("");
  const [ventasPorChat, setVentasPorChat] = useState("");
  const [agendasConfirmadas, setAgendasConfirmadas] = useState("");
  const [origenPrincipal, setOrigenPrincipal] = useState<string[]>([]);

  function toggleOrigen(origen: string) {
    setOrigenPrincipal((prev) =>
      prev.includes(origen) ? prev.filter((o) => o !== origen) : [...prev, origen]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const conv = parseInt(conversacionesIniciadas, 10);
    const resp = parseInt(respuestasHistorias, 10);
    const cal = parseInt(calendariosEnviados, 10);

    if (isNaN(conv) || conv < 0 || isNaN(resp) || resp < 0 || isNaN(cal) || cal < 0) {
      setError("Ingresa numeros validos (>= 0) en los campos numericos.");
      return;
    }

    setLoading(true);

    const body = {
      setter_id: session.team_member_id,
      fecha,
      conversaciones_iniciadas: conv,
      respuestas_historias: resp,
      calendarios_enviados: cal,
      ventas_por_chat: ventasPorChat.trim() || undefined,
      agendas_confirmadas: agendasConfirmadas.trim() || undefined,
      origen_principal: origenPrincipal,
    };

    try {
      const res = await fetch("/api/reporte-setter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al guardar");
      }

      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFecha(todayISO());
    setConversacionesIniciadas("");
    setRespuestasHistorias("");
    setCalendariosEnviados("");
    setVentasPorChat("");
    setAgendasConfirmadas("");
    setOrigenPrincipal([]);
    setError("");
    setSubmitted(false);
  }

  // ── Success state ──
  if (submitted) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-10 text-center flex flex-col items-center gap-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Reporte enviado</h3>
        <p className="text-sm text-[var(--muted)]">Tus datos se guardaron en Supabase.</p>
        <button
          onClick={reset}
          className="mt-2 bg-[var(--purple)] hover:bg-[var(--purple-dark)] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Crear otro reporte
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
        <div className="mb-5 pb-4 border-b border-[var(--card-border)]">
          <p className="text-sm font-semibold">Reporte Diario</p>
          <p className="text-xs text-[var(--muted)]">{session.nombre}</p>
        </div>

        {/* Fecha */}
        <div className="mb-4">
          <label className={labelClass}>Fecha *</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required className={inputClass} />
        </div>

        {/* Conversaciones iniciadas */}
        <div className="mb-4">
          <label className={labelClass}>Conversaciones iniciadas *</label>
          <input
            type="number"
            min={0}
            value={conversacionesIniciadas}
            onChange={(e) => setConversacionesIniciadas(e.target.value)}
            placeholder="0"
            className={`${inputClass} text-center text-lg`}
            required
          />
        </div>

        {/* Respuestas a historias */}
        <div className="mb-4">
          <label className={labelClass}>Respuestas a historias *</label>
          <input
            type="number"
            min={0}
            value={respuestasHistorias}
            onChange={(e) => setRespuestasHistorias(e.target.value)}
            placeholder="0"
            className={`${inputClass} text-center text-lg`}
            required
          />
        </div>

        {/* Calendarios enviados */}
        <div className="mb-4">
          <label className={labelClass}>Calendarios enviados *</label>
          <input
            type="number"
            min={0}
            value={calendariosEnviados}
            onChange={(e) => setCalendariosEnviados(e.target.value)}
            placeholder="0"
            className={`${inputClass} text-center text-lg`}
            required
          />
        </div>

        {/* Ventas por chat */}
        <div className="mb-4">
          <label className={labelClass}>Ventas por chat (nombres)</label>
          <textarea
            value={ventasPorChat}
            onChange={(e) => setVentasPorChat(e.target.value)}
            placeholder="Nombre 1, Nombre 2..."
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Agendas confirmadas */}
        <div className="mb-4">
          <label className={labelClass}>Agendas confirmadas (nombres)</label>
          <textarea
            value={agendasConfirmadas}
            onChange={(e) => setAgendasConfirmadas(e.target.value)}
            placeholder="Nombre 1, Nombre 2..."
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Origen principal */}
        <div className="mb-6">
          <label className={labelClass}>Origen principal de los leads</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {ORIGENES.map((o) => (
              <button
                type="button"
                key={o}
                onClick={() => toggleOrigen(o)}
                className={`text-xs py-1.5 px-3 rounded-lg border transition-colors ${
                  origenPrincipal.includes(o)
                    ? "bg-[var(--purple)]/10 border-[var(--purple)] text-purple-300"
                    : "border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--muted)]"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-[var(--purple)] hover:bg-[var(--purple-dark)] disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium w-full transition-colors"
        >
          {loading ? "Enviando..." : "Enviar reporte"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Create API route for reporte setter**

Create `app/api/reporte-setter/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { reporteSetterSchema } from "@/lib/schemas";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const result = await requireSession();
    if ("error" in result) return result.error;

    const body = await req.json();
    const parsed = reporteSetterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("daily_reports")
      .insert({
        setter_id: parsed.data.setter_id,
        fecha: parsed.data.fecha,
        conversaciones_iniciadas: parsed.data.conversaciones_iniciadas,
        respuestas_historias: parsed.data.respuestas_historias,
        calendarios_enviados: parsed.data.calendarios_enviados,
        ventas_por_chat: parsed.data.ventas_por_chat || null,
        agendas_confirmadas: parsed.data.agendas_confirmadas || null,
        origen_principal: parsed.data.origen_principal,
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/reporte-setter]", error.message);
      return NextResponse.json({ error: "Error al guardar reporte" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, report: data });
  } catch (err) {
    console.error("[POST /api/reporte-setter]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/\(dashboard\)/form/reporte-setter/ app/api/reporte-setter/
git commit -m "feat: add Reporte Setter daily form with API route"
```
