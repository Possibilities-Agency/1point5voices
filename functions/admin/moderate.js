// functions/admin/moderate.js

export async function onRequest(context) {
  const { request, env } = context;

  // 1. Verify Authentication
  const cookieHeader = request.headers.get("Cookie") || "";
  if (!cookieHeader.includes("admin_session=")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: "Database binding missing" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  // 2. Handle GET: Fetch Signatures & Media (Paginated & Filtered)
  if (request.method === "GET") {
    try {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get("page")) || 1;
      const statusFilter = url.searchParams.get("status") || "pending";
      const limit = 50; 
      const offset = (page - 1) * limit;

      // Dynamically build the WHERE clause based on the requested tab
      let whereClause = "WHERE s.is_public = 0 OR m.status = 'pending'";
      if (statusFilter === "approved") whereClause = "WHERE s.is_public = 1";
      if (statusFilter === "rejected") whereClause = "WHERE s.is_public = -1";
      if (statusFilter === "all") whereClause = "";

      // Get the total count for the specific filter
      const countResult = await env.DB.prepare(
        `SELECT COUNT(s.id) as total 
         FROM signatures s
         LEFT JOIN media m ON s.id = m.signature_id
         ${whereClause}`
      ).first();
      
      const totalItems = countResult.total || 0;
      const totalPages = Math.ceil(totalItems / limit);

      // Fetch the specific page of data (Ordered by newest first for better history viewing)
      const { results } = await env.DB.prepare(
        `SELECT 
           s.id AS sig_id, 
           s.first_name, 
           s.country, 
           s.role, 
           s.message, 
           m.id AS media_id, 
           m.kind, 
           s.is_public, 
           m.status AS media_status
         FROM signatures s
         LEFT JOIN media m ON s.id = m.signature_id
         ${whereClause}
         ORDER BY s.created_at DESC
         LIMIT ? OFFSET ?`
      ).bind(limit, offset).all();

      return new Response(JSON.stringify({ 
        pending: results || [],
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: totalItems,
          hasMore: page < totalPages
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }

  // 3. Handle POST: Update Status (Approve, Reject, or Revert to Pending)
  if (request.method === "POST") {
    try {
      const body = await request.json();
      const { id, action } = body; 

      if (!id || !['approve', 'reject', 'pending'].includes(action)) {
        return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }

      if (action === 'approve') {
        await env.DB.batch([
          env.DB.prepare("UPDATE signatures SET is_public = 1 WHERE id = ?").bind(id),
          env.DB.prepare("UPDATE media SET status = 'approved' WHERE signature_id = ?").bind(id)
        ]);
      } else if (action === 'reject') {
        await env.DB.batch([
          env.DB.prepare("UPDATE signatures SET is_public = -1 WHERE id = ?").bind(id),
          env.DB.prepare("UPDATE media SET status = 'rejected' WHERE signature_id = ?").bind(id)
        ]);
      } else if (action === 'pending') {
        await env.DB.batch([
          env.DB.prepare("UPDATE signatures SET is_public = 0 WHERE id = ?").bind(id),
          env.DB.prepare("UPDATE media SET status = 'pending' WHERE signature_id = ?").bind(id)
        ]);
      }

      return new Response(JSON.stringify({ success: true, id, action }), {
        headers: { "Content-Type": "application/json" }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
}