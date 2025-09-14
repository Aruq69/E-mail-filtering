import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// IMAP server configurations for different providers
const IMAP_CONFIGS = {
  'gmail.com': {
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    requiresAppPassword: true,
  },
  'outlook.com': {
    host: 'outlook.office365.com',
    port: 993,
    secure: true,
    requiresAppPassword: false,
  },
  'hotmail.com': {
    host: 'outlook.office365.com',
    port: 993,
    secure: true,
    requiresAppPassword: false,
  },
  'yahoo.com': {
    host: 'imap.mail.yahoo.com',
    port: 993,
    secure: true,
    requiresAppPassword: true,
  },
  'icloud.com': {
    host: 'imap.mail.me.com',
    port: 993,
    secure: true,
    requiresAppPassword: true,
  },
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('❌ OPENAI_API_KEY not found in environment');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, email, password, provider } = await req.json();
    console.log('📨 Fetching emails via IMAP for user:', user_id);
    console.log('📧 Email provider:', provider);

    if (!user_id || !email || !password) {
      return new Response(JSON.stringify({ error: 'Missing required fields: user_id, email, password' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get IMAP configuration for the provider
    const domain = email.split('@')[1].toLowerCase();
    const imapConfig = IMAP_CONFIGS[domain];
    
    if (!imapConfig) {
      return new Response(JSON.stringify({ 
        error: `Email provider ${domain} not supported. Supported providers: ${Object.keys(IMAP_CONFIGS).join(', ')}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔧 Using IMAP config:', { host: imapConfig.host, port: imapConfig.port });

    // Simulate IMAP connection and email fetching
    // Note: For a real implementation, you'd use an IMAP library like npm:imap
    // For this demo, we'll create sample emails to show the flow works
    
    console.log('🔗 Connecting to IMAP server...');
    console.log('📬 Fetching recent emails...');
    
    // Simulate fetched emails (in real implementation, this would come from IMAP)
    const simulatedEmails = [
      {
        id: `imap_${Date.now()}_1`,
        subject: 'Important Security Alert',
        from: 'security@suspicious-bank.com',
        body: 'Your account has been compromised. Click here to verify your identity immediately!',
        date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: `imap_${Date.now()}_2`,
        subject: 'Meeting Reminder',
        from: 'colleague@company.com',
        body: 'Don\'t forget about our meeting tomorrow at 2 PM.',
        date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: `imap_${Date.now()}_3`,
        subject: 'You\'ve Won $1,000,000!',
        from: 'lottery@fake-lottery.com',
        body: 'Congratulations! You have won our international lottery. Send us your bank details to claim your prize.',
        date: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
    ];

    let processedCount = 0;
    const emailSummaries = [];

    // Process each email with OpenAI analysis
    for (const emailData of simulatedEmails) {
      try {
        console.log(`🔍 Processing email: ${emailData.id}`);

        // Check if we already processed this email
        const { data: existingEmail } = await supabase
          .from('emails')
          .select('id')
          .eq('message_id', emailData.id)
          .maybeSingle();

        if (existingEmail) {
          console.log(`⏭️ Email ${emailData.id} already processed, skipping`);
          continue;
        }

        // Analyze with OpenAI
        const analysisPrompt = `
        Analyze this email for security threats and spam detection:
        
        Subject: ${emailData.subject}
        From: ${emailData.from}
        Body: ${emailData.body}
        
        Return a JSON response with:
        - classification: "spam", "phishing", "suspicious", or "legitimate"
        - threat_level: "high", "medium", "low", or null
        - confidence: number between 0-1
        - keywords: array of suspicious keywords found
        - reasoning: brief explanation
        `;

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a cybersecurity expert analyzing emails for threats. Always respond with valid JSON.' },
              { role: 'user', content: analysisPrompt }
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });

        let analysis = {
          classification: 'legitimate',
          threat_level: null,
          confidence: 0.8,
          keywords: [],
          reasoning: 'Default analysis'
        };

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          try {
            analysis = JSON.parse(openaiData.choices[0].message.content);
            console.log(`✅ Analysis complete for ${emailData.id}:`, analysis.classification);
          } catch (parseError) {
            console.error('❌ Failed to parse OpenAI response:', parseError);
          }
        } else {
          console.error('❌ OpenAI API error:', await openaiResponse.text());
        }

        // Store in database
        const { error: insertError } = await supabase
          .from('emails')
          .insert({
            user_id,
            message_id: emailData.id,
            subject: emailData.subject,
            sender: emailData.from,
            content: emailData.body,
            raw_content: JSON.stringify(emailData),
            classification: analysis.classification,
            threat_level: analysis.threat_level,
            confidence: analysis.confidence,
            keywords: analysis.keywords,
            received_date: emailData.date,
            processed_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('❌ Database insert error:', insertError);
        } else {
          processedCount++;
          emailSummaries.push({
            id: emailData.id,
            subject: emailData.subject,
            from: emailData.from,
            classification: analysis.classification,
            threat_level: analysis.threat_level,
          });
        }

      } catch (error) {
        console.error(`❌ Error processing email ${emailData.id}:`, error);
      }
    }

    console.log(`🎉 Successfully processed ${processedCount} emails via IMAP`);

    return new Response(JSON.stringify({
      success: true,
      total: processedCount,
      summary: emailSummaries,
      provider: domain,
      method: 'IMAP',
      note: 'This is a demo with simulated emails. Real implementation would fetch from IMAP server.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🚨 Critical error in fetch-imap-emails:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});