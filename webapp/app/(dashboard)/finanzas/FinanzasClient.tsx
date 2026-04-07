"use client";

import { useState, useMemo } from "react";
import { filterByMonth, getCloserStats, getSetterStats, formatUSD, isCerrado } from "@/lib/data";
import { GastosChart } from "@/app/components/Charts";
import MonthSelector from "@/app/components/MonthSelector";
import ExportButton from "@/app/components/ExportButton";
import type { Llamada, Gasto, MonthlyData } from "@/lib/types";

interface FinanzasClientProps {
  llamadas: Llamada[];
  gastos: Gasto[];
  monthlyData: MonthlyData[];
  defaultMonth: string;
  availableMonths: string[];
}

function parseMonth(fecha: string): string {
  const p = fecha?.split("-");
  return p?.length >= 2 ? `${p[0]}-${parseInt(p[1])}` : "";
}

export default function FinanzasClient({
  llamadas,
  gastos,
  monthlyData,
  defaultMonth,
  availableMonths,
}: FinanzasClientProps) {
  const [mes, setMes] = useState(defaultMonth);

  const llamadasMes = useMemo(() => filterByMonth(llamadas, mes), [llamadas, mes]);
  const gastosMes = useMemo(
    () => gastos.filter((g) => parseMonth(g.fecha) === mes),
    [gastos, mes]
  );

  // Ingresos
  const cashUpfront = useMemo(
    () =>
      llamadasMes
        .filter((l) => !l.planPago?.toLowerCase().includes("cuota"))
        .reduce((s, l) => s + l.cashDia1, 0),
    [llamadasMes]
  );
  const cashCuotas = useMemo(
    () =>
      llamadasMes
        .filter((l) => l.planPago?.toLowerCase().includes("cuota"))
        .reduce((s, l) => s + l.cashDia1, 0),
    [llamadasMes]
  );
  const totalIngresos = cashUpfront + cashCuotas;

  // Egresos
  const totalGastos = useMemo(
    () => gastosMes.reduce((s, g) => s + g.monto, 0),
    [gastosMes]
  );
  const closerStats = useMemo(() => getCloserStats(llamadas, mes), [llamadas, mes]);
  const setterStats = useMemo(() => getSetterStats(llamadas, mes), [llamadas, mes]);
  const totalComisionesClosers = closerStats.reduce((s, c) => s + c.comision, 0);
  const totalComisionesSetters = setterStats.reduce((s, c) => s + c.comision, 0);
  const totalEgresos = totalGastos + totalComisionesClosers + totalComisionesSetters;

  const resultadoNeto = totalIngresos - totalEgresos;
  const esPositivo = resultadoNeto >= 0;

  // Gastos por categoria
  const byCat = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of gastosMes) {
      const cat = g.categoria || "Sin categoría";
      map.set(cat, (map.get(cat) || 0) + g.monto);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [gastosMes]);

  // Gastos por persona (quién pagó)
  const gastosPorPersona = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const g of gastosMes) {
      const persona = g.pagadoA?.trim() || "Sin asignar";
      if (!map.has(persona)) map.set(persona, { count: 0, total: 0 });
      const p = map.get(persona)!;
      p.count++;
      p.total += g.monto;
    }
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [gastosMes]);

  // Ingresos por receptor (quién recibió la plata)
  const ingresosPorReceptor = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    // From llamadas (cashDia1 de ventas cerradas)
    for (const l of llamadasMes) {
      if (!isCerrado(l) || l.cashDia1 <= 0) continue;
      const receptor = l.quienRecibe?.trim() || "Sin asignar";
      if (!map.has(receptor)) map.set(receptor, { count: 0, total: 0 });
      const r = map.get(receptor)!;
      r.count++;
      r.total += l.cashDia1;
    }
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [llamadasMes]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Finanzas</h2>
        <div className="flex items-center gap-3">
          <ExportButton reportId="finanzas-report" />
          <MonthSelector value={mes} onChange={setMes} availableMonths={availableMonths} />
        </div>
      </div>

      {/* P&L Card */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
        <h3 className="text-base font-semibold mb-5">Estado de Resultados</h3>

        {/* Ingresos */}
        <p className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
          💰 Ingresos
        </p>
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-foreground/80">Cash Collected (upfront)</span>
            <span>{formatUSD(cashUpfront)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/80">Cash Collected (cuotas)</span>
            <span>{formatUSD(cashCuotas)}</span>
          </div>
          <div className="flex justify-between font-bold text-base text-green">
            <span>Total Ingresos</span>
            <span>{formatUSD(totalIngresos)}</span>
          </div>
        </div>

        {/* Egresos */}
        <p className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
          💸 Egresos
        </p>
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-foreground/80">Gastos Operativos</span>
            <span>{formatUSD(totalGastos)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/80">Comisiones Closers</span>
            <span>{formatUSD(totalComisionesClosers)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/80">Comisiones Setters</span>
            <span>{formatUSD(totalComisionesSetters)}</span>
          </div>
          <div className="flex justify-between font-bold text-base text-red">
            <span>Total Egresos</span>
            <span>{formatUSD(totalEgresos)}</span>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-card-border my-4" />

        {/* Resultado Neto */}
        <div className={`flex justify-between text-2xl font-bold ${esPositivo ? "text-green" : "text-red"}`}>
          <span>📊 Resultado Neto</span>
          <span>{formatUSD(resultadoNeto)}</span>
        </div>
      </div>

      {/* Comisiones Detalle por Persona */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
        <h3 className="text-base font-semibold mb-4">Comisiones por Empleado</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {closerStats.map((c) => (
            <div key={c.nombre} className="flex items-center justify-between bg-[#111113] rounded-lg p-3">
              <div>
                <p className="text-sm font-medium">{c.nombre}</p>
                <p className="text-[10px] text-muted">closer · {c.cerradas} ventas · {formatUSD(c.cashCollected)} cash</p>
              </div>
              <p className="text-sm font-bold text-green">{formatUSD(c.comision)}</p>
            </div>
          ))}
          {setterStats.map((s) => (
            <div key={s.nombre} className="flex items-center justify-between bg-[#111113] rounded-lg p-3">
              <div>
                <p className="text-sm font-medium">{s.nombre}</p>
                <p className="text-[10px] text-muted">setter · {s.agendas} agendas · {formatUSD(s.cashDeLeads)} cash</p>
              </div>
              <p className="text-sm font-bold text-yellow">{formatUSD(s.comision)}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm font-bold pt-3 border-t border-card-border">
          <span className="text-muted">Total Comisiones</span>
          <span className="text-purple-light">{formatUSD(totalComisionesClosers + totalComisionesSetters)}</span>
        </div>
      </div>

      {/* Flujo de plata: quién gastó y quién recibió */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Gastos por persona */}
        {gastosPorPersona.length > 0 && (
          <div className="bg-card-bg border border-card-border rounded-xl p-6">
            <h3 className="text-base font-semibold mb-4">💸 Quién gastó</h3>
            <div className="space-y-3">
              {gastosPorPersona.map(([persona, data]) => (
                <div key={persona} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red/10 flex items-center justify-center text-xs font-bold text-red">
                      {persona.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{persona}</p>
                      <p className="text-[10px] text-muted">{data.count} gasto{data.count !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-red">{formatUSD(data.total)}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm font-bold pt-3 mt-3 border-t border-card-border">
              <span className="text-muted">Total</span>
              <span className="text-red">{formatUSD(gastosPorPersona.reduce((s, [, d]) => s + d.total, 0))}</span>
            </div>
          </div>
        )}

        {/* Ingresos por receptor */}
        {ingresosPorReceptor.length > 0 && (
          <div className="bg-card-bg border border-card-border rounded-xl p-6">
            <h3 className="text-base font-semibold mb-4">💰 Quién recibió</h3>
            <div className="space-y-3">
              {ingresosPorReceptor.map(([receptor, data]) => (
                <div key={receptor} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green/10 flex items-center justify-center text-xs font-bold text-green">
                      {receptor.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{receptor}</p>
                      <p className="text-[10px] text-muted">{data.count} pago{data.count !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-green">{formatUSD(data.total)}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm font-bold pt-3 mt-3 border-t border-card-border">
              <span className="text-muted">Total</span>
              <span className="text-green">{formatUSD(ingresosPorReceptor.reduce((s, [, d]) => s + d.total, 0))}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tesorería — Dónde está la plata */}
      {(() => {
        const receptorMap = new Map<string, { count: number; total: number }>();
        for (const l of llamadasMes) {
          if (!isCerrado(l) || l.cashDia1 <= 0) continue;
          const receptor = l.quienRecibe || "Sin asignar";
          if (!receptorMap.has(receptor)) receptorMap.set(receptor, { count: 0, total: 0 });
          const r = receptorMap.get(receptor)!;
          r.count++;
          r.total += l.cashDia1;
        }
        const receptores = Array.from(receptorMap.entries()).sort((a, b) => b[1].total - a[1].total);

        return receptores.length > 0 ? (
          <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
            <h3 className="text-base font-semibold mb-4">💼 Tesorería — Dónde está la plata</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {receptores.map(([nombre, data]) => (
                <div key={nombre} className="bg-[#111113] border border-card-border rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold">{nombre}</p>
                    <p className="text-[10px] text-muted">{data.count} pago{data.count !== 1 ? "s" : ""} recibido{data.count !== 1 ? "s" : ""}</p>
                  </div>
                  <p className="text-lg font-extrabold text-green">{formatUSD(data.total)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* Gastos por Categoría */}
      {byCat.length > 0 && (
        <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
          <h3 className="text-base font-semibold mb-4">Gastos por Categoría</h3>
          <div className="space-y-2">
            {byCat.map(([cat, monto]) => (
              <div key={cat} className="flex justify-between text-sm">
                <span className="text-foreground/80">{cat}</span>
                <span className="font-medium text-red">{formatUSD(monto)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gastos Table */}
      {gastosMes.length > 0 && (
        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-card-border">
            <h3 className="text-base font-semibold">Gastos del Mes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border text-muted text-left text-xs uppercase tracking-wider">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Concepto</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Billetera</th>
                  <th className="px-4 py-3">Pagado A</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {gastosMes.map((g) => (
                  <tr
                    key={g.rowIndex}
                    className="border-b border-card-border/30 hover:bg-[#1f1f23]"
                  >
                    <td className="px-4 py-3 text-muted">{g.fecha || "-"}</td>
                    <td className="px-4 py-3 font-medium">{g.concepto || "-"}</td>
                    <td className="px-4 py-3 text-muted">{g.categoria || "-"}</td>
                    <td className="px-4 py-3 text-muted">{g.billetera || "-"}</td>
                    <td className="px-4 py-3 text-muted">{g.pagadoA || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          g.estado === "Pagado"
                            ? "bg-green/20 text-green"
                            : "bg-yellow/20 text-yellow"
                        }`}
                      >
                        {g.estado || "Pendiente"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-red">
                      {formatUSD(g.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Chart */}
      <GastosChart data={monthlyData} />

      {/* Hidden printable report for PDF export */}
      <div id="finanzas-report" className="hidden">
        <div className="kpi-grid">
          <div className="kpi"><div className="kpi-label">Ingresos</div><div className="kpi-value green">{formatUSD(totalIngresos)}</div></div>
          <div className="kpi"><div className="kpi-label">Egresos</div><div className="kpi-value red">{formatUSD(totalEgresos)}</div></div>
          <div className="kpi"><div className="kpi-label">Resultado Neto</div><div className="kpi-value purple">{formatUSD(resultadoNeto)}</div></div>
          <div className="kpi"><div className="kpi-label">Comisiones</div><div className="kpi-value">{formatUSD(totalComisionesClosers + totalComisionesSetters)}</div></div>
        </div>
        <h3>Comisiones por Empleado</h3>
        <table>
          <thead><tr><th>Nombre</th><th>Rol</th><th>Ventas/Agendas</th><th className="text-right">Cash</th><th className="text-right">Comisi&oacute;n</th></tr></thead>
          <tbody>
            {closerStats.map(c => (
              <tr key={c.nombre}><td>{c.nombre}</td><td>Closer</td><td>{c.cerradas}</td><td className="text-right">{formatUSD(c.cashCollected)}</td><td className="text-right font-bold">{formatUSD(c.comision)}</td></tr>
            ))}
            {setterStats.map(s => (
              <tr key={s.nombre}><td>{s.nombre}</td><td>Setter</td><td>{s.agendas}</td><td className="text-right">{formatUSD(s.cashDeLeads)}</td><td className="text-right font-bold">{formatUSD(s.comision)}</td></tr>
            ))}
          </tbody>
        </table>
        {byCat.length > 0 && (
          <>
            <h3>Gastos por Categor&iacute;a</h3>
            <table>
              <thead><tr><th>Categor&iacute;a</th><th className="text-right">Monto</th></tr></thead>
              <tbody>{byCat.map(([cat, monto]) => <tr key={cat}><td>{cat}</td><td className="text-right">{formatUSD(monto)}</td></tr>)}</tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

