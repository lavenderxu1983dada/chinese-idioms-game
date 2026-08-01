import { json, getUser } from "../../_lib/auth.js";

export async function onRequestGet(context) {
  const user = await getUser(context);
  return json({ user });
}