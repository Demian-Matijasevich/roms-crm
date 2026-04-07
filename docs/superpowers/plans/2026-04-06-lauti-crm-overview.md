# Lauti CRM — Implementation Overview

> **Spec:** `docs/superpowers/specs/2026-04-06-lauti-crm-design.md`

## Phase Breakdown

This CRM is decomposed into 7 implementation phases. Each phase produces working, testable software.

| Phase | Plan File | Description | Depends On |
|-------|-----------|-------------|------------|
| 1 | `2026-04-06-lauti-phase1-foundation.md` | Project scaffold, Supabase schema, auth, types, data layer | — |
| 2 | `2026-04-06-lauti-phase2-core-crm.md` | Leads, Payments, Pipeline, Forms (cargar llamada, pago, venta chat) | Phase 1 |
| 3 | `2026-04-06-lauti-phase3-clients.md` | Clients, Onboarding, Tracker 1a1, Seguimiento de Alumnos, Follow-ups | Phase 1 |
| 4 | `2026-04-06-lauti-phase4-cobranzas.md` | Cobranzas, Agent Tasks, Agent Log, Health Score, Renovation queue | Phase 2+3 |
| 5 | `2026-04-06-lauti-phase5-analytics.md` | Admin Dashboard, Tesorería, Closers Analytics, Gamification, Leaderboard | Phase 2 |
| 6 | `2026-04-06-lauti-phase6-extras.md` | IG Metrics, Reportes Diarios, UTM Builder, Admin Panel, Renovaciones page | Phase 1 |
| 7 | `2026-04-06-lauti-phase7-realtime.md` | Realtime subscriptions, Notifications push, PWA, Airtable migration | Phase 1-6 |

## Project Location

New project at: `C:\Users\matyc\projects\lauti-crm\`

## Execution Strategy

Phases 2, 3, and 6 can be executed in parallel (they only depend on Phase 1).
Phase 4 requires Phase 2+3.
Phase 5 requires Phase 2.
Phase 7 requires all previous phases.
