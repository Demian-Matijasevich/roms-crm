# ROMS CRM v3.0 — Core Features Plan (Sub-plan B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core v3 features: gamified Home, Pipeline with follow-ups, Financial Calendar, Closers analytics, and gamified Leaderboard.

**Architecture:** Each feature is a new page route under `(dashboard)/`. Server components fetch data, client components render interactive UI. Shared calculation functions live in `lib/data.ts`. New pages added to Sidebar navigation.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Recharts, Google Sheets API

**Parallelization:** Tasks 1-3 (Home) are sequential. Tasks 4-5 (Pipeline) are sequential. Tasks 6-7 (Calendar+Finanzas), Task 8 (Closers), Task 9 (Leaderboard) can all run in parallel after Home is done.

---

## Phase 1: Home Gamificado (Tasks 1-3)

### Task 1: Gamification data functions + streak calculation

**Files:**
- Create: `webapp/lib/gamification.ts`
- Modify: `webapp/lib/data.ts`

- [ ] **Step 1: Create gamification.ts**

Create `webapp/lib/gamification.ts`:

```typescript
// webapp/lib/gamification.ts
import { Llamada, CloserStats, Seguimiento } from "./types";
import { isCerrado, getCloserStats, filterByMonth, getCurrentMonth } from "./data";

export interface CloserStreak {
  nombre: string;
  currentStreak: number; // consecutive days with at least one close
  longestStreak: number;
}

export interface CloserRanking {
  nombre: string;
  position: number;
  cashMes: number;
  comision: number;
  streak: number;
}

export interface TodayAgenda {
  type: "call" | "seguimiento" | "cuota";
  lead: Llamada;
  hora?: string;
  diasSinContacto?: number;
  ultimaNota?: string;
  montoCuota?: number;
}

export interface Badge {
  id: string;
  label: string;
  icon: string;
  earned: boolean;
}

export function getCloserStreaks(llamadas: Llamada[]): Map<string, CloserStreak> {
  const streaks = new Map<string, CloserStreak>();
  const closerDates = new Map<string, Set<string>>();

  // Collect all dates each closer closed a deal
  for (const l of llamadas) {
    if (!isCerrado(l) || !l.closer) continue;
    const date = l.fechaLlamada || l.fechaAgenda;
    if (!date) continue;
    if (!closerDates.has(l.closer)) closerDates.set(l.closer, new Set());
    closerDates.get(l.closer)!.add(date);
  }

  // Calculate current streak (consecutive days ending today or yesterday)
  const today = new Date();
  for (const [closer, dates] of closerDates) {
    const sorted = Array.from(dates).sort().reverse();
    let streak = 0;
    let checkDate = new Date(today);

    // Allow yesterday as start (in case they haven't closed today yet)
    const todayStr = today.toISOString().split("T")[0];
    const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().split("T")[0];

    if (!dates.has(todayStr) && !dates.has(yesterdayStr)) {
      streaks.set(closer, { nombre: closer, currentStreak: 0, longestStreak: 0 });
      continue;
    }

    // Start from today or yesterday
    if (dates.has(todayStr)) {
      checkDate = new Date(today);
    } else {
      checkDate = new Date(today.getTime() - 86400000);
    }

    while (dates.has(checkDate.toISOString().split("T")[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    streaks.set(closer, { nombre: closer, currentStreak: streak, longestStreak: streak });
  }

  return streaks;
}

export function getCloserRankings(llamadas: Llamada[], mes?: string): CloserRanking[] {
  const m = mes || getCurrentMonth();
  const stats = getCloserStats(llamadas, m);
  const streaks = getCloserStreaks(llamadas);

  return stats
    .filter(s => s.nombre !== "Sin asignar")
    .map((s, i) => ({
      nombre: s.nombre,
      position: i + 1,
      cashMes: s.cashCollected,
      comision: s.comision,
      streak: streaks.get(s.nombre)?.currentStreak || 0,
    }));
}

export function getTodayAgenda(llamadas: Llamada[], seguimientos: Seguimiento[], closer: string): TodayAgenda[] {
  const today = new Date().toISOString().split("T")[0];
  const agenda: TodayAgenda[] = [];

  // Calls scheduled for today
  for (const l of llamadas) {
    if (l.closer !== closer) continue;
    if ((l.fechaAgenda === today || l.fechaLlamada === today) && !isCerrado(l) && !l.estado.includes("Cancelada")) {
      agenda.push({ type: "call", lead: l, hora: l.fechaLlamada || l.fechaAgenda });
    }
  }

  // Active follow-ups (leads in seguimiento state for this closer)
  const seguimientoLeads = llamadas.filter(l =>
    l.closer === closer &&
    (l.estado.includes("Seguimiento") || l.estado.includes("Re-programada")) &&
    !isCerrado(l)
  );

  for (const l of seguimientoLeads) {
    // Find latest seguimiento entry for this lead
    const leadSeguimientos = seguimientos
      .filter(s => s.leadRowIndex === l.rowIndex)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));

    const latest = leadSeguimientos[0];
    const lastDate = latest?.fecha || l.fechaLlamada || l.fechaAgenda;
    const daysSince = lastDate
      ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000)
      : 999;

    agenda.push({
      type: "seguimiento",
      lead: l,
      diasSinContacto: daysSince,
      ultimaNota: latest?.nota || l.contextoCloser,
    });
  }

  // Sort: calls first (by time), then seguimientos (by days since contact desc)
  agenda.sort((a, b) => {
    if (a.type !== b.type) return a.type === "call" ? -1 : 1;
    if (a.type === "call") return (a.hora || "").localeCompare(b.hora || "");
    return (b.diasSinContacto || 0) - (a.diasSinContacto || 0);
  });

  return agenda;
}

export function getCloserBadges(llamadas: Llamada[], closerName: string, mes?: string): Badge[] {
  const m = mes || getCurrentMonth();
  const monthLlamadas = filterByMonth(llamadas, m);
  const stats = getCloserStats(llamadas, m);
  const streaks = getCloserStreaks(llamadas);
  const closerStats = stats.find(s => s.nombre === closerName);
  const streak = streaks.get(closerName)?.currentStreak || 0;

  // #1 in cash this month
  const isTopCash = stats[0]?.nombre === closerName;

  // Has 7+ day streak
  const hasLongStreak = streak >= 7;

  // Highest ticket this month
  const closerMaxTicket = monthLlamadas
    .filter(l => l.closer === closerName && isCerrado(l))
    .reduce((max, l) => Math.max(max, l.cashDia1), 0);
  const globalMaxTicket = monthLlamadas
    .filter(l => isCerrado(l))
    .reduce((max, l) => Math.max(max, l.cashDia1), 0);
  const hasHighestTicket = closerMaxTicket > 0 && closerMaxTicket === globalMaxTicket;

  // Same-day close (closed on same day as agenda)
  const hasSameDayClose = monthLlamadas.some(l =>
    l.closer === closerName && isCerrado(l) && l.fechaLlamada === l.fechaAgenda && l.fechaLlamada
  );

  // First sale of the month
  const monthClosed = monthLlamadas
    .filter(l => isCerrado(l))
    .sort((a, b) => (a.fechaLlamada || a.fechaAgenda).localeCompare(b.fechaLlamada || b.fechaAgenda));
  const isFirstSale = monthClosed[0]?.closer === closerName;

  return [
    { id: "top-cash", label: "Closer del mes", icon: "🎯", earned: isTopCash },
    { id: "streak-7", label: "Racha 7+ días", icon: "🔥", earned: hasLongStreak },
    { id: "highest-ticket", label: "Ticket más alto", icon: "💎", earned: hasHighestTicket },
    { id: "same-day", label: "Cierre mismo día", icon: "⚡", earned: hasSameDayClose },
    { id: "first-sale", label: "1ra venta del mes", icon: "🚀", earned: isFirstSale },
  ];
}
```

