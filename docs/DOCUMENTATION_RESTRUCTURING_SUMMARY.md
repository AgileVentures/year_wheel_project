# Documentation Restructuring Summary

**Date**: November 4, 2025  
**Purpose**: Reorganize documentation for dual purpose - public website guides and internal demo scripts

---

## What Changed

### New Structure

```
/docs
├── README.md                          # Documentation overview and guidelines
├── /guides                            # PUBLIC - Website documentation
│   ├── 00_INDEX.md                   # Complete guide catalog
│   ├── 01_QUICK_START.md             # ✅ Created - 5-minute getting started
│   ├── 12_AI_ASSISTANT.md            # Moved from ADVANCED_FEATURES_AI_ASSISTANT.md
│   ├── 13_GOOGLE_INTEGRATIONS.md     # Moved from ADVANCED_FEATURES_GOOGLE_INTEGRATIONS.md
│   ├── 14_VERSION_HISTORY.md         # Moved from ADVANCED_FEATURES_VERSION_HISTORY.md
│   └── [15+ guides to be created]    # Rings, navigation, export, teams, etc.
│
└── /scripts                           # INTERNAL - Demo scripts for reps
    ├── 00_INDEX.md                   # Complete script catalog
    ├── /express
    │   └── 15_MIN_QUICK_DEMO.md      # ✅ Created - Standard 15-min demo
    ├── /standard
    │   └── 30_MIN_COMPREHENSIVE.md   # ✅ Created - Full 30-min tour
    ├── /extended                      # [To be created] 60-min deep dives
    ├── /features                      # [To be created] Individual feature demos
    ├── /scenarios                     # [To be created] Industry-specific demos
    └── /archive
        ├── SUPPORT_SCRIPT.md         # Original English support script (reference)
        └── SUPPORT_SCRIPT_SV.md      # Original Swedish support script (reference)
```

---

## Files Created

### Core Documentation
1. **`/docs/README.md`**
   - Master documentation overview
   - Philosophy, guidelines, maintenance schedule
   - Contributing instructions

2. **`/docs/guides/00_INDEX.md`**
   - Comprehensive guide catalog
   - Organized by category (Getting Started, Core Features, Advanced, etc.)
   - Audience-specific sections

3. **`/docs/scripts/00_INDEX.md`**
   - Complete script catalog
   - Organized by duration and purpose
   - Best practices for demos

### Public Guides
4. **`/docs/guides/01_QUICK_START.md`**
   - 5-minute getting started guide
   - Create account → build wheel → add activities
   - Next steps and help resources

### Internal Demo Scripts
5. **`/docs/scripts/express/15_MIN_QUICK_DEMO.md`**
   - Most common demo format
   - Minute-by-minute breakdown
   - Talk tracks and engagement techniques
   - Q&A handling
   - Post-demo checklist

6. **`/docs/scripts/standard/30_MIN_COMPREHENSIVE.md`**
   - Full feature tour for qualified leads
   - All major features covered
   - Objection handling
   - Multiple closing scenarios
   - Follow-up timeline

---

## Files Moved

### From `/docs` to `/docs/guides`
- `ADVANCED_FEATURES_AI_ASSISTANT.md` → `guides/12_AI_ASSISTANT.md`
- `ADVANCED_FEATURES_GOOGLE_INTEGRATIONS.md` → `guides/13_GOOGLE_INTEGRATIONS.md`
- `ADVANCED_FEATURES_VERSION_HISTORY.md` → `guides/14_VERSION_HISTORY.md`

### From `/docs` to `/docs/scripts/archive`
- `SUPPORT_SCRIPT.md` → `scripts/archive/SUPPORT_SCRIPT.md` (reference only)
- `SUPPORT_SCRIPT_SV.md` → `scripts/archive/SUPPORT_SCRIPT_SV.md` (reference only)

---

## Key Design Decisions

### Public Guides Philosophy
**Goal**: Self-service learning, reduce support burden, improve SEO

**Characteristics**:
- ✅ **Modular**: One topic per guide (5-10 min read)
- ✅ **Progressive**: Basic → Advanced structure
- ✅ **Linkable**: Cross-references between guides
- ✅ **SEO-friendly**: Clear titles, scannable format
- ✅ **Visual**: Screenshots, examples, analogies
- ✅ **Actionable**: "How to X" not "What is X"

**Publishing**: Display on yearwheel.com/docs with search and navigation

### Internal Scripts Philosophy
**Goal**: Enable consistent, effective demos that close deals

**Characteristics**:
- ✅ **Time-boxed**: Respect client's time, minute-by-minute pacing
- ✅ **Interactive**: Client participation, not lecture
- ✅ **Flexible**: Industry/role/pain point adaptations included
- ✅ **Complete**: Setup, demo flow, Q&A, objection handling, follow-up
- ✅ **Battle-tested**: Updated based on real demo feedback
- ✅ **Outcome-focused**: Book trial/meeting, not just educate

**Access**: Internal only - not published publicly

---

## Content Roadmap

### Guides to Create (Priority Order)

**High Priority** (Core features, common questions):
1. `02_FIRST_WHEEL.md` - Detailed wheel creation walkthrough
2. `03_RINGS_AND_ACTIVITIES.md` - Understanding the data model
3. `04_ADDING_CONTENT.md` - Creating activities, groups, items
4. `05_DRAG_DROP.md` - Visual editing features
5. `06_NAVIGATION.md` - Zoom, pan, rotate controls
6. `11_EXPORT.md` - PNG, SVG, PDF, JPG export

**Medium Priority** (Collaboration, presentation):
7. `07_SMART_FOCUS.md` - Month/quarter zoom
8. `08_PRESENTATION.md` - Toggle visibility, rotate
9. `09_TEAMS.md` - Team creation, invitations, sharing
10. `10_PUBLIC_SHARING.md` - Read-only public links

