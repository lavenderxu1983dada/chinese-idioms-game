import { signJwt } from "../../_lib/jwt.js";
import { json, parseCookies, sessionCookie } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const base = env.BASE_URL || "https://idioms.games";

  const cookies = parseCookies(request);
  if (!code || !state || cookies.oauth_state !== state) {
    return new Response("Invalid OAuth state.", { status: 400 });
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${base}/api/auth/callback`,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokens.access_token) {
    return new Response("Token exchange failed.", { status: 400 });
  }

  const uiRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const ui = await uiRes.json();
  if (!ui.sub) {
    return new Response("Failed to fetch user info.", { status: 400 });
  }

  const existing = await env.DB.prepare("SELECT id FROM users WHERE google_sub = ?")
    .bind(ui.sub)
    .first();
  let userId;
  if (existing) {
    await env.DB.prepare(
      "UPDATE users SET email = ?, name = ?, picture = ?, updated_at = datetime('now') WHERE id = ?"
    )
      .bind(ui.email || null, ui.name || null, ui.picture || null, existing.id)
      .run();
    userId = existing.id;
  } else {
    const ins = await env.DB.prepare(
      "INSERT INTO users (google_sub, email, name, picture) VALUES (?, ?, ?, ?)"
    )
      .bind(ui.sub, ui.email || null, ui.name || null, ui.picture || null)
      .run();
    userId = ins.meta.last_row_id;
  }

  const jwt = await signJwt({ uid: userId, sub: ui.sub }, env.JWT_SECRET);
  return new Response(null, {
    status: 302,
    headers: {
      Location: base + "/",
      "Set-Cookie": sessionCookie(jwt, 7 * 24 * 3600),
    },
  });
}