"use client";

import { useEffect, useState } from "react";
import { formatUSD } from "@/lib/data";

interface Sale {
  closer: string;
  cash: number;
  programa: string;
  nombre: string;
}

export default function SaleBanner() {
  const [sale, setSale] = useState<Sale | null>(null);
  const [visible, setVisible] = useState(false);
  const [lastSeen, setLastSeen] = useState("");

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/recent-sales");
        if (!res.ok) return;
        const data = await res.json();
        if (data.latest) {
          const key = `${data.latest.closer}-${data.latest.cash}-${data.latest.nombre}`;
          if (key !== lastSeen) {
            setSale(data.latest);
            setLastSeen(key);
            setVisible(true);
            setTimeout(() => setVisible(false), 5000);
          }
        }
      } catch {}
    };

    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [lastSeen]);

  if (!visible || !sale) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
      <div className="bg-green/10 border border-green/30 backdrop-blur-sm rounded-xl px-6 py-3 flex items-center gap-3 shadow-lg">
        <span className="text-lg">🚀</span>
        <span className="text-sm text-green font-medium">
          {sale.closer} cerró {formatUSD(sale.cash)} en {sale.programa}
        </span>
      </div>
    </div>
  );
}
