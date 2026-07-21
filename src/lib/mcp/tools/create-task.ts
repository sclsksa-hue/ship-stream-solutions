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
  name: "create_task",
  title: "Create task",
  description: "Create a task, optionally assigned to another user and linked to a lead/customer/opportunity.",
  inputSchema: {
    description: z.string().min(1),
    due_date: z.string().optional().describe("ISO date (YYYY-MM-DD) or ISO datetime."),
    assigned_to: z.string().uuid().optional().describe("User id to assign to. Defaults to the signed-in user."),
    customer_id: z.string().uuid().optional(),
    lead_id: z.string().uuid().optional(),
    opportunity_id: z.string().uuid().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const row = { ...input, assigned_to: input.assigned_to ?? ctx.getUserId()! };
    const { data, error } = await sb(ctx).from("tasks").insert(row).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Task created: ${data.id}` }], structuredContent: { task: data } };
  },
});
