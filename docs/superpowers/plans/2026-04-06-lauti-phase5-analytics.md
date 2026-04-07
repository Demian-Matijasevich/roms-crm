# Lauti CRM Phase 5: Analytics & Gamification

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** Build admin dashboard, role-specific home pages, tesoreria, closers analytics, gamification engine, and leaderboard — giving every role their personalized view with KPIs, charts, and motivation systems.

**Architecture:** Server components fetch data from Supabase views (v_monthly_cash, v_treasury, v_closer_kpis, v_commissions). Client components handle interactivity, charts (Recharts), and filters. Gamification logic lives in `lib/gamification.ts` as pure functions consuming Lead[]. Role routing in the dashboard page.tsx dispatches to HomeAdmin / HomeCloser / HomeSetter based on session roles.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase JS v2, Recharts, date-fns

**Depends on:** Phase 2 (leads/payments queries, pipeline, forms)

**Spec:** `docs/superpowers/specs/2026-04-06-lauti-crm-design.md`
**Phase 1 ref:** `docs/superpowers/plans/2026-04-06-lauti-phase1-foundation.md`
**ROMS gamification ref:** `C:\Users\matyc\projects\roms-crm\webapp\lib\gamification.ts`
**ROMS closers ref:** `C:\Users\matyc\projects\roms-crm\webapp\app\(dashboard)\closers\`

**Key types used (from lib/types.ts):**
- `MonthlyCash` — v_monthly_cash view rows
- `TreasuryRow` — v_treasury view rows
- `CloserKPI` — v_closer_kpis view rows
- `Lead`, `Payment`, `TeamMember`, `Client`, `AuthSession`

**Key utilities:**
- `getFiscalStart()`, `getFiscalEnd()`, `getFiscalMonth()`, `getFiscalMonthOptions()` from `lib/date-utils.ts`
- `formatUSD()`, `formatARS()`, `formatPct()`, `formatDate()` from `lib/format.ts`
- Components: `KPICard`, `MonthSelector77`, `DataTable`, `SaleBanner`, `StatusBadge`, `Semaforo`

---

## File Structure (Phase 5 additions)

```
C:\Users\matyc\projects\lauti-crm\
├── lib/
│   └── gamification.ts                          # Streaks, badges, rankings
├── app/
│   ├── (dashboard)/
│   │   ├── page.tsx                             # MODIFIED — role routing
│   │   ├── HomeAdmin.tsx                        # Admin dashboard
│   │   ├── HomeCloser.tsx                       # Closer gamified home
│   │   ├── HomeSetter.tsx                       # Setter home
│   │   ├── tesoreria/
│   │   │   ├── page.tsx                         # Server component
│   │   │   └── TesoreriaClient.tsx              # Client component
│   │   ├── closers/
│   │   │   ├── page.tsx                         # Server component
│   │   │   └── ClosersClient.tsx                # Client component
│   │   └── leaderboard/
│   │       ├── page.tsx                         # Server component
│   │       └── LeaderboardClient.tsx            # Client component
```

---

### Task 1: Admin Dashboard (Home for admins)

**Files:**
- Create: `app/(dashboard)/HomeAdmin.tsx`
- Modify: `app/(dashboard)/page.tsx`

- [ ] **Step 1: Create HomeAdmin.tsx**

Create `app/(dashboard)/HomeAdmin.tsx`:

```typescript
"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import KPICard from "@/app/components/KPICard";
import MonthSelector77 from "@/app/components/MonthSelector77";
import SaleBanner from "@/app/components/SaleBanner";
import { formatUSD, formatDate } from "@/lib/format";
import { getFiscalStart, getFiscalEnd, getFiscalMonth } from "@/lib/date-utils";
import { subMonths } from "date-fns";
import type { MonthlyCash, Payment, Client } from "@/lib/types";

interface Props {
  monthlyCash: MonthlyCash[];
  payments: Payment[];
  overduePayments: Payment[];
  atRiskClients: Client[];
}

