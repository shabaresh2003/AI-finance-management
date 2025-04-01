
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReceiptData {
  text: string;
  imageBase64?: string;
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
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("Missing OpenAI API key");
    }

    // Get the receipt text or image from the request
    const { text, imageBase64 }: ReceiptData = await req.json();
    
    if (!text && !imageBase64) {
      return new Response(
        JSON.stringify({ error: "Either text or image must be provided" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    
    let apiPayload;
    
    if (imageBase64) {
      console.log("Processing receipt image with GPT-4o");
      // Process image with GPT-4o model (with vision capabilities)
      apiPayload = {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert receipt analyzer. Extract the following information from the receipt image with high precision: store name, date (in YYYY-MM-DD format), total amount (just the number), and items purchased with their individual prices. Format the response as a JSON object with these fields. Be as accurate as possible with the amounts and dates. Only return valid JSON that can be parsed."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this receipt image and extract the details in JSON format with fields: storeName, date, totalAmount, items (array of {name, price})"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1, // Lower temperature for more consistent results
      };
    } else {
      console.log("Processing receipt text with GPT-4o-mini");
      // Process text with GPT model
      apiPayload = {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert receipt analyzer. Extract the following information from the receipt text with high precision: store name, date (in YYYY-MM-DD format), total amount (just the number), and items purchased with their individual prices. Format the response as a JSON object with these fields. Be as accurate as possible with the amounts and dates. Only return valid JSON that can be parsed."
          },
          {
            role: "user",
            content: `Extract the details from this receipt text in JSON format with fields: storeName, date, totalAmount, items (array of {name, price}):\n\n${text}`
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1, // Lower temperature for more consistent results
      };
    }

    console.log("Sending request to OpenAI with data:", imageBase64 ? "Image provided" : text);
    
    // Call OpenAI API to analyze the receipt
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify(apiPayload),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status} ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    console.log("OpenAI response received");

    try {
      // Parse the response from OpenAI, which should be JSON
      const extractedData = JSON.parse(openaiData.choices[0].message.content);
      
      // Validate the extracted data
      if (!extractedData.storeName) extractedData.storeName = "Unknown Store";
      if (!extractedData.date) {
        extractedData.date = new Date().toISOString().split('T')[0]; // Default to today
      }
      if (!extractedData.totalAmount) {
        // Try to calculate from items if available
        if (extractedData.items && extractedData.items.length > 0) {
          extractedData.totalAmount = extractedData.items.reduce(
            (sum: number, item: { price: number }) => sum + (parseFloat(item.price) || 0), 
            0
          );
        } else {
          extractedData.totalAmount = 0;
        }
      }
      
      // Ensure items is an array
      if (!extractedData.items || !Array.isArray(extractedData.items)) {
        extractedData.items = [];
      }
      
      // Log the extracted data and return it
      console.log("Extracted data:", extractedData);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: extractedData,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      
      // If parsing fails, attempt to extract basic info with regex
      try {
        const content = openaiData.choices[0].message.content;
        console.log("Raw content from OpenAI:", content);
        
        // Create a basic fallback extraction with regex
        const storeName = content.match(/store(.*?)name[\"'\s:]+(.*?)[\"\',\n]/i)?.[2]?.trim() || "Unknown Store";
        const dateMatch = content.match(/date[\"'\s:]+([\d\-\/\.]+)/i);
        const date = dateMatch ? dateMatch[1].trim() : new Date().toISOString().split('T')[0];
        
        const amountMatch = content.match(/total.*?amount[\"'\s:]+([\d\.]+)/i) || 
                           content.match(/amount[\"'\s:]+([\d\.]+)/i) ||
                           content.match(/total[\"'\s:]+([\d\.]+)/i);
        const totalAmount = amountMatch ? parseFloat(amountMatch[1]) : 0;
        
        const fallbackData = {
          storeName,
          date,
          totalAmount,
          items: []
        };
        
        console.log("Fallback extraction:", fallbackData);
        
        return new Response(
          JSON.stringify({
            success: true,
            data: fallbackData,
            note: "Used fallback extraction due to parsing issues"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      } catch (fallbackError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to parse receipt data",
            rawResponse: openaiData.choices[0].message.content
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }
  } catch (error) {
    console.error("Error in receipt-scanner function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || String(error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
