// webapp/app/form/pago/page.tsx
import { fetchLlamadas } from "@/lib/sheets";
import { isCerrado } from "@/lib/data";
import CargarPagoForm from "./CargarPagoForm";

export const dynamic = "force-dynamic";

export default async function CargarPagoPage() {
  const llamadas = await fetchLlamadas();
  const cerradas = llamadas.filter((l) => isCerrado(l));

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Cargar pago</h2>
        <p className="text-muted text-sm mt-1">
          Registrá un pago de cuota de un alumno existente
        </p>
      </div>

      <CargarPagoForm cerradas={cerradas} />
    </div>
  );
}
