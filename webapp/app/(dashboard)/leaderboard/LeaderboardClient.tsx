"use client";

import { useMemo, useState } from "react";
import type { Llamada } from "@/lib/types";
import { getCloserStats, getSetterStats, formatUSD, formatPct, isCerrado, filterByMonth } from "@/lib/data";
import { getCloserRankings, getCloserStreaks, getCloserBadges } from "@/lib/gamification";
import { MONTH_LABELS } from "@/lib/constants";
import MonthSelector from "@/app/components/MonthSelector";

interface Props {
  llamadas: Llamada[];
  defaultMonth: string;
  availableMonths: string[];
}

function medal(pos: number): string {
  if (pos === 1) return "\u{1F947}";
  if (pos === 2) return "\u{1F948}";
  if (pos === 3) return "\u{1F949}";
  return `#${pos}`;
}

function borderStyle(pos: number): string {
  if (pos === 1) return "border-yellow-500/60 bg-yellow-500/5";
  if (pos === 2) return "border-gray-400/50 bg-gray-400/5";
  if (pos === 3) return "border-amber-700/50 bg-amber-700/5";
  return "border-card-border";
}

export default function LeaderboardClient({ llamadas, defaultMonth, availableMonths }: Props) {
  const [mes, setMes] = useState(defaultMonth);

  const closers = useMemo(() => getCloserStats(llamadas, mes), [llamadas, mes]);
  const setters = useMemo(
    () => getSetterStats(llamadas, mes).sort((a, b) => b.cashDeLeads - a.cashDeLeads),
    [llamadas, mes],
  );

  const streaks = useMemo(() => getCloserStreaks(llamadas), [llamadas]);
  const rankings = useMemo(() => getCloserRankings(llamadas, mes), [llamadas, mes]);

  // Compute badges for each closer
  const badgesMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getCloserBadges>>();
    for (const c of closers) {
      map.set(c.nombre, getCloserBadges(llamadas, c.nombre, mes));
    }
    return map;
  }, [llamadas, closers, mes]);

  // #1 per metric
  const metricLeaders = useMemo(() => {
    const filtered = closers.filter(c => c.nombre !== "Sin asignar");
    if (filtered.length === 0) return null;

    const topCash = filtered.reduce((a, b) => (b.cashCollected > a.cashCollected ? b : a));
    const topCierre = filtered.reduce((a, b) => (b.cierrePresentadas > a.cierrePresentadas ? b : a));
    const topTicket = filtered.reduce((a, b) => (b.ticketPromedio > a.ticketPromedio ? b : a));

    // Velocidad: average days between fechaAgenda and fechaLlamada for cerrados
    const monthLlamadas = filterByMonth(llamadas, mes);
    const closerVelocities = new Map<string, number>();
    for (const c of filtered) {
      const cerrados = monthLlamadas.filter(l => l.closer === c.nombre && isCerrado(l) && l.fechaAgenda && l.fechaLlamada);
      if (cerrados.length === 0) {
        closerVelocities.set(c.nombre, Infinity);
        continue;
      }
      const totalDays = cerrados.reduce((sum, l) => {
        const diff = Math.abs(new Date(l.fechaLlamada).getTime() - new Date(l.fechaAgenda).getTime()) / 86400000;
        return sum + diff;
      }, 0);
      closerVelocities.set(c.nombre, totalDays / cerrados.length);
    }
    const topVelocidad = filtered.reduce((a, b) =>
      (closerVelocities.get(a.nombre)! <= closerVelocities.get(b.nombre)! ? a : b)
    );
    const velocidadValue = closerVelocities.get(topVelocidad.nombre)!;

    // Racha
    const topRacha = filtered.reduce((best, c) => {
      const s = streaks.get(c.nombre)?.currentStreak || 0;
      const bestS = streaks.get(best.nombre)?.currentStreak || 0;
      return s > bestS ? c : best;
    });

    return [
      { label: "CASH", emoji: "\u{1F4B0}", name: topCash.nombre, value: formatUSD(topCash.cashCollected) },
      { label: "CIERRE %", emoji: "\u{1F3AF}", name: topCierre.nombre, value: formatPct(topCierre.cierrePresentadas) },
      { label: "TICKET", emoji: "\u{1F48E}", name: topTicket.nombre, value: formatUSD(topTicket.ticketPromedio) },
      { label: "VELOCIDAD", emoji: "\u26A1", name: topVelocidad.nombre, value: velocidadValue === Infinity ? "-" : `${velocidadValue.toFixed(1)}d` },
      { label: "RACHA", emoji: "\u{1F525}", name: topRacha.nombre, value: `${streaks.get(topRacha.nombre)?.currentStreak || 0} dias` },
    ];
  }, [closers, llamadas, mes, streaks]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold">Leaderboard</h2>
          <p className="text-sm text-muted mt-1">{MONTH_LABELS[mes] || mes}</p>
        </div>
        <MonthSelector value={mes} onChange={setMes} availableMonths={availableMonths} />
      </div>

      {/* ─── CLOSER CARDS ─── */}
      {closers.length > 0 && (
        <div className="mb-10">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Ranking Closers</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {closers
              .filter(c => c.nombre !== "Sin asignar")
              .map((c, i) => {
                const pos = i + 1;
                const streak = streaks.get(c.nombre)?.currentStreak || 0;
                const badges = badgesMap.get(c.nombre) || [];
                const earnedBadges = badges.filter(b => b.earned);

                return (
                  <div
                    key={c.nombre}
                    className={`bg-card-bg border-2 rounded-xl p-5 transition-all hover:scale-[1.02] ${borderStyle(pos)}`}
                  >
                    {/* Top row: medal + streak */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{medal(pos)}</span>
                      {streak > 0 && (
                        <span className="text-sm text-orange-400 font-medium">
                          {"\u{1F525}"} {streak} dias
                        </span>
                      )}
                    </div>

                    {/* Name */}
                    <p className="font-bold text-base mb-1">{c.nombre}</p>

                    {/* Cash */}
                    <p className="text-2xl font-bold text-green mb-2">{formatUSD(c.cashCollected)}</p>

                    {/* Stats line */}
                    <p className="text-sm text-muted">
                      {c.cerradas} ventas &middot;{" "}
                      <span className="text-purple-light">{formatPct(c.cierrePresentadas)}</span> cierre
                    </p>

                    {/* Badges */}
                    {earnedBadges.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-card-border flex flex-wrap gap-1">
                        {earnedBadges.map(b => (
                          <span key={b.id} title={b.label} className="text-base cursor-default">
                            {b.icon}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ─── #1 EN CADA METRICA ─── */}
      {metricLeaders && (
        <div className="mb-10">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
            {"\u{1F947}"} #1 en cada metrica
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {metricLeaders.map(m => (
              <div
                key={m.label}
                className="bg-card-bg border border-card-border rounded-xl p-4 text-center hover:border-purple/30 transition-colors"
              >
                <span className="text-xl">{m.emoji}</span>
                <p className="text-xs text-muted uppercase tracking-wider mt-2 mb-1">{m.label}</p>
                <p className="font-bold text-sm">{m.name}</p>
                <p className="text-xs text-green mt-1">{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── SETTER RANKING ─── */}
      {setters.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Ranking Setters</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {setters
              .filter(s => s.nombre !== "Sin asignar")
              .map((s, i) => {
                const pos = i + 1;
                return (
                  <div
                    key={s.nombre}
                    className={`bg-card-bg border rounded-xl p-5 transition-all hover:scale-[1.02] ${
                      pos <= 3 ? borderStyle(pos) : "border-card-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{medal(pos)}</span>
                    </div>

                    <p className="font-bold text-base mb-1">{s.nombre}</p>
                    <p className="text-xl font-bold text-green mb-2">{formatUSD(s.cashDeLeads)}</p>

                    <div className="text-sm text-muted space-y-1">
                      <p>{s.agendas} agendas &middot; {s.cerradas} cerradas</p>
                      <p>
                        <span className="text-purple-light">{formatPct(s.tasaAgenda)}</span> tasa
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-card-border">
                      <span className="text-xs text-muted">Comision: </span>
                      <span className="text-xs font-medium text-yellow-400">{formatUSD(s.comision)}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {closers.length === 0 && setters.length === 0 && (
        <div className="bg-card-bg border border-card-border rounded-xl p-12 text-center">
          <p className="text-muted">Sin datos para este mes.</p>
        </div>
      )}
    </div>
  );
}
