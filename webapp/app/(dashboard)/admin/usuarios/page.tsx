"use client";

import { useState } from "react";
import { TEAM } from "@/lib/constants";

const PINS: Record<string, string> = {
  "Valentino": "1234",
  "Agustín": "1234",
  "Juan Martín": "1234",
  "Guille": "1234",
  "Juanma": "0000",
  "Fran": "0000",
};

function RoleBadge({ role }: { role: "admin" | "closer" | "setter" }) {
  const styles = {
    admin: "bg-purple/15 text-purple-light",
    closer: "bg-green/15 text-green",
    setter: "bg-yellow/15 text-yellow",
  };

  const labels = {
    admin: "Admin",
    closer: "Closer",
    setter: "Setter",
  };

  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${styles[role]}`}>
      {labels[role]}
    </span>
  );
}

function PINDisplay({ nombre }: { nombre: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const pin = PINS[nombre];

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm">
        {isVisible ? pin : "••••"}
      </span>
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="text-muted hover:text-foreground transition-colors p-1"
        title={isVisible ? "Ocultar PIN" : "Mostrar PIN"}
      >
        {isVisible ? "👁️" : "👁️‍🗨️"}
      </button>
    </div>
  );
}

export default function UsuariosPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Administrar Equipo</h2>
        <p className="text-muted text-sm">Para editar usuarios, contactá al administrador del sistema</p>
      </div>

      {/* Team table */}
      <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-card-border bg-card-bg/50">
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Roles</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">PIN</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody>
            {TEAM.map((member, idx) => (
              <tr
                key={member.nombre}
                className={`border-b border-card-border/50 hover:bg-card-bg/70 transition-colors ${
                  idx === TEAM.length - 1 ? "border-b-0" : ""
                }`}
              >
                <td className="px-6 py-4 font-medium text-foreground">{member.nombre}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {member.roles.map(role => (
                      <RoleBadge key={role} role={role} />
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <PINDisplay nombre={member.nombre} />
                </td>
                <td className="px-6 py-4">
                  <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-green/15 text-green">
                    Activo
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
