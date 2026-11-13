// functions/admin/hero-confirm.js

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Verify Authentication
  const cookieHeader = request.headers.get("Cookie") || "";
  if (!cookieHeader.includes("admin_session=")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: "Database binding missing" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  try {
    const { r2Key, position } = await request.json();

    if (!r2Key || !position) {
      return new Response(JSON.stringify({ error: "Missing r2Key or position" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // 2. Save active video reference
    await env.DB.prepare(
      "UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'hero_video_key'"
    ).bind(r2Key).run();

    // 3. Save crop position
    await env.DB.prepare(
      "UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'hero_video_position'"
    ).bind(position).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}