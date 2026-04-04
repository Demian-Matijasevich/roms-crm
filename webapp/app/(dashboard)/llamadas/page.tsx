import { fetchLlamadas } from "@/lib/sheets";
import { getSession, hasRole } from "@/lib/auth";
import Link from "next/link";
import LlamadasClient from "./LlamadasClient";

export const dynamic = "force-dynamic";

export default async function LlamadasPage() {
  const [llamadas, session] = await Promise.all([fetchLlamadas(), getSession()]);

  const isAdmin = hasRole(session, "admin");

  const sorted = [...llamadas].sort((a, b) => {
    const da = a.fechaLlamada || "0";
    const db = b.fechaLlamada || "0";
    return db.localeCompare(da);
  });

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">CRM Llamadas</h2>
          <p className="text-muted text-sm mt-1">
            {llamadas.length} llamada{llamadas.length !== 1 ? "s" : ""} — datos en vivo desde Google Sheets
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/form/llamada"
            className="flex items-center gap-2 bg-purple hover:bg-purple/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Nueva llamada
          </Link>
        )}
      </div>

      <LlamadasClient
        llamadas={sorted}
        isAdmin={isAdmin}
        userName={session?.nombre ?? ""}
      />
    </div>
  );
}
