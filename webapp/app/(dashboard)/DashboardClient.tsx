"use client";
import { useMemo, useState } from "react";
import {
  getCurrentMonth,
  filterByMonth,
  getCloserStats,
  getSetterStats,
  getAlumnos,
  getCuotas,
  formatUSD,
  formatPct,
  isCerrado,
  isPresentada,
} from "@/lib/data";
import { COMMISSION_CLOSER, COMMISSION_SETTER, MONTH_LABELS } from "@/lib/constants";
import KPICard from "@/app/components/KPICard";
import { MonthlyRevenueChart } from "@/app/components/Charts";
import MonthSelector from "@/app/components/MonthSelector";
import StatusBadge from "@/app/components/StatusBadge";
import type { Llamada, Gasto, MonthlyData, AuthSession } from "@/lib/types";

const OBJETIVOS = [
  { label: "Cash Collected", meta: 50000 },
  { label: "Llamadas", meta: 80 },
  { label: "Cerradas", meta: 20 },
  { label: "Comisiones", meta: 6000 },
];

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekDays(baseDate: Date): { label: string; dateStr: string; dayName: string }[] {
  const day = baseDate.getDay();
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - ((day + 6) % 7));
  const days = [];
  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    days.push({
      label: `${dd}/${m}`,
      dateStr: `${y}-${m}-${dd}`,
      dayName: dayNames[i],
    });
  }
  return days;
}

interface Props {
  llamadas: Llamada[];
  gastos: Gasto[];
  monthly: MonthlyData[];
  session: AuthSession;
  isAdmin: boolean;
}