- [ ] **Step 2: Build and verify**

```bash
cd webapp && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add webapp/lib/gamification.ts
git commit -m "feat: gamification engine - streaks, rankings, agenda, badges"
```

---

### Task 2: Home page — Closer view (gamified)

**Files:**
- Modify: `webapp/app/(dashboard)/page.tsx` (server component — add seguimientos fetch)
- Rewrite: `webapp/app/(dashboard)/DashboardClient.tsx` → split into `HomeClient.tsx`
- Create: `webapp/app/(dashboard)/HomeClient.tsx`

The current DashboardClient.tsx is 483 lines. We're going to create a NEW HomeClient.tsx with the gamified design, and update the server page.tsx to pass seguimientos data.

- [ ] **Step 1: Update page.tsx to fetch seguimientos**

Modify `webapp/app/(dashboard)/page.tsx` to also fetch seguimientos:

```typescript
import { redirect } from "next/navigation";
import { fetchLlamadas, fetchGastos, fetchSeguimientos } from "@/lib/sheets";
import { getSession } from "@/lib/auth";
import { getMonthlyData } from "@/lib/data";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await getSession();
  if (!session) redirect("/login");
  const isAdmin = session.roles.includes("admin");
  const [allLlamadas, gastos, seguimientos] = await Promise.all([
    fetchLlamadas(), fetchGastos(), fetchSeguimientos()
  ]);
  const llamadas = isAdmin ? allLlamadas : allLlamadas.filter(
    (l) => l.closer === session.nombre || l.setter === session.nombre
  );
  const monthly = getMonthlyData(allLlamadas, gastos);

  return <HomeClient
    llamadas={llamadas}
    allLlamadas={allLlamadas}
    gastos={gastos}
    seguimientos={seguimientos}
    monthly={monthly}
    session={session}
    isAdmin={isAdmin}
  />;
}
```

