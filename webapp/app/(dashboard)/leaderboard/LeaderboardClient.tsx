"use client";

import { useState, useMemo } from "react";
import type { CloserStats, SetterStats } from "@/lib/types";
import { formatUSD, formatPct } from "@/lib/data";
import MonthSelector from "@/app/components/MonthSelector";
import { getCloserStats, getSetterStats } from "@/lib/data";
import type { Llamada } from "@/lib/types";

type Tab = "closers" | "setters";

interface Props {
  llamadas: Llamada[];
  defaultMonth: string;
  availableMonths: string[];
}

function medal(pos: number): string {
  if (pos === 1) return "🥇";
  if (pos === 2) return "🥈";
  if (pos === 3) return "🥉";
  return String(pos);
}

export default function LeaderboardClient({ llamadas, defaultMonth, availableMonths }: Props) {
  const [tab, setTab] = useState<Tab>("closers");
  const [mes, setMes] = useState(defaultMonth);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);

  const closers = useMemo(() => getCloserStats(llamadas, mes), [llamadas, mes]);
  const setters = useMemo(
    () => getSetterStats(llamadas, mes).sort((a, b) => b.cashDeLeads - a.cashDeLeads),
    [llamadas, mes]
  );

  const closerTotals = useMemo(() => ({
    cashCollected: closers.reduce((s, c) => s + c.cashCollected, 0),
    cerradas: closers.reduce((s, c) => s + c.cerradas, 0),
    llamadas: closers.reduce((s, c) => s + c.llamadas, 0),
    presentadas: closers.reduce((s, c) => s + c.presentadas, 0),
    comision: closers.reduce((s, c) => s + c.comision, 0),
  }), [closers]);

  const setterTotals = useMemo(() => ({
    agendas: setters.reduce((s, r) => s + r.agendas, 0),
    presentadas: setters.reduce((s, r) => s + r.presentadas, 0),
    cerradas: setters.reduce((s, r) => s + r.cerradas, 0),
    calificadas: setters.reduce((s, r) => s + r.calificadas, 0),
    cashDeLeads: setters.reduce((s, r) => s + r.cashDeLeads, 0),
    comision: setters.reduce((s, r) => s + r.comision, 0),
  }), [setters]);

  const tabClass = (t: Tab) =>
    tab === t
      ? "px-4 py-2 rounded-lg text-sm font-medium border bg-purple/15 text-purple-light border-purple/30 transition-colors"
      : "px-4 py-2 rounded-lg text-sm font-medium border text-muted border-card-border hover:text-foreground transition-colors";

  const thClass = "px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium whitespace-nowrap text-left";
  const tdClass = "px-4 py-3 whitespace-nowrap";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Leaderboard</h2>
        <MonthSelector value={mes} onChange={setMes} availableMonths={availableMonths} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button className={tabClass("closers")} onClick={() => setTab("closers")}>
          Closers
        </button>
        <button className={tabClass("setters")} onClick={() => setTab("setters")}>
          Setters
        </button>
      </div>

      {/* Individual Stat Cards */}
      {tab === "closers" && closers.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-medium text-muted">Métricas Individuales</h3>
            {selectedPerson && (
              <button onClick={() => setSelectedPerson(null)}
                className="text-xs text-purple hover:text-purple-light transition-colors">
                ← Ver todos
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {(selectedPerson ? closers.filter(c => c.nombre === selectedPerson) : closers).map((c, i) => {
              const pos = closers.indexOf(c) + 1;
              return (
                <div key={c.nombre}
                  onClick={() => setSelectedPerson(selectedPerson === c.nombre ? null : c.nombre)}
                  className={`bg-card-bg border rounded-xl p-4 cursor-pointer transition-all ${
                    selectedPerson === c.nombre
                      ? "border-purple/50 bg-purple/5"
                      : "border-card-border hover:border-purple/30"
                  }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">{medal(pos)}</span>
                    <span className="text-xs text-muted">{formatPct(c.cierrePresentadas)} cierre</span>
                  </div>
                  <p className="font-semibold text-sm mb-1">{c.nombre}</p>
                  <p className="text-xl font-bold text-green">{formatUSD(c.cashCollected)}</p>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div><span className="text-muted">Llamadas:</span> {c.llamadas}</div>
                    <div><span className="text-muted">Cerradas:</span> {c.cerradas}</div>
                    <div><span className="text-muted">Show up:</span> {formatPct(c.showUp)}</div>
                    <div><span className="text-muted">Ticket:</span> {formatUSD(c.ticketPromedio)}</div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-card-border">
                    <span className="text-xs text-muted">Comisión: </span>
                    <span className="text-xs font-medium text-purple-light">{formatUSD(c.comision)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "setters" && setters.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-medium text-muted">Métricas Individuales</h3>
            {selectedPerson && (
              <button onClick={() => setSelectedPerson(null)}
                className="text-xs text-purple hover:text-purple-light transition-colors">
                ← Ver todos
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {(selectedPerson ? setters.filter(s => s.nombre === selectedPerson) : setters).map((s, i) => {
              const pos = setters.indexOf(s) + 1;
              return (
                <div key={s.nombre}
                  onClick={() => setSelectedPerson(selectedPerson === s.nombre ? null : s.nombre)}
                  className={`bg-card-bg border rounded-xl p-4 cursor-pointer transition-all ${
                    selectedPerson === s.nombre
                      ? "border-purple/50 bg-purple/5"
                      : "border-card-border hover:border-purple/30"
                  }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">{medal(pos)}</span>
                    <span className="text-xs text-muted">{formatPct(s.tasaAgenda)} tasa</span>
                  </div>
                  <p className="font-semibold text-sm mb-1">{s.nombre}</p>
                  <p className="text-xl font-bold text-green">{formatUSD(s.cashDeLeads)}</p>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div><span className="text-muted">Agendas:</span> {s.agendas}</div>
                    <div><span className="text-muted">Cerradas:</span> {s.cerradas}</div>
                    <div><span className="text-muted">Calif:</span> {s.calificadas}</div>
                    <div><span className="text-muted">Presentadas:</span> {s.presentadas}</div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-card-border">
                    <span className="text-xs text-muted">Comisión: </span>
                    <span className="text-xs font-medium text-purple-light">{formatUSD(s.comision)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Closer Table */}
      {tab === "closers" && (
        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#111113] border-b border-card-border">
                  <th className={thClass}>Pos</th>
                  <th className={thClass}>Closer</th>
                  <th className={`${thClass} text-right`}>Cash Collected</th>
                  <th className={`${thClass} text-right`}>Cerradas</th>
                  <th className={`${thClass} text-right`}>Llamadas</th>
                  <th className={`${thClass} text-right`}>Presentadas</th>
                  <th className={`${thClass} text-right`}>Show Up%</th>
                  <th className={`${thClass} text-right`}>Cierre%</th>
                  <th className={`${thClass} text-right`}>Ticket Prom.</th>
                  <th className={`${thClass} text-right`}>Comisión</th>
                </tr>
              </thead>
              <tbody>
                {closers.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-muted text-sm">
                      Sin datos para este mes.
                    </td>
                  </tr>
                )}
                {closers.map((c, i) => (
                  <tr
                    key={c.nombre}
                    className={`border-b border-card-border transition-colors ${
                      i === 0 ? "bg-purple/5" : "hover:bg-[#1a1a1e]"
                    }`}
                  >
                    <td className={`${tdClass} text-center text-base`}>{medal(i + 1)}</td>
                    <td className={`${tdClass} font-medium`}>{c.nombre}</td>
                    <td className={`${tdClass} text-right font-semibold text-green`}>{formatUSD(c.cashCollected)}</td>
                    <td className={`${tdClass} text-right`}>{c.cerradas}</td>
                    <td className={`${tdClass} text-right text-muted`}>{c.llamadas}</td>
                    <td className={`${tdClass} text-right text-muted`}>{c.presentadas}</td>
                    <td className={`${tdClass} text-right text-muted`}>{formatPct(c.showUp)}</td>
                    <td className={`${tdClass} text-right text-muted`}>{formatPct(c.cierrePresentadas)}</td>
                    <td className={`${tdClass} text-right text-muted`}>{formatUSD(c.ticketPromedio)}</td>
                    <td className={`${tdClass} text-right text-purple-light`}>{formatUSD(c.comision)}</td>
                  </tr>
                ))}
                {closers.length > 0 && (
                  <tr className="bg-[#111113] font-bold border-t border-card-border">
                    <td className={tdClass}></td>
                    <td className={tdClass}>Total</td>
                    <td className={`${tdClass} text-right text-green`}>{formatUSD(closerTotals.cashCollected)}</td>
                    <td className={`${tdClass} text-right`}>{closerTotals.cerradas}</td>
                    <td className={`${tdClass} text-right text-muted`}>{closerTotals.llamadas}</td>
                    <td className={`${tdClass} text-right text-muted`}>{closerTotals.presentadas}</td>
                    <td className={tdClass}></td>
                    <td className={tdClass}></td>
                    <td className={tdClass}></td>
                    <td className={`${tdClass} text-right text-purple-light`}>{formatUSD(closerTotals.comision)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Setter Table */}
      {tab === "setters" && (
        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#111113] border-b border-card-border">
                  <th className={thClass}>Pos</th>
                  <th className={thClass}>Setter</th>
                  <th className={`${thClass} text-right`}>Agendas</th>
                  <th className={`${thClass} text-right`}>Presentadas</th>
                  <th className={`${thClass} text-right`}>Cerradas</th>
                  <th className={`${thClass} text-right`}>Calificadas</th>
                  <th className={`${thClass} text-right`}>Tasa Agenda%</th>
                  <th className={`${thClass} text-right`}>Cash de Leads</th>
                  <th className={`${thClass} text-right`}>Comisión</th>
                </tr>
              </thead>
              <tbody>
                {setters.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted text-sm">
                      Sin datos para este mes.
                    </td>
                  </tr>
                )}
                {setters.map((s, i) => (
                  <tr
                    key={s.nombre}
                    className={`border-b border-card-border transition-colors ${
                      i === 0 ? "bg-purple/5" : "hover:bg-[#1a1a1e]"
                    }`}
                  >
                    <td className={`${tdClass} text-center text-base`}>{medal(i + 1)}</td>
                    <td className={`${tdClass} font-medium`}>{s.nombre}</td>
                    <td className={`${tdClass} text-right`}>{s.agendas}</td>
                    <td className={`${tdClass} text-right text-muted`}>{s.presentadas}</td>
                    <td className={`${tdClass} text-right`}>{s.cerradas}</td>
                    <td className={`${tdClass} text-right text-muted`}>{s.calificadas}</td>
                    <td className={`${tdClass} text-right text-muted`}>{formatPct(s.tasaAgenda)}</td>
                    <td className={`${tdClass} text-right font-semibold text-green`}>{formatUSD(s.cashDeLeads)}</td>
                    <td className={`${tdClass} text-right text-purple-light`}>{formatUSD(s.comision)}</td>
                  </tr>
                ))}
                {setters.length > 0 && (
                  <tr className="bg-[#111113] font-bold border-t border-card-border">
                    <td className={tdClass}></td>
                    <td className={tdClass}>Total</td>
                    <td className={`${tdClass} text-right`}>{setterTotals.agendas}</td>
                    <td className={`${tdClass} text-right text-muted`}>{setterTotals.presentadas}</td>
                    <td className={`${tdClass} text-right`}>{setterTotals.cerradas}</td>
                    <td className={`${tdClass} text-right text-muted`}>{setterTotals.calificadas}</td>
                    <td className={tdClass}></td>
                    <td className={`${tdClass} text-right text-green`}>{formatUSD(setterTotals.cashDeLeads)}</td>
                    <td className={`${tdClass} text-right text-purple-light`}>{formatUSD(setterTotals.comision)}</td>
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

