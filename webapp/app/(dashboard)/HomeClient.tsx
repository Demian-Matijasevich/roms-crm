"use client";
import { useMemo, useState } from "react";
import type { Llamada, Gasto, MonthlyData, AuthSession, Seguimiento } from "@/lib/types";
import { getCurrentMonth, filterByMonth, isCerrado, isPresentada, getCloserStats, getAlumnos, getCuotas, formatUSD, formatPct } from "@/lib/data";
import { calculateLeadScore } from "@/lib/data";
import { getCloserRankings, getTodayAgenda, getCloserStreaks, getCloserBadges } from "@/lib/gamification";
import { MONTH_LABELS } from "@/lib/constants";
import MonthSelector from "@/app/components/MonthSelector";

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

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <p className="text-[10px] text-muted uppercase tracking-wider mb-2">Cash {monthLabel}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-green">{formatUSD(cashMes)}</p>
            <Trend current={cashMes} previous={prevCash} />
          </div>
        </div>
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <p className="text-[10px] text-muted uppercase tracking-wider mb-2">Llamadas</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-extrabold">{totalMes}</p>
            <Trend current={totalMes} previous={prevTotal} />
          </div>
        </div>
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <p className="text-[10px] text-muted uppercase tracking-wider mb-2">Cierre %</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-purple-light">{cierrePct.toFixed(1)}%</p>
            <Trend current={cierrePct} previous={prevCierre} />
          </div>
        </div>
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <p className="text-[10px] text-muted uppercase tracking-wider mb-2">Ticket promedio</p>
          <p className="text-2xl font-extrabold">{formatUSD(ticketProm)}</p>
        </div>
      </div>
    </div>
  );
}
