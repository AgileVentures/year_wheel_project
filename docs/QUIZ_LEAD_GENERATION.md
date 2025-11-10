# Quiz-Based Lead Generation Implementation

## Overview
Implemented interactive persona-based quizzes on three key landing pages to qualify leads and provide personalized recommendations. The quiz system uses pain hooks and results-based messaging to convert visitors into qualified leads.

## Implementation Summary

### New Components

#### 1. `PersonaQuiz.jsx` Component
Interactive quiz component with:
- **Progress tracking** with visual progress bar
- **Multiple question types**: single choice, multiple choice, text input
- **Smart scoring system** for pain and readiness assessment
- **Email capture** on results page
- **Analytics integration** with Google Analytics events
- **Responsive design** with clear UI feedback

#### 2. `quizData.js` Configuration
Three quiz configurations tailored to each persona:

**Marketing Quiz** (`marketingQuiz`)
- Target: Marknadsavdelningar, content creators, byråer
- Focus: Campaign coordination, content calendar chaos, stakeholder presentations
- 10 questions covering planning practices, current pain points, desired outcomes

**Project Management Quiz** (`projectQuiz`)
- Target: Projektledare, småföretag, byråer
- Focus: Finding balance between Excel simplicity and Asana complexity
- 10 questions about project tools, resource conflicts, client communication

**Education Quiz** (`educationQuiz`)
- Target: Skolledare, rektorer, lärare, kommunala förvaltningar
- Focus: Academic year planning, parent communication, team coordination
- 10 questions about school planning, communication challenges, tool adoption

### Quiz Flow (Based on Document Framework)

Each quiz follows the strategic framework:

1. **Best Practices** (3 questions)
   - Understanding current planning maturity
   - Identifying tool usage patterns
   - Assessing reporting frequency

2. **Current Situation** (2 questions)
   - Pain point identification with multi-select
   - Time spent on admin tasks

3. **Desired Outcome** (2 questions)
   - Priority outcomes
   - Success metrics in 3 months

4. **Obstacles** (2 questions)
   - Current barriers to success
   - Feature importance assessment

5. **Solution Fit** (1 question)
   - Readiness to adopt YearWheel
   - Buying intent measurement

### Landing Page Integration

Each landing page now includes:

#### Pain Hook Section (Before Quiz)
```
"Känner du igen dig?"
✗ Specific pain point 1
✗ Specific pain point 2
✗ Specific pain point 3
```

#### Results Hook Section
```
"Är du redo att..."
✓ Specific benefit 1
✓ Specific benefit 2
✓ Specific benefit 3
```

#### Quiz CTA
- 2-minute time commitment (reduces friction)
- Personalized recommendation promise
- Visual appeal with gradient backgrounds
- Clear value proposition

#### Quiz Display
- Full-screen quiz with progress tracking
- Category badges for each question type
- Results page with:
  - Scoring-based personalized message
  - Email capture form
  - Direct conversion to signup with context

## Pages Updated

1. **Marknadsplanering** (`/marknadsplanering`)
   - Red/orange/yellow gradient for attention
   - Marketing-specific pain hooks
   - Quiz positioned after use cases, before templates

2. **Projektplanering** (`/projektplanering`)
   - Orange/amber/yellow gradient
   - "Frustrerad över projektverktygen?" hook
   - Project management pain points

3. **SkolaUtbildning** (`/skola-och-utbildning`)
   - Green/emerald/teal gradient
   - Education-specific language
   - Focus on parent communication

## Analytics Integration

### Events Tracked
```javascript
// Quiz completion
gtag('event', 'quiz_completed', {
  persona: 'marketing|project|education',
  pain_score: Number,
  readiness_score: Number
});

// Lead generation
gtag('event', 'generate_lead', {
  value: 1,
  currency: 'SEK',
  method: 'quiz'
});

// Email submission
gtag('event', 'quiz_lead_generated', {
  persona: 'marketing|project|education',
  email: String
});
```

## Scoring System

### Pain Score Calculation
- Questions with `pain_` prefix contribute to pain score
- Higher score = more pain = better fit for solution
- Range: 0-30+ points

### Readiness Score
- Questions with `readiness_` prefix measure buying intent
- Used for lead qualification
- Range: 0-10 points

### Result Messages
Three tiers of messaging based on pain score:
- **High (>15 points)**: Urgent need, immediate value proposition
- **Medium (8-15 points)**: Good fit, focus on benefits
- **Low (<8 points)**: Process is working, suggest next-level improvements

## User Flow

1. **Landing page visit** → See pain hooks
2. **Click "Starta quiz"** → State changes to show quiz
3. **Answer 10 questions** → Progress tracked, answers stored
4. **View results** → Personalized message based on scoring
5. **Enter email** → Lead captured
6. **Submit** → Redirected to signup with context parameters
   - URL: `/auth?mode=signup&source=quiz&persona=marketing`

## TODO: Backend Integration

Currently, quiz results are logged to console. Next steps:

1. **Create Supabase table**: `quiz_leads`
```sql
CREATE TABLE quiz_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  persona TEXT NOT NULL,
  answers JSONB NOT NULL,
  pain_score INTEGER,
  readiness_score INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

2. **Create Edge Function**: `submit-quiz`
   - Store results in database
   - Trigger email with personalized recommendations
   - Integrate with CRM (if needed)

3. **Email Automation**
   - Send personalized follow-up based on persona
   - Include template recommendations
   - Provide direct signup link with pre-populated data

## Benefits

### For Users
- **Self-qualification**: Users understand if tool is right for them
- **Personalized experience**: Tailored messaging based on answers
- **Educational**: Learn best practices through questions
- **Low commitment**: 2 minutes, no credit card

### For Business
- **Qualified leads**: High-intent users who completed quiz
- **Rich data**: Detailed understanding of user needs
- **Segmentation**: Automatic persona identification
- **Conversion context**: Know exactly what user cares about
- **Follow-up intelligence**: Send targeted content based on answers

## Key Design Decisions

1. **No quiz on initial load**: Reduces overwhelm, shows value first
2. **Progress bar**: Reduces abandonment, shows commitment level
3. **Visual feedback**: Immediate response to selections
4. **Category badges**: Context for each question
5. **Email at end only**: No friction during quiz
6. **Gradient backgrounds**: Visually distinct from main content
7. **Mobile-first design**: Fully responsive quiz interface

## A/B Testing Opportunities

Future optimization tests:
- Quiz placement (before vs after templates)
- Question count (10 vs 7 vs 5)
- CTA copy variations
- Color scheme impact
- Progress bar vs step indicator
- Email capture timing (middle vs end)

## Success Metrics

Track these KPIs:
- **Quiz start rate**: Clicks on "Starta quiz" / Page views
- **Quiz completion rate**: Completed quizzes / Started quizzes
- **Email capture rate**: Emails submitted / Completed quizzes
- **Signup conversion**: Signups / Email submissions
- **Persona distribution**: Which personas engage most
- **Average pain score**: Indicator of ICP fit

## Next Steps

1. ✅ Implement quiz component and data structure
2. ✅ Integrate into landing pages with pain hooks
3. ✅ Add analytics events
4. ⏳ Create Supabase backend for lead storage
5. ⏳ Set up automated email follow-ups
6. ⏳ Create dashboard to view quiz results
7. ⏳ Integrate with CRM (if applicable)
8. ⏳ A/B test quiz placement and copy
9. ⏳ Monitor conversion rates and optimize

---

**Created**: November 10, 2025
**Status**: Implementation complete, backend integration pending
