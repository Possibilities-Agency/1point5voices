// functions/admin/_middleware.js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Allow requests to the callback URL to pass through
  if (url.pathname === '/admin/callback') {
    return context.next();
  }

  const cookieHeader = request.headers.get("Cookie") || "";
  
  // If the user has a session, allow them to access the dashboard and APIs
  if (cookieHeader.includes("admin_session=")) {
    return context.next();
  }

  // If the request is for the moderation API but they don't have a session, block it with JSON
  if (url.pathname === '/admin/moderate') {
     return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  // Otherwise, redirect unauthorized users to Google OAuth
  // The &hd= parameter has been removed to allow multi-domain Google accounts
  const redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${env.GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(url.origin + "/admin/callback")}` +
    `&response_type=code` +
    `&scope=email%20profile`; 

  return Response.redirect(redirectUrl, 302);
}