# Quiz Lead Generation - Demo Script

## How to Test

1. **Start the development server:**
   ```bash
   yarn dev
   ```

2. **Navigate to one of the three landing pages:**
   - http://localhost:5173/marknadsplanering
   - http://localhost:5173/projektplanering
   - http://localhost:5173/skola-och-utbildning

## What You'll See

### Initial State - Pain Hook Section
When you scroll down past the features section, you'll see:

**Large white card with:**
- Pain hook headline: "Känner du igen dig?" / "Frustrerad över...?"
- 3 red X bullets with specific pain points
- Results hook: "Är du redo att..."
- 3 green checkmark bullets with benefits
- Gradient box with quiz CTA: "Starta quiz - få din rekommendation"
- 2-minute time commitment
- Social proof text

### After Clicking Quiz Button
The section transforms to show:

**Quiz Interface:**
- Progress bar (Question X av 10) with percentage
- Category badge (Best Practice, Din nuvarande situation, etc.)
- Question text (large, bold)
- Answer options as clickable cards
  - Radio buttons for single choice
  - Checkboxes for multiple choice
  - Text area for open questions
- Navigation buttons (Föregående / Nästa)
- Visual feedback on selection (blue border, blue background)

### Quiz Completion - Results Page
After answering all 10 questions:

**Results Screen:**
- Green checkmark icon
- "Tack för dina svar!" headline
- Personalized message based on pain score:
  - High score: Urgent, problem-solution focus
  - Medium score: Benefits focus
  - Low score: Next-level improvement focus
- Email input form
- "Få min rekommendation" submit button
- Privacy reassurance text

### After Email Submission
- Redirect to: `/auth?mode=signup&source=quiz&persona=marketing`
- User can complete signup with context

## Quiz Questions Preview

### Marketing Persona
1. Hur långt i förväg planerar ni kampanjer?
2. Hur koordinerar ni innehåll mellan kanaler?
3. Hur ofta rapporterar ni till ledning?
4. Vilka utmaningar upplever ni? (multi-select)
5. Hur mycket tid på administration per vecka?
6. Viktigaste resultat med bättre verktyg?
7. Hur skulle framgång se ut om 3 månader?
8. Vad hindrar perfekt marknadsplanering?
9. Hur viktigt är visuell delning?
10. Vad säger du om YearWheel-lösningen?

### Project Management Persona
1. Vilket projektverktyg använder ni?
2. Hur många parallella projekt?
3. Hur ofta visar ni projektöversikter?
4. Vilka utmaningar har ni? (multi-select)
5. Hur stor andel tid går till administration?
6. Vad är viktigast i projektverktyg?
7. Hur skulle framgång se ut om 3 månader?
8. Varför har ni inte perfekt verktyg idag?
9. Hur viktigt är lätt att lära?
10. Vad säger du om YearWheel-lösningen?

### Education Persona
1. Hur planerar ni läsåret idag?
2. Hur stor är din organisation?
3. Hur ofta kommunicerar ni med föräldrar?
4. Vilka utmaningar upplever ni? (multi-select)
5. Hur mycket tid på planering och kommunikation?
6. Vad skulle vara viktigast för dig?
7. Hur skulle framgång se ut nästa läsår?
8. Vad hindrar perfekt läsårsplanering?
9. Hur viktigt att verktyget är enkelt?
10. Vad säger du om YearWheel-lösningen?

## Scoring Examples

### High Pain Score (>15 points)
**Example scenario:**
- Plans week-by-week (1 point)
- No central calendar (0 points)
- Rarely reports forward plans (0 points)
- Selects ALL pain points (17 points)
- Spends 6+ hours/week on admin (7 points)
- **Total: 25 points**

**Result message:**
"Baserat på dina svar ser vi att ni har stora möjligheter att förbättra er marknadsplanering! YearWheel kan spara er flera timmar i veckan och ge er den visuella översikt ni saknar."

### Medium Pain Score (8-15 points)
**Example scenario:**
- Plans 3-6 months ahead (3 points)
- Uses shared Excel (3 points)
- Reports quarterly (3 points)
- Selects 2 pain points (7 points)
- Spends 1-3 hours/week (3 points)
- **Total: 12 points**

**Result message:**
"Ni är på rätt väg men det finns utrymme att effektivisera! YearWheel kan hjälpa er samordna kampanjer bättre och imponera på stakeholders."

### Low Pain Score (<8 points)
**Example scenario:**
- Plans yearly with quarterly review (5 points)
- Has central calendar (5 points)
- Reports monthly (5 points)
- Selects 1 pain point (3 points)
- Spends <1 hour/week (1 point)
- **Total: 6 points**

**Result message:**
"Ni verkar ha en fungerande process redan! YearWheel kan ändå hjälpa er ta steget till nästa nivå med visuella presentationer och AI-assistans."

## Analytics Events to Monitor

Check browser console for these events:
```javascript
// When quiz is completed
{
  event: 'quiz_completed',
  persona: 'marketing',
  pain_score: 25,
  readiness_score: 10
}

// When email is submitted
{
  event: 'quiz_lead_generated',
  persona: 'marketing',
  email: 'user@example.com'
}

// When lead is generated
{
  event: 'generate_lead',
  value: 1,
  currency: 'SEK',
  method: 'quiz'
}
```

## Expected User Behavior

### High Intent Users (Will Complete Quiz)
- Read pain points → Relate strongly
- Click quiz button immediately
- Answer all questions thoughtfully
- Provide real email
- Convert to signup

### Medium Intent Users (May Complete)
- Scan pain points → Some resonance
- Click quiz button out of curiosity
- May abandon mid-quiz (track with analytics)
- If complete, likely to provide email
- May return later to signup

### Low Intent Users (Won't Complete)
- Skim past quiz section
- Focus on features/templates instead
- May bookmark for later
- Likely not in buying mode yet

## A/B Test Ideas

1. **Headline variations:**
   - Current: "Känner du igen dig?"
   - Alt A: "Frustrerad över planeringen?"
   - Alt B: "Finns det en bättre väg?"

2. **Time commitment:**
   - Current: "2 minuter"
   - Alt A: "10 frågor"
   - Alt B: "Mindre än 3 minuter"

3. **CTA button text:**
   - Current: "Starta quiz - få din rekommendation"
   - Alt A: "Hitta din lösning (2 min)"
   - Alt B: "Se om YearWheel passar dig"

4. **Email prompt:**
   - Current: "Få din personliga rekommendation via email"
   - Alt A: "Vart ska vi skicka dina resultat?"
   - Alt B: "Se din fullständiga analys (via email)"

## Next Development Steps

1. **Backend Integration:**
   - Create Supabase table for quiz leads
   - Edge function to store results
   - Webhook to email service

2. **Email Automation:**
   - Welcome email with results summary
   - Persona-specific template recommendations
   - Follow-up sequence (day 1, 3, 7)

3. **Admin Dashboard:**
   - View all quiz submissions
   - Filter by persona and pain score
   - Export leads for CRM

4. **Optimization:**
   - Track drop-off points in quiz
   - Optimize question order
   - Test different scoring thresholds
   - Refine result messages

---

**Ready to test?** Run `yarn dev` and visit `/marknadsplanering` 🚀
