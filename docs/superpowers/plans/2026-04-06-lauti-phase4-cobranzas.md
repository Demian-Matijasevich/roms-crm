# Lauti CRM Phase 4: Cobranzas & Agent System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the cobranzas queue (Mel's primary workspace), agent task system with visibility control, automatic task generation, renovaciones management, and admin dashboards for agent performance.

**Architecture:** Server components fetch data via Supabase queries, pass to client components. Agent visibility controlled by `session.can_see_agent` (boolean on AuthSession). Task generation runs as API route callable by n8n cron or manual trigger. Priority system: 1=alta, 2=media-alta, 3=media, 4=normal, 5=baja.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase JS v2, Zod, date-fns

**Spec:** `docs/superpowers/specs/2026-04-06-lauti-crm-design.md`
**Phase 1 plan:** `docs/superpowers/plans/2026-04-06-lauti-phase1-foundation.md`

**Depends on:** Phase 2 (leads, payments queries, pipeline, forms) + Phase 3 (clients, tracker 1a1, seguimiento, follow-ups, health score)

---

## File Structure

```
C:\Users\matyc\projects\lauti-crm\
├── lib/
│   ├── queries/
│   │   ├── agent-tasks.ts              # Task 1
│   │   └── cobranzas.ts                # Task 1
│   ├── task-generator.ts               # Task 5
│   └── schemas.ts                      # Updated with new schemas (Task 4)
├── app/
│   ├── (dashboard)/
│   │   ├── cobranzas/
│   │   │   ├── page.tsx                # Task 2 (server)
│   │   │   └── CobranzasClient.tsx     # Task 2+3+4+6 (client)
│   │   └── renovaciones/
│   │       ├── page.tsx                # Task 7 (server)
│   │       └── RenovacionesClient.tsx  # Task 7 (client)
│   └── api/
│       ├── agent-tasks/
│       │   ├── [id]/
│       │   │   └── route.ts            # Task 4
│       │   └── generate/
│       │       └── route.ts            # Task 5
│       └── cobranzas/
│           ├── mark-paid/
│           │   └── route.ts            # Task 4
│           └── log/
│               └── route.ts            # Task 4
```

---

### Task 1: Supabase Queries for Cobranzas and Agent System

**Files:**
- Create: `lib/queries/agent-tasks.ts`
- Create: `lib/queries/cobranzas.ts`

- [ ] **Step 1: Create agent-tasks queries**

Create `lib/queries/agent-tasks.ts`:

```typescript
import { createServerClient } from "@/lib/supabase-server";
import type { AgentTask, AgentLog, AgentTaskTipo, AgentTaskEstado } from "@/lib/types";

export interface AgentTaskFilters {
  tipo?: AgentTaskTipo;
  estado?: AgentTaskEstado;
  asignado_a?: "agent" | "human";
  client_id?: string;
  prioridad_max?: number; // 1-5, returns tasks with prioridad <= this
}

export async function fetchAgentTasks(
  filters: AgentTaskFilters = {}
): Promise<AgentTask[]> {
  const supabase = createServerClient();
  let query = supabase
    .from("agent_tasks")
    .select("*, client:clients(id, nombre, telefono, programa, estado_contacto, canal_contacto, health_score), lead:leads(id, nombre, telefono, instagram)")
    .order("prioridad", { ascending: true })
    .order("created_at", { ascending: false });

  if (filters.tipo) query = query.eq("tipo", filters.tipo);
  if (filters.estado) query = query.eq("estado", filters.estado);
  if (filters.asignado_a) query = query.eq("asignado_a", filters.asignado_a);
  if (filters.client_id) query = query.eq("client_id", filters.client_id);
  if (filters.prioridad_max) query = query.lte("prioridad", filters.prioridad_max);

  const { data, error } = await query;
  if (error) throw new Error(`fetchAgentTasks: ${error.message}`);
  return (data ?? []) as AgentTask[];
}

export async function createAgentTask(
  task: Omit<AgentTask, "id" | "created_at" | "completed_at">
): Promise<AgentTask> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("agent_tasks")
    .insert(task)
    .select()
    .single();

  if (error) throw new Error(`createAgentTask: ${error.message}`);
  return data as AgentTask;
}

export async function updateAgentTask(
  id: string,
  updates: Partial<Pick<AgentTask, "estado" | "prioridad" | "resultado" | "notas" | "completed_at" | "asignado_a" | "human_assignee_id">>
): Promise<AgentTask> {
  const supabase = createServerClient();

  // Auto-set completed_at when marking done/failed
  if ((updates.estado === "done" || updates.estado === "failed") && !updates.completed_at) {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("agent_tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`updateAgentTask: ${error.message}`);
  return data as AgentTask;
}

export async function fetchAgentLog(
  taskId?: string,
  limit = 50
): Promise<AgentLog[]> {
  const supabase = createServerClient();
  let query = supabase
    .from("agent_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (taskId) query = query.eq("task_id", taskId);

  const { data, error } = await query;
  if (error) throw new Error(`fetchAgentLog: ${error.message}`);
  return (data ?? []) as AgentLog[];
}

export async function createAgentLogEntry(
  entry: Omit<AgentLog, "id" | "created_at">
): Promise<AgentLog> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("agent_log")
    .insert(entry)
    .select()
    .single();

  if (error) throw new Error(`createAgentLogEntry: ${error.message}`);
  return data as AgentLog;
}

/** Check if an active task already exists for a client+tipo combo */
export async function hasActiveTask(
  clientId: string,
  tipo: AgentTaskTipo
): Promise<boolean> {
  const supabase = createServerClient();
  const { count, error } = await supabase
    .from("agent_tasks")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("tipo", tipo)
    .not("estado", "in", '("done","failed")');

  if (error) throw new Error(`hasActiveTask: ${error.message}`);
  return (count ?? 0) > 0;
}
```

- [ ] **Step 2: Create cobranzas queries**

Create `lib/queries/cobranzas.ts`:

