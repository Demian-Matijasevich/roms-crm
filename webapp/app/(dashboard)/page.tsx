import { redirect } from "next/navigation";
import { fetchLlamadas, fetchGastos, fetchSeguimientos } from "@/lib/sheets";
import { getSession } from "@/lib/auth";
import { getMonthlyData } from "@/lib/data";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await getSession();
  if (!session) redirect("/login");
  const isAdmin = session.roles.includes("admin");
  const [allLlamadas, gastos, seguimientos] = await Promise.all([
    fetchLlamadas(), fetchGastos(), fetchSeguimientos()
  ]);
  const llamadas = isAdmin ? allLlamadas : allLlamadas.filter(
    (l) => l.closer === session.nombre || l.setter === session.nombre
  );
  const monthly = getMonthlyData(allLlamadas, gastos);

  return <HomeClient
    llamadas={llamadas}
    allLlamadas={allLlamadas}
    gastos={gastos}
    seguimientos={seguimientos}
    monthly={monthly}
    session={session}
    isAdmin={isAdmin}
  />;
}
