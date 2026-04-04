"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { MonthlyData } from "@/lib/types";

const PURPLE = "#8b5cf6";
const PURPLE_LIGHT = "#a78bfa";
const GREEN = "#22c55e";
const RED = "#ef4444";
const YELLOW = "#eab308";
const MUTED = "#52525b";

const tooltipStyle = {
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "8px",
  color: "#e5e5e5",
  fontSize: "13px",
};

function formatUSD(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

export function MonthlyRevenueChart({ data }: { data: MonthlyData[] }) {
  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-muted mb-4">Cash Collected por Mes</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => `$${v / 1000}k`} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [formatUSD(Number(value)), "Cash Collected"]}
          />
          <Bar dataKey="cashCollected" fill={PURPLE} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyCallsChart({ data }: { data: MonthlyData[] }) {
  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-muted mb-4">Llamadas por Mes</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="llamadas" stroke={MUTED} strokeWidth={2} name="Total" dot={false} />
          <Line type="monotone" dataKey="presentadas" stroke={PURPLE_LIGHT} strokeWidth={2} name="Presentadas" dot={false} />
          <Line type="monotone" dataKey="cerradas" stroke={GREEN} strokeWidth={2} name="Cerradas" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface PipelineData {
  name: string;
  value: number;
  color: string;
}

export function PipelineChart({ data }: { data: PipelineData[] }) {
  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-muted mb-4">Pipeline de Llamadas</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GastosChart({ data }: { data: MonthlyData[] }) {
  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-muted mb-4">Gastos vs Ingresos por Mes</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => `$${v / 1000}k`} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => [formatUSD(Number(value)), name === "cashCollected" ? "Ingresos" : "Gastos"]}
          />
          <Bar dataKey="cashCollected" fill={GREEN} radius={[4, 4, 0, 0]} name="Ingresos" />
          <Bar dataKey="gastos" fill={RED} radius={[4, 4, 0, 0]} name="Gastos" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export { PURPLE, PURPLE_LIGHT, GREEN, RED, YELLOW };
