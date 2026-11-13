// functions/admin/hero-upload.js

// Helper functions for AWS SigV4 using native Web Crypto API
async function hmac(key, string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    typeof key === "string" ? new TextEncoder().encode(key) : key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(string)));
}

function toHex(buffer) {
  return Array.from(buffer).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Verify Authentication
  const cookieHeader = request.headers.get("Cookie") || "";
  if (!cookieHeader.includes("admin_session=")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  // 2. Validate Environment Variables
  const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET_NAME } = env;
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID || !R2_BUCKET_NAME) {
    return new Response(JSON.stringify({ error: "R2 credentials missing in environment" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  try {
    // 3. Parse requested file info
    const { fileName, fileType } = await request.json();
    if (!fileName || !fileType) {
      return new Response(JSON.stringify({ error: "Missing fileName or fileType" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const fileExtension = fileName.split('.').pop() || 'mp4';
    const r2Key = `hero-video-${Date.now()}.${fileExtension}`;

    // 4. Construct AWS SigV4 Parameters
    const method = "PUT";
    const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const path = `/${R2_BUCKET_NAME}/${r2Key}`;
    
    const date = new Date();
    const amzDate = date.toISOString().replace(/[-:]/g, "").replace(/\.[0-9]+/, "");
    const dateStamp = amzDate.substring(0, 8);
    const region = "auto";
    const service = "s3";
    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    
    const queryParams = new URLSearchParams({
      "X-Amz-Algorithm": algorithm,
      "X-Amz-Credential": `${R2_ACCESS_KEY_ID}/${credentialScope}`,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": "3600",
      "X-Amz-SignedHeaders": "host"
    });
    
    // 5. Generate the Canonical Request and String to Sign
    const canonicalQueryString = Array.from(queryParams.entries())
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .sort()
      .join("&");
      
    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = "host";
    const payloadHash = "UNSIGNED-PAYLOAD";
    
    const canonicalRequest = `${method}\n${path}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    
    const canonicalRequestHashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalRequest));
    const canonicalRequestHash = toHex(new Uint8Array(canonicalRequestHashBuffer));
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;
    
    // 6. Calculate the Signature
    const kDate = await hmac("AWS4" + R2_SECRET_ACCESS_KEY, dateStamp);
    const kRegion = await hmac(kDate, region);
    const kService = await hmac(kRegion, service);
    const kSigning = await hmac(kService, "aws4_request");
    const signatureBuffer = await hmac(kSigning, stringToSign);
    
    queryParams.set("X-Amz-Signature", toHex(signatureBuffer));
    
    const presignedUrl = `https://${host}${path}?${queryParams.toString()}`;

    // Return the URL and key so the frontend can stream the file directly
    return new Response(JSON.stringify({ success: true, uploadUrl: presignedUrl, active_video: r2Key }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}