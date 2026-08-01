import { clearSessionCookie } from "../../_lib/auth.js";

export async function onRequestPost() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": clearSessionCookie(),
    },
  });
}