// webapp/app/components/StatusBadge.tsx
const badgeColors: Record<string, string> = {
  "Cerrado": "bg-green/15 text-green border-green/30",
  "No Cierre": "bg-red/15 text-red border-red/30",
  "Pendiente": "bg-yellow/15 text-yellow border-yellow/30",
  "Seguimiento": "bg-purple/15 text-purple-light border-purple/30",
  "Re-programada": "bg-yellow/15 text-yellow border-yellow/30",
  "Cancelada": "bg-red/15 text-red border-red/30",
  "Reserva": "bg-purple/15 text-purple-light border-purple/30",
  "Pagado": "bg-green/15 text-green border-green/30",
  "Activo": "bg-green/15 text-green border-green/30",
  "Por vencer": "bg-yellow/15 text-yellow border-yellow/30",
  "Vencido": "bg-red/15 text-red border-red/30",
  "pagada": "bg-green/15 text-green border-green/30",
  "vencida": "bg-red/15 text-red border-red/30",
  "próxima": "bg-yellow/15 text-yellow border-yellow/30",
  "pendiente": "bg-muted/15 text-muted border-muted/30",
};

export default function StatusBadge({ status }: { status: string }) {
  const match = Object.entries(badgeColors).find(([key]) => status.includes(key));
  const classes = match?.[1] || "bg-muted/15 text-muted border-muted/30";
  const label = status.replace(/[^\w\sáéíóú]/g, "").trim();

  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border ${classes}`}>
      {label}
    </span>
  );
}
