// webapp/lib/schemas.ts
import { z } from "zod";

// Sanitize strings to prevent Google Sheets formula injection
function safeString(maxLen = 500) {
  return z.string().max(maxLen).transform(s => {
    const trimmed = s.trim();
    if (trimmed.startsWith("=") || trimmed.startsWith("+") || trimmed.startsWith("-") || trimmed.startsWith("@")) {
      return "'" + trimmed;
    }
    return trimmed;
  });
}

export const loginSchema = z.object({
  nombre: z.string().min(1).max(50),
  pin: z.string().length(4).regex(/^\d{4}$/),
});

export const llamadaSchema = z.object({
  rowIndex: z.number().int().min(2),
  estado: safeString(50),
  sePresentó: z.enum(["Sí", "No", ""]).default(""),
  calificado: z.enum(["Sí", "No", "Parcial", ""]).default(""),
  programa: safeString(50).default(""),
  contextoCloser: safeString(2000).default(""),
  cashDia1: z.number().min(0).default(0),
  planPago: safeString(30).default(""),
  pago1: z.number().min(0).default(0),
  metodoPago: safeString(30).default(""),
});

export const pagoSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(""),
  producto: safeString(50).default(""),
  nombre: safeString(100),
  telefono: safeString(30).default(""),
  monto: z.number().positive(),
  closer: safeString(50).default(""),
  setter: safeString(50).default(""),
  comprobante: safeString(500).default(""),
  concepto: safeString(50),
  receptor: safeString(50).default(""),
  fuente: safeString(50).default(""),
  mes: safeString(20).default(""),
});

export const alumnoUpdateSchema = z.object({
  rowIndex: z.number().int().min(2),
  fields: z.record(z.string(), z.union([safeString(500), z.number()])),
});

export const reporteSetterSchema = z.object({
  fecha: z.string().min(1),
  setter: safeString(50),
  conversacionesIniciadas: z.number().int().min(0),
  respuestasHistorias: z.number().int().min(0),
  calendariosEnviados: z.number().int().min(0),
  notas: safeString(2000).default(""),
});
