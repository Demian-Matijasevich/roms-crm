"use client";

import { useState, useEffect } from "react";

const inputClass =
  "w-full bg-background border border-card-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-purple placeholder:text-muted";
const labelClass = "text-sm text-muted block mb-1";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export default function ReporteSetterForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [setter, setSetter] = useState("");

  // Form fields
  const [fecha, setFecha] = useState(todayISO());
  const [conversacionesIniciadas, setConversacionesIniciadas] = useState("");
  const [respuestasHistorias, setRespuestasHistorias] = useState("");
  const [calendariosEnviados, setCalendariosEnviados] = useState("");
  const [notas, setNotas] = useState("");

  // Fetch session on mount
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/session");
        if (res.ok) {
          const data = await res.json();
          if (data.user?.nombre) {
            setSetter(data.user.nombre);
          }
        }
      } catch (e) {
        console.error("Error fetching session:", e);
      }
    }
    fetchSession();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!setter) {
      setError("No se pudo obtener tu nombre de sesión.");
      return;
    }

    const conv = parseInt(conversacionesIniciadas, 10);
    const resp = parseInt(respuestasHistorias, 10);
    const cal = parseInt(calendariosEnviados, 10);

    if (isNaN(conv) || conv < 0 || isNaN(resp) || resp < 0 || isNaN(cal) || cal < 0) {
      setError("Ingresá números válidos (≥ 0) en los campos numéricos.");
      return;
    }

    setLoading(true);

    const body = {
      fecha,
      setter,
      conversacionesIniciadas: conv,
      respuestasHistorias: resp,
      calendariosEnviados: cal,
      notas,
    };

    try {
      const res = await fetch("/api/reporte-setter", {
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
    setFecha(todayISO());
    setConversacionesIniciadas("");
    setRespuestasHistorias("");
    setCalendariosEnviados("");
    setNotas("");
    setError("");
    setSubmitted(false);
  }

  // ── Success state ──
  if (submitted) {
    return (
      <div className="bg-card-bg border border-card-border rounded-xl p-10 text-center flex flex-col items-center gap-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-green/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-green"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground">Reporte enviado</h3>
        <p className="text-sm text-muted">Tus datos se guardaron en Google Sheets.</p>
        <button
          onClick={reset}
          className="mt-2 bg-purple hover:bg-purple-dark text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Crear otro reporte
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="bg-card-bg border border-card-border rounded-xl p-6">
        {/* Fecha */}
        <div className="mb-4">
          <label className={labelClass}>Fecha *</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        {/* Conversaciones iniciadas */}
        <div className="mb-4">
          <label className={labelClass}>Conversaciones iniciadas *</label>
          <input
            type="number"
            min={0}
            value={conversacionesIniciadas}
            onChange={(e) => setConversacionesIniciadas(e.target.value)}
            placeholder="0"
            className={`${inputClass} text-center text-lg`}
            required
          />
        </div>

        {/* Respuestas a historias */}
        <div className="mb-4">
          <label className={labelClass}>Respuestas a historias *</label>
          <input
            type="number"
            min={0}
            value={respuestasHistorias}
            onChange={(e) => setRespuestasHistorias(e.target.value)}
            placeholder="0"
            className={`${inputClass} text-center text-lg`}
            required
          />
        </div>

        {/* Calendarios enviados */}
        <div className="mb-4">
          <label className={labelClass}>Calendarios enviados *</label>
          <input
            type="number"
            min={0}
            value={calendariosEnviados}
            onChange={(e) => setCalendariosEnviados(e.target.value)}
            placeholder="0"
            className={`${inputClass} text-center text-lg`}
            required
          />
        </div>

        {/* Notas */}
        <div className="mb-6">
          <label className={labelClass}>Notas (opcional)</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Observaciones, incidencias, etc."
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        {error && <p className="mb-4 text-sm text-red">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-purple hover:bg-purple-dark disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium w-full transition-colors"
        >
          {loading ? "Enviando..." : "Enviar reporte"}
        </button>
      </form>
    </div>
  );
}
