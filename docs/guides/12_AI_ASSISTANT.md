# YearWheel AI Assistant - Advanced User Guide

**Purpose**: Deep dive into AI-powered natural language planning  
**Audience**: Premium users, power users, support team  
**Duration**: ~10-15 minutes to demonstrate

---

## Overview

The YearWheel AI Assistant (Premium feature) allows users to generate complete annual plans using natural language descriptions. Powered by OpenAI GPT-4.1 via Vercel AI SDK, it can create rings, activity groups, activities with dates, and even inner ring content from conversational prompts.

**Key capabilities:**
- 🤖 Natural language understanding
- 📅 Automatic date generation and spacing
- 🎨 Intelligent color assignment
- 🔄 Iterative refinement
- 📝 Context awareness

---

## Accessing the AI Assistant

**📸 Screenshot: AI Assistant button in editor (typically right sidebar or floating button)**

### Location:
- **In wheel editor**: Look for AI Assistant icon (✨ or 🤖) in header or right sidebar
- **Only visible**: To Premium users
- **Indicator**: Purple/blue accent to distinguish from regular tools

### Opening the assistant:
1. **Click**: AI Assistant button
2. **Sidebar opens**: Right-side panel with chat interface
3. **Observe**: Welcome message and example prompts

---

## Interface Components

**📸 Screenshot: AI Assistant panel fully open with all elements labeled**

### Main elements:

**1. Chat Input Area (Bottom)**
- Large text field for entering prompts
- Character limit indicator
- Send button (paper plane icon)
- Clear/reset button

**2. Conversation History (Middle)**
- User prompts (right-aligned, usually blue/purple)
- AI responses (left-aligned, usually gray/white)
- Generated content previews
- Action buttons (Apply, Edit, Regenerate)

**3. Example Prompts (Top - First Time)**
- Pre-written suggestions to get started
- Click to use example
- Disappears after first interaction

**4. Settings/Options (Icon)**
- Temperature control (creativity level)
- Model selection (if multiple models available)
- Clear conversation history

---

## Basic Usage: Creating Your First AI Plan

**📸 Screenshot: AI Assistant with example prompt entered**

### Simple prompt example:

**User types:**
```
Create an annual marketing plan for 2026 with quarterly campaigns
```

**AI responds with:**
```
I'll create a marketing plan for 2026. Here's what I propose:

Rings:
- Marketing Campaigns (outer)
- Budget & Planning (outer)
- Quarterly Goals (inner)

Activity Groups:
- Q1 Campaigns (Blue #3B82F6)
- Q2 Campaigns (Green #10B981)
- Q3 Campaigns (Yellow #F59E0B)
- Q4 Campaigns (Red #EF4444)

Activities:
1. New Year Launch Campaign
   - Ring: Marketing Campaigns
   - Group: Q1 Campaigns
   - Dates: Jan 5 - Feb 28, 2026

2. Spring Promotion
   - Ring: Marketing Campaigns
   - Group: Q1 Campaigns
   - Dates: Mar 1 - Mar 31, 2026

... (continues with more activities)

Inner Ring Content (Quarterly Goals):
- Q1: "Build brand awareness, 50K social followers"
- Q2: "Launch 2 new products, 100K website visitors"
- Q3: "Expand to new markets, 25% revenue growth"
- Q4: "Holiday season optimization, 200K customers"

Would you like me to apply this to your wheel?
```

### Applying the generated plan:

**📸 Screenshot: AI response with "Apply to Wheel" button highlighted**

1. **Review**: AI's proposed structure
2. **Click**: **"Apply to Wheel"** button at bottom of AI response
3. **Observe**: Loading indicator
4. **Wait**: 3-5 seconds as AI creates rings, groups, and activities
5. **Success**: Confirmation message + all elements appear on wheel

**📸 Screenshot: Wheel after AI application - showing newly created structure**

### Success indicators:
✅ All proposed rings created  
✅ Activity groups with correct colors  
✅ Activities positioned at correct dates  
✅ Inner ring content (if any) populated

---

## Advanced Prompting Techniques

### 1. Specific Organizational Structure

**Effective prompt:**
```
Create an HR annual plan for 2026 with these departments:
- Recruitment (25 positions to fill across the year)
- Onboarding (monthly cohorts)
- Training & Development (quarterly workshops)
- Retention Programs (ongoing initiatives)
- Performance Reviews (bi-annual cycles)

Use professional colors and space activities evenly throughout the year.
```

**📸 Screenshot: Complex HR wheel generated from detailed prompt**

