# YearWheel Documentation Structure

This directory contains all YearWheel documentation, organized by purpose and audience.

---

## Directory Overview

### `/guides` - Public Documentation (Website)
**Audience**: End users, website visitors  
**Purpose**: Self-service learning, feature explanations, how-to guides  
**Format**: Modular, topic-based guides (5-10 min each)  
**Publishing**: Display on yearwheel.com/docs

**Structure:**
- **Core guides** (01-11): Getting started, features, workflows
- **Advanced guides** (12-16): Premium features, integrations
- **Audience guides**: Industry-specific how-tos
- **Reference**: Shortcuts, FAQ, troubleshooting

[View Guide Index →](guides/00_INDEX.md)

---

### `/scripts` - Internal Demo Scripts
**Audience**: YearWheel sales reps, customer success, support staff  
**Purpose**: Structured demos during screen shares and client calls  
**Format**: Time-boxed scripts with talk tracks and demo flows  
**Access**: Internal only (not published publicly)

**Structure:**
- **Express demos** (5-15 min): Quick value demonstrations
- **Standard demos** (20-30 min): Comprehensive feature tours
- **Extended sessions** (45-60 min): Deep dives, onboarding
- **Feature scripts**: Individual feature demonstrations
- **Scenarios**: Industry-specific use case demos
- **Support scripts**: Troubleshooting, objection handling

[View Script Index →](scripts/00_INDEX.md)

---

### Other Documentation Files

**Project Documentation:**
- `HOWTO.md` - Developer setup and workflows
- `DEPLOY_EDGE_FUNCTIONS.md` - Deployment procedures
- `SUPABASE_SMTP_SETUP.md` - Email configuration
- `PRERENDERING_GUIDE.md` - SEO implementation
- And others...

**Feature Implementation:**
- `AI_ASSISTANT_V2_*.md` - AI assistant development
- `GTM_*.md` - Analytics tracking
- `SEO_*.md` - Search optimization
- `ADVANCED_FEATURES_*.md` - Feature specifications

**Archive:**
- `scripts/archive/` - Original support scripts (reference only)

---

## Documentation Philosophy

### Guides (Public)
**Goals:**
- Help users succeed independently
- Answer common questions before they're asked
- Showcase features to drive upgrades
- Improve SEO and discoverability

**Principles:**
- **Modular**: Each guide covers one topic (not everything)
- **Scannable**: Headers, bullets, visual hierarchy
- **Action-oriented**: "How to X" not "What is X"
- **Progressive**: Basic → intermediate → advanced
- **Linkable**: Cross-reference related guides

### Scripts (Internal)
**Goals:**
- Enable consistent demo experiences
- Reduce rep ramp-up time
- Capture best practices and talk tracks
- Handle objections effectively

**Principles:**
- **Time-boxed**: Respect client's time
- **Interactive**: Client participation, not lecture
- **Flexible**: Adapt to industry/role/pain point
- **Outcome-focused**: Book trial/meeting, not just inform
- **Battle-tested**: Updated based on real demo feedback

---

## Content Creation Guidelines

### Writing Guides
1. **Start with outcome**: What will user achieve?
2. **Show, don't tell**: Screenshots, examples, analogies
3. **Assume context**: Link to prerequisites, don't repeat basics
4. **Test yourself**: Can you follow your own guide without prior knowledge?
5. **Update frequently**: Flag outdated info, add new features

### Writing Scripts
1. **Know your time**: Minute-by-minute breakdown
2. **Anticipate questions**: Have answers ready
3. **Prepare fallbacks**: What if feature doesn't work? What if they ask about competitor?
4. **Include setup**: What to prepare before call
5. **Define success**: What constitutes a good demo outcome?

---

## Maintenance

### Quarterly Review (Every 3 months)
- [ ] Update guides with new features
- [ ] Archive outdated content
- [ ] Refresh screenshots
- [ ] Test all links
- [ ] Review scripts based on demo feedback

### After Major Features
- [ ] Create guide in `/guides`
- [ ] Create demo script in `/scripts`
- [ ] Update relevant indexes
- [ ] Train support/sales team
- [ ] Announce in changelog

### Feedback Loops
- **From users**: Support tickets → guide updates
- **From reps**: Demo challenges → script improvements
- **From analytics**: Popular guides → expand content
- **From sales**: Common objections → new scripts

---

## Quick Links

- **[Guide Index](guides/00_INDEX.md)** - All public documentation
- **[Script Index](scripts/00_INDEX.md)** - All demo scripts
- **[15-Min Demo](scripts/express/15_MIN_QUICK_DEMO.md)** - Most common demo format
- **[Quick Start](guides/01_QUICK_START.md)** - User's first steps

---

## Contributing

### Adding a New Guide
1. Create file in appropriate `/guides` subdirectory
2. Use numbered prefix (e.g., `17_NEW_FEATURE.md`)
3. Add entry to `guides/00_INDEX.md`
4. Follow writing guidelines above
5. Submit for review

### Adding a New Script
1. Create file in appropriate `/scripts` subdirectory
2. Include time estimate and setup instructions
3. Add entry to `scripts/00_INDEX.md`
4. Test with real demo (iterate based on feedback)
5. Share with team for input

### Updating Existing Content
1. Mark outdated sections with `⚠️ Outdated:` note
2. Update content based on current product state
3. Update "Last Updated" date at bottom
4. Notify relevant teams (support, sales) of changes

---

**Questions?** Contact product@yearwheel.com

**Version**: 1.0  
**Last Updated**: November 4, 2025
