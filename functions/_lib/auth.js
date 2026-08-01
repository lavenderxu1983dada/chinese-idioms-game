import { verifyJwt } from "./jwt.js";

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function parseCookies(request) {
  const header = request.headers.get("cookie") || "";
  const out = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}

export async function getUser(context) {
  const { request, env } = context;
  const cookies = parseCookies(request);
  if (!cookies.session) return null;
  const payload = await verifyJwt(cookies.session, env.JWT_SECRET);
  if (!payload || !payload.uid) return null;
  const user = await env.DB.prepare("SELECT id, email, name, picture FROM users WHERE id = ?")
    .bind(payload.uid)
    .first();
  return user;
}

export function sessionCookie(jwt, maxAge) {
  return `session=${jwt}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
}