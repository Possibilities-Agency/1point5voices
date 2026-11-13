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

    // 3. Parse the incoming Range header
    const rangeHeader = request.headers.get("Range");
    let r2Options = {};
    
    if (rangeHeader) {
      // Browsers send ranges like: bytes=0-1024 or bytes=500-
      const match = rangeHeader.match(/bytes=(\d+)-(.*)/);
      if (match) {
        r2Options.range = {
          offset: parseInt(match[1], 10)
        };
        // If an end byte is specified, calculate the length
        if (match[2]) {
          r2Options.range.length = (parseInt(match[2], 10) - r2Options.range.offset) + 1;
        }
      }
    }

    // 4. Fetch from R2 with the properly formatted range object
    const object = await env.MEDIA.get(record.r2_key, r2Options);

    if (object === null) return new Response("Media file not found in storage", { status: 404 });

    // 5. Build the Response
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Content-Type", record.mime);
    headers.set("Cache-Control", "public, max-age=3600");
    headers.set("Accept-Ranges", "bytes");

    let status = 200;

    // 6. Force 206 Partial Content if a range was processed
    if (object.range || rangeHeader) {
        status = 206;
        const start = object.range ? object.range.offset : 0;
        const end = object.range ? (object.range.offset + object.range.length - 1) : (object.size - 1);
        
        headers.set("Content-Range", `bytes ${start}-${end}/${object.size}`);
        headers.set("Content-Length", String(end - start + 1));
    } else {
        headers.set("Content-Length", String(object.size));
    }

    response = new Response(object.body, { status, headers });

    // Only cache full 200 OK responses
    if (status === 200) {
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;

  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}