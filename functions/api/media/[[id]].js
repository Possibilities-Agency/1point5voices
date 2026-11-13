// functions/api/media/[[id]].js

export async function onRequestGet({ request, env, params, ctx }) {
  try {
    const id = params.id ? params.id[0] : null;
    if (!id) return new Response("Media ID required", { status: 400 });
    if (!env.DB || !env.MEDIA) return new Response("Bindings missing", { status: 500 });

    // 1. Check Cloudflare Edge Cache first
    const cacheUrl = new URL(request.url);
    const cacheKey = new Request(cacheUrl.toString(), request);
    const cache = caches.default;
    let response = await cache.match(cacheKey);

    if (response) {
      return response;
    }

    // 2. Look up the media record in D1
    const record = await env.DB.prepare(
      "SELECT r2_key, mime FROM media WHERE id = ?"
    ).bind(id).first();

    if (!record) return new Response("Media not found", { status: 404 });

    // 3. Fetch from R2 
    const object = await env.MEDIA.get(record.r2_key, {
      range: request.headers,
      onlyIf: request.headers
    });

    if (object === null) return new Response("Media file not found in storage", { status: 404 });

    // 4. Build the Response
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Content-Type", record.mime);
    headers.set("Cache-Control", "public, max-age=3600");
    
    // Explicitly tell the browser we support seeking
    headers.set("Accept-Ranges", "bytes");

    // Check if the browser requested a range
    const rangeHeader = request.headers.get("Range");
    
    let status = 200;

    // If R2 provided a range OR if the browser asked for one, we force a 206 response
    if (object.range || rangeHeader) {
        status = 206;
        
        // If object.range exists, R2 handled it. If not, we still need to provide the Content-Range header
        // to satisfy the browser's expectation for a 206 response.
        const start = object.range ? object.range.offset : 0;
        const end = object.range ? (object.range.offset + object.range.length - 1) : (object.size - 1);
        
        headers.set("Content-Range", `bytes ${start}-${end}/${object.size}`);
        headers.set("Content-Length", String(end - start + 1));
    } else {
        // Standard 200 OK for full downloads (non-media player requests)
        headers.set("Content-Length", String(object.size));
    }

    response = new Response(object.body, { status, headers });

    // 5. Store in Edge Cache (in the background)
    // Only cache 200 OK responses to avoid fragmenting the cache with partial chunks
    if (status === 200) {
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;

  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}