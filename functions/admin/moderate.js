// functions/api/admin/moderate.js

export async function onRequest(context) {
  const { request, env } = context;

  // 1. Verify Authentication
  const cookieHeader = request.headers.get("Cookie") || "";
  if (!cookieHeader.includes("admin_session=")) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Handle GET: Fetch Pending Media
  if (request.method === "GET") {
    try {
      const { results } = await env.DB.prepare(
        `SELECT m.id, m.kind, m.mime, s.first_name, s.country, s.role
         FROM media m
         JOIN signatures s ON m.signature_id = s.id
         WHERE m.status = 'pending'
         ORDER BY m.created_at ASC`
      ).all();

      return new Response(JSON.stringify({ pending: results || [] }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

  // 3. Handle POST: Approve or Reject Media
  if (request.method === "POST") {
    try {
      const body = await request.json();
      const { id, action } = body;

      if (!id || !['approve', 'reject'].includes(action)) {
        return new Response("Invalid payload", { status: 400 });
      }

      const newStatus = action === 'approve' ? 'approved' : 'rejected';

      await env.DB.prepare(
        "UPDATE media SET status = ? WHERE id = ?"
      ).bind(newStatus, id).run();

      return new Response(JSON.stringify({ success: true, id, status: newStatus }), {
        headers: { "Content-Type": "application/json" }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
}