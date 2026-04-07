# Lauti Cardozo CRM — Design Spec

**Fecha:** 2026-04-06
**Cliente:** Lauti Cardozo (mentoría ecommerce)
**Objetivo:** CRM completo que reemplaza Airtable, con sistema de cobranzas agent-ready, predicciones de churn, y experiencia por rol.

---

## 1. Stack y Arquitectura

- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind CSS 4
- **Backend/DB:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Charts:** Recharts
- **PWA:** next-pwa, mobile-first
- **Automatización:** n8n (Calendly → Supabase, agente IA → WhatsApp)
- **Deployment:** Vercel

### Auth
- Supabase Auth con PIN + magic link
- Row Level Security (RLS) por rol en base de datos
- 5 roles: `admin`, `closer`, `setter`, `cobranzas`, `seguimiento`
- Lauti + Mel + Juanma = admin (Juanma y Lauti NO ven agente). Iván = closer. Joaquín = setter. Jorge = setter (con flag closer). Pepito = seguimiento.

### Real-time
- Supabase Realtime subscriptions: ventas nuevas, pagos de cuotas, cambios de estado
- Sin polling — actualizaciones instantáneas

---

## 2. Modelo de datos

### `leads`
Reemplaza "Reporte de Llamadas" (142 campos → modelo limpio).

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | |
| airtable_id | text | ID original para migración |
| nombre | text | Nombre del lead |
| email | text | |
| telefono | text | |
| instagram | text | |
| instagram_sin_arroba | text generated | |
| fuente | enum | historias, lead_magnet, youtube, instagram, dm_directo, etc. |
| utm_source | text | |
| utm_medium | text | |
| utm_content | text | |
| evento_calendly | text | Calendario 1, 2, Consultoria, etc. |
| calendly_event_id | text | ID del evento Calendly |
| fecha_agendado | timestamptz | |
| fecha_llamada | timestamptz | |
| estado | enum | pendiente, no_show, cancelada, reprogramada, seguimiento, no_calificado, no_cierre, reserva, cerrado, adentro_seguimiento, broke_cancelado |
| setter_id | uuid FK → team_members | |
| closer_id | uuid FK → team_members | |
| cobrador_id | uuid FK → team_members | |
| contexto_setter | text | |
| reporte_general | text | |
| notas_internas | text | |
| experiencia_ecommerce | text | Respuesta de calificación |
| seguridad_inversion | text | Respuesta de calificación |
| tipo_productos | text | |
| compromiso_asistencia | text | |
| dispuesto_invertir | text | |
| decisor | text | Solo o con socio/pareja |
| lead_calificado | enum | calificado, no_calificado, podria |
| lead_score | enum(A,B,C,D) | Calculado automático |
| link_llamada | text | |
| programa_pitcheado | enum | mentoria_1k_pyf, mentoria_2_5k_pyf, mentoria_2_8k_pyf, mentoria_5k, skool, vip_5k, mentoria_2_5k_cuotas, mentoria_5k_cuotas, mentoria_1k_cuotas, mentoria_fee, cuota_vip_mantencion |
| concepto | enum | pif, fee, primera_cuota, segunda_cuota |
| plan_pago | enum | paid_in_full, 2_cuotas, 3_cuotas, personalizado |
| ticket_total | decimal | USD |
| fue_seguimiento | boolean | |
| es_cierre_mismo_dia | boolean generated | fecha_llamada = fecha pago 1 |
| de_donde_viene_lead | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `payments`
Normalizado — cada cuota es un registro separado.

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | |
| lead_id | uuid FK → leads | |
| client_id | uuid FK → clients | NULL si es pago de venta nueva |
| numero_cuota | int | 1, 2, 3 |
| monto_usd | decimal | |
| monto_ars | decimal | |
| fecha_pago | date | Fecha efectiva de pago |
| fecha_vencimiento | date | Cuándo vencía |
| estado | enum | pendiente, pagado, perdido |
| metodo_pago | enum | binance, transferencia, caja_ahorro_usd, link_mp, cash, uruguayos, link_stripe |
| receptor | text | Juanma, Cuenta pesos Lauti, Cuenta dolares Lauti, efectivo, Binance lauti, Stripe, Financiera Payments, Becheq |
| comprobante_url | text | URL en Supabase Storage |
| cobrador_id | uuid FK → team_members | Quién cobró |
| verificado | boolean | Cash verificado |
| es_renovacion | boolean | Si es pago de renovación |
| renewal_id | uuid FK → renewal_history | NULL si no es renovación |
| created_at | timestamptz | |

