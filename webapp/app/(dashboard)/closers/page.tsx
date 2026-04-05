import { redirect } from "next/navigation";
import { fetchLlamadas } from "@/lib/sheets";
import { getSession, isAdmin } from "@/lib/auth";
import ClosersClient from "./ClosersClient";

export const dynamic = "force-dynamic";

export default async function ClosersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session)) redirect("/");
  const llamadas = await fetchLlamadas();
  return <ClosersClient llamadas={llamadas} />;
}
