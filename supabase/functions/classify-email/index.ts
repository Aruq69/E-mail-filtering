import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, sender, content, userId } = await req.json();

    if (!subject || !sender || !content || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: subject, sender, content, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Use OpenAI to classify the email based on your ML approach
    const classificationPrompt = `
    Analyze this email for spam classification:
    
    Subject: ${subject}
    Sender: ${sender}
    Content: ${content}
    
    Based on common spam indicators like:
    - Suspicious sender patterns
    - Subject line characteristics (excessive caps, urgent language, offers)
    - Content analysis (phishing attempts, malicious links, suspicious attachments)
    - Grammar and spelling patterns
    - Promotional/marketing language
    
    Classify this email and respond with a JSON object containing:
    {
      "classification": "spam" or "legitimate",
      "threat_level": "high", "medium", or "low",
      "confidence": decimal between 0 and 1,
      "keywords": array of suspicious keywords found,
      "reasoning": brief explanation of classification
    }
    
    For threat_level:
    - high: Clear spam/phishing with malicious intent
    - medium: Suspicious characteristics but not clearly malicious
    - low: Likely legitimate with minimal risk
    `;

    console.log('Sending classification request to OpenAI...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert email security analyst. Respond only with valid JSON.' 
          },
          { role: 'user', content: classificationPrompt }
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const aiResult = aiData.choices[0].message.content;
    
    console.log('OpenAI response:', aiResult);

    let classification;
    try {
      classification = JSON.parse(aiResult);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResult);
      // Fallback classification
      classification = {
        classification: "legitimate",
        threat_level: "low",
        confidence: 0.5,
        keywords: [],
        reasoning: "Failed to parse AI response"
      };
    }

    // Store the email analysis in the database
    const { data: emailData, error: emailError } = await supabase
      .from('emails')
      .insert({
        user_id: userId,
        subject,
        sender,
        content,
        classification: classification.classification,
        threat_level: classification.threat_level,
        confidence: classification.confidence,
        keywords: classification.keywords,
        received_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (emailError) {
      console.error('Database error:', emailError);
      throw new Error(`Database error: ${emailError.message}`);
    }

    console.log('Email classified and stored:', emailData);

    return new Response(
      JSON.stringify({
        success: true,
        email: emailData,
        analysis: {
          classification: classification.classification,
          threat_level: classification.threat_level,
          confidence: classification.confidence,
          keywords: classification.keywords,
          reasoning: classification.reasoning
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in classify-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});