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
    .admin-table-wrap { background: #fff; border-radius: 18px; border: 1px solid var(--line); overflow: hidden; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
    th, td { padding: 16px 20px; border-bottom: 1px solid var(--line); }
    th { background: var(--sand); font-weight: 700; color: var(--ink); text-transform: uppercase; letter-spacing: 0.05em; font-size: 12px; }
    tr:last-child td { border-bottom: none; }
    .btn-approve { background: var(--reef); color: white; border: none; padding: 6px 14px; border-radius: 999px; font-weight: 600; cursor: pointer; }
    .btn-reject { background: var(--heat); color: white; border: none; padding: 6px 14px; border-radius: 999px; font-weight: 600; cursor: pointer; margin-left: 8px; }
    .btn-media { background: transparent; color: var(--ocean); border: 1.5px solid var(--ocean); padding: 4px 12px; border-radius: 999px; font-weight: 600; font-size: 12px; cursor: pointer; }
    
    /* Pagination Styles */
    .pagination { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; font-size: 14px; color: var(--muted); }
    .page-controls { display: flex; gap: 10px; }
    .btn-page { background: var(--sand); color: var(--ink); border: 1px solid var(--line); padding: 6px 16px; border-radius: 999px; font-weight: 600; cursor: pointer; }
    .btn-page:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Analytics Styles */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
    .stat-box { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 24px; text-align: center; }
    .stat-num { font-size: 36px; font-weight: 700; margin-bottom: 8px; color: var(--ink); font-family: 'Anton', sans-serif; }
    .stat-label { font-size: 14px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .export-box { background: var(--sand); border-radius: 18px; padding: 30px; display: flex; justify-content: space-between; align-items: center; }
    .btn-export { background: var(--ocean); color: white; border: none; padding: 12px 24px; border-radius: 999px; font-weight: 600; font-size: 15px; cursor: pointer; text-decoration: none; display: inline-block; }

    /* Modal Styles */
    .modal-overlay { position: fixed; inset: 0; background: rgba(11, 27, 43, 0.85); display: flex; justify-content: center; align-items: center; z-index: 100; opacity: 0; visibility: hidden; transition: opacity 0.2s; backdrop-filter: blur(4px); }
    .modal-overlay.active { opacity: 1; visibility: visible; }
    .modal-content { background: var(--paper); padding: 24px; border-radius: 18px; max-width: 600px; width: 90%; position: relative; box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
    .modal-close { position: absolute; top: 12px; right: 16px; background: transparent; border: none; font-size: 24px; font-weight: bold; color: var(--muted); cursor: pointer; }
    .modal-body { margin-top: 10px; display: flex; flex-direction: column; align-items: center; }
    .modal-body video { width: 100%; border-radius: 12px; background: #000; max-height: 400px; }
    .modal-body audio { width: 100%; margin-top: 10px; }
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

      <div class="pagination">
        <div id="page-info">Showing page 1</div>
        <div class="page-controls">
          <button id="btn-prev" class="btn-page" onclick="changePage(-1)" disabled>Previous</button>
          <button id="btn-next" class="btn-page" onclick="changePage(1)" disabled>Next</button>
        </div>
      </div>
    </div>

    <div id="analytics" class="panel">
      <h2 style="margin-bottom: 8px;">Signature Analytics</h2>
      <p style="color: var(--muted); margin-bottom: 24px;">Overview of the campaign's progress.</p>

      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-num" id="stat-total">...</div>
          <div class="stat-label">Total Signatures</div>
        </div>
        <div class="stat-box">
          <div class="stat-num" id="stat-countries">...</div>
          <div class="stat-label">Countries Represented</div>
        </div>
        <div class="stat-box">
          <div class="stat-num" id="stat-pending">...</div>
          <div class="stat-label">Pending Approval</div>
        </div>
      </div>

      <div class="export-box">
        <div>
          <h3 style="margin-bottom: 8px;">Export Campaign Data</h3>
          <p style="color: var(--muted); margin: 0; font-size: 14px;">Download a complete CSV of all signatures (excluding rejected items).</p>
        </div>
        <a href="/admin/export" class="btn-export" target="_blank">Download CSV</a>
      </div>
    </div>
  </div>

  <!-- Media Review Modal -->
  <div class="modal-overlay" id="mediaModal" onclick="closeModal(event)">
    <div class="modal-content" onclick="event.stopPropagation()">
      <button class="modal-close" onclick="closeModal(event)">×</button>
      <h3 style="margin-top: 0;">Review Pledge</h3>
      <div class="modal-body" id="modalBody"></div>
    </div>
  </div>

  <script>
    let currentPage = 1;

    function switchTab(id) {
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.getElementById(id).classList.add('active');
      event.target.classList.add('active');
      
      if(id === 'analytics') {
        loadAnalytics();
      }
    }

    // Modal logic
    function openModal(mediaId, kind) {
      const modal = document.getElementById('mediaModal');
      const body = document.getElementById('modalBody');
      const mediaUrl = \`/api/media/\${mediaId}\`; // Corrected path to the public API
      
      if (kind === 'video') {
        body.innerHTML = \`<video controls autoplay playsinline src="\${mediaUrl}"></video>\`;
      } else {
        body.innerHTML = \`<audio controls autoplay src="\${mediaUrl}"></audio>\`;
      }
      
      modal.classList.add('active');
    }

    function closeModal(event) {
      if(event) event.preventDefault();
      const modal = document.getElementById('mediaModal');
      const body = document.getElementById('modalBody');
      modal.classList.remove('active');
      // Clear the HTML to stop media playback instantly
      setTimeout(() => { body.innerHTML = ''; }, 200); 
    }

    async function loadPending(page = 1) {
      try {
        const response = await fetch(\`/admin/moderate?page=\${page}\`);
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
          document.getElementById('btn-prev').disabled = true;
          document.getElementById('btn-next').disabled = true;
          document.getElementById('page-info').innerHTML = 'No items';
          return;
        }

        tbody.innerHTML = data.pending.map(item => {
          const typeLabel = item.kind ? item.kind : (item.message ? 'Text' : 'Signature Only');
          const typeColor = item.kind ? '#0066cc' : '#666';
          const typeBg = item.kind ? '#e6f3ff' : '#f0f0f0';
          
          let mediaHtml = '<span style="color: var(--muted);">No message</span>';
          if (item.kind === 'video' && item.media_id) {
             mediaHtml = \`<button class="btn-media" onclick="openModal(\${item.media_id}, 'video')">Watch Video</button>\`;
          } else if (item.kind === 'audio' && item.media_id) {
             mediaHtml = \`<button class="btn-media" onclick="openModal(\${item.media_id}, 'audio')">Listen to Audio</button>\`;
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

        currentPage = data.pagination.currentPage;
        document.getElementById('page-info').innerHTML = \`Showing page \${currentPage} of \${data.pagination.totalPages} (\${data.pagination.totalItems} total pending)\`;
        document.getElementById('btn-prev').disabled = currentPage <= 1;
        document.getElementById('btn-next').disabled = !data.pagination.hasMore;
        
        window._pendingTotal = data.pagination.totalItems;

      } catch (e) {
        document.getElementById('media-list').innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--heat); padding: 40px;">Error loading pending items. Check the network tab.</td></tr>';
      }
    }

    function changePage(direction) {
      loadPending(currentPage + direction);
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
            loadPending(currentPage);
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

    async function loadAnalytics() {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        
        document.getElementById('stat-total').innerText = data.total.toLocaleString();
        document.getElementById('stat-countries').innerText = Object.keys(data.countries).length;
        document.getElementById('stat-pending').innerText = window._pendingTotal || "0";
      } catch (e) {
        console.error("Failed to load analytics");
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