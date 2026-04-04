// webapp/app/cuotas/page.tsx
import { fetchLlamadas } from "@/lib/sheets";
import { getCuotas, formatUSD } from "@/lib/data";
import CuotasClient from "./CuotasClient";

export const dynamic = "force-dynamic";

export default async function CuotasPage() {
  const llamadas = await fetchLlamadas();
  const cuotas = getCuotas(llamadas);

  const now = new Date();
  const mesActual = now.getMonth();
  const anioActual = now.getFullYear();

  const totalPendiente = cuotas
    .filter(c => c.estado !== "pagada")
    .reduce((sum, c) => sum + c.monto, 0);

  const cuotasVencidas = cuotas
    .filter(c => c.estado === "vencida")
    .reduce((sum, c) => sum + c.monto, 0);

  const proximas7dias = cuotas
    .filter(c => c.estado === "próxima")
    .reduce((sum, c) => sum + c.monto, 0);

  const cobradoMes = cuotas
    .filter(c => {
      if (c.estado !== "pagada") return false;
      const venc = new Date(c.fechaVencimiento);
      return venc.getMonth() === mesActual && venc.getFullYear() === anioActual;
    })
    .reduce((sum, c) => sum + c.monto, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold">Cuotas & Cobros</h2>
        <span className="bg-purple/15 text-purple-light border border-purple/30 text-xs font-semibold px-2.5 py-1 rounded-full">
          {cuotas.length} cuotas
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Total Pendiente</p>
          <p className="text-3xl font-bold text-yellow">{formatUSD(totalPendiente)}</p>
        </div>
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Cuotas Vencidas</p>
          <p className="text-3xl font-bold text-red">{formatUSD(cuotasVencidas)}</p>
        </div>
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Próximas 7 días</p>
          <p className="text-3xl font-bold text-yellow">{formatUSD(proximas7dias)}</p>
        </div>
        <div className="bg-card-bg border border-card-border rounded-xl p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Cobrado este mes</p>
          <p className="text-3xl font-bold text-green">{formatUSD(cobradoMes)}</p>
        </div>
      </div>

      {/* Client component handles filter tabs + table */}
      <CuotasClient cuotas={cuotas} />
    </div>
  );
}
