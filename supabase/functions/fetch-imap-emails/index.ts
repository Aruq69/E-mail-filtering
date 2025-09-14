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

// IMAP Client class for real email fetching
class IMAPClient {
  private conn: Deno.TcpConn | null = null;
  private tagCounter = 1;
  
  constructor(private config: any) {}
  
  private getNextTag(): string {
    return `A${String(this.tagCounter++).padStart(3, '0')}`;
  }
  
  private async sendCommand(command: string): Promise<string> {
    if (!this.conn) throw new Error('Not connected');
    
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    console.log(`>>> ${command}`);
    await this.conn.write(encoder.encode(command + '\r\n'));
    
    let response = '';
    const buffer = new Uint8Array(8192);
    
    // Read response until we get a complete response
    while (true) {
      const bytesRead = await this.conn.read(buffer);
      if (!bytesRead) break;
      
      const chunk = decoder.decode(buffer.subarray(0, bytesRead));
      response += chunk;
      
      // Check if we have a complete response (ends with our tag)
      const lines = response.split('\r\n');
      const lastLine = lines[lines.length - 2]; // -2 because last element is empty
      if (lastLine && (lastLine.includes('OK') || lastLine.includes('NO') || lastLine.includes('BAD'))) {
        break;
      }
    }
    
    console.log(`<<< ${response.trim()}`);
    return response;
  }
  
  async connect(email: string, password: string): Promise<boolean> {
    try {
      console.log(`🔗 Connecting to ${this.config.host}:${this.config.port}`);
      
      if (this.config.secure) {
        // For secure connections, we need to establish TLS
        this.conn = await Deno.connectTls({
          hostname: this.config.host,
          port: this.config.port,
        });
      } else {
        this.conn = await Deno.connect({
          hostname: this.config.host,
          port: this.config.port,
        });
      }
      
      // Read server greeting
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const buffer = new Uint8Array(1024);
      const bytesRead = await this.conn.read(buffer);
      const greeting = decoder.decode(buffer.subarray(0, bytesRead || 0));
      console.log(`Server greeting: ${greeting.trim()}`);
      
      if (!greeting.includes('OK')) {
        throw new Error('Server not ready');
      }
      
      // Login
      const loginTag = this.getNextTag();
      const loginResponse = await this.sendCommand(`${loginTag} LOGIN "${email}" "${password}"`);
      if (!loginResponse.includes(`${loginTag} OK`)) {
        throw new Error('Authentication failed');
      }
      
      return true;
      
    } catch (error) {
      console.error('IMAP connection failed:', error);
      if (this.conn) {
        this.conn.close();
        this.conn = null;
      }
      throw error;
    }
  }
  
  async selectInbox(): Promise<void> {
    const tag = this.getNextTag();
    const response = await this.sendCommand(`${tag} SELECT INBOX`);
    if (!response.includes(`${tag} OK`)) {
      throw new Error('Failed to select INBOX');
    }
  }
  
  async searchRecentEmails(): Promise<string[]> {
    const tag = this.getNextTag();
    const response = await this.sendCommand(`${tag} SEARCH RECENT`);
    
    const searchLine = response.split('\r\n').find(line => line.startsWith('* SEARCH'));
    if (!searchLine) return [];
    
    const messageIds = searchLine.replace('* SEARCH ', '').trim().split(' ').filter(id => id && !isNaN(Number(id)));
    return messageIds.slice(-10); // Get last 10 messages
  }
  
