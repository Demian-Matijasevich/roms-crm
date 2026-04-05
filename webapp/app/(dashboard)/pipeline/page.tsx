import { redirect } from "next/navigation";
import { fetchLlamadas, fetchSeguimientos } from "@/lib/sheets";
import { getSession } from "@/lib/auth";
import PipelineClient from "./PipelineClient";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const isAdmin = session.roles.includes("admin");
  const [allLlamadas, seguimientos] = await Promise.all([fetchLlamadas(), fetchSeguimientos()]);
  const llamadas = isAdmin ? allLlamadas : allLlamadas.filter(
    (l) => l.closer === session.nombre || l.setter === session.nombre
  );

  return <PipelineClient llamadas={llamadas} seguimientos={seguimientos} session={session} isAdmin={isAdmin} />;
}
