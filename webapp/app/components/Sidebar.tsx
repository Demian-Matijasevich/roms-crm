// webapp/app/components/Sidebar.tsx
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
  const [open, setOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function handleLogout() {
    document.cookie = "roms_session=; path=/; max-age=0";
    router.push("/login");
    router.refresh();
  }

  const sidebarContent = (
    <>
      <div className="px-5 py-5 border-b border-card-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-purple">7</span>ROMS
          </h1>
          <p className="text-xs text-muted mt-0.5">CRM Dashboard</p>
        </div>
        {/* Close button - mobile only */}
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden text-muted hover:text-foreground text-xl p-1"
        >
          &times;
        </button>
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
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#111113] border-b border-card-border flex items-center justify-between px-4 z-40">
        <button onClick={() => setOpen(true)} className="text-foreground p-1">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-purple">7</span>ROMS
        </h1>
        <div className="w-6" />
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/60 z-50" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar - desktop: always visible, mobile: slide in */}
      <aside className={`
        fixed left-0 top-0 h-full w-56 bg-[#111113] border-r border-card-border flex flex-col z-50
        transition-transform duration-200 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
      `}>
        {sidebarContent}
      </aside>
    </>
  );
}
