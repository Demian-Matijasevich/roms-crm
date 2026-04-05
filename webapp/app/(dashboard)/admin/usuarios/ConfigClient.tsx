"use client";

import { useState, useEffect } from "react";

interface TeamMember {
  nombre: string;
  roles: ("admin" | "closer" | "setter")[];
}

interface Program {
  nombre: string;
  mensual: number;
  pif: number | null;
  duracion: number;
}

interface Props {
  team: TeamMember[];
  programs: Program[];
  commissionCloser: number;
  commissionSetter: number;
}

type Tab = "equipo" | "programas" | "comisiones" | "objetivos";

interface Objetivos {
  cashCollected: number;
  llamadas: number;
  cerradas: number;
  comisiones: number;
}

const DEFAULT_OBJETIVOS: Objetivos = {
  cashCollected: 100000,
  llamadas: 100,
  cerradas: 20,
  comisiones: 10000,
};

function formatUSD(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function RoleBadge({ role }: { role: "admin" | "closer" | "setter" }) {
  const styles: Record<string, string> = {
    admin: "bg-purple/15 text-purple-light",
    closer: "bg-green/15 text-green",
    setter: "bg-yellow/15 text-yellow",
  };
  const labels: Record<string, string> = {
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

const TABS: { key: Tab; label: string }[] = [
  { key: "equipo", label: "Equipo" },
  { key: "programas", label: "Programas" },
  { key: "comisiones", label: "Comisiones" },
  { key: "objetivos", label: "Objetivos" },
];

export default function ConfigClient({ team, programs, commissionCloser, commissionSetter }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("equipo");
  const [objetivos, setObjetivos] = useState<Objetivos>(DEFAULT_OBJETIVOS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("roms_objetivos");
    if (stored) {
      try {
        setObjetivos(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  function saveObjetivos() {
    localStorage.setItem("roms_objetivos", JSON.stringify(objetivos));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const closers = team.filter(m => m.roles.includes("closer"));
  const setters = team.filter(m => m.roles.includes("setter"));

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">Panel de Configuracion</h2>
        <p className="text-muted text-sm">Equipo, programas, comisiones y objetivos del CRM</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-card-border">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? "bg-purple/15 text-purple-light border-b-2 border-purple"
                : "text-muted hover:text-foreground hover:bg-card-bg/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === "equipo" && <TabEquipo team={team} />}
        {activeTab === "programas" && <TabProgramas programs={programs} />}
        {activeTab === "comisiones" && (
          <TabComisiones
            closers={closers}
            setters={setters}
            commissionCloser={commissionCloser}
            commissionSetter={commissionSetter}
          />
        )}
        {activeTab === "objetivos" && (
          <TabObjetivos
            objetivos={objetivos}
            setObjetivos={setObjetivos}
            onSave={saveObjetivos}
            saved={saved}
          />
        )}
      </div>
    </div>
  );
}

/* ── Tab: Equipo ───────────────────────────────── */
function TabEquipo({ team }: { team: TeamMember[] }) {
  return (
    <div>
      <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-card-border bg-card-bg/50">
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Roles</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody>
            {team.map((member, idx) => (
              <tr
                key={member.nombre}
                className={`border-b border-card-border/50 hover:bg-card-bg/70 transition-colors ${
                  idx === team.length - 1 ? "border-b-0" : ""
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
                  <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-green/15 text-green">
                    Activo
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ReadOnlyNote />
    </div>
  );
}

/* ── Tab: Programas ────────────────────────────── */
function TabProgramas({ programs }: { programs: Program[] }) {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {programs.map(p => (
          <div key={p.nombre} className="bg-card-bg border border-card-border rounded-xl p-5">
            <h3 className="text-lg font-bold mb-3 text-foreground">{p.nombre}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Precio mensual</span>
                <span className="font-semibold text-foreground">{formatUSD(p.mensual)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">PIF</span>
                <span className="font-semibold text-foreground">
                  {p.pif ? formatUSD(p.pif) : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Duracion</span>
                <span className="font-semibold text-foreground">{p.duracion} meses</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <ReadOnlyNote />
    </div>
  );
}

/* ── Tab: Comisiones ───────────────────────────── */
function TabComisiones({
  closers,
  setters,
  commissionCloser,
  commissionSetter,
}: {
  closers: TeamMember[];
  setters: TeamMember[];
  commissionCloser: number;
  commissionSetter: number;
}) {
  return (
    <div>
      {/* Rate summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <p className="text-muted text-xs uppercase tracking-wider mb-1">Comision Closer</p>
          <p className="text-3xl font-bold text-green">{(commissionCloser * 100).toFixed(0)}%</p>
        </div>
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <p className="text-muted text-xs uppercase tracking-wider mb-1">Comision Setter</p>
          <p className="text-3xl font-bold text-yellow">{(commissionSetter * 100).toFixed(0)}%</p>
        </div>
      </div>

      {/* Closers table */}
      <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">Closers</h3>
      <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden mb-4">
        <table className="w-full">
          <thead>
            <tr className="border-b border-card-border bg-card-bg/50">
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">Tasa</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">Ejemplo ($10,000 venta)</th>
            </tr>
          </thead>
          <tbody>
            {closers.map((m, idx) => (
              <tr key={m.nombre} className={`border-b border-card-border/50 ${idx === closers.length - 1 ? "border-b-0" : ""}`}>
                <td className="px-6 py-3 font-medium text-foreground">{m.nombre}</td>
                <td className="px-6 py-3 text-green">{(commissionCloser * 100).toFixed(0)}%</td>
                <td className="px-6 py-3 text-foreground">{formatUSD(10000 * commissionCloser)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Setters table */}
      <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">Setters</h3>
      <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden mb-4">
        <table className="w-full">
          <thead>
            <tr className="border-b border-card-border bg-card-bg/50">
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">Tasa</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase">Ejemplo ($10,000 venta)</th>
            </tr>
          </thead>
          <tbody>
            {setters.map((m, idx) => (
              <tr key={m.nombre} className={`border-b border-card-border/50 ${idx === setters.length - 1 ? "border-b-0" : ""}`}>
                <td className="px-6 py-3 font-medium text-foreground">{m.nombre}</td>
                <td className="px-6 py-3 text-yellow">{(commissionSetter * 100).toFixed(0)}%</td>
                <td className="px-6 py-3 text-foreground">{formatUSD(10000 * commissionSetter)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReadOnlyNote />
    </div>
  );
}

/* ── Tab: Objetivos ────────────────────────────── */
function TabObjetivos({
  objetivos,
  setObjetivos,
  onSave,
  saved,
}: {
  objetivos: Objetivos;
  setObjetivos: (o: Objetivos) => void;
  onSave: () => void;
  saved: boolean;
}) {
  const fields: { key: keyof Objetivos; label: string; prefix?: string }[] = [
    { key: "cashCollected", label: "Cash Collected Meta", prefix: "$" },
    { key: "llamadas", label: "Llamadas Meta" },
    { key: "cerradas", label: "Cerradas Meta" },
    { key: "comisiones", label: "Comisiones Meta", prefix: "$" },
  ];

  return (
    <div>
      <div className="bg-card-bg border border-card-border rounded-xl p-6 max-w-lg">
        <h3 className="text-lg font-bold mb-4 text-foreground">Metas Mensuales</h3>
        <div className="space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-sm text-muted mb-1">{f.label}</label>
              <div className="flex items-center gap-2">
                {f.prefix && <span className="text-muted text-sm">{f.prefix}</span>}
                <input
                  type="number"
                  value={objetivos[f.key]}
                  onChange={e =>
                    setObjetivos({ ...objetivos, [f.key]: Number(e.target.value) || 0 })
                  }
                  className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple/50 focus:border-purple"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={onSave}
            className="px-5 py-2.5 bg-purple hover:bg-purple/80 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Guardar
          </button>
          {saved && (
            <span className="text-green text-sm font-medium">Guardado en localStorage</span>
          )}
        </div>
      </div>
      <p className="text-muted text-xs mt-4">
        Los objetivos se guardan localmente en el navegador. Para persistencia permanente se necesita una hoja de configuracion en Google Sheets.
      </p>
    </div>
  );
}

/* ── Shared note ───────────────────────────────── */
function ReadOnlyNote() {
  return (
    <p className="text-muted text-xs mt-4">
      Los cambios en esta seccion requieren actualizacion de codigo en <code className="bg-card-bg px-1.5 py-0.5 rounded text-xs">lib/constants.ts</code>
    </p>
  );
}
