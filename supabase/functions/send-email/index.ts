
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  user_id: string;
  email_type: string;
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
    const body: EmailRequest = await req.json();
    const { to, subject, html, user_id, email_type } = body;

    if (!to || !subject || !html || !user_id) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          received: { to, subject, html, user_id },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log(`Sending email to ${to} with subject: ${subject}`);

    const sendgridKey = Deno.env.get("SENDGRID_API_KEY");
    if (!sendgridKey) {
      throw new Error("SENDGRID_API_KEY is not set");
    }

    // Use SendGrid API to send email
    const sendgridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sendgridKey}`,
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
            subject: subject,
          },
        ],
        from: { email: "notifications@financedashboard.com", name: "Finance Dashboard" },
        content: [
          {
            type: "text/html",
            value: html,
          },
        ],
      }),
    });

    if (!sendgridResponse.ok) {
      const errorText = await sendgridResponse.text();
      console.error("SendGrid API error:", errorText);
      throw new Error(`SendGrid API error: ${sendgridResponse.status} ${errorText}`);
    }

    console.log("Email sent successfully via SendGrid");

    // Store this email log in the database
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Log the email in the database
    try {
      const { data: logData, error: logError } = await supabase
        .from("email_logs")
        .insert([
          {
            user_id: user_id,
            email_to: to,
            subject: subject,
            content: html,
            email_type: email_type,
          },
        ]);

      if (logError) {
        console.error("Error logging email:", logError);
      } else {
        console.log("Email logged to database:", logData);
      }
    } catch (logError) {
      console.error("Error with email logging:", logError);
    }

    return new Response(
      JSON.stringify({
        message: "Email sent successfully",
        sentTo: to,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    
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
