"use client";

import { useState } from "react";
import StatusBadge from "@/app/components/StatusBadge";
import { formatUSD } from "@/lib/data";
import type { Cuota } from "@/lib/types";

type FilterTab = "Todas" | "Pendientes" | "Vencidas" | "Próximas" | "Pagadas";

const TABS: FilterTab[] = ["Todas", "Pendientes", "Vencidas", "Próximas", "Pagadas"];

const TAB_ESTADO: Record<FilterTab, Cuota["estado"] | null> = {
  Todas: null,
  Pendientes: "pendiente",
  Vencidas: "vencida",
  Próximas: "próxima",
  Pagadas: "pagada",
};

export default function CuotasClient({ cuotas }: { cuotas: Cuota[] }) {
  const [activeTab, setActiveTab] = useState<FilterTab>("Todas");

  const filtered =
    activeTab === "Todas"
      ? cuotas
      : cuotas.filter(c => c.estado === TAB_ESTADO[activeTab]);

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-purple/15 text-purple-light"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#111113] border-b border-card-border text-left">
                <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider">Alumno</th>
                <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider">Programa</th>
                <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider">Cuota</th>
                <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-right">Monto</th>
                <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider">F. Vencimiento</th>
                <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider">Closer</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted text-sm">
                    Sin cuotas para este filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((c, i) => (
                  <tr key={i} className="border-b border-card-border hover:bg-[#1f1f23] transition-colors">
                    <td className="px-4 py-3 font-medium">{c.alumno || "-"}</td>
                    <td className="px-4 py-3 text-muted">{c.programa || "-"}</td>
                    <td className="px-4 py-3 text-muted font-mono">{c.cuotaNum}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatUSD(c.monto)}</td>
                    <td className="px-4 py-3 text-muted">{c.fechaVencimiento || "-"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.estado} />
                    </td>
                    <td className="px-4 py-3 text-muted">{c.closer || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
