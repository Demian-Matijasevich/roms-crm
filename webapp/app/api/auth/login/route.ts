// webapp/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { findUser, createSessionToken } from "@/lib/auth";
import { loginSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { nombre, pin } = parsed.data;
  const user = findUser(nombre, pin);

  if (!user) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  const token = await createSessionToken(user);
  const response = NextResponse.json({ success: true, user });
  response.cookies.set("roms_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}
