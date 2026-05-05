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

    // Verify caller JWT and admin role
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
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const { user_id, mode, new_password } = body as {
      user_id: string;
      mode: "set" | "link";
      new_password?: string;
    };
    if (!user_id || !mode) return json({ error: "Missing fields" }, 400);

    if (mode === "set") {
      if (!new_password || new_password.length < 8) {
        return json({ error: "Password must be 8+ chars" }, 400);
      }
      if (!/\d/.test(new_password) || !/[^A-Za-z0-9]/.test(new_password)) {
        return json({ error: "Password must contain a number and special character" }, 400);
      }
      const { error } = await admin.auth.admin.updateUserById(user_id, { password: new_password });
      if (error) return json({ error: error.message }, 400);

      await admin.from("audit_logs").insert({
        user_id: callerId,
        user_email: callerEmail,
        action: "password_reset",
        entity_type: "auth",
        entity_id: user_id,
        new_values: { mode: "set" },
      });
      return json({ ok: true });
    }

    if (mode === "link") {
      // Generate a recovery link the admin can share
      const { data: profile } = await admin.from("profiles").select("email").eq("id", user_id).single();
      const email = profile?.email;
      if (!email) return json({ error: "User email not found" }, 400);

      const { data, error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
      });
      if (error) return json({ error: error.message }, 400);

      await admin.from("audit_logs").insert({
        user_id: callerId,
        user_email: callerEmail,
        action: "password_reset",
        entity_type: "auth",
        entity_id: user_id,
        new_values: { mode: "link" },
      });
      return json({ ok: true, action_link: data.properties?.action_link });
    }

    return json({ error: "Unknown mode" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