### `clients`
Reemplaza "Base de Clientes" (126 campos → modelo limpio).

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | |
| airtable_id | text | |
| lead_id | uuid FK → leads | Lead original |
| nombre | text | |
| email | text | |
| telefono | text | |
| programa | enum | Mismo enum que leads |
| estado | enum | activo, pausado, inactivo, solo_skool, no_termino_pagar |
| fecha_onboarding | date | |
| fecha_offboarding | date | |
| total_dias_programa | int | Días totales del programa |
| llamadas_base | int | Sesiones 1a1 incluidas en el programa |
| pesadilla | boolean | Cliente problemático |
| exito | boolean | |
| discord | boolean | Tiene acceso |
| skool | boolean | Tiene acceso |
| win_discord | boolean | Posteó win |
| semana_1_estado | enum | primeras_publicaciones, primera_venta, escalando_anuncios |
| semana_1_accionables | text | |
| semana_2_estado | enum | |
| semana_2_accionables | text | |
| semana_3_estado | enum | |
| semana_3_accionables | text | |
| semana_4_estado | enum | |
| semana_4_accionables | text | |
| facturacion_mes_1 | text | |
| facturacion_mes_2 | text | |
| facturacion_mes_3 | text | |
| facturacion_mes_4 | text | |
| estado_seguimiento | enum | para_seguimiento, no_necesita, seguimiento_urgente |
| fecha_ultimo_seguimiento | date | |
| fecha_proximo_seguimiento | date | |
| notas_seguimiento | text | |
| notas_conversacion | text | |
| estado_contacto | enum | por_contactar, contactado, respondio_renueva, respondio_debe_cuota, es_socio, no_renueva, no_responde, numero_invalido, retirar_acceso, verificar |
| responsable_renovacion | uuid FK → team_members | Quién gestiona renovaciones de este cliente |
| origen | enum | skool_ig, solo_skool, registro_normal, grupo_wa_esa, grupo_ig_ecom |
| canal_contacto | enum | whatsapp, instagram_dm, email_skool, buscar |
| prioridad_contacto | enum | a_wa_sin_nombre, b_ig_solo_username, c_solo_skool, d_nombre_parcial |
| categoria | enum | activo_ok, cuotas_pendientes, deudor, solo_skool_verificar, etc. |
| email_skool | text | |
| en_wa_esa | boolean | |
| en_ig_grupo | boolean | |
| deudor_usd | decimal | |
| deudor_vencimiento | date | |
| health_score | int | 0-100, calculado |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `tracker_sessions`
Reemplaza "Tracker 1a1" — mejorado.

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | |
| client_id | uuid FK → clients | |
| fecha | date | |
| numero_sesion | int | Sin límite fijo |
| tipo_sesion | enum | estrategia_inicial, revision_ajuste, cierre_ciclo, adicional |
| estado | enum | programada, done, cancelada_no_asistio |
| enlace_llamada | text | |
| assignee_id | uuid FK → team_members | |
| notas_setup | text | |
| pitch_upsell | boolean | |
| rating | int | 1-10 |
| aprendizaje_principal | text | |
| feedback_cliente | text | |
| herramienta_mas_util | text | |
| action_items | jsonb | Array de tareas acordadas |
| follow_up_date | date | Cuándo hacer seguimiento |
| created_at | timestamptz | |

### `daily_reports`

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | |
| setter_id | uuid FK → team_members | |
| fecha | date | |
| conversaciones_iniciadas | int | |
| respuestas_historias | int | |
| calendarios_enviados | int | |
| ventas_por_chat | text | |
| conversaciones_lead_inicio | text | |
| agendas_confirmadas | text | |
| origen_principal | text[] | Array de orígenes |
| created_at | timestamptz | |

