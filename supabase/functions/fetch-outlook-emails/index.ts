import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== FETCH OUTLOOK EMAILS FUNCTION START ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // Get the authorization header to verify the user
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization header required', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the JWT token and get user info
    const jwt = authHeader.replace('Bearer ', '');
    console.log('JWT token length:', jwt.length);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!user) {
      console.error('No user found from token');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('User authenticated:', user.id);

    // Get the user's Outlook tokens
    console.log('🔍 Fetching Outlook tokens for user...');
    const { data: tokenData, error: tokenError } = await supabase
      .from('outlook_tokens')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (tokenError) {
      console.error('❌ Token fetch error:', tokenError);
      return new Response(
        JSON.stringify({ 
          error: 'Error fetching Outlook tokens. Please reconnect your account.',
          success: false,
          debug: tokenError.message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokenData) {
      console.log('❌ No Outlook token found for user');
      return new Response(
        JSON.stringify({ 
          error: 'No Outlook token found. Please connect your Outlook account first.',
          success: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Outlook tokens found, checking expiration...');

    // Check if token is expired and attempt refresh if needed
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    if (now >= expiresAt) {
      console.log('Access token expired, attempting to refresh...');
      
      // Try to refresh the token using refresh_token
      if (tokenData.refresh_token) {
        try {
          const microsoftClientId = Deno.env.get('MICROSOFT_CLIENT_ID');
          const microsoftClientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');
          
          const refreshResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: microsoftClientId!,
              client_secret: microsoftClientSecret!,
              refresh_token: tokenData.refresh_token,
              grant_type: 'refresh_token',
            }),
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            const newExpiresAt = new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString();
            
            // Update the tokens in database
            await supabase
              .from('outlook_tokens')
              .update({
                access_token: refreshData.access_token,
                refresh_token: refreshData.refresh_token || tokenData.refresh_token,
                expires_at: newExpiresAt,
              })
              .eq('user_id', user.id);
            
            // Update tokenData for this request
            tokenData.access_token = refreshData.access_token;
            tokenData.expires_at = newExpiresAt;
            
            console.log('Token refreshed successfully');
          } else {
            throw new Error('Token refresh failed');
          }
        } catch (refreshError) {
          console.error('Failed to refresh token:', refreshError);
          return new Response(
            JSON.stringify({ 
              error: 'Access token expired and refresh failed. Please reconnect your Outlook account.',
              success: false,
              reconnect_required: true
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ 
            error: 'Access token expired and no refresh token available. Please reconnect your Outlook account.',
            success: false,
            reconnect_required: true
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch emails from Microsoft Graph API
    console.log('📧 Fetching emails from Microsoft Graph API...');
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=10&$orderby=receivedDateTime desc', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error('❌ Graph API Error:', graphResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch emails: ${graphResponse.status} - ${errorText}`,
          success: false,
          debug: `HTTP ${graphResponse.status}: ${errorText}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Successfully connected to Microsoft Graph API');

    const graphData = await graphResponse.json();
    const emails = graphData.value || [];
    
    // Get already processed email IDs to avoid duplicates
    const { data: existingEmails } = await supabase
      .from('emails')
      .select('outlook_id')
      .eq('user_id', user.id);
    
    const existingIds = new Set(existingEmails?.map(e => e.outlook_id) || []);
    
    // Filter out emails that have already been processed
    const newEmails = emails.filter((email: any) => !existingIds.has(email.id));
    
    console.log(`Found ${emails.length} total emails, ${newEmails.length} new emails to process`);
    
    if (newEmails.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No new emails to process',
          emails_processed: 0,
          total_emails_fetched: emails.length,
          emails: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Process emails with HuggingFace-Powered Dataset-Based ML analysis
    const processedEmails = [];
    console.log(`🤖 Processing ${newEmails.length} emails with HuggingFace Dataset-Based ML Classifier...`);
    
    // Limit processing to prevent timeouts (process max 50 emails per request)
    const maxEmailsToProcess = Math.min(newEmails.length, 50);
    const emailsToProcess = newEmails.slice(0, maxEmailsToProcess);
    
    console.log(`📊 Processing ${emailsToProcess.length} out of ${newEmails.length} emails to prevent timeouts`);
    
    // Process emails in parallel with timeout protection
    const emailProcessingPromises = emailsToProcess.map(async (email: any, index: number) => {
      const timeoutDuration = 15000; // 15 seconds per email
      
      try {
        console.log(`📧 [${index + 1}/${emailsToProcess.length}] Processing: "${email.subject}" from ${email.from?.emailAddress?.address}`);

        // Extract text content
        let textContent = email.bodyPreview || '';
        if (email.body && email.body.content) {
          textContent = email.body.content
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 5000); // Limit content length to prevent processing delays
        }

        // Call Dataset-Based ML Email Classifier with timeout protection
        console.log(`🤖 [${index + 1}] Analyzing with Dataset-Based ML...`);
        
        const classificationPromise = supabase.functions.invoke('robust-email-classifier', {
          body: {
            subject: email.subject || 'No Subject',
            sender: email.from?.emailAddress?.address || 'Unknown Sender',
            content: textContent,
            user_id: user.id
          }
        });

        // Add timeout to classification
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Classification timeout')), timeoutDuration)
        );

        const { data: classificationData, error: classificationError } = await Promise.race([
          classificationPromise,
          timeoutPromise
        ]) as any;

        let finalClassificationData = null;
        
        if (classificationError) {
          console.error(`❌ [${index + 1}] Classification FAILED:`, email.subject, classificationError);
          // Use safe defaults for failed classifications
          finalClassificationData = {
            classification: 'unknown',
            threat_level: 'low',
            threat_type: null,
            confidence: 0.5,
            detailed_analysis: { detected_features: [] }
          };
        } else if (classificationData) {
          console.log(`✅ [${index + 1}] ML RESULT:`, 
                     `📧 "${email.subject}"`,
                     `🎯 Classification: ${classificationData?.classification?.toUpperCase()}`, 
                     `🔥 Confidence: ${(classificationData?.confidence * 100).toFixed(1)}%`,
                     `⚠️ Threat Level: ${classificationData?.threat_level?.toUpperCase()}`);
          finalClassificationData = classificationData;
        }

        const emailData = {
          user_id: user.id,
          outlook_id: email.id,
          message_id: email.id,
          subject: email.subject || 'No Subject',
          sender: email.from?.emailAddress?.address || 'Unknown Sender',
          content: textContent,
          raw_content: email.body?.content || '',
          received_date: email.receivedDateTime,
          processed_at: new Date().toISOString(),
          // Add ML classification data
          classification: finalClassificationData?.classification || 'unknown',
          threat_level: finalClassificationData?.threat_level || 'low',
          threat_type: finalClassificationData?.threat_type || null,
          confidence: finalClassificationData?.confidence || 0.5,
          keywords: finalClassificationData?.detailed_analysis?.detected_features || null,
        };

        // Upsert email into database
        const { data: insertedEmail, error: insertError } = await supabase
          .from('emails')
          .upsert(emailData, { 
            onConflict: 'message_id',
            ignoreDuplicates: false 
          })
          .select()
          .single();

        if (!insertError && insertedEmail) {
          // Update email statistics
          if (finalClassificationData) {
            try {
              await supabase.rpc('increment_email_statistics', {
                p_user_id: user.id,
                p_threat_level: finalClassificationData.threat_level || 'safe',
                p_threat_type: finalClassificationData.threat_type
              });
            } catch (statsError) {
              console.error('Failed to update email statistics:', statsError);
            }
            
            // Create alert for high-risk emails
            if (finalClassificationData.threat_level === 'high' || 
                finalClassificationData.classification === 'spam' ||
                finalClassificationData.classification === 'suspicious') {
              try {
                await supabase
                  .from('email_alerts')
                  .insert({
                    user_id: user.id,
                    email_id: insertedEmail.id,
                    alert_type: finalClassificationData.threat_level || 'suspicious',
                    alert_message: `${finalClassificationData.classification} email detected: "${email.subject}" from ${email.from?.emailAddress?.address}`,
                    status: 'pending'
                  });
                console.log(`🚨 [${index + 1}] Alert created for high-risk email: ${email.subject}`);
              } catch (alertError) {
                console.error('Failed to create email alert:', alertError);
              }
            }
          }
          
          return insertedEmail;
        } else {
          console.error(`❌ [${index + 1}] Failed to store email:`, insertError);
          return null;
        }

      } catch (error) {
        console.error(`❌ [${index + 1}] Email processing failed:`, error);
        return null;
      }
    });

    // Wait for all emails to be processed (with overall timeout protection)
    const overallTimeout = 120000; // 2 minutes total
    const overallTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Overall processing timeout')), overallTimeout)
    );

    try {
      const results = await Promise.race([
        Promise.allSettled(emailProcessingPromises),
        overallTimeoutPromise
      ]) as PromiseSettledResult<any>[];

      // Filter successful results
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          processedEmails.push(result.value);
        }
      }

    } catch (timeoutError) {
      console.error('⏰ Overall processing timeout reached, returning partial results');
    }

    console.log(`🎯 === DATASET-BASED ML ANALYSIS COMPLETE ===`);
    console.log(`📊 Processed ${processedEmails.length}/${emailsToProcess.length} emails with Dataset-Based ML`);
    console.log(`🤖 All emails analyzed with same classifier as ML Analytics real-time testing`);
    console.log(`📈 Results: classification, threat levels, confidence scores, and detected features`);
    
    // If there are remaining emails to process, inform the user
    const remainingEmails = newEmails.length - emailsToProcess.length;
    let message = `Successfully processed ${processedEmails.length} new emails out of ${emails.length} total`;
    if (remainingEmails > 0) {
      message += `. ${remainingEmails} emails queued for next sync to prevent timeouts.`;
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message,
        emails_processed: processedEmails.length,
        total_emails_fetched: emails.length,
        new_emails_found: newEmails.length,
        remaining_emails: remainingEmails,
        emails: processedEmails, // Return processed emails for display
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== FETCH OUTLOOK EMAILS ERROR ===');
    console.error('Error message:', (error as Error).message);
    console.error('Error stack:', (error as Error).stack);
    
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message,
        success: false
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});