
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const body = await req.json();
    const isWeeklySummary = body.isWeeklySummary || false;
    
    console.log(`Processing ${isWeeklySummary ? "weekly summary" : "daily alert"} cron job`);

    if (isWeeklySummary) {
      const { user_id, email, summary } = body;
      
      if (!user_id || !email || !summary) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields for weekly summary",
            received: { user_id, email, summary: !!summary },
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      // Generate weekly summary email
      const summaryHTML = `
        <html>
          <body>
            <h1>Weekly Budget Summary</h1>
            <p>Hello,</p>
            <p>Here's your weekly budget summary:</p>
            <table border="1" cellpadding="5" style="border-collapse: collapse;">
              <tr>
                <th>Category</th>
                <th>Budget</th>
                <th>Spent</th>
                <th>Percentage</th>
              </tr>
              ${summary.map((item: any) => `
                <tr>
                  <td>${item.category.charAt(0).toUpperCase() + item.category.slice(1)}</td>
                  <td>₹${item.total.toLocaleString('en-IN')}</td>
                  <td>₹${item.spent.toLocaleString('en-IN')}</td>
                  <td style="color: ${item.percentage > 90 ? 'red' : item.percentage > 75 ? 'orange' : 'green'}">
                    ${item.percentage}%
                  </td>
                </tr>
              `).join('')}
            </table>
            <p>Stay on top of your finances!</p>
            <p>Thank you,<br>Finance Dashboard Team</p>
          </body>
        </html>
      `;

      // Log the email that would be sent
      console.log("------ WEEKLY SUMMARY EMAIL ------");
      console.log(`To: ${email}`);
      console.log(`Subject: Your Weekly Budget Summary`);
      console.log(`Body: ${summaryHTML}`);
      console.log("-----------------------------------");

      // Store this email log in the database
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      const supabase = createClient(supabaseUrl, supabaseKey);

      try {
        const { data: logData, error: logError } = await supabase
          .from("email_logs")
          .insert([
            {
              user_id: user_id,
              email_to: email,
              subject: "Your Weekly Budget Summary",
              email_type: "weekly_summary",
              content: summaryHTML,
            },
          ]);

        if (logError) {
          console.error("Error logging weekly summary email:", logError);
        } else {
          console.log("Weekly summary email logged to database:", logData);
        }
      } catch (logError) {
        console.error("Error with email logging:", logError);
      }
      
    } else {
      // Individual budget alerts are now handled by the budget-notifications function
      console.log("Individual budget alert - forwarding to budget-notifications");
    }

    return new Response(
      JSON.stringify({
        message: `${isWeeklySummary ? "Weekly summary" : "Budget alert"} processed successfully`,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in budget cron job:", error);
    
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
