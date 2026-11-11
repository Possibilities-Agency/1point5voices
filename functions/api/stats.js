// GET /api/stats — public totals for the counter, map, role chips and wall.
// Never returns emails. Cached at Cloudflare's edge for 30 seconds.

export async function onRequestGet({ env }) {
  const [total, countries, roles, recent] = await env.DB.batch([
    env.DB.prepare("SELECT COUNT(*) AS n FROM signatures"),
    env.DB.prepare("SELECT country, COUNT(*) AS n FROM signatures GROUP BY country"),
    env.DB.prepare("SELECT role, COUNT(*) AS n FROM signatures GROUP BY role"),
    env.DB.prepare(
      "SELECT first_name AS first, country, role, message AS msg, created_at AS ts " +
      "FROM signatures WHERE is_public = 1 ORDER BY id DESC LIMIT 30"
    ),
  ]);

  const body = {
    total: total.results[0]?.n || 0,
    countries: Object.fromEntries(countries.results.map(r => [r.country, r.n])),
    roles: Object.fromEntries(roles.results.map(r => [r.role, r.n])),
    recent: recent.results.map(r => ({ ...r, ts: Date.parse(r.ts + "Z") || 0 })),
  };

  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=30" },
  });
}
