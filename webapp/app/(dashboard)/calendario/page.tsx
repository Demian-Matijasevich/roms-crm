import { redirect } from "next/navigation";
import { fetchLlamadas, fetchGastos } from "@/lib/sheets";
import { getSession, isAdmin } from "@/lib/auth";
import CalendarioClient from "./CalendarioClient";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session)) redirect("/");
  const [llamadas, gastos] = await Promise.all([fetchLlamadas(), fetchGastos()]);
  return <CalendarioClient llamadas={llamadas} gastos={gastos} />;
}
