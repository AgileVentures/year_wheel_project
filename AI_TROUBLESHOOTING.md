# AI Assistant - Troubleshooting Guide

## ✅ Fixes Applied: API Key & Instance Configuration

The errors `AI_LoadAPIKeyError` and `openaiInstance is not a function` have been fixed.

**What was changed:**
```javascript
// Fix 1: Import the correct function
import { createOpenAI } from '@ai-sdk/openai'; // Changed from 'openai'

// Fix 2: Use createOpenAI instead of openai
const openaiInstance = createOpenAI({
  apiKey: apiKey,
});

const result = await streamText({
  model: openaiInstance('gpt-4-turbo'),
  messages: chatMessages,
  ...
});
```

**Timeline:**
- ✅ Fix 1: Changed API key passing method
- ✅ Fix 2: Changed from `openai()` to `createOpenAI()`
- 🎯 Status: Ready to test!

## 🧪 How to Test

1. **Refresh your browser** - Vite auto-reloads, but a manual refresh ensures everything is updated
2. **Open a wheel** - Must be a database-saved wheel (not localStorage)
3. **Click the AI button** - Purple/blue gradient button in header with sparkle icon
4. **Send a test message**: `"Hej!"`

### Expected Behavior:
- ✅ Chat window opens
- ✅ You see a greeting message with wheel context
- ✅ No console errors about API key
- ✅ You can send messages
- ✅ AI responds within 1-3 seconds

## 🔍 Other Issues You May Encounter

### 1. Auth Error: "Invalid Refresh Token"

**Error Message:**
```
AuthApiError: Invalid Refresh Token: Refresh Token Not Found
```

**Cause:** Your Supabase auth session expired or is invalid.

**Fix:**
1. Clear your browser's localStorage/cookies for this site
2. Log out and log back in
3. Or just refresh the page and log in again

**Permanent Fix:**
This is normal behavior - sessions expire. The app should handle this gracefully.

---

### 2. Stripe Warning: "must use HTTPS"

**Warning Message:**
```
You may test your Stripe.js integration over HTTP. However, live Stripe.js integrations must use HTTPS.
```

**Cause:** You're testing on `http://localhost` instead of `https://`

