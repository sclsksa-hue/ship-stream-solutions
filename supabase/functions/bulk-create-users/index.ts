import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmployeeInput {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  role: "admin" | "sales" | "operations" | "viewer";
  password: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { employees } = (await req.json()) as { employees: EmployeeInput[] };

    const results: Array<{ email: string; status: string; error?: string }> = [];

    for (const emp of employees) {
      try {
        // Try to create the user
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email: emp.email,
          password: emp.password,
          email_confirm: true,
          user_metadata: { full_name: emp.full_name },
        });

        let userId = created?.user?.id;

        if (createErr) {
          // If user already exists, look them up
          if (createErr.message?.toLowerCase().includes("already")) {
            const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
            const existing = list?.users?.find((u) => u.email?.toLowerCase() === emp.email.toLowerCase());
            if (existing) userId = existing.id;
          }
          if (!userId) {
            results.push({ email: emp.email, status: "error", error: createErr.message });
            continue;
          }
        }

        if (!userId) {
          results.push({ email: emp.email, status: "error", error: "no user id" });
          continue;
        }

        // Upsert profile
        await supabase.from("profiles").upsert({
          id: userId,
          full_name: emp.full_name,
          email: emp.email,
          phone: emp.phone,
          position: emp.position,
          is_active: true,
        });

        // Reset role to the desired role
        await supabase.from("user_roles").delete().eq("user_id", userId);
        await supabase.from("user_roles").insert({ user_id: userId, role: emp.role });

        results.push({ email: emp.email, status: "ok" });
      } catch (e) {
        results.push({ email: emp.email, status: "error", error: (e as Error).message });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
