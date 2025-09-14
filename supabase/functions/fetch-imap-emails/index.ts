import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Imap from 'npm:imap@0.8.19';
import { simpleParser } from 'npm:mailparser@3.7.1';

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

// Function to fetch real emails from IMAP server
async function fetchRealEmails(email: string, password: string, imapConfig: any): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: email,
      password: password,
      host: imapConfig.host,
      port: imapConfig.port,
      tls: imapConfig.secure,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000,
      connTimeout: 15000,
    });

    const emails: any[] = [];

    function openInbox(cb: (err: any, box?: any) => void) {
      imap.openBox('INBOX', true, cb);
    }

    imap.once('ready', function() {
      console.log('📡 IMAP connection ready');
      openInbox(function(err, box) {
        if (err) {
          console.error('❌ Error opening inbox:', err);
          reject(err);
          return;
        }

        console.log('📬 Inbox opened, total messages:', box.messages.total);

        // Fetch last 10 emails
        const fetchCount = Math.min(10, box.messages.total);
        if (fetchCount === 0) {
          console.log('📭 No emails found in inbox');
          resolve([]);
          return;
        }

        const range = `${Math.max(1, box.messages.total - fetchCount + 1)}:${box.messages.total}`;
        console.log('🔍 Fetching email range:', range);

        const f = imap.fetch(range, {
          bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
          struct: true
        });

        let emailCount = 0;
        const totalEmails = fetchCount;

        f.on('message', function(msg, seqno) {
          console.log('📧 Processing message #' + seqno);
          let headers: any = {};
          let body = '';
          
          msg.on('body', function(stream, info) {
            let buffer = '';
            stream.on('data', function(chunk) {
              buffer += chunk.toString('ascii');
            });
            stream.once('end', function() {
              if (info.which === 'TEXT') {
                body = buffer;
              } else {
                headers = Imap.parseHeader(buffer);
              }
            });
          });

          msg.once('attributes', function(attrs) {
            const uid = attrs.uid;
            emailCount++;
            
            const emailData = {
              id: `imap_${uid}`,
              subject: headers.subject ? headers.subject[0] : 'No Subject',
              from: headers.from ? headers.from[0] : 'Unknown Sender',
              to: headers.to ? headers.to[0] : email,
              date: headers.date ? new Date(headers.date[0]).toISOString() : new Date().toISOString(),
              body: body || 'No content available',
              uid: uid
            };
            emails.push(emailData);
            
            console.log(`✉️ Processed email ${emailCount}/${totalEmails}: ${emailData.subject}`);
          });
        });

        f.once('error', function(err) {
          console.error('❌ Fetch error:', err);
          reject(err);
        });

        f.once('end', function() {
          console.log('✅ Done fetching email headers');
          imap.end();
        });
      });
    });

    imap.once('error', function(err) {
      console.error('❌ IMAP connection error:', err);
      reject(err);
    });

    imap.once('end', function() {
      console.log('🔌 IMAP connection ended');
      resolve(emails);
    });

    console.log('🔌 Connecting to IMAP server...');
    imap.connect();
  });
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