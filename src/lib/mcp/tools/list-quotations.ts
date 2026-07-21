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
  name: "list_quotations",
  title: "List quotations",
  description: "List quotations visible to the signed-in user. RLS masks financial fields for restricted roles.",
  inputSchema: {
    status: z.string().optional(),
    customer_id: z.string().uuid().optional(),
    invoiced: z.boolean().optional(),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, customer_id, invoiced, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = sb(ctx).from("quotations").select("id,quote_number,status,customer_id,opportunity_id,origin,destination,shipment_type,currency,total_amount,selling_price,invoiced,invoiced_at,created_at").order("created_at", { ascending: false }).limit(limit ?? 50);
    if (status) q = q.eq("status", status as any);
    if (customer_id) q = q.eq("customer_id", customer_id);
    if (typeof invoiced === "boolean") q = q.eq("invoiced", invoiced);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { rows: data ?? [] } };
  },
});
