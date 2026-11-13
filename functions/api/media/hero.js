// functions/api/media/hero.js

export async function onRequestGet({ request, env, ctx }) {
  try {
    if (!env.DB || !env.MEDIA) return new Response("Bindings missing", { status: 500 });

    // 1. Check Cloudflare Edge Cache first
    const cacheUrl = new URL(request.url);
    const cacheKey = new Request(cacheUrl.toString(), request);
    const cache = caches.default;
    let response = await cache.match(cacheKey);

    if (response) {
      return response;
    }

    // 2. Look up the active hero video key AND the crop position in D1
    const settings = await env.DB.prepare(
      "SELECT key, value FROM settings WHERE key IN ('hero_video_key', 'hero_video_position')"
    ).all();
    
    let activeKey = "";
    let activePosition = "50% 50%";
    
    if (settings && settings.results) {
        settings.results.forEach(row => {
            if (row.key === 'hero_video_key') activeKey = row.value;
            if (row.key === 'hero_video_position') activePosition = row.value;
        });
    }

    if (!activeKey) return new Response("No hero video active", { status: 404 });

    // 3. Parse the incoming Range header for scrubbing/seeking
    const rangeHeader = request.headers.get("Range");
    let r2Options = {};
    
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(.*)/);
      if (match) {
        r2Options.range = {
          offset: parseInt(match[1], 10)
        };
        if (match[2]) {
          r2Options.range.length = (parseInt(match[2], 10) - r2Options.range.offset) + 1;
        }
      }
    }

    // 4. Fetch from R2 with the properly formatted range object
    const object = await env.MEDIA.get(activeKey, r2Options);

    if (object === null) return new Response("Video file not found in storage", { status: 404 });

    // 5. Build the Response
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Content-Type", object.httpMetadata?.contentType || "video/mp4");
    headers.set("Cache-Control", "public, max-age=3600");
    headers.set("Accept-Ranges", "bytes");
    headers.set("X-Hero-Position", activePosition); // Expose the mobile crop to CSS

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