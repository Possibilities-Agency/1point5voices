// functions/api/media/[[id]].js

export async function onRequestGet({ request, env, params, ctx }) {
  try {
    const id = params.id ? params.id[0] : null;
    if (!id) return new Response("Media ID required", { status: 400 });
    if (!env.DB || !env.MEDIA_BUCKET) return new Response("Bindings missing", { status: 500 });

    // 1. Check Cloudflare Edge Cache first
    const cacheUrl = new URL(request.url);
    const cacheKey = new Request(cacheUrl.toString(), request);
    const cache = caches.default;
    let response = await cache.match(cacheKey);

    if (response) {
      return response;
    }

    // 2. Look up the media record in D1 (only if cache miss)
    const record = await env.DB.prepare(
      "SELECT r2_key, mime FROM media WHERE id = ?"
    ).bind(id).first();

    if (!record) return new Response("Media not found", { status: 404 });

    // 3. Fetch from R2 
    // We pass the incoming headers so R2 natively handles the Range requests!
    const object = await env.MEDIA_BUCKET.get(record.r2_key, {
      range: request.headers,
      onlyIf: request.headers
    });

    if (object === null) return new Response("Media file not found in storage", { status: 404 });

    // 4. Build the Response
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Content-Type", record.mime);
    
    // Allow browsers to cache the media for 1 hour to reduce repeat fetches
    headers.set("Cache-Control", "public, max-age=3600");

    // If R2 satisfied a range request, return 206 Partial Content
    const status = object.range ? 206 : 200;
    
    // Explicitly tell the browser we support seeking
    headers.set("Accept-Ranges", "bytes");

    if (object.range) {
        headers.set("Content-Range", `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`);
    }

    response = new Response(object.body, { status, headers });

    // 5. Store in Edge Cache (in the background)
    // We only cache full 200 OK responses to avoid fragmenting the cache
    if (status === 200) {
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;

  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}