import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { html, filename = 'report.pdf' } = await req.json();

    if (!html) {
      throw new Error('HTML content is required');
    }

    // Use Browserless.io API for high-quality PDF generation with full CSS support
    const BROWSERLESS_API_KEY = Deno.env.get('BROWSERLESS_API_KEY');
    
    if (!BROWSERLESS_API_KEY) {
      // Fallback: Return HTML for client-side window.print()
      return new Response(
        JSON.stringify({
          success: false,
          fallback: true,
          message: 'Using browser print fallback',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Generate PDF using Browserless (Puppeteer-based, full Chrome rendering)
    const response = await fetch(`https://chrome.browserless.io/pdf?token=${BROWSERLESS_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html,
        options: {
          displayHeaderFooter: false,
          printBackground: true,
          format: 'A4',
          margin: {
            top: '10mm',
            bottom: '10mm',
            left: '10mm',
            right: '10mm',
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Browserless API error: ${response.statusText}`);
    }

    const pdfBuffer = await response.arrayBuffer();

    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

