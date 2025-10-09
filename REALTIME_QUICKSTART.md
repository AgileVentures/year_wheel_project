# Real-Time Collaboration - Quick Start

## 🚀 What You Need to Do

### 1. Run SQL Migration (5 minutes)

Open Supabase Dashboard → SQL Editor and run **in this order**:

1. **First**: `FIX_TEAM_WHEEL_DATA_ACCESS.sql` (if not already applied)
2. **Then**: `ENABLE_REALTIME.sql`

### 2. Test It Works (5 minutes)

1. Start dev server: `yarn dev`
2. Open wheel in Chrome: `http://localhost:3000/editor/YOUR_WHEEL_ID`
3. Open same wheel in Firefox (or incognito) as different team member
4. Add an activity in Chrome
5. Click "Spara"
6. Watch Firefox - should update within 1 second! 🎉

## ✨ What You Get

### Real-Time Features
- ✅ Instant sync when team members edit
- ✅ See who's online (green badge in header)
- ✅ Toast notifications when data syncs
- ✅ Throttled updates (no performance issues)
- ✅ Auto-reconnect if connection drops

### Technical Details
- Uses Supabase Realtime (WebSocket)
- Respects RLS policies (secure)
- Max 1 canvas redraw per second (performance)
- ~50 concurrent users on free tier

## 📁 Files Changed

**New Files**:
- `ENABLE_REALTIME.sql` - Database migration
- `src/hooks/useRealtimeWheel.js` - Data sync hook
- `src/hooks/useWheelPresence.js` - Presence tracking
- `src/hooks/useCallbackUtils.js` - Performance utilities
- `src/components/PresenceIndicator.jsx` - UI component
- `REALTIME_GUIDE.md` - Complete documentation

**Modified Files**:
- `src/App.jsx` - Integrated realtime hooks
- `src/components/Header.jsx` - Added presence indicator

**No Breaking Changes**: All existing functionality preserved!

## 🎛️ Configuration

All in `src/App.jsx`:

```javascript
// Change update frequency (default: 1000ms)
const throttledReload = useThrottledCallback(loadWheelData, 1000);

// Disable presence tracking
// const activeUsers = useWheelPresence(wheelId); // Comment this out
activeUsers={[]} // Pass empty array to Header

// Customize toast message
detail: { message: 'Your custom message', type: 'info' }
```

## 🐛 Troubleshooting

**Not seeing updates?**
1. Check SQL migrations applied correctly
2. Open browser console - look for `[Realtime] Subscribed` messages
3. Verify both users are team members with access

**Performance issues?**
1. Increase throttle delay to 2000ms
2. Check CPU usage during redraw
3. Verify only one wheel editor is open per browser

**Connection problems?**
- Auto-reconnects within 30 seconds
- Check Supabase project status
- Verify API keys in `.env`

## 📖 Documentation

Full details in `REALTIME_GUIDE.md` including:
- Architecture deep-dive
- Performance characteristics
- Future enhancements
- Code examples

## 🎯 Next Steps

1. ✅ Apply SQL migrations
2. ✅ Test with 2 browsers
3. ⏳ Test with real team members
4. ⏳ Deploy to production
5. ⏳ Monitor usage in Supabase Dashboard

---

**Questions?** Check `REALTIME_GUIDE.md` for comprehensive documentation.