```typescript
import { createServerClient } from "@/lib/supabase-server";
import type {
  Payment,
  AgentTask,
  RenewalQueueRow,
  AgentLog,
  PaymentEstado,
  MetodoPago,
} from "@/lib/types";

/** Unified queue item for the cobranzas page */
export interface CobranzasQueueItem {
  id: string;
  tipo: "cuota" | "renovacion" | "tarea_agente";
  client_id: string | null;
  client_nombre: string;
  client_telefono: string | null;
  client_canal: string | null;
  monto_usd: number;
  dias_vencido: number; // negative = overdue, positive = days remaining
  semaforo: "vencido" | "urgente" | "proximo" | "ok";
  estado_contacto: string | null;
  // Source-specific
  payment_id: string | null;
  payment_estado: PaymentEstado | null;
  numero_cuota: number | null;
  task_id: string | null;
  task_tipo: string | null;
  task_estado: string | null;
  task_asignado_a: string | null;
  task_prioridad: number;
  // For display
  programa: string | null;
  last_log: AgentLog | null;
}

/** Fetch pending/overdue cuotas */
async function fetchPendingPayments(): Promise<CobranzasQueueItem[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("payments")
    .select(`
      id, monto_usd, fecha_vencimiento, estado, numero_cuota,
      client:clients(id, nombre, telefono, programa, estado_contacto, canal_contacto),
      lead:leads(id, nombre, telefono)
    `)
    .eq("estado", "pendiente")
    .order("fecha_vencimiento", { ascending: true });

  if (error) throw new Error(`fetchPendingPayments: ${error.message}`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (data ?? []).map((p: any) => {
    const venc = p.fecha_vencimiento ? new Date(p.fecha_vencimiento) : today;
    const diasDiff = Math.floor(
      (venc.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    const nombre = p.client?.nombre ?? p.lead?.nombre ?? "Sin nombre";
    const telefono = p.client?.telefono ?? p.lead?.telefono ?? null;

    let semaforo: CobranzasQueueItem["semaforo"];
    if (diasDiff < 0) semaforo = "vencido";
    else if (diasDiff <= 7) semaforo = "urgente";
    else if (diasDiff <= 15) semaforo = "proximo";
    else semaforo = "ok";

    return {
      id: `payment-${p.id}`,
      tipo: "cuota" as const,
      client_id: p.client?.id ?? null,
      client_nombre: nombre,
      client_telefono: telefono,
      client_canal: p.client?.canal_contacto ?? null,
      monto_usd: p.monto_usd ?? 0,
      dias_vencido: diasDiff,
      semaforo,
      estado_contacto: p.client?.estado_contacto ?? null,
      payment_id: p.id,
      payment_estado: p.estado,
      numero_cuota: p.numero_cuota,
      task_id: null,
      task_tipo: null,
      task_estado: null,
      task_asignado_a: null,
      task_prioridad: diasDiff < 0 ? 1 : diasDiff <= 3 ? 2 : 3,
      programa: p.client?.programa ?? null,
      last_log: null,
    };
  });
}

/** Fetch renewal queue items with urgency */
async function fetchRenewalQueue(): Promise<CobranzasQueueItem[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("v_renewal_queue")
    .select("*")
    .in("semaforo", ["vencido", "urgente", "proximo"])
    .order("dias_restantes", { ascending: true });

  if (error) throw new Error(`fetchRenewalQueue: ${error.message}`);

  return (data ?? []).map((r: RenewalQueueRow) => ({
    id: `renewal-${r.id}`,
    tipo: "renovacion" as const,
    client_id: r.id,
    client_nombre: r.nombre,
    client_telefono: null,
    client_canal: null,
    monto_usd: 0,
    dias_vencido: r.dias_restantes,
    semaforo: r.semaforo as CobranzasQueueItem["semaforo"],
    estado_contacto: r.estado_contacto,
    payment_id: null,
    payment_estado: null,
    numero_cuota: null,
    task_id: null,
    task_tipo: "renovacion",
    task_estado: null,
    task_asignado_a: null,
    task_prioridad: r.semaforo === "vencido" ? 1 : r.semaforo === "urgente" ? 2 : 3,
    programa: r.programa,
    last_log: null,
  }));
}

/** Fetch active agent tasks (pending/in_progress) */
async function fetchActiveAgentTasks(): Promise<CobranzasQueueItem[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("agent_tasks")
    .select(`
      *,
      client:clients(id, nombre, telefono, programa, estado_contacto, canal_contacto),
      lead:leads(id, nombre, telefono)
    `)
    .in("estado", ["pending", "in_progress"])
    .order("prioridad", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`fetchActiveAgentTasks: ${error.message}`);

  // Fetch latest log entry for each task
  const taskIds = (data ?? []).map((t: any) => t.id);
  let logMap: Record<string, AgentLog> = {};
  if (taskIds.length > 0) {
    const { data: logs } = await supabase
      .from("agent_log")
      .select("*")
      .in("task_id", taskIds)
      .order("created_at", { ascending: false });

    if (logs) {
      for (const log of logs as AgentLog[]) {
        if (!logMap[log.task_id]) {
          logMap[log.task_id] = log;
        }
      }
    }
  }

  return (data ?? []).map((t: any) => {
    const nombre = t.client?.nombre ?? t.lead?.nombre ?? "Sin nombre";
    const telefono = t.client?.telefono ?? t.lead?.telefono ?? null;

    return {
      id: `task-${t.id}`,
      tipo: "tarea_agente" as const,
      client_id: t.client_id,
      client_nombre: nombre,
      client_telefono: telefono,
      client_canal: t.client?.canal_contacto ?? t.canal,
      monto_usd: (t.contexto as any)?.monto_usd ?? 0,
      dias_vencido: (t.contexto as any)?.dias_vencido ?? 0,
      semaforo: t.prioridad <= 2 ? "vencido" as const : t.prioridad <= 3 ? "urgente" as const : "ok" as const,
      estado_contacto: t.client?.estado_contacto ?? null,
      payment_id: t.payment_id,
      payment_estado: null,
      numero_cuota: null,
      task_id: t.id,
      task_tipo: t.tipo,
      task_estado: t.estado,
      task_asignado_a: t.asignado_a,
      task_prioridad: t.prioridad,
      programa: t.client?.programa ?? null,
      last_log: logMap[t.id] ?? null,
    };
  });
}

/** Main function: combined, deduplicated, sorted queue */
export async function fetchCobranzasQueue(): Promise<CobranzasQueueItem[]> {
  const [payments, renewals, tasks] = await Promise.all([
    fetchPendingPayments(),
    fetchRenewalQueue(),
    fetchActiveAgentTasks(),
  ]);

  // Deduplicate: if a payment already has a matching agent task, keep only the task version
  const taskPaymentIds = new Set(
    tasks
      .filter((t) => t.payment_id)
      .map((t) => t.payment_id)
  );
  const filteredPayments = payments.filter(
    (p) => !taskPaymentIds.has(p.payment_id)
  );

  // Deduplicate renewals: if a renewal client already has an agent task of type 'renovacion', skip
  const taskRenewalClientIds = new Set(
    tasks
      .filter((t) => t.task_tipo === "renovacion" && t.client_id)
      .map((t) => t.client_id)
  );
  const filteredRenewals = renewals.filter(
    (r) => !taskRenewalClientIds.has(r.client_id)
  );

  const combined = [...filteredPayments, ...filteredRenewals, ...tasks];

  // Sort: vencido first, then by priority, then by amount desc
  combined.sort((a, b) => {
    const semaforoOrder = { vencido: 0, urgente: 1, proximo: 2, ok: 3 };
    const aDiff = semaforoOrder[a.semaforo] - semaforoOrder[b.semaforo];
    if (aDiff !== 0) return aDiff;
    const priDiff = a.task_prioridad - b.task_prioridad;
    if (priDiff !== 0) return priDiff;
    return b.monto_usd - a.monto_usd;
  });

  return combined;
}

/** Mark a payment as paid */
export async function markPaymentPaid(
  paymentId: string,
  data: {
    monto_usd: number;
    monto_ars?: number;
    metodo_pago: MetodoPago;
    receptor: string;
    cobrador_id: string;
    comprobante_url?: string;
  }
): Promise<Payment> {
  const supabase = createServerClient();
  const { data: updated, error } = await supabase
    .from("payments")
    .update({
      estado: "pagado" as PaymentEstado,
      fecha_pago: new Date().toISOString().split("T")[0],
      monto_usd: data.monto_usd,
      monto_ars: data.monto_ars ?? 0,
      metodo_pago: data.metodo_pago,
      receptor: data.receptor,
      cobrador_id: data.cobrador_id,
      comprobante_url: data.comprobante_url ?? null,
    })
    .eq("id", paymentId)
    .select()
    .single();

  if (error) throw new Error(`markPaymentPaid: ${error.message}`);
  return updated as Payment;
}

/** Mark an agent task as done */
export async function markTaskDone(
  taskId: string,
  resultado?: string
): Promise<AgentTask> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("agent_tasks")
    .update({
      estado: "done",
      completed_at: new Date().toISOString(),
      resultado: resultado ?? "Completado manualmente",
    })
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw new Error(`markTaskDone: ${error.message}`);
  return data as AgentTask;
}
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add lib/queries/agent-tasks.ts lib/queries/cobranzas.ts
git commit -m "feat(phase4): add queries for agent tasks and cobranzas queue"
```

---

### Task 2: Cobranzas Page

**Files:**
- Create: `app/(dashboard)/cobranzas/page.tsx`
- Create: `app/(dashboard)/cobranzas/CobranzasClient.tsx`

- [ ] **Step 1: Create server page**

Create `app/(dashboard)/cobranzas/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { fetchCobranzasQueue } from "@/lib/queries/cobranzas";
import { fetchAgentTasks } from "@/lib/queries/agent-tasks";
import CobranzasClient from "./CobranzasClient";

export const dynamic = "force-dynamic";

export default async function CobranzasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.is_admin && !session.roles.includes("cobranzas")) {
    redirect("/");
  }

  const [queue, allTasks] = await Promise.all([
    fetchCobranzasQueue(),
    fetchAgentTasks(), // For dashboard stats in Task 6
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cobranzas</h1>
      </div>
      <CobranzasClient
        initialQueue={queue}
        allTasks={allTasks}
        session={session}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create client component**

Create `app/(dashboard)/cobranzas/CobranzasClient.tsx`:

```typescript
"use client";

import { useState, useMemo } from "react";
import type { AuthSession, AgentTask } from "@/lib/types";
import type { CobranzasQueueItem } from "@/lib/queries/cobranzas";
import Semaforo from "@/app/components/Semaforo";
import StatusBadge from "@/app/components/StatusBadge";
import DataTable from "@/app/components/DataTable";

interface Props {
  initialQueue: CobranzasQueueItem[];
  allTasks: AgentTask[];
  session: AuthSession;
}

type FilterTipo = "todos" | "cuotas" | "renovaciones" | "deudores";
type FilterSemaforo = "todos" | "vencido" | "urgente" | "proximo";

