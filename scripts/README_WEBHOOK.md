# Setup Resend Webhook Script

This script automatically creates a webhook in Resend to receive email tracking events.

## Usage

### Option 1: Pass API key as argument
```bash
node scripts/setup-resend-webhook.js re_YOUR_API_KEY_HERE
```

### Option 2: Use environment variable
```bash
RESEND_API_KEY=re_YOUR_API_KEY_HERE node scripts/setup-resend-webhook.js
```

## Getting Your Resend API Key

1. Go to https://resend.com/api-keys
2. Copy your API key (starts with `re_`)
3. Use it with the script above

## What It Does

The script will:
1. ✅ Validate your API key format
2. ✅ Check for existing webhooks
3. ✅ Create a new webhook endpoint
4. ✅ Subscribe to all email events:
   - `email.sent`
   - `email.delivered`
   - `email.delivery_delayed`
   - `email.bounced`
   - `email.complained`
   - `email.opened`
   - `email.clicked`

## Output

The script will show:
- Existing webhooks (if any)
- Success/failure of webhook creation
- Webhook ID and details

## Troubleshooting

### "API key is invalid"
- Make sure your key starts with `re_`
- Get a fresh key from https://resend.com/api-keys

### "Webhook already exists"
- You can delete the existing webhook in Resend dashboard
- Or run with `--force` flag to create anyway

## Next Steps

After running this script:
1. Apply the database migration (see `docs/EMAIL_TRACKING_SETUP.md`)
2. Send a test newsletter
3. Check stats in Newsletter Manager

## Example

```bash
$ node scripts/setup-resend-webhook.js re_abc123xyz

🚀 Resend Webhook Setup

============================================================
✅ Using API key: re_abc123x...

📋 Checking for existing webhooks...
✨ No existing webhooks found

🔧 Creating Resend webhook...
📍 Endpoint: https://mmysvuymzabstnobdfvo.supabase.co/functions/v1/resend-webhook
📋 Events: email.sent, email.delivered, email.delivery_delayed, email.bounced, email.complained, email.opened, email.clicked

✅ Webhook created successfully!
📊 Webhook details:
{
  "id": "wh_abc123",
  "endpoint": "https://mmysvuymzabstnobdfvo.supabase.co/functions/v1/resend-webhook",
  "events": ["email.sent", "email.delivered", ...],
  "status": "active"
}

============================================================
✨ Setup complete!
```
