"use client";
import { useState, useMemo } from "react";
import { Llamada } from "@/lib/types";
import {
  getCurrentMonth,
  filterByMonth,
  isCerrado,
  isPresentada,
  formatUSD,
  formatPct,
} from "@/lib/data";
import { TEAM, MONTH_LABELS, PROGRAMS } from "@/lib/constants";
import MonthSelector from "@/app/components/MonthSelector";
import ExportButton from "@/app/components/ExportButton";

interface Props {
  llamadas: Llamada[];
}

export default function ClosersClient({ llamadas }: Props) {
  const [selectedCloser, setSelectedCloser] = useState("Todos");
  const [mes, setMes] = useState(getCurrentMonth());

  const closers = TEAM.filter((t) => t.roles.includes("closer")).map(
    (t) => t.nombre
  );

  const data = useMemo(() => {
    let filtered = filterByMonth(llamadas, mes);
    if (selectedCloser !== "Todos") {
      filtered = filtered.filter((l) => l.closer === selectedCloser);
    }
    return filtered;
  }, [llamadas, mes, selectedCloser]);

  // ── Funnel ──
  const totalAgendas = data.length;
  const showUps = data.filter((l) => isPresentada(l));
  const calificados = data.filter((l) => l.calificado === "Sí");
  const cerrados = data.filter((l) => isCerrado(l));

  const funnelSteps = [
    { label: "Agendas", count: totalAgendas, pct: 1, color: "bg-purple" },
    {
      label: "Show-up",
      count: showUps.length,
      pct: totalAgendas > 0 ? showUps.length / totalAgendas : 0,
      color: "bg-purple/60",
    },
    {
      label: "Calificados",
      count: calificados.length,
      pct: totalAgendas > 0 ? calificados.length / totalAgendas : 0,
      color: "bg-yellow-500",
    },
    {
      label: "Cerrados",
      count: cerrados.length,
      pct: totalAgendas > 0 ? cerrados.length / totalAgendas : 0,
      color: "bg-green-500",
    },
  ];

  // ── KPIs ──
  // 1. Velocidad de cierre
  const velocidadDias = (() => {
    const diffs: number[] = [];
    for (const l of cerrados) {
      if (l.fechaAgenda && l.fechaLlamada) {
        const d1 = new Date(l.fechaAgenda).getTime();
        const d2 = new Date(l.fechaLlamada).getTime();
        if (!isNaN(d1) && !isNaN(d2)) {
          diffs.push(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
        }
      }
    }
    return diffs.length > 0
      ? (diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(1)
      : "—";
  })();

  // 2. Revenue por llamada
  const cashTotal = cerrados.reduce((s, l) => s + l.cashTotal, 0);
  const revPorLlamada = totalAgendas > 0 ? cashTotal / totalAgendas : 0;

  // 3. Tasa de cobro
  const ticketTotalSum = cerrados.reduce((s, l) => s + l.ticketTotal, 0);
  const cashTotalSum = cerrados.reduce((s, l) => s + l.cashTotal, 0);
  const tasaCobro = ticketTotalSum > 0 ? cashTotalSum / ticketTotalSum : 0;

  // 4. Pipeline activo
  const pipelineActivo = data.filter(
    (l) =>
      l.estado.includes("Seguimiento") || l.estado.includes("Re-programada")
  ).length;

  // 5. Cierre dia 1
  const cierreDia1 = (() => {
    if (cerrados.length === 0) return 0;
    const dia1 = cerrados.filter((l) => l.fechaLlamada === l.fechaAgenda);
    return dia1.length / cerrados.length;
  })();

  const kpis = [
    {
      label: "Velocidad de cierre",
      value: velocidadDias === "—" ? "—" : `${velocidadDias} días`,
      sub: "Promedio agenda → cierre",
    },
    {
      label: "Revenue / llamada",
      value: formatUSD(revPorLlamada),
      sub: "Cash total / agendas",
    },
    {
      label: "Tasa de cobro",
      value: formatPct(tasaCobro),
      sub: "Cash cobrado / ticket total",
    },
    {
      label: "Pipeline activo",
      value: String(pipelineActivo),
      sub: "En seguimiento o re-programada",
    },
    {
      label: "Cierre día 1",
      value: formatPct(cierreDia1),
      sub: "Cerrados el mismo día de agenda",
    },
  ];

  // ── Program Distribution ──
  const programDist = useMemo(() => {
    if (cerrados.length === 0) return [];
    const counts: Record<string, number> = {};
    for (const l of cerrados) {
      const p = l.programa || "Sin programa";
      counts[p] = (counts[p] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        pct: count / cerrados.length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [cerrados]);

  // ── Weekly Trend ──
  const weeklyData = useMemo(() => {
    const weeks = [0, 0, 0, 0];
    for (const l of cerrados) {
      const date = new Date(l.fechaLlamada);
      if (isNaN(date.getTime())) continue;
      const day = date.getDate();
      const weekIdx = Math.min(Math.floor((day - 1) / 7), 3);
      weeks[weekIdx] += l.cashTotal;
    }
    const max = Math.max(...weeks, 1);
    return weeks.map((cash, i) => ({
      label: `Sem ${i + 1}`,
      cash,
      pct: cash / max,
    }));
  }, [cerrados]);

  const weeklyTrend = (() => {
    const nonZero = weeklyData.filter((w) => w.cash > 0);
    if (nonZero.length < 2) return null;
    const last = nonZero[nonZero.length - 1].cash;
    const prev = nonZero[nonZero.length - 2].cash;
    if (prev === 0) return null;
    const change = ((last - prev) / prev) * 100;
    return change;
  })();

  // ── Calendly Response Analytics ──
  const capacidadData = useMemo(() => {
    const groups: Record<string, { total: number; cerrados: number }> = {};
    for (const l of data) {
      const cap = l.capacidadInversion || "Sin respuesta";
      if (!groups[cap]) groups[cap] = { total: 0, cerrados: 0 };
      groups[cap].total++;
      if (isCerrado(l)) groups[cap].cerrados++;
    }
    return Object.entries(groups)
      .map(([label, g]) => ({
        label,
        total: g.total,
        cerrados: g.cerrados,
        rate: g.total > 0 ? g.cerrados / g.total : 0,
      }))
      .filter((g) => g.total >= 1)
      .sort((a, b) => b.rate - a.rate);
  }, [data]);

  const modeloData = useMemo(() => {
    const groups: Record<string, Record<string, number>> = {};
    for (const l of cerrados) {
      const modelo = l.modeloNegocio || "Sin respuesta";
      const programa = l.programa || "Sin programa";
      if (!groups[modelo]) groups[modelo] = {};
      groups[modelo][programa] = (groups[modelo][programa] || 0) + 1;
    }
    return Object.entries(groups)
      .map(([modelo, programas]) => {
        const sorted = Object.entries(programas).sort((a, b) => b[1] - a[1]);
        return { modelo, programa: sorted[0]?.[0] || "—", count: sorted[0]?.[1] || 0 };
      })
      .sort((a, b) => b.count - a.count);
  }, [cerrados]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Closers Analytics</h1>
          <p className="text-muted text-sm mt-1">
            Métricas avanzadas de rendimiento
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton reportId="closers-report" />
          <select
            value={selectedCloser}
            onChange={(e) => setSelectedCloser(e.target.value)}
            className="bg-card-bg border border-card-border text-foreground px-3 py-2 rounded-lg text-sm
              focus:outline-none focus:border-purple cursor-pointer"
          >
            <option value="Todos">Todos los closers</option>
            {closers.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <MonthSelector value={mes} onChange={setMes} />
        </div>
      </div>

      {/* A) Conversion Funnel */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-5">Embudo de Conversión</h2>
        <div className="space-y-4">
          {funnelSteps.map((step) => (
            <div key={step.label} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted">{step.label}</span>
                <span className="font-medium">
                  {step.count}{" "}
                  <span className="text-muted ml-1">
                    ({formatPct(step.pct)})
                  </span>
                </span>
              </div>
              <div className="h-8 bg-[#1a1a2e] rounded-lg overflow-hidden">
                <div
                  className={`h-full ${step.color} rounded-lg transition-all duration-500`}
                  style={{ width: `${Math.max(step.pct * 100, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* B) 5 Advanced KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-card-bg border border-card-border rounded-xl p-4"
          >
            <p className="text-muted text-xs mb-1">{kpi.label}</p>
            <p className="text-xl font-bold">{kpi.value}</p>
            <p className="text-muted text-[11px] mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* C) Program Distribution */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">
          Distribución por Programa
        </h2>
        {programDist.length === 0 ? (
          <p className="text-muted text-sm">Sin cierres en este período</p>
        ) : (
          <div className="space-y-3">
            {programDist.map((p) => (
              <div key={p.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="text-muted">
                    {p.count} ({formatPct(p.pct)})
                  </span>
                </div>
                <div className="h-5 bg-[#1a1a2e] rounded overflow-hidden">
                  <div
                    className="h-full bg-purple rounded transition-all duration-500"
                    style={{ width: `${p.pct * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* D) Weekly Trend */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Tendencia Semanal</h2>
          {weeklyTrend !== null && (
            <span
              className={`text-sm font-medium ${
                weeklyTrend >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {weeklyTrend >= 0 ? "+" : ""}
              {weeklyTrend.toFixed(0)}% vs sem anterior
            </span>
          )}
        </div>
        <div className="flex items-end gap-3 h-48">
          {weeklyData.map((w) => (
            <div
              key={w.label}
              className="flex-1 flex flex-col items-center gap-2"
            >
              <span className="text-xs font-medium">
                {w.cash > 0 ? formatUSD(w.cash) : "—"}
              </span>
              <div className="w-full bg-[#1a1a2e] rounded-t overflow-hidden relative h-36">
                <div
                  className="absolute bottom-0 w-full bg-green-500/80 rounded-t transition-all duration-500"
                  style={{ height: `${w.pct * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted">{w.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* E) Calendly Response Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Capacidad de Inversion → Cierre % */}
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">
            Capacidad de inversión &rarr; Cierre %
          </h2>
          {capacidadData.length === 0 ? (
            <p className="text-muted text-sm">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {capacidadData.map((g) => (
                <div key={g.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate mr-2" title={g.label}>
                      {g.label.length > 40
                        ? g.label.slice(0, 40) + "..."
                        : g.label}
                    </span>
                    <span className="text-muted whitespace-nowrap">
                      {g.cerrados}/{g.total} ({formatPct(g.rate)})
                    </span>
                  </div>
                  <div className="h-4 bg-[#1a1a2e] rounded overflow-hidden">
                    <div
                      className="h-full bg-purple/70 rounded transition-all duration-500"
                      style={{ width: `${Math.max(g.rate * 100, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modelo de negocio → Programa vendido */}
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">
            Modelo de negocio &rarr; Programa vendido
          </h2>
          {modeloData.length === 0 ? (
            <p className="text-muted text-sm">Sin cierres</p>
          ) : (
            <div className="space-y-3">
              {modeloData.map((m) => (
                <div
                  key={m.modelo}
                  className="flex items-center gap-3 bg-[#1a1a2e] rounded-lg px-4 py-3"
                >
                  <span className="text-sm flex-1 truncate" title={m.modelo}>
                    {m.modelo}
                  </span>
                  <span className="text-muted text-lg">&rarr;</span>
                  <span className="text-sm font-medium text-purple-light flex-1 text-right truncate">
                    {m.programa}
                  </span>
                  <span className="text-xs text-muted">({m.count})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hidden printable report for PDF export */}
      <div id="closers-report" className="hidden">
        <h2>Closers Analytics</h2>
        <div className="kpi-grid">
          <div className="kpi"><div className="kpi-label">Agendas</div><div className="kpi-value">{totalAgendas}</div></div>
          <div className="kpi"><div className="kpi-label">Show-up</div><div className="kpi-value">{showUps.length} ({formatPct(totalAgendas > 0 ? showUps.length / totalAgendas : 0)})</div></div>
          <div className="kpi"><div className="kpi-label">Calificados</div><div className="kpi-value">{calificados.length} ({formatPct(totalAgendas > 0 ? calificados.length / totalAgendas : 0)})</div></div>
          <div className="kpi"><div className="kpi-label">Cerrados</div><div className="kpi-value green">{cerrados.length} ({formatPct(totalAgendas > 0 ? cerrados.length / totalAgendas : 0)})</div></div>
        </div>
        <h3>KPIs Avanzados</h3>
        <table>
          <thead><tr><th>M&eacute;trica</th><th className="text-right">Valor</th></tr></thead>
          <tbody>
            {kpis.map(kpi => (
              <tr key={kpi.label}><td>{kpi.label}</td><td className="text-right font-bold">{kpi.value}</td></tr>
            ))}
          </tbody>
        </table>
        {programDist.length > 0 && (
          <>
            <h3>Distribuci&oacute;n por Programa</h3>
            <table>
              <thead><tr><th>Programa</th><th className="text-right">Cierres</th><th className="text-right">%</th></tr></thead>
              <tbody>
                {programDist.map(p => (
                  <tr key={p.name}><td>{p.name}</td><td className="text-right">{p.count}</td><td className="text-right">{formatPct(p.pct)}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <h3>Cash Semanal</h3>
        <table>
          <thead><tr><th>Semana</th><th className="text-right">Cash</th></tr></thead>
          <tbody>
            {weeklyData.map(w => (
              <tr key={w.label}><td>{w.label}</td><td className="text-right font-bold">{w.cash > 0 ? formatUSD(w.cash) : "—"}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
