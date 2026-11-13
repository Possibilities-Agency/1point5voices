// functions/api/stats.js
// GET /api/stats — public totals for the counter, map, role chips and wall.
// Cached at Cloudflare's edge for 30 seconds, with a 24-hour background revalidation.

export async function onRequestGet({ env }) {
  try {
    if (!env.DB) {
      throw new Error("Database binding 'DB' is missing in this environment.");
    }

    const [total, countries, roles, recent] = await env.DB.batch([
      env.DB.prepare("SELECT value AS n FROM stats_kv WHERE key = 'total_signatures'"),
      env.DB.prepare("SELECT country, count AS n FROM stats_countries"),
      env.DB.prepare("SELECT role, count AS n FROM stats_roles"),
      env.DB.prepare(
        "SELECT first_name AS first, country, role, message AS msg, created_at AS ts " +
        "FROM signatures WHERE is_public = 1 ORDER BY id DESC LIMIT 30"
      ),
    ]);

    const body = {
      total: total?.results?.[0]?.n || 0,
      countries: Object.fromEntries((countries?.results || []).map(r => [r.country, r.n])),
      roles: Object.fromEntries((roles?.results || []).map(r => [r.role, r.n])),
      recent: (recent?.results || []).map(r => ({ ...r, ts: Date.parse(String(r.ts).replace(" ", "T") + "Z") || 0 })),
    };

    return new Response(JSON.stringify(body), {
      headers: { 
        "content-type": "application/json", 
        "cache-control": "public, max-age=30, stale-while-revalidate=86400" 
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}