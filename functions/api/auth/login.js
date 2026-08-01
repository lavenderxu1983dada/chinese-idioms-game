import { json } from "../../_lib/auth.js";

function randomState() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function onRequestGet({ env }) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return json({ error: "OAuth not configured (missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)" }, 500);
  }
  const state = randomState();
  const base = env.BASE_URL || "https://idioms.games";
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${base}/api/auth/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "consent",
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl,
      "Set-Cookie": `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    },
  });
}