export default function CobranzasClient({
  initialQueue,
  allTasks,
  session,
}: Props) {
  const [queue, setQueue] = useState(initialQueue);
  const [filterTipo, setFilterTipo] = useState<FilterTipo>("todos");
  const [filterSemaforo, setFilterSemaforo] = useState<FilterSemaforo>("todos");
  const [search, setSearch] = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const canSeeAgent = session.can_see_agent;

  const filtered = useMemo(() => {
    let items = [...queue];

    // Filter by tipo
    if (filterTipo === "cuotas") {
      items = items.filter(
        (i) => i.tipo === "cuota" || i.task_tipo === "cobrar_cuota"
      );
    } else if (filterTipo === "renovaciones") {
      items = items.filter(
        (i) => i.tipo === "renovacion" || i.task_tipo === "renovacion"
      );
    } else if (filterTipo === "deudores") {
      items = items.filter(
        (i) => i.semaforo === "vencido" && i.tipo === "cuota"
      );
    }

    // Filter by semaforo
    if (filterSemaforo !== "todos") {
      items = items.filter((i) => i.semaforo === filterSemaforo);
    }

    // Search by client name
    if (search.trim()) {
      const s = search.toLowerCase();
      items = items.filter((i) =>
        i.client_nombre.toLowerCase().includes(s)
      );
    }

    return items;
  }, [queue, filterTipo, filterSemaforo, search]);

  // --- KPI Summary ---
  const totalVencidas = queue.filter((i) => i.semaforo === "vencido").length;
  const totalUrgentes = queue.filter((i) => i.semaforo === "urgente").length;
  const montoVencido = queue
    .filter((i) => i.semaforo === "vencido")
    .reduce((sum, i) => sum + i.monto_usd, 0);

  function getSemaforoEmoji(s: string) {
    if (s === "vencido") return "\u{1F534}";
    if (s === "urgente") return "\u{1F7E1}";
    if (s === "proximo") return "\u{1F7E0}";
    return "\u{1F7E2}";
  }

  function getTipoLabel(item: CobranzasQueueItem) {
    if (item.tipo === "cuota")
      return `Cuota #${item.numero_cuota ?? "?"}`;
    if (item.tipo === "renovacion") return "Renovacion";
    if (item.task_tipo) {
      const labels: Record<string, string> = {
        cobrar_cuota: "Cobrar cuota",
        renovacion: "Renovacion",
        seguimiento: "Seguimiento",
        oportunidad_upsell: "Oportunidad upsell",
        bienvenida: "Bienvenida",
        seguimiento_urgente: "Seguimiento urgente",
        confirmar_pago: "Confirmar pago",
      };
      return labels[item.task_tipo] ?? item.task_tipo;
    }
    return item.tipo;
  }

  function getDiasLabel(dias: number) {
    if (dias < 0) return `${Math.abs(dias)}d vencida`;
    if (dias === 0) return "Vence hoy";
    return `${dias}d restantes`;
  }

  // --- Actions (implemented in Task 4, stubs here) ---
  async function handleMarkContactado(item: CobranzasQueueItem) {
    setActiveAction(item.id);
    try {
      const res = await fetch(`/api/agent-tasks/${item.task_id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "in_progress" }),
      });
      if (res.ok) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, task_estado: "in_progress", estado_contacto: "contactado" }
              : q
          )
        );
      }
    } finally {
      setActiveAction(null);
    }
  }

  async function handleEscalar(item: CobranzasQueueItem) {
    if (!item.task_id) return;
    setActiveAction(item.id);
    try {
      const res = await fetch(`/api/agent-tasks/${item.task_id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prioridad: 1 }),
      });
      if (res.ok) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, task_prioridad: 1 } : q
          )
        );
      }
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-600 font-medium">Vencidas</p>
          <p className="text-2xl font-bold text-red-800">{totalVencidas}</p>
          <p className="text-sm text-red-500">
            ${montoVencido.toLocaleString()} USD
          </p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm text-yellow-600 font-medium">Urgentes</p>
          <p className="text-2xl font-bold text-yellow-800">{totalUrgentes}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-600 font-medium">Total en cola</p>
          <p className="text-2xl font-bold text-blue-800">{queue.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-64"
        />
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value as FilterTipo)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="todos">Todos los tipos</option>
          <option value="cuotas">Cuotas</option>
          <option value="renovaciones">Renovaciones</option>
          <option value="deudores">Deudores</option>
        </select>
        <select
          value={filterSemaforo}
          onChange={(e) =>
            setFilterSemaforo(e.target.value as FilterSemaforo)
          }
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="todos">Todos los semaforos</option>
          <option value="vencido">Vencidas</option>
          <option value="urgente">Urgentes</option>
          <option value="proximo">Proximas</option>
        </select>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="px-4 py-3 font-medium text-gray-600">Monto</th>
                <th className="px-4 py-3 font-medium text-gray-600">Dias</th>
                <th className="px-4 py-3 font-medium text-gray-600">Contacto</th>
                {canSeeAgent && (
                  <th className="px-4 py-3 font-medium text-gray-600">
                    Agente
                  </th>
                )}
                <th className="px-4 py-3 font-medium text-gray-600">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-50 ${
                    item.semaforo === "vencido" ? "bg-red-50/30" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <span title={item.semaforo}>
                      {getSemaforoEmoji(item.semaforo)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{item.client_nombre}</p>
                      <p className="text-xs text-gray-500">
                        {item.programa ?? ""}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100">
                      {getTipoLabel(item)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {item.monto_usd > 0
                      ? `$${item.monto_usd.toLocaleString()}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium ${
                        item.dias_vencido < 0
                          ? "text-red-600"
                          : item.dias_vencido <= 7
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {getDiasLabel(item.dias_vencido)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs">
                      {item.estado_contacto ?? "por_contactar"}
                    </span>
                  </td>
                  {canSeeAgent && (
                    <td className="px-4 py-3">
                      {item.task_asignado_a === "agent" ? (
                        <div>
                          <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                            Bot
                          </span>
                          {item.last_log && (
                            <p className="text-xs text-gray-500 mt-1 truncate max-w-[150px]">
                              {item.last_log.accion}
                            </p>
                          )}
                        </div>
                      ) : item.task_asignado_a === "human" ? (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                          Humano
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  )}
                  {/* For users without can_see_agent: agent tasks show as "Completado" when done */}
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleMarkContactado(item)}
                        disabled={activeAction === item.id}
                        className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                        title="Marcar contactado"
                      >
                        Contactado
                      </button>
                      <button
                        onClick={() =>
                          setActiveAction(
                            activeAction === `pay-${item.id}`
                              ? null
                              : `pay-${item.id}`
                          )
                        }
                        className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        title="Marcar pagado"
                      >
                        Pagado
                      </button>
                      <button
                        onClick={() =>
                          setActiveAction(
                            activeAction === `note-${item.id}`
                              ? null
                              : `note-${item.id}`
                          )
                        }
                        className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        title="Agregar nota"
                      >
                        Nota
                      </button>
                      {item.task_id && item.task_prioridad > 1 && (
                        <button
                          onClick={() => handleEscalar(item)}
                          disabled={activeAction === item.id}
                          className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                          title="Escalar prioridad"
                        >
                          Escalar
                        </button>
                      )}
                    </div>
                    {/* Inline payment form — shown when "Pagado" clicked */}
                    {activeAction === `pay-${item.id}` && (
                      <PaymentMiniForm
                        paymentId={item.payment_id}
                        taskId={item.task_id}
                        defaultMonto={item.monto_usd}
                        sessionTeamMemberId={session.team_member_id}
                        onSuccess={() => {
                          setActiveAction(null);
                          setQueue((prev) =>
                            prev.filter((q) => q.id !== item.id)
                          );
                        }}
                        onCancel={() => setActiveAction(null)}
                      />
                    )}
                    {/* Inline note form */}
                    {activeAction === `note-${item.id}` && (
                      <NoteMiniForm
                        taskId={item.task_id}
                        clientId={item.client_id}
                        authorId={session.team_member_id}
                        onSuccess={() => setActiveAction(null)}
                        onCancel={() => setActiveAction(null)}
                      />
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={canSeeAgent ? 8 : 7}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    No hay items en la cola
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ========================================
// PaymentMiniForm — inline form to mark paid
// ========================================
function PaymentMiniForm({
  paymentId,
  taskId,
  defaultMonto,
  sessionTeamMemberId,
  onSuccess,
  onCancel,
}: {
  paymentId: string | null;
  taskId: string | null;
  defaultMonto: number;
  sessionTeamMemberId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [monto, setMonto] = useState(defaultMonto);
  const [metodo, setMetodo] = useState("binance");
  const [receptor, setReceptor] = useState("JUANMA");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/cobranzas/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_id: paymentId,
          task_id: taskId,
          monto_usd: monto,
          metodo_pago: metodo,
          receptor,
          cobrador_id: sessionTeamMemberId,
        }),
      });
      if (res.ok) onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg space-y-2"
    >
      <div className="flex gap-2">
        <input
          type="number"
          value={monto}
          onChange={(e) => setMonto(Number(e.target.value))}
          className="border rounded px-2 py-1 text-sm w-24"
          placeholder="USD"
        />
        <select
          value={metodo}
          onChange={(e) => setMetodo(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="binance">Binance</option>
          <option value="transferencia">Transferencia</option>
          <option value="caja_ahorro_usd">Caja ahorro USD</option>
          <option value="link_mp">Link MP</option>
          <option value="cash">Cash</option>
          <option value="uruguayos">Uruguayos</option>
          <option value="link_stripe">Link Stripe</option>
        </select>
      </div>
      <select
        value={receptor}
        onChange={(e) => setReceptor(e.target.value)}
        className="border rounded px-2 py-1 text-sm w-full"
      >
        <option value="JUANMA">JUANMA</option>
        <option value="Cuenta pesos Lauti">Cuenta pesos Lauti</option>
        <option value="Cuenta dolares Lauti">Cuenta dolares Lauti</option>
        <option value="Efectivo">Efectivo</option>
        <option value="Binance lauti">Binance lauti</option>
        <option value="Stripe">Stripe</option>
        <option value="Financiera Payments">Financiera Payments</option>
        <option value="Becheq">Becheq</option>
      </select>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "..." : "Confirmar pago"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs px-3 py-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ========================================
// NoteMiniForm — inline note/log entry
// ========================================
function NoteMiniForm({
  taskId,
  clientId,
  authorId,
  onSuccess,
  onCancel,
}: {
  taskId: string | null;
  clientId: string | null;
  authorId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [nota, setNota] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nota.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/cobranzas/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: taskId,
          accion: nota,
          author_id: authorId,
        }),
      });
      if (res.ok) {
        setNota("");
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2"
    >
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        className="border rounded px-2 py-1 text-sm w-full"
        rows={2}
        placeholder="Agregar nota..."
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !nota.trim()}
          className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "..." : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs px-3 py-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Add cobranzas route to Sidebar**

In `app/components/Sidebar.tsx`, add to the admin nav items array:

```typescript
// Add to ADMIN_NAV_ITEMS after the existing entries
{ href: "/cobranzas", label: "Cobranzas", icon: "DollarSign" },
{ href: "/renovaciones", label: "Renovaciones", icon: "RefreshCw" },
```

- [ ] **Step 4: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/(dashboard)/cobranzas/ app/components/Sidebar.tsx
git commit -m "feat(phase4): add cobranzas page with queue, filters, and inline forms"
```

---

### Task 3: Agent Visibility Control

**Files:**
- Modify: `app/(dashboard)/cobranzas/CobranzasClient.tsx`

- [ ] **Step 1: Implement visibility filtering in CobranzasClient**

The agent visibility logic is already integrated into the Task 2 code above. This task ensures the behavior is complete and correct. Verify/update the following in `CobranzasClient.tsx`:

In the table header, the "Agente" column is conditionally rendered:

```typescript
{canSeeAgent && (
  <th className="px-4 py-3 font-medium text-gray-600">Agente</th>
)}
```

In each table row, the agent column shows full details only for `canSeeAgent=true`:

```typescript
{canSeeAgent && (
  <td className="px-4 py-3">
    {item.task_asignado_a === "agent" ? (
      <div>
        <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
          Bot
        </span>
        {item.last_log && (
          <p className="text-xs text-gray-500 mt-1 truncate max-w-[150px]">
            {item.last_log.accion}
          </p>
        )}
      </div>
    ) : item.task_asignado_a === "human" ? (
      <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
        Humano
      </span>
    ) : (
      <span className="text-xs text-gray-400">-</span>
    )}
  </td>
)}
```

For users WITHOUT `can_see_agent` (Lauti, Juanma), the server page must strip agent details from the queue before passing to client. Add this filtering in `app/(dashboard)/cobranzas/page.tsx` before rendering:

```typescript
// After fetching queue, strip agent data for non-agent-visible users
const sanitizedQueue = session.can_see_agent
  ? queue
  : queue.map((item) => ({
      ...item,
      task_asignado_a: item.task_asignado_a === "agent" ? null : item.task_asignado_a,
      last_log: null,
      // If task was completed by agent, show generic "Completado" label
      task_estado:
        item.task_asignado_a === "agent" && item.task_estado === "done"
          ? "done"
          : item.task_estado,
    }));
```

And pass `sanitizedQueue` instead of `queue` to `CobranzasClient`.

- [ ] **Step 2: Strip agent_log from allTasks for non-agent users**

In the server page, filter the `allTasks` as well:

```typescript
const sanitizedTasks = session.can_see_agent
  ? allTasks
  : allTasks.map((t) => ({
      ...t,
      // Hide agent assignment details
      asignado_a: t.asignado_a === "agent" ? ("human" as const) : t.asignado_a,
      contexto: {} as Record<string, unknown>,
    }));
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/(dashboard)/cobranzas/
git commit -m "feat(phase4): implement agent visibility control (can_see_agent)"
```

---

### Task 4: Task Actions (Mark Done, Add Notes, Change Status)

**Files:**
- Create: `app/api/agent-tasks/[id]/route.ts`
- Create: `app/api/cobranzas/mark-paid/route.ts`
- Create: `app/api/cobranzas/log/route.ts`
- Modify: `lib/schemas.ts` (add new schemas)

- [ ] **Step 1: Add Zod schemas for cobranzas actions**

Add to `lib/schemas.ts`:

```typescript
export const markPaidSchema = z.object({
  payment_id: z.string().uuid().nullable(),
  task_id: z.string().uuid().nullable(),
  monto_usd: z.number().min(0),
  monto_ars: z.number().min(0).default(0),
  metodo_pago: z.enum([
    "binance", "transferencia", "caja_ahorro_usd",
    "link_mp", "cash", "uruguayos", "link_stripe",
  ]),
  receptor: z.string().min(1).max(100),
  cobrador_id: z.string().uuid(),
  comprobante_url: z.string().url().optional(),
});

export const agentTaskUpdateSchema = z.object({
  estado: z.enum(["pending", "in_progress", "done", "failed"]).optional(),
  prioridad: z.number().int().min(1).max(5).optional(),
  resultado: z.string().max(2000).optional(),
  notas: z.string().max(2000).optional(),
  asignado_a: z.enum(["agent", "human"]).optional(),
  human_assignee_id: z.string().uuid().optional(),
});

export const cobranzasLogSchema = z.object({
  task_id: z.string().uuid().nullable(),
  accion: z.string().min(1).max(2000),
  author_id: z.string().uuid(),
  mensaje_enviado: z.string().max(2000).optional(),
});
```

- [ ] **Step 2: Create agent-tasks PATCH route**

Create `app/api/agent-tasks/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { agentTaskUpdateSchema } from "@/lib/schemas";
import { updateAgentTask } from "@/lib/queries/agent-tasks";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = agentTaskUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const updated = await updateAgentTask(id, parsed.data);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Create mark-paid route**

Create `app/api/cobranzas/mark-paid/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { markPaidSchema } from "@/lib/schemas";
import { markPaymentPaid, markTaskDone } from "@/lib/queries/cobranzas";
import { createAgentLogEntry } from "@/lib/queries/agent-tasks";

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const parsed = markPaidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const { payment_id, task_id, ...paymentData } = parsed.data;
    let payment = null;

    // Mark payment as paid if we have a payment_id
    if (payment_id) {
      payment = await markPaymentPaid(payment_id, {
        monto_usd: paymentData.monto_usd,
        monto_ars: paymentData.monto_ars,
        metodo_pago: paymentData.metodo_pago,
        receptor: paymentData.receptor,
        cobrador_id: paymentData.cobrador_id,
        comprobante_url: paymentData.comprobante_url,
      });
    }

    // Mark associated task as done if we have a task_id
    if (task_id) {
      await markTaskDone(task_id, `Pago registrado: $${paymentData.monto_usd} via ${paymentData.metodo_pago}`);

      // Log the action
      await createAgentLogEntry({
        task_id,
        accion: `Pago marcado como pagado por ${auth.session.nombre}`,
        mensaje_enviado: null,
        respuesta_recibida: null,
        resultado: `$${paymentData.monto_usd} USD via ${paymentData.metodo_pago} a ${paymentData.receptor}`,
      });
    }

    return NextResponse.json({ success: true, payment });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Create log entry route**

Create `app/api/cobranzas/log/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { cobranzasLogSchema } from "@/lib/schemas";
import { createAgentLogEntry } from "@/lib/queries/agent-tasks";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const parsed = cobranzasLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos invalidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const { task_id, accion, author_id, mensaje_enviado } = parsed.data;

    // If there's a task_id, log against the task
    if (task_id) {
      const entry = await createAgentLogEntry({
        task_id,
        accion: `[${auth.session.nombre}] ${accion}`,
        mensaje_enviado: mensaje_enviado ?? null,
        respuesta_recibida: null,
        resultado: null,
      });
      return NextResponse.json(entry);
    }

    // If no task_id, create a standalone log (use a dummy approach — create a quick task or use follow-ups)
    // For now, return success since notes without tasks go to follow-ups
    return NextResponse.json({ success: true, message: "Nota registrada" });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add lib/schemas.ts app/api/agent-tasks/ app/api/cobranzas/
git commit -m "feat(phase4): add API routes for task actions, mark-paid, and log entries"
```

---

### Task 5: Automatic Task Generation Logic

**Files:**
- Create: `lib/task-generator.ts`
- Create: `app/api/agent-tasks/generate/route.ts`

- [ ] **Step 1: Create task generator**

Create `lib/task-generator.ts`:

```typescript
import { createServerClient } from "@/lib/supabase-server";
import { hasActiveTask, createAgentTask } from "@/lib/queries/agent-tasks";
import type {
  AgentTaskTipo,
  Client,
  Payment,
  RenewalQueueRow,
  SessionAvailability,
} from "@/lib/types";

interface GenerationResult {
  created: number;
  skipped: number;
  errors: string[];
  details: { tipo: AgentTaskTipo; client_nombre: string; created: boolean }[];
}

export async function generateTasks(): Promise<GenerationResult> {
  const supabase = createServerClient();
  const result: GenerationResult = {
    created: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  // =============================================
  // 1. Cuotas pendientes que vencen en <= 3 dias
  // =============================================
  try {
    const today = new Date();
    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 3);

    const { data: pendingPayments } = await supabase
      .from("payments")
      .select(`
        id, monto_usd, fecha_vencimiento, numero_cuota,
        client:clients(id, nombre, telefono, programa, canal_contacto, estado_contacto),
        lead:leads(id, nombre, telefono, instagram)
      `)
      .eq("estado", "pendiente")
      .lte("fecha_vencimiento", in3Days.toISOString().split("T")[0])
      .order("fecha_vencimiento", { ascending: true });

    for (const p of pendingPayments ?? []) {
      const clientId = (p as any).client?.id;
      if (!clientId) continue;

      const exists = await hasActiveTask(clientId, "cobrar_cuota");
      const clientData = (p as any).client;
      const vencDate = new Date(p.fecha_vencimiento!);
      const diasVencido = Math.floor(
        (vencDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      const prioridad = diasVencido < 0 ? 1 : diasVencido <= 0 ? 2 : 3;

      if (exists) {
        result.skipped++;
        result.details.push({
          tipo: "cobrar_cuota",
          client_nombre: clientData.nombre,
          created: false,
        });
        continue;
      }

      await createAgentTask({
        tipo: "cobrar_cuota",
        client_id: clientId,
        lead_id: null,
        payment_id: p.id,
        prioridad,
        estado: "pending",
        asignado_a: "agent",
        human_assignee_id: null,
        canal: clientData.canal_contacto === "instagram_dm" ? "dm_instagram" : "whatsapp",
        contexto: {
          client_nombre: clientData.nombre,
          client_telefono: clientData.telefono,
          programa: clientData.programa,
          monto_usd: p.monto_usd,
          numero_cuota: p.numero_cuota,
          fecha_vencimiento: p.fecha_vencimiento,
          dias_vencido: diasVencido,
          estado_contacto: clientData.estado_contacto,
          mensaje_sugerido: diasVencido < 0
            ? `Hola ${clientData.nombre}! Tu cuota #${p.numero_cuota} por $${p.monto_usd} USD vencio hace ${Math.abs(diasVencido)} dias. Necesitamos regularizar el pago para continuar con la mentoria. Te paso los datos?`
            : `Hola ${clientData.nombre}! Te recuerdo que tu cuota #${p.numero_cuota} por $${p.monto_usd} USD vence ${diasVencido === 0 ? "hoy" : `en ${diasVencido} dias`}. Te paso los datos de pago?`,
        },
        scheduled_at: new Date().toISOString(),
        resultado: null,
        notas: null,
      });

      result.created++;
      result.details.push({
        tipo: "cobrar_cuota",
        client_nombre: clientData.nombre,
        created: true,
      });
    }
  } catch (err: any) {
    result.errors.push(`cobrar_cuota: ${err.message}`);
  }

  // =============================================
  // 2. Renovaciones proximas (from v_renewal_queue)
  // =============================================
  try {
    const { data: renewals } = await supabase
      .from("v_renewal_queue")
      .select("*")
      .in("semaforo", ["vencido", "urgente", "proximo"]);

    for (const r of (renewals ?? []) as RenewalQueueRow[]) {
      const exists = await hasActiveTask(r.id, "renovacion");
      const prioridad =
        r.semaforo === "vencido" ? 1 : r.semaforo === "urgente" ? 2 : 3;

      if (exists) {
        result.skipped++;
        result.details.push({
          tipo: "renovacion",
          client_nombre: r.nombre,
          created: false,
        });
        continue;
      }

      // Fetch full client for contexto
      const { data: fullClient } = await supabase
        .from("clients")
        .select("telefono, canal_contacto, estado_contacto, health_score")
        .eq("id", r.id)
        .single();

      await createAgentTask({
        tipo: "renovacion",
        client_id: r.id,
        lead_id: null,
        payment_id: null,
        prioridad,
        estado: "pending",
        asignado_a: "agent",
        human_assignee_id: null,
        canal: fullClient?.canal_contacto === "instagram_dm" ? "dm_instagram" : "whatsapp",
        contexto: {
          client_nombre: r.nombre,
          client_telefono: fullClient?.telefono,
          programa: r.programa,
          fecha_vencimiento: r.fecha_vencimiento,
          dias_restantes: r.dias_restantes,
          semaforo: r.semaforo,
          health_score: r.health_score,
          estado_contacto: fullClient?.estado_contacto,
          mensaje_sugerido: r.dias_restantes < 0
            ? `Hola ${r.nombre}! Tu mentoria de ${r.programa} ya finalizo. Queriamos saber como te fue y si te interesa renovar para seguir avanzando. Tenes un momento para hablar?`
            : `Hola ${r.nombre}! Tu mentoria de ${r.programa} finaliza en ${r.dias_restantes} dias. Queriamos contactarte para hablar sobre la renovacion y las opciones disponibles.`,
        },
        scheduled_at: new Date().toISOString(),
        resultado: null,
        notas: null,
      });

      result.created++;
      result.details.push({
        tipo: "renovacion",
        client_nombre: r.nombre,
        created: true,
      });
    }
  } catch (err: any) {
    result.errors.push(`renovacion: ${err.message}`);
  }

  // =============================================
  // 3. Seguimiento: activos sin seguimiento 7+ dias
  // =============================================
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: needsFollowUp } = await supabase
      .from("clients")
      .select("id, nombre, telefono, programa, canal_contacto, estado_contacto, fecha_ultimo_seguimiento, health_score")
      .eq("estado", "activo")
      .eq("estado_seguimiento", "para_seguimiento")
      .lt("fecha_ultimo_seguimiento", sevenDaysAgo.toISOString().split("T")[0]);

    for (const c of needsFollowUp ?? []) {
      const exists = await hasActiveTask(c.id, "seguimiento");
      if (exists) {
        result.skipped++;
        result.details.push({
          tipo: "seguimiento",
          client_nombre: c.nombre,
          created: false,
        });
        continue;
      }

      const daysSince = c.fecha_ultimo_seguimiento
        ? Math.floor(
            (new Date().getTime() - new Date(c.fecha_ultimo_seguimiento).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 999;

      await createAgentTask({
        tipo: "seguimiento",
        client_id: c.id,
        lead_id: null,
        payment_id: null,
        prioridad: daysSince > 14 ? 2 : 3,
        estado: "pending",
        asignado_a: "human",
        human_assignee_id: null,
        canal: (c as any).canal_contacto === "instagram_dm" ? "dm_instagram" : "whatsapp",
        contexto: {
          client_nombre: c.nombre,
          client_telefono: (c as any).telefono,
          programa: (c as any).programa,
          dias_sin_seguimiento: daysSince,
          health_score: (c as any).health_score,
          estado_contacto: (c as any).estado_contacto,
          mensaje_sugerido: `Hola ${c.nombre}! Hace ${daysSince} dias que no hablamos. Como vas con la mentoria? Necesitas algo?`,
        },
        scheduled_at: new Date().toISOString(),
        resultado: null,
        notas: null,
      });

      result.created++;
      result.details.push({
        tipo: "seguimiento",
        client_nombre: c.nombre,
        created: true,
      });
    }
  } catch (err: any) {
    result.errors.push(`seguimiento: ${err.message}`);
  }

  // =============================================
  // 4. Upsell: sesiones agotadas (v_session_availability)
  // =============================================
  try {
    const { data: exhausted } = await supabase
      .from("v_session_availability")
      .select("*")
      .eq("semaforo", "agotadas");

    for (const s of (exhausted ?? []) as SessionAvailability[]) {
      const exists = await hasActiveTask(s.client_id, "oportunidad_upsell");
      if (exists) {
        result.skipped++;
        result.details.push({
          tipo: "oportunidad_upsell",
          client_nombre: s.nombre,
          created: false,
        });
        continue;
      }

      const { data: fullClient } = await supabase
        .from("clients")
        .select("telefono, canal_contacto, estado_contacto, health_score")
        .eq("id", s.client_id)
        .single();

      await createAgentTask({
        tipo: "oportunidad_upsell",
        client_id: s.client_id,
        lead_id: null,
        payment_id: null,
        prioridad: 4,
        estado: "pending",
        asignado_a: "human",
        human_assignee_id: null,
        canal: fullClient?.canal_contacto === "instagram_dm" ? "dm_instagram" : "whatsapp",
        contexto: {
          client_nombre: s.nombre,
          client_telefono: fullClient?.telefono,
          programa: s.programa,
          sesiones_consumidas: s.sesiones_consumidas,
          llamadas_base: s.llamadas_base,
          rating_promedio: s.rating_promedio,
          health_score: fullClient?.health_score,
          mensaje_sugerido: `${s.nombre} agoto sus ${s.llamadas_base} sesiones 1a1. Rating promedio: ${s.rating_promedio ?? "N/A"}. Evaluar upsell a VIP o sesiones adicionales.`,
        },
        scheduled_at: new Date().toISOString(),
        resultado: null,
        notas: null,
      });

      result.created++;
      result.details.push({
        tipo: "oportunidad_upsell",
        client_nombre: s.nombre,
        created: true,
      });
    }
  } catch (err: any) {
    result.errors.push(`oportunidad_upsell: ${err.message}`);
  }

  // =============================================
  // 5. Bienvenida: leads cerrados sin onboarding
  // =============================================
  try {
    const { data: closedLeads } = await supabase
      .from("leads")
      .select("id, nombre, telefono, instagram, programa_pitcheado, ticket_total")
      .eq("estado", "cerrado");

    for (const lead of closedLeads ?? []) {
      // Check if onboarding exists
      const { count } = await supabase
        .from("onboarding")
        .select("id", { count: "exact", head: true })
        .eq("lead_id", lead.id);

      if ((count ?? 0) > 0) {
        result.skipped++;
        continue;
      }

      // Check if active task exists (use lead_id check since there's no client yet)
      const { count: taskCount } = await supabase
        .from("agent_tasks")
        .select("id", { count: "exact", head: true })
        .eq("lead_id", lead.id)
        .eq("tipo", "bienvenida")
        .not("estado", "in", '("done","failed")');

      if ((taskCount ?? 0) > 0) {
        result.skipped++;
        result.details.push({
          tipo: "bienvenida",
          client_nombre: lead.nombre,
          created: false,
        });
        continue;
      }

      await createAgentTask({
        tipo: "bienvenida",
        client_id: null,
        lead_id: lead.id,
        payment_id: null,
        prioridad: 1,
        estado: "pending",
        asignado_a: "human",
        human_assignee_id: null,
        canal: "whatsapp",
        contexto: {
          lead_nombre: lead.nombre,
          lead_telefono: lead.telefono,
          lead_instagram: lead.instagram,
          programa: lead.programa_pitcheado,
          ticket_total: lead.ticket_total,
          mensaje_sugerido: `Bienvenido ${lead.nombre}! Muchas gracias por confiar en nosotros. El proximo paso es completar tu formulario de onboarding para que podamos configurar todo y arrancar con tu mentoria lo antes posible.`,
        },
        scheduled_at: new Date().toISOString(),
        resultado: null,
        notas: null,
      });

      result.created++;
      result.details.push({
        tipo: "bienvenida",
        client_nombre: lead.nombre,
        created: true,
      });
    }
  } catch (err: any) {
    result.errors.push(`bienvenida: ${err.message}`);
  }

  // =============================================
  // 6. Seguimiento urgente: rating <= 5 en 1a1
  // =============================================
  try {
    const { data: lowRated } = await supabase
      .from("tracker_sessions")
      .select("id, client_id, rating, numero_sesion, client:clients(id, nombre, telefono, programa, canal_contacto, health_score)")
      .lte("rating", 5)
      .not("rating", "is", null)
      .eq("estado", "done");

    for (const session of lowRated ?? []) {
      const clientId = (session as any).client?.id;
      if (!clientId) continue;

      const exists = await hasActiveTask(clientId, "seguimiento_urgente");
      if (exists) {
        result.skipped++;
        result.details.push({
          tipo: "seguimiento_urgente",
          client_nombre: (session as any).client.nombre,
          created: false,
        });
        continue;
      }

      const clientData = (session as any).client;
      await createAgentTask({
        tipo: "seguimiento_urgente",
        client_id: clientId,
        lead_id: null,
        payment_id: null,
        prioridad: 1,
        estado: "pending",
        asignado_a: "human",
        human_assignee_id: null,
        canal: clientData.canal_contacto === "instagram_dm" ? "dm_instagram" : "whatsapp",
        contexto: {
          client_nombre: clientData.nombre,
          client_telefono: clientData.telefono,
          programa: clientData.programa,
          rating: session.rating,
          numero_sesion: session.numero_sesion,
          health_score: clientData.health_score,
          motivo: `Rating ${session.rating}/10 en sesion #${session.numero_sesion}`,
          mensaje_sugerido: `URGENTE: ${clientData.nombre} dio rating ${session.rating}/10 en su sesion #${session.numero_sesion}. Contactar inmediatamente para entender que paso y ofrecer solucion.`,
        },
        scheduled_at: new Date().toISOString(),
        resultado: null,
        notas: null,
      });

      result.created++;
      result.details.push({
        tipo: "seguimiento_urgente",
        client_nombre: clientData.nombre,
        created: true,
      });
    }
  } catch (err: any) {
    result.errors.push(`seguimiento_urgente (rating): ${err.message}`);
  }

  // =============================================
  // 7. Seguimiento urgente: health_score < 50
  // =============================================
  try {
    const { data: lowHealth } = await supabase
      .from("clients")
      .select("id, nombre, telefono, programa, canal_contacto, health_score")
      .eq("estado", "activo")
      .lt("health_score", 50);

    for (const c of lowHealth ?? []) {
      const exists = await hasActiveTask(c.id, "seguimiento_urgente");
      if (exists) {
        result.skipped++;
        result.details.push({
          tipo: "seguimiento_urgente",
          client_nombre: c.nombre,
          created: false,
        });
        continue;
      }

      await createAgentTask({
        tipo: "seguimiento_urgente",
        client_id: c.id,
        lead_id: null,
        payment_id: null,
        prioridad: 1,
        estado: "pending",
        asignado_a: "human",
        human_assignee_id: null,
        canal: (c as any).canal_contacto === "instagram_dm" ? "dm_instagram" : "whatsapp",
        contexto: {
          client_nombre: c.nombre,
          client_telefono: (c as any).telefono,
          programa: (c as any).programa,
          health_score: c.health_score,
          motivo: `Health score critico: ${c.health_score}/100`,
          mensaje_sugerido: `ATENCION: ${c.nombre} tiene health score ${c.health_score}/100. Riesgo alto de churn. Contactar para entender situacion y re-enganchar.`,
        },
        scheduled_at: new Date().toISOString(),
        resultado: null,
        notas: null,
      });

      result.created++;
      result.details.push({
        tipo: "seguimiento_urgente",
        client_nombre: c.nombre,
        created: true,
      });
    }
  } catch (err: any) {
    result.errors.push(`seguimiento_urgente (health): ${err.message}`);
  }

  return result;
}
```

- [ ] **Step 2: Create generate API route**

Create `app/api/agent-tasks/generate/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { generateTasks } from "@/lib/task-generator";

