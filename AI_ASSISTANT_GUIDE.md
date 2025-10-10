# AI Assistant for Year Wheel - Implementation Guide

## 🎉 Implementation Complete!

The AI Assistant has been successfully integrated into your Year Wheel application. Here's everything you need to know.

## 📋 What Was Implemented

### 1. **Core Dependencies** ✅
- `ai` - Vercel AI SDK for streaming and tool execution
- `@ai-sdk/openai` - OpenAI integration
- `zod` - Type validation for tool parameters

### 2. **Service Layer** ✅
- `src/services/aiWheelService.js` - AI tool execution functions
  - `aiCreateRing()` - Create inner/outer rings
  - `aiCreateActivityGroup()` - Create activity categories
  - `aiCreateLabel()` - Create labels
  - `aiCreateItem()` - Create activities/events
  - `aiCreatePage()` - Create year pages
  - `aiUpdateColors()` - Update wheel colors
  - `aiDeleteRing()` - Delete rings
  - `aiAnalyzeWheel()` - Analyze wheel structure
  - `getWheelContext()` - Get wheel data for AI

### 3. **UI Component** ✅
- `src/components/AIAssistant.jsx` - Floating AI chat interface
  - Floating button in bottom-right corner
  - Expandable chat window
  - Real-time streaming responses
  - Tool execution indicators
  - Auto-scroll messages
  - Loading states

### 4. **Integration** ✅
- Added to `App.jsx` WheelEditor component
- AI button in Header component
- Context-aware conversations
- Automatic wheel updates after actions

### 5. **Edge Function** ✅
- `supabase/functions/ai-chat/index.ts` - Server-side proxy (optional)

## 🚀 How to Use

### Step 1: Add Your OpenAI API Key

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add it to `.env.local`:

```bash
VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
```

3. Restart your dev server:

```bash
yarn dev
```

### Step 2: Access the AI Assistant

1. Open a wheel in the editor (must be saved to database)
2. Click the **AI** button in the header (purple/blue gradient)
3. Or click the floating sparkle button in bottom-right corner

### Step 3: Start Chatting!

**Example prompts:**

```
"Skapa en yttre ring för mina projekt"
"Lägg till en aktivitetsgrupp för marknadsföring"
"Skapa en aktivitet för 'Produktlansering' från 15 mars till 30 mars på ring 1"
"Skapa en ny sida för 2026 med samma struktur"
"Analysera mitt hjul och ge tips"
```

## 🎯 AI Capabilities

### What the AI Can Do:

1. **Create Rings**
   - Inner rings (with month data)
   - Outer rings (for activities)
   - Auto-assigns colors from palette

2. **Create Activity Groups**
   - Categories for organizing activities
   - Custom colors
   - Visibility toggle

3. **Create Activities**
   - Specify start/end dates
   - Assign to rings and groups
   - Optional labels and times

4. **Create Pages**
   - New year pages
   - Copy structure from current page
   - Blank pages

5. **Analyze Wheel**
   - Structure insights
   - Suggestions for improvement
   - Usage statistics

6. **Delete Elements**
   - Remove rings
   - Cascading deletion of related items

### What the AI CANNOT Do:

- Delete activities (not yet implemented)
- Edit existing items (use UI for this)
- Change wheel settings (use UI for this)
- Access other users' wheels (security)

## 📊 Cost Estimation

### OpenAI API Costs (GPT-4 Turbo):
- **Input**: $0.01 per 1K tokens
- **Output**: $0.03 per 1K tokens

### Typical Usage:
- Average conversation: ~800 tokens = **$0.02**
- Creating a ring: ~500 tokens = **$0.01**
- Complex multi-step action: ~1200 tokens = **$0.03**

### Monthly Estimates:
- Light use (50 conversations): **~$1**
- Medium use (200 conversations): **~$4**
- Heavy use (500 conversations): **~$10**

**Very affordable for most use cases!**

## 🔧 Troubleshooting

### Issue: "OpenAI API key not configured"
**Solution**: 
1. Check `.env.local` has `VITE_OPENAI_API_KEY`
2. Restart dev server after adding key
3. Verify no typos in variable name (must be exact)

### Issue: AI button not showing
**Solution**:
- AI only works for database-saved wheels (not localStorage mode)
- Make sure wheel has a `wheelId` (saved to Supabase)
- Check you're logged in

