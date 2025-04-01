
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportRequest {
  userId: string;
  reportType: string;
  email: string;
  frequency: "weekly" | "monthly" | "quarterly" | "half-yearly" | "yearly";
  forceSend?: boolean; // For manual report generation
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    let reportData: ReportRequest;
    
    // Check if this is a scheduled cron job or manual request
    if (req.method === "GET") {
      // Scheduled report - extract frequency from query params
      const url = new URL(req.url);
      const frequency = url.searchParams.get("frequency") as "weekly" | "monthly" | "quarterly" | "half-yearly" | "yearly";
      
      if (!frequency) {
        return new Response(
          JSON.stringify({ error: "Frequency parameter is required" }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // Get all users who have selected this report frequency
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, report_frequency')
        .eq('report_frequency', frequency);
        
      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        throw new Error("Failed to fetch profiles");
      }
      
      // No profiles with this frequency, return early
      if (!profiles || profiles.length === 0) {
        return new Response(
          JSON.stringify({ message: `No users with ${frequency} report frequency found` }),
          { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // Process each user with this frequency preference
      const results = [];
      for (const profile of profiles) {
        // Get user's email
        const { data: userData, error: userError } = await supabase
          .auth.admin.getUserById(profile.id);
          
        if (userError || !userData.user) {
          console.error("Error fetching user:", userError);
          continue;
        }
        
        // Generate and send report
        try {
          const reportResult = await generateAndSendReport({
            userId: profile.id,
            email: userData.user.email || "",
            frequency,
            reportType: "financial-summary"
          }, supabase);
          
          results.push({
            userId: profile.id,
            email: userData.user.email,
            status: "sent"
          });
        } catch (error) {
          console.error(`Error sending report to ${userData.user.email}:`, error);
          results.push({
            userId: profile.id,
            email: userData.user.email,
            status: "failed",
            error: error.message
          });
        }
      }
      
      return new Response(
        JSON.stringify({ message: `Processed ${results.length} ${frequency} reports`, results }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } else {
      // Manual request
      reportData = await req.json();
      
      if (!reportData.userId || !reportData.email) {
        return new Response(
          JSON.stringify({ error: "userId and email are required" }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // Generate and send individual report
      const result = await generateAndSendReport(reportData, supabase);
      
      return new Response(
        JSON.stringify({ message: "Report sent successfully", result }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  } catch (error) {
    console.error("Error in financial-report function:", error);
    
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

async function generateAndSendReport(
  reportData: ReportRequest, 
  supabase: any
): Promise<any> {
  const { userId, email, frequency, reportType } = reportData;
  
  // Get user's financial data
  let transactionsQuery = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
    
  // Filter based on report frequency
  const now = new Date();
  let startDate: Date;
  
  switch (frequency) {
    case "weekly":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case "monthly":
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      break;
    case "quarterly":
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
      break;
    case "half-yearly":
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 6);
      break;
    case "yearly":
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1); // Default to monthly
  }
  
  // Convert to ISO string for Supabase query
  const startDateStr = startDate.toISOString();
  transactionsQuery = transactionsQuery.gte('date', startDateStr);
  
  const { data: transactions, error: transactionsError } = await transactionsQuery;
  
  if (transactionsError) {
    console.error("Error fetching transactions:", transactionsError);
    throw new Error("Failed to fetch transactions data");
  }
  
  // Get accounts data
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId);
    
  if (accountsError) {
    console.error("Error fetching accounts:", accountsError);
    throw new Error("Failed to fetch accounts data");
  }
  
  // Get budgets data
  const { data: budgets, error: budgetsError } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId);
    
  if (budgetsError) {
    console.error("Error fetching budgets:", budgetsError);
    throw new Error("Failed to fetch budgets data");
  }
  
  // Generate report using Gemini
  const reportContent = await generateReportContent({
    transactions: transactions || [],
    accounts: accounts || [],
    budgets: budgets || [],
    frequency,
    startDate: startDateStr,
    endDate: now.toISOString()
  });
  
  // Format report period for subject line
  let periodText;
  switch (frequency) {
    case "weekly":
      periodText = "Weekly";
      break;
    case "monthly":
      periodText = "Monthly";
      break;
    case "quarterly":
      periodText = "Quarterly";
      break;
    case "half-yearly":
      periodText = "Half-Yearly";
      break;
    case "yearly":
      periodText = "Annual";
      break;
    default:
      periodText = "Financial";
  }
  
  // Send email with report
  const emailData = {
    to: email,
    subject: `Your ${periodText} Financial Report`,
    html: formatEmailHtml(reportContent, frequency),
    user_id: userId,
    email_type: `${frequency}-financial-report`
  };
  
  // Call send-email edge function
  const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify(emailData)
  });
  
  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    throw new Error(`Failed to send email: ${errorText}`);
  }
  
  // Log report send in report_history table
  const { error: historyError } = await supabase
    .from('report_history')
    .insert({
      user_id: userId,
      frequency,
      report_type: reportType,
      email_sent_to: email
    });
    
  if (historyError) {
    console.error("Error logging report history:", historyError);
    // Don't throw here, just log the error
  }
  
  return await emailResponse.json();
}

async function generateReportContent(data: any): Promise<string> {
  if (!GEMINI_API_KEY) {
    // Fallback to template if no Gemini API key
    return generateTemplateReport(data);
  }
  
  try {
    // Calculate some financial metrics
    const totalIncome = data.transactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const totalExpenses = data.transactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const totalBalance = data.accounts
      .reduce((sum, acc) => sum + acc.balance, 0);
      
    // Group expenses by category
    const expensesByCategory = {};
    data.transactions
      .filter(tx => tx.type === 'expense')
      .forEach(tx => {
        if (!expensesByCategory[tx.category]) {
          expensesByCategory[tx.category] = 0;
        }
        expensesByCategory[tx.category] += tx.amount;
      });
      
    // Format budget progress  
    const budgetProgress = data.budgets.map(budget => {
      const percentage = (budget.spent / budget.total) * 100;
      return {
        category: budget.category,
        spent: budget.spent,
        total: budget.total,
        percentage: Math.round(percentage)
      };
    });
    
    // Create system prompt for Gemini
    const systemPrompt = `
    You are a professional financial analyst creating a ${data.frequency} financial report for a user.
    Use the following financial data to create a concise, informative report:
    
    Period: ${new Date(data.startDate).toLocaleDateString()} to ${new Date(data.endDate).toLocaleDateString()}
    
    ACCOUNTS:
    ${data.accounts.map(acc => `- ${acc.name} (${acc.type}): ₹${acc.balance}`).join('\n')}
    
    SUMMARY METRICS:
    - Total Income: ₹${totalIncome}
    - Total Expenses: ₹${totalExpenses}
    - Net Cash Flow: ₹${totalIncome - totalExpenses}
    - Current Total Balance: ₹${totalBalance}
    
    EXPENSES BY CATEGORY:
    ${Object.entries(expensesByCategory).map(([category, amount]) => 
      `- ${category}: ₹${amount} (${Math.round((Number(amount) / totalExpenses) * 100)}% of total)`
    ).join('\n')}
    
    BUDGET PROGRESS:
    ${budgetProgress.map(b => 
      `- ${b.category}: ₹${b.spent} spent of ₹${b.total} budget (${b.percentage}%)`
    ).join('\n')}
    
    IMPORTANT FORMATTING GUIDELINES:
    1. Start with a friendly greeting and introduction.
    2. Use simple, clear language - avoid technical jargon.
    3. DO NOT use markdown formatting.
    4. Format the report into clear sections with headings.
    5. Include a "Key Takeaways" section with 3-4 actionable insights.
    6. End with a positive, encouraging note about financial progress.
    7. Keep the overall tone friendly but professional.
    8. Don't use asterisks or other markdown symbols.
    9. Use • for bullet points instead of dashes or asterisks.
    10. Maximum length should be 800 words.
    `;
    
    // Call Gemini API
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: systemPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Clean any markdown formatting
    if (result.candidates && result.candidates[0]?.content?.parts) {
      let reportContent = result.candidates[0].content.parts[0].text;
      
      // Clean formatting
      reportContent = reportContent.replace(/\*\*/g, ""); // Remove bold
      reportContent = reportContent.replace(/\*/g, "");   // Remove italic
      reportContent = reportContent.replace(/^#+\s+/gm, ""); // Remove markdown headings
      reportContent = reportContent.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); // Remove links
      reportContent = reportContent.replace(/```[a-z]*\n[\s\S]*?\n```/g, ""); // Remove code blocks
      reportContent = reportContent.replace(/`([^`]+)`/g, "$1"); // Remove inline code
      reportContent = reportContent.replace(/^\s*[-*+]\s+/gm, "• "); // Convert bullet points
      
      return reportContent;
    }
    
    throw new Error("Failed to generate report with Gemini");
  } catch (error) {
    console.error("Error generating report with Gemini:", error);
    return generateTemplateReport(data);
  }
}

function generateTemplateReport(data: any): string {
  // Calculate financial metrics for the fallback template
  const totalIncome = data.transactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const totalExpenses = data.transactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const totalBalance = data.accounts
    .reduce((sum, acc) => sum + acc.balance, 0);
  
  // Format date range
  const startDate = new Date(data.startDate).toLocaleDateString();
  const endDate = new Date(data.endDate).toLocaleDateString();
  
  return `
    Financial Summary Report
    Period: ${startDate} to ${endDate}
    
    Hello,
    
    Here's your ${data.frequency} financial report summary:
    
    Account Summary:
    • Total account balance: ₹${totalBalance}
    • Number of accounts: ${data.accounts.length}
    
    Transaction Summary:
    • Total income: ₹${totalIncome}
    • Total expenses: ₹${totalExpenses}
    • Net cash flow: ₹${totalIncome - totalExpenses}
    
    Budget Status:
    ${data.budgets.map(budget => {
      const percentage = Math.round((budget.spent / budget.total) * 100);
      return `• ${budget.category}: ₹${budget.spent} spent of ₹${budget.total} (${percentage}% of budget)`;
    }).join('\n')}
    
    Key Takeaways:
    • Your overall cash flow is ${totalIncome > totalExpenses ? 'positive' : 'negative'} for this period.
    • ${data.budgets.filter(b => b.spent > b.total).length > 0 
        ? `You've exceeded budget in ${data.budgets.filter(b => b.spent > b.total).length} categories.` 
        : 'You are staying within budget in all categories.'}
    • ${totalIncome > totalExpenses 
        ? 'Consider putting some savings aside for future goals.' 
        : 'Consider reviewing expenses to improve your cash flow.'}
    
    We hope this summary helps you track your financial progress. Log in to your dashboard for more detailed insights.
    
    Regards,
    Your Finance Dashboard Team
  `;
}

function formatEmailHtml(reportContent: string, frequency: string): string {
  // Split content into sections
  const sections = reportContent.split('\n\n').filter(Boolean);
  
  // Create HTML sections with proper formatting
  const htmlSections = sections.map(section => {
    // Convert bullet points
    const formattedSection = section.replace(/•\s(.*)/g, '<li>$1</li>');
    
    // Check if this section has bullet points
    if (formattedSection.includes('<li>')) {
      return `<p>${formattedSection.split('<li>')[0]}</p><ul>${formattedSection.split('<li>').slice(1).map(item => `<li>${item}`).join('')}</ul>`;
    }
    
    // Check if this is a heading (no colon, short text)
    if (section.length < 50 && !section.includes(':')) {
      return `<h2 style="color: #333; margin-top: 20px; margin-bottom: 10px;">${section}</h2>`;
    }
    
    return `<p>${section}</p>`;
  });
  
  // Build the full HTML email
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Financial Report</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #6366f1; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
        h1 { margin: 0; font-size: 24px; }
        h2 { color: #4f46e5; margin-top: 20px; margin-bottom: 10px; font-size: 18px; }
        p { margin-bottom: 16px; }
        ul { margin-bottom: 16px; }
        li { margin-bottom: 8px; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Your ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Financial Report</h1>
      </div>
      <div class="content">
        ${htmlSections.join('\n')}
        
        <div class="footer">
          <p>This is an automated report from your Finance Dashboard. <br>
          Login to your account for more detailed financial insights.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
