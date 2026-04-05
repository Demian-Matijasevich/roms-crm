// webapp/lib/constants.ts

export const PROGRAMS = [
  { nombre: "ROMS 7", mensual: 3000, pif: null, duracion: 3 },
  { nombre: "Consultoría", mensual: 4000, pif: 10000, duracion: 3 },
  { nombre: "Omnipresencia", mensual: 7000, pif: 18000, duracion: 3 },
  { nombre: "Multicuentas", mensual: 12000, pif: 30000, duracion: 3 },
] as const;

export const COMMISSION_CLOSER = 0.10;
export const COMMISSION_SETTER = 0.05;
export const PROGRAM_DURATION_DAYS = 90;

export const TEAM: { nombre: string; roles: ("admin" | "closer" | "setter")[] }[] = [
  { nombre: "Valentino", roles: ["closer", "setter"] },
  { nombre: "Agustín", roles: ["closer"] },
  { nombre: "Juan Martín", roles: ["closer"] },
  { nombre: "Fede", roles: ["closer"] },
  { nombre: "Guille", roles: ["setter"] },
  { nombre: "Juanma", roles: ["admin"] },
  { nombre: "Fran", roles: ["admin"] },
];

export const ESTADOS_LLAMADA = [
  "⏳ Pendiente", "🚀 Cerrado", "⚠️ No Cierre",
  "🔄 Seguimiento", "📅 Re-programada", "🚨 Cancelada",
  "💰 Reserva", "Adentro en Seguimiento",
] as const;

export const MONTH_LABELS: Record<string, string> = {
  "2026-1": "Enero 2026", "2026-2": "Febrero 2026", "2026-3": "Marzo 2026",
  "2026-4": "Abril 2026", "2026-5": "Mayo 2026", "2026-6": "Junio 2026",
  "2026-7": "Julio 2026", "2026-8": "Agosto 2026", "2026-9": "Septiembre 2026",
  "2026-10": "Octubre 2026", "2026-11": "Noviembre 2026", "2026-12": "Diciembre 2026",
};

export const SPREADSHEET_ID = "14l6eg-JfY5M00NRSmOT-38f5eRsC0xsOqZl9bsggDv4";
