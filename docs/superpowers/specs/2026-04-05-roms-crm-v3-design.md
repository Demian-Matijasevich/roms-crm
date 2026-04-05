# ROMS CRM v3.0 — Design Spec

## Overview

CRM de ventas profesional para 7 ROMS (consultoría y crecimiento digital). Equipo de 4 closers, 2 setters, 2 admins vendiendo programas de mentoría high-ticket ($3k-$30k). Next.js + Google Sheets como backend, Vercel, n8n para automatizaciones, Calendly para agendas.

## Usuarios y prioridad

- **Admin** (Juanma, Fran) — Control total: revenue, comisiones, performance, forecast, rentabilidad, tesorería. Prioridad ALTA.
- **Closer** (Juan Martín, Agustín, Valentino, Fede) — Pipeline personal, carga rápida, ranking, comisiones. Prioridad ALTA.
- **Setter** (Valentino, Guille) — UTM builder + reporte diario. Prioridad BAJA (funcionalidad mínima).

## Decisiones de diseño

1. **Backend: Google Sheets se mantiene** — algunos del equipo editan directo en el Sheet. La app lee y escribe al Sheet via API.
2. **Home del closer: Híbrido gamificado** — streak + ranking arriba, agenda del día al centro, KPIs abajo.
3. **Seguimientos: Structured** — cada interacción se registra como un mini-log con fecha + nota + resultado. Timeline visible. Alertas automáticas si pasan X días sin contacto.
4. **Gamificación: Full** — streaks, badges, animaciones de cierre, closer del mes, rachas. Competencia activa.
5. **Notificaciones de venta: Banner sutil** — barra que aparece para todos cuando alguien cierra. Se desvanece en 5 segundos.
6. **Analytics de Calendly: Correlación + Segmentación** — analizar qué perfil cierra más, qué modelo de negocio compra qué programa, qué fuente real convierte mejor.
7. **Reportes: Branded para externos** — PDF con logo 7ROMS, diseño profesional, para socios/inversores.
8. **Multi-moneda** — todo en USD pero con registro opcional en ARS. Tesorería por receptor/billetera.
9. **Calendario financiero** — vista mensual con cash/día, calls agendadas, cuotas vencidas, renovaciones.
10. **Comisiones detalladas** — desglose por venta, vista closer (las suyas) y vista admin (todas).

---

## Secciones de la app (12)

### 1. 🏠 Home (Admin + Closer)