### Issue: Tool execution fails
**Solution**:
1. Check console for errors
2. Verify wheel context loaded (rings, groups exist)
3. Ensure ring/group IDs are valid
4. Try simpler prompts first

### Issue: No response from AI
**Solution**:
1. Check browser console for errors
2. Verify API key is valid
3. Check internet connection
4. Try refreshing page

## 🎨 Customization

### Change AI Model:

In `AIAssistant.jsx`, line 116:
```javascript
model: openai('gpt-4-turbo', { apiKey })
// Change to:
model: openai('gpt-3.5-turbo', { apiKey }) // Cheaper, faster
// Or:
model: openai('gpt-4o', { apiKey }) // Most powerful
```

### Adjust Max Steps:

In `AIAssistant.jsx`, line 227:
```javascript
maxSteps: 5 // Allow more/less multi-step operations
```

### Customize Button Position:

In `AIAssistant.jsx`, line 253:
```javascript
className="fixed bottom-6 right-6 ..."
// Change to bottom-left:
className="fixed bottom-6 left-6 ..."
```

## 🔐 Security Considerations

### Current Implementation:
- ✅ API key stored in env variables
- ✅ Client-side OpenAI calls (simple, fast)
- ⚠️ API key visible in browser (low risk for personal use)

### For Production (Recommended):
1. **Use Supabase Edge Function** (already created!)
   - Store API key server-side
   - Deploy: `supabase functions deploy ai-chat`
   - Update component to call edge function instead

2. **Add Rate Limiting**
   - Prevent API abuse
   - Use Supabase RLS policies

3. **Subscription Gating**
   - Check user tier before allowing AI
   - Add to `profiles` table check

## 📚 Next Steps

### Immediate:
1. ✅ Test basic functionality
2. ✅ Try creating rings and activities
3. ✅ Verify wheel updates correctly

### Short-term:
- [ ] Add more example prompts in greeting
- [ ] Improve error messages
- [ ] Add conversation history persistence

### Long-term:
- [ ] Add voice input support
- [ ] Multi-language support
- [ ] Custom AI personas (formal/casual)
- [ ] Template suggestions
- [ ] Batch operations (create 10 activities at once)

## 🐛 Known Limitations

1. **No Edit Support**: AI can create but not edit existing items
2. **Date Format**: Must use YYYY-MM-DD format
3. **Ring IDs**: Must specify exact ring ID from context
4. **One Wheel at a Time**: AI only knows current wheel

## 💡 Tips for Best Results

### 1. Be Specific:
❌ "Skapa några aktiviteter"
✅ "Skapa 3 aktiviteter för marknadsföring i mars på ring 2"

### 2. Provide Context:
❌ "Lägg till en ring"
✅ "Skapa en yttre ring för projekt som heter 'Kundprojekt'"

### 3. Use Step-by-Step:
❌ "Sätt upp ett komplett projekt med 10 aktiviteter"
✅ First: "Skapa en aktivitetsgrupp för projekt"
✅ Then: "Lägg till aktiviteter i projektgruppen"

### 4. Verify IDs:
- Ask AI to "Analysera mitt hjul" first
- Check ring and group IDs in the response
- Use those IDs in your prompts

## 🎓 Example Workflows

### Setup a Project Wheel:
```
1. "Skapa 4 yttre ringar för Q1, Q2, Q3, Q4"
2. "Skapa aktivitetsgrupper för marknadsföring, utveckling, försäljning"
3. "Lägg till aktivitet 'Produktlansering' från 2025-03-01 till 2025-03-31 på Q1-ringen i marknadsföringsgruppen"
4. "Analysera mitt hjul"
```

### Plan Multiple Years:
```
1. "Skapa en sida för 2026 med samma struktur"
2. "Skapa en sida för 2027 med samma struktur"
```

### Quick Analysis:
```
"Analysera mitt hjul och ge förslag på förbättringar"
```

## 📞 Support

### Issues?
1. Check this guide first
2. Look at browser console for errors
3. Check `.env.local` configuration
4. Verify OpenAI API key is valid

### Need Help?
- GitHub Issues: [your-repo-url]
- Email: [your-email]

---

**🎉 Congratulations! Your Year Wheel now has AI superpowers!**

Start by adding your OpenAI API key and try the example prompts above.