export default function DashboardClient({ llamadas, gastos, monthly, session, isAdmin }: Props) {
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    llamadas.forEach((l) => l.mes && !l.mes.includes("No identificada") && set.add(l.mes));
    return Array.from(set).sort((a, b) => {
      const [ya, ma] = a.split("-").map(Number);
      const [yb, mb] = b.split("-").map(Number);
      return ya !== yb ? ya - yb : ma - mb;
    });
  }, [llamadas]);

  const current = getCurrentMonth();
  const [mes, setMes] = useState(availableMonths.includes(current) ? current : availableMonths[availableMonths.length - 1] || current);
  const [weekOffset, setWeekOffset] = useState(0);

  const today = getTodayString();
  const monthLabel = MONTH_LABELS[mes] || mes;

  // ── PREVIOUS MONTH for comparativa ──
  const prevMonth = useMemo(() => {
    const idx = availableMonths.indexOf(mes);
    return idx > 0 ? availableMonths[idx - 1] : null;
  }, [mes, availableMonths]);

  // ── MONTH DATA ──
  const monthLlamadas = useMemo(() => filterByMonth(llamadas, mes), [llamadas, mes]);
  const prevMonthLlamadas = useMemo(() => prevMonth ? filterByMonth(llamadas, prevMonth) : [], [llamadas, prevMonth]);

  const cashMes = useMemo(() => monthLlamadas.filter(isCerrado).reduce((s, l) => s + l.cashDia1, 0), [monthLlamadas]);
  const prevCashMes = useMemo(() => prevMonthLlamadas.filter(isCerrado).reduce((s, l) => s + l.cashDia1, 0), [prevMonthLlamadas]);

  const gastosMes = useMemo(() => {
    return gastos.filter((g) => {
      const parts = g.fecha?.split("-");
      if (!parts || parts.length < 2) return false;
      return `${parts[0]}-${parseInt(parts[1])}` === mes;
    }).reduce((s, g) => s + g.monto, 0);
  }, [gastos, mes]);

  const resultadoNeto = cashMes - gastosMes;

  // ── TODAY STRIP ──
  const todayClosed = llamadas.filter((l) => isCerrado(l) && (l.fechaLlamada === today || l.fechaAgenda === today));
  const ingresosHoy = todayClosed.reduce((s, l) => s + l.cashDia1, 0);
  const llamadasHoy = llamadas.filter((l) => l.fechaAgenda === today).length;

  // ── ALERTS ──
  const alumnos = useMemo(() => getAlumnos(llamadas), [llamadas]);
  const vencidos = alumnos.filter((a) => a.estado === "Vencido").length;
  const porVencer = alumnos.filter((a) => a.estado === "Por vencer").length;
  const activos = alumnos.filter((a) => a.estado === "Activo").length;

  const cuotas = useMemo(() => getCuotas(llamadas), [llamadas]);
  const cuotasVencidas = cuotas.filter((c) => c.estado === "vencida").length;
  const proxCuotas = cuotas.filter((c) => c.estado !== "pagada").slice(0, 5);

  // ── KPIs ──
  const totalMes = monthLlamadas.length;
  const presentadasMes = monthLlamadas.filter(isPresentada).length;
  const cerradasMes = monthLlamadas.filter(isCerrado).length;
  const showUpPct = totalMes > 0 ? (presentadasMes / totalMes) * 100 : 0;
  const cierrePct = presentadasMes > 0 ? (cerradasMes / presentadasMes) * 100 : 0;
  const ticketProm = cerradasMes > 0 ? cashMes / cerradasMes : 0;

  // Previous month KPIs for comparativa
  const prevTotal = prevMonthLlamadas.length;
  const prevPresentadas = prevMonthLlamadas.filter(isPresentada).length;
  const prevCerradas = prevMonthLlamadas.filter(isCerrado).length;
  const prevShowUp = prevTotal > 0 ? (prevPresentadas / prevTotal) * 100 : 0;
  const prevCierre = prevPresentadas > 0 ? (prevCerradas / prevPresentadas) * 100 : 0;

  // ── CLOSER + SETTER STATS ──
  const closerStats = useMemo(() => getCloserStats(llamadas, mes), [llamadas, mes]);
  const setterStats = useMemo(() => getSetterStats(llamadas, mes), [llamadas, mes]);
  const comisionesClosers = closerStats.reduce((s, c) => s + c.comision, 0);
  const comisionesSetter = setterStats.reduce((s, c) => s + c.comision, 0);
  const totalComisiones = comisionesClosers + comisionesSetter;

  const top3 = closerStats.slice(0, 3);

  // ── OBJETIVOS ──
  const objetivosData = [
    { label: "Cash Collected", meta: OBJETIVOS[0].meta, actual: cashMes },
    { label: "Llamadas", meta: OBJETIVOS[1].meta, actual: totalMes },
    { label: "Cerradas", meta: OBJETIVOS[2].meta, actual: cerradasMes },
    { label: "Comisiones", meta: OBJETIVOS[3].meta, actual: totalComisiones },
  ];

  // ── WEEKLY VIEW ──
  const weekBase = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);
  const weekDays = useMemo(() => getWeekDays(weekBase), [weekBase]);
  const weeklyData = useMemo(() => {
    return weekDays.map((day) => {
      const dayClosed = llamadas.filter((l) => isCerrado(l) && (l.fechaLlamada === day.dateStr || l.fechaAgenda === day.dateStr));
      const cash = dayClosed.reduce((s, l) => s + l.cashDia1, 0);
      const count = dayClosed.length;
      return { ...day, cash, count };
    });
  }, [llamadas, weekDays]);
  const weekTotal = weeklyData.reduce((s, d) => s + d.cash, 0);

  // ── COMPARATIVA HELPER ──
  function Trend({ current, previous, format = "number" }: { current: number; previous: number; format?: "number" | "pct" | "usd" }) {
    if (!prevMonth || previous === 0) return null;
    const diff = current - previous;
    const pct = ((diff / previous) * 100).toFixed(0);
    const isUp = diff >= 0;
    return (
      <span className={`text-xs font-medium ${isUp ? "text-green" : "text-red"}`}>
        {isUp ? "▲" : "▼"} {Math.abs(Number(pct))}%
      </span>
    );
  }

  return (
    <div>
      {/* ── HEADER ── */}
      <div className="mb-6 lg:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold">Dashboard</h2>
          <p className="text-muted text-sm mt-1">
            {isAdmin ? "Vista Admin" : `Vista de ${session.nombre}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MonthSelector value={mes} onChange={setMes} availableMonths={availableMonths} />
          <div className="text-right text-xs text-muted hidden sm:block">
            <p>{new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
        </div>
      </div>

      {/* ── TODAY STRIP ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Ingreso Hoy</p>
          <p className="text-2xl font-bold text-green">{formatUSD(ingresosHoy)}</p>
          <p className="text-xs text-muted mt-1">{todayClosed.length} venta{todayClosed.length !== 1 ? "s" : ""}</p>
        </div>
        <KPICard title="Llamadas Hoy" value={String(llamadasHoy)} subtitle="agendadas para hoy" />
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Cash Collected Mes</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-purple-light">{formatUSD(cashMes)}</p>
            <Trend current={cashMes} previous={prevCashMes} format="usd" />
          </div>
          <p className="text-xs text-muted mt-1">{monthLabel}</p>
        </div>
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Resultado Neto</p>
          <p className={`text-2xl font-bold ${resultadoNeto >= 0 ? "text-green" : "text-red"}`}>
            {formatUSD(resultadoNeto)}
          </p>
          <p className="text-xs text-muted mt-1">gastos: {formatUSD(gastosMes)}</p>
        </div>
      </div>

      {/* ── ALERT ROW ── */}
      <div className="flex flex-wrap gap-3 mb-8">
        {cuotasVencidas > 0 && (
          <div className="flex items-center gap-2 bg-red/10 border border-red/30 rounded-lg px-4 py-2">
            <span className="text-red font-semibold text-sm">{cuotasVencidas}</span>
            <span className="text-red text-sm">cuota{cuotasVencidas !== 1 ? "s" : ""} vencida{cuotasVencidas !== 1 ? "s" : ""}</span>
          </div>
        )}
        {vencidos > 0 && (
          <div className="flex items-center gap-2 bg-red/10 border border-red/30 rounded-lg px-4 py-2">
            <span className="text-red font-semibold text-sm">{vencidos}</span>
            <span className="text-red text-sm">alumno{vencidos !== 1 ? "s" : ""} vencido{vencidos !== 1 ? "s" : ""}</span>
          </div>
        )}
        {porVencer > 0 && (
          <div className="flex items-center gap-2 bg-yellow/10 border border-yellow/30 rounded-lg px-4 py-2">
            <span className="text-yellow font-semibold text-sm">{porVencer}</span>
            <span className="text-yellow text-sm">próximo{porVencer !== 1 ? "s" : ""} a vencer</span>
          </div>
        )}
        <div className="flex items-center gap-2 bg-green/10 border border-green/30 rounded-lg px-4 py-2">
          <span className="text-green font-semibold text-sm">{activos}</span>
          <span className="text-green text-sm">alumno{activos !== 1 ? "s" : ""} activo{activos !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* ── 5 KPI CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Llamadas del Mes</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold">{totalMes}</p>
            <Trend current={totalMes} previous={prevTotal} />
          </div>
        </div>
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Presentadas</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-purple-light">{presentadasMes}</p>
            <Trend current={showUpPct} previous={prevShowUp} format="pct" />
          </div>
          <p className="text-xs text-muted mt-1">{showUpPct.toFixed(1)}% show up</p>
        </div>
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Cerradas</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-green">{cerradasMes}</p>
            <Trend current={cierrePct} previous={prevCierre} format="pct" />
          </div>
          <p className="text-xs text-muted mt-1">{cierrePct.toFixed(1)}% cierre</p>
        </div>
        <KPICard title="Ticket Promedio" value={formatUSD(ticketProm)} color="purple" />
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Comisiones del Mes</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-yellow">{formatUSD(totalComisiones)}</p>
          </div>
          <p className="text-xs text-muted mt-1">closers {formatUSD(comisionesClosers)} · setters {formatUSD(comisionesSetter)}</p>
        </div>
      </div>

      {/* ── COMISIONES POR EMPLEADO ── */}
      {isAdmin && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-muted mb-4">Comisiones por Empleado — {monthLabel}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {closerStats.map((c) => (
              <div key={c.nombre} className="bg-card-bg border border-card-border rounded-xl p-4 text-center">
                <p className="text-xs text-muted mb-1">{c.nombre}</p>
                <p className="text-lg font-bold text-green">{formatUSD(c.comision)}</p>
                <p className="text-[10px] text-muted mt-1">closer · {c.cerradas} ventas</p>
              </div>
            ))}
            {setterStats.map((s) => (
              <div key={s.nombre} className="bg-card-bg border border-card-border rounded-xl p-4 text-center">
                <p className="text-xs text-muted mb-1">{s.nombre}</p>
                <p className="text-lg font-bold text-yellow">{formatUSD(s.comision)}</p>
                <p className="text-[10px] text-muted mt-1">setter · {s.agendas} agendas</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── WEEKLY CASH VIEW ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h3 className="text-sm font-medium text-muted whitespace-nowrap">Cash Diario</h3>
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={() => setWeekOffset(weekOffset - 1)}
              className="text-muted hover:text-foreground text-xs sm:text-sm px-1.5 sm:px-2 py-1 rounded border border-card-border hover:border-purple/50 transition-colors">
              ←
            </button>
            <button onClick={() => setWeekOffset(0)}
              className="text-xs text-muted hover:text-purple transition-colors px-2 py-1">
              Hoy
            </button>
            <button onClick={() => setWeekOffset(weekOffset + 1)}
              className="text-muted hover:text-foreground text-xs sm:text-sm px-1.5 sm:px-2 py-1 rounded border border-card-border hover:border-purple/50 transition-colors">
              →
            </button>
          </div>
        </div>
        <div className="flex lg:grid lg:grid-cols-7 gap-2 overflow-x-auto pb-2 snap-x snap-mandatory">
          {weeklyData.map((day) => {
            const isToday = day.dateStr === today;
            return (
              <div key={day.dateStr}
                className={`bg-card-bg border rounded-xl p-4 text-center transition-colors min-w-[5.5rem] snap-start ${
                  isToday ? "border-purple/50 bg-purple/5" : "border-card-border"
                }`}>
                <p className="text-[10px] text-muted uppercase">{day.dayName}</p>
                <p className="text-xs text-muted mb-2">{day.label}</p>
                <p className={`text-lg font-bold ${day.cash > 0 ? "text-green" : "text-muted/40"}`}>
                  {day.cash > 0 ? formatUSD(day.cash) : "$0"}
                </p>
                {day.count > 0 && (
                  <p className="text-[10px] text-muted mt-1">{day.count} venta{day.count !== 1 ? "s" : ""}</p>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-right">
          <span className="text-xs text-muted">Total semana: </span>
          <span className="text-sm font-bold text-green">{formatUSD(weekTotal)}</span>
        </div>
      </div>

      {/* ── FUENTE / MEDIO ANALYTICS ── */}
      {isAdmin && (() => {
        const fuenteMap = new Map<string, { leads: number; presentadas: number; cerradas: number; cash: number }>();
        for (const l of monthLlamadas) {
          const f = l.fuente || "Sin fuente";
          if (!fuenteMap.has(f)) fuenteMap.set(f, { leads: 0, presentadas: 0, cerradas: 0, cash: 0 });
          const s = fuenteMap.get(f)!;
          s.leads++;
          if (isPresentada(l)) s.presentadas++;
          if (isCerrado(l)) { s.cerradas++; s.cash += l.cashDia1; }
        }
        const fuenteData = Array.from(fuenteMap.entries())
          .map(([fuente, d]) => ({ fuente, ...d, roi: d.leads > 0 ? (d.cerradas / d.leads) * 100 : 0 }))
          .sort((a, b) => b.cash - a.cash);

        return fuenteData.length > 0 ? (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-muted mb-4">Analytics por Fuente — {monthLabel}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {fuenteData.map((f) => (
                <div key={f.fuente} className="bg-card-bg border border-card-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">{f.fuente}</p>
                    <span className={`text-xs font-bold ${f.roi >= 20 ? "text-green" : f.roi >= 10 ? "text-yellow" : "text-red"}`}>
                      {f.roi.toFixed(0)}% conv.
                    </span>
                  </div>
                  <p className="text-lg font-bold text-green mb-2">{formatUSD(f.cash)}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <p className="text-muted">Leads</p>
                      <p className="font-medium">{f.leads}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted">Presentadas</p>
                      <p className="font-medium">{f.presentadas}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted">Cerradas</p>
                      <p className="font-medium text-green">{f.cerradas}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* ── 2x2 GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <MonthlyRevenueChart data={monthly} />

        {/* Leaderboard mini */}
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-muted mb-4">Leaderboard Closers — {monthLabel}</h3>
          {top3.length === 0 ? (
            <p className="text-muted text-sm">Sin datos este mes.</p>
          ) : (
            <div className="space-y-3">
              {top3.map((c, i) => (
                <div key={c.nombre} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                    <div>
                      <p className="font-medium text-sm">{c.nombre}</p>
                      <p className="text-xs text-muted">{c.cerradas} cerrada{c.cerradas !== 1 ? "s" : ""} · {formatPct(c.cierrePresentadas)} cierre</p>
                    </div>
                  </div>
                  <p className="font-bold text-green text-sm">{formatUSD(c.cashCollected)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Objetivos */}
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-muted mb-4">Objetivos del Mes</h3>
          <div className="space-y-4">
            {objetivosData.map((obj) => {
              const pct = Math.min((obj.actual / obj.meta) * 100, 100);
              const color = pct >= 80 ? "bg-green" : pct >= 50 ? "bg-yellow" : "bg-red";
              const isUSD = obj.label.includes("Cash") || obj.label.includes("Comisiones");
              return (
                <div key={obj.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted">{obj.label}</span>
                    <span className="text-foreground">
                      {isUSD ? formatUSD(obj.actual) : obj.actual} / {isUSD ? formatUSD(obj.meta) : obj.meta}
                    </span>
                  </div>
                  <div className="h-2 bg-card-border rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Próximas cuotas */}
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-muted mb-4">Próximas Cuotas</h3>
          {proxCuotas.length === 0 ? (
            <p className="text-muted text-sm">No hay cuotas pendientes.</p>
          ) : (
            <div className="space-y-2">
              {proxCuotas.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-card-border/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.alumno}</p>
                    <p className="text-xs text-muted">Cuota {c.cuotaNum} · {c.fechaVencimiento}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className="text-sm font-medium">{formatUSD(c.monto)}</span>
                    <StatusBadge status={c.estado} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

