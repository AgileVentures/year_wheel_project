# Quiz Backend Integration Guide

## Current Status
✅ Frontend quiz component implemented  
✅ Quiz data and scoring configured  
✅ Landing pages integrated with pain hooks  
✅ Analytics events tracking  
⏳ Backend database schema ready (not deployed)  
⏳ Edge Function ready (not deployed)  
⏳ Email automation (not configured)

## Step 1: Deploy Database Schema

Run the migration to create the `quiz_leads` table:

```bash
# From project root
npx supabase db push

# Or manually apply the migration
psql <your-database-url> < supabase/migrations/999_quiz_leads.sql
```

### What This Creates:
- `quiz_leads` table with email, persona, answers, scores
- Indexes for performance
- RLS policies (public insert, admin read)
- Helper function `calculate_quiz_scores()`
- Analytics view `quiz_lead_analytics`

### Verify Installation:
```sql
-- Check table exists
SELECT * FROM quiz_leads LIMIT 1;

-- Check analytics view
SELECT * FROM quiz_lead_analytics;
```

## Step 2: Deploy Edge Function

Deploy the quiz submission handler:

```bash
# Deploy the function
npx supabase functions deploy submit-quiz

# Set environment variables (if needed)
npx supabase secrets set SENDGRID_API_KEY=your_key_here
npx supabase secrets set HUBSPOT_API_KEY=your_key_here
```

### Test the Function:
```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/submit-quiz \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "email": "test@example.com",
    "persona": "marketing",
    "answers": {
      "practice_1": {"text": "3-6 månader i förväg", "score": 3},
      "pain_current_1": [
        {"text": "Innehållskalender blir oöverskådlig", "score": 3}
      ]
    },
    "sourceUrl": "https://yearwheel.se/marknadsplanering"
  }'
```

Expected response:
```json
{
  "success": true,
  "leadId": "uuid-here",
  "painScore": 3,
  "readinessScore": 0,
  "message": "Tack för dina svar! Vi skickar din personliga rekommendation till din email."
}
```

## Step 3: Enable Backend in Frontend

Uncomment the API call in `PersonaQuiz.jsx`:

```javascript
// In handleEmailSubmit function, uncomment this block:
try {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-quiz`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        email,
        persona,
        answers,
        sourceUrl: window.location.href
      })
    }
  );

  const result = await response.json();
  if (!response.ok) {
    console.error('Quiz submission error:', result);
  }
} catch (error) {
  console.error('Failed to submit quiz:', error);
}
```

## Step 4: Set Up Email Automation

### Option A: Supabase Auth Emails
Use Supabase's built-in email templates (simplest):

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Create custom template for quiz results
3. Call from Edge Function using `auth.admin.sendRawEmail()`

### Option B: External Email Service (Recommended)
Use SendGrid, Postmark, or similar for better deliverability:

**SendGrid Setup:**
```bash
# 1. Sign up at sendgrid.com
# 2. Create API key
# 3. Set secret
npx supabase secrets set SENDGRID_API_KEY=SG.xxxxx

# 4. Create email template in SendGrid
# Template ID: marketing-quiz-results
# Template ID: project-quiz-results  
# Template ID: education-quiz-results
```

**Uncomment email sending code in Edge Function:**
```typescript
// In supabase/functions/submit-quiz/index.ts
// Uncomment the sendQuizResultEmail implementation
await sendQuizResultEmail(email, persona, painScore, readinessScore)
```

### Email Template Variables:
```handlebars
{{email}}
{{persona}}
{{pain_score}}
{{readiness_score}}
{{recommended_templates}}
{{signup_url}}
```

### Email Content Ideas:

**High Pain Score (>15):**
```
Subject: Vi kan hjälpa dig! Din marknadsplaneringsanalys

Hej!

Tack för att du tog vår quiz! Baserat på dina svar ser vi att ni har 
stora möjligheter att förbättra er planering.

Din analys:
• Smärtpoäng: {{pain_score}}/30 - Hög potential för förbättring
• Beredskap: {{readiness_score}}/10

YearWheel kan spara er flera timmar i veckan genom att:
✓ Ge överblick över hela året på 5 sekunder
✓ Samordna alla kanaler i samma vy
✓ Skapa professionella presentationer direkt

Rekommenderade mallar för dig:
• Marknadsplan 2026
• Social Media Kalender
• Content Production

→ Kom igång nu: {{signup_url}}

Vänliga hälsningar,
YearWheel-teamet
```

**Medium Pain Score (8-15):**
```
Subject: Bra start! Din planeringsanalys + tips

