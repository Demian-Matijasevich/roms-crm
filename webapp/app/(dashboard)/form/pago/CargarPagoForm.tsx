"use client";

import { useState, useMemo } from "react";
import type { Llamada } from "@/lib/types";
import { formatUSD } from "@/lib/data";

interface Props {
  cerradas: Llamada[];
}

type Step = 1 | 2;

const METODOS_PAGO = ["Transferencia", "Efectivo", "Tarjeta", "Crypto", "Otro"] as const;
const CONCEPTOS = ["Cuota 2", "Cuota 3", "Pago adicional", "Saldo pendiente", "Otro"] as const;

const inputClass =
  "w-full bg-background border border-card-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-purple placeholder:text-muted";
const labelClass = "text-sm text-muted block mb-1";
const selectClass =
  "w-full bg-background border border-card-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-purple";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function getCurrentMes(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}`;
}

function getPagoStatus(l: Llamada): { pagadas: number; pendientes: number; label: string } {
  if (!l.planPago?.includes("Cuota")) {
    return { pagadas: 1, pendientes: 0, label: "PIF — pago único" };
  }
  let pagadas = 0;
  let pendientes = 0;
  const cuotas = [
    { monto: l.pago1, estado: l.estadoPago1 },
    { monto: l.pago2, estado: l.estadoPago2 },
    { monto: l.pago3, estado: l.estadoPago3 },
  ];
  for (const c of cuotas) {
    if (!c.monto && c.estado !== "Pendiente") continue;
    if (c.estado === "Pagado") pagadas++;
    else pendientes++;
  }
  return {
    pagadas,
    pendientes,
    label: `${pagadas}/3 pagadas · ${pendientes} pendiente${pendientes !== 1 ? "s" : ""}`,
  };
}

export default function CargarPagoForm({ cerradas }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Llamada | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [fecha, setFecha] = useState(todayISO());
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("");
  const [comprobante, setComprobante] = useState("");
  const [concepto, setConcepto] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return cerradas;
    const q = search.toLowerCase();
    return cerradas.filter(
      (l) =>
        l.nombre?.toLowerCase().includes(q) ||
        l.programa?.toLowerCase().includes(q) ||
        l.closer?.toLowerCase().includes(q)
    );
  }, [cerradas, search]);

  function selectStudent(lead: Llamada) {
    setSelected(lead);
    setStep(2);
  }

  function volver() {
    setSelected(null);
    setStep(1);
    setError("");
  }

  async function handleSubmit() {
    if (!selected) return;
    if (!concepto) {
      setError("Seleccioná un concepto.");
      return;
    }
    const montoNum = parseFloat(monto);
    if (!monto || isNaN(montoNum) || montoNum <= 0) {
      setError("Ingresá un monto válido mayor a 0.");
      return;
    }
    setLoading(true);
    setError("");

    const body = {
      fecha,
      producto: selected.programa,
      nombre: selected.nombre,
      telefono: selected.telefono,
      monto: montoNum,
      closer: selected.closer,
      setter: selected.setter,
      comprobante,
      concepto,
      fuente: selected.fuente,
      mes: getCurrentMes(),
    };

    try {
      const res = await fetch("/api/pagos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al guardar");
      }

      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep(1);
    setSearch("");
    setSelected(null);
    setFecha(todayISO());
    setMonto("");
    setMetodo("");
    setComprobante("");
    setConcepto("");
    setError("");
    setSubmitted(false);
  }

  // ── Success ──
  if (submitted) {
    return (
      <div className="bg-card-bg border border-card-border rounded-xl p-10 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground">Pago registrado correctamente</h3>
        <p className="text-sm text-muted">El pago se guardó en el Registro de Pagos.</p>
        <button
          onClick={reset}
          className="mt-2 bg-purple hover:bg-purple-dark text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Registrar otro pago
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {([1, 2] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                step === s
                  ? "bg-purple text-white"
                  : step > s
                  ? "bg-purple/30 text-purple-light"
                  : "bg-card-border text-muted"
              }`}
            >
              {s}
            </div>
            {s < 2 && (
              <div
                className={`h-px w-8 transition-colors ${
                  step > s ? "bg-purple/50" : "bg-card-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Buscar alumno ── */}
      {step === 1 && (
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <h2 className="text-base font-semibold mb-1">Buscar alumno</h2>
          <p className="text-sm text-muted mb-4">
            Mostrando {cerradas.length} alumnos con deal cerrado
          </p>

          <input
            type="text"
            placeholder="Nombre, programa o closer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass}
            autoFocus
          />

          <div className="mt-4 space-y-2 max-h-80 overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <p className="text-sm text-muted text-center py-6">
                No hay alumnos que coincidan.
              </p>
            )}
            {filtered.map((lead) => {
              const status = getPagoStatus(lead);
              return (
                <button
                  key={lead.rowIndex}
                  onClick={() => selectStudent(lead)}
                  className="w-full bg-[#111113] border border-card-border rounded-lg p-4 cursor-pointer hover:border-purple/50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {lead.nombre || "Sin nombre"}
                    </span>
                    {lead.saldoPendiente > 0 && (
                      <span className="text-xs text-amber-400">
                        Saldo: {formatUSD(lead.saldoPendiente)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {lead.programa && (
                      <span className="text-xs text-purple-light">{lead.programa}</span>
                    )}
                    {lead.closer && (
                      <span className="text-xs text-muted">Closer: {lead.closer}</span>
                    )}
                    <span className="text-xs text-muted">{status.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Step 2: Info alumno + form pago ── */}
      {step === 2 && selected && (
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <h2 className="text-base font-semibold mb-1">Registrar pago</h2>
          <p className="text-xs text-muted mb-5">{selected.nombre}</p>

          {/* Student info card */}
          <div className="bg-[#111113] border border-card-border rounded-lg p-4 mb-6 space-y-2">
            <Row label="Programa" value={selected.programa} />
            <Row label="Closer" value={selected.closer} />
            <Row label="Setter" value={selected.setter} />
            <Row label="Plan de pago" value={selected.planPago} />
            {selected.planPago?.includes("Cuota") && (
              <>
                <Row
                  label="Cuota 1"
                  value={selected.pago1 ? `${formatUSD(selected.pago1)} — ${selected.estadoPago1 || "Pendiente"}` : undefined}
                />
                <Row
                  label="Cuota 2"
                  value={selected.pago2 ? `${formatUSD(selected.pago2)} — ${selected.estadoPago2 || "Pendiente"}` : "Pendiente"}
                />
                <Row
                  label="Cuota 3"
                  value={selected.pago3 ? `${formatUSD(selected.pago3)} — ${selected.estadoPago3 || "Pendiente"}` : "Pendiente"}
                />
              </>
            )}
            {selected.saldoPendiente > 0 && (
              <div className="pt-2 border-t border-card-border">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted">Saldo pendiente</span>
                  <span className="text-sm font-semibold text-amber-400">
                    {formatUSD(selected.saldoPendiente)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Payment form */}
          <div className="space-y-4">
            {/* Concepto */}
            <div>
              <label className={labelClass}>Concepto *</label>
              <select
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className={selectClass}
              >
                <option value="">Seleccionar concepto...</option>
                {CONCEPTOS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Fecha */}
            <div>
              <label className={labelClass}>Fecha de pago</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Monto */}
            <div>
              <label className={labelClass}>Monto *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0"
                  className={`${inputClass} pl-7`}
                />
              </div>
            </div>

            {/* Método de pago */}
            <div>
              <label className={labelClass}>Método de pago</label>
              <select
                value={metodo}
                onChange={(e) => setMetodo(e.target.value)}
                className={selectClass}
              >
                <option value="">Seleccionar...</option>
                {METODOS_PAGO.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Comprobante */}
            <div>
              <label className={labelClass}>Comprobante (link)</label>
              <input
                type="text"
                value={comprobante}
                onChange={(e) => setComprobante(e.target.value)}
                placeholder="https://drive.google.com/..."
                className={inputClass}
              />
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red">{error}</p>}

          <div className="flex gap-3 mt-6">
            <button
              onClick={volver}
              className="flex-1 bg-transparent border border-card-border hover:border-muted text-muted hover:text-foreground py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Volver
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-purple hover:bg-purple-dark disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? "Guardando..." : "Registrar pago"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-sm text-muted shrink-0">{label}</span>
      <span className="text-sm text-foreground text-right">{value}</span>
    </div>
  );
}
