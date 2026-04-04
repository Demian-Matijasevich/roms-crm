"use client";

import { useState, useMemo } from "react";
import type { Llamada } from "@/lib/types";
import { ESTADOS_LLAMADA, PROGRAMS } from "@/lib/constants";

interface Props {
  llamadas: Llamada[];
}

type Step = 1 | 2 | 3 | 4;

const METODOS_PAGO = ["Transferencia", "Efectivo", "Tarjeta", "Crypto", "Otro"] as const;

const inputClass =
  "w-full bg-background border border-card-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-purple placeholder:text-muted";
const labelClass = "text-sm text-muted block mb-1";
const selectClass =
  "w-full bg-background border border-card-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-purple";

function isCerrado(estado: string) {
  return estado.toLowerCase().includes("cerrado") || estado.toLowerCase().includes("reserva");
}

export default function CargarLlamadaForm({ llamadas }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Llamada | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 3 fields
  const [sePresentó, setSePresentó] = useState<"Sí" | "No" | "">("");
  const [estado, setEstado] = useState("");
  const [calificado, setCalificado] = useState("");
  const [programa, setPrograma] = useState("");
  const [contextoCloser, setContextoCloser] = useState("");

  // Step 4 fields (payment)
  const [planPago, setPlanPago] = useState<"PIF" | "3 Cuotas" | "">("");
  const [cashDia1, setCashDia1] = useState("");
  const [metodoPago, setMetodoPago] = useState("");

  // Pendientes: estado vacío o "Pendiente"
  const pendientes = useMemo(
    () =>
      llamadas.filter(
        (l) => !l.estado || l.estado === "⏳ Pendiente"
      ),
    [llamadas]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return pendientes;
    const q = search.toLowerCase();
    return pendientes.filter(
      (l) =>
        l.nombre?.toLowerCase().includes(q) ||
        l.instagram?.toLowerCase().includes(q)
    );
  }, [pendientes, search]);

  function selectLead(lead: Llamada) {
    setSelectedLead(lead);
    setStep(2);
  }

  function volver() {
    if (step === 2) {
      setSelectedLead(null);
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    } else if (step === 4) {
      setStep(3);
    }
  }

  function goToStep3() {
    setStep(3);
  }

  function handleEstadoChange(val: string) {
    setEstado(val);
  }

  function handleStep3Next() {
    if (!sePresentó || !estado) {
      setError("Completá Se Presentó y Estado antes de continuar.");
      return;
    }
    setError("");
    if (isCerrado(estado)) {
      setStep(4);
    } else {
      handleSubmit();
    }
  }

  async function handleSubmit() {
    if (!selectedLead) return;
    setLoading(true);
    setError("");

    const body = {
      rowIndex: selectedLead.rowIndex,
      estado,
      sePresentó,
      calificado,
      programa,
      contextoCloser,
      cashDia1: cashDia1 ? parseFloat(cashDia1) : 0,
      planPago,
      pago1: cashDia1 ? parseFloat(cashDia1) : 0,
      metodoPago,
    };

    try {
      const res = await fetch("/api/llamadas", {
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
    setSelectedLead(null);
    setSePresentó("");
    setEstado("");
    setCalificado("");
    setPrograma("");
    setContextoCloser("");
    setPlanPago("");
    setCashDia1("");
    setMetodoPago("");
    setError("");
    setSubmitted(false);
  }

  // ── Success state ──
  if (submitted) {
    return (
      <div className="bg-card-bg border border-card-border rounded-xl p-10 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground">Llamada cargada correctamente</h3>
        <p className="text-sm text-muted">Los datos se guardaron en Google Sheets.</p>
        <button
          onClick={reset}
          className="mt-2 bg-purple hover:bg-purple-dark text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Cargar otra llamada
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {([1, 2, 3, 4] as Step[]).map((s) => (
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
            {s < 4 && (
              <div
                className={`h-px w-8 transition-colors ${
                  step > s ? "bg-purple/50" : "bg-card-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Buscar lead ── */}
      {step === 1 && (
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <h2 className="text-base font-semibold mb-1">Buscar lead</h2>
          <p className="text-sm text-muted mb-4">
            Mostrando {pendientes.length} leads pendientes de cierre
          </p>

          <input
            type="text"
            placeholder="Nombre o Instagram..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass}
            autoFocus
          />

          <div className="mt-4 space-y-2 max-h-80 overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <p className="text-sm text-muted text-center py-6">
                No hay leads que coincidan.
              </p>
            )}
            {filtered.map((lead) => (
              <button
                key={lead.rowIndex}
                onClick={() => selectLead(lead)}
                className="w-full bg-[#111113] border border-card-border rounded-lg p-4 cursor-pointer hover:border-purple/50 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{lead.nombre || "Sin nombre"}</span>
                  {lead.fechaAgenda && (
                    <span className="text-xs text-muted">{lead.fechaAgenda}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {lead.instagram && (
                    <span className="text-xs text-muted">@{lead.instagram.replace(/^@/, "")}</span>
                  )}
                  {lead.setter && (
                    <span className="text-xs text-purple-light">Setter: {lead.setter}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: Lead Card ── */}
      {step === 2 && selectedLead && (
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <h2 className="text-base font-semibold mb-4">Detalle del lead</h2>

          <div className="space-y-3 mb-6">
            <Row label="Nombre" value={selectedLead.nombre} />
            <Row label="Instagram" value={selectedLead.instagram ? `@${selectedLead.instagram.replace(/^@/, "")}` : undefined} />
            <Row label="Fecha agendada" value={selectedLead.fechaAgenda} />
            <Row label="Setter" value={selectedLead.setter} />
            {selectedLead.contextoSetter && (
              <div className="pt-2 border-t border-card-border">
                <p className={labelClass}>Contexto setter</p>
                <p className="text-sm text-foreground leading-relaxed">{selectedLead.contextoSetter}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={volver}
              className="flex-1 bg-transparent border border-card-border hover:border-muted text-muted hover:text-foreground py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Volver
            </button>
            <button
              onClick={goToStep3}
              className="flex-1 bg-purple hover:bg-purple-dark text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Cargar resultado
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Resultado de la llamada ── */}
      {step === 3 && selectedLead && (
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <h2 className="text-base font-semibold mb-1">Resultado de la llamada</h2>
          <p className="text-xs text-muted mb-5">{selectedLead.nombre}</p>

          <div className="space-y-4">
            {/* Se presentó */}
            <div>
              <label className={labelClass}>Se presentó *</label>
              <div className="flex gap-3">
                {(["Sí", "No"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSePresentó(opt)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      sePresentó === opt
                        ? opt === "Sí"
                          ? "bg-green/10 border-green text-green"
                          : "bg-red/10 border-red text-red"
                        : "border-card-border text-muted hover:border-muted"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Estado */}
            <div>
              <label className={labelClass}>Estado *</label>
              <select
                value={estado}
                onChange={(e) => handleEstadoChange(e.target.value)}
                className={selectClass}
              >
                <option value="">Seleccionar estado...</option>
                {ESTADOS_LLAMADA.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            {/* Lead calificado */}
            <div>
              <label className={labelClass}>Lead calificado</label>
              <div className="flex gap-2">
                {["Sí", "No", "Se desconoce"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setCalificado(opt)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      calificado === opt
                        ? "bg-purple/10 border-purple text-purple-light"
                        : "border-card-border text-muted hover:border-muted"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Programa pitcheado */}
            <div>
              <label className={labelClass}>Programa pitcheado</label>
              <select
                value={programa}
                onChange={(e) => setPrograma(e.target.value)}
                className={selectClass}
              >
                <option value="">Sin programa / no aplica</option>
                {PROGRAMS.map((p) => (
                  <option key={p.nombre} value={p.nombre}>{p.nombre}</option>
                ))}
              </select>
            </div>

            {/* Contexto closer */}
            <div>
              <label className={labelClass}>Contexto closer</label>
              <textarea
                value={contextoCloser}
                onChange={(e) => setContextoCloser(e.target.value)}
                rows={3}
                placeholder="Notas post-llamada, objeciones, próximos pasos..."
                className={`${inputClass} resize-none`}
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
              onClick={handleStep3Next}
              disabled={loading}
              className="flex-1 bg-purple hover:bg-purple-dark disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? "Guardando..." : isCerrado(estado) ? "Siguiente → Pago" : "Guardar llamada"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Pago (solo si cerrado) ── */}
      {step === 4 && selectedLead && (
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <h2 className="text-base font-semibold mb-1">Datos de pago</h2>
          <p className="text-xs text-muted mb-5">{selectedLead.nombre} — {estado}</p>

          <div className="space-y-4">
            {/* Plan de pago */}
            <div>
              <label className={labelClass}>Plan de pago *</label>
              <div className="flex gap-3">
                {(["PIF", "3 Cuotas"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setPlanPago(opt)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      planPago === opt
                        ? "bg-purple/10 border-purple text-purple-light"
                        : "border-card-border text-muted hover:border-muted"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Monto pago 1 */}
            <div>
              <label className={labelClass}>Monto cobrado hoy (cash día 1)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={cashDia1}
                  onChange={(e) => setCashDia1(e.target.value)}
                  placeholder="0"
                  className={`${inputClass} pl-7`}
                />
              </div>
            </div>

            {/* Método de pago */}
            <div>
              <label className={labelClass}>Método de pago</label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className={selectClass}
              >
                <option value="">Seleccionar...</option>
                {METODOS_PAGO.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
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
              disabled={loading || !planPago}
              className="flex-1 bg-purple hover:bg-purple-dark disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? "Guardando..." : "Guardar llamada"}
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
