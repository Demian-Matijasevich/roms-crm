// webapp/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { findUser, createSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  const { nombre, pin } = await request.json();
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