export default function HomeAdmin({
  monthlyCash,
  payments,
  overduePayments,
  atRiskClients,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState(
    getFiscalStart().toISOString().split("T")[0]
  );

  const currentLabel = useMemo(() => {
    const d = new Date(selectedMonth);
    return getFiscalMonth(d);
  }, [selectedMonth]);

  const prevLabel = useMemo(() => {
    const d = new Date(selectedMonth);
    return getFiscalMonth(subMonths(d, 1));
  }, [selectedMonth]);

  const current = useMemo(
    () => monthlyCash.find((m) => m.mes_fiscal === currentLabel),
    [monthlyCash, currentLabel]
  );

  const prev = useMemo(
    () => monthlyCash.find((m) => m.mes_fiscal === prevLabel),
    [monthlyCash, prevLabel]
  );

  function delta(curr: number | undefined, previous: number | undefined): number | null {
    if (!curr || !previous || previous === 0) return null;
    return ((curr - previous) / previous) * 100;
  }

  const cashTotal = current?.cash_total ?? 0;
  const cashVentasNuevas = current?.cash_ventas_nuevas ?? 0;
  const cashRenovaciones = current?.cash_renovaciones ?? 0;
  const cashCuotas = current?.cash_cuotas ?? 0;
  const ventasNuevasCount = current?.ventas_nuevas_count ?? 0;
  const renovacionesCount = current?.renovaciones_count ?? 0;
  const cuotasCobradas = payments.filter(
    (p) => p.estado === "pagado" && p.numero_cuota > 1 && !p.es_renovacion
  ).length;
  const ticketPromedio =
    ventasNuevasCount > 0 ? cashVentasNuevas / ventasNuevasCount : 0;

  // Daily cumulative cash chart
  const dailyCashData = useMemo(() => {
    const start = new Date(selectedMonth);
    const end = getFiscalEnd(start);
    const fiscalPayments = payments.filter((p) => {
      if (!p.fecha_pago || p.estado !== "pagado") return false;
      const d = new Date(p.fecha_pago);
      return d >= start && d <= end;
    });

    const dailyMap: Record<string, number> = {};
    for (const p of fiscalPayments) {
      const day = p.fecha_pago!;
      dailyMap[day] = (dailyMap[day] || 0) + p.monto_usd;
    }

    const sortedDays = Object.keys(dailyMap).sort();
    let cumulative = 0;
    return sortedDays.map((day) => {
      cumulative += dailyMap[day];
      return {
        fecha: day,
        label: new Date(day).toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "short",
        }),
        cash: cumulative,
      };
    });
  }, [payments, selectedMonth]);

  return (
    <div className="space-y-6">
      <SaleBanner />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            Resumen del periodo {currentLabel}
          </p>
        </div>
        <MonthSelector77 value={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          label="Cash Collected"
          value={cashTotal}
          format="usd"
          delta={delta(cashTotal, prev?.cash_total)}
          icon="💰"
        />
        <KPICard
          label="Ventas Nuevas"
          value={ventasNuevasCount}
          format="number"
          delta={delta(ventasNuevasCount, prev?.ventas_nuevas_count)}
          icon="🚀"
        />
        <KPICard
          label="Cash Ventas Nuevas"
          value={cashVentasNuevas}
          format="usd"
          delta={delta(cashVentasNuevas, prev?.cash_ventas_nuevas)}
        />
        <KPICard
          label="Renovaciones"
          value={renovacionesCount}
          format="number"
          delta={delta(renovacionesCount, prev?.renovaciones_count)}
          icon="🔄"
        />
        <KPICard
          label="Cash Renovaciones"
          value={cashRenovaciones}
          format="usd"
          delta={delta(cashRenovaciones, prev?.cash_renovaciones)}
        />
        <KPICard
          label="Cuotas Cobradas"
          value={cuotasCobradas}
          format="number"
          icon="📋"
        />
        <KPICard
          label="Cash Cuotas"
          value={cashCuotas}
          format="usd"
          delta={delta(cashCuotas, prev?.cash_cuotas)}
        />
        <KPICard
          label="Ticket Promedio"
          value={ticketPromedio}
          format="usd"
          icon="🎯"
        />
      </div>

      {/* Cash Acumulado Chart */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Cash Collected Diario Acumulado
        </h2>
        {dailyCashData.length === 0 ? (
          <p className="text-[var(--muted)] text-sm py-8 text-center">
            Sin pagos en este periodo
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyCashData}>
              <defs>
                <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--green)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--green)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
              <XAxis
                dataKey="label"
                stroke="var(--muted)"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="var(--muted)"
                fontSize={11}
                tickLine={false}
                tickFormatter={(v: number) => formatUSD(v)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "8px",
                  color: "white",
                }}
                formatter={(value: number) => [formatUSD(value), "Cash acumulado"]}
                labelFormatter={(label: string) => label}
              />
              <Area
                type="monotone"
                dataKey="cash"
                stroke="var(--green)"
                strokeWidth={2}
                fill="url(#cashGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Alert Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cuotas Vencidas Hoy */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Cuotas Vencidas Hoy
            </h2>
            <span className="text-xs bg-[var(--red)]/15 text-[var(--red)] px-2 py-1 rounded-full font-medium">
              {overduePayments.length}
            </span>
          </div>
          {overduePayments.length === 0 ? (
            <p className="text-[var(--muted)] text-sm">
              No hay cuotas vencidas hoy
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {overduePayments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-[var(--red)]/5 border border-[var(--red)]/10 rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-white font-medium">
                      Cuota #{p.numero_cuota}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      Lead: {p.lead_id?.slice(0, 8) ?? "—"}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[var(--red)]">
                    {formatUSD(p.monto_usd)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clientes en Riesgo */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Clientes en Riesgo
            </h2>
            <span className="text-xs bg-[var(--yellow)]/15 text-[var(--yellow)] px-2 py-1 rounded-full font-medium">
              {atRiskClients.length}
            </span>
          </div>
          {atRiskClients.length === 0 ? (
            <p className="text-[var(--muted)] text-sm">
              Sin clientes en riesgo
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {atRiskClients.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between bg-[var(--yellow)]/5 border border-[var(--yellow)]/10 rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-white font-medium">{c.nombre}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {c.programa ?? "Sin programa"}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[var(--yellow)]">
                    Score: {c.health_score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Modify page.tsx for role routing**

Modify `app/(dashboard)/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase-server";
import { getFiscalStart, getFiscalEnd, getFiscalMonth } from "@/lib/date-utils";
import { subMonths } from "date-fns";
import HomeAdmin from "./HomeAdmin";
import HomeCloser from "./HomeCloser";
import HomeSetter from "./HomeSetter";
import type { MonthlyCash, Payment, Client, Lead, CloserKPI } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = createServerClient();

  if (session.is_admin) {
    // Fetch admin data
    const fiscalStart = getFiscalStart();
    const fiscalEnd = getFiscalEnd();
    const today = new Date().toISOString().split("T")[0];

    const [cashRes, paymentsRes, overdueRes, atRiskRes] = await Promise.all([
      supabase.from("v_monthly_cash").select("*"),
      supabase
        .from("payments")
        .select("*")
        .eq("estado", "pagado")
        .gte("fecha_pago", fiscalStart.toISOString().split("T")[0])
        .lte("fecha_pago", fiscalEnd.toISOString().split("T")[0]),
      supabase
        .from("payments")
        .select("*")
        .eq("estado", "pendiente")
        .lte("fecha_vencimiento", today),
      supabase
        .from("clients")
        .select("*")
        .eq("estado", "activo")
        .lt("health_score", 50),
    ]);

    return (
      <HomeAdmin
        monthlyCash={(cashRes.data as MonthlyCash[]) ?? []}
        payments={(paymentsRes.data as Payment[]) ?? []}
        overduePayments={(overdueRes.data as Payment[]) ?? []}
        atRiskClients={(atRiskRes.data as Client[]) ?? []}
      />
    );
  }

  // Determine primary role
  const roles = session.roles;
  const isCloser = roles.includes("closer");
  const isSetter = roles.includes("setter");

  if (isCloser) {
    const fiscalStart = getFiscalStart();
    const fiscalEnd = getFiscalEnd();
    const today = new Date().toISOString().split("T")[0];

    const [leadsRes, kpisRes] = await Promise.all([
      supabase
        .from("leads")
        .select("*, closer:team_members!closer_id(*), setter:team_members!setter_id(*)")
        .eq("closer_id", session.team_member_id),
      supabase
        .from("v_closer_kpis")
        .select("*")
        .eq("mes_fiscal", getFiscalMonth(new Date())),
    ]);

    return (
      <HomeCloser
        leads={(leadsRes.data as Lead[]) ?? []}
        closerKpis={(kpisRes.data as CloserKPI[]) ?? []}
        currentMemberId={session.team_member_id}
        currentName={session.nombre}
      />
    );
  }

  if (isSetter) {
    const [reportsRes, leadsRes] = await Promise.all([
      supabase
        .from("daily_reports")
        .select("*")
        .eq("setter_id", session.team_member_id)
        .order("fecha", { ascending: false })
        .limit(30),
      supabase
        .from("leads")
        .select("*")
        .eq("setter_id", session.team_member_id)
        .eq("estado", "cerrado"),
    ]);

    return (
      <HomeSetter
        reports={reportsRes.data ?? []}
        leads={(leadsRes.data as Lead[]) ?? []}
        currentMemberId={session.team_member_id}
        currentName={session.nombre}
      />
    );
  }

  // Fallback — seguimiento or cobranzas roles redirect to their specific pages
  redirect("/clientes");
}
```

- [ ] **Step 3: Verify build**

```bash
cd /c/Users/matyc/projects/lauti-crm
npm run build
```

Expected: Build succeeds (HomeCloser and HomeSetter will be created in Tasks 2 and 3).

- [ ] **Step 4: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/(dashboard)/HomeAdmin.tsx app/(dashboard)/page.tsx
git commit -m "feat: admin dashboard with KPIs, cumulative cash chart, alert cards, role routing"
```

---

### Task 2: Closer Home (gamified)

**Files:**
- Create: `app/(dashboard)/HomeCloser.tsx`

- [ ] **Step 1: Create HomeCloser.tsx**

Create `app/(dashboard)/HomeCloser.tsx`:

```typescript
"use client";

import { useMemo } from "react";
import KPICard from "@/app/components/KPICard";
import StatusBadge from "@/app/components/StatusBadge";
import { formatUSD, formatDate } from "@/lib/format";
import { getFiscalStart, getFiscalEnd } from "@/lib/date-utils";
import { getCloserStreaks, getCloserBadges } from "@/lib/gamification";
import type { Lead, CloserKPI } from "@/lib/types";

interface Props {
  leads: Lead[];
  closerKpis: CloserKPI[];
  currentMemberId: string;
  currentName: string;
}

export default function HomeCloser({
  leads,
  closerKpis,
  currentMemberId,
  currentName,
}: Props) {
  const today = new Date().toISOString().split("T")[0];

  // Personal KPIs
  const myKpis = closerKpis.find((k) => k.team_member_id === currentMemberId);
  const streaks = useMemo(() => getCloserStreaks(leads), [leads]);
  const myStreak = streaks.get(currentMemberId)?.currentStreak ?? 0;
  const badges = useMemo(
    () => getCloserBadges(leads, currentMemberId),
    [leads, currentMemberId]
  );
  const earnedBadges = badges.filter((b) => b.earned);

  // Ranking position
  const ranking = useMemo(() => {
    const sorted = [...closerKpis].sort(
      (a, b) =>
        (b.cerradas * (b.aov || 0)) - (a.cerradas * (a.aov || 0))
    );
    return sorted.findIndex((k) => k.team_member_id === currentMemberId) + 1;
  }, [closerKpis, currentMemberId]);

  // Today's agenda — leads with fecha_llamada = today
  const todayAgenda = useMemo(
    () =>
      leads
        .filter((l) => {
          if (!l.fecha_llamada) return false;
          const llamadaDate = l.fecha_llamada.split("T")[0];
          return (
            llamadaDate === today &&
            l.estado !== "cerrado" &&
            l.estado !== "cancelada" &&
            l.estado !== "broke_cancelado"
          );
        })
        .sort((a, b) =>
          (a.fecha_llamada ?? "").localeCompare(b.fecha_llamada ?? "")
        ),
    [leads, today]
  );

  // Calls made today (including cerrados)
  const callsToday = leads.filter((l) => {
    if (!l.fecha_llamada) return false;
    return l.fecha_llamada.split("T")[0] === today;
  }).length;

  // Recent sales
  const recentSales = useMemo(
    () =>
      leads
        .filter((l) => l.estado === "cerrado")
        .sort((a, b) =>
          (b.fecha_llamada ?? "").localeCompare(a.fecha_llamada ?? "")
        )
        .slice(0, 5),
    [leads]
  );

  // Mini leaderboard — top 3 by cash (cerradas * aov)
  const top3 = useMemo(() => {
    return [...closerKpis]
      .map((k) => ({
        ...k,
        cash: k.cerradas * k.aov,
      }))
      .sort((a, b) => b.cash - a.cash)
      .slice(0, 3);
  }, [closerKpis]);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Hola, {currentName}{" "}
          {myStreak >= 3 ? "🔥" : ""}
        </h1>
        <p className="text-[var(--muted)] text-sm mt-1">
          {myStreak > 0
            ? `Racha de ${myStreak} dia${myStreak > 1 ? "s" : ""} cerrando`
            : "Empeza tu racha hoy!"}
        </p>
      </div>

      {/* Earned Badges */}
      {earnedBadges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {earnedBadges.map((b) => (
            <span
              key={b.id}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--purple)]/15 text-[var(--purple-light)] border border-[var(--purple)]/20"
            >
              {b.icon} {b.label}
            </span>
          ))}
        </div>
      )}

      {/* Personal KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Llamadas Hoy"
          value={callsToday}
          format="number"
          icon="📞"
        />
        <KPICard
          label="Mi Streak"
          value={myStreak}
          format="number"
          icon="🔥"
        />
        <KPICard
          label="Mi Posicion"
          value={ranking || closerKpis.length}
          format="number"
          icon="🏆"
        />
        <KPICard
          label="Cierres del Mes"
          value={myKpis?.cerradas ?? 0}
          format="number"
          icon="🚀"
        />
      </div>

      {/* Today's Agenda */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Agenda de Hoy ({todayAgenda.length})
        </h2>
        {todayAgenda.length === 0 ? (
          <p className="text-[var(--muted)] text-sm py-4 text-center">
            No hay llamadas programadas para hoy
          </p>
        ) : (
          <div className="space-y-2">
            {todayAgenda.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{l.nombre}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {l.programa_pitcheado
                      ? l.programa_pitcheado.replace(/_/g, " ")
                      : "Sin programa"}{" "}
                    {l.fecha_llamada
                      ? new Date(l.fecha_llamada).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </p>
                </div>
                <StatusBadge status={l.estado} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Sales */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Ultimas Ventas
          </h2>
          {recentSales.length === 0 ? (
            <p className="text-[var(--muted)] text-sm py-4 text-center">
              Sin ventas recientes
            </p>
          ) : (
            <div className="space-y-2">
              {recentSales.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between bg-[var(--green)]/5 border border-[var(--green)]/10 rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-white font-medium">{l.nombre}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {formatDate(l.fecha_llamada)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[var(--green)]">
                    {formatUSD(l.ticket_total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mini Leaderboard */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Top 3 del Mes
          </h2>
          {top3.length === 0 ? (
            <p className="text-[var(--muted)] text-sm py-4 text-center">
              Sin datos
            </p>
          ) : (
            <div className="space-y-3">
              {top3.map((k, i) => {
                const isMe = k.team_member_id === currentMemberId;
                return (
                  <div
                    key={k.team_member_id}
                    className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                      isMe
                        ? "bg-[var(--purple)]/10 border border-[var(--purple)]/20"
                        : "bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{medals[i]}</span>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {k.nombre}
                          {isMe ? " (vos)" : ""}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {k.cerradas} cierres
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-[var(--green)]">
                      {formatUSD(k.cash)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /c/Users/matyc/projects/lauti-crm
npm run build
```

Expected: Build succeeds (gamification.ts will be created in Task 6; temporary type stub if needed).

- [ ] **Step 3: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/(dashboard)/HomeCloser.tsx
git commit -m "feat: closer gamified home — personal KPIs, agenda, sales, mini leaderboard"
```

---

### Task 3: Setter Home

**Files:**
- Create: `app/(dashboard)/HomeSetter.tsx`

- [ ] **Step 1: Create HomeSetter.tsx**

Create `app/(dashboard)/HomeSetter.tsx`:

```typescript
"use client";

import { useMemo } from "react";
import KPICard from "@/app/components/KPICard";
import { formatUSD } from "@/lib/format";
import { getFiscalStart, getFiscalEnd } from "@/lib/date-utils";
import { COMMISSION_SETTER } from "@/lib/constants";
import type { Lead, DailyReport } from "@/lib/types";

interface Props {
  reports: DailyReport[];
  leads: Lead[];
  currentMemberId: string;
  currentName: string;
}

export default function HomeSetter({
  reports,
  leads,
  currentMemberId,
  currentName,
}: Props) {
  const fiscalStart = getFiscalStart();
  const fiscalEnd = getFiscalEnd();

  // Agendas generadas este mes (leads where setter_id = me, fecha_agendado in fiscal range)
  const agendasMes = useMemo(() => {
    return leads.filter((l) => {
      if (!l.fecha_agendado) return false;
      const d = new Date(l.fecha_agendado);
      return d >= fiscalStart && d <= fiscalEnd;
    }).length;
  }, [leads, fiscalStart, fiscalEnd]);

  // Ventas por chat — from daily_reports in fiscal range
  const ventasChat = useMemo(() => {
    return reports
      .filter((r) => {
        const d = new Date(r.fecha);
        return d >= fiscalStart && d <= fiscalEnd;
      })
      .reduce((count, r) => {
        if (r.ventas_por_chat && r.ventas_por_chat.trim().length > 0) {
          return count + 1;
        }
        return count;
      }, 0);
  }, [reports, fiscalStart, fiscalEnd]);

  // Comisiones — 5% of cash from cerrado leads where setter = me
  const comisiones = useMemo(() => {
    const cerrados = leads.filter((l) => {
      if (l.estado !== "cerrado" || !l.fecha_llamada) return false;
      const d = new Date(l.fecha_llamada);
      return d >= fiscalStart && d <= fiscalEnd;
    });
    const cash = cerrados.reduce((s, l) => s + l.ticket_total, 0);
    return cash * COMMISSION_SETTER;
  }, [leads, fiscalStart, fiscalEnd]);

  // Conversaciones totales (from reports in fiscal range)
  const conversaciones = useMemo(() => {
    return reports
      .filter((r) => {
        const d = new Date(r.fecha);
        return d >= fiscalStart && d <= fiscalEnd;
      })
      .reduce((s, r) => s + r.conversaciones_iniciadas, 0);
  }, [reports, fiscalStart, fiscalEnd]);

  // Last 7 reports for quick view
  const recentReports = reports.slice(0, 7);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Hola, {currentName}
        </h1>
        <p className="text-[var(--muted)] text-sm mt-1">
          Tu resumen del mes
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Agendas Generadas"
          value={agendasMes}
          format="number"
          icon="📅"
        />
        <KPICard
          label="Ventas por Chat"
          value={ventasChat}
          format="number"
          icon="💬"
        />
        <KPICard
          label="Comisiones"
          value={comisiones}
          format="usd"
          icon="💵"
        />
        <KPICard
          label="Conversaciones"
          value={conversaciones}
          format="number"
          icon="🗣️"
        />
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="/venta-chat"
          className="bg-[var(--purple)]/10 border border-[var(--purple)]/20 rounded-xl p-6 hover:bg-[var(--purple)]/15 transition-colors"
        >
          <span className="text-2xl mb-2 block">💬</span>
          <h3 className="text-lg font-semibold text-white">Cargar Venta por Chat</h3>
          <p className="text-sm text-[var(--muted)] mt-1">
            Registrar una venta directa por mensajeria
          </p>
        </a>
        <a
          href="/reporte-diario"
          className="bg-[var(--green)]/10 border border-[var(--green)]/20 rounded-xl p-6 hover:bg-[var(--green)]/15 transition-colors"
        >
          <span className="text-2xl mb-2 block">📝</span>
          <h3 className="text-lg font-semibold text-white">Reporte Diario</h3>
          <p className="text-sm text-[var(--muted)] mt-1">
            Cargar tu actividad del dia
          </p>
        </a>
      </div>

      {/* Recent Reports */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Ultimos Reportes
        </h2>
        {recentReports.length === 0 ? (
          <p className="text-[var(--muted)] text-sm py-4 text-center">
            Sin reportes cargados
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--muted)] text-xs uppercase">
                  <th className="text-left py-2 px-3">Fecha</th>
                  <th className="text-right py-2 px-3">Conversaciones</th>
                  <th className="text-right py-2 px-3">Historias</th>
                  <th className="text-right py-2 px-3">Calendarios</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-[var(--card-border)]"
                  >
                    <td className="py-2 px-3 text-white">
                      {new Date(r.fecha).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {r.conversaciones_iniciadas}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {r.respuestas_historias}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {r.calendarios_enviados}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /c/Users/matyc/projects/lauti-crm
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/(dashboard)/HomeSetter.tsx
git commit -m "feat: setter home — KPIs, quick access forms, recent reports"
```

---

### Task 4: Tesoreria page

**Files:**
- Create: `app/(dashboard)/tesoreria/page.tsx`, `app/(dashboard)/tesoreria/TesoreriaClient.tsx`

- [ ] **Step 1: Create server page**

Create `app/(dashboard)/tesoreria/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase-server";
import TesoreriaClient from "./TesoreriaClient";
import type { TreasuryRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TesoreriaPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.is_admin) redirect("/");

  const supabase = createServerClient();
  const { data } = await supabase.from("v_treasury").select("*");

  return <TesoreriaClient rows={(data as TreasuryRow[]) ?? []} />;
}
```

- [ ] **Step 2: Create TesoreriaClient.tsx**

Create `app/(dashboard)/tesoreria/TesoreriaClient.tsx`:

```typescript
"use client";

import { useState, useMemo, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import MonthSelector77 from "@/app/components/MonthSelector77";
import { formatUSD, formatARS } from "@/lib/format";
import { getFiscalStart, getFiscalMonth, getFiscalMonthOptions } from "@/lib/date-utils";
import { RECEPTORES } from "@/lib/constants";
import type { TreasuryRow, MetodoPago } from "@/lib/types";

interface Props {
  rows: TreasuryRow[];
}

const RECEPTOR_COLORS: Record<string, string> = {
  JUANMA: "#8b5cf6",
  "Binance lauti": "#f59e0b",
  Stripe: "#3b82f6",
  "Cuenta pesos Lauti": "#10b981",
  "Cuenta dolares Lauti": "#06b6d4",
  Efectivo: "#ef4444",
  "Financiera Payments": "#ec4899",
  Becheq: "#f97316",
};

export default function TesoreriaClient({ rows }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(
    getFiscalStart().toISOString().split("T")[0]
  );
  const [filterMetodo, setFilterMetodo] = useState<string>("todos");
  const printRef = useRef<HTMLDivElement>(null);

  const currentLabel = useMemo(() => {
    return getFiscalMonth(new Date(selectedMonth));
  }, [selectedMonth]);

  // Filter rows by selected fiscal month and metodo_pago
  const filtered = useMemo(() => {
    let result = rows.filter((r) => r.mes_fiscal === currentLabel);
    if (filterMetodo !== "todos") {
      result = result.filter((r) => r.metodo_pago === filterMetodo);
    }
    return result;
  }, [rows, currentLabel, filterMetodo]);

  // Group by receptor for summary cards
  const byReceptor = useMemo(() => {
    const map: Record<string, { total_usd: number; total_ars: number }> = {};
    for (const r of filtered) {
      if (!map[r.receptor]) map[r.receptor] = { total_usd: 0, total_ars: 0 };
      map[r.receptor].total_usd += r.total_usd ?? 0;
      map[r.receptor].total_ars += r.total_ars ?? 0;
    }
    return Object.entries(map)
      .map(([receptor, totals]) => ({ receptor, ...totals }))
      .sort((a, b) => b.total_usd - a.total_usd);
  }, [filtered]);

  // Breakdown table rows
  const breakdownRows = useMemo(() => {
    const map: Record<
      string,
      {
        receptor: string;
        metodo_pago: string;
        ventas_nuevas: number;
        cuotas: number;
        renovaciones: number;
        total: number;
      }
    > = {};
    for (const r of filtered) {
      const key = `${r.receptor}__${r.metodo_pago ?? "N/A"}`;
      if (!map[key]) {
        map[key] = {
          receptor: r.receptor,
          metodo_pago: r.metodo_pago ?? "N/A",
          ventas_nuevas: 0,
          cuotas: 0,
          renovaciones: 0,
          total: 0,
        };
      }
      map[key].ventas_nuevas += r.usd_ventas_nuevas ?? 0;
      map[key].cuotas += r.usd_cuotas ?? 0;
      map[key].renovaciones += r.usd_renovaciones ?? 0;
      map[key].total += r.total_usd ?? 0;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Grand totals
  const grandTotalUSD = byReceptor.reduce((s, r) => s + r.total_usd, 0);
  const grandTotalARS = byReceptor.reduce((s, r) => s + r.total_ars, 0);

  // Stacked bar chart data — last 6 months by receptor
  const chartData = useMemo(() => {
    const months = getFiscalMonthOptions(6).reverse();
    return months.map((m) => {
      const monthRows = rows.filter((r) => r.mes_fiscal === m.label);
      const entry: Record<string, string | number> = { mes: m.label };
      for (const receptor of RECEPTORES) {
        const receptorRows = monthRows.filter((r) => r.receptor === receptor);
        entry[receptor] = receptorRows.reduce(
          (s, r) => s + (r.total_usd ?? 0),
          0
        );
      }
      return entry;
    });
  }, [rows]);

  // Unique metodo_pago values for filter
  const metodos = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.metodo_pago) set.add(r.metodo_pago);
    }
    return Array.from(set).sort();
  }, [rows]);

  function handleExportPDF() {
    window.print();
  }

  return (
    <div className="space-y-6" ref={printRef}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tesoreria</h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            Flujo de dinero por receptor — {currentLabel}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterMetodo}
            onChange={(e) => setFilterMetodo(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-white text-sm focus:border-[var(--purple)] outline-none"
          >
            <option value="todos">Todos los metodos</option>
            {metodos.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <MonthSelector77 value={selectedMonth} onChange={setSelectedMonth} />
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 rounded-lg bg-[var(--purple)] text-white text-sm font-medium hover:bg-[var(--purple-light)] transition-colors print:hidden"
          >
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Receptor Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {byReceptor.map((r) => (
          <div
            key={r.receptor}
            className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4"
          >
            <p className="text-xs text-[var(--muted)] uppercase mb-1">
              {r.receptor}
            </p>
            <p className="text-xl font-bold text-white">
              {formatUSD(r.total_usd)}
            </p>
            {r.total_ars > 0 && (
              <p className="text-xs text-[var(--muted)] mt-1">
                {formatARS(r.total_ars)}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Grand Totals */}
      <div className="flex gap-4">
        <div className="bg-[var(--green)]/10 border border-[var(--green)]/20 rounded-xl px-6 py-4">
          <p className="text-xs text-[var(--muted)] uppercase">Total USD</p>
          <p className="text-2xl font-bold text-[var(--green)]">
            {formatUSD(grandTotalUSD)}
          </p>
        </div>
        {grandTotalARS > 0 && (
          <div className="bg-[var(--green)]/10 border border-[var(--green)]/20 rounded-xl px-6 py-4">
            <p className="text-xs text-[var(--muted)] uppercase">Total ARS</p>
            <p className="text-2xl font-bold text-[var(--green)]">
              {formatARS(grandTotalARS)}
            </p>
          </div>
        )}
      </div>

      {/* Breakdown Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Desglose</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--muted)] text-xs uppercase">
                <th className="text-left py-2 px-3">Receptor</th>
                <th className="text-left py-2 px-3">Metodo</th>
                <th className="text-right py-2 px-3">Ventas Nuevas</th>
                <th className="text-right py-2 px-3">Cuotas</th>
                <th className="text-right py-2 px-3">Renovaciones</th>
                <th className="text-right py-2 px-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {breakdownRows.map((r, i) => (
                <tr
                  key={i}
                  className="border-t border-[var(--card-border)]"
                >
                  <td className="py-2 px-3 text-white font-medium">
                    {r.receptor}
                  </td>
                  <td className="py-2 px-3 text-[var(--muted)]">
                    {r.metodo_pago}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {formatUSD(r.ventas_nuevas)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {formatUSD(r.cuotas)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {formatUSD(r.renovaciones)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-white">
                    {formatUSD(r.total)}
                  </td>
                </tr>
              ))}
              {breakdownRows.length > 0 && (
                <tr className="border-t-2 border-[var(--purple)] font-bold">
                  <td className="py-2 px-3 text-white" colSpan={2}>
                    TOTAL
                  </td>
                  <td className="py-2 px-3 text-right text-white">
                    {formatUSD(
                      breakdownRows.reduce((s, r) => s + r.ventas_nuevas, 0)
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-white">
                    {formatUSD(
                      breakdownRows.reduce((s, r) => s + r.cuotas, 0)
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-white">
                    {formatUSD(
                      breakdownRows.reduce((s, r) => s + r.renovaciones, 0)
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-[var(--green)]">
                    {formatUSD(grandTotalUSD)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stacked Bar Chart — last 6 months */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Cash por Receptor (ultimos 6 meses)
        </h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis
              dataKey="mes"
              stroke="var(--muted)"
              fontSize={11}
              tickLine={false}
              angle={-20}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="var(--muted)"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v: number) => formatUSD(v)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "8px",
                color: "white",
              }}
              formatter={(value: number, name: string) => [
                formatUSD(value),
                name,
              ]}
            />
            <Legend />
            {RECEPTORES.map((receptor) => (
              <Bar
                key={receptor}
                dataKey={receptor}
                stackId="a"
                fill={RECEPTOR_COLORS[receptor] ?? "#6b7280"}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
cd /c/Users/matyc/projects/lauti-crm
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/(dashboard)/tesoreria/
git commit -m "feat: tesoreria page — receptor cards, breakdown table, stacked bar chart, PDF export"
```

---

### Task 5: Closers Analytics page

**Files:**
- Create: `app/(dashboard)/closers/page.tsx`, `app/(dashboard)/closers/ClosersClient.tsx`

- [ ] **Step 1: Create server page**

Create `app/(dashboard)/closers/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase-server";
import ClosersClient from "./ClosersClient";
import type { CloserKPI, Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClosersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.is_admin) redirect("/");

  const supabase = createServerClient();

  const [kpisRes, leadsRes, commissionsRes] = await Promise.all([
    supabase.from("v_closer_kpis").select("*"),
    supabase
      .from("leads")
      .select("*, closer:team_members!closer_id(*)")
      .not("closer_id", "is", null),
    supabase.from("v_commissions").select("*"),
  ]);

  return (
    <ClosersClient
      closerKpis={(kpisRes.data as CloserKPI[]) ?? []}
      leads={(leadsRes.data as Lead[]) ?? []}
      commissions={commissionsRes.data ?? []}
    />
  );
}
```

- [ ] **Step 2: Create ClosersClient.tsx**

Create `app/(dashboard)/closers/ClosersClient.tsx`:

```typescript
"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import MonthSelector77 from "@/app/components/MonthSelector77";
import KPICard from "@/app/components/KPICard";
import DataTable from "@/app/components/DataTable";
import { formatUSD, formatPct } from "@/lib/format";
import { getFiscalStart, getFiscalMonth, getFiscalMonthOptions } from "@/lib/date-utils";
import type { CloserKPI, Lead } from "@/lib/types";

interface Commission {
  team_member_id: string;
  nombre: string;
  mes_fiscal: string;
  comision_closer: number | null;
  comision_setter: number | null;
  comision_cobranzas: number | null;
  comision_total: number | null;
}

interface Props {
  closerKpis: CloserKPI[];
  leads: Lead[];
  commissions: Commission[];
}

export default function ClosersClient({
  closerKpis,
  leads,
  commissions,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState(
    getFiscalStart().toISOString().split("T")[0]
  );

  const currentLabel = useMemo(
    () => getFiscalMonth(new Date(selectedMonth)),
    [selectedMonth]
  );

  // Current month KPIs
  const currentKpis = useMemo(
    () => closerKpis.filter((k) => k.mes_fiscal === currentLabel),
    [closerKpis, currentLabel]
  );

  // Funnel data per closer
  const funnelData = useMemo(() => {
    return currentKpis.map((k) => ({
      nombre: k.nombre,
      Agendas: k.total_agendas,
      "Show Up": k.presentadas,
      Calificadas: k.calificadas,
      Cerrado: k.cerradas,
    }));
  }, [currentKpis]);

  // Trend data — cierre% over last 6 fiscal months per closer
  const trendData = useMemo(() => {
    const months = getFiscalMonthOptions(6).reverse();
    const closerNames = [...new Set(closerKpis.map((k) => k.nombre))];

    return months.map((m) => {
      const entry: Record<string, string | number> = { mes: m.label };
      for (const name of closerNames) {
        const kpi = closerKpis.find(
          (k) => k.nombre === name && k.mes_fiscal === m.label
        );
        entry[name] = kpi?.cierre_pct ?? 0;
      }
      return entry;
    });
  }, [closerKpis]);

  const closerNames = useMemo(
    () => [...new Set(closerKpis.map((k) => k.nombre))],
    [closerKpis]
  );

  const closerColors = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  // Commission table rows for current month
  const commissionRows = useMemo(() => {
    return commissions
      .filter((c) => c.mes_fiscal === currentLabel)
      .map((c) => ({
        nombre: c.nombre,
        comision_closer: c.comision_closer ?? 0,
        mes_fiscal: c.mes_fiscal,
      }))
      .filter((c) => c.comision_closer > 0)
      .sort((a, b) => b.comision_closer - a.comision_closer);
  }, [commissions, currentLabel]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Closers Analytics</h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            Metricas de rendimiento — {currentLabel}
          </p>
        </div>
        <MonthSelector77 value={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {/* Per-Closer KPI Cards */}
      {currentKpis.length === 0 ? (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-8 text-center">
          <p className="text-[var(--muted)]">Sin datos para este periodo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {currentKpis.map((k) => (
            <div
              key={k.team_member_id}
              className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-3">
                {k.nombre}
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-[var(--muted)]">Agendas</p>
                  <p className="text-lg font-bold text-white">
                    {k.total_agendas}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Presentadas</p>
                  <p className="text-lg font-bold text-white">
                    {k.presentadas}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Calificadas</p>
                  <p className="text-lg font-bold text-white">
                    {k.calificadas}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Cerradas</p>
                  <p className="text-lg font-bold text-[var(--green)]">
                    {k.cerradas}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-[var(--card-border)]">
                <div>
                  <p className="text-xs text-[var(--muted)]">Show Up %</p>
                  <p className="text-sm font-bold text-white">
                    {k.show_up_pct}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Cierre %</p>
                  <p className="text-sm font-bold text-white">
                    {k.cierre_pct}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">AOV</p>
                  <p className="text-sm font-bold text-white">
                    {formatUSD(k.aov)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Funnel Chart */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Embudo de Conversion por Closer
        </h2>
        {funnelData.length === 0 ? (
          <p className="text-[var(--muted)] text-sm text-center py-8">
            Sin datos
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--card-border)"
              />
              <XAxis type="number" stroke="var(--muted)" fontSize={11} />
              <YAxis
                type="category"
                dataKey="nombre"
                stroke="var(--muted)"
                fontSize={11}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "8px",
                  color: "white",
                }}
              />
              <Legend />
              <Bar dataKey="Agendas" fill="#8b5cf6" />
              <Bar dataKey="Show Up" fill="#a78bfa" />
              <Bar dataKey="Calificadas" fill="#f59e0b" />
              <Bar dataKey="Cerrado" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Trends — cierre% over 6 months */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Tendencia Cierre % (ultimos 6 meses)
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis
              dataKey="mes"
              stroke="var(--muted)"
              fontSize={11}
              tickLine={false}
              angle={-20}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="var(--muted)"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "8px",
                color: "white",
              }}
              formatter={(value: number, name: string) => [
                `${value}%`,
                name,
              ]}
            />
            <Legend />
            {closerNames.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={closerColors[i % closerColors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Commissions Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Comisiones — {currentLabel}
        </h2>
        {commissionRows.length === 0 ? (
          <p className="text-[var(--muted)] text-sm text-center py-4">
            Sin comisiones registradas
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--muted)] text-xs uppercase">
                  <th className="text-left py-2 px-3">Closer</th>
                  <th className="text-right py-2 px-3">Comision</th>
                  <th className="text-left py-2 px-3">Periodo</th>
                </tr>
              </thead>
              <tbody>
                {commissionRows.map((c) => (
                  <tr
                    key={c.nombre}
                    className="border-t border-[var(--card-border)]"
                  >
                    <td className="py-2 px-3 text-white font-medium">
                      {c.nombre}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-[var(--green)]">
                      {formatUSD(c.comision_closer)}
                    </td>
                    <td className="py-2 px-3 text-[var(--muted)]">
                      {c.mes_fiscal}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
cd /c/Users/matyc/projects/lauti-crm
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/(dashboard)/closers/
git commit -m "feat: closers analytics — per-closer KPIs, funnel, cierre% trends, commissions table"
```

---

### Task 6: Gamification engine

**Files:**
- Create: `lib/gamification.ts`

- [ ] **Step 1: Create gamification.ts**

Create `lib/gamification.ts`:

```typescript
import type { Lead } from "@/lib/types";
import { getFiscalStart, getFiscalEnd, getFiscalMonth } from "@/lib/date-utils";

// ========================================
// TYPES
// ========================================

export interface CloserStreak {
  closerId: string;
  nombre: string;
  currentStreak: number;
  longestStreak: number;
}

export interface Badge {
  id: string;
  label: string;
  icon: string;
  earned: boolean;
}

export interface CloserRanking {
  closerId: string;
  nombre: string;
  position: number;
  cash: number;
  cerradas: number;
  streak: number;
  badges: Badge[];
}

// ========================================
// STREAKS
// ========================================

/**
 * Calculate consecutive days with at least 1 cerrado for each closer.
 * A streak counts backward from today (or yesterday if today has no cierre yet).
 * Uses fecha_llamada as the date of the cierre.
 */
export function getCloserStreaks(leads: Lead[]): Map<string, CloserStreak> {
  const streaks = new Map<string, CloserStreak>();

  // Group cierre dates by closer_id
  const closerDates = new Map<string, { nombre: string; dates: Set<string> }>();

  for (const l of leads) {
    if (l.estado !== "cerrado" || !l.closer_id || !l.fecha_llamada) continue;
    const dateStr = l.fecha_llamada.split("T")[0];

    if (!closerDates.has(l.closer_id)) {
      closerDates.set(l.closer_id, {
        nombre: l.closer?.nombre ?? l.closer_id,
        dates: new Set(),
      });
    }
    closerDates.get(l.closer_id)!.dates.add(dateStr);
  }

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today.getTime() - 86400000);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  for (const [closerId, { nombre, dates }] of closerDates) {
    // Start counting from today or yesterday
    if (!dates.has(todayStr) && !dates.has(yesterdayStr)) {
      streaks.set(closerId, {
        closerId,
        nombre,
        currentStreak: 0,
        longestStreak: 0,
      });
      continue;
    }

    let checkDate = dates.has(todayStr)
      ? new Date(today)
      : new Date(yesterday);
    let currentStreak = 0;

    while (dates.has(checkDate.toISOString().split("T")[0])) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Calculate longest streak from all dates
    const sortedDates = Array.from(dates).sort();
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = Math.round(
        (curr.getTime() - prev.getTime()) / 86400000
      );

      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    streaks.set(closerId, {
      closerId,
      nombre,
      currentStreak,
      longestStreak,
    });
  }

  return streaks;
}

// ========================================
// BADGES
// ========================================

/**
 * Calculate badges for a closer in a given fiscal month.
 * Uses closer_id for identification (not name like ROMS).
 *
 * Badge list:
 * - "Closer del mes": top cash collected
 * - "Racha 7+": currentStreak >= 7
 * - "Ticket mas alto": highest single ticket_total in fiscal month
 * - "Cierre mismo dia": has a cerrado where fecha_llamada date = first payment date
 * - "Primera venta del mes": first cerrado of the fiscal month
 */
export function getCloserBadges(
  leads: Lead[],
  closerId: string,
  fiscalDate?: Date
): Badge[] {
  const refDate = fiscalDate ?? new Date();
  const start = getFiscalStart(refDate);
  const end = getFiscalEnd(refDate);

  // Filter leads in fiscal month
  const fiscalLeads = leads.filter((l) => {
    if (!l.fecha_llamada) return false;
    const d = new Date(l.fecha_llamada);
    return d >= start && d <= end;
  });

  const cerradosFiscal = fiscalLeads.filter((l) => l.estado === "cerrado");

  // ---- Closer del mes ----
  const cashByCloser = new Map<string, number>();
  for (const l of cerradosFiscal) {
    if (!l.closer_id) continue;
    cashByCloser.set(
      l.closer_id,
      (cashByCloser.get(l.closer_id) ?? 0) + l.ticket_total
    );
  }
  let topCloserId: string | null = null;
  let topCash = 0;
  for (const [id, cash] of cashByCloser) {
    if (cash > topCash) {
      topCash = cash;
      topCloserId = id;
    }
  }
  const isTopCash = topCloserId === closerId && topCash > 0;

  // ---- Racha 7+ ----
  const streaks = getCloserStreaks(leads);
  const myStreak = streaks.get(closerId)?.currentStreak ?? 0;
  const hasLongStreak = myStreak >= 7;

  // ---- Ticket mas alto ----
  const myCerrados = cerradosFiscal.filter((l) => l.closer_id === closerId);
  const myMaxTicket = myCerrados.reduce(
    (max, l) => Math.max(max, l.ticket_total),
    0
  );
  const globalMaxTicket = cerradosFiscal.reduce(
    (max, l) => Math.max(max, l.ticket_total),
    0
  );
  const hasHighestTicket = myMaxTicket > 0 && myMaxTicket === globalMaxTicket;

  // ---- Cierre mismo dia ----
  // es_cierre_mismo_dia is a generated column, but we also check manually
  const hasSameDayClose = myCerrados.some((l) => {
    if (!l.fecha_llamada) return false;
    const llamadaDate = l.fecha_llamada.split("T")[0];
    // Check if fecha_agendado matches (same day agenda → close)
    if (l.fecha_agendado) {
      const agendaDate = l.fecha_agendado.split("T")[0];
      return llamadaDate === agendaDate;
    }
    return false;
  });

  // ---- Primera venta del mes ----
  const firstCerrado = [...cerradosFiscal].sort((a, b) =>
    (a.fecha_llamada ?? "").localeCompare(b.fecha_llamada ?? "")
  )[0];
  const isFirstSale =
    firstCerrado?.closer_id === closerId && cerradosFiscal.length > 0;

  return [
    {
      id: "top-cash",
      label: "Closer del mes",
      icon: "🎯",
      earned: isTopCash,
    },
    {
      id: "streak-7",
      label: "Racha 7+ dias",
      icon: "🔥",
      earned: hasLongStreak,
    },
    {
      id: "highest-ticket",
      label: "Ticket mas alto",
      icon: "💎",
      earned: hasHighestTicket,
    },
    {
      id: "same-day",
      label: "Cierre mismo dia",
      icon: "⚡",
      earned: hasSameDayClose,
    },
    {
      id: "first-sale",
      label: "1ra venta del mes",
      icon: "🚀",
      earned: isFirstSale,
    },
  ];
}

// ========================================
// RANKINGS
// ========================================

/**
 * Build leaderboard rankings for all closers in a fiscal month.
 * Sorted by cash collected (cerradas * ticket_total).
 */
export function getCloserRankings(
  leads: Lead[],
  fiscalDate?: Date
): CloserRanking[] {
  const refDate = fiscalDate ?? new Date();
  const start = getFiscalStart(refDate);
  const end = getFiscalEnd(refDate);

  const fiscalLeads = leads.filter((l) => {
    if (!l.fecha_llamada) return false;
    const d = new Date(l.fecha_llamada);
    return d >= start && d <= end;
  });

  const cerrados = fiscalLeads.filter((l) => l.estado === "cerrado");

  // Aggregate by closer
  const closerMap = new Map<
    string,
    { nombre: string; cash: number; cerradas: number }
  >();

  for (const l of cerrados) {
    if (!l.closer_id) continue;
    const existing = closerMap.get(l.closer_id) ?? {
      nombre: l.closer?.nombre ?? l.closer_id,
      cash: 0,
      cerradas: 0,
    };
    existing.cash += l.ticket_total;
    existing.cerradas += 1;
    closerMap.set(l.closer_id, existing);
  }

  const streaks = getCloserStreaks(leads);

  const sorted = Array.from(closerMap.entries())
    .sort(([, a], [, b]) => b.cash - a.cash)
    .map(([closerId, data], index) => {
      const badges = getCloserBadges(leads, closerId, refDate);
      const streak = streaks.get(closerId)?.currentStreak ?? 0;

      return {
        closerId,
        nombre: data.nombre,
        position: index + 1,
        cash: data.cash,
        cerradas: data.cerradas,
        streak,
        badges,
      };
    });

  return sorted;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /c/Users/matyc/projects/lauti-crm
npx tsc --noEmit lib/gamification.ts
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add lib/gamification.ts
git commit -m "feat: gamification engine — streaks, badges, rankings for closers"
```

---

### Task 7: Leaderboard page

**Files:**
- Create: `app/(dashboard)/leaderboard/page.tsx`, `app/(dashboard)/leaderboard/LeaderboardClient.tsx`

- [ ] **Step 1: Create server page**

Create `app/(dashboard)/leaderboard/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase-server";
import LeaderboardClient from "./LeaderboardClient";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Visible to all roles — no admin check

  const supabase = createServerClient();

  const { data } = await supabase
    .from("leads")
    .select("*, closer:team_members!closer_id(*)")
    .not("closer_id", "is", null);

  return (
    <LeaderboardClient
      leads={(data as Lead[]) ?? []}
      currentMemberId={session.team_member_id}
    />
  );
}
```

- [ ] **Step 2: Create LeaderboardClient.tsx**

Create `app/(dashboard)/leaderboard/LeaderboardClient.tsx`:

```typescript
"use client";

import { useState, useMemo } from "react";
import MonthSelector77 from "@/app/components/MonthSelector77";
import { formatUSD } from "@/lib/format";
import { getFiscalStart } from "@/lib/date-utils";
import { getCloserRankings } from "@/lib/gamification";
import type { Lead } from "@/lib/types";
import type { CloserRanking } from "@/lib/gamification";

interface Props {
  leads: Lead[];
  currentMemberId: string;
}

export default function LeaderboardClient({ leads, currentMemberId }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(
    getFiscalStart().toISOString().split("T")[0]
  );

  const rankings: CloserRanking[] = useMemo(() => {
    const d = new Date(selectedMonth);
    return getCloserRankings(leads, d);
  }, [leads, selectedMonth]);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            Ranking de closers por cash collected
          </p>
        </div>
        <MonthSelector77 value={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {/* Podium — Top 3 */}
      {rankings.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {/* 2nd place */}
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 text-center mt-8">
            <span className="text-4xl block mb-2">🥈</span>
            <p className="text-lg font-bold text-white">
              {rankings[1].nombre}
            </p>
            <p className="text-[var(--green)] font-bold text-xl mt-1">
              {formatUSD(rankings[1].cash)}
            </p>
            <p className="text-[var(--muted)] text-sm mt-1">
              {rankings[1].cerradas} cierres
            </p>
          </div>

          {/* 1st place */}
          <div className="bg-[var(--card-bg)] border-2 border-[var(--yellow)] rounded-xl p-6 text-center">
            <span className="text-5xl block mb-2">🥇</span>
            <p className="text-xl font-bold text-white">
              {rankings[0].nombre}
            </p>
            <p className="text-[var(--green)] font-bold text-2xl mt-1">
              {formatUSD(rankings[0].cash)}
            </p>
            <p className="text-[var(--muted)] text-sm mt-1">
              {rankings[0].cerradas} cierres
            </p>
            {rankings[0].streak >= 3 && (
              <p className="text-sm mt-2">
                🔥 Racha de {rankings[0].streak} dias
              </p>
            )}
          </div>

          {/* 3rd place */}
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 text-center mt-8">
            <span className="text-4xl block mb-2">🥉</span>
            <p className="text-lg font-bold text-white">
              {rankings[2].nombre}
            </p>
            <p className="text-[var(--green)] font-bold text-xl mt-1">
              {formatUSD(rankings[2].cash)}
            </p>
            <p className="text-[var(--muted)] text-sm mt-1">
              {rankings[2].cerradas} cierres
            </p>
          </div>
        </div>
      )}

      {/* Full Ranking Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Ranking Completo
        </h2>
        {rankings.length === 0 ? (
          <p className="text-[var(--muted)] text-sm py-4 text-center">
            Sin datos para este periodo
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--muted)] text-xs uppercase">
                  <th className="text-left py-2 px-3">#</th>
                  <th className="text-left py-2 px-3">Closer</th>
                  <th className="text-right py-2 px-3">Cash Collected</th>
                  <th className="text-right py-2 px-3">Cierres</th>
                  <th className="text-right py-2 px-3">Streak</th>
                  <th className="text-left py-2 px-3">Badges</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r) => {
                  const isMe = r.closerId === currentMemberId;
                  const earnedBadges = r.badges.filter((b) => b.earned);

                  return (
                    <tr
                      key={r.closerId}
                      className={`border-t border-[var(--card-border)] ${
                        isMe ? "bg-[var(--purple)]/10" : ""
                      }`}
                    >
                      <td className="py-3 px-3">
                        <span className="text-lg">
                          {r.position <= 3
                            ? medals[r.position - 1]
                            : r.position}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-white font-medium">
                          {r.streak >= 3 ? "🔥 " : ""}
                          {r.nombre}
                          {isMe ? (
                            <span className="text-[var(--purple-light)] text-xs ml-1">
                              (vos)
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[var(--green)]">
                        {formatUSD(r.cash)}
                      </td>
                      <td className="py-3 px-3 text-right text-white">
                        {r.cerradas}
                      </td>
                      <td className="py-3 px-3 text-right text-white">
                        {r.streak > 0 ? (
                          <span>
                            {r.streak} dia{r.streak > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {earnedBadges.map((b) => (
                            <span
                              key={b.id}
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--purple)]/15 text-[var(--purple-light)]"
                              title={b.label}
                            >
                              {b.icon} {b.label}
                            </span>
                          ))}
                          {earnedBadges.length === 0 && (
                            <span className="text-[var(--muted)] text-xs">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
cd /c/Users/matyc/projects/lauti-crm
npm run build
```

Expected: Full build succeeds with all Phase 5 components.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/(dashboard)/leaderboard/
git commit -m "feat: leaderboard page — podium, ranking table, badges, streaks, medals"
```
