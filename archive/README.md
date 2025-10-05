# Archived Files

This folder contains files that are no longer actively used in the project but are kept for reference.

## Files

### YearWheelClassRedefined.js
- **Date Archived**: October 5, 2025
- **Reason**: Incomplete refactoring attempt. The actual implementation uses `YearWheelClass.js`
- **Status**: Not imported anywhere in the codebase
- **Notes**: This was an attempt to make the code more concise and readable, but development continued on `YearWheelClass.js` instead

### year-wheel-refactored.js
- **Date Archived**: October 5, 2025
- **Reason**: Legacy functional implementation not used in the React app
- **Status**: Not imported anywhere in the codebase
- **Notes**: Earlier functional approach before moving to the class-based implementation

### year-wheel.js
- **Date Archived**: October 5, 2025
- **Reason**: Original legacy implementation from kirkby's year-wheel project
- **Status**: Not imported anywhere in the codebase
- **Notes**: Original vanilla JavaScript implementation that was used as inspiration

## Active Files

The current active implementation is:
- `src/YearWheelClass.js` - Main wheel drawing class (used by `src/YearWheel.jsx`)

## Restoration

If you need to restore any of these files:
```bash
# Example:
mv archive/filename.js src/
```

---

**Note**: These files can be safely deleted if you're confident they won't be needed. They're kept in the archive for reference during the transition to the new architecture with Supabase.
