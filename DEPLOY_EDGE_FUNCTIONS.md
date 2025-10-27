# Deploying Supabase Edge Functions

## Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Supabase project linked: `supabase link --project-ref YOUR_PROJECT_REF`

## Deploy Google Sheets Export Function

### 1. Set Environment Variables in Supabase Dashboard

Go to your Supabase project → Settings → Edge Functions → Add secret:

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 2. Deploy the Function

```bash
# Deploy google-sheets-export function
supabase functions deploy google-sheets-export

# Or deploy all functions
supabase functions deploy
```

### 3. Verify Deployment

Check the Supabase dashboard under Edge Functions to confirm deployment status.

Test the endpoint:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/google-sheets-export
```

## Current Issue Fix

The CORS preflight issue has been fixed by:
- Adding `Access-Control-Allow-Methods: 'POST, OPTIONS'` header
- Explicitly setting `status: 200` on OPTIONS response

After deploying with the command above, the CORS error should be resolved.

## Troubleshooting

### CORS Errors
- Ensure the function is deployed with latest code
- Check browser console for specific CORS error details
- Verify headers in Edge Function response

### Authentication Errors
- Check that `Authorization` header is being sent from frontend
- Verify Supabase anon key is correct in environment
- Test with Supabase dashboard query editor first

### Google API Errors
- Verify Google OAuth credentials are set correctly
- Check that user has valid Google Sheets integration in `user_integrations` table
- Ensure OAuth scopes include Google Sheets access
