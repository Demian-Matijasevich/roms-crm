"use client";
import { useState, useEffect } from "react";

interface CalendlyEvent {
  name: string;
  slug: string;
  url: string;
  duration: number;
  owner: string;
}

export default function UTMBuilderPage() {
  const [baseUrl, setBaseUrl] = useState("");
  const [fuente, setFuente] = useState("Instagram");
  const [medio, setMedio] = useState("DM");
  const [setter, setSetter] = useState("");
  const [campaña, setCampaña] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [calendlyEvents, setCalendlyEvents] = useState<CalendlyEvent[]>([]);
  const [calendlyAccounts, setCalendlyAccounts] = useState<string[]>([]);
  const [loadingCalendly, setLoadingCalendly] = useState(true);

  useEffect(() => {
    // Load session + Calendly data in parallel
    Promise.all([
      fetch("/api/session").then((r) => r.json()).catch(() => ({ user: null })),
      fetch("/api/calendly").then((r) => r.json()).catch(() => ({ accounts: [], eventTypes: [] })),
    ]).then(([sessionData, calendlyData]) => {
      if (sessionData.user?.nombre) setSetter(sessionData.user.nombre);
      setCalendlyEvents(calendlyData.eventTypes || []);
      setCalendlyAccounts(calendlyData.accounts || []);
      setLoadingCalendly(false);
    });
  }, []);

  const handleGenerate = () => {
    if (!baseUrl.trim()) return;
    const params = new URLSearchParams();
    params.set("utm_source", fuente);
    params.set("utm_medium", medio);
    const campaign = campaña.trim() ? `${setter}_${campaña}` : setter;
    params.set("utm_campaign", campaign);
    const fullUrl = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${params.toString()}`;
    setGeneratedUrl(fullUrl);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setBaseUrl("");
    setFuente("Instagram");
    setMedio("DM");
    setCampaña("");
    setGeneratedUrl("");
  };

  const inputClass = "w-full bg-background border border-card-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple";

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">UTM Builder</h1>
        <p className="text-muted">Genera enlaces rastreados con parámetros UTM</p>
      </div>

      {/* Calendly Links */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Calendly Links Disponibles</h3>
          <span className="text-xs text-muted">
            {calendlyAccounts.length} cuenta{calendlyAccounts.length !== 1 ? "s" : ""} conectada{calendlyAccounts.length !== 1 ? "s" : ""}
            {calendlyAccounts.length > 0 && ` (${calendlyAccounts.join(", ")})`}
          </span>
        </div>
        {loadingCalendly ? (
          <p className="text-sm text-muted">Cargando Calendly...</p>
        ) : calendlyEvents.length === 0 ? (
          <p className="text-sm text-muted">No se encontraron event types activos. Verificá los tokens en .env.local</p>
        ) : (
          <div className="space-y-2">
            {calendlyEvents.map((ev) => (
              <button
                key={ev.url}
                onClick={() => setBaseUrl(ev.url)}
                className={`w-full text-left bg-[#111113] border rounded-lg p-3 transition-all ${
                  baseUrl === ev.url
                    ? "border-purple/50 bg-purple/5"
                    : "border-card-border hover:border-purple/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{ev.name}</p>
                    <p className="text-xs text-muted mt-0.5">{ev.url}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted">{ev.owner}</span>
                    <p className="text-xs text-purple-light">{ev.duration} min</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Form Card */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">URL Base</label>
            <input type="text" placeholder="https://calendly.com/... o tu landing" value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)} className={inputClass} />
            <p className="text-xs text-muted mt-1">Seleccioná un Calendly arriba o pegá una URL</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fuente</label>
              <select value={fuente} onChange={(e) => setFuente(e.target.value)} className={inputClass}>
                <option>Instagram</option>
                <option>TikTok</option>
                <option>YouTube</option>
                <option>WhatsApp</option>
                <option>Landing</option>
                <option>Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Medio</label>
              <select value={medio} onChange={(e) => setMedio(e.target.value)} className={inputClass}>
                <option>DM</option>
                <option>Historia</option>
                <option>Bio</option>
                <option>Calendario</option>
                <option>Orgánico</option>
                <option>Otro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Setter</label>
              <input type="text" placeholder="Nombre del setter" value={setter}
                onChange={(e) => setSetter(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Campaña (opcional)</label>
              <input type="text" placeholder="Ej: promo30, freeclass" value={campaña}
                onChange={(e) => setCampaña(e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={handleGenerate} disabled={!baseUrl.trim()}
            className="bg-purple hover:bg-purple-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            Generar
          </button>
          <button onClick={handleClear}
            className="bg-card-border hover:bg-[#32323a] text-foreground px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            Limpiar
          </button>
        </div>
      </div>

      {/* Generated URL */}
      {generatedUrl && (
        <div className="bg-card-bg border border-card-border rounded-xl p-6">
          <p className="text-sm font-medium mb-3">URL Generada</p>
          <div className="bg-[#111113] border border-card-border rounded-lg p-4 font-mono text-sm break-all mb-4">
            <code>{generatedUrl}</code>
          </div>
          <button onClick={handleCopy}
            className={`${copied ? "bg-green" : "bg-purple hover:bg-purple-dark"} text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors`}>
            {copied ? "✓ Copiado!" : "Copiar"}
          </button>
        </div>
      )}
    </div>
  );
}
