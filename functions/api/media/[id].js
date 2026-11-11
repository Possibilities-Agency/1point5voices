// GET /api/media/:id — play an approved pledge. Pending or rejected recordings are never served.
export async function onRequestGet({ params, request, env }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return new Response("Not found", { status: 404 });
  const row = await env.DB.prepare("SELECT r2_key, mime FROM media WHERE id = ? AND status = 'approved'").bind(id).first();
  if (!row) return new Response("Not found", { status: 404 });

  const range = request.headers.get("range");
  const obj = await env.MEDIA.get(row.r2_key, range ? { range: request.headers } : undefined);
  if (!obj) return new Response("Not found", { status: 404 });

  const headers = new Headers({ "content-type": row.mime, "accept-ranges": "bytes", "cache-control": "public, max-age=86400" });
  if (range && obj.range) {
    const start = obj.range.offset ?? 0;
    const end = start + (obj.range.length ?? obj.size - start) - 1;
    headers.set("content-range", `bytes ${start}-${end}/${obj.size}`);
    headers.set("content-length", String(end - start + 1));
    return new Response(obj.body, { status: 206, headers });
  }
  headers.set("content-length", String(obj.size));
  return new Response(obj.body, { headers });
}
