"use client";

import { useState, useMemo } from "react";
import type { Llamada, Gasto } from "@/lib/types";

interface Props {
  llamadas: Llamada[];
  gastos: Gasto[];
}

interface DayData {
  cash: number;
  calls: number;
  cuotasVencidas: number;
  sales: Llamada[];
  scheduledCalls: Llamada[];
  cuotasList: { nombre: string; cuota: string; monto: number; estado: string }[];
}

const DAYS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizeDate(raw: string): string {
  if (!raw) return "";
  // Handle dd/mm/yyyy
  if (raw.includes("/")) {
    const parts = raw.split("/");
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${y.length === 2 ? "20" + y : y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }
  // Handle yyyy-m-d or yyyy-mm-dd
  if (raw.includes("-")) {
    const parts = raw.split("-");
    if (parts.length === 3) {
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    }
  }
  return raw;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

function formatCurrency(n: number): string {
  if (n >= 1000) return "$" + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k";
  return "$" + n.toLocaleString("es-AR");
}

export default function CalendarioClient({ llamadas, gastos }: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const todayStr = formatDate(new Date());

  // Precompute day data for the visible month
  const dayDataMap = useMemo(() => {
    const map: Record<string, DayData> = {};

    function ensure(key: string): DayData {
      if (!map[key]) {
        map[key] = { cash: 0, calls: 0, cuotasVencidas: 0, sales: [], scheduledCalls: [], cuotasList: [] };
      }
      return map[key];
    }

    for (const l of llamadas) {
      const fechaLlamada = normalizeDate(l.fechaLlamada);
      const fechaAgenda = normalizeDate(l.fechaAgenda);
      const isCerrado = l.estado?.toLowerCase() === "cerrado" || l.estado?.toLowerCase() === "cerrada";
      const isCancelled = l.estado?.toLowerCase() === "cancelada" || l.estado?.toLowerCase() === "cancelado";

      // Cash on day of sale
      if (isCerrado && l.cashDia1 > 0) {
        const cashDate = fechaLlamada || fechaAgenda;
        if (cashDate) {
          const d = ensure(cashDate);
          d.cash += l.cashDia1;
          d.sales.push(l);
        }
      }

      // Scheduled calls (not cerrado, not cancelled) — use fechaLlamada first
      const callDate = fechaLlamada || fechaAgenda;
      if (callDate && !isCerrado && !isCancelled) {
        const d = ensure(callDate);
        d.calls += 1;
        d.scheduledCalls.push(l);
      }

      // Installment tracking - cuota 2 (fechaPago2) and cuota 3 (fechaPago3)
      // Also check derived dates from fechaPago1 +30/+60 if specific dates not set
      const fechaPago1 = normalizeDate(l.fechaPago1);
      const fechaPago2 = normalizeDate(l.fechaPago2);
      const fechaPago3 = normalizeDate(l.fechaPago3);

      if (l.pago2 > 0 && l.estadoPago2?.toLowerCase() !== "pagada" && l.estadoPago2?.toLowerCase() !== "pagado") {
        const cuota2Date = fechaPago2 || (fechaPago1 ? addDays(fechaPago1, 30) : "");
        if (cuota2Date) {
          const d = ensure(cuota2Date);
          d.cuotasVencidas += 1;
          d.cuotasList.push({
            nombre: l.nombre,
            cuota: "Cuota 2",
            monto: l.pago2,
            estado: l.estadoPago2 || "pendiente",
          });
        }
      }

      if (l.pago3 > 0 && l.estadoPago3?.toLowerCase() !== "pagada" && l.estadoPago3?.toLowerCase() !== "pagado") {
        const cuota3Date = fechaPago3 || (fechaPago1 ? addDays(fechaPago1, 60) : "");
        if (cuota3Date) {
          const d = ensure(cuota3Date);
          d.cuotasVencidas += 1;
          d.cuotasList.push({
            nombre: l.nombre,
            cuota: "Cuota 3",
            monto: l.pago3,
            estado: l.estadoPago3 || "pendiente",
          });
        }
      }
    }

    return map;
  }, [llamadas]);

  // Calendar grid
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Monday = 0, Sunday = 6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  const monthLabel = firstDay.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  function prevMonth() {
    setCurrentMonth(new Date(year, month - 1, 1));
    setSelectedDay(null);
  }
  function nextMonth() {
    setCurrentMonth(new Date(year, month + 1, 1));
    setSelectedDay(null);
  }
  function goToday() {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(formatDate(now));
  }

  function getDayStr(day: number): string {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const selectedData = selectedDay ? dayDataMap[selectedDay] : null;

  // Monthly totals
  const monthTotals = useMemo(() => {
    let cash = 0, calls = 0, cuotas = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = getDayStr(d);
      const data = dayDataMap[key];
      if (data) {
        cash += data.cash;
        calls += data.calls;
        cuotas += data.cuotasVencidas;
      }
    }
    return { cash, calls, cuotas };
  }, [dayDataMap, daysInMonth, month, year]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">Calendario Financiero</h1>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="px-3 py-1.5 rounded-lg bg-card border border-card-border text-sm hover:bg-[#1f1f23] transition-colors">
            &larr;
          </button>
          <span className="text-sm font-medium capitalize min-w-[160px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="px-3 py-1.5 rounded-lg bg-card border border-card-border text-sm hover:bg-[#1f1f23] transition-colors">
            &rarr;
          </button>
          <button onClick={goToday} className="px-3 py-1.5 rounded-lg bg-purple/20 text-purple-light text-sm font-medium hover:bg-purple/30 transition-colors ml-2">
            Hoy
          </button>
        </div>
      </div>

      {/* Monthly summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-card-border rounded-xl p-3">
          <p className="text-xs text-muted">Cash del mes</p>
          <p className="text-lg font-bold text-green">${monthTotals.cash.toLocaleString("es-AR")}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-3">
          <p className="text-xs text-muted">Llamadas agendadas</p>
          <p className="text-lg font-bold text-purple-light">{monthTotals.calls}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-3">
          <p className="text-xs text-muted">Cuotas pendientes</p>
          <p className="text-lg font-bold text-red">{monthTotals.cuotas}</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green inline-block" /> Cash</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple inline-block" /> Llamadas</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red inline-block" /> Cuotas</span>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-7 border-b border-card-border">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs text-muted py-2 font-medium">{d}</div>
          ))}
        </div>

        {/* Day rows */}
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-7 border-b border-card-border last:border-b-0">
            {row.map((day, ci) => {
              if (day === null) {
                return <div key={ci} className="min-h-[80px] sm:min-h-[100px] bg-[#0a0a0c]/50" />;
              }

              const dayStr = getDayStr(day);
              const isToday = dayStr === todayStr;
              const isSelected = dayStr === selectedDay;
              const data = dayDataMap[dayStr];

              return (
                <button
                  key={ci}
                  onClick={() => setSelectedDay(isSelected ? null : dayStr)}
                  className={`min-h-[80px] sm:min-h-[100px] p-1.5 sm:p-2 text-left transition-colors relative flex flex-col
                    ${isSelected ? "bg-purple/10" : "hover:bg-[#1a1a1e]"}
                    ${ci < 6 ? "border-r border-card-border" : ""}
                  `}
                >
                  <span className={`text-xs sm:text-sm font-medium inline-flex items-center justify-center w-6 h-6 rounded-full
                    ${isToday ? "bg-purple text-white" : "text-foreground"}
                  `}>
                    {day}
                  </span>

                  {data && (
                    <div className="mt-1 space-y-0.5 flex-1">
                      {data.cash > 0 && (
                        <div className="text-[10px] sm:text-xs bg-green/15 text-green rounded px-1 py-0.5 truncate font-medium">
                          {formatCurrency(data.cash)}
                        </div>
                      )}
                      {data.calls > 0 && (
                        <div className="text-[10px] sm:text-xs bg-purple/15 text-purple-light rounded px-1 py-0.5 truncate">
                          {data.calls} call{data.calls > 1 ? "s" : ""}
                        </div>
                      )}
                      {data.cuotasVencidas > 0 && (
                        <div className="text-[10px] sm:text-xs bg-red/15 text-red rounded px-1 py-0.5 truncate">
                          {data.cuotasVencidas} cuota{data.cuotasVencidas > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {selectedDay && (
        <div className="bg-card border border-card-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">
              Detalle: {new Date(selectedDay + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
            </h2>
            <button onClick={() => setSelectedDay(null)} className="text-muted hover:text-foreground text-sm">&times;</button>
          </div>

          {!selectedData ? (
            <p className="text-sm text-muted">Sin actividad este dia.</p>
          ) : (
            <>
              {/* Sales */}
              {selectedData.sales.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-green mb-2 uppercase tracking-wider">Ventas ({selectedData.sales.length})</h3>
                  <div className="space-y-1.5">
                    {selectedData.sales.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-green/5 rounded-lg px-3 py-2">
                        <div>
                          <span className="font-medium">{s.nombre}</span>
                          <span className="text-muted ml-2 text-xs">{s.programa}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-green font-semibold">${s.cashDia1.toLocaleString("es-AR")}</span>
                          <span className="text-muted ml-2 text-xs">{s.closer}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scheduled Calls */}
              {selectedData.scheduledCalls.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-purple-light mb-2 uppercase tracking-wider">Llamadas agendadas ({selectedData.scheduledCalls.length})</h3>
                  <div className="space-y-1.5">
                    {selectedData.scheduledCalls.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-purple/5 rounded-lg px-3 py-2">
                        <div>
                          <span className="font-medium">{c.nombre}</span>
                          <span className="text-muted ml-2 text-xs">@{c.instagram}</span>
                        </div>
                        <div className="text-right text-xs text-muted">
                          <span>{c.closer || c.setter}</span>
                          {c.programa && <span className="ml-2">{c.programa}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cuotas */}
              {selectedData.cuotasList.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-red mb-2 uppercase tracking-wider">Cuotas pendientes ({selectedData.cuotasList.length})</h3>
                  <div className="space-y-1.5">
                    {selectedData.cuotasList.map((q, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-red/5 rounded-lg px-3 py-2">
                        <span className="font-medium">{q.nombre}</span>
                        <div className="text-right">
                          <span className="text-red font-semibold">${q.monto.toLocaleString("es-AR")}</span>
                          <span className="text-muted ml-2 text-xs">{q.cuota}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
