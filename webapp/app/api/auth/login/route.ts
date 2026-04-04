// webapp/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { findUser, createSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const { nombre, pin } = await request.json();
  const user = findUser(nombre, pin);

  if (!user) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true, user });
  response.cookies.set("roms_session", createSessionCookie(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}
