// webapp/lib/auth.ts
import { cookies } from "next/headers";
import { TEAM } from "./constants";
import type { AuthSession, Role } from "./types";

const COOKIE_NAME = "roms_session";

export function findUser(nombre: string, pin: string) {
  const pins: Record<string, string> = {
    "Valentino": "1234",
    "Agustín": "1234",
    "Juan Martín": "1234",
    "Guille": "1234",
    "Juanma": "0000",
    "Fran": "0000",
  };

  if (pins[nombre] !== pin) return null;
  const member = TEAM.find(t => t.nombre === nombre);
  if (!member) return null;
  return { nombre: member.nombre, roles: member.roles };
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(atob(raw)) as AuthSession;
  } catch {
    return null;
  }
}

export function createSessionCookie(session: AuthSession): string {
  return btoa(JSON.stringify(session));
}

export function hasRole(session: AuthSession | null, role: Role): boolean {
  return session?.roles.includes(role) ?? false;
}

export function isAdmin(session: AuthSession | null): boolean {
  return hasRole(session, "admin");
}
