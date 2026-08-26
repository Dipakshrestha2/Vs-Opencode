import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get escalation days setting
    const { data: setting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "escalation_days")
      .single();

    const escalationDays = parseInt(setting?.value || "5");

    // Find overdue tasks that need escalation
    const { data: overdueTasks } = await supabase
      .from("tasks")
      .select(`
        id, title, assigned_to, due_date, escalation_level,
        assigned_by:profiles!tasks_assigned_by_fkey(id, full_name),
        teacher:teachers!tasks_assigned_to_fkey(id, profile_id,
          supervisor:supervisor_teachers!supervisor_teachers_teacher_id_fkey(
            supervisor_id,
            supervisor:supervisors!supervisor_teachers_supervisor_id_fkey(id, profile_id)
          )
        )
      `)
      .in("status", ["assigned", "in_progress"])
      .lt("due_date", new Date(Date.now() - escalationDays * 86400000).toISOString().split("T")[0])
      .eq("escalation_level", 0);

    let escalatedCount = 0;

    for (const task of overdueTasks || []) {
      // Get supervisor profile_id
      const supervisorData = task.teacher?.supervisor?.[0]?.supervisor;
      if (!supervisorData) continue;

      const supervisorProfileId = supervisorData.profile_id;

      // Create escalation
      await supabase.from("escalations").insert({
        task_id: task.id,
        from_user: task.assigned_to,
        to_user: supervisorProfileId,
        reason: `Task "${task.title}" is overdue by ${escalationDays}+ days`,
        status: "assigned",
      });

      // Update task escalation level
      await supabase.from("tasks").update({ escalation_level: 1 }).eq("id", task.id);

      // Create notification
      await supabase.from("notifications").insert({
        user_id: supervisorProfileId,
        title: "Escalation Alert",
        message: `Task "${task.title}" has been escalated to you. It is overdue by ${escalationDays}+ days.`,
        type: "warning",
        link: "#/escalations",
      });

      escalatedCount++;
    }

    return new Response(
      JSON.stringify({ success: true, escalated: escalatedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
