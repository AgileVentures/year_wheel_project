# 🚀 AI Assistant Quick Start

## Step 1: Add Your OpenAI API Key

Open `.env.local` and replace the placeholder:

```bash
VITE_OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

Get your key from: https://platform.openai.com/api-keys

## Step 2: Restart Dev Server

```bash
yarn dev
```

## Step 3: Open a Wheel

1. Go to Dashboard
2. Open any saved wheel (or create a new one)
3. Look for the **AI button** in the header (purple/blue gradient with sparkle icon)

## Step 4: Try These Prompts

### Create a Ring:
```
Skapa en yttre ring för mina projekt
```

### Create Activity Group:
```
Lägg till en aktivitetsgrupp för marknadsföring med grön färg
```

### Create Activity:
```
Skapa en aktivitet "Produktlansering" från 2025-03-15 till 2025-03-30 på ring kampanjer i kanpanjsgruppen
```

### Analyze Wheel:
```
Analysera mitt hjul och ge tips
```

### Create New Year:
```
Skapa en ny sida för 2026 med samma struktur
```

## 💡 Tips

1. **Ask for ring IDs first**: "Vilka ringar finns?"
2. **Be specific with dates**: Use YYYY-MM-DD format
3. **Start simple**: Create structure before adding activities
4. **Check context**: AI shows current wheel stats in greeting

## 🎯 Features

✅ Create rings (inner/outer)
✅ Create activity groups
✅ Create labels
✅ Add activities/events
✅ Create year pages
✅ Analyze wheel structure
✅ Delete rings
✅ Real-time streaming responses
✅ Auto-updates wheel

## 📊 Cost

- ~$0.01-0.03 per conversation
- Very affordable for daily use
- Uses GPT-4 Turbo

## 🐛 Troubleshooting

**AI button not showing?**
- Make sure wheel is saved to database (not localStorage)
- Check you're logged in

**"API key not configured" error?**
- Verify `.env.local` has correct key
- Restart dev server

**Tool execution fails?**
- Check console for errors
- Verify ring/group IDs exist
- Try simpler prompts

## 📚 Full Documentation

See `AI_ASSISTANT_GUIDE.md` for complete details.

---

**Ready to start!** Click the AI button and say "Hej!" 🎉
