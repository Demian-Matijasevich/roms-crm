"use client";

import { useState } from "react";
import { PROGRAMS, TEAM } from "@/lib/constants";

const METODOS_PAGO = ["Transferencia", "Efectivo", "Tarjeta", "Crypto", "Otro"] as const;
const CANALES = ["WhatsApp", "Instagram DM", "Instagram Stories", "Telegram", "Email", "Presencial", "Otro"] as const;
const RECEPTORES = ["Juanma", "Fran", "Financiera BECHECK", "Binance", "Efectivo", "Link MP"] as const;
const SETTERS = TEAM.filter(t => t.roles.includes("setter")).map(t => t.nombre);

const inputClass = "w-full bg-background border border-card-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-purple placeholder:text-muted";
const selectClass = "w-full bg-background border border-card-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-purple";
const labelClass = "text-sm text-muted block mb-1";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function getCurrentMes() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}`;
}

interface Props {
  closer: string;
}

export default function VentaDirectaForm({ closer }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [nombre, setNombre] = useState("");
  const [instagram, setInstagram] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [canal, setCanal] = useState("");
  const [setter, setSetter] = useState("");
  const [programa, setPrograma] = useState("");
  const [cashDia1, setCashDia1] = useState("");
  const [ticketTotal, setTicketTotal] = useState("");
  const [planPago, setPlanPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [receptor, setReceptor] = useState("");
  const [contexto, setContexto] = useState("");
  const [fecha, setFecha] = useState(todayISO());

  async function handleSubmit() {
    if (!nombre.trim()) { setError("Nombre requerido"); return; }
    if (!programa) { setError("Seleccioná un programa"); return; }
    const cash = parseFloat(cashDia1);
    if (!cashDia1 || isNaN(cash) || cash <= 0) { setError("Ingresá un monto válido"); return; }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/venta-directa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          instagram: instagram.trim(),
          telefono: telefono.trim(),
          email: email.trim(),
          canal,
          setter,
          closer,
          programa,
          cashDia1: cash,
          ticketTotal: parseFloat(ticketTotal) || cash,
          planPago: planPago || "PIF",
          metodoPago,
          receptor,
          contexto: contexto.trim(),
          fecha,
          mes: getCurrentMes(),
        }),
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
    setNombre(""); setInstagram(""); setTelefono(""); setEmail("");
    setCanal(""); setSetter(""); setPrograma(""); setCashDia1("");
    setTicketTotal(""); setPlanPago(""); setMetodoPago(""); setReceptor("");
    setContexto(""); setFecha(todayISO()); setError(""); setSubmitted(false);
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto bg-card-bg border border-card-border rounded-xl p-10 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">Venta registrada</h3>
        <p className="text-sm text-muted">La venta por chat se guardó en el Sheet y aparece en el dashboard.</p>
        <button onClick={reset} className="mt-2 bg-purple hover:bg-purple-dark text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
          Registrar otra venta
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-card-bg border border-card-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-card-border">
        <span className="text-lg">💬</span>
        <div>
          <p className="text-sm font-semibold">Venta sin llamada</p>
          <p className="text-xs text-muted">Se registra como cerrado directo en el CRM</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Lead info */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Nombre del lead *</label>
            <input className={inputClass} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre completo" />
          </div>
          <div>
            <label className={labelClass}>Instagram</label>
            <input className={inputClass} value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@usuario" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Teléfono / WhatsApp</label>
            <input className={inputClass} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+54 11..." />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input className={inputClass} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@..." />
          </div>
        </div>

        {/* Canal + Setter */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Canal de cierre *</label>
            <select className={selectClass} value={canal} onChange={e => setCanal(e.target.value)}>
              <option value="">¿Por dónde se cerró?</option>
              {CANALES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Setter (si aplica)</label>
            <select className={selectClass} value={setter} onChange={e => setSetter(e.target.value)}>
              <option value="">Sin setter</option>
              {SETTERS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Programa + Cash */}
        <div>
          <label className={labelClass}>Programa *</label>
          <select className={selectClass} value={programa} onChange={e => setPrograma(e.target.value)}>
            <option value="">Seleccionar programa...</option>
            {PROGRAMS.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre} — ${p.pif ? `PIF $${p.pif.toLocaleString()} / Mensual $${p.mensual.toLocaleString()}` : `$${p.mensual.toLocaleString()}/mes`}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Cash cobrado hoy *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
              <input type="number" className={`${inputClass} pl-7`} value={cashDia1} onChange={e => setCashDia1(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Ticket total</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
              <input type="number" className={`${inputClass} pl-7`} value={ticketTotal} onChange={e => setTicketTotal(e.target.value)} placeholder="Igual al cash si PIF" />
            </div>
          </div>
        </div>

        {/* Pago */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Plan de pago</label>
            <select className={selectClass} value={planPago} onChange={e => setPlanPago(e.target.value)}>
              <option value="">Seleccionar...</option>
              <option value="PIF">PIF</option>
              <option value="Cuotas (3)">Cuotas (3)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Método</label>
            <select className={selectClass} value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
              <option value="">Seleccionar...</option>
              {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Quién recibe</label>
            <select className={selectClass} value={receptor} onChange={e => setReceptor(e.target.value)}>
              <option value="">Seleccionar...</option>
              {RECEPTORES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* Fecha + Contexto */}
        <div>
          <label className={labelClass}>Fecha del cierre</label>
          <input type="date" className={inputClass} value={fecha} onChange={e => setFecha(e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>Contexto / notas</label>
          <textarea className={`${inputClass} h-20 resize-none`} value={contexto} onChange={e => setContexto(e.target.value)} placeholder="Cómo se dio la venta, qué se habló..." />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full mt-6 bg-purple hover:bg-purple-dark disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        {loading ? "Guardando..." : "Registrar venta"}
      </button>
    </div>
  );
}
