"use client";
import { useMemo, useState } from "react";
import type { Llamada, Gasto, MonthlyData, AuthSession, Seguimiento } from "@/lib/types";
import { getCurrentMonth, filterByMonth, isCerrado, isPresentada, getCloserStats, getAlumnos, getCuotas, formatUSD, formatPct } from "@/lib/data";
import { calculateLeadScore } from "@/lib/data";
import { getCloserRankings, getTodayAgenda, getCloserStreaks, getCloserBadges } from "@/lib/gamification";
import { MONTH_LABELS, COMMISSION_CLOSER, COMMISSION_SETTER } from "@/lib/constants";
import MonthSelector from "@/app/components/MonthSelector";
import { getSetterStats } from "@/lib/data";

interface Props {
  llamadas: Llamada[];
  allLlamadas: Llamada[];
  gastos: Gasto[];
  seguimientos: Seguimiento[];
  monthly: MonthlyData[];
  session: AuthSession;
  isAdmin: boolean;
}

export default function HomeClient({ llamadas, allLlamadas, gastos, seguimientos, monthly, session, isAdmin }: Props) {
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
  const monthLabel = MONTH_LABELS[mes] || mes;

  // Gamification data
  const rankings = useMemo(() => getCloserRankings(allLlamadas, mes), [allLlamadas, mes]);
  const myRanking = rankings.find(r => r.nombre === session.nombre);
  const streaks = useMemo(() => getCloserStreaks(allLlamadas), [allLlamadas]);
  const myStreak = streaks.get(session.nombre)?.currentStreak || 0;
  const badges = useMemo(() => getCloserBadges(allLlamadas, session.nombre, mes), [allLlamadas, session.nombre, mes]);
  const agenda = useMemo(() => getTodayAgenda(llamadas, seguimientos, session.nombre), [llamadas, seguimientos, session.nombre]);

  // KPIs
  const monthLlamadas = useMemo(() => filterByMonth(llamadas, mes), [llamadas, mes]);
  const prevMonth = useMemo(() => {
    const idx = availableMonths.indexOf(mes);
    return idx > 0 ? availableMonths[idx - 1] : null;
  }, [mes, availableMonths]);
  const prevMonthLlamadas = useMemo(() => prevMonth ? filterByMonth(llamadas, prevMonth) : [], [llamadas, prevMonth]);

  const cashMes = monthLlamadas.filter(isCerrado).reduce((s, l) => s + l.cashDia1, 0);
  const prevCash = prevMonthLlamadas.filter(isCerrado).reduce((s, l) => s + l.cashDia1, 0);
  const totalMes = monthLlamadas.length;
  const prevTotal = prevMonthLlamadas.length;
  const cerradasMes = monthLlamadas.filter(isCerrado).length;
  const prevCerradas = prevMonthLlamadas.filter(isCerrado).length;
  const presentadasMes = monthLlamadas.filter(isPresentada).length;
  const prevPresentadas = prevMonthLlamadas.filter(isPresentada).length;
  const cierrePct = presentadasMes > 0 ? (cerradasMes / presentadasMes) * 100 : 0;
  const prevCierre = prevPresentadas > 0 ? (prevCerradas / prevPresentadas) * 100 : 0;
  const ticketProm = cerradasMes > 0 ? cashMes / cerradasMes : 0;

  // ── EXTENDED METRICS ──
  const closerStats = useMemo(() => getCloserStats(isAdmin ? allLlamadas : llamadas, mes), [isAdmin, allLlamadas, llamadas, mes]);
  const setterStats = useMemo(() => getSetterStats(isAdmin ? allLlamadas : llamadas, mes), [isAdmin, allLlamadas, llamadas, mes]);

  // Facturación (ticket total de ventas cerradas)
  const facturacionMes = monthLlamadas.filter(isCerrado).reduce((s, l) => s + (l.ticketTotal || l.cashDia1), 0);

  // Comisiones
  const comisionesClosers = closerStats.reduce((s, c) => s + c.comision, 0);
  const comisionesSetters = setterStats.reduce((s, c) => s + c.comision, 0);
  const totalComisiones = comisionesClosers + comisionesSetters;

  // Gastos del mes
  const gastosMes = useMemo(() => {
    return gastos.filter(g => {
      const parts = g.fecha?.split("-");
      if (!parts || parts.length < 2) return false;
      return `${parts[0]}-${parseInt(parts[1])}` === mes;
    }).reduce((s, g) => s + g.monto, 0);
  }, [gastos, mes]);

  const resultadoNeto = cashMes - gastosMes - totalComisiones;

  // Show-up %
  const showUpPct = totalMes > 0 ? (presentadasMes / totalMes) * 100 : 0;

  // Weekly breakdown
  const weeklyData = useMemo(() => {
    const weeks: { label: string; cash: number; ventas: number }[] = [];
    const cerradas = monthLlamadas.filter(isCerrado);
    // Group by week of month
    for (let w = 0; w < 5; w++) {
      let cash = 0, ventas = 0;
      for (const l of cerradas) {
        const d = new Date(l.fechaLlamada || l.fechaAgenda);
        const weekOfMonth = Math.floor((d.getDate() - 1) / 7);
        if (weekOfMonth === w) { cash += l.cashDia1; ventas++; }
      }
      if (cash > 0 || w < 4) weeks.push({ label: `S${w + 1}`, cash, ventas });
    }
    return weeks;
  }, [monthLlamadas]);

  const bestWeek = weeklyData.reduce((best, w) => w.cash > best.cash ? w : best, { label: "-", cash: 0, ventas: 0 });

  // Programa más vendido
  const programaStats = useMemo(() => {
    const map = new Map<string, { count: number; cash: number }>();
    for (const l of monthLlamadas) {
      if (!isCerrado(l) || !l.programa) continue;
      if (!map.has(l.programa)) map.set(l.programa, { count: 0, cash: 0 });
      const p = map.get(l.programa)!;
      p.count++;
      p.cash += l.cashDia1;
    }
    return Array.from(map.entries()).sort((a, b) => b[1].cash - a[1].cash);
  }, [monthLlamadas]);

  const topPrograma = programaStats[0];

  const calls = agenda.filter(a => a.type === "call");
  const seguimientosAg = agenda.filter(a => a.type === "seguimiento");

  // Cuotas for today (admin)
  const cuotas = useMemo(() => getCuotas(llamadas), [llamadas]);
  const cuotasHoy = cuotas.filter(c => c.estado === "próxima" || c.estado === "vencida");

  // Alumnos por vencer (admin)
  const alumnos = useMemo(() => getAlumnos(llamadas), [llamadas]);
  const porVencer = alumnos.filter(a => a.estado === "Por vencer");

  // Trend helper
  function Trend({ current, previous }: { current: number; previous: number }) {
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

  const today = new Date();
  const todayStr = today.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div>
      {/* ── GAMIFICATION BAR ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-5 border-b border-card-border">
        <div className="flex items-center gap-6">
          {/* Streak */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <div>
              <div className="text-xl font-extrabold text-red">{myStreak}</div>
              <div className="text-[10px] text-muted">días racha</div>
            </div>
          </div>
          {/* Ranking */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">{myRanking?.position === 1 ? "🥇" : myRanking?.position === 2 ? "🥈" : myRanking?.position === 3 ? "🥉" : "🏅"}</span>
            <div>
              <div className="text-xl font-extrabold text-yellow">#{myRanking?.position || "-"}</div>
              <div className="text-[10px] text-muted">de {rankings.length}</div>
            </div>
          </div>
          {/* Comisión */}
          <div>
            <div className="text-xl font-extrabold text-green">{formatUSD(myRanking?.comision || 0)}</div>
            <div className="text-[10px] text-muted">comisión {monthLabel}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Earned badges */}
          <div className="flex gap-1">
            {badges.filter(b => b.earned).map(b => (
              <span key={b.id} title={b.label} className="text-lg cursor-default">{b.icon}</span>
            ))}
          </div>
          <MonthSelector value={mes} onChange={setMes} availableMonths={availableMonths} />
        </div>
      </div>

      {/* ── TODAY SECTION ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold">Tu día</h2>
            <p className="text-xs text-muted capitalize">{todayStr}</p>
          </div>
          <div className="flex gap-2">
            {calls.length > 0 && (
              <span className="bg-purple/15 text-purple-light border border-purple/30 text-xs font-semibold px-3 py-1 rounded-full">
                {calls.length} call{calls.length !== 1 ? "s" : ""}
              </span>
            )}
            {seguimientosAg.length > 0 && (
              <span className="bg-yellow/15 text-yellow border border-yellow/30 text-xs font-semibold px-3 py-1 rounded-full">
                {seguimientosAg.length} seguimiento{seguimientosAg.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Agenda items */}
        <div className="space-y-2">
          {agenda.length === 0 && (
            <div className="bg-card-bg border border-card-border rounded-xl p-6 text-center text-muted text-sm">
              No tenés tareas para hoy. Buen momento para hacer seguimiento.
            </div>
          )}
          {agenda.map((item, i) => (
            <div
              key={i}
              className={`bg-card-bg border rounded-xl p-4 flex items-center justify-between transition-colors ${
                item.type === "seguimiento" ? "border-yellow/30" : "border-card-border"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  item.type === "call" ? "bg-purple/15 text-purple-light" : "bg-yellow/15 text-yellow"
                }`}>
                  {item.type === "call" ? item.lead.nombre.split(" ").map(w => w[0]).join("").slice(0, 2) : "🔄"}
                </div>
                <div className="min-w-0">
                  {item.type === "seguimiento" && (
                    <div className="text-[10px] text-yellow font-semibold uppercase">
                      Seguimiento · {item.diasSinContacto} día{item.diasSinContacto !== 1 ? "s" : ""} sin contacto
                    </div>
                  )}
                  <div className="text-sm font-semibold truncate">{item.lead.nombre}</div>
                  <div className="text-xs text-muted truncate">
                    {item.type === "call" && (
                      <>
                        {item.lead.modeloNegocio && <>{item.lead.modeloNegocio} · </>}
                        {item.lead.capacidadInversion && (
                          <span className={item.lead.capacidadInversion.toLowerCase().includes("sí") ? "text-green" : "text-muted"}>
                            {item.lead.capacidadInversion}
                          </span>
                        )}
                      </>
                    )}
                    {item.type === "seguimiento" && item.ultimaNota && (
                      <span className="italic">&quot;{item.ultimaNota.slice(0, 60)}{item.ultimaNota.length > 60 ? "..." : ""}&quot;</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                {item.type === "call" && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    calculateLeadScore(item.lead) === "A+" ? "bg-green/15 text-green" :
                    calculateLeadScore(item.lead) === "A" ? "bg-green/10 text-green" :
                    calculateLeadScore(item.lead) === "B" ? "bg-yellow/10 text-yellow" :
                    "bg-card-border text-muted"
                  }`}>
                    {calculateLeadScore(item.lead)}
                  </span>
                )}
                <a href={item.type === "call" ? "/form/llamada" : "/pipeline"} className="bg-purple hover:bg-purple-dark text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                  {item.type === "call" ? "Cargar" : "Ver"}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ADMIN EXTRA: Cuotas + Alumnos por vencer ── */}
      {isAdmin && (cuotasHoy.length > 0 || porVencer.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {cuotasHoy.length > 0 && (
            <div className="bg-card-bg border border-card-border rounded-xl p-5">
              <h3 className="text-sm font-medium text-muted mb-3">Cuotas pendientes ({cuotasHoy.length})</h3>
              <div className="space-y-2">
                {cuotasHoy.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{c.alumno}</span>
                      <span className="text-muted text-xs ml-2">Cuota {c.cuotaNum}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{formatUSD(c.monto)}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        c.estado === "vencida" ? "bg-red/15 text-red" : "bg-yellow/15 text-yellow"
                      }`}>{c.estado}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {porVencer.length > 0 && (
            <div className="bg-card-bg border border-card-border rounded-xl p-5">
              <h3 className="text-sm font-medium text-muted mb-3">Alumnos por vencer ({porVencer.length})</h3>
              <div className="space-y-2">
                {porVencer.slice(0, 5).map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{a.nombre}</span>
                      <span className="text-muted text-xs ml-2">{a.programa}</span>
                    </div>
                    <span className="text-yellow text-xs font-semibold">{a.diasRestantes} días</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── KPIs ROW 1: Cash & Revenue ── */}
      <div className="mb-2">
        <h3 className="text-xs text-muted font-semibold uppercase tracking-wider mb-3">Revenue — {monthLabel}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-card-bg border border-card-border rounded-xl p-4">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Cash Collected</p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-extrabold text-green">{formatUSD(cashMes)}</p>
              <Trend current={cashMes} previous={prevCash} />
            </div>
          </div>
          <div className="bg-card-bg border border-card-border rounded-xl p-4">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Facturación</p>
            <p className="text-xl font-extrabold text-purple-light">{formatUSD(facturacionMes)}</p>
            <p className="text-[10px] text-muted">ticket total vendido</p>
          </div>
          <div className="bg-card-bg border border-card-border rounded-xl p-4">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Resultado Neto</p>
            <p className={`text-xl font-extrabold ${resultadoNeto >= 0 ? "text-green" : "text-red"}`}>{formatUSD(resultadoNeto)}</p>
            <p className="text-[10px] text-muted">cash - gastos - comis.</p>
          </div>
          <div className="bg-card-bg border border-card-border rounded-xl p-4">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Ventas</p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-extrabold">{cerradasMes}</p>
              <Trend current={cerradasMes} previous={prevCerradas} />
            </div>
          </div>
          <div className="bg-card-bg border border-card-border rounded-xl p-4">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Ticket Promedio</p>
            <p className="text-xl font-extrabold">{formatUSD(ticketProm)}</p>
          </div>
        </div>
      </div>

      {/* ── KPIs ROW 2: Performance ── */}
      <div className="mb-6">
        <h3 className="text-xs text-muted font-semibold uppercase tracking-wider mb-3 mt-4">Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-card-bg border border-card-border rounded-xl p-4">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Llamadas</p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-extrabold">{totalMes}</p>
              <Trend current={totalMes} previous={prevTotal} />
            </div>
          </div>
          <div className="bg-card-bg border border-card-border rounded-xl p-4">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Show-up %</p>
            <p className="text-xl font-extrabold">{showUpPct.toFixed(1)}%</p>
            <p className="text-[10px] text-muted">{presentadasMes} de {totalMes}</p>
          </div>
          <div className="bg-card-bg border border-card-border rounded-xl p-4">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Cierre %</p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-extrabold text-purple-light">{cierrePct.toFixed(1)}%</p>
              <Trend current={cierrePct} previous={prevCierre} />
            </div>
          </div>
          <div className="bg-card-bg border border-card-border rounded-xl p-4">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Mejor Semana</p>
            <p className="text-xl font-extrabold text-green">{formatUSD(bestWeek.cash)}</p>
            <p className="text-[10px] text-muted">{bestWeek.label} · {bestWeek.ventas} venta{bestWeek.ventas !== 1 ? "s" : ""}</p>
          </div>
          <div className="bg-card-bg border border-card-border rounded-xl p-4">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Programa Top</p>
            <p className="text-sm font-extrabold text-purple-light">{topPrograma ? topPrograma[0] : "-"}</p>
            <p className="text-[10px] text-muted">{topPrograma ? `${topPrograma[1].count} ventas · ${formatUSD(topPrograma[1].cash)}` : ""}</p>
          </div>
        </div>
      </div>

      {/* ── COMISIONES + VENTAS POR SEMANA ── */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Comisiones por persona */}
          <div className="bg-card-bg border border-card-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted">Comisiones — {monthLabel}</h3>
              <span className="text-sm font-bold text-yellow">{formatUSD(totalComisiones)}</span>
            </div>
            <div className="space-y-2">
              {closerStats.filter(c => c.comision > 0).map(c => (
                <div key={c.nombre} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-green/15 text-green px-1.5 py-0.5 rounded font-semibold">C</span>
                    <span className="text-sm font-medium">{c.nombre}</span>
                    <span className="text-xs text-muted">{c.cerradas}v · {formatUSD(c.cashCollected)}</span>
                  </div>
                  <span className="text-sm font-bold text-green">{formatUSD(c.comision)}</span>
                </div>
              ))}
              {setterStats.filter(s => s.comision > 0).map(s => (
                <div key={s.nombre} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-yellow/15 text-yellow px-1.5 py-0.5 rounded font-semibold">S</span>
                    <span className="text-sm font-medium">{s.nombre}</span>
                    <span className="text-xs text-muted">{s.agendas}a · {formatUSD(s.cashDeLeads)}</span>
                  </div>
                  <span className="text-sm font-bold text-yellow">{formatUSD(s.comision)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ventas por semana */}
          <div className="bg-card-bg border border-card-border rounded-xl p-5">
            <h3 className="text-sm font-medium text-muted mb-4">Cash por Semana — {monthLabel}</h3>
            <div className="flex items-end gap-2 h-32">
              {weeklyData.map((w, i) => {
                const maxCash = Math.max(...weeklyData.map(x => x.cash), 1);
                const height = (w.cash / maxCash) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-green font-semibold">{w.cash > 0 ? formatUSD(w.cash) : ""}</span>
                    <div className="w-full bg-card-border rounded-t" style={{ height: `${Math.max(height, 4)}%` }}>
                      <div className={`w-full h-full rounded-t ${w === bestWeek ? "bg-green" : "bg-green/40"}`} />
                    </div>
                    <span className="text-[10px] text-muted">{w.label}</span>
                    <span className="text-[10px] text-muted">{w.ventas}v</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── PROGRAMA DISTRIBUTION (admin) ── */}
      {isAdmin && programaStats.length > 0 && (
        <div className="bg-card-bg border border-card-border rounded-xl p-5 mb-6">
          <h3 className="text-sm font-medium text-muted mb-4">Distribución por Programa — {monthLabel}</h3>
          <div className="space-y-2">
            {programaStats.map(([programa, data]) => {
              const pct = cerradasMes > 0 ? (data.count / cerradasMes) * 100 : 0;
              return (
                <div key={programa} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-28 shrink-0">{programa}</span>
                  <div className="flex-1 bg-card-border rounded-full h-4 overflow-hidden">
                    <div className="h-full bg-purple rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted w-20 text-right">{data.count}v · {formatUSD(data.cash)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