**Vista Closer:**
- Barra superior: racha de días cerrando (🔥), posición en ranking (#1 de 4), comisión acumulada del mes
- Sección "Tu día": fecha, badges con conteos (X calls, X seguimientos, X cuotas a cobrar)
- Lista de tareas del día:
  - Calls agendadas: nombre, hora, datos clave del Calendly (modelo negocio, capacidad inversión), Lead Score (A+/B/C/D), botón "Cargar" directo
  - Seguimientos pendientes: nombre, días sin contacto, última nota, botón "Actualizar"
  - Cuotas a cobrar hoy: nombre, monto, botón "Registrar pago"
- KPIs del mes abajo: cash, llamadas, cierre %, ticket promedio — cada uno con tendencia vs mes anterior (▲/▼ %)

**Vista Admin:**
- Igual pero con datos globales de todo el equipo
- Secciones extra: "cuotas a cobrar hoy" y "alumnos por vencer" con listados

### 2. 📞 Pipeline (Admin + Closer)

**Vista kanban con 4 columnas:**
- ⏳ Pendiente — leads agendados sin resultado
- 🔄 Seguimiento — leads en proceso, con alerta de días sin contacto
- 🚀 Cerrado — deals ganados con programa y cash
- ❌ Perdido — no cierre, cancelada, no calificado

**Cada card muestra:** nombre, Lead Score, hora de call (si pendiente), días sin contacto (si seguimiento), cash + programa (si cerrado)

**Click en un lead → panel expandido con:**
- Datos completos: nombre, IG, email, teléfono, respuestas Calendly
- Timeline de seguimiento:
  - Cada interacción es una entrada: fecha, tipo (call inicial, seguimiento #N), nota, resultado
  - Indicadores visuales: puntos en timeline con colores (púrpura = call, amarillo = seguimiento, verde = cierre, gris = próximo)
  - Alerta roja si pasan 3+ días sin actualización
- Acciones rápidas: "+ Agregar nota", "Re-agendar call", "Descartar"

**Closer ve solo su pipeline, admin ve todos (filtrable por closer)**

### 3. 📅 Calendario (Admin)

**Vista mensual tipo calendario:**
- Cada día muestra badges de color:
  - 🟢 Verde: cash ingresado ese día (monto)
  - 🟣 Púrpura: calls agendadas (conteo)
  - 🔴 Rojo: cuotas vencidas
  - 🟡 Amarillo: renovaciones próximas
- Navegación entre meses (← →)
- Leyenda de colores arriba
- Click en un día → detalle: quién pagó, cuánto, quién recibió, qué cuota venció, qué alumno renueva

### 4. 👥 Clientes (Admin)

**Base de clientes activos (evolución de la página Alumnos actual):**
- Tabla con: nombre, programa, closer, setter, fecha inicio, vencimiento, días restantes, estado (Activo/Por vencer/Vencido), saldo pendiente, renovación
- Filtros: por estado, por closer, por programa
- Botón "Editar" → drawer lateral para modificar datos
- Indicadores visuales: verde (activo), amarillo (por vencer ≤15 días), rojo (vencido)
- Columna de saldo: amarillo si >0, verde "Pagado" si 0

### 5. 📊 Closers (Admin)

**Selector de closer arriba (o "Todos" para comparar)**

**Funnel de conversión:**
- Barras horizontales decrecientes: Agendas → Show-up → Calificados → Cerrados
- Cada barra con conteo y % respecto al total

**5 KPIs únicos:**
- Velocidad de cierre (días promedio entre agenda y cierre)
- Revenue por llamada (cash total ÷ total llamadas)
- Tasa de cobro (cash collected ÷ ticket total, cuánto realmente cobran)
- Pipeline activo (cuántos en seguimiento ahora)
- Cierre día 1 (% de ventas que cierran el mismo día de la call)

**Distribución por programa:** barras horizontales mostrando qué % de ventas es cada programa

**Tendencia semanal:** mini bar chart con cash por semana del mes, indicador de tendencia alcista/bajista

### 6. 💰 Finanzas + Tesorería (Admin)

**P&L del mes:**
- 3 cards grandes: Ingresos | Gastos + Comisiones | Resultado neto

**Tesorería — "Dónde está la plata":**
- Cards por receptor/billetera: Juanma ($X), Financiera BECHECK ($X), Binance ($X), Fran ($X)
- Cada card muestra: nombre, cantidad de pagos recibidos, monto total
- Datos vienen del campo "Quién recibe" en cada pago

**Registro de cada pago incluye:** monto USD + monto ARS (opcional) + quién recibe + método de pago + comprobante (link)

**Gastos por categoría** (existente, se mantiene)

### 7. 🏆 Leaderboard (Todos)

**Cards de closers ordenados por cash:**
- Medallas (🥇🥈🥉), nombre, cash total, ventas, cierre %, racha de fuego

**"Quién es #1 en cada métrica":**
- 5 mini-cards: Cash, Cierre %, Ticket promedio, Velocidad, Racha
- Cada una muestra medalla + nombre del líder

**Badges:**
- 🎯 Closer del mes
- 🔥 Racha 7+ días cerrando
- 💎 Ticket más alto del mes
- ⚡ Cierre mismo día
- 🚀 Primera venta del mes

**Setters:** sección separada abajo con ranking por agendas generadas

### 8. 💳 Comisiones (Admin + Closer)

**Vista Closer (ve solo las suyas):**
- Comisión acumulada del mes (número grande)
- Cash generado × 10% = comisión
- Desglose por venta: tabla con alumno, programa, cash, comisión

**Vista Admin:**
- Misma estructura pero con TODOS los closers + setters
- Filtrable por persona
- Estado: comisión pagada vs pendiente
- Exportable a PDF

### 9. 🔬 Analytics (Admin)

**Respuestas Calendly vs Cierre:**
- Capacidad de inversión → % de cierre (barra por cada respuesta posible)
- Modelo de negocio → programa más vendido (mapping visual)

**Fuente real vs Performance:**
- Tabla: fuente (del Calendly, no UTM), leads, cierre %, ticket promedio, cash total
- Identificar qué canal trae leads que realmente pagan

**Perfil ideal:** combinación de respuestas que tiene mayor tasa de cierre (a futuro: Lead Score automático basado en esto)

### 10. 📝 Carga rápida (Closer)

**Forms optimizados (existentes, mejorados):**
- Cargar resultado de call: seleccionar lead → resultado → pago (si cerró). Mínimos clicks.
- Cargar pago: buscar alumno → concepto + monto + método + quién recibe + comprobante
- Agregar nota de seguimiento: seleccionar lead en seguimiento → nota + fecha próximo contacto

### 11. 🔗 UTM + Reporte (Setter)

- UTM Builder con Calendly links (existente)
- Reporte diario: conversaciones, respuestas historias, calendarios enviados, notas

### 12. ⚙️ Config (Admin)

**Panel de configuración editable desde la UI:**
- Equipo: agregar/quitar miembros, cambiar roles, cambiar PINs
- Comisiones: % por rol (hoy fijo 10%/5%, editable por persona)
- Programas: nombre, precio mensual, PIF, duración
- Objetivos mensuales: metas de cash, llamadas, cerradas, comisiones
- Receptores de pago: lista de billeteras/personas que reciben pagos

---

## Features transversales

### Banner de ventas
- Cuando un closer marca una venta como cerrada, banner sutil aparece para todos los users online
- Formato: "🚀 Juan Martín cerró $7,000 en Omnipresencia"
- Se desvanece en 5 segundos
- Implementación: polling cada 30s al API, o localStorage event si mismo dispositivo

### Búsqueda global (⌘K)
- Command palette que busca en leads, alumnos, closers por nombre
- Resultados con tipo (Lead, Alumno, Closer) e ícono
- Click → navega al detalle

### Export PDF branded
- Botón en páginas clave (Finanzas, Closers, Comisiones)
- PDF con: logo 7ROMS, fecha, título de reporte, datos tabulados, gráficos
- Diseño profesional para presentar a socios/inversores

### Multi-moneda
- Todo en USD como moneda principal
- Campo opcional "Monto ARS" en pagos
- Tesorería muestra totales en USD

### Loading states
- Skeleton screens en todas las páginas (shimmer effect)
- Feedback visual al guardar (spinner → check verde)
- No más pantallas blancas

### Seguridad
- Firmar cookies con jose (no más base64 plano)
- Auth check en TODAS las API routes (verificar sesión)
- Validación con zod en todos los inputs
- Rate limiting en login (máx 5 intentos/minuto)

---

## Columnas nuevas en Google Sheet "📞 Registro Calls"

Se agregan 20 columnas (AE a AX) al Sheet existente:

| Columna | Campo | Tipo | Dropdown values |
|---------|-------|------|-----------------|
| AE | Evento/Calendario | Dropdown | Sesión Auditoría Martin, Sesión Auditoría Agus, etc. |
| AF | Desde dónde se agendó | Dropdown | Instagram DM, Instagram Stories, WhatsApp, YouTube, Página web, Referido, Otro |
| AG | Modelo de negocio | Dropdown | Experto/referente, Negocio tradicional, Ecommerce/marca, Ya posicionado |
| AH | Objetivo 6 meses | Dropdown | Incrementar ventas, Volverse referente, Crecer horizontal |
| AI | Capacidad de inversión | Dropdown | Sí dispuesto, No pero puede, No ni dispuesto |
| AJ | Lead Score | Fórmula auto (A+/A/B/C/D) basado en respuestas |
| AK | Link de llamada | URL |
| AL | Reporte General | Texto largo |
| AM | Concepto de pago | Dropdown | 1era Cuota, PIF, 2da Cuota, 3ra Cuota, Resell |
| AN | Comprobante 1 | URL |
| AO | Comprobante 2 | URL |
| AP | Comprobante 3 | URL |
| AQ | Fecha Pago 2 | Fecha |
| AR | Fecha Pago 3 | Fecha |
| AS | Quién recibe | Dropdown | Juanma, Fran, Financiera BECHECK, Binance, etc. |
| AT | Monto ARS | Number |
| AU | Fue Seguimiento | Checkbox | Sí, No |
| AV | De dónde viene el lead (manual) | Texto |
| AW | Tag Manychat | Texto |
| AX | Notas internas | Texto |

**Lead Score fórmula:**
- A+ = Sí puede invertir + Experto o Ya posicionado + Fuente directa (DM/WhatsApp)
- A = Sí puede invertir + cualquier modelo
- B = No pero puede conseguirlo + buen modelo
- C = No pero puede conseguirlo + modelo débil
- D = No ni dispuesto

---

## Datos de seguimiento

Los seguimientos se registran como filas en una nueva hoja del Sheet: "🔄 Seguimientos"

| Columna | Campo |
|---------|-------|
| A | Fecha |
| B | Lead (nombre) |
| C | Closer |
| D | Tipo (Call inicial, Seguimiento #N, Re-agenda, Cierre, Descarte) |
| E | Nota |
| F | Resultado |
| G | Fecha próximo contacto |
| H | Row index del lead en Registro Calls (FK) |

La app lee esta hoja para construir el timeline de cada lead en el Pipeline.

---

## Formato del Sheet

El Sheet "📞 Registro Calls" ya tiene aplicado:
- Headers púrpura con texto blanco bold
- Filas alternadas (dark/darker)
- Columnas frozen (nombre + IG)
- Dropdowns de validación en todos los campos de selección
- Formato condicional: estado cerrado (verde), no cierre (rojo), seguimiento (amarillo), saldo pendiente (amarillo), cash > 0 (verde), pagos (verde pagado, rojo vencido)
- Formato currency en columnas de dinero
- Bordes sutiles

Se aplicará el mismo formato a las columnas nuevas y a la hoja de seguimientos.

---

## Stack técnico

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, Recharts
- **Backend:** Next.js API routes, Google Sheets API v4
- **Auth:** PIN-based con cookies firmadas (jose)
- **Deploy:** Vercel
- **Automatización:** n8n Cloud (Calendly → Sheet)
- **PWA:** manifest.json + service worker

---

## Fases de implementación (orden sugerido)

### Fase 1: Seguridad + Fixes
1. Firmar sesiones con jose
2. Auth check en todas las API routes
3. Validación zod en inputs
4. Rate limiting en login

### Fase 2: Data (Sheet + tipos)
5. Agregar 20 columnas al Sheet con formato
6. Crear hoja "🔄 Seguimientos"
7. Actualizar types.ts, sheets.ts, data.ts
8. Actualizar n8n workflow para capturar campos nuevos

### Fase 3: Home gamificado
9. Rediseñar home closer (streak + agenda + KPIs)
10. Home admin (vista global)
11. Banner de ventas sutil

### Fase 4: Pipeline + Seguimientos
12. Vista kanban con 4 columnas
13. Panel expandido con timeline de seguimiento
14. Form de agregar nota de seguimiento
15. Alertas de días sin contacto

### Fase 5: Calendario + Finanzas
16. Calendario financiero mensual
17. Tesorería por receptor/billetera
18. Multi-moneda (ARS opcional)

### Fase 6: Closers + Analytics
19. Página /closers con funnel, KPIs, distribución, tendencias
20. Analytics de respuestas Calendly
21. Lead Score (cálculo + visualización)

### Fase 7: Gamificación + Leaderboard
22. Leaderboard gamificado con streaks, badges, #1 por métrica
23. Comisiones detalladas (vista closer + admin)

### Fase 8: UX Polish
24. Loading states / skeleton screens
25. Búsqueda global ⌘K
26. Paginación en tablas
27. Export PDF branded

### Fase 9: Config admin
28. Panel de configuración (equipo, comisiones, programas, objetivos, receptores)

### Fase 10: Sheet profesional
29. Formatear hojas restantes
30. Fórmulas de Lead Score en el Sheet
31. Dashboard nativo en Sheet para usuarios directos
