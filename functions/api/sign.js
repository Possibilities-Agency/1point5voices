// POST /api/sign  — add one signature
// Bindings (set in Cloudflare dashboard → your Pages project → Settings → Bindings):
//   DB               D1 database
//   TURNSTILE_SECRET Turnstile secret key, as an encrypted variable

const ROLES = new Set(["Citizen","Young person","Artist","Athlete","Faith leader","Business leader",
  "Parent","Farmer","Entrepreneur","Educator","Scientist","Elected official"]);

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max);

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: "Bad request" }, 400); }

  const first = clean(b.first, 40);
  const email = clean(b.email, 120).toLowerCase();
  const country = clean(b.country, 60);
  const role = ROLES.has(b.role) ? b.role : "Citizen";
  const msg = clean(b.msg, 200);

  if (!first) return json({ error: "First name is required" }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "A valid email is required" }, 400);
  if (!country) return json({ error: "Country is required" }, 400);

  // --- Turnstile Bot Protection Verification ---
  const token = b.token;
  
  if (!token) {
    return json({ error: "Bot protection token missing." }, 400);
  }
  
  if (!env.TURNSTILE_SECRET) {
    return json({ error: "Server misconfiguration: TURNSTILE_SECRET is missing in Cloudflare Settings." }, 500);
  }

  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  form.append("remoteip", request.headers.get("CF-Connecting-IP") || "");

  const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { 
    method: "POST", 
    body: form 
  });
  
  const outcome = await verifyResponse.json();

  if (!outcome.success) {
    return json({ error: "Bot protection check failed." }, 403);
  }
  // ---------------------------------------------

  const uploadToken = crypto.randomUUID();
  try {
    await env.DB.prepare(
      "INSERT INTO signatures (first_name, email, country, role, message, is_public, updates, upload_token) VALUES (?,?,?,?,?,?,?,?)"
    ).bind(first, email, country, role, msg || null, b.public ? 1 : 0, b.updates ? 1 : 0, uploadToken).run();
  } catch (e) {
    if (String(e).includes("UNIQUE")) return json({ error: "Already signed" }, 409);
    return json({ error: "Could not save" }, 500);
  }
  
  // token lets this signer add one voice or video pledge
  return json({ ok: true, token: uploadToken });
}
