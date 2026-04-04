# Estructura Google Sheets — ROMS CRM

## Hoja 1: CRM Llamadas (la principal — closers cargan acá)

| Columna | Descripción | Quién carga |
|---------|-------------|-------------|
| Nombre del Lead | Nombre completo | Auto (Calendly) / Manual |
| Email | Correo del lead | Auto (Calendly) |
| Teléfono | Número | Auto (Calendly) |
| Instagram | Usuario IG | Auto (Calendly) |
| Fecha Agendado | Cuándo agendó | Auto (Calendly) |
| Fecha Llamada | Cuándo es/fue la call | Auto (Calendly) |
| Closer | Quién toma la call | Manual |
| Estado | Pendiente/Cerrado/No Cierre/No Se Presentó/Seguimiento/Reprogramada | Manual (dropdown) |
| Evento | Tipo de sesión | Auto (Calendly) |
| Fuente del Lead | De dónde viene | Manual (dropdown) |
| Lead Calificado | Sí/No | Manual (dropdown) |
| Programa Pitcheado | Consultoría/Omnipresencia/Multicuentas | Manual (dropdown) |
| Contexto Setter | Notas del setter | Manual |
| Contexto Closer | Notas post-call del closer | Manual |
| Link Llamada | URL de la call | Auto (Calendly) |
| Desde dónde agendó | Respuesta Calendly | Auto (Calendly) |
| Modelo de Negocio | Respuesta Calendly | Auto (Calendly) |
| Inversión Disponible | Respuesta Calendly | Auto (Calendly) |
| Objetivo | Respuesta Calendly | Auto (Calendly) |
| Plan de Pago | Forma de pago acordada | Manual (dropdown) |
| Ticket Total USD | Monto total de la venta | Manual |
| Pago 1 USD | Primer pago | Manual |
| Fecha Pago 1 | Cuándo pagó | Manual |
| Estado Pago 1 | Pagado/Pendiente | Manual (dropdown) |
| Pago 2 USD | Segundo pago | Manual |
| Fecha Pago 2 | | Manual |
| Estado Pago 2 | | Manual (dropdown) |
| Pago 3 USD | Tercer pago | Manual |
| Fecha Pago 3 | | Manual |
| Estado Pago 3 | | Manual (dropdown) |
| Método de Pago | Cómo pagó | Manual (dropdown) |
| Comprobante | Link al comprobante | Manual |

### Columnas calculadas (fórmulas en Sheets):
- **Cash Collected** = suma de pagos con estado "Pagado"
- **Saldo Pendiente** = Ticket Total - Cash Collected
- **% Pagado** = Cash Collected / Ticket Total
- **Es Venta** = SI(Estado = "Cerrado", "Sí", "No")
- **Mes** = TEXTO(Fecha Llamada, "YYYY-MM")

---

## Hoja 2: Gastos

| Columna | Descripción |
|---------|-------------|
| Concepto | Nombre del gasto |
| Fecha | Cuándo se pagó |
| Monto USD | Cuánto |
| Categoría | Tipo de gasto (dropdown) |
| Billetera | Desde dónde se pagó |
| Pagado a | Quién recibe |
| Estado | Pagado/Pendiente |
| Comprobante | Link |

---

## Hoja 3: Equipo

| Columna |
|---------|
| Nombre |
| Rol |
| Email |
| Teléfono |

---

## Hoja 4: Métricas (auto-calculada, NO tocar)

Resumen mensual calculado con fórmulas desde CRM Llamadas y Gastos.

| Columna |
|---------|
| Mes |
| Total Llamadas |
| Presentadas |
| Cerradas |
| % Show Up |
| % Cierre |
| Cash Collected |
| Gastos |
| Resultado Neto |
