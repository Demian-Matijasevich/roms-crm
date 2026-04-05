import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/auth";
import { TEAM, PROGRAMS, COMMISSION_CLOSER, COMMISSION_SETTER } from "@/lib/constants";
import ConfigClient from "./ConfigClient";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session)) redirect("/");

  return <ConfigClient
    team={TEAM}
    programs={PROGRAMS.map(p => ({ ...p }))}
    commissionCloser={COMMISSION_CLOSER}
    commissionSetter={COMMISSION_SETTER}
  />;
}
