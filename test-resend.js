// Quick test script to verify Resend API
// Run with: node test-resend.js

const RESEND_API_KEY = 're_WBHHPPfh_6njF13dWP6bdfHWEHH4N3fMz'; // Replace with actual key

async function testResend() {
  console.log('Testing Resend API...\n');

  // Test 1: Check domains
  console.log('1. Checking domains...');
  try {
    const domainsResponse = await fetch('https://api.resend.com/domains', {
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`
      }
    });
    
    if (!domainsResponse.ok) {
      console.error('❌ Failed to fetch domains:', await domainsResponse.text());
    } else {
      const domains = await domainsResponse.json();
      console.log('✅ Domains:', JSON.stringify(domains, null, 2));
    }
  } catch (error) {
    console.error('❌ Error fetching domains:', error.message);
  }

  console.log('\n2. Testing single email send...');
  try {
    const testPayload = {
      from: 'Thomas från YearWheel <hello@yearwheel.se>',
      to: ['thomas@freefoot.se'],
      subject: 'Test from YearWheel',
      html: '<p>This is a test email to verify Resend configuration.</p>'
    };

    console.log('Payload:', JSON.stringify(testPayload, null, 2));

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', responseText);

    if (response.ok) {
      console.log('✅ Email sent successfully!');
    } else {
      console.error('❌ Failed to send email');
    }
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
  }

  console.log('\n3. Testing batch send...');
  try {
    const batchPayload = [
      {
        from: 'Thomas från YearWheel <hello@yearwheel.se>',
        to: ['thomas@freefoot.se'],
        subject: 'Batch Test 1',
        html: '<p>Batch test email 1</p>'
      }
    ];

    console.log('Batch payload:', JSON.stringify(batchPayload, null, 2));

    const response = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(batchPayload)
    });

    const responseText = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', responseText);

    if (response.ok) {
      console.log('✅ Batch sent successfully!');
    } else {
      console.error('❌ Failed to send batch');
    }
  } catch (error) {
    console.error('❌ Error sending batch:', error.message);
  }
}

testResend();