- [ ] **Step 2: Create HomeClient.tsx**

Create `webapp/app/(dashboard)/HomeClient.tsx` — this is the new gamified Home. It replaces DashboardClient.tsx as the main dashboard.

The component should have these sections:

**For closers:**
1. **Top bar:** Streak (🔥 X días), Ranking position (#N de 4), Comisión acumulada
2. **Today section:** Date, badges (X calls, X seguimientos), list of today's tasks
3. **KPI row:** Cash mes, Llamadas, Cierre %, Ticket promedio — each with trend vs previous month

**For admins:**
Same as closer but with global data + extra sections:
4. **Cuotas a cobrar hoy**
5. **Alumnos por vencer**

Keep the existing DashboardClient.tsx as a backup (rename to DashboardClient.old.tsx or just leave it — the import in page.tsx will point to HomeClient).

The HomeClient should import and use functions from `lib/gamification.ts`:
- `getCloserRankings()` for position
- `getCloserStreaks()` for streak
- `getTodayAgenda()` for the agenda list
- `getCloserBadges()` for earned badges
- `calculateLeadScore()` from data.ts for lead scores in the agenda

This is a large component. Target ~300 lines. Use existing components (KPICard, MonthSelector, StatusBadge) where possible.

- [ ] **Step 3: Build and verify**

```bash
cd webapp && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add webapp/app/"(dashboard)"/page.tsx webapp/app/"(dashboard)"/HomeClient.tsx
git commit -m "feat: gamified Home page with streak, ranking, agenda, KPIs"
```

---

### Task 3: Sale banner notification

**Files:**
- Create: `webapp/app/components/SaleBanner.tsx`
- Create: `webapp/app/api/recent-sales/route.ts`
- Modify: `webapp/app/layout.tsx` (add SaleBanner)

- [ ] **Step 1: Create recent-sales API**

Create `webapp/app/api/recent-sales/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { fetchLlamadas } from "@/lib/sheets";
import { isCerrado } from "@/lib/data";

export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;

  const llamadas = await fetchLlamadas();
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  // Find sales from today that might be recent
  const today = new Date().toISOString().split("T")[0];
  const todaySales = llamadas
    .filter(l => isCerrado(l) && (l.fechaLlamada === today || l.fechaAgenda === today))
    .map(l => ({
      closer: l.closer,
      cash: l.cashDia1,
      programa: l.programa,
      nombre: l.nombre,
    }));

  // Return latest sale (polling will compare with previous)
  const latest = todaySales[todaySales.length - 1] || null;

  return NextResponse.json({ latest });
}
```

- [ ] **Step 2: Create SaleBanner component**

Create `webapp/app/components/SaleBanner.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { formatUSD } from "@/lib/data";

interface Sale {
  closer: string;
  cash: number;
  programa: string;
  nombre: string;
}

export default function SaleBanner() {
  const [sale, setSale] = useState<Sale | null>(null);
  const [visible, setVisible] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>("");

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/recent-sales");
        if (!res.ok) return;
        const data = await res.json();
        if (data.latest) {
          const key = `${data.latest.closer}-${data.latest.cash}-${data.latest.nombre}`;
          if (key !== lastSeen) {
            setSale(data.latest);
            setLastSeen(key);
            setVisible(true);
            setTimeout(() => setVisible(false), 5000);
          }
        }
      } catch {}
    };

    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [lastSeen]);

  if (!visible || !sale) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
      <div className="bg-green/10 border border-green/30 backdrop-blur-sm rounded-xl px-6 py-3 flex items-center gap-3 shadow-lg">
        <span className="text-lg">🚀</span>
        <span className="text-sm text-green font-medium">
          {sale.closer} cerró {formatUSD(sale.cash)} en {sale.programa}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add SaleBanner to layout**

In `webapp/app/layout.tsx`, import and add `<SaleBanner />` inside the `{session ? (...)` block, after `<PWARegister />`:

```typescript
import SaleBanner from "./components/SaleBanner";

// Inside the session block:
<SaleBanner />
```

- [ ] **Step 4: Add fade-in animation to globals.css**

Add to `webapp/app/globals.css`:

```css
@keyframes fade-in {
  from { opacity: 0; transform: translate(-50%, -20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
.animate-fade-in { animation: fade-in 0.3s ease-out; }
```

- [ ] **Step 5: Build and verify**

- [ ] **Step 6: Commit**

---

## Phase 2: Pipeline + Seguimientos (Tasks 4-5)

### Task 4: Pipeline page with kanban view

**Files:**
- Create: `webapp/app/(dashboard)/pipeline/page.tsx`
- Create: `webapp/app/(dashboard)/pipeline/PipelineClient.tsx`
- Modify: `webapp/app/components/Sidebar.tsx` (add Pipeline nav item)

The pipeline page shows leads organized in 4 kanban columns: Pendiente, Seguimiento, Cerrado, Perdido. Each card is clickable to show detail + timeline.

Server component fetches llamadas + seguimientos. Client component renders the kanban with filtering (closer sees own, admin sees all with filter dropdown).

### Task 5: Lead detail panel with follow-up timeline

**Files:**
- Create: `webapp/app/(dashboard)/pipeline/LeadDetailPanel.tsx`
- Create: `webapp/app/(dashboard)/pipeline/AddSeguimientoForm.tsx`

Drawer panel that opens when clicking a lead in the pipeline. Shows full lead data, Calendly responses, and a timeline of all follow-up interactions. Has "Add note", "Re-schedule", "Discard" quick actions.

---

## Phase 3: Calendar + Finanzas (Tasks 6-7)

### Task 6: Financial calendar page

**Files:**
- Create: `webapp/app/(dashboard)/calendario/page.tsx`
- Create: `webapp/app/(dashboard)/calendario/CalendarioClient.tsx`
- Modify: `webapp/app/components/Sidebar.tsx`

Monthly calendar view. Each day shows colored badges for cash received (green), calls scheduled (purple), overdue installments (red), renewals (yellow). Click on a day opens detail.

### Task 7: Treasury view in Finanzas

**Files:**
- Modify: `webapp/app/(dashboard)/finanzas/FinanzasClient.tsx`

Add "Tesorería — Dónde está la plata" section showing cards per receptor/wallet. Data comes from the `quienRecibe` field in llamadas.

---

## Phase 4: Closers Analytics (Task 8)

### Task 8: Closers analytics page

**Files:**
- Create: `webapp/app/(dashboard)/closers/page.tsx`
- Create: `webapp/app/(dashboard)/closers/ClosersClient.tsx`
- Modify: `webapp/app/components/Sidebar.tsx`

Full analytics page: conversion funnel (horizontal bars), 5 advanced KPIs (velocity, rev/call, collection rate, pipeline, day-1 close), program distribution, weekly trend, Calendly response correlations.

---

## Phase 5: Gamified Leaderboard (Task 9)

### Task 9: Redesign leaderboard with gamification

**Files:**
- Rewrite: `webapp/app/(dashboard)/leaderboard/LeaderboardClient.tsx`

Add streaks, badges, "#1 in each metric" cards, medal system. Use gamification.ts functions.

---

## Sidebar Navigation Updates

After all tasks, the sidebar should have these sections:

**Admin:**
- PRINCIPAL: Home (📊), Pipeline (📞), Calendario (📅)
- GESTIÓN: Clientes (👥), Cuotas (💳), Finanzas (💰)
- EQUIPO: Closers (📊), Leaderboard (🏆), Objetivos (🎯)
- CONFIG: Admin (⚙️)

**Closer:**
- MI PANEL: Home (📊), Pipeline (📞)
- CARGAR: Cargar Llamada (📝), Cargar Pago (💰)
- EQUIPO: Leaderboard (🏆)

The nav updates should be done incrementally as each page is created.
