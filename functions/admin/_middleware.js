// functions/admin/_middleware.js

// This middleware restricts access to the /admin route to users in your Google Workspace.
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Allow requests to the callback URL to pass through
  if (url.pathname === '/admin/callback') {
    return context.next();
  }

  const cookieHeader = request.headers.get("Cookie") || "";
  if (!cookieHeader.includes("admin_session=")) {
    // Redirect to Google OAuth
    const redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${env.GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(url.origin + "/admin/callback")}` +
      `&response_type=code` +
      `&scope=email%20profile` +
      `&hd=possibilities.agency`; // Restricts login to your Workspace domain

    return Response.redirect(redirectUrl, 302);
  }

  // Session exists, allow access
  return context.next();
}