**Why this works:**
- ✅ Specific department names
- ✅ Quantified goals (25 positions, monthly, quarterly)
- ✅ Time patterns explicitly stated
- ✅ Color guidance included

### 2. Date-Specific Planning

**Effective prompt:**
```
Create a product launch plan with:
- Beta testing: Jan 15 - Feb 28, 2026
- Marketing buildup: Feb 1 - Mar 31, 2026
- Launch event: April 1, 2026
- Post-launch support: April 2 - June 30, 2026
- Evaluation & iteration: July 1 - Aug 31, 2026
```

**Why this works:**
- ✅ Exact dates provided
- ✅ Sequential dependencies clear
- ✅ Overlapping activities (marketing starts before beta ends)

### 3. Industry-Specific Terminology

**Effective prompt:**
```
Create a SaaS startup roadmap for 2026 with:
- Sprint cycles (2-week sprints, agile methodology)
- Feature releases (major releases quarterly, minor monthly)
- Customer success milestones (onboarding, adoption, retention)
- Fundraising timeline (Seed extension Q1, Series A prep Q3-Q4)
- Team growth (hire 3 engineers Q1, 2 sales Q2, 1 designer Q3)
```

**📸 Screenshot: Tech startup wheel with agile-specific activities**

**Why this works:**
- ✅ Industry jargon (sprints, Series A, adoption)
- ✅ Realistic timelines for tech companies
- ✅ Multiple parallel tracks (dev, sales, fundraising)

### 4. Event-Driven Planning

**Effective prompt:**
```
Create a conference planning wheel for a tech conference in September 2026:
- Venue booking: Nov 2025 - Jan 2026
- Speaker recruitment: Jan - April 2026
- Sponsor outreach: Feb - June 2026
- Marketing campaign: May - Sept 2026
- Registration opens: June 1, 2026
- Event: Sept 15-17, 2026
- Post-event follow-up: Sept 18 - Oct 31, 2026
```

**Why this works:**
- ✅ Working backwards from key date (Sept conference)
- ✅ Lead times appropriate for event planning
- ✅ Post-event activities included

---

## Iterative Refinement

The AI Assistant maintains conversation context, allowing iterative improvements.

**📸 Screenshot: Multi-turn conversation showing refinement**

### Example conversation:

**User Turn 1:**
```
Create a basic annual marketing plan for 2026
```

**AI responds with basic plan**

**User Turn 2:**
```
Add a social media strategy with daily posts
```

**AI adds:**
```
I'll add a social media strategy to your existing plan:

New Activity Group:
- Social Media (Purple #8B5CF6)

New Activities:
1. Daily Social Posts (recurring)
   - Ring: Marketing Campaigns
   - Group: Social Media
   - Dates: Jan 1 - Dec 31, 2026

2. Instagram Campaign
   - Ring: Marketing Campaigns
   - Group: Social Media
   - Dates: Jan 1 - Mar 31, 2026

... (continues)

Should I add these to the wheel without removing existing activities?
```

**User Turn 3:**
```
Yes, and also add budget reviews on the 1st of each quarter
```

**AI adds:**
```
Perfect! I'll add quarterly budget reviews:

New Activities:
1. Q1 Budget Review
   - Ring: Budget & Planning
   - Group: Milestones
   - Date: Jan 1, 2026

2. Q2 Budget Review
   - Ring: Budget & Planning
   - Group: Milestones
   - Date: April 1, 2026

... (continues for Q3, Q4)

Applying all changes now...
```

### Best practices for iteration:
💡 **Be specific about what to add/change**: "Add X" vs "Change everything to X"  
💡 **Reference existing elements**: "Add social media to Marketing ring"  
💡 **One change at a time** for clarity  
💡 **Ask questions** if AI's interpretation seems off

---

## What the AI Can Do

### ✅ Capabilities:

**1. Create organizational structure:**
- Generate rings (inner and outer)
- Define activity groups with intelligent color palettes
- Set ring orientations (horizontal/vertical for inner rings)

**2. Generate activities:**
- Parse natural language dates ("early March", "end of Q2", "throughout summer")
- Space activities intelligently (avoid overcrowding)
- Create recurring activities ("monthly meetings", "weekly reports")
- Handle overlapping activities (common in real plans)

**3. Write content:**
- Inner ring text (goals, themes, notes)
- Activity descriptions
- Sensible activity names

**4. Apply business logic:**
- Understand quarterly patterns
- Recognize common business cycles (fiscal years, school years, seasons)
- Follow sequential dependencies ("X before Y")

**5. Handle modifications:**
- Add to existing plan without destroying it
- Modify specific rings or groups
- Replace activities matching criteria
- Shift timelines ("move everything 2 weeks later")

