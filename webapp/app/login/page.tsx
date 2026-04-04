// webapp/app/login/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TEAM } from "@/lib/constants";

export default function LoginPage() {
  const [nombre, setNombre] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, pin }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("PIN incorrecto");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-card-bg border border-card-border rounded-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold"><span className="text-purple">7</span>ROMS</h1>
          <p className="text-muted text-sm mt-1">CRM Dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted block mb-1">Nombre</label>
            <select value={nombre} onChange={e => setNombre(e.target.value)}
              className="w-full bg-background border border-card-border rounded-lg px-3 py-2.5 text-sm
                focus:outline-none focus:border-purple">
              <option value="">Seleccioná tu nombre</option>
              {TEAM.map(t => <option key={t.nombre} value={t.nombre}>{t.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">PIN</label>
            <input type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value)}
              placeholder="****" inputMode="numeric" pattern="[0-9]*"
              className="w-full bg-background border border-card-border rounded-lg px-3 py-2.5 text-sm
                text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-purple" />
          </div>
          {error && <p className="text-red text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading || !nombre || pin.length < 4}
            className="w-full bg-purple hover:bg-purple-dark text-white py-2.5 rounded-lg text-sm
              font-medium transition-colors disabled:opacity-50">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