### `ig_metrics`

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | |
| periodo | text | |
| fecha_inicio | date | |
| fecha_fin | date | |
| cuentas_alcanzadas | int | |
| delta_alcance_pct | decimal | |
| impresiones | int | |
| delta_impresiones_pct | decimal | |
| visitas_perfil | int | |
| delta_visitas_pct | decimal | |
| toques_enlaces | int | |
| delta_enlaces_pct | decimal | |
| pct_alcance_no_seguidores | decimal | |
| nuevos_seguidores | int | |
| delta_seguidores_pct | decimal | |
| unfollows | int | |
| total_seguidores | int | |
| total_interacciones | int | |
| delta_interacciones_pct | decimal | |
| cuentas_interaccion | int | |
| pct_interaccion_no_seguidores | decimal | |
| reels_publicados | int | |
| interacciones_reels | int | |
| delta_reels_pct | decimal | |
| likes_reels | int | |
| comentarios_reels | int | |
| compartidos_reels | int | |
| guardados_reels | int | |
| posts_publicados | int | |
| interacciones_posts | int | |
| delta_posts_pct | decimal | |
| likes_posts | int | |
| comentarios_posts | int | |
| compartidos_posts | int | |
| guardados_posts | int | |
| stories_publicadas | int | |
| interacciones_stories | int | |
| delta_stories_pct | decimal | |
| respuestas_stories | int | |
| conversaciones_dm | int | |
| pct_hombres | decimal | |
| pct_mujeres | decimal | |
| top_paises | text | |
| top_ciudades | text | |
| top_edades | text | |
| leads_ig | int | |
| ventas_ig | int | |
| cash_ig | decimal | |
| created_at | timestamptz | |

### `team_members`

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | Para login |
| nombre | text | |
| etiqueta | text | |
| rol | text | |
| email | text | |
| telefono | text | |
| fecha_nacimiento | date | |
| foto_url | text | |
| observaciones | text | |
| is_admin | boolean | |
| is_closer | boolean | |
| is_setter | boolean | |
| is_cobranzas | boolean | |
| is_seguimiento | boolean | |
| comision_pct | decimal | 0.10, 0.05, etc. |
| can_see_agent | boolean | Solo Mel = true |
| pin | text | Para login |
| activo | boolean | |

### `payment_methods`

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | |
| nombre | text | |
| titular | text | |
| tipo_moneda | enum | ars, usd |
| cbu | text | |
| alias_cbu | text | |
| banco | text | |
| id_cuenta | text | |
| observaciones | text | |

### `onboarding`

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | |
| client_id | uuid FK → clients | |
| lead_id | uuid FK → leads | |
| fecha_ingreso | date | |
| edad | int | |
| email | text | |
| telefono | text | |
| discord_user | text | |
| skool_user | text | |
| redes_sociales | text | |
| red_social_origen | text[] | |
| porque_compro | text | |
| victoria_rapida | text | |
| resultado_esperado | text | |
| compromiso_pagos | boolean | |
| confirmo_terminos | boolean | |
| etapa_ecommerce | enum | cero, experiencia_sin_resultados, experiencia_escalar |
| topico_compra | text | |
| created_at | timestamptz | |

### `agent_tasks`

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | |
| tipo | enum | cobrar_cuota, renovacion, seguimiento, oportunidad_upsell, bienvenida, seguimiento_urgente, confirmar_pago |
| client_id | uuid FK → clients | NULL si es lead |
| lead_id | uuid FK → leads | NULL si es cliente |
| payment_id | uuid FK → payments | NULL si no aplica |
| prioridad | int | 1 (alta) a 5 (baja) |
| estado | enum | pending, in_progress, done, failed |
| asignado_a | enum | agent, human |
| human_assignee_id | uuid FK → team_members | Si asignado a humano |
| canal | enum | whatsapp, email, dm_instagram |
| contexto | jsonb | Todo lo que el agente necesita |
| scheduled_at | timestamptz | Cuándo ejecutar |
| completed_at | timestamptz | |
| resultado | text | |
| notas | text | |
| created_at | timestamptz | |

### `agent_log`

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | |
| task_id | uuid FK → agent_tasks | |
| accion | text | Qué hizo |
| mensaje_enviado | text | |
| respuesta_recibida | text | |
| resultado | text | |
| created_at | timestamptz | |

