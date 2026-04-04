// webapp/app/components/MonthSelector.tsx
"use client";
import { MONTH_LABELS } from "@/lib/constants";

interface MonthSelectorProps {
  value: string;
  onChange: (mes: string) => void;
  availableMonths?: string[];
}

export default function MonthSelector({ value, onChange, availableMonths }: MonthSelectorProps) {
  const months = availableMonths || Object.keys(MONTH_LABELS);

  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="bg-card-bg border border-card-border text-foreground px-3 py-2 rounded-lg text-sm
        focus:outline-none focus:border-purple cursor-pointer">
      {months.map(m => (
        <option key={m} value={m}>{MONTH_LABELS[m] || m}</option>
      ))}
    </select>
  );
}