**Lower Priority** (Advanced features):
11. `15_MULTI_YEAR.md` - Multi-year planning
12. `16_TEMPLATES.md` - Using and creating templates
13. `reference/KEYBOARD_SHORTCUTS.md` - Power user shortcuts
14. `reference/TROUBLESHOOTING.md` - Common issues
15. `reference/FAQ.md` - Frequently asked questions

**Audience-Specific** (Optional, for SEO):
16. `audience/MARKETING_TEAMS.md`
17. `audience/HR_DEPARTMENTS.md`
18. `audience/EDUCATION.md`
19. `audience/PROJECT_MANAGERS.md`

### Scripts to Create

**Express Demos**:
- `express/05_MIN_TEASER.md` - Hook them fast (killer feature showcase)

**Extended Sessions**:
- `extended/60_MIN_DEEP_DIVE.md` - Everything including premium features
- `extended/60_MIN_ONBOARDING.md` - New customer implementation session

**Feature-Specific** (8-12 min each):
- `features/RINGS_ACTIVITIES_DEMO.md`
- `features/DRAG_DROP_DEMO.md`
- `features/PRESENTATION_MODE_DEMO.md`
- `features/EXPORT_DEMO.md`
- `features/TEAM_COLLABORATION_DEMO.md`
- `features/AI_ASSISTANT_DEMO.md`
- `features/GOOGLE_CALENDAR_DEMO.md`
- `features/VERSION_HISTORY_DEMO.md`

**Scenario-Based**:
- `scenarios/MARKETING_SCENARIO.md` - Annual campaign planning
- `scenarios/HR_SCENARIO.md` - Onboarding and development
- `scenarios/EDUCATION_SCENARIO.md` - School year planning
- `scenarios/PRODUCT_LAUNCH_SCENARIO.md` - Multi-phase project
- `scenarios/FROM_SPREADSHEETS.md` - Migration pain points

**Support**:
- `support/COMMON_ISSUES.md` - Troubleshooting walkthrough
- `support/FIRST_TIME_USER.md` - Hand-holding for new users
- `support/PRICING_OBJECTIONS.md` - Objection handling
- `support/FEATURE_COMPARISON.md` - vs. competitors

---

## Next Steps

### Immediate (This Week)
1. ✅ Complete folder restructuring
2. ✅ Create core indexes and README
3. ✅ Create 15-min and 30-min demo scripts
4. ✅ Move existing guides to new structure
5. ⏳ Create 3-5 high-priority public guides
6. ⏳ Share demo scripts with sales/support team for feedback

### Short-Term (Next 2 Weeks)
1. ✅ Fix Quick Start Guide inaccuracies (completed)
2. **CRITICAL**: Validate ALL existing guides against actual UI
   - Check all button names, icons, workflows
   - Verify terminology matches application
   - Test each step in real application
3. Create remaining core guides (navigation, export, teams)
4. Create 5-min teaser demo script
5. Create feature-specific demo scripts
6. Add screenshots to all guides
7. Test guides with new users (user testing)
8. Test scripts with real demos (rep feedback)

### Medium-Term (Next Month)
1. Create audience-specific guides
2. Create scenario-based demo scripts
3. Add video recordings to complement scripts
4. Integrate guides into website (yearwheel.com/docs)
5. Create internal training materials from scripts
6. Set up analytics to track guide usage

### Long-Term (Ongoing)
1. Quarterly review of all documentation
2. Update based on new features
3. A/B test different demo approaches
4. Collect feedback from support tickets → update guides
5. Collect feedback from lost deals → update scripts
6. Create advanced topics as user sophistication grows

---

## Maintenance Plan

### After Every Feature Release
- [ ] Create guide in `/guides` (public documentation)
- [ ] Add demo segment to relevant script (internal)
- [ ] Update indexes
- [ ] Announce in changelog
- [ ] Train support/sales team

### Monthly Review
- [ ] Check analytics for popular/unpopular guides
- [ ] Review support tickets for missing documentation
- [ ] Collect rep feedback on script effectiveness
- [ ] Update outdated screenshots
- [ ] Fix broken links

### Quarterly Audit
- [ ] Review all guides for accuracy
- [ ] Update demo scripts based on win/loss analysis
- [ ] Archive outdated content
- [ ] Create new guides for gap areas
- [ ] User test guides with new signups

---

## Success Metrics

### For Public Guides
- **Usage**: Page views, time on page, completion rate
- **Effectiveness**: Support ticket reduction, self-service rate
- **SEO**: Organic traffic, search rankings, backlinks
- **Conversion**: Guide views → trial signups

### For Internal Scripts
- **Consistency**: Rep confidence scores, script adherence
- **Effectiveness**: Demo → trial rate, demo → paid rate
- **Efficiency**: Time to ramp new reps, demo duration
- **Quality**: Client feedback scores, objection handling

---

## Team Responsibilities

### Product Team
- Update guides after feature releases
- Review and approve guide content
- Provide feature screenshots and specs

### Sales/CS Team
- Test and iterate on demo scripts
- Provide feedback from client demos
- Request new scripts for common scenarios
- Track demo effectiveness metrics

### Support Team
- Flag missing or unclear guides
- Contribute troubleshooting content
- Test guides with new users
- Update guides based on tickets

### Marketing Team
- Publish guides to website
- Optimize for SEO
- Create social content from guides
- Track guide analytics

---

## Questions & Feedback

**For guide questions**: docs@yearwheel.com  
**For script questions**: demo-scripts@yearwheel.com  
**For urgent updates**: product@yearwheel.com

---

**Version**: 1.0  
**Status**: Foundation complete, content creation in progress  
**Last Updated**: November 4, 2025