### `utm_campaigns`

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | |
| url | text | |
| source | text | |
| medium | text | |
| content | text | |
| setter_id | uuid FK → team_members | |
| created_at | timestamptz | |

### `renewal_history`
Historial de renovaciones — toda la data de renovaciones vive acá, no embebida en `clients`.

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | |
| client_id | uuid FK → clients | |
| tipo_renovacion | enum | resell, upsell_vip, upsell_meli, upsell_vip_cuotas, upsell_meli_cuotas, resell_cuotas |
| programa_anterior | enum | |
| programa_nuevo | enum | |
| monto_total | decimal | |
| plan_pago | enum | paid_in_full, 2_cuotas |
| estado | enum | pago, no_renueva, cuota_1_pagada, cuota_2_pagada |
| fecha_renovacion | date | |
| comprobante_url | text | |
| responsable_id | uuid FK → team_members | |
| created_at | timestamptz | |

Los pagos individuales de renovación (cuotas) van en `payments` con `es_renovacion = true` y FK a este registro vía `renewal_id`.

### `client_follow_ups`
Historial de seguimientos (nuevo).

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | |
| client_id | uuid FK → clients | |
| author_id | uuid FK → team_members | Quién hizo el seguimiento |
| fecha | date | |
| tipo | enum | llamada, whatsapp, dm, email, presencial |
| notas | text | |
| proxima_accion | text | |
| proxima_fecha | date | |
| created_at | timestamptz | |

---

## 3. Views SQL (cálculos 7-7)

### Función helper: `get_month_7_7(date)`
Recibe una fecha y devuelve el "mes fiscal" al que pertenece (ej: 2026-04-07 a 2026-05-06 = "Abril 2026").

### `v_monthly_cash`
Cash collected del periodo 7-7 actual y anterior, desglosado por ventas nuevas, cuotas y renovaciones.

### `v_commissions`
Comisiones por team member del periodo 7-7: closer 10%, setter 5%, cobranzas 10%.

### `v_treasury`
Flujo de dinero agrupado por receptor de pago, filtrable por periodo.

### `v_pipeline`
Estado del pipeline con métricas: total leads, show up rate, calificación rate, cierre rate, AOV.

### `v_renewal_queue`
Clientes próximos a vencer ordenados por prioridad, con semáforo y días restantes.

### `v_session_availability`
Sesiones 1a1 disponibles vs consumidas por cliente, con alerta de consumo.

### `v_client_health`
Health score calculado por cliente: pagos (30%), sesiones (20%), avance semanal (20%), actividad (15%), facturación (15%).

### `v_setter_kpis`
KPIs por setter del periodo 7-7: conversaciones, agendas, ventas chat, comisiones.

### `v_closer_kpis`
KPIs por closer: llamadas, show up, cierre, AOV, cash, comisiones, streak.

---

## 4. Pantallas por rol

### ADMIN (Lauti + Mel)

#### Home / Dashboard
- KPIs del mes 7-7: cash collected total, ventas nuevas, renovaciones, cuotas cobradas, ticket promedio
- Comparativa vs mes anterior (delta %)
- Gráfico de cash collected diario acumulado (línea)
- Banner real-time de ventas/pagos nuevos
- Alertas de cuotas vencidas hoy

#### Pipeline
- Kanban: Pendiente → Seguimiento → Cerrado → Perdido
- Filtros por closer, setter, fecha, programa
- Click en tarjeta → detalle completo del lead

#### Tesorería
- Vista por receptor: Juanma, Binance, Stripe, Cuenta pesos Lauti, etc.
- Filtro por periodo (7-7), método de pago, programa
- Breakdown: ventas nuevas vs cuotas vs renovaciones
- Totales por moneda (USD + ARS)
- Exportar a PDF

#### Cobranzas (agent-ready)
- Cola de tareas priorizada: quién contactar, por qué, monto, días vencido
- Semáforos: rojo vencida, amarillo vence esta semana, verde al día
- Estado contacto: Por contactar → Contactado → Respondió → Resultado
- Log de acciones (humano y agente — agente solo visible para Mel)
- Filtro: cuotas / renovaciones / deudores
- Botón "Marcar hecho" + notas
- El agente de IA consume esta misma cola

