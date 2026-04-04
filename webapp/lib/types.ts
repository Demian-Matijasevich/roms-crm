// webapp/lib/types.ts

export interface User {
  nombre: string;
  pin: string;
  roles: Role[];
  activo: boolean;
}

export type Role = "admin" | "closer" | "setter";

export interface Llamada {
  rowIndex: number;
  nombre: string;
  instagram: string;
  fechaLlamada: string;
  fechaAgenda: string;
  setter: string;
  closer: string;
  estado: string;
  sePresentó: string;
  calificado: string;
  programa: string;
  contextoSetter: string;
  contextoCloser: string;
  cashDia1: number;
  cashTotal: number;
  ticketTotal: number;
  planPago: string;
  pago1: number;
  estadoPago1: string;
  pago2: number;
  estadoPago2: string;
  pago3: number;
  estadoPago3: string;
  saldoPendiente: number;
  fechaPago1: string;
  metodoPago: string;
  fuente: string;
  medioAgenda: string;
  email: string;
  telefono: string;
  mes: string;
}

export interface Gasto {
  rowIndex: number;
  fecha: string;
  concepto: string;
  monto: number;
  categoria: string;
  billetera: string;
  pagadoA: string;
  estado: string;
}

export interface Alumno {
  nombre: string;
  programa: string;
  fechaPrimerPago: string;
  fechaVencimiento: string;
  estado: "Activo" | "Por vencer" | "Vencido";
  renovado: "Sí" | "No" | "Pendiente";
  closer: string;
  setter: string;
  diasRestantes: number;
}

export interface CloserStats {
  nombre: string;
  llamadas: number;
  presentadas: number;
  cerradas: number;
  cashCollected: number;
  showUp: number;
  cierreTotal: number;
  cierrePresentadas: number;
  ticketPromedio: number;
  comision: number;
}

export interface SetterStats {
  nombre: string;
  agendas: number;
  presentadas: number;
  cerradas: number;
  calificadas: number;
  tasaAgenda: number;
  cashDeLeads: number;
  comision: number;
}

export interface MonthlyData {
  mes: string;
  label: string;
  llamadas: number;
  presentadas: number;
  cerradas: number;
  cashCollected: number;
  gastos: number;
}

export interface Objetivo {
  nombre: string;
  actual: number;
  meta: number;
  porcentaje: number;
}

export interface Cuota {
  alumno: string;
  programa: string;
  cuotaNum: string;
  monto: number;
  fechaVencimiento: string;
  estado: "pagada" | "pendiente" | "vencida" | "próxima";
  closer: string;
}

export interface AuthSession {
  nombre: string;
  roles: Role[];
}
