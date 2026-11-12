// functions/admin/index.js

export async function onRequestGet(context) {
  // The middleware has already verified the user is authenticated by this point.
  // We extract their email from the cookie to display in the UI.
  const cookieHeader = context.request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/admin_session=([^;]+)/);
  const userEmail = match ? decodeURIComponent(match[1]) : "Admin";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Admin Dashboard | 1.5 Billion Voices</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f6efe4; color: #0b1b2b; margin: 0; padding: 40px; }
    .container { max-width: 900px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    h1 { margin-top: 0; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e6dccb; padding-bottom: 20px; margin-bottom: 20px; }
    .user { font-size: 14px; color: #5d6b78; }
    .tabs { display: flex; gap: 10px; margin-bottom: 20px; }
    .tab { padding: 10px 20px; background: #e6dccb; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
    .tab.active { background: #1d4d74; color: #fff; }
    .panel { display: none; }
    .panel.active { display: block; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th, td { padding: 12px; border-bottom: 1px solid #e6dccb; }
    th { background: #f9f9f9; }
    button.action { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
    .btn-approve { background: #1fb59a; color: white; }
    .btn-reject { background: #ff5a36; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Dashboard</h1>
      <div class="user">Logged in as: <b>${userEmail}</b></div>
    </div>
    
    <div class="tabs">
      <button class="tab active" onclick="switchTab('moderation')">Media Moderation</button>
      <button class="tab" onclick="switchTab('analytics')">Signatures & Export</button>
    </div>

    <div id="moderation" class="panel active">
      <h2>Pending Media</h2>
      <p>Approve voice and video pledges to display them on the public wall.</p>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Location</th>
            <th>Type</th>
            <th>Media</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="media-list">
          <tr><td colspan="5">Loading pending media...</td></tr>
        </tbody>
      </table>
    </div>

    <div id="analytics" class="panel">
      <h2>Signature Analytics</h2>
      <p>Data export and analytics features coming soon.</p>
    </div>
  </div>

  <script>
    function switchTab(id) {
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.getElementById(id).classList.add('active');
      event.target.classList.add('active');
    }
    
    // Future API call to load the media will go here
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=UTF-8" }
  });
}