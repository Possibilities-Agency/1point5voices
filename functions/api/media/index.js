// /api/media
//   POST ?token=…  upload one voice/video pledge (body = the recording). Stored privately, status 'pending'.
//   GET            list approved pledges for the public gallery.
// Bindings: DB (D1), MEDIA (R2 bucket)

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB: ~60s audio or ~30s video comfortably fits
const EXT = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/x-m4a": "m4a", "audio/wav": "wav",
              "video/webm": "webm", "video/mp4": "mp4", "video/quicktime": "mov" };

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...extra } });

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  if (!/^[0-9a-f-]{36}$/i.test(token)) return json({ error: "Invalid link" }, 400);

  const mime = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!EXT[mime]) return json({ error: "Please send an audio or video file" }, 415);
  const kind = mime.startsWith("video/") ? "video" : "audio";

  const len = Number(request.headers.get("content-length") || 0);
  if (len > MAX_BYTES) return json({ error: "File is too large (25 MB max)" }, 413);

  const sig = await env.DB.prepare("SELECT id FROM signatures WHERE upload_token = ?").bind(token).first();
  if (!sig) return json({ error: "This link has already been used" }, 403);

  const body = await request.arrayBuffer();
  if (!body.byteLength) return json({ error: "Empty recording" }, 400);
  if (body.byteLength > MAX_BYTES) return json({ error: "File is too large (25 MB max)" }, 413);

  const key = `pending/${sig.id}-${crypto.randomUUID()}.${EXT[mime]}`;
  await env.MEDIA.put(key, body, { httpMetadata: { contentType: mime } });

  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO media (signature_id, kind, r2_key, mime, size_bytes) VALUES (?,?,?,?,?)")
        .bind(sig.id, kind, key, mime, body.byteLength),
      env.DB.prepare("UPDATE signatures SET upload_token = NULL WHERE id = ?").bind(sig.id),
    ]);
  } catch (e) {
    await env.MEDIA.delete(key);
    return json({ error: "Could not save" }, 500);
  }
  return json({ ok: true, status: "pending" });
}

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT m.id, m.kind, s.first_name AS first, s.country, s.role " +
    "FROM media m JOIN signatures s ON s.id = m.signature_id " +
    "WHERE m.status = 'approved' ORDER BY m.id DESC LIMIT 24"
  ).all();
  return json({ items: results }, 200, { "cache-control": "public, max-age=60" });
}
