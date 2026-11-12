// functions/admin/index.js

export async function onRequestGet(context) {
  const cookieHeader = context.request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/admin_session=([^;]+)/);
  const userEmail = match ? decodeURIComponent(match[1]) : "Admin";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Admin Dashboard | 1.5 Billion Voices</title>
  <link rel="stylesheet" href="/style.css">
  <style>
    .admin-container { max-width: 1000px; margin: 60px auto; padding: 0 24px; }
    .admin-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid var(--line); padding-bottom: 20px; margin-bottom: 30px; }
    .admin-header h1 { margin: 0; font-size: 42px; line-height: 1; }
    .user-badge { background: var(--sand); padding: 8px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; color: var(--muted); border: 1px solid var(--line); }
    .tabs { display: flex; gap: 10px; margin-bottom: 30px; }
    .tab { font-family: inherit; font-size: 15px; font-weight: 600; padding: 12px 24px; background: transparent; border: 1.5px solid var(--line); border-radius: 999px; cursor: pointer; color: var(--muted); transition: all 0.2s; }
    .tab.active { background: var(--ink); color: #fff; border-color: var(--ink); }
    .panel { display: none; }
    .panel.active { display: block; }
    .admin-table-wrap { background: #fff; border-radius: 18px; border: 1px solid var(--line); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
    th, td { padding: 16px 20px; border-bottom: 1px solid var(--line); }
    th { background: var(--sand); font-weight: 700; color: var(--ink); text-transform: uppercase; letter-spacing: 0.05em; font-size: 12px; }
    tr:last-child td { border-bottom: none; }
    .btn-approve { background: var(--reef); color: white; border: none; padding: 6px 14px; border-radius: 999px; font-weight: 600; cursor: pointer; }
    .btn-reject { background: var(--heat); color: white; border: none; padding: 6px 14px; border-radius: 999px; font-weight: 600; cursor: pointer; margin-left: 8px; }
  </style>
</head>
<body>
  <div class="bar"><div class="wrap">
    <div class="logo"><span class="dot"></span>1.5 BILLION VOICES</div>
  </div></div>

  <div class="admin-container">
    <div class="admin-header">
      <h1>Admin Dashboard</h1>
      <div class="user-badge">${userEmail}</div>
    </div>
    
    <div class="tabs">
      <button class="tab active" onclick="switchTab('moderation')">Pending Signatures</button>
      <button class="tab" onclick="switchTab('analytics')">Signatures & Export</button>
    </div>

    <div id="moderation" class="panel active">
      <h2 style="margin-bottom: 8px;">Pending Signatures</h2>
      <p style="color: var(--muted); margin-bottom: 24px;">Approve signatures and media to display them on the public wall.</p>
      
      <div class="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Type</th>
              <th>Message / Media</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="media-list">
            <tr><td colspan="5" style="text-align: center; color: var(--muted); padding: 40px;">Loading pending signatures...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div id="analytics" class="panel">
      <h2 style="margin-bottom: 8px;">Signature Analytics</h2>
      <p style="color: var(--muted);">Data export and analytics features coming soon.</p>
    </div>
  </div>

  <script>
    function switchTab(id) {
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.getElementById(id).classList.add('active');
      event.target.classList.add('active');
    }

    async function loadPending() {
      try {
        const response = await fetch('/admin/moderate');
        if (response.status === 401) {
          window.location.reload(); 
          return;
        }
        
        const data = await response.json();
        const tbody = document.getElementById('media-list');
        
        if (data.error) {
          tbody.innerHTML = \`<tr><td colspan="5" style="text-align: center; color: var(--heat); padding: 40px;">Error: \${data.error}</td></tr>\`;
          return;
        }

        if (!data.pending || data.pending.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--muted); padding: 40px;">No pending signatures to review.</td></tr>';
          return;
        }

        tbody.innerHTML = data.pending.map(item => {
          const typeLabel = item.kind ? item.kind : (item.message ? 'Text' : 'Signature Only');
          const typeColor = item.kind ? '#0066cc' : '#666';
          const typeBg = item.kind ? '#e6f3ff' : '#f0f0f0';
          
          let mediaHtml = '<span style="color: var(--muted);">No message</span>';
          if (item.kind === 'video') {
             mediaHtml = \`<a href="/api/media/\${item.media_id}" target="_blank" style="color: var(--ocean); font-weight: bold;">Watch Video ↗</a>\`;
          } else if (item.kind === 'audio') {
             mediaHtml = \`<a href="/api/media/\${item.media_id}" target="_blank" style="color: var(--ocean); font-weight: bold;">Listen ↗</a>\`;
          } else if (item.message) {
             mediaHtml = \`"\${item.message}"\`;
          }

          return \`
          <tr id="row-\${item.sig_id}">
            <td><strong>\${item.first_name || 'Anonymous'}</strong></td>
            <td>\${item.country || 'Unknown'}</td>
            <td><span style="background: \${typeBg}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; color: \${typeColor}; text-transform: uppercase;">\${typeLabel}</span></td>
            <td>\${mediaHtml}</td>
            <td>
              <button class="btn-approve" onclick="moderate(\${item.sig_id}, 'approve')">Approve</button>
              <button class="btn-reject" onclick="moderate(\${item.sig_id}, 'reject')">Reject</button>
            </td>
          </tr>
          \`;
        }).join('');
      } catch (e) {
        document.getElementById('media-list').innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--heat); padding: 40px;">Error loading pending items. Check the network tab.</td></tr>';
      }
    }

    async function moderate(id, action) {
      const row = document.getElementById(\`row-\${id}\`);
      row.style.opacity = '0.5';
      
      try {
        const res = await fetch('/admin/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, action })
        });
        
        if (res.ok) {
          row.remove();
          if (document.getElementById('media-list').children.length === 0) {
            document.getElementById('media-list').innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--muted); padding: 40px;">No pending signatures to review.</td></tr>';
          }
        } else {
          row.style.opacity = '1';
          alert('Failed to update status.');
        }
      } catch (e) {
        row.style.opacity = '1';
        alert('An error occurred.');
      }
    }

    loadPending();
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=UTF-8" }
  });
}