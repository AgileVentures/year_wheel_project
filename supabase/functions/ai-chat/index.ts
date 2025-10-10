// Supabase Edge Function for AI Chat
// Handles OpenAI streaming with tool execution for Year Wheel assistant

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { messages, wheelId } = await req.json()
    
    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verify user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Get wheel context
    const { data: wheel, error: wheelError } = await supabase
      .from('year_wheels')
      .select(`
        *,
        wheel_rings (*),
        activity_groups (*),
        labels (*),
        items (*)
      `)
      .eq('id', wheelId)
      .single()
    
    if (wheelError || !wheel) {
      return new Response(
        JSON.stringify({ error: 'Wheel not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Build system prompt with context
    const systemPrompt = `Du är en AI-assistent för YearWheel, ett cirkulärt kalenderverktyg för årsplanering.

Aktuellt hjul:
- Titel: ${wheel.title}
- År: ${wheel.year}
- Ringar: ${wheel.wheel_rings?.length || 0}
- Aktivitetsgrupper: ${wheel.activity_groups?.length || 0}
- Aktiviteter: ${wheel.items?.length || 0}

Din uppgift är att hjälpa användaren att:
1. Skapa och organisera ringar (inner/outer)
2. Skapa aktivitetsgrupper och kategorier
3. Lägga till aktiviteter och händelser
4. Skapa nya årssidor
5. Ge förslag på planeringsstrukturer

Var alltid koncis, hjälpsam och bekräfta åtgärder innan du utför dem.
Svara på svenska.`

    // Call OpenAI API with streaming
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
        tools: [
          {
            type: 'function',
            function: {
              name: 'createRing',
              description: 'Skapa en ny ring på hjulet (inner eller outer)',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Namnet på ringen' },
                  type: { type: 'string', enum: ['inner', 'outer'], description: 'Ringtyp' },
                  color: { type: 'string', description: 'Hexadecimal färgkod (valfritt)' },
                  orientation: { type: 'string', enum: ['vertical', 'horizontal'], description: 'Orientering för inner rings' }
                },
                required: ['name', 'type']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'createActivityGroup',
              description: 'Skapa en ny aktivitetsgrupp/kategori',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Namnet på aktivitetsgruppen' },
                  color: { type: 'string', description: 'Hexadecimal färgkod (valfritt)' }
                },
                required: ['name']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'createItem',
              description: 'Skapa en ny aktivitet/händelse på hjulet',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Namnet på aktiviteten' },
                  startDate: { type: 'string', description: 'Startdatum (YYYY-MM-DD)' },
                  endDate: { type: 'string', description: 'Slutdatum (YYYY-MM-DD)' },
                  ringId: { type: 'string', description: 'ID för ringen där aktiviteten ska placeras' },
                  activityGroupId: { type: 'string', description: 'ID för aktivitetsgruppen' },
                  time: { type: 'string', description: 'Tid (valfritt)' }
                },
                required: ['name', 'startDate', 'endDate', 'ringId', 'activityGroupId']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'createPage',
              description: 'Skapa en ny sida för ett annat år',
              parameters: {
                type: 'object',
                properties: {
                  year: { type: 'number', description: 'Året för den nya sidan' },
                  copyStructure: { type: 'boolean', description: 'Kopiera ringar och grupper från nuvarande sida' }
                },
                required: ['year']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'analyzeWheel',
              description: 'Analysera det aktuella hjulet och ge insikter',
              parameters: {
                type: 'object',
                properties: {}
              }
            }
          }
        ],
        tool_choice: 'auto'
      })
    })
    
    // Stream response back to client
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
    
  } catch (error) {
    console.error('AI Chat Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
