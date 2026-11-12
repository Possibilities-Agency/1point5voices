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

  // 1. Exchange the user's login code for an access token
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

  // 2. Fetch the user's profile
  const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userData = await userResponse.json();

  // 3. Verify Group Membership via Admin SDK
  if (!env.WORKSPACE_REFRESH_TOKEN) {
    return new Response("Server configuration error: Workspace Token missing.", { status: 500 });
  }

  const isModerator = await checkGroupMembership(
    userData.email, 
    "moderators@possibilities.agency", 
    env.GOOGLE_CLIENT_ID, 
    env.GOOGLE_CLIENT_SECRET, 
    env.WORKSPACE_REFRESH_TOKEN
  );

  if (!isModerator) {
    return new Response(`Unauthorized. ${userData.email} is not a member of the moderation group.`, { status: 403 });
  }

  // 4. Issue the session cookie and redirect to the dashboard
  const sessionCookie = `admin_session=${encodeURIComponent(userData.email)}; HttpOnly; Secure; Path=/; Max-Age=2592000; SameSite=Lax`;

  return new Response(null, {
    status: 302,
    headers: {
      "Location": "/admin",
      "Set-Cookie": sessionCookie,
    },
  });
}

// Helper to query the Google Workspace Admin Directory
async function checkGroupMembership(userEmail, groupEmail, clientId, clientSecret, refreshToken) {
  try {
    // 1. Exchange the offline Refresh Token for a fresh Access Token
    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    
    const refreshData = await refreshRes.json();
    if (!refreshRes.ok) return false;

    // 2. Ask the Admin SDK if the user is in the group
    const groupRes = await fetch(`https://admin.googleapis.com/admin/directory/v1/groups/${groupEmail}/hasMember/${userEmail}`, {
      headers: { Authorization: `Bearer ${refreshData.access_token}` },
    });

    const groupData = await groupRes.json();
    return groupData.isMember === true;
    
  } catch (e) {
    console.error("Group check failed:", e);
    return false;
  }
}