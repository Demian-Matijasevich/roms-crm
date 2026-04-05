"use client";

import { useState } from "react";
import StatusBadge from "@/app/components/StatusBadge";
import type { Alumno } from "@/lib/types";
import { formatUSD } from "@/lib/data";
import { TEAM, PROGRAMS, ESTADOS_LLAMADA } from "@/lib/constants";

type FilterTab = "Todos" | "Activo" | "Por vencer" | "Vencido";

const TABS: FilterTab[] = ["Todos", "Activo", "Por vencer", "Vencido"];
const CLOSERS = TEAM.filter((t) => t.roles.includes("closer")).map((t) => t.nombre);
const SETTERS = TEAM.filter((t) => t.roles.includes("setter")).map((t) => t.nombre);

function DiasRestantesBadge({ dias, estado }: { dias: number; estado: Alumno["estado"] }) {
  if (estado === "Vencido") return <span className="text-muted line-through text-sm">0</span>;
  if (dias > 15) return <span className="text-green font-medium">{dias}</span>;
  if (dias >= 7) return <span className="text-yellow font-medium">{dias}</span>;
  return <span className="text-red font-medium">{dias}</span>;
}

const inputClass =
  "w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple";
const labelClass = "text-xs text-muted block mb-1";
const selectClass =
  "w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple";

interface EditForm {
  nombre: string;
  instagram: string;
  email: string;
  telefono: string;
  programa: string;
  closer: string;
  setter: string;
  estado: string;
  planPago: string;
  cashTotal: string;
  saldoPendiente: string;
}

