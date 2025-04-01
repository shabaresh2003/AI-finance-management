import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Function to clean markdown formatting from text
function cleanMarkdownFormatting(text: string): string {
  if (!text) return text;
  
  // Remove bold/italic markers
  let cleaned = text.replace(/\*\*/g, "");
  cleaned = cleaned.replace(/\*/g, "");
  
  // Remove markdown headings (# Heading)
  cleaned = cleaned.replace(/^#+\s+/gm, "");
  
  // Remove markdown links and keep only the text [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  
  // Remove code blocks
  cleaned = cleaned.replace(/```[a-z]*\n[\s\S]*?\n```/g, "");
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
  
  // Remove bullet points
  cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, "• ");
  
  // Replace multiple newlines with a maximum of two
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  
  return cleaned;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, userId } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Received query:", query);
    console.log("User ID:", userId);

    // Initialize the Supabase client with the service role key to bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch user's financial data if userId is provided
    let userFinancialContext = "";
    if (userId) {
      // Fetch transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(50);

      if (transactionsError) {
        console.error("Error fetching transactions:", transactionsError);
      }

      // Fetch accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId);

      if (accountsError) {
        console.error("Error fetching accounts:", accountsError);
      }

      // Fetch budgets
      const { data: budgets, error: budgetsError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId);

      if (budgetsError) {
        console.error("Error fetching budgets:", budgetsError);
      }

      // Format the financial data as a string
      if (transactions?.length || accounts?.length || budgets?.length) {
        userFinancialContext = `
Here is this user's financial data:

${accounts?.length ? `\nACCOUNTS:
${accounts.map(account => `- ${account.name} (${account.type}): ₹${account.balance}`).join('\n')}` : ''}

${transactions?.length ? `\nRECENT TRANSACTIONS:
${transactions.map(tx => `- ${tx.date.substring(0, 10)}: ${tx.name} - ${tx.type === 'expense' ? '-' : '+'}₹${tx.amount} (${tx.category})`).join('\n')}` : ''}

${budgets?.length ? `\nBUDGETS:
${budgets.map(budget => `- ${budget.category}: ₹${budget.spent} spent of ₹${budget.total} (${Math.round((budget.spent / budget.total) * 100)}% used)`).join('\n')}` : ''}

Based on the above financial information, please provide personalized advice.
`;
      }
    }

    // Create system prompt for financial advice context
    const systemPrompt = `You are a professional financial advisor. 
    Your goal is to provide accurate, personalized financial advice based on the user's query and financial data.
    Focus on actionable insights and practical recommendations related to:
    - Budgeting strategies
    - Investment planning
    - Debt management
    - Saving techniques
    - Retirement planning
    - Tax optimization
    - Financial goal setting
    
    IMPORTANT: Do not use any markdown formatting in your response - no asterisks, no bullet points with dashes, no hashtags for headings.
    Format lists with bullet points using the "•" symbol instead of dashes or asterisks.
    Use clear paragraph breaks instead of markdown formatting.
    
    Keep your responses informative, concise, and tailored to the specific financial topic.
    ${userFinancialContext}`;

    // Prepare the request to the Gemini API
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY || "",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: systemPrompt },
              { text: query }
            ]
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
      const errorData = await response.text();
      console.error("Gemini API error:", errorData);
      throw new Error(`Gemini API returned ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    
    // Extract the response text from the Gemini API response
    let advisorResponse = "";
    if (data.candidates && data.candidates[0]?.content?.parts) {
      // Clean any markdown formatting from the response
      advisorResponse = cleanMarkdownFormatting(data.candidates[0].content.parts[0].text);
    } else {
      console.error("Unexpected Gemini API response format:", data);
      advisorResponse = "I apologize, but I'm unable to provide financial advice at the moment. Please try again later.";
    }

    console.log("Generated personalized financial advice successfully");

    return new Response(
      JSON.stringify({ response: advisorResponse }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in financial-advice function:", error);
    
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