#### Clientes
- Tabla con búsqueda, filtros por estado, programa, semáforo
- Detalle de cliente: datos, programa, pagos, sesiones 1a1, seguimiento semanal, historial renovaciones
- Semáforo de sesiones: verde tiene disponibles, amarillo última, rojo consumió todas

#### Seguimiento de Alumnos
- Cola de seguimientos priorizada: rojo urgente, amarillo pendiente, verde al día
- Vista por semana: etapa de cada alumno (publicaciones → venta → escalando)
- Accionables por semana
- Timeline del alumno: onboarding, 1a1, pagos, notas, facturación
- Notas de seguimiento con fecha y autor
- Métricas de salud: sesiones, pagos, semanas, rating, facturación
- Flag automático: sin actividad X días → cola urgente + tarea agente

#### Tracker 1a1
- Vista calendario de sesiones programadas
- Vista tabla: cliente, sesión #, estado, rating, pitch upsell
- Dashboard: disponibles vs consumidas
- Alertas: "X tiene 0 sesiones, programa vence en 15 días" → genera tarea upsell

#### Renovaciones
- Timeline de renovaciones por cliente
- Métricas: tasa de renovación, revenue por renovación, churn rate
- Predicción: alta probabilidad (score alto, pagos al día) vs riesgo churn (score bajo)

#### Closers Analytics (gamificado)
- Leaderboard con ranking, streaks, badges
- Funnel: agendas → show up → calificados → cierre
- KPIs: tasa cierre, AOV, cash, comisiones
- Trends mes a mes

#### IG Metrics
- Dashboard semanal con todos los KPIs
- Gráficos tendencia: alcance, seguidores, engagement
- Funnel IG: alcance → visita → enlace → lead → venta → cash
- Comparativa semana vs semana
- Rates: ER/reel, save rate, share rate, frecuencia

#### Reportes Diarios
- Tabla de reportes por setter por día
- Métricas acumuladas

#### UTM Builder
- Crear UTMs, ver performance por campaña

#### Admin Panel
- Gestión equipo, programas, métodos de pago, receptores
- Config comisiones

### CLOSER (Iván, Jorge cuando cierra)

#### Home gamificado
- Sus KPIs: llamadas hoy, streak, ranking
- Agenda del día (Calendly)
- Últimas ventas

#### Mis Llamadas
- Tabla filtrada a sus leads
- Formulario post-llamada

#### Pipeline personal
- Kanban solo con sus leads

#### Leaderboard
- Ve a todos, se compara

### SETTER (Joaquín, Jorge cuando settea)

#### Home
- KPIs: agendas, ventas chat, comisiones

#### Cargar Venta por Chat
- Formulario rápido

#### Reporte Diario
- Formulario actividad del día

#### Leaderboard
- Ve a todos, se compara

### COBRANZAS (Mel — admin + vista específica)

#### Cola de cobranzas
- Lista priorizada
- Acciones rápidas: contactado, pagado, subir comprobante
- Historial de gestión
- Ve acciones del agente

### SEGUIMIENTO (Pepito)

#### Cola de seguimientos
- Lista priorizada de alumnos
- Acciones: registrar seguimiento, notas, próxima fecha
- Ve estado de salud de cada alumno

---

## 5. Health Score (predicción)

Calculado automático, 0-100:

| Factor | Peso | Lógica |
|---|---|---|
| Pagos al día | 30% | Cuotas pagadas a tiempo vs vencidas |
| Sesiones 1a1 | 20% | Rating promedio + % consumidas |
| Avance semanal | 20% | Progreso semanas 1-4 |
| Actividad reciente | 15% | Último seguimiento, último contacto |
| Facturación reportada | 15% | Tendencia mes a mes |

Semáforo: verde 80-100 (sano), amarillo 50-79 (atención), rojo 0-49 (riesgo churn).

Score alimenta la cola del agente:
- Score cae a rojo → tarea seguimiento_urgente
- Score alto + sesiones consumidas → tarea oportunidad_upsell

---

## 6. Sistema de agente IA

### Generación automática de tareas

