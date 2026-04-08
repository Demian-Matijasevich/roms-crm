// webapp/app/form/llamada/page.tsx
import { redirect } from "next/navigation";
import { fetchLlamadas } from "@/lib/sheets";
import { getSession } from "@/lib/auth";
import CargarLlamadaForm from "./CargarLlamadaForm";

export const dynamic = "force-dynamic";

export default async function CargarLlamadaPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const llamadas = await fetchLlamadas();

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Cargar llamada</h2>
        <p className="text-muted text-sm mt-1">
          Registrá el resultado de una llamada con un lead
        </p>
      </div>

      <CargarLlamadaForm llamadas={llamadas} closerName={session.nombre} />
    </div>
  );
}
