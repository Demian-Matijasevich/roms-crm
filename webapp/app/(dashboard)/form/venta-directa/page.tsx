import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import VentaDirectaForm from "./VentaDirectaForm";

export const dynamic = "force-dynamic";

export default async function VentaDirectaPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Venta por chat</h2>
        <p className="text-muted text-sm mt-1">
          Registrá una venta que se cerró por WhatsApp, DM o cualquier canal sin llamada
        </p>
      </div>
      <VentaDirectaForm closer={session.nombre} />
    </div>
  );
}
