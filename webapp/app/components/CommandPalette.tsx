"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";

interface SearchItem {
  type: "lead" | "alumno" | "closer";
  name: string;
  detail: string;
  href: string;
}

interface Props {
  items: SearchItem[];
}

export default function CommandPalette({ items }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Keyboard shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 8);
    const q = query.toLowerCase();
    return items.filter(item =>
      item.name.toLowerCase().includes(q) || item.detail.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [items, query]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  const typeIcons: Record<string, string> = {
    lead: "📞",
    alumno: "👤",
    closer: "🏆",
  };

  const typeColors: Record<string, string> = {
    lead: "text-purple-light",
    alumno: "text-green",
    closer: "text-yellow",
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Palette */}
      <div className="relative w-full max-w-lg bg-[#18181b] border border-card-border rounded-xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-card-border">
          <svg className="w-5 h-5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar lead, alumno, closer..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
          />
          <kbd className="text-[10px] text-muted bg-card-border px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted text-sm">
              Sin resultados para &quot;{query}&quot;
            </div>
          ) : (
            filtered.map((item, i) => (
              <button
                key={`${item.type}-${item.name}-${i}`}
                onClick={() => navigate(item.href)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#27272a] transition-colors text-left"
              >
                <span className="text-base">{typeIcons[item.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.name}</div>
                  <div className="text-xs text-muted truncate">{item.detail}</div>
                </div>
                <span className={`text-[10px] font-semibold uppercase ${typeColors[item.type]}`}>
                  {item.type}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-card-border flex items-center gap-4 text-[10px] text-muted">
          <span><kbd className="bg-card-border px-1 py-0.5 rounded font-mono">↑↓</kbd> navegar</span>
          <span><kbd className="bg-card-border px-1 py-0.5 rounded font-mono">↵</kbd> abrir</span>
          <span><kbd className="bg-card-border px-1 py-0.5 rounded font-mono">esc</kbd> cerrar</span>
        </div>
      </div>
    </div>
  );
}