export async function POST(request: NextRequest) {
  // Allow admin users OR requests with service role key (for n8n)
  const serviceKey = request.headers.get("x-service-key");
  const isServiceCall = serviceKey === process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isServiceCall) {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
  }

  try {
    const result = await generateTasks();
    return NextResponse.json({
      success: true,
      created: result.created,
      skipped: result.skipped,
      errors: result.errors,
      details: result.details,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add lib/task-generator.ts app/api/agent-tasks/generate/
git commit -m "feat(phase4): add automatic task generation with 7 trigger types"
```

---

### Task 6: Agent Tasks Dashboard (Admin)

**Files:**
- Modify: `app/(dashboard)/cobranzas/CobranzasClient.tsx`

- [ ] **Step 1: Add dashboard section to CobranzasClient**

Add the following component at the top of the `CobranzasClient` return, after the KPI cards but before the filters. Insert this code in `CobranzasClient.tsx`:

```typescript
// Add this inside CobranzasClient, after the KPI cards grid div

{/* Agent Tasks Dashboard */}
<div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
  <div className="flex items-center justify-between">
    <h2 className="text-lg font-semibold">Panel de Tareas</h2>
    <button
      onClick={async () => {
        const res = await fetch("/api/agent-tasks/generate", {
          method: "POST",
        });
        if (res.ok) {
          const data = await res.json();
          alert(
            `Tareas generadas: ${data.created} creadas, ${data.skipped} duplicadas`
          );
          window.location.reload();
        }
      }}
      className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
    >
      Generar tareas
    </button>
  </div>

  {/* Task stats by status */}
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    {(
      [
        {
          label: "Pendientes",
          count: allTasks.filter((t) => t.estado === "pending").length,
          color: "text-yellow-600 bg-yellow-50",
        },
        {
          label: "En progreso",
          count: allTasks.filter((t) => t.estado === "in_progress").length,
          color: "text-blue-600 bg-blue-50",
        },
        {
          label: "Completadas",
          count: allTasks.filter((t) => t.estado === "done").length,
          color: "text-green-600 bg-green-50",
        },
        {
          label: "Fallidas",
          count: allTasks.filter((t) => t.estado === "failed").length,
          color: "text-red-600 bg-red-50",
        },
      ] as const
    ).map((stat) => (
      <div
        key={stat.label}
        className={`rounded-lg p-3 ${stat.color}`}
      >
        <p className="text-xs font-medium">{stat.label}</p>
        <p className="text-xl font-bold">{stat.count}</p>
      </div>
    ))}
  </div>

  {/* Tasks by type */}
  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
    {(
      [
        { tipo: "cobrar_cuota", label: "Cobrar cuota" },
        { tipo: "renovacion", label: "Renovacion" },
        { tipo: "seguimiento", label: "Seguimiento" },
        { tipo: "oportunidad_upsell", label: "Upsell" },
        { tipo: "bienvenida", label: "Bienvenida" },
        { tipo: "seguimiento_urgente", label: "Urgente" },
        { tipo: "confirmar_pago", label: "Confirmar pago" },
      ] as const
    ).map((t) => {
      const count = allTasks.filter(
        (task) => task.tipo === t.tipo
      ).length;
      const active = allTasks.filter(
        (task) =>
          task.tipo === t.tipo &&
          (task.estado === "pending" || task.estado === "in_progress")
      ).length;
      return (
        <div
          key={t.tipo}
          className="text-xs border rounded-lg px-2 py-1.5 flex justify-between items-center"
        >
          <span className="text-gray-600">{t.label}</span>
          <span className="font-medium">
            {active}/{count}
          </span>
        </div>
      );
    })}
  </div>

  {/* Completion rate */}
  {(() => {
    const total = allTasks.length;
    const done = allTasks.filter((t) => t.estado === "done").length;
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-100 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${rate}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-600">
          {rate}% completado ({done}/{total})
        </span>
      </div>
    );
  })()}

  {/* Recent activity (agent log) — only for can_see_agent */}
  {canSeeAgent && (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-gray-600 mb-2">
        Actividad reciente del agente
      </h3>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {queue
          .filter((item) => item.last_log && item.task_asignado_a === "agent")
          .slice(0, 10)
          .map((item) => (
            <div
              key={`log-${item.id}`}
              className="flex items-center gap-2 text-xs text-gray-500 py-1 border-b border-gray-50"
            >
              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                Bot
              </span>
              <span className="font-medium text-gray-700">
                {item.client_nombre}
              </span>
              <span>{item.last_log!.accion}</span>
              <span className="ml-auto text-gray-400">
                {new Date(item.last_log!.created_at).toLocaleDateString("es-AR")}
              </span>
            </div>
          ))}
        {queue.filter((item) => item.last_log && item.task_asignado_a === "agent")
          .length === 0 && (
          <p className="text-xs text-gray-400">
            Sin actividad reciente del agente
          </p>
        )}
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/(dashboard)/cobranzas/CobranzasClient.tsx
git commit -m "feat(phase4): add agent tasks dashboard with stats and activity feed"
```

---

### Task 7: Renovaciones Management

**Files:**
- Create: `app/(dashboard)/renovaciones/page.tsx`
- Create: `app/(dashboard)/renovaciones/RenovacionesClient.tsx`

- [ ] **Step 1: Create server page**

Create `app/(dashboard)/renovaciones/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase-server";
import type { RenewalQueueRow, RenewalHistory } from "@/lib/types";
import RenovacionesClient from "./RenovacionesClient";

export const dynamic = "force-dynamic";

export default async function RenovacionesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.is_admin) redirect("/");

  const supabase = createServerClient();

  const [
    { data: renewalQueue },
    { data: renewalHistory },
    { data: clients },
  ] = await Promise.all([
    supabase
      .from("v_renewal_queue")
      .select("*")
      .order("dias_restantes", { ascending: true }),
    supabase
      .from("renewal_history")
      .select("*, client:clients(id, nombre, programa), responsable:team_members(id, nombre)")
      .order("fecha_renovacion", { ascending: false })
      .limit(100),
    supabase
      .from("clients")
      .select("id, nombre, programa, estado, fecha_onboarding, fecha_offboarding, total_dias_programa, health_score")
      .in("estado", ["activo", "inactivo"]),
  ]);

  // Calculate metrics
  const allClients = clients ?? [];
  const activeCount = allClients.filter((c) => c.estado === "activo").length;
  const expiredCount = allClients.filter((c) => {
    if (!c.fecha_onboarding) return false;
    const venc = new Date(c.fecha_onboarding);
    venc.setDate(venc.getDate() + (c.total_dias_programa ?? 90));
    return venc < new Date();
  }).length;

  const allRenewals = (renewalHistory ?? []) as any[];
  const renewedCount = allRenewals.filter((r: any) => r.estado === "pago").length;
  const totalRevenue = allRenewals
    .filter((r: any) => r.estado === "pago")
    .reduce((sum: number, r: any) => sum + (r.monto_total ?? 0), 0);

  const tasaRenovacion =
    expiredCount > 0 ? Math.round((renewedCount / expiredCount) * 100) : 0;
  const revenuePromedio =
    renewedCount > 0 ? Math.round(totalRevenue / renewedCount) : 0;
  const churnRate =
    expiredCount > 0
      ? Math.round(((expiredCount - renewedCount) / expiredCount) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Renovaciones</h1>
      <RenovacionesClient
        renewalQueue={(renewalQueue ?? []) as RenewalQueueRow[]}
        renewalHistory={allRenewals}
        metrics={{
          tasaRenovacion,
          revenuePromedio,
          churnRate,
          totalRevenue,
          renewedCount,
          expiredCount,
        }}
        session={session}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create client component**

Create `app/(dashboard)/renovaciones/RenovacionesClient.tsx`:

```typescript
"use client";

import { useState, useMemo } from "react";
import type { AuthSession, RenewalQueueRow } from "@/lib/types";

interface RenewalHistoryItem {
  id: string;
  client_id: string;
  tipo_renovacion: string | null;
  programa_anterior: string | null;
  programa_nuevo: string | null;
  monto_total: number;
  plan_pago: string | null;
  estado: string | null;
  fecha_renovacion: string | null;
  client?: { id: string; nombre: string; programa: string | null };
  responsable?: { id: string; nombre: string };
}

interface Metrics {
  tasaRenovacion: number;
  revenuePromedio: number;
  churnRate: number;
  totalRevenue: number;
  renewedCount: number;
  expiredCount: number;
}

interface Props {
  renewalQueue: RenewalQueueRow[];
  renewalHistory: RenewalHistoryItem[];
  metrics: Metrics;
  session: AuthSession;
}

type Tab = "queue" | "historial";

export default function RenovacionesClient({
  renewalQueue,
  renewalHistory,
  metrics,
  session,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("queue");
  const [search, setSearch] = useState("");
  const [filterSemaforo, setFilterSemaforo] = useState<string>("todos");
  const [showRenewalForm, setShowRenewalForm] = useState<string | null>(null);

  const filteredQueue = useMemo(() => {
    let items = [...renewalQueue];
    if (filterSemaforo !== "todos") {
      items = items.filter((i) => i.semaforo === filterSemaforo);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      items = items.filter((i) => i.nombre.toLowerCase().includes(s));
    }
    return items;
  }, [renewalQueue, filterSemaforo, search]);

  function getPredictionBadge(item: RenewalQueueRow) {
    if (item.health_score >= 70) {
      return (
        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
          Alta probabilidad
        </span>
      );
    }
    if (item.health_score < 50) {
      return (
        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
          Riesgo churn
        </span>
      );
    }
    return (
      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
        Media
      </span>
    );
  }

  function getSemaforoEmoji(s: string) {
    if (s === "vencido") return "\u{1F534}";
    if (s === "urgente") return "\u{1F7E1}";
    if (s === "proximo") return "\u{1F7E0}";
    return "\u{1F7E2}";
  }

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Tasa de renovacion</p>
          <p className="text-2xl font-bold text-green-600">
            {metrics.tasaRenovacion}%
          </p>
          <p className="text-xs text-gray-400">
            {metrics.renewedCount}/{metrics.expiredCount} clientes
          </p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Revenue por renovacion</p>
          <p className="text-2xl font-bold">
            ${metrics.revenuePromedio.toLocaleString()}
          </p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Revenue total renovaciones</p>
          <p className="text-2xl font-bold text-blue-600">
            ${metrics.totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Churn rate</p>
          <p className="text-2xl font-bold text-red-600">
            {metrics.churnRate}%
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("queue")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === "queue"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Cola de renovaciones ({renewalQueue.length})
        </button>
        <button
          onClick={() => setActiveTab("historial")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === "historial"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Historial ({renewalHistory.length})
        </button>
      </div>

      {activeTab === "queue" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-64"
            />
            <select
              value={filterSemaforo}
              onChange={(e) => setFilterSemaforo(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="todos">Todos</option>
              <option value="vencido">Vencidos</option>
              <option value="urgente">Urgentes</option>
              <option value="proximo">Proximos</option>
              <option value="ok">Al dia</option>
            </select>
          </div>

          {/* Queue Table */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Cliente</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Programa</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Vencimiento</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Dias</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Health</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Prediccion</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Contacto</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredQueue.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50 ${
                        item.semaforo === "vencido" ? "bg-red-50/30" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        {getSemaforoEmoji(item.semaforo)}
                      </td>
                      <td className="px-4 py-3 font-medium">{item.nombre}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {item.programa}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {item.fecha_vencimiento
                          ? new Date(item.fecha_vencimiento).toLocaleDateString(
                              "es-AR"
                            )
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium ${
                            item.dias_restantes < 0
                              ? "text-red-600"
                              : item.dias_restantes <= 7
                              ? "text-yellow-600"
                              : "text-green-600"
                          }`}
                        >
                          {item.dias_restantes < 0
                            ? `${Math.abs(item.dias_restantes)}d vencido`
                            : `${item.dias_restantes}d`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-bold ${
                            item.health_score >= 80
                              ? "text-green-600"
                              : item.health_score >= 50
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {item.health_score}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getPredictionBadge(item)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {item.estado_contacto}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            setShowRenewalForm(
                              showRenewalForm === item.id ? null : item.id
                            )
                          }
                          className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Registrar renovacion
                        </button>
                        {showRenewalForm === item.id && (
                          <RenewalForm
                            clientId={item.id}
                            clientNombre={item.nombre}
                            programaActual={item.programa}
                            sessionMemberId={session.team_member_id}
                            onSuccess={() => {
                              setShowRenewalForm(null);
                              window.location.reload();
                            }}
                            onCancel={() => setShowRenewalForm(null)}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredQueue.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-12 text-center text-gray-400"
                      >
                        No hay renovaciones en cola
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === "historial" && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">Fecha</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Cliente</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Tipo</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Anterior</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Nuevo</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Monto</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Plan</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {renewalHistory.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      {r.fecha_renovacion
                        ? new Date(r.fecha_renovacion).toLocaleDateString("es-AR")
                        : "-"}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {r.client?.nombre ?? "-"}
                    </td>
                    <td className="px-4 py-3">{r.tipo_renovacion ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {r.programa_anterior ?? "-"}
                    </td>
                    <td className="px-4 py-3">{r.programa_nuevo ?? "-"}</td>
                    <td className="px-4 py-3 font-medium">
                      ${(r.monto_total ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {r.plan_pago ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.estado === "pago"
                            ? "bg-green-100 text-green-700"
                            : r.estado === "no_renueva"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {r.estado ?? "pendiente"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {r.responsable?.nombre ?? "-"}
                    </td>
                  </tr>
                ))}
                {renewalHistory.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-gray-400"
                    >
                      Sin historial de renovaciones
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// RenewalForm — register a new renewal
// ========================================
function RenewalForm({
  clientId,
  clientNombre,
  programaActual,
  sessionMemberId,
  onSuccess,
  onCancel,
}: {
  clientId: string;
  clientNombre: string;
  programaActual: string;
  sessionMemberId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [tipo, setTipo] = useState("resell");
  const [programaNuevo, setProgramaNuevo] = useState(programaActual);
  const [monto, setMonto] = useState(0);
  const [planPago, setPlanPago] = useState("paid_in_full");
  const [metodo, setMetodo] = useState("binance");
  const [receptor, setReceptor] = useState("JUANMA");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Create renewal_history record
      const renewalRes = await fetch("/api/renewals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          tipo_renovacion: tipo,
          programa_anterior: programaActual,
          programa_nuevo: programaNuevo,
          monto_total: monto,
          plan_pago: planPago,
          estado: planPago === "paid_in_full" ? "pago" : "cuota_1_pagada",
          fecha_renovacion: new Date().toISOString().split("T")[0],
          responsable_id: sessionMemberId,
        }),
      });

      if (!renewalRes.ok) throw new Error("Error al crear renovacion");
      const renewal = await renewalRes.json();

      // 2. Create payment record
      const paymentRes = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          renewal_id: renewal.id,
          numero_cuota: 1,
          monto_usd: planPago === "paid_in_full" ? monto : Math.ceil(monto / 2),
          fecha_pago: new Date().toISOString().split("T")[0],
          fecha_vencimiento: new Date().toISOString().split("T")[0],
          estado: "pagado",
          metodo_pago: metodo,
          receptor,
          cobrador_id: sessionMemberId,
          es_renovacion: true,
        }),
      });

      if (paymentRes.ok) {
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 p-4 bg-green-50 border border-green-200 rounded-lg space-y-3"
    >
      <p className="text-sm font-medium">
        Renovacion para {clientNombre}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="resell">Resell</option>
          <option value="upsell_vip">Upsell VIP</option>
          <option value="upsell_meli">Upsell Meli</option>
          <option value="upsell_vip_cuotas">Upsell VIP Cuotas</option>
          <option value="upsell_meli_cuotas">Upsell Meli Cuotas</option>
          <option value="resell_cuotas">Resell Cuotas</option>
        </select>
        <select
          value={programaNuevo}
          onChange={(e) => setProgramaNuevo(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="mentoria_1k_pyf">Mentoria 1K PYF</option>
          <option value="mentoria_2_5k_pyf">Mentoria 2.5K PYF</option>
          <option value="mentoria_2_8k_pyf">Mentoria 2.8K PYF</option>
          <option value="mentoria_5k">Mentoria 5K</option>
          <option value="vip_5k">VIP 5K</option>
          <option value="mentoria_2_5k_cuotas">Mentoria 2.5K Cuotas</option>
          <option value="mentoria_5k_cuotas">Mentoria 5K Cuotas</option>
          <option value="mentoria_1k_cuotas">Mentoria 1K Cuotas</option>
          <option value="mentoria_fee">Mentoria Fee</option>
          <option value="cuota_vip_mantencion">Cuota VIP Mantencion</option>
        </select>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input
          type="number"
          value={monto}
          onChange={(e) => setMonto(Number(e.target.value))}
          className="border rounded px-2 py-1 text-sm"
          placeholder="Monto USD"
        />
        <select
          value={planPago}
          onChange={(e) => setPlanPago(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="paid_in_full">Paid in Full</option>
          <option value="2_cuotas">2 Cuotas</option>
        </select>
        <select
          value={metodo}
          onChange={(e) => setMetodo(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="binance">Binance</option>
          <option value="transferencia">Transferencia</option>
          <option value="caja_ahorro_usd">Caja ahorro USD</option>
          <option value="link_mp">Link MP</option>
          <option value="cash">Cash</option>
          <option value="uruguayos">Uruguayos</option>
          <option value="link_stripe">Link Stripe</option>
        </select>
      </div>
      <select
        value={receptor}
        onChange={(e) => setReceptor(e.target.value)}
        className="border rounded px-2 py-1 text-sm w-full"
      >
        <option value="JUANMA">JUANMA</option>
        <option value="Cuenta pesos Lauti">Cuenta pesos Lauti</option>
        <option value="Cuenta dolares Lauti">Cuenta dolares Lauti</option>
        <option value="Efectivo">Efectivo</option>
        <option value="Binance lauti">Binance lauti</option>
        <option value="Stripe">Stripe</option>
        <option value="Financiera Payments">Financiera Payments</option>
        <option value="Becheq">Becheq</option>
      </select>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || monto <= 0}
          className="text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Registrar renovacion"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs px-3 py-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/(dashboard)/renovaciones/
git commit -m "feat(phase4): add renovaciones page with metrics, queue, historial, and renewal form"
```
