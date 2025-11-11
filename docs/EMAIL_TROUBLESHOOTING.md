# Email Function Troubleshooting Guide

## Issues Fixed in send-newsletter Function

### 1. **Improved Error Logging**
Added comprehensive console logging to track:
- Number of recipients being processed
- Each batch send attempt
- API responses (success and errors)
- Detailed error messages with batch numbers

### 2. **Fixed Success/Error Counting**
- **Old bug**: Multiplied by `batchSize` incorrectly
- **Fixed**: Accurate count per recipient
- Now tracks `successCount` and `errorCount` separately

### 3. **Better Error Handling**
- Returns detailed error information to frontend
- Uses HTTP 207 (Multi-Status) for partial success
- Logs database insert failures

### 4. **TypeScript Error Fixes**
- Fixed `error.message` type issues
- Added proper type guards for error handling

## Critical Checks Required

### Step 1: Verify Resend API Key

1. Go to https://resend.com/api-keys
2. Check if your API key is valid and starts with `re_`
3. Verify the key has the correct permissions

**Current key in Supabase secrets:**
```bash
supabase secrets list | grep RESEND_API_KEY
```

**⚠️ If the key doesn't start with `re_`, it's invalid!**

To update:
```bash
supabase secrets set RESEND_API_KEY=re_YOUR_ACTUAL_KEY_HERE
```

### Step 2: Verify Domain in Resend

1. Go to https://resend.com/domains
2. Check if `yearwheel.se` is added and verified
3. Verify DNS records are correct:
   - SPF record
   - DKIM record
   - DMARC record (optional but recommended)

**Current from address:** `hello@yearwheel.se`

If domain is not verified:
- Emails will fail with "domain not verified" error
- Add domain in Resend dashboard
- Add DNS records to your domain provider
- Wait for verification (usually instant, sometimes takes a few minutes)

### Step 3: Check Function Logs

View logs in Supabase dashboard:
https://supabase.com/dashboard/project/mmysvuymzabstnobdfvo/functions/send-newsletter

Look for:
- ✅ "Processing batch X with Y recipients" - Function is running
- ✅ "Batch X succeeded: Y emails" - Emails sent successfully
- ❌ "Batch X failed with status 4XX" - API error (check message)
- ❌ "RESEND_API_KEY not configured" - Environment variable missing

### Step 4: Test with Single Email

Use the newsletter manager to send a test:
1. Select "Admins" as recipient type (will only send to you)
2. Fill in subject and content
3. Click "Skicka Newsletter"
4. Check function logs for detailed error messages

## Common Error Messages and Solutions

### "API key is invalid"
- **Cause**: Wrong API key format or expired key
- **Solution**: Get new key from Resend dashboard, update secret

### "Domain not verified"
- **Cause**: `hello@yearwheel.se` domain not set up in Resend
- **Solution**: Add domain and DNS records in Resend dashboard

### "No recipients found"
- **Cause**: No users match the selected recipient type
- **Solution**: Check database has users with profiles

### "Resend API key not configured"
- **Cause**: Environment variable not set in Supabase
- **Solution**: Run `supabase secrets set RESEND_API_KEY=re_...`

### "Failed to log newsletter send"
- **Cause**: Missing columns in `newsletter_sends` table
- **Solution**: Apply migration from `APPLY_MIGRATION_NOW.md`

## Testing the Email Function

### Quick Test Script
```javascript
// Test in browser console on your app
const testNewsletter = async () => {
  const session = await supabase.auth.getSession();
  
  const response = await fetch(
    'https://mmysvuymzabstnobdfvo.supabase.co/functions/v1/send-newsletter',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.data.session.access_token}`
      },
      body: JSON.stringify({
        recipientType: 'admins',
        subject: 'Test Email',
        htmlContent: '<h1>Test</h1><p>This is a test email.</p>',
        fromName: 'Thomas från YearWheel'
      })
    }
  );
  
  const result = await response.json();
  console.log('Result:', result);
};

testNewsletter();
```

### Expected Success Response
```json
{
  "success": true,
  "message": "Newsletter sent successfully to 1 recipients",
  "totalRecipients": 1,
  "successCount": 1,
  "errorCount": 0,
  "successfulBatches": 1,
  "failedBatches": 0
}
```

### Expected Error Response (Domain Not Verified)
```json
{
  "success": false,
  "message": "Partially sent: 0 succeeded, 1 failed",
  "totalRecipients": 1,
  "successCount": 0,
  "errorCount": 1,
  "successfulBatches": 0,
  "failedBatches": 1,
  "errors": [
    {
      "batch": 1,
      "error": "Domain hello@yearwheel.se is not verified",
      "status": 403,
      "recipients": 1
    }
  ]
}
```

## Deployment Status

✅ Updated function deployed: `supabase functions deploy send-newsletter`
✅ New version: 3 (deployed November 11, 2025)

## Next Steps

1. **Verify Resend API Key**: Check it starts with `re_`
2. **Verify Domain**: Ensure `yearwheel.se` is verified in Resend
3. **Test Send**: Use admin panel to send test newsletter
4. **Check Logs**: View detailed logs in Supabase dashboard
5. **Apply Migration**: If not done, apply `APPLY_MIGRATION_NOW.md`

## Contact Resend Support

If issues persist:
- Email: support@resend.com
- Dashboard: https://resend.com/overview
- Docs: https://resend.com/docs
