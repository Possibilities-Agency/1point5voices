// functions/admin/callback.js

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return new Response(`Google Auth Error: ${error}`, { status: 403 });
  }
  if (!code) {
    return new Response("Missing authorization code.", { status: 400 });
  }

  // 1. Exchange the code for an access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: url.origin + "/admin/callback",
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    return new Response(`Failed to exchange token: ${tokenData.error_description || tokenData.error}`, { status: 400 });
  }

  // 2. Fetch the user's profile to verify their domain
  const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const userData = await userResponse.json();

  // 3. Verify the user belongs to your Workspace domain
  if (userData.hd !== "possibilities.agency") {
    return new Response("Unauthorized. Must use a possibilities.agency account.", { status: 403 });
  }

  // 4. Issue the session cookie and redirect to the dashboard
  // Note: For a production app, you should cryptographically sign this cookie or store a session ID in D1.
  const sessionCookie = `admin_session=${encodeURIComponent(userData.email)}; HttpOnly; Secure; Path=/; Max-Age=2592000; SameSite=Lax`;

  return new Response(null, {
    status: 302,
    headers: {
      "Location": "/admin",
      "Set-Cookie": sessionCookie,
    },
  });
}