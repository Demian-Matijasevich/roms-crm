// webapp/app/objetivos/page.tsx
import { fetchLlamadas, fetchGastos } from "@/lib/sheets";
import { getSession } from "@/lib/auth";
import {
  getCurrentMonth,
  filterByMonth,
  getCloserStats,
  getSetterStats,
  isCerrado,
  formatUSD,
  formatPct,
} from "@/lib/data";
import { MONTH_LABELS } from "@/lib/constants";
import type { CloserStats } from "@/lib/types";

export const dynamic = "force-dynamic";

// ── Team-level monthly targets ──
const TEAM_TARGETS = {
  cashCollected: 50_000,
  llamadas: 80,
  cerradas: 20,
  comisiones: 6_000,
};

// ── Per-closer monthly targets ──
const CLOSER_TARGETS = {
  cash: 12_500,
  llamadas: 20,
  cerradas: 5,
};

function barColor(pct: number): string {
  if (pct >= 80) return "bg-green";
  if (pct >= 50) return "bg-yellow";
  return "bg-red";
}

function labelColor(pct: number): string {
  if (pct >= 80) return "text-green";
  if (pct >= 50) return "text-yellow";
  return "text-red";
}

interface ProgressBarProps {
  label: string;
  actualLabel: string;
  targetLabel: string;
  pct: number;
}

function ProgressBar({ label, actualLabel, targetLabel, pct }: ProgressBarProps) {
  const clamped = Math.min(pct, 100);
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-sm text-muted">{label}</span>
        <span className={`text-sm font-medium ${labelColor(pct)}`}>
          {actualLabel} / {targetLabel}
        </span>
      </div>
      <div className="h-3 bg-[#1a1a1e] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor(pct)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className={`text-xs mt-1 text-right ${labelColor(pct)}`}>{pct.toFixed(1)}%</p>
    </div>
  );
}

interface MiniProgressBarProps {
  label: string;
  actualLabel: string;
  targetLabel: string;
  pct: number;
}