export default function AlumnosClient({ alumnos }: { alumnos: Alumno[] }) {
  const [activeTab, setActiveTab] = useState<FilterTab>("Todos");
  const [editing, setEditing] = useState<Alumno | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const filtered =
    activeTab === "Todos" ? alumnos : alumnos.filter((a) => a.estado === activeTab);

  function openEdit(a: Alumno) {
    setEditing(a);
    setForm({
      nombre: a.nombre,
      instagram: a.instagram || "",
      email: a.email || "",
      telefono: a.telefono || "",
      programa: a.programa,
      closer: a.closer,
      setter: a.setter,
      estado: "",
      planPago: a.planPago || "",
      cashTotal: a.cashTotal ? String(a.cashTotal) : "",
      saldoPendiente: a.saldoPendiente ? String(a.saldoPendiente) : "",
    });
    setSaved(false);
    setError("");
  }

  function closeEdit() {
    setEditing(null);
    setForm(null);
    setError("");
    setSaved(false);
  }

  function updateField(key: keyof EditForm, value: string) {
    if (!form) return;
    setForm({ ...form, [key]: value });
  }

  async function handleSave() {
    if (!editing || !form) return;
    setSaving(true);
    setError("");

    const fields: Record<string, string | number> = {};
    if (form.nombre !== editing.nombre) fields.nombre = form.nombre;
    if (form.instagram !== (editing.instagram || "")) fields.instagram = form.instagram;
    if (form.email !== (editing.email || "")) fields.email = form.email;
    if (form.telefono !== (editing.telefono || "")) fields.telefono = form.telefono;
    if (form.programa !== editing.programa) fields.programa = form.programa;
    if (form.closer !== editing.closer) fields.closer = form.closer;
    if (form.setter !== editing.setter) fields.setter = form.setter;
    if (form.estado) fields.estado = form.estado;
    if (form.planPago !== (editing.planPago || "")) fields.planPago = form.planPago;
    const ct = parseFloat(form.cashTotal);
    if (!isNaN(ct) && ct !== editing.cashTotal) fields.cashTotal = ct;
    const sp = parseFloat(form.saldoPendiente);
    if (!isNaN(sp) && sp !== editing.saldoPendiente) fields.saldoPendiente = sp;

    if (Object.keys(fields).length === 0) {
      setError("No hay cambios para guardar.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/alumnos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndex: editing.rowIndex, fields }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al guardar");
      }
      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {TABS.map((tab) => (
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
                <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-right">Días</th>
                <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-right">Saldo</th>
                <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted text-sm">
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
                    <td className="px-4 py-3 text-right">
                      {a.saldoPendiente > 0 ? (
                        <span className="text-amber-400 font-medium">{formatUSD(a.saldoPendiente)}</span>
                      ) : (
                        <span className="text-green text-xs">Pagado</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(a)}
                        className="text-purple-light hover:text-purple text-xs font-medium transition-colors"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal/Drawer */}
      {editing && form && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={closeEdit} />
          <div className="relative w-full max-w-md bg-card-bg border-l border-card-border h-full overflow-y-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Editar alumno</h3>
              <button onClick={closeEdit} className="text-muted hover:text-foreground text-xl">&times;</button>
            </div>

            {saved ? (
              <div className="flex flex-col items-center gap-4 py-10">
                <div className="w-14 h-14 rounded-full bg-green/10 flex items-center justify-center">
                  <svg className="w-7 h-7 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-medium">Cambios guardados</p>
                <p className="text-xs text-muted">Recargá la página para ver los cambios reflejados.</p>
                <button onClick={closeEdit} className="mt-2 bg-purple hover:bg-purple-dark text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className={labelClass}>Nombre</label>
                  <input className={inputClass} value={form.nombre} onChange={(e) => updateField("nombre", e.target.value)} />
                </div>

                {/* Instagram + Email */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Instagram</label>
                    <input className={inputClass} value={form.instagram} onChange={(e) => updateField("instagram", e.target.value)} placeholder="@usuario" />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input className={inputClass} value={form.email} onChange={(e) => updateField("email", e.target.value)} />
                  </div>
                </div>

                {/* Teléfono */}
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input className={inputClass} value={form.telefono} onChange={(e) => updateField("telefono", e.target.value)} />
                </div>

                {/* Programa */}
                <div>
                  <label className={labelClass}>Programa</label>
                  <select className={selectClass} value={form.programa} onChange={(e) => updateField("programa", e.target.value)}>
                    <option value="">Sin programa</option>
                    {PROGRAMS.map((p) => (
                      <option key={p.nombre} value={p.nombre}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Closer + Setter */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Closer</label>
                    <select className={selectClass} value={form.closer} onChange={(e) => updateField("closer", e.target.value)}>
                      <option value="">-</option>
                      {CLOSERS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Setter</label>
                    <select className={selectClass} value={form.setter} onChange={(e) => updateField("setter", e.target.value)}>
                      <option value="">-</option>
                      {SETTERS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Estado */}
                <div>
                  <label className={labelClass}>Cambiar estado de la llamada</label>
                  <select className={selectClass} value={form.estado} onChange={(e) => updateField("estado", e.target.value)}>
                    <option value="">No cambiar</option>
                    {ESTADOS_LLAMADA.map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>

                {/* Plan de pago */}
                <div>
                  <label className={labelClass}>Plan de pago</label>
                  <select className={selectClass} value={form.planPago} onChange={(e) => updateField("planPago", e.target.value)}>
                    <option value="">-</option>
                    <option value="PIF">PIF</option>
                    <option value="Cuotas (3)">Cuotas (3)</option>
                  </select>
                </div>

                {/* Cash + Saldo */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Cash Total</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                      <input type="number" className={`${inputClass} pl-7`} value={form.cashTotal} onChange={(e) => updateField("cashTotal", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Saldo Pendiente</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                      <input type="number" className={`${inputClass} pl-7`} value={form.saldoPendiente} onChange={(e) => updateField("saldoPendiente", e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Info row */}
                <div className="bg-[#111113] border border-card-border rounded-lg p-3 mt-2">
                  <p className="text-xs text-muted">Fila #{editing.rowIndex} del Sheet · Los cambios se escriben directo en Google Sheets</p>
                </div>

                {error && <p className="text-sm text-red">{error}</p>}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={closeEdit}
                    className="flex-1 bg-transparent border border-card-border hover:border-muted text-muted hover:text-foreground py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-purple hover:bg-purple-dark disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
