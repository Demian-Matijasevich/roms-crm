import { fetchLlamadas } from "@/lib/sheets";
import { getAlumnos, isCerrado } from "@/lib/data";
import { TEAM } from "@/lib/constants";
import CommandPalette from "./CommandPalette";

export default async function CommandPaletteWrapper() {
  let items: { type: "lead" | "alumno" | "closer"; name: string; detail: string; href: string }[] = [];

  try {
    const llamadas = await fetchLlamadas();

    // Leads (all llamadas)
    for (const l of llamadas) {
      if (!l.nombre) continue;
      items.push({
        type: "lead",
        name: l.nombre,
        detail: `${l.closer || "sin closer"} · ${l.estado || "sin estado"} · ${l.programa || "sin programa"}`,
        href: "/pipeline",
      });
    }

    // Alumnos (cerrados)
    const alumnos = getAlumnos(llamadas);
    for (const a of alumnos) {
      items.push({
        type: "alumno",
        name: a.nombre,
        detail: `${a.programa} · ${a.closer} · ${a.estado} · ${a.diasRestantes} días`,
        href: "/alumnos",
      });
    }

    // Closers
    for (const t of TEAM) {
      if (t.roles.includes("closer") || t.roles.includes("admin")) {
        items.push({
          type: "closer",
          name: t.nombre,
          detail: t.roles.join(" / "),
          href: "/leaderboard",
        });
      }
    }
  } catch {
    // If sheets fail, show empty palette
  }

  // Deduplicate by name+type
  const seen = new Set<string>();
  items = items.filter(item => {
    const key = `${item.type}-${item.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return <CommandPalette items={items} />;
}
