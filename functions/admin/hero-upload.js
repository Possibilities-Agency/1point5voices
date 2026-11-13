// functions/admin/hero-upload.js

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Verify Authentication
  const cookieHeader = request.headers.get("Cookie") || "";
  if (!cookieHeader.includes("admin_session=")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  if (!env.DB || !env.MEDIA) {
    return new Response(JSON.stringify({ error: "Database or R2 bindings missing" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  try {
    // 2. Parse the uploaded file and the crop position from the form data
    const formData = await request.formData();
    const file = formData.get("video");
    const position = formData.get("position") || "50% 50%"; // Default to center

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No valid video file provided." }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // 3. Generate a unique key and upload to R2
    const fileExtension = file.name.split('.').pop() || 'mp4';
    const r2Key = `hero-video-${Date.now()}.${fileExtension}`;

    await env.MEDIA.put(r2Key, file.stream(), {
      httpMetadata: { contentType: file.type }
    });

    // 4. Save the active video reference in the database
    await env.DB.prepare(
      "UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'hero_video_key'"
    ).bind(r2Key).run();

    // 5. Save the crop position in the database
    await env.DB.prepare(
      "UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'hero_video_position'"
    ).bind(position).run();

    return new Response(JSON.stringify({ success: true, active_video: r2Key, position: position }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}