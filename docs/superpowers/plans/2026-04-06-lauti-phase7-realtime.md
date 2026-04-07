# Lauti CRM Phase 7: Realtime, PWA & Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** Wire up Supabase Realtime for instant dashboard updates, make the app installable as a PWA with push notifications, migrate all data from Airtable to Supabase, and document n8n integration flows.

**Architecture:** Supabase Realtime subscriptions via JS v2 `channel().on()` API wrapped in a React context provider. PWA via `@ducanh2912/next-pwa` (Next.js 16 compatible). Push notifications via Web Push API with VAPID keys, subscription stored in `team_members.push_subscription`. Migration script uses Airtable REST API with pagination (100 records/page) and maps to Supabase schema preserving `airtable_id` for cross-reference.

**Tech Stack:** Next.js 16, Supabase JS v2, @ducanh2912/next-pwa, Web Push API, web-push (npm), Airtable REST API

**Spec:** `docs/superpowers/specs/2026-04-06-lauti-crm-design.md`
**Airtable Schema:** `C:\Users\matyc\projects\roms-crm\lauti-airtable-schema.json`
**Depends on:** Phases 1-6 (all pages, components, DB tables, auth, views)

---

### Task 1: Supabase Realtime Subscriptions

**Files:**
- Create: `lib/realtime.ts`
- Create: `app/components/RealtimeProvider.tsx`
- Modify: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Create `lib/realtime.ts` with useRealtimeSubscription hook**

```typescript
// lib/realtime.ts
"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type PostgresChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface SubscriptionConfig {
  table: string;
  schema?: string;
  event?: PostgresChangeEvent;
  filter?: string;
}

export function useRealtimeSubscription<T extends Record<string, unknown>>(
  config: SubscriptionConfig,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void,
  enabled: boolean = true
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabaseBrowser();
    const channelName = `realtime-${config.table}-${config.event ?? "all"}-${Date.now()}`;

    const channelConfig: Record<string, string> = {
      event: config.event ?? "*",
      schema: config.schema ?? "public",
      table: config.table,
    };

    if (config.filter) {
      channelConfig.filter = config.filter;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as any,
        channelConfig,
        (payload: RealtimePostgresChangesPayload<T>) => {
          callbackRef.current(payload);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [config.table, config.schema, config.event, config.filter, enabled]);

  return channelRef;
}

export function useRealtimeMulti(
  configs: Array<SubscriptionConfig & { callback: (payload: any) => void }>,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled || configs.length === 0) return;

    const supabase = getSupabaseBrowser();
    const channelName = `realtime-multi-${Date.now()}`;
    let channel = supabase.channel(channelName);

    for (const config of configs) {
      const channelConfig: Record<string, string> = {
        event: config.event ?? "*",
        schema: config.schema ?? "public",
        table: config.table,
      };
      if (config.filter) {
        channelConfig.filter = config.filter;
      }
      channel = channel.on("postgres_changes" as any, channelConfig, config.callback);
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, configs.length]);
}
```

- [ ] **Step 2: Create `app/components/RealtimeProvider.tsx`**

```typescript
// app/components/RealtimeProvider.tsx
"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { useRealtimeMulti } from "@/lib/realtime";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface SaleEvent {
  id: string;
  closer_name: string;
  lead_name: string;
  programa: string;
  ticket_total: number;
  timestamp: number;
}

interface PaymentEvent {
  id: string;
  lead_name?: string;
  client_name?: string;
  monto_usd: number;
  numero_cuota: number;
  timestamp: number;
}

interface RealtimeContextValue {
  saleBannerQueue: SaleEvent[];
  dismissSale: (id: string) => void;
  paymentEvents: PaymentEvent[];
  agentTasksVersion: number;
  cobranzasVersion: number;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  saleBannerQueue: [],
  dismissSale: () => {},
  paymentEvents: [],
  agentTasksVersion: 0,
  cobranzasVersion: 0,
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [saleBannerQueue, setSaleBannerQueue] = useState<SaleEvent[]>([]);
  const [paymentEvents, setPaymentEvents] = useState<PaymentEvent[]>([]);
  const [agentTasksVersion, setAgentTasksVersion] = useState(0);
  const [cobranzasVersion, setCobranzasVersion] = useState(0);

  const dismissSale = useCallback((id: string) => {
    setSaleBannerQueue((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleLeadInsert = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    if (payload.eventType !== "INSERT") return;
    const record = payload.new;
    if (record.estado !== "cerrado") return;

    const saleEvent: SaleEvent = {
      id: record.id,
      closer_name: record.closer_name ?? "Closer",
      lead_name: record.nombre ?? "Lead",
      programa: record.programa_pitcheado ?? "",
      ticket_total: record.ticket_total ?? 0,
      timestamp: Date.now(),
    };
    setSaleBannerQueue((prev) => [...prev, saleEvent]);
  }, []);

  const handlePaymentChange = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    const record = payload.new as any;
    if (!record || record.estado !== "pagado") return;

    const paymentEvent: PaymentEvent = {
      id: record.id,
      monto_usd: record.monto_usd ?? 0,
      numero_cuota: record.numero_cuota ?? 1,
      timestamp: Date.now(),
    };
    setPaymentEvents((prev) => [...prev.slice(-19), paymentEvent]);
  }, []);

  const handleAgentTaskUpdate = useCallback(() => {
    setAgentTasksVersion((v) => v + 1);
    setCobranzasVersion((v) => v + 1);
  }, []);

  const configs = useRef([
    {
      table: "leads",
      event: "INSERT" as const,
      filter: "estado=eq.cerrado",
      callback: handleLeadInsert,
    },
    {
      table: "payments",
      event: "*" as const,
      filter: "estado=eq.pagado",
      callback: handlePaymentChange,
    },
    {
      table: "agent_tasks",
      event: "UPDATE" as const,
      callback: handleAgentTaskUpdate,
    },
  ]);

  useRealtimeMulti(configs.current);

  return (
    <RealtimeContext.Provider
      value={{
        saleBannerQueue,
        dismissSale,
        paymentEvents,
        agentTasksVersion,
        cobranzasVersion,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}
```

- [ ] **Step 3: Wrap dashboard layout with RealtimeProvider**

In `app/(dashboard)/layout.tsx`, import and wrap children:

```typescript
// Add to app/(dashboard)/layout.tsx
import { RealtimeProvider } from "@/app/components/RealtimeProvider";

// Inside the layout component, wrap {children}:
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <RealtimeProvider>
        <main className="flex-1 overflow-auto bg-gray-50 p-6">
          {/* existing SaleBanner placeholder + children */}
          {children}
        </main>
      </RealtimeProvider>
    </div>
  );
}
```

- [ ] **Step 4: Verify** -- app builds without errors, Realtime channel subscribes in browser devtools (Network > WS tab shows Supabase Realtime connection).

- [ ] **Step 5: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add lib/realtime.ts app/components/RealtimeProvider.tsx app/\(dashboard\)/layout.tsx
git commit -m "feat: add Supabase Realtime subscriptions for leads, payments, agent_tasks"
```

---

### Task 2: Sale Banner with Realtime

**Files:**
- Modify: `app/components/SaleBanner.tsx`

- [ ] **Step 1: Rewrite SaleBanner to consume RealtimeProvider**

Replace the placeholder `app/components/SaleBanner.tsx` with:

```typescript
// app/components/SaleBanner.tsx
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRealtime } from "@/app/components/RealtimeProvider";

const DISMISS_AFTER_MS = 5000;

function formatProgram(programa: string): string {
  const map: Record<string, string> = {
    mentoria_1k_pyf: "Mentoria 1K PYF",
    mentoria_2_5k_pyf: "Mentoria 2.5K PYF",
    mentoria_2_8k_pyf: "Mentoria 2.8K PYF",
    mentoria_5k: "Mentoria 5K",
    skool: "Skool",
    vip_5k: "VIP 5K",
    mentoria_2_5k_cuotas: "Mentoria 2.5K Cuotas",
    mentoria_5k_cuotas: "Mentoria 5K Cuotas",
    mentoria_1k_cuotas: "Mentoria 1K Cuotas",
    mentoria_fee: "Mentoria Fee",
    cuota_vip_mantencion: "Cuota VIP Mantencion",
  };
  return map[programa] ?? programa;
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Rising tone: C5 -> E5 -> G5
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
    oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3); // G5

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.6);
  } catch {
    // Web Audio API not available — silent fail
  }
}

