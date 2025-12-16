#!/usr/bin/env node

/**
 * Test Monday.com Webhook Script
 * 
 * Tests the Monday webhook endpoint with sample payloads for each event type.
 * 
 * Usage:
 *   # Test production
 *   node scripts/test-monday-webhook.js
 * 
 *   # Test local
 *   node scripts/test-monday-webhook.js http://localhost:54321/functions/v1/monday-webhook
 */

const PRODUCTION_WEBHOOK = 'https://mmysvuymzabstnobdfvo.supabase.co/functions/v1/monday-webhook';

// Test event payloads
const testEvents = [
  {
    name: 'Install Event',
    payload: {
      type: 'install',
      data: {
        app_id: 12345,
        user_id: 99999,
        user_email: 'test@yearwheel.se',
        user_name: 'Test User',
        user_cluster: 'eu1',
        account_tier: 'standard',
        account_name: 'Test Account',
        account_slug: 'test-account',
        account_max_users: 25,
        account_id: 88888,
        version_data: { version: '1.0.0', type: 'major' },
        timestamp: new Date().toISOString(),
        user_country: 'SE'
      }
    }
  },
  {
    name: 'Trial Started Event',
    payload: {
      type: 'app_trial_subscription_started',
      data: {
        app_id: 12345,
        user_id: 99999,
        user_email: 'test@yearwheel.se',
        user_name: 'Test User',
        user_cluster: 'eu1',
        account_tier: 'standard',
        account_name: 'Test Account',
        account_slug: 'test-account',
        account_max_users: 25,
        account_id: 88888,
        version_data: { version: '1.0.0', type: 'major' },
        timestamp: new Date().toISOString(),
        user_country: 'SE',
        subscription: {
          plan_id: 'pro-monthly',
          billing_period: 'monthly',
          is_trial: true,
          days_left: 14
        }
      }
    }
  },
  {
    name: 'Subscription Created Event',
    payload: {
      type: 'app_subscription_created',
      data: {
        app_id: 12345,
        user_id: 99999,
        user_email: 'test@yearwheel.se',
        user_name: 'Test User',
        user_cluster: 'eu1',
        account_tier: 'standard',
        account_name: 'Test Account',
        account_slug: 'test-account',
        account_max_users: 25,
        account_id: 88888,
        version_data: { version: '1.0.0', type: 'major' },
        timestamp: new Date().toISOString(),
        user_country: 'SE',
        subscription: {
          plan_id: 'pro-monthly',
          billing_period: 'monthly',
          is_trial: false,
          renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    }
  },
  {
    name: 'Subscription Cancelled Event',
    payload: {
      type: 'app_subscription_cancelled_by_user',
      data: {
        app_id: 12345,
        user_id: 99999,
        user_email: 'test@yearwheel.se',
        user_name: 'Test User',
        user_cluster: 'eu1',
        account_tier: 'standard',
        account_name: 'Test Account',
        account_slug: 'test-account',
        account_max_users: 25,
        account_id: 88888,
        version_data: { version: '1.0.0', type: 'major' },
        timestamp: new Date().toISOString(),
        user_country: 'SE'
      }
    }
  }
];

async function testWebhook(endpoint, event) {
  console.log(`\n🧪 Testing: ${event.name}`);
  console.log(`📍 Endpoint: ${endpoint}`);
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event.payload)
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    if (response.ok) {
      console.log('✅ Success');
      console.log('📊 Response:', JSON.stringify(responseData, null, 2));
    } else {
      console.error('❌ Failed');
      console.error('📊 Status:', response.status);
      console.error('📊 Response:', responseData);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  const endpoint = process.argv[2] || PRODUCTION_WEBHOOK;
  
  console.log('🚀 Testing Monday.com Webhook');
  console.log('================================');
  console.log('Target:', endpoint);
  console.log(`Running ${testEvents.length} test events...`);

  for (const event of testEvents) {
    await testWebhook(endpoint, event);
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n✅ All tests complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Check Supabase function logs: npx supabase functions logs monday-webhook');
  console.log('2. Query monday_users table for test user (user_id: 99999)');
  console.log('3. Query monday_subscription_events for logged events');
}

main();
