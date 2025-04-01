
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  email: string;
  category: string;
  percentage_used: number;
  user_id: string;
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
    const body: RequestBody = await req.json();
    const { email, category, percentage_used, user_id } = body;

    if (!email || !category || percentage_used === undefined || !user_id) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          received: { email, category, percentage_used, user_id },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log(`Sending budget alert email to ${email} for ${category} - ${percentage_used}% used`);

    // Different messages for different threshold levels
    let alertTitle = "Budget Alert";
    let alertMessage = `Your ${category} budget has reached ${percentage_used.toFixed(0)}% of the limit.`;
    
    if (percentage_used >= 100) {
      alertTitle = "Budget Exceeded";
      alertMessage = `Your ${category} budget has been exceeded. You've spent ${percentage_used.toFixed(0)}% of your allocated limit.`;
    } else if (percentage_used >= 90) {
      alertTitle = "Budget Nearly Exceeded";
      alertMessage = `Your ${category} budget is nearly depleted at ${percentage_used.toFixed(0)}% of the limit.`;
    }

    // Prepare email content
    const emailHTML = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: ${percentage_used >= 100 ? '#f8d7da' : '#d4edda'}; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
            <h1 style="color: ${percentage_used >= 100 ? '#721c24' : '#155724'}; margin-top: 0;">${alertTitle}</h1>
            <p style="font-size: 16px;">${alertMessage}</p>
          </div>
          <p>Hello,</p>
          <p>This is a friendly reminder to check your spending on ${category}.</p>
          <p>You have spent ${percentage_used.toFixed(0)}% of your budget for this category.</p>
          ${percentage_used >= 100 ? 
            '<p style="color: #721c24; font-weight: bold;">You have exceeded your budget limit. Consider reviewing your spending or adjusting your budget.</p>' : 
            ''
          }
          <div style="margin: 30px 0; text-align: center;">
            <a href="https://finance-dashboard.com/budgets" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">View your budget</a>
          </div>
          <p>Thank you,<br>Finance Dashboard Team</p>
        </body>
      </html>
    `;

    // Call our email sending function
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call the send-email function
    const emailResponse = await fetch(
      `${supabaseUrl}/functions/v1/send-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          to: email,
          subject: `${alertTitle}: ${category} Budget at ${percentage_used.toFixed(0)}%`,
          html: emailHTML,
          user_id: user_id,
          email_type: "budget_alert"
        }),
      }
    );
    
    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error(`Error from send-email: ${emailResponse.status} ${errorText}`);
      throw new Error(`Failed to send email: ${emailResponse.status} ${errorText}`);
    }
    
    const emailResult = await emailResponse.json();
    console.log("Email sending result:", emailResult);

    // Log the sent email
    try {
      const { data: logData, error: logError } = await supabase
        .from("email_logs")
        .insert([
          {
            user_id: user_id,
            email_to: email,
            subject: `${alertTitle}: ${category} Budget at ${percentage_used.toFixed(0)}%`,
            content: emailHTML,
            email_type: "budget_alert"
          }
        ]);

      if (logError) {
        console.error("Error logging email:", logError);
      } else {
        console.log("Email logged to database:", logData);
      }
    } catch (error) {
      console.error("Error with email logging:", error);
    }

    return new Response(
      JSON.stringify({
        message: "Budget alert email sent successfully",
        sentTo: email,
        category: category,
        percentage: percentage_used,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error sending budget alert email:", error);
    
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
