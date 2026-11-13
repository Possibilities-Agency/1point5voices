// functions/api/stats.js
// GET /api/stats — public totals for the counter, map, role chips and wall.
// Never returns emails. Cached at Cloudflare's edge for 15 seconds.

export async function onRequestGet({ env }) {
  try {
    if (!env.DB) {
      throw new Error("Database binding 'DB' is missing in this environment.");
    }

    const [total, countries, roles, recent] = await env.DB.batch([
      env.DB.prepare("SELECT COUNT(*) AS n FROM signatures"),
      env.DB.prepare("SELECT country, COUNT(*) AS n FROM signatures GROUP BY country"),
      env.DB.prepare("SELECT role, COUNT(*) AS n FROM signatures GROUP BY role"),
      
      // New randomized query joining the media table to pull audio/video data
      env.DB.prepare(`
        SELECT 
          s.id AS sig_id, 
          s.first_name AS first, 
          s.country, 
          s.role, 
          s.message AS msg, 
          s.created_at AS ts,
          m.id AS media_id,
          m.kind
        FROM signatures s
        LEFT JOIN media m ON s.id = m.signature_id AND m.status = 'approved'
        WHERE s.is_public = 1 
        ORDER BY RANDOM() 
        LIMIT 80
      `)
    ]);

    const body = {
      total: total?.results?.[0]?.n || 0,
      countries: Object.fromEntries((countries?.results || []).map(r => [r.country, r.n])),
      roles: Object.fromEntries((roles?.results || []).map(r => [r.role, r.n])),
      recent: (recent?.results || []).map(r => ({ 
        ...r, 
        ts: Date.parse(String(r.ts).replace(" ", "T") + "Z") || 0 
      })),
    };

    return new Response(JSON.stringify(body), {
      // Reduced cache time to 15s to allow for more frequent randomization on the frontend
      headers: { "content-type": "application/json", "cache-control": "public, max-age=15" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}