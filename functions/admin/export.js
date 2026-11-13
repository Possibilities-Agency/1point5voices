// functions/admin/export.js

export async function onRequestGet(context) {
  const { request, env } = context;

  // 1. Verify Authentication (using the same logic as the dashboard)
  const cookieHeader = request.headers.get("Cookie") || "";
  if (!cookieHeader.includes("admin_session=")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  if (!env.DB) {
    return new Response("Database binding missing", { status: 500 });
  }

  try {
    // 2. Fetch all signatures (excluding those rejected by moderation)
    const { results } = await env.DB.prepare(
      `SELECT first_name, email, country, role, created_at, is_public 
       FROM signatures 
       WHERE is_public >= 0 
       ORDER BY created_at DESC`
    ).all();

    if (!results || results.length === 0) {
      return new Response("No data available to export.", { status: 404 });
    }

    // 3. Format as CSV
    const headers = ["First Name", "Email", "Country", "Role", "Date Signed", "Public Wall Status"];
    const csvRows = [headers.join(",")];

    for (const row of results) {
      // Escape commas and quotes inside the data
      const values = [
        `"${String(row.first_name || '').replace(/"/g, '""')}"`,
        `"${String(row.email || '').replace(/"/g, '""')}"`,
        `"${String(row.country || '').replace(/"/g, '""')}"`,
        `"${String(row.role || '').replace(/"/g, '""')}"`,
        `"${String(row.created_at || '').replace(/"/g, '""')}"`,
        row.is_public === 1 ? "Approved" : "Pending"
      ];
      csvRows.push(values.join(","));
    }

    const csvString = csvRows.join("\n");

    // 4. Return the file download
    const filename = `1point5voices_export_${new Date().toISOString().split('T')[0]}.csv`;

    return new Response(csvString, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    return new Response(`Export failed: ${error.message}`, { status: 500 });
  }
}