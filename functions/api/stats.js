// functions/api/stats.js

export async function onRequestGet({ env }) {
  try {
    if (!env.DB) {
      throw new Error("Database binding 'DB' is missing in this environment.");
    }

    const [total, countries, roles, recent] = await env.DB.batch([
      env.DB.prepare("SELECT value AS n FROM stats_kv WHERE key = 'total_signatures'"),
      env.DB.prepare("SELECT country, count AS n FROM stats_countries"),
      env.DB.prepare("SELECT role, count AS n FROM stats_roles"),
      
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
      // Extended cache to 5 minutes (300 seconds) to protect the database
      headers: { "content-type": "application/json", "cache-control": "public, max-age=300" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}