**Fix:**
- Ignore this warning in development (it's safe)
- For production, deploy to a domain with HTTPS (Netlify does this automatically)

---

### 3. AI Button Not Showing

**Symptoms:** No AI button in header

**Causes & Fixes:**

1. **Not a database wheel**
   - Check: Does the URL have a `wheelId`? (`/wheel/[some-uuid]`)
   - Fix: Save the wheel first, or create a new one from Dashboard

2. **Not logged in**
   - Check: Do you see user info in header?
   - Fix: Log in through `/auth` page

3. **Props not passed**
   - Check: Console for React prop warnings
   - Fix: Already implemented, but verify `onToggleAI` is passed to Header

---

### 4. AI Not Responding

**Symptoms:** Message sent but no response

**Possible Causes:**

1. **API Key Invalid**
   - Check: Go to https://platform.openai.com/api-keys
   - Verify: Key hasn't been revoked
   - Test: Create a new key if needed

2. **Network Issues**
   - Check: Browser Network tab shows failed requests
   - Fix: Check internet connection
   - Fix: Verify OpenAI API status at https://status.openai.com

3. **Rate Limiting**
   - Check: OpenAI usage dashboard
   - Fix: Wait a few minutes or upgrade plan

4. **Context Too Large**
   - Check: Very large wheels might exceed token limits
   - Fix: Ask simpler questions first

---

### 5. Tool Execution Fails

**Symptoms:** AI responds but changes don't appear on wheel

**Possible Causes:**

1. **Invalid Ring/Group IDs**
   - Check: Ask AI to "Analysera mitt hjul" first to get valid IDs
   - Fix: Use the IDs from that response

2. **Database Error**
   - Check: Browser console for error messages
   - Fix: Verify Supabase connection is working

3. **Auto-save Disabled**
   - Check: `autoSaveEnabled` state
   - Fix: Already enabled by default

---

### 6. Wheel Not Updating After AI Action

**Symptoms:** AI says "Ring skapad" but nothing appears

**Causes & Fixes:**

1. **Callback Not Fired**
   - Check: `onWheelUpdate` prop is passed
   - Fix: Already implemented in App.jsx

2. **Cache Issue**
   - Fix: Manually refresh the page
   - Fix: Clear browser cache

3. **Realtime Sync Conflict**
   - Fix: Wait 1-2 seconds, then refresh

---

## 🐛 Debug Mode

To see detailed AI logs, open browser console and look for:

```javascript
// Successful flow:
[AIAssistant] Fetching wheel context
[aiWheelService] Creating ring: {...}
[wheelService] Saving wheel data
✓ Ring created successfully

// Error flow:
[AIAssistant] Error: {error message}
[aiWheelService] Error creating ring: {details}
```

---

## ✅ Verification Checklist

Run through this checklist to verify everything works:

- [ ] Browser console shows no errors (ignore Stripe HTTPS warning)
- [ ] AI button appears in header (purple/blue gradient)
- [ ] Click AI button opens chat window
- [ ] Greeting message shows with wheel stats
- [ ] Sending "Hej!" gets a Swedish response
- [ ] Creating a ring: "Skapa en yttre ring för test" works
- [ ] Ring appears on wheel after ~3-5 seconds
- [ ] No console errors during tool execution

---

## 🆘 Still Having Issues?

### Quick Diagnostics:

1. **Open Browser Console** (F12)
2. **Go to Console tab**
3. **Clear all messages**
4. **Try AI action again**
5. **Copy error messages**

### Common Error Patterns:

**Pattern 1: API Key Errors**
```
AI_LoadAPIKeyError: OpenAI API key is missing
```
→ Already fixed! Refresh browser.

**Pattern 2: Auth Errors**
```
AuthApiError: Invalid Refresh Token
```
→ Log out and log back in.

**Pattern 3: Network Errors**
```
Failed to fetch
TypeError: NetworkError
```
→ Check internet connection and OpenAI status.

**Pattern 4: Tool Errors**
```
Error creating ring: Ring with ID X not found
```
→ Use valid IDs from wheel context.

---

## 📊 Performance Expectations

### Normal Response Times:
- **Chat opens**: < 100ms (instant)
- **AI greeting**: < 500ms
- **First response**: 1-2 seconds
- **Tool execution**: 0.5-2 seconds
- **Wheel refresh**: 200-500ms
- **Total flow**: 3-5 seconds

### If Slower:
- Check internet speed
- Check OpenAI API status
- Try simpler prompts
- Close other browser tabs

---

## 🎯 Test Scenarios

### Scenario 1: Create a Ring
```
User: "Skapa en yttre ring för mina projekt"
Expected: Ring appears on wheel within 5 seconds
```

### Scenario 2: Create Activity Group
```
User: "Lägg till en aktivitetsgrupp för marknadsföring med grön färg"
Expected: Group appears in sidebar
```

### Scenario 3: Analyze Wheel
```
User: "Analysera mitt hjul"
Expected: Statistics and insights returned
```

### Scenario 4: Create Activity
```
User: "Vilka ringar finns?"
AI: "Ring 1 (ID: abc-123), Ring 2 (ID: def-456)"
User: "Skapa aktivitet Test från 2025-03-01 till 2025-03-31 på ring abc-123"
Expected: Activity appears on wheel
```

---

## 🔧 Advanced Debugging

### Enable Verbose Logging:

Add to `AIAssistant.jsx` after line 72:
```javascript
console.log('[AIAssistant] API Key:', apiKey ? 'Present' : 'Missing');
console.log('[AIAssistant] Wheel Context:', wheelContext);
```

### Check Network Requests:

1. Open DevTools → Network tab
2. Filter by "api.openai.com"
3. Send AI message
4. Check request status (should be 200)
5. Check response preview

### Verify Environment Variables:

Open browser console and run:
```javascript
console.log('OpenAI Key:', import.meta.env.VITE_OPENAI_API_KEY ? 'Set' : 'Missing');
```

---

## 📞 Getting Help

If you've tried everything and it still doesn't work:

1. **Check documentation** again
2. **Copy error messages** from console
3. **Note what you tried** to fix it
4. **Check OpenAI usage** dashboard for clues

---

**Last Updated:** October 2025
**Status:** API Key fix applied ✅
