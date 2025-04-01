
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: "signup" | "reset";
  email: string;
  password?: string;
  redirect_url?: string;
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

    const { type, email, password, redirect_url }: EmailRequest = await req.json();

    if (!type || !email) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          received: { type, email },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    let result;

    if (type === "signup") {
      // Create user and automatically confirm them
      if (!password) {
        return new Response(
          JSON.stringify({
            error: "Password is required for signup",
            received: { type, email },
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm to bypass email verification
      });

      if (createError) throw createError;
      
      result = userData;
      
      // Log successful user creation
      console.log("User created successfully:", email);

      // Try to send welcome email, but don't fail if it doesn't work
      try {
        const welcomeHTML = `
          <html>
            <body>
              <h1>Welcome to Finance Dashboard!</h1>
              <p>Hello,</p>
              <p>Your account has been created and confirmed. You can now log in.</p>
              <p>Thank you for joining us,<br>Finance Dashboard Team</p>
            </body>
          </html>
        `;
        
        // Send welcome email via our email function
        await fetch(
          `${supabaseUrl}/functions/v1/send-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              to: email,
              subject: "Welcome to Finance Dashboard",
              html: welcomeHTML,
              user_id: userData.user.id,
              email_type: "welcome"
            }),
          }
        ).catch(e => console.error("Welcome email error but continuing:", e));
      } catch (emailErr) {
        console.log("Error sending welcome email but continuing:", emailErr);
      }
    } else if (type === "reset") {
      // Generate a password reset link
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: redirect_url || `${supabaseUrl}/reset-password`,
        },
      });

      if (error) throw error;
      
      result = data;
      
      // Try to send the reset email, but don't fail if it doesn't work
      try {
        const resetURL = data.properties.action_link;
        const resetHTML = `
          <html>
            <body>
              <h1>Reset Your Password</h1>
              <p>Hello,</p>
              <p>You requested to reset your password for your Finance Dashboard account.</p>
              <p>Please click the link below to reset your password:</p>
              <p><a href="${resetURL}">Reset Password</a></p>
              <p>If you didn't request this, you can safely ignore this email.</p>
              <p>Thank you,<br>Finance Dashboard Team</p>
            </body>
          </html>
        `;
        
        // Get user id for the email
        const { data: userData, error: userError } = await supabase.auth.admin.listUsers({
          filters: {
            email: email
          }
        });
        
        if (userError) throw userError;
        
        const userId = userData.users.length > 0 ? userData.users[0].id : "system";
        
        // Send reset email via our email function
        await fetch(
          `${supabaseUrl}/functions/v1/send-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              to: email,
              subject: "Reset Your Finance Dashboard Password",
              html: resetHTML,
              user_id: userId,
              email_type: "password_reset"
            }),
          }
        ).catch(e => console.error("Password reset email error but continuing:", e));
      } catch (emailErr) {
        console.log("Error sending reset email but continuing:", emailErr);
      }
    }

    return new Response(
      JSON.stringify({
        message: `${type === "signup" ? "Signup" : "Password reset"} processed successfully`,
        sentTo: email,
        result,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error(`Error in auth-emails function:`, error);
    
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