### ❌ Current limitations:

**Cannot (yet):**
- ❌ Delete specific rings/activities (can suggest, but you manually delete)
- ❌ Import from external calendars directly
- ❌ Understand visual design preferences beyond colors
- ❌ Access real-time data (team availability, actual calendar conflicts)
- ❌ Remember across sessions (each wheel has independent AI context)

---

## Prompt Engineering Tips

### Do's:

✅ **Be specific about quantities**
- Good: "Create 4 quarterly reviews"
- Bad: "Create some reviews"

✅ **Specify date formats you prefer**
- Good: "Jan 15, 2026" or "January 15, 2026"
- Bad: "15/1/26" (ambiguous: US vs European format)

✅ **Mention parallel vs sequential**
- Good: "Marketing and Development happen simultaneously"
- Bad: Assuming AI knows they overlap

✅ **Use bullet points for complex requests**
- Easier for AI to parse structured lists

✅ **Reference the year**
- Good: "Create plan for 2026"
- Bad: "Create plan for next year" (what if it's 2027?)

### Don'ts:

❌ **Vague language**
- Bad: "Create some marketing stuff"
- Better: "Create 3 marketing campaigns in Q1-Q3"

❌ **Assuming AI remembers from other wheels**
- Each wheel's AI context is independent

❌ **Overly long prompts (>500 words)**
- Break into multiple turns

❌ **Ambiguous time references**
- Bad: "Soon", "later", "eventually"
- Better: "In February", "Q3", "Mid-year"

---

## Common Use Cases

### 1. Complete Annual Plan from Scratch

**Prompt template:**
```
Create a [DEPARTMENT] annual plan for [YEAR] with:

Rings:
- [Ring 1 name and purpose]
- [Ring 2 name and purpose]
- [Ring 3 name and purpose]

Key activities:
- [Activity type 1]: [timing/frequency]
- [Activity type 2]: [timing/frequency]
- [Activity type 3]: [timing/frequency]

Use [color scheme preference] and include quarterly goals in an inner ring.
```

**Example:**
```
Create a Content Marketing annual plan for 2026 with:

Rings:
- Blog Posts (outer)
- Video Content (outer)
- Social Media (outer)
- Content Strategy (inner)

Key activities:
- Blog posts: 2 per week, year-round
- YouTube videos: 1 per week, year-round
- Podcasts: Biweekly, starting Q2
- Webinars: Monthly, starting Q1
- Ebooks: Quarterly

Use vibrant, modern colors and include quarterly content themes in the inner ring.
```

### 2. Add to Existing Wheel

**Prompt template:**
```
Add [NEW ELEMENT] to my existing wheel:
- [Details about new element]
- Should fit in [TIMEFRAME]
- Related to [EXISTING ELEMENT]
```

**Example:**
```
Add a product launch campaign to my existing wheel:
- Pre-launch activities: Jan-Feb 2026
- Launch event: March 1, 2026
- Post-launch support: March-May 2026
- Should connect to existing Marketing ring
```

### 3. Generate Recurring Activities

**Prompt template:**
```
Create [FREQUENCY] [ACTIVITY TYPE] throughout [TIMEFRAME]
```

**Examples:**
```
- "Create monthly team meetings throughout 2026"
- "Create bi-weekly sprint planning sessions from Jan to Dec 2026"
- "Create quarterly board meetings on the first Monday of each quarter"
```

### 4. Theme-Based Planning

**Prompt template:**
```
Create a [THEME]-based annual plan where each [PERIOD] focuses on:
- [Period 1]: [Theme 1]
- [Period 2]: [Theme 2]
- [Period 3]: [Theme 3]
- [Period 4]: [Theme 4]
```

**Example:**
```
Create a personal development plan for 2026 where each quarter focuses on:
- Q1: Physical health (gym 3x/week, nutrition, sleep)
- Q2: Financial health (budgeting, investing, side income)
- Q3: Career growth (certifications, networking, portfolio)
- Q4: Relationships (family time, friendships, community)
```

---

## Troubleshooting AI Responses

### If AI misunderstands:

**❌ Problem:** AI creates activities in wrong months

**✅ Solution:**
```
The spring campaign should be Feb-April, not May-July. Please adjust.
```

### If AI generates too many activities:

**❌ Problem:** Wheel becomes cluttered

**✅ Solution:**
```
That's too many activities. Keep only the 5 most important campaigns per quarter.
```

### If colors aren't working:

**❌ Problem:** Colors are too similar or clash

**✅ Solution:**
```
Use more distinct colors: blue for Q1, green for Q2, orange for Q3, red for Q4.
```

### If dates don't align:

**❌ Problem:** Activities start before dependencies complete

**✅ Solution:**
```
Move marketing campaign to start AFTER product development completes on Feb 28.
```

---

## Advanced: Combining AI with Manual Editing

**Best workflow:**
1. **AI generates structure** (rings, groups, major activities)
2. **User refines manually** (adjust specific dates, add details)
3. **AI adds supplementary activities** (recurring tasks, minor items)
4. **User finalizes** (hide rings for presentation, export)

**📸 Screenshot: Split screen showing AI suggestions + manual drag-and-drop adjustments**

### Why this hybrid approach works:
- AI handles bulk/tedious work (50+ activities)
- Human ensures accuracy and alignment with reality
- AI can regenerate sections without affecting manual edits (if prompted carefully)

---

## Tips for Support Team

### Helping users get started:

**📸 Screenshot: Support rep guiding user through first AI prompt**

1. **Start simple**: "Try asking it to create a basic marketing plan first"
2. **Show examples**: Have 3-4 pre-written prompts ready
3. **Iterate together**: Make 2-3 refinements with user watching
4. **Explain context**: "The AI remembers our conversation, so you can build on it"

### Common user questions:

**Q: "Will AI delete my existing work?"**
- A: No, unless you specifically ask it to replace everything. Default is additive.

**Q: "Can AI read my Google Calendar?"**
- A: Not yet, but you can describe events and AI will create them.

**Q: "How do I make AI generate better results?"**
- A: Be more specific (quantities, dates, dependencies).

**Q: "Can I undo AI changes?"**
- A: Yes, Ctrl+Z / Cmd+Z works, or use Version History to revert entire wheel.

**Q: "Is my data used to train AI models?"**
- A: No, conversations are not used for training (per OpenAI policy for business customers).

---

## Example Scripts for Common Scenarios

### Scenario 1: HR Manager - New Hire Onboarding

```
Create an employee onboarding program for 2026:

Rings:
- Recruitment (outer) - hiring pipeline activities
- Onboarding (outer) - first 90 days programs
- Retention (outer) - ongoing engagement
- Monthly Themes (inner) - focus areas

Activities:
- Job postings: Continuous throughout year
- Interview weeks: First week of each month
- Offer processes: 2 weeks after interviews
- Onboarding cohorts: Monthly starting on the 15th
- 30-60-90 day check-ins: For each cohort
- Team building events: Quarterly
- Performance reviews: June and December

Use professional, corporate colors.
```

### Scenario 2: Freelancer - Multi-Client Management

```
Create a freelance work plan for 2026 managing 3 clients:

Rings:
- Client A Projects (outer)
- Client B Projects (outer)
- Client C Projects (outer)
- Personal Development (outer)
- Monthly Revenue Goals (inner)

Client A: Website redesign (Jan-March), then maintenance
Client B: Ongoing content writing (2 articles/week all year)
Client C: Social media management (starts April, ongoing)

Personal: Take August off for vacation, professional development in Q4

Use distinct colors per client.
```

### Scenario 3: Non-Profit - Fundraising Calendar

```
Create a non-profit fundraising calendar for 2026:

Major events:
- Spring Gala: April 15
- Summer Fun Run: July 20
- Fall Auction: October 10
- Year-end Giving Campaign: Nov 15 - Dec 31

Supporting activities:
- Grant applications: Quarterly (due dates: March 1, June 1, Sept 1, Dec 1)
- Donor outreach: Continuous
- Newsletter: Monthly, sent on the 5th
- Board meetings: Bi-monthly, first Thursday

Use warm, friendly colors.
```

---

## Performance & Best Practices

### Response times:
- Simple plans (1-2 rings, <10 activities): 3-5 seconds
- Complex plans (5+ rings, 50+ activities): 10-15 seconds
- Iterative additions: 2-4 seconds

### Optimization tips:
💡 Request activities in batches if creating 100+ items  
💡 Use "Apply to Wheel" selectively (review before applying)  
💡 Clear conversation history if context becomes too long  
💡 Break very complex annual plans into quarters (generate Q1, then Q2, etc.)

---

## Future Enhancements (Roadmap)

*Coming features (check latest version):*
- 🔄 Sync with Google Calendar (import events directly)
- 📊 Import from Google Sheets / Excel
- 🗣️ Voice input for prompts
- 🤝 Team AI context (AI remembers team patterns)
- 🎨 Style learning (AI adapts to your color preferences over time)
- 📈 Predictive suggestions ("Based on last year, consider adding...")

---

**End of AI Assistant Guide**

*For more help: support@yearwheel.com*
