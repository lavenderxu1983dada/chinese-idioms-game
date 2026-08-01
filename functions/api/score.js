import { json, getUser } from "../_lib/auth.js";

export async function onRequestGet(context) {
  const user = await getUser(context);
  if (!user) return json({ error: "unauthorized" }, 401);
  const best = await context.env.DB.prepare(
    "SELECT MAX(score) AS best FROM scores WHERE user_id = ?"
  ).bind(user.id).first();
  const totals = await context.env.DB.prepare(
    "SELECT COUNT(*) AS games, COALESCE(SUM(score), 0) AS total FROM scores WHERE user_id = ?"
  ).bind(user.id).first();
  return json({ best: best.best || 0, games: totals.games || 0, total: totals.total || 0 });
}

export async function onRequestPost(context) {
  const user = await getUser(context);
  if (!user) return json({ error: "unauthorized" }, 401);
  const body = await context.request.json().catch(() => ({}));
  const score = Number(body.score) || 0;
  const combo = Number(body.combo) || 0;
  const difficulty = String(body.difficulty || "all");
  if (score < 0 || score > 100000) return json({ error: "invalid score" }, 400);
  await context.env.DB.prepare(
    "INSERT INTO scores (user_id, score, combo, difficulty) VALUES (?, ?, ?, ?)"
  ).bind(user.id, score, combo, difficulty).run();
  return json({ ok: true });
}