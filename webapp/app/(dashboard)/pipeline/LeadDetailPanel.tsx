"use client";

import { useState } from "react";
import type { Llamada, Seguimiento } from "@/lib/types";
import { calculateLeadScore, formatUSD } from "@/lib/data";

interface Props {
  lead: Llamada;
  seguimientos: Seguimiento[];
  onClose: () => void;
}

const SCORE_COLORS: Record<string, string> = {
  "A+": "bg-green/20 text-green border-green/30",
  A: "bg-green/15 text-green border-green/20",
  B: "bg-yellow/15 text-yellow border-yellow/20",
  C: "bg-orange-400/15 text-orange-400 border-orange-400/20",
  D: "bg-red/15 text-red border-red/20",
};

const TYPE_DOTS: Record<string, string> = {
  llamada: "bg-purple",
  seguimiento: "bg-yellow",
  cierre: "bg-green",
};

function daysSince(dateStr: string): number {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export default function LeadDetailPanel({ lead, seguimientos, onClose }: Props) {
  const score = calculateLeadScore(lead);
  const scoreColor = SCORE_COLORS[score] || "bg-muted/15 text-muted border-muted/20";

  const sorted = [...seguimientos].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  const lastEntry = sorted[0];
  const daysSinceLastEntry = lastEntry ? daysSince(lastEntry.fecha) : null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card-bg border-l border-card-border shadow-2xl z-50 overflow-y-auto">
        <div className="p-5 space-y-5">

          {/* 1. Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">{lead.nombre || "Sin nombre"}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs bg-purple/15 text-purple-light border border-purple/20 px-2 py-0.5 rounded">
                  {lead.estado}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${scoreColor}`}>
                  {score}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted hover:text-foreground text-2xl leading-none p-1 shrink-0"
            >
              &times;
            </button>
          </div>

          {/* 2. Contact info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted text-xs mb-0.5">Instagram</p>
              <p className="truncate">
                {lead.instagram ? `@${lead.instagram.replace(/^@/, "")}` : "---"}
              </p>
            </div>
            <div>
              <p className="text-muted text-xs mb-0.5">Email</p>
              <p className="truncate">{lead.email || "---"}</p>
            </div>
            <div>
              <p className="text-muted text-xs mb-0.5">Telefono</p>
              <p className="truncate">{lead.telefono || "---"}</p>
            </div>
            <div>
              <p className="text-muted text-xs mb-0.5">Closer / Setter</p>
              <p className="truncate">
                {lead.closer || "---"} / {lead.setter || "---"}
              </p>
            </div>
          </div>

          {/* 3. Calendly Responses */}
          <div className="bg-[#111113] rounded-lg border border-card-border p-4 space-y-3">
            <h3 className="text-sm font-semibold text-muted">Respuestas Calendly</h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-muted text-xs">Modelo de negocio</p>
                <p>{lead.modeloNegocio || "---"}</p>
              </div>
              <div>
                <p className="text-muted text-xs">Objetivo 6 meses</p>
                <p>{lead.objetivo6Meses || "---"}</p>
              </div>
              <div>
                <p className="text-muted text-xs">Capacidad de inversion</p>
                <p>{lead.capacidadInversion || "---"}</p>
              </div>
              <div>
                <p className="text-muted text-xs">Desde donde se agendo</p>
                <p>{lead.desdeDonde || "---"}</p>
              </div>
            </div>
          </div>

          {/* 4. Timeline */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Historial de seguimiento</h3>

            {sorted.length === 0 ? (
              <p className="text-sm text-muted py-4 text-center">
                Sin historial de seguimiento
              </p>
            ) : (
              <div className="border-l-2 border-[#27272a] pl-4 space-y-4">
                {sorted.map((s) => {
                  const tipoKey = s.tipo.toLowerCase();
                  const dotColor =
                    TYPE_DOTS[tipoKey] ||
                    (tipoKey.includes("llamada")
                      ? "bg-purple"
                      : tipoKey.includes("cierre")
                      ? "bg-green"
                      : "bg-yellow");

                  return (
                    <div key={s.rowIndex} className="relative">
                      {/* Dot */}
                      <span
                        className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full ${dotColor}`}
                      />
                      <div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted">{s.fecha}</span>
                          <span className="text-foreground font-medium">{s.tipo}</span>
                        </div>
                        {s.nota && (
                          <p className="text-sm mt-0.5">{s.nota}</p>
                        )}
                        {s.closer && (
                          <p className="text-[10px] text-muted mt-0.5">{s.closer}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Alert if 3+ days since last entry */}
            {daysSinceLastEntry !== null && daysSinceLastEntry >= 3 && (
              <p className="text-red text-xs font-medium mt-3">
                Hace {daysSinceLastEntry} dias sin contacto
              </p>
            )}
          </div>

          {/* 5. Quick actions */}
          <div className="flex gap-2 pt-2">
            <a
              href="/pipeline"
              className="flex-1 text-center text-sm font-medium bg-purple hover:bg-purple/80 text-white px-3 py-2 rounded-lg transition-colors"
            >
              Agregar nota
            </a>
            <a
              href="/form/llamada"
              className="flex-1 text-center text-sm font-medium border border-green text-green hover:bg-green/10 px-3 py-2 rounded-lg transition-colors"
            >
              Cargar resultado
            </a>
            <button
              className="text-xs text-red border border-red/30 hover:bg-red/10 px-3 py-2 rounded-lg transition-colors"
            >
              Descartar
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
