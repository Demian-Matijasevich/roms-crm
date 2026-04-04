"use client";

import { useState, useMemo } from "react";
import type { Llamada } from "@/lib/types";
import StatusBadge from "@/app/components/StatusBadge";
import { formatUSD } from "@/lib/data";
import { ESTADOS_LLAMADA, MONTH_LABELS, TEAM } from "@/lib/constants";
import Link from "next/link";

type SortKey = keyof Pick<Llamada, "nombre" | "fechaLlamada" | "closer" | "setter" | "estado" | "programa" | "cashDia1" | "ticketTotal">;
type SortDir = "asc" | "desc";

interface Props {
  llamadas: Llamada[];
  isAdmin: boolean;
  userName: string;
}

export default function LlamadasClient({ llamadas, isAdmin, userName }: Props) {
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [closerFilter, setCloserFilter] = useState("all");
  const [setterFilter, setSetterFilter] = useState("all");
  const [mesFilter, setMesFilter] = useState("all");
  const [programaFilter, setProgramaFilter] = useState("all");
  const [calificadoFilter, setCalificadoFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("fechaLlamada");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Derive unique filter options from data
  const closers = useMemo(() => Array.from(new Set(llamadas.map(l => l.closer).filter(Boolean))).sort(), [llamadas]);
  const setters = useMemo(() => Array.from(new Set(llamadas.map(l => l.setter).filter(Boolean))).sort(), [llamadas]);
  const programas = useMemo(() => Array.from(new Set(llamadas.map(l => l.programa).filter(Boolean))).sort(), [llamadas]);
  const meses = useMemo(() => {
    const unique = Array.from(new Set(llamadas.map(l => l.mes).filter(Boolean)));
    return unique.sort((a, b) => b.localeCompare(a));
  }, [llamadas]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleRow(rowIndex: number) {
    setExpandedRow(prev => prev === rowIndex ? null : rowIndex);
  }

  const filtered = useMemo(() => {
    let data = llamadas;

    // Role filter: non-admins only see their own calls
    if (!isAdmin) {
      data = data.filter(l => 
        l.closer?.toLowerCase().includes(userName.toLowerCase()) || 
        l.setter?.toLowerCase().includes(userName.toLowerCase())
      );
    }

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(l =>
        l.nombre?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.instagram?.toLowerCase().includes(q)
      );
    }

    if (estadoFilter !== "all") data = data.filter(l => l.estado === estadoFilter);
    if (closerFilter !== "all") data = data.filter(l => l.closer === closerFilter);
    if (setterFilter !== "all") data = data.filter(l => l.setter === setterFilter);
    if (mesFilter !== "all") data = data.filter(l => l.mes === mesFilter);
    if (programaFilter !== "all") data = data.filter(l => l.programa === programaFilter);
    if (calificadoFilter !== "all") data = data.filter(l => l.calificado === calificadoFilter);

    return [...data].sort((a, b) => {
      const aVal = a[sortKey] ?? "";
      const bVal = b[sortKey] ?? "";
      const cmp = typeof aVal === "number" && typeof bVal === "number"
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [llamadas, isAdmin, userName, search, estadoFilter, closerFilter, setterFilter, mesFilter, programaFilter, calificadoFilter, sortKey, sortDir]);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 text-muted/40">↕</span>;
    return <span className="ml-1 text-purple-light">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const selectClass = "bg-card-bg border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple";

  return (
    <div>
      {/* Search */}
      <div className="flex gap-3 mb-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
          <input
            type="text"
            placeholder="Buscar por nombre, email o Instagram..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-card-bg border border-card-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-purple"
          />
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)} className={selectClass}>
          <option value="all">Todos los estados</option>
          {ESTADOS_LLAMADA.map(e => <option key={e} value={e}>{e}</option>)}
        </select>

        <select value={closerFilter} onChange={e => setCloserFilter(e.target.value)} className={selectClass}>
          <option value="all">Todos los closers</option>
          {closers.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={setterFilter} onChange={e => setSetterFilter(e.target.value)} className={selectClass}>
          <option value="all">Todos los setters</option>
          {setters.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={mesFilter} onChange={e => setMesFilter(e.target.value)} className={selectClass}>
          <option value="all">Todos los meses</option>
          {meses.map(m => <option key={m} value={m}>{MONTH_LABELS[m] ?? m}</option>)}
        </select>

        <select value={programaFilter} onChange={e => setProgramaFilter(e.target.value)} className={selectClass}>
          <option value="all">Todos los programas</option>
          {programas.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select value={calificadoFilter} onChange={e => setCalificadoFilter(e.target.value)} className={selectClass}>
          <option value="all">Calificado: todos</option>
          <option value="Sí">Calificado: Sí</option>
          <option value="No">Calificado: No</option>
        </select>
      </div>

      <p className="text-xs text-muted mb-3">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</p>

      {/* Table */}
      <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#111113] border-b border-card-border text-left">
                {(
                  [
                    { label: "Nombre", key: "nombre" as SortKey },
                    { label: "Instagram", key: null },
                    { label: "Fecha", key: "fechaLlamada" as SortKey },
                    { label: "Closer", key: "closer" as SortKey },
                    { label: "Setter", key: "setter" as SortKey },
                    { label: "Estado", key: "estado" as SortKey },
                    { label: "Programa", key: "programa" as SortKey },
                    { label: "Plan Pago", key: null },
                    { label: "Cash Día 1", key: "cashDia1" as SortKey },
                    { label: "Ticket Total", key: "ticketTotal" as SortKey },
                    { label: "Saldo", key: null },
                  ] as { label: string; key: SortKey | null }[]
                ).map(col => (
                  <th
                    key={col.label}
                    onClick={() => col.key && handleSort(col.key)}
                    className={`px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium whitespace-nowrap ${col.key ? "cursor-pointer hover:text-foreground select-none" : ""}`}
                  >
                    {col.label}
                    {col.key && <SortIcon col={col.key} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-muted text-sm">
                    Sin resultados para los filtros aplicados.
                  </td>
                </tr>
              )}
              {filtered.map(l => (
                <>
                  <tr
                    key={l.rowIndex}
                    onClick={() => toggleRow(l.rowIndex)}
                    className="border-b border-card-border hover:bg-[#1a1a1e] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{l.nombre || "-"}</td>
                    <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">{l.instagram || "-"}</td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">{l.fechaLlamada || "-"}</td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">{l.closer || "-"}</td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">{l.setter || "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={l.estado || "Pendiente"} />
                    </td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">{l.programa || "-"}</td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap text-xs">
                      {l.planPago ? (
                        <span className={`px-2 py-0.5 rounded-md border ${
                          l.planPago.toLowerCase().includes("cuota")
                            ? "bg-yellow/10 border-yellow/30 text-yellow"
                            : "bg-green/10 border-green/30 text-green"
                        }`}>{l.planPago}</span>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green whitespace-nowrap">
                      {l.cashDia1 ? formatUSD(l.cashDia1) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                      {l.ticketTotal ? formatUSD(l.ticketTotal) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {l.saldoPendiente > 0 ? (
                        <span className="text-yellow font-medium">{formatUSD(l.saldoPendiente)}</span>
                      ) : l.saldoPendiente === 0 && l.cashDia1 > 0 ? (
                        <span className="text-green text-xs">Pagado</span>
                      ) : "-"}
                    </td>
                  </tr>

                  {expandedRow === l.rowIndex && (
                    <tr key={`${l.rowIndex}-expanded`} className="bg-[#0f0f12] border-b border-card-border">
                      <td colSpan={11} className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">

                          {/* Contact */}
                          <div className="space-y-1">
                            <p className="text-xs text-muted uppercase tracking-wider font-medium mb-2">Contacto</p>
                            <Detail label="Email" value={l.email} />
                            <Detail label="Teléfono" value={l.telefono} />
                            <Detail label="Fuente" value={l.fuente} />
                            <Detail label="Medio Agenda" value={l.medioAgenda} />
                          </div>

                          {/* Contexto */}
                          <div className="space-y-1 col-span-2">
                            <p className="text-xs text-muted uppercase tracking-wider font-medium mb-2">Contextos</p>
                            {l.contextoSetter && (
                              <div>
                                <span className="text-xs text-muted">Setter: </span>
                                <span className="text-foreground">{l.contextoSetter}</span>
                              </div>
                            )}
                            {l.contextoCloser && (
                              <div>
                                <span className="text-xs text-muted">Closer: </span>
                                <span className="text-foreground">{l.contextoCloser}</span>
                              </div>
                            )}
                            {!l.contextoSetter && !l.contextoCloser && (
                              <span className="text-muted">Sin contexto</span>
                            )}
                          </div>

                          {/* Pagos */}
                          <div className="space-y-1">
                            <p className="text-xs text-muted uppercase tracking-wider font-medium mb-2">Pagos</p>
                            <Detail label="Plan Pago" value={l.planPago} />
                            <Detail label="Método Pago" value={l.metodoPago} />
                            <Detail label="Saldo Pendiente" value={l.saldoPendiente ? formatUSD(l.saldoPendiente) : undefined} />
                            {l.pago1 ? (
                              <div className="flex items-center gap-2">
                                <span className="text-muted">Pago 1:</span>
                                <span>{formatUSD(l.pago1)}</span>
                                {l.estadoPago1 && <StatusBadge status={l.estadoPago1} />}
                              </div>
                            ) : null}
                            {l.pago2 ? (
                              <div className="flex items-center gap-2">
                                <span className="text-muted">Pago 2:</span>
                                <span>{formatUSD(l.pago2)}</span>
                                {l.estadoPago2 && <StatusBadge status={l.estadoPago2} />}
                              </div>
                            ) : null}
                            {l.pago3 ? (
                              <div className="flex items-center gap-2">
                                <span className="text-muted">Pago 3:</span>
                                <span>{formatUSD(l.pago3)}</span>
                                {l.estadoPago3 && <StatusBadge status={l.estadoPago3} />}
                              </div>
                            ) : null}
                          </div>

                          {/* Extra */}
                          <div className="space-y-1">
                            <p className="text-xs text-muted uppercase tracking-wider font-medium mb-2">Detalles</p>
                            <Detail label="Fecha Agenda" value={l.fechaAgenda} />
                            <Detail label="Fecha Pago 1" value={l.fechaPago1} />
                            <Detail label="Se Presentó" value={l.sePresentó} />
                            <Detail label="Calificado" value={l.calificado} />
                            <Detail label="Cash Total" value={l.cashTotal ? formatUSD(l.cashTotal) : undefined} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-[#111113] border-t border-card-border font-bold">
                  <td className="px-4 py-3 text-xs uppercase text-muted" colSpan={8}>Totales ({filtered.length})</td>
                  <td className="px-4 py-3 text-right text-green">
                    {formatUSD(filtered.reduce((s, l) => s + l.cashDia1, 0))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatUSD(filtered.reduce((s, l) => s + l.ticketTotal, 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-yellow">
                    {formatUSD(filtered.reduce((s, l) => s + l.saldoPendiente, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-muted">{label}: </span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
