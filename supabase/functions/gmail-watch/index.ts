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
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // Handle Pub/Sub push notifications from Gmail
    if (req.method === 'POST') {
      console.log('Received Gmail push notification');
      
      const body = await req.text();
      console.log('Push notification body:', body);
      
      let pubsubMessage;
      try {
        const data = JSON.parse(body);
        pubsubMessage = data.message;
      } catch (error) {
        console.error('Failed to parse push notification:', error);
        return new Response('Invalid JSON', { status: 400 });
      }

      if (pubsubMessage?.data) {
        // Decode the base64 message data
        const messageData = JSON.parse(atob(pubsubMessage.data));
        console.log('Decoded message data:', messageData);
        
        const { emailAddress, historyId } = messageData;
        
        if (emailAddress && historyId) {
          // Find the user associated with this email address
          const { data: tokenData } = await supabase
            .from('gmail_tokens')
            .select('user_id, access_token, refresh_token, expires_at')
            .eq('email_address', emailAddress)
            .single();
            
          if (tokenData) {
            console.log(`Processing Gmail changes for user ${tokenData.user_id}`);
            
            // Check if token needs refresh
            const now = new Date();
            const expiresAt = new Date(tokenData.expires_at);
            let accessToken = tokenData.access_token;
            
            if (expiresAt <= now) {
              console.log('Token expired, refreshing...');
              const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
                  client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
                  refresh_token: tokenData.refresh_token,
                  grant_type: 'refresh_token',
                }),
              });

              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                accessToken = refreshData.access_token;
                
                // Update token in database
                await supabase
                  .from('gmail_tokens')
                  .update({ 
                    access_token: accessToken,
                    expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
                  })
                  .eq('user_id', tokenData.user_id);
              }
            }
            
            // Fetch the history changes since the last known historyId
            console.log('Fetching Gmail history changes...');
            const historyResponse = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${historyId}`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            
            if (historyResponse.ok) {
              const historyData = await historyResponse.json();
              console.log('History data received:', historyData);
              
              if (historyData.history) {
                // Process new messages
                for (const historyRecord of historyData.history) {
                  if (historyRecord.messagesAdded) {
                    console.log(`Processing ${historyRecord.messagesAdded.length} new messages`);
                    
                    // Trigger email fetching for this user
                    await supabase.functions.invoke('fetch-gmail-emails', {
                      body: { user_id: tokenData.user_id }
                    });
                    
                    break; // Only process the first batch to avoid overload
                  }
                }
              }
            }
          }
        }
      }
      
      return new Response('OK', { status: 200 });
    }
    
    // Handle watch setup requests
    if (req.method === 'PUT') {
      const { user_id, action } = await req.json();
      
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: 'user_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Get Gmail token for the user
      const { data: tokenData } = await supabase
        .from('gmail_tokens')
        .select('access_token, refresh_token, expires_at, email_address')
        .eq('user_id', user_id)
        .single();
        
      if (!tokenData) {
        return new Response(
          JSON.stringify({ error: 'No Gmail token found for user' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Check if token needs refresh
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      let accessToken = tokenData.access_token;
      
      if (expiresAt <= now) {
        console.log('Token expired, refreshing...');
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
            client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
            refresh_token: tokenData.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          accessToken = refreshData.access_token;
        } else {
          return new Response(
            JSON.stringify({ error: 'Failed to refresh token' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      if (action === 'start') {
        // Set up Gmail watch
        console.log('Setting up Gmail watch...');
        
        // Note: You need to set up a Pub/Sub topic and configure the webhook URL
        const watchResponse = await fetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/watch',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              topicName: 'projects/YOUR_PROJECT_ID/topics/gmail-notifications', // Replace with your topic
              labelIds: ['INBOX'],
              labelFilterAction: 'include'
            }),
          }
        );
        
        if (watchResponse.ok) {
          const watchData = await watchResponse.json();
          console.log('Gmail watch setup successful:', watchData);
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Gmail watch setup successful',
              data: watchData 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          const errorText = await watchResponse.text();
          console.error('Failed to setup Gmail watch:', errorText);
          
          return new Response(
            JSON.stringify({ 
              error: 'Failed to setup Gmail watch',
              details: errorText 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else if (action === 'stop') {
        // Stop Gmail watch
        const stopResponse = await fetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/stop',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (stopResponse.ok) {
          return new Response(
            JSON.stringify({ success: true, message: 'Gmail watch stopped' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          const errorText = await stopResponse.text();
          return new Response(
            JSON.stringify({ error: 'Failed to stop Gmail watch', details: errorText }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    
    return new Response(
      JSON.stringify({ error: 'Invalid request method or action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in gmail-watch function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});