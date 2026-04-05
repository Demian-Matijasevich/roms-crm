// webapp/lib/auth.ts
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { TEAM } from "./constants";
import type { AuthSession, Role } from "./types";

const COOKIE_NAME = "roms_session";
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "roms-crm-default-secret-change-in-production"
);

const pins: Record<string, string> = {
  "Valentino": "1234",
  "Agustín": "1234",
  "Juan Martín": "1234",
  "Fede": "1234",
  "Guille": "1234",
  "Juanma": "0000",
  "Fran": "0000",
};

export function findUser(nombre: string, pin: string) {
  if (pins[nombre] !== pin) return null;
  const member = TEAM.find(t => t.nombre === nombre);
  if (!member) return null;
  return { nombre: member.nombre, roles: member.roles };
}

export async function createSessionToken(session: AuthSession): Promise<string> {
  return new SignJWT({ nombre: session.nombre, roles: session.roles })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { nombre: payload.nombre as string, roles: payload.roles as Role[] };
  } catch {
    return null;
  }
}

export function hasRole(session: AuthSession | null, role: Role): boolean {
  return session?.roles.includes(role) ?? false;
}

export function isAdmin(session: AuthSession | null): boolean {
  return hasRole(session, "admin");
}
