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
  // v3 fields (columns AE-AX)
  eventoCalendario: string;
  desdeDonde: string;
  modeloNegocio: string;
  objetivo6Meses: string;
  capacidadInversion: string;
  leadScore: string;
  linkLlamada: string;
  reporteGeneral: string;
  conceptoPago: string;
  comprobante1: string;
  comprobante2: string;
  comprobante3: string;
  fechaPago2: string;
  fechaPago3: string;
  quienRecibe: string;
  montoARS: number;
  fueSeguimiento: string;
  deDondeVieneLead: string;
  tagManychat: string;
  notasInternas: string;
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
  rowIndex: number;
  nombre: string;
  programa: string;
  fechaPrimerPago: string;
  fechaVencimiento: string;
  estado: "Activo" | "Por vencer" | "Vencido";
  renovado: "Sí" | "No" | "Pendiente";
  closer: string;
  setter: string;
  diasRestantes: number;
  instagram: string;
  email: string;
  telefono: string;
  cashTotal: number;
  saldoPendiente: number;
  planPago: string;
  // v3 additions
  modeloNegocio: string;
  capacidadInversion: string;
  leadScore: string;
  quienRecibe: string;
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

export interface Seguimiento {
  rowIndex: number;
  fecha: string;
  lead: string;
  closer: string;
  tipo: string;
  nota: string;
  resultado: string;
  fechaProximoContacto: string;
  leadRowIndex: number;
}

export interface AuthSession {
  nombre: string;
  roles: Role[];
}
