import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_leads",
  title: "List leads",
  description: "List CRM leads visible to the signed-in user. Supports optional status filter and search on company/contact name.",
  inputSchema: {
    status: z.string().optional().describe("Filter by lead status (e.g. new, qualified)."),
    search: z.string().optional().describe("Case-insensitive search on company_name or contact_name."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = sb(ctx).from("leads").select("id,company_name,contact_name,email,phone,status,source,industry,country,assigned_to,created_at").order("created_at", { ascending: false }).limit(limit ?? 50);
    if (status) q = q.eq("status", status as any);
    if (search) q = q.or(`company_name.ilike.%${search}%,contact_name.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { rows: data ?? [] } };
  },
});
