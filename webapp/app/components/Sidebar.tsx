// webapp/app/components/Sidebar.tsx
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@/lib/types";

interface SidebarProps {
  user: { nombre: string; roles: Role[] };
}

interface NavItem { href: string; label: string; icon: string; }
interface NavSection { title: string; items: NavItem[]; }

function getNav(roles: Role[]): NavSection[] {
  const isAdmin = roles.includes("admin");
  const isCloser = roles.includes("closer");
  const isSetter = roles.includes("setter");

  if (isAdmin) return [
    { title: "PRINCIPAL", items: [
      { href: "/", label: "Dashboard", icon: "📊" },
      { href: "/llamadas", label: "CRM Llamadas", icon: "📞" },
    ]},
    { title: "GESTIÓN", items: [
      { href: "/alumnos", label: "Alumnos", icon: "👥" },
      { href: "/cuotas", label: "Cuotas & Cobros", icon: "💳" },
      { href: "/finanzas", label: "Finanzas", icon: "💰" },
    ]},
    { title: "EQUIPO", items: [
      { href: "/leaderboard", label: "Leaderboard", icon: "🏆" },
      { href: "/objetivos", label: "Objetivos", icon: "🎯" },
    ]},
    { title: "CONFIG", items: [
      { href: "/admin/usuarios", label: "Admin", icon: "⚙️" },
    ]},
  ];

  const sections: NavSection[] = [];

  if (isCloser && isSetter) {
    sections.push(
      { title: "MI PANEL", items: [
        { href: "/", label: "Mi Dashboard", icon: "📊" },
        { href: "/llamadas", label: "Mis Llamadas", icon: "📞" },
      ]},
      { title: "CARGAR", items: [
        { href: "/form/llamada", label: "Cargar Llamada", icon: "📝" },
        { href: "/form/pago", label: "Cargar Pago", icon: "💰" },
        { href: "/form/reporte-setter", label: "Reporte Diario", icon: "📝" },
      ]},
      { title: "HERRAMIENTAS", items: [
        { href: "/utm", label: "UTM Builder", icon: "🔗" },
      ]},
    );
  } else if (isCloser) {
    sections.push(
      { title: "MI PANEL", items: [
        { href: "/", label: "Mi Dashboard", icon: "📊" },
        { href: "/llamadas", label: "Mis Llamadas", icon: "📞" },
      ]},
      { title: "CARGAR", items: [
        { href: "/form/llamada", label: "Cargar Llamada", icon: "📝" },
        { href: "/form/pago", label: "Cargar Pago", icon: "💰" },
      ]},
    );
  } else if (isSetter) {
    sections.push(
      { title: "MI PANEL", items: [
        { href: "/", label: "Mi Dashboard", icon: "📊" },
      ]},
      { title: "HERRAMIENTAS", items: [
        { href: "/utm", label: "UTM Builder", icon: "🔗" },
        { href: "/form/reporte-setter", label: "Reporte Diario", icon: "📝" },
      ]},
    );
  }

  sections.push({ title: "EQUIPO", items: [
    { href: "/leaderboard", label: "Leaderboard", icon: "🏆" },
  ]});

  return sections;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = getNav(user.roles);

  async function handleLogout() {
    document.cookie = "roms_session=; path=/; max-age=0";
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-[#111113] border-r border-card-border flex flex-col z-50">
      <div className="px-5 py-5 border-b border-card-border">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-purple">7</span>ROMS
        </h1>
        <p className="text-xs text-muted mt-0.5">CRM Dashboard</p>
      </div>

      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {nav.map(section => (
          <div key={section.title}>
            <p className="text-[10px] uppercase text-muted/60 tracking-wider px-3 pt-4 pb-1">
              {section.title}
            </p>
            {section.items.map(item => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                    active ? "bg-purple/15 text-purple-light font-medium"
                           : "text-[#a1a1aa] hover:bg-[#1f1f23] hover:text-foreground"
                  }`}>
                  <span className="text-sm">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-card-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium">{user.nombre}</p>
            <p className="text-[10px] text-purple capitalize">{user.roles.join(" / ")}</p>
          </div>
          <button onClick={handleLogout}
            className="text-muted hover:text-red text-xs transition-colors">
            Salir
          </button>
        </div>
      </div>
    </aside>
  );
}
