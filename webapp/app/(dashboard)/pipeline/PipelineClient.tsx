"use client";
import { useState, useMemo } from "react";
import { Llamada, Seguimiento, AuthSession } from "@/lib/types";
import { isCerrado, calculateLeadScore, formatUSD } from "@/lib/data";
import { TEAM } from "@/lib/constants";

interface Props {
  llamadas: Llamada[];
  seguimientos: Seguimiento[];
  session: AuthSession;
  isAdmin: boolean;
}

const SCORE_COLORS: Record<string, string> = {
  "A+": "bg-green/20 text-green border-green/30",
  "A": "bg-green/15 text-green border-green/20",
  "B": "bg-yellow/15 text-yellow border-yellow/20",
  "C": "bg-orange-400/15 text-orange-400 border-orange-400/20",
  "D": "bg-red/15 text-red border-red/20",
};

function LeadScoreBadge({ score }: { score: string }) {
  const color = SCORE_COLORS[score] || "bg-muted/15 text-muted border-muted/20";
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${color}`}>
      {score}
    </span>
  );
}

function daysSince(dateStr: string): number {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

type Column = {
  key: string;
  title: string;
  emoji: string;
  headerColor: string;
  borderColor: string;
};

const COLUMNS: Column[] = [
  { key: "pendiente", title: "Pendiente", emoji: "⏳", headerColor: "bg-purple/20 text-purple-light", borderColor: "border-purple/30" },
  { key: "seguimiento", title: "Seguimiento", emoji: "🔄", headerColor: "bg-yellow/20 text-yellow", borderColor: "border-yellow/30" },
  { key: "cerrado", title: "Cerrado", emoji: "🚀", headerColor: "bg-green/20 text-green", borderColor: "border-green/30" },
  { key: "perdido", title: "Perdido", emoji: "❌", headerColor: "bg-red/20 text-red", borderColor: "border-red/30" },
];

function classifyLead(l: Llamada): string {
  const estado = l.estado.toLowerCase();
  if (isCerrado(l)) return "cerrado";
  if (estado.includes("no cierre") || estado.includes("cancelada") || estado.includes("no-show")) return "perdido";
  if (estado.includes("seguimiento") || estado.includes("re-programada") || estado.includes("reserva")) return "seguimiento";
  return "pendiente";
}

export default function PipelineClient({ llamadas, seguimientos, session, isAdmin }: Props) {
  const [selectedLead, setSelectedLead] = useState<Llamada | null>(null);
  const [closerFilter, setCloserFilter] = useState<string>("Todos");

  const closers = useMemo(() => {
    const names = new Set(llamadas.map((l) => l.closer).filter(Boolean));
    return ["Todos", ...Array.from(names).sort()];
  }, [llamadas]);

  const filtered = useMemo(() => {
    if (!isAdmin || closerFilter === "Todos") return llamadas;
    return llamadas.filter((l) => l.closer === closerFilter);
  }, [llamadas, closerFilter, isAdmin]);

  const buckets = useMemo(() => {
    const map: Record<string, Llamada[]> = { pendiente: [], seguimiento: [], cerrado: [], perdido: [] };
    for (const l of filtered) {
      const key = classifyLead(l);
      map[key].push(l);
    }
    return map;
  }, [filtered]);

  // Build map of last seguimiento date per lead
  const lastSeguimientoMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of seguimientos) {
      const current = map.get(s.lead);
      if (!current || s.fecha > current) {
        map.set(s.lead, s.fecha);
      }
    }
    return map;
  }, [seguimientos]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">{isAdmin ? "Pipeline" : "Mi Pipeline"}</h1>
          <p className="text-sm text-muted">{filtered.length} leads en total</p>
        </div>
        {isAdmin && (
          <select
            value={closerFilter}
            onChange={(e) => setCloserFilter(e.target.value)}
            className="bg-card-bg border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple"
          >
            {closers.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const items = buckets[col.key];
          return (
            <div key={col.key} className="flex flex-col">
              {/* Column Header */}
              <div className={`rounded-t-lg px-3 py-2 ${col.headerColor} border ${col.borderColor} border-b-0`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {col.emoji} {col.title}
                  </span>
                  <span className="text-xs font-mono opacity-80">{items.length}</span>
                </div>
              </div>

              {/* Cards Container */}
              <div className={`flex-1 border ${col.borderColor} border-t-0 rounded-b-lg bg-card-bg/30 p-2 space-y-2 max-h-[70vh] overflow-y-auto`}>
                {items.length === 0 && (
                  <p className="text-xs text-muted text-center py-6">Sin leads</p>
                )}
                {items.map((l) => {
                  const score = calculateLeadScore(l);
                  return (
                    <button
                      key={l.rowIndex}
                      onClick={() => setSelectedLead(l)}
                      className="w-full text-left bg-[#0d0d0f] border border-card-border rounded-lg p-3 hover:border-purple/40 hover:bg-[#111113] transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm truncate">{l.nombre || "Sin nombre"}</p>
                        <LeadScoreBadge score={score} />
                      </div>

                      {/* Column-specific info */}
                      {col.key === "pendiente" && l.fechaAgenda && (
                        <p className="text-xs text-muted mt-1.5">
                          📅 {l.fechaAgenda}
                        </p>
                      )}

                      {col.key === "seguimiento" && (
                        <div className="mt-1.5">
                          {(() => {
                            const lastDate = lastSeguimientoMap.get(l.nombre);
                            const days = lastDate ? daysSince(lastDate) : null;
                            if (days !== null) {
                              return (
                                <p className={`text-xs ${days >= 3 ? "text-red font-medium" : "text-muted"}`}>
                                  {days >= 3 ? "🔴" : "⏰"} {days}d sin contacto
                                </p>
                              );
                            }
                            return <p className="text-xs text-muted">Sin seguimiento registrado</p>;
                          })()}
                        </div>
                      )}

                      {col.key === "cerrado" && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-xs text-green font-medium">{formatUSD(l.cashDia1)}</span>
                          {l.programa && (
                            <span className="text-[10px] text-muted truncate">{l.programa}</span>
                          )}
                        </div>
                      )}

                      {col.key === "perdido" && (
                        <p className="text-xs text-muted/60 mt-1.5">{l.estado}</p>
                      )}

                      {/* Closer tag for admin */}
                      {isAdmin && l.closer && (
                        <p className="text-[10px] text-muted mt-1.5">{l.closer}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lead Detail Panel (placeholder for Task B5) */}
      {selectedLead && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card-bg border-l border-card-border shadow-2xl z-50 overflow-y-auto">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{selectedLead.nombre}</h2>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-muted hover:text-foreground text-xl p-1"
              >
                &times;
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Estado</span>
                <span>{selectedLead.estado}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Closer</span>
                <span>{selectedLead.closer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Setter</span>
                <span>{selectedLead.setter}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Lead Score</span>
                <LeadScoreBadge score={calculateLeadScore(selectedLead)} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Instagram</span>
                <span>{selectedLead.instagram || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Cash Día 1</span>
                <span className="text-green">{formatUSD(selectedLead.cashDia1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Programa</span>
                <span>{selectedLead.programa || "—"}</span>
              </div>
              <hr className="border-card-border" />
              <p className="text-xs text-muted text-center py-4">
                Panel completo próximamente (Task B5)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overlay when panel is open */}
      {selectedLead && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}
