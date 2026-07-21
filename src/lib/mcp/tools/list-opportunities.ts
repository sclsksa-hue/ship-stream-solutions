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
  name: "list_opportunities",
  title: "List opportunities",
  description: "List sales opportunities (deals) visible to the signed-in user.",
  inputSchema: {
    stage: z.string().optional().describe("Filter by opportunity stage."),
    customer_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ stage, customer_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = sb(ctx).from("opportunities").select("id,title,stage,customer_id,estimated_value,currency,expected_close,mode,trade_lane,assigned_to,created_at").order("created_at", { ascending: false }).limit(limit ?? 50);
    if (stage) q = q.eq("stage", stage as any);
    if (customer_id) q = q.eq("customer_id", customer_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { rows: data ?? [] } };
  },
});
