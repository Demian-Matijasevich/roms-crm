// webapp/lib/data.ts
import { Llamada, Gasto, CloserStats, SetterStats, MonthlyData, Alumno, Cuota } from "./types";
import { COMMISSION_CLOSER, COMMISSION_SETTER, PROGRAM_DURATION_DAYS, MONTH_LABELS } from "./constants";

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}`;
}

export function filterByMonth(llamadas: Llamada[], mes: string): Llamada[] {
  return llamadas.filter(l => l.mes === mes);
}

export function isCerrado(l: Llamada): boolean {
  return l.estado.toLowerCase().includes("cerrado");
}

export function isPresentada(l: Llamada): boolean {
  return l.sePresentó === "Sí";
}

export function getCloserStats(llamadas: Llamada[], mes?: string): CloserStats[] {
  const filtered = mes ? filterByMonth(llamadas, mes) : llamadas;
  const map = new Map<string, CloserStats>();

  for (const l of filtered) {
    const name = l.closer || "Sin asignar";
    if (!map.has(name)) {
      map.set(name, { nombre: name, llamadas: 0, presentadas: 0, cerradas: 0,
        cashCollected: 0, showUp: 0, cierreTotal: 0, cierrePresentadas: 0,
        ticketPromedio: 0, comision: 0 });
    }
    const s = map.get(name)!;
    s.llamadas++;
    if (isPresentada(l)) s.presentadas++;
    if (isCerrado(l)) { s.cerradas++; s.cashCollected += l.cashDia1; }
  }

  for (const s of map.values()) {
    s.showUp = s.llamadas > 0 ? s.presentadas / s.llamadas : 0;
    s.cierreTotal = s.llamadas > 0 ? s.cerradas / s.llamadas : 0;
    s.cierrePresentadas = s.presentadas > 0 ? s.cerradas / s.presentadas : 0;
    s.ticketPromedio = s.cerradas > 0 ? s.cashCollected / s.cerradas : 0;
    s.comision = s.cashCollected * COMMISSION_CLOSER;
  }

  return Array.from(map.values()).sort((a, b) => b.cashCollected - a.cashCollected);
}

export function getSetterStats(llamadas: Llamada[], mes?: string): SetterStats[] {
  const filtered = mes ? filterByMonth(llamadas, mes) : llamadas;
  const map = new Map<string, SetterStats>();

  for (const l of filtered) {
    const name = l.setter;
    if (!name) continue;
    if (!map.has(name)) {
      map.set(name, { nombre: name, agendas: 0, presentadas: 0, cerradas: 0,
        calificadas: 0, tasaAgenda: 0, cashDeLeads: 0, comision: 0 });
    }
    const s = map.get(name)!;
    s.agendas++;
    if (isPresentada(l)) s.presentadas++;
    if (isCerrado(l)) { s.cerradas++; s.cashDeLeads += l.cashDia1; }
    if (l.calificado === "Sí") s.calificadas++;
  }

  for (const s of map.values()) {
    s.tasaAgenda = s.agendas > 0 ? s.presentadas / s.agendas : 0;
    s.comision = s.cashDeLeads * COMMISSION_SETTER;
  }

  return Array.from(map.values()).sort((a, b) => b.cashDeLeads - a.cashDeLeads);
}

export function getMonthlyData(llamadas: Llamada[], gastos: Gasto[]): MonthlyData[] {
  const map = new Map<string, MonthlyData>();

  for (const l of llamadas) {
    if (!l.mes || l.mes.includes("No identificada")) continue;
    if (!map.has(l.mes)) map.set(l.mes, { mes: l.mes, label: MONTH_LABELS[l.mes] || l.mes,
      llamadas: 0, presentadas: 0, cerradas: 0, cashCollected: 0, gastos: 0 });
    const m = map.get(l.mes)!;
    m.llamadas++;
    if (isPresentada(l)) m.presentadas++;
    if (isCerrado(l)) { m.cerradas++; m.cashCollected += l.cashDia1; }
  }

  for (const g of gastos) {
    const mes = (() => { const p = g.fecha?.split("-"); return p?.length >= 2 ? `${p[0]}-${parseInt(p[1])}` : ""; })();
    if (!mes) continue;
    if (!map.has(mes)) map.set(mes, { mes, label: MONTH_LABELS[mes] || mes,
      llamadas: 0, presentadas: 0, cerradas: 0, cashCollected: 0, gastos: 0 });
    map.get(mes)!.gastos += g.monto;
  }

  return Array.from(map.values()).sort((a, b) => {
    const [ya, ma] = a.mes.split("-").map(Number);
    const [yb, mb] = b.mes.split("-").map(Number);
    return ya !== yb ? ya - yb : ma - mb;
  });
}

export function getAlumnos(llamadas: Llamada[]): Alumno[] {
  const ventas = llamadas.filter(l => isCerrado(l) && l.cashDia1 > 0);
  const today = new Date();

  return ventas.map(l => {
    const fechaPago = l.fechaPago1 || l.fechaLlamada;
    const start = new Date(fechaPago);
    const end = new Date(start);
    end.setDate(end.getDate() + PROGRAM_DURATION_DAYS);
    const dias = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let estado: Alumno["estado"] = "Activo";
    if (dias <= 0) estado = "Vencido";
    else if (dias <= 15) estado = "Por vencer";

    return {
      nombre: l.nombre,
      programa: l.programa || "Sin programa",
      fechaPrimerPago: fechaPago,
      fechaVencimiento: end.toISOString().split("T")[0],
      estado,
      renovado: "Pendiente" as const,
      closer: l.closer,
      setter: l.setter,
      diasRestantes: Math.max(0, dias),
    };
  });
}

export function getCuotas(llamadas: Llamada[]): Cuota[] {
  const ventas = llamadas.filter(l => isCerrado(l) && l.planPago?.includes("Cuota"));
  const today = new Date();
  const cuotas: Cuota[] = [];

  for (const l of ventas) {
    const paymentPairs = [
      { num: "1/3", monto: l.pago1, estado: l.estadoPago1 },
      { num: "2/3", monto: l.pago2, estado: l.estadoPago2 },
      { num: "3/3", monto: l.pago3, estado: l.estadoPago3 },
    ];
    const startDate = new Date(l.fechaPago1 || l.fechaLlamada);

    for (let i = 0; i < paymentPairs.length; i++) {
      const p = paymentPairs[i];
      if (!p.monto && p.estado !== "Pendiente") continue;
      const vencimiento = new Date(startDate);
      vencimiento.setMonth(vencimiento.getMonth() + i);
      const dias = Math.ceil((vencimiento.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let cuotaEstado: Cuota["estado"] = "pendiente";
      if (p.estado === "Pagado") cuotaEstado = "pagada";
      else if (dias < 0) cuotaEstado = "vencida";
      else if (dias <= 7) cuotaEstado = "próxima";

      cuotas.push({
        alumno: l.nombre, programa: l.programa, cuotaNum: p.num,
        monto: p.monto || l.ticketTotal / 3,
        fechaVencimiento: vencimiento.toISOString().split("T")[0],
        estado: cuotaEstado, closer: l.closer,
      });
    }
  }

  return cuotas.sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
}

export function formatUSD(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
