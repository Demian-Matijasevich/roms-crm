// webapp/lib/gamification.ts
import { Llamada, CloserStats, Seguimiento } from "./types";
import { isCerrado, getCloserStats, filterByMonth, getCurrentMonth } from "./data";

export interface CloserStreak {
  nombre: string;
  currentStreak: number;
  longestStreak: number;
}

export interface CloserRanking {
  nombre: string;
  position: number;
  cashMes: number;
  comision: number;
  streak: number;
}

export interface TodayAgenda {
  type: "call" | "seguimiento" | "cuota";
  lead: Llamada;
  hora?: string;
  diasSinContacto?: number;
  ultimaNota?: string;
  montoCuota?: number;
}

export interface Badge {
  id: string;
  label: string;
  icon: string;
  earned: boolean;
}

export function getCloserStreaks(llamadas: Llamada[]): Map<string, CloserStreak> {
  const streaks = new Map<string, CloserStreak>();
  const closerDates = new Map<string, Set<string>>();

  for (const l of llamadas) {
    if (!isCerrado(l) || !l.closer) continue;
    const date = l.fechaLlamada || l.fechaAgenda;
    if (!date) continue;
    if (!closerDates.has(l.closer)) closerDates.set(l.closer, new Set());
    closerDates.get(l.closer)!.add(date);
  }

  const today = new Date();
  for (const [closer, dates] of closerDates) {
    const todayStr = today.toISOString().split("T")[0];
    const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().split("T")[0];

    if (!dates.has(todayStr) && !dates.has(yesterdayStr)) {
      streaks.set(closer, { nombre: closer, currentStreak: 0, longestStreak: 0 });
      continue;
    }

    let checkDate = dates.has(todayStr) ? new Date(today) : new Date(today.getTime() - 86400000);
    let streak = 0;

    while (dates.has(checkDate.toISOString().split("T")[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    streaks.set(closer, { nombre: closer, currentStreak: streak, longestStreak: streak });
  }

  return streaks;
}

export function getCloserRankings(llamadas: Llamada[], mes?: string): CloserRanking[] {
  const m = mes || getCurrentMonth();
  const stats = getCloserStats(llamadas, m);
  const streaks = getCloserStreaks(llamadas);

  return stats
    .filter(s => s.nombre !== "Sin asignar")
    .map((s, i) => ({
      nombre: s.nombre,
      position: i + 1,
      cashMes: s.cashCollected,
      comision: s.comision,
      streak: streaks.get(s.nombre)?.currentStreak || 0,
    }));
}

export function getTodayAgenda(llamadas: Llamada[], seguimientos: Seguimiento[], closer: string): TodayAgenda[] {
  const today = new Date().toISOString().split("T")[0];
  const agenda: TodayAgenda[] = [];

  // Calls scheduled for today
  for (const l of llamadas) {
    if (l.closer !== closer) continue;
    if ((l.fechaAgenda === today || l.fechaLlamada === today) && !isCerrado(l) && !l.estado.includes("Cancelada")) {
      agenda.push({ type: "call", lead: l, hora: l.fechaLlamada || l.fechaAgenda });
    }
  }

  // Active follow-ups
  const seguimientoLeads = llamadas.filter(l =>
    l.closer === closer &&
    (l.estado.includes("Seguimiento") || l.estado.includes("Re-programada")) &&
    !isCerrado(l)
  );

  for (const l of seguimientoLeads) {
    const leadSeguimientos = seguimientos
      .filter(s => s.leadRowIndex === l.rowIndex)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));

    const latest = leadSeguimientos[0];
    const lastDate = latest?.fecha || l.fechaLlamada || l.fechaAgenda;
    const daysSince = lastDate
      ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000)
      : 999;

    agenda.push({
      type: "seguimiento",
      lead: l,
      diasSinContacto: daysSince,
      ultimaNota: latest?.nota || l.contextoCloser,
    });
  }

  agenda.sort((a, b) => {
    if (a.type !== b.type) return a.type === "call" ? -1 : 1;
    if (a.type === "call") return (a.hora || "").localeCompare(b.hora || "");
    return (b.diasSinContacto || 0) - (a.diasSinContacto || 0);
  });

  return agenda;
}

export function getCloserBadges(llamadas: Llamada[], closerName: string, mes?: string): Badge[] {
  const m = mes || getCurrentMonth();
  const monthLlamadas = filterByMonth(llamadas, m);
  const stats = getCloserStats(llamadas, m);
  const streaks = getCloserStreaks(llamadas);
  const streak = streaks.get(closerName)?.currentStreak || 0;

  const isTopCash = stats[0]?.nombre === closerName;
  const hasLongStreak = streak >= 7;

  const closerMaxTicket = monthLlamadas
    .filter(l => l.closer === closerName && isCerrado(l))
    .reduce((max, l) => Math.max(max, l.cashDia1), 0);
  const globalMaxTicket = monthLlamadas
    .filter(l => isCerrado(l))
    .reduce((max, l) => Math.max(max, l.cashDia1), 0);
  const hasHighestTicket = closerMaxTicket > 0 && closerMaxTicket === globalMaxTicket;

  const hasSameDayClose = monthLlamadas.some(l =>
    l.closer === closerName && isCerrado(l) && l.fechaLlamada === l.fechaAgenda && l.fechaLlamada
  );

  const monthClosed = monthLlamadas
    .filter(l => isCerrado(l))
    .sort((a, b) => (a.fechaLlamada || a.fechaAgenda).localeCompare(b.fechaLlamada || b.fechaAgenda));
  const isFirstSale = monthClosed[0]?.closer === closerName;

  return [
    { id: "top-cash", label: "Closer del mes", icon: "🎯", earned: isTopCash },
    { id: "streak-7", label: "Racha 7+ días", icon: "🔥", earned: hasLongStreak },
    { id: "highest-ticket", label: "Ticket más alto", icon: "💎", earned: hasHighestTicket },
    { id: "same-day", label: "Cierre mismo día", icon: "⚡", earned: hasSameDayClose },
    { id: "first-sale", label: "1ra venta del mes", icon: "🚀", earned: isFirstSale },
  ];
}
