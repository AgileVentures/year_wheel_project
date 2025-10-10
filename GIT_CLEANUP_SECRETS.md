# 🚨 Git Cleanup Guide - Removing Committed Secrets

## Problem
You accidentally committed real Stripe API keys in `STRIPE_COMPLETE_SUMMARY.md`.

GitHub blocked the push because it detected these secrets.

## Solution: Amend the Commit to Remove Secrets

### Step 1: Edit the File to Remove Real Keys

Open `STRIPE_COMPLETE_SUMMARY.md` and replace the real keys with placeholders:

**Find any real Stripe keys (starting with `sk_live_` or `whsec_`)**

**Replace with placeholders:**
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_YOUR_KEY_HERE
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

### Step 2: Stage the Corrected File
```bash
git add STRIPE_COMPLETE_SUMMARY.md
git add .gitignore
git add STRIPE_IMPLEMENTATION_GUIDE.md
git add STRIPE_QUICKSTART.md
```

### Step 3: Amend the Last Commit
```bash
git commit --amend --no-edit
```

This replaces the last commit with a corrected version (no secrets).

### Step 4: Force Push to Remote
```bash
git push origin main --force
```

⚠️ **Important**: Force push is safe here because you're only updating your own recent commit.

## Alternative: Create a New Commit

If you prefer not to rewrite history:

### Step 1: Fix the Files
Same as above - replace real keys with placeholders.

### Step 2: Commit the Fix
```bash
git add STRIPE_COMPLETE_SUMMARY.md .gitignore STRIPE_IMPLEMENTATION_GUIDE.md STRIPE_QUICKSTART.md
git commit -m "Remove accidentally committed secrets"
```

### Step 3: Push Normally
```bash
git push origin main
```

## 🔒 Security Note

**Your secrets are now exposed!** Even though they weren't pushed to GitHub, you should:

1. **Immediately rotate your Stripe keys:**
   - Go to Stripe Dashboard → Developers → API keys
   - Delete the exposed secret key
   - Create a new secret key
   - Update your production environment with the new key

2. **Rotate webhook secret:**
   - Delete the webhook endpoint
   - Create a new one with a new secret
   - Update Supabase secrets

3. **Check Supabase service role key:**
   - If you committed the real service role key, rotate it too
   - Supabase Dashboard → Settings → API → Generate new key

## Prevention

Always use placeholders in documentation:
- ✅ `sk_live_YOUR_KEY_HERE`
- ✅ `sk_test_...`
- ❌ Never commit real keys

Your `.gitignore` is now updated to prevent `.env` files from being committed.

## Quick Command Summary

```bash
# 1. Edit STRIPE_COMPLETE_SUMMARY.md (remove real keys)
# 2. Stage all changes
git add STRIPE_COMPLETE_SUMMARY.md .gitignore STRIPE_IMPLEMENTATION_GUIDE.md STRIPE_QUICKSTART.md

# 3. Amend commit
git commit --amend --no-edit

# 4. Force push
git push origin main --force
```

## Need Help?

If you're unsure about force pushing, just create a new commit instead. It's safer and achieves the same result.
