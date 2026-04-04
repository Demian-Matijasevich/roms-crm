// webapp/app/alumnos/page.tsx
import { fetchLlamadas } from "@/lib/sheets";
import { getAlumnos } from "@/lib/data";
import AlumnosClient from "./AlumnosClient";

export const dynamic = "force-dynamic";

export default async function AlumnosPage() {
  const llamadas = await fetchLlamadas();
  const alumnos = getAlumnos(llamadas);

  const activos = alumnos.filter(a => a.estado === "Activo").length;
  const porVencer = alumnos.filter(a => a.estado === "Por vencer").length;
  const vencidos = alumnos.filter(a => a.estado === "Vencido").length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold">Alumnos</h2>
        <span className="bg-purple/15 text-purple-light border border-purple/30 text-xs font-semibold px-2.5 py-1 rounded-full">
          {alumnos.length} activos
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Activos</p>
          <p className="text-3xl font-bold text-green">{activos}</p>
        </div>
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Por vencer</p>
          <p className="text-3xl font-bold text-yellow">{porVencer}</p>
          <p className="text-xs text-muted mt-1">≤ 15 días</p>
        </div>
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Vencidos</p>
          <p className="text-3xl font-bold text-red">{vencidos}</p>
        </div>
      </div>

      {/* Client component handles filter tabs + table */}
      <AlumnosClient alumnos={alumnos} />
    </div>
  );
}
