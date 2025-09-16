import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function checkPasswordAgainstHaveIBeenPwned(password: string): Promise<{ isCompromised: boolean; breachCount?: number }> {
  try {
    console.log('🔍 Checking password against HaveIBeenPwned database...')
    
    // Create SHA-1 hash of the password
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
    
    // Use k-anonymity model - send only first 5 characters of hash
    const prefix = hashHex.substring(0, 5)
    const suffix = hashHex.substring(5)
    
    console.log(`🔒 Checking hash prefix: ${prefix}`)
    
    // Query HaveIBeenPwned API
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mail-Guard-Security-Check',
        'Add-Padding': 'true' // Additional privacy protection
      }
    })
    
    if (!response.ok) {
      console.warn('⚠️ HaveIBeenPwned API unavailable')
      return { isCompromised: false }
    }
    
    const hashList = await response.text()
    
    // Check if our password hash suffix appears in the results
    const lines = hashList.split('\n')
    for (const line of lines) {
      const [hashSuffix, count] = line.trim().split(':')
      if (hashSuffix === suffix) {
        const breachCount = parseInt(count, 10)
        console.log(`🚨 Password found in ${breachCount} data breaches`)
        return { isCompromised: true, breachCount }
      }
    }
    
    console.log('✅ Password not found in known breaches')
    return { isCompromised: false }
    
  } catch (error) {
    console.error('❌ Error checking password:', error)
    return { isCompromised: false }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405 
      }
    )
  }

  try {
    const { password } = await req.json()
    
    if (!password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Password is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    console.log('🔐 Checking password security...')
    
    const result = await checkPasswordAgainstHaveIBeenPwned(password)
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Password check error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Password security check failed',
        isCompromised: false // Default to safe on errors
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})