import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Invalid token" }, 401);

    const callerId = userData.user.id;
    const callerEmail = userData.user.email;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const { action, user_id, new_email } = body as {
      action: "update_email" | "delete";
      user_id: string;
      new_email?: string;
    };
    if (!action || !user_id) return json({ error: "Missing fields" }, 400);

    if (action === "update_email") {
      if (!new_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(new_email)) {
        return json({ error: "Invalid email" }, 400);
      }
      const { error: aErr } = await admin.auth.admin.updateUserById(user_id, {
        email: new_email,
        email_confirm: true,
      });
      if (aErr) return json({ error: aErr.message }, 400);

      const { error: pErr } = await admin.from("profiles").update({ email: new_email }).eq("id", user_id);
      if (pErr) return json({ error: pErr.message }, 400);

      await admin.from("audit_logs").insert({
        user_id: callerId, user_email: callerEmail, action: "email_update",
        entity_type: "auth", entity_id: user_id, new_values: { email: new_email },
      });
      return json({ ok: true });
    }

    if (action === "delete") {
      if (user_id === callerId) return json({ error: "Cannot delete yourself" }, 400);
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return json({ error: error.message }, 400);
      await admin.from("audit_logs").insert({
        user_id: callerId, user_email: callerEmail, action: "delete_user",
        entity_type: "auth", entity_id: user_id,
      });
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
