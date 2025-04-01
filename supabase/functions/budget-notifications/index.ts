
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  budget_id: string;
  user_id: string;
  category: string;
  percentage_used: number;
  email: string;
}

serve(async (req) => {
  // Handle preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: RequestBody = await req.json();
    const { budget_id, user_id, category, percentage_used, email } = body;

    if (!budget_id || !user_id || !category || !email) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          received: { budget_id, user_id, category, email },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log(`Processing budget alert for ${category}, ${percentage_used.toFixed(0)}% used`);

    // Check if we've already sent a similar notification recently
    const sixHoursAgo = new Date();
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);
    
    const { data: recentLogs, error: logCheckError } = await supabase
      .from("budget_alert_logs")
      .select("*")
      .eq("budget_id", budget_id)
      .eq("user_id", user_id)
      .gt("created_at", sixHoursAgo.toISOString())
      .order("created_at", { ascending: false });
      
    if (logCheckError) {
      console.error("Error checking recent alerts:", logCheckError);
    } else if (recentLogs && recentLogs.length > 0) {
      console.log(`Found ${recentLogs.length} recent alerts for this budget, checking if we should send another...`);
      
      // Only send another alert if the percentage has increased significantly (10% more)
      const mostRecentAlert = recentLogs[0];
      if (percentage_used < mostRecentAlert.percentage_used + 10) {
        console.log(`Skipping alert: Recent alert was ${mostRecentAlert.percentage_used}%, current is ${percentage_used}%`);
        return new Response(
          JSON.stringify({
            message: "Skipped sending duplicate alert",
            reason: "Recent similar alert already sent"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      } else {
        console.log(`Sending new alert: Significant increase from ${mostRecentAlert.percentage_used}% to ${percentage_used}%`);
      }
    }

    // Log the alert in the budget_alert_logs table
    const { data: logData, error: logError } = await supabase
      .from("budget_alert_logs")
      .insert([
        {
          user_id: user_id,
          budget_id: budget_id,
          category: category,
          percentage_used: percentage_used,
          email_sent_to: email
        }
      ]);

    if (logError) {
      console.error("Error logging budget alert:", logError);
    } else {
      console.log("Budget alert logged:", logData);
    }

    // Insert notification into the notifications table
    const notificationTitle = percentage_used >= 100 ? "Budget Exceeded" : "Budget Alert";
    const notificationMessage = percentage_used >= 100 
      ? `You've exceeded your ${category} budget.` 
      : `You've used ${percentage_used.toFixed(0)}% of your ${category} budget.`;
    
    const { data: notificationData, error: notificationError } = await supabase
      .from("notifications")
      .insert([
        {
          user_id: user_id,
          title: notificationTitle,
          message: notificationMessage,
          type: "budget",
          read: false
        }
      ]);

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
    } else {
      console.log("Budget notification created:", notificationData);
    }

    // Call the send-budget-alert function to send an email
    const alertResponse = await fetch(
      `${supabaseUrl}/functions/v1/send-budget-alert`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          email: email,
          category: category,
          percentage_used: percentage_used,
          user_id: user_id
        }),
      }
    );
    
    if (!alertResponse.ok) {
      const errorText = await alertResponse.text();
      console.error(`Error from send-budget-alert: ${alertResponse.status} ${errorText}`);
      throw new Error(`Error from send-budget-alert: ${alertResponse.status} ${errorText}`);
    }
    
    const alertResult = await alertResponse.json();
    console.log("Email sending result:", alertResult);

    return new Response(
      JSON.stringify({
        message: "Budget alert processed successfully",
        notification: notificationData || null,
        email: alertResult,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing budget alert:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || String(error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