Hej!

Ni är på rätt väg! Baserat på dina svar ser vi att det finns 
utrymme att effektivisera ytterligare.

Din analys:
• Smärtpoäng: {{pain_score}}/30 - Ni har potential att optimera
• Beredskap: {{readiness_score}}/10

3 snabba vinster med YearWheel:
1. Snabbare rapporter till ledningen
2. Bättre samordning mellan kampanjer
3. Imponerande visuella presentationer

→ Testa gratis: {{signup_url}}
```

## Step 5: Set Up Admin Dashboard

Create a simple admin page to view quiz submissions:

```bash
# Create new page
touch src/pages/admin/QuizLeads.jsx
```

Basic implementation:
```javascript
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function QuizLeads() {
  const [leads, setLeads] = useState([]);
  
  useEffect(() => {
    loadLeads();
  }, []);
  
  const loadLeads = async () => {
    const { data, error } = await supabase
      .from('quiz_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (!error) setLeads(data);
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Quiz Leads</h1>
      
      {/* Analytics Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded shadow">
          <div className="text-2xl font-bold">{leads.length}</div>
          <div className="text-gray-600">Total Submissions</div>
        </div>
        {/* Add more stats */}
      </div>
      
      {/* Leads Table */}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Persona</th>
              <th className="px-6 py-3 text-left">Pain Score</th>
              <th className="px-6 py-3 text-left">Readiness</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => (
              <tr key={lead.id} className="border-t">
                <td className="px-6 py-4">{lead.email}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    {lead.persona}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`font-bold ${
                    lead.pain_score > 15 ? 'text-red-600' :
                    lead.pain_score > 8 ? 'text-orange-600' :
                    'text-green-600'
                  }`}>
                    {lead.pain_score}
                  </span>
                </td>
                <td className="px-6 py-4">{lead.readiness_score}</td>
                <td className="px-6 py-4">{lead.status}</td>
                <td className="px-6 py-4">
                  {new Date(lead.created_at).toLocaleDateString('sv-SE')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

Add route in your router configuration.

## Step 6: Monitor & Optimize

### Key Metrics to Track:

1. **Funnel Metrics:**
   ```sql
   -- Quiz start rate
   SELECT 
     DATE(created_at) as date,
     COUNT(*) as submissions
   FROM quiz_leads
   GROUP BY DATE(created_at)
   ORDER BY date DESC;
   ```

2. **Persona Distribution:**
   ```sql
   SELECT 
     persona,
     COUNT(*) as count,
     AVG(pain_score) as avg_pain,
     AVG(readiness_score) as avg_readiness
   FROM quiz_leads
   GROUP BY persona;
   ```

3. **Conversion Tracking:**
   ```sql
   SELECT 
     COUNT(*) as total_leads,
     COUNT(*) FILTER (WHERE converted_to_user_id IS NOT NULL) as converted,
     ROUND(
       COUNT(*) FILTER (WHERE converted_to_user_id IS NOT NULL)::NUMERIC / 
       COUNT(*)::NUMERIC * 100, 
       2
     ) as conversion_rate
   FROM quiz_leads;
   ```

### Google Analytics Goals:
- Quiz Started
- Quiz Completed
- Quiz Email Submitted
- Quiz → Signup Conversion

### A/B Testing Ideas:
1. Pain hook headlines
2. Question order
3. Number of questions (10 vs 7)
4. Email timing (immediate vs delayed)
5. Result message variations

## Troubleshooting

### Common Issues:

**Quiz submissions not showing up:**
```sql
-- Check RLS policies
SELECT * FROM quiz_leads; -- Should work as admin

-- Check if insert policy is active
SELECT * FROM pg_policies WHERE tablename = 'quiz_leads';
```

**Edge Function errors:**
```bash
# Check function logs
npx supabase functions logs submit-quiz

# Test locally
npx supabase functions serve submit-quiz
```

**Email not sending:**
- Verify API keys are set correctly
- Check SendGrid/Postmark dashboard for errors
- Test with a simple curl request first
- Check Edge Function logs for email-related errors

## Next Steps After Launch

1. **Week 1:** Monitor submission rate and completion rate
2. **Week 2:** Analyze pain scores by persona
3. **Week 3:** A/B test quiz placement on page
4. **Month 1:** Optimize email follow-up sequence
5. **Month 2:** Add CRM integration if needed
6. **Month 3:** Build predictive lead scoring model

---

**Ready to deploy?** Follow the steps in order and test each component before moving to the next.
