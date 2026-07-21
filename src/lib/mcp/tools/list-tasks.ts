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
  name: "list_tasks",
  title: "List tasks",
  description: "List tasks visible to the signed-in user. Use mine=true to see only your own assigned tasks.",
  inputSchema: {
    status: z.string().optional(),
    mine: z.boolean().optional().describe("If true, only tasks assigned to the signed-in user."),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, mine, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = sb(ctx).from("tasks").select("id,description,status,due_date,assigned_to,customer_id,lead_id,opportunity_id,created_at").order("due_date", { ascending: true, nullsFirst: false }).limit(limit ?? 50);
    if (status) q = q.eq("status", status as any);
    if (mine) q = q.eq("assigned_to", ctx.getUserId()!);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { rows: data ?? [] } };
  },
});