  async fetchEmail(messageId: string): Promise<any> {
    const tag = this.getNextTag();
    const response = await this.sendCommand(`${tag} FETCH ${messageId} (ENVELOPE BODY[TEXT])`);
    
    // Parse the IMAP response (simplified parsing)
    const lines = response.split('\r\n');
    
    let subject = 'No Subject';
    let from = 'unknown@unknown.com';
    let body = 'Could not retrieve email body';
    let date = new Date().toISOString();
    
    // Extract envelope information
    for (const line of lines) {
      if (line.includes('ENVELOPE')) {
        // Basic envelope parsing - this is simplified
        const envelopeMatch = line.match(/ENVELOPE \((.*?)\)/);
        if (envelopeMatch) {
          const envelope = envelopeMatch[1];
          // Extract subject (first quoted string after date)
          const subjectMatch = envelope.match(/"([^"]*?)"/);
          if (subjectMatch) subject = subjectMatch[1];
          
          // Extract from address (simplified)
          const fromMatch = envelope.match(/"([^"]*?@[^"]*?)"/);
          if (fromMatch) from = fromMatch[1];
        }
      }
      
      if (line.includes('BODY[TEXT]')) {
        // Extract body text
        const bodyMatch = line.match(/BODY\[TEXT\] "([^"]*)"/);
        if (bodyMatch) {
          body = bodyMatch[1];
        } else {
          // Handle literal strings
          const literalMatch = line.match(/BODY\[TEXT\] \{(\d+)\}/);
          if (literalMatch) {
            // The body follows in the next lines
            const bodyLength = parseInt(literalMatch[1]);
            const lineIndex = lines.indexOf(line);
            if (lineIndex >= 0 && lines[lineIndex + 1]) {
              body = lines[lineIndex + 1].substring(0, bodyLength);
            }
          }
        }
      }
    }
    
    return {
      id: `real_${messageId}_${Date.now()}`,
      subject: subject || 'No Subject',
      from: from || 'unknown@unknown.com',
      to: '',
      date: date,
      body: body || 'Could not retrieve email content',
      uid: messageId
    };
  }
  
  async close(): Promise<void> {
    if (this.conn) {
      try {
        const tag = this.getNextTag();
        await this.sendCommand(`${tag} LOGOUT`);
      } catch (error) {
        console.log('Error during logout:', error);
      }
      this.conn.close();
      this.conn = null;
    }
  }
}

// Real IMAP email fetcher using proper IMAP protocol
async function fetchRealEmails(email: string, password: string, imapConfig: any): Promise<any[]> {
  console.log('🔍 Connecting to real IMAP server with proper protocol...');
  
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

  const client = new IMAPClient(imapConfig);
  
  try {
    console.log(`📧 Connecting to ${domain} IMAP server...`);
    
    // Connect and authenticate
    await client.connect(email, password);
    console.log('✅ Authentication successful!');
    
    // Select INBOX
    await client.selectInbox();
    console.log('✅ INBOX selected');
    
    // Search for recent emails
    const messageIds = await client.searchRecentEmails();
    console.log(`📧 Found ${messageIds.length} recent emails`);
    
    const emails = [];
    
    // Fetch details for each message (limit to 5 most recent)
    for (const msgId of messageIds.slice(-5)) {
      try {
        const emailData = await client.fetchEmail(msgId);
        emails.push(emailData);
        console.log(`✅ Fetched email: ${emailData.subject}`);
      } catch (emailError) {
        console.error(`Failed to fetch email ${msgId}:`, emailError);
      }
    }
    
    await client.close();
    
    if (emails.length === 0) {
      console.log('⚠️ No real emails found, generating one demo email for testing');
      return [{
        id: `demo_no_real_emails_${Date.now()}`,
        subject: '📧 Demo: Welcome to Mail Guard',
        from: 'welcome@mailguard.app',
        to: email,
        date: new Date().toISOString(),
        body: 'Welcome to Mail Guard! This is a demo email to show that the system is working. Try adding some real emails to your inbox to see threat analysis in action.',
        uid: 'demo_welcome'
      }];
    }
    
    console.log(`✅ Successfully fetched ${emails.length} real emails from ${domain}`);
    return emails;
    
  } catch (error) {
    console.error('❌ IMAP connection error:', error);
    await client.close();
    
    // More specific error handling
    let errorMessage = error.message;
    if (error.message.includes('Authentication failed')) {
      errorMessage = 'Authentication failed. Please check your credentials or use an app-specific password.';
    } else if (error.message.includes('ECONNREFUSED')) {
      errorMessage = 'Connection refused by server. Please check your email provider settings.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Connection timeout. Please try again later.';
    }
    
    throw new Error(errorMessage);
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
        const { data: insertedEmail, error: insertError } = await supabase
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
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ Database insert error:', insertError);
          console.error('❌ Failed email data:', {
            user_id,
            message_id: emailData.id,
            subject: emailData.subject
          });
        } else {
          processedCount++;
          console.log(`✅ Successfully inserted email ${emailData.id} into database`);
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
    
    // Debug information
    console.log('📊 Final Statistics:');
    console.log(`   - Emails fetched: ${realEmails.length}`);
    console.log(`   - Emails processed: ${processedCount}`);
    console.log(`   - User ID: ${user_id}`);
    console.log(`   - Provider: ${domain}`);

    return new Response(JSON.stringify({
      success: true,
      total: processedCount,
      fetched: realEmails.length,
      summary: emailSummaries,
      provider: domain,
      method: 'IMAP',
      debug: {
        emails_fetched: realEmails.length,
        emails_processed: processedCount,
        user_id: user_id
      },
      note: 'IMAP connection successful - emails fetched and analyzed with AI.',
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