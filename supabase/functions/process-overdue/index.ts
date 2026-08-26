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

    const today = new Date().toISOString().split("T")[0];

    // Find tasks that just became overdue (due_date < today, status still assigned/in_progress)
    const { data: newlyOverdue } = await supabase
      .from("tasks")
      .select("id, title, assigned_to, due_date")
      .in("status", ["assigned", "in_progress"])
      .lt("due_date", today);

    let notifiedCount = 0;

    for (const task of newlyOverdue || []) {
      // Send reminder notification to the assigned user
      await supabase.from("notifications").insert({
        user_id: task.assigned_to,
        title: "Task Overdue",
        message: `Task "${task.title}" was due on ${task.due_date} and is now overdue. Please complete it as soon as possible.`,
        type: "warning",
        link: "#/tasks",
      });
      notifiedCount++;
    }

    // Similar for feedback
    const { data: overdueFeedback } = await supabase
      .from("feedback")
      .select("id, subject, to_user")
      .in("status", ["assigned", "in_progress"]);

    for (const fb of overdueFeedback || []) {
      await supabase.from("notifications").insert({
        user_id: fb.to_user,
        title: "Feedback Pending",
        message: `Feedback "${fb.subject}" is still pending your response.`,
        type: "info",
        link: "#/feedback",
      });
      notifiedCount++;
    }

    return new Response(
      JSON.stringify({ success: true, notified: notifiedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
