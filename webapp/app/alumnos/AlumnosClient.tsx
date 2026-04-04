"use client";

import { useState } from "react";
import StatusBadge from "@/app/components/StatusBadge";
import type { Alumno } from "@/lib/types";

type FilterTab = "Todos" | "Activo" | "Por vencer" | "Vencido";

const TABS: FilterTab[] = ["Todos", "Activo", "Por vencer", "Vencido"];

function DiasRestantesBadge({ dias, estado }: { dias: number; estado: Alumno["estado"] }) {
  if (estado === "Vencido") {
    return (
      <span className="text-muted line-through text-sm">
        0
      </span>
    );
  }
  if (dias > 15) {
    return <span className="text-green font-medium">{dias}</span>;
  }
  if (dias >= 7) {
    return <span className="text-yellow font-medium">{dias}</span>;
  }
  return <span className="text-red font-medium">{dias}</span>;
}

export default function AlumnosClient({ alumnos }: { alumnos: Alumno[] }) {
  const [activeTab, setActiveTab] = useState<FilterTab>("Todos");

  const filtered =
    activeTab === "Todos"
      ? alumnos
      : alumnos.filter(a => a.estado === activeTab);

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
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
                <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider">Programa</th>
                <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider">Closer</th>
                <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider">Setter</th>
                <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider">F. Onboarding</th>
                <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider">F. Vencimiento</th>
                <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-right">Días Restantes</th>
                <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider">Renovado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted text-sm">
                    Sin alumnos para este filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((a, i) => (
                  <tr key={i} className="border-b border-card-border hover:bg-[#1f1f23] transition-colors">
                    <td className="px-4 py-3 font-medium">{a.nombre || "-"}</td>
                    <td className="px-4 py-3 text-muted">{a.programa || "-"}</td>
                    <td className="px-4 py-3 text-muted">{a.closer || "-"}</td>
                    <td className="px-4 py-3 text-muted">{a.setter || "-"}</td>
                    <td className="px-4 py-3 text-muted">{a.fechaPrimerPago || "-"}</td>
                    <td className="px-4 py-3 text-muted">{a.fechaVencimiento || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <DiasRestantesBadge dias={a.diasRestantes} estado={a.estado} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.estado} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${
                        a.renovado === "Sí"
                          ? "text-green"
                          : a.renovado === "No"
                          ? "text-red"
                          : "text-muted"
                      }`}>
                        {a.renovado}
                      </span>
                    </td>
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
