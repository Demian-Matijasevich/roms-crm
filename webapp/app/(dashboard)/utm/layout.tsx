import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function UtmLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.roles.includes("setter") && !session?.roles.includes("admin")) {
    redirect("/");
  }
  return <>{children}</>;
}
