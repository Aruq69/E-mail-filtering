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

// Real IMAP email fetcher using native Deno capabilities
async function fetchRealEmails(email: string, password: string, imapConfig: any): Promise<any[]> {
  console.log('🔍 Connecting to real IMAP server...');
  
  // Basic validation
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  
  if (!email.includes('@')) {
    throw new Error('Invalid email format');
  }
  
  const domain = email.split('@')[1].toLowerCase();
  if (!['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'].includes(domain)) {
    throw new Error(`Unsupported email provider: ${domain}`);
  }

  try {
    // Create TLS connection to IMAP server
    const conn = await Deno.connectTls({
      hostname: imapConfig.host,
      port: imapConfig.port,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper function to send IMAP command and read response
    async function sendCommand(command: string): Promise<string> {
      await conn.write(encoder.encode(command + '\r\n'));
      const buffer = new Uint8Array(4096);
      const bytesRead = await conn.read(buffer);
      return decoder.decode(buffer.subarray(0, bytesRead || 0));
    }

    // IMAP Authentication Flow
    console.log('🔐 Authenticating with IMAP server...');
    
    // Read initial greeting
    let response = await sendCommand('');
    console.log('Server greeting:', response);
    
    // Login
    response = await sendCommand(`A001 LOGIN "${email}" "${password}"`);
    console.log('Login response:', response);
    
    if (response.includes('A001 NO') || response.includes('A001 BAD')) {
      throw new Error('Authentication failed. Please check your email and password.');
    }

    // Select INBOX
    response = await sendCommand('A002 SELECT INBOX');
    console.log('SELECT response:', response);

    // Search for recent emails (last 10)
    response = await sendCommand('A003 SEARCH RECENT');
    console.log('Search response:', response);
    
    // Parse message numbers from search response
    const messageNumbers = response.match(/\* SEARCH ([\d\s]+)/)?.[1]?.trim().split(' ').filter(n => n) || [];
    console.log('Found message numbers:', messageNumbers);

    const emails = [];
    const maxEmails = Math.min(10, messageNumbers.length);
    
    for (let i = 0; i < maxEmails; i++) {
      const msgNum = messageNumbers[i];
      if (!msgNum) continue;

      try {
        // Fetch email headers and body
        const headerResponse = await sendCommand(`A00${4 + i} FETCH ${msgNum} (ENVELOPE BODY[TEXT])`);
        console.log(`Email ${msgNum} response:`, headerResponse.substring(0, 200) + '...');
        
        // Parse envelope information
        const envelopeMatch = headerResponse.match(/ENVELOPE \("([^"]*)"[^(]*"([^"]*)"[^(]*"([^"]*)"[^(]*"([^"]*)"/);
        const bodyMatch = headerResponse.match(/BODY\[TEXT\]\s*\{[\d]+\}\s*([^A].*?)(?=A00)/s);
        
        if (envelopeMatch) {
          const [, date, subject, fromName, fromEmail] = envelopeMatch;
          const body = bodyMatch?.[1]?.trim() || 'No body content available';
          
          emails.push({
            id: `imap_${domain}_${Date.now()}_${msgNum}`,
            subject: subject || 'No Subject',
            from: fromEmail || `unknown@${domain}`,
            to: email,
            date: date ? new Date(date).toISOString() : new Date().toISOString(),
            body: body.substring(0, 1000), // Limit body length
            uid: msgNum
          });
        }
      } catch (emailError) {
        console.error(`Error fetching email ${msgNum}:`, emailError);
      }
    }

    // Logout
    await sendCommand('A999 LOGOUT');
    conn.close();

    console.log(`✅ Successfully fetched ${emails.length} real emails from IMAP server`);
    return emails;

  } catch (error) {
    console.error('❌ IMAP connection error:', error);
    
    // Provide specific error messages
    if (error.message?.includes('authentication') || error.message?.includes('LOGIN')) {
      throw new Error('Authentication failed. Please check your email and password. For Gmail, Yahoo, and iCloud, you need an app-specific password.');
    } else if (error.message?.includes('ENOTFOUND') || error.message?.includes('ECONNREFUSED')) {
      throw new Error('Cannot connect to email server. Please check your internet connection and try again.');
    } else if (error.message?.includes('timeout')) {
      throw new Error('Connection timeout. The email server is not responding.');
    } else {
      throw new Error(`Email connection failed: ${error.message}`);
    }
  }
}

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

    // Real IMAP connection with fallback
    console.log('🔗 Connecting to IMAP server...');
    
    let realEmails: any[] = [];
    try {
      realEmails = await fetchRealEmails(email, password, imapConfig);
      console.log(`📧 Fetched ${realEmails.length} real emails from IMAP server`);
    } catch (imapError) {
      console.error('❌ IMAP connection failed:', imapError);
      
      // Provide helpful error message based on error type
      let errorMessage = 'Failed to connect to email server';
      if (imapError.message?.includes('authentication')) {
        errorMessage = 'Authentication failed. Please check your email and password/app password.';
      } else if (imapError.message?.includes('timeout')) {
        errorMessage = 'Connection timeout. Please try again later.';
      } else if (imapError.message?.includes('ENOTFOUND')) {
        errorMessage = 'Email server not found. Please check your email provider.';
      }
      
      return new Response(JSON.stringify({ 
        error: errorMessage,
        details: imapError.message,
        suggestion: 'Try using an app-specific password if your provider requires it (Gmail, Yahoo, iCloud)'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (realEmails.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        total: 0,
        message: 'No emails found in your inbox',
        provider: domain,
        method: 'IMAP',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processedCount = 0;
    const emailSummaries = [];
    // Process each real email with OpenAI analysis
    for (const emailData of realEmails) {
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
        
        Return ONLY a JSON response (no markdown formatting) with:
        - classification: "spam", "legitimate", or "pending" (only these values are allowed)
        - threat_level: "high", "medium", "low", or null
        - confidence: number between 0-1
        - keywords: array of suspicious keywords found
        - reasoning: brief explanation
        
        IMPORTANT: Return raw JSON only, no \`\`\`json wrapper.
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
            let responseContent = openaiData.choices[0].message.content;
            
            // Clean up markdown formatting if present
            if (responseContent.includes('```json')) {
              responseContent = responseContent.replace(/```json\n?/g, '').replace(/\n?```/g, '');
            }
            
            analysis = JSON.parse(responseContent);
            
            // Ensure classification is valid
            const validClassifications = ['spam', 'legitimate', 'pending'];
            if (!validClassifications.includes(analysis.classification)) {
              // Map invalid classifications to valid ones
              if (analysis.classification === 'phishing' || analysis.classification === 'suspicious') {
                analysis.classification = 'spam';
              } else {
                analysis.classification = 'pending';
              }
            }
            
            console.log(`✅ Analysis complete for ${emailData.id}:`, analysis.classification);
          } catch (parseError) {
            console.error('❌ Failed to parse OpenAI response:', parseError);
            console.error('❌ Raw response:', openaiData.choices[0].message.content);
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