// webapp/app/finanzas/page.tsx
import { fetchLlamadas, fetchGastos, fetchPagos } from "@/lib/sheets";
import { getSession } from "@/lib/auth";
import { getCurrentMonth, getMonthlyData } from "@/lib/data";
import { MONTH_LABELS } from "@/lib/constants";
import FinanzasClient from "./FinanzasClient";

export const dynamic = "force-dynamic";

export default async function FinanzasPage() {
  const [llamadas, gastos, pagos] = await Promise.all([fetchLlamadas(), fetchGastos(), fetchPagos()]);

  const monthlyData = getMonthlyData(llamadas, gastos);

  // Derive available months from data
  const monthSet = new Set<string>();
  for (const l of llamadas) {
    if (l.mes && !l.mes.includes("No identificada")) monthSet.add(l.mes);
  }
  for (const g of gastos) {
    const p = g.fecha?.split("-");
    if (p?.length >= 2) monthSet.add(`${p[0]}-${parseInt(p[1])}`);
  }

  const availableMonths = Array.from(monthSet).sort((a, b) => {
    const [ya, ma] = a.split("-").map(Number);
    const [yb, mb] = b.split("-").map(Number);
    return ya !== yb ? ya - yb : ma - mb;
  });

  // Pick best default: latest month with data, fallback to current
  const currentMonth = getCurrentMonth();
  const defaultMonth =
    availableMonths.includes(currentMonth)
      ? currentMonth
      : availableMonths[availableMonths.length - 1] ?? currentMonth;

  return (
    <FinanzasClient
      llamadas={llamadas}
      gastos={gastos}
      pagos={pagos}
      monthlyData={monthlyData}
      defaultMonth={defaultMonth}
      availableMonths={availableMonths}
    />
  );
}