function MiniProgressBar({ label, actualLabel, targetLabel, pct }: MiniProgressBarProps) {
  const clamped = Math.min(pct, 100);
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs text-muted">{label}</span>
        <span className={`text-xs font-medium ${labelColor(pct)}`}>
          {actualLabel} / {targetLabel}
        </span>
      </div>
      <div className="h-2 bg-[#1a1a1e] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor(pct)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export default async function ObjetivosPage() {
  const [llamadas, gastos] = await Promise.all([fetchLlamadas(), fetchGastos()]);

  const currentMonth = getCurrentMonth();
  const monthLabel = MONTH_LABELS[currentMonth] || currentMonth;

  const monthLlamadas = filterByMonth(llamadas, currentMonth);

  // ── Team actuals ──
  const cerradasMes = monthLlamadas.filter(isCerrado);
  const cashMes = cerradasMes.reduce((sum, l) => sum + l.cashDia1, 0);
  const totalLlamadasMes = monthLlamadas.length;
  const totalCerradasMes = cerradasMes.length;

  const closerStats = getCloserStats(monthLlamadas);
  const setterStats = getSetterStats(monthLlamadas);
  const comisionesClosers = closerStats.reduce((s, c) => s + c.comision, 0);
  const comisionesSetter = setterStats.reduce((s, c) => s + c.comision, 0);
  const totalComisiones = comisionesClosers + comisionesSetter;

  // ── Team pcts ──
  const pctCash = TEAM_TARGETS.cashCollected > 0 ? (cashMes / TEAM_TARGETS.cashCollected) * 100 : 0;
  const pctLlamadas = TEAM_TARGETS.llamadas > 0 ? (totalLlamadasMes / TEAM_TARGETS.llamadas) * 100 : 0;
  const pctCerradas = TEAM_TARGETS.cerradas > 0 ? (totalCerradasMes / TEAM_TARGETS.cerradas) * 100 : 0;
  const pctComisiones = TEAM_TARGETS.comisiones > 0 ? (totalComisiones / TEAM_TARGETS.comisiones) * 100 : 0;

  // ── Per-closer pcts ──
  const closersPctCierreRate = closerStats.map((c) => ({
    ...c,
    cierreRatePct: c.llamadas > 0 ? (c.cerradas / c.llamadas) * 100 : 0,
    pctCash: CLOSER_TARGETS.cash > 0 ? (c.cashCollected / CLOSER_TARGETS.cash) * 100 : 0,
    pctLlamadas: CLOSER_TARGETS.llamadas > 0 ? (c.llamadas / CLOSER_TARGETS.llamadas) * 100 : 0,
    pctCerradas: CLOSER_TARGETS.cerradas > 0 ? (c.cerradas / CLOSER_TARGETS.cerradas) * 100 : 0,
  }));

  return (
    <div>
      {/* ── HEADER ── */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Objetivos del Mes</h2>
        <p className="text-muted text-sm mt-1">{monthLabel}</p>
      </div>

      {/* ── TEAM OBJECTIVES ── */}
      <div className="bg-card-bg border border-card-border rounded-xl p-5 mb-8">
        <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-6">
          Equipo — {monthLabel}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cash Collected */}
          <div>
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Cash Collected</p>
            <p className="text-2xl font-bold mb-3">{formatUSD(cashMes)}</p>
            <ProgressBar
              label="vs objetivo"
              actualLabel={formatUSD(cashMes)}
              targetLabel={formatUSD(TEAM_TARGETS.cashCollected)}
              pct={pctCash}
            />
          </div>

          {/* Llamadas */}
          <div>
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Llamadas</p>
            <p className="text-2xl font-bold mb-3">{totalLlamadasMes}</p>
            <ProgressBar
              label="vs objetivo"
              actualLabel={String(totalLlamadasMes)}
              targetLabel={String(TEAM_TARGETS.llamadas)}
              pct={pctLlamadas}
            />
          </div>

          {/* Cerradas */}
          <div>
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Cerradas</p>
            <p className="text-2xl font-bold mb-3">{totalCerradasMes}</p>
            <ProgressBar
              label="vs objetivo"
              actualLabel={String(totalCerradasMes)}
              targetLabel={String(TEAM_TARGETS.cerradas)}
              pct={pctCerradas}
            />
          </div>

          {/* Comisiones */}
          <div>
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Comisiones Pagadas</p>
            <p className="text-2xl font-bold mb-3">{formatUSD(totalComisiones)}</p>
            <ProgressBar
              label="vs objetivo"
              actualLabel={formatUSD(totalComisiones)}
              targetLabel={formatUSD(TEAM_TARGETS.comisiones)}
              pct={pctComisiones}
            />
          </div>
        </div>
      </div>

      {/* ── PER-CLOSER OBJECTIVES ── */}
      {closersPctCierreRate.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted uppercase tracking-wider mb-4">
            Por Closer — {monthLabel}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {closersPctCierreRate.map((c) => (
              <div key={c.nombre} className="bg-card-bg border border-card-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-semibold text-sm">{c.nombre}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    c.pctCash >= 80
                      ? "bg-green/10 text-green"
                      : c.pctCash >= 50
                      ? "bg-yellow/10 text-yellow"
                      : "bg-red/10 text-red"
                  }`}>
                    {c.pctCash.toFixed(0)}%
                  </span>
                </div>

                <MiniProgressBar
                  label="Cash Collected"
                  actualLabel={formatUSD(c.cashCollected)}
                  targetLabel={formatUSD(CLOSER_TARGETS.cash)}
                  pct={c.pctCash}
                />

                <MiniProgressBar
                  label="Llamadas"
                  actualLabel={String(c.llamadas)}
                  targetLabel={String(CLOSER_TARGETS.llamadas)}
                  pct={c.pctLlamadas}
                />

                <MiniProgressBar
                  label="Cerradas"
                  actualLabel={String(c.cerradas)}
                  targetLabel={String(CLOSER_TARGETS.cerradas)}
                  pct={c.pctCerradas}
                />

                <div className="mt-3 pt-3 border-t border-card-border flex justify-between text-xs text-muted">
                  <span>Cierre rate</span>
                  <span className={labelColor(c.cierreRatePct)}>
                    {formatPct(c.llamadas > 0 ? c.cerradas / c.llamadas : 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {closersPctCierreRate.length === 0 && (
        <div className="bg-card-bg border border-card-border rounded-xl p-6 text-center">
          <p className="text-muted text-sm">Sin datos de closers para {monthLabel}.</p>
        </div>
      )}
    </div>
  );
}
