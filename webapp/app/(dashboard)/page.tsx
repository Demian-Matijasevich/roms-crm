import { redirect } from "next/navigation";
import { fetchLlamadas, fetchGastos } from "@/lib/sheets";
import { getSession } from "@/lib/auth";
import { getMonthlyData } from "@/lib/data";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  const isAdmin = session.roles.includes("admin");
  const [allLlamadas, gastos] = await Promise.all([fetchLlamadas(), fetchGastos()]);

  const llamadas = isAdmin
    ? allLlamadas
    : allLlamadas.filter(
        (l) => l.closer === session.nombre || l.setter === session.nombre
      );

  const monthly = getMonthlyData(llamadas, gastos);

  return (
    <DashboardClient
      llamadas={llamadas}
      gastos={gastos}
      monthly={monthly}
      session={session}
      isAdmin={isAdmin}
    />
  );
}
