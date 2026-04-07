# Lauti CRM Phase 6: IG Metrics, Reportes, UTM & Admin

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** Build the four remaining admin-facing pages: IG Metrics dashboard with charts and funnel, Reportes Diarios with setter activity tracking, UTM Builder with performance tracking, and Admin Panel for team/payment management.

**Architecture:** Server components fetch data via lib/queries, client components handle interactivity (forms, charts, filters). API routes handle mutations. Recharts for all charts. Admin-only pages use `requireAdmin()`.

**Depends on:** Phase 1 (schema, types, auth, components)

**Spec:** `docs/superpowers/specs/2026-04-06-lauti-crm-design.md`

---

### Task 1: IG Metrics Queries + Page

**Files:**
- Create: `lib/queries/ig-metrics.ts`
- Create: `lib/schemas/ig-metrics.ts`
- Create: `app/api/ig-metrics/route.ts`
- Create: `app/(dashboard)/ig-metrics/page.tsx`
- Create: `app/(dashboard)/ig-metrics/IgMetricsClient.tsx`

- [ ] **Step 1: Create IG metrics query functions**

Create `lib/queries/ig-metrics.ts`:

```typescript
import { createServerClient } from "@/lib/supabase-server";
import type { IgMetrics } from "@/lib/types";

export async function fetchIgMetrics(): Promise<IgMetrics[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("ig_metrics")
    .select("*")
    .order("fecha_inicio", { ascending: false });

  if (error) throw error;
  return (data ?? []) as IgMetrics[];
}

export async function fetchLatestIgMetrics(): Promise<IgMetrics | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("ig_metrics")
    .select("*")
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data as IgMetrics) ?? null;
}

export async function fetchIgMetricsPair(): Promise<{
  current: IgMetrics | null;
  previous: IgMetrics | null;
}> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("ig_metrics")
    .select("*")
    .order("fecha_inicio", { ascending: false })
    .limit(2);

  if (error) throw error;
  const rows = (data ?? []) as IgMetrics[];
  return {
    current: rows[0] ?? null,
    previous: rows[1] ?? null,
  };
}

export async function createIgMetric(
  metric: Omit<IgMetrics, "id" | "created_at">
): Promise<IgMetrics> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("ig_metrics")
    .insert(metric)
    .select()
    .single();

  if (error) throw error;
  return data as IgMetrics;
}
```

- [ ] **Step 2: Create Zod schema for IG metrics**

Create `lib/schemas/ig-metrics.ts`:

```typescript
import { z } from "zod";

export const igMetricsSchema = z.object({
  periodo: z.string().min(1, "Periodo requerido"),
  fecha_inicio: z.string().min(1, "Fecha inicio requerida"),
  fecha_fin: z.string().min(1, "Fecha fin requerida"),
  // Alcance
  cuentas_alcanzadas: z.number().int().min(0).default(0),
  delta_alcance_pct: z.number().default(0),
  impresiones: z.number().int().min(0).default(0),
  delta_impresiones_pct: z.number().default(0),
  visitas_perfil: z.number().int().min(0).default(0),
  delta_visitas_pct: z.number().default(0),
  toques_enlaces: z.number().int().min(0).default(0),
  delta_enlaces_pct: z.number().default(0),
  pct_alcance_no_seguidores: z.number().min(0).max(100).default(0),
  // Seguidores
  nuevos_seguidores: z.number().int().min(0).default(0),
  delta_seguidores_pct: z.number().default(0),
  unfollows: z.number().int().min(0).default(0),
  total_seguidores: z.number().int().min(0).default(0),
  // Interacciones generales
  total_interacciones: z.number().int().min(0).default(0),
  delta_interacciones_pct: z.number().default(0),
  cuentas_interaccion: z.number().int().min(0).default(0),
  pct_interaccion_no_seguidores: z.number().min(0).max(100).default(0),
  // Reels
  reels_publicados: z.number().int().min(0).default(0),
  interacciones_reels: z.number().int().min(0).default(0),
  delta_reels_pct: z.number().default(0),
  likes_reels: z.number().int().min(0).default(0),
  comentarios_reels: z.number().int().min(0).default(0),
  compartidos_reels: z.number().int().min(0).default(0),
  guardados_reels: z.number().int().min(0).default(0),
  // Posts
  posts_publicados: z.number().int().min(0).default(0),
  interacciones_posts: z.number().int().min(0).default(0),
  delta_posts_pct: z.number().default(0),
  likes_posts: z.number().int().min(0).default(0),
  comentarios_posts: z.number().int().min(0).default(0),
  compartidos_posts: z.number().int().min(0).default(0),
  guardados_posts: z.number().int().min(0).default(0),
  // Stories
  stories_publicadas: z.number().int().min(0).default(0),
  interacciones_stories: z.number().int().min(0).default(0),
  delta_stories_pct: z.number().default(0),
  respuestas_stories: z.number().int().min(0).default(0),
  // DMs
  conversaciones_dm: z.number().int().min(0).default(0),
  // Demograficos
  pct_hombres: z.number().min(0).max(100).default(0),
  pct_mujeres: z.number().min(0).max(100).default(0),
  top_paises: z.string().optional().default(""),
  top_ciudades: z.string().optional().default(""),
  top_edades: z.string().optional().default(""),
  // Business
  leads_ig: z.number().int().min(0).default(0),
  ventas_ig: z.number().int().min(0).default(0),
  cash_ig: z.number().min(0).default(0),
});

export type IgMetricsFormData = z.infer<typeof igMetricsSchema>;
```

- [ ] **Step 3: Create API route for IG metrics**

Create `app/api/ig-metrics/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createIgMetric } from "@/lib/queries/ig-metrics";
import { igMetricsSchema } from "@/lib/schemas/ig-metrics";

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  try {
    const body = await req.json();
    const parsed = igMetricsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const metric = await createIgMetric(parsed.data);
    return NextResponse.json(metric, { status: 201 });
  } catch (err) {
    console.error("[POST /api/ig-metrics]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create server page for IG metrics**

Create `app/(dashboard)/ig-metrics/page.tsx`:

```typescript
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchIgMetrics, fetchIgMetricsPair } from "@/lib/queries/ig-metrics";
import IgMetricsClient from "./IgMetricsClient";

export default async function IgMetricsPage() {
  const auth = await requireAdmin();
  if ("error" in auth) redirect("/login");

  const [metrics, pair] = await Promise.all([
    fetchIgMetrics(),
    fetchIgMetricsPair(),
  ]);

  return (
    <IgMetricsClient
      metrics={metrics}
      current={pair.current}
      previous={pair.previous}
    />
  );
}
```

- [ ] **Step 5: Create client component for IG metrics**

Create `app/(dashboard)/ig-metrics/IgMetricsClient.tsx`:

```typescript
"use client";

import { useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import KPICard from "@/app/components/KPICard";
import type { IgMetrics } from "@/lib/types";
import { formatUSD } from "@/lib/format";

interface Props {
  metrics: IgMetrics[];
  current: IgMetrics | null;
  previous: IgMetrics | null;
}

// ------- Helpers -------

function delta(curr: number, prev: number): number | null {
  if (!prev || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

function safeDiv(num: number, den: number): number {
  return den === 0 ? 0 : num / den;
}

function pct(num: number, den: number): string {
  return den === 0 ? "0.0%" : (safeDiv(num, den) * 100).toFixed(1) + "%";
}

// ------- Sub-components -------

function FunnelRow({
  label,
  value,
  rate,
}: {
  label: string;
  value: number;
  rate: string | null;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--card-border)]">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <div className="flex items-center gap-4">
        <span className="text-white font-semibold">{value.toLocaleString()}</span>
        {rate && (
          <span className="text-xs text-[var(--purple-light)] w-16 text-right">{rate}</span>
        )}
      </div>
    </div>
  );
}

function RatesTable({
  current,
  previous,
}: {
  current: IgMetrics;
  previous: IgMetrics | null;
}) {
  const er = current.total_seguidores > 0
    ? (current.total_interacciones / current.total_seguidores) * 100
    : 0;
  const erReel = current.reels_publicados > 0
    ? (current.interacciones_reels / current.reels_publicados / (current.total_seguidores || 1)) * 100
    : 0;
  const saveRate = current.reels_publicados > 0
    ? (current.guardados_reels / (current.interacciones_reels || 1)) * 100
    : 0;
  const shareRate = current.reels_publicados > 0
    ? (current.compartidos_reels / (current.interacciones_reels || 1)) * 100
    : 0;
  const alcanceToVisita = pct(current.visitas_perfil, current.cuentas_alcanzadas);
  const visitaToEnlace = pct(current.toques_enlaces, current.visitas_perfil);
  const leadRate = pct(current.leads_ig, current.toques_enlaces);
  const closeRate = pct(current.ventas_ig, current.leads_ig);
  const revPerLead = current.leads_ig > 0 ? current.cash_ig / current.leads_ig : 0;
  const revPer1kAlcance = current.cuentas_alcanzadas > 0
    ? (current.cash_ig / current.cuentas_alcanzadas) * 1000
    : 0;

  const prevEr = previous && previous.total_seguidores > 0
    ? (previous.total_interacciones / previous.total_seguidores) * 100
    : null;

  const rates = [
    { label: "Engagement Rate", value: er.toFixed(2) + "%", prev: prevEr ? prevEr.toFixed(2) + "%" : null },
    { label: "ER/Reel", value: erReel.toFixed(2) + "%", prev: null },
    { label: "Save Rate (reels)", value: saveRate.toFixed(1) + "%", prev: null },
    { label: "Share Rate (reels)", value: shareRate.toFixed(1) + "%", prev: null },
    { label: "Alcance -> Visita", value: alcanceToVisita, prev: null },
    { label: "Visita -> Enlace", value: visitaToEnlace, prev: null },
    { label: "Lead Rate (enlace -> lead)", value: leadRate, prev: null },
    { label: "Close Rate (lead -> venta)", value: closeRate, prev: null },
    { label: "Revenue / Lead", value: formatUSD(revPerLead), prev: null },
    { label: "Revenue / 1K Alcance", value: formatUSD(revPer1kAlcance), prev: null },
  ];

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Rates</h3>
      <div className="space-y-1">
        {rates.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-[var(--card-border)] last:border-0">
            <span className="text-xs text-[var(--muted)]">{r.label}</span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-white font-medium">{r.value}</span>
              {r.prev && (
                <span className="text-xs text-[var(--muted)]">prev: {r.prev}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekComparison({
  current,
  previous,
}: {
  current: IgMetrics;
  previous: IgMetrics | null;
}) {
  if (!previous) return null;

  const rows = [
    { label: "Alcance", curr: current.cuentas_alcanzadas, prev: previous.cuentas_alcanzadas },
    { label: "Impresiones", curr: current.impresiones, prev: previous.impresiones },
    { label: "Visitas Perfil", curr: current.visitas_perfil, prev: previous.visitas_perfil },
    { label: "Toques Enlace", curr: current.toques_enlaces, prev: previous.toques_enlaces },
    { label: "Seguidores Neto", curr: current.nuevos_seguidores - current.unfollows, prev: previous.nuevos_seguidores - previous.unfollows },
    { label: "Interacciones", curr: current.total_interacciones, prev: previous.total_interacciones },
    { label: "Leads IG", curr: current.leads_ig, prev: previous.leads_ig },
    { label: "Ventas IG", curr: current.ventas_ig, prev: previous.ventas_ig },
    { label: "Cash IG", curr: current.cash_ig, prev: previous.cash_ig },
  ];

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white mb-3">
        Comparativa: {current.periodo} vs {previous.periodo}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[var(--muted)] text-xs uppercase">
              <th className="text-left py-1">Metrica</th>
              <th className="text-right py-1">{previous.periodo}</th>
              <th className="text-right py-1">{current.periodo}</th>
              <th className="text-right py-1">Delta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const d = delta(r.curr, r.prev);
              return (
                <tr key={r.label} className="border-t border-[var(--card-border)]">
                  <td className="py-1.5 text-[var(--muted)]">{r.label}</td>
                  <td className="py-1.5 text-right text-white">{r.prev.toLocaleString()}</td>
                  <td className="py-1.5 text-right text-white font-medium">{r.curr.toLocaleString()}</td>
                  <td className={`py-1.5 text-right font-medium ${
                    d !== null && d >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"
                  }`}>
                    {d !== null ? `${d >= 0 ? "+" : ""}${d.toFixed(1)}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ------- Add Metric Form -------

const INITIAL_FORM = {
  periodo: "",
  fecha_inicio: "",
  fecha_fin: "",
  cuentas_alcanzadas: 0,
  delta_alcance_pct: 0,
  impresiones: 0,
  delta_impresiones_pct: 0,
  visitas_perfil: 0,
  delta_visitas_pct: 0,
  toques_enlaces: 0,
  delta_enlaces_pct: 0,
  pct_alcance_no_seguidores: 0,
  nuevos_seguidores: 0,
  delta_seguidores_pct: 0,
  unfollows: 0,
  total_seguidores: 0,
  total_interacciones: 0,
  delta_interacciones_pct: 0,
  cuentas_interaccion: 0,
  pct_interaccion_no_seguidores: 0,
  reels_publicados: 0,
  interacciones_reels: 0,
  delta_reels_pct: 0,
  likes_reels: 0,
  comentarios_reels: 0,
  compartidos_reels: 0,
  guardados_reels: 0,
  posts_publicados: 0,
  interacciones_posts: 0,
  delta_posts_pct: 0,
  likes_posts: 0,
  comentarios_posts: 0,
  compartidos_posts: 0,
  guardados_posts: 0,
  stories_publicadas: 0,
  interacciones_stories: 0,
  delta_stories_pct: 0,
  respuestas_stories: 0,
  conversaciones_dm: 0,
  pct_hombres: 0,
  pct_mujeres: 0,
  top_paises: "",
  top_ciudades: "",
  top_edades: "",
  leads_ig: 0,
  ventas_ig: 0,
  cash_ig: 0,
};

type FormField = { key: string; label: string; type: "text" | "number" | "date" };

const FORM_SECTIONS: { title: string; fields: FormField[] }[] = [
  {
    title: "General",
    fields: [
      { key: "periodo", label: "Periodo (ej: 'Semana 14')", type: "text" },
      { key: "fecha_inicio", label: "Fecha Inicio", type: "date" },
      { key: "fecha_fin", label: "Fecha Fin", type: "date" },
    ],
  },
  {
    title: "Alcance e Impresiones",
    fields: [
      { key: "cuentas_alcanzadas", label: "Cuentas Alcanzadas", type: "number" },
      { key: "delta_alcance_pct", label: "Delta Alcance %", type: "number" },
      { key: "impresiones", label: "Impresiones", type: "number" },
      { key: "delta_impresiones_pct", label: "Delta Impresiones %", type: "number" },
      { key: "visitas_perfil", label: "Visitas Perfil", type: "number" },
      { key: "delta_visitas_pct", label: "Delta Visitas %", type: "number" },
      { key: "toques_enlaces", label: "Toques Enlace", type: "number" },
      { key: "delta_enlaces_pct", label: "Delta Enlaces %", type: "number" },
      { key: "pct_alcance_no_seguidores", label: "% Alcance No Seguidores", type: "number" },
    ],
  },
  {
    title: "Seguidores",
    fields: [
      { key: "nuevos_seguidores", label: "Nuevos Seguidores", type: "number" },
      { key: "delta_seguidores_pct", label: "Delta Seguidores %", type: "number" },
      { key: "unfollows", label: "Unfollows", type: "number" },
      { key: "total_seguidores", label: "Total Seguidores", type: "number" },
    ],
  },
  {
    title: "Interacciones",
    fields: [
      { key: "total_interacciones", label: "Total Interacciones", type: "number" },
      { key: "delta_interacciones_pct", label: "Delta Interacciones %", type: "number" },
      { key: "cuentas_interaccion", label: "Cuentas que Interactuaron", type: "number" },
      { key: "pct_interaccion_no_seguidores", label: "% Interaccion No Seguidores", type: "number" },
    ],
  },
  {
    title: "Reels",
    fields: [
      { key: "reels_publicados", label: "Reels Publicados", type: "number" },
      { key: "interacciones_reels", label: "Interacciones Reels", type: "number" },
      { key: "delta_reels_pct", label: "Delta Reels %", type: "number" },
      { key: "likes_reels", label: "Likes Reels", type: "number" },
      { key: "comentarios_reels", label: "Comentarios Reels", type: "number" },
      { key: "compartidos_reels", label: "Compartidos Reels", type: "number" },
      { key: "guardados_reels", label: "Guardados Reels", type: "number" },
    ],
  },
  {
    title: "Posts",
    fields: [
      { key: "posts_publicados", label: "Posts Publicados", type: "number" },
      { key: "interacciones_posts", label: "Interacciones Posts", type: "number" },
      { key: "delta_posts_pct", label: "Delta Posts %", type: "number" },
      { key: "likes_posts", label: "Likes Posts", type: "number" },
      { key: "comentarios_posts", label: "Comentarios Posts", type: "number" },
      { key: "compartidos_posts", label: "Compartidos Posts", type: "number" },
      { key: "guardados_posts", label: "Guardados Posts", type: "number" },
    ],
  },
  {
    title: "Stories",
    fields: [
      { key: "stories_publicadas", label: "Stories Publicadas", type: "number" },
      { key: "interacciones_stories", label: "Interacciones Stories", type: "number" },
      { key: "delta_stories_pct", label: "Delta Stories %", type: "number" },
      { key: "respuestas_stories", label: "Respuestas Stories", type: "number" },
    ],
  },
  {
    title: "DMs y Demograficos",
    fields: [
      { key: "conversaciones_dm", label: "Conversaciones DM", type: "number" },
      { key: "pct_hombres", label: "% Hombres", type: "number" },
      { key: "pct_mujeres", label: "% Mujeres", type: "number" },
      { key: "top_paises", label: "Top Paises", type: "text" },
      { key: "top_ciudades", label: "Top Ciudades", type: "text" },
      { key: "top_edades", label: "Top Edades", type: "text" },
    ],
  },
  {
    title: "Business (IG -> Ventas)",
    fields: [
      { key: "leads_ig", label: "Leads desde IG", type: "number" },
      { key: "ventas_ig", label: "Ventas desde IG", type: "number" },
      { key: "cash_ig", label: "Cash desde IG (USD)", type: "number" },
    ],
  },
];

function AddMetricForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(key: string, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ig-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar");
      }

      setForm(INITIAL_FORM);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {FORM_SECTIONS.map((section) => (
        <div key={section.title}>
          <h4 className="text-xs uppercase text-[var(--muted)] font-semibold mb-2">
            {section.title}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {section.fields.map((f) => (
              <div key={f.key}>
                <label className="text-xs text-[var(--muted)] block mb-1">{f.label}</label>
                <input
                  type={f.type}
                  value={(form as Record<string, unknown>)[f.key] as string | number}
                  onChange={(e) =>
                    updateField(
                      f.key,
                      f.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value
                    )
                  }
                  className="w-full px-2 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {error && <p className="text-[var(--red)] text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-[var(--purple)] text-white font-semibold disabled:opacity-50 hover:bg-[var(--purple-dark)] transition-colors"
      >
        {loading ? "Guardando..." : "Guardar Metricas IG"}
      </button>
    </form>
  );
}

// ------- Main Component -------

const CHART_COLORS = {
  alcance: "#8b5cf6",
  impresiones: "#a78bfa",
  seguidores: "#22c55e",
  nuevos: "#3b82f6",
  unfollows: "#ef4444",
  reels: "#8b5cf6",
  posts: "#3b82f6",
  stories: "#eab308",
};

export default function IgMetricsClient({ metrics, current, previous }: Props) {
  const [showForm, setShowForm] = useState(false);

  // Chart data — chronological order
  const chartData = [...metrics].reverse().map((m) => ({
    periodo: m.periodo || m.fecha_inicio || "—",
    alcance: m.cuentas_alcanzadas,
    impresiones: m.impresiones,
    seguidores: m.total_seguidores,
    nuevos: m.nuevos_seguidores,
    unfollows: m.unfollows,
    interacciones_reels: m.interacciones_reels,
    interacciones_posts: m.interacciones_posts,
    interacciones_stories: m.interacciones_stories,
  }));

  const seguidoresNeto = current
    ? current.nuevos_seguidores - current.unfollows
    : 0;

  const er = current && current.total_seguidores > 0
    ? (current.total_interacciones / current.total_seguidores) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">IG Metrics</h1>
          <p className="text-sm text-[var(--muted)]">
            {current?.periodo || "Sin datos"}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 rounded-lg bg-[var(--purple)] text-white text-sm font-medium hover:bg-[var(--purple-dark)] transition-colors"
        >
          {showForm ? "Ver Dashboard" : "+ Cargar Metricas"}
        </button>
      </div>

      {showForm ? (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
          <AddMetricForm onSuccess={() => window.location.reload()} />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          {current && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard
                label="Alcance"
                value={current.cuentas_alcanzadas}
                delta={current.delta_alcance_pct || delta(current.cuentas_alcanzadas, previous?.cuentas_alcanzadas ?? 0)}
                icon="👁"
              />
              <KPICard
                label="Seguidores (neto)"
                value={seguidoresNeto}
                delta={previous ? delta(seguidoresNeto, previous.nuevos_seguidores - previous.unfollows) : null}
                icon="👥"
              />
              <KPICard
                label="Interacciones"
                value={current.total_interacciones}
                delta={current.delta_interacciones_pct || delta(current.total_interacciones, previous?.total_interacciones ?? 0)}
                icon="💬"
              />
              <KPICard
                label="Engagement Rate"
                value={er}
                format="pct"
                icon="📊"
              />
            </div>
          )}

          {/* Charts */}
          {chartData.length > 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Alcance + Impresiones over time */}
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Alcance e Impresiones</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="periodo" tick={{ fill: "#71717a", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                      labelStyle={{ color: "#e5e5e5" }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="alcance" stroke={CHART_COLORS.alcance} strokeWidth={2} name="Alcance" dot={false} />
                    <Line type="monotone" dataKey="impresiones" stroke={CHART_COLORS.impresiones} strokeWidth={2} name="Impresiones" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Seguidores over time */}
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Seguidores</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="periodo" tick={{ fill: "#71717a", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                      labelStyle={{ color: "#e5e5e5" }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="seguidores" stroke={CHART_COLORS.seguidores} strokeWidth={2} name="Total" dot={false} />
                    <Line type="monotone" dataKey="nuevos" stroke={CHART_COLORS.nuevos} strokeWidth={1.5} name="Nuevos" dot={false} />
                    <Line type="monotone" dataKey="unfollows" stroke={CHART_COLORS.unfollows} strokeWidth={1.5} name="Unfollows" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Interacciones por tipo (bar) */}
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Interacciones por Tipo</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="periodo" tick={{ fill: "#71717a", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                      labelStyle={{ color: "#e5e5e5" }}
                    />
                    <Legend />
                    <Bar dataKey="interacciones_reels" fill={CHART_COLORS.reels} name="Reels" />
                    <Bar dataKey="interacciones_posts" fill={CHART_COLORS.posts} name="Posts" />
                    <Bar dataKey="interacciones_stories" fill={CHART_COLORS.stories} name="Stories" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Funnel */}
              {current && (
                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Funnel IG</h3>
                  <FunnelRow label="Alcance" value={current.cuentas_alcanzadas} rate={null} />
                  <FunnelRow label="Visita Perfil" value={current.visitas_perfil} rate={pct(current.visitas_perfil, current.cuentas_alcanzadas)} />
                  <FunnelRow label="Toque Enlace" value={current.toques_enlaces} rate={pct(current.toques_enlaces, current.visitas_perfil)} />
                  <FunnelRow label="Lead" value={current.leads_ig} rate={pct(current.leads_ig, current.toques_enlaces)} />
                  <FunnelRow label="Venta" value={current.ventas_ig} rate={pct(current.ventas_ig, current.leads_ig)} />
                  <FunnelRow label="Cash" value={current.cash_ig} rate={pct(current.cash_ig, current.ventas_ig > 0 ? current.cash_ig : 1)} />
                </div>
              )}
            </div>
          )}

          {/* Rates Table + Week Comparison */}
          {current && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RatesTable current={current} previous={previous} />
              <WeekComparison current={current} previous={previous} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add lib/queries/ig-metrics.ts lib/schemas/ig-metrics.ts app/api/ig-metrics/ app/\(dashboard\)/ig-metrics/
git commit -m "feat: add IG metrics page with charts, funnel, rates, and form"
```

---

### Task 2: Reportes Diarios Page

**Files:**
- Create: `lib/queries/daily-reports.ts`
- Create: `app/(dashboard)/reportes/page.tsx`
- Create: `app/(dashboard)/reportes/ReportesClient.tsx`

- [ ] **Step 1: Create daily reports query functions**

Create `lib/queries/daily-reports.ts`:

```typescript
import { createServerClient } from "@/lib/supabase-server";
import type { DailyReport, TeamMember } from "@/lib/types";
import { getFiscalStart, getFiscalEnd } from "@/lib/date-utils";

export interface DailyReportWithSetter extends DailyReport {
  setter?: Pick<TeamMember, "id" | "nombre">;
}

export async function fetchDailyReports(filters?: {
  setterId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<DailyReportWithSetter[]> {
  const supabase = createServerClient();
  let query = supabase
    .from("daily_reports")
    .select("*, setter:team_members!setter_id(id, nombre)")
    .order("fecha", { ascending: false });

  if (filters?.setterId) {
    query = query.eq("setter_id", filters.setterId);
  }
  if (filters?.dateFrom) {
    query = query.gte("fecha", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("fecha", filters.dateTo);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DailyReportWithSetter[];
}

export interface SetterAggregates {
  setter_id: string;
  setter_nombre: string;
  total_conversaciones: number;
  total_respuestas_historias: number;
  total_calendarios: number;
  total_agendas: string[];
  report_count: number;
}

export async function fetchReportsByMember(
  fiscalStart?: Date,
  fiscalEnd?: Date
): Promise<SetterAggregates[]> {
  const start = fiscalStart || getFiscalStart();
  const end = fiscalEnd || getFiscalEnd();

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("daily_reports")
    .select("*, setter:team_members!setter_id(id, nombre)")
    .gte("fecha", start.toISOString().split("T")[0])
    .lte("fecha", end.toISOString().split("T")[0])
    .order("fecha", { ascending: false });

  if (error) throw error;

  const reports = (data ?? []) as DailyReportWithSetter[];

  // Aggregate by setter
  const map = new Map<string, SetterAggregates>();
  for (const r of reports) {
    const id = r.setter_id;
    const existing = map.get(id);
    if (existing) {
      existing.total_conversaciones += r.conversaciones_iniciadas;
      existing.total_respuestas_historias += r.respuestas_historias;
      existing.total_calendarios += r.calendarios_enviados;
      if (r.agendas_confirmadas) existing.total_agendas.push(r.agendas_confirmadas);
      existing.report_count++;
    } else {
      map.set(id, {
        setter_id: id,
        setter_nombre: r.setter?.nombre ?? "—",
        total_conversaciones: r.conversaciones_iniciadas,
        total_respuestas_historias: r.respuestas_historias,
        total_calendarios: r.calendarios_enviados,
        total_agendas: r.agendas_confirmadas ? [r.agendas_confirmadas] : [],
        report_count: 1,
      });
    }
  }

  return Array.from(map.values());
}

export async function fetchSetters(): Promise<Pick<TeamMember, "id" | "nombre">[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("team_members")
    .select("id, nombre")
    .eq("is_setter", true)
    .eq("activo", true);

  if (error) throw error;
  return (data ?? []) as Pick<TeamMember, "id" | "nombre">[];
}
```

- [ ] **Step 2: Create server page**

Create `app/(dashboard)/reportes/page.tsx`:

```typescript
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchDailyReports, fetchReportsByMember, fetchSetters } from "@/lib/queries/daily-reports";
import ReportesClient from "./ReportesClient";

export default async function ReportesPage() {
  const auth = await requireAdmin();
  if ("error" in auth) redirect("/login");

  const [reports, aggregates, setters] = await Promise.all([
    fetchDailyReports(),
    fetchReportsByMember(),
    fetchSetters(),
  ]);

  return (
    <ReportesClient
      reports={reports}
      aggregates={aggregates}
      setters={setters}
    />
  );
}
```

- [ ] **Step 3: Create client component**

Create `app/(dashboard)/reportes/ReportesClient.tsx`:

```typescript
"use client";

import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import KPICard from "@/app/components/KPICard";
import DataTable from "@/app/components/DataTable";
import type { TeamMember } from "@/lib/types";
import type { DailyReportWithSetter, SetterAggregates } from "@/lib/queries/daily-reports";
import { formatDate } from "@/lib/format";

interface Props {
  reports: DailyReportWithSetter[];
  aggregates: SetterAggregates[];
  setters: Pick<TeamMember, "id" | "nombre">[];
}

const SETTER_COLORS = ["#8b5cf6", "#22c55e", "#3b82f6", "#eab308", "#ef4444", "#ec4899"];

export default function ReportesClient({ reports, aggregates, setters }: Props) {
  const [filterSetter, setFilterSetter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Filter reports
  const filtered = useMemo(() => {
    let result = reports;
    if (filterSetter) {
      result = result.filter((r) => r.setter_id === filterSetter);
    }
    if (dateFrom) {
      result = result.filter((r) => r.fecha >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((r) => r.fecha <= dateTo);
    }
    return result;
  }, [reports, filterSetter, dateFrom, dateTo]);

  // Totals
  const totals = useMemo(() => {
    return aggregates.reduce(
      (acc, a) => ({
        conversaciones: acc.conversaciones + a.total_conversaciones,
        calendarios: acc.calendarios + a.total_calendarios,
        agendas: acc.agendas + a.total_agendas.length,
      }),
      { conversaciones: 0, calendarios: 0, agendas: 0 }
    );
  }, [aggregates]);

  // Chart data — group by fecha, split by setter
  const chartData = useMemo(() => {
    const byDate = new Map<string, Record<string, number>>();
    for (const r of filtered) {
      const entry = byDate.get(r.fecha) ?? { fecha: r.fecha as unknown as number };
      const setterName = r.setter?.nombre ?? "—";
      entry[setterName] = (entry[setterName] || 0) + r.conversaciones_iniciadas;
      byDate.set(r.fecha, entry);
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, vals]) => ({ fecha, ...vals }));
  }, [filtered]);

  const setterNames = useMemo(() => {
    const names = new Set<string>();
    for (const r of filtered) {
      if (r.setter?.nombre) names.add(r.setter.nombre);
    }
    return Array.from(names);
  }, [filtered]);

  // Table columns
  const columns = [
    {
      key: "fecha",
      label: "Fecha",
      sortable: true,
      render: (row: DailyReportWithSetter) => formatDate(row.fecha),
    },
    {
      key: "setter",
      label: "Setter",
      render: (row: DailyReportWithSetter) => row.setter?.nombre ?? "—",
    },
    {
      key: "conversaciones_iniciadas",
      label: "Conversaciones",
      sortable: true,
      render: (row: DailyReportWithSetter) => row.conversaciones_iniciadas,
    },
    {
      key: "respuestas_historias",
      label: "Resp. Historias",
      sortable: true,
      render: (row: DailyReportWithSetter) => row.respuestas_historias,
    },
    {
      key: "calendarios_enviados",
      label: "Calendarios",
      sortable: true,
      render: (row: DailyReportWithSetter) => row.calendarios_enviados,
    },
    {
      key: "ventas_por_chat",
      label: "Ventas Chat",
      render: (row: DailyReportWithSetter) => row.ventas_por_chat || "—",
    },
    {
      key: "agendas_confirmadas",
      label: "Agendas",
      render: (row: DailyReportWithSetter) => row.agendas_confirmadas || "—",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Reportes Diarios</h1>
        <p className="text-sm text-[var(--muted)]">Actividad de setters — periodo 7-7 actual</p>
      </div>

      {/* KPI Cards — aggregated for current 7-7 */}
      <div className="grid grid-cols-3 gap-3">
        <KPICard label="Total Conversaciones" value={totals.conversaciones} icon="💬" />
        <KPICard label="Total Calendarios" value={totals.calendarios} icon="📅" />
        <KPICard label="Total Agendas" value={totals.agendas} icon="📋" />
      </div>

      {/* Aggregated by setter */}
      {aggregates.length > 0 && (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Acumulado por Setter (periodo 7-7)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--muted)] text-xs uppercase">
                  <th className="text-left py-1">Setter</th>
                  <th className="text-right py-1">Conversaciones</th>
                  <th className="text-right py-1">Resp. Historias</th>
                  <th className="text-right py-1">Calendarios</th>
                  <th className="text-right py-1">Reportes</th>
                </tr>
              </thead>
              <tbody>
                {aggregates.map((a) => (
                  <tr key={a.setter_id} className="border-t border-[var(--card-border)]">
                    <td className="py-1.5 text-white font-medium">{a.setter_nombre}</td>
                    <td className="py-1.5 text-right text-white">{a.total_conversaciones}</td>
                    <td className="py-1.5 text-right text-white">{a.total_respuestas_historias}</td>
                    <td className="py-1.5 text-right text-white">{a.total_calendarios}</td>
                    <td className="py-1.5 text-right text-[var(--muted)]">{a.report_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Activity chart */}
      {chartData.length > 1 && (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Conversaciones por Dia</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="fecha" tick={{ fill: "#71717a", fontSize: 11 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                labelStyle={{ color: "#e5e5e5" }}
              />
              <Legend />
              {setterNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={SETTER_COLORS[i % SETTER_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-[var(--muted)] block mb-1">Setter</label>
          <select
            value={filterSetter}
            onChange={(e) => setFilterSetter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
          >
            <option value="">Todos</option>
            {setters.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--muted)] block mb-1">Desde</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)] block mb-1">Hasta</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={filtered as unknown as Record<string, unknown>[]}
        columns={columns as { key: string; label: string; sortable?: boolean; render?: (row: Record<string, unknown>) => React.ReactNode }[]}
        searchKey={"setter" as keyof Record<string, unknown>}
        searchPlaceholder="Buscar setter..."
        pageSize={20}
      />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add lib/queries/daily-reports.ts app/\(dashboard\)/reportes/
git commit -m "feat: add reportes diarios page with setter aggregates and chart"
```

---

### Task 3: UTM Builder Page

**Files:**
- Create: `lib/queries/utm.ts`
- Create: `app/api/utm/route.ts`
- Create: `app/(dashboard)/utm/page.tsx`
- Create: `app/(dashboard)/utm/UtmClient.tsx`

- [ ] **Step 1: Create UTM query functions**

Create `lib/queries/utm.ts`:

```typescript
import { createServerClient } from "@/lib/supabase-server";
import type { TeamMember } from "@/lib/types";

export interface UtmCampaign {
  id: string;
  url: string | null;
  source: string | null;
  medium: string | null;
  content: string | null;
  setter_id: string | null;
  created_at: string;
  setter?: Pick<TeamMember, "id" | "nombre">;
}

export interface UtmCampaignWithPerformance extends UtmCampaign {
  agendas_count: number;
  facturacion: number;
  cash_collected: number;
}

export async function fetchUtmCampaigns(): Promise<UtmCampaignWithPerformance[]> {
  const supabase = createServerClient();

  // Fetch UTM campaigns with setter
  const { data: campaigns, error: campError } = await supabase
    .from("utm_campaigns")
    .select("*, setter:team_members!setter_id(id, nombre)")
    .order("created_at", { ascending: false });

  if (campError) throw campError;

  // Fetch leads with UTM data for performance matching
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, utm_source, utm_medium, utm_content, estado, ticket_total")
    .not("utm_source", "is", null);

  if (leadsError) throw leadsError;

  // Fetch payments for cash calculation
  const { data: payments, error: payError } = await supabase
    .from("payments")
    .select("lead_id, monto_usd, estado")
    .eq("estado", "pagado");

  if (payError) throw payError;

  // Build payment cash map by lead_id
  const cashByLead = new Map<string, number>();
  for (const p of payments ?? []) {
    if (p.lead_id) {
      cashByLead.set(p.lead_id, (cashByLead.get(p.lead_id) || 0) + p.monto_usd);
    }
  }

  // Match UTM campaigns to leads by source+medium+content
  const result: UtmCampaignWithPerformance[] = (campaigns ?? []).map((c) => {
    const matchingLeads = (leads ?? []).filter(
      (l) =>
        l.utm_source === c.source &&
        l.utm_medium === c.medium &&
        l.utm_content === c.content
    );

    const agendas_count = matchingLeads.length;
    const facturacion = matchingLeads
      .filter((l) => l.estado === "cerrado")
      .reduce((sum, l) => sum + (l.ticket_total || 0), 0);
    const cash_collected = matchingLeads.reduce(
      (sum, l) => sum + (cashByLead.get(l.id) || 0),
      0
    );

    return {
      ...c,
      agendas_count,
      facturacion,
      cash_collected,
    } as UtmCampaignWithPerformance;
  });

  return result;
}

export async function createUtmCampaign(data: {
  url: string;
  source: string;
  medium: string;
  content: string;
  setter_id: string | null;
}): Promise<UtmCampaign> {
  const supabase = createServerClient();
  const { data: campaign, error } = await supabase
    .from("utm_campaigns")
    .insert(data)
    .select("*, setter:team_members!setter_id(id, nombre)")
    .single();

  if (error) throw error;
  return campaign as UtmCampaign;
}
```

- [ ] **Step 2: Create API route**

Create `app/api/utm/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createUtmCampaign } from "@/lib/queries/utm";
import { z } from "zod";

const utmSchema = z.object({
  url: z.string().url("URL invalida"),
  source: z.string().min(1, "Source requerido"),
  medium: z.string().min(1, "Medium requerido"),
  content: z.string().min(1, "Content requerido"),
  setter_id: z.string().uuid().nullable().default(null),
});

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  try {
    const body = await req.json();
    const parsed = utmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const campaign = await createUtmCampaign(parsed.data);
    return NextResponse.json(campaign, { status: 201 });
  } catch (err) {
    console.error("[POST /api/utm]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create server page**

Create `app/(dashboard)/utm/page.tsx`:

```typescript
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchUtmCampaigns } from "@/lib/queries/utm";
import { fetchSetters } from "@/lib/queries/daily-reports";
import UtmClient from "./UtmClient";

export default async function UtmPage() {
  const auth = await requireAdmin();
  if ("error" in auth) redirect("/login");

  const [campaigns, setters] = await Promise.all([
    fetchUtmCampaigns(),
    fetchSetters(),
  ]);

  return <UtmClient campaigns={campaigns} setters={setters} />;
}
```

- [ ] **Step 4: Create client component**

Create `app/(dashboard)/utm/UtmClient.tsx`:

```typescript
"use client";

import { useState } from "react";
import DataTable from "@/app/components/DataTable";
import type { TeamMember } from "@/lib/types";
import type { UtmCampaignWithPerformance } from "@/lib/queries/utm";
import { formatUSD, formatDate } from "@/lib/format";

interface Props {
  campaigns: UtmCampaignWithPerformance[];
  setters: Pick<TeamMember, "id" | "nombre">[];
}

function UtmForm({ setters, onSuccess }: { setters: Props["setters"]; onSuccess: () => void }) {
  const [url, setUrl] = useState("https://calendly.com/lauticardozo");
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [content, setContent] = useState("");
  const [setterId, setSetterId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const generatedUrl = source && medium && content
    ? `${url}?utm_source=${encodeURIComponent(source)}&utm_medium=${encodeURIComponent(medium)}&utm_content=${encodeURIComponent(content)}`
    : "";

  async function handleCopy() {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/utm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          source,
          medium,
          content,
          setter_id: setterId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar");
      }

      setSource("");
      setMedium("");
      setContent("");
      setSetterId("");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-white">Crear UTM</h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">URL Base</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Source</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="instagram, youtube, whatsapp..."
              className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Medium</label>
            <input
              type="text"
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
              placeholder="story, post, reel, bio, dm..."
              className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Content</label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="lead_magnet_ebook, caso_exito..."
              className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Setter Responsable</label>
            <select
              value={setterId}
              onChange={(e) => setSetterId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
            >
              <option value="">Sin asignar</option>
              {setters.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Generated URL preview */}
        {generatedUrl && (
          <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--card-border)] rounded-lg p-3">
            <code className="text-xs text-[var(--purple-light)] break-all flex-1">
              {generatedUrl}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1 rounded-lg bg-[var(--purple)] text-white text-xs font-medium shrink-0 hover:bg-[var(--purple-dark)] transition-colors"
            >
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
        )}

        {error && <p className="text-[var(--red)] text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !source || !medium || !content}
          className="px-4 py-2 rounded-lg bg-[var(--purple)] text-white font-semibold disabled:opacity-50 hover:bg-[var(--purple-dark)] transition-colors"
        >
          {loading ? "Guardando..." : "Guardar UTM"}
        </button>
      </form>
    </div>
  );
}

export default function UtmClient({ campaigns, setters }: Props) {
  const columns = [
    {
      key: "source",
      label: "Source",
      sortable: true,
      render: (row: UtmCampaignWithPerformance) => (
        <span className="text-[var(--purple-light)] font-medium">{row.source}</span>
      ),
    },
    {
      key: "medium",
      label: "Medium",
      render: (row: UtmCampaignWithPerformance) => row.medium || "—",
    },
    {
      key: "content",
      label: "Content",
      render: (row: UtmCampaignWithPerformance) => row.content || "—",
    },
    {
      key: "setter",
      label: "Setter",
      render: (row: UtmCampaignWithPerformance) => row.setter?.nombre ?? "—",
    },
    {
      key: "agendas_count",
      label: "Agendas",
      sortable: true,
      render: (row: UtmCampaignWithPerformance) => row.agendas_count,
    },
    {
      key: "facturacion",
      label: "Facturacion",
      sortable: true,
      render: (row: UtmCampaignWithPerformance) => formatUSD(row.facturacion),
    },
    {
      key: "cash_collected",
      label: "Cash",
      sortable: true,
      render: (row: UtmCampaignWithPerformance) => (
        <span className="text-[var(--green)] font-medium">{formatUSD(row.cash_collected)}</span>
      ),
    },
    {
      key: "created_at",
      label: "Creado",
      render: (row: UtmCampaignWithPerformance) => formatDate(row.created_at),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">UTM Builder</h1>
        <p className="text-sm text-[var(--muted)]">Crear y trackear links con UTM</p>
      </div>

      <UtmForm setters={setters} onSuccess={() => window.location.reload()} />

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">UTMs Existentes</h3>
        <DataTable
          data={campaigns as unknown as Record<string, unknown>[]}
          columns={columns as { key: string; label: string; sortable?: boolean; render?: (row: Record<string, unknown>) => React.ReactNode }[]}
          searchKey={"source" as keyof Record<string, unknown>}
          searchPlaceholder="Buscar por source..."
          pageSize={20}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add lib/queries/utm.ts app/api/utm/ app/\(dashboard\)/utm/
git commit -m "feat: add UTM builder page with performance tracking"
```

---

### Task 4: Admin Panel

**Files:**
- Create: `lib/queries/admin.ts`
- Create: `app/api/admin/team/[id]/route.ts`
- Create: `app/api/admin/payment-methods/route.ts`
- Create: `app/api/admin/payment-methods/[id]/route.ts`
- Create: `app/(dashboard)/admin/page.tsx`
- Create: `app/(dashboard)/admin/AdminClient.tsx`

- [ ] **Step 1: Create admin query functions**

Create `lib/queries/admin.ts`:

```typescript
import { createServerClient } from "@/lib/supabase-server";
import type { TeamMember } from "@/lib/types";

export interface PaymentMethod {
  id: string;
  nombre: string;
  titular: string | null;
  tipo_moneda: "ars" | "usd";
  cbu: string | null;
  alias_cbu: string | null;
  banco: string | null;
  id_cuenta: string | null;
  observaciones: string | null;
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .order("nombre");

  if (error) throw error;
  return (data ?? []) as TeamMember[];
}

export async function updateTeamMember(
  id: string,
  updates: Partial<
    Pick<
      TeamMember,
      "nombre" | "rol" | "is_admin" | "is_closer" | "is_setter" | "is_cobranzas" | "is_seguimiento" | "pin" | "comision_pct" | "can_see_agent" | "activo"
    >
  >
): Promise<TeamMember> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("team_members")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as TeamMember;
}

export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .order("nombre");

  if (error) throw error;
  return (data ?? []) as PaymentMethod[];
}

export async function createPaymentMethod(
  method: Omit<PaymentMethod, "id">
): Promise<PaymentMethod> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .insert(method)
    .select()
    .single();

  if (error) throw error;
  return data as PaymentMethod;
}

export async function updatePaymentMethod(
  id: string,
  updates: Partial<Omit<PaymentMethod, "id">>
): Promise<PaymentMethod> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as PaymentMethod;
}
```

- [ ] **Step 2: Create team member API route**

Create `app/api/admin/team/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updateTeamMember } from "@/lib/queries/admin";
import { z } from "zod";

const updateTeamSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  rol: z.string().max(50).optional(),
  is_admin: z.boolean().optional(),
  is_closer: z.boolean().optional(),
  is_setter: z.boolean().optional(),
  is_cobranzas: z.boolean().optional(),
  is_seguimiento: z.boolean().optional(),
  pin: z.string().length(4).regex(/^\d{4}$/).optional(),
  comision_pct: z.number().min(0).max(1).optional(),
  can_see_agent: z.boolean().optional(),
  activo: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateTeamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const member = await updateTeamMember(id, parsed.data);
    return NextResponse.json(member);
  } catch (err) {
    console.error("[PATCH /api/admin/team/[id]]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create payment methods API routes**

Create `app/api/admin/payment-methods/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createPaymentMethod } from "@/lib/queries/admin";
import { z } from "zod";

const createMethodSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  titular: z.string().optional().default(""),
  tipo_moneda: z.enum(["ars", "usd"]).default("usd"),
  cbu: z.string().optional().default(""),
  alias_cbu: z.string().optional().default(""),
  banco: z.string().optional().default(""),
  id_cuenta: z.string().optional().default(""),
  observaciones: z.string().optional().default(""),
});

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  try {
    const body = await req.json();
    const parsed = createMethodSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const method = await createPaymentMethod(parsed.data);
    return NextResponse.json(method, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/payment-methods]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

Create `app/api/admin/payment-methods/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updatePaymentMethod } from "@/lib/queries/admin";
import { z } from "zod";

const updateMethodSchema = z.object({
  nombre: z.string().min(1).optional(),
  titular: z.string().optional(),
  tipo_moneda: z.enum(["ars", "usd"]).optional(),
  cbu: z.string().optional(),
  alias_cbu: z.string().optional(),
  banco: z.string().optional(),
  id_cuenta: z.string().optional(),
  observaciones: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateMethodSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const method = await updatePaymentMethod(id, parsed.data);
    return NextResponse.json(method);
  } catch (err) {
    console.error("[PATCH /api/admin/payment-methods/[id]]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create server page**

Create `app/(dashboard)/admin/page.tsx`:

```typescript
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchTeamMembers, fetchPaymentMethods } from "@/lib/queries/admin";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const auth = await requireAdmin();
  if ("error" in auth) redirect("/login");

  const [team, paymentMethods] = await Promise.all([
    fetchTeamMembers(),
    fetchPaymentMethods(),
  ]);

  return <AdminClient team={team} paymentMethods={paymentMethods} />;
}
```

- [ ] **Step 5: Create admin client component**

Create `app/(dashboard)/admin/AdminClient.tsx`:

```typescript
"use client";

import { useState } from "react";
import type { TeamMember } from "@/lib/types";
import type { PaymentMethod } from "@/lib/queries/admin";
import { PROGRAMS, COMMISSION_CLOSER, COMMISSION_SETTER, COMMISSION_COBRANZAS } from "@/lib/constants";
import { formatPct } from "@/lib/format";

interface Props {
  team: TeamMember[];
  paymentMethods: PaymentMethod[];
}

type Tab = "equipo" | "metodos_pago" | "programas" | "comisiones";

// ------- Team Member Edit Modal -------

function TeamMemberEditModal({
  member,
  onClose,
  onSaved,
}: {
  member: TeamMember;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nombre: member.nombre,
    rol: member.rol || "",
    is_admin: member.is_admin,
    is_closer: member.is_closer,
    is_setter: member.is_setter,
    is_cobranzas: member.is_cobranzas,
    is_seguimiento: member.is_seguimiento,
    pin: member.pin || "",
    comision_pct: member.comision_pct,
    can_see_agent: member.can_see_agent,
    activo: member.activo,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/team/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar");
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl w-full max-w-md p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-white font-semibold">Editar: {member.nombre}</h3>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-white text-xl">&times;</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-[var(--muted)] block mb-1">Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => updateField("nombre", e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Rol</label>
            <input
              type="text"
              value={form.rol}
              onChange={(e) => updateField("rol", e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">PIN</label>
            <input
              type="text"
              value={form.pin}
              onChange={(e) => updateField("pin", e.target.value.replace(/\D/g, "").slice(0, 4))}
              maxLength={4}
              className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Comision %</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={form.comision_pct}
              onChange={(e) => updateField("comision_pct", parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
            />
          </div>
        </div>

        {/* Flags */}
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["is_admin", "Admin"],
              ["is_closer", "Closer"],
              ["is_setter", "Setter"],
              ["is_cobranzas", "Cobranzas"],
              ["is_seguimiento", "Seguimiento"],
              ["can_see_agent", "Ve Agente"],
              ["activo", "Activo"],
            ] as [string, string][]
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-white cursor-pointer">
              <input
                type="checkbox"
                checked={form[key as keyof typeof form] as boolean}
                onChange={(e) => updateField(key, e.target.checked)}
                className="accent-[var(--purple)]"
              />
              {label}
            </label>
          ))}
        </div>

        {error && <p className="text-[var(--red)] text-sm">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-[var(--card-border)] text-[var(--muted)] text-sm hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-1.5 rounded-lg bg-[var(--purple)] text-white text-sm font-medium disabled:opacity-50 hover:bg-[var(--purple-dark)] transition-colors"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ------- Payment Method Edit Modal -------

function PaymentMethodModal({
  method,
  onClose,
  onSaved,
}: {
  method: PaymentMethod | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nombre: method?.nombre || "",
    titular: method?.titular || "",
    tipo_moneda: method?.tipo_moneda || "usd" as "ars" | "usd",
    cbu: method?.cbu || "",
    alias_cbu: method?.alias_cbu || "",
    banco: method?.banco || "",
    id_cuenta: method?.id_cuenta || "",
    observaciones: method?.observaciones || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setLoading(true);
    setError("");

    try {
      const isEdit = method !== null;
      const url = isEdit
        ? `/api/admin/payment-methods/${method.id}`
        : "/api/admin/payment-methods";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar");
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  const fields: { key: string; label: string; type?: string }[] = [
    { key: "nombre", label: "Nombre" },
    { key: "titular", label: "Titular" },
    { key: "banco", label: "Banco" },
    { key: "cbu", label: "CBU" },
    { key: "alias_cbu", label: "Alias CBU" },
    { key: "id_cuenta", label: "ID Cuenta" },
    { key: "observaciones", label: "Observaciones" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl w-full max-w-md p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-white font-semibold">
            {method ? `Editar: ${method.nombre}` : "Nuevo Metodo de Pago"}
          </h3>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-white text-xl">&times;</button>
        </div>

        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-xs text-[var(--muted)] block mb-1">{f.label}</label>
              <input
                type="text"
                value={(form as Record<string, string>)[f.key]}
                onChange={(e) => updateField(f.key, e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Moneda</label>
            <select
              value={form.tipo_moneda}
              onChange={(e) => updateField("tipo_moneda", e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
            >
              <option value="usd">USD</option>
              <option value="ars">ARS</option>
            </select>
          </div>
        </div>

        {error && <p className="text-[var(--red)] text-sm">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-[var(--card-border)] text-[var(--muted)] text-sm hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-1.5 rounded-lg bg-[var(--purple)] text-white text-sm font-medium disabled:opacity-50 hover:bg-[var(--purple-dark)] transition-colors"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ------- Main Admin Component -------

export default function AdminClient({ team, paymentMethods }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("equipo");
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null | "new">(null);

  const tabs: { key: Tab; label: string }[] = [
    { key: "equipo", label: "Equipo" },
    { key: "metodos_pago", label: "Metodos de Pago" },
    { key: "programas", label: "Programas" },
    { key: "comisiones", label: "Comisiones" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Admin Panel</h1>
        <p className="text-sm text-[var(--muted)]">Gestion de equipo, metodos de pago y configuracion</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === t.key
                ? "bg-[var(--purple)] text-white"
                : "text-[var(--muted)] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Equipo */}
      {activeTab === "equipo" && (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--muted)] text-xs uppercase bg-[var(--background)]">
                  <th className="text-left px-3 py-2">Nombre</th>
                  <th className="text-left px-3 py-2">Rol</th>
                  <th className="text-center px-3 py-2">Admin</th>
                  <th className="text-center px-3 py-2">Closer</th>
                  <th className="text-center px-3 py-2">Setter</th>
                  <th className="text-center px-3 py-2">Cobranzas</th>
                  <th className="text-center px-3 py-2">Seguimiento</th>
                  <th className="text-right px-3 py-2">Comision</th>
                  <th className="text-center px-3 py-2">Agente</th>
                  <th className="text-center px-3 py-2">Activo</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {team.map((m) => (
                  <tr key={m.id} className="border-t border-[var(--card-border)] hover:bg-[var(--background)]/50">
                    <td className="px-3 py-2 text-white font-medium">{m.nombre}</td>
                    <td className="px-3 py-2 text-[var(--muted)]">{m.rol || "—"}</td>
                    <td className="px-3 py-2 text-center">{m.is_admin ? "✓" : ""}</td>
                    <td className="px-3 py-2 text-center">{m.is_closer ? "✓" : ""}</td>
                    <td className="px-3 py-2 text-center">{m.is_setter ? "✓" : ""}</td>
                    <td className="px-3 py-2 text-center">{m.is_cobranzas ? "✓" : ""}</td>
                    <td className="px-3 py-2 text-center">{m.is_seguimiento ? "✓" : ""}</td>
                    <td className="px-3 py-2 text-right text-[var(--muted)]">{formatPct(m.comision_pct)}</td>
                    <td className="px-3 py-2 text-center">{m.can_see_agent ? "✓" : ""}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`w-2 h-2 rounded-full inline-block ${m.activo ? "bg-[var(--green)]" : "bg-[var(--red)]"}`} />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setEditingMember(m)}
                        className="text-xs text-[var(--purple-light)] hover:text-white transition-colors"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Metodos de Pago */}
      {activeTab === "metodos_pago" && (
        <div className="space-y-3">
          <button
            onClick={() => setEditingMethod("new")}
            className="px-3 py-1.5 rounded-lg bg-[var(--purple)] text-white text-sm font-medium hover:bg-[var(--purple-dark)] transition-colors"
          >
            + Nuevo Metodo
          </button>

          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--muted)] text-xs uppercase bg-[var(--background)]">
                    <th className="text-left px-3 py-2">Nombre</th>
                    <th className="text-left px-3 py-2">Titular</th>
                    <th className="text-left px-3 py-2">Moneda</th>
                    <th className="text-left px-3 py-2">Banco</th>
                    <th className="text-left px-3 py-2">CBU / Alias</th>
                    <th className="text-left px-3 py-2">Observaciones</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {paymentMethods.map((pm) => (
                    <tr key={pm.id} className="border-t border-[var(--card-border)] hover:bg-[var(--background)]/50">
                      <td className="px-3 py-2 text-white font-medium">{pm.nombre}</td>
                      <td className="px-3 py-2 text-[var(--muted)]">{pm.titular || "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          pm.tipo_moneda === "usd" ? "bg-[var(--green)]/15 text-[var(--green)]" : "bg-blue-500/15 text-blue-400"
                        }`}>
                          {pm.tipo_moneda.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[var(--muted)]">{pm.banco || "—"}</td>
                      <td className="px-3 py-2 text-[var(--muted)] text-xs">
                        {pm.alias_cbu || pm.cbu || "—"}
                      </td>
                      <td className="px-3 py-2 text-[var(--muted)] text-xs">{pm.observaciones || "—"}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => setEditingMethod(pm)}
                          className="text-xs text-[var(--purple-light)] hover:text-white transition-colors"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Programas */}
      {activeTab === "programas" && (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--muted)] text-xs uppercase bg-[var(--background)]">
                  <th className="text-left px-3 py-2">Programa</th>
                  <th className="text-left px-3 py-2">Clave</th>
                  <th className="text-right px-3 py-2">Precio USD</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(PROGRAMS).map(([key, prog]) => (
                  <tr key={key} className="border-t border-[var(--card-border)]">
                    <td className="px-3 py-2 text-white">{prog.label}</td>
                    <td className="px-3 py-2 text-[var(--muted)] font-mono text-xs">{key}</td>
                    <td className="px-3 py-2 text-right text-white">
                      {prog.precio > 0 ? `$${prog.precio.toLocaleString()}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[var(--muted)] p-3 border-t border-[var(--card-border)]">
            Los programas son valores fijos definidos en el sistema. Contactar al admin para cambios.
          </p>
        </div>
      )}

      {/* TAB: Comisiones */}
      {activeTab === "comisiones" && (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-semibold text-white">Estructura de Comisiones</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[var(--background)] border border-[var(--card-border)] rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-[var(--purple)]">{formatPct(COMMISSION_CLOSER)}</p>
              <p className="text-sm text-[var(--muted)] mt-1">Closer</p>
              <p className="text-xs text-[var(--muted)] mt-2">Sobre cash collected de ventas donde es closer del lead</p>
            </div>
            <div className="bg-[var(--background)] border border-[var(--card-border)] rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-[var(--green)]">{formatPct(COMMISSION_SETTER)}</p>
              <p className="text-sm text-[var(--muted)] mt-1">Setter</p>
              <p className="text-xs text-[var(--muted)] mt-2">Sobre cash collected de ventas donde es setter del lead</p>
            </div>
            <div className="bg-[var(--background)] border border-[var(--card-border)] rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-[var(--yellow)]">{formatPct(COMMISSION_COBRANZAS)}</p>
              <p className="text-sm text-[var(--muted)] mt-1">Cobranzas</p>
              <p className="text-xs text-[var(--muted)] mt-2">Sobre cuotas y renovaciones que cobran directamente</p>
            </div>
          </div>

          <div className="border-t border-[var(--card-border)] pt-3">
            <h4 className="text-xs uppercase text-[var(--muted)] font-semibold mb-2">Comisiones por Miembro</h4>
            <div className="space-y-1">
              {team
                .filter((m) => m.activo && m.comision_pct > 0)
                .map((m) => (
                  <div key={m.id} className="flex justify-between items-center py-1 text-sm">
                    <span className="text-white">{m.nombre}</span>
                    <span className="text-[var(--muted)]">
                      {formatPct(m.comision_pct)} — {m.rol || "sin rol"}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {editingMember && (
        <TeamMemberEditModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSaved={() => {
            setEditingMember(null);
            window.location.reload();
          }}
        />
      )}

      {editingMethod !== null && (
        <PaymentMethodModal
          method={editingMethod === "new" ? null : editingMethod}
          onClose={() => setEditingMethod(null)}
          onSaved={() => {
            setEditingMethod(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add lib/queries/admin.ts app/api/admin/ app/\(dashboard\)/admin/
git commit -m "feat: add admin panel with team, payment methods, programs, and commissions"
```

---

### Post-Tasks: Sidebar Navigation Update

After all 4 tasks, update the Sidebar to include the new routes.

- [ ] **Step 1: Add navigation links to Sidebar.tsx**

In `app/components/Sidebar.tsx`, add these admin-only links to the navigation array:

```typescript
// Add to the admin section of NAV_ITEMS:
{ href: "/ig-metrics", label: "IG Metrics", icon: "📊", roles: ["admin"] },
{ href: "/reportes", label: "Reportes Diarios", icon: "📋", roles: ["admin"] },
{ href: "/utm", label: "UTM Builder", icon: "🔗", roles: ["admin"] },
{ href: "/admin", label: "Admin Panel", icon: "⚙️", roles: ["admin"] },
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/components/Sidebar.tsx
git commit -m "feat: add Phase 6 pages to sidebar navigation"
```