| Trigger | Tarea | Prioridad |
|---|---|---|
| Cuota vence en 3 días | cobrar_cuota | Media |
| Cuota vencida | cobrar_cuota | Alta |
| Cliente a 15 días de vencer programa | renovacion | Media |
| Cliente venció programa | renovacion | Alta |
| Sin actividad 7+ días | seguimiento | Media |
| Consumió todas las 1a1 | oportunidad_upsell | Normal |
| Venta cerrada | bienvenida | Alta |
| Rating 1a1 <= 5 | seguimiento_urgente | Alta |
| Pago marcado Pagado | confirmar_pago | Normal |
| Health score cae a rojo | seguimiento_urgente | Alta |

### Visibilidad
- Mel ve todo: tareas del agente + log de acciones
- Lauti y Juanma NO ven al agente — tareas aparecen como completadas sin detalle
- Pepito ve tareas de seguimiento asignadas a él

### Flujo del agente (n8n)
1. Cada 30 min lee tareas `pending` asignadas a `agent`
2. Lee contexto JSON
3. Ejecuta acción (WA, email)
4. Loguea en `agent_log`
5. Actualiza estado

### No duplicación
Si ya existe tarea activa para mismo cliente + mismo tipo → no crea otra.

---

## 7. Notificaciones push (PWA)

| Evento | Destinatario |
|---|---|
| Venta nueva | Todos |
| Pago cuota recibido | Mel, Lauti |
| Agenda nueva Calendly | Closer asignado |
| Cuota vencida | Mel |
| Consumió todas las 1a1 | Lauti |
| Score cayó a rojo | Pepito |
| Agente completó tarea | Mel |

Implementación: Supabase Database Webhooks → n8n → Web Push API.

---

## 8. Integraciones n8n

### Flujo 1: Calendly → Supabase
- Webhook Calendly → n8n → insert en `leads` o `tracker_sessions`
- Asigna setter/closer según calendario

### Flujo 2: Generador de tareas (cron diario 8:00)
- Consulta views de Supabase
- Genera tareas en `agent_tasks` sin duplicar

### Flujo 3: Agente de cobranzas (cada 30 min)
- Lee tareas pending → envía WA → loguea → actualiza estado

### Flujo 4: IG Metrics (manual)
- Se pasan datos → se pushean a Supabase vía API o formulario

### Flujo 5: Onboarding automático
- Venta cerrada → tarea bienvenida → formulario → crea `clients`

### Flujo 6: Notificaciones push
- Database webhooks → n8n → Web Push API

---

## 9. Migración de Airtable

### Paso 1 — Schema
- Crear tablas en Supabase
- Views SQL para 7-7, comisiones, tesorería
- RLS policies
- pg_cron para generación de tareas

### Paso 2 — Data
- Script: Airtable API → transformar → Supabase
- Normalizar pagos (3 embebidos → registros separados)
- Mapear campos legacy/duplicados
- Migrar comprobantes a Supabase Storage
- Preservar `airtable_id`

### Paso 3 — Validación
- Comparar totales: cash, leads, clientes
- Verificar fórmulas 7-7
- Validado → Airtable se apaga

---

## 10. Gamificación

Mismo sistema de ROMS adaptado:
- Streaks de cierre (días consecutivos con al menos 1 venta)
- Badges: primera venta, 10 cierres, mejor mes, etc.
- Leaderboard mensual (7-7) con medallas oro/plata/bronce
- Ranking por: cash collected, tasa de cierre, AOV
- Visible para closers y setters, motivacional

---

## 11. Decisiones técnicas clave

1. **Pagos normalizados** — cada cuota es un registro en `payments`, no campos embebidos. Hace trivial la tesorería, comisiones y reportes.
2. **Health score en PostgreSQL** — view materializada que se refresca cada hora con pg_cron.
3. **Mes 7-7 como función SQL** — `get_month_7_7(date)` se usa en todas las views, un solo lugar para mantener.
4. **Agent tasks con contexto JSON** — el agente no necesita hacer queries complejas, todo lo que necesita está en el campo `contexto`.
5. **RLS desde el día 1** — seguridad a nivel de base de datos, no solo UI.
6. **Visibilidad del agente controlada por `can_see_agent`** en team_members.