export default function SaleBanner() {
  const { saleBannerQueue, dismissSale } = useRealtime();
  const [currentSale, setCurrentSale] = useState<(typeof saleBannerQueue)[0] | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundPlayedRef = useRef<Set<string>>(new Set());

  const dismissCurrent = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      if (currentSale) {
        dismissSale(currentSale.id);
      }
      setCurrentSale(null);
    }, 300); // wait for slide-out animation
  }, [currentSale, dismissSale]);

  // Pick the next sale from the queue
  useEffect(() => {
    if (currentSale || saleBannerQueue.length === 0) return;

    const next = saleBannerQueue[0];
    setCurrentSale(next);

    // Play sound only once per sale
    if (!soundPlayedRef.current.has(next.id)) {
      soundPlayedRef.current.add(next.id);
      playNotificationSound();
    }

    // Animate in
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Auto-dismiss
    timerRef.current = setTimeout(() => {
      dismissCurrent();
    }, DISMISS_AFTER_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [saleBannerQueue, currentSale, dismissCurrent]);

  if (!currentSale) return null;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      }`}
    >
      <div
        className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white rounded-xl shadow-2xl px-6 py-4 flex items-center gap-4 min-w-[400px] max-w-[600px] cursor-pointer"
        onClick={dismissCurrent}
      >
        <span className="text-3xl animate-bounce">&#x1F680;</span>
        <div className="flex-1">
          <p className="font-bold text-lg leading-tight">
            {currentSale.closer_name} cerro a {currentSale.lead_name}
          </p>
          <p className="text-purple-100 text-sm">
            {formatProgram(currentSale.programa)} &mdash; {formatUSD(currentSale.ticket_total)}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            dismissCurrent();
          }}
          className="text-purple-200 hover:text-white transition-colors text-xl font-bold"
        >
          &times;
        </button>
      </div>
      {/* Queue indicator */}
      {saleBannerQueue.length > 1 && (
        <div className="text-center mt-1">
          <span className="text-xs text-gray-500 bg-white/80 rounded-full px-2 py-0.5">
            +{saleBannerQueue.length - 1} mas
          </span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Ensure SaleBanner is rendered inside RealtimeProvider**

In `app/(dashboard)/layout.tsx`, the `<SaleBanner />` must be inside the `<RealtimeProvider>` wrapper (it already should be from Task 1 Step 3).

- [ ] **Step 3: Verify** -- Manually insert a lead with `estado='cerrado'` in Supabase dashboard. Banner should appear with animation and sound, auto-dismiss after 5s.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add app/components/SaleBanner.tsx
git commit -m "feat: SaleBanner with Supabase Realtime, animation and sound notification"
```

---

### Task 3: PWA Setup

**Files:**
- Modify: `next.config.ts`
- Create: `public/manifest.json`
- Create: `public/icons/icon-128.png`, `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Install @ducanh2912/next-pwa**

```bash
cd /c/Users/matyc/projects/lauti-crm
npm install @ducanh2912/next-pwa
```

- [ ] **Step 2: Create `public/manifest.json`**

```json
{
  "name": "Lauti CRM",
  "short_name": "LautiCRM",
  "description": "CRM para mentoria ecommerce de Lauti Cardozo",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f0a1e",
  "theme_color": "#7c3aed",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 3: Generate PWA icons**

Create a script to generate simple purple gradient icons using canvas (Node.js):

```bash
cd /c/Users/matyc/projects/lauti-crm
mkdir -p public/icons
node -e "
const { createCanvas } = require('canvas');
const fs = require('fs');
const sizes = [128, 192, 512];
sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  // Purple gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#7c3aed');
  gradient.addColorStop(1, '#4f46e5');
  ctx.fillStyle = gradient;
  // Rounded rect
  const r = size * 0.15;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();
  // 'L' letter
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold ' + (size * 0.5) + 'px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('L', size / 2, size / 2);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('public/icons/icon-' + size + '.png', buffer);
  console.log('Created icon-' + size + '.png');
});
"
```

If `canvas` npm package is not available, create the icons manually with any image editor — a 512x512 purple gradient square with a white "L" in the center, then resize to 192 and 128.

- [ ] **Step 4: Update `next.config.ts` with PWA config**

```typescript
// next.config.ts
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  fallbacks: {
    document: "/offline",
  },
});

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default withPWA(nextConfig);
```

- [ ] **Step 5: Add PWA meta tags to `app/layout.tsx`**

Add inside `<head>` (or via metadata export):

```typescript
// In app/layout.tsx, update the metadata export:
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Lauti CRM",
  description: "CRM para mentoria ecommerce de Lauti Cardozo",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lauti CRM",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
```

Also add apple touch icon link in the head:

```tsx
// Inside RootLayout, in <head>:
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

- [ ] **Step 6: Create offline fallback page**

Create `app/offline/page.tsx`:

```typescript
// app/offline/page.tsx
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Sin conexion</h1>
        <p className="text-gray-400 mb-6">
          Lauti CRM necesita conexion a internet para funcionar.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify** -- Run `npm run build`, check that `public/sw.js` is generated. Open in Chrome, check Application tab > Manifest is detected and "Install" prompt appears. Test on mobile (iOS Safari: share > Add to Home Screen; Android Chrome: install banner).

- [ ] **Step 8: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add next.config.ts public/manifest.json public/icons/ app/layout.tsx app/offline/
git commit -m "feat: PWA setup with manifest, service worker, icons, offline fallback"
```

---

### Task 4: Push Notifications

**Files:**
- Create: `lib/push-notifications.ts`
- Create: `app/api/notifications/subscribe/route.ts`
- Create: `app/api/notifications/send/route.ts`
- Modify: `app/components/Sidebar.tsx`
- Add to `.env.local`: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

- [ ] **Step 1: Generate VAPID keys and install web-push**

```bash
cd /c/Users/matyc/projects/lauti-crm
npm install web-push
npx web-push generate-vapid-keys
```

Add the generated keys to `.env.local`:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<generated public key>
VAPID_PRIVATE_KEY=<generated private key>
VAPID_EMAIL=mailto:lauti@example.com
```

- [ ] **Step 2: Add `push_subscription` column to team_members**

Create migration `supabase/migrations/007_push_subscription.sql`:

```sql
-- Add push subscription storage to team_members
ALTER TABLE team_members
ADD COLUMN push_subscription jsonb DEFAULT NULL;

COMMENT ON COLUMN team_members.push_subscription IS 'Web Push API subscription object (endpoint, keys)';
```

- [ ] **Step 3: Create `lib/push-notifications.ts`**

```typescript
// lib/push-notifications.ts
"use client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.warn("Push notifications not supported");
    return "denied";
  }
  return Notification.requestPermission();
}

export async function subscribeToPush(teamMemberId: string): Promise<boolean> {
  try {
    const permission = await requestPermission();
    if (permission !== "granted") return false;

    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Send subscription to server
    const response = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamMemberId,
        subscription: subscription.toJSON(),
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to subscribe to push:", error);
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
    return true;
  } catch (error) {
    console.error("Failed to unsubscribe:", error);
    return false;
  }
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}
```

- [ ] **Step 4: Create `app/api/notifications/subscribe/route.ts`**

```typescript
// app/api/notifications/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamMemberId, subscription } = body;

    if (!teamMemberId || !subscription) {
      return NextResponse.json({ error: "Missing teamMemberId or subscription" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { error } = await supabase
      .from("team_members")
      .update({ push_subscription: subscription })
      .eq("id", teamMemberId);

    if (error) {
      console.error("Failed to store subscription:", error);
      return NextResponse.json({ error: "Failed to store subscription" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Create `app/api/notifications/send/route.ts`**

```typescript
// app/api/notifications/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Notification event types and their recipients
const EVENT_RECIPIENTS: Record<string, { roles?: string[]; memberIds?: string[] }> = {
  venta_nueva: { roles: ["admin", "closer", "setter", "cobranzas", "seguimiento"] },
  pago_cuota: { roles: ["admin"] }, // Mel + Lauti = admin
  agenda_calendly: {}, // dynamic: closer_id from payload
  cuota_vencida: { memberIds: [] }, // Mel only — resolved at runtime
  consumio_1a1: { memberIds: [] }, // Lauti only — resolved at runtime
  score_rojo: { roles: ["seguimiento"] }, // Pepito
  agente_completo: { memberIds: [] }, // Mel only — resolved at runtime
};

interface SendPayload {
  event: string;
  title: string;
  body: string;
  url?: string;
  recipientIds?: string[]; // Override: send to specific team member IDs
}

export async function POST(request: NextRequest) {
  try {
    // Validate API key for n8n calls
    const authHeader = request.headers.get("authorization");
    const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SendPayload = await request.json();
    const { event, title, body: notifBody, url, recipientIds } = body;

    if (!event || !title || !notifBody) {
      return NextResponse.json({ error: "Missing event, title, or body" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // Resolve recipients
    let query = supabase
      .from("team_members")
      .select("id, nombre, push_subscription, is_admin, is_closer, is_setter, is_cobranzas, is_seguimiento, can_see_agent")
      .eq("activo", true)
      .not("push_subscription", "is", null);

    if (recipientIds && recipientIds.length > 0) {
      query = query.in("id", recipientIds);
    }

    const { data: members, error } = await query;

    if (error || !members) {
      return NextResponse.json({ error: "Failed to fetch recipients" }, { status: 500 });
    }

    // Filter by event type if no explicit recipientIds
    let recipients = members;
    if (!recipientIds && EVENT_RECIPIENTS[event]?.roles) {
      const roles = EVENT_RECIPIENTS[event].roles!;
      recipients = members.filter((m) => {
        if (roles.includes("admin") && m.is_admin) return true;
        if (roles.includes("closer") && m.is_closer) return true;
        if (roles.includes("setter") && m.is_setter) return true;
        if (roles.includes("cobranzas") && m.is_cobranzas) return true;
        if (roles.includes("seguimiento") && m.is_seguimiento) return true;
        return false;
      });
    }

    // Send push to each recipient
    const payload = JSON.stringify({
      title,
      body: notifBody,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-128.png",
      data: { url: url ?? "/" },
    });

    const results = await Promise.allSettled(
      recipients.map(async (member) => {
        try {
          await webpush.sendNotification(member.push_subscription as any, payload);
          return { id: member.id, status: "sent" };
        } catch (err: any) {
          // If subscription expired, clear it
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase
              .from("team_members")
              .update({ push_subscription: null })
              .eq("id", member.id);
          }
          return { id: member.id, status: "failed", error: err.message };
        }
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled" && (r.value as any).status === "sent").length;
    const failed = results.length - sent;

    return NextResponse.json({ sent, failed, total: results.length });
  } catch (error) {
    console.error("Send notification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Add push notification listener to service worker**

Append to `public/sw.js` (or create if next-pwa doesn't auto-generate push handling):

```javascript
// public/custom-sw.js — merged into sw.js by next-pwa's customWorkerSrc
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const { title, body, icon, badge, data: notifData } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon || "/icons/icon-192.png",
      badge: badge || "/icons/icon-128.png",
      vibrate: [200, 100, 200],
      data: notifData,
      actions: [{ action: "open", title: "Abrir" }],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
```

Update `next.config.ts` to include custom worker:

```typescript
const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  customWorkerSrc: "public/custom-sw.js",
  fallbacks: {
    document: "/offline",
  },
});
```

- [ ] **Step 7: Add "Habilitar notificaciones" button to Sidebar**

In `app/components/Sidebar.tsx`, add at the bottom of the sidebar nav:

```typescript
// Add to Sidebar.tsx imports:
import { useState, useEffect } from "react";
import { isPushSupported, subscribeToPush, getPushPermission } from "@/lib/push-notifications";

// Inside Sidebar component, add state and handler:
const [pushStatus, setPushStatus] = useState<"idle" | "enabled" | "denied" | "unsupported">("idle");

useEffect(() => {
  if (!isPushSupported()) {
    setPushStatus("unsupported");
    return;
  }
  const perm = getPushPermission();
  if (perm === "granted") setPushStatus("enabled");
  else if (perm === "denied") setPushStatus("denied");
}, []);

const handleEnablePush = async () => {
  // session.teamMemberId comes from the auth context
  const success = await subscribeToPush(session.teamMemberId);
  setPushStatus(success ? "enabled" : "denied");
};

// Render at the bottom of sidebar, before logout:
{pushStatus === "idle" && (
  <button
    onClick={handleEnablePush}
    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-purple-900/30 rounded-lg transition-colors w-full"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
    Habilitar notificaciones
  </button>
)}
{pushStatus === "enabled" && (
  <span className="flex items-center gap-2 px-3 py-2 text-sm text-green-400">
    <span className="w-2 h-2 bg-green-400 rounded-full" />
    Notificaciones activas
  </span>
)}
```

- [ ] **Step 8: Verify** -- Click "Habilitar notificaciones" in sidebar. Browser should prompt for permission. After granting, test with curl:

```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d '{"event":"venta_nueva","title":"Nueva venta!","body":"Ivan cerro a Juan — Mentoria 5K"}'
```

Push notification should appear on desktop/mobile.

- [ ] **Step 9: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add lib/push-notifications.ts app/api/notifications/ public/custom-sw.js app/components/Sidebar.tsx supabase/migrations/007_push_subscription.sql next.config.ts .env.local
git commit -m "feat: push notifications with Web Push API, VAPID keys, subscribe/send endpoints"
```

---

### Task 5: Airtable Migration Script

**Files:**
- Create: `scripts/migrate-airtable.ts`

**Airtable tables and IDs (from schema):**
| Airtable Table | Table ID | Target Supabase Table |
|---|---|---|
| Reporte de Llamadas | `tbleCytRILP3D7Q3N` | `leads` + `payments` |
| Base de Clientes | `tbloD4rZPAyBKoylS` | `clients` |
| Historial Renovaciones | `tblDSzP54VuEfce8e` | `renewal_history` |
| Onboarding | `tbl0Jw1vRoaSAcZgP` | `onboarding` |
| Tracker 1a1 | `tblln5DRvO6iZBdLa` | `tracker_sessions` |
| Reportes Diarios | `tblpfZMziou1Ny9sU` | `daily_reports` |
| IG Metrics | `tbl17rny30qYztVo3` | `ig_metrics` |
| Integrantes del equipo | `tblRxMpUKOhfkF0ys` | `team_members` (update) |
| Metodos de Pago | `tblBB1qH1c8q42rxU` | `payment_methods` (update) |
| UTMs Builder | `tblA5iKXDDqpBUh0x` | `utm_campaigns` |

- [ ] **Step 1: Install Airtable SDK**

```bash
cd /c/Users/matyc/projects/lauti-crm
npm install airtable
npm install -D tsx @types/node
```

- [ ] **Step 2: Create `scripts/migrate-airtable.ts`**

```typescript
// scripts/migrate-airtable.ts
// Run with: npx tsx scripts/migrate-airtable.ts
//
// Requires .env.local with:
//   AIRTABLE_TOKEN=AIRTABLE_TOKEN_REDACTED
//   AIRTABLE_BASE_ID=appRlYaISIRx0QEVe
//   NEXT_PUBLIC_SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...

import Airtable from "airtable";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

// ─── Config ─────────────────────────────────────────
// Load .env.local manually
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIndex = trimmed.indexOf("=");
  if (eqIndex === -1) continue;
  const key = trimmed.slice(0, eqIndex);
  const value = trimmed.slice(eqIndex + 1);
  process.env[key] = value;
}

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

Airtable.configure({ apiKey: AIRTABLE_TOKEN });
const base = Airtable.base(AIRTABLE_BASE_ID);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// ─── ID Maps ────────────────────────────────────────
// Maps Airtable record IDs to Supabase UUIDs
const idMap: Record<string, string> = {};
// Maps Airtable collaborator IDs/names to team_member UUIDs
const teamMap: Record<string, string> = {};

// ─── Logging ────────────────────────────────────────
const LOG_FILE = path.resolve(__dirname, "../migration.log");
let logStream: fs.WriteStream;

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  logStream?.write(line + "\n");
}

function logError(msg: string, err?: any) {
  const line = `[${new Date().toISOString()}] ERROR: ${msg} ${err ? JSON.stringify(err) : ""}`;
  console.error(line);
  logStream?.write(line + "\n");
}

// ─── Airtable Fetch with Pagination ─────────────────
async function fetchAllRecords(tableId: string): Promise<Airtable.Record<any>[]> {
  const records: Airtable.Record<any>[] = [];
  return new Promise((resolve, reject) => {
    base(tableId)
      .select({ pageSize: 100 })
      .eachPage(
        (pageRecords, fetchNextPage) => {
          records.push(...pageRecords);
          log(`  Fetched ${records.length} records from ${tableId}...`);
          fetchNextPage();
        },
        (err) => {
          if (err) reject(err);
          else resolve(records);
        }
      );
  });
}

// ─── Supabase Upsert Helper ─────────────────────────
async function upsertBatch(table: string, rows: Record<string, any>[], conflictColumn = "airtable_id") {
  if (rows.length === 0) return;
  // Upsert in batches of 500
  const BATCH_SIZE = 500;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: conflictColumn });
    if (error) {
      logError(`Upsert ${table} batch ${i}/${rows.length}`, error);
      throw error;
    }
  }
  log(`  Upserted ${rows.length} rows into ${table}`);
}

// ─── Attachment handler ─────────────────────────────
async function migrateAttachment(
  attachments: Array<{ url: string; filename: string; type: string }> | undefined,
  bucket: string,
  prefix: string
): Promise<string | null> {
  if (!attachments || attachments.length === 0) return null;
  const att = attachments[0]; // Take first attachment
  try {
    const response = await fetch(att.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());

    const ext = att.filename.split(".").pop() || "bin";
    const storagePath = `${prefix}/${randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
      contentType: att.type || "application/octet-stream",
      upsert: true,
    });

    if (error) {
      logError(`Upload attachment ${att.filename}`, error);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    return data.publicUrl;
  } catch (err) {
    logError(`Migrate attachment ${att.filename}`, err);
    return null;
  }
}

// ─── Helper: resolve collaborator to team_member ID ─
function resolveCollaborator(field: any): string | null {
  if (!field) return null;
  // Airtable collaborator: { id: string, email: string, name: string }
  const name = (field.name || field.email || field.id || "").toLowerCase();
  return teamMap[name] || null;
}

// ─── Helper: resolve record link to UUID ────────────
function resolveRecordLink(field: any): string | null {
  if (!field) return null;
  if (Array.isArray(field) && field.length > 0) {
    return idMap[field[0]] || null;
  }
  if (typeof field === "string") {
    return idMap[field] || null;
  }
  return null;
}

// ─── Helper: safe enum mapping ──────────────────────
function mapEnum<T extends string>(value: string | undefined | null, mapping: Record<string, T>, fallback: T): T {
  if (!value) return fallback;
  const normalized = value.toLowerCase().trim();
  return mapping[normalized] ?? fallback;
}

// ─── Estado de llamada mapping ──────────────────────
const ESTADO_LLAMADA_MAP: Record<string, string> = {
  "pendiente": "pendiente",
  "no show": "no_show",
  "no_show": "no_show",
  "cancelada": "cancelada",
  "reprogramada": "reprogramada",
  "seguimiento": "seguimiento",
  "no calificado": "no_calificado",
  "no_calificado": "no_calificado",
  "no cierre": "no_cierre",
  "no_cierre": "no_cierre",
  "reserva": "reserva",
  "cerrado": "cerrado",
  "adentro seguimiento": "adentro_seguimiento",
  "broke/cancelado": "broke_cancelado",
  "broke_cancelado": "broke_cancelado",
};

const PAYMENT_ESTADO_MAP: Record<string, string> = {
  "pagado": "pagado",
  "pendiente": "pendiente",
  "perdido": "perdido",
  "no pagado": "pendiente",
};

const PROGRAMA_MAP: Record<string, string> = {
  "mentoria 1k pyf": "mentoria_1k_pyf",
  "mentoria 2.5k pyf": "mentoria_2_5k_pyf",
  "mentoria 2.8k pyf": "mentoria_2_8k_pyf",
  "mentoria 5k": "mentoria_5k",
  "skool": "skool",
  "vip 5k": "vip_5k",
  "mentoria 2.5k cuotas": "mentoria_2_5k_cuotas",
  "mentoria 5k cuotas": "mentoria_5k_cuotas",
  "mentoria 1k cuotas": "mentoria_1k_cuotas",
  "mentoria fee": "mentoria_fee",
  "cuota vip mantencion": "cuota_vip_mantencion",
  // Add any Airtable-specific variations
  "mentoría 1k pyf": "mentoria_1k_pyf",
  "mentoría 2.5k pyf": "mentoria_2_5k_pyf",
  "mentoría 5k": "mentoria_5k",
  "mentoría fee": "mentoria_fee",
};

const FUENTE_MAP: Record<string, string> = {
  "historias": "historias",
  "lead magnet": "lead_magnet",
  "youtube": "youtube",
  "instagram": "instagram",
  "dm directo": "dm_directo",
  "historia cta": "historia_cta",
  "historia hr": "historia_hr",
  "comentario manychat": "comentario_manychat",
  "encuesta": "encuesta",
  "why now": "why_now",
  "win": "win",
  "fup": "fup",
  "whatsapp": "whatsapp",
  "otro": "otro",
};

const PLAN_PAGO_MAP: Record<string, string> = {
  "paid in full": "paid_in_full",
  "pif": "paid_in_full",
  "2 cuotas": "2_cuotas",
  "3 cuotas": "3_cuotas",
  "personalizado": "personalizado",
};

const CONCEPTO_MAP: Record<string, string> = {
  "pif": "pif",
  "fee": "fee",
  "primera cuota": "primera_cuota",
  "segunda cuota": "segunda_cuota",
  "1ra cuota": "primera_cuota",
  "2da cuota": "segunda_cuota",
};

const METODO_PAGO_MAP: Record<string, string> = {
  "binance": "binance",
  "transferencia": "transferencia",
  "caja de ahorro usd": "caja_ahorro_usd",
  "caja ahorro usd": "caja_ahorro_usd",
  "link mp": "link_mp",
  "mercadopago": "link_mp",
  "mercado pago": "link_mp",
  "cash": "cash",
  "efectivo": "cash",
  "uruguayos": "uruguayos",
  "link stripe": "link_stripe",
  "stripe": "link_stripe",
};

// ═══════════════════════════════════════════════════════
// MIGRATION FUNCTIONS
// ═══════════════════════════════════════════════════════

// ─── 1. Team Members ────────────────────────────────
async function migrateTeamMembers() {
  log("=== Migrating Team Members ===");
  const records = await fetchAllRecords("tblRxMpUKOhfkF0ys");

  // Fetch existing team_members to get their UUIDs
  const { data: existingMembers } = await supabase.from("team_members").select("id, nombre");

  const existingMap: Record<string, string> = {};
  for (const m of existingMembers || []) {
    existingMap[m.nombre.toLowerCase()] = m.id;
  }

  for (const record of records) {
    const f = record.fields;
    const nombre = (f["Nombre"] as string) || "";
    const airtableId = record.id;

    // Map to existing seeded team_member if name matches
    const existingId = existingMap[nombre.toLowerCase()];

    if (existingId) {
      // Update existing with Airtable data
      const foto_url = await migrateAttachment(f["Adjunta foto de Perfil"] as any, "avatars", "team");

      await supabase.from("team_members").update({
        etiqueta: f["Etiqueta"] || null,
        rol: f["Rol/ Cargo"] || null,
        email: f["Mail"] || null,
        telefono: f["Contacto"] || null,
        fecha_nacimiento: f["Fecha de Nacimiento"] || null,
        foto_url: foto_url || undefined,
        observaciones: f["Observaciones "] || null,
      }).eq("id", existingId);

      idMap[airtableId] = existingId;

      // Build collaborator mapping
      const collab = f["Clsoers"] as any;
      if (collab) {
        teamMap[(collab.name || "").toLowerCase()] = existingId;
        teamMap[(collab.email || "").toLowerCase()] = existingId;
        teamMap[(collab.id || "").toLowerCase()] = existingId;
      }
      teamMap[nombre.toLowerCase()] = existingId;

      log(`  Updated team member: ${nombre} (${existingId})`);
    } else {
      // New team member not in seed — create
      const newId = randomUUID();
      const foto_url = await migrateAttachment(f["Adjunta foto de Perfil"] as any, "avatars", "team");

      await supabase.from("team_members").insert({
        id: newId,
        nombre,
        etiqueta: f["Etiqueta"] || null,
        rol: f["Rol/ Cargo"] || null,
        email: f["Mail"] || null,
        telefono: f["Contacto"] || null,
        fecha_nacimiento: f["Fecha de Nacimiento"] || null,
        foto_url,
        observaciones: f["Observaciones "] || null,
        activo: true,
      });

      idMap[airtableId] = newId;
      teamMap[nombre.toLowerCase()] = newId;
      log(`  Created team member: ${nombre} (${newId})`);
    }
  }
  log(`Team members done. Mapped ${Object.keys(teamMap).length} collaborator entries.`);
}

// ─── 2. Payment Methods ─────────────────────────────
async function migratePaymentMethods() {
  log("=== Migrating Payment Methods ===");
  const records = await fetchAllRecords("tblBB1qH1c8q42rxU");

  // Fetch existing to update rather than duplicate
  const { data: existing } = await supabase.from("payment_methods").select("id, nombre");
  const existingMap: Record<string, string> = {};
  for (const m of existing || []) {
    existingMap[m.nombre.toLowerCase()] = m.id;
  }

  for (const record of records) {
    const f = record.fields;
    const nombre = (f["Nombre del Método de Pago"] as string) || "";
    const existingId = existingMap[nombre.toLowerCase()];

    const row = {
      nombre,
      titular: f["Titular de la Cuenta"] || null,
      tipo_moneda: (f["Tipo de Moneda"] as string || "usd").toLowerCase() === "ars" ? "ars" : "usd",
      cbu: f["CBU"] || null,
      alias_cbu: f["Alias CBU"] || null,
      banco: f["Banco"] || null,
      id_cuenta: f["ID de Cuenta"] || null,
      observaciones: f["Observaciones"] || null,
    };

    if (existingId) {
      await supabase.from("payment_methods").update(row).eq("id", existingId);
      idMap[record.id] = existingId;
      log(`  Updated payment method: ${nombre}`);
    } else {
      const newId = randomUUID();
      await supabase.from("payment_methods").insert({ id: newId, ...row });
      idMap[record.id] = newId;
      log(`  Created payment method: ${nombre}`);
    }
  }
}

// ─── 3. Leads + Payments (from Reporte de Llamadas) ─
async function migrateLeadsAndPayments() {
  log("=== Migrating Leads + Payments (Reporte de Llamadas) ===");
  const records = await fetchAllRecords("tbleCytRILP3D7Q3N");
  log(`  Total records to migrate: ${records.length}`);

  const leadRows: Record<string, any>[] = [];
  const paymentRows: Record<string, any>[] = [];

  for (const record of records) {
    const f = record.fields;
    const leadId = randomUUID();
    idMap[record.id] = leadId;

    // Resolve setter (multipleRecordLinks → first linked record)
    const setterId = resolveRecordLink(f["🙎‍♂️ Setter"]);
    // Resolve closer (singleCollaborator)
    const closerId = resolveCollaborator(f["👤 Closer"]);
    // Resolve cobrador
    const cobradorId = resolveCollaborator(f["👤 Cobro de Cuotas"]);

    const estadoRaw = (f["📌 Estado de la Llamada"] as string || "").toLowerCase();
    const estado = ESTADO_LLAMADA_MAP[estadoRaw] || "pendiente";

    const fuenteRaw = (f["🚀 Funte del lead"] as string || "").toLowerCase();
    const fuente = FUENTE_MAP[fuenteRaw] || null;

    const programaRaw = (f["🏆 Programa Pitcheado"] as string || "").toLowerCase();
    const programa = PROGRAMA_MAP[programaRaw] || null;

    const conceptoRaw = (f["Concepto "] as string || f["Concepto"] as string || "").toLowerCase();
    const concepto = CONCEPTO_MAP[conceptoRaw] || null;

    const planPagoRaw = (f["🧾 Plan de Pago (Venta)"] as string || "").toLowerCase();
    const planPago = PLAN_PAGO_MAP[planPagoRaw] || null;

    const calificadoRaw = (f["📌Lead Calificado?"] as string || "").toLowerCase();
    const calificadoMap: Record<string, string> = {
      "calificado": "calificado",
      "no calificado": "no_calificado",
      "podria": "podria",
    };

    const lead: Record<string, any> = {
      id: leadId,
      airtable_id: record.id,
      nombre: f["👤 Nombre del Lead"] || null,
      email: f["📧 Email"] || null,
      telefono: f["📞 Teléfono"] || null,
      instagram: f["📲 Instagram"] || null,
      fuente,
      utm_source: f["🔗 UTM Source"] || null,
      utm_medium: f["🔗 UTM Medium"] || null,
      utm_content: f["🔗 UTM Content"] || null,
      evento_calendly: f["🏛️ Evento"] || null,
      calendly_event_id: f["ID Calendly"] || null,
      fecha_agendado: f["📆 Fecha de Agendado"] || null,
      fecha_llamada: f["📆 Fecha de Llamada"] || null,
      estado,
      setter_id: setterId,
      closer_id: closerId,
      cobrador_id: cobradorId,
      contexto_setter: f["📑 Contexto Setter"] || null,
      reporte_general: f["💬 Reporte General"] || null,
      experiencia_ecommerce: f["¿Qué tanta experiencia tenes haciendo ecommerce?"] || null,
      seguridad_inversion: f["¿Qué tan seguro te sentís de que podamos ayudarte a resolver los problemas que hoy frenan tu crecimiento o el de tu ecommerce?"] || null,
      tipo_productos: f["¿Qué tipo de productos vendes y/o qué te gustaría arrancar a vender?"] || null,
      compromiso_asistencia: f["¿Te comprometes a asistir a tiempo y sin distracciones a la sesión? Trabajamos únicamente con personas comprometidas."] || null,
      dispuesto_invertir: f["¿Estas dispuestos a invertir entre 1500 a 3000 usd en tu crecimiento profesional y personal?"] || null,
      decisor: f["En caso de comenzar a trabajar con nosotros ¿Existe alguien más que deba estar presente para tomar la decisión de hacerlo?"] || null,
      lead_calificado: calificadoMap[calificadoRaw] || null,
      link_llamada: f["🔗 Link de Llamada"] || null,
      programa_pitcheado: programa,
      concepto,
      plan_pago: planPago,
      ticket_total: f["💰 Ticket Total"] || null,
      fue_seguimiento: f["🔁 Fue Seguimiento?"] || false,
      de_donde_viene_lead: f["De donde viene el lead"] || null,
    };

    leadRows.push(lead);

    // ─── Normalize 3 embedded payments into separate rows ───
    const paymentConfigs = [
      {
        num: 1,
        monto: f["💰 Pago 1"] as number,
        monto_ars: f["arr de 💰 Pago 1"] as number,
        fecha: f["📆 Fecha de Pago 1"] as string,
        estado: f["📊 Estado 1"] as string,
        comprobante: f["Comprobante Ingreso"] || f["Comprobante de pago 1"],
      },
      {
        num: 2,
        monto: f["💰 Pago 2"] as number,
        fecha: f["📆 Fecha de Pago 2"] as string,
        estado: f["📊 Estado 2"] as string,
        comprobante: f["Comprobante cuota 2"],
      },
      {
        num: 3,
        monto: f["💰 Pago 3"] as number,
        fecha: f["📆 Fecha de Pago 3"] as string,
        estado: f["📊 Estado 3"] as string,
        comprobante: f["Comprobante cuota 3"],
      },
    ];

    for (const pc of paymentConfigs) {
      // Only create payment if there's a monto or a date
      if (!pc.monto && !pc.fecha) continue;

      const paymentEstadoRaw = (pc.estado || "").toLowerCase();
      const paymentEstado = PAYMENT_ESTADO_MAP[paymentEstadoRaw] || "pendiente";

      // Migrate comprobante attachment
      const comprobante_url = await migrateAttachment(
        pc.comprobante as any,
        "comprobantes",
        `leads/${leadId}`
      );

      const metodoPagoRaw = (f["Metodo de pago "] as string || f["Metodos de pago"] as string || "").toLowerCase();
      const metodoPago = METODO_PAGO_MAP[metodoPagoRaw] || null;

      const receptorRaw = f["Recibe"] as string[];
      const receptor = receptorRaw && receptorRaw.length > 0 ? receptorRaw[0] : null;

      paymentRows.push({
        id: randomUUID(),
        lead_id: leadId,
        client_id: null, // Will be linked after clients migration
        numero_cuota: pc.num,
        monto_usd: pc.monto || 0,
        monto_ars: pc.num === 1 ? (f["💰 PESOS"] as number || 0) : 0,
        fecha_pago: pc.fecha || null,
        fecha_vencimiento: null, // Not tracked in Airtable per-payment
        estado: paymentEstado,
        metodo_pago: metodoPago,
        receptor,
        comprobante_url,
        cobrador_id: cobradorId,
        verificado: f["verif cash"] as boolean || false,
        es_renovacion: false,
        renewal_id: null,
      });
    }
  }

  await upsertBatch("leads", leadRows);
  log(`  Migrated ${leadRows.length} leads`);

  // Payments don't have airtable_id, upsert by id
  await upsertBatch("payments", paymentRows, "id");
  log(`  Created ${paymentRows.length} payment records from normalized leads`);
}

// ─── 4. Clients (from Base de Clientes) ─────────────
async function migrateClients() {
  log("=== Migrating Clients (Base de Clientes) ===");
  const records = await fetchAllRecords("tbloD4rZPAyBKoylS");

  const clientRows: Record<string, any>[] = [];

  for (const record of records) {
    const f = record.fields;
    const clientId = randomUUID();
    idMap[record.id] = clientId;

    // Resolve lead_id from linked "this one" (multipleRecordLinks to Reporte de Llamadas)
    const leadId = resolveRecordLink(f["this one"]) || resolveRecordLink(f["🙍‍♂️Cliente"]);

    const programaRaw = (f["🚀 Programa"] as string || "").toLowerCase();
    const programa = PROGRAMA_MAP[programaRaw] || null;

    const estadoRaw = (f["📊 Estado"] as string || "").toLowerCase();
    const estadoMap: Record<string, string> = {
      "activo": "activo",
      "pausado": "pausado",
      "inactivo": "inactivo",
      "solo skool": "solo_skool",
      "no termino pagar": "no_termino_pagar",
    };
    const estado = estadoMap[estadoRaw] || "activo";

    const seguimientoEstadoRaw = (f["Estado para seguimientos"] as string || "").toLowerCase();
    const seguimientoMap: Record<string, string> = {
      "para seguimiento": "para_seguimiento",
      "no necesita": "no_necesita",
      "seguimiento urgente": "seguimiento_urgente",
    };

    const contactoEstadoRaw = (f["Estado Contacto"] as string || "").toLowerCase();
    const contactoMap: Record<string, string> = {
      "por contactar": "por_contactar",
      "contactado": "contactado",
      "respondio renueva": "respondio_renueva",
      "respondio debe cuota": "respondio_debe_cuota",
      "es socio": "es_socio",
      "no renueva": "no_renueva",
      "no responde": "no_responde",
      "numero invalido": "numero_invalido",
      "retirar acceso": "retirar_acceso",
      "verificar": "verificar",
    };

    const origenRaw = (f["Origen"] as string || "").toLowerCase();
    const origenMap: Record<string, string> = {
      "skool ig": "skool_ig",
      "solo skool": "solo_skool",
      "registro normal": "registro_normal",
      "grupo wa esa": "grupo_wa_esa",
      "grupo ig ecom": "grupo_ig_ecom",
    };

    const canalRaw = (f["Canal Contacto"] as string || "").toLowerCase();
    const canalMap: Record<string, string> = {
      "whatsapp": "whatsapp",
      "instagram dm": "instagram_dm",
      "email skool": "email_skool",
      "buscar": "buscar",
    };

    const prioridadRaw = (f["Prioridad Contacto"] as string || "").toLowerCase();
    const prioridadMap: Record<string, string> = {
      "a wa sin nombre": "a_wa_sin_nombre",
      "b ig solo username": "b_ig_solo_username",
      "c solo skool": "c_solo_skool",
      "d nombre parcial": "d_nombre_parcial",
    };

    const categoriaRaw = (f["Categoria"] as string || "").toLowerCase();
    const categoriaMap: Record<string, string> = {
      "activo ok": "activo_ok",
      "cuotas pendientes": "cuotas_pendientes",
      "deudor": "deudor",
      "solo skool verificar": "solo_skool_verificar",
      "solo wa verificar": "solo_wa_verificar",
      "solo ig verificar": "solo_ig_verificar",
      "con pagos sin skool": "con_pagos_sin_skool",
      "por verificar": "por_verificar",
      "equipo lauty": "equipo_lauty",
    };

    const semanaEstadoMap: Record<string, string> = {
      "primeras publicaciones": "primeras_publicaciones",
      "primera venta": "primera_venta",
      "escalando anuncios": "escalando_anuncios",
    };

    const responsableRenovacion = resolveCollaborator(f["Responsable de Reno"]);

    clientRows.push({
      id: clientId,
      airtable_id: record.id,
      lead_id: leadId,
      nombre: f["🙎‍♂️ Nombre del Cliente"] || null,
      email: f["📨 Email"] || null,
      telefono: f["📞 Télefono"] || null,
      programa,
      estado,
      fecha_onboarding: f["📆 Fecha de Onboarding"] || null,
      fecha_offboarding: f["📆 Fecha de Offboarding"] || null,
      total_dias_programa: f["Total de Días"] || null,
      llamadas_base: f["Llamadas Base"] || null,
      pesadilla: f["¿Pesadilla?"] || false,
      exito: f["¿Éxito?"] || false,
      discord: f["Discord "] || false,
      skool: f["skool"] || false,
      win_discord: f["✅ Win en Discord"] || false,
      semana_1_estado: semanaEstadoMap[(f["Semana 1"] as string || "").toLowerCase()] || null,
      semana_1_accionables: f["Accionables semana 1"] || null,
      semana_2_estado: semanaEstadoMap[(f["Semana 2"] as string || "").toLowerCase()] || null,
      semana_2_accionables: f["Accionables semana 2"] || null,
      semana_3_estado: semanaEstadoMap[(f["Semana 3"] as string || "").toLowerCase()] || null,
      semana_3_accionables: f["Accionables semana 3"] || null,
      semana_4_estado: semanaEstadoMap[(f["Semana 4"] as string || "").toLowerCase()] || null,
      semana_4_accionables: f["Accionable Semana 4"] || null,
      facturacion_mes_1: f["Facturacion Mes 1"] || f["Facturacion dia 1"] || null,
      facturacion_mes_2: f["Facturacion Mes 2"] || null,
      facturacion_mes_3: f["Facturacion Mes 3"] || null,
      facturacion_mes_4: f["Facturacion Mes 4"] || null,
      estado_seguimiento: seguimientoMap[seguimientoEstadoRaw] || null,
      fecha_ultimo_seguimiento: f["Ultimo Seguimiento"] || null,
      fecha_proximo_seguimiento: f["Fecha de Proximo seguimiento"] || null,
      notas_conversacion: f["notas_conversacion"] || null,
      estado_contacto: contactoMap[contactoEstadoRaw] || null,
      responsable_renovacion: responsableRenovacion,
      origen: origenMap[origenRaw] || null,
      canal_contacto: canalMap[canalRaw] || null,
      prioridad_contacto: prioridadMap[prioridadRaw] || null,
      categoria: categoriaMap[categoriaRaw] || null,
      email_skool: f["Email Skool"] || null,
      en_wa_esa: f["En WA ESA"] || false,
      en_ig_grupo: f["En IG Grupo"] || false,
      deudor_usd: f["Deudor USD"] || null,
      deudor_vencimiento: f["Deudor Vencimiento"] || null,
    });
  }

  await upsertBatch("clients", clientRows);
  log(`  Migrated ${clientRows.length} clients`);
}

// ─── 5. Renewal History ─────────────────────────────
async function migrateRenewalHistory() {
  log("=== Migrating Renewal History ===");
  const records = await fetchAllRecords("tblDSzP54VuEfce8e");

  const rows: Record<string, any>[] = [];

  for (const record of records) {
    const f = record.fields;
    const renewalId = randomUUID();
    idMap[record.id] = renewalId;

    const clientId = resolveRecordLink(f["🙍‍♂️Cliente"]) || resolveRecordLink(f["👤 Cliente"]);

    const tipoRaw = (f["Tipo de Renovacion"] as string || "").toLowerCase();
    const tipoMap: Record<string, string> = {
      "resell": "resell",
      "upsell vip": "upsell_vip",
      "upsell meli": "upsell_meli",
      "upsell vip cuotas": "upsell_vip_cuotas",
      "upsell meli cuotas": "upsell_meli_cuotas",
      "resell cuotas": "resell_cuotas",
    };

    const programaRaw = (f["🚀 Programa"] as string || "").toLowerCase();
    const estadoRaw = (f["📊 Estado"] as string || "").toLowerCase();
    const estadoMap: Record<string, string> = {
      "pago": "pago",
      "no renueva": "no_renueva",
      "cuota 1 pagada": "cuota_1_pagada",
      "cuota 2 pagada": "cuota_2_pagada",
    };

    const comprobante_url = await migrateAttachment(
      f["Comprobante renovacion"] as any,
      "comprobantes",
      `renewals/${renewalId}`
    );

    rows.push({
      id: renewalId,
      airtable_id: record.id,
      client_id: clientId,
      tipo_renovacion: tipoMap[tipoRaw] || null,
      programa_nuevo: PROGRAMA_MAP[programaRaw] || null,
      fecha_renovacion: f["📆 Fecha en que pago la Renovación"] || null,
      estado: estadoMap[estadoRaw] || null,
      comprobante_url,
    });
  }

  await upsertBatch("renewal_history", rows);
  log(`  Migrated ${rows.length} renewal history records`);
}

// ─── 6. Onboarding ──────────────────────────────────
async function migrateOnboarding() {
  log("=== Migrating Onboarding ===");
  const records = await fetchAllRecords("tbl0Jw1vRoaSAcZgP");

  const rows: Record<string, any>[] = [];

  for (const record of records) {
    const f = record.fields;
    const onboardingId = randomUUID();
    idMap[record.id] = onboardingId;

    const clientId = resolveRecordLink(f["🏛️ Base de Clientes"]);
    const leadId = resolveRecordLink(f["📞Llamadas"]);

    const etapaRaw = (f["En que etapa de Ecomm estas ?"] as string || "").toLowerCase();
    const etapaMap: Record<string, string> = {
      "cero": "cero",
      "experiencia sin resultados": "experiencia_sin_resultados",
      "experiencia escalar": "experiencia_escalar",
    };

    const redSocial = f["¿Gracias a que red social nos conoció🤳? (y si no es una red contar como nos conociste"] as string[];

    rows.push({
      id: onboardingId,
      airtable_id: record.id,
      client_id: clientId,
      lead_id: leadId,
      fecha_ingreso: f["📆 Fecha de Ingreso"] || null,
      edad: f["¿Cual es tu edad?"] || null,
      email: f["📩 Correo"] || null,
      telefono: f["📞 Teléfono"] || null,
      discord_user: f["Como es tu usuario de discord ej; lean.lopez14"] || null,
      skool_user: f["Cual es tu Usuario de Skool"] || null,
      redes_sociales: f["Indíquenos sus redes sociales🤳 .  Ejemplo:  Instagram: @leandro.lopezf"] || null,
      red_social_origen: redSocial || null,
      porque_compro: f["¿Porque decisite comprarnos?"] || null,
      victoria_rapida: f["¿Qué considerarías una victoria rápida trabajando con nosotros?"] || null,
      resultado_esperado: f["¿Qué resultado concreto le gustaría haber alcanzado una vez finalizado el programa?* Te recordamos el ser específico, esto nos ayudará a darte una mejor experiencia dentro de lean lopez!"] || null,
      compromiso_pagos: f["Responsabilidad sobre los Pagos Me comprometo a realizar los pagos correspondientes al plan de pagos pactado en tiempo y forma. En caso de no poder cumplir con alguno de los pagos, me comprometo a comunicarlo con al menos 10 días de anticipación."] || false,
      confirmo_terminos: f["Confirmo que leí los términos."] || false,
      etapa_ecommerce: etapaMap[etapaRaw] || null,
      topico_compra: f["¿Gracias a qué tema/tópico nos compraste?"] || null,
    });
  }

  await upsertBatch("onboarding", rows);
  log(`  Migrated ${rows.length} onboarding records`);
}

// ─── 7. Tracker Sessions ────────────────────────────
async function migrateTrackerSessions() {
  log("=== Migrating Tracker 1a1 ===");
  const records = await fetchAllRecords("tblln5DRvO6iZBdLa");

  const rows: Record<string, any>[] = [];

  for (const record of records) {
    const f = record.fields;
    const sessionId = randomUUID();
    idMap[record.id] = sessionId;

    const clientId = resolveRecordLink(f["Cliente"]);
    const assigneeId = resolveCollaborator(f["Assignee"]);

    const estadoRaw = (f["Estado de la Sesión"] as string || "").toLowerCase();
    const estadoMap: Record<string, string> = {
      "programada": "programada",
      "done": "done",
      "cancelada/no asistió": "cancelada_no_asistio",
      "cancelada no asistio": "cancelada_no_asistio",
    };

    const sesionNumRaw = f["Qué número de sesión 1 a 1 acabás de tener?"] as string;
    const numero_sesion = sesionNumRaw ? parseInt(sesionNumRaw.replace(/\D/g, ""), 10) || null : null;

    rows.push({
      id: sessionId,
      airtable_id: record.id,
      client_id: clientId,
      fecha: f["ID / Fecha de Llamada"] || null,
      numero_sesion,
      estado: estadoMap[estadoRaw] || "programada",
      enlace_llamada: f["Enlace de la Llamada"] || null,
      assignee_id: assigneeId,
      notas_setup: f["Notas del Setup / Producto"] || null,
      pitch_upsell: f["Pitch de Upsell Realizado"] || false,
      rating: f["Del 1 al 10, ¿qué tan útil fue la Ultima sesión  para destrabar tu negocio? (Escala lineal)"] || null,
      aprendizaje_principal: f["Cuál fue tu mayor aprendizaje o la tarea principal que te llevaste de esta última llamada?"] || null,
      feedback_cliente: f["Para seguir rompiéndola: ¿Qué te gustaría sumar, o en qué tema sentís que deberíamos profundizar más en el programa?"] || null,
      herramienta_mas_util: f["Que herramienta te sirvió mas?"] || null,
    });
  }

  await upsertBatch("tracker_sessions", rows);
  log(`  Migrated ${rows.length} tracker sessions`);
}

// ─── 8. Daily Reports ───────────────────────────────
async function migrateDailyReports() {
  log("=== Migrating Daily Reports ===");
  const records = await fetchAllRecords("tblpfZMziou1Ny9sU");

  const rows: Record<string, any>[] = [];

  for (const record of records) {
    const f = record.fields;
    const reportId = randomUUID();
    idMap[record.id] = reportId;

    const setterId = resolveRecordLink(f["Setter"]);

    rows.push({
      id: reportId,
      airtable_id: record.id,
      setter_id: setterId,
      fecha: f["Fecha del Reporte"] || null,
      conversaciones_iniciadas: f["Conversaciones Iniciadas"] || 0,
      respuestas_historias: f["Respuestas a Historias"] || 0,
      calendarios_enviados: f["Calendarios Enviados"] || 0,
      ventas_por_chat: f["Ventas cerradas por chat "] || null,
      conversaciones_lead_inicio: f["Conversaciones Iniciadas por el lead"] || null,
      agendas_confirmadas: f["Agendas Confirmadas"] || null,
      origen_principal: f["Orginen principal del dia (ej : Historias , CTA, Solicitudes de MSJ)"] || null,
    });
  }

  await upsertBatch("daily_reports", rows);
  log(`  Migrated ${rows.length} daily reports`);
}

// ─── 9. IG Metrics ──────────────────────────────────
async function migrateIGMetrics() {
  log("=== Migrating IG Metrics ===");
  const records = await fetchAllRecords("tbl17rny30qYztVo3");

  const rows: Record<string, any>[] = [];

  for (const record of records) {
    const f = record.fields;
    const metricId = randomUUID();
    idMap[record.id] = metricId;

    rows.push({
      id: metricId,
      airtable_id: record.id,
      periodo: f["📆 Periodo"] || null,
      fecha_inicio: f["📅 Fecha Inicio"] || null,
      fecha_fin: f["📅 Fecha Fin"] || null,
      cuentas_alcanzadas: f["📣 Cuentas Alcanzadas"] || null,
      delta_alcance_pct: f["📣 Delta Alcance %"] || null,
      impresiones: f["👁 Impresiones"] || null,
      delta_impresiones_pct: f["👁 Delta Impresiones %"] || null,
      visitas_perfil: f["👤 Visitas al Perfil"] || null,
      delta_visitas_pct: f["👤 Delta Visitas %"] || null,
      toques_enlaces: f["🔗 Toques Enlaces"] || null,
      delta_enlaces_pct: f["🔗 Delta Enlaces %"] || null,
      pct_alcance_no_seguidores: f["📊 % Alcance No Seguidores"] || null,
      nuevos_seguidores: f["📈 Nuevos Seguidores"] || null,
      delta_seguidores_pct: f["📈 Delta Seguidores %"] || null,
      unfollows: f["📉 Unfollows"] || null,
      total_seguidores: f["👥 Total Seguidores"] || null,
      total_interacciones: f["⭐ Total Interacciones"] || null,
      delta_interacciones_pct: f["⭐ Delta Interacciones %"] || null,
      cuentas_interaccion: f["🤝 Cuentas con Interaccion"] || null,
      pct_interaccion_no_seguidores: f["🤝 % Interaccion No Seguidores"] || null,
      reels_publicados: f["🎬 Reels Publicados"] || null,
      interacciones_reels: f["🎬 Interacciones Reels"] || null,
      delta_reels_pct: f["🎬 Delta Reels %"] || null,
      likes_reels: f["❤️ Likes Reels"] || null,
      comentarios_reels: f["💬 Comentarios Reels"] || null,
      compartidos_reels: f["📤 Compartidos Reels"] || null,
      guardados_reels: f["🔖 Guardados Reels"] || null,
      posts_publicados: f["📸 Posts Publicados"] || null,
      interacciones_posts: f["📸 Interacciones Posts"] || null,
      delta_posts_pct: f["📸 Delta Posts %"] || null,
      likes_posts: f["❤️ Likes Posts"] || null,
      comentarios_posts: f["💬 Comentarios Posts"] || null,
      compartidos_posts: f["📤 Compartidos Posts"] || null,
      guardados_posts: f["🔖 Guardados Posts"] || null,
      stories_publicadas: f["📱 Stories Publicadas"] || null,
      interacciones_stories: f["📱 Interacciones Stories"] || null,
      delta_stories_pct: f["📱 Delta Stories %"] || null,
      respuestas_stories: f["📱 Respuestas Stories"] || null,
      conversaciones_dm: f["📩 Conversaciones DM"] || null,
      pct_hombres: f["🧑 % Hombres"] || null,
      pct_mujeres: f["👩 % Mujeres"] || null,
      top_paises: f["🌍 Top Paises"] || null,
      top_ciudades: f["🏙 Top Ciudades"] || null,
      top_edades: f["🎂 Top Edades"] || null,
      leads_ig: f["📊 Leads IG (periodo)"] || null,
      ventas_ig: f["📊 Ventas IG (periodo)"] || null,
      cash_ig: f["💰 Cash IG (periodo)"] || null,
    });
  }

  await upsertBatch("ig_metrics", rows);
  log(`  Migrated ${rows.length} IG metrics records`);
}

// ─── 10. UTM Campaigns ──────────────────────────────
async function migrateUTMCampaigns() {
  log("=== Migrating UTM Campaigns ===");
  const records = await fetchAllRecords("tblA5iKXDDqpBUh0x");

  const rows: Record<string, any>[] = [];

  for (const record of records) {
    const f = record.fields;
    const utmId = randomUUID();
    idMap[record.id] = utmId;

    const setterId = resolveRecordLink(f["🙎‍♂️ Setter Responsable"]);

    rows.push({
      id: utmId,
      airtable_id: record.id,
      url: f["🔗 URL"] || null,
      source: f["🛜 Fuente"] || null,
      medium: f["📊 Medios"] || null,
      content: f["⚙️ Contenido"] || null,
      setter_id: setterId,
    });
  }

  await upsertBatch("utm_campaigns", rows);
  log(`  Migrated ${rows.length} UTM campaigns`);
}

// ═══════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════
async function main() {
  logStream = fs.createWriteStream(LOG_FILE, { flags: "w" });

  log("╔══════════════════════════════════════════════╗");
  log("║   Lauti CRM — Airtable → Supabase Migration ║");
  log("╚══════════════════════════════════════════════╝");
  log(`Started at ${new Date().toISOString()}`);
  log("");

  try {
    // Order matters: team_members first (for collaborator mapping),
    // then leads (for payment normalization), then clients (needs lead IDs),
    // then everything else.

    await migrateTeamMembers();
    await migratePaymentMethods();
    await migrateLeadsAndPayments();
    await migrateClients();
    await migrateRenewalHistory();
    await migrateOnboarding();
    await migrateTrackerSessions();
    await migrateDailyReports();
    await migrateIGMetrics();
    await migrateUTMCampaigns();

    log("");
    log("═══════════════════════════════════════════════");
    log("MIGRATION COMPLETE");
    log(`Total ID mappings: ${Object.keys(idMap).length}`);
    log(`Total team mappings: ${Object.keys(teamMap).length}`);
    log("═══════════════════════════════════════════════");
  } catch (err) {
    logError("Migration failed", err);
    process.exit(1);
  } finally {
    logStream.end();
  }
}

main();
```

- [ ] **Step 3: Add migration script to package.json**

```json
{
  "scripts": {
    "migrate": "tsx scripts/migrate-airtable.ts",
    "validate": "tsx scripts/validate-migration.ts"
  }
}
```

- [ ] **Step 4: Add `airtable_id` unique index to all migrated tables**

Create `supabase/migrations/008_airtable_id_indexes.sql`:

```sql
-- Unique indexes for airtable_id (migration cross-reference)
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_airtable_id ON leads(airtable_id) WHERE airtable_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_airtable_id ON clients(airtable_id) WHERE airtable_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_renewal_history_airtable_id ON renewal_history(airtable_id) WHERE airtable_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_airtable_id ON onboarding(airtable_id) WHERE airtable_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tracker_sessions_airtable_id ON tracker_sessions(airtable_id) WHERE airtable_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_reports_airtable_id ON daily_reports(airtable_id) WHERE airtable_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ig_metrics_airtable_id ON ig_metrics(airtable_id) WHERE airtable_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_utm_campaigns_airtable_id ON utm_campaigns(airtable_id) WHERE airtable_id IS NOT NULL;
```

- [ ] **Step 5: Verify** -- Run `npx tsx scripts/migrate-airtable.ts` (with valid Supabase credentials). Check `migration.log` for errors. Spot-check a few records in Supabase dashboard.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add scripts/migrate-airtable.ts supabase/migrations/008_airtable_id_indexes.sql package.json
git commit -m "feat: Airtable migration script with pagination, payment normalization, attachments"
```

---

### Task 6: Migration Validation Script

**Files:**
- Create: `scripts/validate-migration.ts`

- [ ] **Step 1: Create `scripts/validate-migration.ts`**

```typescript
// scripts/validate-migration.ts
// Run with: npx tsx scripts/validate-migration.ts

import Airtable from "airtable";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load .env.local
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIndex = trimmed.indexOf("=");
  if (eqIndex === -1) continue;
  process.env[trimmed.slice(0, eqIndex)] = trimmed.slice(eqIndex + 1);
}

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

Airtable.configure({ apiKey: AIRTABLE_TOKEN });
const base = Airtable.base(AIRTABLE_BASE_ID);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// ─── Helpers ────────────────────────────────────────
async function countAirtable(tableId: string): Promise<number> {
  let count = 0;
  return new Promise((resolve, reject) => {
    base(tableId)
      .select({ pageSize: 100, fields: [] })
      .eachPage(
        (records, next) => {
          count += records.length;
          next();
        },
        (err) => (err ? reject(err) : resolve(count))
      );
  });
}

async function countSupabase(table: string): Promise<number> {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

async function sumAirtableCash(): Promise<number> {
  let total = 0;
  return new Promise((resolve, reject) => {
    base("tbleCytRILP3D7Q3N")
      .select({
        pageSize: 100,
        fields: ["💰 Pago 1", "📊 Estado 1", "💰 Pago 2", "📊 Estado 2", "💰 Pago 3", "📊 Estado 3"],
      })
      .eachPage(
        (records, next) => {
          for (const r of records) {
            const f = r.fields;
            if ((f["📊 Estado 1"] as string || "").toLowerCase() === "pagado") {
              total += (f["💰 Pago 1"] as number) || 0;
            }
            if ((f["📊 Estado 2"] as string || "").toLowerCase() === "pagado") {
              total += (f["💰 Pago 2"] as number) || 0;
            }
            if ((f["📊 Estado 3"] as string || "").toLowerCase() === "pagado") {
              total += (f["💰 Pago 3"] as number) || 0;
            }
          }
          next();
        },
        (err) => (err ? reject(err) : resolve(total))
      );
  });
}

async function sumSupabaseCash(): Promise<number> {
  // Sum all payments where estado = 'pagado'
  const { data, error } = await supabase
    .from("payments")
    .select("monto_usd")
    .eq("estado", "pagado");
  if (error) throw error;
  return (data || []).reduce((sum, row) => sum + (row.monto_usd || 0), 0);
}

// ─── Validation checks ─────────────────────────────
interface Check {
  name: string;
  airtable: number;
  supabase: number;
  match: boolean;
  delta: number;
}

async function runValidation() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   Lauti CRM — Migration Validation Report   ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log("");

  const checks: Check[] = [];

  // 1. Leads count
  const atLeads = await countAirtable("tbleCytRILP3D7Q3N");
  const sbLeads = await countSupabase("leads");
  checks.push({
    name: "Total Leads",
    airtable: atLeads,
    supabase: sbLeads,
    match: atLeads === sbLeads,
    delta: sbLeads - atLeads,
  });

  // 2. Clients count
  const atClients = await countAirtable("tbloD4rZPAyBKoylS");
  const sbClients = await countSupabase("clients");
  checks.push({
    name: "Total Clients",
    airtable: atClients,
    supabase: sbClients,
    match: atClients === sbClients,
    delta: sbClients - atClients,
  });

  // 3. Cash collected
  const atCash = await sumAirtableCash();
  const sbCash = await sumSupabaseCash();
  const cashMatch = Math.abs(atCash - sbCash) < 0.01;
  checks.push({
    name: "Total Cash Collected (USD)",
    airtable: Math.round(atCash * 100) / 100,
    supabase: Math.round(sbCash * 100) / 100,
    match: cashMatch,
    delta: Math.round((sbCash - atCash) * 100) / 100,
  });

  // 4. Payments count (Supabase should have more because of normalization)
  const sbPayments = await countSupabase("payments");
  // Airtable has up to 3 per lead, but only rows with amounts
  checks.push({
    name: "Total Payment Records",
    airtable: -1, // N/A — normalized
    supabase: sbPayments,
    match: sbPayments > 0,
    delta: 0,
  });

  // 5. Tracker sessions
  const atSessions = await countAirtable("tblln5DRvO6iZBdLa");
  const sbSessions = await countSupabase("tracker_sessions");
  checks.push({
    name: "Total Tracker Sessions",
    airtable: atSessions,
    supabase: sbSessions,
    match: atSessions === sbSessions,
    delta: sbSessions - atSessions,
  });

  // 6. Onboarding
  const atOnboarding = await countAirtable("tbl0Jw1vRoaSAcZgP");
  const sbOnboarding = await countSupabase("onboarding");
  checks.push({
    name: "Total Onboarding",
    airtable: atOnboarding,
    supabase: sbOnboarding,
    match: atOnboarding === sbOnboarding,
    delta: sbOnboarding - atOnboarding,
  });

  // 7. Daily Reports
  const atReports = await countAirtable("tblpfZMziou1Ny9sU");
  const sbReports = await countSupabase("daily_reports");
  checks.push({
    name: "Total Daily Reports",
    airtable: atReports,
    supabase: sbReports,
    match: atReports === sbReports,
    delta: sbReports - atReports,
  });

  // 8. IG Metrics
  const atIG = await countAirtable("tbl17rny30qYztVo3");
  const sbIG = await countSupabase("ig_metrics");
  checks.push({
    name: "Total IG Metrics",
    airtable: atIG,
    supabase: sbIG,
    match: atIG === sbIG,
    delta: sbIG - atIG,
  });

  // 9. Renewal History
  const atRenewals = await countAirtable("tblDSzP54VuEfce8e");
  const sbRenewals = await countSupabase("renewal_history");
  checks.push({
    name: "Total Renewal History",
    airtable: atRenewals,
    supabase: sbRenewals,
    match: atRenewals === sbRenewals,
    delta: sbRenewals - atRenewals,
  });

  // 10. UTM Campaigns
  const atUTM = await countAirtable("tblA5iKXDDqpBUh0x");
  const sbUTM = await countSupabase("utm_campaigns");
  checks.push({
    name: "Total UTM Campaigns",
    airtable: atUTM,
    supabase: sbUTM,
    match: atUTM === sbUTM,
    delta: sbUTM - atUTM,
  });

  // 11. Verify 7-7 monthly cash view works
  let viewCheck = false;
  try {
    const { data, error } = await supabase.from("v_monthly_cash").select("*").limit(1);
    viewCheck = !error && data !== null;
  } catch {
    viewCheck = false;
  }

  // ─── Print Report ─────────────────────────────────
  console.log("┌─────────────────────────────┬──────────┬──────────┬────────┬───────┐");
  console.log("│ Check                       │ Airtable │ Supabase │ Match  │ Delta │");
  console.log("├─────────────────────────────┼──────────┼──────────┼────────┼───────┤");
  for (const c of checks) {
    const name = c.name.padEnd(27);
    const at = c.airtable === -1 ? "N/A".padStart(8) : String(c.airtable).padStart(8);
    const sb = String(c.supabase).padStart(8);
    const match = c.match ? "  OK  " : " FAIL ";
    const delta = c.delta === 0 ? "    0" : String(c.delta > 0 ? `+${c.delta}` : c.delta).padStart(5);
    console.log(`│ ${name} │ ${at} │ ${sb} │ ${match} │ ${delta} │`);
  }
  console.log("├─────────────────────────────┼──────────┼──────────┼────────┼───────┤");
  console.log(`│ v_monthly_cash view works   │          │          │ ${viewCheck ? "  OK  " : " FAIL "} │       │`);
  console.log("└─────────────────────────────┴──────────┴──────────┴────────┴───────┘");

  const failures = checks.filter((c) => !c.match);
  console.log("");
  if (failures.length === 0 && viewCheck) {
    console.log("ALL CHECKS PASSED. Migration validated successfully.");
  } else {
    console.log(`${failures.length} check(s) failed:`);
    for (const f of failures) {
      console.log(`  - ${f.name}: Airtable=${f.airtable}, Supabase=${f.supabase}, Delta=${f.delta}`);
    }
    if (!viewCheck) {
      console.log("  - v_monthly_cash view is not working");
    }
    process.exit(1);
  }
}

runValidation().catch((err) => {
  console.error("Validation failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Verify** -- Run `npx tsx scripts/validate-migration.ts` after migration completes. All checks should pass (leads, clients, cash, sessions counts match).

- [ ] **Step 3: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add scripts/validate-migration.ts
git commit -m "feat: migration validation script comparing Airtable vs Supabase totals"
```

---

### Task 7: n8n Flows Documentation

**Files:**
- Create: `docs/n8n-flows.md`

- [ ] **Step 1: Create `docs/n8n-flows.md`**

```markdown
# Lauti CRM — n8n Integration Flows

> These flows are configured manually in n8n. This document serves as the
> specification for each flow.

---

## Flow 1: Calendly → Supabase

**Trigger:** Webhook node (Calendly sends POST on event creation/cancellation)

**Calendly webhook URL:** `https://n8n.yourdomain.com/webhook/calendly-lauti`

### Steps:

1. **Webhook Node** — receives Calendly payload
   - Event types: `invitee.created`, `invitee.canceled`
   - Extract: `event_type`, `payload.name`, `payload.email`,
     `payload.questions_and_answers`, `payload.scheduled_event.name`,
     `payload.scheduled_event.uri`, `payload.scheduled_event.start_time`

2. **Switch Node** — route by event type
   - `invitee.created` → Step 3
   - `invitee.canceled` → Step 6

3. **Assign Setter/Closer** — Function node
   ```javascript
   // Map Calendly calendar name to team member
   const calendarName = $input.item.json.payload.scheduled_event.name;

   const calendarMap = {
     "Calendario 1": { setter_id: "UUID_JOAQUIN", closer_id: "UUID_IVAN" },
     "Calendario 2": { setter_id: "UUID_JORGE", closer_id: "UUID_IVAN" },
     "Consultoria": { setter_id: null, closer_id: "UUID_LAUTI" },
     // Add more calendars as needed
   };

   const assignment = calendarMap[calendarName] || {
     setter_id: null,
     closer_id: null,
   };

   return { ...assignment, calendarName };
   ```

4. **Check if 1a1 session** — IF node
   - Condition: calendar name contains "1a1" or "seguimiento"
   - YES → Step 5 (create tracker_sessions record)
   - NO → Step 4a (create/update leads record)

4a. **Insert Lead** — Supabase node (Insert into `leads`)
   ```json
   {
     "nombre": "{{ $json.payload.name }}",
     "email": "{{ $json.payload.email }}",
     "evento_calendly": "{{ $json.payload.scheduled_event.name }}",
     "calendly_event_id": "{{ $json.payload.scheduled_event.uri.split('/').pop() }}",
     "fecha_agendado": "{{ $now.toISO() }}",
     "fecha_llamada": "{{ $json.payload.scheduled_event.start_time }}",
     "estado": "pendiente",
     "setter_id": "{{ $json.setter_id }}",
     "closer_id": "{{ $json.closer_id }}",
     "utm_source": "{{ extractFromAnswers('utm_source') }}",
     "utm_medium": "{{ extractFromAnswers('utm_medium') }}",
     "utm_content": "{{ extractFromAnswers('utm_content') }}"
   }
   ```
   - Extract UTM values from Calendly hidden fields or `questions_and_answers`

4b. **Send Push Notification** — HTTP Request node
   ```
   POST https://lauti-crm.vercel.app/api/notifications/send
   Authorization: Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
   Body:
   {
     "event": "agenda_calendly",
     "title": "Nueva agenda Calendly",
     "body": "{{ $json.payload.name }} agendo para {{ formatDate(startTime) }}",
     "recipientIds": ["{{ $json.closer_id }}"]
   }
   ```

5. **Insert Tracker Session** — Supabase node (Insert into `tracker_sessions`)
   ```json
   {
     "client_id": "{{ lookup client by email }}",
     "fecha": "{{ $json.payload.scheduled_event.start_time }}",
     "estado": "programada",
     "enlace_llamada": "{{ $json.payload.scheduled_event.location.join_url }}",
     "assignee_id": "{{ $json.closer_id }}"
   }
   ```

6. **Handle Cancellation** — Supabase node (Update `leads`)
   - Find lead by `calendly_event_id`
   - Set `estado = 'cancelada'`

---

## Flow 2: Daily Task Generator (Cron)

**Trigger:** Cron — every day at 08:00 AM (America/Argentina/Buenos_Aires)

### Steps:

1. **Cron Node** — `0 8 * * *`

2. **HTTP Request** — Call task generation endpoint
   ```
   POST https://lauti-crm.vercel.app/api/agent-tasks/generate
   Authorization: Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
   ```

3. **Log Results** — Function node
   - Log how many tasks were generated
   - If errors, send alert to Mel via WhatsApp or push notification

### Task generation logic (inside the API route):

| Condition | Task Type | Priority |
|-----------|-----------|----------|
| Payment `fecha_vencimiento` = today + 3 days AND `estado` = 'pendiente' | `cobrar_cuota` | 3 (media) |
| Payment `fecha_vencimiento` < today AND `estado` = 'pendiente' | `cobrar_cuota` | 1 (alta) |
| Client `fecha_offboarding` = today + 15 days | `renovacion` | 3 (media) |
| Client `fecha_offboarding` < today | `renovacion` | 1 (alta) |
| Client last follow-up > 7 days ago | `seguimiento` | 3 (media) |
| Client `llamadas_disponibles` = 0 | `oportunidad_upsell` | 4 (normal) |
| Lead `estado` = 'cerrado' AND no bienvenida task exists | `bienvenida` | 1 (alta) |
| Tracker session `rating` <= 5 | `seguimiento_urgente` | 1 (alta) |
| Payment `estado` changed to 'pagado' AND no confirmar_pago task | `confirmar_pago` | 4 (normal) |
| Client `health_score` < 50 | `seguimiento_urgente` | 1 (alta) |

**De-duplication:** Before creating, check `agent_tasks` for existing active task (estado IN ('pending', 'in_progress')) with same `client_id` + `tipo`.

---

## Flow 3: Agent Execution (Cron)

**Trigger:** Cron — every 30 minutes, 08:00-22:00 (America/Argentina/Buenos_Aires)

### Steps:

1. **Cron Node** — `*/30 8-22 * * *`

2. **Fetch Pending Tasks** — Supabase node
   ```sql
   SELECT * FROM agent_tasks
   WHERE estado = 'pending'
     AND asignado_a = 'agent'
     AND scheduled_at <= NOW()
   ORDER BY prioridad ASC, created_at ASC
   LIMIT 10
   ```

3. **Loop** — For each task:

   3a. **Set In Progress** — Update `agent_tasks` set `estado = 'in_progress'`

   3b. **Build Message** — Function node
   - Read `contexto` JSON from task
   - Select message template based on `tipo`:
     - `cobrar_cuota`: "Hola [nombre], te recordamos que tenes una cuota pendiente de $[monto] USD..."
     - `renovacion`: "Hola [nombre], tu programa esta por vencer. Queremos contarte sobre las opciones..."
     - `bienvenida`: "Bienvenido/a [nombre]! Soy del equipo de Lauti. Te comparto los accesos..."
     - `seguimiento`: "Hola [nombre], como estas? Queríamos saber como vas con..."
     - `confirmar_pago`: "Hola [nombre], confirmamos la recepcion de tu pago de $[monto] USD..."

   3c. **Send WhatsApp** — HTTP Request to Evolution API / WA Business API
   ```
   POST {{ $env.EVOLUTION_API_URL }}/message/sendText/{{ $env.WA_INSTANCE }}
   Headers: apikey: {{ $env.EVOLUTION_API_KEY }}
   Body:
   {
     "number": "{{ phone }}",
     "text": "{{ message }}"
   }
   ```

   3d. **Log Action** — Supabase Insert into `agent_log`
   ```json
   {
     "task_id": "{{ task.id }}",
     "accion": "whatsapp_sent",
     "mensaje_enviado": "{{ message }}",
     "resultado": "sent"
   }
   ```

   3e. **Update Task** — Supabase Update `agent_tasks`
   ```json
   {
     "estado": "done",
     "completed_at": "{{ $now.toISO() }}",
     "resultado": "Message sent via WhatsApp"
   }
   ```

   3f. **Error Handling** — If send fails:
   - Set `estado = 'failed'`
   - Log error in `agent_log`
   - Continue to next task

---

## Flow 4: Notification Dispatcher

**Trigger:** Supabase Database Webhook (via Supabase Dashboard > Database > Webhooks)

### Webhooks to configure in Supabase:

| Table | Event | Webhook URL |
|-------|-------|-------------|
| `leads` | INSERT where estado='cerrado' | `https://n8n.yourdomain.com/webhook/lauti-sale` |
| `payments` | UPDATE where estado='pagado' | `https://n8n.yourdomain.com/webhook/lauti-payment` |
| `tracker_sessions` | INSERT | `https://n8n.yourdomain.com/webhook/lauti-session` |
| `agent_tasks` | UPDATE where estado='done' | `https://n8n.yourdomain.com/webhook/lauti-agent-done` |

### Sub-flow: Sale Notification

1. **Webhook** receives lead INSERT
2. **Enrich** — Fetch closer name from team_members
3. **Send Push** — HTTP Request to `/api/notifications/send`
   ```json
   {
     "event": "venta_nueva",
     "title": "Venta nueva!",
     "body": "[Closer] cerro a [Nombre] — [Programa] — $[Ticket] USD",
     "url": "/pipeline"
   }
   ```

### Sub-flow: Payment Notification

1. **Webhook** receives payment UPDATE
2. **Send Push** to admin roles
   ```json
   {
     "event": "pago_cuota",
     "title": "Pago recibido",
     "body": "Cuota [N] de [Nombre] — $[Monto] USD",
     "url": "/tesoreria"
   }
   ```

### Sub-flow: Session Consumption Alert

1. After tracker_session INSERT, check client's remaining sessions
2. If `llamadas_disponibles` = 0:
   ```json
   {
     "event": "consumio_1a1",
     "title": "Sesiones agotadas",
     "body": "[Nombre] consumio todas sus sesiones 1a1",
     "recipientIds": ["UUID_LAUTI"]
   }
   ```

### Sub-flow: Agent Task Completed

1. **Webhook** receives agent_task UPDATE to 'done'
2. **Send Push** to Mel only (filter by `can_see_agent = true`)
   ```json
   {
     "event": "agente_completo",
     "title": "Agente completo tarea",
     "body": "[Tipo]: [Client] — [Resultado]",
     "recipientIds": ["UUID_MEL"]
   }
   ```

### Sub-flow: Cuota Vencida Alert

- Triggered by the daily task generator (Flow 2)
- When a `cobrar_cuota` task with priority 1 (alta) is created:
   ```json
   {
     "event": "cuota_vencida",
     "title": "Cuota vencida",
     "body": "[Nombre] tiene cuota vencida de $[Monto] USD",
     "recipientIds": ["UUID_MEL"]
   }
   ```

### Sub-flow: Health Score Red Alert

- Triggered when `v_client_health` refresh detects score drop below 50
- Runs as part of the daily task generator
   ```json
   {
     "event": "score_rojo",
     "title": "Score en rojo",
     "body": "[Nombre] cayo a score [X] — requiere atencion",
     "recipientIds": ["UUID_PEPITO"]
   }
   ```

---

## Environment Variables (n8n)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | For authenticated API calls |
| `EVOLUTION_API_URL` | Evolution API base URL |
| `EVOLUTION_API_KEY` | Evolution API key |
| `WA_INSTANCE` | WhatsApp instance name |
| `CRM_BASE_URL` | `https://lauti-crm.vercel.app` |

---

## Setup Checklist

- [ ] Configure Calendly webhook pointing to n8n
- [ ] Create Supabase Database Webhooks for each table/event
- [ ] Set up Evolution API instance for WhatsApp
- [ ] Add all environment variables to n8n
- [ ] Map team member UUIDs in the calendar assignment function
- [ ] Test each flow end-to-end with real data
- [ ] Monitor agent_log for errors in the first week
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/matyc/projects/lauti-crm
git add docs/n8n-flows.md
git commit -m "docs: n8n integration flows for Calendly, agent, notifications"
```

---

## Summary of all Phase 7 files

| File | Action | Task |
|------|--------|------|
| `lib/realtime.ts` | Create | 1 |
| `app/components/RealtimeProvider.tsx` | Create | 1 |
| `app/(dashboard)/layout.tsx` | Modify | 1 |
| `app/components/SaleBanner.tsx` | Rewrite | 2 |
| `next.config.ts` | Modify | 3, 4 |
| `public/manifest.json` | Create | 3 |
| `public/icons/icon-{128,192,512}.png` | Create | 3 |
| `app/layout.tsx` | Modify | 3 |
| `app/offline/page.tsx` | Create | 3 |
| `lib/push-notifications.ts` | Create | 4 |
| `app/api/notifications/subscribe/route.ts` | Create | 4 |
| `app/api/notifications/send/route.ts` | Create | 4 |
| `public/custom-sw.js` | Create | 4 |
| `app/components/Sidebar.tsx` | Modify | 4 |
| `supabase/migrations/007_push_subscription.sql` | Create | 4 |
| `scripts/migrate-airtable.ts` | Create | 5 |
| `supabase/migrations/008_airtable_id_indexes.sql` | Create | 5 |
| `scripts/validate-migration.ts` | Create | 6 |
| `docs/n8n-flows.md` | Create | 7 |
