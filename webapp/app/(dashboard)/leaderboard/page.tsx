// webapp/app/leaderboard/page.tsx
import { fetchLlamadas } from "@/lib/sheets";
import { getCurrentMonth } from "@/lib/data";
import LeaderboardClient from "./LeaderboardClient";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const llamadas = await fetchLlamadas();

  // Derive available months from data
  const monthSet = new Set<string>();
  for (const l of llamadas) {
    if (l.mes && !l.mes.includes("No identificada")) monthSet.add(l.mes);
  }

  const availableMonths = Array.from(monthSet).sort((a, b) => {
    const [ya, ma] = a.split("-").map(Number);
    const [yb, mb] = b.split("-").map(Number);
    return ya !== yb ? ya - yb : ma - mb;
  });

  const currentMonth = getCurrentMonth();
  const defaultMonth =
    availableMonths.includes(currentMonth)
      ? currentMonth
      : availableMonths[availableMonths.length - 1] ?? currentMonth;

  return (
    <LeaderboardClient
      llamadas={llamadas}
      defaultMonth={defaultMonth}
      availableMonths={availableMonths}
    />
  );
}
