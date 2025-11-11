#!/usr/bin/env node

/**
 * Setup Resend Webhook Script
 * 
 * This script creates a webhook endpoint in Resend to receive email events.
 * 
 * Usage:
 *   node scripts/setup-resend-webhook.js <RESEND_API_KEY>
 * 
 * Or set environment variable:
 *   RESEND_API_KEY=re_xxx node scripts/setup-resend-webhook.js
 * 
 * Example:
 *   node scripts/setup-resend-webhook.js re_abc123xyz
 */

const WEBHOOK_ENDPOINT = 'https://mmysvuymzabstnobdfvo.supabase.co/functions/v1/resend-webhook';

const EVENTS = [
  'email.sent',
  'email.delivered',
  'email.delivery_delayed',
  'email.bounced',
  'email.complained',
  'email.opened',
  'email.clicked'
];

function getResendApiKey() {
  // Try to get from command line argument
  const apiKey = process.argv[2] || process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.error('❌ Error: RESEND_API_KEY not provided');
    console.log('\n💡 Usage:');
    console.log('   node scripts/setup-resend-webhook.js <RESEND_API_KEY>');
    console.log('\n   Or set environment variable:');
    console.log('   RESEND_API_KEY=re_xxx node scripts/setup-resend-webhook.js');
    console.log('\n📝 Get your API key from: https://resend.com/api-keys');
    process.exit(1);
  }
  
  if (!apiKey.startsWith('re_')) {
    console.error('❌ Error: Invalid API key format');
    console.log('   Resend API keys should start with "re_"');
    console.log('   Example: re_abc123xyz...');
    process.exit(1);
  }
  
  console.log('✅ Using API key:', apiKey.substring(0, 10) + '...');
  return apiKey;
}

async function createWebhook(apiKey) {
  console.log('\n🔧 Creating Resend webhook...');
  console.log('📍 Endpoint:', WEBHOOK_ENDPOINT);
  console.log('📋 Events:', EVENTS.join(', '));
  
  try {
    const response = await fetch('https://api.resend.com/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: WEBHOOK_ENDPOINT,
        events: EVENTS
      })
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('❌ Failed to create webhook');
      console.error('Status:', response.status);
      console.error('Response:', responseText);
      
      // Try to parse as JSON for better error message
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.message) {
          console.error('Error message:', errorData.message);
        }
      } catch (e) {
        // Not JSON, already printed above
      }
      
      process.exit(1);
    }

    const data = JSON.parse(responseText);
    console.log('\n✅ Webhook created successfully!');
    console.log('📊 Webhook details:');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Error creating webhook:', error.message);
    process.exit(1);
  }
}

async function listExistingWebhooks(apiKey) {
  console.log('\n📋 Checking for existing webhooks...');
  
  try {
    const response = await fetch('https://api.resend.com/webhooks', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      console.log('⚠️  Could not list webhooks (this is okay if you have no webhooks yet)');
      return [];
    }

    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      console.log(`\n📌 Found ${data.data.length} existing webhook(s):`);
      data.data.forEach((webhook, index) => {
        console.log(`\n${index + 1}. ${webhook.endpoint}`);
        console.log(`   ID: ${webhook.id}`);
        console.log(`   Status: ${webhook.status || 'active'}`);
        console.log(`   Events: ${webhook.events?.join(', ') || 'N/A'}`);
      });
      
      // Check if our endpoint already exists
      const existingWebhook = data.data.find(w => w.endpoint === WEBHOOK_ENDPOINT);
      if (existingWebhook) {
        console.log('\n⚠️  Webhook already exists for this endpoint!');
        console.log('   You can delete it first or use the existing one.');
        
        const shouldContinue = process.argv.includes('--force');
        if (!shouldContinue) {
          console.log('\n💡 To create anyway, run with --force flag:');
          console.log('   node scripts/setup-resend-webhook.js --force');
          process.exit(0);
        }
      }
    } else {
      console.log('✨ No existing webhooks found');
    }
    
    return data.data || [];
  } catch (error) {
    console.log('⚠️  Could not list webhooks:', error.message);
    return [];
  }
}

async function main() {
  console.log('🚀 Resend Webhook Setup\n');
  console.log('=' .repeat(60));
  
  // Get API key
  const apiKey = getResendApiKey();
  
  // List existing webhooks
  await listExistingWebhooks(apiKey);
  
  // Create new webhook
  await createWebhook(apiKey);
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ Setup complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Apply database migration (see docs/EMAIL_TRACKING_SETUP.md)');
  console.log('   2. Send a test newsletter');
  console.log('   3. Check the stats in Newsletter Manager');
  console.log('\n🔍 To view webhook logs:');
  console.log('   https://supabase.com/dashboard/project/mmysvuymzabstnobdfvo/functions/resend-webhook/logs');
  console.log('\n');
}

main().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
