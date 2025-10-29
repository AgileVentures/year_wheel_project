# Deploy Affiliate Code Generator Edge Function

## Deploy to Supabase

```bash
# From project root
supabase functions deploy generate-affiliate-code

# Or if you need to specify the project
supabase functions deploy generate-affiliate-code --project-ref YOUR_PROJECT_REF
```

## Set Environment Variables (if needed)

If you need to set a custom APP_URL:

```bash
supabase secrets set APP_URL=https://yourapp.com
```

## Test the Function

```bash
# Get your access token from Supabase Dashboard or auth
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/generate-affiliate-code' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "organizationId": "YOUR_ORG_ID",
    "baseName": "summer-2025"
  }'
```

## Expected Response

```json
{
  "code": "summer-2025",
  "suggestedUrl": "https://yourapp.com?ref=summer-2025"
}
```

If the code already exists, it will append a random suffix:
```json
{
  "code": "summer-2025-a3f9",
  "suggestedUrl": "https://yourapp.com?ref=summer-2025-a3f9"
}
```

## Function Features

- ✅ Generates unique affiliate link codes
- ✅ Sanitizes user input (removes special characters, converts to lowercase)
- ✅ Adds random suffix if collision detected
- ✅ Verifies user is member of the organization
- ✅ Falls back to fully random code if no baseName provided
- ✅ Returns suggested full URL for easy copying

## Integration

The AffiliateDashboard component now calls this function automatically when creating a new link. The code field is optional - if empty, a random code will be generated. If provided, it will be used as the base with collision handling.
