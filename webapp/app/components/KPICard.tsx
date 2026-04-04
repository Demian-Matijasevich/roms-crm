interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  color?: "purple" | "green" | "red" | "yellow" | "default";
}

const colorMap = {
  purple: "text-purple-light",
  green: "text-green",
  red: "text-red",
  yellow: "text-yellow",
  default: "text-foreground",
};

export default function KPICard({ title, value, subtitle, color = "default" }: KPICardProps) {
  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-5">
      <p className="text-xs text-muted uppercase tracking-wider mb-2">{title}</p>
      <p className={`text-2xl font-bold ${colorMap[color]}`}>{value}</p>
      {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
    </div>
  );
}
